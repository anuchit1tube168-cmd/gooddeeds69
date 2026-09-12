const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const session={authenticated:true,studentLinked:true,accountStatus:'active',roles:['student'],permissions:['gooddeed:self:read'],csrfToken:'synthetic-csrf'};
function setup(responder){
 const calls=[];const context=vm.createContext({URL,AbortController,setTimeout,clearTimeout,module:{exports:{}},fetch:async(url,options)=>{calls.push({url,options});return responder?responder(url,options):response(session);}});
 vm.runInContext(fs.readFileSync('frontend/gateway-client.js','utf8'),context);
 return {calls,client:context.module.exports.createGoodDeedGatewayClient({origin:'https://staging.example',timeoutMs:100}),create:context.module.exports.createGoodDeedGatewayClient};
}
const response=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data});
test('gateway sends only LINE ID token to owned HTTPS origin, with cookies and no redirect',async()=>{
 const s=setup();await s.client.verifyLine('synthetic-id-token');const {url,options}=s.calls[0];
 assert.equal(url,'https://staging.example/auth/line/verify');assert.deepEqual(JSON.parse(options.body),{idToken:'synthetic-id-token'});
 assert.equal(options.credentials,'include');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');assert.equal(options.referrerPolicy,'no-referrer');
 assert.equal(options.headers['X-GoodDeeds-Role'],undefined);
});
test('missing or unsafe gateway origins fail before any network request',async()=>{
 const withCredentials=new URL('https://staging.example');withCredentials.username='synthetic';withCredentials.password='synthetic';
 const s=setup();for(const origin of ['', 'http://staging.example',withCredentials.href,'https://staging.example/other','https://staging.example/?origin=other']) await assert.rejects(s.create({origin}).verifyLine('synthetic'),e=>/^GATEWAY_/.test(e.code));assert.equal(s.calls.length,0);
});
test('failed, opaque and malformed verification cannot become a session',async()=>{
 for(const r of [response({},401),response({authenticated:true},200),response(session,0),response({...session,authenticated:false},200)]){const s=setup(()=>r);await assert.rejects(s.client.verifyLine('synthetic'));await assert.rejects(s.client.readSelf(),{code:'LINK_REQUIRED'});}
});
test('unlinked accounts do not load student data',async()=>{const s=setup(()=>response({...session,studentLinked:false}));await s.client.verifyLine('synthetic');await assert.rejects(s.client.readSelf(),{code:'LINK_REQUIRED'});assert.equal(s.calls.length,1);});
test('self reads use server scope and keep the official total separate from ledger sum',async()=>{
 const card={studentId:['99','00001'].join(''),displayName:'Synthetic',totalHours:105,levelNumber:3,levelLabel:'Official',passed:false,pendingCount:1,approvedCount:0};
 const s=setup(url=>response(url.endsWith('card-self')?{card}:url.endsWith('deeds-self')?{items:[{deedId:'own',categoryId:6,hours:0.5,status:'pending'}]}:session));
 await s.client.verifyLine('synthetic');const result=await s.client.readSelf();assert.equal(result.card.totalHours,105);assert.equal(result.items[0].hours,0.5);assert.equal(s.calls.slice(1).every(c=>!c.url.includes('?')&&c.options.body===undefined),true);
});
test('denied self request clears session and makes no fallback request',async()=>{const s=setup(url=>url.includes('/api/')?response({},403):response(session));await s.client.verifyLine('synthetic');await assert.rejects(s.client.readSelf(),{code:'ACCESS_DENIED'});const count=s.calls.length;await assert.rejects(s.client.readSelf(),{code:'LINK_REQUIRED'});assert.equal(s.calls.length,count);});
test('late verification response cannot restore state after explicit clearing',async()=>{let resolve;const s=setup(()=>new Promise(r=>{resolve=r}));const p=s.client.verifyLine('synthetic');s.client.clear();resolve(response(session));await assert.rejects(p,{code:'REQUEST_CANCELLED'});await assert.rejects(s.client.readSelf(),{code:'LINK_REQUIRED'});});
test('logout failure is surfaced; client state is still cleared',async()=>{const s=setup(url=>url.endsWith('/logout')?response({},503):response(session));await s.client.verifyLine('synthetic');await assert.rejects(s.client.logout(),{code:'SERVICE_UNAVAILABLE'});assert.equal(s.calls[1].options.headers['X-CSRF-Token'],'synthetic-csrf');await assert.rejects(s.client.readSelf(),{code:'LINK_REQUIRED'});});
function liffSetup(gatewayResult) {
 const store=new Map([['gooddeeds_line_mappings',JSON.stringify({'synthetic-line':'admin'})]]),nodes={},sessions=[];
 for(const id of ['line-liff-title','line-liff-detail','btn-line-connect'])nodes[id]={textContent:'',style:{},setAttribute:()=>{}};
 const context=vm.createContext({console,URLSearchParams,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},sessionStorage:{getItem:()=>null},window:{location:{search:'',pathname:'/index.html'},addEventListener:()=>{},GOODDEED_GATEWAY_CONFIG:{origin:'https://staging.example'},createGoodDeedGatewayClient:()=>({verifyLine:async()=>{if(gatewayResult instanceof Error)throw gatewayResult;return gatewayResult;}})},liff:{getIDToken:()=>'synthetic'},App:{setSession:(...x)=>sessions.push(x)},document:{getElementById:id=>nodes[id]}});
 vm.runInContext(fs.readFileSync('frontend/liff-sdk.js','utf8')+'\nthis.helper=LiffHelper;',context);return {helper:context.helper,nodes,sessions,store};
}
test('forged local admin mapping never creates a staff session or a binding',async()=>{const s=liffSetup({...session,studentLinked:false});await s.helper.handleAutoLogin();assert.equal(s.sessions.length,0);assert.equal(s.helper.connectionState,'pending');assert.match(s.nodes['line-liff-title'].textContent,/รอเชื่อม/);assert.equal(s.store.size,1);});
test('LINE UI does not claim binding or notification success after failure',async()=>{const s=liffSetup(Error('failure'));assert.equal(await s.helper.handleAutoLogin(),false);assert.equal(s.helper.verifiedSession,null);assert.match(s.nodes['line-liff-title'].textContent,/ยังยืนยันบัญชีไม่ได้/);assert.doesNotMatch(s.nodes['line-liff-detail'].textContent,/พร้อมรับแจ้งเตือน/);});
function viewSetup(client){
 const nodes = new Map(), root={innerHTML:'',setAttribute:()=>{},querySelectorAll:selector=>selector==='[data-view]'?[...root.innerHTML.matchAll(/data-view="([^"]+)"/g)].map(match=>node('nav-'+match[1],{dataset:{view:match[1]}})):selector==='button'?[...root.innerHTML.matchAll(/<button\b[^>]*\bid="([^"]+)"/g)].map(match=>node(match[1])):[]};
 const node=(id,extra={})=>{if(!nodes.has(id))nodes.set(id,{id,innerHTML:'',textContent:'',value:'',disabled:false,focus:()=>{},...extra});return nodes.get(id);};
 const context=vm.createContext({console,Intl,Date,window:{createGoodDeedGatewayClient:()=>client},document:{getElementById:node}});
 vm.runInContext(fs.readFileSync('frontend/gooddeed-ui.js','utf8'),context);
 vm.runInContext(fs.readFileSync('frontend/secure-pilot/mission-data.js','utf8'),context);
 vm.runInContext(fs.readFileSync('frontend/secure-pilot/gateway-view.js','utf8'),context);
 return {root,node,go:view=>node('nav-'+view).onclick(),start:()=>context.window.startGoodDeedGatewayView({root,config:{GATEWAY_ORIGIN:'https://staging.example'}})};
}
const viewCard={studentId:['99','00001'].join(''),displayName:'Synthetic Student',cohortLabel:'Synthetic cohort',positionLabel:'นักเรียนพยาบาล',totalHours:105,levelNumber:3,levelLabel:'Official',passed:false,pendingCount:1,approvedCount:0};
const viewSnapshot={card:viewCard,items:[{deedId:'own',categoryId:6,hours:0.5,status:'pending',description:'<img src=x onerror=alert(1)>',activityDate:'not-a-date'}],loadedAt:'2026-09-08T10:00:00Z'};
test('gateway view escapes student content and displays official totals with provenance',async()=>{
 const v=viewSetup({restore:async()=>session,readSelf:async()=>viewSnapshot});await v.start();v.go('records');assert.match(v.root.innerHTML,/105/);assert.match(v.root.innerHTML,/ยอดทางการจากทะเบียนกลาง/);assert.match(v.node('gateway-records').innerHTML,/&lt;img/);assert.doesNotMatch(v.node('gateway-records').innerHTML,/<img src=x/);assert.match(v.node('gateway-records').innerHTML,/ไม่ระบุวันที่/);
});
test('gateway view labels stale data on refresh failure and clears it on authorization loss',async()=>{
 let code='';const v=viewSetup({restore:async()=>session,readSelf:async()=>{if(code)throw {code};return viewSnapshot;}});await v.start();code='REQUEST_TIMEOUT';await v.node('gateway-refresh').onclick();assert.match(v.root.innerHTML,/อาจยังไม่เป็นปัจจุบัน/);code='SESSION_REQUIRED';await v.node('gateway-refresh').onclick();assert.doesNotMatch(v.root.innerHTML,/Synthetic Student|>105</);assert.match(v.root.innerHTML,/เซสชันหมดอายุ/);
});
test('gateway view gives an empty filtered state without replacing official total',async()=>{const v=viewSetup({restore:async()=>session,readSelf:async()=>viewSnapshot});await v.start();v.go('records');v.node('gateway-filter').value='approved';v.node('gateway-filter').onchange();assert.match(v.node('gateway-records').innerHTML,/ไม่พบรายการ/);assert.match(v.root.innerHTML,/105/);});
test('gateway view unlinked state never reads records',async()=>{let reads=0;const v=viewSetup({restore:async()=>({...session,studentLinked:false}),readSelf:async()=>{reads++;}});await v.start();assert.equal(reads,0);assert.match(v.root.innerHTML,/รอเชื่อมบัญชีนักเรียน/);});

