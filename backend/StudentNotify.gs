/**
 * StudentNotify.gs — แจ้งนักเรียนรายคนทาง LINE + อีเมล (ใช้ร่วมทุกเหตุการณ์)
 *
 * ช่องทาง:
 *   LINE   push ไปที่ LINE User ID ใน Main_2569 คอลัมน์ 20 (ผูกตอนเปิด LIFF)
 *   อีเมล  ส่งด้วย MailApp ในนามบัญชีเจ้าของสคริปต์ ไปที่อีเมลใน Profiles_2569 (นักเรียนกรอกเองในหน้าโปรไฟล์)
 * ไม่มีช่องทางไหนก็ข้ามเงียบ ๆ — การแจ้งเตือนต้องไม่ทำให้งานหลัก (บันทึก/อนุมัติ) ล้ม
 *
 * โควตาอีเมล Apps Script: บัญชีฟรี ~100 ฉบับ/วัน, Workspace ~1,500 ฉบับ/วัน
 * จึงเว้นโควตาสำรองไว้ NOTIFY_MAIL_RESERVE ฉบับ และไม่ส่งอีเมลซ้ำเรื่องเดิมภายใน 1 นาที
 */
const NOTIFY_MAIL_RESERVE = 10;
const NOTIFY_SENDER_NAME = 'ระบบบันทึกความดี วพอ.พอ.';
const NOTIFY_SITE = 'https://rtafnc-gooddeeds.pages.dev';
const NOTIFY_MILESTONE_HOURS = 50;
const NOTIFY_CAT_NAMES = { 1: 'บริจาคโลหิต', 2: 'โครงการภายนอก', 3: 'ช่วยงานภายใน วพอ.', 4: 'เข้าอบรม', 5: 'ช่วยชุมชน/มูลนิธิ',
  6: 'ศาสนสถาน', 7: 'งานฟรีทั่วไป', 8: 'จงรักภักดี', 9: 'บทบาทพิเศษ', 10: 'วิ่งเพื่อสุขภาพ' };

function notifySS_() {
  return (typeof runSS_ === 'function') ? runSS_() : SpreadsheetApp.getActiveSpreadsheet();
}

// ข้อมูลติดต่อของนักเรียน 1 คน: ชื่อ, LINE User ID, อีเมล, ชม.รวมหมวด 1–9
function notifyContact_(studentId) {
  const sid = String(studentId || '').trim();
  const out = { sid: sid, name: '', lineUserId: '', email: '', deedHours: 0 };
  const ss = notifySS_();
  const main = ss.getSheetByName('Main_2569');
  if (main && main.getLastRow() >= 2) {
    const rows = main.getRange(2, 1, main.getLastRow() - 1, 20).getValues();
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][1]).trim() !== sid) continue;
      const rank = String(rows[i][2] || ''), fn = String(rows[i][3] || ''), ln = String(rows[i][4] || '');
      out.name = (fn.indexOf(rank) === 0 ? fn + ' ' + ln : rank + ' ' + fn + ' ' + ln).trim();
      out.deedHours = Number(rows[i][15]) || 0;
      const lu = String(rows[i][19] || '').trim();
      if (/^U[0-9a-f]{32}$/.test(lu)) out.lineUserId = lu;
      break;
    }
  }
  const prof = ss.getSheetByName('Profiles_2569');
  if (prof && prof.getLastRow() >= 2) {
    const rows = prof.getRange(2, 1, prof.getLastRow() - 1, 8).getValues();
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0]).trim() !== sid) continue;
      const em = String(rows[i][7] || '').replace(/^'/, '').trim();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) out.email = em;
      break;
    }
  }
  return out;
}

function notifyEscape_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/**
 * ส่งแจ้งเตือนนักเรียน 1 คน
 * msg = { title, lines: [..], link: '/history.html' (ไม่บังคับ), tone: 'ok'|'warn'|'info', key: กันส่งซ้ำ }
 * คืน { line: bool, email: bool }
 */
