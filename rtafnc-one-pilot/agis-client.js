(function(){
  'use strict';
  const cfg=window.RTAFNC_ONE_CONFIG||{};
  const base=String(cfg.AGIS_API_BASE||'').replace(/\/$/,'');

  function sessionToken(){
    // Existing Good Deed V2 session. Do not invent a second browser identity.
    return String(sessionStorage.getItem('one_session')||'').trim();
  }

  async function post(path,body){
    if(!base) return {ok:false,mode:'retrieval_only',error:'AGIS_BACKEND_NOT_CONFIGURED'};
    const token=sessionToken();
    if(!token) return {ok:false,mode:'retrieval_only',error:'RTAFNC_SESSION_REQUIRED'};
    const ctl=new AbortController();
    const timer=setTimeout(()=>ctl.abort(),cfg.REQUEST_TIMEOUT_MS||30000);
    try{
      const res=await fetch(base+path,{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'X-RTAFNC-Session':token
        },
        credentials:'omit',
        signal:ctl.signal,
        body:JSON.stringify(body)
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok) return {ok:false,error:data.error||('HTTP_'+res.status),status:res.status,mode:data.mode||'retrieval_only'};
      return data;
    }catch(err){
      return {ok:false,error:err&&err.name==='AbortError'?'TIMEOUT':'NETWORK_ERROR',mode:'retrieval_only'};
    }finally{clearTimeout(timer)}
  }

  function context(){
    return {
      app:'RTAFNC_ONE',
      client:'library',
      pilot:true,
      // UI role is only a presentation/testing hint. Backend derives authorization from verified session.
      ui_role_hint:localStorage.getItem('rtafnc_library_demo_role')||'STUDENT'
    };
  }

  window.RTAFNC_AGIS=Object.freeze({
    configured:()=>Boolean(base),
    hasSession:()=>Boolean(sessionToken()),
    sessionSource:()=>sessionToken()?'GOODDEED_V2':'NONE',
    whoAmI:()=>post('/api/auth/me',{context:context()}),
    ask:(question,candidates)=>post('/api/knowledge/ask',{question,candidates,context:context()}),
    openSource:(sourceKey)=>post('/api/source/open',{source_key:sourceKey,context:context()})
  });
})();
