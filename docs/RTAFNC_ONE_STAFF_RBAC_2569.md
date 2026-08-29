# RTAFNC ONE — Staff Directory & RBAC 2569

## Runtime data minimization
RTAFNC ONE must not read the full personnel roster directly. The app-facing directory contains only:
- display_name
- staff_group
- dashboard_role
- photo_status
- account_status
- academic_year
- active

Photos remain `PENDING_PHOTO` until separately supplied and verified.

## Base dashboards
- EXECUTIVE_DASHBOARD — college-wide aggregate only by default.
- GOVERNANCE_DASHBOARD — governance workflows, Good Deed approval, advisor assignment administration, apparel/borrowing/supply workflows.
- FACULTY_DASHBOARD — own teaching, supervision/evaluation, relevant work queues.
- SUPPLY_DASHBOARD — assigned apparel, borrowing, supplies/assets operations.
- SUPPORT_DASHBOARD — assigned support modules only.
- HEALTH_DASHBOARD — only for explicitly authorized health personnel.

## Advisor is additive
Advisor access is never inferred solely from rank/title. It is granted from the current academic-year advisor assignment table. A faculty/support member may therefore have a base dashboard plus `ADVISOR_ADDITIVE` access for assigned students only.

## Sensitive data boundaries
- Advisor private notes: assigned advisor only + specifically authorized oversight when policy permits.
- Health records: health-authorized roles only.
- IT/admin does not automatically inherit clinical or counselling content.
- Executive reporting defaults to aggregate/de-identified views.

## Academic-year rule
All staff assignments and module assignments are versioned by academic year. Cutover is 1 August Asia/Bangkok. Historical assignments are preserved; the new year creates a new assignment version.

## Canonical naming
The July 2569 personnel roster is the canonical source for staff display names. Advisor order/document name variants are not silently corrected; mismatches are marked for review before account binding.
