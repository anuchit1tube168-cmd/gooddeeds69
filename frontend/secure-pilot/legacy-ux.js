(function(){
  'use strict';
  const LEVELS=[
    {min:350,level:10,label:'Celestial Supreme Commander'},
    {min:300,level:9,label:'Platinum Sovereign Angel Hero'},
    {min:250,level:8,label:'Ultimate Sovereign Angel Hero'},
    {min:180,level:7,label:'Royal Air Force Nurse Commander'},
    {min:120,level:6,label:'Guardian Angel of Health'},
    {min:80,level:5,label:'Gold Flight Rescue Hero'},
    {min:50,level:4,label:'Silver Care Hero'},
    {min:25,level:3,label:'Bronze Service Cadet'},
    {min:10,level:2,label:'Cadet Apprentice'},
    {min:0,level:1,label:'Cadet Novice'}
  ];
  function levelFor(hours){return LEVELS.find(x=>hours>=x.min)||LEVELS[LEVELS.length-1];}
  function numberFrom(text){const n=Number(String(text||'').replace(/[^0-9.]/g,''));return Number.isFinite(n)?n:0;}
  function enhanceLogin(){
    const card=document.querySelector('.login-card');
    if(!card||card.dataset.legacyUx==='1') return;
    card.dataset.legacyUx='1';
    const badge=card.querySelector('.pilot-badge');
    if(badge) badge.textContent='LINE LIFF · ระบบความดี วพอ. 2569';
    const note=document.createElement('div');
    note.className='legacy-login-note';
    note.textContent='บัญชีที่เคยผูก LINE แล้ว ระบบจะเข้าสู่ระบบให้อัตโนมัติ · ข้อมูลนักเรียนเก็บใน Google Drive/Sheets แบบ Private';
    const lineBox=card.querySelector('.line-box');
    if(lineBox) lineBox.insertAdjacentElement('afterend',note);
  }
  function enhanceDashboard(){
    const hero=document.querySelector('.hero');
    if(!hero||document.querySelector('.legacy-identity-card')) return;
    const totalNode=hero.querySelector('.metric.approved strong');
    if(!totalNode) return;
    const hours=numberFrom(totalNode.textContent);
    const lv=levelFor(hours);
    const greeting=hero.querySelector('.hero-main h2')?.textContent||'นักเรียนพยาบาล';
    const name=greeting.replace(/^สวัสดี\s*/,'').trim()||'นักเรียนพยาบาล';
    const card=document.createElement('section');
    card.className='legacy-identity-card';
    card.innerHTML=`<div class="legacy-chibi"><img src="photos/chibi/chibi_lv${lv.level}.png" alt="Chibi ระดับความดี ${lv.level}"><span class="legacy-level-pill">LV.${lv.level}</span></div><div class="legacy-card-copy"><p class="legacy-kicker">บัตรประจำตัวระบบความดี · GOOD DEED ID</p><h3></h3><p class="legacy-meta"></p><div class="legacy-stats"><div class="legacy-stat"><strong>${hours.toLocaleString('th-TH',{maximumFractionDigits:2})}</strong><span>ชั่วโมงสะสมอนุมัติ</span></div><div class="legacy-stat"><strong>LV.${lv.level}</strong><span>ระดับความดี</span></div></div></div>`;
    card.querySelector('h3').textContent=name;
    card.querySelector('.legacy-meta').textContent=`${lv.label} · ปีการศึกษา 2569`;
    hero.insertAdjacentElement('afterend',card);
  }
  function enhance(){enhanceLogin();enhanceDashboard();}
  const observer=new MutationObserver(enhance);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',enhance); else enhance();
})();
