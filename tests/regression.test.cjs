const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const cp = require('node:child_process');
const LEDGER_HEADERS = ['Deed ID','รหัสนักเรียน','หมวดหมู่ ID','จำนวนชั่วโมง','วันที่ทำกิจกรรม','รายละเอียด','สถานที่','รูปหลักฐาน URL','ผู้ตรวจประเมิน','สถานะ','วันที่ส่งเรื่อง'];
const MASTER_HEADERS = ['ลำดับ','รหัสประจำตัว','ยศ','ชื่อ','นามสกุล','ชั้นปี (รุ่น)',...JSON.parse(fs.readFileSync('docs/staging-columns.example.json','utf8')).masterColumnMap.categoryHours,'รวมชั่วโมงสะสม','เกณฑ์ขั้นต่ำ','ผลการประเมิน (Grade)','ระดับความดี (Level)','LINE User ID','LINE Display Name','อัปเดตล่าสุด'];
const TEST_STUDENT = ['99', '00001'].join('');
const source = path => process.env.BASELINE === '1' ? cp.execFileSync('git', ['show', 'HEAD:' + path], {encoding:'utf8'}) : fs.readFileSync(path,'utf8');

function backend() {
  const ledger = [[...LEDGER_HEADERS], ['deed_123_abcd','9900001',6,1,'2026-09-06','Synthetic activity','','','','pending']];
  const master = [[...MASTER_HEADERS], ['', '9900001', '', '', '', '', 0,0,0,0,0,5,0,0,0,5,'','']];
  const writes = [], messages = [], events = [];
  let failMaster = false, failFlush = false, failLock = false;
  const sheet = (rows, type) => ({getDataRange:()=>({getValues:()=>rows.map(r=>r.map(v=>typeof v==='string'&&v.startsWith('=')?5:v))}),appendRow:row=>{rows.push([...row]);writes.push([type,'append']);events.push('append');},getRange:(r,c)=>({getFormula:()=>String(rows[r-1][c-1]).startsWith('=')?rows[r-1][c-1]:'',setValue:v=>{if(type==='master' && failMaster) throw Error('storage unavailable'); rows[r-1][c-1]=v;writes.push([type,c,v]);},setFormula:v=>{rows[r-1][c-1]=v;}})});
  const sheets = {Deeds_2569:sheet(ledger,'ledger'),Main_2569:sheet(master,'master')};
  const props = {PRODUCTION_WRITE_ENABLED:'true',TELEGRAM_WEBHOOK_KEY:'x'.repeat(32),TELEGRAM_APPROVER_IDS:'123',TELEGRAM_CHAT_ID:'-456',TELEGRAM_BOT_TOKEN:'synthetic'};
  const context = vm.createContext({console,PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]||''})},SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:n=>sheets[n]}),flush:()=>{events.push('flush');if(failFlush)throw Error('flush unavailable');}},LockService:{getScriptLock:()=>({waitLock:()=>{if(failLock)throw Error('lock unavailable');events.push('lock');},releaseLock:()=>{events.push('unlock');}})},UrlFetchApp:{fetch:(url,opts)=>{messages.push(JSON.parse(opts.payload));return {getResponseCode:()=>200}}}});
  vm.runInContext(source('backend/Code.gs'),context);
  return {context,ledger,master,writes,messages,events,failFlush:()=>{failFlush=true;},failLock:()=>{failLock=true;},removeLedger:()=>{delete sheets.Deeds_2569;},fail:()=>{failMaster=true;},removeMaster:()=>{delete sheets.Main_2569;},cb:{id:'query-1',data:'approve_deed_123_abcd_9900001',from:{id:123},message:{chat:{id:-456},message_id:1}}};
}
test('approval uses stored category/hours and increments only once',()=>{
  const b=backend();const request={deedId:'deed_123_abcd',studentId:TEST_STUDENT,categoryId:1,hours:99};
  assert.equal(b.context.approveDeed(request).status,'success');
  assert.equal(b.master[1][11],6);assert.equal(b.master[1][6],0);
  assert.equal(b.context.approveDeed(request).duplicate,true);assert.equal(b.master[1][11],6);
});
test('missing record and mismatched owner fail without writes',()=>{
  const b=backend(); assert.equal(b.context.approveDeed({deedId:'missing'}).status,'error');
  assert.equal(b.context.approveDeed({deedId:'deed_123_abcd',studentId:TEST_STUDENT.slice(0,-1)+'2'}).status,'error');assert.equal(b.writes.length,0);
});
test('missing master prevents approval',()=>{const b=backend();b.removeMaster();assert.equal(b.context.approveDeed({deedId:'deed_123_abcd'}).status,'error');assert.equal(b.ledger[1][9],'pending');});
test('carry-forward numeric total and existing formula/policy columns are preserved',()=>{
  const b=backend();b.master[1][15]=105;b.master[1][16]='existing policy';b.master[1][17]='existing result';
  b.context.approveDeed({deedId:'deed_123_abcd'});assert.equal(b.master[1][15],106);assert.equal(b.master[1][16],'existing policy');assert.equal(b.master[1][17],'existing result');
  const c=backend();c.master[1][15]='=SUM(G2:O2)+100';c.context.approveDeed({deedId:'deed_123_abcd'});assert.equal(c.master[1][15],'=SUM(G2:O2)+100');
});
test('uncertain cross-sheet write cannot replay hours',()=>{
  const b=backend();b.fail();const r=b.context.approveDeed({deedId:'deed_123_abcd'});
  assert.equal(r.code,'review_requires_reconciliation');assert.equal(r.deedId,'deed_123_abcd');
  assert.equal(b.ledger[1][9],'approving');assert.equal(b.context.approveDeed({deedId:'deed_123_abcd'}).code,'review_requires_reconciliation');
});
test('callback preserves underscore IDs and confirms only after persistence',()=>{
  const b=backend();const r=b.context.handleTelegramCallback(b.cb,'x'.repeat(32));assert.equal(r.status,'success');assert.equal(b.ledger[1][9],'approved');assert.equal(b.master[1][11],6);assert.equal(b.messages.length,2);
});
test('callback rejects missing secret and unauthorized approver without side effects',()=>{
  const b=backend();assert.equal(b.context.handleTelegramCallback(b.cb,'').code,'webhook_unauthorized');
  b.cb.from.id=999;assert.equal(b.context.handleTelegramCallback(b.cb,'x'.repeat(32)).code,'reviewer_forbidden');assert.equal(b.writes.length,0);assert.equal(b.messages.length,0);
});
test('failed callback write does not remove review buttons or report success',()=>{
  const b=backend();b.fail();const r=b.context.handleTelegramCallback(b.cb,'x'.repeat(32));assert.equal(r.status,'error');assert.equal(b.messages.length,1);assert.match(b.messages[0].text,/ยังบันทึกผลไม่ได้/);
});

