/* Uses the existing Cloudflare session and signed self-read contract. */
window.startGoodDeedGatewayView = function (options) {
  'use strict';
  const {root, config} = options;
  const client = window.createGoodDeedGatewayClient({origin:config.GATEWAY_ORIGIN, timeoutMs:config.REQUEST_TIMEOUT_MS});
  let snapshot = null, session = null, busy = false, filter = 'all', query = '', revision = 0;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const status = {pending:'รอตรวจ', approving:'กำลังตรวจสอบยอด', approved:'อนุมัติแล้ว', rejected:'ไม่อนุมัติ'};
  const categories = ['','บริจาคโลหิต / เกล็ดเลือด / พลาสมา','โครงการภายนอกตามคำสั่ง','ช่วยงานภายในวิทยาลัย','การอบรมของวิทยาลัย','ช่วยงานหน่วยงาน / ชุมชน','ทำนุบำรุงศาสนสถาน','งานช่วยเหลือโดยไม่รับค่าตอบแทน','กิจกรรมจงรักภักดี','บทบาทพิเศษ'];
  const date = value => { const d = new Date(value); return Number.isNaN(d.getTime()) ? 'ไม่ระบุวันที่' : new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeZone:'Asia/Bangkok'}).format(d); };
  const errors = {GATEWAY_NOT_CONFIGURED:'การยืนยันบัญชียังไม่พร้อม กรุณาติดต่อผู้ดูแล', GATEWAY_CONFIG_INVALID:'การเชื่อมต่อยังไม่พร้อม กรุณาติดต่อผู้ดูแล', SESSION_REQUIRED:'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง', ACCESS_DENIED:'บัญชีนี้ยังไม่มีสิทธิ์ดูข้อมูลส่วนนี้ กรุณาติดต่อผู้ดูแล', LINK_REQUIRED:'บัญชี LINE ยังไม่ได้เชื่อมกับบัญชีนักเรียน กรุณาติดต่อผู้ดูแล', RATE_LIMITED:'มีการเรียกใช้งานถี่เกินไป กรุณารอสักครู่ก่อนลองใหม่', REQUEST_TIMEOUT:'หมดเวลารอ ข้อมูลยังไม่ได้รับการยืนยัน กรุณาลองใหม่', LINE_TOKEN_REQUIRED:'กรุณาเข้าสู่ระบบผ่าน LINE อีกครั้ง', RESPONSE_INVALID:'ข้อมูลจากระบบยังไม่ครบถ้วน กรุณาติดต่อผู้ดูแล'};
  const errorText = e => errors[e.code] || 'เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
  const crest = '<img class="official-crest" src="510903.jpg" alt="ตราวิทยาลัยพยาบาลทหารอากาศ">';
  function shell(content, signedIn = false) {
    root.innerHTML = `<div class="shell"><a class="skip-link" href="#main-content">ข้ามไปเนื้อหา</a><header class="topbar"><div class="topbar-inner"><div class="brand">${crest}<div><h1>ระบบบันทึกความดี</h1><small>วิทยาลัยพยาบาลทหารอากาศ</small></div></div><div class="userbar"><span class="role">พื้นที่ทดลอง</span>${signedIn?'<button id="gateway-logout" class="btn btn-secondary">ออกจากระบบ</button>':''}</div></div></header><main id="main-content" class="page" tabindex="-1">${content}</main></div>`;
    const logoutButton = document.getElementById('gateway-logout');
    if (logoutButton) logoutButton.onclick = logout;
  }
  function entry(message = '', pending = false, logoutFailed = false) {
    shell(`<section class="gateway-welcome panel"><div class="panel-body"><p class="eyebrow">ความดีทุกครั้ง มีความหมาย</p><h2>${pending?'รอเชื่อมบัญชีนักเรียน':'พื้นที่ความดีของคุณ'}</h2><p>ดูชั่วโมงความดีจากทะเบียนกลาง และติดตามผลการตรวจรายการของตนเอง</p><div class="gateway-notice" role="status">${escape(message || 'เข้าสู่ระบบด้วย LINE เพื่อดูข้อมูลของคุณ')}</div><button class="btn btn-line" id="gateway-login">${pending?'ตรวจสอบบัญชีอีกครั้ง':'เข้าสู่ระบบด้วย LINE'}</button>${logoutFailed?'<button class="btn btn-secondary" id="retry-logout">ลองออกจากระบบอีกครั้ง</button>':''}<p class="login-note">เปิดทดลองการตรวจสอบข้อมูลส่วนบุคคล การส่งงานและอนุมัติอยู่ระหว่างทดสอบก่อนเปิดใช้</p></div></section>`);
    document.getElementById('gateway-login').onclick = login;
    if (logoutFailed) document.getElementById('retry-logout').onclick = logout;
  }
  function records() {
    const recordsNode = document.getElementById('gateway-records');
    const items = snapshot.items.filter(x=>(filter==='all'||(filter==='pending'?['pending','approving'].includes(x.status):x.status===filter)) && `${x.description || ''} ${categories[x.categoryId]}`.toLowerCase().includes(query.toLowerCase()));
    recordsNode.innerHTML = items.length ? items.map(item=>`<article class="gateway-record"><div><p class="record-category">หมวด ${item.categoryId} · ${escape(categories[item.categoryId])}</p><h3>${escape(item.description || 'ไม่ระบุรายละเอียด')}</h3><p class="record-meta">${escape(date(item.activityDate))} · ${item.hasEvidence?'มีหลักฐานแนบ':'ยังไม่แสดงข้อมูลหลักฐาน'}</p></div><div class="record-result"><strong>${item.hours.toLocaleString('th-TH')} <small>ชม.</small></strong><span class="gateway-status status-${escape(item.status)}">${escape(status[item.status])}</span></div></article>`).join('') : '<div class="gateway-empty" role="status"><h3>ไม่พบรายการในมุมมองนี้</h3><p>ลองเปลี่ยนตัวกรองหรือคำค้น ข้อมูลนี้ครอบคลุมรายการที่โหลดล่าสุด</p></div>';
    document.getElementById('result-count').textContent = `แสดง ${items.length} จาก ${snapshot.items.length} รายการที่โหลด`;
  }
  function dashboard(message = '') {
    const {card, loadedAt} = snapshot;
    shell(`<section class="hero"><div class="hero-main"><p class="eyebrow">ความตั้งใจของวันนี้ สร้างคุณค่าในวันหน้า</p><h2>${escape(card.displayName)}</h2><p>${escape(card.cohortLabel)} · ${escape(card.positionLabel)}</p><span class="gateway-level">ระดับ ${card.levelNumber} · ${escape(card.levelLabel)}</span></div><div class="hero-side"><div class="metric approved"><strong>${card.totalHours.toLocaleString('th-TH')}</strong><span>ชั่วโมงรวมตามทะเบียนกลาง</span></div><div class="metric pending"><strong>${card.pendingCount}</strong><span>รายการรอตรวจ / ตรวจสอบยอด</span></div></div></section><section class="gateway-summary" aria-label="สรุปจากทะเบียนกลาง"><div><span>รายการอนุมัติแล้ว</span><strong>${card.approvedCount} รายการ</strong></div><div><span>ผลตามทะเบียนกลาง</span><strong>${card.passed?'ผ่านเกณฑ์':'ยังไม่ผ่านเกณฑ์'}</strong></div><div><span>โหลดข้อมูลล่าสุด</span><strong>${escape(date(loadedAt))}</strong></div></section><div class="gateway-notice" role="status">${escape(message || 'ยอดรวมอ้างอิงทะเบียนกลาง อาจมียอดยกมาที่ไม่ได้อยู่ในรายการด้านล่าง')}</div><section class="panel"><div class="panel-head"><div><h2>รายการความดีของฉัน</h2><p id="result-count"></p></div><button class="btn btn-secondary" id="gateway-refresh">รีเฟรชข้อมูล</button></div><div class="panel-body"><div class="gateway-controls"><label>ค้นหารายการ<input id="gateway-search" type="search" placeholder="ค้นหากิจกรรมหรือหมวด" value="${escape(query)}"></label><label>สถานะ<select id="gateway-filter"><option value="all">ทั้งหมด</option><option value="pending">รอตรวจ / ตรวจสอบยอด</option><option value="approved">อนุมัติแล้ว</option><option value="rejected">ไม่อนุมัติ</option></select></label></div><div id="gateway-records"></div><p class="login-note">แสดงไม่เกิน 150 รายการล่าสุด จำนวนในหน้านี้ใช้แทนยอดรวมทางการไม่ได้</p></div></section>`, true);
    const select = document.getElementById('gateway-filter'); select.value = filter; select.onchange = () => {filter=select.value;records();};
    document.getElementById('gateway-search').oninput = event => {query=event.target.value;records();};
    document.getElementById('gateway-refresh').onclick = refresh;
    records();
  }
  function lock(value) { busy=value; root.setAttribute('aria-busy', String(value)); root.querySelectorAll('button').forEach(button=>{button.disabled=value;}); }
  async function refresh() {
    if (busy) return;
    const current = ++revision; lock(true);
    try { const data = await client.readSelf(); if(current===revision) { snapshot=data; dashboard(); } }
    catch (error) {
      if (current!==revision) return;
      // Do not render another student's or expired-session data after denial.
      if (['SESSION_REQUIRED','ACCESS_DENIED','LINK_REQUIRED'].includes(error.code)) { snapshot=null;session=null;entry(errorText(error)); }
      else if (snapshot) dashboard('ข้อมูลอาจยังไม่เป็นปัจจุบัน · '+errorText(error));
      else entry(errorText(error));
    } finally { if(current===revision) lock(false); }
  }
  async function login() {
    if (busy) return;
    lock(true);
    try {
      if (!config.GATEWAY_ORIGIN) throw {code:'GATEWAY_NOT_CONFIGURED'};
      if (!window.liff) throw {code:'LINE_TOKEN_REQUIRED'};
      await window.liff.init({liffId:config.LIFF_ID});
      if (!window.liff.isLoggedIn()) { window.liff.login(); return; }
      session = await client.verifyLine(window.liff.getIDToken());
      if (!session.studentLinked) { entry(errors.LINK_REQUIRED, true); return; }
      lock(false); await refresh();
    } catch (error) { snapshot=null;entry(errorText(error)); }
    finally { lock(false); }
  }
  async function logout() {
    if (busy) return;
    ++revision; snapshot=null;session=null;client.clear();entry('กำลังออกจากระบบ…');lock(true);
    try { await client.logout(); if(window.liff?.isLoggedIn()) window.liff.logout();entry('ออกจากระบบแล้ว'); }
    catch (_) { entry('ซ่อนข้อมูลบนหน้านี้แล้ว แต่ยังยืนยันการออกจากระบบกับเซิร์ฟเวอร์ไม่ได้ กรุณาลองอีกครั้ง', false, true); }
    finally { lock(false); }
  }
  async function start() {
    entry(); lock(true);
    try {
      session = await client.restore();
      if (!session.studentLinked) { entry(errors.LINK_REQUIRED, true); return; }
      lock(false); await refresh();
    } catch (error) { entry(error.code==='SESSION_REQUIRED'?'':errorText(error)); }
    finally { lock(false); }
  }
  return start();
};