function notifyStudent_(studentId, msg) {
  const result = { line: false, email: false };
  try {
    const c = notifyContact_(studentId);
    if (!c.sid) return result;
    const link = NOTIFY_SITE + (msg.link || '/student-dashboard.html');
    const greeting = c.name ? 'เรียน ' + c.name : '';
    const body = [msg.title, greeting].concat(msg.lines || []).filter(Boolean).join('\n');

    // กันส่งซ้ำ (เช่น กดอนุมัติซ้ำ/เรียกซ้ำจาก retry) ภายใน 60 วินาที
    if (msg.key) {
      const cache = CacheService.getScriptCache();
      const k = 'ntf_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, c.sid + '|' + msg.key)).slice(0, 22);
      if (cache.get(k)) return result;
      cache.put(k, '1', 60);
    }

    const token = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');
    if (token && c.lineUserId && msg.skipLine !== true) {
      const r = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
        method: 'post', contentType: 'application/json', muteHttpExceptions: true,
        headers: { Authorization: 'Bearer ' + token },
        payload: JSON.stringify({ to: c.lineUserId, messages: [{ type: 'text', text: (body + '\n\n🔗 ' + link).slice(0, 4900) }] })
      });
      result.line = r.getResponseCode() === 200;
    }

    if (c.email && MailApp.getRemainingDailyQuota() > NOTIFY_MAIL_RESERVE) {
      const color = msg.tone === 'warn' ? '#a8322d' : msg.tone === 'ok' ? '#1f6b3a' : '#0e1f3d';
      const html =
        '<div style="font-family:Tahoma,\'Noto Sans Thai\',sans-serif;max-width:560px;margin:auto;border:1px solid #e3e6ec;border-radius:12px;overflow:hidden">' +
        '<div style="background:#0e1f3d;color:#d4af37;padding:14px 18px;font-weight:bold">' + notifyEscape_(NOTIFY_SENDER_NAME) + '</div>' +
        '<div style="padding:18px;color:#1d1d1f;line-height:1.7">' +
        '<div style="font-size:17px;font-weight:bold;color:' + color + '">' + notifyEscape_(msg.title) + '</div>' +
        (greeting ? '<p>' + notifyEscape_(greeting) + '</p>' : '') +
        (msg.lines || []).filter(Boolean).map(function (l) { return '<div>' + notifyEscape_(l) + '</div>'; }).join('') +
        '<p style="margin-top:18px"><a href="' + link + '" style="background:#d4af37;color:#10203a;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:bold">เปิดระบบบันทึกความดี</a></p>' +
        '</div><div style="background:#f5f6f9;color:#6e7383;font-size:12px;padding:10px 18px">อีเมลนี้ส่งอัตโนมัติ กรุณาอย่าตอบกลับ · แก้อีเมลรับแจ้งเตือนได้ที่หน้าโปรไฟล์</div></div>';
      MailApp.sendEmail({
        to: c.email,
        subject: '[ความดี วพอ.] ' + msg.title,
        body: body + '\n\n' + link,
        htmlBody: html,
        name: NOTIFY_SENDER_NAME,
        noReply: false
      });
      result.email = true;
    }
  } catch (err) {
    Logger.log('notifyStudent_ ' + (err && err.message));
  }
  return result;
}

// ชม.วิ่งที่อนุมัติแล้ว (หมวด 10) ของนักเรียน 1 คน
function notifyRunHours_(sid) {
  const sh = notifySS_().getSheetByName('Runs_2569');
  if (!sh || sh.getLastRow() < 2) return 0;
  return sh.getRange(2, 1, sh.getLastRow() - 1, 12).getValues().reduce(function (sum, r) {
    return String(r[1]).trim() === sid && String(r[9]) === 'approved' ? sum + (Number(r[11]) || 0) : sum;
  }, 0);
}

// แจ้งครั้งเดียวเมื่อชั่วโมงรวม (หมวด 1–10) ถึง 50 ชม. — จำไว้ใน Script Properties
function notifyMilestone_(studentId) {
  try {
    SpreadsheetApp.flush();
    const sid = String(studentId || '').trim();
    const props = PropertiesService.getScriptProperties();
    const flag = 'MILESTONE50_2569_' + sid;
    if (props.getProperty(flag)) return;
    const c = notifyContact_(sid);
    const total = Math.round((c.deedHours + notifyRunHours_(sid)) * 10) / 10;
    if (total < NOTIFY_MILESTONE_HOURS) return;
    props.setProperty(flag, new Date().toISOString());
    notifyStudent_(sid, {
      title: '🏆 ยินดีด้วย! ชั่วโมงความดีครบ ' + NOTIFY_MILESTONE_HOURS + ' ชม. แล้ว',
      lines: ['ชั่วโมงสะสมปีการศึกษา 2569: ' + total + ' ชม.', 'ผ่านเกณฑ์ขั้นต่ำของวิทยาลัยแล้ว ทำความดีต่อไปเพื่อเพิ่มค่าพลังและออร่าได้อีก 🌟'],
      link: '/student-dashboard.html', tone: 'ok', key: 'milestone50'
    });
  } catch (err) {
    Logger.log('notifyMilestone_ ' + (err && err.message));
  }
}

