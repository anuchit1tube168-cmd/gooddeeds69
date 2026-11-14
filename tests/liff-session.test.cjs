// LINE auto-login ต้องสร้าง session จริง ไม่งั้นหน้า dashboard เด้งกลับ index → login LINE ซ้ำวนไม่จบ
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('liff-sdk เรียก setSession แบบ (role, user)', () => {
  const src = fs.readFileSync(path.join(__dirname, '../frontend/liff-sdk.js'), 'utf8');
  const calls = src.match(/App\.setSession\(([^,)]*)/g) || [];
  assert.ok(calls.length > 0);
  for (const c of calls) assert.match(c, /App\.setSession\('student'/, c);
});

test('App.setSession รับ object ตัวเดียวได้ (รองรับโค้ดเก่า)', () => {
  const src = fs.readFileSync(path.join(__dirname, '../frontend/app.js'), 'utf8');
  const m = src.match(/setSession\(role, user\) \{[\s\S]*?\n    \},/);
  assert.ok(m, 'หา setSession ไม่เจอ');
  const store = {};
  const ctx = { Storage: { set: (k, v) => { store[k] = v; } }, out: null };
  vm.createContext(ctx);
  vm.runInContext('const App = {' + m[0] + ' syncAuthContext() {} }; out = App.setSession({ student_id: "7000001" });', ctx);
  assert.strictEqual(store.session.student_id, '7000001');
  assert.strictEqual(store.session.role, 'student');
});
