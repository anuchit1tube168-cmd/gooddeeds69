// เพดานชั่วโมง/การลงซ้ำ ตามข้อกำหนดฯ ๒๕๖๙ + รายงานตรวจรายสัปดาห์
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const SID = String(7000000 + 11);
const SID2 = String(7000000 + 12);
const NOW = new Date('2026-11-17T03:00:00Z'); // 17 พ.ย. 2569 (ภาค 1/2569)
const rules = () => import(path.join(__dirname, '../functions/api/_deed_rules.js'));
const d = (id, cat, date, hours, extra = {}) => ({ id, studentId: SID, categoryId: cat, activityDate: date, hours, description: 'กิจกรรม ' + id, status: 'pending', ...extra });

test('แปลงวันที่จากชีต/ISO/พ.ศ. เป็นวันที่ไทย', async () => {
  const { normDate, termOf } = await rules();
  assert.strictEqual(normDate('2026-11-17'), '2026-11-17');
  assert.strictEqual(normDate('2569-11-17'), '2026-11-17');
  assert.strictEqual(normDate('2026-11-16T17:00:00.000Z'), '2026-11-17');
  assert.strictEqual(normDate('Tue Nov 17 2026 00:00:00 GMT+0700 (Indochina Time)'), '2026-11-17');
  assert.strictEqual(normDate('ไม่ใช่วันที่'), '');
  assert.deepStrictEqual(termOf('2026-11-30'), { academicYear: 2569, semester: 1 });
  assert.deepStrictEqual(termOf('2026-12-01'), { academicYear: 2569, semester: 2 });
  assert.deepStrictEqual(termOf('2027-06-30'), { academicYear: 2569, semester: 2 });
  assert.deepStrictEqual(termOf('2027-07-01'), { academicYear: 2570, semester: 1 });
});

test('หมวด 7 ช่วยครอบครัว: 1 ชม./ครั้ง · 2 ชม./ภาค · ครบแล้วห้ามลงเพิ่ม', async () => {
  const { checkDeed } = await rules();
  const ex = [d('a', 7, '2026-11-01', 1), d('b', 7, '2026-11-08', 1)];
  const full = checkDeed(ex, { categoryId: 7, hours: 1, activityDate: '2026-11-15', description: 'ล้างจาน' }, NOW);
  assert.strictEqual(full.ok, false);
  assert.strictEqual(full.code, 'TERM_CAP');
  assert.match(full.message, /ครบ 2 ชม\. แล้ว ห้ามบันทึกเพิ่ม/);
  assert.strictEqual(checkDeed([], { categoryId: 7, hours: 2, activityDate: '2026-11-15', description: 'x' }, NOW).code, 'PER_ENTRY');
  // ภาคใหม่ลงได้ แต่รวมทั้งปีไม่เกิน 4
  const ok = checkDeed(ex, { categoryId: 7, hours: 1, activityDate: '2026-12-05', description: 'กวาดบ้าน' }, new Date('2026-12-06T03:00:00Z'));
  assert.strictEqual(ok.ok, true);
  const year = [...ex, d('c', 7, '2026-12-01', 1), d('e', 7, '2026-12-08', 1)];
  assert.strictEqual(checkDeed(year, { categoryId: 7, hours: 1, activityDate: '2026-12-20', description: 'y' }, new Date('2026-12-21T03:00:00Z')).code, 'TERM_CAP');
  // ไม่อนุมัติไม่นับโควตา
  const rej = [d('a', 7, '2026-11-01', 1, { status: 'rejected' }), d('b', 7, '2026-11-08', 1)];
  assert.strictEqual(checkDeed(rej, { categoryId: 7, hours: 1, activityDate: '2026-11-15', description: 'z' }, NOW).ok, true);
});

