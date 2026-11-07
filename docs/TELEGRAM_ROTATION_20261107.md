# Telegram bot token rotation — 2026-11-07 (staging / incident containment)

## Status
- Owner reports prior Telegram bot token revoked in BotFather.
- The prior credential was committed in a public repository. Removing the literal in a future revision **does not erase Git history** and **is not revocation**.
- No replacement token, webhook secret, approver IDs or private student data should be committed, posted in tickets or sent through chat.
- This patch prepares code review only. Do not merge/deploy until protected write/RBAC path and staging E2E are verified. **PRODUCTION_WRITE_ENABLED must remain false.**

## Operator-only recovery (Cloudflare UI / secure environment)
1. In Cloudflare Pages > rtafnc-gooddeeds > Settings > Variables and Secrets, replace **TELEGRAM_BOT_TOKEN** with the newly issued token as a Secret. Do not leave the old value in preview or other services.
2. Set **TELEGRAM_CHAT_ID** to the authorized room ID (not copied to public source).
3. Generate a random 32+ character secret independently; store it as **TELEGRAM_WEBHOOK_SECRET** in the deployment secret manager. Configure Telegram **setWebhook** to send this value via its `secret_token` option. Do not put the secret in a URL or frontend.
4. Put only authorized numeric Telegram user IDs into **TELEGRAM_APPROVER_IDS** (comma-separated). Chat name or display name is not authorization.
5. Remove legacy bot credentials from GAS Script Properties, local .env files and other runtimes. Disable old listener/polling jobs; do not run competing webhook/getUpdates handlers.
6. Keep **PRODUCTION_WRITE_ENABLED=false** and **TELEGRAM_NOTIFICATIONS_ENABLED=false** until the server-side authenticated submission/approval pathways are independently audited and staged. Do not set these to true as a workaround.
7. On isolated staging with synthetic data: verify rejected missing/incorrect webhook secrets (403), rejected unknown approvers/chats (403), zero hardcoded token literals, valid webhook delivery, authorization scope, notification failure behavior and audit trail. Get explicit owner approval before any production cutover.

## Known limitations / release blockers
- The current public `submit_deed`, `approve_deed`, `delete_deed`, and `notify-deed` routes still need an audited server-side authentication/RBAC design. Their incident-containment gates are **not sufficient authorization** to restore writes.
- Existing public Git history remains exposed; old token must stay revoked. Restore only after private evidence review; never replay pending credits blindly.
- No live Telegram API request, actual webhook update, token update, Cloudflare deployment, or GAS write was carried out by this branch.
