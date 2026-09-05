# Phase 3B — Good Deed Apps Script Card Adapter

Status: **STAGING ONLY**  
Production cutover: **FALSE**  
Operational writes: **FALSE**  
Good Deed read gate: **FALSE until E2E passes**

## Purpose

Expose one minimum-necessary, self-only, read-only card endpoint to RTAFNC ONE Cloudflare Core without restoring browser credentials, browser sessions, student rosters, LINE user IDs, evidence links, or secrets to public GitHub.

## Source of Truth confirmed for AY 2569

The current Good Deed 2569 source is **not** `GoodDeedRecordsV2`; that sheet is schema-only at this stage.

The controlled read path uses the existing private 2569 database:

- `Main_2569` — official per-student summary layer; source for display identity, cohort, official accumulated hours and official Good Deed level.
- `Deeds_2569` — detailed activity ledger; used only to count approved/pending records for the current student.

Historical years remain separate and must not be rewritten or mixed into the 2569 card.

## Deployment boundary

`apps-script/CloudflareCardAdapter.gs` MUST be deployed as a **separate Apps Script Web App**.

Do **not** paste it into or replace the current Good Deed production Web App. The adapter has its own `doGet/doPost`, contains no mutation action, and reads the private source sheets only.

Cloudflare Core is the only intended caller. A browser must never call this resolver directly.

## Required Script Properties

Create these only in the separate Apps Script project → Project Settings → Script Properties:

- `GOODDEED_2569_SPREADSHEET_ID` — ID of the private spreadsheet that contains `Main_2569` and `Deeds_2569`.
- `GOODDEED_ACADEMIC_YEAR` — `2569` for this controlled release.
- `CLOUDFLARE_CARD_ADAPTER_SECRET` — random high-entropy value, minimum 32 characters.

The exact same HMAC secret must be stored in the Cloudflare Worker encrypted secret `GOODDEED_CARD_ADAPTER_SECRET`.

Never commit or paste the spreadsheet ID or secret into public GitHub, browser JavaScript, D1, logs, screenshots, or documentation.

## Identity rule

Good Deed 2569 accepts only the verified **7-digit Student Master reference** recovered server-side from the authenticated RTAFNC session.

The browser cannot choose or override `studentId/memberRef`. A malformed/non-7-digit reference is rejected before any source lookup.

## Request security

The Core sends only:

- verified 7-digit Student Master reference;
- request ID;
- Unix timestamp;
- random nonce;
- HMAC-SHA256 signature.

The Apps Script adapter:

- rejects timestamps outside ±120 seconds;
- rejects malformed references/request IDs/nonces/signatures;
- verifies HMAC in constant time;
- stores only a hashed nonce replay marker in Script Cache for 5 minutes;
- performs no write to Good Deed source data;
- never logs the student reference or returned identity.

## Response contract

Only the current student's card is returned:

- `displayName`
- `studentId` — own verified 7-digit ID only
- `cohortLabel`
- `positionLabel`
- `totalHours` — official value from `Main_2569`
- `approvedCount` — count from `Deeds_2569`
- `pendingCount` — count from `Deeds_2569`
- `levelNumber` — parsed from the official `ระดับความดี (Level)` field
- `levelLabel` — official level label from `Main_2569`

No roster, password/hash, LINE identifier, evidence, review note, address, health data, Telegram token, or another student's record may be returned.

## Activation gate

Keep RTAFNC ONE `gooddeed.readEnabled=false` until all of the following pass on remote staging:

1. Dedicated staging LIFF is confirmed under the correct Provider/LINE Login channel.
2. LINE staging login works through Core and creates an HttpOnly session.
3. Owner/admin bootstrap works.
4. Student Master link is verified server-side with a real 7-digit Student Master reference.
5. Student role includes `gooddeed:self:read`.
6. The separate Apps Script resolver is deployed read-only.
7. `GOODDEED_GAS_URL` points to that resolver, not the production Good Deed Web App.
8. Both sides have the same adapter secret configured outside Git.
9. `GET /api/gooddeed/card-self` returns the correct 2569 self-only card.
10. Returned total and level match `Main_2569`; approved/pending counts reconcile with `Deeds_2569`.
11. An invalid/unlinked/inactive identity fails closed.
12. Production endpoint and all operational writes remain unchanged.

## Rollback

Rollback means disable the staging route/config. Never edit/delete `Main_2569`, `Deeds_2569`, historical sheets, Student Master, or legacy Good Deed data to roll back this release.
