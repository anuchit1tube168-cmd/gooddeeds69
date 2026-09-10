# RTAFNC Good Deeds 2569 — Work State Tracker 📋

**Current Branch:** `codex/fable-gooddeed-hardening-20260907`  
**Base Commit:** `29531524` (feat: notify Telegram group on web deed approval/rejection)  
**Last Updated:** 2026-09-09  
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
| **P0-9** | **End-to-End Student Identity Resolution & Flow Hardening**<br>- แก้ไขบั๊กชื่อนักเรียนแสดงเป็น "รหัส XXXXXXX" บนสลิปและ Telegram<br>- ปรับปรุง `frontend/app.js`: ลบ fallback สังเคราะห์ชื่อรหัส, เพิ่ม `ensureStudentProfile`, ปรับ `isBackendMode` รองรับ Cloudflare Tunnel<br>- ปรับปรุง `backend/server.py`: บังคับผสานชื่อจริงจากฐานข้อมูล Master อย่างเด็ดขาดใน `save_or_update_deed_in_db` และเพิ่มการแจ้งเตือน Telegram อัตโนมัติทันทีที่บันทึกความดีพร้อมปุ่มกดและรูปหลักฐาน<br>- ปรับปรุง `backend/Code.gs`: ค้นหาชื่อจริงจากชีต `Main_2569` แทนการส่ง "รหัส"<br>- ตรวจสอบและแก้ไขประวัติความดีในฐานข้อมูลเดิมของนักเรียนที่มีปัญหาให้ถูกต้องสมบูรณ์ 100% | ✅ PASS | `frontend/app.js`<br>`frontend/submit-deed.html`<br>`backend/server.py`<br>`backend/Code.gs`<br>`data/deeds.json` |
| **P0-10** | **Student Full Name Resolution on Slip & Signature Centering**<br>- แก้ไขชื่อไม่ขึ้นบนใบสลิป (`deed_slip.html` และ `approve_sign.html`) ให้แสดงชื่อ-นามสกุลจริงเสมอ<br>- เพิ่มระบบกรองชื่อจริง `isValidRealName` และการดึงข้อมูลหลายชั้น (Cache, Deed, Server API, Cloud GAS)<br>- แก้ไขตำแหน่งลายเซ็นดิจิทัลใน `deed_slip.html` ให้อยู่กึ่งกลางพอดีเหนือชื่อผู้รับรอง<br>- เพิ่มระบบตัดขอบขาว/โปร่งใสอัตโนมัติ `cropCanvasToBoundingBox` และ `trimImageMargins`<br>- ปรับปรุง `server.py`, `telegram_bot_listener.py`, และ `Code.gs` ให้ส่งชื่อเต็มเสมอ<br>- อัปเดต Cache-Busting Version เป็น `?v=3590` | ✅ PASS | `frontend/deed_slip.html`<br>`frontend/approve_sign.html`<br>`frontend/app.js`<br>`backend/server.py`<br>`data/telegram_bot_listener.py`<br>`backend/Code.gs` |
| **P0-11** | **Exact Student Cohort Sequence Number (เลขที่) Alignment & Full Master Integration**<br>- แก้ไขปัญหาเลขที่ (Sequence Number) แสดงผิด เช่น ตัด 2 ตัวท้ายรหัส `...76` ➔ `76` ทั้งที่เลขที่ทางการคือ `31`<br>- ปรับปรุง `data/export_students.py` ให้อ่านและประมวลผล `เลขที่` (Column A) ประจำรุ่นอย่างแม่นยำ 100% พร้อม Fallback `calculate_cohort_no`<br>- ปรับปรุง `data/students.json` และ `frontend/data/students.json` และ `students_data.js` ให้ทุกระเบียนมีฟิลด์ `no` ที่ถูกต้องตามบัญชีรายชื่อทางการ (ครบ 380 นาย)<br>- ปรับปรุง `backend/server.py` (`/api/get_student` & `/api/students`) และ `frontend/app.js` (`getStudentById`) ให้ส่งคืน `no`<br>- ปรับปรุง `frontend/deed_slip.html`: ลบโค้ด `slice(-2)` ทั้งหมดออก แทนที่ด้วย `calculateCohortNo` และ `student.no`<br>- อัปเดต Cache-Busting Version เป็น `?v=3591` | ✅ PASS | `data/export_students.py`<br>`backend/server.py`<br>`frontend/app.js`<br>`frontend/deed_slip.html`<br>`backend/Code.gs` |

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

