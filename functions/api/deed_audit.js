// รายงานตรวจความดีทั้งระบบ: ลงซ้ำ · เกินเพดาน · ข้อมูลผิดรูปแบบ · กิจกรรมเดียวกันหลายคน (ใครทำที่ไหน) · ความถี่รายหมวด
// GET  /api/deed_audit?academicYear=2569           (X-Admin-Key) → JSON สำหรับหน้าอาจารย์
// POST /api/deed_audit {notify:true}                (X-Admin-Key หรือ gatewayKey จากทริกเกอร์รายสัปดาห์ใน Apps Script) → ส่งสรุปเข้า Telegram
import { CORS, json, staffOf, safeEqual, callGas } from './_gateway.js';
import { auditDeeds, photoDuplicates, similarPhotos, RULES } from './_deed_rules.js';
import { academicYearBE } from './_year.js';
import { fetchDeeds } from './_deed_store.js';

export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });

async function build(env, year) {
  const [deeds, ph] = await Promise.all([
    fetchDeeds(env, '', 20000),
    callGas(env, { action: 'deedphoto_hashes' }).catch(() => null),
  ]);
  if (!deeds) return null;
  const report = auditDeeds(deeds, { academicYear: year });
  const photos = ph && ph.status === 'success' && Array.isArray(ph.photos) ? ph.photos : null;
  report.duplicatePhotos = photos ? photoDuplicates(photos.filter(p => p.hash), deeds) : [];
  report.similarPhotos = photos ? similarPhotos(photos, deeds) : [];
  report.photoCheck = photos ? { checked: photos.length, pending: ph.pending || 0, withDhash: photos.filter(p => p.dhash).length, needDhash: Array.isArray(ph.needDhash) ? ph.needDhash : [] } : { unavailable: true };
  report.totals.duplicatePhotos = report.duplicatePhotos.length;
  report.totals.similarPhotos = report.similarPhotos.length;
  return report;
}

export async function onRequestGet({ request, env }) {
  if (!(await staffOf(request, env))) return json({ status: 'error', code: 'FORBIDDEN' }, 403);
  const year = Number(new URL(request.url).searchParams.get('academicYear')) || academicYearBE();
  const report = await build(env, year);
  if (!report) return json({ status: 'error', code: 'DEEDS_UNAVAILABLE' }, 503);
  return json({ status: 'success', report });
}

export async function onRequestPost({ request, env }) {
  let body = {};
  try { body = await request.json(); } catch (_) {}
  const viaGateway = !!env.RUN_GATEWAY_KEY && safeEqual(body.gatewayKey, env.RUN_GATEWAY_KEY);
  if (!viaGateway && !(await staffOf(request, env))) return json({ status: 'error', code: 'FORBIDDEN' }, 403);
  const year = Number(body.academicYear) || academicYearBE();
  const report = await build(env, year);
  if (!report) return json({ status: 'error', code: 'DEEDS_UNAVAILABLE' }, 503);
  let telegramSent = false;
  if (body.notify) telegramSent = await sendTelegram(env, report);
  let studentsNotified = null;
  if (body.notifyStudents) {
    const items = studentNotices(report);
    const r = items.length ? await callGas(env, { action: 'deednotify_send', items }) : { status: 'success', sent: 0, total: 0 };
    studentsNotified = r && r.status === 'success' ? { sent: r.sent, total: r.total } : { error: (r && r.code) || 'FAILED' };
  }
  return json({ status: 'success', telegramSent, studentsNotified, totals: report.totals });
}

const catName = (id) => (RULES[id] || {}).name || `หมวด ${id}`;

