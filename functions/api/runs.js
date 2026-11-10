/**
 * /api/runs — หมวด 10 วิ่งเพื่อสุขภาพ (Cloudflare Pages Function → Google Apps Script RunTracker.gs)
 *
 * GET  /api/runs?studentId=XXXXXXX         ประวัติวิ่ง + ผลสมรรถภาพของนักเรียนคนนั้น
 * GET  /api/runs?all=1        (admin)      ทุกคน — สำหรับ dashboard ผู้ตรวจ
 * POST {action:'submit', run}              นักเรียนส่งผลวิ่ง (สถานะ pending เสมอ)
 * POST {action:'review'|'fitness'|'settings'} (admin)
 *
 * Secrets (Cloudflare Pages → Settings → Variables, แบบ Encrypted):
 *   RUN_ADMIN_KEY    รหัสผู้ตรวจที่กรอกในหน้า run-admin.html
 *   RUN_GATEWAY_KEY  ต้องตรงกับ Script Property RUN_GATEWAY_KEY ใน Apps Script
 *   GAS_URL          URL Web App เดิม
 * ถ้าไม่ได้ตั้ง secret ระบบจะปฏิเสธ (fail closed) — ไม่มีค่า default ในโค้ด
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
};
const MAX_IMAGE_CHARS = 2_500_000; // ~1.8 MB หลังถอด base64

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

// เทียบแบบเวลาคงที่ กันการเดารหัสทีละตัวอักษรจากเวลาตอบกลับ
function safeEqual(a, b) {
  a = String(a || ''); b = String(b || '');
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function isAdmin(request, env) {
  return !!env.RUN_ADMIN_KEY && safeEqual(request.headers.get('X-Admin-Key'), env.RUN_ADMIN_KEY);
}

async function callGas(env, payload) {
  if (!env.GAS_URL || !env.RUN_GATEWAY_KEY) return { status: 'error', code: 'RUN_NOT_CONFIGURED' };
  const resp = await fetch(env.GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // text/plain เลี่ยง preflight ของ Apps Script
    body: JSON.stringify({ ...payload, gatewayKey: env.RUN_GATEWAY_KEY }),
    redirect: 'follow',
  });
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { status: 'error', code: 'GAS_BAD_RESPONSE', httpStatus: resp.status }; }
}

const statusFor = (r) => (r && r.status === 'success' ? 200 : r && /DENIED|NOT_CONFIGURED/.test(r.code || '') ? 503 : 400);

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const studentId = (url.searchParams.get('studentId') || '').trim();
  try {
    if (url.searchParams.get('all') === '1') {
      if (!isAdmin(request, env)) return json({ status: 'error', code: 'ADMIN_KEY_REQUIRED' }, 401);
      const r = await callGas(env, { action: 'run_list' });
      return json(r, statusFor(r));
    }
    if (!/^\d{7}$/.test(studentId)) return json({ status: 'error', code: 'invalid_student' }, 400);
    const r = await callGas(env, { action: 'run_list', studentId });
    if (r.runs) r.runs = r.runs.map(({ gps, ...rest }) => rest); // ไม่ส่งพิกัดกลับไปหน้าเว็บนักเรียน
    return json(r, statusFor(r));
  } catch (err) {
    return json({ status: 'error', code: 'GATEWAY_ERROR', message: String(err).slice(0, 200) }, 502);
  }
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ status: 'error', code: 'invalid_json' }, 400); }
  const action = String(body.action || '');
  try {
    if (action === 'submit') {
      const run = body.run || {};
      if (typeof run.imageData !== 'string' || !run.imageData.startsWith('data:image/') || run.imageData.length > MAX_IMAGE_CHARS) {
        return json({ status: 'error', code: 'evidence_invalid' }, 400);
      }
      const r = await callGas(env, {
        action: 'run_submit',
        run: {
          studentId: String(run.studentId || '').trim(),
          studentName: String(run.studentName || '').slice(0, 80),
          date: String(run.date || ''),
          distanceKm: Number(run.distanceKm),
          durationMin: Number(run.durationMin),
          source: run.source === 'gps' ? 'gps' : 'screenshot',
          type: run.type === 'event' ? 'event' : 'personal',
          eventName: String(run.eventName || '').slice(0, 150),
          gpsSummary: String(run.gpsSummary || '').slice(0, 1000),
          imageData: run.imageData,
        },
      });
      return json(r, statusFor(r));
    }

    if (!isAdmin(request, env)) return json({ status: 'error', code: 'ADMIN_KEY_REQUIRED' }, 401);
    let r;
    if (action === 'review') {
      r = await callGas(env, { action: 'run_review', runId: body.runId, decision: body.decision, reviewer: body.reviewer, note: body.note });
    } else if (action === 'fitness') {
      r = await callGas(env, { action: 'fitness_save', record: body.record || {} });
    } else if (action === 'settings') {
      r = await callGas(env, { action: 'run_settings_set', settings: body.settings || {} });
    } else {
      return json({ status: 'error', code: 'unknown_action' }, 400);
    }
    return json(r, statusFor(r));
  } catch (err) {
    return json({ status: 'error', code: 'GATEWAY_ERROR', message: String(err).slice(0, 200) }, 502);
  }
}
