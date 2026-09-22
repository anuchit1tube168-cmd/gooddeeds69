# Token rotation and server boundary

Status: local hardening only; provider revocation and production installation are unverified.

1. Identify the old and replacement bots by username/ID with the owner. A newly created bot does not revoke another bot's token.
2. Revoke the old bot token through the owner's BotFather session. Verify the old credential is rejected using a private, non-logging read-only request; never paste credentials into browser URLs or command arguments.
3. Store the replacement only in the verified runtime's Script Properties (`TELEGRAM_BOT_TOKEN`) or Cloudflare secret binding. Keep the destination chat and authorized reviewer IDs in server configuration. Never copy secrets into frontend settings, Drive documents shared with students, GitHub files, workflow output or logs.
4. Verify replacement identity with `getMe` and inspect webhook configuration without printing the webhook URL, token or chat IDs. If replacing a bot, update server-side identity/allowlists and disable the old integration. Do not run polling alongside a webhook consumer.
5. Use an independent webhook secret and enforce sender/chat authorization and stored-record decisions. Do not enable the retired local listener or public data exporters to restore callbacks.
6. Test with an authorized synthetic record; preserve real records, hours and evidence. Verify authentication and persistence independently: token rotation does not fix the known GAS deployment mismatch.
7. Revoke any exposed LINE or GitHub credential at its issuer as a separate operation. Code cleanup cannot revoke a credential or erase Git history. Review repository history privately; history rewriting needs a coordinated plan.

Local patch removes raw provider exceptions from V2 request and Telegram logs. Existing temporary account issuance logs and remaining public response error handling need separate review before V2 production rollout.

Provider reference: https://core.telegram.org/bots/features
