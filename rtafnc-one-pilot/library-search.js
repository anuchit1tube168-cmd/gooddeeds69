(function(){
  'use strict';
  const R=window.RTAFNC_KNOWLEDGE_REGISTRY;
  if(!R) throw new Error('Knowledge Registry not loaded');
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const CATS=[['ALL','ทั้งหมด','🧭'],['STUDENT','คู่มือนักเรียน','📘'],['WELFARE','สวัสดิการ','🎁'],['ACTIVITY','กิจกรรม','🏃'],['ADVISOR','อาจารย์ที่ปรึกษา','💬'],['GOVERNANCE','ฝ่ายปกครอง','🛡️'],['MILITARY','แบบธรรมเนียมทหาร','🎖️'],['PERSONNEL','กำลังพล','👥'],['LEARNING','Learning','🎓']];
  const state={cat:'ALL',role:localStorage.getItem('rtafnc_library_demo_role')||'STUDENT',query:''};
  const sourceById=Object.fromEntries(R.sources.map(s=>[s.sourceId,s]));
  function canView(e){return (e.audience||[]).includes(state.role)||state.role==='ADMIN'}
  function roleName(r){return ({STUDENT:'นพอ.',ADVISOR:'อาจารย์ที่ปรึกษา',STAFF:'ผปค./เจ้าหน้าที่',ADMIN:'ผู้ดูแลระบบ'})[r]||r}
  function statusClass(s){return /VERIFIED/.test(s)?'verified':/CANDIDATE/.test(s)?'candidate':'review'}
  function normalized(x){return String(x||'').toLowerCase().replace(/\s+/g,' ').trim()}
  function score(e,q){if(!q)return 1;const hay=normalized([e.title,e.summary,(e.keywords||[]).join(' '),e.type,e.pages].join(' '));let n=hay.includes(q)?5:0;for(const t of q.split(' '))if(t&&hay.includes(t))n++;return n}
  function filtered(){const q=normalized(state.query);return R.entries.filter(e=>canView(e)&&(state.cat==='ALL'||e.cat===state.cat)).map(e=>({e,n:score(e,q)})).filter(x=>!q||x.n>0).sort((a,b)=>b.n-a.n||a.e.title.localeCompare(b.e.title,'th')).map(x=>x.e)}
  function renderRole(){const el=$('role');if(!el)return;el.value=state.role;el.onchange=()=>{state.role=el.value;localStorage.setItem('rtafnc_library_demo_role',state.role);renderAll()};$('role-label').textContent=roleName(state.role)}
  function renderCats(){const el=$('cats');el.innerHTML=CATS.map(x=>`<button class="cat ${state.cat===x[0]?'active':''}" data-cat="${x[0]}"><span>${x[2]}</span><b>${x[1]}</b><small>${x[0]}</small></button>`).join('');el.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{state.cat=b.dataset.cat;renderCats();renderItems()})}
  function renderStats(){const visible=R.entries.filter(canView);const sources=[...new Set(visible.map(x=>x.sourceId))].map(id=>sourceById[id]).filter(Boolean);$('registry-stats').innerHTML=`<span><b>${visible.length}</b> knowledge chapters</span><span><b>${sources.length}</b> sources</span><span><b>${sources.filter(x=>x.status==='VERIFIED_SOURCE').length}</b> verified</span><span><b>${sources.filter(x=>/CANDIDATE|REVIEW/.test(x.status)).length}</b> review</span>`}
  function renderItems(){const rows=filtered();const el=$('items');el.innerHTML=rows.length?rows.map(e=>{const s=sourceById[e.sourceId]||{};const open=s.url?`<a class="open-btn" href="${esc(s.url)}" target="_blank" rel="noopener">เปิดต้นฉบับ</a>`:`<button class="open-btn pending" data-pending="1">รอผูก Drive Master</button>`;return `<article class="item"><div class="ico">${e.icon||'📄'}</div><div class="item-main"><div class="item-title"><b>${esc(e.title)}</b><span class="badge ${esc(e.classification.toLowerCase())}">${esc(e.classification)}</span></div><p>${esc(e.summary)}</p><div class="meta">${esc(e.id)} · ${esc(e.type)}${e.pages?' · หน้า '+esc(e.pages):''}<br>Source: ${esc(s.title||e.sourceId)} · v${esc(s.version||'—')} · <span class="source-status ${statusClass(s.status||'')}">${esc(s.status||'UNKNOWN')}</span></div></div><div class="item-actions">${open}</div></article>`}).join(''):`<div class="empty">🔎 ไม่พบรายการที่ผู้ใช้บทบาท <b>${esc(roleName(state.role))}</b> มีสิทธิ์เข้าถึง</div>`;el.querySelectorAll('[data-pending]').forEach(b=>b.onclick=()=>showToast('ต้นฉบับผ่านการตรวจเนื้อหาแล้ว แต่ยังไม่ผูก Drive Master URL สำหรับ Production'))}
  function askAgis(){const text=$('ask').value.trim();if(!text)return;const q=normalized(text);const matches=R.entries.filter(canView).map(e=>({e,n:score(e,q)})).filter(x=>x.n>0).sort((a,b)=>b.n-a.n).slice(0,4).map(x=>x.e);if(!matches.length){$('answer').innerHTML='ยังไม่พบแหล่งข้อมูลที่ตรงคำถามใน Registry ที่บทบาทนี้เข้าถึงได้ — ระบบจะไม่เดาคำตอบ';return}const lines=matches.map(e=>{const s=sourceById[e.sourceId]||{};return `<li><b>${esc(e.title)}</b><br><small>${esc(s.title||e.sourceId)} · v${esc(s.version||'—')}${e.pages?' · หน้า '+esc(e.pages):''}</small></li>`}).join('');$('answer').innerHTML=`<b>Phase 2 Retrieval Preview</b><p>พบแหล่งที่เกี่ยวข้อง ${matches.length} รายการ:</p><ol>${lines}</ol><p class="answer-note">Phase 3 จะให้ AGIS อ่านเนื้อหาที่อนุญาตและตอบพร้อม Source/Version; ตอนนี้ยังไม่สังเคราะห์คำตอบอัตโนมัติ</p>`}
  function showToast(t){const n=$('lib-toast');n.textContent=t;n.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>n.classList.remove('show'),3000)}
  function renderAll(){renderRole();renderCats();renderStats();renderItems()}
  window.runSearch=()=>{state.query=$('q').value;renderItems()};window.askAgis=askAgis;
  $('q').addEventListener('input',e=>{state.query=e.target.value;renderItems()});
  renderAll();
})();
