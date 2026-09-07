/**
 * Code.gs - Google Apps Script Master Cloud Backend
 * ระบบบันทึกความดีจิตอาสา วิทยาลัยพยาบาลทหารอากาศ (วพอ.) ปีการศึกษา 2569
 *
 * คุณสมบัติ:
 * 1. บันทึกข้อมูลและประวัติความดีลง Google Sheets อัตโนมัติ (Main_2569 & Deeds_2569)
 * 2. รองรับการอัปโหลดภาพถ่ายหลักฐานบันทึกลง Google Drive แยกโฟลเดอร์รายบุคคล
 * 3. แจ้งเตือนเข้ากลุ่ม Telegram พร้อมปุ่มกด [✅ อนุมัติด่วน] และ [✍️ ตรวจสอบ & ลงนาม]
 * 4. รองรับการตอบกลับ Telegram Callback Query อัตโนมัติแบบ Real-time
 * 5. ปฏิบัติตามมาตรฐาน PDPA: ข้อมูลส่วนบุคคลถูกจัดเก็บบน Google Cloud ส่วนตัวของสถาบัน
 */

// ==================== CONFIGURATION ====================
const CONFIG = {
  MIN_HOURS_SEMESTER: 25,
  MIN_HOURS_YEAR: 50,
  MAX_HOURS_SCALE: 400,
  ACADEMIC_YEAR: 2569,
  get DEFAULT_DRIVE_FOLDER_ID() { return PropertiesService.getScriptProperties().getProperty('EVIDENCE_FOLDER_ID') || ''; },
  get TELEGRAM_TOKEN() { return PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN') || ''; },
  get TELEGRAM_CHAT_ID() { return PropertiesService.getScriptProperties().getProperty('TELEGRAM_CHAT_ID') || ''; },
  FRONTEND_URL: 'https://anuchit1tube168-cmd.github.io/gooddeeds69/frontend'
};

const SHEETS = {
  STUDENTS: 'Main_2569',
  DEEDS: 'Deeds_2569',
  SETTINGS: 'Settings'
};

// ==================== SHEET HELPERS ====================
function getSS() {
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {}
  const prop = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (prop) return SpreadsheetApp.openById(prop);
  return null;
}

function getOrCreateSheet(name, headers) {
  const ss = getSS();
  if (!ss) return null;
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#0e1f3d')
        .setFontColor('#c9a227');
    }
  }
  return sheet;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== WEB APP ENTRY POINTS ====================
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'ping';
  const param = e ? e.parameter : {};

  try {
    if (action === 'ping') {
      return jsonResponse({
        status: 'success',
        message: 'GoodDeeds 69 Cloud Engine Active 🟢',
        time: new Date().toISOString()
      });
    }
    if (action === 'getStudents') return jsonResponse(getStudents());
    if (action === 'getStudent') return jsonResponse(getStudent(param.studentId));
    if (action === 'getDeeds') return jsonResponse(getDeeds(param.studentId));
    if (action === 'getSettings') return jsonResponse(getSettings());
    if (action === 'setupFolders') return jsonResponse(setupAllStudentFolders());

    return jsonResponse({
      status: 'success',
      message: 'GoodDeeds 69 Cloud Engine Active 🟢',
      time: new Date().toISOString()
    });
  } catch (err) {
    return jsonResponse({ status: 'error', error: err.toString() });
  }
}

function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return jsonResponse({ status: 'error', message: 'No post data received' });
  }

  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    data = e.parameter || {};
  }

  // Handle Telegram Interactive Inline Callback Buttons
  if (data.callback_query) {
    return jsonResponse(handleTelegramCallback(data.callback_query, e.parameter && e.parameter.webhookKey));
  }

  const action = data.action || '';
  try {
    if (action === 'submit_deed' || action === 'addDeed') return jsonResponse(addDeed(data));
    if (action === 'approveDeed' || action === 'updateDeedStatus') return jsonResponse(approveDeed(data));
    if (action === 'rejectDeed') return jsonResponse(rejectDeed(data));
    if (action === 'uploadImage' || data.base64) return jsonResponse(uploadImage(data));
    if (action === 'init_all_students') return jsonResponse(initAllStudents(data.students || []));
    if (action === 'bind_line') return jsonResponse(bindLineAccount(data));

    return jsonResponse({ status: 'error', message: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ status: 'error', error: err.toString() });
  }
}

