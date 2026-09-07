/**
 * RTAFNC Good Deed Online API v2
 * Frontend: GitHub Pages (static only)
 * Backend: Google Apps Script + private Google Sheets/Drive
 *
 * IMPORTANT
 * - Keep every secret in Script Properties, never in this file.
 * - Deploy as Web App: Execute as Me / Who has access: Anyone.
 * - Run setupSystem() once, then bootstrapOwnerAdmin() once.
 */

const GD = Object.freeze({
  VERSION: '2.3.1',
  CHANNEL: 'RTAFNC_GOODDEED',
  DEFAULT_ORIGIN: 'https://anuchit1tube168-cmd.github.io',
  SESSION_TTL: 21600,
  MAX_EVIDENCE_BYTES: 2 * 1024 * 1024,
  MIGRATION_DEED_BATCH: 250,
  MIGRATION_EVIDENCE_BATCH: 25,
  LEGACY_ASSET_BASE: 'https://anuchit1tube168-cmd.github.io/gooddeeds69/',
  SHEETS: {
    MEMBERS: 'MembersV2',
    RECORDS: 'GoodDeedRecordsV2',
    AUDIT: 'AuditTrailV2',
    CONFIG: 'ConfigurationV2'
  }
});

const HEADERS = Object.freeze({
  MembersV2: ['memberId','username','studentId','displayName','cohort','role','passwordSalt','passwordHash','mustChangePassword','active','lineUserId','createdAt','updatedAt'],
  GoodDeedRecordsV2: ['recordId','requestId','memberId','studentId','ownerName','cohort','category','activityDate','hours','description','evidenceFileId','evidenceName','evidenceUrl','status','submittedAt','reviewerId','reviewerName','reviewedAt','reviewNote','updatedAt'],
  AuditTrailV2: ['auditId','requestId','actorId','action','entityType','entityId','detail','occurredAt'],
  ConfigurationV2: ['key','value','updatedAt']
});

function doGet(e) {
  const action = String((e && e.parameter && e.parameter.action) || 'health');
  if (action !== 'health') return json_({ ok: false, error: 'POST_REQUIRED' });
  return json_({ ok: true, service: 'RTAFNC Good Deed API', version: GD.VERSION, time: new Date().toISOString() });
}

function doPost(e) {
  const requestId = clean_((e.parameter || {}).requestId, 100) || Utilities.getUuid();
  const origin = allowedOrigin_((e.parameter || {}).origin);
  try {
    ensureSetup_();
    const action = clean_((e.parameter || {}).action, 80);
    const payload = parseJson_((e.parameter || {}).payload, {});
    const token = String((e.parameter || {}).sessionToken || '');
    const data = dispatch_(action, payload, token, requestId);
    return bridge_({ channel: GD.CHANNEL, requestId: requestId, ok: true, data: data }, origin);
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return bridge_({ channel: GD.CHANNEL, requestId: requestId, ok: false, error: safeError_(error) }, origin);
  }
}

function dispatch_(action, payload, token, requestId) {
  if (action === 'login') return login_(payload, requestId);
  if (action === 'loginWithLine') return loginWithLine_(payload, requestId);
  if (action === 'bindLineAndLogin') return bindLineAndLogin_(payload, requestId);
  const session = requireSession_(token);
  if (action === 'me') return { user: publicUser_(session) };
  if (action === 'logout') return logout_(token, session, requestId);
  if (action === 'changePassword') return changePassword_(session, payload, token, requestId);
  if (truthy_(session.mustChangePassword)) throw new Error('กรุณาเปลี่ยนรหัสผ่านชั่วคราวก่อนใช้งาน');
  if (action === 'listDeeds') return listDeeds_(session, payload);
  if (action === 'submitDeed') return submitDeed_(session, payload, requestId);
  if (action === 'reviewDeed') return reviewDeed_(session, payload, requestId);
  if (action === 'getEvidence') return getEvidence_(session, payload, requestId);
  if (action === 'listMembers') return listMembers_(session);
  if (action === 'createMember') return createMember_(session, payload, requestId);
  throw new Error('ไม่รู้จักคำสั่งที่ส่งมา');
}

/** Run once from the Apps Script editor. */
function setupSystem() {
  const props = PropertiesService.getScriptProperties();
  let spreadsheetId = props.getProperty('SPREADSHEET_ID');
  let ss;
  if (spreadsheetId) {
    ss = SpreadsheetApp.openById(spreadsheetId);
  } else {
    ss = SpreadsheetApp.create('RTAFNC Good Deed Online Database 2569');
    spreadsheetId = ss.getId();
    props.setProperty('SPREADSHEET_ID', spreadsheetId);
  }

  Object.keys(HEADERS).forEach(function(name) { ensureSheet_(ss, name, HEADERS[name]); });

  if (!props.getProperty('EVIDENCE_FOLDER_ID')) {
    const folder = DriveApp.createFolder('RTAFNC-GoodDeed-Evidence-2569');
    folder.setDescription('หลักฐานระบบบันทึกความดี วพอ. 2569 — ห้ามแชร์สาธารณะ');
    props.setProperty('EVIDENCE_FOLDER_ID', folder.getId());
  }
  if (!props.getProperty('PASSWORD_PEPPER')) props.setProperty('PASSWORD_PEPPER', Utilities.getUuid() + Utilities.getUuid());
  if (!props.getProperty('ALLOWED_ORIGIN')) props.setProperty('ALLOWED_ORIGIN', GD.DEFAULT_ORIGIN);
  if (!props.getProperty('SESSION_TTL_SECONDS')) props.setProperty('SESSION_TTL_SECONDS', String(GD.SESSION_TTL));
  upsertConfig_('systemVersion', GD.VERSION);
  upsertConfig_('initializedAt', new Date().toISOString());
  console.log('SETUP_OK spreadsheet=' + spreadsheetId + ' folder=' + props.getProperty('EVIDENCE_FOLDER_ID'));
}

/**
 * Run once after setupSystem(). Creates the first admin and prints a temporary password.
 * If the account email is unavailable, set BOOTSTRAP_ADMIN_USERNAME in Script Properties.
 */
