const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
const sid = ['99', '00001'].join('');

function client(respond) {
  const storage = new Map(), listeners = new Set(), requests = [], saved = [], events = [];
  const sessionStorage = { getItem: k => storage.get(k), setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) };
  const app = { setSession: (...v) => saved.push(v), saveDeeds: (...v) => saved.push(v) };
  const frames = [];
  const document = {body: {appendChild() {}}, createElement(tag) {
    const el = {style:{}, children:[], setAttribute(){}, appendChild(x){this.children.push(x);}, remove(){}};
    if(tag === 'iframe') { el.contentWindow = {}; frames.push(el); }
    if(tag === 'form') el.submit = () => {
      const fields = Object.fromEntries(el.children.map(x => [x.name,x.value]));
      const frame = frames.find(f => f.name === el.target);
      const reply = (data, ok = true, origin = 'https://script.google.com') => {
        for (const fn of [...listeners]) fn({source:frame.contentWindow, origin, data:{channel:'RTAFNC_GOODDEED',requestId:fields.requestId,ok,...(ok?{data}:{error:data})}});
      };
      requests.push(fields); respond(fields,reply);
    };
    return el;
  }};
  const context = {App:app, CONFIG:{GAS_URL:'https://script.google.com/macros/s/synthetic/exec'}, document, sessionStorage, localStorage:sessionStorage,
    crypto:{randomUUID}, location:{origin:'https://example.test'}, setTimeout,clearTimeout,setInterval,clearInterval,
    CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail;}},
    addEventListener:(_,f)=>listeners.add(f), removeEventListener:(_,f)=>listeners.delete(f), dispatchEvent:e=>events.push(e)};
  context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync('frontend/gateway-client.js','utf8'),context);
  return {app,context,requests,saved,events,listeners};
}
const login = (mustChangePassword=false) => ({sessionToken:'synthetic-session',user:{role:'student',studentId:sid,mustChangePassword}});

test('login returns without waiting for a separate deed read',async()=>{
  const c=client((f,r)=>r(login()));
  assert.equal((await c.app.loginStudent(sid,'synthetic')).success,true);
  assert.equal(c.requests.length,1);assert.equal(c.requests[0].action,'login');
});
test('first login routes to password change without publishing an app session',async()=>{
  const c=client((f,r)=>r(login(true)));
  const result=await c.app.loginStudent(sid,'synthetic');
  assert.equal(result.requiresPasswordChange,true);assert.equal(result.success,false);
  assert.equal(c.saved.length,0);assert.equal(c.requests.length,1);
});
test('failed LINE binding does not silently issue another password login',async()=>{
  const c=client((f,r)=>r('LINE verification failed',false));
  c.context.liff={isLoggedIn:()=>true,getIDToken:()=>'synthetic-id-token'};
  assert.equal((await c.app.loginStudent(sid,'synthetic')).success,false);
  assert.equal(c.requests.length,1);assert.equal(c.requests[0].action,'bindLineAndLogin');
});
test('clearing an in-flight login cannot restore its session',async()=>{
  let reply;const c=client((f,r)=>{reply=r;});
  const pending=c.app.loginTeacher('synthetic','synthetic');
  c.context.GoodDeedV2.clear();reply({sessionToken:'late',user:{role:'teacher'}});
  assert.equal((await pending).success,false);assert.equal(c.saved.length,0);
  assert.equal(c.listeners.size,0);
});
test('student sync emits refresh event and rejects foreign rows before caching',async()=>{
  let foreign=false;const c=client((f,r)=>r(f.action==='login'?login():{deeds:[{recordId:'synthetic-record',studentId:foreign?'other':sid,hours:0.5,status:'approved'}]}));
  await c.app.loginStudent(sid,'synthetic');await c.context.GoodDeedV2.syncDeeds(sid);
  assert.equal(c.events.length,1);const count=c.saved.length;foreign=true;
  await assert.rejects(c.context.GoodDeedV2.syncDeeds(sid),/RESPONSE_INVALID/);
  assert.equal(c.saved.length,count);
});
test('untrusted message origin cannot complete a request',async()=>{
  let reply;const c=client((f,r)=>{reply=r;});
  const pending=c.app.loginTeacher('synthetic','synthetic');
  reply({sessionToken:'fake',user:{role:'teacher'}},true,'https://attacker.test');
  assert.equal(c.saved.length,0);assert.equal(c.listeners.size,1);
  c.context.GoodDeedV2.clear();assert.equal((await pending).success,false);
});
test('frontend reports notification success only for confirmed server delivery',async()=>{
  const c=client(()=>{});
  for(const status of ['unknown','failed','not_configured']) assert.equal(await c.app.notifyAdmins({notification:{status}}),false);
  assert.equal(await c.app.notifyAdmins({}),false);
  assert.equal(await c.app.notifyAdmins({notification:{status:'sent'}}),true);
});

