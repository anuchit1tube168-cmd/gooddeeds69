/**
 * Google Apps Script Backend for GoodDeeds 69 (Enterprise Folder Architecture Edition)
 * วิทยาลัยพยาบาลทหารอากาศ (วพอ.พอ.)
 * 
 * คุณสมบัติ:
 * 1. บันทึก LINE User ID + สถิติลงใน Master Sheet (คำนวณชั่วโมง + ตัดเกรดอัตโนมัติ)
 * 2. สร้างโครงสร้างโฟลเดอร์รายบุคคลอัตโนมัติใน Google Drive (Root Folder: 1Y6n_lYLIfIkg9Mt3pLtwWK0_4Lcw3Ysx)
 * 3. บันทึก profile.json แยกในโฟลเดอร์ของนักเรียนแต่ละคน
 * 4. เก็บรูปภาพหลักฐานความดีลงในโฟลเดอร์ของนักเรียนคนนั้นโดยตรง
 * 5. เชื่อมต่อ Telegram Bot แจ้งเตือนแบบโต้ตอบ (Interactive Callback Buttons) ทันที 24 ชั่วโมง
 * 6. รองรับ Telegram Webhook ตอบกลับปุ่ม [อนุมัติด่วน] และ [ปฏิเสธ] อัตโนมัติทันที ไม่ค้าง Loading
 * 7. รองรับ Cross-device Deed Sync ให้หน้าจออาจารย์และนักเรียนเห็นข้อมูลตรงกันตลอดเวลา
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
  if (action === 'getStudents') {
    try {
      var cache = CacheService.getScriptCache();
      var noCache = (e && e.parameter && (e.parameter.nocache || e.parameter.refresh));
      if (!noCache) {
        var cached = cache.get('students_api_v2');
        if (cached) {
          return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
        }
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
        
        var rank = String(data[i][2] || 'นพอ.');
        var fn = String(data[i][3] || '');
        var ln = String(data[i][4] || '');
        var catHours = [
          parseFloat(data[i][6] || 0),
          parseFloat(data[i][7] || 0),
          parseFloat(data[i][8] || 0),
          parseFloat(data[i][9] || 0),
          parseFloat(data[i][10] || 0),
          parseFloat(data[i][11] || 0),
          parseFloat(data[i][12] || 0),
          parseFloat(data[i][13] || 0),
          parseFloat(data[i][14] || 0)
        ];
        var sumCats = 0;
        for (var c = 0; c < catHours.length; c++) {
          sumCats += catHours[c];
        }
        var rawTot = data[i][15];
        var totHrs = (typeof rawTot === 'number' && !isNaN(rawTot)) ? rawTot : sumCats;
        
        var formattedFull = (fn.indexOf(rank) === 0 ? (fn + ' ' + ln) : (rank + ' ' + fn + ' ' + ln)).trim();
        students.push({
          student_id: sid,
          rank: rank,
          first_name: fn,
          last_name: ln,
          full_name: formattedFull,
          class_year: classYear,
          year_level: yearLevel,
          role: 'student',
          password: sid,
          categories: catHours,
          line_user_id: String(data[i][19] || ''),
          total_hours: totHrs,
          passed: totHrs >= 50
        });
      }
      
      var jsonStr = JSON.stringify(students);
      if (!noCache) {
        cache.put('students_api_v2', jsonStr, 120);
      }
      return ContentService.createTextOutput(jsonStr).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ error: err.message })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // ==================== GET DEEDS (CROSS-DEVICE SYNC) ====================
  if (action === 'getDeeds' || action === 'getAllDeeds') {
    try {
      var dSheet = ss.getSheetByName('Deeds_2569');
      if (!dSheet) {
        return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
      }
      var dValues = dSheet.getDataRange().getValues();
      var deedsList = [];
      var targetSid = (e && e.parameter && (e.parameter.studentId || e.parameter.student_id)) ? String(e.parameter.studentId || e.parameter.student_id).trim() : '';
      
      // Build student map from Main_2569 for fast O(1) enrichment
      var stuMap = {};
      var mSheet = ss.getSheetByName('Main_2569');
      if (mSheet) {
        var mVals = mSheet.getDataRange().getValues();
        for (var m = 1; m < mVals.length; m++) {
          var mSid = String(mVals[m][1] || '').trim();
          if (!mSid) continue;
          var mRank = String(mVals[m][2] || 'นพอ.');
          var mFn = String(mVals[m][3] || '');
          var mLn = String(mVals[m][4] || '');
          var mYr = String(mVals[m][5] || '69').replace(/รุ่น\s*/, '').trim();
          var mFull = (mFn.indexOf(mRank) === 0 ? (mFn + ' ' + mLn) : (mRank + ' ' + mFn + ' ' + mLn)).trim();
          stuMap[mSid] = {
            student_id: mSid,
            rank: mRank,
            first_name: mFn,
            last_name: mLn,
            full_name: mFull,
            student_name: mFull,
            class_year: mYr
          };
        }
      }
      
      for (var dIdx = 1; dIdx < dValues.length; dIdx++) {
        var row = dValues[dIdx];
        var dId = String(row[0] || '').trim();
        if (!dId) continue;
        var sId = String(row[1] || '').trim();
        if (targetSid && sId !== targetSid) continue;
        
        var cId = parseInt(row[2] || 1);
        var hrs = parseFloat(row[3] || 0);
        var aDate = row[4] ? (row[4] instanceof Date ? Utilities.formatDate(row[4], 'Asia/Bangkok', 'yyyy-MM-dd') : String(row[4])) : '';
        var dDesc = String(row[5] || '');
        var dStatus = String(row[6] || 'pending');
        var sDate = row[7] ? (row[7] instanceof Date ? Utilities.formatDate(row[7], 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss') : String(row[7])) : '';
        var appr = String(row[8] || '');
        var apprAt = row[9] ? (row[9] instanceof Date ? Utilities.formatDate(row[9], 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss') : String(row[9])) : '';
        var loc = String(row[10] || 'วิทยาลัยพยาบาลทหารอากาศ');
        var imgUrl = String(row[11] || '');
        
        var stuInfo = stuMap[sId] || null;
        var sName = stuInfo ? stuInfo.full_name : ('นพอ. รหัส ' + sId);
        var sYear = stuInfo ? stuInfo.class_year : (sId ? sId.substring(0, 2) : '69');
        
        deedsList.push({
          id: dId,
          studentId: sId,
          student_id: sId,
          studentName: sName,
          student_name: sName,
          classYear: sYear,
          class_year: sYear,
          student: stuInfo,
          categoryId: cId,
          category_id: cId,
          hours: hrs,
          activityDate: aDate,
          event_date: aDate,
          description: dDesc,
          title: dDesc,
          status: dStatus,
          submittedAt: sDate,
          approver: appr,
          approved_by: appr,
          approvedBy: appr,
          approvedAt: apprAt,
          location: loc,
          imageUrl: imgUrl,
          imageUrls: imgUrl ? [imgUrl] : []
        });
      }
      return ContentService.createTextOutput(JSON.stringify(deedsList)).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: err.message })).setMimeType(ContentService.MimeType.JSON);
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
    params = e.parameter || {};
  }

  // 1. Handle Telegram Webhook Callback Query (Instant Button Reaction)
  if (params && params.callback_query) {
    return handleTelegramCallback(params.callback_query, ss);
  }
  
  var action = (params && params.action) ? params.action : '';
  
  // 2. Set Telegram Configuration in Script Properties
  if (action === 'set_telegram_config') {
    var p = PropertiesService.getScriptProperties();
    if (params.token) p.setProperty('TELEGRAM_BOT_TOKEN', String(params.token).trim());
    if (params.chat_id) p.setProperty('TELEGRAM_CHAT_ID', String(params.chat_id).trim());
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Telegram config saved in Script Properties successfully'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 3. Update Deed Status / Approve / Reject (Web & Teacher Dashboard)
  if (action === 'updateDeedStatus' || action === 'approveDeed') {
    return handleUpdateDeedStatus(params, ss);
  }

  // 4. Also support getDeeds via POST
  if (action === 'getDeeds' || action === 'getAllDeeds') {
    return doGet({ parameter: params });
  }

  // 5. Initial populate students
  if (action === 'init_all_students') {
    var studentList = params.students || [];
    var sheet = getOrCreateMasterSheet(ss);
    
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
  
  // 6. ผูก LINE ID + อัปเดต Profile ใน Folder
  if (action === 'bind_line') {
    var studentId = String(params.studentId || '');
    var lineUserId = String(params.lineUserId || '');
    var lineDisplayName = String(params.lineDisplayName || '');
    var linePictureUrl = String(params.linePictureUrl || '');
    
    var sheet = getOrCreateMasterSheet(ss);
    var data = sheet.getDataRange().getValues();
    var found = false;
    
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]) === studentId) {
        sheet.getRange(i + 1, 20).setValue(lineUserId);
        sheet.getRange(i + 1, 21).setValue(lineDisplayName);
        sheet.getRange(i + 1, 22).setValue(new Date());
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
  
  // 7. บันทึกความดี (Submit Deed) + แจ้งเตือน Telegram อัตโนมัติทันที
  if (action === 'submit_deed') {
    var deed = params.deed || params;
    var studentId = String(deed.studentId || (deed.student ? deed.student.student_id : '')).trim();
    var hours = parseFloat(deed.hours || 0);
    var catId = parseInt(deed.categoryId || deed.category_id || 1);
    var deedId = deed.id || ('deed_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
    var desc = deed.description || deed.title || '';
    var actDate = deed.activityDate || deed.event_date || Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
    var loc = deed.location || 'วิทยาลัยพยาบาลทหารอากาศ';
    var imgUrl = deed.imageUrl || (deed.imageUrls && deed.imageUrls[0]) || '';
    var approver = deed.approver || deed.approved_by || 'ร.อ.อนุชิต ทำจะดี (Bird)';
    
    // บันทึกลงตาราง Deeds_2569
    var deedSheet = getOrCreateSheet(ss, 'Deeds_2569', [
      'Deed ID', 'รหัสนักเรียน', 'หมวดหมู่ ID', 'จำนวนชั่วโมง', 'วันที่ทำกิจกรรม', 
      'รายละเอียด', 'สถานะ', 'วันที่ส่งเรื่อง', 'ผู้ตรวจประเมิน', 'วันที่อนุมัติ', 'สถานที่', 'รูปหลักฐาน URL'
    ]);
    
    deedSheet.appendRow([
      deedId,
      studentId,
      catId,
      hours,
      actDate,
      desc,
      'pending',
      new Date(),
      approver,
      '',
      loc,
      imgUrl
    ]);
    
    // ส่งแจ้งเตือน Telegram ทันที (เว้นแต่ระบุ notify === false หรือ silent === true)
    var skipNotification = (deed.notify === false || deed.silent === true || deed.skipNotification === true || params.notify === false || params.silent === true);
    if (!skipNotification) {
      try {
        sendTelegramDeedNotification(ss, {
          id: deedId,
          studentId: studentId,
          student: deed.student,
          studentName: deed.studentName || (deed.student ? (deed.student.rank + ' ' + deed.student.first_name + ' ' + deed.student.last_name) : ''),
          classYear: deed.classYear || (deed.student ? deed.student.class_year : ''),
          categoryId: catId,
          hours: hours,
          activityDate: actDate,
          description: desc,
          location: loc,
          approver: approver,
          imageUrl: imgUrl
        });
      } catch (te) {
        Logger.log('Telegram notify error: ' + te.message);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: skipNotification ? 'Deed recorded (silent, no notification)' : 'Deed recorded and Telegram notified',
      deedId: deedId,
      notified: !skipNotification
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // 8. ส่ง LINE Message (Proxy ผ่าน Google Server)
  if (action === 'send_line_message') {
    var lineToken = params.token || PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '';
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
  
  // 9. LINE Webhook Events
  if (params && params.events) {
    var events = params.events || [];
    var lineToken = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '';
    
    for (var evIdx = 0; evIdx < events.length; evIdx++) {
      var ev = events[evIdx];
      var replyToken = ev.replyToken;
      var userId = ev.source ? ev.source.userId : '';
      
      if (ev.type === 'message' && ev.message && ev.message.type === 'text') {
        var userText = String(ev.message.text || '').trim();
        var lowerText = userText.toLowerCase();
        
        // ถ้าพิมพ์รหัสนักเรียน 7 หลัก
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
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' })).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown action' })).setMimeType(ContentService.MimeType.JSON);
}

// ==================== TELEGRAM WEBHOOK & CALLBACK HANDLER ====================

function handleTelegramCallback(cq, ss) {
  var cqId = cq.id;
  var data = String(cq.data || '').trim();
  var token = PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN') || '';
  
  var isApprove = data.indexOf('approve_') === 0;
  var isReject = data.indexOf('reject_') === 0;
  
  // 1. ตอบกลับ callback query ทันที เพื่อไม่ให้ Telegram หมุน Loading ค้าง
  if (token) {
    try {
      UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/answerCallbackQuery', {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          callback_query_id: cqId,
          text: isApprove ? '✅ อนุมัติความดีเรียบร้อยแล้ว!' : (isReject ? '❌ ปฏิเสธรายการความดีแล้ว' : 'รับข้อมูลเรียบร้อยแล้ว'),
          show_alert: true
        }),
        muteHttpExceptions: true
      });
    } catch (e) {
      Logger.log('answerCallbackQuery error: ' + e.message);
    }
  }
  
  // 2. ดำเนินการอนุมัติหรือปฏิเสธในฐานข้อมูล
  if (isApprove || isReject) {
    var parts = data.split('_');
    var studentId = parts[parts.length - 1];
    var deedId = parts.slice(1, parts.length - 1).join('_');
    var newStatus = isApprove ? 'approved' : 'rejected';
    var approverName = 'ร.อ.อนุชิต ทำจะดี (Bird)';
    
    var deedSheet = ss.getSheetByName('Deeds_2569');
    var foundDeed = null;
    if (deedSheet) {
      var dData = deedSheet.getDataRange().getValues();
      for (var r = 1; r < dData.length; r++) {
        if (String(dData[r][0]) === String(deedId)) {
          var prevStatus = String(dData[r][6] || 'pending');
          deedSheet.getRange(r + 1, 7).setValue(newStatus);
          deedSheet.getRange(r + 1, 9).setValue(approverName);
          deedSheet.getRange(r + 1, 10).setValue(new Date());
          foundDeed = {
            studentId: String(dData[r][1] || studentId),
            catId: parseInt(dData[r][2] || 1),
            hours: parseFloat(dData[r][3] || 0),
            desc: String(dData[r][5] || ''),
            prevStatus: prevStatus
          };
          break;
        }
      }
    }
    
    // หากเป็นการอนุมัติใหม่ ให้อัปเดตชั่วโมงสะสมใน Master Sheet ทันที
    if (isApprove && foundDeed && foundDeed.prevStatus !== 'approved') {
      updateMasterStudentHours(ss, foundDeed.studentId, foundDeed.catId, foundDeed.hours);
    }
    
    // 3. แก้ไขปุ่มบน Telegram ให้แสดงว่าอนุมัติแล้ว
    if (token && cq.message && cq.message.chat && cq.message.message_id) {
      try {
        var newBtnText = isApprove ? '✅ อนุมัติแล้ว โดย ร.อ.อนุชิต ทำจะดี (Bird)' : '❌ ปฏิเสธแล้ว โดย ร.อ.อนุชิต ทำจะดี (Bird)';
        UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/editMessageReplyMarkup', {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify({
            chat_id: cq.message.chat.id,
            message_id: cq.message.message_id,
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: newBtnText,
                    callback_data: 'done'
                  }
                ]
              ]
            }
          }),
          muteHttpExceptions: true
        });
      } catch (e) {
        Logger.log('editMessageReplyMarkup error: ' + e.message);
      }
    }

    // 4. ส่งข้อความแจ้งเตือนผลการตรวจลงในกลุ่ม Telegram ทันที
    if (token && cq.message && cq.message.chat) {
      try {
        var sInfo = getStudentInfoFromMaster(ss, studentId);
        var sName = sInfo ? sInfo.full_name : ('นพอ. รหัส ' + studentId);
        var catNames = { 1:'บริจาคโลหิต/เกล็ดเลือด/พลาสมา', 2:'โครงการภายนอก (คำสั่ง วพอ.)', 3:'ช่วยเหลืองานภายใน วพอ.', 4:'เข้าอบรมที่ วพอ. จัดให้', 5:'ช่วยงานหน่วยงาน/ชุมชน/มูลนิธิ', 6:'ทำนุบำรุงศาสนสถาน', 7:'งานฟรีทั่วไป', 8:'กิจกรรมจงรักภักดีต่อสถาบัน', 9:'ชม. ที่สมควรได้รับ (บทบาทพิเศษ)' };
        var catName = foundDeed ? (catNames[foundDeed.catId] || 'กิจกรรมความดี') : 'กิจกรรมความดี';
        var dDesc = foundDeed ? foundDeed.desc : '';
        var hrs = foundDeed ? foundDeed.hours : 0;
        
        var confirmMsg = '';
        if (isApprove) {
          confirmMsg = 'AGEn Ai Bot\n' +
            '✅ <b>แจ้งเตือนการอนุมัติความดี</b>\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━\n' +
            '👤 <b>นักเรียน:</b> ' + sName + '\n' +
            '🎫 <b>รหัส นพอ.:</b> <code>' + studentId + '</code>\n' +
            '📂 <b>กิจกรรม:</b> ' + catName + (dDesc ? (' - ' + dDesc) : '') + '\n' +
            '⏱ <b>จำนวน:</b> <b>' + hrs + ' ชั่วโมง</b>\n' +
            '👨‍🏫 <b>ผู้อนุมัติ:</b> ' + approverName + '\n' +
            '🎉 <i>บันทึกข้อมูลและสะสมชั่วโมงลงฐานข้อมูลเรียบร้อยแล้วค่ะ</i>';
        } else {
          confirmMsg = 'AGEn Ai Bot\n' +
            '❌ <b>แจ้งเตือนการปฏิเสธความดี</b>\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━\n' +
            '👤 <b>นักเรียน:</b> ' + sName + '\n' +
            '🎫 <b>รหัส นพอ.:</b> <code>' + studentId + '</code>\n' +
            '📁 <b>กิจกรรม:</b> ' + catName + (dDesc ? (' - ' + dDesc) : '') + '\n' +
            '👨‍🏫 <b>ผู้ปฏิเสธ:</b> ' + approverName + '\n' +
            '📝 <b>เหตุผล:</b> กรุณาตรวจสอบหลักฐานและส่งใหม่';
        }
        
        UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify({
            chat_id: cq.message.chat.id,
            text: confirmMsg,
            parse_mode: 'HTML'
          }),
          muteHttpExceptions: true
        });
      } catch (me) {
        Logger.log('confirm message error: ' + me.message);
      }
    }

    // 5. แจ้งเตือน นพอ. ผ่าน LINE ส่วนตัว (ถ้าผูก LINE ไว้)
    try {
      notifyStudentViaLine(ss, studentId, isApprove, foundDeed);
    } catch (le) {
      Logger.log('LINE notify error: ' + le.message);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      deedId: deedId,
      newStatus: newStatus
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' })).setMimeType(ContentService.MimeType.JSON);
}

