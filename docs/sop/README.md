# RTAFNC ONE — SOP Registry

Status: DEVELOPMENT / SANITIZED / CODE-ONLY

เอกสารชุดนี้เป็นมาตรฐานการปฏิบัติงานของ RTAFNC ONE สำหรับปีการศึกษาแบบหมุนรอบ 1 สิงหาคม โดย GitHub เก็บเฉพาะโค้ด โครงสร้าง ขั้นตอน SOP และตัวอย่าง placeholder เท่านั้น ข้อมูลบุคคลจริง รหัสนักเรียน การจับคู่อาจารย์ ข้อมูลสุขภาพ/การให้คำปรึกษา LINE/Telegram identifiers และเอกสารหลักฐานจริงต้องอยู่ใน Private Google Drive/Backend ที่ได้รับอนุญาต

## Global activation sequence

1. Verify Student Master using exact seven-digit student business key.
2. Reconcile Good Deed history and approved totals.
3. Select/prepare clean Health Data Master; never import demo/test rows automatically.
4. Verify Advisor Assignment from official source and bind real staff accounts.
5. Enable remaining modules one-by-one through their own readiness gate.

Building may happen in parallel. Production write activation must be sequential and fail-closed.

## Mandatory controls for every SOP

- Source of Truth must be named by logical source key, never hard-coded private Drive ID in public code.
- No guessed identity, advisor relationship, permission, stock balance, health status, score, entitlement or approval.
- Student business key format is exactly seven digits but examples must use `<student_id_7_digits>`.
- All writes require authenticated actor, role/scope authorization, server-side validation, correlation/idempotency key where appropriate, audit event, academic-year attribution and rollback/reversal strategy.
- Sensitive domains (health, counselling/wellbeing, scholarship/financial support) use least privilege and separate scopes.
- Previous academic years remain readable as history; transactional rows are never blindly rolled forward.
- At 1 August: snapshot → compute new academic year → validate roster/catalog/rules → conflict report → authorized activation. Never perform blind year-level increment.
- Clean means classify and segregate, not delete.
- Duplicate/unverified data goes to quarantine/review; the original source remains recoverable.
- Notifications contain minimum necessary information; sensitive details are opened inside authenticated RTAFNC ONE, not copied into Telegram/LINE messages.
- AI may search, summarize, draft, classify and suggest; AI never grants access, diagnoses, performs emergency disposition, final discipline, final scholarship approval or bypasses a required human approval.

## SOP files

CORE-IDENTITY, GOOD-DEED, APPAREL, BORROWING, GOV-SUPPLIES, ASSET-PROCUREMENT, HEALTH, MINDCARE, ADVISOR, TEACHING-SUPERVISION, SCHOLARSHIP, OFFICIAL-MEMO, EVALUATION, PTS-RENEWAL, ACTIVITY, WELFARE, DORM and LAUNDRY.

Every module has a paired `skills/<module>/SKILL.md` contract for AI/agent/developer execution.
