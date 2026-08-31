import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

// RTAFNC ONE GitHub boundary:
// - GitHub stores CODE / schema / docs / empty templates / synthetic mock data only.
// - Real identities, student IDs, advisor mappings, health/counselling data, account IDs and secrets stay in private backend/Drive.
//
// Modes:
//   changed (default) = legacy-transition mode. Scan only files changed from the configured base ref.
//   full              = clean-repository enforcement. Scan every tracked file.
const MODE=String(process.env.PII_GUARD_MODE||'changed').toLowerCase();
const BASE_REF=String(process.env.PII_GUARD_BASE_REF||'main').trim();

function git(args){return execFileSync('git',args,{encoding:'utf8'}).trim()}
function trackedFiles(){return git(['ls-files']).split(/\r?\n/).filter(Boolean)}
function changedFiles(){
  try{
    const base=git(['merge-base',BASE_REF,'HEAD']);
    return git(['diff','--name-only','--diff-filter=ACMR',base,'HEAD']).split(/\r?\n/).filter(Boolean);
  }catch{
    // Fail closed if base resolution is unavailable.
    console.error(`[PII-GUARD] Cannot resolve base ref ${BASE_REF}. Use PII_GUARD_MODE=full or fetch the base branch.`);
    process.exit(2);
  }
}

const files=MODE==='full'?trackedFiles():changedFiles();
const allowedTemplate=/^data\/templates\/[^/]+\.(?:csv|json)$/i;
const disallowedFile=/\.(?:xlsx?|xlsm|ods|pdf|docx?|rtf|pptx?|zip|7z|rar|db|sqlite3?|sql|parquet|avro|png|jpe?g|webp|heic|tiff?|mp4|mov|avi|mkv|mp3|m4a|wav)$/i;
const suspiciousDataPath=/(?:^|\/)(?:private|exports?|backups?|students?|people|persons?|patients?|health-records?|counselling|advisor-mapping|identity-data)(?:\/|$)/i;

const rules=[
  // Current and future Thai academic-year student IDs: block literal 7-digit IDs when adjacent to an identity field.
  {name:'student_id_context_literal',re:/(?:student[_ -]?id|รหัส(?:นักเรียน|นพอ\.?))\s*[:=,\t ]+['\"]?\d{7}\b/gi},
  // Existing RTAFNC cohorts currently use 66-69 prefixes; keep a strict literal block during legacy migration.
  {name:'legacy_student_id_literal',re:/\b(?:66|67|68|69)\d{5}\b/g},
  {name:'line_user_id_literal',re:/\bU[0-9a-f]{32}\b/gi},
  {name:'email_address_literal',re:/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi},
  {name:'telegram_chat_id_literal',re:/(?:telegram_chat_id|TELEGRAM_CHAT_ID)\s*[:=]\s*['\"]?-?\d{6,15}['\"]?/gi},
  {name:'telegram_bot_token_literal',re:/\b\d{7,12}:[A-Za-z0-9_-]{30,}\b/g},
  {name:'google_api_key_literal',re:/\bAIza[0-9A-Za-z_-]{30,}\b/g},
  {name:'openai_key_literal',re:/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g},
  {name:'bearer_secret_literal',re:/Authorization\s*[:=]\s*['\"]Bearer\s+[A-Za-z0-9._~-]{20,}['\"]/gi}
];

// Explicit synthetic fixtures reserved for the isolated pilot only.
// They are not accepted anywhere else and the pilot file must clearly identify itself as demo/example content.
const reservedSyntheticStudentIds=new Set(['6900000','6900001','6900002','6900003']);
function isAllowedSyntheticPilotMatch(file,ruleName,matchText,fullText){
  if(!file.startsWith('rtafnc-one-pilot/')) return false;
  if(ruleName!=='student_id_context_literal' && ruleName!=='legacy_student_id_literal') return false;
  const id=matchText.match(/\b\d{7}\b/)?.[0];
  if(!id || !reservedSyntheticStudentIds.has(id)) return false;
  return /(?:\bDEMO\b|ตัวอย่าง|ข้อมูลจำลอง)/i.test(fullText);
}

// Guard implementation itself contains detector patterns by definition.
const allowFiles=new Set(['scripts/pii-guard.mjs']);
let failed=false;

for(const file of files){
  if(!fs.existsSync(file)) continue;
  if(allowFiles.has(file)) continue;

  if(disallowedFile.test(file) && !allowedTemplate.test(file)){
    failed=true;
    console.error(`[PII-GUARD] disallowed_code_only_file: ${file}`);
    continue;
  }
  if(suspiciousDataPath.test(file) && !allowedTemplate.test(file)){
    failed=true;
    console.error(`[PII-GUARD] suspicious_data_path: ${file}`);
  }

  let text='';
  try{text=fs.readFileSync(path.resolve(file),'utf8')}catch{continue}
  for(const rule of rules){
    rule.re.lastIndex=0;
    const matches=[...text.matchAll(rule.re)].filter(m=>!isAllowedSyntheticPilotMatch(file,rule.name,m[0],text));
    if(!matches.length) continue;
    failed=true;
    for(const m of matches.slice(0,10)){
      const line=text.slice(0,m.index).split(/\r?\n/).length;
      console.error(`[PII-GUARD] ${rule.name}: ${file}:${line}`);
    }
  }
}

if(failed){
  console.error(`\nBlocked (${MODE} mode): RTAFNC ONE GitHub is code-only. Move real data/files to private Google Drive/backend. Do not commit real identities, mappings, clinical records or secrets.`);
  process.exit(1);
}
console.log(`PII guard passed (${MODE} mode): ${files.length} file(s) inspected.`);
