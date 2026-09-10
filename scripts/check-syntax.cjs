const fs = require('node:fs');
const vm = require('node:vm');
for (const file of ['frontend/secure-pilot/evidence-preview.js','frontend/secure-pilot/signature-pad.js','frontend/secure-pilot/mission-data.js','frontend/secure-pilot/mission-react.js','frontend/gooddeed-ui.js','frontend/secure-pilot/workflow.js','frontend/secure-pilot/demo.js','frontend/secure-pilot/kindness-react.js','frontend/secure-pilot/react-18.3.1.production.min.js','frontend/secure-pilot/react-dom-18.3.1.production.min.js','scripts/preview.cjs']) {
  new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});
}
const files = ['frontend/app.js','frontend/secure-pilot/app.js','backend/Code.gs','backend/CodeV2.gs','backend/CloudflareReadAdapter.gs','backend/GoodDeedReviewPlan.gs','backend/GoodDeedReviewGate.gs','frontend/liff-sdk.js','frontend/gateway-config.js','frontend/gateway-client.js','frontend/secure-pilot/gateway-view.js'];
for (const file of files) new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});
for (const file of ['frontend/index.html','frontend/profile.html','frontend/student-dashboard.html','frontend/submit-deed.html','frontend/teacher-dashboard.html','frontend/secure-pilot/index.html','frontend/approve_sign.html','frontend/deed_slip.html','frontend/qa-board.html']) {
  const html=fs.readFileSync(file,'utf8'); let i=0;
  for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/.test(match[1]) || /application\/ld\+json/.test(match[1])) continue;
    new vm.Script(match[2],{filename:file+':inline-'+(++i)});
  }
}
console.log('JavaScript, Apps Script and inline HTML script syntax passed.');

require('node:child_process').execFileSync('python3',['-c', "import ast,pathlib; [ast.parse(pathlib.Path(p).read_text(),filename=p) for p in ['backend/server.py','backend/line_notifier.py','data/build_photos.py','data/sync_all_students.py','data/embed_settings_to_excel.py','data/line_webhook_bot.py','data/telegram_bot_listener.py','data/export_students.py']]"],{stdio:'inherit'});
console.log('Python source syntax passed.');
