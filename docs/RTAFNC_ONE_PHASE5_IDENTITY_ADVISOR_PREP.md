# RTAFNC ONE — Phase 5 Identity Registry + Advisor Assignment Preparation

Status: INTEGRATION BRANCH / PREPARED FOR REAL DATA
Branch: `rtafnc-one-integration`

## Confirmed decision
For nursing students (นพอ.), the canonical `RTAFNC_ID` is the official **7-digit student ID**.

No alternative internal ID will replace the 7-digit student ID for student-facing identity.

For staff/advisors, no new canonical personnel ID is invented in this phase. Existing Good Deed `memberId` remains an authentication subject reference until an authoritative personnel source is supplied.

## Student identity contract
A value becomes canonical `RTAFNC_ID` only when it passes all gates:
1. exact 7 ASCII digits (`^[0-9]{7}$`)
2. comes from an approved/verified student source
3. not duplicated across two active student identities
4. if matched to legacy Good Deed, the existing `MembersV2.studentId` relationship is reviewed before any correction

Invalid, missing, conflicting or duplicated IDs go to review. They are never silently corrected.

## Identity registry target fields
- `rtafnc_id` — 7-digit student ID; primary student key
- `student_id` — same canonical value for compatibility
- `member_id` — legacy Good Deed account reference
- `display_name`
- `cohort`
- `line_user_id_hash` / secure binding reference (never expose raw LINE user id publicly)
- `telegram_binding_ref`
- `active`
- `source_ref`
- `source_version`
- `verified_at`
- `verification_status`

Sensitive channel IDs and personal data must not be committed to a public GitHub repository.

## Import / reconciliation when the student list arrives
The import is staged and reversible:

`Source list -> Normalize -> Validate 7 digits -> Deduplicate -> Match legacy MembersV2 -> Review conflicts -> Approve -> Publish Identity Registry`

Possible statuses:
- `MATCHED`
- `NEW_STUDENT`
- `MISSING_LEGACY_ACCOUNT`
- `INVALID_ID`
- `DUPLICATE_ID`
- `NAME_MISMATCH_REVIEW`
- `COHORT_MISMATCH_REVIEW`
- `INACTIVE_REVIEW`

No row is deleted during reconciliation.

## Advisor assignment preparation
The assignment table is prepared now, but real rows will be loaded only from the user-supplied advisor list/order/sheet.

Required fields:
- `academic_year`
- `student_id` (7 digits)
- `advisor_ref` (must eventually bind to an authenticated staff account)
- `advisor_display_name`
- `effective_from`
- `effective_to`
- `status`
- `source_ref`
- `source_version`
- `verified_at`

### Critical authorization rule
**Advisor name alone never grants access.**

A real advisor can access assigned student context only when:
1. advisor account is authenticated
2. advisor account is bound to the authoritative advisor/personnel identity
3. an active assignment exists for the same academic year/student
4. the requested module permits advisor access
5. purpose/scope and audit requirements pass

## Module separation
Assignment does not imply universal access.

Examples:
- Advisor module: assignment can allow advisor workflow access
- Scholarship: only approved scholarship/advisor fields
- Health: assignment alone does not grant full medical-record access
- Mental health/counseling: restricted purpose-specific access only
- Dorm/Laundry: no advisor access unless separately authorized

## What is deliberately NOT done yet
- no advisor names are invented
- no advisor-to-student relationships are inferred
- no staff RTAFNC_ID is invented
- no production database is overwritten
- no LIFF endpoint is changed
- no `main` branch merge

## Next data inputs
When available:
1. official/current student list with 7-digit student IDs
2. official/current advisor assignment list/order/sheet

Both will first run through validation/reconciliation reports before any write to production.
