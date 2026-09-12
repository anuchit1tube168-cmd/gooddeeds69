## สถานะล่าสุด — 12 กันยายน 2569

ตรวจ source ผ่าน 139 JavaScript + 23 Python = 162 รายการ แต่ยังไม่ผ่าน deployment และ E2E จริง งานเชื่อม session/สิทธิ์อาจารย์/ลายเซ็น และ writer ที่กู้คืนได้ยังต้องใช้แหล่ง private ที่ยืนยันแล้ว ดูตารางงานทั้งสี่ข้อใน [WORK_STATE](docs/WORK_STATE.md)

แก้เครื่องมือตรวจให้ตรง `/readiness` ของ gateway เดิมแล้ว เมื่อยืนยันว่าเป็น staging ของโครงการและตรวจ active version แล้ว ให้ใช้:

```bash
python3 scripts/verify_staging.py \
  --gas-url "$STAGING_GAS_URL" \
  --gas-service rtafnc-gooddeeds-legacy-gas \
  --cloudflare-health-url "$STAGING_WORKER_READINESS_URL" \
  --cloudflare-readiness
```

Worker URL ต้องลงท้าย path `/readiness` อย่างตรงตัว ตัวตรวจต้องพบ staging, auth/read/pilot ที่ตั้งค่าแล้ว และ production/submit/review/activation gates เป็น false แบบ boolean ทุกตัว จึงผ่าน ห้ามเปิด gates หรือเปลี่ยนค่าจริงเพื่อบังคับให้ตัวตรวจผ่าน ให้ตรวจสาเหตุเทียบกับ deployment ที่ถูกต้องก่อน รูปแบบ service ทั่วไปยังใช้ `--cloudflare-service` ได้ แต่ห้ามใช้สองรูปแบบพร้อมกัน

ผลสำเร็จเป็นเพียงคำตอบ readiness ที่ตรงสัญญา และยังระบุ `deploymentVerified: false` ไม่ได้พิสูจน์ว่า session ใช้ได้หรือบันทึก/อนุมัติจริงสำเร็จ ไม่ส่ง token หรือข้อมูลนักเรียนมาในแชต คง Production write = FALSE

---

## ต่อการจัดการข้อผิดพลาด — 11 กันยายน 2569

ผล local ล่าสุด **136 JavaScript + 17 Python = 153 รายการผ่าน**; ยังเป็น Draft และ Production write = FALSE

ฟังก์ชันอนุมัติ legacy คืน `review_failed` พร้อม Deed ID เมื่อยังไม่เริ่มเขียน และ `review_requires_reconciliation` เมื่อเริ่มเขียนแล้วไม่แน่ใจผลหรือพบ `approving` ให้ผู้ดูแลตรวจรายการเดิมและยอดจริงในแหล่ง private ห้าม reset สถานะหรือเพิ่มยอดซ้ำ การแก้นี้ไม่ได้สร้างระบบกู้คืนอัตโนมัติ และห้ามนำ writer 11 คอลัมน์ไปใช้กับ staging 8 คอลัมน์

แก้ JSON response ของ Python preview ให้มีความยาว UTF-8 ที่แน่นอนหลังพบ connection reset ตอนปฏิเสธ POST; API เขียนข้อมูลยังถูกปฏิเสธเหมือนเดิม

ตรวจ remote เดิมแล้ว แต่ยังไม่มีหลักฐาน active deployment/version ของ Apps Script/Cloudflare หรือแหล่ง assigned-reviewer/signature ที่เชื่อมได้จริง ไม่เปิดหน้าเดิมเพื่อเลี่ยงข้อจำกัด browser; student/admin/mobile/LIFF E2E ยัง BLOCKED ดูหลักฐานและขั้นต่อไปใน [WORK_STATE](docs/WORK_STATE.md)

---

## ต่อแผนตรวจอนุมัติ — 10 กันยายน 2569

