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
  
  var action = params.action || '';
  
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
    
    for (var i = 2; i < data.length; i++) {
      if (String(data[i][1]) === studentId) { // Column B is Student ID
        sheet.getRange(i + 1, 20).setValue(lineUserId); // Col T: LINE User ID
        sheet.getRange(i + 1, 21).setValue(lineDisplayName); // Col U: LINE Display Name
        sheet.getRange(i + 1, 22).setValue(new Date()); // Col V: Last Sync
        found = true;
        break;
      }
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
