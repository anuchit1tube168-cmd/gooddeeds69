# Good Deed work state

Updated: 2026-09-10 (UTC)

## Safety state

- **Production write: FALSE.** Both the Python edge backend and the Apps Script
  source now fail closed. Enabling writes requires the exact value `true` in
  `PRODUCTION_WRITE_ENABLED` (environment variable for Python, Script Property
  for Apps Script).
- No schema migration, deletion, data upload, approval, or other write request
  was performed in this work session.
- Telegram credentials and the Drive folder identifier were removed from source.
  Apps Script now reads `TELEGRAM_TOKEN`, `TELEGRAM_CHAT_ID`, and
  `DRIVE_FOLDER_ID` from Script Properties. The previously committed Telegram
  token must be treated as exposed and rotated outside this repository.

## Deployment verification

`scripts/verify_staging.py` performs only two GET checks:

1. Apps Script `?action=ping` must return JSON with `status=success` and
   `productionWriteEnabled=false`.
2. Cloudflare `/api/health` must identify the service and report
   `productionWriteEnabled=false`.

Example (use explicitly confirmed staging URLs; do not substitute production):

```bash
python3 scripts/verify_staging.py \
  --gas-url "$STAGING_GAS_URL" \
  --cloudflare-url "$STAGING_CLOUDFLARE_URL"
```

The current execution environment rejected outbound CONNECT requests with HTTP
403, so neither deployed endpoint has been confirmed from this session. Source
presence, a demo server, or prerequisite checks are **not** deployment evidence.

## Confirmed blockers

1. The checkout had no Git remote and did not contain commit `b3a07fa` or branch
   `codex/fable-gooddeed-hardening-20260907`; it was a shallow checkout on `work`
   at `29531524`. The requested branch was therefore created without claiming
   ancestry from the reviewed commit. A maintainer must restore the authoritative
   remote/history before merge and compare this patch with Draft PR #4.
2. `docs/REVIEW_STORAGE_CONTRACT.md` was absent from the supplied checkout.
   Storage schema and ownership cannot be inferred; no storage schema was changed.
3. No verified staging credentials, private session authority, teacher-role
   authority, or private signature-evidence store were available. Header/cookie
   identity in the current Python server is not accepted as production-grade
   authorization.
4. Outbound network access was denied, preventing real Apps Script/Cloudflare
   staging confirmation. Mobile browser and LINE LIFF end-to-end runs likewise
   require the restored staging deployment and test identities.

## Remaining work before production

- Restore and review the storage contract and authoritative Draft PR #4 history.
- Rotate the exposed Telegram token, provision secrets only in private deployment
  configuration, and redeploy Apps Script with writes still disabled.
- Connect sessions, teacher roles, advisor scope, and per-teacher signature proof
  to their verified private authorities. Do not use caller-supplied role headers.
- Implement idempotency and recovery against the contract-defined persistent
  store, then test concurrent submit/approve/retry behavior. The write gate added
  here is a safety boundary, not proof that persistence is idempotent.
- Run student and admin journeys on desktop/mobile and inside LINE LIFF using
  non-production test identities; retain redacted evidence and audit results.
- Only after review and staging acceptance should an authorized operator decide
  whether to set `PRODUCTION_WRITE_ENABLED=true`.