test('หมวด 6 ศาสนสถาน: 1 ชม./ครั้ง · 4 ชม./ปี', async () => {
  const { checkDeed } = await rules();
  const ex = ['2026-07-05', '2026-08-05', '2026-09-05', '2026-10-05'].map((x, i) => d('r' + i, 6, x, 1));
  const r = checkDeed(ex, { categoryId: 6, hours: 1, activityDate: '2026-11-10', description: 'กวาดลานวัด' }, NOW);
  assert.strictEqual(r.code, 'YEAR_CAP');
  assert.match(r.message, /บันทึกครบ 4 ชม\. แล้ว ห้ามบันทึกเพิ่ม/);
});

test('ลงซ้ำหมวดเดียวกันวันเดียวกัน → บล็อก · ข้อความเหมือนเดิมต่างวัน → เตือน', async () => {
  const { checkDeed } = await rules();
  const ex = [d('a', 3, '2026-11-10', 2, { description: 'ช่วยจัดห้องประชุม ชั้น 3' })];
  const dup = checkDeed(ex, { categoryId: 3, hours: 1, activityDate: '2026-11-10', description: 'อย่างอื่น' }, NOW);
  assert.strictEqual(dup.code, 'DUPLICATE');
  const warn = checkDeed(ex, { categoryId: 3, hours: 2, activityDate: '2026-11-12', description: 'ช่วยจัดห้องประชุม  ชั้น 3' }, NOW);
  assert.strictEqual(warn.ok, true);
  assert.strictEqual(warn.warnings.length, 1);
  assert.strictEqual(checkDeed(ex, { categoryId: 3, hours: 9, activityDate: '2026-11-11', description: 'x' }, NOW).code, 'DAY_CAP');
  assert.strictEqual(checkDeed([], { categoryId: 3, hours: 1, activityDate: '2026-12-25', description: 'x' }, NOW).code, 'DATE_FUTURE');
});

test('บริจาคโลหิต: ห่าง 90 วัน และไม่เกิน 4 ครั้ง/ปี', async () => {
  const { checkDeed } = await rules();
  assert.strictEqual(checkDeed([d('a', 1, '2026-09-01', 8)], { categoryId: 1, hours: 8, activityDate: '2026-11-01', description: 'x' }, NOW).code, 'BLOOD_SPACING');
  assert.strictEqual(checkDeed([d('a', 1, '2026-07-01', 8)], { categoryId: 1, hours: 8, activityDate: '2026-11-01', description: 'x' }, NOW).ok, true);
});

test('รายงานตรวจ: ซ้ำ เกินเพดาน ข้อมูลผิด และข้อความเหมือนกันหลายคน', async () => {
  const { auditDeeds } = await rules();
  const deeds = [
    d('1', 7, '2026-11-01', 1), d('2', 7, '2026-11-01', 1), d('3', 7, '2026-11-03', 1), // ซ้ำ + เกิน 2 ชม./ภาค
    d('4', 6, '', 1),                                                                  // ไม่มีวันที่
    { id: '5', studentId: SID, categoryId: 6, activityDate: '2026-11-05', hours: 1, description: 'ช่วยทำความสะอาดวัดใกล้บ้าน', location: 'วัดเดียวกัน', status: 'approved' },
    { id: '6', studentId: SID2, categoryId: 6, activityDate: '2026-11-05', hours: 1, description: 'ช่วยทำความสะอาดวัดใกล้บ้าน', location: 'วัดเดียวกัน', status: 'pending' },
  ];
  const r = auditDeeds(deeds, { academicYear: 2569, now: NOW });
  assert.strictEqual(r.totals.duplicates, 1);
  assert.ok(r.overCap.some(o => o.categoryId === 7 && o.scope === 'ภาค 1/2569' && o.hours === 3));
  assert.ok(r.invalid.length >= 0);
  assert.strictEqual(r.sharedActivities.length, 1);
  assert.strictEqual(r.sharedActivities[0].suspicious, true);
  assert.deepStrictEqual(r.sharedActivities[0].students, [SID, SID2].sort());
  const all = auditDeeds(deeds, { now: NOW });
  assert.ok(all.invalid.some(i => i.issues.includes('ไม่มีวันที่/วันที่อ่านไม่ได้')));
});

