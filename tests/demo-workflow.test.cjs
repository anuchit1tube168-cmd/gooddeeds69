const test = require('node:test');
const assert = require('node:assert/strict');
const {createDemoStore,validateDraft} = require('../frontend/secure-pilot/workflow.js');
const draft=()=>({categoryId:'5',hours:'2.5',activityDate:'2026-09-09',description:'กิจกรรมจำลองเพื่อทดสอบขั้นตอนเท่านั้น',confirmed:true,studentSignature:{distance:40,points:6},evidence:{name:'synthetic.png',type:'image/png',size:120}});
const proof=(store,id,note='ตรวจรายการตัวอย่างแล้ว')=>({challenge:store.beginReview(id),distance:40,points:6,note});
test('submission and retries keep one pending record without crediting hours',()=>{
  const store=createDemoStore(),before=store.snapshot();
  const created=store.submit(draft(),'demo_submit_1');
  assert.equal(created.deed.status,'pending');
  assert.equal(store.submit(draft(),'demo_submit_1').duplicate,true);
  assert.equal(store.snapshot().items.length,before.items.length+1);
  assert.equal(store.snapshot().card.totalHours,before.card.totalHours);
  assert.equal(store.snapshot().outbox.length,0);
});
test('approval credits stored hours once and queues one delivery event',()=>{
  const store=createDemoStore();store.submit(draft(),'demo_review_1');
  const signed=proof(store,'demo_review_1');
  store.review('demo_review_1','approved',{...signed,hours:999});
  assert.equal(store.snapshot().card.totalHours,18);
  assert.equal(store.review('demo_review_1','approved',signed).duplicate,true);
  assert.equal(store.snapshot().card.totalHours,18);
  assert.equal(store.snapshot().outbox.length,1);
  assert.throws(()=>store.review('demo_review_1','rejected',signed),{code:'REVIEW_CONFLICT'});
});
test('blank, tiny, expired and wrong-record signatures cannot approve',()=>{
  let clock=Date.parse('2026-09-09T01:00:00Z');
  const store=createDemoStore({now:()=>clock});
  store.submit(draft(),'demo_signature_1');store.submit(draft(),'demo_signature_2');
  const signed=proof(store,'demo_signature_1');
  for(const change of [{distance:0,points:0},{distance:1},{points:1},{distance:NaN}]) {
    assert.throws(()=>store.review('demo_signature_1','approved',{...signed,...change}),{code:'SIGNATURE_REQUIRED'});
  }
  assert.throws(()=>store.review('demo_signature_2','approved',signed),{code:'SIGNATURE_EXPIRED'});
  clock+=300000;
  assert.throws(()=>store.review('demo_signature_1','approved',signed),{code:'SIGNATURE_EXPIRED'});
  assert.equal(store.snapshot().card.totalHours,15.5);
  assert.equal(store.snapshot().outbox.length,0);
  store.review('demo_signature_1','approved',proof(store,'demo_signature_1'));
  assert.equal(store.snapshot().card.totalHours,18);
});
test('rejection requires a reason and never adds hours',()=>{
  const store=createDemoStore();const signed=proof(store,'demo_volunteer_1',' ');
  assert.throws(()=>store.review('demo_volunteer_1','rejected',signed),{code:'NOTE_REQUIRED'});
  store.review('demo_volunteer_1','rejected',{...signed,note:'หลักฐานตัวอย่างไม่ครบ'});
  assert.equal(store.snapshot().card.totalHours,15.5);
  assert.equal(store.snapshot().card.pendingCount,0);
  assert.equal(store.snapshot().outbox.length,1);
});
test('notification failures and retries never replay approval or duplicate events',()=>{
  const store=createDemoStore();store.review('demo_volunteer_1','approved',proof(store,'demo_volunteer_1'));
  const event=store.snapshot().outbox[0];
  assert.equal(store.deliver(event.id,true).status,'failed');
  assert.equal(store.deliver(event.id,false).status,'sent');
  assert.equal(store.deliver(event.id,false).attempts,2);
  assert.equal(store.snapshot().card.totalHours,17.5);
  assert.equal(store.snapshot().outbox.length,1);
});
test('failed delivery stops at three tries while the reviewed record remains',()=>{
  const store=createDemoStore();store.review('demo_volunteer_1','approved',proof(store,'demo_volunteer_1'));
  const event=store.snapshot().outbox[0];
  for(let i=0;i<3;i++)store.deliver(event.id,true);
  assert.throws(()=>store.deliver(event.id,false),{code:'RETRY_LIMIT'});
  assert.equal(store.record('demo_volunteer_1').status,'approved');
  assert.equal(store.snapshot().card.totalHours,17.5);
});
test('draft validation rejects coerced numbers, invalid dates and unsafe file metadata',()=>{
  assert.deepEqual(validateDraft(draft()),{});
  for(const value of ['',true,[],{},Infinity,'0x10','1e2',0,-1,24.5,0.7])assert.ok(validateDraft({...draft(),hours:value}).hours);
  for(const value of ['',true,0,10,1.5])assert.ok(validateDraft({...draft(),categoryId:value}).categoryId);
  for(const value of ['2026-02-30','2026-13-01','not-a-date'])assert.ok(validateDraft({...draft(),activityDate:value}).activityDate);
  for(const evidence of [null,{type:'image/svg+xml',size:100},{type:'image/png',size:0},{type:'application/pdf',size:2*1024*1024+1}])assert.ok(validateDraft({...draft(),evidence}).evidence);
  assert.ok(validateDraft({...draft(),confirmed:'true'}).confirmed);
});
test('returned snapshots cannot mutate records or grant hours',()=>{
  const store=createDemoStore(),snapshot=store.snapshot();
  snapshot.items[0].hours=999;snapshot.card.totalHours=999;
  const copy=store.record('demo_volunteer_1');copy.status='approved';
  assert.equal(store.record('demo_volunteer_1').status,'pending');
  store.review('demo_volunteer_1','approved',proof(store,'demo_volunteer_1'));
  assert.equal(store.snapshot().card.totalHours,17.5);
});