// ==================== DEED LOGIC ====================
function addDeed(payload) {
  const deed = payload.deed || payload;
  const student = deed.student || {};
  const studentId = String(deed.studentId || student.student_id || '').trim();
  const hours = parseFloat(deed.hours || 0);
  const catId = parseInt(deed.categoryId || deed.category_id || 1);
  const deedId = deed.id || ('deed_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
  const desc = deed.description || deed.title || 'กิจกรรมจิตอาสา';
  const activityDate = deed.activityDate || deed.event_date || new Date().toISOString().split('T')[0];
  const location = deed.location || 'วิทยาลัยพยาบาลทหารอากาศ';
  const approver = deed.approver || deed.approved_by || 'ร.อ.อนุชิต ทำจะดี (Bird)';

  // 1. Handle image upload to Google Drive if base64 provided
  let imageUrl = deed.imageUrl || '';
  if (deed.imageData && deed.imageData.startsWith('data:image')) {
    const uploadRes = uploadImage({
      base64: deed.imageData,
      studentId: studentId,
      studentName: student.first_name ? `${student.first_name} ${student.last_name || ''}` : '',
      activityName: desc
    });
    if (uploadRes && uploadRes.url) {
      imageUrl = uploadRes.url;
    }
  }

  // 2. Append to Deeds Sheet
  const sheet = getOrCreateSheet(SHEETS.DEEDS, [
    'Deed ID', 'รหัสนักเรียน', 'หมวดหมู่ ID', 'จำนวนชั่วโมง', 'วันที่ทำกิจกรรม',
    'รายละเอียด', 'สถานที่', 'รูปหลักฐาน URL', 'ผู้ตรวจประเมิน', 'สถานะ', 'วันที่ส่งเรื่อง'
  ]);

  if (sheet) {
    sheet.appendRow([
      deedId,
      studentId,
      catId,
      hours,
      activityDate,
      desc,
      location,
      imageUrl,
      approver,
      'pending',
      new Date()
    ]);
  }

  // 3. Notify Admins via Telegram
  try {
    notifyTelegramNewDeed({
      id: deedId,
      studentId: studentId,
      studentName: student.first_name ? `${student.rank || 'นพอ.'} ${student.first_name} ${student.last_name || ''}`.trim() : `นพอ. (${studentId})`,
      classYear: student.class_year || studentId.substring(0, 2) || '69',
      category: catId,
      hours: hours,
      date: activityDate,
      desc: desc,
      location: location,
      imageUrl: imageUrl,
      approver: approver
    });
  } catch (te) {
    console.error('Telegram notification error:', te);
  }

  return {
    status: 'success',
    deedId: deedId,
    imageUrl: imageUrl,
    message: 'Deed recorded successfully'
  };
}

function approveDeed(data) {
  const deedId = String(data.deedId || data.id || '');
  const status = data.status || 'approved';
  if (!deedId || !['approved', 'rejected'].includes(status)) {
    return { status: 'error', code: 'invalid_review' };
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = getSS();
    const sheet = ss && ss.getSheetByName(SHEETS.DEEDS);
    if (!sheet) return { status: 'error', code: 'ledger_unavailable' };
    const values = sheet.getDataRange().getValues();
    const index = values.findIndex((row, i) => i > 0 && String(row[0]) === deedId);
    if (index < 0) return { status: 'error', code: 'deed_not_found' };
    const row = values[index];
    const studentId = String(row[1]);
    if (data.studentId && String(data.studentId) !== studentId) return { status: 'error', code: 'student_mismatch' };
    if (row[9] === status) return { status: 'success', deedId, newStatus: status, duplicate: true };
    // 'approving' marks an uncertain cross-sheet write. Never auto-retry its hours.
    if (row[9] !== 'pending') return { status: 'error', code: 'review_conflict' };
    const category = Number(row[2]);
    const hours = Number(row[3]);
    if (!Number.isInteger(category) || category < 1 || category > 9 || !Number.isFinite(hours) || hours <= 0 || hours > 24) {
      return { status: 'error', code: 'invalid_stored_deed' };
    }
    const master = ss.getSheetByName(SHEETS.STUDENTS);
    if (status === 'approved' && (!master || !master.getDataRange().getValues().some((r, i) => i > 0 && String(r[1]) === studentId))) {
      return { status: 'error', code: 'student_not_found' };
    }
    if (status === 'approved') {
      sheet.getRange(index + 1, 10).setValue('approving');
      SpreadsheetApp.flush();
      updateMasterStudentHours(studentId, category, hours);
      SpreadsheetApp.flush();
    }
    sheet.getRange(index + 1, 9).setValue(String(data.approvedBy || 'ผู้ตรวจ').slice(0, 120));
    sheet.getRange(index + 1, 10).setValue(status);
    SpreadsheetApp.flush();
    return { status: 'success', deedId, newStatus: status };
  } finally {
    lock.releaseLock();
  }
}

function rejectDeed(data) {
  data.status = 'rejected';
  return approveDeed(data);
}

function getDeeds(studentId) {
  const sheet = getOrCreateSheet(SHEETS.DEEDS);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  const deeds = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!studentId || String(row[1]) === String(studentId)) {
      deeds.push({
        id: String(row[0]),
        studentId: String(row[1]),
        categoryId: parseInt(row[2]) || 1,
        hours: parseFloat(row[3]) || 0,
        activityDate: String(row[4]),
        description: String(row[5]),
        location: String(row[6]),
        imageUrl: String(row[7]),
        approvedBy: String(row[8]),
        status: String(row[9]),
        submittedAt: row[10]
      });
    }
  }
  return deeds;
}

