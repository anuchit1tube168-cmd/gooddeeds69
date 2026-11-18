/**
 * DeedAudit.gs — ตรวจความดีรายสัปดาห์ (ลงซ้ำ / เกินเพดาน / ข้อมูลผิด / ข้อความเหมือนกันหลายคน)
 * ตัวตรวจจริงอยู่ที่ Cloudflare (/api/deed_audit) ไฟล์นี้แค่ปลุกให้ทำงานทุกเช้าวันจันทร์
 * แล้วส่งสรุปเข้า Telegram อาจารย์ + แจ้ง นพอ. ที่พบปัญหาทาง LINE/อีเมล
 *
 * ติดตั้งครั้งเดียว: เปิด Apps Script → เลือกฟังก์ชัน setupWeeklyDeedAudit → Run
 */
var DEED_AUDIT_URL_ = 'https://rtafnc-gooddeeds.pages.dev/api/deed_audit';

function weeklyDeedAudit() {
  var key = runGatewayKey_();
  if (!key) { console.warn('weeklyDeedAudit: ไม่มี RUN_GATEWAY_KEY'); return { status: 'error', code: 'RUN_NOT_CONFIGURED' }; }
  var resp = UrlFetchApp.fetch(DEED_AUDIT_URL_, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ gatewayKey: key, notify: true, notifyStudents: true }),
    muteHttpExceptions: true
  });
  var out = resp.getContentText();
  console.log('weeklyDeedAudit: HTTP ' + resp.getResponseCode() + ' ' + out.slice(0, 300));
  try { return JSON.parse(out); } catch (e) { return { status: 'error', code: 'BAD_RESPONSE' }; }
}

function setupWeeklyDeedAudit() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'weeklyDeedAudit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('weeklyDeedAudit').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(7).nearMinute(30).inTimezone('Asia/Bangkok').create();
  return weeklyDeedAudit();
}

/**
 * getDeeds/getAllDeeds ต้องมี gatewayKey (เรียกได้จาก Cloudflare ฝั่งเซิร์ฟเวอร์เท่านั้น)
 * เดิมใครรู้ URL Apps Script ก็ดึงรายการความดีทุกคน (รหัส รายละเอียด สถานที่) ได้
 * build_live_gas.py แทรกการเรียกฟังก์ชันนี้ไว้หน้า handler getDeeds ใน doGet
 */
function deedsKeyOk_(e) {
  var p = (e && e.parameter) || {};
  var expected = runGatewayKey_();
  var given = String(p.gatewayKey || p.key || '');
  if (!expected || !given || given.length !== expected.length) return false;
  var diff = 0;
  for (var i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

/**
 * แจ้งเตือนนักเรียนเรื่องโควตา/ลงซ้ำ (เรียกจาก Cloudflare ผ่าน gatewayKey เท่านั้น — ตรวจใน runTrackerHandle_)
 * data.items = [{ studentId, title, lines[], key }]  (สูงสุด 40 รายการต่อครั้ง กันโควตา LINE)
 */
function deedNotifyHandle_(data) {
  if (typeof notifyStudent_ !== 'function') return { status: 'error', code: 'NOTIFY_NOT_DEPLOYED' };
  var items = (data.items || []).slice(0, 40);
  var sent = 0;
  items.forEach(function (it) {
    if (!/^\d{7}$/.test(String(it.studentId || ''))) return;
    var r = notifyStudent_(String(it.studentId), {
      title: String(it.title || '').slice(0, 120),
      lines: (it.lines || []).map(function (l) { return String(l).slice(0, 300); }).slice(0, 8),
      link: '/student-dashboard.html#my-quota-card',
      tone: 'warn',
      key: String(it.key || '').slice(0, 120)
    });
    if (r && (r.line || r.email)) sent++;
  });
  return { status: 'success', sent: sent, total: items.length };
}
