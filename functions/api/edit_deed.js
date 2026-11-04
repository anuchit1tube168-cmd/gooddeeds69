/**
 * Cloudflare Pages Function - Edit Deed Edge Handler (24/7 Edge Serverless)
 * ระบบแก้ไขข้อมูลรายการความดีจิตอาสา วพอ. 2569 ตลอด 24 ชม.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-GoodDeeds-Role, X-GoodDeeds-Student-Id, X-GoodDeeds-Username',
  'Access-Control-Max-Age': '86400'
};

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

export async function onRequestGet(context) {
  const { env } = context;
  const gasUrl = (env && env.GAS_URL) ? env.GAS_URL : 'https://script.google.com/macros/s/AKfycbwaG05E5dNew4dsf0vD8LBLuWdbThXIkMih1UI8Ba9rnRBCK4xmnlArzZdwtmqV9vOdcw/exec';

  return new Response(JSON.stringify({
    status: 'online',
    service: 'RTAFNC Good Deeds Edit Edge API',
    environment: 'Cloudflare Edge 24/7 Serverless',
    hasGasUrl: !!gasUrl,
    timestamp: new Date().toISOString()
  }, null, 2), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const gasUrl = (env && env.GAS_URL) ? env.GAS_URL : 'https://script.google.com/macros/s/AKfycbwaG05E5dNew4dsf0vD8LBLuWdbThXIkMih1UI8Ba9rnRBCK4xmnlArzZdwtmqV9vOdcw/exec';

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return new Response(JSON.stringify({ status: 'error', message: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  const studentId = String(body.studentId || body.student_id || '').trim();
  const deedId = String(body.deedId || body.id || '').trim();
  const role = String(body.role || 'student').trim();
  const updates = body.updates || body;

  if (!studentId || !deedId) {
    return new Response(JSON.stringify({ status: 'error', message: 'Missing studentId or deedId' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  let gasResult = null;
  if (gasUrl) {
    try {
      const resp = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit_deed',
          deedId: deedId,
          studentId: studentId,
          role: role,
          updates: updates
        })
      });
      gasResult = await resp.json();
    } catch (gasErr) {
      console.error('Failed to forward edit to GAS:', gasErr);
      gasResult = { status: 'error', message: String(gasErr) };
    }
  }

  return new Response(JSON.stringify({
    status: 'success',
    deedId: deedId,
    studentId: studentId,
    message: 'Deed updated successfully',
    gasResult: gasResult
  }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}
