# 📖 คู่มือระเบียบและแนวทางการใช้งานระบบบันทึกความดี วพอ. ๒๕๖๙

> **วิทยาลัยพยาบาลทหารอากาศ กรมแพทย์ทหารอากาศ**  
> *ฉบับสมบูรณ์ ปรับปรุงล่าสุด ปีการศึกษา ๒๕๖๙*

---

## 📌 ๑. แผนผังและสถาปัตยกรรมระบบ (System Architecture)

ระบบบันทึกความดีจิตอาสา วิทยาลัยพยาบาลทหารอากาศ ทำงานประสานกันแบบ **Hybrid Architecture** เพื่อความเสถียร รวดเร็ว และรองรับผู้ใช้งานพร้อมกัน:

| ส่วนของระบบ | สถานที่จัดเก็บ / ลิงก์ | หน้าที่และรายละเอียด |
| :--- | :--- | :--- |
| **🟢 LINE LIFF App** |  | ช่องทางหลักสำหรับ นพอ. ใช้งานผ่านมือถือในแอป LINE |
| **🌐 หน้าเว็บออนไลน์** |  | ระบบเว็บส่วนหน้า (Frontend Static Hosting) |
| **🖥️ เซิร์ฟเวอร์หลัก (Local / VPS)** |  (ผ่าน Cloudflare Tunnel) | Backend API, Real-time SSE Sync, ประมวลผลและตรวจสอบโควตา |
| **📁 โฟลเดอร์งานหลัก** | Google Drive  | คลังเอกสารหลัก ตารางสรุปผล Excel และไฟล์สำรอง |
| **🖼️ โฟลเดอร์รูปภาพกิจกรรม** | Google Drive  | คลังเก็บภาพถ่ายกิจกรรม แยกโฟลเดอร์ตามรายบุคคลอัตโนมัติ |
| **💾 ฐานข้อมูลหลัก (JSON / JS)** | ,  | ฐานข้อมูลประวัติความดี ๓,๐๔๐ รายการ และข้อมูล นพอ. ทุกชั้นปี |

---

## 🎯 ๒. เกณฑ์ชั่วโมงความดี ๙ หมวดหมู่ & โควตาจำกัด (Academic Year 2569 Criteria)

นพอ. ทุกนาย ต้องบำเพ็ญกิจกรรมความดีจิตอาสา **อย่างน้อย ๕๐ ชั่วโมงต่อปีการศึกษา** (เฉลี่ย ๒๕ ชั่วโมงต่อภาคการศึกษา) โดยระบบมีกลไกตรวจสอบโควตาและเงื่อนไขอัตโนมัติ (Automated Validation):

| หมวดหมู่ | รายการกิจกรรม | เพดานต่อครั้ง / ต่อวัน | โควตาสะสมสูงสุด | เงื่อนไขพิเศษ |
| :---: | :--- | :---: | :---: | :--- |
| **๑** | **บริจาคโลหิต / เกล็ดเลือด / พลาสมา** | **๘ ชม. / ครั้ง** | ไม่เกิน **๔ ครั้ง / ปี** (๓๒ ชม./ปี) | เว้นระยะห่าง **อย่างน้อย ๙๐ วัน (๓ เดือน)** แนบภาพสมุดบริจาค |
| **๒** | **โครงการภายนอก (คำสั่ง วพอ.)** | สูงสุด **๘ ชม. / วัน** | ตามคำสั่งปฏิบัติงาน | กิจกรรมชมรม/ภายนอกที่มีคำสั่ง วพอ. ชัดเจน |
| **๓** | **ช่วยเหลืองานภายใน วพอ.** | สูงสุด **๘ ชม. / วัน** | ตามงานที่ได้รับมอบ | กิจกรรม ๕ส, เวรห้องยา, งานสนับสนุนอาจารย์ใน วพอ. |
| **๔** | **เข้าอบรมที่ วพอ. จัดให้** | สูงสุด **๔ ชม. / วัน** | ไม่เกินระยะเวลาอบรมจริง | อบรมคุณธรรม จริยธรรม สัมมนาวิชาการนอกตารางเรียนปกติ |
| **๕** | **ช่วยงานหน่วยงาน / ชุมชน / มูลนิธิ** | สูงสุด **๔ ชม. / วัน** | ตามระยะเวลาจริง | กิจกรรมจิตอาสาที่ นพอ. สมัครใจเข้าร่วมกับองค์กรภายนอก |
| **๖** | **ทำนุบำรุงศาสนสถาน** | ไม่เกิน **๑ ชม. / ครั้ง** | สะสมไม่เกิน **๔ ชม. / ปีการศึกษา** | กวาดลานวัด ล้างห้องน้ำวัด งานบำเพ็ญประโยชน์ทางศาสนา |
| **๗** | **งานฟรีทั่วไป / ช่วยงานผู้ปกครอง** | ไม่เกิน **๑ ชม. / ครั้ง** | **๒ ชม. / เทอม** (๔ ชม. / ปีการศึกษา) | ช่วยงานที่บ้าน ดูแลผู้สูงอายุ/ผู้ป่วย งานจิตอาสาไม่มีคำสั่ง |
| **๘** | **กิจกรรมจงรักภักดีต่อสถาบัน** | สูงสุด **๔ ชม. / ครั้ง** | ไม่เกิน **๘ ชม. / ปีการศึกษา** | จิตอาสาพระราชทาน ๙๐๔, วันสำคัญของชาติ, ถวายพระพร |
| **๙** | **ชม. ที่สมควรได้รับ (บทบาทพิเศษ)** | - | **๒๐ ชม. / เทอม** (๔๐ ชม. / ปีการศึกษา) | น.ปกครอง, แอดมินระบบ, น.สารสนเทศ, น.ตัดต่อ, น.พยาบาล |

