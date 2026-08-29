const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};

function json(data,status=200,extra={}){return new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,...extra}})}
function cors(origin,env){
  const allowed=String(env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
  return allowed.includes(origin)?{'access-control-allow-origin':origin,'access-control-allow-methods':'POST,GET,OPTIONS','access-control-allow-headers':'content-type,authorization,x-rtafnc-session','vary':'Origin'}:{};
}
function cleanText(v,max=4000){return String(v||'').trim().slice(0,max)}
function safeCandidates(v){
  if(!Array.isArray(v)) return [];
  return v.slice(0,8).map(x=>({
    id:cleanText(x.id,80),title:cleanText(x.title,240),summary:cleanText(x.summary,800),
    source_id:cleanText(x.source_id,100),source_title:cleanText(x.source_title,240),version:cleanText(x.version,80),pages:cleanText(x.pages,80),status:cleanText(x.status,80)
  })).filter(x=>x.id&&x.source_id);
}

async function verifySession(request,env){
  // PHASE 3 PILOT: fail closed for protected backend unless a verifier URL is configured.
  // Production verifier returns {ok:true, rtafnc_id, roles:[...], scopes:[...]}
  if(!env.AUTH_VERIFY_URL) return {ok:false,error:'AUTH_VERIFIER_NOT_CONFIGURED'};
  const token=request.headers.get('x-rtafnc-session')||request.headers.get('authorization')||'';
  if(!token) return {ok:false,error:'NO_SESSION'};
  const res=await fetch(env.AUTH_VERIFY_URL,{method:'POST',headers:{'content-type':'application/json','authorization':token},body:'{}'});
  if(!res.ok) return {ok:false,error:'SESSION_REJECTED'};
  const data=await res.json().catch(()=>({}));
  if(!data.ok||!data.rtafnc_id) return {ok:false,error:'SESSION_REJECTED'};
  return data;
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
  const candidates=safeCandidates(body.candidates);
  if(!question) return json({ok:false,error:'QUESTION_REQUIRED'},400);
  if(!candidates.length) return json({ok:true,mode:'grounded',answer:'ไม่พบแหล่งข้อมูลที่ได้รับอนุญาตซึ่งรองรับคำถามนี้ จึงยังไม่ตอบโดยการคาดเดา',sources:[],confidence:'no_source'});

  // Important: candidates supplied by client are only hints. Production MCP/library service must re-check role/source access server-side.
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
  // PHASE 3: no direct Drive URL issuance here. Secure source resolver is a separate backend/MCP responsibility.
  return json({ok:false,error:'SECURE_SOURCE_RESOLVER_NOT_CONNECTED',source_key:key},501);
}

export default {
  async fetch(request,env){
    const url=new URL(request.url),origin=request.headers.get('origin')||''; const ch=cors(origin,env);
    if(request.method==='OPTIONS') return new Response(null,{status:204,headers:ch});
    if(url.pathname==='/health') return json({ok:true,service:'rtafnc-agis-knowledge',phase:3,gemini:Boolean(env.GEMINI_API_KEY),mcp:Boolean(env.RTAFNC_MCP_URL),auth:Boolean(env.AUTH_VERIFY_URL)},200,ch);
    if(request.method==='POST'&&url.pathname==='/api/knowledge/ask'){const r=await handleAsk(request,env);Object.entries(ch).forEach(([k,v])=>r.headers.set(k,v));return r}
    if(request.method==='POST'&&url.pathname==='/api/source/open'){const r=await handleSourceOpen(request,env);Object.entries(ch).forEach(([k,v])=>r.headers.set(k,v));return r}
    return json({ok:false,error:'NOT_FOUND'},404,ch);
  }
};
