/**
 * RTAFNC ONE — Operations Core PILOT
 *
 * PURPOSE
 * - Telegram = primary operations channel
 * - LINE = urgent/critical channel + professional Flex Messages
 * - Shared identity / role assignment / event outbox / approval tasks
 * - Designed to plug into Good Deed CodeV2 AFTER pilot tests pass
 *
 * SAFETY
 * - This file does NOT replace CodeV2.gs and defines no doPost().
 * - No secrets in source. Use Script Properties only.
 * - Sending is disabled unless OPS_PILOT_ENABLED=true.
 */

const ONE_OPS = Object.freeze({
  VERSION: '0.2.0-pilot',
  SHEETS: {
    BINDINGS: 'OneIdentityBindings',
    BIND_CODES: 'OneBindingCodes',
    ASSIGNMENTS: 'OneRoleAssignments',
    EVENTS: 'OneEventOutbox',
    APPROVALS: 'OneApprovalTasks',
    NOTIFY_LOG: 'OneNotificationLog'
  },
  ROLES: ['SUPER_ADMIN','ADMIN','ADVISOR','APPROVER','HEALTH_AUTHORIZED','STUDENT'],
  CHANNELS: ['telegram','line','inapp'],
  BIND_TTL_SECONDS: 600,
  MAX_RETRY: 5
});

const ONE_OPS_HEADERS = Object.freeze({
  OneIdentityBindings: ['bindingId','rtafncId','memberId','channel','externalId','displayName','status','verifiedAt','createdAt','updatedAt'],
  OneBindingCodes: ['code','rtafncId','memberId','channel','expiresAt','status','externalId','createdAt','usedAt'],
  OneRoleAssignments: ['assignmentId','subjectRtafncId','role','scopeType','scopeValue','studentId','groupName','status','activeFrom','activeTo','createdBy','createdAt','updatedAt'],
  OneEventOutbox: ['eventId','eventType','severity','subjectRtafncId','studentId','caseId','payloadJson','status','attempts','nextAttemptAt','createdAt','processedAt','lastError'],
  OneApprovalTasks: ['taskId','eventId','taskType','subjectRtafncId','studentId','assigneeRtafncId','status','decision','decisionNote','createdAt','decidedAt','updatedAt'],
  OneNotificationLog: ['notificationId','eventId','channel','recipientRtafncId','externalId','template','status','responseCode','detail','createdAt','sentAt']
});

/** Run from Apps Script editor in a PILOT copy/project first. */
function setupRtafncOneOpsPilot() {
  const ss = oneOpsDb_();
  Object.keys(ONE_OPS_HEADERS).forEach(function(name) {
    oneOpsEnsureSheet_(ss, name, ONE_OPS_HEADERS[name]);
  });
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('OPS_PILOT_ENABLED')) props.setProperty('OPS_PILOT_ENABLED', 'false');
  console.log('RTAFNC_ONE_OPS_READY version=' + ONE_OPS.VERSION + ' spreadsheet=' + ss.getId());
  return { ok: true, version: ONE_OPS.VERSION, spreadsheetId: ss.getId(), sendingEnabled: oneOpsSendingEnabled_() };
}

/**
 * Creates a 10-minute one-time Telegram binding code.
 * In future dispatch integration, call with session.memberId/studentId after CodeV2 requireSession_().
 */
function createTelegramBindingCodePilot(rtafncId, memberId) {
  setupRtafncOneOpsPilot();
  const rid = oneOpsClean_(rtafncId, 80);
  if (!rid) throw new Error('ต้องมี RTAFNC_ID');
  const code = 'RT-' + oneOpsRandomCode_(7);
  const now = new Date();
  const expires = new Date(now.getTime() + ONE_OPS.BIND_TTL_SECONDS * 1000);
  oneOpsAppend_(ONE_OPS.SHEETS.BIND_CODES, {
    code: code, rtafncId: rid, memberId: oneOpsClean_(memberId, 80), channel: 'telegram',
    expiresAt: expires.toISOString(), status: 'PENDING', externalId: '', createdAt: now.toISOString(), usedAt: ''
  });
  return {
    ok: true,
    code: code,
    expiresAt: expires.toISOString(),
    instruction: 'เปิด Telegram Bot แบบแชทส่วนตัว แล้วส่ง /start ' + code
  };
}

