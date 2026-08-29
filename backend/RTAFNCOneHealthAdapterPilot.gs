/**
 * RTAFNC ONE — Health & MindCare Adapter PILOT
 * Depends on: RTAFNCOneOpsPilot.gs
 *
 * IMPORTANT
 * - Reuses existing MindCare risk level. It does NOT diagnose or change clinical thresholds.
 * - Notification payloads are deliberately redacted.
 * - HEALTH_SPREADSHEET_ID is read-only candidate until HEALTH_MASTER_DB is confirmed.
 * - No doPost() and no Production write path in this file.
 */

const ONE_HEALTH = Object.freeze({
  VERSION: '0.1.0-pilot',
  RISK_TO_SEVERITY: { GREEN: 'ROUTINE', YELLOW: 'IMPORTANT', ORANGE: 'URGENT', RED: 'CRITICAL' },
  URGENCY_TO_SEVERITY: { GENERAL: 'ROUTINE', ROUTINE: 'ROUTINE', IMPORTANT: 'IMPORTANT', URGENT: 'URGENT', EMERGENCY: 'CRITICAL', CRITICAL: 'CRITICAL' },
  PRIVACY_SHEET: 'OnePrivacyReceipts',
  PRIVACY_HEADERS: ['receiptId','rtafncId','policyType','policyVersion','action','purposeId','lawfulBasisCode','status','recordedAt','source','supersedesId']
});

/** Convert an existing MindCare alert into RTAFNC ONE Event without copying scores/diagnosis. */
function adaptMindCareAlertPilot(alert) {
  const level = String(alert && alert.riskLevel || alert && alert.level || '').toUpperCase();
  if (!ONE_HEALTH.RISK_TO_SEVERITY[level]) throw new Error('MindCare riskLevel ไม่ถูกต้อง');
  const studentId = oneOpsClean_(alert.studentId, 40);
  if (!studentId) throw new Error('MindCare alert ต้องมี studentId');
  const caseId = oneOpsClean_(alert.alertId || alert.caseId || ('MC-' + Utilities.getUuid()), 80);
  const event = {
    eventType: 'MENTAL_HEALTH_ALERT',
    severity: ONE_HEALTH.RISK_TO_SEVERITY[level],
    subjectRtafncId: oneOpsClean_(alert.subjectRtafncId, 80),
    studentId: studentId,
    caseId: caseId,
    payload: {
      sourceSystem: 'MindCare',
      riskLevel: level,
      sourceAlertId: oneOpsClean_(alert.alertId, 80),
      sourceAssessmentId: oneOpsClean_(alert.assessmentId, 80),
      dueAt: oneOpsClean_(alert.dueAt, 80),
      requiresHumanReview: level !== 'GREEN'
    }
  };
  return { event: event, careTeam: resolveCareTeamPilot(studentId), safeNotification: buildSafeHealthNotificationPilot(event) };
}

/** Emits to OneEventOutbox. Does not send externally by itself. */
function emitMindCareAlertPilot(alert) {
  const adapted = adaptMindCareAlertPilot(alert);
  const emitted = emitOneEventPilot(adapted.event);
  return { ok: true, event: emitted.event, route: emitted.routePreview, careTeam: adapted.careTeam, safeNotification: adapted.safeNotification };
}

/** Hospital request bridge from Health 69 / RTAFNC ONE Health. */
function adaptHospitalRequestPilot(request) {
  const urgency = String(request && request.urgency || request && request.urgencyLevel || 'ROUTINE').toUpperCase();
  const severity = ONE_HEALTH.URGENCY_TO_SEVERITY[urgency] || 'IMPORTANT';
  const studentId = oneOpsClean_(request.studentId || request.recipientId, 40);
  if (!studentId) throw new Error('Hospital request ต้องมี studentId/recipientId');
  const caseId = oneOpsClean_(request.caseId || request.requestId || ('HOSP-' + Utilities.getUuid()), 80);
  return {
    event: {
      eventType: 'HEALTH_HOSPITAL_REQUEST', severity: severity,
      subjectRtafncId: oneOpsClean_(request.subjectRtafncId, 80), studentId: studentId, caseId: caseId,
      payload: {
        sourceSystem: 'Health69',
        requestId: oneOpsClean_(request.requestId, 80),
        urgency: urgency,
        destinationRequired: Boolean(request.destinationHospital),
        requiresApproval: true,
        requiresHumanReview: true
      }
    },
    careTeam: resolveCareTeamPilot(studentId)
  };
}