รอบล่าสุดเพิ่มตัวตรวจเงื่อนไขฝั่งเซิร์ฟเวอร์ (ยังไม่เปิด API): ต้องมี session ปัจจุบัน สิทธิ์ดูแลนักเรียนตรงคน และหลักฐานลงนามส่วนตัวที่ตรงกับรายการ/คำตัดสิน/ข้อความ/ครั้งที่ส่ง ผลตรวจนี้ยังเขียนข้อมูลไม่ได้ ต้องเชื่อมแหล่งสิทธิ์และระบบยืนยันลายเซ็นจริงก่อน

แก้การตั้งค่าคอลัมน์ซ้อนกันและ Mission ID ซ้ำข้ามนักเรียนแล้ว ผล local 129 JavaScript + 16 Python = 145 รายการผ่าน ส่วนการทดสอบ LINE/Google/Telegram จริงและหน้าจอรอบใหม่ยังไม่ผ่านการตรวจยืนยัน ดูขั้นต่อไปใน `docs/WORK_STATE.md` และสัญญาตัวตรวจใน `docs/REVIEW_STORAGE_CONTRACT.md`

# Light Mission Control — 10 กันยายน 2569

ชุดล่าสุดต่อยอดหน้าจอเดิมเป็นภาพรวมภารกิจ, Radar, สถิติ, โปรไฟล์ และเมนู Sidebar/Bottom Navigation คู่มือหลักอยู่ใน [README](README.md), [UX](docs/GOOD_DEED_UX.md), [Architecture](docs/GOOD_DEED_ARCHITECTURE.md) และ [Test plan](docs/GOOD_DEED_TEST_PLAN.md)

ในโหมดสาธิต กด **+ บันทึกความดี** เพื่อเปิด Bottom Sheet กรอกข้อมูล เลือกไฟล์และวาดลายเส้นตัวอย่าง แบบร่างเก็บเฉพาะหน้านี้ เปิดต่อได้จาก “ภารกิจของฉัน” เมื่อโหลดหน้าใหม่ข้อมูลเริ่มใหม่ หลังส่งจะเห็น Mission ID และ Timeline รายการที่ถูกให้แก้ไขสามารถส่งใหม่โดยรักษาเหตุผลเดิม

มุมมองอาจารย์สาธิตเลือกหลายรายการได้ แต่ตรวจ ลงนาม และยืนยันทีละภารกิจ การเลือกคิวไม่อนุมัติอัตโนมัติ การแจ้งเตือนเป็นการจำลองเท่านั้น

ผลทดสอบ local ล่าสุด **131 รายการผ่าน** (115 JS + 16 Python) แต่ภาพหน้าจอวันที่ 9 กันยายนด้านล่างเป็นรุ่นก่อน การเปิดพรีวิวรอบใหม่ถูกระบบตรวจอนุมัติอัตโนมัติปฏิเสธ จึงยังไม่ยืนยันหน้าตา/console/มือถือ/LINE รุ่นใหม่นี้ และยังไม่เปิด production write

สำหรับ Antigravity/Gemini: อ่าน `AGENTS.md`, `SKILL.md`, `README.md` และหัวข้อแรกของ `docs/WORK_STATE.md` ต่อจาก Draft PR #4 เดิม ใช้ PLAN → REUSE → BUILD → TEST → FIX → DOCUMENT ห้ามนำโมเดลสาธิตไปต่อฐานจริงหรือเดาหมวด 6.2–6.9 เพื่อให้ดูเหมือนเสร็จ

---

## ประวัติรุ่นก่อน — ไม่ใช่ผลทดสอบ Mission Control ล่าสุด

# อัปเดตหน้าจอและ React — 9 กันยายน 2569

ปรับธีมขาว–กรมท่า–ทอง ใช้ตราวิทยาลัยเดิม ภาพเครื่องบินและมิติแบบเบา เพิ่มการ์ด React “ความตั้งใจของวันนี้” พร้อมข้อความให้กำลังใจสำหรับนักเรียนพยาบาล การกดเลือก/ให้กำลังใจไม่มีผลต่อชั่วโมงหรือผลประเมิน