// ==================== STUDENTS & SETTINGS ====================
function getStudents() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('students_api_v3');
  if (cached) {
    return JSON.parse(cached);
  }

  const sheet = getOrCreateSheet(SHEETS.STUDENTS);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const students = [];
  for (let i = 1; i < data.length; i++) {
    const sid = String(data[i][1] || '').trim();
    if (!sid || sid === 'undefined') continue;

    const classYearRaw = String(data[i][5] || '');
    const classYear = classYearRaw.replace(/รุ่น\s*/, '').trim();
    let yearLevel = '1';
    if (classYear === '69') yearLevel = '1';
    else if (classYear === '68') yearLevel = '2';
    else if (classYear === '67') yearLevel = '3';
    else if (classYear === '66') yearLevel = '4';

    students.push({
      student_id: sid,
      rank: String(data[i][2] || 'นพอ.'),
      first_name: String(data[i][3] || ''),
      last_name: String(data[i][4] || ''),
      full_name: `${data[i][2] || 'นพอ.'} ${data[i][3] || ''} ${data[i][4] || ''}`.trim(),
      class_year: classYear,
      year_level: yearLevel,
      role: 'student',
      total_hours: parseFloat(data[i][15] || 0)
    });
  }

  const jsonStr = JSON.stringify(students);
  cache.put('students_api_v3', jsonStr, 300); // 5 mins cache
  return students;
}

function getStudent(studentId) {
  const students = getStudents();
  return students.find(s => String(s.student_id) === String(studentId)) || null;
}

function getSettings() {
  return {
    academic_year: CONFIG.ACADEMIC_YEAR,
    min_hours_semester: CONFIG.MIN_HOURS_SEMESTER,
    min_hours_year: CONFIG.MIN_HOURS_YEAR,
    max_hours_scale: CONFIG.MAX_HOURS_SCALE
  };
}

