# RTAFNC Good Deed — Work / Antigravity Handoff

Date: 2026-09-02
Status: GOOD DEED FIRST / STAGING DEVELOPMENT / PRODUCTION LIFF PRESERVED

## Mission
Finish the Good Deed system first. Do not expand RTAFNC ONE modules until Good Deed is production-ready and owner-approved.

## Locked architecture
Existing LINE LIFF -> Cloudflare Worker + Static HTML (same-origin auth/gateway) -> signed server-to-server Google Apps Script adapter -> Private Google Sheets/Drive.

## Production rule — non-negotiable
- Current LINE Good Deed LIFF must continue using the existing working page/flow until final controlled cutover.
- Existing LIFF ID: `2010948179-Ympqt2bT`.
- Do NOT change the existing LIFF Endpoint URL unless the owner explicitly approves final cutover after E2E.
- Do NOT remove or replace the current working production page while staging is incomplete.
- Production write remains disabled for the new Cloudflare path until controlled E2E and reconciliation pass.

## Repositories / active branches
### Good Deed repo
- Repo: `anuchit1tube168-cmd/gooddeeds69`
- Finalization branch: `gooddeed-final-cloudflare-20260902`
- Production `main` currently contains the LIFF hotfix restoring the existing working entry via Secure Pilot. Do not overwrite blindly.
- Legacy staging PR #2 is diverged; do not merge it directly into main.

### Cloudflare gateway/core repo
- Repo: `anuchit1tube168-cmd/rtafnc-one`
- Good Deed-only gateway branch: `gooddeed-final-gateway-20260902`
- Do not continue Leave / Hospital / other RTAFNC ONE modules during Good Deed finalization.

## Authoritative private data
Private Google Sheet: `ฐานข้อมูลความดี วพอ 2569`.
- `Main_2569`: official student summary and official accumulated hours/level.
- `Deeds_2569`: current-year deed ledger.
- Do not use empty/schema-only `GoodDeedRecordsV2` as the authoritative AY2569 source.
- Historical data stays separate. Clean means organize/reconcile, never delete.

### Staging copy
Private staging spreadsheet created from the official source:
- Title: `ฐานข้อมูลความดี วพอ 2569 — STAGING FINAL 2026-09-02`
- Use only for write-path E2E until owner approves production migration.
- Added staging support tabs: `Evidence_2569`, `Reviews_2569`, `Audit_2569`, `Activation_2569`, `Notifications_2569`.
- Private staging Drive folders exist for evidence and activation.

## Identity & security
- LINE ID token must be verified server-side.
- Browser cannot choose or self-bind Student Master identity without server validation.
- Student Master reference is exact 7-digit ID.
- Session uses Secure + HttpOnly + host-only `__Host-rtafnc_session` cookie.
- CSRF required for writes.
- RBAC enforced server-side.
- No roster, student photos, passwords, LINE token, Drive IDs, GAS secrets, Cloudflare secrets, or health data in public GitHub/browser storage.
- No password login such as `1234`, student ID, last 4 digits, default passwords, or localStorage sessions.
- Audit all auth, activation, submit, evidence, review and administrative actions.
- Every write must be idempotent/recoverable; approval must not double-add hours.

## Good Deed business flow
Student:
1. Open existing LIFF.
2. LINE server-side verification.
3. First activation only: verified LINE session + 7-digit Student Master + one-time activation code.
4. Later visits use the verified server session/link.
5. View official card/Chibi/hours/category totals/history.
6. Submit category, date, hours, description and evidence.
7. Submission enters `pending`; no official accumulated-hours update yet.

Approver:
1. Authenticated approver role.
2. View pending queue and evidence.
3. Approve or reject with audit.
4. Only approval updates the relevant category total in `Main_2569`; official total remains formula-driven.
5. Recompute/store official Level according to existing thresholds.
6. Approval/rejection is idempotent and must not duplicate hours.
7. Notify student if notification runtime is configured.

## Existing official Chibi / Level thresholds
Do not invent new thresholds:
- Lv1: <10
- Lv2: >=10
- Lv3: >=25
- Lv4: >=50
- Lv5: >=80
- Lv6: >=120
- Lv7: >=180
- Lv8: >=250
- Lv9: >=300
- Lv10: >=350 hours

## Existing category limits
1. Blood donation: max 16 h
2. External project: max 8 h/day
3. Internal college support: max 8 h/day
4. College training: max 6 h/day
5. Community/organization support: max 8 h/day
6. Religious place support: max 6 h/day
7. General voluntary work: max 4 h/day
8. Loyalty/institution activity: max 8 h/day
9. Special role: max 10 h

## New Good Deed implementation prepared
### Good Deed repo branch
- Full server-to-server Apps Script Good Deed domain adapter has been prepared on `gooddeed-final-cloudflare-20260902`.
- Runtime IDs/secrets must live in Script Properties only.
- Write gates default OFF.

### Gateway branch
- `gooddeed-final-gateway-20260902` contains Good Deed-specific gateway work.
- Static HTML/UI is served same-origin with API to keep session cookie secure.
- Good Deed routes cover card/history/activation/submit/evidence/review with server-side authorization.
- Safety guard must fail closed if staging flags/secrets are missing.

## Runtime gates still required
Do not claim production-ready until all pass:
1. TypeScript + Wrangler dry-run + security + credential + owner + quality checks all PASS on the Good Deed final gateway branch.
2. Deploy the new Apps Script adapter against the PRIVATE STAGING spreadsheet/folders only.
3. Set Script Properties privately; never paste secrets into chat or GitHub.
4. Set Cloudflare encrypted secrets privately.
5. Enable auth only on staging after required runtime values exist.
6. Controlled E2E with 1–3 test identities:
   LINE -> Core session -> activation/link -> card -> history -> submit -> evidence -> approver -> approve/reject -> audit.
7. Reconcile card totals and Level against the staging `Main_2569` formula/values.
8. Verify rejected/unauthorized/replayed requests fail closed.
9. Verify no duplicate hours after retry/replay/interrupted approval.
10. Verify rollback.
11. Only then prepare owner-approved production cutover of the existing LIFF Endpoint.

## Working style for Work / Codex / Antigravity
- Treat this file as the starting context, then inspect repo HEAD and CI before editing.
- Never assume previous chat state is current; verify files, branches and deploy state.
- Make minimal commits with one purpose each.
- Staging first.
- Do not merge to main or change production LIFF endpoint without explicit owner approval.
- Report checkpoints, not verbose running commentary.

## Definition of Done
Good Deed is finished only when:
- Existing LIFF opens reliably.
- LINE login works without password fallback.
- Student sees correct official identity/card/Chibi/hours.
- Submit + evidence works.
- Approver queue/review works.
- Approved hours update exactly once and formulas remain intact.
- Rejected submission does not change official hours.
- Audit and rollback are verified.
- No public PII/secrets.
- Load test is acceptable for ~500 registered users and expected daily concurrency.
- Final production cutover is explicitly approved by the owner.
