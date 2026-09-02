/**
 * RTAFNC Good Deed 2569 — Cloudflare Domain Adapter
 *
 * Architecture:
 *   LINE LIFF -> Cloudflare Worker (auth/RBAC/session/CSRF/rate-limit)
 *   -> this Apps Script adapter (HMAC server-to-server only)
 *   -> Private Google Sheets/Drive.
 *
 * Non-negotiable:
 * - Do not expose this adapter secret, Drive file IDs, or student rosters to the browser.
 * - Main_2569 + Deeds_2569 remain the authoritative Good Deed source for AY2569.
 * - Existing data is never deleted by cleanup or reconciliation.
 * - Operational writes are fail-closed and disabled unless Script Properties explicitly enable them.
 * - Every write uses a request ID, replay protection, LockService and audit rows.
 *
 * Required Script Properties:
 *   GOODDEED_2569_SPREADSHEET_ID
 *   GOODDEED_ACADEMIC_YEAR=2569
 *   CLOUDFLARE_CARD_ADAPTER_SECRET=<random >=32 chars>
 *
 * Required before evidence writes:
 *   GOODDEED_EVIDENCE_FOLDER_ID
 *
 * Required before activation-code generation:
 *   GOODDEED_ACTIVATION_EXPORT_FOLDER_ID
 *
 * Optional LINE result notification:
 *   LINE_MESSAGING_CHANNEL_ACCESS_TOKEN
 *
 * Safety gates (default OFF):
 *   GOODDEED_WRITE_ENABLED=true
 *   GOODDEED_REVIEW_ENABLED=true
 *   GOODDEED_ACTIVATION_ENABLED=true
 *   GOODDEED_LINE_PUSH_ENABLED=true
 *   GOODDEED_EVIDENCE_REQUIRED=true|false  (defaults true)
 */

var GD_CF = Object.freeze({
  VERSION: 'gooddeed-cloudflare-2569-v1',
  MAX_CLOCK_SKEW_SECONDS: 120,
  REPLAY_TTL_SECONDS: 300,
  MAX_BODY_BYTES: 3 * 1024 * 1024,
  MAX_EVIDENCE_BYTES: 2 * 1024 * 1024,
  MAX_DESCRIPTION_CHARS: 1200,
  MAX_REVIEW_NOTE_CHARS: 600,
  SUMMARY_PREFIX: 'Main_',
  DEEDS_PREFIX: 'Deeds_',
  SUPPORT: {
    evidence: 'Evidence_',
    reviews: 'Reviews_',
    audit: 'Audit_',
    activation: 'Activation_',
    notifications: 'Notifications_'
  },
  CATEGORY_MAX_HOURS: {
    '1': 16,
    '2': 8,
    '3': 8,
    '4': 6,
    '5': 8,
    '6': 6,
    '7': 4,
    '8': 8,
    '9': 10
  },
  SUPPORT_HEADERS: {
    evidence: ['Evidence ID','Deed ID','Student ID','File ID','File Name','Mime Type','File Size','Uploaded At','Active'],
    reviews: ['Review ID','Deed ID','Student ID','Reviewer Identity','Decision','Note','Reviewed At','Request ID','Previous Category Hours','New Category Hours','Previous Level','New Level','Summary Applied'],
    audit: ['Audit ID','Request ID','Actor Identity','Action','Student ID','Deed ID','Outcome','Detail Code','Occurred At'],
    activation: ['Student ID','Code Hash','Expires At','Used At','Issued At','Status','Request ID'],
    notifications: ['Notification ID','Student ID','Deed ID','Channel','Status','Sent At','Error Code']
  }
});

function doGet() {
  var c = gdConfig_();
  return gdJson_({
    ok: true,
    service: 'RTAFNC Good Deed Cloudflare Domain Adapter',
    version: GD_CF.VERSION,
    academicYear: c.academicYear || null,
    configured: Boolean(c.spreadsheetId && c.academicYear && c.secretReady),
    gates: {
      writeEnabled: c.writeEnabled,
      reviewEnabled: c.reviewEnabled,
      activationEnabled: c.activationEnabled,
      linePushEnabled: c.linePushEnabled,
      evidenceRequired: c.evidenceRequired,
      evidenceFolderConfigured: Boolean(c.evidenceFolderId)
    }
  });
}

function doPost(e) {
  try {
    var req = gdVerifySignedRequest_((e && e.parameter) || {});
    var result;
    if (req.action === 'cloudflareCardSelf') result = gdCardSelf_(req);
    else if (req.action === 'cloudflareListSelf') result = gdListSelf_(req);
    else if (req.action === 'cloudflareSubmitSelf') result = gdSubmitSelf_(req);
    else if (req.action === 'cloudflarePendingQueue') result = gdPendingQueue_(req);
    else if (req.action === 'cloudflareReviewDeed') result = gdReviewDeed_(req);
    else if (req.action === 'cloudflareGetEvidence') result = gdGetEvidence_(req);
    else if (req.action === 'cloudflareActivateLink') result = gdActivateLink_(req);
    else throw new Error('ADAPTER_ACTION_NOT_ALLOWED');
    return gdJson_({ ok: true, data: result });
  } catch (error) {
    var code = gdSafeError_(error);
    console.warn('[GoodDeed Cloudflare adapter] denied code=' + code);
    return gdJson_({ ok: false, error: code });
  }
}

/** Read-only readiness check. Never returns secret values or file IDs. */
function gdPreflight() {
  var c = gdConfig_();
  var out = {
    ok: true,
    version: GD_CF.VERSION,
    configured: {
      spreadsheet: Boolean(c.spreadsheetId),
      academicYear: Boolean(c.academicYear),
      adapterSecret: c.secretReady,
      evidenceFolder: Boolean(c.evidenceFolderId),
      activationExportFolder: Boolean(c.activationExportFolderId),
      lineMessagingToken: Boolean(c.lineToken)
    },
    gates: {
      writeEnabled: c.writeEnabled,
      reviewEnabled: c.reviewEnabled,
      activationEnabled: c.activationEnabled,
      linePushEnabled: c.linePushEnabled,
      evidenceRequired: c.evidenceRequired
    },
    sheets: {}
  };
  if (!c.spreadsheetId || !c.academicYear || !c.secretReady) out.ok = false;
  if (!c.spreadsheetId || !c.academicYear) return out;
  try {
    var ss = SpreadsheetApp.openById(c.spreadsheetId);
    var names = gdSheetNames_(c.academicYear);
    var expected = {};
    expected[names.summary] = ['รหัสประจำตัว','ยศ','ชื่อ','นามสกุล','ชั้นปี (รุ่น)','รวมชั่วโมงสะสม','ระดับความดี (Level)','LINE User ID','LINE Display Name','อัปเดตล่าสุด'];
    expected[names.deeds] = ['Deed ID','รหัสนักเรียน','หมวดหมู่ ID','จำนวนชั่วโมง','วันที่ทำกิจกรรม','รายละเอียด','สถานะ','วันที่ส่งเรื่อง'];
    Object.keys(GD_CF.SUPPORT_HEADERS).forEach(function(key) { expected[names[key]] = GD_CF.SUPPORT_HEADERS[key]; });
    Object.keys(expected).forEach(function(name) {
      var sh = ss.getSheetByName(name);
      if (!sh) {
        out.sheets[name] = { exists: false, headersMatch: false };
        out.ok = false;
        return;
      }
      var headers = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), expected[name].length)).getDisplayValues()[0].map(String);
      var headersMatch = expected[name].every(function(h) { return headers.indexOf(h) >= 0; });
      out.sheets[name] = { exists: true, headersMatch: headersMatch, rows: Math.max(sh.getLastRow() - 1, 0) };
      if (!headersMatch) out.ok = false;
    });
  } catch (_) {
    out.ok = false;
    out.spreadsheetAccessible = false;
  }
  return out;
}

