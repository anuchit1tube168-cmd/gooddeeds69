# RTAFNC Good Deed — Light Mission Control

ระบบบันทึกความดี นักเรียนพยาบาลทหารอากาศ วิทยาลัยพยาบาลทหารอากาศ กรมแพทย์ทหารอากาศ

**สถานะ 10 กันยายน 2569: DRAFT / PRODUCTION WRITE = FALSE**

พัฒนาต่อใน repository และ Draft PR #4 เดิม ไม่เปลี่ยนฐานข้อมูล ไม่เปลี่ยนลิงก์ LIFF และยังไม่ Deploy ชุดนี้เข้าสู่ production

## เริ่มอ่าน / ทำงานต่อ

อ่าน `AGENTS.md` → `SKILL.md` → `docs/WORK_STATE.md` แล้วตรวจ source ที่เกี่ยวข้อง ใช้ **PLAN → REUSE → BUILD → TEST → FIX → DOCUMENT** ก่อนเปิดงานใหม่ ตรวจ branch และการแก้ไขของเจ้าของทุกครั้ง

| เอกสาร | ใช้ทำอะไร |
| --- | --- |
| [UX](docs/GOOD_DEED_UX.md) | หน้าจอ Light Mission Control, สถานะ, ขอบเขตตัวเลข และส่วนที่ยังขาด |
| [Architecture](docs/GOOD_DEED_ARCHITECTURE.md) | สัญญา API/Sheets/Drive/auth ที่ตรวจพบและขอบเขตการนำกลับมาใช้ |
| [Test plan](docs/GOOD_DEED_TEST_PLAN.md) | ผลทดสอบจริง แผน staging และเงื่อนไขเปิดระบบ |
| [Storage contract](docs/REVIEW_STORAGE_CONTRACT.md) | ข้อแตกต่าง ledger 8/11 คอลัมน์ และกติกาการเขียนชั่วโมง |
| [Wiki](WIKI.md) | วิธีทดลองและส่งต่องานให้ Antigravity/Gemini |
| [Changelog](CHANGELOG.md) | การเปลี่ยนแปลงในชุดนี้ |

## ทดลองโดยไม่ติดตั้งโปรแกรมเพิ่ม

ใช้ Node.js และ Python ที่มีอยู่แล้ว ไม่ต้องติดตั้ง npm/clasp หรือฐานข้อมูลใหม่

```bash
node scripts/preview.cjs
```

ตัว preview เปิดเฉพาะไฟล์สาธารณะที่อนุญาตไว้ใน pilot หน้าล็อกอินมีปุ่ม **ทดลองใช้งานด้วยข้อมูลตัวอย่าง** ซึ่งเปิด `frontend/secure-pilot/demo.html` ใช้ข้อมูลสมมติและลายเส้นตัวอย่างเท่านั้น

ชุดสาธิตเก็บแบบร่าง หลักฐาน และประวัติในหน่วยความจำของหน้านี้ เมื่อโหลดหน้าใหม่ข้อมูลจะเริ่มใหม่ ไม่มีการส่งไป Google Drive, LINE หรือ Telegram; CSP ใช้ `connect-src 'none'` การกดบทบาทอาจารย์เป็นเพียงการสาธิต ไม่ใช่สิทธิ์เข้าระบบ

การเปิดพรีวิวรอบ Mission Control ใน browser ของเซสชันพัฒนานี้ถูกระบบตรวจอนุมัติอัตโนมัติปฏิเสธ จึงยังไม่มีผลตรวจภาพหรือ console รอบใหม่ ภาพวันที่ 9 กันยายนใน `docs/design/` เป็นหลักฐานของหน้าตารุ่นก่อนเท่านั้น

## สิ่งที่ลง source แล้ว

