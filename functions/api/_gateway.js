// ตัวช่วยร่วมของ API ที่ต้องผ่าน gatewayKey ไป Apps Script (ไฟล์ขึ้นต้น _ จึงไม่เป็น route)
export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key, X-GoodDeeds-Role, X-GoodDeeds-Student-Id, X-GoodDeeds-Username',
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
