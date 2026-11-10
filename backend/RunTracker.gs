/**
 * RunTracker.gs — หมวด 10 "วิ่งเพื่อสุขภาพ" + ผลทดสอบสมรรถภาพ (ปีการศึกษา 2569)
 *
 * ฐานข้อมูลรายคน (คีย์ = รหัสนักเรียน 7 หลัก):
 *   Runs_2569      สมุดบันทึกการวิ่ง 1 แถว/ครั้ง (pending → approved/rejected)
 *   Fitness_2569   ผลทดสอบสมรรถภาพที่ผู้ตรวจบันทึก
 *   Run_Settings   ค่ากติกาที่แอดมินแก้ได้ (อัตรา กม./ชม., เพดาน, ช่วงภาคเรียน)
 * หลักฐานภาพเก็บใน Drive โฟลเดอร์รายคนเดียวกับความดีหมวด 1–9 (uploadImage ใน Code.gs)
 *
 * ทำไมไม่เขียนชั่วโมงลง Main_2569: คอลัมน์หมวดใน Main_2569 คำนวณจาก 6 + หมวด
 * หมวด 10 จะชนคอลัมน์ 16 ซึ่งเป็นยอดรวม จึงเก็บ ชม.วิ่งแยกใน Runs_2569 แล้วรวมตอนแสดงผล
 *
 * ความปลอดภัย: ทุก action ต้องส่ง gatewayKey ตรงกับ Script Property RUN_GATEWAY_KEY
 * (ตั้งโดยเจ้าของระบบ) เพราะ URL ของ Web App เป็นสาธารณะ — ถ้ายังไม่ตั้งค่าจะปฏิเสธทั้งหมด (fail closed)
 */

const RUN_SHEETS = { RUNS: 'Runs_2569', FITNESS: 'Fitness_2569', SETTINGS: 'Run_Settings' };
const RUN_HEADERS = [
  'Run ID', 'รหัสนักเรียน', 'วันที่วิ่ง', 'ระยะทาง (กม.)', 'เวลา (นาที)', 'เพซ (นาที/กม.)',
  'แหล่งข้อมูล', 'หลักฐาน URL', 'สรุป GPS', 'สถานะ', 'ชม.ประเมินตอนส่ง', 'ชม.ที่อนุมัติ',
  'ผู้ตรวจ', 'วันที่ตรวจ', 'หมายเหตุผู้ตรวจ', 'วันที่ส่ง', 'ประเภท', 'ชื่องานวิ่ง'
];
const FITNESS_HEADERS = [
  'Record ID', 'รหัสนักเรียน', 'วันที่ทดสอบ', 'ภาคเรียน', 'วิ่ง 2.4 กม. (นาที)',
  'ดันพื้น (ครั้ง/2 นาที)', 'ลุกนั่ง (ครั้ง/2 นาที)', 'ผู้บันทึก', 'บันทึกเมื่อ'
];
// ค่าเริ่มต้น — แอดมินแก้ได้ในหน้า run-admin.html (ยืนยันกับระเบียบวิทยาลัยก่อนใช้จริง)
const RUN_DEFAULT_SETTINGS = {
  academicYear: 2569,
  // 10.1 วิ่งส่วนตัว — เทียบหมวด 7 (ทำเองโดยไม่มีคำสั่ง) จึงให้น้อยกว่างานจิตอาสาจริง
  kmPerHour: 10,           // 10 กม. ≈ 60–70 นาทีของการวิ่งจริง = 1 ชม. (ปัดลงทีละ 0.5 → ขั้นต่ำ 5 กม. = 0.5 ชม.)
  maxPaceForHours: 10,     // ช้ากว่า 10 นาที/กม. ถือเป็นการเดิน: บันทึกค่าพลังได้ แต่ไม่ได้ชั่วโมง
  maxHoursPerDay: 1,
  maxHoursPerSemester: 3,
  maxHoursPerYear: 6,
  maxHoursPerYearYear4: 4, // ชั้นปี 4 มีภาคเรียนน้อยกว่า (สอดคล้องโควตาหมวด 6–7)
  // 10.2 งานวิ่ง/วิ่งการกุศลที่มีผู้จัด (มีเบอร์วิ่ง/ใบประกาศ) — ถ้ามีคำสั่ง วพอ. ให้ลงหมวด 2 แทน
  eventHours: 2,
  eventMinKm: 5,
  maxEventsPerSemester: 2,
  // การตรวจความสมเหตุสมผล
  maxKmPerRun: 42.2,
  minPaceMinPerKm: 3,      // เร็วกว่านี้ถือว่าผิดปกติ (เช่น ปั่นจักรยาน/นั่งรถ)
  maxPaceMinPerKm: 20,
  maxSubmitAgeDays: 7,
  // ตาม SOP-GD-05: ภาค 1 = 1 ก.ค.–30 พ.ย., ภาค 2 = 1 ธ.ค.–30 มิ.ย.
  semesters: [
    { term: '1/2569', start: '2026-07-01', end: '2026-11-30' },
    { term: '2/2569', start: '2026-12-01', end: '2027-06-30' }
  ]
};

