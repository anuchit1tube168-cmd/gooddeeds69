# ระบบบันทึกความดี
## วิทยาลัยพยาบาลทหารอากาศ กรมแพทย์ทหารอากาศ ปีการศึกษา 2569

---

## 🚀 วิธีเปิดใช้งาน (Offline Mode)

1. เปิดโฟลเดอร์ `frontend/`
2. ดับเบิลคลิก **`index.html`** เพื่อเปิดในบราวเซอร์  
   (หรือรันด้วย Live Server / python -m http.server)
3. เข้าสู่ระบบได้เลย!

---

## 🔑 บัญชีทดสอบ

### นักเรียน
- **รหัสนักเรียน**: รหัสนักเรียน 7 หลัก เช่น `6900001`
- **รหัสผ่าน**: เท่ากับรหัสนักเรียน (เช่น `6900001`)

### อาจารย์ / Admin
| ชื่อผู้ใช้ | รหัสผ่าน | บทบาท |
|-----------|---------|-------|
| `admin` | `admin69` | ผู้ดูแลระบบ (เข้าได้ทุกเมนูรวม settings) |
| `teacher` | `teacher69` | อาจารย์ |

---

## 📁 โครงสร้างไฟล์
```
ระบบบันทึกความดี/
├── frontend/
│   ├── index.html              ← หน้า Login
│   ├── student-dashboard.html  ← Dashboard นักเรียน
│   ├── submit-deed.html        ← บันทึกความดีใหม่
│   ├── history.html            ← ประวัติความดี
│   ├── ranking.html            ← จัดอันดับ & สถิติ (ทุก role)
│   ├── teacher-dashboard.html  ← Dashboard อาจารย์
│   ├── profile.html            ← โปรไฟล์ / เปลี่ยนรหัสผ่าน
│   ├── settings.html           ← ตั้งค่าระบบ (admin only)
│   ├── style.css               ← Design System
│   └── app.js                  ← Core Logic
├── backend/
│   └── Code.gs                 ← Google Apps Script (ออนไลน์ optional)
└── data/
    ├── students.json           ← รายชื่อนักเรียน (JSON ต้นทาง)
    ├── students_data.js        ← ข้อมูลรายชื่อ (ใช้ใน Frontend)
    ├── students_photos.js      ← รูปโปรไฟล์ base64 (สร้างจาก import_photos.py)
    ├── deeds_data.js           ← ข้อมูลความดีที่นำเข้า
    ├── import_photos.py        ← จับคู่รูปภาพจากโฟลเดอร์กับรายชื่อ Excel
    └── export_students.py      ← Script สร้าง students_data.js จาก Excel
```

---

## ✅ ฟีเจอร์ที่มี

| ฟีเจอร์ | สถานะ |
|---------|-------|
| Login ตามรหัสนักเรียน | ✅ |
| Login อาจารย์ (พร้อมอนุมัติ) | ✅ |
| บันทึกความดีพร้อมรูปภาพ | ✅ |
| 9 หมวดหมู่ความดี | ✅ |
| อาจารย์อนุมัติ/ปฏิเสธ | ✅ |
| ดูรายบุคคล (นักเรียน+อาจารย์) | ✅ |
| ดูตามเกณฑ์ (ผ่าน/ไม่ผ่าน) | ✅ |
| กรองตามชั้นปี / หมวดหมู่ | ✅ |
| พิมพ์รายงานความดี (PDF) | ✅ |
| จัดอันดับทำเนียบความดี | ✅ |
| สถิติภาพรวมรายชั้นปี | ✅ |
| ผูก Email / แจ้งเตือน Telegram | ✅ |
| ค้นหา/กรองข้อมูล | ✅ |
| รูปโปรไฟล์จากระบบ (base64) | ✅ |
| ลบรายการที่ถูกปฏิเสธ (นักเรียน) | ✅ |

---

## ☁️ วิธี Deploy ขึ้น Google Apps Script (Online)