/**
 * Non-destructive setup. Creates only support sheets if missing.
 * Main_2569 and Deeds_2569 are never created/replaced by this function.
 */
function gdEnsureSupportSheets() {
  var c = gdConfig_();
  if (!c.spreadsheetId || !c.academicYear) throw new Error('ADAPTER_DISABLED');
  var ss = SpreadsheetApp.openById(c.spreadsheetId);
  var names = gdSheetNames_(c.academicYear);
  if (!ss.getSheetByName(names.summary) || !ss.getSheetByName(names.deeds)) throw new Error('ADAPTER_SOURCE_NOT_READY');
  Object.keys(GD_CF.SUPPORT_HEADERS).forEach(function(key) {
    var name = names[key];
    var sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    var headers = GD_CF.SUPPORT_HEADERS[key];
    if (sheet.getMaxColumns() < headers.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
    var current = sheet.getRange(1, 1, 1, headers.length).getDisplayValues()[0].map(String);
    var blank = current.every(function(v) { return !v; });
    if (blank) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    } else if (!headers.every(function(h, i) { return current[i] === h; })) {
      throw new Error('SUPPORT_SHEET_SCHEMA_MISMATCH');
    }
  });
  return gdPreflight();
}

/**
 * Owner-only manual function. Generates one-time activation codes for students
 * who are not yet LINE-bound. Codes are exported to a PRIVATE CSV folder.
 * No code value is stored in the sheet; only HMAC hashes are stored.
 */
function gdGenerateActivationCodes() {
  var c = gdConfig_();
  if (!c.spreadsheetId || !c.academicYear || !c.secretReady || !c.activationExportFolderId) throw new Error('ACTIVATION_GENERATOR_NOT_CONFIGURED');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('ADAPTER_BUSY');
  try {
    gdEnsureSupportSheets();
    var ss = SpreadsheetApp.openById(c.spreadsheetId);
    var names = gdSheetNames_(c.academicYear);
    var main = ss.getSheetByName(names.summary);
    var activation = ss.getSheetByName(names.activation);
    var mainHeaders = gdHeaderMap_(main);
    var idCol = gdRequiredColumn_(mainHeaders, 'รหัสประจำตัว');
    var lineCol = gdRequiredColumn_(mainHeaders, 'LINE User ID');
    var rows = main.getLastRow() > 1 ? main.getRange(2, 1, main.getLastRow() - 1, main.getLastColumn()).getDisplayValues() : [];
    var active = gdActiveActivationMap_(activation);
    var now = new Date();
    var expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    var exportRows = [['studentId','activationCode','expiresAt']];
    var sheetRows = [];
    rows.forEach(function(row) {
      var studentId = gdClean_(row[idCol - 1], 16);
      var lineId = gdClean_(row[lineCol - 1], 80);
      if (!/^\d{7}$/.test(studentId) || lineId) return;
      if (active[studentId]) return;
      var code = gdRandomCode_(12);
      var codeHash = gdHmacSha256Hex_(studentId + '\n' + code, c.secret);
      sheetRows.push([studentId, codeHash, gdIso_(expiry), '', gdIso_(now), 'ACTIVE', '']);
      exportRows.push([studentId, code, gdIso_(expiry)]);
    });
    if (sheetRows.length) activation.getRange(activation.getLastRow() + 1, 1, sheetRows.length, 7).setValues(sheetRows);
    var csv = exportRows.map(function(row) { return row.map(gdCsvCell_).join(','); }).join('\r\n');
    var folder = DriveApp.getFolderById(c.activationExportFolderId);
    var fileName = 'GoodDeed-Activation-Codes-' + Utilities.formatDate(now, 'Asia/Bangkok', 'yyyyMMdd-HHmmss') + '.csv';
    var file = folder.createFile(Utilities.newBlob(csv, 'text/csv', fileName));
    file.setDescription('PRIVATE one-time activation codes. Delete after secure distribution is completed.');
    console.log('ACTIVATION_CODES_CREATED count=' + sheetRows.length + ' fileId=' + file.getId());
    return { ok: true, created: sheetRows.length, fileId: file.getId() };
  } finally {
    lock.releaseLock();
  }
}

function gdVerifySignedRequest_(params) {
  var c = gdConfig_();
  if (!c.spreadsheetId || !c.academicYear || !c.secretReady) throw new Error('ADAPTER_DISABLED');
  var action = gdClean_(params.action, 80);
  var subjectRef = gdClean_(params.subjectRef, 128);
  var requestId = gdClean_(params.requestId, 96);
  var timestamp = Number(params.timestamp || 0);
  var nonce = gdClean_(params.nonce, 128);
  var signature = gdClean_(params.signature, 128).toLowerCase();
  var bodyText = String(params.body || '{}');
  if (!/^[A-Za-z][A-Za-z0-9]{2,79}$/.test(action)) throw new Error('ADAPTER_ACTION_INVALID');
  if (!/^[A-Za-z0-9._:-]{1,128}$/.test(subjectRef)) throw new Error('ADAPTER_SUBJECT_INVALID');
  if (!/^[A-Za-z0-9._:-]{1,96}$/.test(requestId)) throw new Error('ADAPTER_REQUEST_ID_INVALID');
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(nonce)) throw new Error('ADAPTER_NONCE_INVALID');
  if (!/^[0-9a-f]{64}$/.test(signature)) throw new Error('ADAPTER_SIGNATURE_INVALID');
  if (Utilities.newBlob(bodyText).getBytes().length > GD_CF.MAX_BODY_BYTES) throw new Error('ADAPTER_BODY_TOO_LARGE');
  var nowSeconds = Math.floor(Date.now() / 1000);
  if (!isFinite(timestamp) || Math.abs(nowSeconds - timestamp) > GD_CF.MAX_CLOCK_SKEW_SECONDS) throw new Error('ADAPTER_TIMESTAMP_INVALID');
  var bodyHash = gdSha256Hex_(bodyText);
  var canonical = ['v2', action, subjectRef, requestId, String(timestamp), nonce, bodyHash].join('\n');
  var expected = gdHmacSha256Hex_(canonical, c.secret);
  if (!gdConstantTimeEqual_(expected, signature)) throw new Error('ADAPTER_SIGNATURE_INVALID');
  var replayKey = 'gd-cf:' + gdSha256Hex_(action + ':' + nonce).slice(0, 48);
  var cache = CacheService.getScriptCache();
  if (cache.get(replayKey)) throw new Error('ADAPTER_REPLAY_DETECTED');
  cache.put(replayKey, '1', GD_CF.REPLAY_TTL_SECONDS);
  return {
    config: c,
    action: action,
    subjectRef: subjectRef,
    requestId: requestId,
    data: gdParseJson_(bodyText)
  };
}

