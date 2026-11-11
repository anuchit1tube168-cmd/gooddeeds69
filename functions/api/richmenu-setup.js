/**
 * /api/richmenu-setup — ติดตั้ง/อัปเดต Rich Menu แบบแท็บของ LINE OA (ผู้ดูแลเท่านั้น)
 * GET  → ดูสถานะเมนูปัจจุบัน
 * POST → ลบเมนูชุด gd-tabs-* เดิม แล้วสร้างใหม่ 3 แท็บ + alias + ตั้งเป็นเมนูหลัก
 * ต้องส่ง X-Admin-Key = RUN_ADMIN_KEY; token LINE อยู่ฝั่ง server เท่านั้น
 */
import { MENUS, MENU_PREFIX } from './_richmenu_def.js';

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
function safeEqual(a, b) {
  a = String(a || ''); b = String(b || '');
  if (!a || !b || a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0;
}
async function lineToken(env) {
  if (env.LINE_CHANNEL_ACCESS_TOKEN) return env.LINE_CHANNEL_ACCESS_TOKEN;
  // Channel ID ไม่ใช่ความลับ (ใช้ค่าเดียวกับ approve_deed.js); Channel Secret ต้องมาจาก Cloudflare secret เท่านั้น
  const channelId = env.LINE_CHANNEL_ID || '1654464250';
  if (!env.LINE_CHANNEL_SECRET) return '';
  const r = await fetch('https://api.line.me/v2/oauth/accessToken', { method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: channelId, client_secret: env.LINE_CHANNEL_SECRET }) });
  return r.ok ? ((await r.json()).access_token || '') : '';
}
async function line(token, method, path, body, host = 'https://api.line.me') {
  const isImage = body instanceof ArrayBuffer;
  const r = await fetch(host + path, { method, headers: { Authorization: `Bearer ${token}`,
      ...(isImage ? { 'Content-Type': 'image/jpeg' } : body ? { 'Content-Type': 'application/json' } : {}) },
    body: body instanceof ArrayBuffer ? body : body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let data = {}; try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text.slice(0, 200) }; }
  return { ok: r.ok, status: r.status, data };
}

export async function onRequest({ request, env }) {
  if (!env.RUN_ADMIN_KEY || !safeEqual(request.headers.get('X-Admin-Key'), env.RUN_ADMIN_KEY)) return json({ status: 'error', code: 'ADMIN_KEY_REQUIRED' }, 401);
  const token = await lineToken(env);
  if (!token) return json({ status: 'error', code: 'LINE_TOKEN_MISSING' }, 503);

  const list = await line(token, 'GET', '/v2/bot/richmenu/list');
  if (!list.ok) return json({ status: 'error', code: 'LINE_LIST_FAILED', http: list.status }, 502);
  const ours = (list.data.richmenus || []).filter((m) => String(m.name || '').startsWith(MENU_PREFIX));
  if (request.method === 'GET') return json({ status: 'success', installed: ours.map((m) => ({ id: m.richMenuId, name: m.name })) });
  if (request.method !== 'POST') return json({ status: 'error', code: 'METHOD' }, 405);

  const origin = new URL(request.url).origin;
  const log = [];
  // 1) เตรียมภาพก่อน — ถ้าภาพไม่ครบ ไม่แตะเมนูเดิม
  const images = {};
  for (const m of MENUS) {
    const r = await fetch(`${origin}/richmenu/${m.image}`);
    if (!r.ok) return json({ status: 'error', code: 'IMAGE_MISSING', image: m.image }, 500);
    images[m.alias] = await r.arrayBuffer();
  }
  // 2) สร้างเมนูใหม่ทั้ง 3 แท็บ + อัปโหลดภาพ
  const created = {};
  for (const m of MENUS) {
    const { alias, image, ...def } = m;
    const c = await line(token, 'POST', '/v2/bot/richmenu', def);
    if (!c.ok) return json({ status: 'error', code: 'CREATE_FAILED', alias, http: c.status, detail: c.data }, 502);
    created[alias] = c.data.richMenuId;
    const up = await line(token, 'POST', `/v2/bot/richmenu/${created[alias]}/content`, images[alias], 'https://api-data.line.me');
    if (!up.ok) return json({ status: 'error', code: 'UPLOAD_FAILED', alias, http: up.status, detail: up.data }, 502);
    log.push(`created ${alias}`);
  }
  // 3) ชี้ alias ไปที่เมนูใหม่ (มีแล้วอัปเดต ยังไม่มีสร้าง) แล้วตั้งแท็บ 1 เป็นเมนูหลัก
  for (const alias of Object.keys(created)) {
    let a = await line(token, 'POST', `/v2/bot/richmenu/alias/${alias}`, { richMenuId: created[alias] });
    if (!a.ok) a = await line(token, 'POST', '/v2/bot/richmenu/alias', { richMenuAliasId: alias, richMenuId: created[alias] });
    if (!a.ok) return json({ status: 'error', code: 'ALIAS_FAILED', alias, http: a.status, detail: a.data }, 502);
  }
  const def = await line(token, 'POST', `/v2/bot/user/all/richmenu/${created['gd-tab-1']}`);
  if (!def.ok) return json({ status: 'error', code: 'DEFAULT_FAILED', http: def.status }, 502);
  // 4) ลบเมนูชุดเก่าหลังสลับเสร็จ (ไม่มีช่วงที่ผู้ใช้ไม่มีเมนู)
  for (const m of ours) { await line(token, 'DELETE', `/v2/bot/richmenu/${m.richMenuId}`); log.push(`removed old ${m.name}`); }
  return json({ status: 'success', default: created['gd-tab-1'], aliases: Object.keys(created), log });
}
