/* Uses the existing Cloudflare session and signed self-read contract. */
window.startGoodDeedGatewayView = function (options) {
  'use strict';
  const {root, config} = options;
  const ui = window.GoodDeedUI;
  let view = 'records';
  const client = window.createGoodDeedGatewayClient({origin:config.GATEWAY_ORIGIN, timeoutMs:config.REQUEST_TIMEOUT_MS});
  let snapshot = null, session = null, busy = false, filter = 'all', query = '', revision = 0;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const status = {pending:'รอตรวจ', approving:'กำลังตรวจสอบยอด', approved:'อนุมัติแล้ว', rejected:'ไม่อนุมัติ'};
  const categories = ['','บริจาคโลหิต / เกล็ดเลือด / พลาสมา','โครงการภายนอกตามคำสั่ง','ช่วยงานภายในวิทยาลัย','การอบรมของวิทยาลัย','ช่วยงานหน่วยงาน / ชุมชน','ทำนุบำรุงศาสนสถาน','งานช่วยเหลือโดยไม่รับค่าตอบแทน','กิจกรรมจงรักภักดี','บทบาทพิเศษ'];
  const date = value => { const d = new Date(value); return Number.isNaN(d.getTime()) ? 'ไม่ระบุวันที่' : new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeZone:'Asia/Bangkok'}).format(d); };
  const errors = {GATEWAY_NOT_CONFIGURED:'การยืนยันบัญชียังไม่พร้อม กรุณาติดต่อผู้ดูแล', GATEWAY_CONFIG_INVALID:'การเชื่อมต่อยังไม่พร้อม กรุณาติดต่อผู้ดูแล', SESSION_REQUIRED:'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง', ACCESS_DENIED:'บัญชีนี้ยังไม่มีสิทธิ์ดูข้อมูลส่วนนี้ กรุณาติดต่อผู้ดูแล', LINK_REQUIRED:'บัญชี LINE ยังไม่ได้เชื่อมกับบัญชีนักเรียน กรุณาติดต่อผู้ดูแล', RATE_LIMITED:'มีการเรียกใช้งานถี่เกินไป กรุณารอสักครู่ก่อนลองใหม่', REQUEST_TIMEOUT:'หมดเวลารอ ข้อมูลยังไม่ได้รับการยืนยัน กรุณาลองใหม่', LINE_TOKEN_REQUIRED:'กรุณาเข้าสู่ระบบผ่าน LINE อีกครั้ง', RESPONSE_INVALID:'ข้อมูลจากระบบยังไม่ครบถ้วน กรุณาติดต่อผู้ดูแล'};
  const errorText = e => errors[e.code] || 'เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
  function shell(content, signedIn = false) {
    window.GoodDeedKindness?.unmount();
    root.innerHTML = ui.shell(content, {signedIn});
    const logoutButton = document.getElementById('gateway-logout');
    if (logoutButton) logoutButton.onclick = logout;
  }
  function entry(message = '', pending = false, logoutFailed = false) {
    shell(ui.welcome(message, pending, logoutFailed));
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
    const {card} = snapshot;
    if(view!=='records') {
      const content=view==='guide'?ui.guide():'<section class="panel"><div class="panel-body gateway-empty"><h2>กำลังเตรียมเปิดรับบันทึกความดี</h2><p>ขณะนี้พื้นที่ทดลองเปิดให้ตรวจข้อมูลของตนเอง สามารถทดลองขั้นตอนส่งงานด้วยข้อมูลตัวอย่างได้</p><a class="btn btn-primary" href="demo.html">ทดลองขั้นตอนส่งความดี</a></div></section>';
      shell(`${ui.hero(card)}${ui.navigation(view)}${content}`,true);
      bindNavigation();
      return;
    }
    shell(`${ui.hero(card)}${ui.navigation(view)}<div class="gateway-notice" role="status">${escape(message || 'ยอดรวมอ้างอิงทะเบียนกลาง อาจมียอดยกมาที่ไม่ได้อยู่ในรายการด้านล่าง')}</div><div class="dashboard-body"><section class="panel"><div class="panel-head"><div><h2>รายการความดีของฉัน</h2><p id="result-count"></p></div><button class="btn btn-secondary" id="gateway-refresh">รีเฟรชข้อมูล</button></div><div class="panel-body"><div class="gateway-controls"><label>ค้นหารายการ<input id="gateway-search" type="search" placeholder="ค้นหากิจกรรมหรือหมวด" value="${escape(query)}"></label><label>สถานะ<select id="gateway-filter"><option value="all">ทั้งหมด</option><option value="pending">รอตรวจ / ตรวจสอบยอด</option><option value="approved">อนุมัติแล้ว</option><option value="rejected">ไม่อนุมัติ</option></select></label></div><div id="gateway-records"></div><p class="login-note">แสดงไม่เกิน 150 รายการล่าสุด จำนวนในหน้านี้ใช้แทนยอดรวมทางการไม่ได้</p></div></section>${ui.kindnessSlot()}</div>`, true);
    bindNavigation();
    const select = document.getElementById('gateway-filter'); select.value = filter; select.onchange = () => {filter=select.value;records();};
    document.getElementById('gateway-search').oninput = event => {query=event.target.value;records();};
    document.getElementById('gateway-refresh').onclick = refresh;
    records();
    window.GoodDeedKindness?.mount(document.getElementById('kindness-panel'),{onStart:()=>{view='submit';dashboard();}});
  }
  function bindNavigation() {
    root.querySelectorAll('[data-view]').forEach(button => { button.onclick = () => {
      view=button.dataset.view;dashboard();
      root.querySelector('[aria-current="page"]')?.focus();
    }; });
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
