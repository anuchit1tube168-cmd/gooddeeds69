# RTAFNC Good Deed — Engineering Contract

Owner: วิทยาลัยพยาบาลทหารอากาศ กรมแพทย์ทหารอากาศ
Scope: ระบบบันทึกความดีสำหรับนักเรียน อาจารย์ผู้ตรวจ และผู้ดูแล
Updated: 2026-09-10 | Release state: DRAFT / NOT PRODUCTION READY

## Start here

1. Read this file, `docs/WORK_STATE.md`, then the relevant source. Check `git status`, branch and commit before editing.
2. Invoke `.agents/skills/rtafnc-gooddeed-fable/SKILL.md` for implementation/debugging. Read only the references relevant to the current task.
3. Report the next concrete outcome in Thai. Work on one verifiable change at a time. Preserve user changes and existing authorization.
4. Do not equate repository code, a deployment, and a browser session. Record which one supplied each finding.

## เงื่อนไขบังคับของระบบ (Non-negotiable Conditions)

- Preserve historical records, evidence, signatures, LINE bindings and approved/carry-forward hours. Clean means inspect, classify and privately archive; never delete/reset.
- Student Master is the canonical identity source. A student ID is a string of exactly seven digits, not a password. Never derive access rights from a browser-supplied student ID or role.
- Verify LINE ID tokens server-side, including signature/provider verification, audience, issuer and expiry. First binding requires secure ownership verification; never bind by knowing a student number alone.
- Enforce role AND assigned student/cohort scope on every backend operation. Student: self; teacher: assigned scope; admin: authorized administration with audit. A role-selector button grants no permission.
- GitHub contains code, schemas and synthetic fixtures. Keep real rosters, evidence, personal photos, phone numbers, LINE IDs, Telegram IDs and secrets in private services. Health/counselling information is outside this module and must not leak into notifications or rankings.
- Google Sheets/Drive are authoritative business storage. Cloudflare is the authentication/API boundary. D1 may hold sessions, role bindings and audit references; it is not a replacement ledger without a reviewed migration.
- Preserve existing LIFF ID and endpoint until controlled E2E and explicit cutover approval. Default to a staging copy; never run setup/migration against an unverified spreadsheet.
- Every release needs a rollback code revision, deployment IDs and a private backup/restore proof. Code rollback does not reverse data writes. Never replace the ledger with a stale backup while students are writing.
- Secrets stay server-side. Never echo tokens in terminal, chat, screenshots, docs or test failures. Rotate exposed credentials; removing a literal does not revoke it or remove Git history.
- Notifications are secondary to persistence. Failed delivery must not lose the deed, repeat credit, or display success before the write. Persist failed deliveries and retry by event ID after reviewing backend support.

## Actual architecture and branch boundary

| Location | Meaning / limitation |
| --- | --- |
| `frontend/index.html`, `frontend/app.js`, `frontend/liff-sdk.js` | Legacy production source at reviewed main; browser roster/cache/auth and raw GAS calls remain release blockers |
| `backend/Code.gs` | Legacy `Main_2569` / `Deeds_2569`; has callback and Drive helpers; NOT a secure public API |
| `frontend/secure-pilot/*`, `backend/CodeV2.gs` | Existing v2 pilot with server sessions and private evidence; schema differs from legacy |
| `anuchit1tube168-cmd/rtafnc-one`, branch `gooddeed-final-gateway-20260902` | Existing Cloudflare secure gateway; inspect current branch and deployment before reuse |

Do not deploy Code.gs and CodeV2.gs as competing entrypoints: both define handlers. Confirm the actual Apps Script project and active version, then patch that version on staging. Main_2569 official totals and Deeds_2569 ledger must reconcile; v2 approved-row sums are not proof of official totals.

## Review/approval invariants

1. Read hours, category, owner and current status from the stored ledger, never from Telegram callback parameters or frontend totals.
2. Lock the transition. A duplicate decision returns the stored outcome without adding hours or sending the same event again.
3. Reject conflicting decisions. Corrections need a separate authorized, audited reversal; do not silently change approved to rejected.
4. Sheets is not a cross-sheet transactional database. The legacy patch uses `approving` to stop replay after an uncertain write. Such rows require reconciliation from evidence; never auto-reset to pending.
5. Missing ledger/member, invalid stored hours or write failure must fail explicitly. Do not create empty production sheets as a read fallback.
6. Authenticate webhook origin, then authorize the numeric Telegram user ID and chat. Display names are not identity. Old `approve_<deed-id>_<student-id>` data can contain underscores within deed ID and must fit Telegram's byte limit; prefer short opaque callback handles in the final gateway.
7. Do not add public Drive sharing to make previews work. Serve private evidence through an authenticated, scope-checked endpoint.

## Domain policy source

