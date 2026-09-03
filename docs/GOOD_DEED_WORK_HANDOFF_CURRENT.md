# GOOD DEED — WORK HANDOFF CURRENT

Updated: 2026-09-03 (Thailand)
Priority: Finish Good Deed production before returning to RTAFNC ONE.

## Owner decision
Architecture target:
LINE LIFF -> Cloudflare security gateway/static UI -> Google Apps Script -> Private Google Sheets/Drive.

Production compatibility rule:
- Keep existing LIFF ID: 2010948179-Ympqt2bT.
- Keep the current working LINE entry experience until replacement passes E2E.
- Do not delete or rewrite historical Good Deed data.
- Clean means organize/validate, never delete.
- Rollback required for every production change.

## Current production frontend
Repo: anuchit1tube168-cmd/gooddeeds69
Branch: main
Current deployed head at handoff: 331f3643978761055ae71b52a09219220e42d84c
Entry: frontend/index.html
Student runtime: frontend/legacy-compatible.js
Role selector: frontend/legacy-role-selector.js
Staff entry: frontend/staff-login.html
Staff UI role wrapper: frontend/staff-role-ui.js

Production GitHub Pages build/deploy for the head above passed.

## Current login UX
Login screen presents 3 choices:
1. นักเรียน
2. อาจารย์
3. แอดมิน

Student stays on current LIFF path.
Teacher routes to staff-login.html?role=teacher.
Admin routes to staff-login.html?role=admin.
Selecting a role in UI must never grant the role. Server-side account role remains authoritative.

Compatibility/GitHub/token explanatory text has been removed from visible login UI as requested.

## Current student flow (important: legacy compatibility)
1. LIFF initializes with existing LIFF ID.
2. LINE profile is read in browser.
3. Frontend calls Apps Script action getStudents and currently receives roster data to browser.
4. Auto-login matches LINE user ID against the returned roster.
5. First-time/manual login finds 7-digit student ID in the returned roster and currently checks password/PIN in browser; fallback may equal student ID.
6. Frontend sends bind_line to Apps Script.
7. Frontend calls getDeeds(studentId) and renders dashboard, approved/pending totals, categories and Chibi level.
8. Student submits a deed using action submit_deed; status starts pending.
9. Optional evidence JPG/PNG/PDF <=2 MB is serialized and sent to Apps Script.
10. Frontend refreshes getDeeds to obtain server state.

## Current storage behavior
The production frontend is wired to persist through Google Apps Script:
- bind_line: LINE/student linkage
- submit_deed: new Good Deed record
- getDeeds: read stored records
- evidence payload is sent to backend for storage handling

Therefore the UI is designed to store data in Google backend, not GitHub.
However, a real E2E write/read verification with a controlled test account is still required before declaring persistence fully proven for current production deployment. postLegacy currently uses fetch(..., mode='no-cors'), so the browser cannot validate the response body and temporarily updates the UI optimistically before the refresh.

## Critical security gap in current student compatibility flow
DO NOT scale this legacy student auth flow to 500 users unchanged.
Current legacy-compatible.js fetches getStudents roster into the browser and performs student password/PIN comparison client-side. This violates the target security model.

Required fix before full-scale rollout:
- Browser must never receive full student roster or passwords/PINs.
- LINE ID token must be verified server-side.
- Student identity lookup and first binding must occur server-side.
- Replace browser session identity with secure server session (prefer HttpOnly Secure SameSite cookie at Cloudflare gateway).
- RBAC must be checked server-side for every protected API.
- Student ID for submit/read must be derived server-side, not trusted from browser.
- Keep Student Master as canonical identity source.

## Target production flow
LINE OA -> existing LIFF -> Cloudflare same-origin UI/API -> server-side LINE verification -> secure session -> Student Master/RBAC -> signed Apps Script adapter -> Private Main_2569/Deeds_2569 + Private Drive evidence.

Cloudflare target responsibilities:
- LINE verification
- session cookie
- CSRF
- RBAC
- rate limit
- audit/request IDs
- server-derived student identity
- hide Apps Script adapter from direct browser use

Apps Script target responsibilities:
- private Google Sheets/Drive adapter
- read/write Good Deed data
- evidence storage
- approval atomic update/idempotency
- audit
- notification integration

## Source of Truth
Academic year 2569 current data:
- Main_2569 = official summary layer / accumulated official totals and level
- Deeds_2569 = current detailed ledger / pending + approved/rejected records
Historical data must remain preserved and separable.

## Work execution order
1. Do not redesign UI again unless required for functionality.
2. Preserve current LIFF entry and current production UX.
3. Verify one controlled student E2E on current production: login -> read -> submit -> backend persistence -> refresh.
4. Build/finish Cloudflare secure student auth gateway in staging.
5. Replace getStudents/browser password validation with server-side identity lookup.
6. Connect secure gateway to signed Apps Script adapter on staging copy of Google data.
7. Test 1-3 controlled accounts: login/link/read/submit/evidence/approve/reject/audit/notification/rollback.
8. Load test representative traffic for ~500 registered users (not 500 simultaneous writes).
9. Only after owner approval, cut existing LIFF endpoint to the secure Cloudflare production route.
10. Keep rollback branch and previous endpoint available during cutover window.

## Definition of Done
Good Deed is DONE only when:
- Existing LIFF opens reliably in LINE.
- Student / Teacher / Admin role UX works.
- Actual permissions are server-enforced.
- Student LINE auto-login works after first secure binding.
- No full roster/password/secret is sent to browser/public GitHub.
- Student can see official totals/level/history.
- Student can submit 9 categories + evidence.
- Teacher/admin can review based on RBAC.
- Approval updates official totals exactly once and level correctly.
- Audit exists for writes/reviews.
- Notification works or fails safely without losing data.
- Private Drive/Sheets remain private.
- Rollback is tested.
- E2E test evidence is recorded.
- Owner explicitly approves final production cutover.

## Non-negotiable conditions
- Preserve existing systems and data.
- No delete-as-clean.
- Reversible versions/rollback.
- Student Master central identity source.
- Server-side LINE/LIFF verification.
- RBAC/privacy/audit.
- No secrets or PII in public GitHub/browser.
- No production write/cutover beyond approved Good Deed behavior without explicit owner approval.
- Finish Good Deed before resuming RTAFNC ONE modules.