function app(hostname) {
  const listeners = {}, sources = [], timers = [];
  const context = vm.createContext({console,URL,window:{location:{hostname,protocol:'https:'}},document:{addEventListener:(n,f)=>{listeners[n]=f}},localStorage:{getItem:()=>null,setItem:()=>{}},module:{exports:{}},EventSource:function(url){this.url=url;this.addEventListener=()=>{};this.close=()=>{};sources.push(this);},setTimeout:(f,t)=>timers.push({f,t}),fetch:()=>{throw Error('unexpected network');}});
  vm.runInContext(source('frontend/app.js'),context);
  return {context,sources,timers,App:context.module.exports.App};
}
test('static hosting never starts the local API or SSE',()=>{
  const a=app('example.github.io');assert.equal(a.App.canUseBackendApi(),false);a.context.startRealtimeUpdates();assert.equal(a.sources.length,0);
});
test('local SSE has a single connection and bounded retries',()=>{
  const a=app('localhost');a.context.startRealtimeUpdates();a.context.startRealtimeUpdates();assert.equal(a.sources.length,1);
  a.sources[0].onerror();a.timers.shift().f();a.sources[1].onerror();a.timers.shift().f();a.sources[2].onerror();assert.equal(a.timers.length,0);assert.equal(a.sources.length,3);
});
test('frontend notification functions never use browser tokens',async()=>{
  const a=app('example.github.io');a.App.getSettings=()=>({telegramToken:'synthetic',adminChatId:'-456'});
  assert.equal(await a.App.sendTelegram('-456','test'),false);assert.equal(await a.App.sendTelegramPhoto('-456',{}),false);
});