function bootstrapOwnerAdmin() {
  ensureSetup_();
  const props = PropertiesService.getScriptProperties();
  const username = Session.getActiveUser().getEmail() || props.getProperty('BOOTSTRAP_ADMIN_USERNAME');
  if (!username) throw new Error('ตั้งค่า BOOTSTRAP_ADMIN_USERNAME ใน Script Properties ก่อน');
  const temporaryPassword = randomPassword_();
  provisionMember_(username, '', 'ผู้ดูแลระบบ', '', 'admin', temporaryPassword, true);
  console.log('ADMIN_CREATED username=' + username + ' temporaryPassword=' + temporaryPassword);
}

/** Admin utility: run from editor to add a user without exposing passwords in GitHub. */
function provisionMember(username, studentId, displayName, cohort, role) {
  ensureSetup_();
  const temporaryPassword = randomPassword_();
  provisionMember_(username, studentId, displayName, cohort, role || 'student', temporaryPassword, true);
  console.log('USER_CREATED username=' + username + ' temporaryPassword=' + temporaryPassword);
}

/** Admin utility: validate the Messaging API token without sending a message. */
function testLineConfiguration() {
  ensureSetup_();
  const props = PropertiesService.getScriptProperties();
  const loginChannelId = props.getProperty('LINE_LOGIN_CHANNEL_ID');
  const messagingToken = props.getProperty('LINE_MESSAGING_CHANNEL_ACCESS_TOKEN');
  if (!loginChannelId) throw new Error('ไม่พบ Script Property: LINE_LOGIN_CHANNEL_ID');
  if (!messagingToken) throw new Error('ไม่พบ Script Property: LINE_MESSAGING_CHANNEL_ACCESS_TOKEN');
  const response = UrlFetchApp.fetch('https://api.line.me/v2/bot/info', {
    method: 'get', headers: { Authorization: 'Bearer ' + messagingToken }, muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 200) throw new Error('Messaging API token ใช้งานไม่ได้ HTTP ' + response.getResponseCode());
  const bot = JSON.parse(response.getContentText());
  const result = { ok: true, version: GD.VERSION, loginChannelConfigured: true, botDisplayName: clean_(bot.displayName, 120), botBasicId: clean_(bot.basicId, 80) };
  console.log('LINE_CONFIGURATION_OK ' + JSON.stringify(result));
  return result;
}

/** Admin utility: send one real test notification to a linked student account. */
function testLinePushToStudent(studentId) {
  ensureSetup_();
  const normalized = clean_(studentId || PropertiesService.getScriptProperties().getProperty('LINE_TEST_STUDENT_ID'), 30);
  if (!normalized) throw new Error('ตั้ง Script Property: LINE_TEST_STUDENT_ID เป็นรหัสนักเรียนที่จะรับข้อความทดสอบก่อน');
  const member = findMember_(function(row) { return String(row.studentId) === normalized; });
  if (!member) throw new Error('ไม่พบนักเรียนรหัส ' + normalized);
  if (!member.lineUserId) throw new Error('นักเรียนคนนี้ยังไม่ได้ผูก LINE ผ่าน LIFF');
  const testRecord = {
    recordId: 'LINE-TEST-' + Utilities.getUuid(), category: 'ทดสอบระบบแจ้งเตือน',
    activityDate: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    hours: 0, reviewerName: 'ผู้ดูแลระบบ'
  };
  const sent = notifyLineReview_(String(member.lineUserId), testRecord, 'approved', 'ข้อความทดสอบจากระบบบันทึกความดี วพอ.');
  if (!sent) throw new Error('ส่งข้อความไม่สำเร็จ ตรวจว่า Messaging channel อยู่ Provider เดียวกับ LIFF และนักเรียนเพิ่ม OA เป็นเพื่อนแล้ว');
  audit_('system', 'line.test.sent', 'member', member.memberId, {}, 'line-test-' + Utilities.getUuid());
  console.log('LINE_TEST_SENT studentId=' + normalized);
  return { ok: true, studentId: normalized };
}

function login_(payload, requestId) {
  const username = clean_(payload.username, 120).toLowerCase();
  const password = String(payload.password || '');
  if (!username || !password) throw new Error('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
  assertLoginAllowed_(username);
  const member = findMember_(function(row) {
    return String(row.username).toLowerCase() === username || String(row.studentId).toLowerCase() === username;
  });
  if (!member || !truthy_(member.active) || !verifyPassword_(password, member.passwordSalt, member.passwordHash)) {
    registerLoginFailure_(username);
    audit_('anonymous', 'login.failed', 'member', username, { reason: 'invalid_credentials' }, requestId);
    throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  }
  clearLoginFailures_(username);
  const token = createSession_(member);
  audit_(member.memberId, 'login.succeeded', 'member', member.memberId, {}, requestId);
  return { sessionToken: token, user: publicUser_(member) };
}

function loginWithLine_(payload, requestId) {
  const line = verifyLineIdToken_(payload.idToken);
  const member = findMember_(function(row) { return String(row.lineUserId) === line.userId; });
  if (!member || !truthy_(member.active)) {
    audit_('anonymous', 'line.login.unbound', 'lineUser', tokenHash_(line.userId).slice(0, 16), {}, requestId);
    throw new Error('บัญชี LINE นี้ยังไม่ผูกกับนักเรียน');
  }
  const token = createSession_(member);
  audit_(member.memberId, 'line.login.succeeded', 'member', member.memberId, {}, requestId);
  return { sessionToken: token, user: publicUser_(member) };
}

function bindLineAndLogin_(payload, requestId) {
  const username = clean_(payload.username, 120).toLowerCase();
  const password = String(payload.password || '');
  if (!username || !password) throw new Error('กรุณากรอกรหัสนักเรียนและรหัสผ่าน');
  assertLoginAllowed_(username);
  const line = verifyLineIdToken_(payload.idToken);
  const member = findMember_(function(row) {
    return String(row.username).toLowerCase() === username || String(row.studentId).toLowerCase() === username;
  });
  if (!member || member.role !== 'student' || !truthy_(member.active) || !verifyPassword_(password, member.passwordSalt, member.passwordHash)) {
    registerLoginFailure_(username);
    audit_('anonymous', 'line.bind.failed', 'member', username, { reason: 'invalid_credentials' }, requestId);
    throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const table = table_(GD.SHEETS.MEMBERS);
    const memberIndex = table.rows.findIndex(function(row) { return String(row.memberId) === String(member.memberId); });
    if (memberIndex < 0) throw new Error('ไม่พบบัญชีนักเรียน');
    const duplicate = table.rows.find(function(row) { return String(row.lineUserId) === line.userId && String(row.memberId) !== String(member.memberId); });
    if (duplicate) throw new Error('บัญชี LINE นี้ผูกกับผู้ใช้อื่นแล้ว กรุณาติดต่อผู้ดูแล');
    const currentLineId = String(table.rows[memberIndex].lineUserId || '');
    if (currentLineId && currentLineId !== line.userId) throw new Error('บัญชีนักเรียนนี้ผูกกับ LINE อื่นแล้ว กรุณาติดต่อผู้ดูแล');
    updateRow_(table.sheet, table.headers, memberIndex + 2, { lineUserId: line.userId, updatedAt: new Date().toISOString() });
    member.lineUserId = line.userId;
  } finally {
    lock.releaseLock();
  }

  clearLoginFailures_(username);
  const token = createSession_(member);
  audit_(member.memberId, 'line.bound', 'member', member.memberId, { lineUserHash: tokenHash_(line.userId).slice(0, 16) }, requestId);
  return { sessionToken: token, user: publicUser_(member) };
}

function logout_(token, session, requestId) {
  CacheService.getScriptCache().remove('session:' + tokenHash_(token));
  audit_(session.memberId, 'logout', 'member', session.memberId, {}, requestId);
  return { success: true };
}

function listDeeds_(session, payload) {
  const max = Math.min(Math.max(Number(payload.limit) || 100, 1), 500);
  const rows = table_(GD.SHEETS.RECORDS).rows.filter(function(row) {
    return session.role === 'student' ? String(row.memberId) === String(session.memberId) : true;
  });
  rows.sort(function(a, b) { return String(b.submittedAt).localeCompare(String(a.submittedAt)); });
  return { deeds: rows.slice(0, max).map(function(row) { return publicDeed_(row, session); }) };
}

function submitDeed_(session, payload, requestId) {
  const studentId = clean_(payload.studentId, 30);
  const cohort = clean_(payload.cohort, 30);
  const category = clean_(payload.category, 120);
  const activityDate = clean_(payload.activityDate, 20);
  const hours = Number(payload.hours);
  const description = clean_(payload.description, 1200);
  if (!/^\d{7}$/.test(studentId) || !category || !/^\d{4}-\d{2}-\d{2}$/.test(activityDate) || !Number.isFinite(hours) || !(hours >= 0.5 && hours <= 24) || !Number.isInteger(hours * 2) || description.length < 5) {
    throw new Error('ข้อมูลกิจกรรมไม่ครบหรือไม่ถูกต้อง');
  }
  if (session.role === 'student' && session.studentId && studentId !== session.studentId) throw new Error('รหัสนักเรียนไม่ตรงกับบัญชี');

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const duplicate = findRecord_(function(row) { return String(row.requestId) === requestId && String(row.memberId) === String(session.memberId); });
    if (duplicate) return { deed: publicDeed_(duplicate, session), duplicate: true };
    const evidence = saveEvidence_(payload.evidence, session, requestId);
    const now = new Date().toISOString();
    const record = {
      recordId: 'GD-' + Utilities.getUuid(), requestId: requestId, memberId: session.memberId,
      studentId: studentId, ownerName: session.displayName, cohort: cohort, category: category,
      activityDate: activityDate, hours: hours, description: description,
      evidenceFileId: evidence.fileId || '', evidenceName: evidence.name || '', evidenceUrl: evidence.url || '',
      status: 'pending', submittedAt: now, reviewerId: '', reviewerName: '', reviewedAt: '', reviewNote: '', updatedAt: now
    };
    append_(GD.SHEETS.RECORDS, record);
    audit_(session.memberId, 'deed.submitted', 'deed', record.recordId, { category: category, hours: hours }, requestId);
    notifyTelegram_('📝 รายการความดีใหม่\nรหัส: ' + studentId + '\nประเภท: ' + category + '\nชั่วโมง: ' + hours + '\nเลขรายการ: ' + record.recordId);
    return { deed: publicDeed_(record, session) };
  } finally {
    lock.releaseLock();
  }
}

function reviewDeed_(session, payload, requestId) {
  if (session.role !== 'teacher' && session.role !== 'admin') throw new Error('ไม่มีสิทธิ์อนุมัติรายการ');
  const recordId = clean_(payload.recordId, 100);
  const decision = clean_(payload.decision, 20);
  const note = clean_(payload.note, 500);
  if (decision !== 'approved' && decision !== 'rejected') throw new Error('สถานะการอนุมัติไม่ถูกต้อง');
  if (decision === 'rejected' && !note) throw new Error('กรุณาระบุเหตุผลที่ไม่อนุมัติ');

  const lock = LockService.getScriptLock();
  let reviewedRecord;
  lock.waitLock(20000);
  try {
    const table = table_(GD.SHEETS.RECORDS);
    const index = table.rows.findIndex(function(row) { return String(row.recordId) === recordId; });
    if (index < 0) throw new Error('ไม่พบรายการ');
    const record = table.rows[index];
    if (record.status === decision) return { deed: publicDeed_(record, session), duplicate: true };
    if (record.status !== 'pending') throw new Error('รายการนี้ได้รับการตรวจแล้ว ต้องใช้กระบวนการแก้ไขพร้อมเหตุผลแยกต่างหาก');
    const before = record.status;
    const now = new Date().toISOString();
    updateRow_(table.sheet, table.headers, index + 2, {
      status: decision, reviewerId: session.memberId, reviewerName: session.displayName,
      reviewedAt: now, reviewNote: note, updatedAt: now
    });
    record.status = decision; record.reviewerId = session.memberId; record.reviewerName = session.displayName; record.reviewedAt = now; record.reviewNote = note; record.updatedAt = now;
    audit_(session.memberId, 'deed.' + decision, 'deed', recordId, { from: before, to: decision, note: note }, requestId);
    reviewedRecord = record;
  } finally {
    lock.releaseLock();
  }
  const owner = findMember_(function(row) { return String(row.memberId) === String(reviewedRecord.memberId); });
  const lineNotified = owner && owner.lineUserId ? notifyLineReview_(String(owner.lineUserId), reviewedRecord, decision, note) : false;
  audit_(session.memberId, lineNotified ? 'line.review.sent' : 'line.review.skipped', 'deed', recordId, {}, requestId);
  return { deed: publicDeed_(reviewedRecord, session), lineNotified: lineNotified };
}

function changePassword_(session, payload, token, requestId) {
  const currentPassword = String(payload.currentPassword || '');
  const newPassword = String(payload.newPassword || '');
  if (newPassword.length < 8) throw new Error('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร');
  const table = table_(GD.SHEETS.MEMBERS);
  const index = table.rows.findIndex(function(row) { return String(row.memberId) === String(session.memberId); });
  if (index < 0 || !verifyPassword_(currentPassword, table.rows[index].passwordSalt, table.rows[index].passwordHash)) throw new Error('รหัสผ่านเดิมไม่ถูกต้อง');
  const credentials = newPassword_(newPassword);
  updateRow_(table.sheet, table.headers, index + 2, { passwordSalt: credentials.salt, passwordHash: credentials.hash, mustChangePassword: false, updatedAt: new Date().toISOString() });
  audit_(session.memberId, 'password.changed', 'member', session.memberId, {}, requestId);
  CacheService.getScriptCache().remove('session:' + tokenHash_(token));
  return { success: true, reloginRequired: true };
}

function getEvidence_(session, payload, requestId) {
  const recordId = clean_(payload.recordId, 100);
  const record = findRecord_(function(row) { return String(row.recordId) === recordId; });
  if (!record || !record.evidenceFileId) throw new Error('ไม่พบไฟล์หลักฐาน');
  if (session.role === 'student' && String(record.memberId) !== String(session.memberId)) throw new Error('ไม่มีสิทธิ์ดูหลักฐานนี้');
  const file = DriveApp.getFileById(String(record.evidenceFileId));
  const blob = file.getBlob();
  const bytes = blob.getBytes();
  if (bytes.length > GD.MAX_EVIDENCE_BYTES) throw new Error('ไฟล์หลักฐานมีขนาดใหญ่เกินกำหนด');
  audit_(session.memberId, 'evidence.viewed', 'deed', recordId, { fileId: record.evidenceFileId }, requestId);
  return { name: record.evidenceName || file.getName(), mimeType: blob.getContentType(), size: bytes.length, dataBase64: Utilities.base64Encode(bytes) };
}

function listMembers_(session) {
  if (session.role !== 'admin') throw new Error('ไม่มีสิทธิ์จัดการผู้ใช้');
  const members = table_(GD.SHEETS.MEMBERS).rows.map(function(row) {
    return { memberId: row.memberId, username: row.username, studentId: row.studentId || '', displayName: row.displayName, cohort: row.cohort || '', role: row.role, active: truthy_(row.active), createdAt: iso_(row.createdAt) };
  });
  members.sort(function(a, b) { return String(a.displayName).localeCompare(String(b.displayName), 'th'); });
  return { members: members };
}

function createMember_(session, payload, requestId) {
  if (session.role !== 'admin') throw new Error('ไม่มีสิทธิ์จัดการผู้ใช้');
  const username = clean_(payload.username, 120).toLowerCase();
  const studentId = clean_(payload.studentId, 30);
  const displayName = clean_(payload.displayName, 160);
  const cohort = clean_(payload.cohort, 30);
  const role = clean_(payload.role, 20) || 'student';
  if (!username || !displayName) throw new Error('กรุณากรอกชื่อผู้ใช้และชื่อที่แสดง');
  if (findMember_(function(row) { return String(row.username).toLowerCase() === username || (studentId && String(row.studentId) === studentId); })) throw new Error('ชื่อผู้ใช้หรือรหัสนักเรียนนี้มีอยู่แล้ว');
  const temporaryPassword = randomPassword_();
  provisionMember_(username, studentId, displayName, cohort, role, temporaryPassword, true);
  const member = findMember_(function(row) { return String(row.username).toLowerCase() === username; });
  audit_(session.memberId, 'member.created', 'member', member.memberId, { username: username, studentId: studentId, role: role }, requestId);
  return { member: publicUser_(member), temporaryPassword: temporaryPassword };
}

/**
 * Legacy migration utilities
 * Required Script Properties:
 * - LEGACY_STUDENTS_FILE_ID: private Drive JSON created for v2
 * - LEGACY_DEEDS_FILE_ID: private Drive JSON created for v2
 *
 * Run startLegacyMigration() once after setupSystem() and bootstrapOwnerAdmin().
 * It imports users without reusing legacy plaintext passwords, then migrates deeds
 * and evidence in small batches. The trigger removes itself when complete.
 */
function startLegacyMigration() {
  ensureSetup_();
  const members = importLegacyStudents_();
  stopLegacyMigrationTrigger_();
  ScriptApp.newTrigger('legacyMigrationWorker_').timeBased().everyMinutes(5).create();
  const firstBatch = legacyMigrationWorker_();
  console.log('LEGACY_MIGRATION_STARTED members=' + JSON.stringify(members) + ' batch=' + JSON.stringify(firstBatch));
}

function legacyMigrationWorker_() {
  const deedResult = importLegacyDeedsBatch_();
  if (!deedResult.done) return { phase: 'deeds', result: deedResult };
  const evidenceResult = migrateLegacyEvidenceBatch_();
  if (evidenceResult.done) {
    stopLegacyMigrationTrigger_();
    const now = new Date().toISOString();
    PropertiesService.getScriptProperties().setProperty('LEGACY_MIGRATION_COMPLETED_AT', now);
    upsertConfig_('legacyMigrationCompletedAt', now);
    audit_('system', 'legacy.migration.completed', 'system', 'migration-v2', evidenceResult, 'legacy-migration-complete');
  }
  return { phase: 'evidence', result: evidenceResult };
}

function stopLegacyMigration() {
  stopLegacyMigrationTrigger_();
  console.log('LEGACY_MIGRATION_STOPPED');
}

function importLegacyStudents_() {
  const students = loadLegacyJson_('LEGACY_STUDENTS_FILE_ID');
  if (!Array.isArray(students)) throw new Error('ไฟล์รายชื่อนักเรียนเดิมไม่ใช่ JSON array');
  const table = table_(GD.SHEETS.MEMBERS);
  const existingUsernames = new Set(table.rows.map(function(row) { return String(row.username).toLowerCase(); }));
  const existingStudentIds = new Set(table.rows.map(function(row) { return String(row.studentId); }));
  const now = new Date().toISOString();
  const values = [];
  const credentials = [['studentId','displayName','cohort','temporaryPassword']];
  students.forEach(function(student) {
    const studentId = clean_(student.studentId, 30);
    const username = studentId.toLowerCase();
    if (!studentId || existingUsernames.has(username) || existingStudentIds.has(studentId)) return;
    const temporaryPassword = randomPassword_();
    const password = newPassword_(temporaryPassword);
    const member = {
      memberId: 'MB-' + Utilities.getUuid(), username: username, studentId: studentId,
      displayName: clean_(student.displayName, 160) || studentId,
      cohort: clean_(student.cohort, 30), role: 'student',
      passwordSalt: password.salt, passwordHash: password.hash,
      mustChangePassword: true, active: true, lineUserId: '', createdAt: now, updatedAt: now
    };
    values.push(HEADERS[GD.SHEETS.MEMBERS].map(function(header) { return member[header] === undefined ? '' : member[header]; }));
    credentials.push([studentId, member.displayName, member.cohort, temporaryPassword]);
    existingUsernames.add(username); existingStudentIds.add(studentId);
  });
  if (values.length) table.sheet.getRange(table.sheet.getLastRow() + 1, 1, values.length, HEADERS[GD.SHEETS.MEMBERS].length).setValues(values);
  let credentialsFileId = PropertiesService.getScriptProperties().getProperty('LEGACY_CREDENTIALS_FILE_ID') || '';
  if (credentials.length > 1) {
    const csv = '\ufeff' + credentials.map(function(row) { return row.map(csvEscape_).join(','); }).join('\r\n');
    const folder = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('EVIDENCE_FOLDER_ID'));
    const file = folder.createFile(Utilities.newBlob(csv, 'text/csv', 'Legacy-Initial-Credentials-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmm') + '.csv'));
    file.setDescription('รหัสผ่านชั่วคราวสำหรับย้ายระบบ — เก็บเป็นความลับและลบหลังแจกผู้ใช้ครบ');
    credentialsFileId = file.getId();
    PropertiesService.getScriptProperties().setProperty('LEGACY_CREDENTIALS_FILE_ID', credentialsFileId);
  }
  audit_('system', 'legacy.members.imported', 'system', 'migration-v2', { imported: values.length, credentialsFileId: credentialsFileId }, 'legacy-members-import');
  console.log('LEGACY_MEMBERS imported=' + values.length + ' credentialsFileId=' + credentialsFileId);
  return { imported: values.length, credentialsFileId: credentialsFileId };
}

