const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function load(value) {
  const context = vm.createContext({PropertiesService:{getScriptProperties:()=>({getProperty:()=>value})}});
  vm.runInContext(fs.readFileSync('backend/Code.gs','utf8'),context);
  context.jsonResponse = x=>x;
  return context;
}
test('emergency lockdown overrides every production-write setting before provider effects',()=>{
  for(const value of [undefined,'','false','TRUE',' true ','1',true,'true']) {
    const c=load(value);
    assert.equal(c.productionWritesEnabled(),false);
    assert.equal(c.doPost({postData:{contents:JSON.stringify({callback_query:{}})}}).code,'EMERGENCY_LOCKDOWN');
  }
});
test('explicit production setting cannot bypass emergency callback/public API retirement',()=>{
  const c=load('true');
  assert.equal(c.productionWritesEnabled(),false);
  assert.equal(c.handleTelegramCallback({},'').code,'EMERGENCY_LOCKDOWN');
  assert.equal(c.doPost({postData:{contents:'{}'}}).code,'EMERGENCY_LOCKDOWN');
});
test('disabled callback writes preserve signed gateway read dispatch',()=>{
  const c=load('false'); let called=0;
  c.cloudflareLegacyReadHandle_=()=>{called++;return {ok:true};};
  assert.equal(c.doPost({parameter:{action:'cloudflareCardSelf'}}).ok,true);
  assert.equal(called,1);
});
