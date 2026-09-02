# Phase 3B — Good Deed Apps Script Card Adapter

Status: **STAGING ONLY**  
Production cutover: **FALSE**  
Operational writes: **FALSE**

## Purpose

Expose one minimum-necessary, read-only card endpoint to RTAFNC ONE Cloudflare Core without restoring browser credentials, browser sessions, student rosters, LINE user IDs, evidence links, or secrets to public GitHub.

## Files

- `apps-script/CloudflareCardAdapter.gs` — signed HMAC card-self handler.

## Hook into the existing Apps Script project

In the existing private Good Deed `doPost(e)`, after `action`, `payload`, and `requestId` are parsed but **before** the legacy browser session is required, add:

```javascript
if (action === 'cloudflareCardSelf') {
  return cloudflareCardSelfResponse_(payload, requestId);
}
```

Do not expose this action through a browser UI. Cloudflare Core is the only intended caller.

## Required Script Property

Create this only in Apps Script → Project Settings → Script Properties:

- `CLOUDFLARE_CARD_ADAPTER_SECRET` — random high-entropy value, minimum 32 characters.

The exact same secret must be stored in the Cloudflare Worker encrypted secret `GOODDEED_CARD_ADAPTER_SECRET`. Never commit or paste the secret into GitHub, browser JavaScript, D1, logs, screenshots, or documentation.

## Request security

The Core sends only:

- Student Master/member reference;
- request ID;
- Unix timestamp;
- random nonce;
- HMAC-SHA256 signature.

The Apps Script adapter:

- rejects timestamps outside ±120 seconds;
- rejects malformed member references and request IDs;
- verifies the HMAC in constant time;
- stores a nonce replay marker in Script Cache for 5 minutes;
- performs no write to Good Deed records;
- audits the successful minimum-necessary read.

## Response contract

Only the self card contract is returned:

- `displayName`
- `studentId` when it is a valid 7-digit self ID
- `cohortLabel`
- `positionLabel`
- `totalHours` (approved records only)
- `approvedCount`
- `pendingCount`

No roster, password/hash, LINE identifier, evidence, review notes, address, health data, Telegram token, or other student records may be returned.

## Activation gate

Keep RTAFNC ONE `gooddeed.readEnabled=false` until all of the following pass on remote staging:

1. LINE staging login works through Core.
2. Owner/admin bootstrap works.
3. Student Master link is verified server-side.
4. Student role includes `gooddeed:self:read`.
5. `GOODDEED_GAS_URL` points to the private deployed Apps Script Web App.
6. Both sides have the adapter secret configured outside Git.
7. `GET /api/gooddeed/card-self` returns the expected self-only card.
8. Core and Apps Script audit events are present.
9. Production endpoint and operational writes remain unchanged.