function runTrackerHandle_(data) {
  try {
    const expected = PropertiesService.getScriptProperties().getProperty('RUN_GATEWAY_KEY');
    if (!expected || String(data.gatewayKey || '') !== expected) return { status: 'error', code: 'RUN_GATEWAY_DENIED' };
    switch (data.action) {
      case 'run_submit': return runSubmit_(data.run || {});
      case 'run_list': return runList_(data.studentId);
      case 'run_review': return runReview_(data);
      case 'fitness_save': return fitnessSave_(data.record || {});
      case 'run_settings_get': return { status: 'success', settings: runSettings_() };
      case 'run_settings_set': return runSettingsSet_(data.settings || {});
      default: return { status: 'error', code: 'RUN_ACTION_UNKNOWN' };
    }
  } catch (err) {
    return { status: 'error', code: 'RUN_INTERNAL', message: String(err && err.message || err).slice(0, 200) };
  }
}

function runSheet_(name, headers) {
  const ss = getSS();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#0a1628').setFontColor('#c9a227');
    sh.setFrozenRows(1);
  }
  const head = sh.getRange(1, 1, 1, headers.length).getValues()[0].map(String);
  if (head.join('|') !== headers.join('|')) throw new Error('schema_mismatch:' + name);
  return sh;
}

function runSettings_() {
  const sh = runSheet_(RUN_SHEETS.SETTINGS, ['key', 'value']);
  const out = JSON.parse(JSON.stringify(RUN_DEFAULT_SETTINGS));
  sh.getDataRange().getValues().slice(1).forEach(function (r) {
    if (!r[0] || !(r[0] in out)) return;
    try { out[r[0]] = JSON.parse(r[1]); } catch (_) {}
  });
  return out;
}

function runSettingsSet_(incoming) {
  const cur = runSettings_();
  const num = function (v, lo, hi) { v = Number(v); return Number.isFinite(v) && v >= lo && v <= hi ? v : null; };
  const rules = { academicYear: [2560, 2700], kmPerHour: [1, 50], maxPaceForHours: [4, 20], maxHoursPerDay: [0, 8],
    maxHoursPerSemester: [0, 50], maxHoursPerYear: [0, 100], maxHoursPerYearYear4: [0, 100], eventHours: [0, 8], eventMinKm: [1, 42.2],
    maxEventsPerSemester: [0, 10], maxKmPerRun: [1, 100], minPaceMinPerKm: [1, 10], maxPaceMinPerKm: [5, 60], maxSubmitAgeDays: [0, 60] };
  Object.keys(rules).forEach(function (k) {
    if (incoming[k] === undefined) return;
    const v = num(incoming[k], rules[k][0], rules[k][1]);
    if (v === null) throw new Error('invalid_setting:' + k);
    cur[k] = v;
  });
  if (Array.isArray(incoming.semesters)) {
    incoming.semesters.forEach(function (s) {
      if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s.start) || !/^\d{4}-\d{2}-\d{2}$/.test(s.end) || s.start > s.end) throw new Error('invalid_semester');
    });
    cur.semesters = incoming.semesters.map(function (s) { return { term: String(s.term).slice(0, 20), start: s.start, end: s.end }; });
  }
  const sh = runSheet_(RUN_SHEETS.SETTINGS, ['key', 'value']);
  const rows = Object.keys(cur).map(function (k) { return [k, JSON.stringify(cur[k])]; });
  sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 2).clearContent();
  sh.getRange(2, 1, rows.length, 2).setValues(rows);
  return { status: 'success', settings: cur };
}

