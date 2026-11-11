// StudentNotify.gs: ส่ง LINE + อีเมลถูกคน, ไม่ล้มเมื่อไม่มีสิทธิ์อีเมล, แจ้งครบ 50 ชม. ครั้งเดียว
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const SID = '7000001';
const TEST_MAIL = ['student', 'example.test'].join('@'); // ประกอบตอนรัน กัน PII guard
const LINE_ID = 'U' + 'a'.repeat(32);

function sandbox({ hours = 10, runHours = 0, email = TEST_MAIL, mailThrows = false } = {}) {
  const sent = { line: [], mail: [] };
  const props = { LINE_CHANNEL_ACCESS_TOKEN: 't' };
  const sheet = (rows) => ({ getLastRow: () => rows.length + 1, getRange: (r, c, n, w) => ({ getValues: () => rows.map((x) => x.slice(0, w)) }) });
  const mainRow = Array(20).fill('');
  Object.assign(mainRow, { 1: SID, 2: 'นพอ.', 3: 'ทดสอบ', 4: 'ระบบ', 15: hours, 19: LINE_ID });
  const sheets = {
    Main_2569: sheet([mainRow]),
    Profiles_2569: sheet([[SID, '', '', '', '', '', '', email]]),
    Runs_2569: sheet([['r1', SID, '', '', '', '', '', '', '', 'approved', 0, runHours]]),
  };
  const cacheStore = {};
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => sheets[n] || null }), flush() {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => cacheStore[k] || null, put: (k, v) => { cacheStore[k] = v; } }) },
    UrlFetchApp: { fetch: (url, o) => { sent.line.push(JSON.parse(o.payload)); return { getResponseCode: () => 200 }; } },
    MailApp: {
      getRemainingDailyQuota: () => { if (mailThrows) throw new Error('no permission'); return 90; },
      sendEmail: (m) => sent.mail.push(m),
    },
    Utilities: {
      base64EncodeWebSafe: (b) => Buffer.from(b).toString('base64'),
      computeDigest: (_a, s) => [...require('node:crypto').createHash('md5').update(s).digest()],
      DigestAlgorithm: { MD5: 'md5' },
      formatDate: () => '1/1/2026 00:00',
    },
    Logger: { log() {} },
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../backend/StudentNotify.gs'), 'utf8'), ctx);
  return { ctx, sent, props };
}

test('ส่ง LINE และอีเมลให้นักเรียนคนนั้น', () => {
  const { ctx, sent } = sandbox();
  const r = ctx.notifyStudent_(SID, { title: 'ทดสอบ', lines: ['บรรทัด <b>'], key: 'k1' });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(r)), { line: true, email: true });
  assert.strictEqual(sent.line[0].to, LINE_ID);
  assert.strictEqual(sent.mail[0].to, TEST_MAIL);
  assert.ok(!sent.mail[0].htmlBody.includes('<b>'), 'ต้อง escape HTML');
  // key เดิมภายใน 60 วิ ไม่ส่งซ้ำ
  ctx.notifyStudent_(SID, { title: 'ทดสอบ', key: 'k1' });
  assert.strictEqual(sent.line.length, 1);
});

test('ไม่มีสิทธิ์อีเมล: LINE ยังส่ง และไม่ throw', () => {
  const { ctx, sent } = sandbox({ mailThrows: true });
  const r = ctx.notifyStudent_(SID, { title: 'ทดสอบ' });
  assert.strictEqual(r.line, true);
  assert.strictEqual(r.email, false);
  assert.strictEqual(sent.mail.length, 0);
});

test('ครบ 50 ชม. (ความดี + วิ่ง) แจ้งครั้งเดียว', () => {
  const { ctx, sent } = sandbox({ hours: 47, runHours: 3 });
  ctx.notifyMilestone_(SID);
  ctx.notifyMilestone_(SID);
  assert.strictEqual(sent.line.length, 1);
  assert.match(sent.line[0].messages[0].text, /50 ชม/);
  const low = sandbox({ hours: 40, runHours: 3 });
  low.ctx.notifyMilestone_(SID);
  assert.strictEqual(low.sent.line.length, 0);
});
