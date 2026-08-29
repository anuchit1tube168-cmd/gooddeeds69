# RTAFNC ONE — Production Readiness Audit

Audit date: 2026-08-29 (Asia/Bangkok)
Status: **NOT PRODUCTION READY**
Target architecture: LINE OA/LIFF -> Cloudflare Pages -> Cloudflare Worker/Auth/RBAC -> Private Google Drive/Sheets/approved adapters

## Executive result

RTAFNC ONE integration architecture is directionally sound, but production cutover is blocked by security and connectivity gaps. The legacy public `gooddeeds69` repository must not become the new production data boundary.

## Readiness matrix

| Area | Status | Evidence / required action |
|---|---|---|
| Responsive frontend | PASS (integration) | Single HTML/CSS/JS runtime supports phone/tablet/notebook/desktop. Device E2E still required. |
| Academic-year runtime | PASS (integration) | Asia/Bangkok; cutover 1 Aug; historical records are not rewritten. |
| Existing Good Deed session reuse | PASS (integration design) | New Worker verifies the existing server-side session instead of inventing a second login. |
| Advisor relationship 2569 | PASS (private data relationship) | Official-order mapping is stored in Private Drive only; staff account binding is still pending. |
| Staff/Advisor authorization | BLOCKED | Exact verified account binding is not active yet. Display name must never grant access. |
| AGIS/Staff backend connection | BLOCKED | Frontend `AGIS_API_BASE` is blank; Worker is not connected to the browser runtime. |
| Cloudflare Worker deployment | BLOCKED | Deploy URL, allowed origins, auth verifier and server secrets are not yet production-configured. |
| Private Advisor resolver | BLOCKED | Contract exists; production resolver to Private Drive/approved DB is not connected. |
| GitHub PDPA boundary | CRITICAL BLOCKER | Legacy public repo contains student/deed/export data files and current frontend loads public student/deed data scripts. |
| Legacy authentication data | CRITICAL BLOCKER | Legacy student data contains password values derived from student IDs. Do not migrate or reuse this credential model. |
| Health/medication production write | BLOCKED | `HEALTH_MASTER_DB` is not yet approved. Keep write disabled. |
| PII prevention CI | PARTIAL PASS | Changed-file guard is hardened for transition. A clean production repository must run full-tree strict mode. |
| Negative authorization tests | NOT RUN | Must prove cross-student, cross-advisor, IT/admin-to-clinical and revoked-account access are denied. |
| Load test | NOT RUN | Target 500 concurrent; test to 750 before scale claim. |
| Real-device E2E | NOT RUN | Test LINE/LIFF on phone, iPad/tablet, notebook and desktop browsers. |

## Critical security finding

The legacy public repository includes data/export artifacts and the current student dashboard loads public data scripts for student records, student photos and deed records. This means deleting a few files from the integration branch is not a sufficient remediation and may also break the current student system.

Professional remediation:

1. Freeze legacy repo as a temporary compatibility source; do not add any new real data.
2. Create a **new clean code-only repository**, preferably private through security review.
3. Copy only reviewed source code, schemas, synthetic mocks and documentation — no legacy Git history and no production data files.
4. Deploy the new frontend from the clean repository.
5. Move student/deed/advisor data access behind authenticated backend APIs/private storage.
6. Verify E2E and authorization.
7. Cut LIFF/Rich Menu to the new frontend.
8. After successful cutover, retire public legacy data exposure and perform history-remediation/rotation as required.

## Production gates (all mandatory)

- [ ] New clean code-only repository exists and full-tree PII guard passes.
- [ ] No production page loads `students_data.js`, `students_photos.js`, `deeds_data.js` or equivalent real-data bundles from public static hosting.
- [ ] Legacy student-ID-derived passwords are disabled/rotated; new auth uses verified LINE/session binding.
- [ ] Cloudflare Worker is deployed with secrets outside GitHub.
- [ ] `AGIS_API_BASE` points to the verified Worker endpoint.
- [ ] Advisor account binding is exact and verified; advisor sees assigned students only.
- [ ] Private advisor resolver is connected and audited.
- [ ] Health master DB is explicitly approved before any write enablement.
- [ ] Negative authorization test suite passes.
- [ ] 750-concurrent load test meets agreed latency/error targets.
- [ ] Phone/iPad/notebook/desktop LIFF/browser E2E passes.
- [ ] Rollback path is tested before cutover.

## Non-negotiable data boundary

GitHub/Cloudflare Pages: code, schema, docs, empty templates, synthetic mock data only.

Private backend/Drive: student IDs, real names tied to records, advisor mappings, LINE/Telegram identifiers, health/counselling/scholarship records, attachments and secrets.
