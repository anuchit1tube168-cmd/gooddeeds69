/**
 * Code.gs - Google Apps Script Backend
 * ระบบบันทึกความดี วิทยาลัยพยาบาลทหารอากาศ
 */

// ==================== CONFIG ====================
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
const MIN_HOURS = 36;
const TELEGRAM_TOKEN = '8087838067:AAEejIlFni8e9DWVxKpRomTFlmjxYJVNJ0k';
const ADMIN_CHAT_ID = '-4839151586';

// ==================== SHEET NAMES ====================
const SHEETS = {
  STUDENTS: 'Students',
  DEEDS: 'GoodDeeds',
  SETTINGS: 'Settings',
};

// ==================== WEB APP ENTRY POINTS ====================
function doGet(e) {
  const action = e ? e.parameter.action : '';
  try {
    if (action === 'getStudents') return jsonResponse(getStudents());
    if (action === 'getStudent') return jsonResponse(getStudent(e.parameter.studentId));
    if (action === 'getDeeds') return jsonResponse(getDeeds(e.parameter.studentId));
    if (action === 'getSummary') return jsonResponse(getSummary(e.parameter.studentId));
    if (action === 'getAllPending') return jsonResponse(getAllPending());
    if (action === 'getSettings') return jsonResponse(getSettings());
    if (action === 'ping') return jsonResponse({ status: 'ok', time: new Date().toISOString() });
    return jsonResponse({ error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return jsonResponse({ error: 'No post data' });
  }

  const data = JSON.parse(e.postData.contents);

  // Handle Telegram Interactive Callback Buttons (อนุมัติ/ปฏิเสธผ่าน Telegram ตรงๆ)
  if (data.callback_query) {
    return jsonResponse(handleTelegramCallback(data.callback_query));
  }

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

// ==================== TELEGRAM INTERACTIVE CALLBACK HANDLER ====================
function handleTelegramCallback(callbackQuery) {
  const callbackId = callbackQuery.id;
  const dataStr = callbackQuery.data || '';
  const message = callbackQuery.message;

  let isApprove = dataStr.startsWith('approve_');
  let isReject = dataStr.startsWith('reject_');

  if (!isApprove && !isReject) {
    answerCallbackQuery(callbackId, '⚠️ คำสั่งไม่ถูกต้อง');
    return { status: 'error' };
  }

  const parts = dataStr.split('_');
  const deedId = parts[1] || '';
  const studentId = parts[2] || '';

  const newStatus = isApprove ? 'approved' : 'rejected';
  const approvedBy = callbackQuery.from ? (callbackQuery.from.first_name + ' ' + (callbackQuery.from.last_name || '')) : 'อาจารย์ใน Telegram';

  // Perform status update
  updateDeedStatus(deedId, newStatus, approvedBy, isReject ? 'ปฏิเสธผ่าน Telegram' : '');

  // 1. Answer Popup in Telegram
  const alertText = isApprove ? '✅ อนุมัติบันทึกความดีเรียบร้อยแล้ว!' : '❌ ปฏิเสธบันทึกความดีเรียบร้อยแล้ว!';
  answerCallbackQuery(callbackId, alertText);

  // 2. Edit Telegram Caption/Text to reflect approved state
  if (message) {
    const updatedCaption = (message.text || message.caption || '') + '\n\n' + (isApprove ? '✅ <b>อนุมัติเรียบร้อยแล้ว</b> โดย ' + approvedBy : '❌ <b>ปฏิเสธเรียบร้อยแล้ว</b>');
    editTelegramMessage(message.chat.id, message.message_id, updatedCaption);
  }

  return { status: 'success', deedId: deedId, newStatus: newStatus };
}

function answerCallbackQuery(callbackQueryId, text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`;
  const payload = { callback_query_id: callbackQueryId, text: text, show_alert: true };
  UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload) });
}

function editTelegramMessage(chatId, messageId, text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`;
  const payload = { chat_id: chatId, message_id: messageId, text: text, parse_mode: 'HTML' };
  try {
    UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload) });
  } catch (e) {
    // If it's a photo message, edit caption instead
    const photoUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageCaption`;
    const photoPayload = { chat_id: chatId, message_id: messageId, caption: text, parse_mode: 'HTML' };
    try { UrlFetchApp.fetch(photoUrl, { method: 'post', contentType: 'application/json', payload: JSON.stringify(photoPayload) }); } catch (err) {}
  }
}

// ==================== IMAGE UPLOAD ====================
function uploadImage(data) {
  const DEFAULT_FOLDER_ID = '1Y6n_lYLIfIkg9Mt3pLtwWK0_4Lcw3Ysx';
  const mainFolderId = data.folderId || PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID') || DEFAULT_FOLDER_ID;
  let base64 = data.base64;
  const filename = data.filename || 'upload_' + Date.now() + '.jpg';
  const mimeType = data.mimeType || 'image/jpeg';
  const studentId = data.studentId || '';
  
  let classYear = data.classYear || '';
  if (!classYear && studentId && studentId.length >= 2) {
    classYear = studentId.substring(0, 2);
  }
  
  if (!base64) return { status: 'error', message: 'No base64 image data provided' };
  if (base64.indexOf('base64,') !== -1) base64 = base64.split('base64,')[1];
  const blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, filename);
  let file;
  if (mainFolderId) {
    let mainFolder = DriveApp.getFolderById(mainFolderId);
    let targetFolder = mainFolder;
    
    if (classYear) {
      const genFolderName = 'ปีการศึกษา 2569 (รุ่น ' + classYear + ')';
      const genFolders = mainFolder.getFoldersByName(genFolderName);
      if (genFolders.hasNext()) {
        targetFolder = genFolders.next();
      } else {
        targetFolder = mainFolder.createFolder(genFolderName);
      }
    }
    
    if (studentId) {
      const studentName = data.studentName || '';
      const studentFolderName = studentId + (studentName ? ' - ' + studentName : '');
      const subfolders = targetFolder.getFoldersByName(studentFolderName);
      if (subfolders.hasNext()) {
        targetFolder = subfolders.next();
      } else {
        targetFolder = targetFolder.createFolder(studentFolderName);
      }
    }

    // Activity Sub-folder
    const activityName = data.activityName || data.categoryName || '';
    if (activityName) {
      const actFolderName = activityName.replace(/[\/\\:*?"<>|]/g, '_');
      const actFolders = targetFolder.getFoldersByName(actFolderName);
      if (actFolders.hasNext()) {
        targetFolder = actFolders.next();
      } else {
        targetFolder = targetFolder.createFolder(actFolderName);
      }
    }

    file = targetFolder.createFile(blob);
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

// ==================== DEED & STUDENT LOGIC ====================
function updateDeedStatus(deedId, status, approvedBy, rejectReason) {
  try {
    const sheet = getSheet(SHEETS.DEEDS);
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return false;
    const headers = data[0];
    const idCol = headers.indexOf('id');
    const statusCol = headers.indexOf('status');
    const approvedByCol = headers.indexOf('approved_by');

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(deedId)) {
        sheet.getRange(i + 1, statusCol + 1).setValue(status);
        if (approvedByCol !== -1) sheet.getRange(i + 1, approvedByCol + 1).setValue(approvedBy);
        return true;
      }
    }
  } catch (e) {
    return false;
  }
  return false;
}

function getStudents() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('students_data');
  if (cached) {
    return JSON.parse(cached);
  }

  try {
    const FOLDER_ID = '1Y6n_lYLIfIkg9Mt3pLtwWK0_4Lcw3Ysx';
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const files = folder.getFilesByName('students_data.json');
    
    if (files.hasNext()) {
      const file = files.next();
      const content = file.getBlob().getDataAsString();
      
      // Cache the string representation for 5 minutes (300 seconds)
      cache.put('students_data', content, 300);
      
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error fetching students:', err);
  }
  
  return [];
}

function getSettings() {
  return {
    academic_year: '2569',
    min_hours: MIN_HOURS
  };
}

function getStudentPhotoDriveUrl(studentId) {
  try {
    const FOLDER_ID = '1Y6n_lYLIfIkg9Mt3pLtwWK0_4Lcw3Ysx';
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const photoFolders = folder.getFoldersByName('photos');
    
    if (photoFolders.hasNext()) {
      const photoFolder = photoFolders.next();
      const files = photoFolder.searchFiles("title contains '" + studentId + "'");
      if (files.hasNext()) {
        const file = files.next();
        return 'https://lh3.googleusercontent.com/d/' + file.getId();
      }
    }
  } catch (err) {
    console.error('Error fetching photo URL:', err);
  }
  return '';
}
function getStudent(id) { return null; }
function getDeeds(id) { return []; }
function getSummary(id) { return { totalHours: 0 }; }
function getAllPending() { return []; }
function login(data) { return { status: 'success' }; }
function addDeed(data) { return { status: 'success' }; }
function approveDeed(data) { return { status: 'success' }; }
function rejectDeed(data) { return { status: 'success' }; }
function updateProfile(data) { return { status: 'success' }; }
function updatePassword(data) { return { status: 'success' }; }