### 🛡️ ระบบป้องกันการบันทึกผิดพลาด (Smart Validation & Duplicate Prevention)
1. **ป้องกันการลงซ้ำ (Duplicate Prevention):** หากมีรายการความดีในหมวดหมู่เดียวกันและวันที่ทำกิจกรรมตรงกัน ระบบจะปฏิเสธการบันทึกทันที
2. **ระบบล็อกเพดานชั่วโมง (Dynamic Max Hours):** เมื่อเลือกหมวด ๖ หรือ ๗ ช่องชั่วโมงจะถูกจำกัดไว้ไม่เกิน ๑ ชั่วโมงอัตโนมัติ หมวด ๑ จำกัด ๘ ชั่วโมง
3. **ระบบตรวจสอบระยะห่างบริจาคโลหิต (90-Day Blood Donation Guard):** คำนวณจากประวัติการบริจาคครั้งล่าสุด หากไม่ถึง ๙๐ วัน ระบบจะแจ้งเตือนจำนวนวันที่เหลือและไม่อนุญาตให้ส่ง

---

## 📱 ๓. คู่มือสำหรับนักเรียนพยาบาลทหารอากาศ (Student Workflow)

### ขั้นตอนที่ ๑: เข้าสู่ระบบ (Authentication)
- เปิดผ่านเมนู LINE OA หรือเปิดเว็บไซต์  หรือ 
- กรอก **รหัสนักเรียน ๗ หลัก** (รหัสผ่านเริ่มต้นคือ รหัสนักเรียน สามารถเปลี่ยนได้ที่เมนู *โปรไฟล์*)

### ขั้นตอนที่ ๒: บันทึกความดี (Submit Deed)
- เข้าเมนู **"✍️ บันทึกความดี"**
- เลือกหมวดหมู่ความดีทั้ง ๙ ประเภท ➡️ ระบบจะแสดงแถบ **โควตาคงเหลือ** และกฎเกณฑ์ให้เห็นทันที
- เลือกวันที่กิจกรรม, จำนวนชั่วโมง, แนบภาพถ่ายหลักฐานอย่างน้อย ๑ ภาพ
- กดปุ่ม **"บันทึกความดี"**

### ขั้นตอนที่ ๓: การขอรับรองผ่านลิงก์ดิจิทัล (Digital Approval Link)
- เมื่อบันทึกสำเร็จ ระบบจะแสดงหน้าต่างป๊อปอัปพร้อมปุ่ม **"แชร์ผ่าน LINE เพื่อเซ็นชื่อ"** หรือ **"คัดลอกลิงก์"**
- ส่งลิงก์ดังกล่าวให้อาจารย์ประจำรุ่น, ผู้ปกครอง, หรือหัวหน้าหน่วยงานภายนอก
- ผู้รับรองเปิดลิงก์บนสมาร์ตโฟนแล้ว **เซ็นลายมือชื่อสดผ่านหน้าจอ (Digital Canvas)** ได้ทันทีโดยไม่ต้องมีบัญชีในระบบ