/**
 * Feed a Telegram webhook update here from a dedicated webhook deployment.
 * For identity safety, only private chat is accepted for binding.
 */
function bindTelegramFromUpdatePilot(update) {
  setupRtafncOneOpsPilot();
  const msg = update && update.message;
  if (!msg || !msg.chat) throw new Error('ไม่พบ Telegram message');
  if (String(msg.chat.type || '') !== 'private') throw new Error('การผูกบัญชีต้องทำในแชทส่วนตัวกับ Bot เท่านั้น');
  const text = String(msg.text || '').trim();
  const match = text.match(/^\/start\s+(RT-[A-Z0-9]{7})$/i);
  if (!match) return { ok: false, ignored: true, reason: 'BIND_CODE_REQUIRED' };

  const code = match[1].toUpperCase();
  const row = oneOpsFind_(ONE_OPS.SHEETS.BIND_CODES, function(r) { return String(r.code).toUpperCase() === code; });
  if (!row) throw new Error('รหัสเชื่อม Telegram ไม่ถูกต้อง');
  if (String(row.status) !== 'PENDING') throw new Error('รหัสนี้ถูกใช้หรือยกเลิกแล้ว');
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    oneOpsUpdateByKey_(ONE_OPS.SHEETS.BIND_CODES, 'code', code, { status: 'EXPIRED' });
    throw new Error('รหัสเชื่อม Telegram หมดอายุแล้ว');
  }

  const chatId = String(msg.chat.id);
  const displayName = [msg.from && msg.from.first_name, msg.from && msg.from.last_name].filter(Boolean).join(' ').trim();
  oneOpsUpsertBinding_(row.rtafncId, row.memberId, 'telegram', chatId, displayName);
  oneOpsUpdateByKey_(ONE_OPS.SHEETS.BIND_CODES, 'code', code, {
    status: 'USED', externalId: chatId, usedAt: new Date().toISOString()
  });
  return { ok: true, rtafncId: row.rtafncId, channel: 'telegram', externalId: chatId };
}

/** Admin utility for pilot. Unlimited assignments at application level; all changes are append/update audited later. */
function createRoleAssignmentPilot(input) {
  setupRtafncOneOpsPilot();
  const role = oneOpsClean_(input && input.role, 40).toUpperCase();
  if (ONE_OPS.ROLES.indexOf(role) < 0) throw new Error('Role ไม่ถูกต้อง');
  const subject = oneOpsClean_(input && input.subjectRtafncId, 80);
  if (!subject) throw new Error('ต้องระบุผู้ได้รับสิทธิ์');
  const now = new Date().toISOString();
  const row = {
    assignmentId: 'ASN-' + Utilities.getUuid(), subjectRtafncId: subject, role: role,
    scopeType: oneOpsClean_(input.scopeType || 'GLOBAL', 40).toUpperCase(),
    scopeValue: oneOpsClean_(input.scopeValue, 120), studentId: oneOpsClean_(input.studentId, 40),
    groupName: oneOpsClean_(input.groupName, 120), status: 'ACTIVE',
    activeFrom: input.activeFrom || now, activeTo: input.activeTo || '',
    createdBy: oneOpsClean_(input.createdBy || 'pilot-admin', 80), createdAt: now, updatedAt: now
  };
  oneOpsAppend_(ONE_OPS.SHEETS.ASSIGNMENTS, row);
  return { ok: true, assignment: row };
}

