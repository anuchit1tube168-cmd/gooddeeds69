// ผู้ตรวจเข้าด้วย LINE · ลบ/รวมรายการซ้ำ · รูปคล้าย
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const SID = String(7000000 + 21);
const UID = 'U' + 'a'.repeat(32);
const env = { RUN_ADMIN_KEY: 'a'.repeat(32), RUN_GATEWAY_KEY: 'g'.repeat(32), GAS_URL: 'https://gas.invalid/exec' };
const mod = (f) => import(path.join(__dirname, '../functions/api/' + f));
const req = (url, init = {}) => new Request('https://x.test' + url, init);

test('token ผู้ตรวจ: ลงนามถูกต้องผ่าน · ปลอม/หมดอายุ/คนละกุญแจไม่ผ่าน', async () => {
  const g = await mod('_gateway.js');
  const t = await g.signStaffToken(env, { uid: UID, name: 'น.ต.หญิง ทดสอบ' });
  assert.strictEqual((await g.verifyStaffToken(env, t)).name, 'น.ต.หญิง ทดสอบ');
  assert.strictEqual(await g.verifyStaffToken(env, t.slice(0, -2) + 'xx'), null);
  assert.strictEqual(await g.verifyStaffToken({ RUN_ADMIN_KEY: 'b'.repeat(32) }, t), null);
  assert.strictEqual(await g.verifyStaffToken(env, t, Date.now() + 13 * 3600e3), null);
  const who = await g.staffOf(req('/', { headers: { 'X-Staff-Token': t } }), env);
  assert.strictEqual(who.by, 'line');
  assert.strictEqual(await g.staffOf(req('/'), env), null);
});

test('staff_auth: ครั้งแรกส่งคำขอ (403 pending) · อนุมัติแล้วได้ token', async () => {
  const api = await mod('staff_auth.js');
  let status = null; const gasCalls = [];
  global.fetch = async (u, o = {}) => {
    if (String(u).includes('api.line.me')) return new Response(JSON.stringify({ sub: UID, name: 'ครูทดสอบ' }));
    const b = JSON.parse(o.body); gasCalls.push(b.action);
    if (b.action === 'staff_get') return new Response(JSON.stringify({ status: 'success', staff: status ? { lineUserId: UID, name: 'ครูทดสอบ', status } : null }));
    if (b.action === 'staff_request') { status = 'pending'; return new Response(JSON.stringify({ status: 'success', staff: { lineUserId: UID, name: 'ครูทดสอบ', status } })); }
    return new Response(JSON.stringify({ status: 'success' }));
  };
  const post = (body, headers = {}) => api.onRequestPost({ request: req('/api/staff_auth', { method: 'POST', body: JSON.stringify(body), headers }), env });
  const first = await post({ idToken: 'x' });
  assert.strictEqual(first.status, 403);
  assert.strictEqual((await first.json()).code, 'STAFF_PENDING');
  assert.deepStrictEqual(gasCalls, ['staff_get', 'staff_request']);
  status = 'active';
  const ok = await (await post({ idToken: 'x' })).json();
  assert.strictEqual(ok.status, 'success');
  assert.ok(ok.token);
  // อนุมัติคนอื่นต้องเป็นผู้ตรวจ
  assert.strictEqual((await post({ op: 'set', lineUserId: 'U' + 'b'.repeat(32), status: 'active' })).status, 403);
  assert.strictEqual((await post({ op: 'set', lineUserId: 'U' + 'b'.repeat(32), status: 'active' }, { 'X-Staff-Token': ok.token })).status, 200);
  // เปลี่ยนสถานะตัวเองไม่ได้
  assert.strictEqual((await post({ op: 'set', lineUserId: UID, status: 'revoked' }, { 'X-Staff-Token': ok.token })).status, 400);
});

