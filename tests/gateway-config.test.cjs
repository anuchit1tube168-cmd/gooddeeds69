const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function runConfig({ secure = false } = {}) {
  const listeners = {};
  const studentPassword = { value: 'legacy', placeholder: '', attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } };
  const teacherPassword = { value: 'legacy', placeholder: '', attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } };
  const alertMessage = { textContent: 'รหัส 7 หลัก เป็นรหัสผ่าน' };
  const quickButton = {
    disabled: false, attrs: {}, style: {},
    removeAttribute(name) { delete this.attrs[name]; },
    setAttribute(name, value) { this.attrs[name] = value; }
  };
  const originalStudentLogin = async () => ({ success: true });
  const originalTeacherLogin = async () => ({ success: true });
  const context = {
    App: { loginStudent: originalStudentLogin, loginTeacher: originalTeacherLogin },
    GoodDeedV2: secure ? { call() {} } : undefined,
    MutationObserver: class { observe() {} },
    document: {
      readyState: 'loading',
      getElementById(id) {
        return { 'student-password': studentPassword, 'teacher-password': teacherPassword, 'alert-message': alertMessage }[id] || null;
      },
      querySelectorAll() { return [quickButton]; }
    },
    addEventListener(type, fn) { listeners[type] = fn; },
    setTimeout(fn) { fn(); return 1; }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('frontend/gateway-config.js', 'utf8'), context);
  return { context, listeners, studentPassword, teacherPassword, alertMessage, quickButton, originalStudentLogin, originalTeacherLogin };
}

test('login guard binds to window and removes legacy credential hints', async () => {
  const c = runConfig();
  assert.equal(typeof c.listeners.load, 'function');
  assert.equal(c.studentPassword.value, '');
  assert.equal(c.studentPassword.placeholder, 'รหัสผ่านที่ได้รับจากผู้ดูแลระบบ');
  assert.equal(c.teacherPassword.value, '');
  assert.equal(c.quickButton.disabled, true);
  assert.doesNotMatch(c.alertMessage.textContent, /รหัส\s*7\s*หลัก\s*เป็นรหัส/);
  assert.equal((await c.context.App.loginStudent()).success, false);
  assert.equal((await c.context.App.loginTeacher()).success, false);
});

test('login guard does not replace a ready V2 gateway', () => {
  const c = runConfig({ secure: true });
  assert.equal(c.context.App.loginStudent, c.originalStudentLogin);
  assert.equal(c.context.App.loginTeacher, c.originalTeacherLogin);
});
