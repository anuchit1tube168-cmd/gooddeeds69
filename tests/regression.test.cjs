const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const cp = require('node:child_process');
const TEST_STUDENT = ['99', '00001'].join('');
const source = path => process.env.BASELINE === '1' ? cp.execFileSync('git', ['show', 'HEAD:' + path], {encoding:'utf8'}) : fs.readFileSync(path,'utf8');

function backend() {
  const ledger = [['id','student','category','hours','date','description','location','evidence','reviewer','status'], ['deed_123_abcd','9900001',6,1,'2026-09-06','Synthetic activity','','','','pending']];
  const master = [Array(18).fill('header'), ['', '9900001', '', '', '', '', 0,0,0,0,0,5,0,0,0,5,'','']];
  const writes = [], messages = [];
  let failMaster = false;
  const sheet = (rows, type) => ({getDataRange:()=>({getValues:()=>rows.map(r=>[...r])}),getRange:(r,c)=>({getFormula:()=>String(rows[r-1][c-1]).startsWith('=')?rows[r-1][c-1]:'',setValue:v=>{if(type==='master' && failMaster) throw Error('storage unavailable'); rows[r-1][c-1]=v;writes.push([type,c,v]);},setFormula:v=>{rows[r-1][c-1]=v;}})});
  const sheets = {Deeds_2569:sheet(ledger,'ledger'),Main_2569:sheet(master,'master')};
  const props = {TELEGRAM_WEBHOOK_KEY:'x'.repeat(32),TELEGRAM_APPROVER_IDS:'123',TELEGRAM_CHAT_ID:'-456',TELEGRAM_BOT_TOKEN:'synthetic'};
  const context = vm.createContext({console,PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]||''})},SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:n=>sheets[n]}),flush:()=>{}},LockService:{getScriptLock:()=>({waitLock:()=>{},releaseLock:()=>{}})},UrlFetchApp:{fetch:(url,opts)=>{messages.push(JSON.parse(opts.payload));return {getResponseCode:()=>200}}}});
  vm.runInContext(source('backend/Code.gs'),context);
  return {context,ledger,master,writes,messages,fail:()=>{failMaster=true;},removeMaster:()=>{delete sheets.Main_2569;},cb:{id:'query-1',data:'approve_deed_123_abcd_9900001',from:{id:123},message:{chat:{id:-456},message_id:1}}};
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
  const b=backend();b.fail();assert.throws(()=>b.context.approveDeed({deedId:'deed_123_abcd'}));
  assert.equal(b.ledger[1][9],'approving');assert.equal(b.context.approveDeed({deedId:'deed_123_abcd'}).code,'review_conflict');
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

test('v2 rejects quarter-hour increments before any storage call',()=>{
  const context=vm.createContext({console});vm.runInContext(source('backend/CodeV2.gs'),context);
  assert.throws(()=>context.submitDeed_({role:'student',studentId:TEST_STUDENT,memberId:'synthetic'}, {studentId:TEST_STUDENT,category:'6',activityDate:'2026-09-06',hours:0.75,description:'Synthetic activity'},'test'),/ข้อมูลกิจกรรม/);
});
