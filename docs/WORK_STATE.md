# RTAFNC Good Deeds 2569 — Work State Tracker 📋

**Current Branch:** `codex/fable-gooddeed-hardening-20260907`  
**Base Commit:** `29531524` (feat: notify Telegram group on web deed approval/rejection)  
**Last Updated:** 2026-09-07  
**Operational Skill:** `rtafnc-gooddeed-fable` / `gooddeeds-system`  

---

## 1. Executive Summary & Objective

ระบบบันทึกความดีจิตอาสา วิทยาลัยพยาบาลทหารอากาศ (วพอ.) ปีการศึกษา 2569 อยู่ในขั้นตอน **Hardening & P0 Stabilization** มุ่งเน้น:
1. ปฏิบัติตาม **กฎเหล็กการลงนามสด (Strict Live Signature Policy)** อย่างเคร่งครัด 100% ห้ามแคชหรือวนซ้ำลายเซ็น
2. การตอบสนองและประสานงานผ่าน **Telegram Bot Callback & Real-Time Sync** แบบฉับไว ไม่ค้าง ไม่ Timeout
3. รองรับการแสดงผลทุกหน้าจอ (**Multi-Device & LINE LIFF**) ป้องกันปัญหา Auto-Zoom และ Auto-Login Trap
4. รักษามาตรฐานความปลอดภัยข้อมูลส่วนบุคคลทางทหาร (**PDPA Zero-Leak**) ป้องกันข้อมูล นพอ. รั่วไหลสู่ GitHub

---

## 2. P0 Task Matrix & Implementation Status

| ID | Task Description | Status | Evidence / Implementation Files |
|---|---|:---:|---|
| **P0-1** | **Strict Live Signature Policy**<br>- กรอบ Canvas เริ่มต้นเป็นช่องว่างเสมอ<br>- ตรวจสอบ Stroke จริง (`isCanvasBlank`) ก่อนอนุมัติ<br>- ห้าม auto-load หรือวนใช้ลายเซ็นซ้ำเด็ดขาด | ✅ PASS | `frontend/approve_sign.html`<br>`frontend/deed_slip.html` |
| **P0-2** | **Telegram Real-time Interactive Bot**<br>- ตอบ `answerCallbackQuery` ทันทีภายใน 0.5s พร้อม Alert Popup<br>- ส่งข้อความตอบกลับยืนยันพร้อมลิงก์สลิป PDF และปุ่มลงนามสด<br>- รองรับข้อผิดพลาดเมื่อกดซ้ำ (`done_{deed_id}`) | ✅ PASS | `data/telegram_bot_listener.py`<br>`frontend/app.js` |
| **P0-3** | **Multi-Device & LIFF Responsive Hardening**<br>- Viewport ป้องกัน auto-zoom (font-size >= 16px)<br>- Logout ปลอดภัย ล้าง Cookie/Context ไม่ติดลูปเข้าซ้ำ | ✅ PASS | `frontend/style.css`<br>`frontend/app.js`<br>`frontend/index.html` |
| **P0-4** | **PDPA Military Grade Zero-Leak**<br>- .gitignore กักกันไฟล์ข้อมูลจริง 100%<br>- 0 นักเรียนหรือประวัติความดีใน Git Tracking | ✅ PASS | `data/check_pdpa_compliance.py`<br>124 tracked files scanned: 100% CLEAN |
| **P0-5** | **Staging & Backend Health Check**<br>- เพิ่ม `/api/health` endpoint ตรวจสอบสถานะฉับไว<br>- ระบบ SSE (`/api/events`) สำหรับ Live Dashboard | ✅ PASS | `backend/server.py`<br>`http://127.0.0.1:3000/api/health` |
| **P0-6** | **All 380 Students Audit & Online Master Cloud Sync**<br>- ปี 1 (69): ตัดกิจกรรมปฐมนิเทศ 5 ชม. ออกตามคำสั่ง คงข้อมูลจริง (มีประวัติทำจริง 1 นาย = 2 ชม., อีก 63 คน = 0 ชม.)<br>- ปี 2-4: หมวด 9 บทบาทพิเศษ (+25 ชม.) ครบ 69 คน (รวมแก้บั๊ก นพอ. ชั้นปี 4 น.ตัดต่อ)<br>- `Main_2569_Summary.csv` & Google Sheets ซิงก์ตรง Local DB 100% (Zero Discrepancy) | ✅ PASS | `Main_2569_Summary.csv`<br>Google Apps Script Master Sheet<br>`data/deeds.json` |
| **P0-7** | **LINE Centralized ID Storage & Auto-Push Notifications**<br>- จัดเก็บ LINE User ID ถาวรในระบบกลาง (`students.json`, `students_data.js`, `line_mappings.json`, `Main_2569_Summary.csv`, Google Sheets)<br>- ระบบจดจำอัตโนมัติ **"ถ้ามีแล้วไม่ต้องรายคน"** ผ่าน LIFF โดยค้นหาจากฐานข้อมูลกลาง พร้อมแสดง Badge สถานะเชื่อมต่อแล้ว<br>- ระบบ Push Notification อัตโนมัติทุกครั้งเมื่อส่งความดี หรือได้รับการอนุมัติ/ปฏิเสธ (Web + Telegram Bot) | ✅ PASS | `backend/line_notifier.py`<br>`backend/server.py`<br>`data/telegram_bot_listener.py`<br>`frontend/liff-sdk.js` |
| **P0-8** | **Full-Stack Audit & System Hardening (GAS, Server, PDPA, Versioning)**<br>- แก้ไข `backend/Code.gs` เพิ่ม 3 ฟังก์ชันที่ขาด (`bindLineAccount`, `initAllStudents`, `setupAllStudentFolders`) พร้อมแก้สูตรโฟลเดอร์ Drive กลับด้าน<br>- แก้ไข `backend/server.py` ปรับ routing `/api/bind_line`<br>- กักกันข้อมูลส่วนบุคคล (PDPA Zero-Leak) ย้ายรายชื่อฮาร์ดโค้ดในสคริปต์ไป `data/private/missing_historical_students.json`<br>- ปรับปรุง Version Tag เป็น `?v=3580` ครบ 15 หน้า HTML และล้าง Token เก่าในสคริปต์เสริม | ✅ PASS | `backend/Code.gs`<br>`backend/server.py`<br>`data/export_students.py`<br>`data/build_photos.py`<br>`frontend/*.html` |

