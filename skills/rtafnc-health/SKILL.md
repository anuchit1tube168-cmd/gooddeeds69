# RTAFNC Health Skill

## Purpose
Use for RTAFNC ONE health-record, infirmary, hospital request/referral, treatment, medicine inventory/dispensing, vaccination, appointment and follow-up operations.

## Safety boundary
This is an operational record/workflow skill, not a diagnosis engine. AI may retrieve, summarize, structure and draft. AI must not diagnose, prescribe, independently determine emergency disposition or override authorized clinical personnel.

Health information is `SENSITIVE_HEALTH`. Generic teacher/admin/governance role does not automatically grant access.

## Source strategy
- Legacy health systems may contain demo/test or non-student rows.
- Keep legacy/current candidates read-only as provenance/schema references until verified.
- Production Health Data Master starts clean and empty.
- Never copy a legacy database wholesale into production merely because it is newer.
- Import requires exact verified identity mapping and explicit health migration approval.

## Identity/auth
Use central RTAFNC ONE session. Resolve `<student_id_7_digits>` to internal `RecipientID` server-side. Do not maintain a separate student password table as identity authority. Health staff use verified staff subject + health-specific scopes.

## Entity contract
Core: authorized staff binding, ServiceRecipients, Visits, Vitals, Assessments, Treatments, Medicines, Dispensing, InventoryTransactions, ContactNotifications, Referrals, FollowUps, Attachments, Settings, AuditLogs.

Extended: InfirmaryStays, Immunizations, HealthAppointments, HospitalRequests.

## Allowed operations
Read/write only inside authorized purpose and scope. Student may see own permitted health history/request status. Health staff may record care within assigned role. Governance/advisor may see only workflow/status information explicitly permitted, not full clinical narrative.

## Visit state machine
`OPEN → ASSESS → CARE/OBSERVE → OUTCOME → REFERRAL/FOLLOW_UP if applicable → CLOSED`.
Closed data uses versioned correction, not silent overwrite.

## Medicine/stock invariants
- Dispense requires active medicine/lot and authorized staff.
- Quantity must be valid and not exceed available controlled balance unless an explicit exception policy exists.
- Every dispense/cancel produces an inventory transaction.
- Expired/recalled/blocked lot cannot be dispensed.
- Stock balance is derived/reconciled from transactions; manual balance override is exceptional and audited.

## Hospital request
Keep approval chain configurable from verified organizational policy. Typical workflow is request → required acknowledgements/approvals → health review/arrangement → departure → result → follow-up, but do not invent a mandatory approver when source policy is absent. Emergency care must follow real emergency policy and must not be delayed by automation.

## Migration algorithm
1. Snapshot source.
2. Identify demo/test marker and invalid identity rows.
3. Compare source schemas/versions.
4. Select schema reference.
5. Prepare clean target with no patient rows.
6. Exact identity map only; no name-only auto-match.
7. Import approved batch with provenance.
8. Reconcile entity counts and key relationships.
9. Validate access controls/audit.
10. Activate read before write.

## Notification minimization
Do not push diagnosis, detailed complaint or medication list to general messaging. Prefer generic “มีรายการสุขภาพ/นัดหมายใหม่ กรุณาเปิดระบบ” plus authenticated deep link.

## Academic year
Clinical history is longitudinal and not reset each August. Transaction rows include academic-year/reporting context. Rollover changes current reporting/roster defaults, never duplicates or erases clinical history.

## Audit
Log sensitive write actions and sensitive reads where supported: actor, purpose/scope, entity/action, timestamp, correlation ID, outcome. Do not log full secrets or unnecessary clinical text in generic application logs.

## Failure behavior
Fail closed: `HEALTH_MASTER_NOT_ACTIVE`, `IDENTITY_NOT_VERIFIED`, `HEALTH_SCOPE_DENIED`, `MEDICINE_NOT_DISPENSABLE`, `STOCK_CONFLICT`, `MIGRATION_REVIEW_REQUIRED`. Never substitute demo data or another recipient.

## Tests
Central identity, least-privilege scopes, patient isolation, no demo import, dispense/stock invariants, cancelled dispense reversal, attachment authorization, appointment reminder minimization, longitudinal/year reporting, backup/restore and audit.

## Activation gate
Production write requires clean master, verified identity, health-specific staff binding, migration review, backup/rollback, audit, deterministic stock controls and explicit authorized owner activation. Build may occur earlier; write remains disabled until gate passes.
