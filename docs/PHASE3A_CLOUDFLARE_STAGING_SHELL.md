# Good Deed — Phase 3A Cloudflare staging shell

**Status:** STAGING ONLY / EXISTING LIFF PRODUCTION ENDPOINT UNCHANGED / PRODUCTION WRITE = FALSE

## Purpose

Phase 3A adds a fail-closed browser shell for testing the shared RTAFNC ONE Cloudflare Core without copying the legacy Apps Script login/session design into Cloudflare.

The staging shell lives at `frontend/cloudflare-staging/` and intentionally has no username/password login, no local session token, no browser-side Student Master link, no local RBAC assignment and no write workflow.

## Required topology

Use one browser origin for the staging UI and Core API routes:

- UI assets: `/...`
- Core auth: `/auth/*`
- Good Deed API: `/api/gooddeed/*`

The Core session uses the host-only cookie `__Host-rtafnc_session` with `SameSite=Lax`. Therefore a split staging design such as `*.pages.dev` UI calling a separate `*.workers.dev` API is not an accepted Phase 3A topology. Route the Worker on the same staging host/path or use an equivalent same-origin reverse proxy.

## Browser rules

Allowed browser configuration:

- staging LIFF ID (public identifier)
- non-secret UI labels
- relative module path
- `PRODUCTION_CUTOVER=false`
- `WRITES_ENABLED=false`

Forbidden in browser assets:

- student list / Student Master rows
- passwords or password hashes
- LINE user IDs / LINE subject identifiers
- deed records
- evidence files or evidence URLs that bypass authorization
- LINE Messaging token / Channel secret
- Telegram bot token
- local role assignment
- persistent application session tokens

## Authentication flow

1. Browser loads staging shell.
2. Shell checks `/health` and `/auth/session` using `credentials: include`.
3. If unauthenticated, LIFF obtains a raw ID token.
4. Browser sends the ID token to `/auth/line/verify`.
5. Core verifies LINE server-side, resolves/creates the opaque identity and sets `__Host-rtafnc_session`.
6. Student access remains blocked until the owner-approved Core Student Master link is `verified`.
7. RBAC permissions come only from Core bindings.

## Module probe

Phase 3A may call `GET /api/gooddeed` only as a staging probe. The expected safe states are:

- `module_read_disabled` while module read remains locked; or
- `adapter_not_configured` after auth/RBAC is accepted but before the Good Deed data adapter is enabled.

No submit, review, evidence upload or operational write is enabled in this phase.

## Acceptance gate before Phase 3B

- `/health` returns healthy staging state.
- Auth session is enabled and D1 is bound.
- LINE verification succeeds through Core only.
- Cookie session survives a normal page reload on the staging origin.
- Unlinked identities cannot read student-scoped Good Deed data.
- Missing RBAC permission is denied and audited.
- Browser assets contain no PII, secrets, deed records or evidence.
- Existing Production LIFF endpoint is unchanged.
- `productionCutover=false` and `productionWrites=false` remain locked.

## Deferred to Phase 3B+

- Owner-approved Student Master linking workflow.
- Read-only Good Deed operational adapter.
- CSRF re-issuance/rotation design for restored sessions before any write is enabled.
- Submit/review/evidence flows.
- Production cutover and rollback rehearsal.