test('deed_admin: ต้องเป็นผู้ตรวจ · รวมรายการซ้ำไม่เกินเพดานต่อวัน แล้วลบที่เหลือ พร้อมชื่อผู้ตรวจจาก token', async () => {
  const api = await mod('deed_admin.js');
  const g = await mod('_gateway.js');
  const token = await g.signStaffToken(env, { uid: UID, name: 'ครูทดสอบ' });
  const calls = [];
  global.fetch = async (u, o = {}) => {
    const b = JSON.parse(o.body); calls.push(b);
    if (b.action === 'getDeeds') return new Response(JSON.stringify([
      { id: 'deed_01', studentId: SID, categoryId: 4, hours: 3, activityDate: '2026-11-10', description: 'อบรม A', status: 'pending' },
      { id: 'deed_02', studentId: SID, categoryId: 4, hours: 3, activityDate: '2026-11-10', description: 'อบรม B', status: 'pending' },
    ]));
    return new Response(JSON.stringify({ status: 'success' }));
  };
  const post = (body, headers = {}) => api.onRequestPost({ request: req('/api/deed_admin', { method: 'POST', body: JSON.stringify(body), headers }), env });
  assert.strictEqual((await post({ op: 'delete', studentId: SID, deedId: 'deed_01' })).status, 403);
  const r = await (await post({ op: 'merge', studentId: SID, keepId: 'deed_01', deedIds: ['deed_01', 'deed_02'], deletedBy: 'ปลอม' }, { 'X-Staff-Token': token })).json();
  assert.strictEqual(r.status, 'success');
  assert.strictEqual(r.hours, 4); // หมวด 4 ไม่เกิน 4 ชม./วัน
  assert.strictEqual(r.capped, true);
  const edit = calls.find(c => c.action === 'edit_deed');
  assert.strictEqual(edit.updates.description, 'อบรม A / อบรม B');
  const del = calls.find(c => c.action === 'delete_deed');
  assert.strictEqual(del.deedId, 'deed_02');
  assert.strictEqual(del.deletedBy, 'ครูทดสอบ');
});

test('รายการที่ลบแล้ว (deleted) ไม่นับโควตาและไม่ถูกรายงาน', async () => {
  const { checkDeed, auditDeeds } = await mod('_deed_rules.js');
  const ex = [{ id: 'a', studentId: SID, categoryId: 7, hours: 1, activityDate: '2026-11-10', description: 'x', status: 'deleted' }];
  assert.strictEqual(checkDeed(ex, { categoryId: 7, hours: 1, activityDate: '2026-11-10', description: 'y' }, new Date('2026-11-17T03:00:00Z')).ok, true);
  const two = [...ex, { ...ex[0], id: 'b', status: 'pending' }];
  assert.strictEqual(auditDeeds(two, { academicYear: 2569, now: new Date('2026-11-17T03:00:00Z') }).totals.duplicates, 0);
});

test('รูปคล้าย: dHash ต่างกันไม่กี่บิต = กลุ่มเดียวกัน · ไม่ซ้ำกับไฟล์เดียวกันทุกไบต์', async () => {
  const { similarPhotos, hamming } = await mod('_deed_rules.js');
  assert.strictEqual(hamming('ffffffff00000000', 'fffffffe00000000'), 1);
  const photos = [
    { deedId: 'p1', studentId: SID, hash: 'h1', dhash: '9a3c5e7f10325476' },
    { deedId: 'p2', studentId: String(7000000 + 22), hash: 'h2', dhash: '9a3c5e7f10325477' },
    { deedId: 'p3', studentId: SID, hash: 'h3', dhash: '65c3a180efcdab89' },
    { deedId: 'p4', studentId: SID, hash: 'h1', dhash: '9a3c5e7f10325476' },
  ];
  const g = similarPhotos(photos, []);
  assert.strictEqual(g.length, 1);
  assert.strictEqual(g[0].crossStudent, true);
  assert.ok(g[0].items.some(i => i.deedId === 'p2'));
  assert.ok(!g[0].items.some(i => i.deedId === 'p3'));
});

test('line_push: ต้องมี gatewayKey · ส่งผ่านรหัส LINE ของ Cloudflare', async () => {
  const api = await mod('line_push.js');
  const sent = [];
  global.fetch = async (u, o = {}) => { sent.push([String(u), o.headers && o.headers.Authorization]); return new Response('{}'); };
  const e2 = { ...env, LINE_CHANNEL_ACCESS_TOKEN: 'tok' };
  const post = (b) => api.onRequestPost({ request: req('/api/line_push', { method: 'POST', body: JSON.stringify(b) }), env: e2 });
  assert.strictEqual((await post({ to: UID, text: 'hi' })).status, 403);
  assert.strictEqual((await post({ gatewayKey: 'x'.repeat(32), to: UID, text: 'hi' })).status, 403);
  assert.strictEqual((await post({ gatewayKey: 'g'.repeat(32), to: 'bad', text: 'hi' })).status, 400);
  assert.strictEqual((await post({ gatewayKey: 'g'.repeat(32), to: UID, text: 'hi' })).status, 200);
  assert.deepStrictEqual(sent[0], ['https://api.line.me/v2/bot/message/push', 'Bearer tok']);
});

