/** STAGING ONLY. Install alongside legacy Code.gs, never alongside CodeV2.gs.
 * Matches rtafnc-one gooddeed-domain-adapter.ts v2 canonical HMAC contract.
 * Self list/card reads only. No write, activation or staff routes.
 */
function cloudflareLegacyReadHandle_(e) {
  const p = (e && e.parameter) || {};
  try {
    const props = PropertiesService.getScriptProperties();
    if (props.getProperty('APP_ENV') !== 'staging') throw new Error('ADAPTER_STAGING_REQUIRED');
    const action = String(p.action || '');
    if (!['cloudflareListSelf','cloudflareCardSelf'].includes(action)) throw new Error('ADAPTER_ACTION_DISABLED');
    const subject = String(p.subjectRef || '');
    const requestId = String(p.requestId || '');
    const nonce = String(p.nonce || '');
    const timestamp = Number(p.timestamp);
    const bodyText = String(p.body == null ? '{}' : p.body);
    const signature = String(p.signature || '');
    if (!/^\d{7}$/.test(subject) || !/^[A-Za-z0-9._:-]{1,96}$/.test(requestId) || !/^[A-Za-z0-9_-]{16,128}$/.test(nonce)) throw new Error('ADAPTER_REQUEST_INVALID');
    if (!Number.isInteger(timestamp) || Math.abs(Math.floor(Date.now()/1000)-timestamp)>90) throw new Error('ADAPTER_TIMESTAMP_EXPIRED');
    if (Utilities.newBlob(bodyText).getBytes().length>32768) throw new Error('ADAPTER_BODY_TOO_LARGE');
    const secret = props.getProperty('CLOUDFLARE_CARD_ADAPTER_SECRET') || '';
    if (secret.length<32) throw new Error('ADAPTER_SECRET_NOT_CONFIGURED');
    const digest = readAdapterHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,bodyText,Utilities.Charset.UTF_8));
    const canonical = ['v2',action,subject,requestId,String(timestamp),nonce,digest].join('\n');
    const expected = readAdapterHex_(Utilities.computeHmacSha256Signature(canonical,secret));
    if (!/^[a-f0-9]{64}$/.test(signature) || !readAdapterEqual_(expected,signature)) throw new Error('ADAPTER_SIGNATURE_INVALID');
    let body;
    try { body=JSON.parse(bodyText); } catch (_) { throw new Error('ADAPTER_BODY_INVALID'); }
    if (!body || typeof body!=='object' || Array.isArray(body)) throw new Error('ADAPTER_BODY_INVALID');
    // Reject overrides rather than accidentally broadening the caller's scope.
    if (Object.keys(body).some(k=>k!=='limit')) throw new Error('ADAPTER_BODY_INVALID');
    if (action==='cloudflareCardSelf' && Object.keys(body).length) throw new Error('ADAPTER_BODY_INVALID');
    const limit=body.limit===undefined?100:Number(body.limit);
    if (!Number.isInteger(limit)||limit<1||limit>150) throw new Error('ADAPTER_LIMIT_INVALID');
    const lock=LockService.getScriptLock(); lock.waitLock(10000);
    try {
      const cache=CacheService.getScriptCache();
      const key='gd-read:'+readAdapterHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,subject+':'+nonce,Utilities.Charset.UTF_8));
      if(cache.get(key)) throw new Error('ADAPTER_REPLAY_BLOCKED');
      // Covers a request dated 90 seconds ahead plus its remaining validity.
      cache.put(key,'1',200);
    } finally { lock.releaseLock(); }
    const ss=getSS();
    const master=ss && ss.getSheetByName(SHEETS.STUDENTS);
    const ledger=ss && ss.getSheetByName(SHEETS.DEEDS);
    if(!master||!ledger) throw new Error('ADAPTER_STORAGE_UNAVAILABLE');
    const masterValues=master.getDataRange().getValues();
    const masterMap=readAdapterMap_(props,'GOODDEED_MASTER_COLUMN_MAP','MASTER');
    const studentColumn=readAdapterIndex_(masterValues[0],masterMap.studentId,'MASTER');
    const matches=masterValues.slice(1).filter(r=>String(r[studentColumn])===subject);
    if(matches.length!==1) throw new Error('ADAPTER_IDENTITY_AMBIGUOUS');
    const rows=readAdapterLedger_(props,ledger.getDataRange().getValues(),subject);
    if(action==='cloudflareCardSelf') {
      return jsonResponse({ok:true,requestId,data:{card:readAdapterOfficialCard_(props,masterValues[0],matches[0],rows,subject)}});
    }
    const items=rows.sort((a,b)=>b.submittedAt.localeCompare(a.submittedAt)).slice(0,limit);
    return jsonResponse({ok:true,requestId,data:{items}});
  } catch(error) {
    const message=String(error.message||'');
    return jsonResponse({ok:false,error:/^ADAPTER_[A-Z_]+$/.test(message)?message:'ADAPTER_UNAVAILABLE'});
  }
}
function readAdapterHex_(bytes){return bytes.map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');}
function readAdapterEqual_(a,b){let diff=a.length^b.length;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^(b.charCodeAt(i)||0);return diff===0;}
function readAdapterDate_(v){return v instanceof Date?v.toISOString():String(v||'');}

// Exact headers must be mapped from the verified staging sheet. Never infer
// levels, annual pass status or carry-forward from a partial list of deeds.
function readAdapterOfficialCard_(props,headers,row,rows,subject) {
  const map=readAdapterMap_(props,'GOODDEED_MASTER_COLUMN_MAP','MASTER');
  function cell(key) { return row[readAdapterIndex_(headers,map[key],'MASTER')]; }
  function text(key,max) {
    const value=cell(key);
    if(typeof value!=='string'||!value.trim()||value.length>max) throw new Error('ADAPTER_MASTER_VALUE_INVALID');
    return value.trim();
  }
  function number(key,max) {
    const value=cell(key);
    const parsed=readAdapterDecimal_(value);
    if(!Number.isFinite(parsed)||parsed<0||parsed>max) throw new Error('ADAPTER_MASTER_VALUE_INVALID');
    return parsed;
  }
  if(String(cell('studentId'))!==subject) throw new Error('ADAPTER_IDENTITY_AMBIGUOUS');
  let level, levelLabel;
  if(map.level !== undefined) {
    // Observed official format, e.g. Lv.1 Cadet Novice. Parse the stored label,
    // never infer a level from hours. Any other format needs a reviewed mapping.
    const match=/^Lv\.([1-9]|10) (\S.{0,178})$/.exec(text('level',185));
    if(!match) throw new Error('ADAPTER_MASTER_VALUE_INVALID');
    level=Number(match[1]); levelLabel=match[2];
  } else { level=number('levelNumber',10); levelLabel=text('levelLabel',180); }
  if(!Number.isInteger(level)||level<1) throw new Error('ADAPTER_MASTER_VALUE_INVALID');
  let displayName;
  if(Array.isArray(map.displayName)) {
    if(!map.displayName.length||map.displayName.length>4) throw new Error('ADAPTER_MASTER_MAPPING_REQUIRED');
    displayName=map.displayName.map(name=>{
      const value=row[readAdapterIndex_(headers,name,'MASTER')];
      if(typeof value!=='string'||!value.trim()) throw new Error('ADAPTER_MASTER_VALUE_INVALID');
      return value.trim();
    }).join(' ');
    if(displayName.length>120) throw new Error('ADAPTER_MASTER_VALUE_INVALID');
  } else displayName=text('displayName',120);
  const cohort=cell('cohortLabel');
  if((typeof cohort!=='string' && !(typeof cohort==='number' && Number.isInteger(cohort))) || !String(cohort).trim() || String(cohort).length>80) throw new Error('ADAPTER_MASTER_VALUE_INVALID');
  const passValue=cell('passed');
  const passed=passValue===true||passValue==='ผ่านเกณฑ์ ✅';
  if(!passed&&passValue!==false&&passValue!=='ยังไม่ผ่าน ❌') throw new Error('ADAPTER_MASTER_VALUE_INVALID');
  return {
    studentId:subject,displayName,cohortLabel:String(cohort).trim(),
    positionLabel:'นักเรียนพยาบาล',totalHours:number('totalHours',10000),
    levelNumber:level,levelLabel,passed,
    approvedCount:rows.filter(r=>r.status==='approved').length,
    pendingCount:rows.filter(r=>r.status==='pending'||r.status==='approving').length
  };
}

// Sheets numbers or explicit decimal text only; never coerce blanks/booleans.
function readAdapterDecimal_(value) {
  if(typeof value==='number') return value;
  if(typeof value==='string' && /^\d+(?:\.\d+)?$/.test(value.trim())) return Number(value.trim());
  return NaN;
}

function readAdapterMap_(props,key,kind) {
  let map;
  try { map=JSON.parse(props.getProperty(key)||''); } catch (_) { throw new Error('ADAPTER_'+kind+'_MAPPING_REQUIRED'); }
  if(!map||typeof map!=='object'||Array.isArray(map)) throw new Error('ADAPTER_'+kind+'_MAPPING_REQUIRED');
  const names=[];
  for(const value of Object.values(map)) {
    const headers=Array.isArray(value)?value:[value];
    if(!headers.length||headers.some(name=>typeof name!=='string'||!name.trim()||names.includes(name))) throw new Error('ADAPTER_'+kind+'_MAPPING_REQUIRED');
    for(const name of headers) {
      if(names.includes(name)) throw new Error('ADAPTER_'+kind+'_MAPPING_REQUIRED');
      names.push(name);
    }
  }
  return map;
}
function readAdapterIndex_(headers,name,kind) {
  if(typeof name!=='string'||!name.trim()) throw new Error('ADAPTER_'+kind+'_MAPPING_REQUIRED');
  const indices=(headers||[]).map((header,i)=>String(header)===name?i:-1).filter(i=>i>=0);
  if(indices.length!==1) throw new Error('ADAPTER_'+kind+'_HEADER_INVALID');
  return indices[0];
}
function readAdapterLedger_(props,values,subject) {
  const map=readAdapterMap_(props,'GOODDEED_LEDGER_COLUMN_MAP','LEDGER'), columns={};
  ['deedId','studentId','categoryId','hours','activityDate','description','status','submittedAt'].forEach(key=>{columns[key]=readAdapterIndex_(values[0],map[key],'LEDGER');});
  if(map.evidenceUrl!==undefined) columns.evidenceUrl=readAdapterIndex_(values[0],map.evidenceUrl,'LEDGER');
  const seen=new Set(),idCounts=new Map();
  values.slice(1).forEach(row=>{const id=String(row[columns.deedId]||'');idCounts.set(id,(idCounts.get(id)||0)+1);});
  return values.slice(1).filter(row=>String(row[columns.studentId])===subject).map(row=>{
    const id=String(row[columns.deedId]||''),hours=readAdapterDecimal_(row[columns.hours]), categoryId=readAdapterDecimal_(row[columns.categoryId]), status=String(row[columns.status]);
    if(!id.trim()||id.length>120||seen.has(id)||idCounts.get(id)!==1||!Number.isFinite(hours)||hours<0.5||hours>24||!Number.isInteger(hours*2)||!Number.isInteger(categoryId)||categoryId<1||categoryId>9||!['pending','approving','approved','rejected'].includes(status)) throw new Error('ADAPTER_LEDGER_REQUIRES_RECONCILIATION');
    seen.add(id);
    return {deedId:id,categoryId,hours,activityDate:readAdapterDate_(row[columns.activityDate]),description:String(row[columns.description]||'').slice(0,1200),status,submittedAt:readAdapterDate_(row[columns.submittedAt]),hasEvidence:columns.evidenceUrl!==undefined && Boolean(row[columns.evidenceUrl])};
  });
}