function updateMasterStudentHours(studentId, catId, addedHours) {
  const sheet = getOrCreateSheet(SHEETS.STUDENTS);
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  const catCol = 6 + catId; // Cols G..O

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(studentId)) {
      const currentCatHours = parseFloat(data[i][catCol - 1] || 0);
      const totalCell = sheet.getRange(i + 1, 16);
      const totalFormula = totalCell.getFormula();
      const storedTotal = data[i][15];
      if (!totalFormula && (storedTotal === '' || storedTotal === null || !Number.isFinite(Number(storedTotal)))) {
        throw new Error('master_total_requires_reconciliation');
      }
      sheet.getRange(i + 1, catCol).setValue(currentCatHours + addedHours);
      // Preserve an existing formula and all policy/result columns. A numeric
      // total may include historical carry-forward, so increment, never rebuild.
      if (!totalFormula) totalCell.setValue(Number(storedTotal) + addedHours);
      break;
    }
  }
}

// ==================== IMAGE UPLOAD (GOOGLE DRIVE) ====================
function uploadImage(data) {
  const mainFolderId = data.folderId || CONFIG.DEFAULT_DRIVE_FOLDER_ID;
  let base64 = data.base64 || '';
  const filename = data.filename || 'evidence_' + Date.now() + '.jpg';
  const mimeType = data.mimeType || 'image/jpeg';
  const studentId = data.studentId || '';

  if (!base64) return { status: 'error', message: 'No base64 image data provided' };
  if (base64.indexOf('base64,') !== -1) base64 = base64.split('base64,')[1];
  const blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, filename);

  let targetFolder = DriveApp.getFolderById(mainFolderId);

  if (studentId) {
    const classYear = studentId.substring(0, 2);
    const genFolderName = '0' + (5 - (70 - parseInt(classYear))) + '_ชั้นปี (รุ่น ' + classYear + ')';
    const genFolders = targetFolder.getFoldersByName(genFolderName);
    targetFolder = genFolders.hasNext() ? genFolders.next() : targetFolder.createFolder(genFolderName);

    const studentName = data.studentName || '';
    const studentFolderName = studentId + (studentName ? ' - ' + studentName : '');
    const subfolders = targetFolder.getFoldersByName(studentFolderName);
    targetFolder = subfolders.hasNext() ? subfolders.next() : targetFolder.createFolder(studentFolderName);
  }

  const file = targetFolder.createFile(blob);
  file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
  const fileUrl = file.getUrl(); // Access remains private; secure evidence API is required for students.
  return { status: 'success', fileId: file.getId(), url: fileUrl };
}