function importLegacyDeedsBatch_() {
  const props = PropertiesService.getScriptProperties();
  const deeds = loadLegacyJson_('LEGACY_DEEDS_FILE_ID');
  if (!Array.isArray(deeds)) throw new Error('ไฟล์รายการความดีเดิมไม่ใช่ JSON array');
  const cursor = Math.max(Number(props.getProperty('LEGACY_DEEDS_CURSOR')) || 0, 0);
  if (cursor >= deeds.length) return { done: true, cursor: cursor, total: deeds.length, imported: 0 };
  const batch = deeds.slice(cursor, cursor + GD.MIGRATION_DEED_BATCH);
  const members = table_(GD.SHEETS.MEMBERS).rows;
  const memberByStudentId = {}; members.forEach(function(member) { if (member.studentId) memberByStudentId[String(member.studentId)] = member; });
  const recordTable = table_(GD.SHEETS.RECORDS);
  const existingIds = new Set(recordTable.rows.map(function(row) { return String(row.recordId); }));
  const values = [];
  let skippedMissingMember = 0, skippedSummary = 0, skippedDuplicate = 0;
  batch.forEach(function(deed) {
    const legacyId = clean_(deed.legacyId, 100);
    const recordId = 'LEGACY-' + legacyId;
    if (!legacyId || existingIds.has(recordId)) { skippedDuplicate++; return; }
    if (Number(deed.hours) > 24 && /สรุป|สะสม|รวมชั่วโมง/.test(String(deed.description || ''))) { skippedSummary++; return; }
    const member = memberByStudentId[String(deed.studentId)];
    if (!member) { skippedMissingMember++; return; }
    const sourceEvidence = (deed.imageUrls && deed.imageUrls[0]) || deed.pdfUrl || '';
    const submittedAt = isoOrDate_(deed.submittedAt, deed.activityDate);
    const reviewedAt = isoOrDate_(deed.approvedAt, '');
    const record = {
      recordId: recordId, requestId: 'legacy:' + legacyId, memberId: member.memberId,
      studentId: member.studentId, ownerName: member.displayName, cohort: member.cohort,
      category: clean_(deed.category, 120), activityDate: clean_(deed.activityDate, 20),
      hours: Number(deed.hours) || 0, description: clean_(deed.description, 1200),
      evidenceFileId: '', evidenceName: sourceEvidence ? 'รอย้ายหลักฐานเดิม' : '', evidenceUrl: String(sourceEvidence || ''),
      status: normalizeLegacyStatus_(deed.status), submittedAt: submittedAt,
      reviewerId: '', reviewerName: clean_(deed.approvedBy, 160), reviewedAt: reviewedAt,
      reviewNote: clean_([deed.rejectReason, deed.note].filter(Boolean).join(' | '), 500),
      updatedAt: reviewedAt || submittedAt
    };
    values.push(HEADERS[GD.SHEETS.RECORDS].map(function(header) { return record[header] === undefined ? '' : record[header]; }));
    existingIds.add(recordId);
  });
  if (values.length) recordTable.sheet.getRange(recordTable.sheet.getLastRow() + 1, 1, values.length, HEADERS[GD.SHEETS.RECORDS].length).setValues(values);
  const nextCursor = Math.min(cursor + batch.length, deeds.length);
  props.setProperty('LEGACY_DEEDS_CURSOR', String(nextCursor));
  const result = { done: nextCursor >= deeds.length, cursor: nextCursor, total: deeds.length, imported: values.length, skippedMissingMember: skippedMissingMember, skippedSummary: skippedSummary, skippedDuplicate: skippedDuplicate };
  audit_('system', 'legacy.deeds.batch', 'system', 'migration-v2', result, 'legacy-deeds-' + cursor);
  console.log('LEGACY_DEEDS ' + JSON.stringify(result));
  return result;
}