function emitHospitalRequestPilot(request) {
  const adapted = adaptHospitalRequestPilot(request);
  const emitted = emitOneEventPilot(adapted.event);
  let approval = null;
  try {
    approval = createApprovalTaskPilot(emitted.event.eventId, 'HOSPITAL_REQUEST', emitted.event.studentId, emitted.event.subjectRtafncId);
  } catch (e) {
    approval = { ok: false, pendingSetup: true, error: String(e.message || e) };
  }
  return { ok: true, event: emitted.event, route: emitted.routePreview, careTeam: adapted.careTeam, approval: approval, safeNotification: buildSafeHealthNotificationPilot(adapted.event) };
}

/** Advisor + authorized health staff. Admin alone does NOT imply clinical-data access. */
function resolveCareTeamPilot(studentId) {
  setupRtafncOneOpsPilot();
  const advisors = resolveAdvisorsPilot(studentId).map(function(a) {
    return { rtafncId: a.subjectRtafncId, role: 'ADVISOR', scope: a.scopeValue || a.studentId || '' };
  });
  const healthStaff = oneOpsAll_(ONE_OPS.SHEETS.ASSIGNMENTS).filter(function(r) {
    return String(r.status) === 'ACTIVE' && ['HEALTH_AUTHORIZED','SUPER_ADMIN'].indexOf(String(r.role)) >= 0;
  }).map(function(r) { return { rtafncId: r.subjectRtafncId, role: r.role, scope: r.scopeValue || '' }; });
  const seen = {};
  return advisors.concat(healthStaff).filter(function(x) { const k = x.rtafncId + '|' + x.role; if (seen[k]) return false; seen[k] = true; return true; });
}

/** Safe object for lock-screen notifications. No symptom, diagnosis, scores, meds, treatment. */
function buildSafeHealthNotificationPilot(event) {
  const severity = String(event.severity || 'IMPORTANT').toUpperCase();
  return {
    eventType: String(event.eventType || 'HEALTH_ALERT'),
    severity: severity,
    caseId: oneOpsClean_(event.caseId || '', 80),
    message: 'มีรายการสุขภาพที่ต้องตรวจสอบ รายละเอียดจะแสดงหลังยืนยันตัวตนและตรวจสิทธิ์ใน RTAFNC ONE เท่านั้น',
    openUrl: 'https://anuchit1tube168-cmd.github.io/gooddeeds69/rtafnc-one-pilot/health.html'
  };
}

/**
 * Technical privacy gate only. Legal basis/purpose values must be approved/configured by the college/DPO.
 * It intentionally does NOT treat every processing activity as consent.
 */
function privacyGateHealthPilot(context) {
  const actor = oneOpsClean_(context && context.actorRtafncId, 80);
  const subject = oneOpsClean_(context && context.subjectRtafncId, 80);
  const studentId = oneOpsClean_(context && context.studentId, 40);
  const roles = (context && context.roles || []).map(function(x) { return String(x).toUpperCase(); });
  const purpose = oneOpsClean_(context && context.purposeId, 80).toUpperCase();
  const action = oneOpsClean_(context && context.action || 'VIEW_HEALTH_DETAIL', 80).toUpperCase();
  if (!actor) return { allowed: false, reason: 'IDENTITY_REQUIRED' };
  if (!purpose) return { allowed: false, reason: 'PURPOSE_REQUIRED' };
  if (actor === subject && action.indexOf('ADMIN_') !== 0) return { allowed: true, reason: 'SELF_ACCESS', purposeId: purpose };
  if (roles.indexOf('HEALTH_AUTHORIZED') >= 0) return { allowed: true, reason: 'HEALTH_ROLE', purposeId: purpose };
  if (roles.indexOf('SUPER_ADMIN') >= 0 && action === 'SYSTEM_RECOVERY') return { allowed: true, reason: 'RECOVERY_ONLY', purposeId: purpose };
  if (roles.indexOf('ADVISOR') >= 0 && studentId && purpose === 'CARE_FOLLOWUP') {
    const assigned = resolveAdvisorsPilot(studentId).some(function(a) { return String(a.subjectRtafncId) === actor; });
    return assigned ? { allowed: true, reason: 'ASSIGNED_ADVISOR', purposeId: purpose } : { allowed: false, reason: 'NOT_ASSIGNED_ADVISOR' };
  }
  return { allowed: false, reason: 'HEALTH_PERMISSION_REQUIRED' };
}