เปิดหน้าตัวอย่างด้วย `node scripts/preview.cjs` แล้วเลือก “ทดลองใช้งานด้วยข้อมูลตัวอย่าง” ไม่ต้องติดตั้ง npm/clasp เลือกบทบาทในชุดสาธิตเพื่อทดลองส่งกิจกรรม แนบภาพ ลงนาม อนุมัติ/ไม่อนุมัติ และจำลองแจ้งเตือน ข้อมูลเก็บเฉพาะหน้านี้และเริ่มใหม่เมื่อโหลดหน้า ห้ามใช้ลายเซ็นจริงในการสาธิต

ทดสอบโค้ดผ่าน 100 เคส (JavaScript 88 + Python 12) และมีภาพตรวจหน้าจอ desktop/กรอบมือถือ 360 px แล้ว ขอบเขตและหลักฐานอยู่ใน [Design handoff](docs/DESIGN_HANDOFF.md) และ [Design QA](design-qa.md) React เป็นส่วนโต้ตอบที่เพิ่มเข้า pilot เดิม; ไม่ได้ย้ายระบบสิทธิ์หรือทะเบียนไปอยู่ใน React

**ยังไม่เปิดระบบจริงจากชุดนี้:** ต้องตรวจ deployment ของ Apps Script/Cloudflare สิทธิ์ผู้ตรวจ ลายเซ็นฝั่งเซิร์ฟเวอร์ หลักฐาน private และคิวแจ้งเตือนถาวรให้ครบก่อน การสาธิตผ่านไม่ใช่ผลทดสอบ LINE/Google Drive/Telegram จริง ไม่เปลี่ยนลิงก์ LIFF หรือเปิด write flag จากหน้านี้

---

> Current integration instructions (2026-09-09): see [Release review](docs/RELEASE_REVIEW_20260908.md) and [Review storage contract](docs/REVIEW_STORAGE_CONTRACT.md). Python serves static previews only. The gateway pilot requires a verified origin and explicit master/ledger header maps. The eight-column staging ledger has a tested internal review planner, but its write path remains disabled. Earlier pilot instructions below do not waive these gates.

# คู่มือระบบความดี วพอ. — ชุดปรับปรุงและส่งต่องาน

