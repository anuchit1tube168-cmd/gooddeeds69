(function(){
  'use strict';
  const cfg=window.RTAFNC_ONE_CONFIG||{};
  const base=String(cfg.AGIS_API_BASE||'').replace(/\/$/,'');

  async function post(path,body){
    if(!base) return {ok:false,mode:'retrieval_only',error:'AGIS_BACKEND_NOT_CONFIGURED'};
    const ctl=new AbortController();
    const timer=setTimeout(()=>ctl.abort(),cfg.REQUEST_TIMEOUT_MS||30000);
    try{
      const res=await fetch(base+path,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'omit',
        signal:ctl.signal,
        body:JSON.stringify(body)
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok) return {ok:false,error:data.error||('HTTP_'+res.status),status:res.status};
      return data;
    }catch(err){
      return {ok:false,error:err&&err.name==='AbortError'?'TIMEOUT':'NETWORK_ERROR'};
    }finally{clearTimeout(timer)}
  }

  function context(){
    return {
      app:'RTAFNC_ONE',
      client:'library',
      pilot:true,
      // Pilot role is UI-only. Production backend MUST derive identity/roles from verified RTAFNC session.
      demo_role:localStorage.getItem('rtafnc_library_demo_role')||'STUDENT'
    };
  }

  window.RTAFNC_AGIS=Object.freeze({
    configured:()=>Boolean(base),
    ask:(question,candidates)=>post('/api/knowledge/ask',{question,candidates,context:context()}),
    openSource:(sourceKey)=>post('/api/source/open',{source_key:sourceKey,context:context()})
  });
})();
