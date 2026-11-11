/**
 * ProfileStore.gs — ข้อมูลส่วนตัวนักเรียนรายคน (เก็บบนเซิร์ฟเวอร์ ใช้ได้ทุกอุปกรณ์)
 *
 * Profiles_2569  1 แถว/คน (คีย์ = รหัสนักเรียน) : ชื่อเล่น วันเกิด จังหวัด กรุ๊ปเลือด งานอดิเรก แนะนำตัว อีเมล Telegram
 * profile_admin_update แก้ ยศ/ชื่อ/นามสกุล/รุ่น ใน Main_2569 (ผู้ตรวจเท่านั้น — ตรวจ admin key ที่ Cloudflare)
 *
 * เรียกผ่าน runTrackerHandle_ (ตรวจ gatewayKey แล้ว) — ไม่มีทางเข้าตรงจาก URL สาธารณะ
 * ไม่เก็บรหัสผ่านในชีต (ชีตเปิดดูได้หลายคน)
 */
const PROFILE_SHEET = 'Profiles_2569';
const PROFILE_HEADERS = ['รหัสประจำตัว', 'ชื่อเล่น', 'วันเกิด', 'จังหวัด', 'กรุ๊ปเลือด', 'งานอดิเรก', 'แนะนำตัว',
  'อีเมล', 'Telegram Chat ID', 'แก้ไขล่าสุด', 'แก้ไขโดย'];
// ชื่อฟิลด์ → [index คอลัมน์ (0-based), ความยาวสูงสุด]
const PROFILE_FIELDS = {
  nickname: [1, 40], dob: [2, 10], province: [3, 60], blood: [4, 3], hobby: [5, 200], bio: [6, 600],
  email: [7, 120], telegramChatId: [8, 30]
};
const PROFILE_RANKS = ['นพอ.', 'นพอ.หญิง', 'นักเรียนพยาบาล', 'จ.ต.หญิง', 'พ.อ.ท.หญิง', 'ร.ต.หญิง'];

function profileValidSid_(sid) {
  return /^\d{7}$/.test(String(sid || '').trim());
}

// ตรวจรูปแบบทีละฟิลด์ — คืน '' ถ้าค่าว่าง, null ถ้ารูปแบบผิด
function profileClean_(key, v) {
  const max = PROFILE_FIELDS[key][1];
  let t = String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
  if (!t) return '';
  if (t.length > max) t = t.slice(0, max);
  if (key === 'dob' && !/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  if (key === 'blood' && ['A', 'B', 'AB', 'O'].indexOf(t) < 0) return null;
  if (key === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return null;
  if (key === 'telegramChatId' && !/^-?\d{4,20}$/.test(t)) return null;
  return t;
}

function profileRowToObj_(r) {
  const o = { student_id: String(r[0]) };
  Object.keys(PROFILE_FIELDS).forEach(function (k) {
    let v = r[PROFILE_FIELDS[k][0]];
    if (v instanceof Date) v = Utilities.formatDate(v, 'Asia/Bangkok', 'yyyy-MM-dd');
    o[k] = String(v == null ? '' : v).replace(/^'/, '');
  });
  o.updated_at = r[9] instanceof Date ? r[9].toISOString() : String(r[9] || '');
  return o;
}

function profileFind_(sh, sid) {
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]).trim() === sid) return i + 2;
  return -1;
}

function profileGet_(studentId) {
  const sid = String(studentId || '').trim();
  if (!profileValidSid_(sid)) return { status: 'error', code: 'PROFILE_BAD_ID' };
  const sh = runSheet_(PROFILE_SHEET, PROFILE_HEADERS);
  const row = profileFind_(sh, sid);
  if (row < 0) return { status: 'success', profile: { student_id: sid } };
  return { status: 'success', profile: profileRowToObj_(sh.getRange(row, 1, 1, PROFILE_HEADERS.length).getValues()[0]) };
}