function gdCardSelf_(req) {
  var studentId = gdRequireStudentRef_(req.subjectRef);
  var ss = SpreadsheetApp.openById(req.config.spreadsheetId);
  var names = gdSheetNames_(req.config.academicYear);
  var summary = gdReadSummary_(ss.getSheetByName(names.summary), studentId);
  var counts = gdCountStatuses_(ss.getSheetByName(names.deeds), studentId);
  return { card: {
    displayName: summary.displayName,
    studentId: studentId,
    cohortLabel: summary.cohortLabel,
    positionLabel: 'นักเรียนพยาบาล',
    totalHours: summary.totalHours,
    approvedCount: counts.approved,
    pendingCount: counts.pending,
    levelNumber: summary.levelNumber,
    levelLabel: summary.levelLabel,
    passed: summary.totalHours >= 50,
    categoryHours: summary.categoryHours
  }};
}

function gdListSelf_(req) {
  var studentId = gdRequireStudentRef_(req.subjectRef);
  var limit = Math.max(1, Math.min(200, Number(req.data.limit || 100)));
  var ss = SpreadsheetApp.openById(req.config.spreadsheetId);
  var names = gdSheetNames_(req.config.academicYear);
  var deeds = ss.getSheetByName(names.deeds);
  var evidence = ss.getSheetByName(names.evidence);
  var items = gdReadDeedsForStudent_(deeds, evidence, studentId).slice(0, limit);
  return { items: items };
}

function gdSubmitSelf_(req) {
  var c = req.config;
  if (!c.writeEnabled) throw new Error('WRITE_DISABLED');
  var studentId = gdRequireStudentRef_(req.subjectRef);
  var d = req.data || {};
  var categoryId = String(Number(d.categoryId || 0));
  var maxHours = GD_CF.CATEGORY_MAX_HOURS[categoryId];
  var hours = Number(d.hours || 0);
  var activityDate = gdClean_(d.activityDate, 20);
  var description = gdClean_(d.description, GD_CF.MAX_DESCRIPTION_CHARS);
  if (!maxHours) throw new Error('CATEGORY_INVALID');
  if (!isFinite(hours) || hours <= 0 || hours > maxHours || Math.round(hours * 2) !== hours * 2) throw new Error('HOURS_INVALID');
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(activityDate) || isNaN(new Date(activityDate + 'T00:00:00+07:00').getTime())) throw new Error('ACTIVITY_DATE_INVALID');
  if (new Date(activityDate + 'T00:00:00+07:00').getTime() > Date.now() + 24 * 60 * 60 * 1000) throw new Error('ACTIVITY_DATE_INVALID');
  if (description.length < 3) throw new Error('DESCRIPTION_INVALID');
  if (c.evidenceRequired && !d.evidence) throw new Error('EVIDENCE_REQUIRED');

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('ADAPTER_BUSY');
  try {
    var ss = SpreadsheetApp.openById(c.spreadsheetId);
    var names = gdSheetNames_(c.academicYear);
    var main = ss.getSheetByName(names.summary);
    var deeds = ss.getSheetByName(names.deeds);
    var evidenceSheet = ss.getSheetByName(names.evidence);
    var audit = ss.getSheetByName(names.audit);
    if (!main || !deeds || !evidenceSheet || !audit) throw new Error('ADAPTER_SOURCE_NOT_READY');
    gdReadSummary_(main, studentId);
    var prior = gdFindAuditSuccess_(audit, req.requestId, 'gooddeed.submit');
    if (prior) return { deed: gdReadDeedById_(deeds, prior.deedId), idempotent: true };

    var deedId = 'deed_cf_' + Date.now() + '_' + Utilities.getUuid().replace(/-/g, '').slice(0, 10);
    var now = new Date();
    var evidenceMeta = null;
    if (d.evidence) evidenceMeta = gdStoreEvidence_(c, evidenceSheet, deedId, studentId, d.evidence, now);
    deeds.appendRow([deedId, studentId, Number(categoryId), hours, activityDate, description, 'pending', gdIso_(now)]);
    gdAppendAudit_(audit, req.requestId, studentId, 'gooddeed.submit', studentId, deedId, 'success', evidenceMeta ? 'evidence_attached' : 'no_evidence');
    return { deed: {
      deedId: deedId,
      categoryId: Number(categoryId),
      hours: hours,
      activityDate: activityDate,
      description: description,
      status: 'pending',
      submittedAt: gdIso_(now),
      hasEvidence: Boolean(evidenceMeta)
    }};
  } finally {
    lock.releaseLock();
  }
}

function gdPendingQueue_(req) {
  var ss = SpreadsheetApp.openById(req.config.spreadsheetId);
  var names = gdSheetNames_(req.config.academicYear);
  var deeds = ss.getSheetByName(names.deeds);
  var main = ss.getSheetByName(names.summary);
  var evidence = ss.getSheetByName(names.evidence);
  if (!deeds || !main || !evidence) throw new Error('ADAPTER_SOURCE_NOT_READY');
  var limit = Math.max(1, Math.min(250, Number(req.data.limit || 100)));
  var evidenceSet = gdEvidenceDeedSet_(evidence);
  var studentMap = gdStudentDisplayMap_(main);
  var rows = deeds.getLastRow() > 1 ? deeds.getRange(2, 1, deeds.getLastRow() - 1, Math.max(8, deeds.getLastColumn())).getDisplayValues() : [];
  var items = [];
  rows.forEach(function(r) {
    var status = gdClean_(r[6], 30).toLowerCase();
    if (status !== 'pending' && status !== 'รอตรวจ' && status !== 'รออนุมัติ') return;
    var studentId = gdClean_(r[1], 16);
    var stu = studentMap[studentId] || { displayName: 'นักเรียน ' + studentId, cohortLabel: '-' };
    items.push({
      deedId: gdClean_(r[0], 120),
      studentId: studentId,
      displayName: stu.displayName,
      cohortLabel: stu.cohortLabel,
      categoryId: Number(r[2] || 0),
      hours: Number(r[3] || 0),
      activityDate: gdClean_(r[4], 40),
      description: gdClean_(r[5], GD_CF.MAX_DESCRIPTION_CHARS),
      status: 'pending',
      submittedAt: gdClean_(r[7], 80),
      hasEvidence: Boolean(evidenceSet[gdClean_(r[0], 120)])
    });
  });
  items.reverse();
  return { items: items.slice(0, limit) };
}

