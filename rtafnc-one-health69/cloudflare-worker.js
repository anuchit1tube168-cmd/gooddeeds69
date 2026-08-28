// RTAFNC ONE · Medical69 Cloudflare Worker gateway
// Secrets (Cloudflare): GAS_MEDICAL69_URL, MEDICAL69_SHARED_SECRET
// Real-data mode MUST stay disabled until RTAFNC_ID session verification/RBAC is connected.

function hex(buffer) {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sign(secret, text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text)));
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer'
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/healthz') return json({ ok: true, service: 'RTAFNC ONE Medical69 Gateway', realData: false });
    if (url.pathname !== '/api/medical69') return json({ ok: false, error: 'Not found' }, 404);
    if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);

    // Safety gate: keep OFF until LINE/RTAFNC session verification is implemented.
    if (env.MEDICAL69_REAL_DATA_ENABLED !== 'true') {
      return json({ ok: false, code: 'REAL_DATA_DISABLED', error: 'Medical69 real-data access is disabled until identity/RBAC is connected.' }, 503);
    }

    // TODO Day 2: verify RTAFNC_ID session / LINE ID token server-side and enforce role + scope.
    const auth = request.headers.get('authorization') || '';
    if (!auth.startsWith('Bearer ')) return json({ ok: false, error: 'Authentication required' }, 401);

    if (!env.GAS_MEDICAL69_URL || !env.MEDICAL69_SHARED_SECRET) return json({ ok: false, error: 'Gateway not configured' }, 503);

    const body = await request.json();
    const allowed = new Set(['getDashboardStats','getRecipients','getRecipientHistory','saveMedicalRequest','getRequests','updateRequestStatus','saveNewVisit']);
    if (!allowed.has(body.action)) return json({ ok: false, error: 'Action not allowed' }, 403);

    const signed = {
      ts: Date.now(),
      nonce: crypto.randomUUID(),
      action: body.action,
      args: body.args || {}
    };
    const canonical = JSON.stringify(signed);
    signed.sig = await sign(env.MEDICAL69_SHARED_SECRET, canonical);

    const upstream = await fetch(env.GAS_MEDICAL69_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(signed),
      redirect: 'follow'
    });
    const text = await upstream.text();
    return new Response(text, { status: upstream.ok ? 200 : 502, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
  }
};
