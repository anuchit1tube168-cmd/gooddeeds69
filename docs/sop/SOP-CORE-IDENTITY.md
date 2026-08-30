# SOP — CORE IDENTITY / STUDENT MASTER

## 1. Purpose
สร้างตัวตนกลางของ RTAFNC ONE ที่ทุกโมดูลใช้อ้างอิงเหมือนกัน โดยนักเรียนใช้ `student_id` แบบเจ็ดหลักเป็น business key และรักษา legacy technical key ไว้เพื่อ compatibility/rollback จนกว่าจะย้ายระบบเสร็จสมบูรณ์

## 2. Scope
ครอบคลุม Student Master, Staff directory lookup, LINE binding, Telegram binding, role/scope projection, academic-year roster, identity versioning และ mapping ไปยัง legacy systems. ไม่ครอบคลุมข้อมูลสุขภาพหรือ counselling content.

## 3. Source hierarchy
1. Official/verified student roster for the academic year.
2. Identity staging generated from that source.
3. Existing module identity references used only for exact reconciliation.
4. Name-only, class-order-only or cohort-only matches are REVIEW signals, never automatic identity proof.

Public code must refer to logical source keys only. Private file IDs and real identity rows stay outside GitHub.

## 4. Required fields
`student_id`, `display_name`, `cohort`, `status`, `academic_year`, `identity_version`, optional `legacy_member_id`, server-verified LINE binding, Telegram binding and audit timestamps. Staff identities use a separate staff subject key; never manufacture a staff key from a display name.

## 5. Validation
- `student_id` must satisfy `^[0-9]{7}$`.
- One active student identity per verified student ID.
- Duplicate student ID = BLOCK + conflict review.
- Exact student ID + exact normalized official name may be `MATCHED_EXACT`.
- Name match without exact ID = `REVIEW_ONLY`.
- Missing required field = `MISSING_REQUIRED_DATA`.
- Never infer ID from file order, class number, surname, LINE profile or cohort.

## 6. Import workflow
`SOURCE_READ_ONLY → STAGING → FORMAT_VALIDATE → DUPLICATE_CHECK → EXACT_RECONCILE → CONFLICT_REPORT → AUTHORIZED_REVIEW → ACTIVE`.

Possible row states: `MATCHED_EXACT`, `NEW_IDENTITY`, `CONFLICT`, `MISSING_REQUIRED_DATA`, `PENDING_REVIEW`, `ACTIVE`, `INACTIVE`, `GRADUATED`, `HOLD`.

No production write is allowed while any unresolved duplicate could change the person represented by a student ID.

## 7. Authentication and binding
- Browser-supplied LINE user ID is not trusted. Backend verifies LINE identity token/channel and binds server-side.
- LINE binding is one active binding per identity unless a controlled rebind procedure is approved.
- Telegram binding uses a random, short-lived, one-time token; never encode the student ID directly in the token.
- Auth session contains minimum identity projection and scopes, not full personal record.
- High-risk rebind/unbind and staff role changes require step-up/admin policy and audit.

## 8. Authorization
Student: self only. Staff: scope from verified staff account and assigned role. Advisor: requires both advisor role and active official assignment for the target student. Generic `teacher` does not imply advisor. Generic `admin` does not imply health/counselling access.

## 9. Academic-year rollover
On 1 August: snapshot current roster and identity pointer → load new official roster into staging → validate exact seven-digit IDs → calculate cohort/year state from verified roster → review graduated/hold/inactive cases → activate new roster after conflict report. Never blindly increment year level.

Identity history and prior-year relationships remain read-only and queryable.

## 10. Audit and rollback
Every create/update/bind/unbind/status change records actor, time, reason, source version, old value reference/new value reference and correlation ID. Migration is additive: do not delete or rename legacy identity fields during the transition. Rollback restores the previous active identity pointer/snapshot; source data stays intact.

## 11. Acceptance tests
- All active student IDs valid and unique.
- Exact-match count reconciled to official roster.
- Zero browser-trusted LINE identity paths.
- No real identity/IDs in GitHub.
- Student cannot read another student's module data.
- Advisor cannot read an unassigned student's counselling scope.
- Rollover dry-run produces conflict report before activation.

## 12. Activation gate
`WRITE_ENABLED` may become true only when roster validation passes, conflict count requiring identity decision is zero or explicitly resolved, auth binding is server-verified, audit path is working and rollback snapshot exists.
