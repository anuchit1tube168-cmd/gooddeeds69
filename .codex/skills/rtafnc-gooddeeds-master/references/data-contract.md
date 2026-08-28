# RTAFNC Good-Deed Data Contract

## Student identity

- Canonical key: `studentId`, exactly seven ASCII digits (`^[0-9]{7}$`).
- Display/search: official name, preferred name, cohort, LINE display name. These never replace `studentId`.
- Lifecycle status: `student`, `alumni`, `suspended`, or `archived`.
- A student may keep the same `memberId` and `studentId` after graduation; year-end conversion changes lifecycle status and graduation metadata instead of creating a second person.

## Deed identity and deduplication

Choose one canonical deed using this order:

1. Exact `recordId` or legacy deed ID match.
2. Otherwise exact normalized tuple: `studentId + activityDate + category + hours + normalized description + primary evidence fingerprint`.
3. If two candidates disagree on hours, status, date, or evidence, do not merge automatically. Mark both `REVIEW_REQUIRED` and quarantine the non-canonical folder only after a manifest records both IDs.

Never deduplicate by student name alone. Never add duplicate hours together unless they are confirmed distinct activities.

## Profile and media

- Keep credentials and auth fields in `MembersV2`.
- Keep editable personal data in `StudentProfilesV2`, keyed by `studentId` and `memberId`.
- Keep media metadata in `StudentMediaV2`; store files privately in Drive under a per-student folder.
- Replacing a profile image creates a new media row and marks the prior image non-primary. Do not delete the prior file during normal updates.
- Students may edit allowed self-service fields. Official identity, cohort, lifecycle status, graduation year, and role require administrator authority.

## Master folders

- `01_STUDENTS_ACTIVE`: active-student roster exports and canonical indexes.
- `02_GOOD_DEEDS_MASTER`: canonical deed/evidence record tree.
- `03_STUDENT_PROFILES`: private per-student profile folders.
- `04_STUDENT_MEDIA`: private profile and gallery media.
- `05_ALUMNI`: alumni exports and alumni-only contact material.
- `06_VERSION_SNAPSHOTS`: system snapshot JSON and movement manifests.
- `90_QUARANTINE_REVIEW/INVALID_STUDENT_ID`: identifiers that are not exactly seven digits.
- `90_QUARANTINE_REVIEW/DUPLICATE_RECORD_FOLDERS`: non-canonical duplicate folder trees.
- `90_QUARANTINE_REVIEW/UNSUPPORTED_OR_UNVERIFIED`: unreadable or unresolved material.

## Version and restore contract

A snapshot must include:

- schema and system version;
- creation time and actor;
- Sheet ID and a complete header-plus-row copy of every mutable V2 table;
- relevant Script Property folder IDs without secret values;
- source row counts and a SHA-256 digest of the serialized payload.

Restore must be two-phase:

1. `previewRestoreSnapshot(snapshotFileId)` validates schema, digest, headers, and counts without writing.
2. `restoreSystemSnapshot(snapshotFileId, confirmation)` requires maintenance mode plus confirmation `RESTORE:<snapshotId>`. It first snapshots the current state, then restores tables, records an audit event, and leaves the pre-restore snapshot available for reversal.

Folder moves use a movement manifest with `itemId`, old parent, new parent, reason, timestamp, and canonical counterpart if any. Reversal moves the same IDs back; it never recreates data by name.

## Year-end alumni conversion

Create a snapshot, reconcile deeds and hours, then update lifecycle fields for the selected cohort. Keep `studentId`, profile history, media history, LINE binding, and deed history. Move or index alumni material by stable IDs and retain a contact-permission field. Do not disable access automatically unless the administrator explicitly chooses that policy.
