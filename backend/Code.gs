/**
 * Code.gs - Google Apps Script Backend
 * ระบบบันทึกความดี วิทยาลัยพยาบาลทหารอากาศ
 * 
 * วิธีใช้งาน:
 * 1. เปิด https://script.google.com/
 * 2. สร้างโปรเจกต์ใหม่ → วางโค้ดนี้ใน Code.gs
 * 3. สร้าง Google Sheets ใหม่และ copy spreadsheet ID
 * 4. แก้ไข SPREADSHEET_ID ด้านล่าง
 * 5. ไปที่ Deploy → New Deployment → Web app
 * 6. Execute as: Me, Who has access: Anyone → Deploy
 * 7. Copy URL ไปใส่ใน settings.html
 */

// ==================== CONFIG ====================
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
const MIN_HOURS = 36;
const TELEGRAM_TOKEN = ''; // หรือเก็บใน PropertiesService

// ==================== SHEET NAMES ====================
const SHEETS = {
  STUDENTS: 'Students',
  DEEDS: 'GoodDeeds',
  SETTINGS: 'Settings',
};

// ==================== WEB APP ENTRY POINTS ====================
function doGet(e) {
  const action = e.parameter.action;
  try {
    if (action === 'getStudents') return jsonResponse(getStudents());
    if (action === 'getStudent') return jsonResponse(getStudent(e.parameter.studentId));
    if (action === 'getDeeds') return jsonResponse(getDeeds(e.parameter.studentId));
    if (action === 'getSummary') return jsonResponse(getSummary(e.parameter.studentId));
    if (action === 'getAllPending') return jsonResponse(getAllPending());
    if (action === 'ping') return jsonResponse({ status: 'ok', time: new Date().toISOString() });
    return jsonResponse({ error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  try {
    if (action === 'login') return jsonResponse(login(data));
    if (action === 'addDeed') return jsonResponse(addDeed(data));
    if (action === 'approveDeed') return jsonResponse(approveDeed(data));
    if (action === 'rejectDeed') return jsonResponse(rejectDeed(data));
    if (action === 'updateProfile') return jsonResponse(updateProfile(data));
    if (action === 'updatePassword') return jsonResponse(updatePassword(data));
    if (action === 'uploadImage' || data.base64) return jsonResponse(uploadImage(data));
    return jsonResponse({ error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

// ==================== IMAGE UPLOAD ====================
function uploadImage(data) {
  const folderId = data.folderId || PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID') || '';
  let base64 = data.base64;
  const filename = data.filename || 'upload_' + Date.now() + '.jpg';
  const mimeType = data.mimeType || 'image/jpeg';
  if (!base64) return { status: 'error', message: 'No base64 image data provided' };
  if (base64.indexOf('base64,') !== -1) base64 = base64.split('base64,')[1];
  const blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, filename);
  let file;
  if (folderId) {
    const folder = DriveApp.getFolderById(folderId);
    file = folder.createFile(blob);
  } else {
    file = DriveApp.createFile(blob);
  }
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const fileId = file.getId();
  const fileUrl = 'https://lh3.googleusercontent.com/d/' + fileId;
  return { status: 'success', fileId: fileId, url: fileUrl };
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== SPREADSHEET HELPERS ====================
function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Sheet not found: ' + name);
  return sheet;
}

function sheetToObjects(sheet, startRow = 2) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(startRow - 1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  }).filter(obj => obj[headers[0]] !== '');
}

// ==================== SETUP ====================
function setupSpreadsheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Students sheet
  let sheet = ss.getSheetByName(SHEETS.STUDENTS) || ss.insertSheet(SHEETS.STUDENTS);
  sheet.getRange(1, 1, 1, 12).setValues([[
    'student_id', 'rank', 'first_name', 'last_name', 'class_year', 'year_level',
    'email', 'telegram_chat_id', 'password', 'role', 'note', 'updated_at'
  ]]);

  // GoodDeeds sheet
  sheet = ss.getSheetByName(SHEETS.DEEDS) || ss.insertSheet(SHEETS.DEEDS);
  sheet.getRange(1, 1, 1, 14).setValues([[
    'id', 'student_id', 'category_id', 'hours', 'description', 'activity_date',
    'image_urls', 'status', 'submitted_at', 'approved_by', 'approved_at', 'reject_reason', 'note', 'updated_at'
  ]]);

  // Settings sheet
  sheet = ss.getSheetByName(SHEETS.SETTINGS) || ss.insertSheet(SHEETS.SETTINGS);
  sheet.getRange(1, 1, 1, 2).setValues([['key', 'value']]);

  return 'Setup complete!';
}

// ==================== IMPORT STUDENTS ====================
function importStudents(studentsJson) {
  const sheet = getSheet(SHEETS.STUDENTS);
  const students = JSON.parse(studentsJson);
  const now = new Date().toISOString();
  const rows = students.map(s => [
    s.student_id, s.rank, s.first_name, s.last_name, s.class_year, s.year_level,
    s.email || '', s.telegram_chat_id || '', s.student_id, // default password = student_id
    'student', s.note || '', now
  ]);
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 12).setValues(rows);
  }
  return { imported: rows.length };
}

// ==================== AUTH ====================
function login(data) {
  const { studentId, password, role } = data;
  if (role === 'student') {
    const sheet = getSheet(SHEETS.STUDENTS);
    const students = sheetToObjects(sheet);
    const student = students.find(s => s.student_id == studentId);
    if (!student) return { success: false, message: 'ไม่พบรหัสนักเรียน' };
    if (String(student.password) !== String(password)) return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };
    const token = Utilities.getUuid();
    PropertiesService.getScriptProperties().setProperty('token_' + studentId, token);
    return { success: true, token, user: { ...student, password: undefined } };
  }
  return { success: false, message: 'ไม่รองรับบทบาทนี้' };
}

