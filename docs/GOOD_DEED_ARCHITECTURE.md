# Good Deed architecture — audited boundaries

Updated 2026-09-10. DRAFT / PRODUCTION WRITE = FALSE. Repo inventory inspected recursively at draft tree `72a64d8f5bd8ed2779b906df4fb3c227961bdb2e` (not truncated). Relevant frontend, GAS/auth/upload/review sources and mapped staging headers were reviewed before Phase A. This does not mean every historical script or the deployed runtime has passed an exhaustive audit.

## KEEP / IMPROVE / REPLACE / MISSING

| Classification | Finding / action |
| --- | --- |
| KEEP | Existing repo/pilot, college crest/aircraft, pinned React, Cloudflare session boundary, GAS/Sheets/Drive, LINE/Telegram transport, Master total semantics, schema guards and prior review planner |
| IMPROVE | Shared Light Mission Control shell, React dashboard, scoped projections, draft/revision UX, per-record confirmation, validation and handoff documentation |
| REPLACE | Obsolete README deployment/login/token instructions; replace presentation sections incrementally, not the existing backend or ledger |
| MISSING | Verified 6.2–6.9 mapping, annual/term policy configuration, private photo endpoint, durable drafts/revisions, assigned-scope/fresh-signature writer, recoverable journal/outbox and current staging/provider E2E evidence |

## Actual paths

| Component | Responsibility | Boundary |
| --- | --- | --- |
| `frontend/index.html`, `app.js`, `liff-sdk.js` | Retained legacy entry/screens | Earlier hardening suspended unsafe public auth/export paths; do not reopen them for compatibility |
| `frontend/gateway-client.js` | Existing HTTPS gateway cookie session and self reads | No local role/ID grants access; timeout/cancellation, explicit failures, no credentials in local storage |
| `secure-pilot/gateway-view.js` | Authenticated presentation using the existing client | Only server card/list accepted; new views do not enable write/evidence/staff routes |
| `frontend/gooddeed-ui.js` | Shared shell, hero, navigation and escaped HTML | Presentation only; does not establish identity |
| `secure-pilot/mission-data.js` | Pure summaries, Bangkok dates, filtering, timeline projection | Partial rows never replace official totals or verified annual configuration |
| `secure-pilot/mission-react.js` | React overview/Radar/analytics/profile | Receives already-scoped props; no network or auth logic |
| `secure-pilot/kindness-react.js` | Existing warm intention/encouragement interaction | No hours, storage or permissions |
| `secure-pilot/demo.html`, `demo.js`, `workflow.js` | Explicitly synthetic workflow/controller | `connect-src 'none'`, no gateway client or LINE SDK; memory only, reset on reload |
| `secure-pilot/signature-pad.js`, `evidence-preview.js` | Local drawing and preview preparation for demo | Neither is a server-verifiable signature or real upload adapter |
| `backend/CloudflareReadAdapter.gs` | Existing signed staging self card/list adapter | HMAC/body hash/time/nonce checks and explicit unique headers; no enabled write route |
| `backend/Code.gs` | Retained eleven-column legacy implementation and authenticated callback | Not compatible with eight-column staging writes; raw public reads/writes retired |
| `backend/CodeV2.gs` | Existing alternate pilot backend | Different schema; do not deploy beside Code.gs as competing entrypoints |
| `backend/GoodDeedReviewPlan.gs` | Pure eight-column/22-column review plan | Always `executable: false`; no auth, persistence or official period policy |

Frontend paths shortened to `secure-pilot/` above are under `frontend/`. The separate gateway source remains `anuchit1tube168-cmd/rtafnc-one`, branch `gooddeed-final-gateway-20260902`; last inspected source head is recorded in WORK_STATE. A repository head or configured origin is not evidence of an active deployment.

## Storage already observed

| Storage | Verified header shape | Implication |
| --- | --- | --- |
| Master | 22 columns, canonical student ID and nine category-hour fields, official total/grade/level and LINE binding metadata | Preserve official values, formulas and carry-forward |
| Staging deeds | 8 columns: ID, student, category, hours, activity date, description, status, submitted time | Use explicit header maps; legacy eleven-column writer must continue to refuse this shape |
| Reviews | 13 columns | Presence does not prove durable idempotency/journal implementation |
| Notifications | 7 columns | Presence does not prove delivery/retry ownership |
| Audit | 18 columns | Need controlled outcome/recovery proof, not only a schema |
| Evidence | 9 columns | No explicit verified signature-purpose/fresh-proof protocol was established |

