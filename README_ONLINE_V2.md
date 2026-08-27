# RTAFNC Good Deed Online v2

สถาปัตยกรรมที่ใช้

- GitHub Pages: `frontend/secure-pilot/` มีเฉพาะ HTML, CSS, JavaScript, LIFF ID (public identifier) และ URL ของ Web App
- Google Apps Script: Authentication, RBAC, validation, workflow, notification และ Audit Log
- Google Sheets: `MembersV2`, `GoodDeedRecordsV2`, `AuditTrailV2`, `ConfigurationV2`
- Google Drive: เก็บหลักฐานแบบ Private ในโฟลเดอร์ที่สร้างโดย `setupSystem()`

หน้า Pilot: `https://anuchit1tube168-cmd.github.io/gooddeeds69/frontend/secure-pilot/`

LIFF ID เดิมมี Endpoint เป็น `.../frontend/index.html` จึงห้ามต่อ `/secure-pilot/` ท้าย LIFF URL เพราะจะกลายเป็น `index.html/secure-pilot/` และ 404 หน้า Pilot จึงปิดปุ่ม LINE ไว้โดยตั้ง `LIFF_ENDPOINT_PATH` ให้ตรงหน้าเดิม

Google Sheet หลัก: `1BV-TaZqTCXD-UerIjLLh93MPQwlIe4dzNpPimQZzOLE`

แท็บ v2 ถูกสร้างแยกจากแท็บเดิมแล้ว จึงไม่แก้หรือทับข้อมูลของระบบเดิม

## ติดตั้งหลังบ้านครั้งแรก

1. เปิด Apps Script โปรเจกต์เดิมที่เป็นเจ้าของ Web App URL ใน `frontend/secure-pilot/config.js`
2. สำรองโค้ดเดิม แล้วแทนที่ `Code.gs` ด้วยเนื้อหาใน `backend/CodeV2.gs`
3. Project Settings > Script properties เพิ่ม
   - key: `SPREADSHEET_ID`
   - value: `1BV-TaZqTCXD-UerIjLLh93MPQwlIe4dzNpPimQZzOLE`
   - key: `LINE_LOGIN_CHANNEL_ID`
   - value: Channel ID จาก LINE Login channel ที่มี LIFF ID `2010948179-Ympqt2bT`
   - key: `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN`
   - value: Channel access token ของ Messaging API สำหรับ OA ที่นักเรียนเพิ่มเพื่อน
4. รัน `setupSystem()` และอนุญาตสิทธิ์ Sheets/Drive
5. รัน `bootstrapOwnerAdmin()` แล้วจดรหัสผ่านชั่วคราวจาก Execution log
6. Deploy > Manage deployments > Edit > New version > Deploy เพื่อคง Web App URL เดิม
   - Execute as: Me
   - Who has access: Anyone
7. เปิดหน้าออนไลน์และเข้าสู่ระบบด้วยบัญชีผู้ดูแล รหัสผ่านชั่วคราวจะบังคับให้เปลี่ยนทันที

หากไม่มีสิทธิ์แก้ deployment เดิม ให้สร้าง New deployment แบบ Web app แล้วแก้ `frontend/secure-pilot/config.js` เป็น URL ใหม่

## การทำงานของ LINE LIFF

1. ระหว่าง Pilot ให้ทดสอบหน้าเว็บตรงและบัญชีระบบก่อน โดยยังไม่เปลี่ยน LIFF/Rich Menu เดิม
2. หลังทดสอบ Apps Script ผ่าน ให้คัดลอกไฟล์ Pilot ทับเฉพาะ frontend หลักแบบ atomic commit เพื่อให้ Endpoint เดิม `frontend/index.html` โหลดระบบใหม่
3. นักเรียนเปิด LIFF URL เดิม ไม่ต่อ path เพิ่ม
4. หน้าเว็บส่ง `liff.getIDToken()` ไป Apps Script โดยไม่ส่งค่าจาก `getDecodedIDToken()` มาเป็นหลักฐานยืนยันตัวตน
5. Apps Script ตรวจ ID token กับ LINE และตรวจว่า `aud` ตรง `LINE_LOGIN_CHANNEL_ID`
6. การใช้งานครั้งแรก นักเรียนยืนยันรหัสนักเรียน/รหัสผ่านเพื่อผูก `sub` (LINE user ID) กับสมาชิกหนึ่งบัญชี
7. ครั้งต่อไป LIFF เข้าระบบได้จาก LINE โดยไม่ต้องกรอกรหัสผ่านซ้ำ ตราบใดที่ session/ID token ยังใช้ได้
8. เมื่ออาจารย์อนุมัติหรือไม่อนุมัติ Apps Script ส่งผลด้วย Messaging API ไปยัง `lineUserId` ที่ผูกไว้

