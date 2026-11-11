// /api/profile + /api/update_student: ตรวจสิทธิ์และ fail closed (ไม่ยิงไป Apps Script จริง)
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const SID = '7000001';
const env = { GAS_URL: 'https://gas.invalid/exec', RUN_GATEWAY_KEY: 'g'.repeat(32), RUN_ADMIN_KEY: 'a'.repeat(32) };

function mockGas(reply) {
  const calls = [];
  global.fetch = async (url, opt) => { calls.push(JSON.parse(opt.body)); return new Response(JSON.stringify(reply)); };
  return calls;
}
const req = (url, init = {}) => new Request('https://x.test' + url, init);

test('profile GET ต้องเป็นเจ้าของหรือผู้ตรวจ', async () => {
  const api = await import(path.join(__dirname, '../functions/api/profile.js'));
  const calls = mockGas({ status: 'success', profile: { student_id: SID } });
  let r = await api.onRequestGet({ request: req('/api/profile?studentId=' + SID), env });
  assert.strictEqual(r.status, 403);
  r = await api.onRequestGet({ request: req('/api/profile?studentId=' + SID, { headers: { 'X-GoodDeeds-Student-Id': '7000002' } }), env });
  assert.strictEqual(r.status, 403);
  r = await api.onRequestGet({ request: req('/api/profile?studentId=' + SID, { headers: { 'X-GoodDeeds-Student-Id': SID } }), env });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(calls[0].action, 'profile_get');
  assert.strictEqual(calls[0].gatewayKey, env.RUN_GATEWAY_KEY);
  r = await api.onRequestGet({ request: req('/api/profile?studentId=abc', { headers: { 'X-GoodDeeds-Student-Id': 'abc' } }), env });
  assert.strictEqual(r.status, 400);
});

test('profile POST บันทึกของตัวเอง + ปฏิเสธเมื่อไม่ได้ตั้งค่า', async () => {
  const api = await import(path.join(__dirname, '../functions/api/profile.js'));
  const calls = mockGas({ status: 'success', profile: { student_id: SID, nickname: 'ทดสอบ' } });
  const body = JSON.stringify({ studentId: SID, fields: { nickname: 'ทดสอบ' } });
  let r = await api.onRequestPost({ request: req('/api/profile', { method: 'POST', body, headers: { 'X-GoodDeeds-Student-Id': SID } }), env });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(calls[0].action, 'profile_set');
  assert.strictEqual(calls[0].by, 'student');
  r = await api.onRequestPost({ request: req('/api/profile', { method: 'POST', body, headers: { 'X-GoodDeeds-Student-Id': SID } }), env: {} });
  assert.strictEqual(r.status, 503);
  r = await api.onRequestPost({ request: req('/api/profile', { method: 'POST', body: 'x'.repeat(9000), headers: { 'X-GoodDeeds-Student-Id': SID } }), env });
  assert.strictEqual(r.status, 413);
});

test('update_student ต้องใช้รหัสผู้ตรวจ', async () => {
  const api = await import(path.join(__dirname, '../functions/api/update_student.js'));
  const calls = mockGas({ status: 'success' });
  const body = JSON.stringify({ studentId: SID, rank: 'นพอ.', firstName: 'ก', lastName: 'ข', classYear: 69 });
  let r = await api.onRequestPost({ request: req('/api/update_student', { method: 'POST', body, headers: { 'X-GoodDeeds-Role': 'teacher' } }), env });
  assert.strictEqual(r.status, 401);
  assert.strictEqual(calls.length, 0);
  r = await api.onRequestPost({ request: req('/api/update_student', { method: 'POST', body, headers: { 'X-Admin-Key': env.RUN_ADMIN_KEY } }), env });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(calls[0].action, 'profile_admin_update');
  assert.strictEqual(calls[0].password, undefined);
});