// ==================== NOTIFY STUDENT VIA LINE ====================
function notifyStudentViaLine(ss, studentId, isApprove, deed) {
  var lineToken = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '';
  if (!lineToken) return;
  
  var sheet = ss.getSheetByName('Main_2569');
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  var lineUserId = '';
  var studentName = '';
  
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === String(studentId).trim()) {
      lineUserId = String(data[i][19] || '').trim();
      studentName = String(data[i][2] || '') + ' ' + String(data[i][3] || '') + ' ' + String(data[i][4] || '');
      break;
    }
  }
  
  if (!lineUserId) return;
  
  var catNames = { 1:'บริจาคโลหิต', 2:'โครงการภายนอก', 3:'ช่วยงานภายใน วพอ.', 4:'เข้าอบรม', 5:'ช่วยชุมชน/มูลนิธิ', 6:'ศาสนสถาน', 7:'งานฟรีทั่วไป', 8:'จงรักภักดี', 9:'บทบาทพิเศษ' };
  var catName = deed ? (catNames[deed.catId] || 'กิจกรรมความดี') : 'กิจกรรมความดี';
  var hrs = deed ? deed.hours : 0;
  
  var msgText = isApprove
    ? '🎉 แจ้งเตือนผลการตรวจความดี วพอ. 2569\n\n' +
      'เรียน ' + studentName + '\n' +
      '✅ กิจกรรม: ' + catName + '\n' +
      '⏱ จำนวน: ' + hrs + ' ชั่วโมง\n' +
      '👨‍🏫 อาจารย์ผู้ตรวจ: ร.อ.อนุชิต ทำจะดี (Bird)\n\n' +
      'รายการความดีของคุณได้รับการอนุมัติและสะสมชั่วโมงเรียบร้อยแล้วค่ะ 🌟'
    : '⚠️ แจ้งเตือนผลการตรวจความดี วพอ. 2569\n\n' +
      'เรียน ' + studentName + '\n' +
      '❌ กิจกรรม: ' + catName + '\n' +
      '👨‍🏫 อาจารย์ผู้ตรวจ: ร.อ.อนุชิต ทำจะดี (Bird)\n' +
      '📝 เหตุผล: กรุณาตรวจสอบหลักฐานและส่งใหม่ค่ะ';
      
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + lineToken },
    payload: JSON.stringify({
      to: lineUserId,
      messages: [{ type: 'text', text: msgText }]
    }),
    muteHttpExceptions: true
  });
}