/** Privacy Notice / Terms / Consent receipt ledger. Status can be ACKNOWLEDGED, GRANTED, REJECTED, WITHDRAWN. */
function recordPrivacyReceiptPilot(input) {
  const ss = oneOpsDb_();
  const sh = oneOpsEnsureSheet_(ss, ONE_HEALTH.PRIVACY_SHEET, ONE_HEALTH.PRIVACY_HEADERS);
  const status = String(input.status || '').toUpperCase();
  if (['ACKNOWLEDGED','GRANTED','REJECTED','WITHDRAWN'].indexOf(status) < 0) throw new Error('privacy receipt status ไม่ถูกต้อง');
  const row = {
    receiptId: 'PRV-' + Utilities.getUuid(), rtafncId: oneOpsClean_(input.rtafncId, 80),
    policyType: oneOpsClean_(input.policyType, 60).toUpperCase(), policyVersion: oneOpsClean_(input.policyVersion, 40),
    action: oneOpsClean_(input.action, 80).toUpperCase(), purposeId: oneOpsClean_(input.purposeId, 80).toUpperCase(),
    lawfulBasisCode: oneOpsClean_(input.lawfulBasisCode, 80).toUpperCase(), status: status,
    recordedAt: new Date().toISOString(), source: oneOpsClean_(input.source || 'RTAFNC_ONE', 80), supersedesId: oneOpsClean_(input.supersedesId, 80)
  };
  if (!row.rtafncId || !row.policyType || !row.policyVersion) throw new Error('ข้อมูล Privacy Receipt ไม่ครบ');
  sh.appendRow(ONE_HEALTH.PRIVACY_HEADERS.map(function(h) { return row[h] || ''; }));
  return { ok: true, receipt: row };
}

/** Read-only probe: confirms candidate health DB has required sheets. No data returned. */
function inspectHealthMasterCandidatePilot() {
  const id = PropertiesService.getScriptProperties().getProperty('HEALTH_SPREADSHEET_ID');
  if (!id) throw new Error('ยังไม่ตั้ง HEALTH_SPREADSHEET_ID — ห้ามเดา Master DB');
  const ss = SpreadsheetApp.openById(id);
  const required = ['ServiceRecipients','Visits','Vitals','Assessments','Treatments','Dispensing','Referrals','FollowUps','Attachments','AuditLogs'];
  const names = ss.getSheets().map(function(s) { return s.getName(); });
  const missing = required.filter(function(n) { return names.indexOf(n) < 0; });
  return { ok: missing.length === 0, title: ss.getName(), spreadsheetId: id, requiredSheets: required, missingSheets: missing, writeEnabled: false };
}

/** Pure smoke test. Does not access real health rows and does not send externally. */
function testHealthAdapterPilot() {
  const mind = adaptMindCareAlertPilot({ studentId: '6900000', alertId: 'AL-DEMO-001', assessmentId: 'A-DEMO-001', riskLevel: 'ORANGE', dueAt: new Date(Date.now()+3600000).toISOString() });
  const hosp = adaptHospitalRequestPilot({ studentId: '6900000', requestId: 'REQ-DEMO-001', urgency: 'URGENT' });
  const redactedKeys = Object.keys(mind.safeNotification).sort();
  const forbidden = ['diagnosis','symptoms','scores','medication','reason'];
  const leak = forbidden.some(function(k) { return redactedKeys.indexOf(k) >= 0; });
  return {
    ok: !leak,
    mindCareSeverity: mind.event.severity,
    hospitalSeverity: hosp.event.severity,
    healthRoute: routeOneEventPilot(mind.event),
    redactionPassed: !leak,
    externalSendEnabled: oneOpsSendingEnabled_()
  };
}
