# Light Mission Control checkpoint — 2026-09-10

State: SOURCE IMPLEMENTED + LOCAL TESTS PASS / CURRENT VISUAL QA BLOCKED / DRAFT / PRODUCTION WRITE = FALSE.
Base remote revision: `ce581a7dec158deda4cffec08644810f9367edeb`; base local snapshot: `896f66d`. Current continuation is the reviewed Mission Control change set on draft PR #4; use its current head/checks to identify the published revision. Main was inspected at `29531524a407d46de9a65e4032de40a3fc2c32cb`. Preserve both owner work and the full remote tree; this local checkout is partial and must not replace it.

- Completed audit of inventory and selected frontend/GAS/API/schema/upload/auth/review contracts before coding. New documentation records KEEP / IMPROVE / REPLACE / MISSING. Obsolete remote README instructions were read and replaced, not treated as current deployment authority.
- Extended the existing pilot with Light Mission Control shell, six KPI slots, React overview/Radar/analytics/profile, mission cards and timeline. Shared CSS now separates aviation and mission rules. No new backend or data schema.
- Extended the disconnected demo with autosaved in-memory drafts, bottom-sheet dialog, student drawing, header-checked evidence/local preparation and preview sizing, Mission ID receipt, preserved rejection revisions/resubmission, queue filters and selected per-record review with confirmation. Nothing is uploaded or notified by this demo.
- The authenticated view still uses only the existing session/self read client. Missing annual target, profile photo and unavailable write/evidence/queue functionality remain gated; nine stored category IDs are unchanged. Bangkok timestamp grouping avoids shifting early-month activity into the previous month. Client projections now reject duplicate IDs/contradictory owners.
- Verification executed: syntax PASS, JS 115/115, Python 16/16 (131 total). Controller/input tests are doubles, not a browser or live provider. Optional CSS parser and DOCX dependency are unavailable; no program installation was performed.
- Current browser blocker: automatic approval review explicitly denied access to the current local preview. Do not try another host, port, browser/CDP surface or deployment as a workaround. New Mission Control layout/console/native dialog/physical LIFF/performance are unverified. September 9 design screenshots below remain historical evidence for the prior UI only.
- Updated README, root SKILL entrypoint, existing project skill, AGENTS, CHANGELOG, architecture/UX/test documents and current design verdict. No live deployment, real data mutation, schema edit, notification, credential rotation or LIFF endpoint change.

Next code/runtime task: obtain permitted, readable evidence of the actual staging resolver and Worker version/bindings; confirm official 6.2–6.9 mapping and annual/term policy. Then extend the existing signed gateway/storage contract for assigned scope, fresh private signature, durable drafts/revisions and recoverable journal/outbox on verified staging. Follow `docs/REVIEW_STORAGE_CONTRACT.md`; do not execute the pure planner or wire the demo as an API. Resume rendered UI/device QA only after permitted access changes. Do not restart the project.

Source checks to resume after relevant edits: `node scripts/check-syntax.cjs`, `node --test tests/*.test.cjs`, `python3 -m unittest discover -s tests -p 'test_*.py' -v`; use the unchanged PII guard over reviewed changed contents before publication. Publish only changed blobs on the current remote parent and verify the final PR head's CI.

Concurrent upstream reconciliation: remote advanced five commits to `2bff70e2522f9c92d4dd495ed1b86dd1e793d44a`. Applied those changes without overwriting their identity formatting, stored sequence and signature layout. Fixed Master F/G/H/R misinterpretation, absent URL-name binding, unsigned profile fallback, unverified TLS and false Telegram success. Removed private student-number arithmetic from source fallbacks; missing sequence stays unknown. Suspended legacy Python review/public export/Git auto-publish before effects and removed preview daemon autostart. Original data and remote commit history are preserved; no service was run. These eight additional regression cases bring verification to 115 JS + 16 Python = 131.

---

# Aviation / warm React checkpoint — 2026-09-09

State: LOCAL DESIGN AND SYNTHETIC WALKTHROUGH COMPLETE / DRAFT / PRODUCTION WRITE = FALSE.
Remote parent: `bcfb46baed4218643198a888cfe37623570ca371`, existing draft PR #4. Preserve all earlier owner work. This checkpoint supersedes the old local-visual-QA blockers below; it does not close provider integration gates.

