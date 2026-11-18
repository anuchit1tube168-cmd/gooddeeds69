/**
 * สถานะช่องทางแจ้งเตือน (ผู้ตรวจเท่านั้น) — บอกแค่พร้อม/ไม่พร้อม ไม่เปิดเผยรหัสลับ
 * GET /api/notify_status
 */
import { CORS, json, staffOf, callGas } from './_gateway.js';
import { lineToken } from './_line.js';

export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });

export async function onRequestGet({ request, env }) {
  if (!(await staffOf(request, env))) return json({ status: 'error', code: 'FORBIDDEN' }, 403);
  const [gas, line, tg] = await Promise.all([
    callGas(env, { action: 'deednotify_status' }).catch(() => null),
    lineToken(env),
    (async () => {
      if (!env.TELEGRAM_BOT_TOKEN) return { ok: false, code: 'NO_TOKEN' };
      try { const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`); return { ok: r.ok, chat: !!env.TELEGRAM_CHAT_ID }; }
      catch (_) { return { ok: false, code: 'UNREACHABLE' }; }
    })(),
  ]);
  // ตรวจว่า token ฝั่ง Cloudflare ใช้ได้จริง (ถาม LINE ข้อมูลบอท ไม่ส่งข้อความถึงใคร)
  let lineBot = null;
  if (line.token) {
    try { const r = await fetch('https://api.line.me/v2/bot/info', { headers: { Authorization: 'Bearer ' + line.token } }); const j = r.ok ? await r.json() : null; lineBot = j ? { ok: true, name: j.displayName || '', basicId: j.basicId || '' } : { ok: false, code: 'LINE_HTTP_' + r.status }; }
    catch (_) { lineBot = { ok: false, code: 'UNREACHABLE' }; }
  }
  const g = gas && gas.status === 'success' ? gas : null;
  return json({
    status: 'success',
    telegram: { ready: !!(tg.ok && tg.chat), bot: tg.ok, chat: !!tg.chat },
    line: {
      ready: !!((lineBot && lineBot.ok) || (g && g.lineTokenInScript)),
      cloudflare: { source: line.source, bot: lineBot },
      appsScriptToken: g ? g.lineTokenInScript : null,
      studentsWithLine: g ? g.studentsWithLine : null,
      students: g ? g.students : null,
    },
    email: { ready: g ? !!g.mail : null, quotaToday: g ? (g.mailQuota ?? null) : null, note: g && !g.mail ? g.mailError : '' },
    weeklyAudit: g ? g.weeklyAudit : null,
    appsScript: g ? 'ok' : ((gas && gas.code) || 'UNREACHABLE'),
  });
}