function deactivateRoleAssignmentPilot(assignmentId, actor) {
  setupRtafncOneOpsPilot();
  return oneOpsUpdateByKey_(ONE_OPS.SHEETS.ASSIGNMENTS, 'assignmentId', assignmentId, {
    status: 'INACTIVE', activeTo: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: oneOpsClean_(actor || 'pilot-admin', 80)
  });
}

/** Resolve current advisor(s) by student ID. */
function resolveAdvisorsPilot(studentId) {
  setupRtafncOneOpsPilot();
  const sid = String(studentId || '');
  const now = Date.now();
  return oneOpsAll_(ONE_OPS.SHEETS.ASSIGNMENTS).filter(function(r) {
    if (String(r.role) !== 'ADVISOR' || String(r.status) !== 'ACTIVE') return false;
    if (r.studentId && String(r.studentId) !== sid) return false;
    if (r.activeFrom && new Date(r.activeFrom).getTime() > now) return false;
    if (r.activeTo && new Date(r.activeTo).getTime() < now) return false;
    return Boolean(r.studentId || r.scopeType === 'GLOBAL' || r.scopeValue);
  });
}

function resolveApproversPilot(studentId, taskType) {
  setupRtafncOneOpsPilot();
  const sid = String(studentId || '');
  const wanted = String(taskType || '').toUpperCase();
  return oneOpsAll_(ONE_OPS.SHEETS.ASSIGNMENTS).filter(function(r) {
    if (String(r.status) !== 'ACTIVE') return false;
    if (['APPROVER','ADMIN','SUPER_ADMIN'].indexOf(String(r.role)) < 0) return false;
    if (r.studentId && String(r.studentId) !== sid) return false;
    if (r.scopeType === 'TASK' && r.scopeValue && String(r.scopeValue).toUpperCase() !== wanted) return false;
    return true;
  });
}

/**
 * Generic event producer. payload may contain sensitive fields; notifications are redacted by template layer.
 * Severity: ROUTINE | IMPORTANT | URGENT | CRITICAL
 */
function emitOneEventPilot(event) {
  setupRtafncOneOpsPilot();
  const severity = oneOpsClean_(event && event.severity || 'ROUTINE', 20).toUpperCase();
  if (['ROUTINE','IMPORTANT','URGENT','CRITICAL'].indexOf(severity) < 0) throw new Error('severity ไม่ถูกต้อง');
  const row = {
    eventId: 'EVT-' + Utilities.getUuid(), eventType: oneOpsClean_(event.eventType, 80).toUpperCase(), severity: severity,
    subjectRtafncId: oneOpsClean_(event.subjectRtafncId, 80), studentId: oneOpsClean_(event.studentId, 40),
    caseId: oneOpsClean_(event.caseId, 80), payloadJson: JSON.stringify(event.payload || {}),
    status: 'PENDING', attempts: 0, nextAttemptAt: new Date().toISOString(), createdAt: new Date().toISOString(), processedAt: '', lastError: ''
  };
  if (!row.eventType) throw new Error('eventType จำเป็น');
  oneOpsAppend_(ONE_OPS.SHEETS.EVENTS, row);
  return { ok: true, event: row, routePreview: routeOneEventPilot(row) };
}

/** Pure routing decision; safe to call in demo without sending. */
function routeOneEventPilot(eventRow) {
  const eventType = String(eventRow.eventType || '').toUpperCase();
  const severity = String(eventRow.severity || 'ROUTINE').toUpperCase();
  const health = /HEALTH|MENTAL|HOSPITAL|EMERGENCY/.test(eventType);
  const approval = /APPROVAL|GOOD_DEED|REQUEST/.test(eventType);
  const channels = ['inapp'];
  if (approval || severity !== 'ROUTINE') channels.push('telegram');
  if (health && ['URGENT','CRITICAL'].indexOf(severity) >= 0) channels.push('line');
  if (!health && severity === 'CRITICAL') channels.push('line');
  return {
    channels: oneOpsUnique_(channels),
    template: health ? (severity === 'CRITICAL' ? 'HEALTH_CRITICAL' : 'HEALTH_URGENT') : approval ? 'APPROVAL_REQUEST' : 'ANNOUNCEMENT',
    sensitive: health
  };
}

