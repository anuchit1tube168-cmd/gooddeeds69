// หมวด 10 วิ่งเพื่อสุขภาพ: คะแนนค่าพลัง + เพดานชั่วโมงตอนอนุมัติ (ข้อมูลสมมติทั้งหมด)
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const S = require('../frontend/strength.js');

const SYNTH_SID = '7000001'; // รหัสสมมติ ไม่ใช่รูปแบบรหัสจริง
const TODAY = new Date('2026-11-11T12:00:00+07:00');
const run = (o) => ({ status: 'approved', distanceKm: 5, durationMin: 30, date: '2026-11-10', approvedHours: 1, ...o });

test('pending runs never add power or hours', () => {
  const s = S.compute({ runs: [run({ status: 'pending', estimatedHours: 1 })], today: TODAY });
  assert.equal(s.score, 0); assert.equal(s.runHours, 0); assert.equal(s.pendingRuns, 1); assert.equal(s.pendingHours, 1);
});

test('score is bounded 0–1000 and level 1–10', () => {
  const many = Array.from({ length: 60 }, (_, i) => run({ distanceKm: 10, durationMin: 35, date: new Date(TODAY - i * 86400000).toISOString().slice(0, 10) }));
  const s = S.compute({ runs: many, fitness: [{ date: '2026-11-01', run2400Min: 9, pushups: 80, situps: 80 }], deedHours: 100, today: TODAY });
  assert.equal(s.score, 1000); assert.equal(s.level, 10); assert.equal(s.aura.key, 'divine');
  assert.equal(S.compute({}).level, 1);
});

test('speed counts only after 3 approved runs', () => {
  assert.equal(S.compute({ runs: [run(), run()], today: TODAY }).parts.speed, 0);
  assert.ok(S.compute({ runs: [run(), run(), run()], today: TODAY }).parts.speed > 0);
});

test('aura tiers follow merit hours (deed + approved run hours)', () => {
  assert.equal(S.compute({ deedHours: 9 }).aura.key, 'none');
  assert.equal(S.compute({ deedHours: 9, runs: [run({ approvedHours: 1 })], today: TODAY }).aura.key, 'mist');
  assert.equal(S.compute({ deedHours: 35 }).aura.key, 'gold');
});

test('formatPace and haversine', () => {
  assert.equal(S.formatPace(6), '6:00'); assert.equal(S.formatPace(5.5), '5:30'); assert.equal(S.formatPace(null), '–');
  const d = S.haversine({ lat: 13.9, lng: 100.6 }, { lat: 13.909, lng: 100.6 });
  assert.ok(d > 990 && d < 1010, String(d));
});

// ---------- GAS RunTracker.gs ใน sandbox พร้อม Sheet จำลอง ----------
function gasSandbox(rows, extraIds = []) {
  const sheets = {};
  const mkSheet = (name, values) => ({
    values,
    getDataRange() { return { getValues: () => this.values.map((r) => r.slice()) }; },
    getRange(r, c, nr = 1, nc = 1) { const sh = this; return {
      getValues: () => sh.values.slice(r - 1, r - 1 + nr).map((row) => row.slice(c - 1, c - 1 + nc)),
      setValues: (v) => v.forEach((row, i) => row.forEach((x, j) => { (sh.values[r - 1 + i] ||= [])[c - 1 + j] = x; })),
      clearContent() {}, setFontWeight() { return this; }, setBackground() { return this; }, setFontColor() { return this; } }; },
    appendRow(r) { this.values.push(r); }, getLastRow() { return this.values.length; }, setFrozenRows() {},
  });
  const ctx = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k === 'RUN_GATEWAY_KEY' ? 'k' : null) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    SpreadsheetApp: { flush() {} },
    Utilities: { formatDate: (d) => d.toISOString().slice(0, 10) },
    SHEETS: { STUDENTS: 'Main_2569' },
    legacySheetLiteral_: (v) => v,
    uploadImage: () => ({ status: 'success', url: 'https://drive.example/x' }),
    getSS: () => ({ getSheetByName: (n) => sheets[n] || null, insertSheet: (n) => (sheets[n] = mkSheet(n, [])) }),
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../backend/RunTracker.gs'), 'utf8'), ctx);
  sheets.Runs_2569 = mkSheet('Runs_2569', [vm.runInContext('RUN_HEADERS', ctx).slice(), ...rows]);
  sheets.Main_2569 = mkSheet('Main_2569', [['no', 'id'], [1, '7000001'], ...extraIds.map((id, i) => [i + 2, id])]);
  return { ctx, sheets };
}
const row = (id, date, km, status, approved = 0, extra = {}) => {
  const sid = extra.sid || '7000001', min = extra.min || km * 6;
  return [id, sid, date, km, min, Math.round((min / km) * 100) / 100, 'screenshot', 'u', '', status, 0, approved, '', '', '', new Date(), extra.type || 'personal', extra.event || ''];
};
const review = (ctx, runId) => ctx.runTrackerHandle_({ action: 'run_review', gatewayKey: 'k', runId, decision: 'approve', reviewer: 'T' });