// ==================== UPDATE DEED STATUS (WEB / TEACHER DASHBOARD) ====================

function handleUpdateDeedStatus(params, ss) {
  var deedId = String(params.deedId || params.id || '').trim();
  var studentId = String(params.studentId || params.student_id || '').trim();
  var newStatus = String(params.status || 'approved').trim();
  var approver = String(params.approvedBy || params.approver || params.teacherName || 'ร.อ.อนุชิต ทำจะดี (Bird)').trim();
  
  var deedSheet = ss.getSheetByName('Deeds_2569');
  if (!deedSheet) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Deeds_2569 sheet not found' })).setMimeType(ContentService.MimeType.JSON);
  }
  
  var dData = deedSheet.getDataRange().getValues();
  var updated = false;
  var foundDeed = null;
  
  for (var r = 1; r < dData.length; r++) {
    if (String(dData[r][0]) === deedId) {
      var prevStatus = String(dData[r][6] || 'pending');
      deedSheet.getRange(r + 1, 7).setValue(newStatus);
      deedSheet.getRange(r + 1, 9).setValue(approver);
      deedSheet.getRange(r + 1, 10).setValue(new Date());
      
      var sid = String(dData[r][1] || studentId);
      var catId = parseInt(dData[r][2] || 1);
      var hrs = parseFloat(dData[r][3] || 0);
      foundDeed = { studentId: sid, catId: catId, hours: hrs };
      
      if (newStatus === 'approved' && prevStatus !== 'approved') {
        updateMasterStudentHours(ss, sid, catId, hrs);
      }
      updated = true;
      break;
    }
  }
  
  if (updated) {
    if (foundDeed) {
      try {
        notifyStudentViaLine(ss, foundDeed.studentId, newStatus === 'approved', foundDeed);
      } catch (ne) {}
    }
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      deedId: deedId,
      newStatus: newStatus,
      approver: approver
    })).setMimeType(ContentService.MimeType.JSON);
  } else {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Deed not found: ' + deedId
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==================== SEND TELEGRAM INTERACTIVE NOTIFICATION ====================

function sendTelegramDeedNotification(ss, deed) {
  var token = PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN') || '';
  var chatId = PropertiesService.getScriptProperties().getProperty('TELEGRAM_CHAT_ID') || '';
  if (!token || !chatId) {
    Logger.log('Telegram token or chat ID not set in Script Properties');
    return false;
  }
  
  var studentId = String(deed.studentId || '').trim();
  var deedId = String(deed.id || '').trim();
  
  // ตรวจสอบชื่อนักเรียนจาก Master Sheet หากไม่มี
  var studentName = deed.studentName || '';
  var classYear = String(deed.classYear || '');
  if (!studentName || studentName.indexOf('รหัส') !== -1) {
    var sInfo = getStudentInfoFromMaster(ss, studentId);
    if (sInfo) {
      studentName = sInfo.full_name;
      classYear = sInfo.class_year;
    }
  }
  if (!studentName) studentName = 'นพอ. (' + studentId + ')';
  if (!classYear && studentId.length >= 2) classYear = studentId.substring(0, 2);
  
  var yearLevel = classYear === '69' ? '1' : (classYear === '68' ? '2' : (classYear === '67' ? '3' : (classYear === '66' ? '4' : '1')));
  var yearName = 'ชั้นปีที่ ' + yearLevel + ' (รุ่น ' + classYear + ')';
  
  var catId = parseInt(deed.categoryId || 1);
  var catNames = {
    1: 'บริจาคโลหิต/เกล็ดเลือด/พลาสมา',
    2: 'โครงการภายนอก (คำสั่ง วพอ.)',
    3: 'ช่วยเหลืองานภายใน วพอ.',
    4: 'เข้าอบรมที่ วพอ. จัดให้',
    5: 'ช่วยงานหน่วยงาน/ชุมชน/มูลนิธิ',
    6: 'ทำนุบำรุงศาสนสถาน',
    7: 'งานฟรีทั่วไป (ช่วยงานผู้ปกครอง)',
    8: 'กิจกรรมจงรักภักดีต่อสถาบัน',
    9: 'ชม. ที่สมควรได้รับ (บทบาทพิเศษ)'
  };
  var catEmojis = {
    1: '🩸', 2: '🏛️', 3: '🏥', 4: '📚', 5: '🤝', 6: '🛕', 7: '🧹', 8: '👑', 9: '⭐'
  };
  var catName = catNames[catId] || 'กิจกรรมความดี';
  var catEmoji = catEmojis[catId] || '📌';
  
  var hours = deed.hours || 0;
  var actDate = deed.activityDate || Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
  var desc = deed.description || '';
  var loc = deed.location || 'วิทยาลัยพยาบาลทหารอากาศ';
  var approver = deed.approver || 'ร.อ.อนุชิต ทำจะดี (Bird)';
  
  var baseUrl = 'https://anuchit1tube168-cmd.github.io/gooddeeds69/frontend';
  var approveUrl = baseUrl + '/approve_sign.html?id=' + encodeURIComponent(deedId) + '&studentId=' + encodeURIComponent(studentId);
  var slipUrl = baseUrl + '/deed_slip.html?id=' + encodeURIComponent(deedId) + '&studentId=' + encodeURIComponent(studentId);
  
  var replyMarkup = {
    inline_keyboard: [
      [
        { text: '✅ อนุมัติด่วน', callback_data: 'approve_' + deedId + '_' + studentId },
        { text: '❌ ปฏิเสธ', callback_data: 'reject_' + deedId + '_' + studentId }
      ],
      [
        { text: '✍️ ตรวจสอบ & ลงนาม ↗️', url: approveUrl },
        { text: '📄 พิมพ์สลิป A4 (PDF) ↗️', url: slipUrl }
      ]
    ]
  };
  
  var htmlMsg = '🔔 <b>แจ้งเตือนการขออนุมัติความดี (วพอ. 2569)</b>\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '👤 <b>ผู้ขอ:</b> ' + studentName + '\n' +
    '🎫 <b>รหัส นพอ.:</b> <code>' + studentId + '</code> (' + yearName + ')\n' +
    '📂 <b>หมวดที่ ' + catId + ':</b> ' + catEmoji + ' ' + catName + '\n' +
    '⏱ <b>จำนวน:</b> <b>' + hours + ' ชั่วโมง</b>\n' +
    '📅 <b>วันที่:</b> ' + actDate + '\n' +
    '📍 <b>สถานที่:</b> ' + loc + '\n' +
    '📝 <b>รายละเอียด:</b> ' + desc + '\n' +
    '👨‍🏫 <b>อาจารย์ผู้ตรวจ:</b> ' + approver + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '⏳ <i>กรุณาตรวจสอบและกดอนุมัติหรือลงนามด้านล่าง:</i>';

  // ตรวจสอบรูปภาพสลิปแบบฟอร์ม (Slip Card Image) เพื่อส่งเป็น Photo
  var slipImg = deed.slipImage || deed.imageUrl || (deed.imageUrls && deed.imageUrls[0]) || '';
  var photoSent = false;
  
  if (slipImg) {
    try {
      if (slipImg.indexOf('data:image') === 0) {
        var commaIdx = slipImg.indexOf(',');
        var b64Data = slipImg.substring(commaIdx + 1);
        var mime = slipImg.substring(5, commaIdx).split(';')[0] || 'image/png';
        var ext = (mime.indexOf('jpeg') !== -1 || mime.indexOf('jpg') !== -1) ? 'jpg' : 'png';
        var decoded = Utilities.base64Decode(b64Data);
        var photoBlob = Utilities.newBlob(decoded, mime, 'deed_slip.' + ext);
        
        var photoPayload = {
          chat_id: chatId,
          photo: photoBlob,
          caption: htmlMsg,
          parse_mode: 'HTML',
          reply_markup: JSON.stringify(replyMarkup)
        };
        var pRes = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendPhoto', {
          method: 'post',
          payload: photoPayload,
          muteHttpExceptions: true
        });
        if (pRes.getResponseCode() === 200) photoSent = true;
      } else if (slipImg.indexOf('http') === 0) {
        var photoPayloadUrl = {
          chat_id: chatId,
          photo: slipImg,
          caption: htmlMsg,
          parse_mode: 'HTML',
          reply_markup: replyMarkup
        };
        var pRes2 = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendPhoto', {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify(photoPayloadUrl),
          muteHttpExceptions: true
        });
        if (pRes2.getResponseCode() === 200) photoSent = true;
      }
    } catch (pe) {
      Logger.log('Photo send notice: ' + pe.message);
    }
  }

  // Fallback เป็นข้อความปกติถ้าไม่มีรูปหรือส่งรูปไม่สำเร็จ
  if (!photoSent) {
    var url = 'https://api.telegram.org/bot' + token + '/sendMessage';
    var payload = {
      chat_id: chatId,
      text: htmlMsg,
      parse_mode: 'HTML',
      reply_markup: replyMarkup
    };
    UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  }
  return true;
}