function gdReviewDeed_(req) {
  var c = req.config;
  if (!c.reviewEnabled) throw new Error('REVIEW_DISABLED');
  var reviewerRef = gdClean_(req.subjectRef, 128);
  var deedId = gdClean_(req.data.deedId, 120);
  var decision = gdClean_(req.data.decision, 20).toLowerCase();
  var note = gdClean_(req.data.note, GD_CF.MAX_REVIEW_NOTE_CHARS);
  if (!deedId) throw new Error('DEED_ID_INVALID');
  if (decision !== 'approved' && decision !== 'rejected') throw new Error('DECISION_INVALID');

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('ADAPTER_BUSY');
  try {
    var ss = SpreadsheetApp.openById(c.spreadsheetId);
    var names = gdSheetNames_(c.academicYear);
    var deeds = ss.getSheetByName(names.deeds);
    var main = ss.getSheetByName(names.summary);
    var reviews = ss.getSheetByName(names.reviews);
    var audit = ss.getSheetByName(names.audit);
    if (!deeds || !main || !reviews || !audit) throw new Error('ADAPTER_SOURCE_NOT_READY');

    var priorAudit = gdFindAuditSuccess_(audit, req.requestId, 'gooddeed.review');
    if (priorAudit) return { deed: gdReadDeedById_(deeds, priorAudit.deedId), idempotent: true };
    var deed = gdFindDeedRow_(deeds, deedId);
    if (!deed) throw new Error('DEED_NOT_FOUND');
    var currentStatus = gdClean_(deed.values[6], 30).toLowerCase();
    if (currentStatus === 'approved' || currentStatus === 'rejected') {
      return { deed: gdReadDeedById_(deeds, deedId), alreadyReviewed: true };
    }
    if (currentStatus === 'approving') {
      return gdResumeApproval_(ss, names, deed, reviews, audit, req);
    }
    if (currentStatus !== 'pending' && currentStatus !== 'รอตรวจ' && currentStatus !== 'รออนุมัติ') throw new Error('DEED_STATUS_CONFLICT');

    var studentId = gdClean_(deed.values[1], 16);
    var categoryId = Number(deed.values[2] || 0);
    var hours = Number(deed.values[3] || 0);
    if (!/^\d{7}$/.test(studentId) || !GD_CF.CATEGORY_MAX_HOURS[String(categoryId)] || !isFinite(hours) || hours <= 0) throw new Error('DEED_DATA_INVALID');

    var summary = gdReadSummary_(main, studentId);
    var reviewId = 'review_' + Utilities.getUuid();
    var now = new Date();
    if (decision === 'rejected') {
      reviews.appendRow([reviewId, deedId, studentId, reviewerRef, 'rejected', note, gdIso_(now), req.requestId, '', '', summary.levelLabel, summary.levelLabel, true]);
      deeds.getRange(deed.row, 7).setValue('rejected');
      gdAppendAudit_(audit, req.requestId, reviewerRef, 'gooddeed.review', studentId, deedId, 'success', 'rejected');
      gdNotifyDecision_(c, ss, names, studentId, deedId, 'rejected', hours, note);
      return { deed: gdReadDeedById_(deeds, deedId) };
    }

    var mainMap = gdHeaderMap_(main);
    var categoryCol = gdRequiredColumn_(mainMap, 'หมวด ' + categoryId + ' ' + gdCategoryHeaderTail_(categoryId));
    var prevCategoryHours = Number(main.getRange(summary.row, categoryCol).getValue() || 0);
    if (!isFinite(prevCategoryHours) || prevCategoryHours < 0) throw new Error('SUMMARY_CATEGORY_INVALID');
    var newCategoryHours = Math.round((prevCategoryHours + hours) * 100) / 100;
    var categoryHours = summary.categoryHours.slice();
    categoryHours[categoryId - 1] = newCategoryHours;
    var newTotal = categoryHours.reduce(function(sum, n) { return sum + Number(n || 0); }, 0);
    var newLevel = gdLevelForHours_(newTotal);
    reviews.appendRow([reviewId, deedId, studentId, reviewerRef, 'approved', note, gdIso_(now), req.requestId, prevCategoryHours, newCategoryHours, summary.levelLabel, newLevel.label, false]);
    var reviewRow = reviews.getLastRow();
    deeds.getRange(deed.row, 7).setValue('approving');
    main.getRange(summary.row, categoryCol).setValue(newCategoryHours);
    main.getRange(summary.row, gdRequiredColumn_(mainMap, 'ระดับความดี (Level)')).setValue(newLevel.label);
    main.getRange(summary.row, gdRequiredColumn_(mainMap, 'อัปเดตล่าสุด')).setValue(now);
    SpreadsheetApp.flush();
    reviews.getRange(reviewRow, 13).setValue(true);
    deeds.getRange(deed.row, 7).setValue('approved');
    gdAppendAudit_(audit, req.requestId, reviewerRef, 'gooddeed.review', studentId, deedId, 'success', 'approved');
    gdNotifyDecision_(c, ss, names, studentId, deedId, 'approved', hours, note);
    return { deed: gdReadDeedById_(deeds, deedId), totalHours: newTotal, levelNumber: newLevel.level, levelLabel: newLevel.label };
  } finally {
    lock.releaseLock();
  }
}

function gdResumeApproval_(ss, names, deed, reviews, audit, req) {
  var deedId = gdClean_(deed.values[0], 120);
  var studentId = gdClean_(deed.values[1], 16);
  var rows = reviews.getLastRow() > 1 ? reviews.getRange(2, 1, reviews.getLastRow() - 1, 13).getValues() : [];
  var reviewRowIndex = -1;
  var review = null;
  for (var i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i][1]) === deedId && String(rows[i][4]).toLowerCase() === 'approved') {
      review = rows[i]; reviewRowIndex = i + 2; break;
    }
  }
  if (!review) throw new Error('APPROVAL_RECOVERY_REVIEW_MISSING');
  var main = ss.getSheetByName(names.summary);
  var summary = gdReadSummary_(main, studentId);
  var categoryId = Number(deed.values[2] || 0);
  var map = gdHeaderMap_(main);
  var categoryCol = gdRequiredColumn_(map, 'หมวด ' + categoryId + ' ' + gdCategoryHeaderTail_(categoryId));
  var current = Number(main.getRange(summary.row, categoryCol).getValue() || 0);
  var prev = Number(review[8] || 0);
  var next = Number(review[9] || 0);
  var applied = review[12] === true || String(review[12]).toLowerCase() === 'true';
  if (!applied) {
    if (Math.abs(current - prev) < 0.0001) main.getRange(summary.row, categoryCol).setValue(next);
    else if (Math.abs(current - next) >= 0.0001) throw new Error('APPROVAL_RECOVERY_CONFLICT');
    var categoryHours = gdReadSummary_(main, studentId).categoryHours;
    var total = categoryHours.reduce(function(sum, n) { return sum + Number(n || 0); }, 0);
    var level = gdLevelForHours_(total);
    main.getRange(summary.row, gdRequiredColumn_(map, 'ระดับความดี (Level)')).setValue(level.label);
    main.getRange(summary.row, gdRequiredColumn_(map, 'อัปเดตล่าสุด')).setValue(new Date());
    reviews.getRange(reviewRowIndex, 13).setValue(true);
  }
  deed.sheet.getRange(deed.row, 7).setValue('approved');
  gdAppendAudit_(audit, req.requestId, req.subjectRef, 'gooddeed.review', studentId, deedId, 'success', 'approval_recovered');
  return { deed: gdReadDeedById_(deed.sheet, deedId), recovered: true };
}

