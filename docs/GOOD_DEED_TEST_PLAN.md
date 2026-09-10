# Good Deed test plan and evidence

Updated 2026-09-10. Release verdict: **NOT PRODUCTION READY**. Local code verification is separate from browser and provider E2E.

## Executed in this continuation

| Check | Result | Scope |
| --- | --- | --- |
| `node scripts/check-syntax.cjs` | PASS | JS, Apps Script and retained inline scripts; Python AST |
| `node --test tests/*.test.cjs` | PASS — 115/115 | Pure domain/projection logic, synthetic controller/input doubles, mock gateway/storage and preview HTTP boundary |
| `python3 -m unittest discover -s tests -p 'test_*.py' -v` | PASS — 16/16 | Local static/API/auth/notification boundary behavior |
| New screenshot/layout/console inspection | BLOCKED | Automatic approval review denied current browser access to the preview |
| CSS parser check | NOT RUN | Parser library unavailable; no installation was performed |
| Live LINE/GAS/Drive/Cloudflare/Telegram E2E | BLOCKED / NOT VERIFIED | No verified active staging deployment/session in this continuation |
| DOCX generation | NOT VERIFIED | Optional `pythainlp` dependency unavailable; boundary tests do not prove document rendering |

Total executed passing automated tests: **131**. Controller doubles do not implement browser layout, native dialog focus containment, pointer devices, file pickers, real React DOM painting or assistive technology. Do not relabel them browser E2E.

## Requirement coverage

| Requested behavior | Local evidence | Remaining runtime gate |
| --- | --- | --- |
| Login / load profile | Gateway tests verify request boundary, self permission, unlinked/denied behavior and projection | Real LINE account/token verification, ownership linking, correct Master and private photo endpoint |
| Submit | Workflow/controller reject invalid fields/signature and return one pending Mission ID without credit | Authenticated writer, correct schema, refresh persistence and policy |
| Upload | Type/size/header validation, old-file replacement, bounded preview preparation and bitmap cleanup tests | Actual Drive upload/private download, server validation, interruption and orphan reconciliation |
| Draft / edit / resubmit | Memory draft survives navigation; blanks stay blank; previous rejection/evidence retained, stale proof invalidated | Durable authenticated drafts/revisions across refresh/devices |
| Approval / reject | Stored hours only, reason required, fresh challenge, per-record confirmation, stale callback invalidated, duplicate outcomes idempotent | Assigned scope, fresh private signature provenance, journal/outbox and official reconciliation |
| Bulk review | Source selects a sequence; no batch approval API; controller proves explicit per-record confirmation | Full rendered selection/navigation and scoped multi-record staging UAT |
| Dashboard / charts | Approved-only monthly/Radar metrics, Bangkok month edge, year rollover, partial totals and separate annual goal tested | Real feed coverage, verified 6.2–6.9 mapping/annual policy and rendered chart accessibility |
| Mobile / LIFF | Source includes 360/390/430-friendly breakpoints, safe areas, 44px actions and reduced motion | Rendered widths, touch/keyboard, native dialog, actual Android/iOS LINE webviews |
| Session expiry | Client/state tests clear data on auth denial and cancel stale responses | Real cookie lifetime and LINE/session behavior |
| API failure / slow network | Mock timeout/denial/stale-read tests, no false success or auth fallback | Throttled live reads/uploads, 429/5xx and uncertain-write reconciliation |
| Notifications | Synthetic failed/retried event does not replay credit; legacy transport response tests | Real getMe/config validation, delivery acceptance, durable retries and operator logs |

## Phase completion boundary

