/* Isolated synthetic workflow model. Never import this as an auth/API adapter. */
(function(root){
  'use strict';
  const fail=code=>{throw Object.assign(new Error(code),{code});};
  const decimal=value=>typeof value==='number'?value:typeof value==='string'&&/^\d+(?:\.\d+)?$/.test(value.trim())?Number(value):NaN;
  const validSignature=value=>value && Number.isFinite(value.distance) && value.distance>=24 && Number.isInteger(value.points) && value.points>=5;
  function validateFileHeader(bytes,type){
    const b=Array.from(bytes||[]);
    return type==='image/png'?b.slice(0,8).join(',')==='137,80,78,71,13,10,26,10':type==='image/jpeg'?b[0]===255&&b[1]===216&&b[2]===255:type==='application/pdf'?b.slice(0,5).join(',')==='37,80,68,70,45':false;
  }
  function validateDraft(draft){
    const errors={};
    if(!draft||typeof draft!=='object')return {form:'กรุณากรอกข้อมูลกิจกรรม'};
    const category=decimal(draft.categoryId),hours=decimal(draft.hours);
    if(!Number.isInteger(category)||category<1||category>9)errors.categoryId='กรุณาเลือกหมวดกิจกรรม';
    if(!Number.isFinite(hours)||hours<0.5||hours>24||!Number.isInteger(hours*2))errors.hours='ระบุ 0.5–24 ชั่วโมง เพิ่มครั้งละ 0.5 ชั่วโมง';
    const date=draft.activityDate;
    if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)errors.activityDate='กรุณาระบุวันที่ให้ถูกต้อง';
    if(typeof draft.description!=='string'||draft.description.trim().length<10||draft.description.length>1200)errors.description='อธิบายกิจกรรม 10–1,200 ตัวอักษร';
    if(!validSignature(draft.studentSignature))errors.studentSignature='กรุณาวาดลายเส้นตัวอย่างก่อนส่ง';
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
    records.forEach(record=>{
      record.ownerName='นักเรียนตัวอย่าง';record.yearLevel=2;record.revision=1;record.createdAt=record.submittedAt;record.updatedAt=record.submittedAt;record.revisions=[];
      record.timeline=[{label:'บันทึก',at:record.createdAt},{label:'ส่งตรวจ',at:record.submittedAt}];
      if(record.status!=='pending'){
        record.reviewedAt=record.submittedAt;record.reviewerName='อาจารย์ตัวอย่าง';
        record.timeline.push({label:'อาจารย์ตรวจ',at:record.reviewedAt,actor:record.reviewerName},{label:record.status==='approved'?'อนุมัติ':'ให้แก้ไข',at:record.reviewedAt,note:record.note,actor:record.reviewerName});
      }
    });
    let totalHours=15.5,sequence=0;
    const submissions=new Map();
    const challenges=new Map(),outbox=[],audit=[];
    const clone=value=>value===undefined?null:JSON.parse(JSON.stringify(value));
    const find=id=>{const matches=records.filter(r=>r.deedId===id);if(matches.length!==1)fail('RECORD_NOT_FOUND');return matches[0];};
    function saveDraft(draft,id){
      if(typeof id!=='string'||!/^demo_[a-zA-Z0-9_-]{3,100}$/.test(id))fail('REQUEST_INVALID');
      const existing=records.find(r=>r.deedId===id);
      if(existing && existing.status!=='draft')fail('DRAFT_CONFLICT');
      const safe={categoryId:typeof draft.categoryId==='string'||typeof draft.categoryId==='number'?draft.categoryId:'',hours:typeof draft.hours==='string'||typeof draft.hours==='number'?draft.hours:'',activityDate:typeof draft.activityDate==='string'?draft.activityDate.slice(0,10):'',description:typeof draft.description==='string'?draft.description.slice(0,1200):'',confirmed:draft.confirmed===true,evidence:draft.evidence?clone(draft.evidence):null,studentSignature:draft.studentSignature?clone(draft.studentSignature):null};
      const at=new Date(now()).toISOString();
      if(existing){Object.assign(existing,safe,{updatedAt:at});return clone(existing);}
      const record={...safe,deedId:id,studentId:owner,ownerName:'นักเรียนตัวอย่าง',yearLevel:2,status:'draft',createdAt:at,updatedAt:at,revision:0,revisions:[],timeline:[{label:'บันทึกแบบร่าง',at}]};
      records.unshift(record);return clone(record);
    }
    function submit(draft,id){
      if(typeof id!=='string'||!/^demo_[a-zA-Z0-9_-]{3,100}$/.test(id))fail('REQUEST_INVALID');
      const existing=records.find(r=>r.deedId===id);
      if(existing && existing.status!=='draft')return {deed:clone(existing),duplicate:true};
      if(Object.keys(validateDraft(draft)).length)fail('DRAFT_INVALID');
      const at=new Date(now()).toISOString();
      const deed={deedId:id,studentId:owner,ownerName:'นักเรียนตัวอย่าง',yearLevel:2,categoryId:decimal(draft.categoryId),hours:decimal(draft.hours),activityDate:draft.activityDate,description:draft.description.trim(),status:'pending',createdAt:existing?.createdAt||at,submittedAt:at,updatedAt:at,revision:1,revisions:[],evidence:clone(draft.evidence),studentSignature:clone(draft.studentSignature),timeline:[...(existing?.timeline||[{label:'บันทึก',at}]),{label:'ส่งตรวจ',at}]};
      if(existing)Object.assign(existing,deed);else records.unshift(deed);
      audit.unshift({id:'audit_'+(++sequence),deedId:id,action:'ส่งรายการตัวอย่าง',at});
      return {deed:clone(deed),duplicate:false};
    }
    function resubmit(id,draft,requestId){
      if(typeof requestId!=='string'||!/^demo_[a-zA-Z0-9_-]{3,100}$/.test(requestId))fail('REQUEST_INVALID');
      const prior=submissions.get(requestId);
      if(prior){if(prior.deedId!==id)fail('REQUEST_CONFLICT');return {deed:clone(find(id)),duplicate:true};}
      const deed=find(id);if(deed.status!=='rejected')fail('REVIEW_CONFLICT');
      if(Object.keys(validateDraft(draft)).length)fail('DRAFT_INVALID');
      const at=new Date(now()).toISOString();
      deed.revisions.push({revision:deed.revision,categoryId:deed.categoryId,hours:deed.hours,activityDate:deed.activityDate,description:deed.description,evidence:clone(deed.evidence),studentSignature:clone(deed.studentSignature),status:deed.status,note:deed.note,reviewedAt:deed.reviewedAt,reviewerName:deed.reviewerName});
      Object.assign(deed,{categoryId:decimal(draft.categoryId),hours:decimal(draft.hours),activityDate:draft.activityDate,description:draft.description.trim(),evidence:clone(draft.evidence),studentSignature:clone(draft.studentSignature),status:'pending',note:'',reviewedAt:'',reviewerName:'',submittedAt:at,updatedAt:at,revision:deed.revision+1});
      challenges.forEach(proof=>{if(proof.deedId===id)proof.used=true;});
      deed.timeline.push({label:'แก้ไขและส่งใหม่',at});
      submissions.set(requestId,{deedId:id,revision:deed.revision});
      audit.unshift({id:'audit_'+(++sequence),deedId:id,action:'แก้ไขและส่งใหม่ (ตัวอย่าง)',at});
      return {deed:clone(deed),duplicate:false};
    }
    function beginReview(id){
      const deed=find(id);if(deed.status!=='pending')fail('REVIEW_CONFLICT');
      const challenge='demo_challenge_'+(++sequence);
      challenges.set(challenge,{deedId:id,revision:deed.revision,expiresAt:now()+300000,used:false});
      return challenge;
    }
    function review(id,decision,proof){
      const deed=find(id);
      if(!['approved','rejected'].includes(decision))fail('DECISION_INVALID');
      if(deed.status===decision)return {deed:clone(deed),duplicate:true};
      if(deed.status!=='pending')fail('REVIEW_CONFLICT');
      const challenge=challenges.get(proof&&proof.challenge);
      if(!challenge||challenge.used||challenge.deedId!==id||challenge.revision!==deed.revision||challenge.expiresAt<=now())fail('SIGNATURE_EXPIRED');
      if(!validSignature(proof))fail('SIGNATURE_REQUIRED');
      if(typeof proof.note!=='string'||proof.note.length>600||(decision==='rejected'&&!proof.note.trim()))fail('NOTE_REQUIRED');
      challenge.used=true;deed.status=decision;deed.note=proof.note.trim();deed.reviewedAt=new Date(now()).toISOString();deed.updatedAt=deed.reviewedAt;deed.reviewerName='อาจารย์ตัวอย่าง';
      deed.timeline.push({label:'อาจารย์ตรวจ',at:deed.reviewedAt,actor:deed.reviewerName},{label:decision==='approved'?'อนุมัติ':'ให้แก้ไข',at:deed.reviewedAt,note:deed.note,actor:deed.reviewerName});
      // Demo-only arithmetic. Official policy/formula evaluation belongs to backend.
      if(decision==='approved')totalHours+=deed.hours;
      outbox.push({id:'demo_event_'+id+'_r'+deed.revision,deedId:id,status:'queued',attempts:0});
      audit.unshift({id:'audit_'+(++sequence),deedId:id,action:decision==='approved'?'อนุมัติและลงนามตัวอย่าง':'ไม่อนุมัติและลงนามตัวอย่าง',at:deed.reviewedAt});
      return {deed:clone(deed),duplicate:false};
    }
    function deliver(eventId,failed){
      const event=outbox.find(e=>e.id===eventId);if(!event)fail('EVENT_NOT_FOUND');
      if(event.status==='sent')return clone(event);
      if(event.attempts>=3)fail('RETRY_LIMIT');
      event.attempts++;event.status=failed?'failed':'sent';return clone(event);
    }
    return Object.freeze({saveDraft,submit,resubmit,beginReview,review,deliver,
      record:id=>clone(find(id)),
      snapshot:()=>({card:{studentId:owner,displayName:'นักเรียนตัวอย่าง',cohortLabel:'ชั้นปีที่ 2 · ชุดข้อมูลสาธิต',positionLabel:'นักเรียนพยาบาล',totalHours,levelNumber:2,levelLabel:'ข้อมูลตัวอย่าง',passed:false,pendingCount:records.filter(r=>r.status==='pending').length,approvedCount:records.filter(r=>r.status==='approved').length},items:clone(records),outbox:clone(outbox),audit:clone(audit)})});
  }
  const api={validateDraft,validateFileHeader,createDemoStore};root.GoodDeedDemo=Object.freeze(api);if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?this:window);