function runSemesterOf_(dateStr, settings) {
  const s = (settings.semesters || []).filter(function (x) { return dateStr >= x.start && dateStr <= x.end; })[0];
  return s ? s.term : '';
}

function runHoursFromKm_(km, settings) {
  // ปัดลงทีละครึ่งชั่วโมง ให้สอดคล้องกับหมวด 1–9 ที่บันทึกเป็นช่วง 0.5 ชม.
  return Math.floor((km / settings.kmPerHour) * 2) / 2;
}

function runEstimate_(run, settings) {
  if (run.type === 'event') return run.distanceKm >= settings.eventMinKm ? settings.eventHours : 0;
  if (run.paceMinPerKm > settings.maxPaceForHours) return 0;
  return runHoursFromKm_(run.distanceKm, settings);
}

function runYearLevel_(studentId, settings) {
  // ชั้นปี = ปีการศึกษา 2 หลัก − รุ่น + 1 (เช่น ปี 2569 รุ่น 66 = ชั้นปี 4)
  return (settings.academicYear % 100) - Number(String(studentId).slice(0, 2)) + 1;
}

function runInAcademicYear_(dateStr, settings) {
  const sem = settings.semesters || [];
  return sem.length > 0 && dateStr >= sem[0].start && dateStr <= sem[sem.length - 1].end;
}

function runRows_() {
  const sh = runSheet_(RUN_SHEETS.RUNS, RUN_HEADERS);
  return { sheet: sh, values: sh.getDataRange().getValues() };
}

function runToObj_(r) {
  const d = r[2] instanceof Date ? Utilities.formatDate(r[2], 'Asia/Bangkok', 'yyyy-MM-dd') : String(r[2]);
  return { id: String(r[0]), studentId: String(r[1]), date: d, distanceKm: Number(r[3]), durationMin: Number(r[4]),
    paceMinPerKm: Number(r[5]), source: String(r[6]), evidenceUrl: String(r[7]), gps: String(r[8]),
    status: String(r[9]), estimatedHours: Number(r[10]) || 0, approvedHours: Number(r[11]) || 0,
    reviewer: String(r[12]), reviewedAt: r[13] ? new Date(r[13]).toISOString() : '', reviewNote: String(r[14]),
    submittedAt: r[15] ? new Date(r[15]).toISOString() : '',
    type: String(r[16] || 'personal') === 'event' ? 'event' : 'personal', eventName: String(r[17] || '') };
}

