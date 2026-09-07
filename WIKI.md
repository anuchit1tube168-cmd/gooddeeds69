# คู่มือระบบความดี วพอ. — ชุดปรับปรุงและส่งต่องาน

วันที่ 7 กันยายน 2569 • สถานะ: Draft สำหรับตรวจและทดสอบ ยังไม่ใช่รุ่นเปิดใช้งานจริง

## ใช้กับ Antigravity / Gemini

เปิดโฟลเดอร์ repository `gooddeeds69` บน branch ของชุดนี้ ตรวจว่ามี `AGENTS.md`, `GEMINI.md`, `.agents/rules/rtafnc-gooddeed.md`, `.agents/skills/rtafnc-gooddeed-fable/SKILL.md` และ `docs/WORK_STATE.md` ครบ

ใน Antigravity เปิด Customizations → Rules ตรวจว่า workspace rule ของโครงการเปิดใช้งานแบบ Always On แล้วเริ่มด้วยข้อความ:

> อ่าน AGENTS.md และ docs/WORK_STATE.md ใช้สกิล rtafnc-gooddeed-fable ทำงานค้างลำดับสูงสุดต่อจาก commit ปัจจุบัน ตรวจของจริงก่อนแก้ ทำทีละงาน ทดสอบและบันทึกผล ห้ามเปลี่ยน production หรือข้อมูลนักเรียนจนกว่าจะผ่าน staging และได้รับอนุมัติ cutover

เมื่อโมเดลค้าง ให้เก็บ error และสถานะก่อนเปลี่ยนโมเดล แล้วใช้คำสั่งเดิมเพื่ออ่าน checkpoint ไม่ต้องเริ่มระบบใหม่ ไม่ต้องส่ง token ในแชต สกิลช่วยจัดวิธีทำงาน แต่ไม่เพิ่ม quota หรือรับประกันว่าโมเดลทำงานไม่หยุด

