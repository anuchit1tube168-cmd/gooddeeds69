const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const appSource = fs.readFileSync('frontend/app.js', 'utf8');
const indexSource = fs.readFileSync('frontend/index.html', 'utf8');
const settingsSource = fs.readFileSync('frontend/settings.html', 'utf8');

test('production assets contain no legacy shared-password path', () => {
  const productionAuth = [appSource, indexSource, settingsSource].join('\n');
  for (const forbidden of [
    'admin' + '69',
    'teacher' + '69',
    'anuchit' + '2569',
    'bird' + '2569'
  ]) assert.equal(productionAuth.includes(forbidden), false);
  assert.doesNotMatch(appSource, /validPasswords|inputPwd\s*===\s*['"]['"]|cleanId\.slice\(-[45]\)/);
  assert.doesNotMatch(indexSource, /quickLogin(?:Admin|Anuchit)|กรอกอัตโนมัติ/);
});

test('browser settings cannot collect or transmit provider credentials', () => {
  assert.doesNotMatch(settingsSource, /id=["']setting-(?:token|admin-chat|line-token|line-channel-token)["']/);
  assert.doesNotMatch(settingsSource, /Authorization\s*['"]?\s*:\s*`?Bearer/);
  assert.doesNotMatch(appSource, /[A-Za-z0-9+/]{120,}={0,2}/);
});

test('admin Telegram test uses the authenticated V2 server action without browser secrets', () => {
  assert.match(settingsSource, /gateway-client\.js\?v=20260920-telegram-dispatch/);
  assert.match(settingsSource, /GoodDeedV2\.call\(['"]testTelegram['"],\s*\{\}\)/);
  assert.doesNotMatch(settingsSource, /telegramToken\s*[:=]|adminChatId\s*[:=]/);
});

test('base authentication fails closed until the V2 client replaces it', async () => {
  const values = new Map();
  const storage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
  const context = vm.createContext({
    console,
    URL,
    localStorage: storage,
    sessionStorage: storage,
    window: { location: { hostname: 'example.test', protocol: 'https:' }, addEventListener() {}, dispatchEvent() {} },
    document: { addEventListener() {}, querySelectorAll: () => [] },
    module: { exports: {} },
    setTimeout() {},
    clearTimeout() {},
    CustomEvent: class {}
  });
  vm.runInContext(appSource, context, { filename: 'frontend/app.js' });
  const app = context.module.exports.App;
  assert.equal((await app.loginStudent('synthetic', 'synthetic')).success, false);
  assert.equal((await app.loginTeacher('synthetic', 'synthetic')).success, false);
  assert.equal(app.getStaffAccounts().length, 0);
  assert.equal(app.addStaffAccount({ username: 'synthetic', password: 'synthetic' }).success, false);
  app.saveSettings({ telegramToken: 'discard-me', minHours: 50 });
  assert.equal(app.getSettings().telegramToken, undefined);
  assert.equal(JSON.parse(storage.getItem('gooddeeds_settings')).telegramToken, undefined);
});