1. เปิด [script.google.com](https://script.google.com/) → สร้างโปรเจกต์ใหม่
2. Copy โค้ดจาก `backend/Code.gs` ไปวาง
3. สร้าง Google Sheets ใหม่ → copy **Spreadsheet ID** จาก URL
4. แก้ `SPREADSHEET_ID` ใน Code.gs
5. รัน function `setupSpreadsheet()` เพื่อสร้าง sheets
6. Deploy → New Deployment → Web App → Execute as: Me, Access: Anyone → Deploy
7. Copy Web App URL ไปใส่ใน `settings.html` → บันทึก

---

## 💬 ตั้งค่า Telegram Bot

1. เปิด Telegram → ค้นหา **@BotFather**
2. พิมพ์ `/newbot` → ตั้งชื่อ → รับ **Token**
3. เปิด settings.html → ใส่ Token + Chat ID ของอาจารย์
4. กด "ทดสอบการแจ้งเตือน"

---

## 🖼️ วิธีนำเข้ารูปโปรไฟล์

```bash
pip install openpyxl
python3 data/import_photos.py
```
สคริปต์จะจับคู่รูปจากโฟลเดอร์รูปกับรายชื่อใน Excel  
แล้วสร้างไฟล์ `data/students_photos.js` สำหรับใช้ใน frontend

---

## 📊 ข้อมูลนักเรียน
รายชื่อจาก Excel ปีการศึกษา 2568/2569:
- **ชั้นปีที่ 1 (SWD68)**: รุ่น 68
- **ชั้นปีที่ 2 (SWD67)**: รุ่น 67
- **ชั้นปีที่ 3 (SWD66)**: รุ่น 66
- **ชั้นปีที่ 4 (SWD65)**: รุ่น 65
- **ศิษย์เก่า (SWD64)**: รุ่น 64


---

## 🚀 วิธีเปิดใช้งาน (Offline Mode)

1. เปิดโฟลเดอร์ `frontend/`
2. ดับเบิลคลิก **`index.html`** เพื่อเปิดในบราวเซอร์
3. เข้าสู่ระบบได้เลย!

---

## 🔑 บัญชีทดสอบ

### นักเรียน
- **รหัสนักเรียน**: รหัสนักเรียน 7 หลัก เช่น `6900001`
- **รหัสผ่าน**: เท่ากับรหัสนักเรียน (เช่น `6900001`)

### อาจารย์ / Admin
| ชื่อผู้ใช้ | รหัสผ่าน | บทบาท |
|-----------|---------|-------|
| `admin` | `admin69` | ผู้ดูแลระบบ |
| `teacher` | `teacher69` | อาจารย์ |

---

## 📁 โครงสร้างไฟล์
```
ระบบบันทึกความดี/
├── frontend/
│   ├── index.html              ← หน้า Login
│   ├── student-dashboard.html  ← Dashboard นักเรียน
│   ├── submit-deed.html        ← บันทึกความดีใหม่
│   ├── history.html            ← ประวัติความดี
│   ├── teacher-dashboard.html  ← Dashboard อาจารย์
│   ├── profile.html            ← โปรไฟล์ / เปลี่ยนรหัสผ่าน
│   ├── settings.html           ← ตั้งค่าระบบ (Telegram, เกณฑ์)
│   ├── style.css               ← Design System
│   └── app.js                  ← Core Logic
├── backend/
│   └── Code.gs                 ← Google Apps Script (ออนไลน์)
└── data/
    ├── students.json           ← รายชื่อนักเรียน 311 คน
    ├── students_data.js        ← ข้อมูลรายชื่อ (ใช้ใน Frontend)
    └── export_students.py      ← Script สร้าง data จาก Excel
```

---

## ✅ ฟีเจอร์ที่มี

| ฟีเจอร์ | สถานะ |
|---------|-------|
| Login ตามรหัสนักเรียน | ✅ |
| Login อาจารย์ (พร้อมอนุมัติ) | ✅ |
| บันทึกความดีพร้อมรูปภาพ | ✅ |
| 9 หมวดหมู่ความดี | ✅ |
| อาจารย์อนุมัติ/ปฏิเสธ | ✅ |
| ดูรายบุคคล (นักเรียน+อาจารย์) | ✅ |
| ดูตามเกณฑ์ (ผ่าน/ไม่ผ่าน) | ✅ |
| พิมพ์รายงานความดี (PDF) | ✅ |
| ผูก Email | ✅ |
| แจ้งเตือน Telegram | ✅ |
| ค้นหา/กรองข้อมูล | ✅ |
| สถิติภาพรวมรายชั้นปี | ✅ |

---

## ☁️ วิธี Deploy ขึ้น Google Apps Script (Online)

1. เปิด [script.google.com](https://script.google.com/) → สร้างโปรเจกต์ใหม่
2. Copy โค้ดจาก `backend/Code.gs` ไปวาง
3. สร้าง Google Sheets ใหม่ → copy **Spreadsheet ID** จาก URL
4. แก้ `SPREADSHEET_ID` ใน Code.gs
5. รัน function `setupSpreadsheet()` เพื่อสร้าง sheets
6. Deploy → New Deployment → Web App → Execute as: Me, Access: Anyone → Deploy
7. Copy Web App URL ไปใส่ใน `settings.html` → บันทึก

---

## 💬 ตั้งค่า Telegram Bot

1. เปิด Telegram → ค้นหา **@BotFather**
2. พิมพ์ `/newbot` → ตั้งชื่อ → รับ **Token**
3. เปิด settings.html → ใส่ Token + Chat ID ของอาจารย์
4. กด "ทดสอบการแจ้งเตือน"

---

## 📊 ข้อมูลนักเรียน
รายชื่อจาก Excel มีทั้งหมด **311 คน** ใน 5 ชั้นปี:
- **SWD68** (ชั้นปี 1): 64 คน
- **SWD67** (ชั้นปี 2): 61 คน  
- **SWD66** (ชั้นปี 3): 63 คน
- **SWD65** (ชั้นปี 4): 63 คน
- **SWD64** (รุ่นเก่า): 60 คน
