# RTAFNC Good-Deed Master Data Operations

## Current operating rule

The existing GitHub/LIFF page remains live. Backend preparation must not require students to sign in to LINE again and must not remove legacy files before reconciliation.

`Clean` means classification without deletion:

- canonical data stays in Master;
- duplicates stay intact in Duplicate Quarantine;
- invalid seven-digit identities stay intact in Invalid-ID Quarantine;
- unreadable or unresolved files stay intact in Unsupported/Unverified;
- retired academic-year exports stay read-only in Archive.

## Drive structure

```text
ระบบบันทึกความดี_วพอ_2569/
├── 00_MASTER_DATA/
│   ├── 01_STUDENTS_ACTIVE/
│   ├── 02_GOOD_DEEDS_MASTER/
│   ├── 03_STUDENT_PROFILES/
│   ├── 04_STUDENT_MEDIA/
│   ├── 05_ALUMNI/
│   └── 06_VERSION_SNAPSHOTS/
├── 90_QUARANTINE_REVIEW/
│   ├── INVALID_STUDENT_ID/
│   ├── DUPLICATE_RECORD_FOLDERS/
│   └── UNSUPPORTED_OR_UNVERIFIED/
└── 99_ARCHIVE_READ_ONLY/
```

The stable Drive ID, not the folder name or location, is the recovery key.

## Safe release sequence

1. Snapshot current Sheets and movement map.
2. Run `preflightSystem()` and `preflightMigration()`.
3. Reconcile student/deed counts and approved-hour totals.
4. Test authentication, profile update, media upload, deed submission, review, and rollback in V2.
5. Keep the existing LIFF URL and GitHub template; change only the backend endpoint/config after V2 passes.
6. Remove public legacy data and rotate exposed credentials only after the cutover is confirmed.

## Rollback

Use `previewRestoreSnapshot(fileId)` first. Enable maintenance mode, then call `restoreSystemSnapshot(fileId, "RESTORE:<snapshotId>")`. The restore function creates a fresh pre-restore snapshot automatically, so the rollback itself can be reversed.

For Drive organization, reverse the movement manifest by moving the same item IDs from their recorded new parent back to their recorded old parent.