// ข้อความถึง นพอ. ที่รายงานพบปัญหา (คนละ 1 ข้อความ รวมทุกเรื่อง) — สูงสุด 40 คนต่อรอบ กันโควตา LINE
export function studentNotices(report) {
  const by = new Map();
  const add = (sid, line) => { if (!/^\d{7}$/.test(sid)) return; if (!by.has(sid)) by.set(sid, []); by.get(sid).push(line); };
  report.duplicates.forEach(d => add(d.studentId, `• ลงซ้ำ: หมวด "${catName(d.categoryId)}" วันที่ ${d.date} มี ${d.count} รายการ`));
  report.overCap.forEach(o => add(o.studentId, `• เกินเพดาน: หมวด "${catName(o.categoryId)}" ${o.scope} ${o.count != null ? o.count + '/' + o.limit + ' ครั้ง' : o.hours + '/' + o.limit + ' ชม.'}`));
  (report.duplicatePhotos || []).forEach(p => p.items.forEach(i => add(i.studentId, `• รูปหลักฐานซ้ำกับรายการอื่น${p.crossStudent ? ' (ของผู้อื่น)' : ''}: วันที่ ${i.date || '-'}`)));
  report.invalid.forEach(i => add(i.studentId, `• ข้อมูลไม่ถูกต้อง: วันที่ ${i.date || '-'} (${i.issues.join(', ')})`));
  return [...by.entries()].slice(0, 40).map(([studentId, lines]) => ({
    studentId,
    title: '🛡️ ระบบตรวจพบรายการความดีที่ต้องแก้ไข',
    lines: [...lines.slice(0, 5), lines.length > 5 ? `• …และอีก ${lines.length - 5} เรื่อง` : '', 'กรุณาแจ้งอาจารย์ผู้ตรวจเพื่อลบ/แก้รายการ — ชั่วโมงส่วนที่ซ้ำหรือเกินจะไม่ถูกนับ'].filter(Boolean),
    key: 'audit_' + report.generatedAt.slice(0, 10),
  }));
}
const esc = (s) => String(s == null ? '' : s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

export function telegramText(report, base = 'https://rtafnc-gooddeeds.pages.dev') {
  const t = report.totals;
  const lines = [
    `🛡️ <b>รายงานตรวจความดีประจำสัปดาห์</b> (ปีการศึกษา ${report.academicYear})`,
    `━━━━━━━━━━━━━━━━━━━━━━━`,
    `📄 รายการทั้งหมด ${t.deeds} · นักเรียน ${t.students} คน`,
    `${t.duplicates ? '🔴' : '🟢'} ลงซ้ำ (หมวด+วันเดียวกัน): <b>${t.duplicates}</b>`,
    `${t.overCap ? '🔴' : '🟢'} เกินเพดานภาค/ปี: <b>${t.overCap}</b>`,
    `${t.invalid ? '🟠' : '🟢'} ข้อมูลไม่ถูกต้อง: <b>${t.invalid}</b>`,
    `${t.suspicious ? '🟠' : '🟢'} กิจกรรมข้อความเหมือนกันหลายคน (น่าตรวจ): <b>${t.suspicious}</b> จาก ${t.sharedActivities} กลุ่ม`,
    `${t.duplicatePhotos ? '🔴' : '🟢'} รูปหลักฐานซ้ำ (ไฟล์เดียวกันหลายรายการ): <b>${t.duplicatePhotos || 0}</b>`,
    `${t.similarPhotos ? '🟠' : '🟢'} รูปคล้ายกันมาก (อาจครอป/ถ่ายซ้ำ): <b>${t.similarPhotos || 0}</b>`,
  ];
  const top = (arr, n, f) => arr.slice(0, n).map(f).concat(arr.length > n ? [`  …และอีก ${arr.length - n} รายการ`] : []);
  if (report.duplicates.length) lines.push('', '<b>ลงซ้ำ</b>', ...top(report.duplicates, 8, d => `• ${d.studentId} · ${esc(catName(d.categoryId))} · ${d.date} (${d.count} รายการ)`));
  if (report.overCap.length) lines.push('', '<b>เกินเพดาน</b>', ...top(report.overCap, 8, o => `• ${o.studentId} · ${esc(catName(o.categoryId))} · ${o.scope}: ${o.count != null ? o.count + '/' + o.limit + ' ครั้ง' : o.hours + '/' + o.limit + ' ชม.'}`));
  if (report.invalid.length) lines.push('', '<b>ข้อมูลไม่ถูกต้อง</b>', ...top(report.invalid, 6, i => `• ${i.studentId || '-'} · ${i.date || 'ไม่มีวันที่'}: ${esc(i.issues.join(', '))}`));
  const sus = report.sharedActivities.filter(s => s.suspicious);
  if ((report.duplicatePhotos || []).length) lines.push('', '<b>รูปหลักฐานซ้ำ</b>', ...top(report.duplicatePhotos, 5, p => `• ${p.count} รายการ · ${p.crossStudent ? 'ต่างคนกัน ' + p.students.join(', ') : 'คนเดียว ' + p.students[0]}`));
  if (sus.length) lines.push('', '<b>ข้อความเหมือนกันหลายคน</b>', ...top(sus, 5, s => `• ${s.date} · ${esc(catName(s.categoryId))} · ${s.count} คน: "${esc(s.description.slice(0, 50))}"${s.hoursMismatch ? ' (ชั่วโมงไม่เท่ากัน)' : ''}`));
  lines.push('', `📊 ดูรายละเอียด: ${base}/teacher-dashboard.html#audit`);
  return lines.join('\n');
}

async function sendTelegram(env, report) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return false;
  try {
    const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: telegramText(report).slice(0, 4000), parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    return r.ok;
  } catch (_) { return false; }
}
