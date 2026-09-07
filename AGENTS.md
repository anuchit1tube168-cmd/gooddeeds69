# RTAFNC Good Deed — Engineering Contract

Owner: วิทยาลัยพยาบาลทหารอากาศ กรมแพทย์ทหารอากาศ
Scope: ระบบบันทึกความดีสำหรับนักเรียน อาจารย์ผู้ตรวจ และผู้ดูแล
Updated: 2026-09-07 | Release state: DRAFT / NOT PRODUCTION READY

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

Run `node scripts/check-syntax.cjs` and `node --test tests/regression.test.cjs`. Use the existing PII guard before commit. A test pass proves its stated local behavior only.
Production readiness additionally requires controlled staging E2E: LINE login/link, self-only reads, scoped teacher queue, submission + private evidence, persistence after refresh, approve/reject, duplicate callback, failed delivery, official totals/carry-forward reconciliation, audit and rollback. Record pass/fail/blocked and deployment version. No production cutover without evidence and explicit owner approval.

See `WIKI.md` for operator steps and `docs/WORK_STATE.md` for the current blockers. This file adds project guidance; it cannot grant access or override the user's instructions.
