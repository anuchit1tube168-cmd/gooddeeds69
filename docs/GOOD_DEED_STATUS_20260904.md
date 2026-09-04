# GOOD DEED — PRODUCTION STATUS 2026-09-04

Status: ACTIVE BASELINE / LIFF ENTRY WORKING / NO SECURE CUTOVER YET

## Confirmed today
- Existing LINE LIFF entry is working for the owner/user test.
- Existing LIFF ID remains unchanged: `2010948179-Ympqt2bT`.
- Production still uses the current legacy-compatible student UX with Student / Teacher / Admin role selector.
- GitHub Pages production deploy is healthy.
- Production performance hotfix is active: request de-duplication/in-memory short TTL, Apps Script timeouts, and legacy polling spread from 15s to roughly 90–120s.
- Additional first-load optimization added on 2026-09-04: preconnect to LINE SDK and Google Apps Script origins.
- Rollback branch for that change: `backup-before-preconnect-20260904`.
- Production head after first-load optimization: `6a9af509d88c210496607da4b6b7876c2499b470`.
- Build, deploy, credential scan, security guard and PDPA/PII guard passed after the change.

## CI repair completed
The PDPA/PII guard previously failed because the workflow used shallow checkout (`fetch-depth: 2`) and could not resolve the push base commit. This was a CI history-resolution failure, not a PII finding. Workflow now uses full read-only history (`fetch-depth: 0`) and the guard passes.

## Read-only E2E observation
Authoritative `Deeds_2569` currently shows the latest visible submissions through 2026-09-01. No new 2026-09-03/04 deed was found during the read-only check.
Therefore:
- LIFF entry/login usability: CONFIRMED by owner/user.
- Good Deed write persistence for the current live session: NOT YET PROVEN by a controlled submit -> Sheet/Drive -> refresh cycle.

Do not create a synthetic production deed just to prove this. Use a real controlled student/admin test or staging data.

## Remaining blockers to DONE
1. Controlled student E2E: login -> read -> submit -> backend persistence -> refresh.
2. Evidence persistence check in Private Drive.
3. Teacher/admin review -> approved/rejected state.
4. Approval must update official Main_2569 totals exactly once and correct Level/Chibi.
5. Audit/notification verification.
6. Replace legacy browser `getStudents` roster + browser password/PIN comparison with server-side LINE verification/session flow.
7. Complete secure V2/staging migration and reconcile migration summaries without double-counting.
8. 1–3 controlled-account E2E and representative load test before any secure production cutover.

## Non-negotiable
- Preserve current working LIFF entry.
- Do not change LIFF endpoint while current production is being used unless owner explicitly approves a controlled cutover.
- Clean means organize/validate/quarantine, never delete.
- Student Master remains central identity source.
- No secrets, roster/passwords, or student PII in public GitHub.
- Production data changes must be reversible and auditable.
- Finish Good Deed before resuming other RTAFNC ONE modules.
