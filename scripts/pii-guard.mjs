import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

// Public-code guard: RTAFNC ONE real identities belong in private Drive/backend only.
// GitHub must contain schemas, code, placeholders and mock data — never real student/staff bindings.
const files=execFileSync('git',['ls-files'],{encoding:'utf8'}).split(/\r?\n/).filter(Boolean);
const skip=/\.(?:png|jpe?g|gif|webp|ico|pdf|zip|xlsx?|docx?|pptx?|woff2?|ttf|otf)$/i;
const rules=[
  {name:'student_id_7_digit',re:/\b(?:66|67|68|69)\d{5}\b/g},
  {name:'line_user_id_literal',re:/\bU[0-9a-f]{32}\b/gi},
  {name:'email_address_literal',re:/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi},
  {name:'telegram_chat_id_literal',re:/(?:telegram_chat_id|TELEGRAM_CHAT_ID)\s*[:=]\s*['\"]?-?\d{6,15}['\"]?/gi}
];
const allowFiles=new Set(['scripts/pii-guard.mjs']);
let failed=false;
for(const file of files){
  if(skip.test(file)||allowFiles.has(file))continue;
  let text=''; try{text=fs.readFileSync(path.resolve(file),'utf8')}catch{continue}
  for(const rule of rules){
    const matches=[...text.matchAll(rule.re)];
    if(!matches.length)continue;
    failed=true;
    for(const m of matches.slice(0,10)){
      const line=text.slice(0,m.index).split(/\r?\n/).length;
      console.error(`[PII-GUARD] ${rule.name}: ${file}:${line}`);
    }
  }
}
if(failed){
  console.error('\nBlocked: move real identities/codes to private Google Drive or backend secrets/database. Use placeholders in GitHub.');
  process.exit(1);
}
console.log('PII guard passed: no blocked identity literals detected.');