function migrateLegacyEvidenceBatch_() {
  const props = PropertiesService.getScriptProperties();
  const table = table_(GD.SHEETS.RECORDS);
  const startRow = Math.max(Number(props.getProperty('LEGACY_EVIDENCE_ROW_CURSOR')) || 2, 2);
  const lastRow = table.sheet.getLastRow();
  if (startRow > lastRow) return { done: true, cursor: startRow, lastRow: lastRow, migrated: 0, failed: 0 };
  const endRow = Math.min(startRow + GD.MIGRATION_EVIDENCE_BATCH - 1, lastRow);
  const range = table.sheet.getRange(startRow, 1, endRow - startRow + 1, table.headers.length);
  const rows = range.getValues();
  const folder = DriveApp.getFolderById(props.getProperty('EVIDENCE_FOLDER_ID'));
  const fileIdIndex = table.headers.indexOf('evidenceFileId');
  const fileNameIndex = table.headers.indexOf('evidenceName');
  const fileUrlIndex = table.headers.indexOf('evidenceUrl');
  const recordIdIndex = table.headers.indexOf('recordId');
  const updatedAtIndex = table.headers.indexOf('updatedAt');
  let migrated = 0, failed = 0, skipped = 0;
  rows.forEach(function(row) {
    const recordId = String(row[recordIdIndex] || '');
    const source = String(row[fileUrlIndex] || '');
    if (recordId.indexOf('LEGACY-') !== 0 || row[fileIdIndex] || !source) { skipped++; return; }
    try {
      const url = /^https:\/\//i.test(source) ? source : GD.LEGACY_ASSET_BASE + source.replace(/^\/+/, '');
      const response = UrlFetchApp.fetch(encodeURI(url), { muteHttpExceptions: true, followRedirects: true });
      if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) throw new Error('HTTP ' + response.getResponseCode());
      const blob = response.getBlob();
      const extension = extensionForMime_(blob.getContentType());
      const file = folder.createFile(blob.setName(cleanFileName_(recordId + extension)));
      file.setDescription('หลักฐานย้ายจากระบบเดิม | record=' + recordId);
      row[fileIdIndex] = file.getId(); row[fileNameIndex] = file.getName(); row[fileUrlIndex] = file.getUrl(); row[updatedAtIndex] = new Date().toISOString();
      migrated++;
    } catch (error) { failed++; console.error('LEGACY_EVIDENCE record=' + recordId + ' error=' + safeError_(error)); }
  });
  range.setValues(rows);
  const nextRow = endRow + 1;
  props.setProperty('LEGACY_EVIDENCE_ROW_CURSOR', String(nextRow));
  const result = { done: nextRow > lastRow, cursor: nextRow, lastRow: lastRow, migrated: migrated, failed: failed, skipped: skipped };
  audit_('system', 'legacy.evidence.batch', 'system', 'migration-v2', result, 'legacy-evidence-' + startRow);
  console.log('LEGACY_EVIDENCE ' + JSON.stringify(result));
  return result;
}

