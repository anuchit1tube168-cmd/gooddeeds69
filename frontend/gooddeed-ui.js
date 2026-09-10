/* Shared presentation only. This module never establishes identity or rights. */
(function (root) {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const categories = ['', 'บริจาคโลหิต', 'โครงการภายนอกตามคำสั่ง', 'ช่วยงานภายในวิทยาลัย', 'การอบรมของวิทยาลัย', 'ช่วยเหลือชุมชน', 'ทำนุบำรุงศาสนสถาน', 'งานช่วยเหลือโดยไม่รับค่าตอบแทน', 'กิจกรรมจงรักภักดี', 'บทบาทพิเศษ'];
  const statuses = {draft:'แบบร่าง',submitted:'ส่งแล้ว',pending:'รอตรวจ',approving:'กำลังตรวจสอบยอด',approved:'อนุมัติแล้ว',rejected:'ให้แก้ไข'};
  const crest = '<img class="official-crest" src="510903.jpg" alt="ตราวิทยาลัยพยาบาลทหารอากาศ" width="52" height="64">';
  const flight = '<img class="flight-art" src="airforce-flight.png" alt="ภาพประกอบเครื่องบินในท้องฟ้า" width="1774" height="887" decoding="async">';
  function shell(content, options={}) {
    return `<div class="shell flight-shell"><a class="skip-link" href="#main-content">ข้ามไปเนื้อหา</a><header class="topbar"><div class="topbar-inner"><a class="brand" href="${options.demo?'demo.html':'index.html'}">${crest}<div><h1>ระบบบันทึกความดี</h1><small>วิทยาลัยพยาบาลทหารอากาศ</small></div></a><div class="userbar"><span class="role">${options.demo?'ข้อมูลตัวอย่าง':'พื้นที่ทดลอง'}</span>${options.signedIn?'<button id="gateway-logout" class="btn btn-secondary">ออกจากระบบ</button>':'<span class="academic-year">ปีการศึกษา 2569</span>'}</div></div></header>${options.demo?'<div class="demo-banner"><b>โหมดสาธิต</b> ข้อมูลสมมติเท่านั้น · ไม่เชื่อมบัญชี ไม่ส่งข้อมูลหรือแจ้งเตือนจริง</div>':''}<main id="main-content" class="page" tabindex="-1">${content}</main><footer class="app-footer"><span>วิทยาลัยพยาบาลทหารอากาศ · กรมแพทย์ทหารอากาศ</span><span>ความดี วินัย และหัวใจแห่งการดูแล</span></footer></div>`;
  }
  function welcome(message, pending, logoutFailed) {
    return `<section class="welcome-layout"><div class="welcome-visual">${flight}<div class="welcome-copy"><p class="eyebrow">RTAFNC · GOOD DEEDS</p><h2>ความดีเล็ก ๆ<br>พาเราไปได้ไกล</h2><p>บันทึกความตั้งใจ ติดตามการเติบโต<br>บนเส้นทางนักเรียนพยาบาลทหารอากาศ</p></div><div class="welcome-caption"><span>คุณค่าในทุกการลงมือทำ</span><span>เพื่อผู้อื่น · เพื่อส่วนรวม</span></div></div><section class="gateway-welcome panel"><div class="panel-body"><p class="eyebrow">พื้นที่ส่วนตัว</p><h2>${pending?'รอเชื่อมบัญชีนักเรียน':'เริ่มต้นบันทึกความดี'}</h2><p>เข้าสู่ระบบเพื่อดูชั่วโมงตามทะเบียนกลางและผลการตรวจรายการของคุณ</p><div class="gateway-notice" role="status">${escape(message||'เข้าสู่ระบบด้วยบัญชี LINE ที่เชื่อมกับนักเรียน')}</div><button class="btn btn-line" id="gateway-login">${pending?'ตรวจสอบบัญชีอีกครั้ง':'เข้าสู่ระบบด้วย LINE'}</button>${logoutFailed?'<button class="btn btn-secondary full-width" id="retry-logout">ลองออกจากระบบอีกครั้ง</button>':''}<a class="btn btn-secondary full-width demo-link" href="demo.html">ทดลองใช้งานด้วยข้อมูลตัวอย่าง</a><p class="login-note">การส่งงานและการอนุมัติจริงอยู่ระหว่างทดสอบก่อนเปิดใช้</p></div></section></section><section class="entry-steps" aria-label="ขั้นตอนบันทึกความดี"><div><span>01</span><div><h3>บันทึกกิจกรรม</h3><p>เลือกหมวด ชั่วโมง และแนบหลักฐาน</p></div></div><div><span>02</span><div><h3>อาจารย์ตรวจรับรอง</h3><p>ตรวจหลักฐานและลงนามในแต่ละครั้ง</p></div></div><div><span>03</span><div><h3>ติดตามผลของคุณ</h3><p>ดูสถานะและชั่วโมงจากทะเบียนกลาง</p></div></div></section>`;
  }
  function hero(card, options={}) {
    const metric=options.metrics, num=value=>typeof value==='number'&&Number.isFinite(value)?value.toLocaleString('th-TH'):'—';
    const kpi=(label,value,unit,note,primary=false)=>`<div class="stat-card ${primary?'stat-total':''}"><span>${escape(label)}</span><strong>${escape(value)}<small>${escape(unit)}</small></strong><p>${escape(note)}</p></div>`;
    const summary=kpi('ชั่วโมงความดีสะสม',num(card.totalHours),'ชม.',options.demo?'ยอดยกมาและชั่วโมงรับรองในชุดสาธิต':'ยอดทางการจากทะเบียนกลาง รวมยอดยกมา',true)+
      kpi('ชั่วโมงเดือนนี้',metric?num(metric.monthHours):'—','ชม.','อนุมัติแล้ว · เฉพาะรายการที่โหลด')+
      kpi('จำนวนกิจกรรม',metric?num(metric.activityCount):'—','ภารกิจ','เฉพาะรายการที่โหลด')+
      kpi('รออนุมัติ',num(card.pendingCount),'ภารกิจ','รวมรายการที่กำลังตรวจสอบยอด')+
      kpi('อนุมัติแล้ว',num(card.approvedCount),'ภารกิจ',options.demo?'เฉพาะข้อมูลสาธิต':'จำนวนจากระบบทะเบียน')+
      kpi('เป้าหมายประจำปี',metric?.goal?metric.goal.percent+'%':'—','',metric?.goal?(options.demo?'เป้าหมายสาธิต':'ตามช่วงปีที่ยืนยัน'):'รอยืนยันเกณฑ์และช่วงปีการศึกษา');
    return `<section class="flight-hero mission-hero">${flight}<div class="flight-copy"><p class="eyebrow">AIR FORCE · NURSING · COMPASSION</p><h2>ทุกความดี คือภารกิจที่มีคุณค่า</h2><p>ร่วมดูแลผู้อื่น เติบโตด้วยวินัยและหัวใจที่อ่อนโยน</p><div class="student-identity"><span class="student-monogram" aria-label="ยังไม่มีรูปประจำตัว">${escape(Array.from(card.displayName||'น').slice(0,1).join(''))}</span><div><strong>${escape(card.displayName)}</strong><p>${escape(card.cohortLabel||'ยังไม่ระบุชั้นปี')} · รหัส ${escape(card.studentId||'ยังไม่มีข้อมูล')}</p><span class="identity-status">${options.demo?'บัญชีตัวอย่าง':'เชื่อมบัญชีนักเรียนแล้ว'}</span></div></div><span class="gateway-level">${options.demo?'ตัวอย่างระดับ':'ระดับตามทะเบียน'} ${escape(card.levelNumber)} · ${escape(card.levelLabel)}</span></div></section><section class="stat-grid mission-kpis" aria-label="สรุปชั่วโมงความดี">${summary}</section>`;
  }
  function navigation(active, review=false) {
    const nav=[['overview','ภาพรวม'],['records','ภารกิจของฉัน'],['submit','บันทึกความดี'],['radar','Radar'],['analytics','สถิติ'],['history','ประวัติ'],['profile','โปรไฟล์']];
    if(review)nav.push(['review','คิวตรวจรับรอง']);
    nav.push(['guide','คู่มือ']);
    const primary=new Set(['overview','records','submit','radar']);
    const item=([key,label],more=false)=>`<button class="nav-item ${active===key?'active':''} ${!primary.has(key)&&!more?'nav-extended':''}" data-view="${key}" ${active===key?'aria-current="page"':''}>${label}</button>`;
    return `<nav class="workspace-nav mission-nav" aria-label="เมนูความดี"><p class="nav-caption">MISSION CONTROL</p>${nav.map(row=>item(row)).join('')}<details class="mobile-more"><summary class="nav-item ${!primary.has(active)?'active':''}">เพิ่มเติม</summary><div class="more-menu">${nav.filter(([key])=>!primary.has(key)).map(row=>item(row,true)).join('')}</div></details></nav>`;
  }
  function workspace(content,options={}) {
    const active=options.active||'overview';
    return `<div class="mission-workspace">${navigation(active,options.review)}<div class="mission-content">${content}</div></div>${options.fab!==false?'<button class="btn btn-primary mission-fab" data-view="submit" aria-label="บันทึกความดีใหม่">+ บันทึกความดี</button>':''}`;
  }
  function missionSlot(){return '<div id="mission-react"><p class="gateway-notice" role="status">กำลังเตรียมภาพรวมภารกิจ…</p></div>';}
  function timeline(events) {
    return `<ol class="mission-timeline" aria-label="ลำดับการตรวจภารกิจ">${events.map(event=>`<li><strong>${escape(event.label)}</strong><small>${event.at&&Number.isFinite(new Date(event.at).getTime())?escape(new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Bangkok'}).format(new Date(event.at))):'ยังไม่มีเวลาบันทึก'}${event.actor?' · '+escape(event.actor):''}</small>${event.note?`<p>${escape(event.note)}</p>`:''}</li>`).join('')}</ol>`;
  }
  function guide() {
    return `<section class="panel"><div class="panel-head"><div><p class="eyebrow">เริ่มต้นได้ง่าย ๆ</p><h2>คู่มือการบันทึกความดี</h2></div></div><div class="panel-body guide-grid"><section><h3>ก่อนส่งรายการ</h3><ol><li>เลือกหมวดที่ตรงกับกิจกรรม</li><li>ระบุวันที่และชั่วโมงตามที่ได้รับการรับรอง</li><li>เขียนว่าได้ทำอะไร ที่ไหน และช่วยใคร</li><li>แนบหลักฐานที่อ่านได้ชัด และตรวจข้อมูลก่อนส่ง</li></ol></section><section><h3>เมื่อติดตามผล</h3><p>“รอตรวจ” คือยังไม่รับรองชั่วโมง ส่วน “กำลังตรวจสอบยอด” ต้องให้อาจารย์ตรวจสอบก่อน ไม่ควรส่งซ้ำ</p><p>หากไม่อนุมัติ ให้อ่านเหตุผลและติดต่ออาจารย์ผู้ดูแล การแก้ผลที่อนุมัติแล้วต้องดำเนินการตามขั้นตอนของวิทยาลัย</p></section><section><h3>หลักฐานและความเป็นส่วนตัว</h3><p>เลือก JPG, PNG หรือ PDF ขนาดไม่เกิน 2 MB หลีกเลี่ยงข้อมูลผู้ป่วย ข้อมูลสุขภาพ และข้อมูลบุคคลที่ไม่จำเป็น</p><p>หลักฐานและลายเซ็นในระบบจริงต้องเข้าถึงผ่านการตรวจสิทธิ์</p></section><section><h3>ทำไมยอดรวมไม่เท่ารายการที่เห็น</h3><p>ยอดรวมอาจมีชั่วโมงยกมาหรือรายการก่อนหน้า ให้ยึดทะเบียนกลาง ไม่รวมเฉพาะรายการที่โหลดมาแทนยอดทางการ</p></section></div></section>`;
  }
  function kindnessSlot(){return '<aside id="kindness-panel"><section class="kindness-card"><h2>ทุกความตั้งใจมีความหมาย</h2><p>เริ่มจากการดูแลตัวเอง เพื่อน และส่วนรวมไปด้วยกัน</p></section></aside>';}
  const api={escape,categories,statuses,crest,flight,shell,welcome,hero,navigation,workspace,missionSlot,timeline,guide,kindnessSlot};
  root.GoodDeedUI=Object.freeze(api);
  if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?this:window);
