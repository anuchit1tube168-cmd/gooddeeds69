# SOP — GOOD DEED / บันทึกความดี

## 1. Purpose
จัดการบันทึกความดีแบบ ledger ที่ตรวจสอบย้อนกลับได้ ตั้งแต่การส่งหลักฐาน การทบทวน/อนุมัติ การสรุปชั่วโมงรายบุคคล ไปจนถึงรายงานภาพรวม โดยไม่แก้ยอดสะสมแบบทับค่าเดิม

## 2. Data model
- Student identity comes from CORE IDENTITY only.
- `GoodDeedRecord` is immutable after approval except through explicit reversal/correction transaction.
- Key fields: record ID, student business key, category/rule version, activity date, requested hours, approved hours, evidence reference, status, reviewer, reason, academic year, created/reviewed timestamps, correlation ID.
- Aggregate totals are derived views/cache; ledger is the authority.

## 3. Sources and reconciliation
During migration there may be three different shapes: student summary/aggregate, current-year transaction sheet, and legacy row-level history. Never assume the summary is a complete ledger or that a newer sheet contains all historical transactions.

Reconciliation sequence:
1. Snapshot every source read-only.
2. Count student identities and transaction rows separately.
3. Normalize category codes and academic-year meaning without changing the source.
4. Reject invalid/missing student identity into review quarantine.
5. De-duplicate only with deterministic record key/evidence; never delete possible duplicates automatically.
6. Sum approved rows by student/category/year.
7. Compare calculated sums with summary totals and produce `MATCH`, `DRIFT`, `SOURCE_ONLY`, `SUMMARY_ONLY` buckets.
8. Resolve drift before production read/write cutover.

## 4. Submission workflow
`DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED | REJECTED | NEEDS_MORE_INFO`.

A correction after approval creates `REVERSAL/CORRECTION` linked to the original transaction. It does not edit history silently.

## 5. Rules engine
Rules are versioned by effective academic year/date. Examples such as fixed-event hours, daily maximum or eligible categories must come from the verified rule source for that period. The application must never invent or retroactively apply a current rule to older records without an approved migration rule.

## 6. Permissions
- Student: create/view own records and evidence status.
- Reviewer/Governance authorized: review records in assigned scope.
- Admin operations: manage rule/configuration and queues, but does not gain unrelated sensitive-domain access.
- No endpoint accepts an arbitrary student ID from the UI for self-service; backend resolves identity from authenticated session.

## 7. Evidence
Evidence files stay private. Public GitHub stores no evidence URLs or Drive IDs. File validation covers type/size, malware/safety policy where available, ownership/reference and retention. Download/open requires authorization every time.

## 8. Notifications
Telegram is preferred for staff operations; LINE reserved for urgent/high-value user events according to quota policy. Message body contains minimum necessary details, e.g. “มีรายการรอตรวจ” and a secure link; do not include sensitive attachments or full personal records in the message.

## 9. Academic-year rollover
On 1 August: snapshot ledger and aggregates → freeze previous-year posting except controlled correction → activate new rule version/current-year defaults. Historical records retain their original academic year and approval history. Do not copy old transactions into the new year.

## 10. Audit/idempotency
Every write has actor, action, target record, academic year, correlation/idempotency key, before/after status reference and result. Repeated network submissions with same idempotency key must not create duplicate deeds.

## 11. Failure and rollback
If reconciliation fails, keep old production system active and new module read-disabled/write-disabled. If post-cutover inconsistency appears, freeze new writes, export current delta, restore previous active backend pointer and replay only reviewed delta transactions.

## 12. Acceptance tests
- Legacy row count and computed approved totals documented.
- Aggregate-by-student/year matches ledger after approved reconciliation.
- Duplicate retry creates one transaction.
- Self-only access enforced server-side.
- Approved record cannot be silently overwritten.
- Rule version and academic year are retained.
- Public repository scan shows no real student data.

## 13. Activation gate
First activate read-only after identity and reconciliation pass. Enable submission write separately. Enable reviewer approval only after queue/audit/reversal tests pass. Never turn all permissions on in one cutover.
