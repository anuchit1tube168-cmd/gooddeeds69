/**
 * Apps Script ฝากส่ง LINE ถึงนักเรียนผ่าน Cloudflare (กรณี Script Properties ไม่มีรหัส LINE)
 * POST { gatewayKey, to: 'U…', text } — ต้องมี RUN_GATEWAY_KEY ตรงกัน (มีเฉพาะ Apps Script ของระบบ)
 */
import { CORS, json, safeEqual } from './_gateway.js';
import { linePush } from './_line.js';

export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });

export async function onRequestPost({ request, env }) {
  let b = {};
  try { b = await request.json(); } catch (_) { return json({ status: 'error', code: 'BAD_JSON' }, 400); }
  if (!env.RUN_GATEWAY_KEY || !safeEqual(b.gatewayKey, env.RUN_GATEWAY_KEY)) return json({ status: 'error', code: 'FORBIDDEN' }, 403);
  const to = String(b.to || '');
  const text = String(b.text || '').trim();
  if (!/^U[0-9a-f]{32}$/.test(to) || !text) return json({ status: 'error', code: 'BAD_MESSAGE' }, 400);
  const r = await linePush(env, to, text);
  return json(r.ok ? { status: 'success' } : { status: 'error', code: r.code }, r.ok ? 200 : 502);
}