function createApprovalTaskPilot(eventId, taskType, studentId, subjectRtafncId) {
  setupRtafncOneOpsPilot();
  const assignees = resolveApproversPilot(studentId, taskType);
  if (!assignees.length) throw new Error('ไม่พบผู้มีสิทธิ์อนุมัติสำหรับรายการนี้');
  const now = new Date().toISOString();
  const tasks = assignees.map(function(a) {
    const row = {
      taskId: 'TSK-' + Utilities.getUuid(), eventId: eventId, taskType: oneOpsClean_(taskType, 80).toUpperCase(),
      subjectRtafncId: oneOpsClean_(subjectRtafncId, 80), studentId: oneOpsClean_(studentId, 40),
      assigneeRtafncId: a.subjectRtafncId, status: 'PENDING', decision: '', decisionNote: '',
      createdAt: now, decidedAt: '', updatedAt: now
    };
    oneOpsAppend_(ONE_OPS.SHEETS.APPROVALS, row);
    return row;
  });
  return { ok: true, tasks: tasks };
}

function decideApprovalTaskPilot(taskId, assigneeRtafncId, decision, note) {
  setupRtafncOneOpsPilot();
  const task = oneOpsFind_(ONE_OPS.SHEETS.APPROVALS, function(r) { return String(r.taskId) === String(taskId); });
  if (!task) throw new Error('ไม่พบ Approval Task');
  if (String(task.assigneeRtafncId) !== String(assigneeRtafncId)) throw new Error('ไม่มีสิทธิ์ตัดสินรายการนี้');
  if (String(task.status) !== 'PENDING') throw new Error('รายการนี้ถูกดำเนินการแล้ว');
  const d = String(decision || '').toUpperCase();
  if (['APPROVED','REJECTED','RETURNED'].indexOf(d) < 0) throw new Error('decision ไม่ถูกต้อง');
  const now = new Date().toISOString();
  oneOpsUpdateByKey_(ONE_OPS.SHEETS.APPROVALS, 'taskId', taskId, {
    status: 'COMPLETED', decision: d, decisionNote: oneOpsClean_(note, 1000), decidedAt: now, updatedAt: now
  });
  return { ok: true, taskId: taskId, decision: d, decidedAt: now };
}

/** Professional Telegram template. Sensitive clinical details are intentionally excluded. */
function buildTelegramNotificationPilot(template, data) {
  const t = String(template || '').toUpperCase();
  const caseId = oneOpsClean_(data.caseId || data.eventId, 80);
  if (t === 'HEALTH_CRITICAL' || t === 'HEALTH_URGENT') {
    return {
      text: (t === 'HEALTH_CRITICAL' ? '🔴 RTAFNC PRIORITY ALERT' : '🟠 RTAFNC HEALTH ALERT') +
        '\n\nมีรายการสุขภาพที่ต้องตรวจสอบ' +
        '\nระดับ: ' + (t === 'HEALTH_CRITICAL' ? 'CRITICAL' : 'URGENT') +
        '\nCase: ' + caseId +
        '\n\nเพื่อคุ้มครองข้อมูลส่วนบุคคล รายละเอียดทางสุขภาพจะแสดงหลังยืนยันตัวตนใน RTAFNC ONE เท่านั้น',
      reply_markup: { inline_keyboard: [[{ text: 'เปิดรายการอย่างปลอดภัย', url: oneOpsSafeAppUrl_(data.openUrl) }]] }
    };
  }
  if (t === 'APPROVAL_REQUEST') {
    return {
      text: '✅ RTAFNC ONE · รายการรออนุมัติ\n\nประเภท: ' + oneOpsClean_(data.taskLabel || 'คำขอ', 120) +
        '\nผู้ยื่น: ' + oneOpsClean_(data.subjectLabel || 'นักเรียน', 120) +
        '\nรายการ: ' + oneOpsClean_(data.summary || '-', 300) +
        '\nเลขที่: ' + caseId,
      reply_markup: { inline_keyboard: [[{ text: 'ตรวจสอบรายการ', url: oneOpsSafeAppUrl_(data.openUrl) }]] }
    };
  }
  return { text: '📣 RTAFNC ONE\n\n' + oneOpsClean_(data.title || 'ประกาศ', 200) + '\n' + oneOpsClean_(data.summary || '', 800) };
}

