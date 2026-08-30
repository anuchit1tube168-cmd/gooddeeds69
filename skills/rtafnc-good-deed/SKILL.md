# RTAFNC Good Deed Skill

## Purpose
Use for Good Deed submission, review, ledger reconciliation, approved-hour calculation, reporting, rule-version application and migration from legacy Good Deed sources.

## Non-negotiable rules
- Ledger is authoritative; aggregate totals are derived.
- Never overwrite an approved record silently. Correction is linked reversal/correction transaction.
- Resolve student identity server-side from authenticated CORE IDENTITY.
- No arbitrary student ID input for self-service.
- Never infer a missing activity, category, date or approved hours.
- Real rows/evidence/identities stay private; GitHub contains schema and placeholders only.

## Source model during migration
Possible sources may include: student aggregate/summary, current-year transaction table and legacy row-level ledger. Treat each as a separate source until deterministic reconciliation proves equivalence. Newer file does not automatically mean complete history.

## Canonical record
```text
record_id
student_id_ref
academic_year
category_code
rule_version
activity_date
requested_hours
approved_hours
description
evidence_ref
status
reviewer_subject
review_reason
submitted_at
reviewed_at
correlation_id
source_provenance
```

## Reconciliation procedure
1. Snapshot sources read-only.
2. Validate identity references against CORE.
3. Count rows, unique students and status distribution.
4. Normalize category mapping by verified source rule version.
5. Generate deterministic record fingerprint from stable source fields; do not delete duplicates automatically.
6. Quarantine invalid identity/unresolved duplicate rows.
7. Sum approved hours by student/category/academic year.
8. Compare with summary aggregates.
9. Produce `MATCH`, `DRIFT`, `LEDGER_ONLY`, `SUMMARY_ONLY`, `IDENTITY_CONFLICT` report.
10. Human-review all drift before cutover.

## Submission state machine
`DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED | REJECTED | NEEDS_MORE_INFO`.
Approved correction: `APPROVED → CORRECTION_REQUESTED → REVERSAL/CORRECTION_TRANSACTION → RECONCILED`.

## Rule engine
Rules must be versioned with effective date/year. Fixed hours, daily/term caps, mandatory categories and funding/eligibility effects are read from verified rule data. Never apply present rules retroactively unless migration policy explicitly says so.

## Permissions
Student: own create/read. Reviewer: assigned review queue only. Governance admin: rule/configuration/operations within scope. Evidence download always re-authorizes. AI may draft summary or flag likely duplicate; final approval remains deterministic/human-authorized.

## Idempotency
Submission/review endpoints require idempotency/correlation key. Same key + same payload returns prior result; same key + conflicting payload fails. This prevents double hours caused by network retries.

## Audit
Log actor, action, record, prior/new status, approved-hour change, rule version, reason, correlation ID and timestamp. Aggregation rebuild must produce a reconciliation report/checksum.

## Academic-year behavior
New transactions default to current year derived server-side from date/policy. Historical records preserve original academic year. At 1 August freeze prior-year normal posting, open new rule context and allow only controlled correction to prior history.

## Notifications
Send minimum necessary content. Staff may receive queue alert via Telegram; student may receive decision alert via LINE depending quota/policy. Do not send evidence or full personal record in notification body.

## Failure behavior
If ledger/summary mismatch is unresolved, keep new backend write disabled. Return explicit states such as `RECONCILIATION_REQUIRED`, `IDENTITY_NOT_READY`, `RULE_VERSION_NOT_FOUND`, `SCOPE_DENIED`, `DUPLICATE_REVIEW_REQUIRED`. Never manufacture a total to make reports balance.

## Tests
- Ledger aggregate equals approved summary after reconciliation.
- Retry does not duplicate record.
- Student self-only isolation.
- Reviewer scope isolation.
- Approved correction preserves original transaction.
- Academic-year boundary test.
- Evidence authorization test.
- Rollback/rebuild test.

## Activation
Read-only bridge first, submission write second, approval write third. Each stage needs independent acceptance and rollback. Never enable all write capabilities at once.
