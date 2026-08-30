# SOP — HEALTH / เวชระเบียน ห้องพยาบาล และคลังยา

## 1. Purpose
บริหารข้อมูลสุขภาพนักเรียน ห้องพยาบาล การไปโรงพยาบาล หัตถการ ยา คลังยา นัดหมาย วัคซีน การติดตามอาการ เอกสารและการแจ้งผู้เกี่ยวข้อง โดยแยกสิทธิ์จากงานปกครองทั่วไปและใช้ข้อมูลเท่าที่จำเป็น

## 2. Source strategy
Legacy/current health projects are reference sources, not automatically production data. If a source contains demo/test/unverified rows, preserve it read-only and do not import wholesale. Production uses a clean Health Data Master created without patient rows. A newer/richer legacy candidate may be `SCHEMA_REFERENCE`, never proof that every row is valid production data.

## 3. Identity
`student_id` is resolved through CORE IDENTITY and mapped to an internal RecipientID. Health does not maintain a separate student password database. Staff access is from central authenticated staff subject + health-specific scope. Generic admin/governance role does not grant clinical detail.

## 4. Core entities
Authorized staff bindings, ServiceRecipients, Visits, Vitals, Assessments, Treatments, Medicines, Dispensing, InventoryTransactions, ContactNotifications, Referrals, FollowUps, Attachments, Settings, AuditLogs, InfirmaryStays, Immunizations, HealthAppointments and HospitalRequests.

## 5. Visit workflow
`OPEN_CASE → TRIAGE/ASSESS → CARE/OBSERVE → MEDICATION/PROCEDURE if authorized → OUTCOME → REFERRAL/FOLLOW_UP if needed → CLOSED`.

Clinical decisions remain with authorized human staff. AI may summarize records or draft notes but must not diagnose, prescribe, determine emergency disposition or override professional judgment.

## 6. Hospital request workflow
`REQUESTED → ADVISOR/GOVERNANCE ACKNOWLEDGEMENT where policy requires → HEALTH_REVIEW → APPROVED/ARRANGED → DEPARTED → HOSPITAL_RESULT → FOLLOW_UP → CLOSED`.

The exact approval chain comes from verified organizational policy. Do not fabricate a required approver. Urgent/emergency procedures must not be delayed merely to satisfy a non-clinical workflow step when policy permits emergency action.

## 7. Medication and stock
Medicine catalog tracks code/name/form/strength/unit/lot/expiry/storage/reorder status. Dispensing always links visit/recipient/medicine/quantity/directions/authorized dispenser/time. Every dispense creates an inventory transaction. Stock balance is derived from controlled stock movements; manual balance overwrite requires exceptional authorization and audit.

Expired/recalled/blocked lots cannot be dispensed. Low-stock alert is deterministic. AI does not alter stock.

## 8. Infirmary, immunization and appointments
Infirmary stay records admission/discharge/bed/status/observation. Immunization records vaccine/dose/date/lot/provider/evidence. Appointment records hospital/time/reminder/status. Reminder messages contain minimal detail and direct the user to authenticated app for specifics.

## 9. Data classification and notifications
Health is `SENSITIVE_HEALTH`. Telegram/LINE notifications must not disclose diagnosis, medication list or detailed complaint unless a verified policy explicitly requires it and the recipient is authorized. Prefer “มีรายการสุขภาพใหม่/นัดหมาย กรุณาเปิดระบบ”.

## 10. Migration
1. Freeze source snapshots.
2. Separate rows marked demo/test and rows not tied to verified identity.
3. Compare candidates; select schema reference.
4. Start clean production master empty.
5. Build deterministic identity mapping.
6. Review each migration cohort; import only verified rows with provenance and source record key.
7. Reconcile counts by entity and date range.
8. Run access-control and clinical workflow tests.
9. Enable read before write.

No automatic migration by matching person name alone.

## 11. Academic-year policy
Health history is longitudinal; medical records are not reset on 1 August. `AcademicYear` on transactions supports reporting, while clinically relevant longitudinal data remains linked across years under the same verified identity. Annual rollover updates reporting defaults/roster status, not clinical history.

## 12. Audit and rollback
Audit all read of highly sensitive records where feasible and all writes without exception. Record actor, purpose/scope, entity, action, time, correlation ID and outcome. Migration rollback disables new master pointer and restores prior read source; never delete migrated source rows to simulate rollback.

## 13. Acceptance tests
- Clean master contains no demo/test patient rows before approved import.
- Central identity is required.
- Unauthorized staff cannot search clinical detail.
- Dispensing always produces stock movement.
- Closed case history remains immutable except versioned correction.
- Notifications minimize sensitive content.
- Reports can filter by academic year without destroying longitudinal history.
- Backup/restore and access audit verified.

## 14. Activation gate
Health write remains disabled until identity gate and preceding migration gates are complete, clean master schema is verified, health-specific staff accounts/scopes are approved, backup/rollback exists and an authorized owner approves production activation.
