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
  DEFAULT_DRIVE_FOLDER_ID: '1Y6n_lYLIfIkg9Mt3pLtwWK0_4Lcw3Ysx',
  TELEGRAM_TOKEN: '8087838067:AAGld1ygsrvnyc6hDX02sGxyDOZwQbyRU0s',
  TELEGRAM_CHAT_ID: '-4839151586',
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
    return jsonResponse(handleTelegramCallback(data.callback_query));
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
  const studentId = String(data.studentId || '');
  const approverName = data.approvedBy || data.teacherName || 'ร.อ.อนุชิต ทำจะดี';
  const status = data.status || 'approved';
  const rejectReason = data.rejectReason || '';

  const sheet = getOrCreateSheet(SHEETS.DEEDS);
  if (sheet) {
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]) === deedId) {
        sheet.getRange(i + 1, 10).setValue(status); // Status Col
        sheet.getRange(i + 1, 9).setValue(approverName); // Approver Col
        break;
      }
    }
  }

  // Update Master Student Hours if approved
  if (status === 'approved' && data.categoryId && data.hours) {
    updateMasterStudentHours(studentId, parseInt(data.categoryId), parseFloat(data.hours));
  }

  return { status: 'success', deedId: deedId, newStatus: status };
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
      sheet.getRange(i + 1, catCol).setValue(currentCatHours + addedHours);

      const row = i + 1;
      sheet.getRange(row, 16).setFormula('=SUM(G' + row + ':O' + row + ')');
      sheet.getRange(row, 17).setValue('50 ชม./ปี');
      sheet.getRange(row, 18).setFormula('=IF(P' + row + '>=50, "ผ่านเกณฑ์ ✅", "ยังไม่ผ่าน ❌")');
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
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const fileUrl = 'https://lh3.googleusercontent.com/d/' + file.getId();
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

function handleTelegramCallback(cb) {
  const cbId = cb.id;
  const data = cb.data || '';
  const message = cb.message;
  const isApprove = data.startsWith('approve_');
  const isReject = data.startsWith('reject_');

  if (!isApprove && !isReject) return { status: 'ignored' };

  const parts = data.split('_');
  const deedId = parts[1] || '';
  const studentId = parts[2] || '';
  const approver = cb.from ? `${cb.from.first_name} ${cb.from.last_name || ''}`.trim() : 'อาจารย์ใน Telegram';

  // 1. Answer Telegram Alert
  UrlFetchApp.fetch(`https://api.telegram.org/bot${CONFIG.TELEGRAM_TOKEN}/answerCallbackQuery`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      callback_query_id: cbId,
      text: isApprove ? '✅ อนุมัติบันทึกความดีเรียบร้อยแล้ว!' : '❌ ปฏิเสธบันทึกความดีเรียบร้อยแล้ว!',
      show_alert: true
    })
  });

  // 2. Update DB
  approveDeed({
    deedId: deedId,
    studentId: studentId,
    status: isApprove ? 'approved' : 'rejected',
    approvedBy: approver
  });

  // 3. Edit Telegram Buttons
  if (message) {
    const slipUrl = `${CONFIG.FRONTEND_URL}/deed_slip.html?id=${deedId}&studentId=${studentId}`;
    UrlFetchApp.fetch(`https://api.telegram.org/bot${CONFIG.TELEGRAM_TOKEN}/editMessageReplyMarkup`, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        chat_id: message.chat.id,
        message_id: message.message_id,
        reply_markup: {
          inline_keyboard: [
            [{ text: isApprove ? `✅ อนุมัติแล้ว (${approver})` : '❌ ปฏิเสธแล้ว', callback_data: `done_${deedId}` }],
            [{ text: '📄 พิมพ์ใบบันทึกความดี (PDF Slip)', url: slipUrl }]
          ]
        }
      })
    });
  }

  return { status: 'success' };
}
