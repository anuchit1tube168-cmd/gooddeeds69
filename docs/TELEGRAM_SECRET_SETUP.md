# Telegram Secret Recovery — Owner-Only

Status: **Emergency containment active**. Do not enable production Telegram until all recovery gates pass.

## Secure token location

For local/staging runtime:
1. Copy `.env.example` to `.env` on the controlled runtime host.
2. Put the replacement token only in `TELEGRAM_BOT_TOKEN`.
3. Keep `TELEGRAM_ENABLED=false` and `TELEGRAM_CANARY_ONLY=true` during verification.
4. Never commit `.env`. The repository ignores `.env` and `.env.*`.

For Cloudflare production, do **not** upload a `.env` file. Store the token as a Cloudflare Secret named `TELEGRAM_BOT_TOKEN`.

For Google Apps Script, use Script Properties only if GAS remains in the final architecture. Do not hard-code the token in `.gs` files.

## Read-only canary

Run only on the controlled host after the new token is stored:

```sh
set -a
. ./.env
set +a
python3 scripts/telegram_canary.py
```

The canary calls only:
- `getMe`
- `getMyName`
- `getMyShortDescription`
- `getMyDescription`

It does not send messages and does not change the bot profile.

Expected result starts with:

```
CANARY_OK
```

If the profile changes after a token is stored but before any production integration is enabled, stop immediately, revoke the token, and audit the runtime host/account.

## Production-enable gate

Production remains disabled until all are true:
- Telegram account sessions reviewed and 2FA enabled.
- Previous bot token revoked.
- Old token removed from Apps Script Script Properties / host environments.
- Canary passes.
- Token exists in exactly one owner-controlled server-side secret store.
- Bot privileges are least-privilege.
- Explicit owner approval is given to re-enable Telegram production.