function stopLegacyMigrationTrigger_() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) { if (trigger.getHandlerFunction() === 'legacyMigrationWorker_') ScriptApp.deleteTrigger(trigger); });
}

function loadLegacyJson_(propertyName) {
  const id = PropertiesService.getScriptProperties().getProperty(propertyName);
  if (!id) throw new Error('กรุณาตั้ง Script Property ' + propertyName);
  return JSON.parse(DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8').replace(/^\ufeff/, ''));
}

function normalizeLegacyStatus_(value) {
  const status = String(value || '').toLowerCase();
  return status === 'rejected' ? 'rejected' : status === 'pending' ? 'pending' : 'approved';
}

function isoOrDate_(value, fallbackDate) {
  if (value) { const date = new Date(value); if (!isNaN(date.getTime())) return date.toISOString(); }
  return /^\d{4}-\d{2}-\d{2}$/.test(String(fallbackDate || '')) ? String(fallbackDate) + 'T00:00:00.000Z' : '';
}

function extensionForMime_(mime) {
  return ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'application/pdf': '.pdf' })[String(mime || '').toLowerCase()] || '';
}

function csvEscape_(value) {
  const text = String(value === undefined || value === null ? '' : value);
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

function saveEvidence_(evidence, session, requestId) {
  if (!evidence || !evidence.dataUrl) return {};
  const type = clean_(evidence.type, 80);
  const allowed = ['image/jpeg','image/png','application/pdf'];
  if (allowed.indexOf(type) < 0) throw new Error('ชนิดไฟล์หลักฐานไม่รองรับ');
  const match = String(evidence.dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!match || match[1] !== type) throw new Error('ไฟล์หลักฐานไม่ถูกต้อง');
  const bytes = Utilities.base64Decode(match[2]);
  if (bytes.length > GD.MAX_EVIDENCE_BYTES) throw new Error('ไฟล์หลักฐานต้องไม่เกิน 2 MB');
  const name = cleanFileName_(evidence.name || ('evidence-' + requestId));
  const blob = Utilities.newBlob(bytes, type, name);
  const folder = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('EVIDENCE_FOLDER_ID'));
  const file = folder.createFile(blob);
  file.setDescription('RTAFNC Good Deed evidence | member=' + session.memberId + ' | request=' + requestId);
  return { fileId: file.getId(), name: name, url: file.getUrl() };
}