/** LINE Flex Kit — MK/Starbucks-like professional card, RTAFNC branding, no copied assets. */
function buildLineFlexPilot(template, data) {
  const t = String(template || '').toUpperCase();
  const critical = t === 'HEALTH_CRITICAL';
  const health = /^HEALTH_/.test(t);
  const accent = critical ? '#D64545' : health ? '#E08A3C' : '#D9A441';
  const title = health ? (critical ? 'PRIORITY HEALTH ALERT' : 'HEALTH ALERT') : t === 'APPROVAL_REQUEST' ? 'รายการรออนุมัติ' : 'RTAFNC ONE';
  const body = health
    ? 'มีรายการสุขภาพที่ต้องตรวจสอบ รายละเอียดจะแสดงหลังยืนยันตัวตนในระบบเท่านั้น'
    : oneOpsClean_(data.summary || data.title || 'มีรายการใหม่ใน RTAFNC ONE', 500);
  return {
    type: 'flex',
    altText: oneOpsClean_(data.altText || title, 400),
    contents: {
      type: 'bubble', size: 'mega',
      header: { type: 'box', layout: 'vertical', backgroundColor: '#071A32', paddingAll: '18px', contents: [
        { type: 'text', text: 'RTAFNC ONE', color: '#D9A441', weight: 'bold', size: 'sm' },
        { type: 'text', text: title, color: '#FFFFFF', weight: 'bold', size: 'xl', margin: 'md', wrap: true }
      ]},
      body: { type: 'box', layout: 'vertical', spacing: 'md', contents: [
        { type: 'box', layout: 'vertical', backgroundColor: health ? '#FFF7ED' : '#F8FAFC', cornerRadius: '12px', paddingAll: '14px', contents: [
          { type: 'text', text: body, color: '#172033', size: 'sm', wrap: true },
          { type: 'text', text: 'Case / Ref: ' + oneOpsClean_(data.caseId || data.eventId || '-', 100), color: '#64748B', size: 'xs', margin: 'md', wrap: true }
        ]},
        { type: 'separator', color: '#E2E8F0' },
        { type: 'text', text: health ? 'ข้อมูลสุขภาพจะไม่ถูกแสดงในข้อความแจ้งเตือน' : 'ตรวจสอบรายละเอียดและดำเนินการใน RTAFNC ONE', color: accent, size: 'xs', weight: 'bold', wrap: true }
      ]},
      footer: { type: 'box', layout: 'vertical', contents: [
        { type: 'button', style: 'primary', color: '#173A5F', height: 'sm', action: { type: 'uri', label: health ? 'เปิดรายการอย่างปลอดภัย' : 'เปิด RTAFNC ONE', uri: oneOpsSafeAppUrl_(data.openUrl) } }
      ]},
      styles: { footer: { separator: true } }
    }
  };
}

/** Sends a Telegram message only when OPS_PILOT_ENABLED=true. */
function sendTelegramPilot(chatId, template, data, eventId, recipientRtafncId) {
  oneOpsAssertSendingEnabled_();
  const token = PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN');
  if (!token) throw new Error('ไม่พบ TELEGRAM_BOT_TOKEN ใน Script Properties');
  const msg = buildTelegramNotificationPilot(template, data || {});
  const response = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ chat_id: String(chatId), text: msg.text, reply_markup: msg.reply_markup || undefined, disable_web_page_preview: true })
  });
  const ok = response.getResponseCode() >= 200 && response.getResponseCode() < 300;
  oneOpsLogNotification_(eventId, 'telegram', recipientRtafncId, String(chatId), template, ok ? 'SENT' : 'FAILED', response.getResponseCode(), response.getContentText());
  if (!ok) throw new Error('Telegram ส่งไม่สำเร็จ HTTP ' + response.getResponseCode());
  return { ok: true, code: response.getResponseCode() };
}