No sheets were created, deleted, renamed or migrated by Mission Control work. See `staging-columns.example.json` and `REVIEW_STORAGE_CONTRACT.md` for names and invariants. Never copy real identity rows into tests.

## Read and write separation

Real client login/restore uses the existing `/auth/line/verify` and `/auth/session`, then cookie-bound `/api/gooddeed/card-self` and `/api/gooddeed/deeds-self`. No student ID is appended by the frontend to select a different subject. The client rejects missing identity, invalid numeric/status fields, duplicate IDs and an explicitly contradictory item owner. Backend verification and assigned scope remain mandatory regardless of these client checks.

GAS obtains the subject from the gateway's signed request. Current self-list scope is at most 150 returned items; card totals can include earlier/carry-forward values. Optional reviewer/evidence/profile metadata that is not returned stays missing. The new frontend does not call legacy GAS directly as a fallback.

Real submission, revision, evidence, staff review and activation routes remain gated. The existing gateway review body still lacks the complete fresh-signature/assigned-scope contract required for release. Do not connect demo `saveDraft`, `resubmit`, `review` or arithmetic to these routes. Real storage must reread under lock, validate official policy, preserve formulas and reconcile uncertain writes using a durable journal/outbox.

## Draft/revision demo semantics

Demo drafts have a stable synthetic ID and cannot add hours. Submission promotes that draft to one pending record. A rejected record may be revised under the same deed ID with an incremented revision and retained prior snapshot. Review challenges bind the current revision, expire and cannot cross records. Delivery events include revision, so a later outcome cannot overwrite an earlier event. Duplicate outcomes do not add credit. This demonstrates behavior only; its memory maps are not a production transaction layer.

React roots are unmounted before parent HTML replacement. Drawing/preview modules have no service calls. Local preview serves only an explicit file allowlist and rejects writes/private paths. Do not turn it into a repo-root server.

## Remaining release risks

1. Provider runtime identity/version still inaccessible: Google sign-in failed and Cloudflare challenge persisted in the earlier inspection. The current preview browser action was separately denied by automatic review. Respect each access boundary.
2. No production proof for secure linking, assigned staff scope, private photo/evidence access, fresh signature provenance, durable edit/resubmit, policy enforcement or notification delivery.
3. Historical exposed credentials require private rotation and deployment verification; removing literals is not revocation or Git history cleanup.
4. Backup/restore and controlled rollback must be proved privately. Code rollback cannot reverse written hours.
5. Full compatibility/E2E is not claimed: legacy reports/settings/export features remain in source, but retired insecure transports are not restored by this redesign.

## เงื่อนไขบังคับของระบบ (Non-negotiable Conditions)

Preserve original records and evidence; Clean is organization, not deletion. Student Master, server-side LINE/LIFF verification, RBAC and assigned scope remain authoritative. Keep student/health data and secrets out of GitHub. Reuse current GAS/Sheets/Drive and gateway instead of adding Firebase/Supabase or a second ledger. Keep production writes false until staging evidence and authorized cutover.


## Concurrent upstream reconciliation

During implementation, the branch advanced five commits to `2bff70e2522f9c92d4dd495ed1b86dd1e793d44a`. The ten changed paths were compared and applied before final verification. Owner additions for name formatting, stored roster sequence, no-dependency workbook reading and signature positioning are retained. This continuation corrects newly observed regressions rather than overwriting that work:

- Master column F is cohort, G/H are category hours, and R is evaluation in the verified shape; they cannot become full name, year level or total. Identity reads validate headers, preserve stored sequence, and use the official total column.
- Document scripts referenced a removed URL-name variable. It is explicitly empty; URL text does not establish identity. The shared profile helper uses only the existing authenticated self client, with no raw local/GAS fallback.
- Source-embedded student-number ranges are not an authoritative cohort-sequence algorithm. Missing stored sequence remains unknown; no Master record is altered by removing source arithmetic.
- The new Python daemon/callback could update local/public files and run broad Git staging/push without the required server scope/journal. Entry points are suspended before effects and preview startup no longer starts it. Retained code is not enabled integration. Public roster export also stops before file access.
- Telegram transport uses certificate/hostname verification and sanitized errors; rejected delivery returns false. No real Telegram call was made in testing.

The final publication must use the latest verified remote parent, not the initial audit snapshot. Runtime/deployment claims in historical WORK_STATE sections are still unverified.