function backend(code,body,configured=true) {
  const sends=[];
  const context=vm.createContext({PropertiesService:{getScriptProperties:()=>({getProperty:()=>configured?'synthetic':''})},
    UrlFetchApp:{fetch:(url,opts)=>{sends.push(JSON.parse(opts.payload));if(code==='throw')throw Error('secret-url');return {getResponseCode:()=>code,getContentText:()=>body};}}});
  vm.runInContext(fs.readFileSync('backend/CodeV2.gs','utf8'),context);
  return {context,sends};
}
test('Telegram requires both HTTP acceptance and valid API success',()=>{
  for(const [code,body,status] of [[200,'{"ok":true,"result":{"message_id":1}}','sent'],[200,'{"ok":false}','failed'],[429,'{"ok":false}','failed'],[200,'not-json','unknown'],['throw','','unknown']]) {
    const b=backend(code,body);assert.equal(b.context.notifyTelegram_('synthetic notice').status,status);
    assert.match(b.sends[0].reply_markup.inline_keyboard[0][0].url,/teacher-dashboard.html$/);
    assert.equal(b.sends[0].reply_markup.inline_keyboard[0][0].callback_data,undefined);
  }
  const b=backend(200,'',false);assert.equal(b.context.notifyTelegram_('notice').status,'not_configured');assert.equal(b.sends.length,0);
});

test('failed Telegram delivery retains the saved deed and repeated request does not resend',()=>{
  const b=backend(429,'{"ok":false}'), rows=[], audits=[];
  Object.assign(b.context,{
    LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
    Utilities:{getUuid:()=> 'synthetic-record'},
    findRecord_:fn=>rows.find(fn), saveEvidence_:()=>({}), publicDeed_:r=>r,
    append_:(sheet,row)=>rows.push(row), audit_:(...args)=>audits.push(args)
  });
  const session={role:'student',memberId:'synthetic-member',studentId:sid};
  const payload={studentId:sid,category:'หมวด 7',activityDate:'2026-09-15',hours:0.5,description:'Synthetic deed'};
  const result=b.context.submitDeed_(session,payload,'synthetic-request');
  assert.equal(result.notification.status,'failed');assert.equal(rows.length,1);
  assert.equal(rows[0].status,'pending');assert.equal(audits[1][1],'telegram.failed');
  const duplicate=b.context.submitDeed_(session,payload,'synthetic-request');
  assert.equal(duplicate.duplicate,true);assert.equal(rows.length,1);assert.equal(b.sends.length,1);
});

test('summary preserves half-hour values for records and the existing fallback',()=>{
  const context=vm.createContext({console,URL,window:{location:{hostname:'example.test',protocol:'https:'}},
    document:{addEventListener(){}},localStorage:{getItem:()=>null},module:{exports:{}},setTimeout(){}});
  vm.runInContext(fs.readFileSync('frontend/app.js','utf8'),context);
  const app=context.module.exports.App;
  app.getDeeds=()=>[{status:'approved',categoryId:7,hours:0.5}];
  assert.equal(app.getStudentSummary(sid).totalHours,0.5);
  assert.equal(app.getStudentSummary(sid).byCategory.find(c=>c.id===7).hours,0.5);
  app.getDeeds=()=>[];app.getStudentById=()=>({total_hours:1.5});
  assert.equal(app.getStudentSummary(sid).totalHours,1.5);
});

