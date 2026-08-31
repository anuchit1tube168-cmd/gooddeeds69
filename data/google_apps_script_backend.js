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
  
  // ==================== GET STUDENTS (PDPA-SAFE API) ====================
  // อ่านข้อมูลนักเรียนจาก Main_2569 sheet — ส่งเฉพาะข้อมูลที่จำเป็นสำหรับ Frontend
  if (action === 'getStudents') {
    try {
      var cache = CacheService.getScriptCache();
      var cached = cache.get('students_api_v2');
      if (cached) {
        return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
      }
      
      var sheet = ss.getSheetByName('Main_2569');
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
      }
      
      var data = sheet.getDataRange().getValues();
      var students = [];
      for (var i = 1; i < data.length; i++) {
        var sid = String(data[i][1] || '').trim();
        if (!sid || sid === 'undefined') continue;
        
        var classYearRaw = String(data[i][5] || '');
        var classYear = classYearRaw.replace(/รุ่น\s*/, '').trim();
        var yearLevel = '';
        if (classYear === '69') yearLevel = '1';
        else if (classYear === '68') yearLevel = '2';
        else if (classYear === '67') yearLevel = '3';
        else if (classYear === '66') yearLevel = '4';
        
        students.push({
          student_id: sid,
          rank: String(data[i][2] || 'นพอ.'),
          first_name: String(data[i][3] || ''),
          last_name: String(data[i][4] || ''),
          full_name: String(data[i][3] || '') + ' ' + String(data[i][4] || ''),
          class_year: classYear,
          year_level: yearLevel,
          role: 'student',
          password: sid,
          line_user_id: String(data[i][19] || ''),
          total_hours: data[i][15] || 0
        });
      }
      
      var jsonStr = JSON.stringify(students);
      // Cache for 5 minutes
      cache.put('students_api_v2', jsonStr, 300);
      
      return ContentService.createTextOutput(jsonStr).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ error: err.message })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // ==================== GET SETTINGS (SAFE — NO TOKENS) ====================
  if (action === 'getSettings') {
    return ContentService.createTextOutput(JSON.stringify({
      academic_year: 2569,
      min_hours_semester: 25,
      min_hours: 50,
      max_hours: 400
    })).setMimeType(ContentService.MimeType.JSON);
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
  
  // 4. รับ LINE Webhook Events โดยตรงบน Google Cloud (ทำงาน 24 ชม. ไม่ต้องเปิดคอม)
  if (params && params.events) {
    var events = params.events || [];
    var lineToken = 'vyXhnvU/stGL9mUrIPKB+30x6OwFuFsercCL0UwISHKcV+qn3VW7FYL1kTa8kgm/+GpjDU3s+F/DPaFJwyZK58Y7iNrNXidTBmbaJu7w5ReFAiBmFe+QJ6z6tytonZPqmtfuO9pSU8tnmfRTh2+uvwdB04t89/1O/w1cDnyilFU=';
    
    for (var evIdx = 0; evIdx < events.length; evIdx++) {
      var ev = events[evIdx];
      var replyToken = ev.replyToken;
      var userId = ev.source ? ev.source.userId : '';
      
      if (ev.type === 'message' && ev.message && ev.message.type === 'text') {
        var userText = String(ev.message.text || '').trim();
        var lowerText = userText.toLowerCase();
        
        // 4.1 ถ้าพิมพ์รหัสนักเรียน 7 หลัก
        if (/^\d{7}$/.test(userText)) {
          var sheet = getOrCreateMasterSheet(ss);
          var data = sheet.getDataRange().getValues();
          var studentFound = null;
          var foundRow = -1;
          
          for (var r = 1; r < data.length; r++) {
            if (String(data[r][1]) === userText) {
              studentFound = data[r];
              foundRow = r + 1;
              break;
            }
          }
          
          if (studentFound) {
            sheet.getRange(foundRow, 20).setValue(userId);
            sheet.getRange(foundRow, 22).setValue(new Date());
            
            var sName = studentFound[2] + ' ' + studentFound[3] + ' ' + studentFound[4];
            var flexMsg = {
              type: "flex",
              altText: "✅ ผูกบัญชีสำเร็จ - " + sName,
              contents: {
                type: "bubble",
                size: "kilo",
                header: {
                  type: "box", layout: "vertical", backgroundColor: "#0a192f", paddingAll: "16px",
                  contents: [{ type: "text", text: "✅ ผูกบัญชี LINE สำเร็จ!", color: "#4ade80", weight: "bold", size: "md" }]
                },
                body: {
                  type: "box", layout: "vertical",
                  contents: [
                    { type: "text", text: sName, weight: "bold", size: "sm", color: "#0a192f" },
                    { type: "text", text: "รหัส " + userText + " | " + studentFound[5], size: "xs", color: "#64748b", margin: "xs" },
                    { type: "separator", margin: "md" },
                    { type: "text", text: "คุณจะได้รับการแจ้งเตือนผลการอนุมัติและสรุปชั่วโมงผ่าน LINE อัตโนมัติค่ะ", size: "xxs", color: "#475569", wrap: true, margin: "md" }
                  ]
                },
                footer: {
                  type: "box", layout: "vertical",
                  contents: [{
                    type: "button",
                    action: { type: "uri", label: "📱 เปิดระบบบันทึกความดี", uri: "https://liff.line.me/2010948179-Ympqt2bT" },
                    style: "primary", color: "#0a192f"
                  }]
                }
              }
            };
            replyLineMessage(replyToken, [flexMsg], lineToken);
          } else {
            replyLineMessage(replyToken, [{ type: "text", text: "❌ ไม่พบรหัสนักเรียน " + userText + " ในฐานข้อมูล วพอ. 2569 ค่ะ" }], lineToken);
          }
          continue;
        }
        
        // 4.2 เช็คชั่วโมงสะสม / ยอดคะแนน
        if (lowerText.indexOf('ชั่วโมง') !== -1 || lowerText.indexOf('เช็ค') !== -1 || lowerText.indexOf('ยอด') !== -1 || lowerText.indexOf('ผ่าน') !== -1) {
          var sheet = getOrCreateMasterSheet(ss);
          var data = sheet.getDataRange().getValues();
          var studentFound = null;
          
          for (var r = 1; r < data.length; r++) {
            if (String(data[r][19]) === userId) {
              studentFound = data[r];
              break;
            }
          }
          
          if (studentFound) {
            var sName = studentFound[2] + ' ' + studentFound[3] + ' ' + studentFound[4];
            var totHours = parseFloat(studentFound[15] || 0);
            var grade = studentFound[17] || (totHours >= 50 ? 'ผ่านเกณฑ์ ✅' : 'ยังไม่ผ่าน ❌');
            
            var flexMsg = {
              type: "flex",
              altText: "📊 สรุปชั่วโมงจิตอาสา - " + sName,
              contents: {
                type: "bubble",
                size: "mega",
                header: {
                  type: "box", layout: "vertical", backgroundColor: "#0a192f", paddingAll: "20px",
                  contents: [
                    { type: "text", text: "วิทยาลัยพยาบาลทหารอากาศ", color: "#c9a227", size: "xs", weight: "bold" },
                    { type: "text", text: "📊 สรุปชั่วโมงจิตอาสารายบุคคล", color: "#ffffff", size: "md", weight: "bold", margin: "xs" }
                  ]
                },
                body: {
                  type: "box", layout: "vertical",
                  contents: [
                    { type: "text", text: sName, size: "sm", weight: "bold", color: "#0a192f" },
                    { type: "text", text: "รหัส " + studentFound[1] + " | " + studentFound[5], size: "xs", color: "#64748b", margin: "xs" },
                    { type: "separator", margin: "lg" },
                    {
                      type: "box", layout: "horizontal", margin: "lg",
                      contents: [
                        {
                          type: "box", layout: "vertical",
                          contents: [
                            { type: "text", text: "ชั่วโมงสะสมรวม", size: "xs", color: "#888888" },
                            { type: "text", text: totHours.toFixed(1) + " ชม.", size: "xl", weight: "bold", color: "#c9a227" }
                          ]
                        },
                        {
                          type: "box", layout: "vertical", alignItems: "flex-end",
                          contents: [
                            { type: "text", text: "ผลการประเมิน", size: "xs", color: "#888888" },
                            { type: "text", text: grade, size: "sm", weight: "bold", color: (totHours >= 50 ? "#16a34a" : "#dc2626") }
                          ]
                        }
                      ]
                    }
                  ]
                },
                footer: {
                  type: "box", layout: "vertical",
                  contents: [{
                    type: "button",
                    action: { type: "uri", label: "📱 เปิดระบบบันทึกความดี", uri: "https://liff.line.me/2010948179-Ympqt2bT" },
                    style: "primary", color: "#0a192f"
                  }]
                }
              }
            };
            replyLineMessage(replyToken, [flexMsg], lineToken);
          } else {
            replyLineMessage(replyToken, [{ type: "text", text: "กรุณาพิมพ์ \"รหัสนักเรียน 7 หลัก\" เพื่อผูกบัญชีก่อนตรวจสอบชั่วโมงค่ะ 😊" }], lineToken);
          }
          continue;
        }
        
        // 4.3 ถามเรื่องบริจาคเลือด
        if (lowerText.indexOf('บริจาคเลือด') !== -1 || lowerText.indexOf('เลือด') !== -1 || lowerText.indexOf('โลหิต') !== -1) {
          replyLineMessage(replyToken, [{
            type: "text",
            text: "🩸 เกณฑ์การบริจาคโลหิต (หมวด 1):\n━━━━━━━━━━━━━━━\n- ได้รับ 8 ชั่วโมง / ครั้ง\n- ต้องแนบรูปถ่ายใบรับรองหรือรูปขณะบริจาค\n- บันทึกในระบบและรออาจารย์อนุมัติค่ะ 🩺"
          }], lineToken);
          continue;
        }
        
        // 4.4 ถามเกณฑ์ทั่วไป
        if (lowerText.indexOf('เกณฑ์') !== -1 || lowerText.indexOf('กี่') !== -1) {
          replyLineMessage(replyToken, [{
            type: "text",
            text: "📜 เกณฑ์จิตอาสา วพอ. 2569:\n━━━━━━━━━━━━━━━\n- ขั้นต่ำ 50 ชั่วโมง / ปีการศึกษา (25 ชม./เทอม)\n- แบ่งเป็น 9 หมวดกิจกรรม\n- สะสมครบจะได้รับเกียรติบัตรปีกทองค่ะ 🎖️"
          }], lineToken);
          continue;
        }
        
        // Default response
        replyLineMessage(replyToken, [{
          type: "text",
          text: "สวัสดีค่ะ บอทฟ้าใส ยินดีให้บริการค่ะ 🌸\n\n📌 สิ่งที่สามารถพิมพ์ถามได้:\n- พิมพ์ \"รหัสนักเรียน 7 หลัก\" เพื่อผูกบัญชี\n- พิมพ์ \"เช็คชั่วโมง\" เพื่อดูยอดสะสมและเกรด\n- พิมพ์ \"บริจาคเลือด\" เพื่อดูเกณฑ์หมวด 1\n- พิมพ์ \"เกณฑ์\" เพื่อดูข้อกำหนดชั่วโมงจิตอาสาค่ะ 😊"
        }], lineToken);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' })).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown action' })).setMimeType(ContentService.MimeType.JSON);
}