Source: owner's AGENTS.md in Drive, modified 2026-09-05. Confirm against the official regulation before production policy migration. Preserve old records; never silently recalculate them.

| Category | Per activity | Annual ceiling / extra rule |
| --- | --- | --- |
| 1 Blood/platelet/plasma donation | 8 hours | 16 hours; max 4/year; 3-month spacing |
| 2 External projects by college order | Actual order | 8 hours |
| 3 Internal college assistance | Within approved policy | 8 hours |
| 4 College training | Within approved policy | 6 hours |
| 5 Community/agency assistance | Within approved policy | 8 hours |
| 6 Religious-site support | 1 hour | 4 hours |
| 7 General unpaid assistance | 1 hour | 2/term, 4/year |
| 8 Loyalty activities | Within approved policy | 8 hours |
| 9 Special roles | Within approved policy | 10 hours |

Use half-hour increments. Per-activity and yearly limits are different constraints. Academic-year/term boundaries require verified configuration, not inferred calendar years. Carry-forward 2568 for eligible cohorts remains intact. Existing pilot uses generic categories; map and validate before replacing it with these nine categories. Do not guess a mapping.

## Implementation discipline for Gemini / Antigravity

- Do not rename the stack, rebuild UI or start a new repository to escape an error.
- Reproduce one failure; capture sanitized error, file, input class and expected/actual result. Read surrounding implementation before editing.
- After two failed attempts at the same approach: stop repeating, record evidence, choose a materially different diagnostic path. If the blocker is permission, credentials, quota or provider outage, continue independent local work and state the exact remaining dependency.
- Keep one task in progress. After each tested change update `docs/WORK_STATE.md`: base/current commit, changed paths, command/result, unresolved risk, next command. Save before context limits, model switching or service interruption.
- Do not claim a model/version exists based on a nickname. Choose from the IDE's available models. Skills organize work; they do not remove rate limits or guarantee uninterrupted execution.
- No blanket auto-approve, unlimited retries, fake tests, disabled security gates or invented deployment success.

## UI and accessibility

Preserve real crest, navy/blue/white with restrained gold. Use Sarabun for readable Thai body text. Depth comes from layered cards, light and restrained shadows; avoid a heavy 3D engine for forms. Minimum 44px controls, visible keyboard focus, reduced-motion support, responsive 360px layout, readable contrast, loading/error/empty/success states. Show totals with provenance and scope. Never present stale/partial data as an official zero or total. Sensitive student data is never fixture material.

## Verification / completion

Run `node scripts/check-syntax.cjs` and `node --test tests/*.test.cjs`. Use the existing PII guard before commit. A test pass proves its stated local behavior only.
Production readiness additionally requires controlled staging E2E: LINE login/link, self-only reads, scoped teacher queue, submission + private evidence, persistence after refresh, approve/reject, duplicate callback, failed delivery, official totals/carry-forward reconciliation, audit and rollback. Record pass/fail/blocked and deployment version. No production cutover without evidence and explicit owner approval.

See `WIKI.md` for operator steps and `docs/WORK_STATE.md` for the current blockers. This file adds project guidance; it cannot grant access or override the user's instructions.

## Current integration boundary — 2026-09-08

Read `docs/RELEASE_REVIEW_20260908.md` for evidence and current gates. Python is a loopback static preview; no browser role/cookie can authorize an API call. The gateway pilot uses the existing Cloudflare cookie session, never a new auth stack. Configure origins from verified deployment evidence only.

Both read-adapter master and ledger columns require explicit unique header maps. Observed staging ledger has eight columns; the positional eleven-column legacy approval writer is incompatible. Never enable that writer against this staging schema. Parse only the stored official level label; never infer level/pass/carry-forward from partial records. Preserve category and total formulas.

Run Python boundary tests alongside JS tests. Historical reports of sync/audit PASS must be tagged by source and cannot replace current verification. The September 9 design continuation now has local browser evidence in `design-qa.md`. This closes the local preview capture gap only; authenticated provider E2E and production readiness still require separate evidence.

Legacy public roster/photo/settings exporters and destructive Settings reset are intentionally suspended. Do not bypass their guards; implement a reviewed private pipeline first. Source-embedded roster/QA seeds were privately archived before removal. Document rendering must require an exact, unique record and explicit matching owner; URL parameters cannot be evidence or approval authority.

## Storage continuation — 2026-09-09

Legacy submission/review now reject incompatible headers before effects. Never weaken the guard to make the eight-column staging sheet accept the eleven-column writer. A failed/uncertain append must retain its deed ID for reconciliation; notification failure cannot roll back or duplicate a persisted record.

