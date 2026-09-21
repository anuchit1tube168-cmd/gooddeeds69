# RTAFNC Good Deed — Canonical Data Source

Updated: 2026-09-17 (Asia/Bangkok)

## Canonical real-data workspace

- Google Drive project/data root: `1Y6n_lYLIfIkg9Mt3pLtwWK0_4Lcw3Ysx`
- Purpose: real/private operational data, legacy workspace, evidence, rosters, recovery reference, and controlled project handoff.
- This folder contains the historical `.git` working metadata that seeded this repository, but it is **not** an automatic GitHub sync target. Do not assume Drive file changes are pushed to GitHub.

## Live legacy data store identified during verification

- Spreadsheet: `ฐานข้อมูลความดี วพอ 2569`
- Spreadsheet ID: `1BjNlzzWGqMLCbRHBV5h4ft-BN3vlgrFOk96f2GZTKiY`
- Operational tabs observed: `Main_2569`, `Deeds_2569`.

## GitHub responsibility

Repository `anuchit1tube168-cmd/gooddeeds69` is the source/static frontend and version-control source of truth for deployable code. Do not commit student rosters, credentials, Telegram/LINE tokens, password hashes, evidence files, or other private operational data.

## Backend transition rule

The currently deployed legacy Apps Script endpoint and the V2 backend are separate contracts. Do not point the frontend at a backend version until its `health` response and login/submit/review contract are verified end-to-end. V2 source uses Script Properties for secrets and must preserve the existing real Drive/Sheets data during migration.

## Non-negotiable data rules

1. Preserve existing data; clean means classify/quarantine, not delete.
2. Any synthetic/test row in a real sheet must be clearly marked `SYSTEM TEST` and excluded/rejected so it cannot affect student hours.
3. Student identity is keyed by the 7-digit student ID.
4. GitHub contains no private student data or secrets.
5. Telegram/LINE credentials remain server-side only.
6. Production cutover must be reversible and verified before broad student use.
