/**
 * ผู้ตรวจ (อาจารย์) เข้าระบบด้วย LINE
 * POST /api/staff_auth { idToken }             → ยืนยันกับ LINE แล้วออก token 12 ชม. (เฉพาะผู้ที่อนุมัติแล้ว) · ครั้งแรก = ส่งคำขอรออนุมัติ
 * GET  /api/staff_auth                          (ผู้ตรวจ) → รายชื่อผู้ตรวจทั้งหมด
 * POST /api/staff_auth { op:'set', lineUserId, status } (ผู้ตรวจ) → อนุมัติ/ระงับ
 */
import { CORS, json, callGas, staffOf, signStaffToken, STAFF_TOKEN_HOURS } from './_gateway.js';

export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });

// LIFF 2010948179-xxxx → LINE Login channel ID = 2010948179
const channelId = (env) => String(env.LINE_LOGIN_CHANNEL_ID || env.LIFF_CHANNEL_ID || '2010948179');

async function verifyIdToken(env, idToken) {
  const resp = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId(env) }),
  });
  if (!resp.ok) return null;
  const j = await resp.json().catch(() => null);
  return j && j.sub ? { uid: String(j.sub), name: String(j.name || '') } : null;
}

export async function onRequestGet({ request, env }) {
  const me = await staffOf(request, env);
  if (!me) return json({ status: 'error', code: 'FORBIDDEN' }, 403);
  const r = await callGas(env, { action: 'staff_list' });
  if (!r || r.status !== 'success') return json({ status: 'error', code: (r && r.code) || 'STAFF_UNAVAILABLE' }, 503);
  return json({ status: 'success', me, staff: r.staff });
}

export async function onRequestPost({ request, env }) {
  let body = {};
  try { body = await request.json(); } catch (_) { return json({ status: 'error', code: 'BAD_JSON' }, 400); }

  if (body.op === 'set') {
    const me = await staffOf(request, env);
    if (!me) return json({ status: 'error', code: 'FORBIDDEN' }, 403);
    if (me.by === 'line' && me.uid === body.lineUserId) return json({ status: 'error', code: 'STAFF_SELF_CHANGE', message: 'เปลี่ยนสถานะของตัวเองไม่ได้' }, 400);
    const r = await callGas(env, { action: 'staff_set', lineUserId: String(body.lineUserId || ''), status: String(body.status || ''), by: me.name });
    return json(r, r && r.status === 'success' ? 200 : 400);
  }

  const idToken = String(body.idToken || '');
  if (!idToken) return json({ status: 'error', code: 'ID_TOKEN_REQUIRED', message: 'กรุณาเข้าสู่ระบบ LINE' }, 400);
  const who = await verifyIdToken(env, idToken);
  if (!who) return json({ status: 'error', code: 'LINE_VERIFY_FAILED', message: 'ยืนยันบัญชี LINE ไม่สำเร็จ — ลองเปิดใหม่จาก LINE' }, 401);

  const got = await callGas(env, { action: 'staff_get', lineUserId: who.uid });
  if (!got || got.status !== 'success') return json({ status: 'error', code: (got && got.code) || 'STAFF_UNAVAILABLE' }, 503);
  let staff = got.staff;
  if (!staff) {
    const req = await callGas(env, { action: 'staff_request', lineUserId: who.uid, name: who.name });
    staff = req && req.staff;
  }
  if (!staff || staff.status !== 'active') {
    return json({ status: 'pending', code: staff && staff.status === 'revoked' ? 'STAFF_REVOKED' : 'STAFF_PENDING',
      message: staff && staff.status === 'revoked' ? 'บัญชีนี้ถูกระงับสิทธิ์ผู้ตรวจ' : 'ส่งคำขอเป็นผู้ตรวจแล้ว รอผู้ดูแลอนุมัติในหน้า "ทีมผู้ตรวจ"',
      name: who.name }, 403);
  }
  const token = await signStaffToken(env, { uid: who.uid, name: staff.name || who.name });
  if (!token) return json({ status: 'error', code: 'RUN_NOT_CONFIGURED' }, 503);
  return json({ status: 'success', token, name: staff.name || who.name, expiresInHours: STAFF_TOKEN_HOURS });
}
