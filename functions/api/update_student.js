/**
 * /api/update_student — ผู้ตรวจแก้ ยศ/ชื่อ/นามสกุล/รุ่น/อีเมล ของนักเรียน (เขียน Main_2569)
 * ต้องมี X-Admin-Key = RUN_ADMIN_KEY (รหัสเดียวกับหน้า run-admin) — ไม่มี/ผิด = ปฏิเสธ
 * รหัสผ่านไม่ถูกส่งไปเก็บในชีต
 */
import { CORS, json, isAdmin, validSid, callGas, statusFor } from './_gateway.js';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost({ request, env }) {
  if (!env.RUN_ADMIN_KEY) return json({ status: 'error', code: 'RUN_NOT_CONFIGURED', message: 'ยังไม่ได้ตั้งรหัสผู้ตรวจใน Cloudflare' }, 503);
  if (!isAdmin(request, env)) return json({ status: 'error', code: 'ADMIN_KEY_REQUIRED', message: 'รหัสผู้ตรวจไม่ถูกต้อง' }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ status: 'error', code: 'BAD_JSON' }, 400); }
  const sid = String(body.studentId || '').trim();
  if (!validSid(sid)) return json({ status: 'error', code: 'PROFILE_BAD_ID', message: 'รหัสนักเรียนไม่ถูกต้อง' }, 400);
  const r = await callGas(env, {
    action: 'profile_admin_update',
    studentId: sid,
    rank: body.rank,
    firstName: body.firstName,
    lastName: body.lastName,
    classYear: body.classYear,
    email: body.email,
  });
  return json(r, statusFor(r));
}
