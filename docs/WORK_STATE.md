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
| P0 | Legacy doGet/doPost still expose unauthenticated data/write routes. Callback hardening alone is NOT end-to-end authorization. Must retire/protect raw routes and browser roster/password fallback through the verified gateway. |
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
node --test tests/regression.test.cjs
```

Result before final packaging: 12/12 synthetic regression cases pass, syntax passes, skill frontmatter validator passes. See PR for final verification status. These tests cover mocked functions, not actual distributed transactions or production uptime.

## Next exact task

Identify the deployed Apps Script project/version read-only and compare handlers to Code.gs/CodeV2.gs. Inspect the existing `rtafnc-one` gateway branch and its signed adapter contract. Complete the authorization/ledger adapter on a staging copy before enabling any write flag. Do not build a third independent auth stack or redesign the UI again to avoid this blocker.

## Resume protocol

Read AGENTS → this checkpoint → git status/log. Preserve uncommitted work. Select one highest-priority task; state its input, expected observable output and test. Update this file after meaningful verification. Checkpoints and skills cannot override access controls or owner decisions.

## เงื่อนไขบังคับของระบบ (Non-negotiable Conditions)

Preserve existing data and 2568 carry-forward; clean means archive, not delete; canonical seven-digit Student Master; server-side LINE verification and scoped RBAC; private health/data/evidence boundaries; Drive/Apps Script authoritative business storage; reversible releases; staging and verified rollback before explicit production cutover approval. See AGENTS.md for full contract.
