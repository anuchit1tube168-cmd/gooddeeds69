const fs = require('node:fs');
const vm = require('node:vm');
const files = ['frontend/app.js','frontend/secure-pilot/app.js','backend/Code.gs','backend/CodeV2.gs'];
for (const file of files) new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});
for (const file of ['frontend/index.html','frontend/secure-pilot/index.html']) {
  const html=fs.readFileSync(file,'utf8'); let i=0;
  for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/.test(match[1]) || /application\/ld\+json/.test(match[1])) continue;
    new vm.Script(match[2],{filename:file+':inline-'+(++i)});
  }
}
console.log('JavaScript, Apps Script and inline HTML script syntax passed.');
