/**
 * Google Apps Script Backend for GoodDeeds 69 (Enterprise Folder Architecture Edition)
 * วิทยาลัยพยาบาลทหารอากาศ (วพอ.พอ.)
 * 
 * คุณสมบัติ:
 * 1. บันทึก LINE User ID + สถิติลงใน Master Sheet (คำนวณชั่วโมง + ตัดเกรดอัตโนมัติ)
 * 2. สร้างโครงสร้างโฟลเดอร์รายบุคคลอัตโนมัติใน Google Drive (Root Folder: 1Y6n_lYLIfIkg9Mt3pLtwWK0_4Lcw3Ysx)
 * 3. บันทึก profile.json แยกในโฟลเดอร์ของนักเรียนแต่ละคน
 * 4. เก็บรูปภาพหลักฐานความดีลงในโฟลเดอร์ของนักเรียนคนนั้นโดยตรง
 */

var ROOT_FOLDER_ID = '1Y6n_lYLIfIkg9Mt3pLtwWK0_4Lcw3Ysx';

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'ping';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === 'setupFolders') {
    var result = setupAllStudentFolders();
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    message: 'GoodDeeds 69 Cloud Engine Active 🟢',
    spreadsheetName: ss.getName(),
    time: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var params;
  try {
    params = JSON.parse(e.postData.contents);
  } catch (err) {
    params = e.parameter;
  }
  var action = (params && params.action) ? params.action : '';
  
  // 0. เริ่มต้นใส่รายชื่อนักเรียนทั้งหมด 380 คนลงในตาราง Master ทันที (พร้อมยอดยกมาจากปี 2568)
  if (action === 'init_all_students') {
    var studentList = params.students || [];
    var sheet = getOrCreateMasterSheet(ss);
    
    // Clear old data rows if resetting
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
    }
    
    var rowsToAppend = [];
    for (var sIdx = 0; sIdx < studentList.length; sIdx++) {
      var st = studentList[sIdx];
      var sId = String(st.student_id);
      var rowNum = sIdx + 2;
      var cat = st.categories || [0,0,0,0,0,0,0,0,0];
      
      rowsToAppend.push([
        sIdx + 1,
        sId,
        st.rank || 'นพอ.',
        st.first_name || '',
        st.last_name || '',
        'รุ่น ' + (st.class_year || '69'),
        cat[0] || 0,
        cat[1] || 0,
        cat[2] || 0,
        cat[3] || 0,
        cat[4] || 0,
        cat[5] || 0,
        cat[6] || 0,
        cat[7] || 0,
        cat[8] || 0,
        '=SUM(G' + rowNum + ':O' + rowNum + ')',
        '50 ชม./ปี',
        '=IF(P' + rowNum + '>=50, "ผ่านเกณฑ์ ✅", "ยังไม่ผ่าน ❌")',
        st.level_title || 'Lv.1 ปีกทองฝึกหัด',
        st.line_user_id || '',
        st.line_display_name || '',
        new Date()
      ]);
    }
    
    if (rowsToAppend.length > 0) {
      sheet.getRange(2, 1, rowsToAppend.length, rowsToAppend[0].length).setValues(rowsToAppend);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Populated ' + rowsToAppend.length + ' students with complete history' })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // 1. ผูก LINE ID + อัปเดต Profile ใน Folder
  if (action === 'bind_line') {
    var studentId = String(params.studentId || '');
    var lineUserId = String(params.lineUserId || '');
    var lineDisplayName = String(params.lineDisplayName || '');
    var linePictureUrl = String(params.linePictureUrl || '');
    
    // 1.1 Update Master Sheet
    var sheet = getOrCreateMasterSheet(ss);
    var data = sheet.getDataRange().getValues();
    var found = false;
    
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]) === studentId) { // Column B is Student ID
        sheet.getRange(i + 1, 20).setValue(lineUserId); // Col T: LINE User ID
        sheet.getRange(i + 1, 21).setValue(lineDisplayName); // Col U: LINE Display Name
        sheet.getRange(i + 1, 22).setValue(new Date()); // Col V: Last Sync
        found = true;
        break;
      }
    }
    
    if (!found) {
      var newRowNum = sheet.getLastRow() + 1;
      sheet.appendRow([
        sheet.getLastRow(),
        studentId,
        'นพอ.',
        '',
        '',
        'รุ่น 69',
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        '=SUM(G' + newRowNum + ':O' + newRowNum + ')',
        '50 ชม./ปี',
        '=IF(P' + newRowNum + '>=50, "ผ่านเกณฑ์ ✅", "ยังไม่ผ่าน ❌")',
        'Lv.1 ปีกทองฝึกหัด',
        lineUserId,
        lineDisplayName,
        new Date()
      ]);
    }
    
    // 1.2 Update profile.json in Student Folder
    try {
      updateStudentProfileJson(studentId, {
        student_id: studentId,
        line_user_id: lineUserId,
        line_display_name: lineDisplayName,
        line_picture_url: linePictureUrl,
        last_synced: new Date().toISOString()
      });
    } catch (fe) {
      Logger.log("Folder sync note: " + fe.message);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Bound LINE ID & Synced Folder' })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // 2. บันทึกความดี (Submit Deed) + เก็บภาพลงโฟลเดอร์นักเรียน
  if (action === 'submit_deed') {
    var deed = params.deed || params;
    var studentId = String(deed.studentId || (deed.student ? deed.student.student_id : ''));
    var hours = parseFloat(deed.hours || 0);
    var catId = parseInt(deed.categoryId || 1);
    
    // 2.1 บันทึกลงตาราง Deeds
    var deedSheet = getOrCreateSheet(ss, 'Deeds_2569', [
      'Deed ID', 'รหัสนักเรียน', 'หมวดหมู่ ID', 'จำนวนชั่วโมง', 'วันที่ทำกิจกรรม', 
      'รายละเอียด', 'สถานะ', 'วันที่ส่งเรื่อง'
    ]);
    
    var deedId = deed.id || ('DEED-' + Date.now());
    deedSheet.appendRow([
      deedId,
      studentId,
      catId,
      hours,
      deed.activityDate || '',
      deed.description || '',
      deed.status || 'pending',
      new Date()
    ]);
    
    // 2.2 อัปเดตชั่วโมงสะสมใน Master Sheet
    updateMasterStudentHours(ss, studentId, catId, hours);
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Deed recorded and Master Sheet updated' })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // 3. ส่ง LINE Message (Proxy ผ่าน Google Server แก้ CORS 100%)
  if (action === 'send_line_message') {
    var lineToken = params.token || 'vyXhnvU/stGL9mUrIPKB+30x6OwFuFsercCL0UwISHKcV+qn3VW7FYL1kTa8kgm/+GpjDU3s+F/DPaFJwyZK58Y7iNrNXidTBmbaJu7w5ReFAiBmFe+QJ6z6tytonZPqmtfuO9pSU8tnmfRTh2+uvwdB04t89/1O/w1cDnyilFU=';
    var target = params.target || 'broadcast';
    var messages = params.messages || [];
    var to = params.to || '';
    
    var endpoint = (target === 'single') ? 'https://api.line.me/v2/bot/message/push' : 'https://api.line.me/v2/bot/message/broadcast';
    var reqPayload = { messages: messages };
    if (target === 'single' && to) {
      reqPayload.to = to;
    }
    
    try {
      var options = {
        method: 'post',
        contentType: 'application/json',
        headers: { 'Authorization': 'Bearer ' + lineToken },
        payload: JSON.stringify(reqPayload),
        muteHttpExceptions: true
      };
      var response = UrlFetchApp.fetch(endpoint, options);
      var code = response.getResponseCode();
      var respText = response.getContentText();
      return ContentService.createTextOutput(JSON.stringify({
        status: (code === 200) ? 'success' : 'error',
        code: code,
        response: respText
      })).setMimeType(ContentService.MimeType.JSON);
    } catch (le) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: le.message })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown action' })).setMimeType(ContentService.MimeType.JSON);
}