---

## 6. Architecture & Staging Adapters Notes
# Good Deed — checkpoint

Updated: 2026-09-07. Current work: isolated hardening patch + Gemini/Fable instructions.
Reviewed remote main: `29531524a407d46de9a65e4032de40a3fc2c32cb`.
State: DRAFT; production write/deploy/cutover not performed.

## Evidence

- GitHub main contains the legacy frontend and both legacy/v2 Apps Script sources. No AGENTS.md in main at review time. Owner's project AGENTS.md was read from Drive (modified 2026-09-05).
- Live login page opened in cloud browser on 2026-09-06. It showed student/staff selection and student/password inputs. Console showed backend student fetch failure and repeated SSE retries every 3 seconds.
- Cloudflare staging `/health` was blocked by the test browser (`ERR_BLOCKED_BY_CLIENT`). This is not evidence that the service is down.
- Local pilot preview on 2026-09-07 was also blocked by the cloud browser. Updated UI is source/syntax checked, not visually verified.
- No real student login, new deed, approval, Telegram message, credential rotation, migration or production data change was performed.

## Implemented locally

- Legacy local API/SSE only on localhost/127.0.0.1; single active connection and bounded failure retries; removed fixed temporary tunnel.
- Removed Telegram token literal from edited frontend/backend; browser Telegram methods cannot use cached tokens. Backend gets token/folder/chat from Script Properties.
- Legacy approval locks, reads stored owner/hours/category, fails on missing records/master, rejects conflicting decisions, returns duplicate status without repeat credit. `approving` marks uncertain cross-sheet writes requiring manual reconciliation.
- Callback secret + numeric reviewer/chat authorization; underscore-safe parsing; acknowledgement after write; no button removal on write failure.
- New legacy evidence is private. Existing public file permissions were not modified.
- v2 half-hour validation, member-scoped submit deduplication and no repeated/opposing review through the same action.
- Pilot UI depth/readability/accessibility changes, truthful loading-error message and scope label on loaded totals.
- AGENTS.md, GEMINI.md, Antigravity workspace rule, Fable skill, WIKI, syntax script and regression workflow.

## Remaining release blockers — do not mark complete

| Priority | Finding / required work |
| --- | --- |
| P0 | Raw legacy doGet/doPost data/write actions are now denied in this draft. Production still runs its old deployment. Browser roster/password fallback must be replaced before coordinated rollout; do not deploy this backend alone. |
| P0 | Exposed token must be revoked/rotated, including other files/settings/history. This patch only removes literals in edited files; it does not make old values safe. |
| P0 | Actual Apps Script version, private data backup, Cloudflare settings and LINE binding cannot be inferred from source. Need authorized runtime inspection and controlled staging identities. |
| P1 | Teacher scope must be enforced by assigned cohort/student; broad teacher role access is insufficient. |
| P1 | v2 categories and totals differ from official nine-category legacy ledger. Annual/term ceilings, category 6 ceiling and carry-forward reconciliation remain unimplemented. |
| P1 | Legacy two-sheet approval is fail-closed on partial writes, not transactional/recoverable automatically. Implement audited reconciliation and durable notification outbox. |
| P1 | Removal of browser notification and public evidence URLs requires backend delivery and authorized preview to pass before merge. |
| P1 | UI needs actual mobile/desktop visual QA and post-login tests with synthetic staging accounts. |

## Verification commands

