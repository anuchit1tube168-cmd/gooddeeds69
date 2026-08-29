# RTAFNC ONE — Health & MindCare Adapter Pilot

สถานะ: PILOT / read-only toward existing health database

## Source systems found in Google Drive

### เวชระเบียน 69
Existing schema already covers:

- ServiceRecipients
- Visits
- Vitals
- Assessments
- Treatments
- Medicines
- Dispensing
- InventoryTransactions
- ContactNotifications
- Referrals
- FollowUps
- Attachments
- AuditLogs

RTAFNC ONE จะไม่สร้างข้อมูลชุดใหม่ซ้ำโดยไม่จำเป็น แต่จะใช้ Adapter + RTAFNC_ID เพื่อเชื่อมกับฐานเดิม

### MindCare
Existing backend already evaluates ST-5 / 2Q / 9Q / 8Q and creates Alerts with levels GREEN/YELLOW/ORANGE/RED and SLA. RTAFNC ONE will reuse the existing resulting risk level; the adapter does not diagnose and does not redefine clinical thresholds.

## Risk → Event Severity

| MindCare | RTAFNC Event |
|---|---|
| GREEN | ROUTINE |
| YELLOW | IMPORTANT |
| ORANGE | URGENT |
| RED | CRITICAL |

Routing is then handled by `RTAFNCOneOpsPilot.gs`.

## Health notification rule

Allowed on Telegram/LINE lock-screen notification:

- Event type
- Severity
- Case ID
- Secure RTAFNC ONE URL
- Generic instruction to review

Forbidden:

- Diagnosis
- Symptoms in detail
- ST-5/2Q/9Q/8Q scores
- Medication
- Treatment details
- Mental-health narrative

## Advisor routing

`studentId` → `OneRoleAssignments` → active ADVISOR assignment → Telegram/LINE binding.

If no advisor assignment is found, the system should escalate to HEALTH_AUTHORIZED/SUPER_ADMIN according to operational policy rather than broadcast the sensitive case to every admin.

## Health roles

- STUDENT: self health record according to policy
- ADVISOR: assigned student + CARE_FOLLOWUP purpose only
- HEALTH_AUTHORIZED: authorized health detail access
- ADMIN: workflow administration only; ADMIN alone does not automatically grant clinical detail access
- SUPER_ADMIN: technical recovery; clinical access is not assumed except defined emergency/recovery policy

## Privacy Gate

`privacyGateHealthPilot()` is a technical authorization gate, not legal advice. It requires identity + purpose and checks role/assignment. Lawful basis codes and purposes must be approved/configured by the college/DPO before Production.

`recordPrivacyReceiptPilot()` creates versioned receipts for Privacy Notice acknowledgment / Terms / Consent decisions without overwriting history.

## Health Master DB Gate

Because multiple Drive files named `ฐานข้อมูลเวชระเบียน` exist, the adapter requires an explicit Script Property:

`HEALTH_SPREADSHEET_ID`

`inspectHealthMasterCandidatePilot()` only checks sheet names. It performs no write.

No Production write is allowed until HEALTH_MASTER_DB is confirmed and backed up.

## Pilot tests

`testHealthAdapterPilot()` uses demo IDs only and verifies:

- ORANGE maps to URGENT
- Hospital urgent request maps to URGENT
- Health routing includes Telegram + LINE where required
- notification redaction object contains no known sensitive detail keys
- external send remains disabled unless explicitly enabled
