/* Isolated synthetic workflow model. Never import this as an auth/API adapter. */
(function(root){
  'use strict';
  const fail=code=>{throw Object.assign(new Error(code),{code});};
  const decimal=value=>typeof value==='number'?value:typeof value==='string'&&/^\d+(?:\.\d+)?$/.test(value.trim())?Number(value):NaN;
  function validateDraft(draft){
    const errors={};
    if(!draft||typeof draft!=='object')return {form:'กรุณากรอกข้อมูลกิจกรรม'};
    const category=decimal(draft.categoryId),hours=decimal(draft.hours);
    if(!Number.isInteger(category)||category<1||category>9)errors.categoryId='กรุณาเลือกหมวดกิจกรรม';
    if(!Number.isFinite(hours)||hours<0.5||hours>24||!Number.isInteger(hours*2))errors.hours='ระบุ 0.5–24 ชั่วโมง เพิ่มครั้งละ 0.5 ชั่วโมง';
    const date=draft.activityDate;
    if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)errors.activityDate='กรุณาระบุวันที่ให้ถูกต้อง';
    if(typeof draft.description!=='string'||draft.description.trim().length<10||draft.description.length>1200)errors.description='อธิบายกิจกรรม 10–1,200 ตัวอักษร';
    if(draft.confirmed!==true)errors.confirmed='กรุณาตรวจสอบและรับรองข้อมูลก่อนส่ง';
    if(!draft.evidence)errors.evidence='กรุณาเลือกหลักฐานประกอบกิจกรรม';
    else if(!['image/jpeg','image/png','application/pdf'].includes(draft.evidence.type)||!Number.isInteger(draft.evidence.size)||draft.evidence.size<1||draft.evidence.size>2*1024*1024)errors.evidence='รองรับ JPG, PNG หรือ PDF ขนาดไม่เกิน 2 MB';
    return errors;
  }
  function createDemoStore(options={}){
    const now=options.now||(()=>Date.now());
    const owner=['99','00001'].join('');
    const records=[
      {deedId:'demo_volunteer_1',studentId:owner,categoryId:5,hours:2,activityDate:'2026-09-05',description:'ช่วยจัดพื้นที่และอุปกรณ์กิจกรรมส่งเสริมสุขภาพชุมชน (ตัวอย่าง)',status:'pending',evidence:{name:'หลักฐานกิจกรรมตัวอย่าง',type:'image/png',size:100,synthetic:true},submittedAt:'2026-09-05T03:00:00Z'},
      {deedId:'demo_college_2',studentId:owner,categoryId:3,hours:1.5,activityDate:'2026-09-02',description:'ช่วยเตรียมอุปกรณ์ห้องฝึกปฏิบัติการพยาบาล (ตัวอย่าง)',status:'approved',note:'ตรวจรับรองข้อมูลตัวอย่างแล้ว',submittedAt:'2026-09-02T03:00:00Z'},
      {deedId:'demo_religious_3',studentId:owner,categoryId:6,hours:1,activityDate:'2026-08-28',description:'กิจกรรมดูแลพื้นที่ศาสนสถานร่วมกับชุมชน (ตัวอย่าง)',status:'rejected',note:'ตัวอย่าง: หลักฐานยังไม่ระบุวันทำกิจกรรม กรุณาติดต่ออาจารย์ผู้ดูแล',submittedAt:'2026-08-28T03:00:00Z'}
    ];
    let totalHours=15.5,sequence=0;
    const challenges=new Map(),outbox=[],audit=[];
    const clone=value=>JSON.parse(JSON.stringify(value));
    const find=id=>{const matches=records.filter(r=>r.deedId===id);if(matches.length!==1)fail('RECORD_NOT_FOUND');return matches[0];};
    function submit(draft,id){
      if(typeof id!=='string'||!/^demo_[a-zA-Z0-9_-]{3,100}$/.test(id))fail('REQUEST_INVALID');
      if(records.some(r=>r.deedId===id))return {deed:clone(find(id)),duplicate:true};
      if(Object.keys(validateDraft(draft)).length)fail('DRAFT_INVALID');
      const deed={deedId:id,studentId:owner,categoryId:decimal(draft.categoryId),hours:decimal(draft.hours),activityDate:draft.activityDate,description:draft.description.trim(),status:'pending',submittedAt:new Date(now()).toISOString(),evidence:clone(draft.evidence)};
      records.unshift(deed);audit.unshift({id:'audit_'+(++sequence),deedId:id,action:'ส่งรายการตัวอย่าง',at:new Date(now()).toISOString()});
      return {deed:clone(deed),duplicate:false};
    }
    function beginReview(id){
      const deed=find(id);if(deed.status!=='pending')fail('REVIEW_CONFLICT');
      const challenge='demo_challenge_'+(++sequence);
      challenges.set(challenge,{deedId:id,expiresAt:now()+300000,used:false});
      return challenge;
    }
    function review(id,decision,proof){
      const deed=find(id);
      if(!['approved','rejected'].includes(decision))fail('DECISION_INVALID');
      if(deed.status===decision)return {deed:clone(deed),duplicate:true};
      if(deed.status!=='pending')fail('REVIEW_CONFLICT');
      const challenge=challenges.get(proof&&proof.challenge);
      if(!challenge||challenge.used||challenge.deedId!==id||challenge.expiresAt<=now())fail('SIGNATURE_EXPIRED');
      if(!Number.isFinite(proof.distance)||proof.distance<24||!Number.isInteger(proof.points)||proof.points<5)fail('SIGNATURE_REQUIRED');
      if(typeof proof.note!=='string'||proof.note.length>600||(decision==='rejected'&&!proof.note.trim()))fail('NOTE_REQUIRED');
      challenge.used=true;deed.status=decision;deed.note=proof.note.trim();deed.reviewedAt=new Date(now()).toISOString();
      // Demo-only arithmetic. Official policy/formula evaluation belongs to backend.
      if(decision==='approved')totalHours+=deed.hours;
      outbox.push({id:'demo_event_'+id,deedId:id,status:'queued',attempts:0});
      audit.unshift({id:'audit_'+(++sequence),deedId:id,action:decision==='approved'?'อนุมัติและลงนามตัวอย่าง':'ไม่อนุมัติและลงนามตัวอย่าง',at:deed.reviewedAt});
      return {deed:clone(deed),duplicate:false};
    }
    function deliver(eventId,failed){
      const event=outbox.find(e=>e.id===eventId);if(!event)fail('EVENT_NOT_FOUND');
      if(event.status==='sent')return clone(event);
      if(event.attempts>=3)fail('RETRY_LIMIT');
      event.attempts++;event.status=failed?'failed':'sent';return clone(event);
    }
    return Object.freeze({submit,beginReview,review,deliver,
      record:id=>clone(find(id)),
      snapshot:()=>({card:{displayName:'นักเรียนตัวอย่าง',cohortLabel:'ชั้นปีที่ 2 · ชุดข้อมูลสาธิต',positionLabel:'นักเรียนพยาบาล',totalHours,levelNumber:2,levelLabel:'ข้อมูลตัวอย่าง',passed:false,pendingCount:records.filter(r=>r.status==='pending').length,approvedCount:records.filter(r=>r.status==='approved').length},items:clone(records),outbox:clone(outbox),audit:clone(audit)})});
  }
  const api={validateDraft,createDemoStore};root.GoodDeedDemo=Object.freeze(api);if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?this:window);
