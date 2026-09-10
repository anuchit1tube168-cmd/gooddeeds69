# Good Deed — review of the latest integration

State: DRAFT / STAGING ONLY / PRODUCTION WRITE = FALSE.
Reviewed owner branch: `7ef7ffb788a31ec091aa334df00a0e91cd2d469f` (eight commits after the previous patch). Reviewed main: `29531524a407d46de9a65e4032de40a3fc2c32cb`.
Gateway contract: `rtafnc-one`, `gooddeed-final-gateway-20260902`, `6c72530768bfbbba142e34020fa22d2519b3d332`.

## Confirmed findings and changes

| Finding | Evidence | Change / remaining boundary |
| --- | --- | --- |
| Python accepted unsigned binding and approval requests; browser role headers/cookies could claim staff | `CustomHandler.get_auth_context`, previous `do_POST`, actual local HTTP regression | Python is now a loopback static preview. Data/mutation/SSE endpoints are closed; Cloudflare owns the authenticated API. This intentionally retires the old Python API in this draft. |
| Static server could serve exported identity maps and evidence | Previous default `SimpleHTTPRequestHandler`; GET/HEAD fixtures including encoded paths and symlinks | Public asset allowlist, no directory listings or private-data downloads. Existing private files are preserved. Other hosts/exporters still require a separate audit. |
| LINE login trusted local mappings and could fabricate staff sessions | Previous `handleAutoLogin` and `bindCurrentStudentProfile` | Verify only the LIFF ID token through the existing gateway. No local role assignment, roster matching or raw binding POST. |
| LINE UI claimed binding/notifications without an acknowledged server result | Previous `no-cors` POST and unconditional connected status | Separate checking, verified, pending-link, unavailable and failure states. Token verification does not create a student binding or guarantee notification delivery. |
| LINE notifier contained an embedded channel secret, disabled TLS validation, and sent its token to a raw GAS proxy | `line_notifier.py`, reviewed privately | Secret comes only from environment; verified TLS; no proxy or automatic fallback. Removing literals does not revoke exposed credentials. |
| Official staging ledger has eight columns, while the old reader used eleven-position indexing | Live `Main_2569!A1:Z1` and `Deeds_2569!A1:Z1` read on 2026-09-08 | Explicit header maps for master and ledger. Header order may change; missing/duplicate headers fail. `docs/staging-columns.example.json` contains schema only. |
| Official staging name is split, and level is stored as `Lv.1 Cadet Novice` | Header read and bounded `R2:S8` read; no identity rows exported | Join mapped name fields; parse the stored `Lv.N label` format. Never derive a level or pass result from hours. |
| Document lookup could select the latest or a partially matching deed, and fabricate a record from URL fields | Four document regressions failed before correction | Require exact unique deed ID and explicit matching owner; missing records stop rendering/signing. URL fields no longer supply identity, hours, evidence or signatures. This is a correctness guard, not server authorization. |
| Public-source roster seeds, bot secrets and destructive public exporters | Owner-branch PII CI failure and reviewed exporter functions | Privately archived roster/QA seeds; removed personal literals and credential defaults; disabled legacy public roster/photo/settings regeneration and destructive Settings reset before file access. Existing data is untouched. |
| Approval could choose the first duplicate and overwrite category formulas | Four regression cases failed before correction | Reject ambiguous identities and invalid numbers before transition; preserve category and total formulas. Uncertain cross-sheet writes still need reconciliation. |

## Frontend integration

`frontend/secure-pilot` defaults to `TRANSPORT: "gateway"`. Set `GATEWAY_ORIGIN` only after identifying the owned staging deployment and its allowed frontend origin. Empty configuration presents an unavailable state and makes no GAS request.

The legacy LIFF helper uses `frontend/gateway-config.js` for the same owned origin. It no longer turns verified LINE data into a legacy browser session. The existing password/roster frontend is still a release blocker. Keeping a legacy page accessible does not make its login secure.

Browser client contract:

| Operation | Existing gateway route | Behavior |
| --- | --- | --- |
| Verify LINE | POST `/auth/line/verify` | Body contains only `idToken`; secure session cookie stays with the browser; no token storage |
| Restore session | GET `/auth/session` | Requires acknowledged authenticated session and verified student binding for self reads |
| Read own official card | GET `/api/gooddeed/card-self` | Subject comes from server session; total from master |
| Read own records | GET `/api/gooddeed/deeds-self` | Up to 150 records; not a complete official-hours calculation |
| Revoke session | POST `/auth/logout` | CSRF required; POST `/auth/csrf` used on restored sessions; failure is shown |

All requests use credentials, no-store, no-referrer and reject redirects. No automatic retries or raw API fallbacks. Session failures clear visible data. Timeouts can show explicitly stale data only within the current authenticated view. Rendering escapes user text and includes keyboard focus, filters, empty/error states and the actual crest asset.

Read-view limitation: evidence links, submission, activation and staff review are not enabled by this read adapter. When evidence presence is unavailable in the eight-column ledger, the UI says it is not displayed; it does not assert that the original evidence does not exist.

## Staging schema setup — private configuration only