test('remote continuation cannot enable local transports merely from a tunnel or configured hostname',()=>{
  for(const host of ['synthetic.trycloudflare.com','staging.example']){const a=app(host);assert.equal(a.App.canUseBackendApi(),false);a.context.startRealtimeUpdates();assert.equal(a.sources.length,0);}
});
test('profile name repair cannot fall back to unsigned local or GAS identity requests',async()=>{
  const a=app('example.github.io');assert.equal(await a.App.ensureStudentProfile(TEST_STUDENT),null);
});
test('Master name, official sequence and total use the verified columns, never category or grade',()=>{
  const b=backend();b.context.CacheService={getScriptCache:()=>({get:()=>null,put:()=>{}})};
  b.master[1][0]=17;b.master[1][2]='นพอ.';b.master[1][3]='Synthetic';b.master[1][4]='Student';b.master[1][5]='69';b.master[1][6]=8;b.master[1][7]=2;b.master[1][15]=105;b.master[1][17]='ยังไม่ผ่าน';
  const student=b.context.getStudents()[0];assert.equal(student.full_name,'นพอ. Synthetic Student');assert.equal(student.no,17);assert.equal(student.class_year,'69');assert.equal(student.year_level,'1');assert.equal(student.total_hours,105);
  b.master[1][0]='';assert.equal(b.context.getStudents()[0].no,'-');
});
test('Master identity lookup rejects wrong headers or duplicate identities instead of choosing a profile',()=>{
  for(const mode of ['header','duplicate']){const b=backend();b.context.CacheService={getScriptCache:()=>({get:()=>null,put:()=>{}})};
    if(mode==='header')b.master[0][5]='full name';else b.master.push([...b.master[1]]);
    assert.throws(()=>b.context.getStudents());
  }
});

test('v2 rejects quarter-hour increments before any storage call',()=>{
  const context=vm.createContext({console});vm.runInContext(source('backend/CodeV2.gs'),context);
  assert.throws(()=>context.submitDeed_({role:'student',studentId:TEST_STUDENT,memberId:'synthetic'}, {studentId:TEST_STUDENT,category:'6',activityDate:'2026-09-06',hours:0.75,description:'Synthetic activity'},'test'),/ข้อมูลกิจกรรม/);
});

test('duplicate ledger or master identities never approve an arbitrary row',()=>{
  for(const kind of ['ledger','master']){const b=backend();b[kind].push([...b[kind][1]]);assert.equal(b.context.approveDeed({deedId:'deed_123_abcd'}).status,'error');assert.equal(b.writes.length,0);}
});
test('invalid stored half-hour values do not transition the ledger',()=>{
  for(const value of [true,'1e1','0x10',0.25,0.75]){const b=backend();b.ledger[1][3]=value;assert.equal(b.context.approveDeed({deedId:'deed_123_abcd'}).code,'invalid_stored_deed');assert.equal(b.writes.length,0);}
});
test('invalid master category or total fails before an approving marker is written',()=>{
  for(const [column,value] of [[11,'not-a-number'],[11,-1],[15,true],[15,'  '],[15,'1e2']]){const b=backend();b.master[1][column]=value;assert.equal(b.context.approveDeed({deedId:'deed_123_abcd'}).code,'master_requires_reconciliation');assert.equal(b.writes.length,0);}
});
test('existing category and total formulas survive approval',()=>{
  const b=backend();b.master[1][11]='=SUMIF(Deeds!A:A,B2,Deeds!D:D)';b.master[1][15]='=SUM(G2:O2)+100';const original=[...b.master[1]];
  assert.equal(b.context.approveDeed({deedId:'deed_123_abcd'}).status,'success');assert.equal(b.master[1][11],original[11]);assert.equal(b.master[1][15],original[15]);
});


test('legacy reviewer rejects reordered, duplicate and eight-column ledger schemas before writes',()=>{
  const eight=['Deed ID','รหัสนักเรียน','หมวดหมู่ ID','จำนวนชั่วโมง','วันที่ทำกิจกรรม','รายละเอียด','สถานะ','วันที่ส่งเรื่อง'];
  for(const headers of [[...LEDGER_HEADERS].reverse(),[...LEDGER_HEADERS,'สถานะ'],eight]){
    const b=backend();b.ledger[0]=headers;
    assert.equal(b.context.approveDeed({deedId:'deed_123_abcd'}).code,'ledger_schema_incompatible');
    assert.equal(b.writes.length,0);
  }
});
test('legacy reviewer refuses displaced master identity/category/total headers',()=>{
  for(const column of [1,11,15]){const b=backend();b.master[0][column]='unexpected header';
    assert.equal(b.context.approveDeed({deedId:'deed_123_abcd'}).code,'master_requires_reconciliation');assert.equal(b.writes.length,0);
  }
});
test('legacy submission refuses missing or incompatible storage before evidence or notification',()=>{
  for(const mode of ['missing','reordered']){const b=backend();let uploads=0;b.context.uploadImage=()=>{uploads++;return {url:'synthetic'};};
    if(mode==='missing')b.removeLedger();else b.ledger[0].reverse();
    const result=b.context.addDeed({id:'new_synthetic',studentId:TEST_STUDENT,categoryId:6,hours:1,description:'Synthetic',imageData:'data:image/png;base64,AA=='});
    assert.equal(result.status,'error');assert.equal(uploads,0);assert.equal(b.messages.length,0);assert.equal(b.writes.length,0);
  }
});
test('legacy submission rejects reused IDs and invalid half-hours before side effects',()=>{
  for(const [id,hours] of [['deed_123_abcd',1],['new_synthetic',true],['new_synthetic','1e1'],['new_synthetic',0.75]]){const b=backend();let uploads=0;b.context.uploadImage=()=>{uploads++;return {};};
    const result=b.context.addDeed({id,studentId:TEST_STUDENT,categoryId:6,hours,description:'Synthetic',imageData:'data:image/png;base64,AA=='});
    assert.equal(result.status,'error');assert.equal(uploads,0);assert.equal(b.messages.length,0);assert.equal(b.writes.length,0);
  }
});

