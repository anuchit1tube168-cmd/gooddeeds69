(function(){
  'use strict';
  const C=window.RTAFNC_ONE_CONFIG||{};
  function token(){return sessionStorage.getItem('one_session')||''}
  function apiBase(){return String(C.AGIS_API_BASE||'').replace(/\/$/,'')}
  async function staffMe(){
    const base=apiBase();
    if(!base) return {ok:false,error:'STAFF_BACKEND_NOT_CONFIGURED',local:true};
    const session=token();
    if(!session) return {ok:false,error:'NO_SESSION',local:true};
    let res;
    try{
      res=await fetch(`${base}/api/staff/me`,{method:'POST',headers:{'content-type':'application/json','x-rtafnc-session':session},body:'{}',credentials:'omit'});
    }catch(_){return {ok:false,error:'STAFF_BACKEND_UNREACHABLE',local:true}}
    const data=await res.json().catch(()=>({ok:false,error:'INVALID_RESPONSE'}));
    if(!res.ok&&data&&data.error) return data;
    return data;
  }
  window.RTAFNCStaffClient=Object.freeze({staffMe,hasBackend:()=>Boolean(apiBase())});
})();
