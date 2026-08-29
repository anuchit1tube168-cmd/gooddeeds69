# RTAFNC ONE — Brand & Clone Lock

สถานะ: LOCKED

## 1. ชื่อระบบกลาง
- RTAFNC ONE
- ชื่อหน่วยงานเต็มที่แสดงในเอกสาร: วิทยาลัยพยาบาลทหารอากาศ กรมแพทย์ทหารอากาศ

## 2. ฟอนต์
- เอกสารราชการ: TH Sarabun New / TH Sarabun PSK เป็นมาตรฐานหลัก
- หน้าเว็บ/LIFF: ใช้ฟอนต์ไทยที่อ่านง่ายและสอดคล้องกับดีไซน์เดิม โดยไม่กระทบความเร็ว

## 3. Header / Branding
- หน้า LIFF / Web App ใช้ชื่อ RTAFNC ONE + วิทยาลัยพยาบาลทหารอากาศ
- เอกสารราชการใช้ชื่อหน่วยงานเต็ม

## 4. Logo Master
- ใช้โลโก้ วิทยาลัยพยาบาลทหารอากาศ ที่ผู้ใช้ยืนยันล่าสุดเป็น Official Master Logo เพียงชุดเดียว
- ใช้ทุก Web / LIFF / Word / PDF / PNG / Flex mockup / Telegram document preview / Report
- ห้ามสร้างตราใหม่ ห้ามเปลี่ยนข้อความในตรา ห้ามใช้โลโก้อื่นปน
- Asset target path: `assets/brand/rtafnc-official-logo.png`

## 5. Color System
- Navy Blue
- Gold
- White
- ใช้เป็น Design Token กลางทุกโมดูล

## Clone-first Rule
1. ห้ามรื้อ Production ที่ใช้งานได้
2. ใช้ระบบบันทึกความดีเดิมเป็น Technical Baseline สำหรับ Login, Session, RBAC, Cards, Approval, Drive, Apps Script
3. พัฒนาใน branch `rtafnc-one-integration` ก่อน
4. Reuse ฟังก์ชันเดิมที่ทดสอบแล้วก่อนเขียนใหม่
5. แยก Domain Data ไม่ให้ Health / Advisor / Scholarship / Welfare / Dorm / Activity ปนกัน
6. ทุกโมดูลต้องอ้างอิง One Identity / RTAFNC_ID
7. Merge เข้า Production เฉพาะส่วนที่ผ่าน test และ rollback ได้

## Module Integration Order
1. Core Identity / Role / App Shell
2. Good Deed (baseline)
3. Advisor
4. Health / MindCare
5. Scholarship
6. Student Activity & Development
7. Welfare
8. Dormitory
9. Laundry
10. Document / Report / Notification / AI Agent integration
