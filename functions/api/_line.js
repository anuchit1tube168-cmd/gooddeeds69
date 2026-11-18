// รหัส LINE Messaging API ฝั่ง Cloudflare — ใช้ร่วมระหว่าง API (ไฟล์ขึ้นต้น _ จึงไม่เป็น route)
// มี LINE_CHANNEL_ACCESS_TOKEN ใช้เลย · ไม่มีแต่มี channel id + secret → ขอ token อายุสั้นจาก LINE (เหมือน approve_deed.js)
export async function lineToken(env) {
  if (env && env.LINE_CHANNEL_ACCESS_TOKEN) return { token: env.LINE_CHANNEL_ACCESS_TOKEN, source: 'token' };
  const id = (env && env.LINE_CHANNEL_ID) || '1654464250';
  const secret = (env && env.LINE_CHANNEL_SECRET) || '';
  if (!secret) return { token: '', source: 'none' };
  try {
    const r = await fetch('https://api.line.me/v2/oauth/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: id, client_secret: secret }).toString(),
    });
    if (!r.ok) return { token: '', source: 'secret_failed' };
    const j = await r.json();
    return { token: j.access_token || '', source: 'secret' };
  } catch (_) { return { token: '', source: 'secret_failed' }; }
}

export async function linePush(env, to, text) {
  const { token } = await lineToken(env);
  if (!token) return { ok: false, code: 'LINE_NOT_CONFIGURED' };
  const r = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ to, messages: [{ type: 'text', text: String(text).slice(0, 4900) }] }),
  });
  return r.ok ? { ok: true } : { ok: false, code: 'LINE_HTTP_' + r.status };
}