function createSession_(member) {
  const token = Utilities.getUuid() + Utilities.getUuid();
  const ttl = Number(PropertiesService.getScriptProperties().getProperty('SESSION_TTL_SECONDS')) || GD.SESSION_TTL;
  CacheService.getScriptCache().put('session:' + tokenHash_(token), JSON.stringify({
    memberId: member.memberId, username: member.username, studentId: member.studentId,
    displayName: member.displayName, cohort: member.cohort, role: member.role,
    mustChangePassword: truthy_(member.mustChangePassword)
  }), ttl);
  return token;
}

function requireSession_(token) {
  if (!token) throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
  const raw = CacheService.getScriptCache().get('session:' + tokenHash_(token));
  if (!raw) throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
  return JSON.parse(raw);
}

function publicUser_(member) {
  return { memberId: member.memberId, studentId: member.studentId || '', displayName: member.displayName, cohort: member.cohort || '', role: member.role, mustChangePassword: truthy_(member.mustChangePassword) };
}

function publicDeed_(row, session) {
  const canSeeEvidence = session.role !== 'student' || String(row.memberId) === String(session.memberId);
  return {
    recordId: row.recordId, studentId: row.studentId, ownerName: row.ownerName, cohort: row.cohort,
    category: row.category, activityDate: row.activityDate, hours: Number(row.hours), description: row.description,
    evidenceName: canSeeEvidence ? row.evidenceName : '', hasEvidence: canSeeEvidence && Boolean(row.evidenceFileId),
    status: row.status, submittedAt: iso_(row.submittedAt), reviewerName: row.reviewerName || '',
    reviewedAt: iso_(row.reviewedAt), reviewNote: row.reviewNote || ''
  };
}