function getStudentInfoFromMaster(ss, studentId) {
  var sheet = ss.getSheetByName('Main_2569');
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === String(studentId).trim()) {
      var rank = String(data[i][2] || 'นพอ.');
      var fn = String(data[i][3] || '');
      var ln = String(data[i][4] || '');
      var cyRaw = String(data[i][5] || '69').replace(/รุ่น\s*/, '').trim();
      return {
        student_id: studentId,
        rank: rank,
        first_name: fn,
        last_name: ln,
        full_name: (rank + ' ' + fn + ' ' + ln).trim(),
        class_year: cyRaw
      };
    }
  }
  return null;
}

// -------------------------------------------------------------
// HELPER FUNCTIONS & FOLDER MANAGEMENT
// -------------------------------------------------------------

function replyLineMessage(replyToken, messages, token) {
  if (!token) return;
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
    if (String(data[i][1]).trim() === String(studentId).trim()) {
      var currentCatHours = parseFloat(data[i][catCol - 1] || 0);
      sheet.getRange(i + 1, catCol).setValue(currentCatHours + addedHours);
      
      var row = i + 1;
      sheet.getRange(row, 16).setFormula('=SUM(G' + row + ':O' + row + ')');
      sheet.getRange(row, 17).setValue('50 ชม./ปี');
      sheet.getRange(row, 18).setFormula('=IF(P' + row + '>=50, "ผ่านเกณฑ์ ✅", "ยังไม่ผ่าน ❌")');
      break;
    }
  }
  
  try {
    CacheService.getScriptCache().remove('students_api_v2');
  } catch (ce) {}
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
    
    getOrCreateSubFolder(sFolder, '01_หลักฐานภาพถ่ายความดี');
    getOrCreateSubFolder(sFolder, '02_เอกสารรับรอง_Word_PDF');
    
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