/** Sends LINE Flex only when OPS_PILOT_ENABLED=true. */
function sendLineFlexPilot(lineUserId, template, data, eventId, recipientRtafncId) {
  oneOpsAssertSendingEnabled_();
  const token = PropertiesService.getScriptProperties().getProperty('LINE_MESSAGING_CHANNEL_ACCESS_TOKEN');
  if (!token) throw new Error('ไม่พบ LINE_MESSAGING_CHANNEL_ACCESS_TOKEN ใน Script Properties');
  const flex = buildLineFlexPilot(template, data || {});
  const response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({ to: String(lineUserId), messages: [flex] })
  });
  const ok = response.getResponseCode() >= 200 && response.getResponseCode() < 300;
  oneOpsLogNotification_(eventId, 'line', recipientRtafncId, String(lineUserId), template, ok ? 'SENT' : 'FAILED', response.getResponseCode(), response.getContentText());
  if (!ok) throw new Error('LINE ส่งไม่สำเร็จ HTTP ' + response.getResponseCode());
  return { ok: true, code: response.getResponseCode() };
}

/** Demo smoke test — creates no external notification. */
function testOneOpsRoutingPilot() {
  setupRtafncOneOpsPilot();
  const health = routeOneEventPilot({ eventType: 'HEALTH_HOSPITAL_REQUEST', severity: 'URGENT' });
  const deed = routeOneEventPilot({ eventType: 'GOOD_DEED_APPROVAL', severity: 'ROUTINE' });
  const flex = buildLineFlexPilot('HEALTH_URGENT', { caseId: 'CASE-DEMO-001', openUrl: 'https://anuchit1tube168-cmd.github.io/gooddeeds69/rtafnc-one-pilot/health.html' });
  const telegram = buildTelegramNotificationPilot('APPROVAL_REQUEST', { caseId: 'GD-DEMO-001', taskLabel: 'บันทึกความดี', subjectLabel: 'นพอ. ตัวอย่าง', summary: 'กิจกรรมจิตอาสา 2 ชม.', openUrl: 'https://anuchit1tube168-cmd.github.io/gooddeeds69/rtafnc-one-pilot/' });
  const result = { ok: true, healthRoute: health, goodDeedRoute: deed, flexType: flex.type, telegramHasButton: Boolean(telegram.reply_markup) };
  console.log(JSON.stringify(result));
  return result;
}

// ---------------- internal helpers ----------------
function oneOpsDb_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('OPS_SPREADSHEET_ID') || props.getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('ตั้ง OPS_SPREADSHEET_ID (แนะนำ Pilot DB) หรือ SPREADSHEET_ID ใน Script Properties ก่อน');
  return SpreadsheetApp.openById(id);
}

function oneOpsEnsureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  return sh;
}

function oneOpsAppend_(sheetName, obj) {
  const ss = oneOpsDb_();
  const headers = ONE_OPS_HEADERS[sheetName];
  const sh = oneOpsEnsureSheet_(ss, sheetName, headers);
  sh.appendRow(headers.map(function(h) { return obj[h] === undefined ? '' : obj[h]; }));
  return obj;
}

function oneOpsAll_(sheetName) {
  const ss = oneOpsDb_();
  const headers = ONE_OPS_HEADERS[sheetName];
  const sh = oneOpsEnsureSheet_(ss, sheetName, headers);
  if (sh.getLastRow() < 2) return [];
  const values = sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues();
  return values.map(function(row) { const o = {}; headers.forEach(function(h, i) { o[h] = row[i]; }); return o; });
}