function provisionMember_(username, studentId, displayName, cohort, role, password, mustChange) {
  const validRoles = ['student','teacher','admin'];
  if (validRoles.indexOf(role) < 0) throw new Error('role ไม่ถูกต้อง');
  const table = table_(GD.SHEETS.MEMBERS);
  const normalized = String(username).trim().toLowerCase();
  const existingIndex = table.rows.findIndex(function(row) { return String(row.username).toLowerCase() === normalized; });
  const credentials = newPassword_(password);
  const now = new Date().toISOString();
  const values = { username: normalized, studentId: studentId || '', displayName: displayName || normalized, cohort: cohort || '', role: role, passwordSalt: credentials.salt, passwordHash: credentials.hash, mustChangePassword: mustChange, active: true, updatedAt: now };
  if (existingIndex >= 0) updateRow_(table.sheet, table.headers, existingIndex + 2, values);
  else append_(GD.SHEETS.MEMBERS, Object.assign({ memberId: 'MB-' + Utilities.getUuid(), lineUserId: '', createdAt: now }, values));
}

function findMember_(predicate) { const rows = table_(GD.SHEETS.MEMBERS).rows; for (let i=0;i<rows.length;i++) if (predicate(rows[i])) return rows[i]; return null; }
function findRecord_(predicate) { const rows = table_(GD.SHEETS.RECORDS).rows; for (let i=0;i<rows.length;i++) if (predicate(rows[i])) return rows[i]; return null; }

function audit_(actorId, action, entityType, entityId, detail, requestId) {
  append_(GD.SHEETS.AUDIT, { auditId: 'AU-' + Utilities.getUuid(), requestId: requestId || '', actorId: actorId || 'anonymous', action: action, entityType: entityType, entityId: entityId, detail: JSON.stringify(detail || {}), occurredAt: new Date().toISOString() });
}

function notifyTelegram_(message) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('TELEGRAM_BOT_TOKEN');
  const chatId = props.getProperty('TELEGRAM_CHAT_ID');
  if (!token || !chatId) return;
  try {
    UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', { method: 'post', contentType: 'application/json', payload: JSON.stringify({ chat_id: chatId, text: message }), muteHttpExceptions: true });
  } catch (error) { console.error('Telegram: ' + error); }
}

function verifyLineIdToken_(idToken) {
  const token = String(idToken || '');
  if (!token || token.length > 4096) throw new Error('ไม่พบ LINE ID token กรุณาเปิดระบบผ่าน LINE ใหม่');
  const props = PropertiesService.getScriptProperties();
  const channelId = props.getProperty('LINE_LOGIN_CHANNEL_ID');
  if (!channelId) throw new Error('ผู้ดูแลยังไม่ได้ตั้งค่า LINE Login Channel ID');
  const response = UrlFetchApp.fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'post',
    payload: { id_token: token, client_id: channelId },
    muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 200) throw new Error('ยืนยันตัวตนกับ LINE ไม่สำเร็จ กรุณาเปิดระบบใหม่');
  let data;
  try { data = JSON.parse(response.getContentText()); } catch (_) { throw new Error('LINE ส่งข้อมูลยืนยันตัวตนไม่ถูกต้อง'); }
  if (String(data.aud || '') !== String(channelId) || !/^U[0-9a-f]{32}$/i.test(String(data.sub || ''))) {
    throw new Error('LINE ID token ไม่ตรงกับระบบนี้');
  }
  if (data.exp && Number(data.exp) * 1000 < Date.now()) throw new Error('LINE ID token หมดอายุ กรุณาเปิดระบบใหม่');
  return { userId: String(data.sub), displayName: clean_(data.name, 120) };
}

function notifyLineReview_(lineUserId, record, decision, note) {
  if (!/^U[0-9a-f]{32}$/i.test(String(lineUserId || ''))) return false;
  const token = PropertiesService.getScriptProperties().getProperty('LINE_MESSAGING_CHANNEL_ACCESS_TOKEN');
  if (!token) return false;
  const approved = decision === 'approved';
  const message = [
    approved ? '✅ บันทึกความดีได้รับการอนุมัติแล้ว' : '❌ บันทึกความดียังไม่ผ่านการอนุมัติ',
    'ประเภท: ' + String(record.category || '-'),
    'วันที่: ' + String(record.activityDate || '-'),
    'ชั่วโมง: ' + String(record.hours || 0),
    'ผู้ตรวจ: ' + String(record.reviewerName || '-'),
    note ? 'หมายเหตุ: ' + String(note) : '',
    'เลขรายการ: ' + String(record.recordId || '')
  ].filter(String).join('\n').slice(0, 4900);
  try {
    const response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token, 'X-Line-Retry-Key': Utilities.getUuid() },
      payload: JSON.stringify({ to: lineUserId, messages: [{ type: 'text', text: message }] }),
      muteHttpExceptions: true
    });
    if (response.getResponseCode() === 200) return true;
    console.error('LINE push failed code=' + response.getResponseCode());
  } catch (error) { console.error('LINE push failed'); }
  return false;
}