Channel access token และ Channel secret ห้ามอยู่ใน `config.js` หรือไฟล์ GitHub ส่วน LIFF ID ไม่ใช่ secret จึงอยู่ใน frontend ได้

เงื่อนไขสำคัญสำหรับการส่งข้อความกลับ:

- LINE Login channel ของ LIFF และ Messaging API channel ของ OA ต้องอยู่ใต้ LINE Developers Provider เดียวกัน เพื่อให้ user ID อ้างถึงผู้ใช้คนเดียวกัน
- นักเรียนต้องเพิ่ม OA เป็นเพื่อนและไม่บล็อก OA จึงจะรับ push message ได้
- การแจ้งผลอนุมัติใช้ Messaging API โดยตรงจาก Apps Script ไม่ต้องผ่าน MCP; ถ้าจะเพิ่ม AI สนทนาสองทางภายหลัง ให้ทำ webhook gateway ที่ตรวจ `x-line-signature` แยกต่างหาก

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

ตั้งค่าเองก่อนรันครั้งแรก: `SPREADSHEET_ID`, `LINE_LOGIN_CHANNEL_ID`, `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN`

ระบบสร้างให้อัตโนมัติ: `EVIDENCE_FOLDER_ID`, `PASSWORD_PEPPER`, `ALLOWED_ORIGIN`, `SESSION_TTL_SECONDS`

ตั้งเพิ่มเมื่อต้องการ Telegram:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

ห้ามเขียน Token, password, student list หรือข้อมูลความดีลง GitHub

## เพิ่มผู้ใช้

เข้าสู่ระบบด้วยบทบาทผู้ดูแล แล้วเปิดแท็บ “จัดการผู้ใช้” เพื่อสร้างบัญชีนักเรียน อาจารย์ผู้ตรวจ หรือผู้ดูแล ระบบจะแสดงรหัสผ่านชั่วคราวครั้งเดียว และบังคับให้เจ้าของบัญชีเปลี่ยนรหัสผ่านก่อนใช้งาน

## ทดสอบ LINE จาก Apps Script Editor

1. รัน `testLineConfiguration()` เพื่อตรวจว่า Channel ID และ Messaging API token พร้อมใช้งาน โดยยังไม่ส่งข้อความ
2. ให้นักเรียนทดลองผูก LINE ผ่าน LIFF อย่างน้อยหนึ่งบัญชี
3. ตั้ง Script Property `LINE_TEST_STUDENT_ID` เป็นรหัสนักเรียนทดสอบ แล้วรัน `testLinePushToStudent()` ระบบจะส่งข้อความทดสอบจริงหนึ่งข้อความ
4. ตรวจ Execution log และแท็บ `AuditTrailV2` ถ้าส่งสำเร็จจะมี action `line.test.sent`

## เปิดหน้าเว็บทดสอบ

เว็บตรง: `https://anuchit1tube168-cmd.github.io/gooddeeds69/frontend/secure-pilot/`

LIFF หลังสลับหน้าเดิม: `https://liff.line.me/2010948179-Ympqt2bT`

หน้าเดิมยังไม่ถูกสลับออกจนกว่า Apps Script v2 จะผ่านการทดสอบ end-to-end

หลังทดสอบผ่าน ให้ย้าย student list, ไฟล์หลักฐาน, token และข้อมูลความดีที่เคยอยู่ใน GitHub ออกจาก repository พร้อมหมุน Telegram token เดิมก่อนเปิดใช้จริง
