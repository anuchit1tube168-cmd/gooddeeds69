// รายงานตรวจความดีทั้งระบบ: ลงซ้ำ · เกินเพดาน · ข้อมูลผิดรูปแบบ · กิจกรรมเดียวกันหลายคน (ใครทำที่ไหน) · ความถี่รายหมวด
// GET  /api/deed_audit?academicYear=2569           (X-Admin-Key) → JSON สำหรับหน้าอาจารย์
// POST /api/deed_audit {notify:true}                (X-Admin-Key หรือ gatewayKey จากทริกเกอร์รายสัปดาห์ใน Apps Script) → ส่งสรุปเข้า Telegram
import { CORS, json, isAdmin, safeEqual } from './_gateway.js';
import { auditDeeds, RULES } from './_deed_rules.js';
import { academicYearBE } from './_year.js';
import { fetchDeeds } from './_deed_store.js';

export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });

async function build(env, year) {
  const deeds = await fetchDeeds(env, '', 20000);
  if (!deeds) return null;
  return auditDeeds(deeds, { academicYear: year });
}

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ status: 'error', code: 'FORBIDDEN' }, 403);
  const year = Number(new URL(request.url).searchParams.get('academicYear')) || academicYearBE();
  const report = await build(env, year);
  if (!report) return json({ status: 'error', code: 'DEEDS_UNAVAILABLE' }, 503);
  return json({ status: 'success', report });
}

export async function onRequestPost({ request, env }) {
  let body = {};
  try { body = await request.json(); } catch (_) {}
  const viaGateway = !!env.RUN_GATEWAY_KEY && safeEqual(body.gatewayKey, env.RUN_GATEWAY_KEY);
  if (!viaGateway && !isAdmin(request, env)) return json({ status: 'error', code: 'FORBIDDEN' }, 403);
  const year = Number(body.academicYear) || academicYearBE();
  const report = await build(env, year);
  if (!report) return json({ status: 'error', code: 'DEEDS_UNAVAILABLE' }, 503);
  let telegramSent = false;
  if (body.notify) telegramSent = await sendTelegram(env, report);
  return json({ status: 'success', telegramSent, totals: report.totals });
}

const catName = (id) => (RULES[id] || {}).name || `หมวด ${id}`;
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
  ];
  const top = (arr, n, f) => arr.slice(0, n).map(f).concat(arr.length > n ? [`  …และอีก ${arr.length - n} รายการ`] : []);
  if (report.duplicates.length) lines.push('', '<b>ลงซ้ำ</b>', ...top(report.duplicates, 8, d => `• ${d.studentId} · ${esc(catName(d.categoryId))} · ${d.date} (${d.count} รายการ)`));
  if (report.overCap.length) lines.push('', '<b>เกินเพดาน</b>', ...top(report.overCap, 8, o => `• ${o.studentId} · ${esc(catName(o.categoryId))} · ${o.scope}: ${o.count != null ? o.count + '/' + o.limit + ' ครั้ง' : o.hours + '/' + o.limit + ' ชม.'}`));
  if (report.invalid.length) lines.push('', '<b>ข้อมูลไม่ถูกต้อง</b>', ...top(report.invalid, 6, i => `• ${i.studentId || '-'} · ${i.date || 'ไม่มีวันที่'}: ${esc(i.issues.join(', '))}`));
  const sus = report.sharedActivities.filter(s => s.suspicious);
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