const validSubmission = () => ({id:'new_synthetic',studentId:TEST_STUDENT,categoryId:6,hours:1,description:'Synthetic',activityDate:'2026-09-06'});
test('legacy submission stores literal text and notifies after flush and unlock',()=>{
  const b=backend();b.context.notifyTelegramNewDeed=()=>b.events.push('notify');
  const result=b.context.addDeed({...validSubmission(),description:'=1+1',location:'+synthetic',approver:'@synthetic'});
  assert.equal(result.status,'success');assert.equal(b.ledger.length,3);
  assert.equal(b.ledger[2].length,11);assert.equal(b.ledger[2][5],"'=1+1");
  assert.equal(b.ledger[2][6],"'+synthetic");assert.equal(b.ledger[2][8],"'@synthetic");
  assert.equal(b.ledger[2][9],'pending');assert.deepEqual(b.events,['lock','append','flush','unlock','notify']);
});
test('legacy submission preserves uncertain append, identifies it and refuses replay',()=>{
  const b=backend();b.failFlush();b.context.notifyTelegramNewDeed=()=>assert.fail('must not notify');
  const result=b.context.addDeed(validSubmission());
  assert.equal(result.code,'submission_requires_reconciliation');assert.equal(result.deedId,'new_synthetic');
  assert.equal(b.ledger.length,3);assert.equal(b.context.addDeed(validSubmission()).code,'deed_identity_conflict');
  assert.equal(b.ledger.length,3);assert.equal(b.messages.length,0);
});
test('legacy submission rejects an unavailable lock without writing or unlocking it',()=>{
  const b=backend();b.failLock();const result=b.context.addDeed(validSubmission());
  assert.equal(result.code,'submission_failed');assert.equal(b.writes.length,0);assert.deepEqual(b.events,[]);
});
test('legacy submission stops on a failed evidence upload',()=>{
  const b=backend();b.context.uploadImage=()=>({status:'error'});
  assert.equal(b.context.addDeed({...validSubmission(),imageData:'data:image/png;base64,AA=='}).code,'evidence_upload_failed');
  assert.equal(b.writes.length,0);assert.equal(b.messages.length,0);
});
test('legacy submission failure to notify does not lose a persisted record',()=>{
  const b=backend();b.context.console={error:()=>{}};b.context.notifyTelegramNewDeed=()=>{throw Error('delivery unavailable');};
  assert.equal(b.context.addDeed(validSubmission()).status,'success');assert.equal(b.ledger.length,3);
  assert.equal(b.context.addDeed(validSubmission()).code,'deed_identity_conflict');assert.equal(b.ledger.length,3);
});
test('legacy submission rejects malformed dates and typed text without effects',()=>{
  for(const bad of [{activityDate:'2026-02-30'},{activityDate:{}},{activityDate:'=TODAY()'},{location:{}},{approver:true}]){
    const b=backend();assert.equal(b.context.addDeed({...validSubmission(),...bad}).code,'invalid_deed');
    assert.equal(b.writes.length,0);assert.equal(b.messages.length,0);
  }
});


