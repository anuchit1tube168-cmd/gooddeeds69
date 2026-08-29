import {hydrateAuthorizedCandidates,legacyRoleToTier} from './registry.v1.js';

const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};

function json(data,status=200,extra={}){return new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,...extra}})}
function cors(origin,env){
  const allowed=String(env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
  return allowed.includes(origin)?{'access-control-allow-origin':origin,'access-control-allow-methods':'POST,GET,OPTIONS','access-control-allow-headers':'content-type,authorization,x-rtafnc-session','vary':'Origin'}:{};
}
function cleanText(v,max=4000){return String(v||'').trim().slice(0,max)}
function rawSessionToken(request){
  let token=String(request.headers.get('x-rtafnc-session')||request.headers.get('authorization')||'').trim();
  if(/^Bearer\s+/i.test(token)) token=token.replace(/^Bearer\s+/i,'').trim();
  return token;
}
function authOrigin(env){return String(env.AUTH_VERIFY_ORIGIN||String(env.ALLOWED_ORIGINS||'').split(',')[0]||'').trim()}
function validStudentId(v){return /^\d{7}$/.test(String(v||'').trim())}

function extractBridgeMessage(text){
  const marker='parent.postMessage(';
  const startMarker=text.indexOf(marker);
  if(startMarker<0) return null;
  let i=text.indexOf('{',startMarker+marker.length);
  if(i<0) return null;
  const start=i; let depth=0,inString=false,escape=false;
  for(;i<text.length;i++){
    const c=text[i];
    if(inString){
      if(escape){escape=false;continue}
      if(c==='\\'){escape=true;continue}
      if(c==='"'){inString=false}
      continue;
    }
    if(c==='"'){inString=true;continue}
    if(c==='{') depth++;
    else if(c==='}'){
      depth--;
      if(depth===0){
        try{return JSON.parse(text.slice(start,i+1))}catch(_){return null}
      }
    }
  }
  return null;
}

async function verifySession(request,env){
  // Phase 5 reuses the existing Good Deed V2 server-side session instead of inventing a new login.
  if(!env.AUTH_VERIFY_URL) return {ok:false,error:'AUTH_VERIFIER_NOT_CONFIGURED'};
  const token=rawSessionToken(request);
  if(!token) return {ok:false,error:'NO_SESSION'};

  const form=new URLSearchParams();
  form.set('action','me');
  form.set('requestId',crypto.randomUUID());
  form.set('origin',authOrigin(env));
  form.set('sessionToken',token);
  form.set('payload','{}');

  let res;
  try{
    res=await fetch(env.AUTH_VERIFY_URL,{
      method:'POST',
      headers:{'content-type':'application/x-www-form-urlencoded;charset=UTF-8'},
      body:form.toString(),
      redirect:'follow'
    });
  }catch(_){return {ok:false,error:'AUTH_VERIFIER_UNREACHABLE'}}
  if(!res.ok) return {ok:false,error:'SESSION_REJECTED'};

  const contentType=String(res.headers.get('content-type')||'');
  const text=await res.text();
  let envelope=null;
  if(contentType.includes('application/json')){
    try{envelope=JSON.parse(text)}catch(_){envelope=null}
  }else envelope=extractBridgeMessage(text);

  const user=envelope&&envelope.ok&&envelope.data&&envelope.data.user;
  if(!user||!user.memberId||!user.role) return {ok:false,error:'SESSION_REJECTED'};

  const tier=legacyRoleToTier(user.role);
  if(tier==='NONE') return {ok:false,error:'ROLE_NOT_SUPPORTED'};
  const rawStudentId=cleanText(user.studentId,40),memberId=cleanText(user.memberId,100);
  const studentId=validStudentId(rawStudentId)?rawStudentId:'';
  const scopes=['library:read'];
  if(tier==='STAFF'||tier==='ADMIN') scopes.push('library:internal:read');
  if(tier==='ADMIN') scopes.push('library:admin:read');

  // User decision: for nursing students, the canonical RTAFNC_ID is the verified 7-digit student ID.
  // Staff/advisor canonical IDs remain unset until an authoritative personnel source is supplied.
  const isStudent=tier==='STUDENT';
  const canonicalId=isStudent&&studentId?studentId:null;
  let canonicalStatus='NOT_APPLICABLE_STAFF_PENDING_PERSONNEL_SOURCE';
  if(isStudent) canonicalStatus=studentId?'VERIFIED_7_DIGIT_FORMAT':'PENDING_VALID_7_DIGIT_STUDENT_ID';

  return {
    ok:true,
    auth_source:'GOODDEED_V2_SESSION',
    subject_id:canonicalId||memberId,
    subject_id_type:canonicalId?'student_id_7_digit':'member_id',
    canonical_rtafnc_id:canonicalId,
    canonical_id_status:canonicalStatus,
    member_id:memberId,
    student_id:studentId,
    raw_student_id_status:rawStudentId&&!studentId?'INVALID_OR_UNVERIFIED_FORMAT':'OK_OR_EMPTY',
    display_name:cleanText(user.displayName,160),
    cohort:cleanText(user.cohort,40),
    legacy_role:cleanText(user.role,40).toLowerCase(),
    access_tier:tier,
    scopes
  };
}

function safeCandidateHints(v){
  if(!Array.isArray(v)) return [];
  return v.slice(0,12).map(x=>({id:cleanText(x&&x.id,80)})).filter(x=>x.id);
}

function buildPrompt(question,candidates){
  const sources=candidates.map((c,i)=>`[S${i+1}] ${c.title}\nSource: ${c.source_title}\nVersion: ${c.version||'-'}\nPages: ${c.pages||'-'}\nStatus: ${c.status||'-'}\nRegistry summary: ${c.summary}`).join('\n\n');
  return `คุณคือ AGIS Knowledge Agent ของ RTAFNC ONE\n\nกติกา:\n- ตอบเฉพาะจาก SOURCES ด้านล่างเท่านั้น\n- หากข้อมูลไม่พอ ให้ตอบว่าไม่พบข้อมูลเพียงพอ ห้ามเดา\n- ถ้า source status เป็น CANDIDATE/REVIEW ต้องบอกสถานะนั้น ไม่ยกเป็นข้อบังคับที่ยืนยันแล้ว\n- ห้ามเปิดเผยข้อมูลสุขภาพ สุขภาพจิต การปรึกษา กำลังพล หรือข้อมูลส่วนบุคคลที่ไม่มีใน source ที่อนุญาต\n- ตอบภาษาไทย กระชับ ใช้งานได้จริง\n- ปิดท้ายด้วยรายการแหล่งอ้างอิงในรูป [S1], [S2]\n\nQUESTION:\n${question}\n\nSOURCES:\n${sources}`;
}

async function callGemini(env,input){
  if(!env.GEMINI_API_KEY) return {ok:false,error:'GEMINI_API_KEY_NOT_CONFIGURED'};
  const model=env.GEMINI_MODEL||'gemini-3.7-flash';
  const tools=[];
  if(env.RTAFNC_MCP_URL){
    const mcp={type:'mcp_server',name:'rtafnc_core',url:env.RTAFNC_MCP_URL,allowed_tools:['library_search','library_get_excerpt']};
    if(env.RTAFNC_MCP_TOKEN) mcp.headers={Authorization:`Bearer ${env.RTAFNC_MCP_TOKEN}`};
    tools.push(mcp);
  }
  const payload={model,input};
  if(tools.length) payload.tools=tools;
  const res=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{
    method:'POST',headers:{'content-type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},body:JSON.stringify(payload)
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok) return {ok:false,error:'GEMINI_ERROR',detail:data};
  const text=data.output_text||data.outputText||extractText(data);
  return {ok:true,text:cleanText(text,12000),raw_id:data.id||null};
}
function extractText(data){
  const out=data&&data.output;
  if(!Array.isArray(out)) return '';
  const parts=[];
  for(const item of out){
    if(item&&typeof item.text==='string') parts.push(item.text);
    if(item&&Array.isArray(item.content)) for(const c of item.content) if(c&&typeof c.text==='string') parts.push(c.text);
  }
  return parts.join('\n');
}

async function handleAsk(request,env){
  const auth=await verifySession(request,env);
  if(!auth.ok) return json({ok:false,error:auth.error},401);
  const body=await request.json().catch(()=>({}));
  const question=cleanText(body.question,2000);
  const hints=safeCandidateHints(body.candidates);
  if(!question) return json({ok:false,error:'QUESTION_REQUIRED'},400);
  const candidates=hydrateAuthorizedCandidates(hints,auth);
  if(!candidates.length) return json({ok:true,mode:'grounded',answer:'ไม่พบแหล่งข้อมูลที่ได้รับอนุญาตซึ่งรองรับคำถามนี้ จึงยังไม่ตอบโดยการคาดเดา',sources:[],confidence:'no_source'});
  const result=await callGemini(env,buildPrompt(question,candidates));
  if(!result.ok) return json({ok:false,error:result.error,mode:'retrieval_only'},503);
  return json({ok:true,mode:'grounded',answer:result.text,sources:candidates.map(c=>({id:c.id,source_id:c.source_id,title:c.source_title,version:c.version,pages:c.pages,status:c.status})),confidence:'grounded_registry',interaction_id:result.raw_id});
}

async function handleSourceOpen(request,env){
  const auth=await verifySession(request,env);
  if(!auth.ok) return json({ok:false,error:auth.error},401);
  const body=await request.json().catch(()=>({}));
  const key=cleanText(body.source_key,140);
  if(!key) return json({ok:false,error:'SOURCE_KEY_REQUIRED'},400);
  return json({ok:false,error:'SECURE_SOURCE_RESOLVER_NOT_CONNECTED',source_key:key},501);
}

async function handleAuthMe(request,env){
  const auth=await verifySession(request,env);
  if(!auth.ok) return json({ok:false,error:auth.error},401);
  return json({ok:true,identity:{
    rtafnc_id:auth.canonical_rtafnc_id,
    canonical_id_status:auth.canonical_id_status,
    subject_id:auth.subject_id,
    subject_id_type:auth.subject_id_type,
    student_id:auth.student_id,
    display_name:auth.display_name,
    cohort:auth.cohort,
    access_tier:auth.access_tier,
    scopes:auth.scopes,
    auth_source:auth.auth_source
  }});
}

export default {
  async fetch(request,env){
    const url=new URL(request.url),origin=request.headers.get('origin')||''; const ch=cors(origin,env);
    if(request.method==='OPTIONS') return new Response(null,{status:204,headers:ch});
    if(url.pathname==='/health') return json({ok:true,service:'rtafnc-agis-knowledge',phase:5,gemini:Boolean(env.GEMINI_API_KEY),mcp:Boolean(env.RTAFNC_MCP_URL),auth:Boolean(env.AUTH_VERIFY_URL)},200,ch);
    if(request.method==='POST'&&url.pathname==='/api/auth/me'){const r=await handleAuthMe(request,env);Object.entries(ch).forEach(([k,v])=>r.headers.set(k,v));return r}
    if(request.method==='POST'&&url.pathname==='/api/knowledge/ask'){const r=await handleAsk(request,env);Object.entries(ch).forEach(([k,v])=>r.headers.set(k,v));return r}
    if(request.method==='POST'&&url.pathname==='/api/source/open'){const r=await handleSourceOpen(request,env);Object.entries(ch).forEach(([k,v])=>r.headers.set(k,v));return r}
    return json({ok:false,error:'NOT_FOUND'},404,ch);
  }
};
