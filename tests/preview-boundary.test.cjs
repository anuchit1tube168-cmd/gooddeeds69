const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {serve,resolvePublicPath}=require('../scripts/preview.cjs');
test('preview only resolves explicitly public pilot and shared assets',()=>{
  for(const route of ['/','/demo.html','/workflow.js','/gooddeed-ui.js','/airforce-flight.png','/mission-data.js','/mission-react.js','/mission.css','/signature-pad.js','/evidence-preview.js'])assert.ok(resolvePublicPath(route),route);
  for(const route of ['/AGENTS.md','/data/students.json','/frontend/data/students_data.js','/photos/evidence/file.png','/backend/Code.gs','/.env','/api/students','/gateway-config.js','/secure-pilot/','/%2e%2e%2fdata/students.json','/%5cdata/students.json','/%'])assert.equal(resolvePublicPath(route),null,route);
});
test('preview HTTP denies writes and private reads with no wildcard CORS',async()=>{
  const server=http.createServer(serve);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  try{
    const publicPage=await fetch(origin+'/demo.html');assert.equal(publicPage.status,200);
    assert.equal(publicPage.headers.get('cache-control'),'no-store');
    assert.equal(publicPage.headers.get('access-control-allow-origin'),null);
    const html=await publicPage.text();assert.match(html,/connect-src 'none'/);
    assert.doesNotMatch(html,/gateway-client|liff\.line/);
    const head=await fetch(origin+'/airforce-flight.png',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
    for(const method of ['GET','HEAD'])assert.equal((await fetch(origin+'/backend/Code.gs',{method})).status,404);
    assert.equal((await fetch(origin+'/demo.html',{method:'POST',body:'{}'})).status,405);
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
