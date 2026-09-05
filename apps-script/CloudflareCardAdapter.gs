/**
 * RTAFNC Good Deed — Cloudflare card-self adapter
 * STAGING ONLY / READ ONLY / SEPARATE APPS SCRIPT WEB APP
 *
 * This resolver MUST be deployed as a separate Apps Script project. Do not add
 * it to, or replace, the existing Good Deed production Web App.
 *
 * Required Script Properties (server-side only):
 *   GOODDEED_2569_SPREADSHEET_ID    = private spreadsheet containing Main_2569 + Deeds_2569
 *   GOODDEED_ACADEMIC_YEAR          = 2569
 *   CLOUDFLARE_CARD_ADAPTER_SECRET  = random high-entropy secret >= 32 chars
 *
 * Cloudflare Core is the only intended caller. The browser never supplies a
 * student ID/member reference to this Web App and no write action exists here.
 */

var CF_GOODDEED = Object.freeze({
  VERSION: 'phase3b-readonly-2569-v2',
  ACTION: 'cloudflareCardSelf',
  SUMMARY_PREFIX: 'Main_',
  DEEDS_PREFIX: 'Deeds_',
  MAX_RESPONSE_BYTES: 16 * 1024,
  MAX_CLOCK_SKEW_SECONDS: 120,
  REPLAY_TTL_SECONDS: 300
});

function doGet() {
  var config = cfConfig_();
  return cfJson_({
    ok: true,
    service: 'RTAFNC Good Deed Cloudflare Card Adapter',
    mode: 'STAGING_READ_ONLY',
    version: CF_GOODDEED.VERSION,
    configured: Boolean(config.spreadsheetId && config.academicYear && config.secretReady),
    academicYear: config.academicYear || null
  });
}

function doPost(e) {
  try {
    var params = (e && e.parameter) || {};
    var action = cfClean_(params.action, 80);
    if (action !== CF_GOODDEED.ACTION) throw new Error('ADAPTER_ACTION_NOT_ALLOWED');

    var requestId = cfClean_(params.requestId, 96);
    var payload = cfParseJson_(params.payload);
    var card = cfCardSelf_(payload, requestId);
    console.info('[RTAFNC GoodDeed adapter] read success requestId=' + requestId);
    return cfJson_({ ok: true, data: { card: card } });
  } catch (error) {
    var code = cfSafeError_(error);
    console.warn('[RTAFNC GoodDeed adapter] denied code=' + code);
    return cfJson_({ ok: false, error: code });
  }
}

function cfCardSelf_(input, requestId) {
  var config = cfConfig_();
  if (!config.spreadsheetId || !config.academicYear || !config.secretReady) throw new Error('ADAPTER_DISABLED');

  var studentRef = cfClean_(input && input.memberId, 16);
  var timestamp = Number(input && input.timestamp || 0);
  var nonce = cfClean_(input && input.nonce, 128);
  var signature = cfClean_(input && input.signature, 128).toLowerCase();
  var rid = cfClean_(requestId, 96);

  // Student Master is the only identity source for Good Deed 2569.
  if (!/^\d{7}$/.test(studentRef)) throw new Error('ADAPTER_STUDENT_REF_INVALID');
  if (!/^[A-Za-z0-9._:-]{1,96}$/.test(rid)) throw new Error('ADAPTER_REQUEST_ID_INVALID');
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(nonce)) throw new Error('ADAPTER_NONCE_INVALID');
  if (!/^[0-9a-f]{64}$/.test(signature)) throw new Error('ADAPTER_SIGNATURE_INVALID');

  var now = Math.floor(Date.now() / 1000);
  if (!isFinite(timestamp) || Math.abs(now - timestamp) > CF_GOODDEED.MAX_CLOCK_SKEW_SECONDS) {
    throw new Error('ADAPTER_TIMESTAMP_INVALID');
  }

  var canonical = ['v1', studentRef, rid, String(timestamp), nonce].join('\n');
  var expected = cfHmacSha256Hex_(canonical, config.secret);
  if (!cfConstantTimeEqual_(expected, signature)) throw new Error('ADAPTER_SIGNATURE_INVALID');

  var replayKey = 'cf-card-nonce:' + cfSha256Hex_(nonce).slice(0, 40);
  var cache = CacheService.getScriptCache();
  if (cache.get(replayKey)) throw new Error('ADAPTER_REPLAY_DETECTED');
  cache.put(replayKey, '1', CF_GOODDEED.REPLAY_TTL_SECONDS);

  var ss = SpreadsheetApp.openById(config.spreadsheetId);
  var summarySheet = ss.getSheetByName(CF_GOODDEED.SUMMARY_PREFIX + config.academicYear);
  var deedsSheet = ss.getSheetByName(CF_GOODDEED.DEEDS_PREFIX + config.academicYear);
  if (!summarySheet || !deedsSheet) throw new Error('ADAPTER_SOURCE_NOT_READY');

  var summary = cfReadOfficialSummary_(summarySheet, studentRef);
  var counts = cfCountDeedStatuses_(deedsSheet, studentRef);

  return {
    displayName: summary.displayName,
    studentId: studentRef,
    cohortLabel: summary.cohortLabel,
    positionLabel: 'นักเรียนพยาบาล',
    totalHours: summary.totalHours,
    approvedCount: counts.approvedCount,
    pendingCount: counts.pendingCount,
    levelNumber: summary.levelNumber,
    levelLabel: summary.levelLabel
  };
}

