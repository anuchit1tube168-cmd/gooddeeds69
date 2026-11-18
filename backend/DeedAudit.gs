/**
 * DeedAudit.gs — ตรวจความดีรายสัปดาห์ (ลงซ้ำ / เกินเพดาน / ข้อมูลผิด / ข้อความเหมือนกันหลายคน)
 * ตัวตรวจจริงอยู่ที่ Cloudflare (/api/deed_audit) ไฟล์นี้แค่ปลุกให้ทำงานทุกเช้าวันจันทร์ แล้วส่งสรุปเข้า Telegram อาจารย์
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
    payload: JSON.stringify({ gatewayKey: key, notify: true }),
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
