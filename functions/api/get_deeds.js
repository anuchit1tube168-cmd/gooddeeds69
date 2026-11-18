/**
 * รายการความดีของนักเรียนคนเดียว (รายละเอียดเต็ม) — เจ้าของ หรืออาจารย์ (X-Admin-Key) เท่านั้น
 * GET /api/get_deeds?studentId=XXXXXXX
 * ไม่ระบุ studentId → เหมือน /api/get_all_deeds
 */
import { CORS, json, isAdmin, validSid } from './_gateway.js';
import { fetchDeeds } from './_deed_store.js';
import { onRequestGet as getAll } from './get_all_deeds.js';

export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });

export async function onRequestGet(context) {
  const { request, env } = context;
  const q = new URL(request.url).searchParams;
  const sid = String(q.get('studentId') || q.get('student_id') || '').trim();
  if (!sid) return getAll(context);
  if (!validSid(sid)) return json({ status: 'error', code: 'BAD_STUDENT_ID' }, 400);
  const own = String(request.headers.get('X-GoodDeeds-Student-Id') || '').trim() === sid;
  if (!own && !isAdmin(request, env)) return json({ status: 'error', code: 'FORBIDDEN' }, 403);
  const deeds = await fetchDeeds(env, sid);
  if (!deeds) return json({ status: 'error', code: 'DEEDS_UNAVAILABLE' }, 503);
  return new Response(JSON.stringify(deeds), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' },
  });
}