ปรับปรุง 9 กันยายน 2569 • สถานะ: Draft สำหรับตรวจและทดสอบ ยังไม่ใช่รุ่นเปิดใช้งานจริง

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
node --test tests/*.test.cjs
python3 -m unittest discover -s tests -p 'test_*.py' -v
```

เทสต์ใช้ข้อมูลสมมติและจำลอง Sheets/Telegram ไม่มีการส่งข้อความหรือเขียนข้อมูลนักเรียนจริง ไม่พิสูจน์การเชื่อม Apps Script deployment จริง

สำหรับดูหน้าจอ: ใช้ local static server ของ IDE แล้วเปิด `frontend/secure-pilot/index.html`. ตั้ง gateway origin ตามหัวข้อ Gateway pilot ด้านล่างหลังตรวจ deployment แล้ว ใช้บัญชีควบคุมของ staging เมื่อทดสอบการเข้าสู่ระบบ ไม่ใช้ `file://` สำหรับการทดสอบระบบ API

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
3. ปิดทางเรียก legacy API โดยไม่มี session: roster, bind_line, submit, approve, evidence. ชุดต่อเนื่องปิด raw API แล้วใน draft แต่ต้องปรับ frontend/gateway ก่อน deploy พร้อมกัน
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
| `ledger_schema_incompatible` | ตรวจว่าใช้ adapter ตรงกับโครงสร้าง 8 หรือ 11 คอลัมน์ | ปิด guard / ย้ายคอลัมน์ชีตจริงให้เทสต์ผ่าน |
| `submission_requires_reconciliation` | ใช้ deed ID ที่คืนมาเทียบแถวและหลักฐาน เพราะอาจบันทึกไปแล้ว | เปลี่ยนเป็น ID ใหม่แล้วส่งซ้ำทันที |
| หลักฐานเปิดไม่ได้ | สิทธิ์ evidence API และไฟล์ private | เปลี่ยนแชร์ Anyone with link |
| Gemini ทำซ้ำ/หยุด | WORK_STATE, error class, quota/permission กับ code failure | ลบงานหรือเริ่มระบบใหม่ |

## เงื่อนไขบังคับของระบบ (Non-negotiable Conditions)

รักษาข้อมูลและระบบเดิม; clean คือแยกเก็บไม่ลบ; Student Master กลางรหัส 7 หลัก; LINE/LIFF verification และ RBAC ฝั่งเซิร์ฟเวอร์; ข้อมูลสุขภาพแยกตามสิทธิ์; ข้อมูลหลักอยู่ private Drive/Sheets ผ่าน Apps Script; GitHub เก็บโค้ด; ทุกการเปลี่ยนต้องย้อนกลับได้. รายละเอียดอ้าง `AGENTS.md`.

## ตัวอ่าน Cloudflare ที่เพิ่มในชุดต่อเนื่อง

ติดตั้ง CloudflareReadAdapter.gs คู่กับ Code.gs เฉพาะสำเนา staging เพิ่ม Script Properties APP_ENV=staging และ CLOUDFLARE_CARD_ADAPTER_SECRET ให้ตรงกับ GOODDEED_CARD_ADAPTER_SECRET ของ gateway. คำขอใช้ HMAC v2 ตามตัวเชื่อมเดิม รองรับ cloudflareListSelf และ cloudflareCardSelf; ยังไม่รองรับส่งงาน/อนุมัติ/หลักฐาน. การกดหน้าเดิมจะถูกปฏิเสธเมื่อเรียก raw API จึงห้าม deploy backend ชุดนี้เดี่ยว ๆ. เทสต์ลายเซ็นใช้ crypto จริงกับ storage จำลอง ไม่ใช่ผลเชื่อมบริการจริง.

### การจับคู่ยอดทางการสำหรับ card

ตั้ง GOODDEED_MASTER_COLUMN_MAP เป็น JSON object ที่มี key: studentId, displayName, cohortLabel, totalHours, levelNumber, levelLabel, passed โดยแต่ละ value เป็นชื่อหัวคอลัมน์จริงที่ตรวจแล้วและไม่ซ้ำใน Student Master ของ staging ห้ามคัดลอกชื่อสมมติไปใช้จริงหรือสร้างระดับจากยอดเอง displayName/cohortLabel/levelLabel ต้องเป็นข้อความไม่ว่าง; levelNumber เป็นจำนวนเต็ม 1–10; totalHours เป็นตัวเลข 0–10000; passed รับ boolean หรือข้อความ ผ่านเกณฑ์ ✅ / ยังไม่ผ่าน ❌ ที่ตรงทุกตัวอักษร หาก schema จริงต่างจากนี้ให้ตรวจและปรับตัวแปลงพร้อมเทสต์ก่อนเปิดใช้งาน ไม่แก้ข้อมูลต้นทางอัตโนมัติ

ยอด card อ่านจาก master เพื่อรักษายอดยกมา ส่วน approvedCount/pendingCount นับเฉพาะรายการของผู้ใช้ที่ลงลายเซ็น ไม่ใช่ผลรับรองเกณฑ์รายปี ทดสอบจำลองรวม 24 เคสผ่าน; ยังไม่ได้ทดสอบเชื่อมบริการจริง

## Gateway pilot ที่เพิ่มในชุดล่าสุด

เปิด `frontend/secure-pilot/index.html` หลังตั้ง `GATEWAY_ORIGIN` ใน config.js ให้ตรงกับ Cloudflare staging ที่ตรวจแล้ว ส่วนหน้าเดิมใช้ `frontend/gateway-config.js` การตั้งว่างจะแสดงว่ายังไม่พร้อมและไม่ส่ง token ไปที่อื่น ห้ามตั้งจาก query string หรือ localStorage

ลำดับ: LINE ID token → gateway ตรวจ token → cookie session → ผูก Student Master ที่ยืนยันแล้ว → อ่าน card/list เฉพาะตนเอง ยอดรวมใช้ master ไม่รวมจากรายการบางส่วน เมื่อเซสชันหมดอายุให้ซ่อนข้อมูล; เมื่อ refresh ล้มเหลวให้แจ้งว่าอาจไม่เป็นปัจจุบัน

ตัวอย่าง schema อยู่ใน `docs/staging-columns.example.json`: serialize object แต่ละอันเป็นค่า Script Properties `GOODDEED_MASTER_COLUMN_MAP` และ `GOODDEED_LEDGER_COLUMN_MAP` ก่อนใช้ตรวจหัวคอลัมน์กับ staging อีกครั้ง รองรับชื่อแยกหลายช่องและระดับที่มีรูปแบบ `Lv.N label` จากต้นทาง ไม่คำนวณระดับเอง ถ้ารูปแบบไม่ตรงให้หยุดและตรวจข้อมูล

ทดสอบล่าสุด 9 กันยายน: JavaScript 78 + Python 11 = 89 เคสผ่าน พร้อม syntax checks ไม่ใช่ผลทดสอบบริการจริง

## การบันทึกและแผนอนุมัติที่เพิ่มล่าสุด

ตัวเขียน legacy ตรวจหัวคอลัมน์ก่อนเขียนหรืออัปโหลดหลักฐาน ไม่สร้างชีตว่างเมื่อไม่พบที่เก็บ ไม่รับรหัสรายการซ้ำ ตรวจวันที่/ชั่วโมง และเก็บข้อความที่ขึ้นต้นเหมือนสูตรเป็นข้อความ การแจ้งเตือนเกิดหลังบันทึกและ flush สำเร็จ; หากการส่งแจ้งเตือนล้มเหลว รายการที่บันทึกแล้วจะยังอยู่ แต่ยังไม่มี outbox ถาวรสำหรับส่งซ้ำ

`GoodDeedReviewPlan.gs` คำนวณรายการเซลล์ที่จะเปลี่ยนจากข้อมูลจำลอง/ข้อมูลที่ backend อ่านอย่างถูกสิทธิ์ รองรับตาราง staging 8 คอลัมน์ รักษาชั่วโมงยกมาและสูตร ไม่แก้ Grade/Level เอง และหยุดเมื่อข้อมูลหรือผลอนุมัติขัดแย้ง ผลลัพธ์ระบุ `executable: false` ทุกครั้ง ห้ามนำไปเขียนชีตโดยตรง ขั้นถัดไปต้องเชื่อมสิทธิ์อาจารย์ตามกลุ่ม ลายเซ็นสด เกณฑ์ทางการ และ journal/outbox ให้ครบก่อนเปิด review flag รายละเอียดอยู่ใน [Review storage contract](docs/REVIEW_STORAGE_CONTRACT.md)


## September 11 incoming patch and health observations

The legacy GAS callback defaults to `PRODUCTION_WRITE_DISABLED` unless the Script Property `PRODUCTION_WRITE_ENABLED` is exactly `true`. Keep it false: setting it true does not supply assigned scope, private signature or the missing storage integration. Existing properties remain `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` and `EVIDENCE_FOLDER_ID`. Do not rename deployment secrets to match the discarded partial-checkout patch. This gate covers the callback entrypoint, not all internal migration helpers.

Python remains a static preview with writes always false; no environment flag enables its API. A healthy preview must never count as a deployed Cloudflare gateway.

Only after independently confirming owned staging endpoints and their health contract, run:

```bash
python3 scripts/verify_staging.py \
  --gas-url "$STAGING_GAS_URL" \
  --cloudflare-health-url "$STAGING_WORKER_HEALTH_URL" \
  --gas-service "$EXPECTED_GAS_SERVICE" \
  --cloudflare-service "$EXPECTED_WORKER_SERVICE"
```

The legacy GAS source identifies itself as `rtafnc-gooddeeds-legacy-gas`. The Worker health path/service must come from its verified contract; neither is invented by this script. URLs must use HTTPS without credentials/query/fragment. Exit zero means two matching read-only health observations; deployment ownership, active code version, bindings, persistence and E2E remain unverified. Output is sanitized and explicitly sets `deploymentVerified: false`. A mismatch is a failed observation, not a reason to weaken the checks or deploy another backend.