test('notify_status: เฉพาะผู้ตรวจ และไม่คืนค่ารหัสลับ', async () => {
  const api = await mod('notify_status.js');
  global.fetch = async (u, o = {}) => {
    if (String(u).includes('telegram')) return new Response('{}');
    if (String(u).includes('bot/info')) return new Response(JSON.stringify({ displayName: 'วพอ.', basicId: '@x' }));
    return new Response(JSON.stringify({ status: 'success', lineTokenInScript: false, mail: false, mailError: 'x', weeklyAudit: false, students: 10, studentsWithLine: 4 }));
  };
  const e2 = { ...env, LINE_CHANNEL_ACCESS_TOKEN: 'secret-token-value', TELEGRAM_BOT_TOKEN: 'tg-secret', TELEGRAM_CHAT_ID: '1' };
  assert.strictEqual((await api.onRequestGet({ request: req('/api/notify_status'), env: e2 })).status, 403);
  const r = await api.onRequestGet({ request: req('/api/notify_status', { headers: { 'X-Admin-Key': 'a'.repeat(32) } }), env: e2 });
  const txt = await r.text();
  assert.ok(!txt.includes('secret-token-value') && !txt.includes('tg-secret'));
  const j = JSON.parse(txt);
  assert.strictEqual(j.line.ready, true);
  assert.strictEqual(j.email.ready, false);
  assert.strictEqual(j.telegram.ready, true);
  assert.strictEqual(j.line.studentsWithLine, 4);
});

test('review_queue: แยกผิดกฎ / ควรดู / ปกติ และต้องเป็นผู้ตรวจ', async () => {
  const api = await mod('review_queue.js');
  const NOW = new Date('2026-11-17T03:00:00Z');
  const S2 = String(7000000 + 22);
  const base = { description: 'ช่วยจัดสถานที่งานพิธี', location: 'วพอ.', imageUrl: '/api/deed_photo?x', submittedAt: '2026-11-16' };
  const deeds = [
    { ...base, id: 'ok1', studentId: SID, categoryId: 3, hours: 2, activityDate: '2026-11-15', status: 'pending' },
    { ...base, id: 'b1', studentId: SID, categoryId: 7, hours: 1, activityDate: '2026-11-10', status: 'approved', description: 'ล้างจานช่วยแม่' },
    { ...base, id: 'b2', studentId: SID, categoryId: 7, hours: 1, activityDate: '2026-11-11', status: 'approved', description: 'กวาดบ้าน' },
    { ...base, id: 'blk', studentId: SID, categoryId: 7, hours: 1, activityDate: '2026-11-12', status: 'pending', description: 'รดน้ำต้นไม้' },
    { ...base, id: 'np', studentId: S2, categoryId: 3, hours: 1, activityDate: '2026-11-14', status: 'pending', imageUrl: '' , description: 'ยกโต๊ะ'},
    { ...base, id: 'late', studentId: S2, categoryId: 2, hours: 4, activityDate: '2026-06-13', status: 'pending', description: 'โครงการภายนอก' },
  ];
  const q = api.buildQueue(deeds, null, NOW);
  const lv = Object.fromEntries(q.items.map(i => [i.id, i.level]));
  assert.deepStrictEqual(lv, { blk: 'block', np: 'warn', late: 'warn', ok1: 'ok' });
  assert.strictEqual(q.items[0].id, 'blk');
  assert.ok(q.items.find(i => i.id === 'late').flags.some(f => f.code === 'LATE'));
  assert.deepStrictEqual(q.counts, { total: 4, block: 1, warn: 2, ok: 1 });
  global.fetch = async () => new Response('[]');
  assert.strictEqual((await api.onRequestGet({ request: req('/api/review_queue'), env })).status, 403);
});
