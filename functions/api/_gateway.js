// ตัวช่วยร่วมของ API ที่ต้องผ่าน gatewayKey ไป Apps Script (ไฟล์ขึ้นต้น _ จึงไม่เป็น route)
export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key, X-Staff-Token, X-GoodDeeds-Role, X-GoodDeeds-Student-Id, X-GoodDeeds-Username',
};

export const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

// เทียบแบบเวลาคงที่ กันการเดารหัสจากเวลาตอบกลับ
export function safeEqual(a, b) {
  a = String(a || ''); b = String(b || '');
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const isAdmin = (request, env) => !!env.RUN_ADMIN_KEY && safeEqual(request.headers.get('X-Admin-Key'), env.RUN_ADMIN_KEY);

// ---------- ผู้ตรวจที่เข้าระบบด้วย LINE ----------
// token = base64url(JSON {uid,name,exp}) + '.' + HMAC-SHA256 — ลงนามด้วยกุญแจที่ได้จาก RUN_ADMIN_KEY (ไม่ต้องตั้ง secret เพิ่ม)
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64uText = (str) => b64u(new TextEncoder().encode(str));
const fromB64u = (s) => new TextDecoder().decode(Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)));
export const STAFF_TOKEN_HOURS = 12;

async function staffKey(env) {
  const base = env.STAFF_TOKEN_SECRET || (env.RUN_ADMIN_KEY ? 'staff-token:' + env.RUN_ADMIN_KEY : '');
  if (!base) return null;
  return crypto.subtle.importKey('raw', new TextEncoder().encode(base), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

export async function signStaffToken(env, { uid, name }, now = Date.now()) {
  const key = await staffKey(env);
  if (!key) return null;
  const body = b64uText(JSON.stringify({ uid, name, exp: now + STAFF_TOKEN_HOURS * 3600 * 1000 }));
  const sig = b64u(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
  return body + '.' + sig;
}

export async function verifyStaffToken(env, token, now = Date.now()) {
  try {
    const [body, sig] = String(token || '').split('.');
    if (!body || !sig) return null;
    const key = await staffKey(env);
    if (!key) return null;
    const expect = b64u(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
    if (!safeEqual(sig, expect)) return null;
    const data = JSON.parse(fromB64u(body));
    if (!data || !data.uid || !(data.exp > now)) return null;
    return { uid: String(data.uid), name: String(data.name || 'ผู้ตรวจ'), exp: data.exp };
  } catch (_) { return null; }
}

// ผู้ตรวจ = มีรหัสผู้ตรวจ (X-Admin-Key) หรือ token จากการเข้าระบบด้วย LINE (X-Staff-Token) — คืน null ถ้าไม่ใช่
export async function staffOf(request, env) {
  if (isAdmin(request, env)) return { by: 'key', name: 'ผู้ถือรหัสผู้ตรวจ' };
  const t = request.headers.get('X-Staff-Token');
  if (!t) return null;
  const v = await verifyStaffToken(env, t);
  return v ? { by: 'line', uid: v.uid, name: v.name } : null;
}

export const validSid = (s) => /^\d{7}$/.test(String(s || '').trim());

export async function callGas(env, payload) {
  if (!env.GAS_URL || !env.RUN_GATEWAY_KEY) return { status: 'error', code: 'RUN_NOT_CONFIGURED' };
  try {
    const resp = await fetch(env.GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...payload, gatewayKey: env.RUN_GATEWAY_KEY }),
      redirect: 'follow',
    });
    const text = await resp.text();
    try { return JSON.parse(text); } catch { return { status: 'error', code: 'GAS_BAD_RESPONSE', httpStatus: resp.status }; }
  } catch (e) {
    return { status: 'error', code: 'GAS_UNREACHABLE' };
  }
}

export const statusFor = (r) => (r && r.status === 'success' ? 200
  : r && /DENIED|NOT_CONFIGURED|NOT_DEPLOYED|UNREACHABLE|BAD_RESPONSE/.test(r.code || '') ? 503 : 400);
