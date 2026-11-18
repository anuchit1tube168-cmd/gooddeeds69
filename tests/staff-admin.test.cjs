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
