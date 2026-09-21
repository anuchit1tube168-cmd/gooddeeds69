# GAS deployment recovery — 2026-09-20

Purpose: recover the active Good Deed Apps Script deployment without creating a parallel production backend or writing student data during verification.

## Source of truth

- Deployable code: `anuchit1tube168-cmd/gooddeeds69`
- Legacy compatibility runtime source: `backend/Code.gs`
- Cloudflare signed read adapter: `backend/CloudflareReadAdapter.gs`
- Canonical real spreadsheet: `ฐานข้อมูลความดี วพอ 2569`
- Canonical spreadsheet ID: `1BjNlzzWGqMLCbRHBV5h4ft-BN3vlgrFOk96f2GZTKiY`
- Production write must remain disabled during recovery.

Do not deploy `Code.gs` and `CodeV2.gs` into the same Apps Script project because both define web handlers.

## Why recovery is required

The currently configured Web App answers GET health but live POST requests return HTTP 405. The reviewed `backend/Code.gs` source contains `doPost(e)`, so the active Web App deployment does not match the reviewed source or deployment version.

## Safe verification marker

This revision exposes a non-writing deployment fingerprint:

GET `?action=ping` must include:

- `buildId: "gooddeeds69-20260920-post-probe-v1"`
- `postProbeSupported: true`

POST JSON:

```json
{"action":"deploymentProbe"}
```

must return HTTP 200 JSON with the same `buildId`.

The probe performs no sheet, Drive, Telegram, LINE or production write.

## Recovery procedure

1. Open the existing owned Apps Script project for the Good Deed runtime. Do not create a new production project just to bypass the 405.
2. Confirm its Script Properties point to the intended staging or canonical spreadsheet before any deploy.
3. Keep `PRODUCTION_WRITE_ENABLED` false.
4. Copy/reconcile the reviewed `backend/Code.gs` source. If the Cloudflare legacy read pilot is used, install `backend/CloudflareReadAdapter.gs` in the same legacy project.
5. Create a new Apps Script version and update the existing Web App deployment to that version. Preserve the existing deployment ID when possible.
6. Verify GET ping buildId.
7. Verify POST deploymentProbe returns 200.
8. Only then set Cloudflare `GOODDEED_GAS_URL` to this verified deployment and run the auth/read pilot.
9. Submit/review gates remain disabled until read/auth/identity checks pass and the real ledger schema is confirmed compatible.

## Rollback

Rollback the Apps Script deployment to the prior known version. Do not restore or overwrite Sheets as a code rollback. Data rollback is a separate audited operation.

## Never do during this recovery

- Do not run `setupSpreadsheet()` against the real spreadsheet.
- Do not delete or recreate `Main_2569` or `Deeds_2569`.
- Do not publish tokens, Script Properties, LINE IDs or Telegram secrets.
- Do not enable submit/review/production write merely because the deployment probe passes.
