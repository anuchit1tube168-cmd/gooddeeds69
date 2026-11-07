const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const appSource = fs.readFileSync('frontend/app.js', 'utf8');
const teacherDashSource = fs.readFileSync('frontend/teacher-dashboard.html', 'utf8');
const settingsSource = fs.readFileSync('frontend/settings.html', 'utf8');
const approveSignSource = fs.readFileSync('frontend/approve_sign.html', 'utf8');

function createAppContext() {
  const values = new Map();
  const storage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    clear: () => values.clear()
  };

  const context = vm.createContext({
    console,
    URL,
    localStorage: storage,
    sessionStorage: storage,
    window: {
      location: { hostname: 'localhost', protocol: 'http:' },
      addEventListener() {},
      dispatchEvent() {}
    },
    document: {
      getElementById: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {}
    },
    fetch: async () => ({ ok: false }),
    module: { exports: {} },
    setTimeout() {},
    clearTimeout() {},
    CustomEvent: class {}
  });

  vm.runInContext(appSource, context, { filename: 'frontend/app.js' });
  const app = context.module.exports.App;
  return { context, app, storage };
}

test('Security Gate 1: Students cannot log in via Teacher/Admin login using Student ID', async () => {
  const { app } = createAppContext();

  // Test 1: Student ID in teacher login
  const res1 = await app.loginTeacher('6903987', '1234');
  assert.equal(res1.success, false, 'Student ID must never be accepted as teacher username');
  assert.match(res1.message, /ไม่พบบัญชีผู้ใช้ของอาจารย์หรือแอดมิน/);

  // Test 2: Blank or arbitrary credentials
  const res2 = await app.loginTeacher('', '');
  assert.equal(res2.success, false, 'Blank credentials must fail');

  const res3 = await app.loginTeacher('hacker', '123456');
  assert.equal(res3.success, false, 'Arbitrary username must fail');

  // Test 3: Correct student credentials on teacher login
  const res4 = await app.loginTeacher('6903987', '6903987');
  assert.equal(res4.success, false, 'Student ID cannot bypass teacher login');
});

test('Security Gate 2: Student session role is strictly student and has no admin privileges', async () => {
  const { app } = createAppContext();

  const studentLogin = await app.loginStudent('6903987', '1234');
  assert.equal(studentLogin.success, true);
  assert.equal(studentLogin.user.role, 'student');
  assert.equal(!!studentLogin.user.isAdmin, false);
  assert.equal(!!studentLogin.user.isTeacher, false);

  const currentUser = app.getCurrentUser();
  assert.equal(currentUser.role, 'student');
  assert.equal(!!currentUser.isAdmin, false);
});

test('Security Gate 3: Teacher Dashboard strictly blocks student and unverified sessions', () => {
  // Check that teacher-dashboard.html verifies token prefix 'teacher_' and role
  assert.match(teacherDashSource, /const isVerifiedStaff = currentUser &&/);
  assert.match(teacherDashSource, /currentUser\.role === 'teacher' \|\| currentUser\.role === 'admin'/);
  assert.match(teacherDashSource, /currentUser\.token\s*&&\s*currentUser\.token\.startsWith\(['"]teacher_['"]\)/);
  assert.match(teacherDashSource, /currentUser\.role === 'student'/);
  assert.match(teacherDashSource, /window\.location\.href = 'index\.html\?tab=teacher'/);
});

test('Security Gate 4: Settings page strictly blocks student sessions', () => {
  // Check that settings.html verifies verified admin role
  assert.match(settingsSource, /const isVerifiedAdmin = currentUser && currentUser\.role === 'admin'/);
  assert.match(settingsSource, /currentUser\.token && currentUser\.token\.startsWith\('teacher_'\)/);
  assert.match(settingsSource, /currentUser\.role === 'student'/);
  assert.match(settingsSource, /window\.location\.href = 'student-dashboard\.html'/);
});

test('Security Gate 5: Approve Sign strictly prevents student self-approval', () => {
  // Check that approve_sign.html contains self-approval prevention
  assert.match(approveSignSource, /u\.role === 'student'/);
  assert.match(approveSignSource, /String\(u\.student_id\) === String\(studentId\)/);
  assert.match(approveSignSource, /นักเรียนไม่สามารถตรวจหรือลงนามอนุมัติความดีของตนเองได้/);
});