test('submit_deed: เกินโควตา → 409 และไม่ส่งต่อ Apps Script', async () => {
  const api = await import(path.join(__dirname, '../functions/api/submit_deed.js'));
  const posts = [];
  global.fetch = async (u, o = {}) => {
    const b = o.body ? JSON.parse(o.body) : {};
    if (b.action === 'getDeeds') return new Response(JSON.stringify([d('a', 7, '2026-11-01', 1), d('b', 7, '2026-11-08', 1)]));
    posts.push(u); return new Response(JSON.stringify({ status: 'success' }));
  };
  const body = { studentId: SID, categoryId: 7, hours: 1, activityDate: '2026-11-15', description: 'ช่วยแม่ทำกับข้าว' };
  const r = await api.onRequestPost({ request: new Request('https://x.test/api/submit_deed', { method: 'POST', body: JSON.stringify(body) }), env: { GAS_URL: 'https://gas.invalid/exec' } });
  assert.strictEqual(r.status, 409);
  const j = await r.json();
  assert.strictEqual(j.code, 'TERM_CAP');
  assert.strictEqual(posts.length, 0);
});

test('deed_check: ดูได้เฉพาะของตัวเอง และบอกโควตาคงเหลือ', async () => {
  const api = await import(path.join(__dirname, '../functions/api/deed_check.js'));
  global.fetch = async () => new Response(JSON.stringify([d('a', 7, '2026-11-01', 1)]));
  const url = `https://x.test/api/deed_check?studentId=${SID}&categoryId=7&hours=0&activityDate=2026-11-15`;
  const denied = await api.onRequestGet({ request: new Request(url), env: {} });
  assert.strictEqual(denied.status, 403);
  const r = await api.onRequestGet({ request: new Request(url, { headers: { 'X-GoodDeeds-Student-Id': SID } }), env: {} });
  const j = await r.json();
  assert.strictEqual(j.usage.termHours, 1);
  assert.strictEqual(j.usage.remainingTerm, 1);
});

test('deed_audit: ต้องมีรหัสผู้ตรวจหรือ gatewayKey', async () => {
  const api = await import(path.join(__dirname, '../functions/api/deed_audit.js'));
  global.fetch = async () => new Response(JSON.stringify([d('a', 7, '2026-11-01', 1)]));
  const env = { RUN_ADMIN_KEY: 'a'.repeat(32), RUN_GATEWAY_KEY: 'g'.repeat(32) };
  assert.strictEqual((await api.onRequestGet({ request: new Request('https://x.test/api/deed_audit'), env })).status, 403);
  const ok = await api.onRequestGet({ request: new Request('https://x.test/api/deed_audit?academicYear=2569', { headers: { 'X-Admin-Key': 'a'.repeat(32) } }), env });
  assert.strictEqual(ok.status, 200);
  const viaGas = await api.onRequestPost({ request: new Request('https://x.test/api/deed_audit', { method: 'POST', body: JSON.stringify({ gatewayKey: 'g'.repeat(32) }) }), env });
  assert.strictEqual(viaGas.status, 200);
  const txt = api.telegramText((await (await api.onRequestGet({ request: new Request('https://x.test/api/deed_audit?academicYear=2569', { headers: { 'X-Admin-Key': 'a'.repeat(32) } }), env })).json()).report);
  assert.match(txt, /รายงานตรวจความดีประจำสัปดาห์/);
});

