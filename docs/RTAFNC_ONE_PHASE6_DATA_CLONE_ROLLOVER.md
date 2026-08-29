# RTAFNC ONE — Phase 6 Data Clone & Academic-Year Core

Status: INTEGRATION / SOURCE READ-ONLY / CLONES ONLY

## Confirmed project sources
Existing RTAFNC/college projects are reused rather than rebuilt from scratch:

- GOOD_DEED — legacy student + deed data and current Good Deed V2 workflow
- APPAREL — apparel entitlement/catalog data and existing web/GAS assets
- BORROWING — Equipment + Transactions
- GOV_SUPPLIES — Categories + Items + Requisitions + RequisitionItems + StockMoves + Audit
- ASSET_PROCUREMENT — procurement/project/stock/asset-related tables
- HEALTH — medical record data including Medicines + Dispensing + InventoryTransactions

All source projects remain read-only during integration. RTAFNC ONE writes only to clone/staging targets until a module passes validation and cutover is explicitly approved.

## Good Deed migration
Preserve all legacy deed records as immutable ledger history.

Migration projection:
- keep: student_id, identity/profile fields needed by RTAFNC ONE, deed record fields, evidence references, approval status, approved_by, timestamps, academic_year
- do not migrate legacy plaintext/default passwords into the new identity system
- approved-hour totals are calculated from approved ledger records; never overwrite a student's total counter
- existing academic-year values are immutable

Legacy/test/security data is retained only in source/archive for audit; it is not treated as an authentication credential.

## Migration classification
Every imported record is classified before activation:
- REAL_VERIFIED
- DEMO
- TEST
- REVIEW
- INVALID_ID
- DUPLICATE

DEMO/TEST/INVALID/REVIEW records never become production student transactions automatically.

## Academic year policy
Timezone: Asia/Bangkok
Cutover: 1 August every year

Rule:
- Aug 1 through Dec 31: academic_year = Gregorian year + 543
- Jan 1 through Jul 31: academic_year = Gregorian year + 542

Examples:
- 2026-07-31 => 2568
- 2026-08-01 => 2569
- 2027-07-31 => 2569
- 2027-08-01 => 2570

### On rollover
1. Snapshot current master/transactions/config.
2. Compute the new academic year in Asia/Bangkok.
3. Create/activate new-year defaults only after validation.
4. Carry forward reference masters where appropriate:
   - identity and verified roster state
   - staff directory
   - advisor rules/assignment history (new official assignment still required when changed)
   - item/equipment/medicine catalogs
   - templates/settings
5. Do NOT rewrite historical transaction years:
   - Good Deed ledger
   - borrowing transactions
   - requisitions/stock moves
   - medical visits/dispensing/inventory transactions
   - procurement transactions
6. Recalculate student year level only from verified roster/cohort/status. Never blindly +1 every student.
7. Graduated/HOLD/INACTIVE cases go to review, not automatic promotion.
8. Run count/conflict/checksum checks.
9. Activate current-year pointer.
10. Rollback restores the previous pointer/snapshot without deleting the new attempt.

## Domain boundaries
Shared identity does not mean shared sensitive data.
- Apparel/Borrowing/Supplies do not receive health/counseling data.
- Health does not expose records to generic admin roles without health-specific scope.
- Student-facing modules query by verified 7-digit student_id.
- Staff access is role + scope + assignment/purpose where applicable.

## Existing-data cautions found during inspection
### Borrowing
Equipment data exists, but the legacy Transactions sheet contains test/example identities. Transaction migration must be classified and verified before activation.

### Health / medication
The existing schema includes Medicines, Dispensing and InventoryTransactions. Some rows explicitly carry IsDemo=true; those must remain non-production. Two medical database candidates exist, so HEALTH_MASTER_DB remains unresolved until comparison and explicit approval.

### Apparel
The management spreadsheet itself is currently sparse/empty, while the project has a richer male/female entitlement catalog in JSON and official rate/order source documents. The catalog/order sources must be reconciled before declaring the spreadsheet a master.

## Cross-device requirement
One responsive frontend, not separate phone/tablet/desktop applications.
- mobile-first HTML/CSS/JS
- viewport-fit and safe areas
- minimum 44px touch targets
- responsive grids for phone/tablet/notebook/desktop
- no hover-only critical action
- same API and permission rules on every device

## MK-like upgrade principle
Reuse the reliable backend/data/workflows and upgrade the experience:
- one LINE OA / LIFF front door
- digital student card
- action feed instead of dashboard overload
- fast service tiles
- status/timeline for each request
- QR where appropriate
- one notification/inbox experience
- centralized identity, workflow, notification, document and audit services

The visual/interaction concept may be inspired by modern membership/service applications, but no third-party branding/source/assets are copied.