function oneOpsFind_(sheetName, predicate) { return oneOpsAll_(sheetName).find(predicate) || null; }

function oneOpsUpdateByKey_(sheetName, keyName, keyValue, patch) {
  const ss = oneOpsDb_();
  const headers = ONE_OPS_HEADERS[sheetName];
  const sh = oneOpsEnsureSheet_(ss, sheetName, headers);
  const keyCol = headers.indexOf(keyName);
  if (keyCol < 0) throw new Error('ไม่พบ key column');
  const last = sh.getLastRow();
  if (last < 2) throw new Error('ไม่พบข้อมูล');
  const values = sh.getRange(2, 1, last - 1, headers.length).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][keyCol]) === String(keyValue)) {
      Object.keys(patch).forEach(function(k) {
        const c = headers.indexOf(k); if (c >= 0) sh.getRange(i + 2, c + 1).setValue(patch[k]);
      });
      return { ok: true, key: keyValue };
    }
  }
  throw new Error('ไม่พบข้อมูล ' + keyValue);
}

function oneOpsUpsertBinding_(rtafncId, memberId, channel, externalId, displayName) {
  const existing = oneOpsFind_(ONE_OPS.SHEETS.BINDINGS, function(r) {
    return String(r.rtafncId) === String(rtafncId) && String(r.channel) === String(channel);
  });
  const now = new Date().toISOString();
  if (existing) {
    oneOpsUpdateByKey_(ONE_OPS.SHEETS.BINDINGS, 'bindingId', existing.bindingId, {
      externalId: externalId, displayName: displayName, status: 'VERIFIED', verifiedAt: now, updatedAt: now
    });
    return existing.bindingId;
  }
  const id = 'BND-' + Utilities.getUuid();
  oneOpsAppend_(ONE_OPS.SHEETS.BINDINGS, {
    bindingId: id, rtafncId: rtafncId, memberId: memberId || '', channel: channel, externalId: externalId,
    displayName: displayName || '', status: 'VERIFIED', verifiedAt: now, createdAt: now, updatedAt: now
  });
  return id;
}

function oneOpsLogNotification_(eventId, channel, rid, externalId, template, status, responseCode, detail) {
  oneOpsAppend_(ONE_OPS.SHEETS.NOTIFY_LOG, {
    notificationId: 'NTF-' + Utilities.getUuid(), eventId: eventId || '', channel: channel,
    recipientRtafncId: rid || '', externalId: externalId || '', template: template || '', status: status,
    responseCode: responseCode || '', detail: oneOpsClean_(detail, 1000), createdAt: new Date().toISOString(), sentAt: status === 'SENT' ? new Date().toISOString() : ''
  });
}

function oneOpsAssertSendingEnabled_() { if (!oneOpsSendingEnabled_()) throw new Error('PILOT SEND ปิดอยู่ — ตั้ง OPS_PILOT_ENABLED=true เฉพาะหลังตรวจ token/สิทธิ์แล้ว'); }
function oneOpsSendingEnabled_() { return String(PropertiesService.getScriptProperties().getProperty('OPS_PILOT_ENABLED')).toLowerCase() === 'true'; }
function oneOpsRandomCode_(len) { const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let out = ''; for (let i=0;i<len;i++) out += chars.charAt(Math.floor(Math.random()*chars.length)); return out; }
function oneOpsClean_(v, max) { return String(v === undefined || v === null ? '' : v).replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max || 500); }
function oneOpsUnique_(arr) { return arr.filter(function(v, i) { return arr.indexOf(v) === i; }); }
function oneOpsSafeAppUrl_(url) { const fallback = 'https://anuchit1tube168-cmd.github.io/gooddeeds69/rtafnc-one-pilot/'; const s = String(url || fallback); return /^https:\/\//i.test(s) ? s : fallback; }