| Phase | Current source result | Acceptance not yet closed |
| --- | --- | --- |
| A — Design system / Shell | Existing pilot extended, no new app/backend | Rendered QA |
| B — Student Dashboard | React views and six KPI slots use scoped data | Photo and annual config; real profile E2E |
| C — Submission | Complete disconnected demo form, draft/signature/preview/receipt | Real authenticated persistence |
| D — Cards / Timeline | Existing records displayed; demo resubmission preserves revisions | Real review metadata and revision API |
| E — Radar / Analytics | Approved-only projections and interaction callbacks | Official section mapping, live data coverage, rendered charts |
| F — Admin | Demo filters, selected sequence and per-record confirmation | Server assigned scope and secure durable review |
| G — Mobile / LIFF | Responsive rules and keyboard input callbacks | Browser/device UAT |
| H — Performance / Security | Reuse pinned React, no heavy engine, preview sizing, stricter self projection | Measured loading/INP, server evidence validation and provider security gates |
| I — Testing / Docs | 131 local tests and current documentation | Complete regression plus staging/browser evidence before release |

## Controlled staging acceptance sequence

Use an explicitly verified staging copy and synthetic test accounts/records. Capture deployment IDs/revisions, role scope and private backup/restore proof without printing credentials. Leave production endpoints and data unchanged.

1. Verify the actual owned Apps Script project/version, Worker deployment/bindings and schema maps. Do not install into a historical project merely because its URL opens.
2. Login as a linked student; test unlinked, wrong-audience, expired and revoked cases. Confirm self-only data and access denial for another student ID.
3. Submit a valid half-hour activity with private evidence and a signature bound to the request; reload and reopen the exact Mission ID. Invalid input must cause no persistence or notification.
4. As an assigned teacher, inspect that evidence; as an unassigned teacher, confirm denial. Confirm a fresh signature and explicit decision. Repeat the same request and callback; total/event count must not increase again.
5. Reject with a reason, edit as the owner, resubmit with revision identity, retain the previous review, and invalidate stale challenges. Approved records require the separate audited correction path.
6. Simulate timeout after persistence, partial cross-sheet failure and notification rejection. Reconcile by stable request/event ID; do not delete/reset rows or retry credit blindly. Verify formulas and carry-forward remain correct.
7. Check 360, 390, 430px, tablet and desktop; no horizontal overflow or covered controls. Test keyboard tab/focus, native dialog close/return, reduced motion, screen-reader labels, local preparation errors, actual slow uploads and safe-area behavior.
8. Test physical Android/iOS LINE webviews, login return, session expiry and API failure. Capture sanitized console/network/performance evidence. Review existing report/history/profile/settings/export behavior for regressions on the actual authenticated replacement paths.

Only mark each item PASS after observing its expected result. Record FAIL or BLOCKED with the operation and cause. Automatic review denied opening the current preview; do not retry via another host, port, browser surface, raw CDP or a deployment workaround. Continue independent code work, and resume browser QA only when permitted access has actually changed.

## Definition of done

Release requires all original necessary features working through authorized paths, original data preserved, student and admin E2E, LIFF/mobile UAT, no critical application console errors, no frontend secrets, current documentation, regression and recoverable rollout evidence. That definition is **not yet met** by this draft. Source-level checks and the September 9 screenshots cannot certify the new UI or provider integration.


## Reconciliation tests for new upstream commits

Four JavaScript cases cover loopback transport restriction, no unsigned profile fallback, correct Master name/sequence/total columns and invalid/duplicate identity rejection. Four isolated Python function tests prove no daemon/callback/export/Git effects, verified TLS, sanitized network errors and false returned after Telegram rejection. They do not import or start the legacy daemon. Owner signature placement/cropping remains a rendered QA gap under the same browser denial.

## Latest server prerequisite verification

2026-09-10 continuation: **129 JavaScript + 16 Python = 145 passed**, syntax passed. Three self-read integrity regressions failed before the mapping/cross-owner ID fix. Eleven new review-gate cases use synchronous synthetic server-port doubles and cover exact scope, expired session, stale/consumed proof, changed review intent, revoked assignment, request overrides and non-executable output. Loading the new helper still leaves every staff/write/evidence/activation route disabled. This is no proof of real signature provenance, journal atomicity or provider E2E; all existing rendered/device/provider blockers remain.