function cfReadOfficialSummary_(sheet, studentRef) {
  var lastColumn = sheet.getLastColumn();
  var lastRow = sheet.getLastRow();
  if (lastColumn < 1 || lastRow < 2) throw new Error('ADAPTER_SUMMARY_EMPTY');

  var headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0].map(String);
  var columns = {
    studentId: headers.indexOf('รหัสประจำตัว') + 1,
    rank: headers.indexOf('ยศ') + 1,
    firstName: headers.indexOf('ชื่อ') + 1,
    lastName: headers.indexOf('นามสกุล') + 1,
    cohort: headers.indexOf('ชั้นปี (รุ่น)') + 1,
    totalHours: headers.indexOf('รวมชั่วโมงสะสม') + 1,
    level: headers.indexOf('ระดับความดี (Level)') + 1
  };
  Object.keys(columns).forEach(function(key) {
    if (!columns[key]) throw new Error('ADAPTER_SUMMARY_SCHEMA_INVALID');
  });

  var idRange = sheet.getRange(2, columns.studentId, lastRow - 1, 1);
  var match = idRange.createTextFinder(studentRef).matchEntireCell(true).findNext();
  if (!match) throw new Error('ADAPTER_STUDENT_NOT_FOUND');

  var row = match.getRow();
  var rank = cfClean_(sheet.getRange(row, columns.rank).getDisplayValue(), 30);
  var firstName = cfClean_(sheet.getRange(row, columns.firstName).getDisplayValue(), 60);
  var lastName = cfClean_(sheet.getRange(row, columns.lastName).getDisplayValue(), 60);
  var cohortRaw = cfClean_(sheet.getRange(row, columns.cohort).getDisplayValue(), 80);
  var totalRaw = sheet.getRange(row, columns.totalHours).getValue();
  var levelRaw = cfClean_(sheet.getRange(row, columns.level).getDisplayValue(), 80);

  var totalHours = Number(totalRaw);
  if (!isFinite(totalHours)) totalHours = Number(String(totalRaw || '').replace(/[^0-9.-]/g, ''));
  if (!isFinite(totalHours) || totalHours < 0 || totalHours > 10000) throw new Error('ADAPTER_TOTAL_HOURS_INVALID');

  var levelMatch = levelRaw.match(/Lv\.?\s*(10|[1-9])\b/i);
  var levelNumber = levelMatch ? Number(levelMatch[1]) : 1;
  if (!Number.isInteger(levelNumber) || levelNumber < 1 || levelNumber > 10) levelNumber = 1;

  var cohortLabel = cohortRaw.replace(/^รุ่น\s*/i, '').trim() || '-';
  var displayName = [rank, firstName, lastName].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  if (!displayName) throw new Error('ADAPTER_DISPLAY_NAME_MISSING');

  return {
    displayName: displayName.slice(0, 120),
    cohortLabel: cohortLabel.slice(0, 80),
    totalHours: Math.round(totalHours * 100) / 100,
    levelNumber: levelNumber,
    levelLabel: levelRaw || ('Lv.' + levelNumber)
  };
}