for (const [path,fn] of [['backend/Code.gs','notifyTelegramNewDeed'],['backend/CodeV2.gs','notifyTelegram_']]) {
  test(path + ' preserves safe rate-limit diagnostics without reflecting provider descriptions',()=>{
    const sends=[];
    const context=vm.createContext({PropertiesService:{getScriptProperties:()=>({getProperty:()=> 'synthetic'})},
      UrlFetchApp:{fetch:(url,opts)=>{sends.push(JSON.parse(opts.payload));return {getResponseCode:()=>429,getContentText:()=>JSON.stringify({ok:false,error_code:429,description:'private diagnostic',parameters:{retry_after:30}})};}}});
    vm.runInContext(fs.readFileSync(path,'utf8'),context);
    const result=context[fn]({desc:'<invalid>&'.repeat(1000),studentName:'Private name'});
    assert.equal(result.status,'failed');assert.equal(result.errorCode,429);assert.equal(result.retryAfterSeconds,30);
    assert.equal(result.description,undefined);assert.equal(sends.length,1);
    if(fn==='notifyTelegramNewDeed') {
      assert.equal(sends[0].parse_mode,undefined);
      assert.equal(sends[0].text.includes('Private name'),false);
      assert.equal(sends[0].reply_markup.inline_keyboard[0][0].url.includes('?'),false);
    }
  });
}

test('legacy Telegram missing configuration and network errors return explicit states',()=>{
  let configured=false, calls=0;
  const context=vm.createContext({PropertiesService:{getScriptProperties:()=>({getProperty:()=>configured?'synthetic':''})},
    UrlFetchApp:{fetch:()=>{calls++;throw Error('token-bearing-url');}}});
  vm.runInContext(fs.readFileSync('backend/Code.gs','utf8'),context);
  assert.equal(context.notifyTelegramNewDeed({}).status,'not_configured');assert.equal(calls,0);
  configured=true;const result=context.notifyTelegramNewDeed({});assert.equal(result.status,'unknown');
  assert.equal(JSON.stringify(result).includes('token-bearing-url'),false);assert.equal(calls,1);
});

test('actual handoff smoke test requires valid getMe and sendMessage API results',()=>{
  for(const mode of ['denied','malformed','send-denied','sent']) {
    const calls=[],logs=[];
    const context=vm.createContext({console:{log:x=>logs.push(x)},PropertiesService:{getScriptProperties:()=>({getProperty:()=> 'synthetic'})},
      UrlFetchApp:{fetch:(url,opts)=>{
        calls.push(url.endsWith('/getMe')?'getMe':'sendMessage');
        return {getResponseCode:()=>200,getContentText:()=>mode==='malformed'?'invalid':JSON.stringify(url.endsWith('/getMe')
          ?{ok:mode!=='denied',result:{is_bot:true}}
          :{ok:mode==='sent',result:{message_id:1}})};
      }}});
    vm.runInContext(fs.readFileSync('backend/CodeV2.gs','utf8'),context);
    const result=context.testTelegramNotification();
    assert.equal(result.ok,mode==='sent');
    assert.equal(calls.length,['denied','malformed'].includes(mode)?1:2);
    assert.equal(logs.join('').includes('synthetic'),false);
  }
});
test('Telegram smoke test can diagnose missing config without initializing business storage',()=>{
  const b=backend(200,'',false);
  assert.equal(b.context.testTelegramNotification().status,'not_configured');assert.equal(b.sends.length,0);
});
test('actual handoff cannot bootstrap a password from knowledge of a student number',()=>{
  const b=backend(200,'');
  b.context.verifyPassword_=()=>true;
  assert.equal(b.context.verifyOrInitializeStudentPassword_({studentId:sid,username:sid,role:'student'},sid,'synthetic'),false);
  assert.equal(b.context.verifyOrInitializeStudentPassword_({passwordSalt:'stored',passwordHash:'stored'},'existing','synthetic'),true);
});