test('autosaved drafts resume as drafts and become one pending mission without credit',()=>{
  const store=createDemoStore(),id='demo_draft_resume';
  store.saveDraft({description:'ยังกรอกไม่ครบ'},id);store.saveDraft({...draft(),hours:''},id);
  assert.equal(store.record(id).status,'draft');assert.equal(store.record(id).hours,'');assert.equal(store.snapshot().card.pendingCount,1);
  assert.throws(()=>store.submit({...draft(),hours:''},id),{code:'DRAFT_INVALID'});
  store.submit(draft(),id);assert.equal(store.record(id).status,'pending');assert.equal(store.snapshot().items.filter(r=>r.deedId===id).length,1);
  assert.equal(store.snapshot().card.totalHours,15.5);assert.throws(()=>store.saveDraft(draft(),id),{code:'DRAFT_CONFLICT'});
});
test('revision preserves rejection, evidence and timeline, invalidates prior review proof and credits once',()=>{
  const store=createDemoStore(),id='demo_revision_flow';store.submit(draft(),id);
  const original=proof(store,id,'เพิ่มรายละเอียดหลักฐาน');store.review(id,'rejected',original);
  const rejected=store.record(id),changed={...draft(),hours:'3.5',description:'แก้ไขรายละเอียดกิจกรรมจำลองและหลักฐานแล้ว'};
  store.resubmit(id,changed,'demo_revision_request');assert.equal(store.snapshot().card.totalHours,15.5);
  assert.equal(store.record(id).revisions[0].note,rejected.note);assert.deepEqual(store.record(id).revisions[0].evidence,rejected.evidence);
  assert.equal(store.record(id).revision,2);assert.equal(store.record(id).status,'pending');
  assert.equal(store.resubmit(id,changed,'demo_revision_request').duplicate,true);
  assert.throws(()=>store.review(id,'approved',original),{code:'SIGNATURE_EXPIRED'});
  store.review(id,'approved',proof(store,id));assert.equal(store.snapshot().card.totalHours,19);
  assert.equal(new Set(store.snapshot().outbox.map(e=>e.id)).size,2);
  assert.ok(store.record(id).timeline.some(e=>e.label==='ให้แก้ไข'));assert.ok(store.record(id).timeline.some(e=>e.label==='แก้ไขและส่งใหม่'));
  assert.throws(()=>store.resubmit(id,changed,'demo_another_revision'),{code:'REVIEW_CONFLICT'});
});
test('seed rejection without evidence can be revised without dropping its historical reason',()=>{
  const store=createDemoStore(),before=store.record('demo_religious_3');store.resubmit('demo_religious_3',draft(),'demo_seed_revision');
  assert.equal(store.record('demo_religious_3').revisions[0].note,before.note);assert.equal(store.snapshot().card.totalHours,15.5);
});
test('student signature is required and file headers must match accepted MIME types',()=>{
  const {validateFileHeader}=require('../frontend/secure-pilot/workflow.js');
  for(const studentSignature of [null,{points:5,distance:0},{points:0,distance:50}])assert.ok(validateDraft({...draft(),studentSignature}).studentSignature);
  assert.equal(validateFileHeader([137,80,78,71,13,10,26,10],'image/png'),true);
  assert.equal(validateFileHeader([255,216,255,224],'image/jpeg'),true);
  assert.equal(validateFileHeader([37,80,68,70,45],'application/pdf'),true);
  assert.equal(validateFileHeader([60,115,99,114,105,112,116],'image/png'),false);
  assert.equal(validateFileHeader([37,80,68,70,45],'image/jpeg'),false);
});