### ขั้นตอนที่ ๔: ใบบันทึกความดีมาตรฐาน A4 (Official Deed Slip)
- เมื่อได้รับการลงนามรับรองแล้ว รายการใน *"ประวัติความดี"* จะแสดงสถานะ **อนุมัติแล้ว** พร้อมปุ่ม **"📄 ดูใบรับรอง"**
- เอกสารแบบฟอร์ม A4 ทางการจะปรากฏพร้อมตราสัญลักษณ์กองทัพอากาศสีทอง ลายน้ำ และลายเซ็นดิจิทัล สามารถพิมพ์หรือบันทึกเป็น PDF แนบพอร์ตโฟลิโอได้ทันที

### ขั้นตอนที่ ๕: ระบบบัตรเกียรติยศ & วิวัฒนาการ Chibi Hero
- ทุกชั่วโมงที่ได้รับการอนุมัติจะนำไปประมวลผลบน **บัตร Starbucks Pass**
- ตัวละคร **Chibi Hero จะวิวัฒนาการ ๘ ระดับ (Level 1 - 8)** ตั้งแต่นักเรียนฝึกหัด ไปจนถึงอัครเทวทูตสวรรค์เมื่อครบ ๕๐ ชั่วโมง

---

## ✒️ ๔. คู่มือสำหรับผู้รับรองและอาจารย์ (Approver & Teacher Dashboard)

### ก. การลงนามสดผ่านลิงก์ (approve_sign.html)
- รองรับผู้รับรอง ๔ บทบาท:
  1. อาจารย์ วิทยาลัยพยาบาลทหารอากาศ
  2. ผู้ปกครอง / บิดา-มารดา
  3. หน่วยงานภายนอก / มูลนิธิ / เจ้าอาวาสวัด
  4. บุคคลอื่น ๆ
- ผู้รับรองระบุชื่อ-สกุล ตำแหน่ง/ความสัมพันธ์ และเซ็นลายมือชื่อด้วยนิ้วหรือปากกาสไตลัส แล้วกด **"ยืนยันการรับรอง"**

### ข. การจัดการผ่าน Teacher Dashboard (teacher-dashboard.html)
- เข้าสู่ระบบด้วยบัญชีอาจารย์ () หรือผู้ดูแลระบบ ()
- ตรวจสอบรายการรออนุมัติแบบ Real-time พร้อมรูปถ่ายกิจกรรม
- กด **อนุมัติรายคน** หรือ **อนุมัติทั้งหมด (Batch Approve)**
- ส่งออกรายงาน Word สรุปประจำเดือนตามแบบฟอร์มราชการ ทอ. และสรุปสถิติรายชั้นปี

---

## 🔄 ๕. สถาปัตยกรรมรอบปีการศึกษาและการย้ายฐานข้อมูล (Academic Year Rollover Protocol)

วิทยาลัยพยาบาลทหารอากาศ กำหนดรอบปีการศึกษาดังนี้:
- **ภาคการศึกษาที่ ๑:** ๑ กรกฎาคม – ๓๐ พฤศจิกายน
- **ภาคการศึกษาที่ ๒:** ๑ ธันวาคม – ๓๐ มิถุนายน
- **วันเปลี่ยนรอบปีการศึกษา (Rollover Day):** **๑ กรกฎาคม ของทุกปี**

### นโยบายการคงอยู่ของข้อมูล (Data Retention & Continuity)
1. **ไม่ล้างประวัติปีก่อนหน้า (Zero Data Loss):** ประวัติความดีของนักเรียนชั้นปีที่ ๒, ๓, ๔ ทั้งหมด (๓,๐๔๐ รายการเดิม) จะถูกเก็บรักษาไว้อย่างครบถ้วน ๑๐๐%
2. **ระบบ ๒ มาตรวัด (Dual-Counter Architecture):**
   - **มาตรวัดประจำปี (Annual Counter):** นับชั่วโมงที่ทำเฉพาะภายในปีการศึกษาปัจจุบัน (เป้าหมาย ๕๐ ชม./ปี)
   - **มาตรวัดสะสมตลอดหลักสูตร (Cumulative All-Time Counter):** รวบรวมชั่วโมงจากทุกปีการศึกษา เพื่อใช้ประเมินเกียรติประวัติและประกอบการสำเร็จการศึกษา