function gdGetEvidence_(req) {
  var deedId = gdClean_(req.data.deedId, 120);
  if (!deedId) throw new Error('DEED_ID_INVALID');
  var ss = SpreadsheetApp.openById(req.config.spreadsheetId);
  var names = gdSheetNames_(req.config.academicYear);
  var deeds = ss.getSheetByName(names.deeds);
  var evidence = ss.getSheetByName(names.evidence);
  var deed = gdFindDeedRow_(deeds, deedId);
  if (!deed) throw new Error('DEED_NOT_FOUND');
  var ownerStudentId = gdClean_(deed.values[1], 16);
  if (/^\d{7}$/.test(req.subjectRef) && req.subjectRef !== ownerStudentId) throw new Error('EVIDENCE_FORBIDDEN');
  var rows = evidence.getLastRow() > 1 ? evidence.getRange(2, 1, evidence.getLastRow() - 1, 9).getValues() : [];
  var found = null;
  for (var i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i][1]) === deedId && String(rows[i][8]).toLowerCase() !== 'false') { found = rows[i]; break; }
  }
  if (!found) throw new Error('EVIDENCE_NOT_FOUND');
  var file = DriveApp.getFileById(String(found[3] || ''));
  if (file.getSize() > GD_CF.MAX_EVIDENCE_BYTES) throw new Error('EVIDENCE_TOO_LARGE');
  return { evidence: {
    deedId: deedId,
    fileName: gdClean_(file.getName(), 180),
    mimeType: gdClean_(file.getMimeType(), 100),
    base64: Utilities.base64Encode(file.getBlob().getBytes())
  }};
}

function gdActivateLink_(req) {
  var c = req.config;
  if (!c.activationEnabled) throw new Error('ACTIVATION_DISABLED');
  var studentId = gdRequireStudentRef_(req.subjectRef);
  var code = gdClean_(req.data.activationCode, 40).toUpperCase();
  var lineUserId = gdClean_(req.data.lineUserId, 80);
  var lineDisplayName = gdClean_(req.data.lineDisplayName, 100);
  var actorIdentityRef = gdClean_(req.data.actorIdentityRef, 128);
  if (!/^[A-Z2-9]{8,32}$/.test(code)) throw new Error('ACTIVATION_CODE_INVALID');
  if (!/^U[0-9a-f]{32}$/i.test(lineUserId)) throw new Error('LINE_USER_ID_INVALID');
  if (!actorIdentityRef) throw new Error('ACTOR_IDENTITY_INVALID');

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('ADAPTER_BUSY');
  try {
    var ss = SpreadsheetApp.openById(c.spreadsheetId);
    var names = gdSheetNames_(c.academicYear);
    var main = ss.getSheetByName(names.summary);
    var activation = ss.getSheetByName(names.activation);
    var audit = ss.getSheetByName(names.audit);
    var summary = gdReadSummary_(main, studentId);
    var map = gdHeaderMap_(main);
    var lineCol = gdRequiredColumn_(map, 'LINE User ID');
    var lineNameCol = gdRequiredColumn_(map, 'LINE Display Name');
    var updatedCol = gdRequiredColumn_(map, 'อัปเดตล่าสุด');
    var existingLine = gdClean_(main.getRange(summary.row, lineCol).getDisplayValue(), 80);
    if (existingLine && existingLine !== lineUserId) throw new Error('STUDENT_ALREADY_LINKED');

    var activeRow = gdFindActiveActivationRow_(activation, studentId);
    if (!activeRow) {
      if (existingLine === lineUserId) return { studentId: studentId, displayName: summary.displayName, cohortLabel: summary.cohortLabel, alreadyLinked: true };
      throw new Error('ACTIVATION_NOT_FOUND');
    }
    var values = activation.getRange(activeRow, 1, 1, 7).getDisplayValues()[0];
    var expires = new Date(values[2]);
    if (isNaN(expires.getTime()) || expires.getTime() < Date.now()) throw new Error('ACTIVATION_EXPIRED');
    var expectedHash = gdHmacSha256Hex_(studentId + '\n' + code, c.secret);
    if (!gdConstantTimeEqual_(expectedHash, String(values[1] || '').toLowerCase())) throw new Error('ACTIVATION_CODE_INVALID');

    main.getRange(summary.row, lineCol).setValue(lineUserId);
    main.getRange(summary.row, lineNameCol).setValue(lineDisplayName);
    main.getRange(summary.row, updatedCol).setValue(new Date());
    activation.getRange(activeRow, 4).setValue(gdIso_(new Date()));
    activation.getRange(activeRow, 6).setValue('USED');
    activation.getRange(activeRow, 7).setValue(req.requestId);
    gdAppendAudit_(audit, req.requestId, actorIdentityRef, 'gooddeed.activate_link', studentId, '', 'success', 'line_bound');
    return { studentId: studentId, displayName: summary.displayName, cohortLabel: summary.cohortLabel };
  } finally {
    lock.releaseLock();
  }
}

