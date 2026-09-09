# Good Deed review storage contract

Updated: 2026-09-09. DRAFT / STAGING ONLY / PRODUCTION WRITE = FALSE.

## Observed schema and current behavior

The private Good Deed staging workbook was inspected through bounded native header reads. No student rows are fixture material. Master has 22 columns and the deed ledger has eight: status is G and submitted time is H. `staging-columns.example.json` records their explicit header names, including all nine category-hour columns.

`Code.gs` is an eleven-column legacy writer. Its submission and review paths now verify the expected ledger headers, their positions and uniqueness before any effect. Master identity/category/total headers must also match before adding hours. Missing sheets are not created by submission. Renamed, reordered or duplicate headers fail closed. Do not rename staging headers or insert columns merely to satisfy this guard.

| Component | Implemented behavior | Limit |
| --- | --- | --- |
| Legacy submission | Validates identity, stored member, schema, deed ID, half-hours, date and text; escapes formula-leading text; upload after validation; append/flush before notification | Internal legacy function only; raw public POST remains denied; no durable outbox |
| Legacy review | Stored owner/category/hours, schema guard, duplicate/conflict checks and preserved formulas | Eleven-column contract only; uncertain cross-sheet writes need reconciliation |
| `GoodDeedReviewPlan.gs` | Pure mapped calculation for eight-column ledger and official Master; returns cell preconditions, proposed changes and preserved formulas | No authorization, policy validation, persistence, signature capture, journal, HTTP route or notification |
| Signed gateway adapter | Existing self card/list reads | Staff queue, submission, review, evidence and activation remain disabled |

## Planning inputs and guarantees

`buildGoodDeedReviewPlan_(snapshot, review, maps)` accepts:

- `snapshot.master` and `snapshot.ledger`, each with complete rectangular `values` and `formulas` matrices including the header row. Both matrices must come from the same controlled server read; formula metadata is mandatory. Never accept these matrices from a browser.
- `review` containing only `deedId` and `decision` (`approved` or `rejected`). Client-provided owner, category, hours and role are rejected.
- Explicit `masterColumnMap` and `ledgerColumnMap` as shown in the schema example. All mapped headers must exist exactly once and different fields cannot alias the same column.

The function does not read or write a service. Every result has `executable: false`. It finds one exact ledger record and one exact Master identity, follows mapped headers after column reordering, validates stored half-hours and refuses formula-driven identities/ledger facts. Sheet identities become canonical seven-digit strings without padding, guessing or granting access.

For an approval, only the selected numeric category and existing numeric official total receive the stored increment. All nine official category values and the total must be valid nonnegative half-hours with safe numeric precision. Existing carry-forward stays in the official total; loaded ledger sums are never a replacement. Existing category or total formulas are preserved and their proposed `after` value is `null` until a future writer can read the recalculated official result. Grade, level, thresholds and other columns are never rewritten or inferred.

A rejection proposes only a status change. The same already-final decision produces no changes. An opposing decision fails with `REVIEW_CONFLICT`; `approving` fails with `REVIEW_RECONCILIATION_REQUIRED`. Inputs remain unchanged. Cell coordinates are one-based; `master`/`ledger` are logical table names, not hard-coded sheet IDs.

Preconditions include mapped headers and the relevant rows' values/formulas. They describe what a future locked reread must compare. They are not an atomic Sheets compare-and-swap operation, a review receipt, or permission to execute the changes one at a time.

## Required integration before any review writer

The existing gateway's `cloudflareReviewDeed` body contains deed ID, decision and note. It does not yet carry verifiable fresh-signature proof. A staff role alone also does not establish an assigned student/cohort scope. Preserve the current disabled review flag until these are implemented and tested server-side.

Additional staging headers were observed:

| Sheet | Header count | Relevant finding |
| --- | --- | --- |
| Reviews | 13 | Includes reviewer identity, request ID, previous/new hours and level, summary-applied marker |
| Notifications | 7 | Includes event identity, student/deed, channel, status, sent time and error code |
| Audit | 18 | Includes actor/action/entity/outcome and hashed detail references |
| Evidence | 9 | File metadata and ownership references; no explicit signature purpose or fresh-signature provenance |

Their existence is not proof of a working journal, outbox or signature protocol. The next writer must use verified identity plus assigned scope, bind fresh private signature evidence to that reviewer/deed/decision, enforce the configured official category/academic-period rules, reread under the lock and commit with durable idempotency and recoverable audit/outbox state. The planner's 0.5–24 input range does not implement annual ceilings, donation spacing, term boundaries or policy exceptions.

Do not execute a stale plan or copy one into a browser request. Reconciliation must preserve original records and compare actual persisted changes before any retry. Do not auto-reset uncertain states or restore an old full-sheet backup over ongoing writes.

## Failure handling for the retained legacy function

| Code / condition | Meaning and next action |
| --- | --- |
| `ledger_schema_incompatible` / `master_schema_incompatible` | Stop; compare headers against the correct adapter contract before any upload/write |
| `deed_identity_conflict` | ID already exists; inspect its persisted state, do not generate a new ID to force a retry |
| `submission_requires_reconciliation` | Append was attempted and completion is uncertain; the response includes deed ID for investigation; retain the row/evidence and check before retrying |
| `evidence_upload_failed` | No ledger append or notification follows an unsuccessful upload |
| Notification exception after persistence | The saved deed remains successful; this does not prove delivery, and legacy has no durable retry owner yet |

Evidence created before an uncertain append can remain private without a confirmed ledger link. Preserve it for reconciliation; do not delete it or claim that submission has a complete transactional rollback. Stable request/deed identity is still required across client/network retries in the final writer.

## Verification

`tests/review-plan.test.cjs` uses only synthetic eight-column/22-column snapshots and no Apps Script/network service. It covers mapped coordinates, preserved carry-forward and formulas, reordered/duplicate/aliased headers, corrupt/missing identities and formula matrices, conflicting/repeated decisions, invalid numbers and request overrides. Adapter tests additionally verify that loading this module does not enable any staff/write/evidence/activation route.

`tests/regression.test.cjs` exercises the retained legacy function with realistic headers and observable append/flush/notification ordering, schema and ID rejection, literal text, invalid dates, unavailable lock, evidence failure and uncertain append/replay. These are local behavioral tests, not live provider E2E or a production readiness certificate.

## เงื่อนไขบังคับของระบบ (Non-negotiable Conditions)

Preserve records, hours, private evidence and signatures. Student Master remains canonical; LINE identity verification and assigned scope are server decisions. GitHub contains source/synthetic tests only. Follow `AGENTS.md` for the official policy source, backup/rollback proof and staging/cutover gates. No production changes were made by this work.
