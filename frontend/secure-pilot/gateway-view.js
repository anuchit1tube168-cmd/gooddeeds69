/* Uses the existing Cloudflare session and signed self-read contract. */
window.startGoodDeedGatewayView = function (options) {
  'use strict';
  const {root, config} = options;
  const ui = window.GoodDeedUI;
  let view = 'overview', selected = '', categoryFilter = '';
  const client = window.createGoodDeedGatewayClient({origin:config.GATEWAY_ORIGIN, timeoutMs:config.REQUEST_TIMEOUT_MS});
  let snapshot = null, session = null, busy = false, loggingOut = false, staleMessage = '', filter = 'all', query = '', revision = 0;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const status = ui.statuses;
  const categories = ['','บริจาคโลหิต / เกล็ดเลือด / พลาสมา','โครงการภายนอกตามคำสั่ง','ช่วยงานภายในวิทยาลัย','การอบรมของวิทยาลัย','ช่วยงานหน่วยงาน / ชุมชน','ทำนุบำรุงศาสนสถาน','งานช่วยเหลือโดยไม่รับค่าตอบแทน','กิจกรรมจงรักภักดี','บทบาทพิเศษ'];
  const date = value => { const d = new Date(value); return Number.isNaN(d.getTime()) ? 'ไม่ระบุวันที่' : new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeZone:'Asia/Bangkok'}).format(d); };
  const errors = {GATEWAY_NOT_CONFIGURED:'การยืนยันบัญชียังไม่พร้อม กรุณาติดต่อผู้ดูแล', GATEWAY_CONFIG_INVALID:'การเชื่อมต่อยังไม่พร้อม กรุณาติดต่อผู้ดูแล', SESSION_REQUIRED:'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง', ACCESS_DENIED:'บัญชีนี้ยังไม่มีสิทธิ์ดูข้อมูลส่วนนี้ กรุณาติดต่อผู้ดูแล', LINK_REQUIRED:'บัญชี LINE ยังไม่ได้เชื่อมกับบัญชีนักเรียน กรุณาติดต่อผู้ดูแล', RATE_LIMITED:'มีการเรียกใช้งานถี่เกินไป กรุณารอสักครู่ก่อนลองใหม่', REQUEST_TIMEOUT:'หมดเวลารอ ข้อมูลยังไม่ได้รับการยืนยัน กรุณาลองใหม่', LINE_TOKEN_REQUIRED:'กรุณาเข้าสู่ระบบผ่าน LINE อีกครั้ง', RESPONSE_INVALID:'ข้อมูลจากระบบยังไม่ครบถ้วน กรุณาติดต่อผู้ดูแล'};
  const errorText = e => errors[e.code] || 'เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
  function shell(content, signedIn = false) {
    window.GoodDeedKindness?.unmount();
    window.GoodDeedMission?.unmount();
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
    const items=window.GoodDeedMissionData.filterRecords(snapshot.items,{status:filter,category:categoryFilter,query,categoryNames:categories});
    document.getElementById('gateway-records').innerHTML=items.length?items.map(item=>`<article class="gateway-record mission-card"><div><p class="record-category">หมวด ${item.categoryId} · ${escape(categories[item.categoryId])}</p><h3><button type="button" class="record-link" data-record="${escape(item.deedId)}">${escape(item.description||'ดูรายละเอียดภารกิจ')}</button></h3><p class="record-meta">${escape(date(item.activityDate))} · ${item.hasEvidence?'มีหลักฐานแนบ':'ยังไม่แสดงข้อมูลหลักฐาน'}</p><p class="record-meta">ผู้ตรวจ: ${escape(item.reviewerName||'ยังไม่มีข้อมูล')} · อัปเดต: ${item.updatedAt||item.reviewedAt||item.submittedAt?escape(date(item.updatedAt||item.reviewedAt||item.submittedAt)):'ยังไม่มีข้อมูล'}</p><small class="mission-id">Mission ID · ${escape(item.deedId)}</small></div><div class="record-result"><strong>${item.hours.toLocaleString('th-TH')} <small>ชม.</small></strong><span class="gateway-status status-${escape(item.status)}">${escape(status[item.status])}</span></div></article>`).join(''):'<div class="gateway-empty" role="status"><h3>ไม่พบรายการในมุมมองนี้</h3><p>ลองเปลี่ยนตัวกรองหรือคำค้น ข้อมูลนี้ครอบคลุมรายการที่โหลดล่าสุด</p></div>';
    document.getElementById('result-count').textContent=`แสดง ${items.length} จาก ${snapshot.items.length} รายการที่โหลด`;
    root.querySelectorAll('[data-record]').forEach(button=>{button.onclick=()=>{selected=button.dataset.record;view='detail';dashboard();focusContent();};});
  }
  function detail() {
    const item=snapshot.items.find(r=>r.deedId===selected);
    if(!item)return '<p class="gateway-notice" role="status">ไม่พบภารกิจในรายการที่โหลดล่าสุด</p>';
    const events=window.GoodDeedMissionData.timeline(item);
    return `<section class="panel"><div class="panel-head"><div><p class="eyebrow">MISSION LOG</p><h2>${escape(categories[item.categoryId])}</h2><p>${escape(item.deedId)}</p></div><button class="btn btn-secondary" data-view="records">กลับไปรายการ</button></div><div class="panel-body"><span class="gateway-status status-${escape(item.status)}">${escape(status[item.status])}</span><h3>${item.hours} ชม. · ${escape(date(item.activityDate))}</h3><p class="detail-description">${escape(item.description)}</p>${events.length?ui.timeline(events):'<p class="muted">ยังไม่มีข้อมูลเวลาในประวัติ</p>'}${item.note||item.reviewNote?`<div class="gateway-notice"><strong>ข้อเสนอแนะจากผู้ตรวจ</strong><p>${escape(item.note||item.reviewNote)}</p></div>`:''}<p class="gateway-notice notice-info">การเปิดหลักฐานและแก้ไขรายการจะเปิดใช้หลังผ่านการทดสอบสิทธิ์กับระบบจริง กรุณาติดต่ออาจารย์ผู้ดูแลหากต้องการแก้ไข</p></div></section>`;
  }
  function dashboard(message = staleMessage) {
    const {card}=snapshot,metrics=window.GoodDeedMissionData.summarize(card,snapshot.items,{complete:false});
    let content;
    if(['overview','radar','analytics','profile'].includes(view))content=ui.missionSlot()+(view==='overview'?ui.kindnessSlot():'');
    else if(view==='guide')content=ui.guide();
    else if(view==='submit')content='<section class="panel"><div class="panel-body gateway-empty"><h2>กำลังเตรียมเปิดรับบันทึกความดี</h2><p>ขณะนี้พื้นที่ทดลองเปิดให้ตรวจข้อมูลของตนเอง สามารถทดลองขั้นตอนส่งงานด้วยข้อมูลตัวอย่างได้</p><a class="btn btn-primary" href="demo.html">ทดลองขั้นตอนส่งความดี</a></div></section>';
    else if(view==='detail')content=detail();
    else content=`<section class="panel"><div class="panel-head"><div><p class="eyebrow">${view==='history'?'MISSION LOG':'MY MISSIONS'}</p><h2>${view==='history'?'ประวัติภารกิจ':'ภารกิจของฉัน'}</h2><p id="result-count"></p></div></div><div class="panel-body"><div class="gateway-controls"><label>ค้นหารายการ<input id="gateway-search" type="search" placeholder="ค้นหากิจกรรมหรือหมวด" value="${escape(query)}"></label><label>สถานะ<select id="gateway-filter"><option value="all">ทั้งหมด</option><option value="pending">รอตรวจ / ตรวจสอบยอด</option><option value="approved">อนุมัติแล้ว</option><option value="rejected">ให้แก้ไข</option></select></label><label>หมวดกิจกรรม<select id="gateway-category"><option value="">ทุกหมวด</option>${categories.slice(1).map((name,index)=>`<option value="${index+1}">${index+1}. ${escape(name)}</option>`).join('')}</select></label></div><div id="gateway-records"></div><p class="login-note">แสดงไม่เกิน 150 รายการล่าสุด จำนวนในหน้านี้ใช้แทนยอดรวมทางการไม่ได้</p></div></section>`;
    shell(ui.workspace(`${ui.hero(card,{metrics})}<div class="data-refresh"><p class="gateway-notice" role="status">${escape(message||'ยอดทางการอ้างอิงทะเบียนกลาง สถิติรายเดือนและ Radar ใช้เฉพาะรายการที่โหลดล่าสุด')}</p><button class="btn btn-secondary" id="gateway-refresh">รีเฟรชข้อมูล</button></div><div id="workspace-view" class="mobile-panel" tabindex="-1">${content}</div>`,{active:view}),true);
    bindNavigation();
    document.getElementById('gateway-refresh').onclick=refresh;
    if(['records','history'].includes(view)){
      const select=document.getElementById('gateway-filter');select.value=filter;select.onchange=()=>{filter=select.value;records();};
      const category=document.getElementById('gateway-category');category.value=categoryFilter;category.onchange=()=>{categoryFilter=category.value;records();};
      document.getElementById('gateway-search').oninput=event=>{query=event.target.value;records();};records();
    }
    window.GoodDeedMission?.mount(document.getElementById('mission-react'),{data:metrics,card,items:snapshot.items,view,onView:navigate,onCategory:id=>{categoryFilter=String(id);filter='all';query='';navigate('records');},onOpen:id=>{selected=id;navigate('detail');}});
    window.GoodDeedKindness?.mount(document.getElementById('kindness-panel'),{onStart:()=>navigate('submit')});
  }
  function focusContent(){document.getElementById('workspace-view')?.focus?.({preventScroll:true});}
  function navigate(next){if(!snapshot||busy||loggingOut)return;view=next;dashboard();focusContent();}
  function bindNavigation(){root.querySelectorAll('[data-view]').forEach(button=>{button.onclick=()=>navigate(button.dataset.view);});}
  function lock(value) { busy=value; root.setAttribute('aria-busy', String(value)); root.querySelectorAll('button').forEach(button=>{button.disabled=value && (button.id!=='gateway-logout'||loggingOut);}); }
  async function refresh() {
    if (busy) return;
    const current = ++revision; lock(true);
    try { const data = await client.readSelf(); if(current===revision) { snapshot=data; staleMessage=''; dashboard(); } }
    catch (error) {
      if (current!==revision) return;
      // Do not render another student's or expired-session data after denial.
      if (['SESSION_REQUIRED','ACCESS_DENIED','LINK_REQUIRED'].includes(error.code)) { snapshot=null;session=null;staleMessage='';entry(errorText(error)); }
      else if (snapshot) { staleMessage='ข้อมูลอาจยังไม่เป็นปัจจุบัน · '+errorText(error);dashboard(); }
      else entry(errorText(error));
    } finally { if(current===revision) lock(false); }
  }
  async function login() {
    if (busy) return;
    const current=++revision;
    lock(true);
    try {
      if (!config.GATEWAY_ORIGIN) throw {code:'GATEWAY_NOT_CONFIGURED'};
      if (!window.liff) throw {code:'LINE_TOKEN_REQUIRED'};
      await window.liff.init({liffId:config.LIFF_ID});
      if(current!==revision)return;
      if (!window.liff.isLoggedIn()) { window.liff.login(); return; }
      const verified = await client.verifyLine(window.liff.getIDToken());
      if(current!==revision)return;
      session=verified;
      if (!session.studentLinked) { entry(errors.LINK_REQUIRED, true); return; }
      lock(false); await refresh();
    } catch (error) { if(current===revision){snapshot=null;session=null;entry(errorText(error));} }
    finally { if(current===revision)lock(false); }
  }
  async function logout() {
    if (loggingOut) return;
    const current=++revision;loggingOut=true;snapshot=null;session=null;staleMessage='';entry('กำลังออกจากระบบ…');lock(true);
    // logout() cancels reads itself and preserves the current CSRF token for
    // revocation. A preliminary clear() would discard that token unnecessarily.
    try { await client.logout(); if(window.liff?.isLoggedIn()) window.liff.logout();entry('ออกจากระบบแล้ว'); }
    catch (_) { entry('ซ่อนข้อมูลบนหน้านี้แล้ว แต่ยังยืนยันการออกจากระบบกับเซิร์ฟเวอร์ไม่ได้ กรุณาลองอีกครั้ง', false, true); }
    finally { if(current===revision){loggingOut=false;lock(false);} }
  }
  async function start() {
    const current=++revision;
    entry(); lock(true);
    try {
      const restored = await client.restore();
      if(current!==revision)return;
      session=restored;
      if (!session.studentLinked) { entry(errors.LINK_REQUIRED, true); return; }
      lock(false); await refresh();
    } catch (error) { if(current===revision)entry(error.code==='SESSION_REQUIRED'?'':errorText(error)); }
    finally { if(current===revision)lock(false); }
  }
  return start();
};
