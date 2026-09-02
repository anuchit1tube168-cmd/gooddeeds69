(() => {
  'use strict';

  const CFG = Object.freeze({
    LIFF_ID: '2010948179-Ympqt2bT',
    GAS_URL: 'https://script.google.com/macros/s/AKfycbwV0b31hWMSs2oNOff4o-O_PNoEQ1XlTM77f4sei9JLh1rza1SfFPTOlTaxiIKCIxLT_Q/exec',
    MAX_EVIDENCE_BYTES: 2 * 1024 * 1024,
    POLL_MS: 15000,
  });

  const CATEGORY = [
    {id:1,name:'บริจาคโลหิต/เกล็ดเลือด/พลาสมา',emoji:'🩸',max:16},
    {id:2,name:'โครงการภายนอก (คำสั่ง วพอ.)',emoji:'🌐',max:8},
    {id:3,name:'ช่วยเหลืองานภายใน วพอ.',emoji:'🏥',max:8},
    {id:4,name:'เข้าอบรมที่ วพอ. จัดให้',emoji:'📚',max:6},
    {id:5,name:'ช่วยงานหน่วยงาน/ชุมชน/มูลนิธิ',emoji:'🤝',max:8},
    {id:6,name:'ทำนุบำรุงศาสนสถาน',emoji:'🙏',max:6},
    {id:7,name:'งานฟรีทั่วไป',emoji:'⭐',max:4},
    {id:8,name:'กิจกรรมจงรักภักดีต่อสถาบัน',emoji:'👑',max:8},
    {id:9,name:'ชม. ที่สมควรได้รับ (บทบาทพิเศษ)',emoji:'🎖️',max:10},
  ];

  const LEVELS = [
    {min:350,lv:10,label:'Celestial Supreme Commander'},
    {min:300,lv:9,label:'Platinum Sovereign Angel Hero'},
    {min:250,lv:8,label:'Ultimate Sovereign Angel Hero'},
    {min:180,lv:7,label:'Royal Air Force Nurse Commander'},
    {min:120,lv:6,label:'Guardian Angel of Health'},
    {min:80,lv:5,label:'Gold Flight Rescue Hero'},
    {min:50,lv:4,label:'Silver Care Hero'},
    {min:25,lv:3,label:'Bronze Service Cadet'},
    {min:10,lv:2,label:'Cadet Apprentice'},
    {min:0,lv:1,label:'Cadet Novice'},
  ];

  const app = document.getElementById('app');
  const toastNode = document.getElementById('toast');
  const state = { profile:null, student:null, deeds:[], busy:false, poll:null, rosterLoaded:false };

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normDigits = (v) => String(v ?? '').replace(/[๐-๙]/g, d => '๐๑๒๓๔๕๖๗๘๙'.indexOf(d)).replace(/\D/g,'');
  const sidOf = (s) => String(s?.student_id ?? s?.studentId ?? s?.id ?? '').trim();
  const lineOf = (s) => String(s?.lineUserId ?? s?.line_user_id ?? s?.line_userid ?? s?.lineId ?? '').trim();
  const firstOf = (s) => String(s?.first_name ?? s?.firstName ?? s?.name ?? '').trim();
  const lastOf = (s) => String(s?.last_name ?? s?.lastName ?? '').trim();
  const cohortOf = (s) => String(s?.class_year ?? s?.cohort ?? s?.year ?? '').replace(/^รุ่น\s*/,'').trim();
  const fullName = (s) => String(s?.full_name ?? s?.displayName ?? `${s?.rank || 'นพอ.'} ${firstOf(s)} ${lastOf(s)}`).replace(/\s+/g,' ').trim();

  function toast(text, type='info') {
    if (!toastNode) return;
    toastNode.textContent = text;
    toastNode.className = `toast show ${type}`;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { toastNode.className='toast'; }, 3200);
  }

  function setBusy(value) { state.busy = value; document.body.dataset.busy = value ? '1' : '0'; }

  async function getJson(action, params={}) {
    const url = new URL(CFG.GAS_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('_', String(Date.now()));
    Object.entries(params).forEach(([k,v]) => { if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v)); });
    const res = await fetch(url.toString(), {cache:'no-store', redirect:'follow'});
    if (!res.ok) throw new Error(`Backend ${res.status}`);
    return res.json();
  }

  async function postLegacy(action, payload) {
    const body = JSON.stringify({action, ...payload});
    await fetch(CFG.GAS_URL, {method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain;charset=UTF-8'}, body});
    return {ok:true};
  }

  async function loadRoster() {
    const data = await getJson('getStudents');
    const list = Array.isArray(data) ? data : Array.isArray(data?.students) ? data.students : [];
    state.rosterLoaded = true;
    return list;
  }

  function normalizeDeed(d) {
    return {
      id: String(d?.id ?? d?.deedId ?? d?.recordId ?? ''),
      studentId: String(d?.student_id ?? d?.studentId ?? ''),
      categoryId: Number(d?.categoryId ?? d?.category_id ?? d?.category ?? 7),
      hours: Number(d?.hours ?? 0) || 0,
      activityDate: String(d?.activityDate ?? d?.event_date ?? d?.activity_date ?? ''),
      description: String(d?.description ?? d?.title ?? ''),
      status: String(d?.status ?? 'pending').toLowerCase(),
      submittedAt: String(d?.submittedAt ?? d?.created_at ?? d?.submitted_at ?? ''),
    };
  }

  async function loadDeeds() {
    if (!state.student) return [];
    const sid = sidOf(state.student);
    const data = await getJson('getDeeds', {studentId:sid});
    let list = [];
    if (Array.isArray(data)) list = data;
    else if (Array.isArray(data?.deeds)) list = data.deeds;
    else if (data && typeof data === 'object') list = data[sid] || [];
    state.deeds = list.map(normalizeDeed).filter(d => !d.studentId || d.studentId === sid);
    return state.deeds;
  }

  function levelFor(hours) { return LEVELS.find(x => hours >= x.min) || LEVELS[LEVELS.length-1]; }
  function approved() { return state.deeds.filter(d => ['approved','อนุมัติ','อนุมัติแล้ว'].includes(d.status)); }
  function pending() { return state.deeds.filter(d => ['', 'pending','รอตรวจ','รออนุมัติ'].includes(d.status)); }
  function totalHours() { return approved().reduce((s,d) => s + (Number(d.hours)||0), 0); }
  function categoryHours(id) { return approved().filter(d => d.categoryId === id).reduce((s,d)=>s+(Number(d.hours)||0),0); }

  function loginMarkup(message='') {
    return `<main class="legacy-login-wrap">
      <section class="legacy-header">
        <div class="legacy-emblem"><img src="510903.jpg" alt="ตราวิทยาลัยพยาบาลทหารอากาศ"></div>
        <h1>ระบบบันทึกความดี</h1>
        <p>วิทยาลัยพยาบาลทหารอากาศ กรมแพทย์ทหารอากาศ · ปีการศึกษา 2569</p>
      </section>
      <section class="legacy-login-card">
        <div class="traffic"><i></i><i></i><i></i><span>HeroHQ Lock Screen</span></div>
        <div class="legacy-tabs"><button class="active" type="button">👨‍⚕️ นักเรียน</button><button type="button" disabled title="อาจารย์ใช้ช่องทางอนุมัติเดิม">👩‍🏫 อาจารย์</button></div>
        <div class="line-panel"><b>🌟 ระบบบันทึกความดีจิตอาสา วพอ. 2569</b><small id="line-status">กำลังตรวจบัญชี LINE…</small></div>
        ${message ? `<div class="legacy-alert">${esc(message)}</div>` : ''}
        <form id="student-login-form">
          <label>รหัสนักเรียน <span>*</span><input id="student-id" inputmode="numeric" maxlength="7" placeholder="รหัส 7 หลัก" autocomplete="username" required></label>
          <label>รหัสผ่านครั้งแรก <span>*</span><input id="student-password" type="password" placeholder="ใช้รหัสประจำตัว 7 หลักใน Compatibility Mode" autocomplete="current-password" required></label>
          <button class="legacy-primary" type="submit">🔓 เข้าสู่ระบบ</button>
        </form>
        <p class="compat-note">Compatibility Mode: ต้องเปิดผ่าน LINE LIFF และจะผูกบัญชี LINE หลังยืนยันครั้งแรก หน้าเว็บไม่เก็บรายชื่อนักเรียนหรือ token ไว้ใน GitHub</p>
      </section>
    </main>`;
  }

  function renderLogin(message='') {
    app.innerHTML = loginMarkup(message);
    document.getElementById('student-login-form').addEventListener('submit', manualLogin);
    const st = document.getElementById('line-status');
    if (state.profile) st.textContent = `เชื่อมต่อ LINE: ${state.profile.displayName || 'ผู้ใช้งาน'}`;
    else st.textContent = 'ต้องเปิดระบบจากเมนู LINE OA / LIFF';
  }

  async function tryAutoLogin() {
    if (!state.profile?.userId) return false;
    try {
      const roster = await loadRoster();
      const found = roster.find(s => lineOf(s) && lineOf(s) === state.profile.userId);
      if (!found) return false;
      state.student = found;
      await loadDeeds();
      renderDashboard();
      startPoll();
      return true;
    } catch (e) {
      console.warn('auto-login unavailable', e);
      return false;
    }
  }

  async function manualLogin(ev) {
    ev.preventDefault();
    if (state.busy) return;
    if (!state.profile?.userId) return renderLogin('กรุณาเปิดระบบจาก LINE ก่อนเข้าสู่ระบบ');
    const sid = normDigits(document.getElementById('student-id').value);
    const pwd = String(document.getElementById('student-password').value || '').trim();
    if (!/^\d{7}$/.test(sid)) return renderLogin('รหัสนักเรียนต้องเป็นตัวเลข 7 หลัก');
    setBusy(true);
    try {
      const roster = await loadRoster();
      const found = roster.find(s => sidOf(s) === sid);
      if (!found) throw new Error('ไม่พบรหัสนักเรียนในฐานข้อมูล');
      const explicit = String(found.password ?? found.pin ?? '').trim();
      const ok = explicit ? pwd === explicit : pwd === sid;
      if (!ok) throw new Error('รหัสผ่านไม่ถูกต้อง');
      state.student = found;
      await postLegacy('bind_line', {
        studentId:sid,
        lineUserId:state.profile.userId,
        lineDisplayName:state.profile.displayName || '',
        linePictureUrl:state.profile.pictureUrl || ''
      });
      await loadDeeds();
      renderDashboard();
      startPoll();
      toast('เข้าสู่ระบบสำเร็จ 🎉','success');
    } catch (e) {
      renderLogin(e.message || 'เข้าสู่ระบบไม่สำเร็จ');
    } finally { setBusy(false); }
  }

  function renderDashboard() {
    if (!state.student) return renderLogin();
    const hours = totalHours();
    const lv = levelFor(hours);
    const sid = sidOf(state.student);
    const recent = [...state.deeds].sort((a,b)=>String(b.submittedAt).localeCompare(String(a.submittedAt))).slice(0,8);
    app.innerHTML = `<div class="legacy-shell">
      <header class="legacy-topbar"><div class="legacy-brand"><img src="510903.jpg" alt="ตรา วพอ."><div><b>ระบบบันทึกความดี</b><small>วิทยาลัยพยาบาลทหารอากาศ · 2569</small></div></div><button id="logout-btn" class="ghost-btn">ออกจากระบบ</button></header>
      <main class="legacy-page">
        <section class="hero-card-old">
          <div class="chibi-card"><img src="photos/chibi/chibi_lv${lv.lv}.png" alt="Chibi Level ${lv.lv}"><span>LV.${lv.lv}</span></div>
          <div class="hero-copy"><small>บัตรประจำตัวระบบความดี</small><h2>${esc(fullName(state.student) || `นพอ. ${sid}`)}</h2><p>รหัส ${esc(sid)} · รุ่น ${esc(cohortOf(state.student) || sid.slice(0,2))}</p><div class="hero-hours"><strong>${hours.toFixed(0)}</strong><span>ชั่วโมงสะสม</span></div><p class="level-name">${esc(lv.label)}</p></div>
        </section>
        <section class="metric-row"><article><strong>${approved().length}</strong><span>อนุมัติแล้ว</span></article><article><strong>${pending().length}</strong><span>รอตรวจ</span></article><article><strong>${state.deeds.length}</strong><span>ทั้งหมด</span></article></section>
        <section class="quick-actions"><button id="submit-open" class="action-old">➕<b>บันทึกความดี</b></button><button id="refresh-btn" class="action-old">↻<b>อัปเดตข้อมูล</b></button><a class="action-old" href="https://line.me/R/ti/p/@586diwio" target="_blank">💬<b>ติดต่อ LINE OA</b></a></section>
        <section class="old-panel"><h3>ชั่วโมงตามหมวด</h3><div class="cat-grid">${CATEGORY.map(c=>`<div class="cat-old"><span>${c.emoji}</span><b>${esc(c.name)}</b><strong>${categoryHours(c.id).toFixed(0)} ชม.</strong></div>`).join('')}</div></section>
        <section class="old-panel"><div class="panel-head"><h3>ประวัติความดีล่าสุด</h3><span>${state.deeds.length} รายการ</span></div><div class="history-list">${recent.length ? recent.map(historyRow).join('') : '<div class="empty">ยังไม่มีรายการความดี</div>'}</div></section>
      </main>
      <div id="submit-modal" class="modal-old" hidden>${submitForm()}</div>
    </div>`;
    document.getElementById('logout-btn').onclick = logout;
    document.getElementById('refresh-btn').onclick = refresh;
    document.getElementById('submit-open').onclick = () => { document.getElementById('submit-modal').hidden=false; };
    document.getElementById('submit-close').onclick = () => { document.getElementById('submit-modal').hidden=true; };
    document.getElementById('deed-form').onsubmit = submitDeed;
    document.getElementById('category').onchange = syncMaxHours;
    syncMaxHours();
  }

  function historyRow(d) {
    const c = CATEGORY.find(x=>x.id===d.categoryId) || CATEGORY[6];
    const label = ['approved','อนุมัติ','อนุมัติแล้ว'].includes(d.status) ? 'อนุมัติแล้ว' : ['rejected','ไม่อนุมัติ'].includes(d.status) ? 'ไม่อนุมัติ' : 'รอตรวจ';
    return `<article class="history-item"><span class="hist-emoji">${c.emoji}</span><div><b>${esc(d.description || c.name)}</b><small>${esc(d.activityDate || '')} · ${esc(c.name)}</small></div><div class="hist-right"><strong>${Number(d.hours||0).toFixed(0)} ชม.</strong><span class="status ${d.status}">${label}</span></div></article>`;
  }

  function submitForm() {
    const today = new Date().toISOString().slice(0,10);
    return `<div class="modal-card"><div class="panel-head"><h3>บันทึกความดี</h3><button id="submit-close" type="button" class="ghost-btn">✕</button></div><form id="deed-form">
      <label>หมวดกิจกรรม<select id="category" required>${CATEGORY.map(c=>`<option value="${c.id}">${c.emoji} ${esc(c.name)}</option>`).join('')}</select></label>
      <div class="two-col"><label>วันที่ทำกิจกรรม<input id="activity-date" type="date" value="${today}" required></label><label>จำนวนชั่วโมง<input id="hours" type="number" min="0.5" step="0.5" required></label></div>
      <label>รายละเอียด<textarea id="description" rows="4" maxlength="1200" required></textarea></label>
      <label>หลักฐาน (ถ้ามี)<input id="evidence" type="file" accept="image/jpeg,image/png,application/pdf"><small>JPG / PNG / PDF ไม่เกิน 2 MB</small></label>
      <button id="submit-btn" class="legacy-primary" type="submit">ส่งรายการรอตรวจ</button>
    </form></div>`;
  }

  function syncMaxHours() {
    const cat = CATEGORY.find(c=>c.id===Number(document.getElementById('category')?.value)) || CATEGORY[0];
    const h = document.getElementById('hours');
    if (h) { h.max=String(cat.max); if (!h.value) h.value=String(Math.min(2,cat.max)); }
  }

  async function filePayload(file) {
    if (!file || !file.size) return null;
    if (file.size > CFG.MAX_EVIDENCE_BYTES) throw new Error('ไฟล์หลักฐานต้องไม่เกิน 2 MB');
    if (!['image/jpeg','image/png','application/pdf'].includes(file.type)) throw new Error('รองรับ JPG, PNG หรือ PDF เท่านั้น');
    const dataUrl = await new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(String(r.result)); r.onerror=reject; r.readAsDataURL(file); });
    return {name:file.name,type:file.type,size:file.size,dataUrl};
  }

  async function submitDeed(ev) {
    ev.preventDefault();
    if (state.busy || !state.student) return;
    const cat = CATEGORY.find(c=>c.id===Number(document.getElementById('category').value));
    const hours = Number(document.getElementById('hours').value);
    const description = document.getElementById('description').value.trim();
    if (!cat || !Number.isFinite(hours) || hours <= 0 || hours > cat.max) return toast(`หมวดนี้บันทึกได้ไม่เกิน ${cat?.max || '-'} ชั่วโมง`,'error');
    if (!description) return toast('กรุณากรอกรายละเอียด','error');
    setBusy(true);
    try {
      const evidence = await filePayload(document.getElementById('evidence').files?.[0]);
      const deed = {
        id:`deed_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
        studentId:sidOf(state.student), categoryId:cat.id, hours,
        activityDate:document.getElementById('activity-date').value,
        description, status:'pending', submittedAt:new Date().toISOString(),
        imageUrls:evidence ? [evidence.dataUrl] : [], evidence:evidence || undefined,
        student:{student_id:sidOf(state.student),full_name:fullName(state.student),class_year:cohortOf(state.student)}
      };
      await postLegacy('submit_deed',{deed});
      state.deeds.unshift(normalizeDeed(deed));
      renderDashboard();
      toast('ส่งรายการแล้ว รออาจารย์ตรวจ ✅','success');
      setTimeout(refresh, 1800);
    } catch (e) { toast(e.message || 'ส่งรายการไม่สำเร็จ','error'); }
    finally { setBusy(false); }
  }

  async function refresh() {
    if (!state.student || state.busy) return;
    setBusy(true);
    try { await loadDeeds(); renderDashboard(); toast('อัปเดตข้อมูลแล้ว','success'); }
    catch (e) { toast('ดึงข้อมูลล่าสุดไม่สำเร็จ','error'); }
    finally { setBusy(false); }
  }

  function startPoll() {
    clearInterval(state.poll);
    state.poll = setInterval(async()=>{ if (!state.busy && state.student && document.visibilityState==='visible') { try { await loadDeeds(); renderDashboard(); } catch {} } }, CFG.POLL_MS);
  }

  function logout() {
    clearInterval(state.poll); state.poll=null; state.student=null; state.deeds=[]; renderLogin();
  }

  async function initLiff() {
    renderLogin();
    try {
      if (!window.liff) throw new Error('LIFF SDK ไม่พร้อม');
      await window.liff.init({liffId:CFG.LIFF_ID});
      if (!window.liff.isLoggedIn()) { window.liff.login({redirectUri:location.href}); return; }
      state.profile = await window.liff.getProfile();
      renderLogin();
      const ok = await tryAutoLogin();
      if (!ok) renderLogin('ยังไม่พบการผูก LINE กรุณายืนยันรหัสนักเรียนครั้งแรก');
    } catch (e) {
      console.warn(e);
      renderLogin('ไม่สามารถยืนยัน LINE LIFF ได้ กรุณาปิดหน้าแล้วเปิดจากเมนู LINE OA ใหม่');
    }
  }

  initLiff();
})();