// ==================== STUDENTS ====================
function getStudents() {
  return sheetToObjects(getSheet(SHEETS.STUDENTS)).map(s => ({ ...s, password: undefined }));
}

function getStudent(studentId) {
  const students = sheetToObjects(getSheet(SHEETS.STUDENTS));
  const s = students.find(st => st.student_id == studentId);
  return s ? { ...s, password: undefined } : null;
}

function updateProfile(data) {
  const { studentId, email, telegramChatId } = data;
  const sheet = getSheet(SHEETS.STUDENTS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const emailCol = headers.indexOf('email') + 1;
  const telegramCol = headers.indexOf('telegram_chat_id') + 1;
  const idCol = headers.indexOf('student_id') + 1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol - 1]) === String(studentId)) {
      if (email !== undefined) sheet.getRange(i + 1, emailCol).setValue(email);
      if (telegramChatId !== undefined) sheet.getRange(i + 1, telegramCol).setValue(telegramChatId);
      return { success: true };
    }
  }
  return { success: false, message: 'ไม่พบนักเรียน' };
}

function updatePassword(data) {
  const { studentId, newPassword } = data;
  const sheet = getSheet(SHEETS.STUDENTS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const pwdCol = headers.indexOf('password') + 1;
  const idCol = headers.indexOf('student_id') + 1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol - 1]) === String(studentId)) {
      sheet.getRange(i + 1, pwdCol).setValue(newPassword);
      return { success: true };
    }
  }
  return { success: false };
}

// ==================== GOOD DEEDS ====================
function addDeed(data) {
  const sheet = getSheet(SHEETS.DEEDS);
  const id = 'deed_' + Date.now() + '_' + Math.floor(Math.random() * 9999);
  const now = new Date().toISOString();
  const row = [
    id, data.studentId, data.categoryId, data.hours, data.description,
    data.activityDate, JSON.stringify(data.imageUrls || []),
    'pending', now, '', '', '', data.note || '', now
  ];
  sheet.appendRow(row);

  // Telegram notification
  const student = getStudent(data.studentId);
  if (student) {
    const settings = getSettings();
    if (settings.telegramToken && settings.adminChatId) {
      sendTelegram(settings.adminChatId, settings.telegramToken,
        `📌 <b>บันทึกความดีใหม่</b>\n👤 ${student.rank} ${student.first_name} ${student.last_name} (${student.student_id})\n⏱ ${data.hours} ชม.\n📝 ${data.description}`
      );
    }
  }
  return { success: true, id };
}