// ---------- จุดเรียกจาก Code.js (แทรกโดย scripts/build_live_gas.py) ----------

function notifyDeedSubmitted_(studentId, catId, hours, actDate) {
  notifyStudent_(studentId, {
    title: '📥 ได้รับรายการความดีแล้ว — รอตรวจ',
    lines: ['หมวด ' + catId + ' ' + (NOTIFY_CAT_NAMES[catId] || '') + ' · ' + hours + ' ชม.', 'วันที่ทำกิจกรรม: ' + actDate,
      'ระบบจะแจ้งอีกครั้งเมื่ออาจารย์ตรวจแล้ว'],
    link: '/history.html', tone: 'info'
  });
}

// LINE ของการอนุมัติความดีมีอยู่แล้วใน notifyStudentViaLine เดิม → ส่วนนี้ส่งเฉพาะอีเมล + ตรวจครบ 50 ชม.
function notifyDeedReviewedExtra_(studentId, isApprove, deed) {
  const catId = deed ? Number(deed.catId || deed.categoryId) : 0;
  const hrs = deed ? deed.hours : '';
  notifyStudent_(studentId, {
    title: isApprove ? '✅ รายการความดีได้รับการอนุมัติ' : '⚠️ รายการความดีไม่ได้รับการอนุมัติ',
    lines: [(catId ? 'หมวด ' + catId + ' ' + (NOTIFY_CAT_NAMES[catId] || '') : 'กิจกรรมความดี') + (hrs !== '' ? ' · ' + hrs + ' ชม.' : ''),
      isApprove ? 'สะสมชั่วโมงเรียบร้อยแล้ว' : 'กรุณาตรวจสอบหลักฐานแล้วส่งใหม่'],
    link: '/history.html', tone: isApprove ? 'ok' : 'warn', skipLine: true,
    // กันซ้ำเฉพาะเมื่อรู้รหัสรายการ — อนุมัติหลายรายการหมวด/ชม.เดียวกันพร้อมกันต้องได้ครบทุกฉบับ
    key: deed && deed.id ? 'deed_rev_' + deed.id + '_' + isApprove : ''
  });
  if (isApprove) notifyMilestone_(studentId);
}

/**
 * ตั้งค่าอีเมลครั้งเดียว (เจ้าของสคริปต์กด ▶ Run ใน Apps Script editor):
 * 1) Project Settings → ติ๊ก "Show appsscript.json" → เพิ่ม "https://www.googleapis.com/auth/script.send_mail" ใน oauthScopes
 * 2) เลือกฟังก์ชันนี้ → Run → อนุญาตสิทธิ์ส่งอีเมล → จะได้อีเมลทดสอบเข้ากล่องเจ้าของ
 * ก่อนทำขั้นนี้ ระบบยังแจ้ง LINE ได้ตามปกติ (อีเมลถูกข้ามเงียบ ๆ ไม่ทำให้ระบบล้ม)
 */
function setupEmailNotify() {
  const me = Session.getEffectiveUser().getEmail();
  MailApp.sendEmail({ to: me, subject: '[ความดี วพอ.] ทดสอบการส่งอีเมลแจ้งเตือน',
    body: 'ระบบส่งอีเมลแจ้งเตือนนักเรียนพร้อมใช้งาน\nโควตาคงเหลือวันนี้: ' + MailApp.getRemainingDailyQuota() + ' ฉบับ', name: NOTIFY_SENDER_NAME });
  Logger.log('ส่งอีเมลทดสอบไปที่ ' + me + ' แล้ว · โควตาคงเหลือ ' + MailApp.getRemainingDailyQuota());
}