- Reused the pilot, original college crest, existing Cloudflare session client and official-total semantics. Added aviation raster art, restrained depth and white/navy/gold styling. Latest user steering adds warmth and React: a pinned, locally served React intention/encouragement card now works without changing hours or permissions.
- Added isolated in-memory walkthrough for student submission, temporary evidence, teacher review, fresh drawing, reasoned rejection and simulated notification retries. Its CSP disallows connections; no provider SDK or authentication adapter is imported. Reload resets synthetic state. The real gateway still does not expose submission/review routes.
- Browser evidence: empty form rejected; valid synthetic 2.5-hour deed with generated PNG submitted as pending; blank signature blocked; drawn synthetic line approved; total changed 15.5 → 18 once; rejected another record with a required reason; simulated delivery failed and retried without changing hours. React keyboard/click actions and its form CTA worked without changing the total.
- Corrected the HTTP-preview form failure, stale guide controls, invalid-file replacement, stuck error messages, narrow-view heading under the header, and neutral help styling. Dates default to Asia/Bangkok; navigating retains intentionally empty inputs for validation.
- Local checks: syntax pass; JavaScript 88/88; Python boundary 12/12 (100 total). Final remote CI is tracked on the published PR head, not inferred from these counts. Optional DOCX generation is untested locally because `pythainlp` is absent.
- Visual evidence: `design-qa.md` and `docs/design/`. Desktop and 360 CSS-pixel iframe layout inspected. Physical Android/iOS LINE webview and assistive signature input remain UAT gaps. Extra narrow React clicks encountered automation timeouts; only the observed desktop interaction is claimed as passed.
- No production deployment, real notification, student-data mutation, token rotation or endpoint change occurred. Current browser still cannot establish the previously blocked Apps Script/Cloudflare deployment evidence; do not repeat those challenges.
- Next runtime task: verify the owned staging resolver/worker deployment and bindings, then implement/review assigned scope, verifiable fresh signature, official period policy and durable journal/outbox before enabling write flags. Read `docs/REVIEW_STORAGE_CONTRACT.md` first. Do not replace the ledger, promote the synthetic role selector, or execute a saved plan.

Guide: `docs/DESIGN_HANDOFF.md`. Preview: `node scripts/preview.cjs` (no installation). Existing safe code boundary remains enforced. Publish only reviewed changed blobs on the remote parent; this local checkout is a partial snapshot and must never replace the full remote tree.

# Storage integrity checkpoint — 2026-09-09

State: DRAFT / STAGING ONLY / PRODUCTION WRITE = FALSE. Continue this branch; do not restart the project.