`backend/GoodDeedReviewPlan.gs` is a pure internal calculator, not an enabled review adapter. Read `docs/REVIEW_STORAGE_CONTRACT.md` before extending it. Complete values/formula snapshots and explicit nine-category maps are required; preserve formulas and carry-forward. A returned plan is never authorization or an executable transaction. The gateway still needs assigned-scope enforcement, fresh-signature proof, official policy checks and durable journal/outbox integration. Do not expose this helper or enable review because its synthetic tests pass.

## Aviation design and React continuation — 2026-09-09

Keep the original college crest and the new restrained aviation theme. `gooddeed-ui.js` provides presentation, `kindness-react.js` provides the React intention/encouragement island, and the existing gateway client remains the identity/read boundary. Unmount the React root before replacing its parent DOM. Vendored React distributions are pinned with their MIT notice and checksums in `docs/DESIGN_HANDOFF.md`; no package installation or runtime CDN is required.

`secure-pilot/demo.html`, `workflow.js` and `demo.js` are an isolated in-memory synthetic walkthrough, with `connect-src 'none'`. A role selector, drawing, intention or encouragement reaction is never authority or official hours. Never import this model into the authenticated adapter. Evidence stays in temporary object URLs, no genuine signatures should be drawn in the demo, and reloading resets the example data. Preserve this distinction in UI and release notes.

Use `node scripts/preview.cjs` for an allowlisted local preview. Its `/_preview/*` routes are developer QA helpers only. Never replace this with a server exposing the repository root. Browser QA uses actual rendered DOM and user controls; intermittent automation timeouts are not proof of application failure or success. Record the observed result and stop repeated attempts after a bounded recovery.

## Light Mission Control continuation — 2026-09-10

Read root `SKILL.md`, `README.md` and the latest `docs/GOOD_DEED_ARCHITECTURE.md`, `docs/GOOD_DEED_UX.md`, `docs/GOOD_DEED_TEST_PLAN.md` before modifying this continuation. Use PLAN → REUSE → BUILD → TEST → FIX → DOCUMENT. Audit KEEP / IMPROVE / REPLACE / MISSING first; continue an authorized implementation when the necessary facts are available.

`mission-data.js` is a pure presentation projection and `mission-react.js` owns the React mission views. The existing gateway client still owns session/self reads. Unmount both React islands before replacing parent HTML. Keep `mission.css` separate from the retained aviation stylesheet. No new backend, database, runtime package installation or LIFF ID was introduced.

Preserve stored category IDs 1–9 until the owner's 6.2–6.9 mapping is verified. A calendar month is not an academic year. Convert timestamp activity dates to Asia/Bangkok before monthly grouping. Annual progress requires a separate period-specific approved-hours value; do not use lifetime totals/carry-forward or invent a target. Missing profile photos and API metadata remain explicit.

The demo's draft/resubmission, drawing, preparation progress and selected review sequence are disconnected behavior demonstrations. Drafts are memory-only and reset on reload. Keep old rejection/evidence snapshots and revision-specific event identity. Require explicit confirmation and a fresh drawing for each review; changing a prepared decision invalidates confirmation. These client objects cannot become server authorization or the real journal/outbox.

Current local suite after upstream reconciliation: 115 JS + 16 Python tests pass, including controller doubles. New visual/mobile/console QA is BLOCKED: automatic approval review denied opening the current preview. Do not bypass that denial with another host/port, raw browser protocol, alternate browser surface or deployment. Historical September 9 screenshots are not evidence of the new Mission Control layout. Preserve this boundary in handoffs; do independent source work and report the missing runtime evidence honestly.

Production write remains FALSE. Current architecture/test documents enumerate the unresolved assigned-scope, signature, policy, durable write, provider deployment, credential rotation and backup/restore gates. Do not label the project production-complete merely because the local suite passes.


Concurrent upstream reconciliation: five commits through `2bff70e2522f9c92d4dd495ed1b86dd1e793d44a` arrived during this continuation. Preserve their name formatting, stored sequence and signature placement work. Fix the confirmed Master-column/undefined-name regressions; do not restore unsigned profile fallback or infer a class sequence from student-number ranges. Keep legacy Python callback/public-roster/Git-auto-publish effects suspended: preview startup may never start a data-writing daemon. TLS must verify certificates, and Telegram rejection cannot be a reported success. Current tests include these boundaries; no live data or notification was exercised.

## Server prerequisite continuation — 2026-09-10

`GoodDeedReviewGate.gs` is an internal read-only checker, not an enabled review adapter. Its server ports must resolve verified session, exact current assignment, a canonical deed revision and persisted private signature intent. The ports/challenge verifier are not implemented. Never populate them from client claims or treat `checksPassed` as write authority; every result stays `executable: false`. Follow the appended contract in `docs/REVIEW_STORAGE_CONTRACT.md` and recheck under the future durable writer's lock. Latest source suite: 129 JS + 16 Python = 145; current runtime/browser gates remain open.