- Shell โทนสว่าง Sidebar / Bottom Navigation, ตราวิทยาลัยเดิม เครื่องบินเดิม และมิติ CSS แบบเบา
- React Dashboard, KPI 6 ช่อง, Radar เลือกหมวด, สถิติ 6 เดือน, เป้าหมายเมื่อมีข้อมูลยืนยัน และโปรไฟล์จากบัญชีเดิม
- ชุดสาธิต: Bottom Sheet, แบบร่างอัตโนมัติในหน้านี้, ตรวจชนิด/หัวไฟล์, ย่อภาพตัวอย่างเมื่อ browser รองรับ, ลายเส้นผู้บันทึก, Mission ID, การ์ด/Timeline, แก้ไขและส่งใหม่พร้อมรักษาประวัติ
- ชุดสาธิตอาจารย์: กรองชั้นปี/นักเรียน/หมวด/เดือน/สถานะ เลือกหลายรายการแล้วตรวจทีละรายการ ลงนามใหม่และยืนยันผลรายครั้ง จำลองการแจ้งเตือนล้มเหลว/ส่งซ้ำ
- ขอบเขต API จริงยังเป็น session และ self card/list เดิม ไม่มีการนำโมเดลสาธิตมาเป็น backend

## ข้อมูลที่ยังต้องยืนยัน

หมวดที่ตรวจพบในทะเบียนเป็น ID **1–9**; ยังไม่มีตารางเทียบกับข้อ **6.2–6.9** ที่ยืนยันได้ จึงคง ID/ชื่อเดิมทุกหมวด เป้าหมายประจำปีและช่วงปีการศึกษาต้องมาจากข้อมูลทางการ ไม่ใช้ยอดสะสมตลอดการเรียนแทนยอดในปีนั้น รูปนักเรียนยังไม่มี API ที่ตรวจสิทธิ์แล้วในสัญญาปัจจุบัน จึงแสดงอักษรชื่อแทนโดยไม่สร้างภาพบุคคลสมมติ

ยังต้องยืนยัน deployment ของ Apps Script/Cloudflare, assigned scope, หลักฐาน/ลายเซ็น private, draft/edit/resubmit API, policy รายปี/เทอม, journal/outbox, credential rotation และ backup/restore ก่อนทดสอบ staging ครบวงจรแล้วขออนุมัติ cutover

คำแนะนำ offline login, รหัสผ่านตัวอย่าง, การใส่ token ใน settings และการสร้าง/Deploy Apps Script แบบสาธารณะใน README รุ่นเก่า **ถูกแทนที่ด้วยคู่มือฉบับนี้** ไม่ใช้เป็นขั้นตอนเปิดระบบปัจจุบัน

## ทดสอบ

```bash
node scripts/check-syntax.cjs
node --test tests/*.test.cjs
python3 -m unittest discover -s tests -p 'test_*.py' -v
```

ผล local ชุดนี้: syntax ผ่าน, JavaScript **129/129**, Python **16/16** รวม **145** รายการ ใช้ข้อมูลสมมติ/transport doubles ไม่ใช่ผล LINE/Google/Telegram จริง ดูขอบเขตและสิ่งที่ยัง BLOCKED ใน test plan ตรวจ PII ด้วยกฎเดิมก่อน commit เสมอ

## เงื่อนไขบังคับของระบบ (Non-negotiable Conditions)

รักษาข้อมูล หลักฐาน ลายเซ็น LINE bindings และยอดอนุมัติ/ยกมาเดิม Clean คือแยกจัดระเบียบ ไม่ลบ Student Master เป็นแหล่งตัวตนกลาง; ตรวจ LINE/LIFF, RBAC และขอบเขตผู้ตรวจฝั่งเซิร์ฟเวอร์ Google Sheets/Drive ผ่าน Apps Script เป็นแหล่งข้อมูลธุรกิจ ห้ามใส่ข้อมูลบุคคล/สุขภาพหรือ secret ลง GitHub ไม่มี production write, เปลี่ยน schema, เปลี่ยน endpoint หรือ cutover จากผลทดสอบสาธิต
