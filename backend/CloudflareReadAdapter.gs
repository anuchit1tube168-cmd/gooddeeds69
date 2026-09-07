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
    const matches=masterValues.slice(1).filter(r=>String(r[1])===subject);
    if(matches.length!==1) throw new Error('ADAPTER_IDENTITY_AMBIGUOUS');
    const rows=ledger.getDataRange().getValues().slice(1).filter(r=>String(r[1])===subject);
    if(action==='cloudflareCardSelf') {
      return jsonResponse({ok:true,requestId,data:{card:readAdapterOfficialCard_(props,masterValues[0],matches[0],rows,subject)}});
    }
    const items=rows.map(r=>{
      const hours=Number(r[3]), categoryId=Number(r[2]), status=String(r[9]);
      if(!Number.isFinite(hours)||hours<0||hours>24||!Number.isInteger(categoryId)||categoryId<1||categoryId>9||!['pending','approving','approved','rejected'].includes(status)) throw new Error('ADAPTER_LEDGER_REQUIRES_RECONCILIATION');
      return {deedId:String(r[0]),categoryId,hours,activityDate:readAdapterDate_(r[4]),description:String(r[5]||''),status,submittedAt:readAdapterDate_(r[10]),hasEvidence:Boolean(r[7])};
    }).sort((a,b)=>b.submittedAt.localeCompare(a.submittedAt)).slice(0,limit);
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
  let map;
  try { map=JSON.parse(props.getProperty('GOODDEED_MASTER_COLUMN_MAP')||''); }
  catch (_) { throw new Error('ADAPTER_MASTER_MAPPING_REQUIRED'); }
  if(!map||typeof map!=='object'||Array.isArray(map)) throw new Error('ADAPTER_MASTER_MAPPING_REQUIRED');
  function cell(key) {
    const name=map[key];
    if(typeof name!=='string'||!name.trim()) throw new Error('ADAPTER_MASTER_MAPPING_REQUIRED');
    const indices=headers.map((h,i)=>String(h)===name?i:-1).filter(i=>i>=0);
    if(indices.length!==1) throw new Error('ADAPTER_MASTER_HEADER_INVALID');
    return row[indices[0]];
  }
  function text(key,max) {
    const value=cell(key);
    if(typeof value!=='string'||!value.trim()||value.length>max) throw new Error('ADAPTER_MASTER_VALUE_INVALID');
    return value.trim();
  }
  function number(key,max) {
    const value=cell(key);
    if((typeof value==='string'&&!value.trim())||value===null||value===undefined||typeof value==='boolean'||!Number.isFinite(Number(value))||Number(value)<0||Number(value)>max) throw new Error('ADAPTER_MASTER_VALUE_INVALID');
    return Number(value);
  }
  if(String(cell('studentId'))!==subject) throw new Error('ADAPTER_IDENTITY_AMBIGUOUS');
  const level=number('levelNumber',10);
  if(!Number.isInteger(level)||level<1) throw new Error('ADAPTER_MASTER_VALUE_INVALID');
  const passValue=cell('passed');
  const passed=passValue===true||passValue==='ผ่านเกณฑ์ ✅';
  if(!passed&&passValue!==false&&passValue!=='ยังไม่ผ่าน ❌') throw new Error('ADAPTER_MASTER_VALUE_INVALID');
  if(rows.some(r=>!['pending','approving','approved','rejected'].includes(String(r[9])))) throw new Error('ADAPTER_LEDGER_REQUIRES_RECONCILIATION');
  return {
    studentId:subject,displayName:text('displayName',120),cohortLabel:text('cohortLabel',80),
    positionLabel:'นักเรียนพยาบาล',totalHours:number('totalHours',10000),
    levelNumber:level,levelLabel:text('levelLabel',180),passed,
    approvedCount:rows.filter(r=>r[9]==='approved').length,
    pendingCount:rows.filter(r=>r[9]==='pending'||r[9]==='approving').length
  };
}
