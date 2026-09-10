const test=require('node:test'),assert=require('node:assert/strict');
const {summarize,day,filterRecords,timeline}=require('../frontend/secure-pilot/mission-data.js');
const ui=require('../frontend/gooddeed-ui.js');
const card={totalHours:105,pendingCount:3,approvedCount:8};
const rows=[
 {deedId:'synthetic-a',status:'approved',hours:1.5,categoryId:5,activityDate:'2026-08-31T17:00:00.000Z',description:'ช่วยชุมชน'},
 {deedId:'synthetic-b',status:'pending',hours:24,categoryId:5,activityDate:'2026-09-02'},
 {deedId:'synthetic-c',status:'rejected',hours:24,categoryId:6,activityDate:'2026-09-03'},
 {deedId:'synthetic-d',status:'draft',hours:24,categoryId:6,activityDate:'2026-09-04'},
 {deedId:'synthetic-e',status:'approved',hours:2,categoryId:3,activityDate:'2026-08-15'},
 {deedId:'synthetic-f',status:'approved',hours:0.5,categoryId:1,activityDate:'invalid'}
];
const options={now:'2026-09-10T00:00:00Z'};
test('official totals and annual goals are never inferred from partial ledger rows',()=>{
 const data=summarize(card,rows,options);
 assert.equal(data.total,105);assert.equal(data.approvedLoadedHours,4);assert.equal(data.goal,null);assert.equal(data.partial,true);
 assert.equal(data.pendingCount,3);assert.equal(data.approvedCount,8);assert.equal(data.activityCount,5);
 assert.equal(summarize({totalHours:null},[],options).total,null);
 assert.equal(summarize({totalHours:'105'},[],options).total,null);
});
test('monthly and radar hours count only approved rows and use Bangkok activity dates',()=>{
 const data=summarize(card,rows,options);
 assert.equal(data.monthHours,1.5);assert.equal(data.monthCount,3);assert.equal(data.categories[4].hours,1.5);assert.equal(data.categories[4].count,2);
 assert.equal(data.categories[5].hours,0);assert.equal(data.undatedApproved,1);assert.equal(data.monthly[5].cumulative,3.5);
 assert.equal(day('2026-08-31T17:00:00.000Z'),'2026-09-01');
 assert.equal(day('2026-02-30'),'');assert.equal(day('2026-09-01Tbroken'),'');assert.equal(day('2026-09-01'),'2026-09-01');
});
test('goal requires a verified period-specific value; carry-forward cannot fill it',()=>{
 const goal={source:'official',verified:true,targetHours:50,approvedHours:12.5,periodLabel:'Verified period'};
 const data=summarize(card,rows,{...options,goal});assert.equal(data.goal.percent,25);assert.equal(data.goal.remaining,37.5);
 for(const changed of [{verified:false},{approvedHours:null},{targetHours:0},{source:'browser'},{approvedHours:'12.5'}])assert.equal(summarize(card,rows,{...options,goal:{...goal,...changed}}).goal,null);
 const synthetic={...goal,source:'synthetic'};assert.equal(summarize(card,rows,{...options,goal:synthetic}).goal,null);
 assert.equal(summarize(card,rows,{...options,demo:true,goal:synthetic}).goal.percent,25);
});
test('six-month view crosses calendar years without treating them as academic-year policy',()=>{
 const data=summarize(card,[],{now:'2026-01-01T00:00:00Z'});
 assert.deepEqual(data.monthly.map(m=>m.key),['2025-08','2025-09','2025-10','2025-11','2025-12','2026-01']);assert.equal(data.goal,null);
});
test('queue filters combine status, year, student, category, month and search without mutation',()=>{
 const id=['99','00001'].join(''),items=rows.map(r=>({...r,studentId:id,yearLevel:2,ownerName:'Synthetic'})),before=JSON.stringify(items);
 const matched=filterRecords(items,{status:'approved',year:'2',student:id,category:'5',month:'2026-09',query:'ชุมชน'});
 assert.deepEqual(matched.map(r=>r.deedId),['synthetic-a']);assert.equal(filterRecords(items,{year:'4'}).length,0);assert.equal(JSON.stringify(items),before);
});
test('timeline does not invent review timestamps and escapes reviewer content',()=>{
 const events=timeline({status:'rejected',submittedAt:'2026-09-10T00:00:00Z',reviewNote:'<script>bad</script>'});
 assert.equal(events.length,2);assert.equal(events[1].at,'');assert.equal(events[1].label,'ให้แก้ไข');
 const html=ui.timeline(events);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);
 assert.doesNotThrow(()=>ui.timeline([{label:'ส่งตรวจ',at:'invalid'}]));
});
test('category identifiers stay in the original nine-category storage contract',()=>{
 const data=summarize(card,rows,options);assert.deepEqual(data.categories.map(c=>c.id),[1,2,3,4,5,6,7,8,9]);assert.equal(ui.categories.length,10);
});