function profileSet_(data) {
  const sid = String(data.studentId || '').trim();
  if (!profileValidSid_(sid)) return { status: 'error', code: 'PROFILE_BAD_ID' };
  const fields = data.fields || {};
  const keys = Object.keys(fields).filter(function (k) { return PROFILE_FIELDS.hasOwnProperty(k); });
  if (!keys.length) return { status: 'error', code: 'PROFILE_NO_FIELDS' };
  const bad = [];
  const clean = {};
  keys.forEach(function (k) {
    const c = profileClean_(k, fields[k]);
    if (c === null) bad.push(k); else clean[k] = c;
  });
  if (bad.length) return { status: 'error', code: 'PROFILE_INVALID', fields: bad };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = runSheet_(PROFILE_SHEET, PROFILE_HEADERS);
    let row = profileFind_(sh, sid);
    let cur;
    if (row < 0) {
      cur = PROFILE_HEADERS.map(function () { return ''; });
      cur[0] = sid;
    } else {
      cur = sh.getRange(row, 1, 1, PROFILE_HEADERS.length).getValues()[0];
    }
    keys.forEach(function (k) { cur[PROFILE_FIELDS[k][0]] = runLiteral_(clean[k]); });
    cur[9] = new Date();
    cur[10] = runLiteral_(String(data.by || 'student').slice(0, 40));
    // วันเกิด/รหัสเก็บเป็นข้อความ ไม่ให้ชีตแปลงเป็นวันที่/ตัดเลขศูนย์
    if (row < 0) {
      sh.appendRow(cur);
      row = sh.getLastRow();
    } else {
      sh.getRange(row, 1, 1, PROFILE_HEADERS.length).setValues([cur]);
    }
    sh.getRange(row, 1).setNumberFormat('@');
    sh.getRange(row, 3).setNumberFormat('@');
    return { status: 'success', profile: profileRowToObj_(sh.getRange(row, 1, 1, PROFILE_HEADERS.length).getValues()[0]) };
  } finally {
    lock.releaseLock();
  }
}

// ผู้ตรวจแก้ข้อมูลหลักใน Main_2569 (ยศ C, ชื่อ D, นามสกุล E, รุ่น F) + ข้อมูลติดต่อใน Profiles_2569
function profileAdminUpdate_(data) {
  const sid = String(data.studentId || '').trim();
  if (!profileValidSid_(sid)) return { status: 'error', code: 'PROFILE_BAD_ID' };
  const rank = String(data.rank || '').trim();
  const fn = String(data.firstName || '').trim().slice(0, 60);
  const ln = String(data.lastName || '').trim().slice(0, 60);
  const cls = String(data.classYear || '').replace(/\D/g, '');
  if (!fn || !ln) return { status: 'error', code: 'PROFILE_NAME_REQUIRED' };
  if (rank && PROFILE_RANKS.indexOf(rank) < 0) return { status: 'error', code: 'PROFILE_BAD_RANK' };
  if (cls && !/^\d{2}$/.test(cls)) return { status: 'error', code: 'PROFILE_BAD_CLASS' };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = runSS_().getSheetByName(RUN_MASTER_SHEET);
    if (!sh) return { status: 'error', code: 'PROFILE_MASTER_MISSING' };
    const last = sh.getLastRow();
    const ids = last >= 2 ? sh.getRange(2, 2, last - 1, 1).getValues() : [];
    let row = -1;
    for (let i = 0; i < ids.length; i++) if (String(ids[i][0]).trim() === sid) { row = i + 2; break; }
    if (row < 0) return { status: 'error', code: 'PROFILE_STUDENT_NOT_FOUND' };
    const cur = sh.getRange(row, 3, 1, 4).getValues()[0];
    sh.getRange(row, 3, 1, 4).setValues([[
      rank ? runLiteral_(rank) : cur[0], runLiteral_(fn), runLiteral_(ln), cls ? 'รุ่น ' + cls : cur[3]
    ]]);
    try { CacheService.getScriptCache().remove('students_api_v2'); } catch (ce) {}
  } finally {
    lock.releaseLock();
  }
  if (data.email !== undefined) {
    const r = profileSet_({ studentId: sid, fields: { email: data.email }, by: 'admin' });
    if (r.status !== 'success') return r;
  }
  return { status: 'success' };
}

function profileHandle_(data) {
  switch (data.action) {
    case 'profile_get': return profileGet_(data.studentId);
    case 'profile_set': return profileSet_(data);
    case 'profile_admin_update': return profileAdminUpdate_(data);
    default: return { status: 'error', code: 'PROFILE_ACTION_UNKNOWN' };
  }
}