1. Verify the intended Apps Script project and staging spreadsheet before installing code. Code.gs and CodeV2.gs must not be installed as competing handlers.
2. Install the read adapter beside the legacy handler only on the verified staging copy. Raw routes stay denied.
3. Set `APP_ENV=staging` and the shared HMAC secret privately. Never put the secret into the frontend, GitHub, a screenshot or a test fixture.
4. Serialize `masterColumnMap` from the schema example as Script Property `GOODDEED_MASTER_COLUMN_MAP`; serialize `ledgerColumnMap` as `GOODDEED_LEDGER_COLUMN_MAP`. Recheck headers before applying; the example is evidence of the inspected staging schema, not authority to overwrite another schema.
5. Ensure the master card has one identity, nonblank name fields, a numeric total, an explicit pass value and a recognized official level cell. Missing values require reconciliation; never fill them with guessed zeroes.
6. Confirm Cloudflare session, pilot-identity gate, CORS allowlist, third-party cookie behavior on the actual LIFF origin and gateway→GAS signing. Keep submission/review write flags off.
7. Test self-only reads, another student's access denial, session expiry/logout, malformed data, repeated request and unavailable upstream. Record runtime versions and evidence privately.

Important schema boundary: the eight-column staging ledger is **not compatible with the positional legacy approval writer**. These changes support reads from that schema. A separate mapped write/review adapter with durable idempotency, scoped reviewer authorization, private evidence and an audited outbox must pass before any write path is enabled. Do not run legacy setup/sync/approval against the eight-column staging ledger.

## Verification and evidence limits

Implementation commit: `21e002583acc6ab0475fa322c1870a293fefd2dc`, published to existing draft PR #4. GitHub [regression](https://github.com/anuchit1tube168-cmd/gooddeeds69/actions/runs/34291274328) and [PII guard](https://github.com/anuchit1tube168-cmd/gooddeeds69/actions/runs/34291274335) completed successfully. Owner changes through `7ef7ffb` remain in history.

- Local: 54 JavaScript tests + 11 Python tests pass. Python tests use an actual ephemeral HTTP server with synthetic private files. JavaScript tests use mock provider responses and Apps Script storage; they do not prove deployed Cloudflare/D1/GAS behavior.
- Four new approval cases failed before the fix: ambiguous records, malformed hours, invalid master values and category-formula overwrites.
- Syntax: edited JS, inline HTML, Apps Script and Python pass. CI now includes Python boundary tests, and the secret guard detects long embedded LINE channel tokens.
- Live frontend on 2026-09-08: old main assets (`app.js?v=3560`) and repeated SSE reconnection warnings are still served. A source change in the draft branch is not a deployment.
- Updated local pilot: cloud browser returned `ERR_BLOCKED_BY_CLIENT`; visual mobile/desktop QA is blocked, not passed. VM rendering tests cover escaping/state/filter behavior, not layout.
- Drive: identified the private staging workbook and read only schema plus a small grade/level sample. `Deploy_Receipts_2569!A2:L6` was empty; no runtime deployment/version was established. Main workbook metadata call failed. Separately archived five source-embedded roster records and old QA seeds into the existing project Drive folder; both files were verified owner-only with matching byte sizes. This is a source-data preservation archive, not a full production backup or restore test.
- No real student login, data write, notification, permission change, token rotation, LIFF endpoint change, merge or production deployment was performed in this review.

## Private archive and legacy exporter boundary

The owner-only project folder contains `private-code-data-archive-20260908` with `class69_students.json` and `legacy-seeded-qa.txt`. File sizes and owner-only permissions were verified after upload. Do not copy these files into a public repository. The roster loader expects a reviewed private copy at `data/private/class69_students.json` and refuses a partial rebuild when it is absent. No roster data was removed from business storage.

`build_photos.py` public output functions and `sync_all_students.py` are deliberately disabled in this draft, as is the destructive `embed_settings_to_excel.py` reset. They previously regenerated public roster/password/identity files or replaced settings. Replacing them requires an explicit private export destination, preserved operator settings, schema validation and restore evidence. Do not remove their guards merely to make an old sync command succeed. Other legacy scripts still need review before use. Source cleanup does not remove historical Git exposure or revoke a token.

## Next release gates

1. Revoke/replace previously exposed Telegram and LINE credentials and inspect all copies/exporters privately.
2. Identify the actual Apps Script editor project/deployment/version and the owned Cloudflare staging deployment. Bind both to commit evidence and private rollback receipts.
3. Exercise the new gateway read view against controlled staging identities. Confirm source schema, totals/carry-forward and permissions without publishing PII.
4. Complete mapped write/review/evidence/activation and durable notification outbox; verify assigned teacher scope, duplicate decisions, partial writes and recovery.
5. Complete mobile/desktop visual QA and full LINE → submit → refresh → review → notify flow. Review current academic-year/term policy against the official regulation.
6. Only then request production cutover with deployment IDs, exact changes, private backup proof and rollback evidence.

## เงื่อนไขบังคับของระบบ (Non-negotiable Conditions)

Preserve historical records, signatures, evidence, bindings and carry-forward. Clean means archive, not delete. Student Master is authoritative. Verify LINE and enforce role plus assigned scope server-side. Keep identities and health information private; this module must not expose health information. Drive/Apps Script remain business storage; Cloudflare owns authentication and access control. Releases are reversible and require staging evidence. No production cutover is authorized by a test result or this document.

Reference: [LINE guidance on user data](https://developers.line.biz/en/docs/liff/using-user-profile/) requires sending tokens for server verification instead of trusting a browser-supplied profile. Provider acceptance of a push request is not proof the recipient received it.