test('self projection rejects duplicate mission IDs and contradictory owner data',async()=>{
 for(const items of [[...viewSnapshot.items,...viewSnapshot.items],[{...viewSnapshot.items[0],studentId:['99','00002'].join('')}],[{...viewSnapshot.items[0],deedId:''}]]){
  const s=setup(url=>response(url.endsWith('card-self')?{card:viewCard}:url.endsWith('deeds-self')?{items}:session));
  await s.client.restore();await assert.rejects(s.client.readSelf(),{code:'RESPONSE_INVALID'});
 }
});
test('slow gateway requests fail explicitly instead of constructing a success projection',async()=>{
 const s=setup((url,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'})))));
 await assert.rejects(s.client.restore(),{code:'REQUEST_TIMEOUT'});await assert.rejects(s.client.readSelf(),{code:'LINK_REQUIRED'});
});
test('Mission Control navigation keeps submission behind the existing integration gate',async()=>{
 let reads=0;const v=viewSetup({restore:async()=>session,readSelf:async()=>{reads++;return viewSnapshot;}});await v.start();
 assert.match(v.root.innerHTML,/ทุกความดี คือภารกิจที่มีคุณค่า/);
 for(const view of ['radar','analytics','profile','history','submit'])v.go(view);
 assert.match(v.root.innerHTML,/กำลังเตรียมเปิดรับบันทึกความดี/);assert.doesNotMatch(v.root.innerHTML,/<form/);assert.equal(reads,1);
});
test('native abort exceptions become a stable timeout code',async()=>{
 const s=setup((url,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Synthetic abort','AbortError')))));
 await assert.rejects(s.client.restore(),{code:'REQUEST_TIMEOUT'});
});
test('explicit cancellation is distinct from a network timeout',async()=>{
 const s=setup((url,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Synthetic abort','AbortError')))));
 const pending=s.client.restore();s.client.clear();await assert.rejects(pending,{code:'REQUEST_CANCELLED'});
});
test('logout remains available during a slow read and an old read cannot return student data',async()=>{
 let resolveRead,resolveLogout,clears=0,logouts=0,reads=0;
 const v=viewSetup({restore:async()=>session,readSelf:()=>++reads===1?Promise.resolve(viewSnapshot):new Promise(r=>resolveRead=r),clear:()=>clears++,logout:()=>{logouts++;return new Promise(r=>resolveLogout=r);}});
 await v.start();const reading=v.node('gateway-refresh').onclick();assert.equal(v.node('gateway-logout').disabled,false);const leaving=v.node('gateway-logout').onclick();
 assert.equal(logouts,1);assert.equal(clears,0,'logout owns cancellation and retains its existing CSRF token');
 assert.doesNotMatch(v.root.innerHTML,/Synthetic Student/);resolveRead(viewSnapshot);await reading;assert.doesNotMatch(v.root.innerHTML,/Synthetic Student/);
 resolveLogout();await leaving;assert.match(v.root.innerHTML,/ออกจากระบบแล้ว/);
});
test('stale data warning survives navigation until a fresh read succeeds',async()=>{
 let failed=false;const v=viewSetup({restore:async()=>session,readSelf:async()=>{if(failed)throw {code:'REQUEST_TIMEOUT'};return viewSnapshot;}});
 await v.start();failed=true;await v.node('gateway-refresh').onclick();v.go('records');assert.match(v.root.innerHTML,/อาจยังไม่เป็นปัจจุบัน/);
 v.go('radar');assert.match(v.root.innerHTML,/อาจยังไม่เป็นปัจจุบัน/);failed=false;await v.node('gateway-refresh').onclick();assert.doesNotMatch(v.root.innerHTML,/อาจยังไม่เป็นปัจจุบัน/);
});