// ==================== TELEGRAM NOTIFICATION & CALLBACKS ====================
function notifyTelegramNewDeed(d) {
  const approveUrl = `${CONFIG.FRONTEND_URL}/approve_sign.html?id=${d.id}&studentId=${d.studentId}&name=${encodeURIComponent(d.studentName)}&year=${encodeURIComponent(d.classYear)}&cat=${d.category}&hours=${d.hours}&date=${d.date}&desc=${encodeURIComponent(d.desc)}&loc=${encodeURIComponent(d.location)}&appr=${encodeURIComponent(d.approver)}&status=pending`;
  const slipUrl = `${CONFIG.FRONTEND_URL}/deed_slip.html?id=${d.id}&studentId=${d.studentId}&name=${encodeURIComponent(d.studentName)}&year=${encodeURIComponent(d.classYear)}&cat=${d.category}&hours=${d.hours}&date=${d.date}&desc=${encodeURIComponent(d.desc)}&loc=${encodeURIComponent(d.location)}&appr=${encodeURIComponent(d.approver)}&status=pending`;

  const text = `📋 <b>มีบันทึกความดีใหม่รอการอนุมัติ (วพอ. 2569)</b>\n━━━━━━━━━━━━━━━━━━━━━━━\n👤 <b>นักเรียน:</b> ${d.studentName}\n🎫 <b>รหัส นพอ.:</b> <code>${d.studentId}</code> | รุ่น ${d.classYear}\n📂 <b>หมวดที่ ${d.category}</b>\n⏱ <b>จำนวน:</b> ${d.hours} ชั่วโมง\n📅 <b>วันที่:</b> ${d.date}\n📍 <b>สถานที่:</b> ${d.location}\n📝 <b>รายละเอียด:</b> ${d.desc}\n\n👩‍🏫 <b>เสนอตรวจโดย:</b> ${d.approver}\n━━━━━━━━━━━━━━━━━━━━━━━\n<i>กรุณาตรวจสอบและกดอนุมัติหรือลงนามด้านล่าง:</i>`;

  const payload = {
    chat_id: CONFIG.TELEGRAM_CHAT_ID,
    text: text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ อนุมัติด่วน', callback_data: `approve_${d.id}_${d.studentId}` },
          { text: '❌ ปฏิเสธ', callback_data: `reject_${d.id}_${d.studentId}` }
        ],
        [
          { text: '✍️ ตรวจสอบ & ลงนาม', url: approveUrl },
          { text: '📄 พิมพ์สลิป A4 (PDF)', url: slipUrl }
        ]
      ]
    }
  };

  UrlFetchApp.fetch(`https://api.telegram.org/bot${CONFIG.TELEGRAM_TOKEN}/sendMessage`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  });
}

// Apps Script cannot inspect Telegram's secret header. A high-entropy query
// key authenticates this legacy endpoint; prefer the Cloudflare header gateway.
function handleTelegramCallback(cb, suppliedKey) {
  const props = PropertiesService.getScriptProperties();
  const expected = props.getProperty('TELEGRAM_WEBHOOK_KEY') || '';
  if (expected.length < 32 || String(suppliedKey || '') !== expected) return { status: 'error', code: 'webhook_unauthorized' };
  const allowed = (props.getProperty('TELEGRAM_APPROVER_IDS') || '').split(',').map(x => x.trim()).filter(Boolean);
  if (!cb || !cb.from || !allowed.includes(String(cb.from.id)) || !cb.message || String(cb.message.chat.id) !== String(props.getProperty('TELEGRAM_CHAT_ID') || '')) {
    return { status: 'error', code: 'reviewer_forbidden' };
  }
  // Greedy middle group preserves deed IDs such as deed_123_abcd.
  const match = /^(approve|reject)_(.+)_(\d{7})$/.exec(String(cb.data || ''));
  if (!match) return { status: 'ignored' };
  let result;
  try {
    result = approveDeed({ deedId: match[2], studentId: match[3], status: match[1] === 'approve' ? 'approved' : 'rejected', approvedBy: 'telegram:' + cb.from.id });
  } catch (error) {
    result = { status: 'error', code: 'review_write_failed' };
  }
  const saved = result.status === 'success';
  // A notification failure never rolls back or repeats the persisted approval.
  try {
    UrlFetchApp.fetch('https://api.telegram.org/bot' + CONFIG.TELEGRAM_TOKEN + '/answerCallbackQuery', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      payload: JSON.stringify({ callback_query_id: cb.id, text: saved ? 'บันทึกผลการตรวจแล้ว' : 'ยังบันทึกผลไม่ได้ กรุณาให้ผู้ดูแลตรวจสอบ', show_alert: true })
    });
    if (saved) UrlFetchApp.fetch('https://api.telegram.org/bot' + CONFIG.TELEGRAM_TOKEN + '/editMessageReplyMarkup', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      payload: JSON.stringify({ chat_id: cb.message.chat.id, message_id: cb.message.message_id, reply_markup: { inline_keyboard: [] } })
    });
  } catch (error) { console.warn('Telegram delivery failed after review; inspect backend state.'); }
  return result;
}