function getDeeds(studentId) {
  const deeds = sheetToObjects(getSheet(SHEETS.DEEDS));
  return studentId ? deeds.filter(d => String(d.student_id) === String(studentId)) : deeds;
}

function getAllPending() {
  const deeds = sheetToObjects(getSheet(SHEETS.DEEDS));
  return deeds.filter(d => d.status === 'pending');
}

function approveDeed(data) {
  return updateDeedStatus(data.deedId, 'approved', data.approvedBy, '');
}

function rejectDeed(data) {
  return updateDeedStatus(data.deedId, 'rejected', data.approvedBy, data.reason || '');
}

function updateDeedStatus(deedId, status, approvedBy, rejectReason) {
  const sheet = getSheet(SHEETS.DEEDS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf('id') + 1;
  const statusCol = headers.indexOf('status') + 1;
  const approvedByCol = headers.indexOf('approved_by') + 1;
  const approvedAtCol = headers.indexOf('approved_at') + 1;
  const rejectCol = headers.indexOf('reject_reason') + 1;
  const updatedCol = headers.indexOf('updated_at') + 1;

  for (let i = 1; i < values.length; i++) {
    if (values[i][idCol - 1] === deedId) {
      const now = new Date().toISOString();
      sheet.getRange(i + 1, statusCol).setValue(status);
      sheet.getRange(i + 1, approvedByCol).setValue(approvedBy || '');
      sheet.getRange(i + 1, approvedAtCol).setValue(now);
      sheet.getRange(i + 1, rejectCol).setValue(rejectReason || '');
      sheet.getRange(i + 1, updatedCol).setValue(now);

      // Notify student
      const studentId = values[i][headers.indexOf('student_id')];
      const student = getStudent(studentId);
      if (student && student.telegram_chat_id) {
        const settings = getSettings();
        const icon = status === 'approved' ? '✅' : '❌';
        const msg = status === 'approved'
          ? `${icon} <b>ความดีได้รับการอนุมัติ!</b>\nผู้อนุมัติ: ${approvedBy}`
          : `${icon} <b>ความดีถูกปฏิเสธ</b>\nเหตุผล: ${rejectReason}\nกรุณาแก้ไขและส่งใหม่`;
        sendTelegram(student.telegram_chat_id, settings.telegramToken, msg);
      }
      return { success: true };
    }
  }
  return { success: false, message: 'ไม่พบรายการ' };
}

// ==================== SUMMARY ====================
function getSummary(studentId) {
  const deeds = getDeeds(studentId);
  const approved = deeds.filter(d => d.status === 'approved');
  const totalHours = approved.reduce((s, d) => s + parseFloat(d.hours || 0), 0);
  return {
    totalHours,
    approvedCount: approved.length,
    pendingCount: deeds.filter(d => d.status === 'pending').length,
    rejectedCount: deeds.filter(d => d.status === 'rejected').length,
    passed: totalHours >= MIN_HOURS,
  };
}

// ==================== SETTINGS ====================
function getSettings() {
  try {
    const sheet = getSheet(SHEETS.SETTINGS);
    const rows = sheet.getDataRange().getValues().slice(1);
    const s = {};
    rows.forEach(r => { if (r[0]) s[r[0]] = r[1]; });
    return s;
  } catch (e) { return {}; }
}

// ==================== TELEGRAM ====================
function sendTelegram(chatId, token, message) {
  if (!token || !chatId) return false;
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const payload = { chat_id: chatId, text: message, parse_mode: 'HTML' };
    const options = { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload) };
    const res = UrlFetchApp.fetch(url, options);
    return JSON.parse(res.getContentText()).ok;
  } catch (e) { return false; }
}
