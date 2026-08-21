/**
 * Google Apps Script Backend for GoodDeeds 69
 * วิทยาลัยพยาบาลทหารอากาศ (วพอ.พอ.)
 * 
 * วิธีการ Deploy:
 * 1. เปิด Google Sheets ใหม่ใน Google Drive (ตั้งชื่อว่า: "ฐานข้อมูลความดี วพอ 2569")
 * 2. ไปที่เมนู ส่วนขยาย (Extensions) -> Apps Script
 * 3. วางโค้ดนี้ทั้งหมดลงใน Code.gs
 * 4. กดปุ่ม "ทำให้ใช้งานได้ (Deploy)" -> "การทำให้ใช้งานได้ใหม่ (New deployment)"
 * 5. เลือกประเภท: "เว็บแอป (Web app)"
 * 6. ตั้งค่า: 
 *    - ดำเนินการในฐานะ: ฉัน (Me)
 *    - ผู้มีสิทธิ์เข้าถึง: ทุกคน (Anyone)
 * 7. คัดลอก Web App URL (https://script.google.com/macros/s/.../exec) ส่งมาให้ผมใส่ในระบบ
 */

function doGet(e) {
  var action = e.parameter.action || 'getStudents';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === 'getStudents') {
    var sheet = getOrCreateSheet(ss, 'Students', ['student_id', 'rank', 'first_name', 'last_name', 'class_year', 'line_user_id', 'line_display_name', 'line_picture_url', 'updated_at']);
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var students = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        obj[headers[j]] = row[j];
      }
      students.push(obj);
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: students })).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', message: 'GoodDeeds GAS API is running' })).setMimeType(ContentService.MimeType.JSON);
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
  
  // 1. ผูก LINE ID
  if (action === 'bind_line') {
    var studentId = String(params.studentId || '');
    var lineUserId = String(params.lineUserId || '');
    var lineDisplayName = String(params.lineDisplayName || '');
    var linePictureUrl = String(params.linePictureUrl || '');
    
    var sheet = getOrCreateSheet(ss, 'Students', ['student_id', 'rank', 'first_name', 'last_name', 'class_year', 'line_user_id', 'line_display_name', 'line_picture_url', 'updated_at']);
    var data = sheet.getDataRange().getValues();
    var found = false;
    
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === studentId) {
        sheet.getRange(i + 1, 6).setValue(lineUserId);
        sheet.getRange(i + 1, 7).setValue(lineDisplayName);
        sheet.getRange(i + 1, 8).setValue(linePictureUrl);
        sheet.getRange(i + 1, 9).setValue(new Date());
        found = true;
        break;
      }
    }
    
    if (!found) {
      sheet.appendRow([studentId, '', '', '', '', lineUserId, lineDisplayName, linePictureUrl, new Date()]);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Bound LINE ID successfully' })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // 2. บันทึกความดี (Submit Deed)
  if (action === 'submit_deed') {
    var deed = params.deed || params;
    var deedSheet = getOrCreateSheet(ss, 'Deeds', ['id', 'student_id', 'categoryId', 'hours', 'activityDate', 'description', 'status', 'evidenceImages', 'submittedAt']);
    deedSheet.appendRow([
      deed.id || ('DEED-' + Date.now()),
      deed.studentId || (deed.student ? deed.student.student_id : ''),
      deed.categoryId || '',
      deed.hours || 0,
      deed.activityDate || '',
      deed.description || '',
      deed.status || 'pending',
      JSON.stringify(deed.images || []),
      new Date()
    ]);
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Deed saved' })).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown action' })).setMimeType(ContentService.MimeType.JSON);
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