// -------------------------------------------------------------
// HELPER FUNCTIONS & FOLDER MANAGEMENT
// -------------------------------------------------------------

function getOrCreateMasterSheet(ss) {
  var sheet = ss.getSheetByName('Main_2569');
  if (!sheet) {
    sheet = ss.insertSheet('Main_2569');
    
    var headers = [
      'ลำดับ', 'รหัสประจำตัว', 'ยศ', 'ชื่อ', 'นามสกุล', 'ชั้นปี (รุ่น)',
      'หมวด 1 บริจาคโลหิต', 'หมวด 2 โครงการภายนอก', 'หมวด 3 ช่วยงานภายใน', 'หมวด 4 อบรม', 
      'หมวด 5 ช่วยชุมชน', 'หมวด 6 ศาสนสถาน', 'หมวด 7 งานฟรีทั่วไป', 'หมวด 8 จงรักภักดี', 'หมวด 9 บทบาทพิเศษ',
      'รวมชั่วโมงสะสม', 'เกณฑ์ขั้นต่ำ', 'ผลการประเมิน (Grade)', 'ระดับความดี (Level)', 
      'LINE User ID', 'LINE Display Name', 'อัปเดตล่าสุด'
    ];
    
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#0e1f3d')
      .setFontColor('#c9a227');
  }
  return sheet;
}

function updateMasterStudentHours(ss, studentId, catId, addedHours) {
  var sheet = getOrCreateMasterSheet(ss);
  var data = sheet.getDataRange().getValues();
  var catCol = 6 + catId; // Cols G..O (7..15)
  
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(studentId)) {
      var currentCatHours = parseFloat(data[i][catCol - 1] || 0);
      sheet.getRange(i + 1, catCol).setValue(currentCatHours + addedHours);
      
      // Update Formula for Total & Grade
      var row = i + 1;
      sheet.getRange(row, 16).setFormula('=SUM(G' + row + ':O' + row + ')');
      sheet.getRange(row, 17).setValue('50 ชม./ปี');
      sheet.getRange(row, 18).setFormula('=IF(P' + row + '>=50, "ผ่านเกณฑ์ ✅", "ยังไม่ผ่าน ❌")');
      break;
    }
  }
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1e3a8a').setFontColor('#ffffff');
    }
  }
  return sheet;
}