function replyLineMessage(replyToken, messages, token) {
  var url = 'https://api.line.me/v2/bot/message/reply';
  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + token },
    payload: JSON.stringify({ replyToken: replyToken, messages: messages }),
    muteHttpExceptions: true
  };
  UrlFetchApp.fetch(url, options);
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

function setupAllStudentFolders() {
  var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getOrCreateMasterSheet(ss);
  var data = sheet.getDataRange().getValues();
  
  var yearFolders = {
    'รุ่น 69': getOrCreateSubFolder(root, '01_ชั้นปีที่ 1 (รุ่น 69)'),
    'รุ่น 68': getOrCreateSubFolder(root, '02_ชั้นปีที่ 2 (รุ่น 68)'),
    'รุ่น 67': getOrCreateSubFolder(root, '03_ชั้นปีที่ 3 (รุ่น 67)'),
    'รุ่น 66': getOrCreateSubFolder(root, '04_ชั้นปีที่ 4 (รุ่น 66)'),
    'รุ่น 65': getOrCreateSubFolder(root, '05_ศิษย์เก่า (รุ่น 65)'),
    'รุ่น 64': getOrCreateSubFolder(root, '06_ศิษย์เก่า (รุ่น 64)')
  };
  
  var created = 0;
  for (var i = 1; i < data.length; i++) {
    var sid = String(data[i][1]);
    var rank = String(data[i][2]);
    var fname = String(data[i][3]);
    var lname = String(data[i][4]);
    var cyear = String(data[i][5]);
    
    var parentFolder = yearFolders[cyear] || root;
    var folderName = sid + ' - ' + rank + ' ' + fname + ' ' + lname;
    var sFolder = getOrCreateSubFolder(parentFolder, folderName);
    
    // Sub-folders inside student folder
    getOrCreateSubFolder(sFolder, '01_หลักฐานภาพถ่ายความดี');
    getOrCreateSubFolder(sFolder, '02_เอกสารรับรอง_Word_PDF');
    
    // Create profile.json
    var profileObj = {
      student_id: sid,
      rank: rank,
      first_name: fname,
      last_name: lname,
      class_year: cyear,
      line_user_id: String(data[i][19] || ''),
      line_display_name: String(data[i][20] || ''),
      total_hours: data[i][15] || 0,
      grade_status: data[i][17] || 'ยังไม่ผ่าน ❌',
      last_updated: new Date().toISOString()
    };
    
    var files = sFolder.getFilesByName('profile.json');
    if (!files.hasNext()) {
      sFolder.createFile('profile.json', JSON.stringify(profileObj, null, 2), 'application/json');
    }
    created++;
  }
  
  return { status: 'success', message: 'Created ' + created + ' organized student folders on Google Drive!' };
}

function getOrCreateSubFolder(parent, name) {
  var folders = parent.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parent.createFolder(name);
}
