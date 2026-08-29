# RTAFNC ONE — Health Document & Telegram Flow

## Goal
ใช้แม่แบบเอกสารสุขภาพจากงานเดิมของ วพอ. เป็น HTML Template กลาง แล้วสร้าง PNG/PDF จากข้อมูลในระบบเวชระเบียนก่อนส่งแจ้งเตือนผ่าน Telegram โดยไม่เปิดเผยข้อมูลสุขภาพเกินความจำเป็น

## Template Types
1. `HOSPITAL_PERMISSION` — การขออนุญาตไปตรวจ/รักษา
2. `MEDICAL_TREATMENT_RECORD` — บันทึกการตรวจ/รักษา
3. `DOCTOR_APPOINTMENT` — บันทึกใบนัดแพทย์และภาพหลักฐาน

Pilot UI: `rtafnc-one-pilot/health-history.html`

## Data Sources
- RTAFNC Identity / student master
- ServiceRecipients
- Visits
- Vitals
- Assessments
- Treatments
- Dispensing
- Referrals
- FollowUps
- Attachments
- HospitalRequests (new)
- HealthAppointments (new)
- InfirmaryStays (new)
- Immunizations (new)
- AuditLogs

## Canonical Case Model
ทุกเอกสารของเหตุการณ์เดียวกันต้องอ้าง `caseId` เดียวกัน เช่น `H69-2026-000129`.

```text
Health Case
  ├─ HospitalRequest
  ├─ Approval
  ├─ Visit
  ├─ Referral
  ├─ Treatment / Dispensing / Procedure
  ├─ Attachments
  ├─ Appointment
  └─ FollowUp / Close
```

## Telegram Routing
### Routine / approval
Telegram เป็นช่องทางหลัก แต่ให้ส่งเฉพาะข้อมูลที่จำเป็นต่อการปฏิบัติงาน เช่น ชื่อย่อ/รหัส, ประเภทงาน, สถานะ, caseId และปุ่มเปิด RTAFNC ONE.

### Sensitive / urgent
ห้ามใส่ diagnosis, mental-health score, detailed medication, detailed complaint หรือเอกสารเต็มในข้อความที่อาจปรากฏบน lock screen. ส่งเป็น redacted alert พร้อม secure link.

### Document Preview
เมื่อจำเป็นต้องส่งภาพเอกสาร:
1. ตรวจ permission/purpose ก่อน
2. Render HTML → PNG/PDF ใน backend ที่เชื่อถือได้
3. เก็บไฟล์ใน Google Drive แบบ private
4. บันทึก `driveFileId`, `documentVersion`, `sha256`, `createdAt`, `createdBy`
5. Telegram ส่ง preview ที่เหมาะสม + secure link
6. บันทึก AuditLog

## Versioning
เอกสารที่อนุมัติแล้วห้าม overwrite. ใช้ version เพิ่มขึ้นและเก็บ hash ทุก version.

```text
DOC-H69-001 v1 SUBMITTED
DOC-H69-001 v2 CORRECTED
DOC-H69-001 v3 APPROVED
```

## Security Rules
- GitHub Pilot ต้องไม่มีข้อมูลผู้ป่วย/นักเรียนจริง
- ห้าม public Drive link สำหรับ health attachments
- Token/secret ทั้งหมดอยู่ Script Properties / secret store
- Admin ระบบไม่เท่ากับผู้มีสิทธิ์อ่านข้อความสุขภาพ
- ทุก read/write/export/share ของข้อมูลสุขภาพต้อง audit
- `HEALTH_MASTER_DB` ต้องยืนยันก่อนเปิด write

## Production Rendering Options (free-first)
### A. Apps Script HTML → PDF
เหมาะกับเอกสาร A4/PDF และเก็บ Drive โดยตรง. ลด dependency.

### B. Browser/Worker screenshot service
ใช้เมื่อจำเป็นต้องสร้าง PNG ที่เหมือน HTML มาก. ต้องประเมิน free quota และ security ก่อน production.

### C. Client-side export
ใช้เฉพาะ preview/non-sensitive. ไม่ใช้เป็นตัวสร้างเอกสาร authoritative เพราะควบคุม audit/hash ได้ยากกว่า.

## Approval Integration
Hospital permission document ใช้ OneRoleAssignments เพื่อหา `advisor`, `approver`, `parenting_admin` ตาม studentId/cohort/scope. ทุก approval บันทึก actor RTAFNC_ID + timestamp + action + document hash.

## Next Integration
- bind template fields to Health Adapter
- add document renderer
- add Telegram `sendPhoto`/`sendDocument` wrapper behind `OPS_PILOT_ENABLED`
- add secure deep link to case
- add appointment reminder event