function table_(name) {
  const sheet = spreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error('ไม่พบตาราง ' + name + ' กรุณารัน setupSystem()');
  const values = sheet.getDataRange().getValues();
  const headers = values.length ? values[0].map(String) : HEADERS[name];
  const rows = values.slice(1).filter(function(row) { return row.some(function(cell) { return String(cell) !== ''; }); }).map(function(row) {
    const object = {}; headers.forEach(function(header, index) { object[header] = row[index]; }); return object;
  });
  return { sheet: sheet, headers: headers, rows: rows };
}

function append_(sheetName, object) {
  const sheet = spreadsheet_().getSheetByName(sheetName);
  const headers = HEADERS[sheetName];
  sheet.appendRow(headers.map(function(header) { return object[header] === undefined ? '' : object[header]; }));
}

function updateRow_(sheet, headers, rowNumber, changes) {
  const range = sheet.getRange(rowNumber, 1, 1, headers.length);
  const values = range.getValues()[0];
  Object.keys(changes).forEach(function(key) { const index = headers.indexOf(key); if (index >= 0) values[index] = changes[key]; });
  range.setValues([values]);
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  const current = sheet.getLastColumn() ? sheet.getRange(1,1,1,Math.max(sheet.getLastColumn(),headers.length)).getValues()[0] : [];
  if (!current[0]) { sheet.getRange(1,1,1,headers.length).setValues([headers]); sheet.setFrozenRows(1); sheet.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#0b2d55').setFontColor('#ffffff'); }
  else if (headers.some(function(header, index) { return current[index] !== header; })) throw new Error('โครงสร้างตาราง ' + name + ' ไม่ตรงระบบ v2');
  return sheet;
}

function upsertConfig_(key, value) {
  const table = table_(GD.SHEETS.CONFIG);
  const index = table.rows.findIndex(function(row) { return String(row.key) === key; });
  const data = { key: key, value: value, updatedAt: new Date().toISOString() };
  if (index >= 0) updateRow_(table.sheet, table.headers, index + 2, data); else append_(GD.SHEETS.CONFIG, data);
}

function loginFailureKey_(identity) { return 'login-fail:' + tokenHash_(String(identity || '').toLowerCase()).slice(0, 32); }
function assertLoginAllowed_(identity) {
  const attempts = Number(CacheService.getScriptCache().get(loginFailureKey_(identity)) || 0);
  if (attempts >= 6) throw new Error('ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ 10 นาที');
}
function registerLoginFailure_(identity) {
  const cache = CacheService.getScriptCache();
  const key = loginFailureKey_(identity);
  const attempts = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(attempts), 600);
}
function clearLoginFailures_(identity) { CacheService.getScriptCache().remove(loginFailureKey_(identity)); }

function spreadsheet_() { return SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')); }
function ensureSetup_() { const p=PropertiesService.getScriptProperties(); if (!p.getProperty('SPREADSHEET_ID') || !p.getProperty('EVIDENCE_FOLDER_ID') || !p.getProperty('PASSWORD_PEPPER')) throw new Error('ระบบหลังบ้านยังไม่พร้อม กรุณารัน setupSystem()'); }
function newPassword_(password) { const salt=Utilities.getUuid(); return { salt:salt, hash:hashPassword_(password,salt) }; }
function verifyPassword_(password, salt, expected) { return constantTimeEqual_(hashPassword_(password,salt), String(expected || '')); }
function hashPassword_(password, salt) { const pepper=PropertiesService.getScriptProperties().getProperty('PASSWORD_PEPPER') || ''; return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(salt)+'|'+String(password)+'|'+pepper, Utilities.Charset.UTF_8)); }
function tokenHash_(token) { return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(token), Utilities.Charset.UTF_8)); }
function hex_(bytes) { return bytes.map(function(byte) { const value=(byte<0?byte+256:byte).toString(16); return value.length===1?'0'+value:value; }).join(''); }
function constantTimeEqual_(a,b) { if (a.length!==b.length) return false; let diff=0; for(let i=0;i<a.length;i++) diff|=a.charCodeAt(i)^b.charCodeAt(i); return diff===0; }
function randomPassword_() { return Utilities.getUuid().replace(/-/g,'').slice(0,12); }
function truthy_(value) { return value === true || String(value).toLowerCase() === 'true' || String(value) === '1'; }
function clean_(value,max) { return String(value===undefined||value===null?'':value).trim().replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,max||1000); }
function cleanFileName_(value) { return clean_(value,120).replace(/[\\/:*?"<>|]/g,'-'); }
function parseJson_(value,fallback) { try { return value ? JSON.parse(value) : fallback; } catch (_) { throw new Error('ข้อมูล JSON ไม่ถูกต้อง'); } }
function iso_(value) { if (!value) return ''; if (Object.prototype.toString.call(value)==='[object Date]') return value.toISOString(); return String(value); }
function safeError_(error) { const message=error&&error.message?String(error.message):'เกิดข้อผิดพลาดในระบบ'; return message.replace(/AKfy[a-zA-Z0-9_-]+/g,'[endpoint]').replace(/\d{6,}:[a-zA-Z0-9_-]{20,}/g,'[secret]').slice(0,300); }
function allowedOrigin_(origin) { const configured=PropertiesService.getScriptProperties().getProperty('ALLOWED_ORIGIN')||GD.DEFAULT_ORIGIN; return String(origin||'')===configured?configured:configured; }
function bridge_(message,origin) { const json=JSON.stringify(message).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026'); const html='<!doctype html><meta charset="utf-8"><script>parent.postMessage('+json+','+JSON.stringify(origin)+');<\/script>'; return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); }
function json_(object) { return ContentService.createTextOutput(JSON.stringify(object)).setMimeType(ContentService.MimeType.JSON); }