function gdStoreEvidence_(c, sheet, deedId, studentId, evidence, now) {
  if (!c.evidenceFolderId) throw new Error('EVIDENCE_FOLDER_NOT_CONFIGURED');
  var fileName = gdClean_(evidence && evidence.fileName, 160);
  var mimeType = gdClean_(evidence && evidence.mimeType, 100).toLowerCase();
  var base64 = String(evidence && evidence.base64 || '');
  if (!fileName || !base64) throw new Error('EVIDENCE_INVALID');
  if (['image/jpeg','image/png','application/pdf'].indexOf(mimeType) < 0) throw new Error('EVIDENCE_TYPE_INVALID');
  var bytes;
  try { bytes = Utilities.base64Decode(base64); } catch (_) { throw new Error('EVIDENCE_INVALID'); }
  if (!bytes.length || bytes.length > GD_CF.MAX_EVIDENCE_BYTES) throw new Error('EVIDENCE_TOO_LARGE');
  var folder = DriveApp.getFolderById(c.evidenceFolderId);
  var safeName = deedId + '-' + fileName.replace(/[^A-Za-z0-9ก-๙._ -]/g, '_').slice(0, 120);
  var file = folder.createFile(Utilities.newBlob(bytes, mimeType, safeName));
  file.setDescription('Private Good Deed evidence. Student=' + studentId + ' Deed=' + deedId);
  var evidenceId = 'ev_' + Utilities.getUuid();
  sheet.appendRow([evidenceId, deedId, studentId, file.getId(), file.getName(), mimeType, bytes.length, gdIso_(now), true]);
  return { evidenceId: evidenceId, fileName: file.getName(), mimeType: mimeType, size: bytes.length };
}

function gdNotifyDecision_(c, ss, names, studentId, deedId, decision, hours, note) {
  var notifications = ss.getSheetByName(names.notifications);
  if (!notifications) return;
  if (!c.linePushEnabled || !c.lineToken) {
    notifications.appendRow(['nt_' + Utilities.getUuid(), studentId, deedId, 'LINE', 'skipped', gdIso_(new Date()), 'PUSH_DISABLED']);
    return;
  }
  try {
    var main = ss.getSheetByName(names.summary);
    var summary = gdReadSummary_(main, studentId);
    var map = gdHeaderMap_(main);
    var lineUserId = gdClean_(main.getRange(summary.row, gdRequiredColumn_(map, 'LINE User ID')).getDisplayValue(), 80);
    if (!/^U[0-9a-f]{32}$/i.test(lineUserId)) throw new Error('LINE_BINDING_MISSING');
    var text = decision === 'approved'
      ? '✅ รายการความดีได้รับการอนุมัติ ' + Number(hours || 0) + ' ชม.\nระบบบันทึกความดี วพอ. 2569'
      : '❌ รายการความดียังไม่ได้รับการอนุมัติ' + (note ? '\nหมายเหตุ: ' + note : '') + '\nระบบบันทึกความดี วพอ. 2569';
    var res = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
      method: 'post',
      muteHttpExceptions: true,
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + c.lineToken },
      payload: JSON.stringify({ to: lineUserId, messages: [{ type: 'text', text: text.slice(0, 4800) }] })
    });
    var ok = res.getResponseCode() >= 200 && res.getResponseCode() < 300;
    notifications.appendRow(['nt_' + Utilities.getUuid(), studentId, deedId, 'LINE', ok ? 'sent' : 'failed', gdIso_(new Date()), ok ? '' : 'HTTP_' + res.getResponseCode()]);
  } catch (error) {
    notifications.appendRow(['nt_' + Utilities.getUuid(), studentId, deedId, 'LINE', 'failed', gdIso_(new Date()), gdClean_(error && error.message, 100)]);
  }
}

function gdReadSummary_(sheet, studentId) {
  if (!sheet) throw new Error('ADAPTER_SOURCE_NOT_READY');
  var map = gdHeaderMap_(sheet);
  var idCol = gdRequiredColumn_(map, 'รหัสประจำตัว');
  var match = sheet.getRange(2, idCol, Math.max(sheet.getLastRow() - 1, 1), 1).createTextFinder(studentId).matchEntireCell(true).findNext();
  if (!match) throw new Error('STUDENT_NOT_FOUND');
  var row = match.getRow();
  var rank = gdClean_(sheet.getRange(row, gdRequiredColumn_(map, 'ยศ')).getDisplayValue(), 30);
  var first = gdClean_(sheet.getRange(row, gdRequiredColumn_(map, 'ชื่อ')).getDisplayValue(), 60);
  var last = gdClean_(sheet.getRange(row, gdRequiredColumn_(map, 'นามสกุล')).getDisplayValue(), 60);
  var cohortRaw = gdClean_(sheet.getRange(row, gdRequiredColumn_(map, 'ชั้นปี (รุ่น)')).getDisplayValue(), 80);
  var total = Number(sheet.getRange(row, gdRequiredColumn_(map, 'รวมชั่วโมงสะสม')).getValue() || 0);
  var levelRaw = gdClean_(sheet.getRange(row, gdRequiredColumn_(map, 'ระดับความดี (Level)')).getDisplayValue(), 160);
  var categoryHours = [];
  for (var i = 1; i <= 9; i++) {
    var col = gdRequiredColumn_(map, 'หมวด ' + i + ' ' + gdCategoryHeaderTail_(i));
    var value = Number(sheet.getRange(row, col).getValue() || 0);
    categoryHours.push(isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : 0);
  }
  if (!isFinite(total) || total < 0) total = categoryHours.reduce(function(s, n) { return s + n; }, 0);
  var derived = gdLevelForHours_(total);
  var levelMatch = levelRaw.match(/Lv\.?\s*(10|[1-9])\b/i);
  var levelNumber = levelMatch ? Number(levelMatch[1]) : derived.level;
  return {
    row: row,
    displayName: [rank, first, last].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(),
    cohortLabel: cohortRaw.replace(/^รุ่น\s*/i, '').trim() || '-',
    totalHours: Math.round(total * 100) / 100,
    categoryHours: categoryHours,
    levelNumber: levelNumber,
    levelLabel: levelRaw || derived.label
  };
}

function gdReadDeedsForStudent_(deeds, evidence, studentId) {
  if (!deeds) throw new Error('ADAPTER_SOURCE_NOT_READY');
  var evidenceSet = gdEvidenceDeedSet_(evidence, studentId);
  var rows = deeds.getLastRow() > 1 ? deeds.getRange(2, 1, deeds.getLastRow() - 1, Math.max(8, deeds.getLastColumn())).getDisplayValues() : [];
  var items = [];
  rows.forEach(function(r) {
    if (gdClean_(r[1], 16) !== studentId) return;
    var deedId = gdClean_(r[0], 120);
    items.push({ deedId: deedId, categoryId: Number(r[2] || 0), hours: Number(r[3] || 0), activityDate: gdClean_(r[4], 40), description: gdClean_(r[5], GD_CF.MAX_DESCRIPTION_CHARS), status: gdNormalizeStatus_(r[6]), submittedAt: gdClean_(r[7], 80), hasEvidence: Boolean(evidenceSet[deedId]) });
  });
  items.reverse();
  return items;
}

function gdReadDeedById_(sheet, deedId) {
  var found = gdFindDeedRow_(sheet, deedId);
  if (!found) throw new Error('DEED_NOT_FOUND');
  var r = found.values;
  return { deedId: gdClean_(r[0],120), studentId: gdClean_(r[1],16), categoryId: Number(r[2]||0), hours: Number(r[3]||0), activityDate: gdClean_(r[4],40), description: gdClean_(r[5],GD_CF.MAX_DESCRIPTION_CHARS), status: gdNormalizeStatus_(r[6]), submittedAt: gdClean_(r[7],80) };
}

