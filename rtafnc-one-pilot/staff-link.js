(function(){
  'use strict';
  function ensureStaffPortal(){
    const actions=document.querySelector('.actions');
    if(!actions||actions.querySelector('[data-one-staff]'))return;
    const role=String(document.body.dataset?.role||'').toLowerCase();
    const a=document.createElement('a');
    a.className='action';
    a.href='staff.html';
    a.setAttribute('data-one-staff','true');
    a.innerHTML='<span class="ico">👥</span><b>Staff Portal</b><small>อาจารย์ · ที่ปรึกษา · ผปค. · สนับสนุน · สิทธิ์เฉพาะบุคคล</small>';
    // Portal itself performs backend authorization. Keeping the entry visible avoids relying on client-side role guessing.
    actions.appendChild(a);
  }
  const obs=new MutationObserver(ensureStaffPortal);
  obs.observe(document.documentElement,{childList:true,subtree:true});
  ensureStaffPortal();
})();