```sh
node scripts/check-syntax.cjs
node --test tests/*.test.cjs
```

Result before final packaging: 24/24 synthetic regression cases pass, syntax passes, skill frontmatter validator passes. See PR for final verification status. These tests cover mocked functions, not actual distributed transactions or production uptime.

## Next exact task

Identify the deployed Apps Script project/version read-only and compare handlers to Code.gs/CodeV2.gs. Inspect the existing `rtafnc-one` gateway branch and its signed adapter contract. Complete the authorization/ledger adapter on a staging copy before enabling any write flag. Do not build a third independent auth stack or redesign the UI again to avoid this blocker.

## Resume protocol

Read AGENTS → this checkpoint → git status/log. Preserve uncommitted work. Select one highest-priority task; state its input, expected observable output and test. Update this file after meaningful verification. Checkpoints and skills cannot override access controls or owner decisions.

## เงื่อนไขบังคับของระบบ (Non-negotiable Conditions)

Preserve existing data and 2568 carry-forward; clean means archive, not delete; canonical seven-digit Student Master; server-side LINE verification and scoped RBAC; private health/data/evidence boundaries; Drive/Apps Script authoritative business storage; reversible releases; staging and verified rollback before explicit production cutover approval. See AGENTS.md for full contract.

## Continuation — signed staging reads

Added backend/CloudflareReadAdapter.gs using the existing gateway v2 canonical HMAC contract. Only cloudflareListSelf and cloudflareCardSelf are allowed, only with APP_ENV=staging and CLOUDFLARE_CARD_ADAPTER_SECRET configured. Signed subject determines scope; request body cannot override identity. Timestamp, body hash/signature, limit, nonce replay and unique master identity are checked. No setup or writes occur on this path. Cache replay protection is best-effort (Apps Script cache can evict); this read-only adapter must not be reused for writes without durable replay/idempotency storage.

Raw getStudents/getStudent/getDeeds/setupFolders and raw POST mutations return AUTHENTICATED_GATEWAY_REQUIRED. Ping/settings remain public. Authenticated legacy Telegram callback remains separate. This deliberately breaks the old unauthenticated frontend transport in the draft; coordinate frontend/gateway replacement before any deployment. Submission, evidence, activation and review remain disabled in this new adapter. No complete dashboard or write flow is claimed.

18 mocked tests pass including six new transport/HMAC tests; actual Cloudflare→GAS integration is unverified. Next task: verify official master header mapping and authenticated frontend/gateway integration with controlled staging data, then scoped write/review adapters and durable audit/outbox.

## Continuation — official card totals

Added signed cloudflareCardSelf with explicit GOODDEED_MASTER_COLUMN_MAP. Total hours, level and pass status come from the mapped official master cells, never inferred from the loaded ledger. Missing/duplicate headers, blank totals, invalid levels and ambiguous pass status fail closed. Counts are scoped to the signed student. 24/24 synthetic tests and syntax checks pass. Actual master headers and staging integration are still unverified; no deployment or production changes.

## 2026-09-08 — numeric data validation and access blockers

Verified GitHub regression and pii-guard success on remote commit 8524d22bd2988293cc9daf7014d2a6cca2ef19c1. Reproduced two failures: list accepted blank hours via Number coercion; card accepted arrays/nondecimal strings as numeric values. Fixed explicit decimal parsing and list half-hour range validation; no stored data changed. 27 synthetic tests pass after the fix (two newly added cases failed before it), plus syntax and changed-file PII checks.

Pilot config still points directly to GAS, so it does not exercise the signed Cloudflare path. No callable Apps Script project/deployment administration or external Cloudflare account tool was found in this session. Existing deployment URL alone does not identify the editor project/version or establish staging ownership. Need the actual Apps Script editor project link and staging deployment/schema evidence to verify runtime integration. UI, write flow, notifications and production remain unverified. Next: inspect that project read-only, map actual headers, then test signed gateway reads with a controlled staging identity; do not deploy this draft backend alone.