function runSubmit_(run) {
  const settings = runSettings_();
  const sid = String(run.studentId || '').trim();
  const km = Math.round(Number(run.distanceKm) * 100) / 100;
  const min = Math.round(Number(run.durationMin) * 10) / 10;
  const date = String(run.date || '');
  const source = run.source === 'gps' ? 'gps' : 'screenshot';
  const type = run.type === 'event' ? 'event' : 'personal';
  const eventName = String(run.eventName || '').trim().slice(0, 150);
  const today = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
  if (!/^\d{7}$/.test(sid)) return { status: 'error', code: 'invalid_student' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) return { status: 'error', code: 'invalid_date' };
  const ageDays = (new Date(today) - new Date(date)) / 86400000;
  if (ageDays > settings.maxSubmitAgeDays) return { status: 'error', code: 'too_old' };
  if (!(km >= 0.5 && km <= settings.maxKmPerRun)) return { status: 'error', code: 'invalid_distance' };
  if (!(min > 0 && min <= 600)) return { status: 'error', code: 'invalid_duration' };
  const pace = Math.round((min / km) * 100) / 100;
  if (pace < settings.minPaceMinPerKm || pace > settings.maxPaceMinPerKm) return { status: 'error', code: 'pace_out_of_range', pace: pace };
  if (!run.imageData) return { status: 'error', code: 'evidence_required' };
  if (type === 'event' && eventName.length < 3) return { status: 'error', code: 'event_name_required' };
  if (type === 'event' && km < settings.eventMinKm) return { status: 'error', code: 'event_too_short', minKm: settings.eventMinKm };

  // ยืนยันว่ามีนักเรียนคนนี้จริงใน Main_2569
  const master = getSS().getSheetByName(SHEETS.STUDENTS);
  const ids = master ? master.getRange(2, 2, Math.max(master.getLastRow() - 1, 1), 1).getValues().map(function (r) { return String(r[0]); }) : [];
  if (ids.indexOf(sid) === -1) return { status: 'error', code: 'student_not_found' };

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const t = runRows_();
    const dup = t.values.slice(1).some(function (r) {
      const o = runToObj_(r);
      return o.studentId === sid && o.date === date && Math.abs(o.distanceKm - km) < 0.01 && o.status !== 'rejected';
    });
    if (dup) return { status: 'error', code: 'duplicate_run' };
    const up = uploadImage({ base64: run.imageData, studentId: sid, studentName: String(run.studentName || '').slice(0, 80),
      filename: 'run_' + date + '_' + km + 'km_' + Date.now() + '.jpg' });
    if (!up || up.status !== 'success') return { status: 'error', code: 'evidence_upload_failed' };
    const id = 'run_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const gps = source === 'gps' ? String(run.gpsSummary || '').slice(0, 1000) : '';
    const est = runEstimate_({ type: type, distanceKm: km, paceMinPerKm: pace }, settings);
    t.sheet.appendRow([id, sid, legacySheetLiteral_(date), km, min, pace, source, up.url, legacySheetLiteral_(gps),
      'pending', est, 0, '', '', '', new Date(), type, legacySheetLiteral_(eventName)]);
    SpreadsheetApp.flush();
    return { status: 'success', id: id, estimatedHours: est, pace: pace, type: type };
  } finally {
    lock.releaseLock();
  }
}

function runList_(studentId) {
  const sid = studentId ? String(studentId).trim() : '';
  if (sid && !/^\d{7}$/.test(sid)) return { status: 'error', code: 'invalid_student' };
  const runs = runRows_().values.slice(1).map(runToObj_).filter(function (o) { return !sid || o.studentId === sid; });
  const fsh = runSheet_(RUN_SHEETS.FITNESS, FITNESS_HEADERS);
  const fitness = fsh.getDataRange().getValues().slice(1).map(function (r) {
    return { id: String(r[0]), studentId: String(r[1]),
      date: r[2] instanceof Date ? Utilities.formatDate(r[2], 'Asia/Bangkok', 'yyyy-MM-dd') : String(r[2]),
      term: String(r[3]), run2400Min: Number(r[4]) || null, pushups: Number(r[5]) || null, situps: Number(r[6]) || null, recorder: String(r[7]) };
  }).filter(function (o) { return !sid || o.studentId === sid; });
  return { status: 'success', runs: runs, fitness: fitness, settings: runSettings_() };
}