- Remote base for this continuation: `339c1d7df6902a6649809fa4a58f28a80d8d1f8f`, draft PR #4. Owner work through `7ef7ffb` is preserved. Source changes are in the storage-guard/review-plan continuation; use the PR head and CI links to identify the published revision.
- Read `docs/REVIEW_STORAGE_CONTRACT.md` before writing an approval adapter. Verified staging still uses the eight-column ledger and 22-column Master. This continuation also read only Reviews/Notifications/Audit/Evidence headers (13/7/18/9 columns); no identity rows were exported.
- Fixed retained legacy submission/review to reject displaced, missing or duplicate headers before effects. Submission validates stable supplied IDs, half-hours, dates and text; literal text cannot become a formula. It does not create missing sheets, upload before storage validation, append a reused ID, or notify before append/flush. An uncertain append returns its deed ID for reconciliation; notification exceptions cannot remove the saved record.
- Added `backend/GoodDeedReviewPlan.gs`: pure mapped storage calculation, complete values/formula snapshots, header and value preconditions, duplicate/conflict handling, preserved category/total formulas and official carry-forward. Every plan is `executable: false`. No route or service call was added. The existing signed adapter still rejects staff/write/evidence/activation actions.
- Local verification: syntax passed; `node --test tests/*.test.cjs` passed 78/78; Python boundary tests passed 11/11. Total 89, including 24 additional JavaScript cases in this continuation. Reproduced incompatible-header writes and missing uncertain-append ID, uncaught lock failure and invalid-date acceptance before correcting them. Synthetic tests do not prove live Google/LINE/Telegram delivery or cross-sheet transactions.
- Privacy preflight: passed on all 55 PR-touched file contents (52 current remote files plus three new source/doc/test files), with the existing guard rules unchanged. This is a changed-content check, not a clean bill of health for all repository history or deployed secrets.
- Latest browser check followed the user's renewed instruction to inspect Apps Script/Cloudflare: this browser exposed no signed-in user tabs. The known project link redirected to the Apps Script public landing page; Google Sign in returned `502 Bad Gateway` / connection refused. Cloudflare displayed `Performing security verification`, still present after one reload. No credentials were entered, CAPTCHA solved, editor/dashboard reached or provider setting changed. Stop retrying those blocked pages without changed access evidence.
- Next code task: extend the existing gateway review contract with verifiable fresh-signature proof and assigned-student/cohort scope, then build a durable, recoverable writer/journal/outbox around a fresh locked snapshot. Do not execute a saved plan or enable review flags. Current evidence metadata has no explicit signature provenance and the gateway body has only deed/decision/note; this gap is not solved by a staff role or a stored drawing.
- Runtime task remains blocked: obtain readable deployment/version/bindings evidence for the separate owned staging resolver and worker, then confirm code/config match before controlled self-read and review E2E. Keep existing LIFF endpoints. Policy/academic-period validation, credential rotation, private backup/restore proof, real notification tests and mobile visual QA are still open.

Changed implementation paths: `backend/Code.gs`, `backend/GoodDeedReviewPlan.gs`, `docs/staging-columns.example.json`, `scripts/check-syntax.cjs`, `tests/regression.test.cjs`, `tests/review-plan.test.cjs`, `tests/adapter.test.cjs`. Updated operator/agent contract: `AGENTS.md`, `WIKI.md`, this checkpoint and `docs/REVIEW_STORAGE_CONTRACT.md`.

# Earlier runtime access checkpoint — 2026-09-09

User authorized direct inspection of Apps Script and Cloudflare. Production write remains false; no release or account setting was changed.

- Verified remote code heads: Good Deed PR #4 `a8be7d878eca7751f1a78356595af8f9a9b24f54`; gateway branch `gooddeed-final-gateway-20260902` at `6c72530768bfbbba142e34020fa22d2519b3d332`.
- Gateway source identifies worker `rtafnc-one-gateway-staging`, entrypoint `src/gooddeed-final-audited.ts`, and staging origin `https://rtafnc-one-gateway-staging.anuchit1tube168.workers.dev`. These are source configuration, not a confirmed deployed version.
- The gateway repository's `docs/APP_SCRIPT_DEPLOYMENT_INSPECTION_2026-08-16.md` contains an editor link for the existing RTAFNC ONE LIFF Services project and a historical version-1 observation. It does not prove that project is the separate Good Deed staging resolver. Do not install the adapter into that project on this evidence alone.
- Actual browser access: Apps Script redirected to Google's public landing page. Its Google sign-in page returned `502 Bad Gateway` / connection refused, unchanged after one reload. No credentials were entered and no script editor was reached.
- Actual browser access: Cloudflare dashboard remained on `Performing security verification` after one reload. No dashboard values, bindings, secrets or deployments were reached; do not retry the challenge in a loop.
- GitHub evidence: no workflow-dispatch runs were returned for the gateway branch and no combined commit statuses were returned. This does not exclude deployment through Cloudflare Build, another branch or another mechanism.
- Next exact task: obtain a readable authenticated Apps Script deployment view and Cloudflare Worker deployment/bindings view; capture project identity, active version, update time and target staging sheet without secret values. Then match those runtime facts to the reviewed code. The access blocker is the current browser path, not missing user permission.

# Current checkpoint — 2026-09-08 integration review

State: DRAFT / STAGING ONLY / PRODUCTION WRITE = FALSE.
Based on owner updates through remote `7ef7ffb788a31ec091aa334df00a0e91cd2d469f`; preserve those changes.