function gdFindDeedRow_(sheet, deedId) {
  if (!sheet || sheet.getLastRow() < 2) return null;
  var match = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).createTextFinder(deedId).matchEntireCell(true).findNext();
  if (!match) return null;
  var row = match.getRow();
  return { sheet: sheet, row: row, values: sheet.getRange(row, 1, 1, Math.max(8, sheet.getLastColumn())).getValues()[0] };
}

function gdCountStatuses_(sheet, studentId) {
  var out = { approved: 0, pending: 0, rejected: 0 };
  if (!sheet || sheet.getLastRow() < 2) return out;
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, Math.max(8, sheet.getLastColumn())).getDisplayValues();
  rows.forEach(function(r) {
    if (gdClean_(r[1], 16) !== studentId) return;
    var s = gdNormalizeStatus_(r[6]);
    if (s === 'approved') out.approved++;
    else if (s === 'rejected') out.rejected++;
    else out.pending++;
  });
  return out;
}

function gdEvidenceDeedSet_(sheet, studentId) {
  var set = {};
  if (!sheet || sheet.getLastRow() < 2) return set;
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, Math.max(9, sheet.getLastColumn())).getDisplayValues();
  rows.forEach(function(r) {
    if (studentId && gdClean_(r[2],16) !== studentId) return;
    if (String(r[8]).toLowerCase() === 'false') return;
    set[gdClean_(r[1],120)] = true;
  });
  return set;
}

function gdStudentDisplayMap_(sheet) {
  var out = {};
  if (!sheet || sheet.getLastRow() < 2) return out;
  var map = gdHeaderMap_(sheet);
  var idCol = gdRequiredColumn_(map, 'รหัสประจำตัว');
  var rankCol = gdRequiredColumn_(map, 'ยศ');
  var firstCol = gdRequiredColumn_(map, 'ชื่อ');
  var lastCol = gdRequiredColumn_(map, 'นามสกุล');
  var cohortCol = gdRequiredColumn_(map, 'ชั้นปี (รุ่น)');
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getDisplayValues();
  rows.forEach(function(r) {
    var id = gdClean_(r[idCol-1],16);
    if (!/^\d{7}$/.test(id)) return;
    out[id] = { displayName: [r[rankCol-1],r[firstCol-1],r[lastCol-1]].filter(Boolean).join(' ').replace(/\s+/g,' ').trim(), cohortLabel: gdClean_(r[cohortCol-1],80).replace(/^รุ่น\s*/i,'').trim() || '-' };
  });
  return out;
}

function gdFindAuditSuccess_(sheet, requestId, action) {
  if (!sheet || sheet.getLastRow() < 2) return null;
  var matches = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).createTextFinder(requestId).matchEntireCell(true).findAll();
  for (var i = matches.length - 1; i >= 0; i--) {
    var row = matches[i].getRow();
    var values = sheet.getRange(row, 1, 1, 9).getDisplayValues()[0];
    if (values[3] === action && values[6] === 'success') return { studentId: values[4], deedId: values[5] };
  }
  return null;
}

function gdAppendAudit_(sheet, requestId, actor, action, studentId, deedId, outcome, detail) {
  if (!sheet) throw new Error('AUDIT_SHEET_MISSING');
  sheet.appendRow(['audit_' + Utilities.getUuid(), requestId, gdClean_(actor,128), action, gdClean_(studentId,16), gdClean_(deedId,120), outcome, gdClean_(detail,120), gdIso_(new Date())]);
}

function gdActiveActivationMap_(sheet) {
  var out = {};
  if (!sheet || sheet.getLastRow() < 2) return out;
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getDisplayValues();
  rows.forEach(function(r) {
    var id = gdClean_(r[0],16);
    var status = gdClean_(r[5],20).toUpperCase();
    var exp = new Date(r[2]);
    if (/^\d{7}$/.test(id) && status === 'ACTIVE' && !isNaN(exp.getTime()) && exp.getTime() > Date.now()) out[id] = true;
  });
  return out;
}

function gdFindActiveActivationRow_(sheet, studentId) {
  if (!sheet || sheet.getLastRow() < 2) return 0;
  var matches = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).createTextFinder(studentId).matchEntireCell(true).findAll();
  for (var i = matches.length - 1; i >= 0; i--) {
    var row = matches[i].getRow();
    var status = gdClean_(sheet.getRange(row, 6).getDisplayValue(),20).toUpperCase();
    if (status === 'ACTIVE') return row;
  }
  return 0;
}

function gdLevelForHours_(hours) {
  var h = Number(hours || 0);
  if (h >= 350) return { level: 10, label: 'Lv.10 Celestial Supreme Commander (จอมจักรพรรดิจิตอาสาสวรรค์)' };
  if (h >= 300) return { level: 9, label: 'Lv.9 Platinum Sovereign Angel Hero (อัครเทวทูตปีกทองคำพิเศษ)' };
  if (h >= 250) return { level: 8, label: 'Lv.8 Ultimate Sovereign Angel Hero (สุดยอดวีรบุรุษปีกทองคำระดับสูงสุด)' };
  if (h >= 180) return { level: 7, label: 'Lv.7 Royal Air Force Nurse Commander (ผู้บัญชาการจิตอาสา วพอ.)' };
  if (h >= 120) return { level: 6, label: 'Lv.6 Guardian Angel of Health (เทวทูตผู้พิทักษ์สุขภาพชุมชน)' };
  if (h >= 80) return { level: 5, label: 'Lv.5 Gold Flight Rescue Hero (ฮีโร่กู้ชีพเวชศาสตร์การบิน)' };
  if (h >= 50) return { level: 4, label: 'Lv.4 Silver Care Hero (วีรบุรุษพยาบาลปีกเงิน)' };
  if (h >= 25) return { level: 3, label: 'Lv.3 Bronze Service Cadet (พยาบาลจิตอาสาปีกทองแดง)' };
  if (h >= 10) return { level: 2, label: 'Lv.2 Cadet Apprentice (นักเรียนฝึกงานพยาบาล)' };
  return { level: 1, label: 'Lv.1 Cadet Novice (นักเรียนพยาบาลฝึกหัด)' };
}

function gdCategoryHeaderTail_(id) {
  return ({1:'บริจาคโลหิต',2:'โครงการภายนอก',3:'ช่วยงานภายใน',4:'อบรม',5:'ช่วยชุมชน',6:'ศาสนสถาน',7:'งานฟรีทั่วไป',8:'จงรักภักดี',9:'บทบาทพิเศษ'})[Number(id)] || '';
}

