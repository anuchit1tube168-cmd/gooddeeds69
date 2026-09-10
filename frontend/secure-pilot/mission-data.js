/* Presentation projections only. No storage, identity, policy or API authority. */
(function(root){
  'use strict';
  const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
  function day(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) return '';
    const prefix=value.slice(0,10), parsed=new Date(prefix+'T00:00:00Z');
    if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==prefix)return '';
    if(value.length===10)return prefix;
    if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)||!Number.isFinite(Date.parse(value)))return '';
    return bangkokDay(value);
  }
  function bangkokDay(value=new Date()) {
    const date=new Date(value);
    if(!Number.isFinite(date.getTime())) throw Error('DATE_INVALID');
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
    return ['year','month','day'].map(type=>parts.find(p=>p.type===type).value).join('-');
  }
  function summarize(card,items,options={}) {
    const today=bangkokDay(options.now), month=today.slice(0,7);
    const rows=Array.isArray(items)?items:[];
    const approved=rows.filter(r=>r.status==='approved' && number(r.hours)!==null && r.hours>=0.5 && r.hours<=24 && Number.isInteger(r.hours*2));
    const dated=approved.filter(r=>day(r.activityDate));
    const monthly=[];
    const first=new Date(month+'-01T00:00:00Z');
    for(let offset=5;offset>=0;offset--){
      const d=new Date(first);d.setUTCMonth(d.getUTCMonth()-offset);
      const key=d.toISOString().slice(0,7), inMonth=dated.filter(r=>day(r.activityDate).startsWith(key));
      monthly.push({key,label:new Intl.DateTimeFormat('th-TH',{month:'short',year:'2-digit',timeZone:'UTC'}).format(d),hours:inMonth.reduce((s,r)=>s+r.hours,0),count:inMonth.length});
    }
    let cumulative=0;
    const categories=Array.from({length:9},(_,index)=>{
      const id=index+1, group=rows.filter(r=>r.categoryId===id && r.status!=='draft');
      const verified=approved.filter(r=>r.categoryId===id);
      return {id,count:group.length,hours:verified.reduce((s,r)=>s+r.hours,0),pending:group.filter(r=>['pending','submitted','approving'].includes(r.status)).length,
        latest:[...group].sort((a,b)=>day(b.activityDate).localeCompare(day(a.activityDate)))[0]||null};
    });
    const total=number(card?.totalHours), goal=options.goal;
    // Never use lifetime/carry-forward totals for annual progress.
    const validGoal=goal && ((options.demo && goal.source==='synthetic') || (goal.source==='official' && goal.verified===true)) && number(goal.targetHours)>0 && number(goal.approvedHours)!==null;
    const target=validGoal?{...goal,percent:Math.min(100,Math.round(goal.approvedHours/goal.targetHours*100)),remaining:Math.max(0,goal.targetHours-goal.approvedHours)}:null;
    return {today,month,total,monthHours:monthly[5].hours,monthCount:rows.filter(r=>r.status!=='draft' && day(r.activityDate).startsWith(month)).length,
      activityCount:rows.filter(r=>r.status!=='draft').length,pendingCount:number(card?.pendingCount),approvedCount:number(card?.approvedCount),goal:target,categories,
      monthly:monthly.map(m=>({...m,cumulative:cumulative+=m.hours})),approvedLoadedHours:approved.reduce((s,r)=>s+r.hours,0),
      undatedApproved:approved.length-dated.length,partial:options.complete!==true,demo:options.demo===true,
      achievements:[{hours:0,label:'First Mission',earned:number(card?.approvedCount)!==null?card.approvedCount>0:approved.length>0},...[10,25,50].map(hours=>({hours,label:hours+' Hours',earned:total!==null && total>=hours}))]};
  }
  function filterRecords(items,filters={}) {
    const query=String(filters.query||'').trim().toLocaleLowerCase('th-TH');
    return items.filter(r=> (!filters.status || filters.status==='all' || (filters.status==='pending'?['pending','submitted','approving'].includes(r.status):r.status===filters.status)) &&
      (!filters.category || String(r.categoryId)===String(filters.category)) && (!filters.month || day(r.activityDate).startsWith(filters.month)) &&
      (!filters.year || String(r.yearLevel)===String(filters.year)) && (!filters.student || r.studentId===filters.student) &&
      (!query || [r.deedId,r.description,r.studentId,r.ownerName,filters.categoryNames?.[r.categoryId]].some(value=>String(value||'').toLocaleLowerCase('th-TH').includes(query))));
  }
  function timeline(record) {
    if(Array.isArray(record.timeline) && record.timeline.length) return record.timeline.map(e=>({...e}));
    const events=[];
    if(record.createdAt) events.push({label:'บันทึก',at:record.createdAt});
    if(record.submittedAt) events.push({label:'ส่งตรวจ',at:record.submittedAt});
    if(record.reviewStartedAt) events.push({label:'อาจารย์ตรวจ',at:record.reviewStartedAt});
    if(['approved','rejected'].includes(record.status)) events.push({label:record.status==='approved'?'อนุมัติ':'ให้แก้ไข',at:record.reviewedAt||'',note:record.note||record.reviewNote||'',actor:record.reviewerName||''});
    return events;
  }
  const api=Object.freeze({day,bangkokDay,summarize,filterRecords,timeline});
  root.GoodDeedMissionData=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?this:window);
