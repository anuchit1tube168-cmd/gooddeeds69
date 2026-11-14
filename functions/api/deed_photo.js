/**
 * /api/deed_photo — รูปหลักฐานกิจกรรมความดี (เก็บใน Google Drive แบบ private ผ่าน Apps Script)
 * GET  ?deedId=&studentId=          ส่งไฟล์รูป (ใช้ใน <img> ของใบบันทึกความดี/หน้าประวัติ/หน้าอาจารย์)
 * POST {deedId, studentId, image}   อัปโหลดรูปของรายการตัวเอง (ย้ายรูปเก่าที่ค้างในเครื่องขึ้นเซิร์ฟเวอร์)
 */
import { CORS, json, isAdmin, validSid, callGas, statusFor } from './_gateway.js';

const validDeedId = (v) => /^[A-Za-z0-9_\-]{6,80}$/.test(String(v || ''));
const MAX_IMAGE_CHARS = 3_400_000; // ~2.5 MB หลังถอด base64

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const deedId = u.searchParams.get('deedId') || '';
  const studentId = String(u.searchParams.get('studentId') || '').trim();
  if (!validDeedId(deedId) || !validSid(studentId)) return json({ status: 'error', code: 'PHOTO_BAD_ID' }, 400);
  const r = await callGas(env, { action: 'deedphoto_get', deedId, studentId });
  if (r.status !== 'success' || !r.data) return json(r, r.code === 'PHOTO_NOT_FOUND' ? 404 : statusFor(r));
  const bin = Uint8Array.from(atob(r.data), (c) => c.charCodeAt(0));
  return new Response(bin, {
    headers: {
      ...CORS,
      'Content-Type': /^image\/(jpeg|png|webp)$/.test(r.mime || '') ? r.mime : 'image/jpeg',
      // รูปไม่เปลี่ยนหลังส่ง — แคชไว้ในเครื่องผู้ดู ลดการเรียก Apps Script
      'Cache-Control': 'private, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function onRequestPost({ request, env }) {
  const raw = await request.text();
  if (raw.length > MAX_IMAGE_CHARS + 500) return json({ status: 'error', code: 'PHOTO_TOO_LARGE' }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return json({ status: 'error', code: 'BAD_JSON' }, 400); }
  const studentId = String(body.studentId || '').trim();
  const deedId = String(body.deedId || '');
  if (!validDeedId(deedId) || !validSid(studentId)) return json({ status: 'error', code: 'PHOTO_BAD_ID' }, 400);
  const self = String(request.headers.get('X-GoodDeeds-Student-Id') || '').trim() === studentId;
  if (!self && !isAdmin(request, env)) return json({ status: 'error', code: 'PHOTO_FORBIDDEN' }, 403);
  const r = await callGas(env, { action: 'deedphoto_put', deedId, studentId, image: String(body.image || '') });
  return json(r, statusFor(r));
}
