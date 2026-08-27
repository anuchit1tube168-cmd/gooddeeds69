# RTAFNC Good Deed Online v2

สถาปัตยกรรมที่ใช้

- GitHub Pages: `online-v2/` มีเฉพาะ HTML, CSS, JavaScript และ URL ของ Web App
- Google Apps Script: Authentication, RBAC, validation, workflow, notification และ Audit Log
- Google Sheets: `MembersV2`, `GoodDeedRecordsV2`, `AuditTrailV2`, `ConfigurationV2`
- Google Drive: เก็บหลักฐานแบบ Private ในโฟลเดอร์ที่สร้างโดย `setupSystem()`

หน้าออนไลน์: `https://anuchit1tube168-cmd.github.io/gooddeeds69/online-v2/`

Google Sheet หลัก: `1BV-TaZqTCXD-UerIjLLh93MPQwlIe4dzNpPimQZzOLE`

แท็บ v2 ถูกสร้างแยกจากแท็บเดิมแล้ว จึงไม่แก้หรือทับข้อมูลของระบบเดิม

## ติดตั้งหลังบ้านครั้งแรก

1. เปิด Apps Script โปรเจกต์เดิมที่เป็นเจ้าของ Web App URL ใน `online-v2/config.js`
2. สำรองโค้ดเดิม แล้วแทนที่ `Code.gs` ด้วย `backend/CodeV2.gs`
3. Project Settings > Script properties เพิ่ม
   - key: `SPREADSHEET_ID`
   - value: `1BV-TaZqTCXD-UerIjLLh93MPQwlIe4dzNpPimQZzOLE`
4. รัน `setupSystem()` และอนุญาตสิทธิ์ Sheets/Drive
5. รัน `bootstrapOwnerAdmin()` แล้วจดรหัสผ่านชั่วคราวจาก Execution log
6. Deploy > Manage deployments > Edit > New version > Deploy เพื่อคง Web App URL เดิม
   - Execute as: Me
   - Who has access: Anyone
7. เปิดหน้าออนไลน์และเข้าสู่ระบบด้วยบัญชีผู้ดูแล รหัสผ่านชั่วคราวจะบังคับให้เปลี่ยนทันที

หากไม่มีสิทธิ์แก้ deployment เดิม ให้สร้าง New deployment แบบ Web app แล้วแก้ `online-v2/config.js` เป็น URL ใหม่

## ย้ายข้อมูลเดิมจาก GitHub

ชุดข้อมูลย้ายระบบถูกตัด password, เบอร์โทร, email และ Telegram ID เดิมออกแล้ว และเก็บแบบ Private ใน Google Drive:

- นักเรียน 380 คน: `legacy_students_v2.json`
- บันทึกความดี 3,041 รายการ: `legacy_deeds_v2.json`
- รายงานตรวจข้อมูล: `migration_manifest_v2.json`

เพิ่ม Script Properties:

- `LEGACY_STUDENTS_FILE_ID` = `1QsLz93kMGI-hwm-7JT0g8hbcEsNnU7ff`
- `LEGACY_DEEDS_FILE_ID` = `1jafL_qesTykkfjRz4B1_TxQft8m_0Bi2`

จากนั้นรัน `startLegacyMigration()` หนึ่งครั้ง ระบบจะ:

1. สร้างบัญชีนักเรียนด้วยรหัสผ่านชั่วคราวใหม่ โดยไม่ใช้ password เดิมจาก GitHub
2. สร้าง CSV รหัสผ่านชั่วคราวแบบ Private ในโฟลเดอร์หลักฐาน และเก็บ file ID ไว้ใน `LEGACY_CREDENTIALS_FILE_ID`
3. ย้ายรายการความดีครั้งละ 250 รายการ
4. ย้ายหลักฐานจาก GitHub เข้า Google Drive แบบ Private ครั้งละ 25 รายการ ทุก 5 นาที
5. หยุด trigger อัตโนมัติเมื่อเสร็จ และบันทึก `LEGACY_MIGRATION_COMPLETED_AT`

ระบบจะไม่ย้ายรายการสรุปสะสม 11 แถวที่มีชั่วโมงเกิน 24 ชั่วโมง เพื่อป้องกันยอดซ้ำ แต่ข้อมูลต้นฉบับยังอยู่ในไฟล์สำรองสำหรับตรวจทาน เมื่อแจกบัญชีครบแล้วให้ลบไฟล์ CSV รหัสผ่านชั่วคราว

## Script Properties

ตั้งค่าเองก่อนรันครั้งแรก: `SPREADSHEET_ID`

ระบบสร้างให้อัตโนมัติ: `EVIDENCE_FOLDER_ID`, `PASSWORD_PEPPER`, `ALLOWED_ORIGIN`, `SESSION_TTL_SECONDS`

ตั้งเพิ่มเมื่อต้องการ Telegram:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

ห้ามเขียน Token, password, student list หรือข้อมูลความดีลง GitHub

## เพิ่มผู้ใช้

เข้าสู่ระบบด้วยบทบาทผู้ดูแล แล้วเปิดแท็บ “จัดการผู้ใช้” เพื่อสร้างบัญชีนักเรียน อาจารย์ผู้ตรวจ หรือผู้ดูแล ระบบจะแสดงรหัสผ่านชั่วคราวครั้งเดียว และบังคับให้เจ้าของบัญชีเปลี่ยนรหัสผ่านก่อนใช้งาน

## เปิดหน้าเว็บทดสอบ

`https://anuchit1tube168-cmd.github.io/gooddeeds69/online-v2/`

หน้าเดิมยังไม่ถูกสลับออกจนกว่า Apps Script v2 จะผ่านการทดสอบ end-to-end

หลังทดสอบผ่าน ให้ย้าย student list, ไฟล์หลักฐาน, token และข้อมูลความดีที่เคยอยู่ใน GitHub ออกจาก repository พร้อมหมุน Telegram token เดิมก่อนเปิดใช้จริง
