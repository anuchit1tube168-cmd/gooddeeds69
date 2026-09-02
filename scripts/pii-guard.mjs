import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

// RTAFNC ONE GitHub boundary: code/schema/docs/empty templates only.
// Real identities, student IDs, advisor mappings, health/counselling data,
// account identifiers and secrets must stay in private backend/Google Drive.
const MODE=String(process.env.PII_GUARD_MODE||'changed').toLowerCase();
const BASE_REF=String(process.env.PII_GUARD_BASE_REF||'HEAD^').trim();
function git(args){return execFileSync('git',args,{encoding:'utf8'}).trim()}
function trackedFiles(){return git(['ls-files']).split(/\r?\n/).filter(Boolean)}
function changedFiles(){
  try{
    const base=git(['merge-base',BASE_REF,'HEAD']);
    return git(['diff','--name-only','--diff-filter=ACMR',base,'HEAD']).split(/\r?\n/).filter(Boolean);
  }catch{
    console.error(`[PII-GUARD] Cannot resolve base ref ${BASE_REF}.`);
    process.exit(2);
  }
}
const files=MODE==='full'?trackedFiles():changedFiles();
const allowedTemplate=/^data\/templates\/[^/]+\.(?:csv|json)$/i;
const disallowedFile=/\.(?:xlsx?|xlsm|ods|pdf|docx?|rtf|pptx?|zip|7z|rar|db|sqlite3?|sql|parquet|avro)$/i;
const suspiciousDataPath=/(?:^|\/)(?:private|exports?|backups?|students?|people|persons?|patients?|health-records?|counselling|advisor-mapping|identity-data)(?:\/|$)/i;

// Public repo may keep only these reviewed, non-PII visual assets.
// Do not broaden this allowlist to student/profile photographs.
const allowedBinaryUiAsset=/^(?:frontend\/510903\.jpg|frontend\/photos\/chibi\/chibi_lv(?:10|[1-9])\.png)$/i;
const protectedPhotoPath=/^frontend\/photos\//i;
const imageFile=/\.(?:png|jpe?g|gif|webp|avif|svg)$/i;

const rules=[
  {name:'student_id_context_literal',re:/(?:student[_ -]?id|รหัส(?:นักเรียน|นพอ\.?))\s*[:=,\t ]+['\"]?\d{7}\b/gi},
  {name:'legacy_student_id_literal',re:/\b(?:66|67|68|69)\d{5}\b/g},
  {name:'line_user_id_literal',re:/\bU[0-9a-f]{32}\b/gi},
  {name:'email_address_literal',re:/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi},
  {name:'telegram_chat_id_literal',re:/(?:telegram_chat_id|TELEGRAM_CHAT_ID)\s*[:=]\s*['\"]?-?\d{6,15}['\"]?/gi},
  {name:'telegram_bot_token_literal',re:/\b\d{7,12}:[A-Za-z0-9_-]{30,}\b/g},
  {name:'google_api_key_literal',re:/\bAIza[0-9A-Za-z_-]{30,}\b/g},
  {name:'openai_key_literal',re:/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g},
  {name:'bearer_secret_literal',re:/Authorization\s*[:=]\s*['\"]Bearer\s+[A-Za-z0-9._~-]{20,}['\"]/gi}
];
const allowFiles=new Set(['scripts/pii-guard.mjs']);
let failed=false;
for(const file of files){
  if(!fs.existsSync(file)||allowFiles.has(file)) continue;

  if(allowedBinaryUiAsset.test(file)){
    // Exact reviewed allowlist only. Binary data must not be decoded as UTF-8,
    // otherwise arbitrary image bytes can create false-positive PII matches.
    continue;
  }

  if(protectedPhotoPath.test(file)&&imageFile.test(file)){
    failed=true;
    console.error(`[PII-GUARD] non_allowlisted_public_photo: ${file}`);
    continue;
  }

  if(disallowedFile.test(file)&&!allowedTemplate.test(file)){
    failed=true; console.error(`[PII-GUARD] disallowed_code_only_file: ${file}`); continue;
  }
  if(suspiciousDataPath.test(file)&&!allowedTemplate.test(file)){
    failed=true; console.error(`[PII-GUARD] suspicious_data_path: ${file}`);
  }

  if(imageFile.test(file)) continue;

  let text=''; try{text=fs.readFileSync(path.resolve(file),'utf8')}catch{continue}
  for(const rule of rules){
    rule.re.lastIndex=0;
    const matches=[...text.matchAll(rule.re)];
    if(!matches.length) continue;
    failed=true;
    for(const m of matches.slice(0,10)){
      const line=text.slice(0,m.index).split(/\r?\n/).length;
      console.error(`[PII-GUARD] ${rule.name}: ${file}:${line}`);
    }
  }
}
if(failed){
  console.error(`\nBlocked (${MODE} mode): public GitHub is code-only. Move real data to private Google Drive/backend.`);
  process.exit(1);
}
console.log(`PII guard passed (${MODE} mode): ${files.length} file(s) inspected.`);