- Current review: `docs/RELEASE_REVIEW_20260908.md`. Read it before any deployment. Older PASS/complete claims below are historical reports, not verification from this review.
- Implemented: closed Python unauthenticated API/static PII paths; retired unverified LINE binding; TLS/environment-only notification transport; existing Cloudflare session client; authenticated pilot read view and honest states; mapped eight-column staging reader; duplicate/number/formula approval guards.
- Live staging schema verified read-only: master has split names and combined Lv.N level text; ledger has eight columns (status G, submitted H). Schema example is in `docs/staging-columns.example.json` and contains no student data.
- Local results: 54 JavaScript + 11 Python tests passed; syntax checks passed. Four newly added approval regressions failed before fixing. Updated UI has VM state/escaping/filter tests, but no successful visual browser capture.
- Published implementation: `21e002583acc6ab0475fa322c1870a293fefd2dc` in draft PR #4, preserving owner head `7ef7ffb`. Local regression 65/65; GitHub regression run `34291274328` and PII guard run `34291274335` both passed on that implementation commit. Local PII preflight inspected all 52 PR-touched files with the existing rules intact. Documentation-only follow-ups do not change this tested implementation.
- Final cleanup: exact owner/deed document lookup; no fabricated URL record; source roster and old QA seeds preserved in owner-only Drive archive; bot literals removed; unsafe public exporters and destructive settings reset suspended. Four document cases failed before the fix.
- Live main still served old v3560 assets and repeated SSE warnings. Draft branch work has not been deployed.
- Next exact task: identify the owned Apps Script editor/deployment and Cloudflare staging version, configure explicit master/ledger maps and gateway origin, then test self reads with a controlled staging identity. Do not use the positional legacy approval writer on the eight-column ledger. Do not deploy this backend alone.
- Still blocked: runtime deployment/version/secret rotation, mapped writes/scoped review/evidence/activation, durable outbox, real end-to-end and mobile visual QA. No source-only claim can close these gates.

## Historical checkpoint supplied by earlier work

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
| **P0-12** | **Telegram Bot Callback Real-time Update & Persistence Hardening**<br>- แก้ไขปัญหากดอนุมัติใน Telegram แล้วหมุนค้างและไม่อัปเดตสถานะในระบบ<br>- ปรับปรุง `data/telegram_bot_listener.py`: ผสาน `save_or_update_deed_in_db` เพื่อบันทึกลง `records/`, `deeds.json` ทั้งสองแห่ง, และ `deeds_data.js` อย่างสมบูรณ์<br>- เพิ่มระบบระบุตัวตนและจับคู่ ID (`deed_id` / `student_id`) หลายมิติ (Exact, Candidate split, 7-digit ID, และ Pending fallback)<br>- เพิ่มระบบป้องกันการกดซ้ำ (Idempotency Invariant Guard) ป้องกันการทบชั่วโมงซ้ำ<br>- รองรับ SSE Real-time Broadcast อัปเดตหน้าเว็บทุกเครื่องทันทีโดยไม่ต้องรีเฟรช<br>- เพิ่มระบบ Auto-Start Telegram Bot Listener Daemon ฝังใน `backend/server.py` พร้อม Singleton PID Lockfile ป้องกัน process ชนกัน<br>- เพิ่ม `/api/telegram_webhook` endpoint ใน `server.py` และปรับปรุง `line_webhook_bot.py` ให้ส่งต่อ callback ไม่ทิ้ง update | ✅ PASS | `data/telegram_bot_listener.py`<br>`backend/server.py`<br>`data/line_webhook_bot.py` |

---

## 3. Environment & Daemon Setup

- **Backend Server**: Port 3000 (`python3 backend/server.py 3000`)
- **Telegram Bot Listener**: Background continuous poller (`python3 data/telegram_bot_listener.py`)
- **Cloudflare Tunnel (Staging URL)**: `[temporary staging tunnel — verify privately]`
- **LINE LIFF ID**: `2010948179-Ympqt2bT`
- **LINE OA Bot**: ฟ้าใส (`@409gzbav`)
- **Telegram Group ID**: configured privately

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
