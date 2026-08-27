# RTAFNC Good Deed Online v2

สถาปัตยกรรมที่ใช้

- GitHub Pages: `online-v2/` มีเฉพาะ HTML, CSS, JavaScript และ URL ของ Web App
- Google Apps Script: Authentication, RBAC, validation, workflow, notification และ Audit Log
- Google Sheets: `MembersV2`, `GoodDeedRecordsV2`, `AuditTrailV2`, `ConfigurationV2`
- Google Drive: เก็บหลักฐานแบบ Private ในโฟลเดอร์ที่สร้างโดย `setupSystem()`

## ติดตั้งหลังบ้านครั้งแรก

1. สร้าง Apps Script แบบ Standalone หรือเปิดโปรเจกต์เดิม
2. แทนที่ `Code.gs` ด้วย `backend/CodeV2.gs`
3. รัน `setupSystem()` และอนุญาตสิทธิ์ Sheets/Drive
4. รัน `bootstrapOwnerAdmin()` แล้วจดรหัสผ่านชั่วคราวจาก Execution log
5. Deploy > New deployment > Web app
   - Execute as: Me
   - Who has access: Anyone
6. หาก Web App URL เปลี่ยน ให้แก้ `online-v2/config.js`

## Script Properties

ระบบสร้างให้อัตโนมัติ: `SPREADSHEET_ID`, `EVIDENCE_FOLDER_ID`, `PASSWORD_PEPPER`, `ALLOWED_ORIGIN`, `SESSION_TTL_SECONDS`

ตั้งเพิ่มเมื่อต้องการ Telegram:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

ห้ามเขียน Token, password, student list หรือข้อมูลความดีลง GitHub

## เพิ่มผู้ใช้

รันจาก Apps Script editor:

```javascript
provisionMember('6900001', '6900001', 'ชื่อผู้ใช้', 'รุ่น 69', 'student');
provisionMember('teacher01', '', 'อาจารย์ผู้ตรวจ', '', 'teacher');
```

ฟังก์ชันจะแสดงรหัสผ่านชั่วคราวใน Execution log และบังคับเปลี่ยนรหัสผ่าน

## เปิดหน้าเว็บทดสอบ

`https://anuchit1tube168-cmd.github.io/gooddeeds69/online-v2/`

หน้าเดิมยังไม่ถูกสลับออกจนกว่า Apps Script v2 จะผ่านการทดสอบ end-to-end