function cfCountDeedStatuses_(sheet, studentRef) {
  var lastColumn = sheet.getLastColumn();
  var lastRow = sheet.getLastRow();
  if (lastColumn < 1 || lastRow < 2) return { approvedCount: 0, pendingCount: 0 };

  var headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0].map(String);
  var idColumn = headers.indexOf('รหัสนักเรียน') + 1;
  var statusColumn = headers.indexOf('สถานะ') + 1;
  if (!idColumn || !statusColumn) throw new Error('ADAPTER_DEEDS_SCHEMA_INVALID');

  var idRange = sheet.getRange(2, idColumn, lastRow - 1, 1);
  var matches = idRange.createTextFinder(studentRef).matchEntireCell(true).findAll();
  var approvedCount = 0;
  var pendingCount = 0;

  matches.forEach(function(cell) {
    var status = cfClean_(sheet.getRange(cell.getRow(), statusColumn).getDisplayValue(), 40).toLowerCase();
    if (status === 'approved' || status === 'อนุมัติ' || status === 'อนุมัติแล้ว') approvedCount++;
    else if (!status || status === 'pending' || status === 'รอตรวจ' || status === 'รออนุมัติ') pendingCount++;
  });
  return { approvedCount: approvedCount, pendingCount: pendingCount };
}

function cfConfig_() {
  var props = PropertiesService.getScriptProperties();
  var academicYear = cfClean_(props.getProperty('GOODDEED_ACADEMIC_YEAR'), 8);
  var secret = String(props.getProperty('CLOUDFLARE_CARD_ADAPTER_SECRET') || '');
  return {
    spreadsheetId: cfClean_(props.getProperty('GOODDEED_2569_SPREADSHEET_ID'), 160),
    academicYear: /^25\d{2}$/.test(academicYear) ? academicYear : '',
    secret: secret,
    secretReady: secret.length >= 32
  };
}

function cfHmacSha256Hex_(value, secret) {
  var bytes = Utilities.computeHmacSha256Signature(String(value), String(secret), Utilities.Charset.UTF_8);
  return cfBytesToHex_(bytes);
}

function cfSha256Hex_(value) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8);
  return cfBytesToHex_(bytes);
}

function cfBytesToHex_(bytes) {
  return bytes.map(function(byte) {
    var n = byte < 0 ? byte + 256 : byte;
    var h = n.toString(16);
    return h.length === 1 ? '0' + h : h;
  }).join('');
}

function cfConstantTimeEqual_(a, b) {
  a = String(a || '');
  b = String(b || '');
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function cfParseJson_(value) {
  try {
    var parsed = JSON.parse(String(value || '{}'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid');
    return parsed;
  } catch (_) {
    throw new Error('ADAPTER_PAYLOAD_INVALID');
  }
}

function cfClean_(value, max) {
  return String(value == null ? '' : value)
    .trim()
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .slice(0, Number(max) || 500);
}

function cfSafeError_(error) {
  var code = error && error.message ? String(error.message) : 'ADAPTER_ERROR';
  var allowed = [
    'ADAPTER_ACTION_NOT_ALLOWED', 'ADAPTER_DISABLED', 'ADAPTER_PAYLOAD_INVALID',
    'ADAPTER_STUDENT_REF_INVALID', 'ADAPTER_REQUEST_ID_INVALID', 'ADAPTER_NONCE_INVALID',
    'ADAPTER_SIGNATURE_INVALID', 'ADAPTER_TIMESTAMP_INVALID', 'ADAPTER_REPLAY_DETECTED',
    'ADAPTER_SOURCE_NOT_READY', 'ADAPTER_SUMMARY_EMPTY', 'ADAPTER_SUMMARY_SCHEMA_INVALID',
    'ADAPTER_DEEDS_SCHEMA_INVALID', 'ADAPTER_STUDENT_NOT_FOUND',
    'ADAPTER_TOTAL_HOURS_INVALID', 'ADAPTER_DISPLAY_NAME_MISSING'
  ];
  return allowed.indexOf(code) >= 0 ? code : 'ADAPTER_ERROR';
}

function cfJson_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