อ้างอิงโครงสร้างที่ตรวจจากเอกสารทางการ: [Antigravity Skills](https://antigravity.google/docs/skills/) และ [Workspace Rules](https://antigravity.google/docs/rules-workflows/). รุ่นปัจจุบันรองรับ `.agents/skills` / `.agents/rules`; รุ่นเก่ายังรองรับ `.agent/` ตามเอกสาร ให้ตรวจเวอร์ชัน IDE ก่อนปรับตำแหน่ง ไม่สร้างสำเนากติกาหลายชุดที่ขัดกัน

## ชุดนี้เปลี่ยนอะไร

| ส่วน | การเปลี่ยนแปลง | ผลกระทบก่อนเปิดใช้ |
| --- | --- | --- |
| Frontend เดิม | หยุดเรียก API/SSE ของ Python บน GitHub Pages, จำกัด retry, เอา tunnel ชั่วคราวออก | เส้นทาง Cloudflare ต้องใช้ adapter ของมันเอง |
| Telegram หน้าเว็บ | เอา token literal ออกและปิดการส่งตรงจาก browser แม้มี token ค้างใน settings | ต้องยืนยัน backend notification ก่อน merge; ยังไม่ได้ revoke token เก่า |
| อนุมัติ legacy | อ่านเจ้าของ/หมวด/ชั่วโมงจาก ledger, lock, กันซ้ำ/สถานะขัดแย้ง, ไม่รายงานสำเร็จเมื่อไม่พบข้อมูล | แถว `approving` ต้องตรวจกรณีเขียนข้ามชีตไม่ครบ |
| Telegram callback | อ่าน ID ที่มี `_` ถูกต้อง, ตรวจ webhook key + user allowlist + chat, แจ้งผลหลังบันทึก | webhook เก่าจะถูกปฏิเสธจนตั้ง key และ allowlist ถูกต้อง |
| Drive legacy | ไฟล์ใหม่เป็น private | thumbnail/link สาธารณะเดิมไม่ใช่วิธีดูไฟล์ใหม่ ต้องใช้ evidence API ที่ตรวจสิทธิ์ |
| v2 | ตรวจ half-hour, ผูก idempotency กับ member, กันการเปลี่ยนผลตรวจซ้ำ | การแก้ผลอนุมัติต้องมี workflow แยก |
| Pilot UI | เพิ่มแสงเงาและลำดับการอ่าน, ปุ่ม 44px, focus/reduced motion, แจ้งข้อมูลค้างเมื่อโหลดล้มเหลว | ยังไม่ได้ตรวจภาพหลังแก้ผ่านเบราว์เซอร์ เพราะ local preview ถูกบล็อก |

## ทดสอบในเครื่องพัฒนา

ใช้ Node.js ที่มีอยู่ ไม่ต้องติดตั้งแพ็กเกจเพิ่ม:

```sh
node scripts/check-syntax.cjs
node --test tests/regression.test.cjs
```

เทสต์ใช้ข้อมูลสมมติและจำลอง Sheets/Telegram ไม่มีการส่งข้อความหรือเขียนข้อมูลนักเรียนจริง ไม่พิสูจน์การเชื่อม Apps Script deployment จริง

สำหรับดูหน้าจอ: ใช้ local static server ของ IDE แล้วเปิด `frontend/secure-pilot/index.html`. โฟลเดอร์นี้ยังอ้าง backend ตาม config เดิม อย่ากรอกบัญชีจริงใน preview; จัด staging config ก่อนทดสอบการเข้าสู่ระบบ ไม่ใช้ `file://` สำหรับการทดสอบระบบ API

## ค่าหลังบ้านที่ต้องตั้งใน staging

เพิ่มใน Apps Script → Project Settings → Script Properties ไม่ใส่ค่าใน GitHub:

| Property | หน้าที่ |
| --- | --- |
| `SPREADSHEET_ID` | ชีต staging ที่ตรวจว่าเป็นสำเนาและมี schema ถูกต้อง |
| `EVIDENCE_FOLDER_ID` | โฟลเดอร์หลักฐาน staging แบบ private |
| `TELEGRAM_BOT_TOKEN` | token ใหม่ของบอททดสอบ/บอทที่หมุนแล้ว |
| `TELEGRAM_CHAT_ID` | ห้องที่อนุญาตทดสอบ |
| `TELEGRAM_APPROVER_IDS` | numeric user IDs ของผู้ตรวจ คั่นด้วย comma; ไม่ใช้ชื่อ display |
| `TELEGRAM_WEBHOOK_KEY` | random secret อย่างน้อย 32 อักขระ สำหรับ legacy callback |

Legacy callback ใช้ `webhookKey` query parameter เพราะ Apps Script handler ไม่ได้อ่าน Telegram secret header โดยตรง ห้ามบันทึก URL เต็มลงเอกสาร/log. ในเส้นทางสุดท้ายให้ Cloudflare ตรวจ secret header แล้วส่ง signed adapter request แทน อย่าเรียก setWebhook บนบอทจริงระหว่างทดสอบ เพราะจะเปลี่ยนปลายทางรับข้อความ

ไฟล์ Code.gs และ CodeV2.gs มี entrypoint ซ้ำกัน ต้องเลือกตาม Apps Script ที่กำลังใช้ ไม่คัดลอกทั้งสองทับกัน อย่ารัน setup หรือ migration จนยืนยัน project/sheet/backup

## งานก่อนพร้อมใช้จริง

1. ระบุ Apps Script project/deployment/version ที่รับงานปัจจุบัน และ Cloudflare deployment ให้ตรง Git commit
2. หมุน token ที่เคยเผย และเก็บค่าหลังบ้าน ตรวจสำเนา/ไฟล์ settings ที่อาจยังมี token; อย่าแก้ Git history โดยไม่มีแผนแยก
3. ปิดทางเรียก legacy API โดยไม่มี session: roster, bind_line, submit, approve, evidence. การแก้ callback ไม่ได้ปิดช่อง raw `approveDeed` ใน doPost
4. ใช้ gateway ที่ตรวจ LINE/RBAC ฝั่งเซิร์ฟเวอร์ รวมสิทธิ์อาจารย์เฉพาะกลุ่ม และ signed Apps Script adapter โดยรักษาหน้าเข้า LIFF เดิม
5. ตรวจ schema v2 เทียบ `Main_2569` / `Deeds_2569`, เกณฑ์ทั้ง 9 หมวดและภาคเรียน, ยอดยกมา 2568, รายการสะสม/ซ้ำ ก่อนใช้ยอดเป็นทางการ
6. สร้าง notification outbox ที่เก็บผลส่งและ retry ตาม event ID พร้อม audit ที่ไม่เผยข้อมูลเกินจำเป็น
7. ทดสอบบัญชีควบคุมบน staging: login → bind → ส่งงาน/หลักฐาน → refresh → อนุมัติ/ปฏิเสธ → ยอดอัปเดตครั้งเดียว → แจ้งเตือน → audit → rollback
8. ส่งหลักฐานให้เจ้าของอนุมัติ cutover จึงเปลี่ยน endpoint/deployment พร้อมเก็บทางกลับ

## ตารางแก้ปัญหา

| อาการ | ตรวจอะไร | ห้ามทำ |
| --- | --- | --- |
| โหลดหมุน/console reconnect | origin, เส้นทาง `/api/events`, deployment และ tunnel ที่หมดอายุ | retry ไม่จำกัด/สร้าง tunnel ใหม่โดยไม่ตรวจ auth |
| หน้าแสดง 0 | การโหลดสำเร็จหรือไม่, schema, จำนวนรายการ, ยอด official vs รายการที่โหลด | reset database หรือสร้างนักเรียนใหม่ |
| Telegram กดแล้วไม่เปลี่ยน | webhook key, numeric allowlist/chat, ID parsing, สถานะ ledger | เอาการตรวจสิทธิ์ออก |
| แถวค้าง `approving` | สำรองแถวและยอด master ก่อน ตรวจว่าเพิ่มยอดแล้วหรือยัง พร้อม audit | reset เป็น pending แล้วกดซ้ำ |
| หลักฐานเปิดไม่ได้ | สิทธิ์ evidence API และไฟล์ private | เปลี่ยนแชร์ Anyone with link |
| Gemini ทำซ้ำ/หยุด | WORK_STATE, error class, quota/permission กับ code failure | ลบงานหรือเริ่มระบบใหม่ |

## เงื่อนไขบังคับของระบบ (Non-negotiable Conditions)

รักษาข้อมูลและระบบเดิม; clean คือแยกเก็บไม่ลบ; Student Master กลางรหัส 7 หลัก; LINE/LIFF verification และ RBAC ฝั่งเซิร์ฟเวอร์; ข้อมูลสุขภาพแยกตามสิทธิ์; ข้อมูลหลักอยู่ private Drive/Sheets ผ่าน Apps Script; GitHub เก็บโค้ด; ทุกการเปลี่ยนต้องย้อนกลับได้. รายละเอียดอ้าง `AGENTS.md`.
