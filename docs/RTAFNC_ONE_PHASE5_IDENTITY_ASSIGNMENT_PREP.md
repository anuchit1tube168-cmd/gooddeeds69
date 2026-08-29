# RTAFNC ONE — Phase 5 Identity + Advisor Assignment Preparation

Status: PREPARED / NO REAL STUDENT IDS / NO REAL ADVISOR ASSIGNMENTS
Branch: `rtafnc-one-integration`

## User-confirmed direction
- Student identifiers will be supplied later as 7-digit student IDs.
- Advisor names/assignments already exist and will be supplied later.
- Do not invent either dataset.

## Migration principle
Do not replace or delete existing Good Deed `memberId` values. They remain legacy technical identifiers for compatibility.

Use the 7-digit `student_id` as the canonical business key for student-facing RTAFNC ONE modules once verified.

Identity relation:

`memberId (legacy technical key) -> student_id (7 digits, verified) -> LINE userId -> Telegram chat_id -> module records`

No irreversible rewrite is allowed until validation passes.

## Identity Registry target
Required fields:
- `student_id` — exactly 7 digits, canonical business key for students
- `legacy_member_id` — existing Good Deed V2 memberId; nullable for new records
- `display_name`
- `cohort`
- `status` — ACTIVE / INACTIVE / GRADUATED / HOLD
- `line_user_id` — server-verified binding only
- `telegram_chat_id` — verified binding only
- `identity_version`
- `verified_at`
- `verified_by`
- `created_at`
- `updated_at`

Rules:
1. Never infer a missing 7-digit ID from name, cohort, LINE ID or file order.
2. One active student_id must not map to multiple active people.
3. One LINE userId must not bind to multiple active identities.
4. Legacy memberId remains readable until every dependent module is migrated.
5. Changes create a new audit/version event; do not silently overwrite identity history.

## Import workflow when IDs arrive
1. Load candidate roster in STAGING only.
2. Validate format `^[0-9]{7}$`.
3. Detect duplicate student IDs.
4. Match against existing Good Deed MembersV2 using exact studentId first.
5. Name-based matches are REVIEW ONLY, never auto-confirmed.
6. Produce four buckets:
   - MATCHED_EXACT
   - NEW_IDENTITY
   - CONFLICT
   - MISSING_REQUIRED_DATA
7. User/admin reviews conflicts.
8. Only approved rows move to ACTIVE Identity Registry.
9. Keep original source file and import report for rollback/audit.

## Advisor Assignment Registry target
No assignment data is created until the real source is supplied.

Required fields:
- `assignment_id`
- `academic_year`
- `student_id`
- `advisor_staff_key`
- `advisor_display_name`
- `assignment_type` — PRIMARY / CO_ADVISOR / TEMPORARY
- `effective_from`
- `effective_to`
- `status` — ACTIVE / ENDED / PENDING_REVIEW
- `source_ref`
- `source_version`
- `approved_by`
- `approved_at`
- `created_at`
- `updated_at`

Rules:
1. Never assume every teacher is an advisor.
2. Never infer assignment from counseling history, class, surname or file position.
3. A student may have history across academic years; do not overwrite prior assignments.
4. Current access is determined by ACTIVE assignment + effective dates + role.
5. Advisor access to sensitive student records requires purpose/scope checks in addition to assignment.

## Authorization target
Example:

Student:
`student_id == session.student_id`

Advisor:
`role contains ADVISOR` AND `active assignment exists for student_id` AND `requested scope is allowed`

Staff/Admin:
`role/scope policy` — admin status alone does not imply access to counseling or health detail.

## Rollback
Phase 5 is additive:
- no deletion of MembersV2
- no renaming of existing studentId fields in production
- no forced replacement of LINE bindings
- no Advisor assignment writes until source is verified

Rollback = stop using Identity/Assignment Registry and continue using Good Deed V2 as before.

## Data needed later from user
### Student identity source
Prefer XLSX/CSV/Google Sheet with at least:
- student_id (7 digits)
- full name
- cohort/year
- active status if available

### Advisor assignment source
Prefer official order/Excel/Google Sheet containing:
- academic year
- student ID or unambiguous student name
- advisor name
- effective period if present

If a source lacks student IDs, rows remain PENDING_REVIEW until reconciled against verified Identity Registry.