test('legacy review reports lock failure with stable identity and no effects',()=>{
  const b=backend();b.failLock();
  const r=b.context.approveDeed({deedId:'deed_123_abcd'});
  assert.equal(r.code,'review_failed');assert.equal(r.deedId,'deed_123_abcd');
  assert.equal(b.writes.length,0);assert.deepEqual(b.events,[]);
});
test('legacy review reports uncertain flush and preserves its reconciliation marker',()=>{
  const b=backend();b.failFlush();
  const r=b.context.approveDeed({deedId:'deed_123_abcd'});
  assert.equal(r.code,'review_requires_reconciliation');assert.equal(r.deedId,'deed_123_abcd');
  assert.equal(b.ledger[1][9],'approving');assert.equal(b.master[1][11],5);
  assert.equal(b.events.at(-1),'unlock');assert.equal(b.messages.length,0);
  const before=b.writes.length;
  assert.equal(b.context.approveDeed({deedId:'deed_123_abcd'}).code,'review_requires_reconciliation');
  assert.equal(b.writes.length,before);
});
test('legacy rejection flush failure is uncertain, and replay never credits hours',()=>{
  const b=backend();b.failFlush();
  const request={deedId:'deed_123_abcd',status:'rejected'};
  assert.equal(b.context.approveDeed(request).code,'review_requires_reconciliation');
  assert.equal(b.master[1][11],5);assert.equal(b.ledger[1][9],'rejected');
  const before=b.writes.length;
  assert.equal(b.context.approveDeed(request).duplicate,true);assert.equal(b.writes.length,before);
});
test('legacy review rejects malformed input before requesting a lock',()=>{
  for(const input of [null,undefined,[],{}, {deedId:{}}, {deedId:'=formula'}, {deedId:'deed_123_abcd',status:'unknown'}]){
    const b=backend();assert.equal(b.context.approveDeed(input).code,'invalid_review');assert.deepEqual(b.events,[]);
  }
});

test('every approval write boundary fails explicitly and cannot double-credit on retry',()=>{
  for(const phase of ['before','after'])for(let point=1;point<=5;point++){
    const b=backend(), ss=b.context.SpreadsheetApp.getActiveSpreadsheet();let call=0;
    b.context.SpreadsheetApp.getActiveSpreadsheet=()=>({getSheetByName:name=>{
      const sheet=ss.getSheetByName(name);return {...sheet,getRange:(...args)=>{
        const range=sheet.getRange(...args);return {...range,setValue:value=>{
          const selected=++call===point;
          if(selected&&phase==='before')throw Error('PRIVATE_STORAGE_DETAIL');
          range.setValue(value);
          if(selected&&phase==='after')throw Error('PRIVATE_STORAGE_DETAIL');
        }};
      }};
    }});
    const r=b.context.approveDeed({deedId:'deed_123_abcd'});
    assert.equal(r.code,'review_requires_reconciliation',`${phase} write ${point}`);
    assert.equal(r.deedId,'deed_123_abcd');assert.equal(JSON.stringify(r).includes('PRIVATE_STORAGE_DETAIL'),false);
    assert.equal(b.events.at(-1),'unlock');assert.equal(b.messages.length,0);
    const before=b.writes.length, status=b.ledger[1][9];
    const retry=b.context.approveDeed({deedId:'deed_123_abcd'});
    if(status==='approving'){
      assert.equal(retry.code,'review_requires_reconciliation');assert.equal(b.writes.length,before);
    }else{
      assert.equal(retry.status,'success');assert.equal(b.master[1][11],6);assert.equal(b.master[1][15],6);
    }
    assert.ok(b.master[1][11]<=6);assert.ok(b.master[1][15]<=6);
  }
});
test('later approval flush failures retain state and never credit again',()=>{
  for(let point=2;point<=3;point++){
    const b=backend(), flush=b.context.SpreadsheetApp.flush;let call=0;
    b.context.SpreadsheetApp.flush=()=>{flush();if(++call===point)throw Error('PRIVATE_FLUSH_DETAIL');};
    assert.equal(b.context.approveDeed({deedId:'deed_123_abcd'}).code,'review_requires_reconciliation');
    const before=b.writes.length;
    b.context.approveDeed({deedId:'deed_123_abcd'});
    assert.equal(b.writes.length,before);assert.equal(b.master[1][11],6);assert.equal(b.master[1][15],6);
  }
});
test('lock release failure cannot replace a persisted review outcome with a thrown error',()=>{
  const b=backend(), warnings=[];
  b.context.console={warn:message=>warnings.push(message)};
  b.context.LockService.getScriptLock=()=>({waitLock:()=>{},releaseLock:()=>{throw Error('PRIVATE_LOCK_DETAIL');}});
  const r=b.context.approveDeed({deedId:'deed_123_abcd'});
  assert.equal(r.status,'success');assert.equal(b.master[1][11],6);
  assert.deepEqual(warnings,['LEGACY_REVIEW_LOCK_RELEASE_UNCONFIRMED']);
  assert.equal(b.context.approveDeed({deedId:'deed_123_abcd'}).duplicate,true);
  assert.equal(b.master[1][11],6);
});
