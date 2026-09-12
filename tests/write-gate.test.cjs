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
test('callback gate refuses default and nonexact true before any provider effect',()=>{
  for(const value of [undefined,'','false','TRUE',' true ','1',true]) {
    const c=load(value);
    assert.equal(c.productionWritesEnabled(),false);
    assert.equal(c.doPost({postData:{contents:JSON.stringify({callback_query:{}})}}).code,'PRODUCTION_WRITE_DISABLED');
  }
});
test('explicit gate cannot bypass callback authentication or public API retirement',()=>{
  const c=load('true');
  assert.equal(c.productionWritesEnabled(),true);
  assert.equal(c.handleTelegramCallback({},'').code,'webhook_unauthorized');
  assert.equal(c.doPost({postData:{contents:'{}'}}).code,'AUTHENTICATED_GATEWAY_REQUIRED');
});
test('disabled callback writes preserve signed gateway read dispatch',()=>{
  const c=load('false'); let called=0;
  c.cloudflareLegacyReadHandle_=()=>{called++;return {ok:true};};
  assert.equal(c.doPost({parameter:{action:'cloudflareCardSelf'}}).ok,true);
  assert.equal(called,1);
});
