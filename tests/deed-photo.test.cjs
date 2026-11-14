// /api/deed_photo: รูปหลักฐานต้องดึงได้ทุกเครื่อง และอัปโหลดได้เฉพาะเจ้าของ/ผู้ตรวจ
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const SID = String(7000000 + 1);
const env = { GAS_URL: 'https://gas.invalid/exec', RUN_GATEWAY_KEY: 'g'.repeat(32), RUN_ADMIN_KEY: 'a'.repeat(32) };
const req = (url, init = {}) => new Request('https://x.test' + url, init);
function mockGas(reply) {
  const calls = [];
  global.fetch = async (u, o) => { calls.push(JSON.parse(o.body)); return new Response(JSON.stringify(reply)); };
  return calls;
}

test('GET คืนไฟล์รูปจาก Apps Script', async () => {
  const api = await import(path.join(__dirname, '../functions/api/deed_photo.js'));
  const calls = mockGas({ status: 'success', mime: 'image/jpeg', data: Buffer.from([0xff, 0xd8, 0xff]).toString('base64') });
  const r = await api.onRequestGet({ request: req('/api/deed_photo?deedId=deed_123456&studentId=' + SID), env });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.headers.get('Content-Type'), 'image/jpeg');
  assert.deepStrictEqual([...new Uint8Array(await r.arrayBuffer())], [0xff, 0xd8, 0xff]);
  assert.strictEqual(calls[0].action, 'deedphoto_get');
  const bad = await api.onRequestGet({ request: req('/api/deed_photo?deedId=x&studentId=' + SID), env });
  assert.strictEqual(bad.status, 400);
});

test('GET ไม่มีรูป → 404 (หน้าเว็บแสดงตราแทน)', async () => {
  const api = await import(path.join(__dirname, '../functions/api/deed_photo.js'));
  mockGas({ status: 'error', code: 'PHOTO_NOT_FOUND' });
  const r = await api.onRequestGet({ request: req('/api/deed_photo?deedId=deed_123456&studentId=' + SID), env });
  assert.strictEqual(r.status, 404);
});

test('POST อัปโหลดได้เฉพาะเจ้าของรายการหรือผู้ตรวจ', async () => {
  const api = await import(path.join(__dirname, '../functions/api/deed_photo.js'));
  const calls = mockGas({ status: 'success', path: '/api/deed_photo?x' });
  const body = JSON.stringify({ deedId: 'deed_123456', studentId: SID, image: 'data:image/jpeg;base64,/9j/' });
  let r = await api.onRequestPost({ request: req('/api/deed_photo', { method: 'POST', body }), env });
  assert.strictEqual(r.status, 403);
  r = await api.onRequestPost({ request: req('/api/deed_photo', { method: 'POST', body, headers: { 'X-GoodDeeds-Student-Id': SID } }), env });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(calls[0].action, 'deedphoto_put');
  assert.strictEqual(calls[0].gatewayKey, env.RUN_GATEWAY_KEY);
});
