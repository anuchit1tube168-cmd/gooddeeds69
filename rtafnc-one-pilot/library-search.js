(function(){
  'use strict';
  const R=window.RTAFNC_KNOWLEDGE_REGISTRY;
  if(!R) throw new Error('Knowledge Registry not loaded');
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const CATS=[['ALL','ทั้งหมด','🧭'],['STUDENT','คู่มือนักเรียน','📘'],['WELFARE','สวัสดิการ','🎁'],['ACTIVITY','กิจกรรม','🏃'],['ADVISOR','อาจารย์ที่ปรึกษา','💬'],['GOVERNANCE','ฝ่ายปกครอง','🛡️'],['MILITARY','แบบธรรมเนียมทหาร','🎖️'],['PERSONNEL','กำลังพล','👥'],['LEARNING','Learning','🎓']];
  const state={cat:'ALL',role:localStorage.getItem('rtafnc_library_demo_role')||'STUDENT',query:''};
  const sourceById=Object.fromEntries(R.sources.map(s=>[s.sourceId,s]));
  let agisLoadPromise=null;

  function canView(e){return (e.audience||[]).includes(state.role)||state.role==='ADMIN'}
  function roleName(r){return ({STUDENT:'นพอ.',ADVISOR:'อาจารย์ที่ปรึกษา',STAFF:'ผปค./เจ้าหน้าที่',ADMIN:'ผู้ดูแลระบบ'})[r]||r}
  function statusClass(s){return /VERIFIED/.test(s)?'verified':/CANDIDATE/.test(s)?'candidate':'review'}
  function normalized(x){return String(x||'').toLowerCase().replace(/\s+/g,' ').trim()}
  function score(e,q){if(!q)return 1;const hay=normalized([e.title,e.summary,(e.keywords||[]).join(' '),e.type,e.pages].join(' '));let n=hay.includes(q)?5:0;for(const t of q.split(' '))if(t&&hay.includes(t))n++;return n}
  function filtered(){const q=normalized(state.query);return R.entries.filter(e=>canView(e)&&(state.cat==='ALL'||e.cat===state.cat)).map(e=>({e,n:score(e,q)})).filter(x=>!q||x.n>0).sort((a,b)=>b.n-a.n||a.e.title.localeCompare(b.e.title,'th')).map(x=>x.e)}

  function loadScript(src){return new Promise((resolve,reject)=>{const old=[...document.scripts].find(s=>s.src&&s.src.endsWith(src));if(old){if(src==='agis-client.js'&&window.RTAFNC_AGIS)return resolve();if(src==='config.js'&&window.RTAFNC_ONE_CONFIG)return resolve()}const s=document.createElement('script');s.src=src+'?v=3';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)})}
  async function ensureAgis(){
    if(window.RTAFNC_AGIS) return window.RTAFNC_AGIS;
    if(!agisLoadPromise) agisLoadPromise=(async()=>{if(!window.RTAFNC_ONE_CONFIG)await loadScript('config.js');await loadScript('agis-client.js');return window.RTAFNC_AGIS||null})().catch(()=>null);
    return agisLoadPromise;
  }

  function renderRole(){const el=$('role');if(!el)return;el.value=state.role;el.onchange=()=>{state.role=el.value;localStorage.setItem('rtafnc_library_demo_role',state.role);renderAll()};$('role-label').textContent=roleName(state.role)}
  function renderCats(){const el=$('cats');el.innerHTML=CATS.map(x=>`<button class="cat ${state.cat===x[0]?'active':''}" data-cat="${x[0]}"><span>${x[2]}</span><b>${x[1]}</b><small>${x[0]}</small></button>`).join('');el.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{state.cat=b.dataset.cat;renderCats();renderItems()})}
  function renderStats(){const visible=R.entries.filter(canView);const sources=[...new Set(visible.map(x=>x.sourceId))].map(id=>sourceById[id]).filter(Boolean);$('registry-stats').innerHTML=`<span><b>${visible.length}</b> knowledge chapters</span><span><b>${sources.length}</b> sources</span><span><b>${sources.filter(x=>x.status==='VERIFIED_SOURCE').length}</b> verified</span><span><b>${sources.filter(x=>/CANDIDATE|REVIEW/.test(x.status)).length}</b> review</span><span><b>Phase 3</b> AGIS ready</span>`}

  function sourceAction(s){
    if(s.publicDirectLink&&s.url){return `<a class="open-btn" href="${esc(s.url)}" target="_blank" rel="noopener">เปิดต้นฉบับ</a>`}
    if(s.secureSourceKey){return `<button class="open-btn" data-secure-source="${esc(s.secureSourceKey)}">เปิดแบบ Secure</button>`}
    return `<button class="open-btn pending" data-pending="1">รอผูก Master</button>`;
  }

  function renderItems(){
    const rows=filtered(),el=$('items');
    el.innerHTML=rows.length?rows.map(e=>{const s=sourceById[e.sourceId]||{};return `<article class="item"><div class="ico">${e.icon||'📄'}</div><div class="item-main"><div class="item-title"><b>${esc(e.title)}</b><span class="badge ${esc(e.classification.toLowerCase())}">${esc(e.classification)}</span></div><p>${esc(e.summary)}</p><div class="meta">${esc(e.id)} · ${esc(e.type)}${e.pages?' · หน้า '+esc(e.pages):''}<br>Source: ${esc(s.title||e.sourceId)} · v${esc(s.version||'—')} · <span class="source-status ${statusClass(s.status||'')}">${esc(s.status||'UNKNOWN')}</span></div></div><div class="item-actions">${sourceAction(s)}</div></article>`}).join(''):`<div class="empty">🔎 ไม่พบรายการที่ผู้ใช้บทบาท <b>${esc(roleName(state.role))}</b> มีสิทธิ์เข้าถึง</div>`;
    el.querySelectorAll('[data-pending]').forEach(b=>b.onclick=()=>showToast('ยังไม่กำหนดต้นฉบับ Master สำหรับ Production'));
    el.querySelectorAll('[data-secure-source]').forEach(b=>b.onclick=()=>openSecureSource(b.dataset.secureSource));
  }

  async function openSecureSource(key){
    const s=R.sources.find(x=>x.secureSourceKey===key);if(!s)return;
    const allowed=(state.role==='ADMIN')||R.entries.some(e=>e.sourceId===s.sourceId&&canView(e));
    if(!allowed)return showToast('บัญชีนี้ไม่มีสิทธิ์เปิด Source นี้');
    const agis=await ensureAgis();
    if(!agis||!agis.configured()) return showToast(`Secure Source: ${s.title} — รอเชื่อม Auth/Backend เพื่อออก signed URL`);
    const result=await agis.openSource(key);
    if(result&&result.ok&&result.url){window.open(result.url,'_blank','noopener');return}
    showToast('Backend ยังไม่เปิด Secure Source Resolver หรือสิทธิ์ไม่ผ่าน');
  }

  function matchesFor(text){
    const q=normalized(text);
    return R.entries.filter(canView).map(e=>({e,n:score(e,q)})).filter(x=>x.n>0).sort((a,b)=>b.n-a.n).slice(0,5).map(x=>x.e);
  }
  function candidatePayload(matches){return matches.map(e=>{const s=sourceById[e.sourceId]||{};return {id:e.id,title:e.title,summary:e.summary,source_id:e.sourceId,source_title:s.title||e.sourceId,version:s.version||'',pages:e.pages||'',status:s.status||'UNKNOWN'}})}
  function retrievalPreview(matches){
    if(!matches.length)return 'ยังไม่พบแหล่งข้อมูลที่ตรงคำถามใน Registry ที่บทบาทนี้เข้าถึงได้ — ระบบจะไม่เดาคำตอบ';
    const lines=matches.map(e=>{const s=sourceById[e.sourceId]||{};return `<li><b>${esc(e.title)}</b><br><small>${esc(s.title||e.sourceId)} · v${esc(s.version||'—')}${e.pages?' · หน้า '+esc(e.pages):''} · ${esc(s.status||'UNKNOWN')}</small></li>`}).join('');
    return `<b>Retrieval-only</b><p>พบ Source ที่มีสิทธิ์เข้าถึง ${matches.length} รายการ:</p><ol>${lines}</ol><p class="answer-note">ยังไม่เปิด AI backend จึงไม่สังเคราะห์คำตอบ เพื่อป้องกันการเดาหรือใช้ Source ผิดฉบับ</p>`;
  }

  async function askAgis(){
    const text=$('ask').value.trim();if(!text)return;
    const matches=matchesFor(text);$('answer').innerHTML='<b>AGIS กำลังตรวจ Source และสิทธิ์…</b>';
    const agis=await ensureAgis();
    if(!agis||!agis.configured()){$('answer').innerHTML=retrievalPreview(matches);return}
    const result=await agis.ask(text,candidatePayload(matches));
    if(!result||!result.ok){$('answer').innerHTML=retrievalPreview(matches)+`<p class="answer-note">Backend status: ${esc(result&&result.error||'UNAVAILABLE')}</p>`;return}
    const src=(result.sources||[]).map(s=>`<li>${esc(s.title||s.source_id)} · v${esc(s.version||'—')}${s.pages?' · หน้า '+esc(s.pages):''} · ${esc(s.status||'')}</li>`).join('');
    $('answer').innerHTML=`<b>AGIS · Grounded Answer</b><p>${esc(result.answer||'').replace(/\n/g,'<br>')}</p>${src?`<details><summary>แหล่งอ้างอิง</summary><ol>${src}</ol></details>`:''}<p class="answer-note">คำตอบผ่าน Backend; Production ต้องตรวจ RTAFNC_ID/Role/Scope ฝั่ง server ทุกครั้ง</p>`;
  }

  function showToast(t){const n=$('lib-toast');n.textContent=t;n.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>n.classList.remove('show'),3400)}
  function renderAll(){renderRole();renderCats();renderStats();renderItems()}
  window.runSearch=()=>{state.query=$('q').value;renderItems()};window.askAgis=askAgis;
  $('q').addEventListener('input',e=>{state.query=e.target.value;renderItems()});
  renderAll();
})();
