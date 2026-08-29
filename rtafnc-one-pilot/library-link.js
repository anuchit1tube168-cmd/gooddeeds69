(function(){
  'use strict';
  function ensureLibrary(){
    const actions=document.querySelector('.actions');
    if(!actions || actions.querySelector('[data-one-library]')) return;
    const a=document.createElement('a');
    a.className='action';
    a.href='library.html';
    a.setAttribute('data-one-library','true');
    a.innerHTML='<span class="ico">📚</span><b>Library & Knowledge</b><small>คู่มือ · คำสั่ง · สวัสดิการ · แบบธรรมเนียม · Learning</small>';
    actions.appendChild(a);
  }
  const obs=new MutationObserver(ensureLibrary);
  obs.observe(document.documentElement,{childList:true,subtree:true});
  ensureLibrary();
})();