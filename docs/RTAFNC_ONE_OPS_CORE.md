# RTAFNC ONE — Operations Core Pilot

สถานะ: PILOT / non-destructive

เป้าหมายของ Operations Core คือให้ทุกโมดูลของ RTAFNC ONE ใช้ Identity, Role Assignment, Event Routing, Approval และ Notification ชุดเดียวกัน โดยยังไม่แก้ Production Good Deed V2 จนกว่าจะผ่านการทดสอบ

## หลักการ

- Telegram = Primary Operations สำหรับงานทั่วไป การอนุมัติ การติดตาม และเจ้าหน้าที่
- LINE = Critical/Urgent โดยเฉพาะสุขภาพ สุขภาพจิต และเหตุสำคัญ
- ONE Inbox = ช่องทางฟรีสำหรับ Routine Event
- Google Drive/Sheets = Master/Repository เดิม
- ไม่มี Secret ใน GitHub
- Health/Mental Health notification ต้อง Redact รายละเอียดอ่อนไหว
- การอนุมัติข้อมูลอ่อนไหวต้องเปิด RTAFNC ONE และตรวจ Role ก่อน

## Pilot Files

- `backend/RTAFNCOneOpsPilot.gs` — Apps Script Operations Core
- `rtafnc-one-pilot/ops.html` — UI/Flow simulator ไม่มีข้อมูลจริงและไม่ส่งจริง
- `backend/CodeV2.gs` — Production Good Deed V2 เดิม (ยังไม่แก้)

## Tables

### OneIdentityBindings
เชื่อม `RTAFNC_ID` กับ external identity เช่น Telegram chat_id

### OneBindingCodes
one-time binding code อายุ 10 นาที

### OneRoleAssignments
Role/Scope แบบ dynamic รองรับ ADMIN, ADVISOR, APPROVER, HEALTH_AUTHORIZED และอื่น ๆ โดยไม่ hard-code จำนวน Admin

### OneEventOutbox
Event กลางจาก Good Deed, Health, MindCare, Document, Announcement

### OneApprovalTasks
คิวอนุมัติกลางและ assignee ที่ระบบ resolve จาก Assignment

### OneNotificationLog
Audit การส่ง Telegram/LINE โดยไม่เก็บ Token

## Telegram Binding Flow

1. ผู้ใช้ Login RTAFNC ONE
2. Backend สร้าง `RT-XXXXXXX` อายุ 10 นาที
3. ผู้ใช้เปิด Telegram Bot แบบ Private Chat
4. ส่ง `/start RT-XXXXXXX`
5. Webhook ตรวจ code + expiry + chat type
6. บันทึก `RTAFNC_ID ↔ chat_id`
7. code เปลี่ยนเป็น USED และห้ามใช้ซ้ำ

## Event Routing Baseline

| Event | Severity | ONE Inbox | Telegram | LINE |
|---|---|---:|---:|---:|
| Good Deed Approval | ROUTINE | ✓ | ✓ | - |
| Announcement | ROUTINE | ✓ | - | - |
| Important Admin Event | IMPORTANT | ✓ | ✓ | - |
| Health/Hospital | URGENT | ✓ | ✓ | ✓ |
| Mental Health | URGENT/CRITICAL | ✓ | ✓ | ✓ |
| Non-health Critical | CRITICAL | ✓ | ✓ | ✓ |

## Sensitive Data Rule

Telegram/LINE notification for health must contain only:

- severity
- case/reference ID
- responsible role
- secure link

ห้ามใส่ diagnosis, PHQ/ST-5/2Q/9Q/8Q score, medication, detailed symptoms หรือข้อมูลสุขภาพอื่นใน notification payload ที่แสดงบน lock screen

## Script Properties

Pilot DB แนะนำให้ใช้คนละฐานกับ Production:

- `OPS_SPREADSHEET_ID`
- `OPS_PILOT_ENABLED=false` (default)
- `TELEGRAM_BOT_TOKEN` (เมื่อพร้อมทดสอบจริง)
- `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN` (เมื่อยืนยัน Provider/Channel แล้ว)

ห้ามเปิด `OPS_PILOT_ENABLED=true` จนกว่าจะตรวจ Token, Owner/Admin, Provider และ test recipient เรียบร้อย

## Integration กับ CodeV2 ใน Day 4

หลัง test ผ่านค่อยเพิ่ม action ใน `dispatch_()` เช่น:

- `createTelegramBindingCode`
- `createRoleAssignment`
- `emitEvent`
- `listApprovalTasks`
- `decideApprovalTask`

ทุก action ต้องผ่าน `requireSession_()` และตรวจ Role ก่อนเรียก Ops Core

## Production Gate

ก่อน merge:

1. Backup/branch Production
2. Rotate legacy exposed LINE token
3. Verify LINE Login/LIFF/Messaging API อยู่ Provider ที่ถูกต้อง
4. Verify Telegram Bot ownership
5. Test with demo RTAFNC IDs only
6. Test Good Deed approval end-to-end
7. Test Health urgent with redacted message
8. Enable real student data only after approval
