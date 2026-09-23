# RTAFNC Good Deed — Public Work State

> Public repository documentation is code-only. Personal data, student identifiers, Telegram chat identifiers, callback identifiers, credentials, live incident evidence, screenshots containing personal data, and operational secrets must remain in private institutional storage.

## Security Incident Containment — 2026-09-21

Status:

- Telegram bot API token: revoked by owner.
- Telegram account: two-step verification enabled by owner.
- Telegram integration in emergency branch: disabled.
- Legacy Telegram polling/listener: disabled.
- Legacy local API mode: disabled.
- Production write gate: disabled.
- Legacy unauthenticated password read/write routes: retired.
- Replacement Telegram token: **not approved for runtime use yet**.
- Cloudflare migration: separate staging work; no production merge/cutover from this incident branch.

Recovery conditions before Telegram can be enabled again:

1. Audit active Telegram account sessions and terminate unknown sessions.
2. Remove old Telegram credentials from every runtime secret store and host environment.
3. Confirm no browser/frontend source contains provider secrets.
4. Use one owner-controlled server-side secret store for the replacement token.
5. Test with a controlled canary configuration before restoring production notification.
6. Keep bot group/channel privileges at least privilege.

## Current Architecture Direction

- Public browser code contains no provider secrets.
- Authentication and authorization move to server-side RTAFNC ONE Core.
- LINE ID tokens are verified server-side.
- Student Master linkage is owner-controlled and deny-by-default.
- Cloudflare Pages is the intended static frontend.
- Cloudflare Worker is the intended security gateway.
- D1/Core stores only minimum identity/session/RBAC metadata.
- Authoritative Good Deed records remain in private institutional backend storage until an approved migration.
- Evidence and personal media remain private and are never published to GitHub Pages.

## Public Repository Rules

Do not commit:

- student names, IDs, cohort rosters, contact details or health data;
- Telegram bot tokens, chat IDs, webhook keys or callback identifiers;
- LINE Messaging API secrets or access tokens;
- passwords, password exports, password sheets or temporary credentials;
- Google service account credentials, private keys or `.env` files;
- database exports, backup data, evidence files or production logs.

Allowed public content is limited to source code, synthetic test fixtures, sanitized schemas, documentation without personal data, and security controls.

## Operational Notes

Historical live-test details were intentionally removed from this public file. Required audit evidence should be stored in a private Drive/audit location with access limited to authorized personnel.

Production changes must follow:

Plan → Review → Security Gate → Staging → Controlled E2E → Owner Approval → Production.

**PRODUCTION WRITE = FALSE during incident containment.**

## Staging Update — 2026-09-22
- Backend `Code.gs` & `data/google_apps_script_backend.js`: Implemented `getDeeds` / `getAllDeeds` for cross-device sync between student submission and teacher dashboard.
- Telegram Bot: Configured live webhook to GAS endpoint; implemented `callback_query` handler answering `answerCallbackQuery` and `editMessageReplyMarkup` to eliminate the loading freeze on approve/reject.
- Frontend `app.js` & dashboards: Enhanced `syncAllDeedsWithBackend` and `getAllPendingDeeds` to pull cloud deeds and cache bust to `v5-sync-react`.
- PDPA & secret compliance: 100% PASS, zero leaks. Local regression and gate tests: 153/153 JS + 23 Python PASS.

## Staging Update — 2026-09-23
- Telegram Form Slip Photo: Added automatic canvas-rendered Form Slip card (`slipImage`) attached to deed submission and sent as photo via Telegram `sendPhoto` with action buttons.
- Telegram Callback Reaction: Enhanced `handleTelegramCallback` to answer callback queries with alert pop-ups, dynamically edit inline buttons to show who approved/rejected, send follow-up confirmation messages into the group, update `Deeds_2569` and `Main_2569` sheets, and push LINE notifications to students.
- Client-Side Auto-Sync: Added cross-device cloud deed synchronization in `student-dashboard.html` and `history.html` on load, periodic intervals, and tab focus (`visibilitychange`), keeping Admin and Students in sync.
- Cloudflare Webhook Proxy: Created `cloudflare/telegram-webhook-proxy.js` to eliminate HTTP 302 redirect errors from GAS webhooks.
- Local Live Engine: Created `scripts/live_telegram_bridge.py` for real-time polling and instant callback execution.
- Tests & Compliance: 153/153 JS + 23/23 Python = 176 tests PASS, 100% PDPA compliance. Cache bust updated to `v6-live-telegram-slip`.
