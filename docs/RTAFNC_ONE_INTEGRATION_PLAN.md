# RTAFNC ONE — Clone-first Integration Plan

## Goal
นำระบบเดิมที่ใช้งานได้จริงมาเป็นฐาน โดยไม่ทำลาย Production และรวมเป็นแพลตฟอร์มเดียวที่ใช้ One Identity / One App Shell / Shared Core แต่แยก Domain Data ชัดเจน

## Baseline ที่ Clone มาใช้
ระบบบันทึกความดีเดิมเป็นฐานสำหรับ:
- Login / Session
- Role / RBAC
- Student Card / Dashboard patterns
- Approval flow
- Google Drive evidence
- Apps Script API bridge
- Audit / history patterns

## Shared Core ที่ต้องเสร็จก่อน
1. RTAFNC_ID / Identity Map
2. Role & Permission Service
3. App Shell / LIFF Router
4. Workflow Engine
5. Approval Engine
6. Notification Router (Telegram primary / LINE urgent)
7. Document Engine (Word/PDF/PNG)
8. Audit / Version / Reverse
9. Data Registry / Master Source Map
10. AI Agent Guardrails

## Domain Modules
### A. Good Deed
Reuse ระบบเดิมมากที่สุดและ refactor เฉพาะจุดที่จำเป็น

### B. Advisor
อษ.1–อษ.4, นัดพบ, บันทึกการพบ, follow-up, annual report

### C. Health / MindCare
เวชระเบียน 69, ไปโรงพยาบาล, ห้องพยาบาล, ยา, หัตถการ, วัคซีน, นัด, referral, mental-health escalation

### D. Scholarship
Prefill ประวัติ, GPAX, Good Deed hours, ที่อยู่, ทุนเดิม, Advisor opinion, บ้าน/แผนที่, Word/PDF

### E. Student Activity & Development
Activity master, calendar, clubs, sports, PDCA, attendance, budget, evaluation, risk, portfolio, report

### F. Welfare
สิทธิ์/สวัสดิการ, ของใช้, รองเท้า/เครื่องแต่งกาย, เงินช่วยเหลือ, ประวัติรับสิทธิ์

### G. Dormitory
อาคาร/ห้อง/เตียง, check-in/out, ย้ายห้อง, ตรวจห้อง, แจ้งซ่อม, incident

### H. Laundry
เครื่อง/สถานะ/คิว/จองเวลา/แจ้งเสีย

## Reliability Rules
- Production เดิมต้องไม่ถูกแก้จนกว่า Pilot ผ่าน test
- ทุกโมดูลแยก failure boundary: โมดูลหนึ่งล่มไม่ทำให้ทั้งระบบล่ม
- ห้าม browser ยิง Google Sheet/Drive โดยตรงเป็นจำนวนมาก
- ใช้ cache / bootstrap API / queue-outbox / retry
- secrets ห้ามอยู่ใน source
- health/advisor sensitive data แยก permission
- Telegram เป็น operations primary
- LINE ใช้ urgent/critical และ Flex Message ตาม policy
- AI ช่วย draft/search/report แต่ไม่เป็น emergency decision maker

## Brand Lock
- RTAFNC ONE
- Official RTAFNC logo ที่ผู้ใช้ยืนยันล่าสุดทุกหน้า/ทุกไฟล์
- Navy + Gold + White
- เอกสารราชการ: TH Sarabun New / TH Sarabun PSK
- LIFF header: RTAFNC ONE + วิทยาลัยพยาบาลทหารอากาศ

## Release Strategy
DEV/CLONE -> PILOT -> TEST -> UAT -> STAGED CUTOVER -> PRODUCTION

Rollback ทุกครั้งต้องทำได้โดยกลับไป Production เดิมโดยไม่สูญเสียข้อมูล
