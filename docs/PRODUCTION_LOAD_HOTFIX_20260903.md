# Production load hotfix — 2026-09-03

Status: LIVE LIFF / high traffic / reversible.

## Context
- Existing LIFF endpoint remains unchanged.
- Around 100 students were reported entering the existing production LIFF.
- Frontend historically polls `getDeeds` every 15 seconds and reads the full student roster during login/auto-login.

## Hotfix rules
- No LIFF ID change.
- No Apps Script endpoint change.
- No database/schema/data mutation.
- No permission/RBAC change.
- No production cutover to the new Cloudflare stack.
- Keep rollback branch available.

## Load shedding
- GET timeout: 10 seconds.
- POST timeout: 25 seconds.
- Deduplicate identical in-flight GETs inside a page.
- Cache `getStudents` for 5 minutes inside the active page only.
- Cache `getDeeds` briefly inside the active page.
- Remap the legacy 15-second dashboard polling interval to a randomized ~90–120 seconds to avoid synchronized request bursts.
- Writes clear read cache before being sent.

## Rollback
Restore `frontend/index.html` and remove `frontend/perf-hotfix.js`, or point `main` back to the backup branch/commit created before the hotfix.