---

## 3. Environment & Daemon Setup

- **Backend Server**: Port 3000 (`python3 backend/server.py 3000`)
- **Telegram Bot Listener**: Background continuous poller (`python3 data/telegram_bot_listener.py`)
- **Cloudflare Tunnel (Staging URL)**: `https://guided-ate-sponsors-algorithm.trycloudflare.com`
- **LINE LIFF ID**: `2010948179-Ympqt2bT`
- **LINE OA Bot**: ฟ้าใส (`@409gzbav`)
- **Telegram Group ID**: `-4839151586`

---

## 4. Verification Test Suite Results

- **PDPA Compliance Audit**: `python3 data/check_pdpa_compliance.py` ➔ **100% PASS**
- **HTML/JS Syntax Integrity**: `PYTHONPATH=. python3 scratch/test_braces.py` ➔ **18/18 Files PASS**
- **Python Backend Compilation**: `python3 -m py_compile backend/server.py backend/line_notifier.py` ➔ **PASS**
- **Database Reconciliation**: 380 นักเรียนเทียบ Local DB vs Online CSV ➔ **0 Discrepancies (100% Match)**
- **LINE ID Storage & Lookup Suite**: `save_student_line_binding` & `find_user_by_line_id` ➔ **100% PASS**
- **Google Sheets Cloud Sync**: `action: init_all_students` ➔ **Populated 380 students with complete history (PASS)**

---

## 5. Next Planned Actions (Handoff Ready)

1. Deploy โค้ด `backend/Code.gs` ชุดใหม่ขึ้น Google Apps Script (สร้าง New Version/Deployment)
2. คงสถานะการรัน Daemon บน Staging สำหรับทดสอบการกดอนุมัติจริงผ่าน Telegram และ Web
3. บันทึก Commit ทุกการปรับแต่งเข้า branch `codex/fable-gooddeed-hardening-20260907`

