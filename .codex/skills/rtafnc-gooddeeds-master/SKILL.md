---
name: rtafnc-gooddeeds-master
description: Maintain and evolve the RTAFNC student good-deed system across GitHub Pages, Google Apps Script, Sheets, and Drive when work involves student records, deed hours, evidence, profiles, media, migrations, alumni conversion, cleanup, or rollback.
---

# RTAFNC Good-Deed Master Data

Use this skill for every change to the RTAFNC good-deed system. The current priority is to keep the live good-deed workflow working while converting the backend into a private, reversible master-data system.

## Non-negotiable invariants

- `Clean` means inspect, classify, normalize, index, and quarantine. Never delete source records as part of cleanup.
- Treat the seven-digit `studentId` as the canonical student key. Names are display and search fields, never identity keys.
- Keep GitHub Pages as static UI/template only. Do not store student profiles, deed rows, passwords, tokens, LINE user IDs, private Drive URLs, or administrator secrets in GitHub.
- Keep the existing LIFF URL and current GitHub `main` page unchanged while students are using it. Prepare and test backend changes separately before cutover.
- Store operational data in private Sheets/Drive and enforce authorization in Apps Script. A hidden frontend field is not an access control.
- Preserve valid V1 behavior when porting it to V2, but do not preserve insecure implementations or embedded secrets.
- Before any bulk mutation, create a system snapshot and a movement manifest. Every quarantine or restore operation must be traceable by Drive file/folder ID.
- Do not rotate, unlink, or require students to rebind existing valid LINE IDs during backend preparation.

## Canonical architecture

- GitHub: static HTML/CSS/JS template and public identifiers only.
- Apps Script V2: authentication, authorization, validation, deduplication, profile/media operations, audit, notifications, snapshots, and restores.
- Google Sheets: operational indexes and normalized rows. Avoid putting binary evidence in cells.
- Google Drive `00_MASTER_DATA`: canonical private data folders.
- Google Drive `90_QUARANTINE_REVIEW`: invalid, duplicate, unsupported, or unresolved items. Quarantined data remains intact.
- Google Drive `99_ARCHIVE_READ_ONLY`: retired year exports and immutable reference material.

Read [references/data-contract.md](references/data-contract.md) before changing schemas, deduplication rules, profile/media storage, year-end alumni conversion, or rollback behavior.

## Required workflow

1. Ground the current GitHub commit, Apps Script source version, Sheet metadata, Drive folder IDs, and live LIFF/GitHub URL.
2. Run read-only classification before writing. Report valid seven-digit IDs, invalid IDs, duplicate student folders, duplicate deed IDs, orphan deeds, and unusable evidence separately.
3. Select one canonical record per student/deed using the rules in the data contract. Move only non-canonical or invalid items to quarantine; never destroy them.
4. Create a version snapshot before imports, bulk profile updates, cohort conversion, or restore.
5. Apply the smallest compatible backend change. Derive student identity from the server session, not request payload.
6. Run syntax checks and read-only preflight. Verify counts, sums of approved hours, duplicate counts, folder permissions, and rollback readiness.
7. Do not merge or cut over the GitHub frontend until the V2 backend passes preflight and the live totals reconcile.

## V1 compatibility decisions

Retain these capabilities through secure V2 equivalents: login, list/search deeds, submit evidence, approve/reject, summary totals, password change, profile update, student media upload, and notifications. Reject V1 patterns that expose tokens, accept unauthenticated mutations, trust client student IDs, or store sessions/authority only in browser storage.

## Stop conditions

Stop before a live cutover when counts or approved-hour totals do not reconcile, a seven-digit student ID is ambiguous, a duplicate contains non-matching deeds/evidence, a restore snapshot cannot be validated, or the Apps Script deployment target is not grounded. Keep the live system unchanged and place uncertain material in quarantine for review.
