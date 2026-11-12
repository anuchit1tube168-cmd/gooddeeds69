/**
 * /api/profile — ข้อมูลส่วนตัวนักเรียน (เก็บใน Google Sheets: Profiles_2569)
 *
 * GET  /api/profile?studentId=XXXXXXX        อ่านของตัวเอง (header X-GoodDeeds-Student-Id ต้องตรง) หรือผู้ตรวจ (X-Admin-Key)
 * POST {studentId, fields:{nickname,dob,province,blood,hobby,bio,email,telegramChatId}}
 *
 * หมายเหตุความปลอดภัย: ระบบล็อกอินนักเรียนยังเป็นฝั่ง browser จึงตรวจได้แค่ header ที่ส่งมา
 * (ระดับเดียวกับ API ความดีเดิม) — ข้อมูลในหน้านี้จึงจำกัดเฉพาะข้อมูลแนะนำตัว/ติดต่อ ไม่รับรหัสผ่าน
 */
import { CORS, json, isAdmin, validSid, callGas, statusFor } from './_gateway.js';

const MAX_BODY = 8000;

function canAccess(request, env, sid) {
  if (isAdmin(request, env)) return 'admin';
  const hdr = String(request.headers.get('X-GoodDeeds-Student-Id') || '').trim();
  return hdr && hdr === sid ? 'student' : '';
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ request, env }) {
  const sid = String(new URL(request.url).searchParams.get('studentId') || '').trim();
  if (!validSid(sid)) return json({ status: 'error', code: 'PROFILE_BAD_ID' }, 400);
  if (!canAccess(request, env, sid)) return json({ status: 'error', code: 'PROFILE_FORBIDDEN' }, 403);
  const r = await callGas(env, { action: 'profile_get', studentId: sid });
  return json(r, statusFor(r));
}

export async function onRequestPost({ request, env }) {
  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ status: 'error', code: 'PROFILE_TOO_LARGE' }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return json({ status: 'error', code: 'BAD_JSON' }, 400); }
  const sid = String(body.studentId || '').trim();
  if (!validSid(sid)) return json({ status: 'error', code: 'PROFILE_BAD_ID' }, 400);
  const who = canAccess(request, env, sid);
  if (!who) return json({ status: 'error', code: 'PROFILE_FORBIDDEN' }, 403);
  if (!body.fields || typeof body.fields !== 'object') return json({ status: 'error', code: 'PROFILE_NO_FIELDS' }, 400);
  // migrate = ย้ายข้อมูลเก่าจากเครื่องขึ้นเซิร์ฟเวอร์ครั้งแรก — ไม่ต้องแจ้งเตือน "ข้อมูลถูกแก้"
  const r = await callGas(env, { action: 'profile_set', studentId: sid, fields: body.fields, by: who, silent: body.migrate === true });
  return json(r, statusFor(r));
}