test('get_all_deeds: คนทั่วไปได้แค่ตัวเลข · อาจารย์ได้รายการเต็ม · Apps Script ต้องได้ gatewayKey', async () => {
  const api = await import(path.join(__dirname, '../functions/api/get_all_deeds.js'));
  const sent = [];
  global.fetch = async (u, o = {}) => { sent.push(JSON.parse(o.body)); return new Response(JSON.stringify([d('a', 6, '2026-11-01', 1, { location: 'วัด', imageUrl: 'x', approver: 'y' })])); };
  const env = { RUN_ADMIN_KEY: 'a'.repeat(32), RUN_GATEWAY_KEY: 'g'.repeat(32) };
  const pub = await (await api.onRequestGet({ request: new Request('https://x.test/api/get_all_deeds'), env })).json();
  assert.strictEqual(pub[0].description, undefined);
  assert.strictEqual(pub[0].location, undefined);
  assert.strictEqual(pub[0].hours, 1);
  assert.strictEqual(sent[0].gatewayKey, 'g'.repeat(32));
  const full = await (await api.onRequestGet({ request: new Request('https://x.test/api/get_all_deeds', { headers: { 'X-Admin-Key': 'a'.repeat(32) } }), env })).json();
  assert.strictEqual(full[0].description, 'กิจกรรม a');
});

test('get_deeds: รายละเอียดเต็มเฉพาะเจ้าของหรืออาจารย์', async () => {
  const api = await import(path.join(__dirname, '../functions/api/get_deeds.js'));
  global.fetch = async () => new Response(JSON.stringify([d('a', 6, '2026-11-01', 1)]));
  const env = { RUN_ADMIN_KEY: 'a'.repeat(32), RUN_GATEWAY_KEY: 'g'.repeat(32) };
  const url = 'https://x.test/api/get_deeds?student_id=' + SID;
  assert.strictEqual((await api.onRequestGet({ request: new Request(url), env })).status, 403);
  assert.strictEqual((await api.onRequestGet({ request: new Request(url, { headers: { 'X-GoodDeeds-Student-Id': SID2 } }), env })).status, 403);
  const own = await api.onRequestGet({ request: new Request(url, { headers: { 'X-GoodDeeds-Student-Id': SID } }), env });
  assert.strictEqual((await own.json())[0].description, 'กิจกรรม a');
});

test('รูปหลักฐานซ้ำ: ไฟล์เดียวกันหลายรายการ แยกคนเดียว/ต่างคน', async () => {
  const { photoDuplicates } = await rules();
  const deeds = [d('a', 3, '2026-11-01', 2), d('b', 3, '2026-11-02', 2), { ...d('c', 3, '2026-11-03', 2), studentId: SID2 }, d('x', 3, '2026-11-04', 2, { status: 'rejected' })];
  const photos = [
    { deedId: 'a', studentId: SID, hash: 'h1' }, { deedId: 'b', studentId: SID, hash: 'h1' },
    { deedId: 'c', studentId: SID2, hash: 'h1' }, { deedId: 'x', studentId: SID, hash: 'h2' }, { deedId: 'y', studentId: SID, hash: 'h3' },
  ];
  const g = photoDuplicates(photos, deeds);
  assert.strictEqual(g.length, 1);
  assert.strictEqual(g[0].count, 3);
  assert.strictEqual(g[0].crossStudent, true);
});

test('แจ้งเตือน นพอ. จากรายงาน: คนละ 1 ข้อความ รวมทุกเรื่อง', async () => {
  const api = await import(path.join(__dirname, '../functions/api/deed_audit.js'));
  const { auditDeeds } = await rules();
  const r = auditDeeds([d('1', 7, '2026-11-01', 1), d('2', 7, '2026-11-01', 1), d('3', 7, '2026-11-03', 1)], { academicYear: 2569, now: NOW });
  r.duplicatePhotos = [];
  const items = api.studentNotices(r);
  assert.strictEqual(items.length, 1);
  assert.strictEqual(items[0].studentId, SID);
  assert.ok(items[0].lines.some(l => l.includes('ลงซ้ำ')));
  assert.ok(items[0].lines.some(l => l.includes('เกินเพดาน')));
});