3. **การเลื่อนชั้นปีประจำเดือนกรกฎาคม:**
   - นพอ.รุ่น ๖๖ (ปี ๔) ➔ ปรับเป็นสถานะ **สำเร็จการศึกษา / ศิษย์เก่า (Alumni)**
   - นพอ.รุ่น ๖๗ (ปี ๓) ➔ เลื่อนขึ้นเป็น **ชั้นปีที่ ๔**
   - นพอ.รุ่น ๖๘ (ปี ๒) ➔ เลื่อนขึ้นเป็น **ชั้นปีที่ ๓**
   - นพอ.รุ่น ๖๙ (ปี ๑) ➔ เลื่อนขึ้นเป็น **ชั้นปีที่ ๒**
   - นพอ.รุ่น ๗๐ (เข้าใหม่) ➔ บันทึกเข้าสู่ระบบเป็น **ชั้นปีที่ ๑**
4. **สรุปยอดฐานข้อมูลปี ๒๕๖๙:**
   - จัดเก็บข้อมูลสรุปยอดสะสมและแยก ๙ หมวดหมู่อยู่ใน [](Main_2569_Summary.csv)

---

## 🛠️ ๖. การบริหารจัดการและคำสั่งสำคัญสำหรับผู้ดูแลระบบ (Admin CLI Reference)

⚠️  DOCX generation libraries not fully available: No module named 'pythainlp'

--- Checking profile.html Script block #6 starting at file line: 309 (length: 5217 chars) ---
✅ All braces, parentheses, and brackets are perfectly balanced!

--- Checking auto_login.html Script block #0 starting at file line: 4 (length: 449 chars) ---
✅ All braces, parentheses, and brackets are perfectly balanced!

--- Checking index.html Script block #6 starting at file line: 427 (length: 8462 chars) ---
✅ All braces, parentheses, and brackets are perfectly balanced!

--- Checking student-dashboard.html Script block #8 starting at file line: 1346 (length: 24308 chars) ---
✅ All braces, parentheses, and brackets are perfectly balanced!

--- Checking 404.html Script block #0 starting at file line: 7 (length: 1196 chars) ---
✅ All braces, parentheses, and brackets are perfectly balanced!

--- Checking ranking.html Script block #5 starting at file line: 338 (length: 18663 chars) ---
✅ All braces, parentheses, and brackets are perfectly balanced!

--- Checking submit-deed.html Script block #8 starting at file line: 502 (length: 21462 chars) ---
✅ All braces, parentheses, and brackets are perfectly balanced!

--- Checking approve_sign.html Script block #4 starting at file line: 445 (length: 17432 chars) ---
✅ All braces, parentheses, and brackets are perfectly balanced!

--- Checking history.html Script block #4 starting at file line: 289 (length: 7008 chars) ---
✅ All braces, parentheses, and brackets are perfectly balanced!

--- Checking teacher-dashboard.html Script block #7 starting at file line: 799 (length: 57264 chars) ---
✅ All braces, parentheses, and brackets are perfectly balanced!

--- Checking view_cards.html Script block #5 starting at file line: 790 (length: 17511 chars) ---
✅ All braces, parentheses, and brackets are perfectly balanced!

--- Checking qa-board.html Script block #4 starting at file line: 509 (length: 19399 chars) ---
✅ All braces, parentheses, and brackets are perfectly balanced!

--- Checking settings.html Script block #4 starting at file line: 235 (length: 10191 chars) ---
✅ All braces, parentheses, and brackets are perfectly balanced!

--- Checking report.html Script block #5 starting at file line: 578 (length: 26457 chars) ---
✅ All braces, parentheses, and brackets are perfectly balanced!

--- Checking manual.html Script block #4 starting at file line: 757 (length: 1349 chars) ---
✅ All braces, parentheses, and brackets are perfectly balanced!

--- Checking deed_slip.html Script block #3 starting at file line: 343 (length: 7988 chars) ---
✅ All braces, parentheses, and brackets are perfectly balanced!
=== VALIDATING DATABASE FILES ===
✅ deeds.json is 100% valid (3040 deeds)!
✅ deeds.json is 100% valid (3040 deeds)!

Validating records/ directory...
Validated 3040 info.json records in records/. Errors found: 0
❌ ต้องติดตั้ง Pillow: pip3 install Pillow

---

*เอกสารฉบับนี้เป็นคู่มือทางการสำหรับกำกับดูแลระบบบันทึกความดีจิตอาสา วิทยาลัยพยาบาลทหารอากาศ ปีการศึกษา ๒๕๖๙*