function gdNormalizeStatus_(value) {
  var s = gdClean_(value,30).toLowerCase();
  if (s === 'approved' || s === 'อนุมัติ' || s === 'อนุมัติแล้ว') return 'approved';
  if (s === 'rejected' || s === 'ไม่อนุมัติ') return 'rejected';
  if (s === 'approving') return 'approving';
  return 'pending';
}

function gdHeaderMap_(sheet) {
  if (!sheet || sheet.getLastColumn() < 1) throw new Error('SHEET_SCHEMA_INVALID');
  var headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0].map(String);
  var map = {};
  headers.forEach(function(h,i) { map[h] = i + 1; });
  return map;
}

function gdRequiredColumn_(map, header) {
  var col = map[header];
  if (!col) throw new Error('SHEET_SCHEMA_INVALID');
  return col;
}

function gdSheetNames_(year) {
  return {
    summary: GD_CF.SUMMARY_PREFIX + year,
    deeds: GD_CF.DEEDS_PREFIX + year,
    evidence: GD_CF.SUPPORT.evidence + year,
    reviews: GD_CF.SUPPORT.reviews + year,
    audit: GD_CF.SUPPORT.audit + year,
    activation: GD_CF.SUPPORT.activation + year,
    notifications: GD_CF.SUPPORT.notifications + year
  };
}

function gdConfig_() {
  var p = PropertiesService.getScriptProperties();
  var year = gdClean_(p.getProperty('GOODDEED_ACADEMIC_YEAR') || '2569',8);
  var secret = String(p.getProperty('CLOUDFLARE_CARD_ADAPTER_SECRET') || '');
  return {
    spreadsheetId: gdClean_(p.getProperty('GOODDEED_2569_SPREADSHEET_ID'),180),
    academicYear: /^25\d{2}$/.test(year) ? year : '',
    secret: secret,
    secretReady: secret.length >= 32,
    evidenceFolderId: gdClean_(p.getProperty('GOODDEED_EVIDENCE_FOLDER_ID'),180),
    activationExportFolderId: gdClean_(p.getProperty('GOODDEED_ACTIVATION_EXPORT_FOLDER_ID'),180),
    lineToken: String(p.getProperty('LINE_MESSAGING_CHANNEL_ACCESS_TOKEN') || ''),
    writeEnabled: String(p.getProperty('GOODDEED_WRITE_ENABLED') || '').toLowerCase() === 'true',
    reviewEnabled: String(p.getProperty('GOODDEED_REVIEW_ENABLED') || '').toLowerCase() === 'true',
    activationEnabled: String(p.getProperty('GOODDEED_ACTIVATION_ENABLED') || '').toLowerCase() === 'true',
    linePushEnabled: String(p.getProperty('GOODDEED_LINE_PUSH_ENABLED') || '').toLowerCase() === 'true',
    evidenceRequired: String(p.getProperty('GOODDEED_EVIDENCE_REQUIRED') || 'true').toLowerCase() !== 'false'
  };
}

function gdRequireStudentRef_(value) {
  var id = gdClean_(value,16);
  if (!/^\d{7}$/.test(id)) throw new Error('STUDENT_REF_INVALID');
  return id;
}

function gdParseJson_(value) {
  try {
    var x = JSON.parse(String(value || '{}'));
    if (!x || typeof x !== 'object' || Array.isArray(x)) throw new Error('invalid');
    return x;
  } catch (_) { throw new Error('ADAPTER_BODY_INVALID'); }
}

function gdClean_(value, max) {
  return String(value == null ? '' : value).trim().replace(/[\u0000-\u001f\u007f]/g,' ').slice(0, Number(max) || 500);
}

function gdIso_(date) {
  return Utilities.formatDate(date || new Date(), 'Asia/Bangkok', "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function gdHmacSha256Hex_(value, secret) {
  var bytes = Utilities.computeHmacSha256Signature(String(value), String(secret), Utilities.Charset.UTF_8);
  return gdBytesToHex_(bytes);
}

function gdSha256Hex_(value) {
  return gdBytesToHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8));
}

function gdBytesToHex_(bytes) {
  return bytes.map(function(byte) { var n = byte < 0 ? byte + 256 : byte; return ('0' + n.toString(16)).slice(-2); }).join('');
}

function gdConstantTimeEqual_(a,b) {
  a = String(a || ''); b = String(b || '');
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i=0;i<a.length;i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function gdRandomCode_(length) {
  var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Utilities.getUuid() + Date.now(), Utilities.Charset.UTF_8);
  var out = '';
  for (var i=0;i<length;i++) { var n = bytes[i % bytes.length]; if (n < 0) n += 256; out += alphabet.charAt(n % alphabet.length); }
  return out;
}

function gdCsvCell_(value) {
  var s = String(value == null ? '' : value).replace(/"/g,'""');
  return '"' + s + '"';
}

function gdSafeError_(error) {
  var code = error && error.message ? String(error.message) : 'ADAPTER_ERROR';
  var allowed = [
    'ADAPTER_DISABLED','ADAPTER_ACTION_NOT_ALLOWED','ADAPTER_ACTION_INVALID','ADAPTER_SUBJECT_INVALID','ADAPTER_REQUEST_ID_INVALID','ADAPTER_NONCE_INVALID','ADAPTER_SIGNATURE_INVALID','ADAPTER_TIMESTAMP_INVALID','ADAPTER_REPLAY_DETECTED','ADAPTER_BODY_TOO_LARGE','ADAPTER_BODY_INVALID','ADAPTER_SOURCE_NOT_READY','SUPPORT_SHEET_SCHEMA_MISMATCH','SHEET_SCHEMA_INVALID','STUDENT_REF_INVALID','STUDENT_NOT_FOUND','WRITE_DISABLED','REVIEW_DISABLED','ACTIVATION_DISABLED','ADAPTER_BUSY','CATEGORY_INVALID','HOURS_INVALID','ACTIVITY_DATE_INVALID','DESCRIPTION_INVALID','EVIDENCE_REQUIRED','EVIDENCE_FOLDER_NOT_CONFIGURED','EVIDENCE_INVALID','EVIDENCE_TYPE_INVALID','EVIDENCE_TOO_LARGE','EVIDENCE_NOT_FOUND','EVIDENCE_FORBIDDEN','DEED_ID_INVALID','DEED_NOT_FOUND','DEED_STATUS_CONFLICT','DEED_DATA_INVALID','DECISION_INVALID','SUMMARY_CATEGORY_INVALID','APPROVAL_RECOVERY_REVIEW_MISSING','APPROVAL_RECOVERY_CONFLICT','AUDIT_SHEET_MISSING','ACTIVATION_CODE_INVALID','LINE_USER_ID_INVALID','ACTOR_IDENTITY_INVALID','STUDENT_ALREADY_LINKED','ACTIVATION_NOT_FOUND','ACTIVATION_EXPIRED'
  ];
  return allowed.indexOf(code) >= 0 ? code : 'ADAPTER_ERROR';
}

function gdJson_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
