(function(){
  'use strict';
  const C = window.RTAFNC_ONE_CONFIG;
  const app = document.getElementById('app');
  const bridge = document.getElementById('api-bridge');
  const callbacks = new Map();
  const state = { token: sessionStorage.getItem('one_session') || '', user:null, deeds:[], profile:null, demo:false };

  const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[c]);
  const rid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const roleLabel = r => ({student:'นักเรียน',teacher:'อาจารย์ผู้ตรวจ',admin:'ผู้ดูแลระบบ'})[r] || r || 'ผู้ใช้งาน';
  const statusLabel = s => ({approved:'อนุมัติแล้ว',pending:'รอตรวจ',rejected:'ไม่อนุมัติ'})[s] || s || 'รายการ';
  function toast(msg,kind='info'){
    const n=document.getElementById('toast'); n.textContent=msg; n.style.borderColor=kind==='error'?'rgba(255,107,115,.4)':'rgba(215,184,90,.25)';
    n.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>n.classList.remove('show'),2800);
  }

  window.addEventListener('message',event=>{
    if(!C.RESPONSE_ORIGINS.includes(event.origin)) return;
    const d=event.data; if(!d || d.channel!=='RTAFNC_GOODDEED' || !d.requestId) return;
    const p=callbacks.get(d.requestId); if(!p) return;
    clearTimeout(p.timeout); callbacks.delete(d.requestId); p.cleanup();
    d.ok ? p.resolve(d.data) : p.reject(new Error(d.error || 'ระบบไม่ตอบสนอง'));
  });

  function api(action,payload={}){
    return new Promise((resolve,reject)=>{
      const id=rid(), frame=document.createElement('iframe'), form=document.createElement('form');
      const frameName=`one_${id.replace(/[^a-zA-Z0-9]/g,'')}`;
      frame.name=frameName; frame.hidden=true; form.hidden=true; form.method='POST'; form.action=C.GOOD_DEED_API_URL; form.target=frameName;
      const fields={action,requestId:id,origin:location.origin,sessionToken:state.token,payload:JSON.stringify(payload)};
      Object.entries(fields).forEach(([name,value])=>{const i=document.createElement('input');i.type='hidden';i.name=name;i.value=value;form.appendChild(i)});
      const cleanup=()=>{form.remove();frame.remove()};
      const timeout=setTimeout(()=>{callbacks.delete(id);cleanup();reject(new Error('หมดเวลารอ Apps Script'))},C.REQUEST_TIMEOUT_MS);
      callbacks.set(id,{resolve,reject,cleanup,timeout}); bridge.append(frame,form); form.submit();
    });
  }

  function renderLogin(){
    app.innerHTML=`<main class="login-wrap"><section class="login-card">
      <div class="logo-ring"><img data-rtafnc-logo src="../frontend/510903.jpg" alt="ตราวิทยาลัยพยาบาลทหารอากาศ"></div>
      <h1>RTAFNC ONE</h1><p class="sub">All for One · One for All<br>วิทยาลัยพยาบาลทหารอากาศ</p>
      <form id="login-form">
        <div class="field"><label>รหัสนักเรียน / ชื่อผู้ใช้</label><input name="username" autocomplete="username" required></div>
        <div class="field"><label>รหัสผ่าน</label><input name="password" type="password" autocomplete="current-password" required></div>
        <button class="btn btn-primary" style="width:100%;margin-top:8px" type="submit">เข้าสู่ระบบด้วยฐาน Good Deed V2</button>
      </form>
      <div class="btn-row">
        <button class="btn btn-secondary" id="demo">ดูหน้าต้นแบบ</button>
        <a class="btn btn-line" style="text-align:center;text-decoration:none" href="${esc(C.CURRENT_LIFF_URL)}">เปิด LIFF เดิม</a>
      </div>
      <div class="notice">Integration Branch · Clone-first · ยังไม่เปลี่ยน Production หรือ LIFF Endpoint เดิม</div>
    </section></main>`;
    document.getElementById('login-form').onsubmit=login;
    document.getElementById('demo').onclick=()=>{state.demo=true;state.user={displayName:'นพอ. ตัวอย่างระบบ',studentId:'6900000',cohort:'69',role:'student'};state.profile={officialName:'นพอ. ตัวอย่างระบบ',studentId:'6900000',cohort:'69'};state.deeds=[{description:'กิจกรรมจิตอาสาวิทยาลัย',hours:3,status:'approved',activityDate:new Date().toISOString()},{description:'ช่วยงานพิธีการ',hours:2,status:'pending',activityDate:new Date().toISOString()}];renderHome()};
  }

  async function login(e){
    e.preventDefault(); const b=e.submitter; b.disabled=true; b.textContent='กำลังตรวจสอบ...';
    try{
      const r=await api('login',{username:e.target.username.value.trim(),password:e.target.password.value});
      state.token=r.sessionToken; state.user=r.user; sessionStorage.setItem('one_session',state.token); await loadLive();
    }catch(err){toast(err.message,'error');b.disabled=false;b.textContent='เข้าสู่ระบบด้วยฐาน Good Deed V2'}
  }

  async function restore(){
    if(!state.token) return renderLogin();
    try{const r=await api('me');state.user=r.user;await loadLive()}catch(_){sessionStorage.removeItem('one_session');state.token='';renderLogin()}
  }

  async function loadLive(){
    const tasks=[api('listDeeds',{limit:250}).catch(()=>({deeds:[]})),api('getProfile',{}).catch(()=>null)];
    const [deeds,profile]=await Promise.all(tasks); state.deeds=deeds.deeds||[]; state.profile=profile && (profile.profile||profile); renderHome();
  }

  function renderHome(){
    const u=state.user||{}, p=state.profile||{};
    const approved=state.deeds.filter(x=>x.status==='approved'), pending=state.deeds.filter(x=>x.status==='pending');
    const hours=approved.reduce((a,x)=>a+Number(x.hours||0),0); const isStaff=['teacher','admin'].includes(u.role);
    const name=p.officialName||u.displayName||'ผู้ใช้งาน'; const sid=p.studentId||u.studentId||u.username||'—'; const cohort=p.cohort||u.cohort||'—';
    const initial=name.replace(/^นพอ\.\s*/,'').trim().slice(0,2)||'วพ';
    const recent=(state.deeds.slice().sort((a,b)=>new Date(b.updatedAt||b.submittedAt||b.activityDate||0)-new Date(a.updatedAt||a.submittedAt||a.activityDate||0)).slice(0,4));
    const recentHtml=recent.length?recent.map(d=>`<div class="feed-item"><div class="feed-ico">${d.status==='approved'?'✅':d.status==='rejected'?'↩️':'⏳'}</div><div><b>${esc(d.description||d.category||'บันทึกความดี')}</b><p>${esc(statusLabel(d.status))} · ${Number(d.hours||0)} ชม.</p></div><span class="tag">Good Deed</span></div>`).join(''):`<div class="feed-item"><div class="feed-ico">📭</div><div><b>ยังไม่มีรายการล่าสุด</b><p>เมื่อมี Event ระบบจะแสดงเป็น Action Feed ตรงนี้</p></div><span class="tag">ONE</span></div>`;
    app.innerHTML=`<div class="shell">
      <header class="topbar"><div class="wrap topbar-in"><div class="brand"><img data-rtafnc-logo src="../frontend/510903.jpg" alt="ตราวิทยาลัยพยาบาลทหารอากาศ"><div><strong>RTAFNC ONE</strong><small>วิทยาลัยพยาบาลทหารอากาศ · Digital Student & College OS</small></div></div><div class="pill">INTEGRATION ${esc(C.PILOT_VERSION)}</div></div></header>
      <main class="wrap">
        <section class="hero"><h1>สวัสดี ${esc(name)}</h1><p>หนึ่งตัวตน · หนึ่งประตู · ทุกบริการของ นพอ. และผู้ปฏิบัติงาน</p></section>
        <section class="grid">
          <div class="id-card"><div class="id-head"><div class="id-brand"><img data-rtafnc-logo src="../frontend/510903.jpg"><div><b>วิทยาลัยพยาบาลทหารอากาศ</b><span>ROYAL THAI AIR FORCE NURSING COLLEGE</span></div></div><div class="level">${esc(roleLabel(u.role))}</div></div><div class="id-body"><div class="avatar"><div class="avatar-inner">${esc(initial)}</div></div><div><div class="id-name">${esc(name)}</div><div class="id-meta">รหัส ${esc(sid)}<br>รุ่น/ชั้นปี ${esc(cohort)} · Identity เชื่อมฐาน Good Deed</div></div></div><div class="id-foot"><div class="hours"><strong>${hours.toLocaleString('th-TH')}</strong><small>ชั่วโมงความดีที่อนุมัติแล้ว</small></div><div class="qr-mock" title="Dynamic QR — Phase 2"></div></div></div>
          <div class="panel"><h2>สถานะระบบ</h2><div class="status-grid"><div class="metric ok"><strong>${approved.length}</strong><span>ความดีอนุมัติแล้ว</span></div><div class="metric warn"><strong>${pending.length}</strong><span>รอตรวจ</span></div><div class="metric"><strong>${isStaff?'STAFF':'LIVE'}</strong><span>${isStaff?'สิทธิ์ผู้ปฏิบัติงาน':'ข้อมูล Good Deed สด'}</span></div></div><div class="system-list" style="margin-top:12px"><div class="system-row"><div><b>Good Deed V2</b><small>Clone จากระบบใช้งานจริง · Apps Script + Drive + Audit</small></div><span class="dot"></span></div><div class="system-row"><div><b>Advisor + Health</b><small>Pilot พร้อมเชื่อม One Identity</small></div><span class="dot"></span></div><div class="system-row"><div><b>Telegram / LINE</b><small>Telegram Primary · LINE Urgent/Critical</small></div><span class="dot pending"></span></div></div></div>
        </section>
        <section class="panel" style="margin-top:16px"><h2>บริการของฉัน</h2><div class="actions">
          <a class="action" href="${esc(C.LINKS.SUBMIT_DEED)}"><span class="ico">🎖️</span><b>บันทึกความดี</b><small>ระบบเดิมที่ใช้งานจริง</small></a>
          ${isStaff?`<a class="action" href="${esc(C.LINKS.APPROVAL)}"><span class="ico">✅</span><b>อนุมัติรายการ</b><small>คิวงานอาจารย์</small></a>`:`<a class="action" href="${esc(C.LINKS.PROFILE)}"><span class="ico">🪪</span><b>ข้อมูลส่วนตัว</b><small>Profile / รูป / เอกสาร</small></a>`}
          <a class="action" href="advisor.html"><span class="ico">💬</span><b>อาจารย์ที่ปรึกษา</b><small>นัดพบ · อษ.3 · อษ.4 · Follow-up</small></a>
          <a class="action" href="health.html"><span class="ico">🫶</span><b>สุขภาพและดูแลใจ</b><small>เวชระเบียน · รพ. · นัด · Urgent</small></a>
          <div class="action" data-soon="scholarship"><span class="ico">🎓</span><b>ทุนการศึกษา</b><small>Prefill · Advisor · Word/PDF</small></div>
          <div class="action" data-soon="activity"><span class="ico">🏃</span><b>กิจกรรมนักศึกษา</b><small>PDCA · QR · ชมรม · Portfolio</small></div>
          <div class="action" data-soon="welfare"><span class="ico">🎁</span><b>สวัสดิการ นพอ.</b><small>สิทธิ์ · รับของ · เครื่องแต่งกาย</small></div>
          <div class="action" data-soon="dorm"><span class="ico">🏠</span><b>หอพัก</b><small>ห้อง · เตียง · ตรวจห้อง · แจ้งซ่อม</small></div>
          <div class="action" data-soon="laundry"><span class="ico">🧺</span><b>ซักผ้า</b><small>เครื่อง · คิว · แจ้งเสีย</small></div>
          <div class="action" data-soon="docs"><span class="ico">📄</span><b>เอกสารและลงนาม</b><small>Word · PDF · PNG · e-Approval</small></div>
          <a class="action" href="ops.html"><span class="ico">🛡️</span><b>Operations Center</b><small>แม่แอด · Workflow · Alert</small></a>
          <a class="action" href="${esc(C.LINKS.CARD_SHOWCASE)}"><span class="ico">💳</span><b>Digital Card Lab</b><small>ต้นแบบการ์ดเดิม</small></a>
        </div></section>
        <section class="grid" style="margin-top:16px"><div class="panel"><h2>Action Feed</h2><div class="feed">${recentHtml}<div class="feed-item"><div class="feed-ico">📣</div><div><b>RTAFNC ONE Integration เริ่มรวมโมดูลแล้ว</b><p>Good Deed เป็นฐานเทคนิค และเสียบ Advisor, Health, Activity, Welfare ทีละระบบ</p></div><span class="tag">System</span></div></div></div><div class="panel"><h2>หลักการเชื่อมต่อ</h2><div class="system-list"><div class="system-row"><div><b>Telegram = Primary Operations</b><small>งานทั่วไป อนุมัติ ประชาสัมพันธ์ และเจ้าหน้าที่</small></div><span class="dot"></span></div><div class="system-row"><div><b>LINE = Critical Channel</b><small>สุขภาพ สุขภาพจิต เหตุเร่งด่วน และ Flex Message สำคัญ</small></div><span class="dot pending"></span></div><div class="system-row"><div><b>Google Drive = Master Repository</b><small>รูป PDF หลักฐาน เอกสาร และข้อมูลเดิม</small></div><span class="dot"></span></div></div></div></section>
      </main>
      <nav class="bottom-nav"><button class="active" data-nav="home"><span>⌂</span>หน้าหลัก</button><button data-nav="inbox"><span>◉</span>Inbox</button><button data-nav="card"><span>▣</span>บัตร</button><button id="logout"><span>♙</span>${state.demo?'ออกจาก Demo':'ออกจากระบบ'}</button></nav>
    </div>`;
    document.querySelectorAll('[data-soon]').forEach(x=>x.onclick=()=>toast(`โมดูล ${x.dataset.soon} ถูกล็อกใน Integration Plan และจะเปิดทีละระบบหลังผ่าน Core Contract`));
    document.querySelectorAll('[data-nav]').forEach(x=>x.onclick=()=>toast(x.dataset.nav==='home'?'อยู่หน้าหลักแล้ว':'กำลังประกอบเป็น ONE App Shell'));
    document.getElementById('logout').onclick=logout;
  }

  async function logout(){
    if(state.demo){state.demo=false;state.user=null;state.deeds=[];state.profile=null;return renderLogin()}
    try{if(state.token) await api('logout')}catch(_){}
    sessionStorage.removeItem('one_session');state.token='';state.user=null;state.deeds=[];state.profile=null;renderLogin();
  }

  restore();
})();