# Live recovery checkpoint — 2026-09-16

Scope: RTAFNC Good Deed production login/Telegram recovery.

## Verified live observations

- Telegram test delivery reached the configured group successfully on 2026-09-16. This proves the currently configured Telegram bot/token/chat path can send a test message.
- The production Apps Script URL currently used by the frontend responds to GET requests, but `?action=getStudents`, `?action=getDeeds` and `?action=getSettings` all return the same legacy health-shaped object instead of their expected contracts.
- A synthetic invalid `POST action=login` request to that production URL returned HTTP 405 before any credential validation. No real student/staff credential was used.
- The live frontend's secure client submits `login` / `bindLineAndLogin` by POST to the configured Apps Script Web App URL. Therefore the current 405 is a deployment/entrypoint mismatch, not evidence of a bad student/admin password.
- The temporary synthetic V2 member `9999999` used during diagnostics was disabled after testing (`active = FALSE`).

## Required deployment correction

Use the Apps Script project that owns the existing production Web App URL. Do **not** create a replacement LIFF endpoint or a new production database.

1. Confirm that the deployed script contains the reviewed `backend/CodeV2.gs` Web App handlers (`doGet` health + `doPost` bridge).
2. Keep existing Script Properties and existing production data bindings. Do not rerun `setupSystem()` or `bootstrapOwnerAdmin()` merely to publish a new code version.
3. Deploy a **new version of the existing Web App deployment** while preserving the existing `/exec` URL.
4. Web App settings must remain `Execute as: Me` and the intended access setting for this deployment.
5. Never print or copy `PASSWORD_PEPPER`, LINE tokens, Telegram token/chat secrets, or member password hashes into GitHub, chat or logs.

## Acceptance sequence after deployment

Run in this order and stop at the first failure:

1. GET `?action=health` => V2 response with `ok: true`, service identity and version.
2. Synthetic invalid POST `login` => application-level JSON/bridge error, **not HTTP 405**.
3. Authorized staff login => session issued, dashboard loads.
4. Controlled student/LIFF login => server-side account/LINE binding path only.
5. Controlled test deed => persist first, notification second.
6. Telegram notification => arrives once.
7. Teacher/Admin review => exact stored deed/revision, scoped permission, approve/reject once.
8. Student refresh => final status matches stored review.
9. Audit/reconciliation => no duplicate credit or repeated notification.

Production write remains gated until this controlled sequence is observed against the verified deployment and rollback reference.

## Frontend hardening in the same recovery

`frontend/gateway-config.js` now fails closed when the secure V2 client is missing, disables legacy quick-login helpers, removes password auto-fill, and tells users to use server-provisioned credentials. Student ID is treated as an identity key, not a password.

This checkpoint records source and live observations separately. A green source/CI check does not prove Apps Script deployment state, and Telegram delivery does not prove the Web App login contract.