function runReview_(data) {
  const decision = data.decision === 'approve' ? 'approve' : (data.decision === 'reject' ? 'reject' : '');
  const reviewer = String(data.reviewer || '').trim().slice(0, 120);
  if (!decision || !reviewer) return { status: 'error', code: 'invalid_review' };
  if (decision === 'reject' && !String(data.note || '').trim()) return { status: 'error', code: 'reject_reason_required' };
  const settings = runSettings_();
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const t = runRows_();
    const idx = t.values.findIndex(function (r, i) { return i > 0 && String(r[0]) === String(data.runId); });
    if (idx < 1) return { status: 'error', code: 'run_not_found' };
    const run = runToObj_(t.values[idx]);
    if (run.status !== 'pending') return { status: 'error', code: 'already_reviewed', current: run.status };
    let hours = 0, capNote = '';
    if (decision === 'approve') {
      // เพดานคิดจากรายการที่อนุมัติแล้วเท่านั้น ณ เวลาที่ตรวจ จึงไม่มีทางเกินเพดาน
      const term = runSemesterOf_(run.date, settings);
      const mine = t.values.slice(1).map(runToObj_).filter(function (o) { return o.studentId === run.studentId && o.status === 'approved' && o.type === run.type; });
      const sum = function (list) { return list.reduce(function (a, o) { return a + o.approvedHours; }, 0); };
      const inTerm = term ? mine.filter(function (o) { return runSemesterOf_(o.date, settings) === term; }) : [];
      const base = runEstimate_(run, settings);
      if (run.type === 'event') {
        hours = !term ? 0 : (inTerm.filter(function (o) { return o.approvedHours > 0; }).length >= settings.maxEventsPerSemester ? 0 : base);
        if (!term) capNote = 'วันที่ไม่อยู่ในภาคเรียนที่กำหนด';
        else if (hours < base) capNote = 'ครบโควตางานวิ่ง ' + settings.maxEventsPerSemester + ' งาน/ภาคแล้ว';
        else if (base === 0) capNote = 'ระยะต่ำกว่า ' + settings.eventMinKm + ' กม.';
      } else {
        const yearCap = runYearLevel_(run.studentId, settings) >= 4 ? settings.maxHoursPerYearYear4 : settings.maxHoursPerYear;
        const dayUsed = sum(mine.filter(function (o) { return o.date === run.date; }));
        const yearUsed = sum(mine.filter(function (o) { return runInAcademicYear_(o.date, settings); }));
        hours = !term ? 0 : Math.max(0, Math.min(base, settings.maxHoursPerDay - dayUsed, settings.maxHoursPerSemester - sum(inTerm), yearCap - yearUsed));
        hours = Math.floor(hours * 2) / 2;
        if (!term) capNote = 'วันที่ไม่อยู่ในภาคเรียนที่กำหนด';
        else if (base === 0) capNote = run.paceMinPerKm > settings.maxPaceForHours ? 'เพซช้ากว่า ' + settings.maxPaceForHours + ' นาที/กม. (นับค่าพลังแต่ไม่ได้ชั่วโมง)' : 'ระยะไม่ถึงขั้นต่ำ';
        else if (hours < base) capNote = 'ตัดตามเพดาน (คำนวณได้ ' + base + ' ชม.)';
      }
    }
    const row = idx + 1;
    t.sheet.getRange(row, 10, 1, 6).setValues([[decision === 'approve' ? 'approved' : 'rejected', run.estimatedHours, hours,
      reviewer, new Date(), legacySheetLiteral_([String(data.note || '').trim(), capNote].filter(String).join(' | ').slice(0, 500))]]);
    SpreadsheetApp.flush();
    return { status: 'success', runId: run.id, decision: decision, approvedHours: hours, capNote: capNote, studentId: run.studentId };
  } finally {
    lock.releaseLock();
  }
}

function fitnessSave_(rec) {
  const sid = String(rec.studentId || '').trim();
  const date = String(rec.date || '');
  const n = function (v, lo, hi) { if (v === '' || v === null || v === undefined) return ''; v = Number(v); return Number.isFinite(v) && v >= lo && v <= hi ? v : NaN; };
  const run = n(rec.run2400Min, 6, 40), push = n(rec.pushups, 0, 200), sit = n(rec.situps, 0, 200);
  if (!/^\d{7}$/.test(sid) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { status: 'error', code: 'invalid_fitness' };
  if ([run, push, sit].some(function (v) { return typeof v === 'number' && isNaN(v); })) return { status: 'error', code: 'invalid_fitness_value' };
  if (run === '' && push === '' && sit === '') return { status: 'error', code: 'empty_fitness' };
  const recorder = String(rec.recorder || '').trim().slice(0, 120);
  if (!recorder) return { status: 'error', code: 'recorder_required' };
  const sh = runSheet_(RUN_SHEETS.FITNESS, FITNESS_HEADERS);
  const id = 'fit_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  sh.appendRow([id, sid, legacySheetLiteral_(date), runSemesterOf_(date, runSettings_()), run, push, sit, recorder, new Date()]);
  return { status: 'success', id: id };
}