test('gateway key is required (fail closed)', () => {
  const { ctx } = gasSandbox([]);
  assert.equal(ctx.runTrackerHandle_({ action: 'run_list' }).code, 'RUN_GATEWAY_DENIED');
  assert.equal(ctx.runTrackerHandle_({ action: 'run_list', gatewayKey: 'k' }).status, 'success');
});

test('10.1 rate: 10 km = 1 h, floor to 0.5, capped 1 h/day', () => {
  const { ctx } = gasSandbox([row('a', '2026-11-05', 7.4, 'pending'), row('b', '2026-11-06', 21, 'pending'), row('c', '2026-11-07', 4.9, 'pending')]);
  assert.equal(review(ctx, 'a').approvedHours, 0.5);
  const b = review(ctx, 'b'); assert.equal(b.approvedHours, 1); assert.match(b.capNote, /เพดาน/);
  assert.equal(review(ctx, 'c').approvedHours, 0);
});

test('10.1 second run on the same day gets nothing once daily cap is used', () => {
  const { ctx } = gasSandbox([row('a', '2026-11-10', 10, 'approved', 1), row('b', '2026-11-10', 12, 'pending')]);
  assert.equal(review(ctx, 'b').approvedHours, 0);
});

test('10.1 walking pace earns power but no hours', () => {
  const { ctx } = gasSandbox([row('w', '2026-11-08', 6, 'pending', 0, { min: 72 })]); // 12 นาที/กม.
  const r = review(ctx, 'w'); assert.equal(r.approvedHours, 0); assert.match(r.capNote, /เพซ/);
});

test('10.1 semester cap 3 h and year-4 annual cap 4 h', () => {
  const prior = [1, 2, 3].map((d) => row('p' + d, `2026-11-0${d}`, 10, 'approved', 1));
  const { ctx } = gasSandbox([...prior, row('x', '2026-11-09', 10, 'pending')]);
  assert.equal(review(ctx, 'x').approvedHours, 0);
  // ชั้นปี ≥ 4 (รหัสสมมติรุ่น 65): ภาค 1 ใช้ไป 3, ภาค 2 ใช้ได้อีกแค่ 1 ชม.
  const y4 = { sid: '6500001' };
  const p4 = [1, 2, 3].map((d) => row('q' + d, `2026-11-0${d}`, 10, 'approved', 1, y4));
  const { ctx: c4 } = gasSandbox([...p4, row('d1', '2026-12-05', 10, 'pending', 0, y4), row('d2', '2026-12-06', 10, 'pending', 0, y4)], ['6500001']);
  assert.equal(review(c4, 'd1').approvedHours, 1);
  assert.equal(review(c4, 'd2').approvedHours, 0);
});

test('10.2 event: 2 h each, max 2 events per semester, separate from personal cap', () => {
  const ev = (id, d) => row(id, d, 10, 'pending', 0, { type: 'event', event: 'งานวิ่งการกุศล' });
  const prior = [1, 2, 3].map((d) => row('p' + d, `2026-11-0${d}`, 10, 'approved', 1));
  const { ctx } = gasSandbox([...prior, ev('e1', '2026-11-04'), ev('e2', '2026-11-05'), ev('e3', '2026-11-06')]);
  assert.equal(review(ctx, 'e1').approvedHours, 2);
  assert.equal(review(ctx, 'e2').approvedHours, 2);
  const e3 = review(ctx, 'e3'); assert.equal(e3.approvedHours, 0); assert.match(e3.capNote, /โควตา/);
});

test('reject needs a reason and a run cannot be reviewed twice', () => {
  const { ctx } = gasSandbox([row('z', '2026-11-09', 5, 'pending')]);
  assert.equal(ctx.runTrackerHandle_({ action: 'run_review', gatewayKey: 'k', runId: 'z', decision: 'reject', reviewer: 'T' }).code, 'reject_reason_required');
  assert.equal(ctx.runTrackerHandle_({ action: 'run_review', gatewayKey: 'k', runId: 'z', decision: 'reject', reviewer: 'T', note: 'ภาพไม่ชัด' }).status, 'success');
  assert.equal(review(ctx, 'z').code, 'already_reviewed');
});

test('submit validates pace, evidence, event name and duplicates', () => {
  const { ctx } = gasSandbox([]);
  const today = new Date().toISOString().slice(0, 10);
  const base = { studentId: SYNTH_SID, date: today, distanceKm: 5, durationMin: 30, imageData: 'data:image/jpeg;base64,AA' };
  const sub = (run) => ctx.runTrackerHandle_({ action: 'run_submit', gatewayKey: 'k', run });
  assert.equal(sub({ ...base, durationMin: 5 }).code, 'pace_out_of_range');
  assert.equal(sub({ ...base, imageData: '' }).code, 'evidence_required');
  assert.equal(sub({ ...base, type: 'event' }).code, 'event_name_required');
  assert.equal(sub({ ...base, type: 'event', eventName: 'งานวิ่ง', distanceKm: 3, durationMin: 18 }).code, 'event_too_short');
  const ok = sub(base); assert.equal(ok.status, 'success'); assert.equal(ok.estimatedHours, 0.5);
  assert.equal(sub(base).code, 'duplicate_run');
});
