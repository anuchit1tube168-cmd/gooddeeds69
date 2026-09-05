# Good Deed — Phase 2A Cloudflare migration

**Status:** STAGING ONLY / EXISTING LIFF ENDPOINT UNCHANGED / PRODUCTION WRITE = FALSE

## Migration target

Existing LINE OA / LIFF ID stays unchanged for users. At final cutover only the LIFF Endpoint URL will move from the current static host to the approved Cloudflare Pages production URL.

Frontend → Cloudflare Pages
Security gateway → RTAFNC ONE Cloudflare Worker
Module route → `/api/gooddeed/*`
Operational data → private server-side storage/adapters only
Evidence → private storage only

## Rules

- Do not put student list, deed records, passwords, photos, LINE user IDs, evidence or messaging tokens in Pages assets or GitHub.
- Do not restore the previous client-side login/data bundle.
- Browser may contain the LIFF ID because it is a public identifier; secrets remain server-side.
- LINE identity must be verified server-side from the raw ID token.
- The current `frontend/index.html` is not changed by this phase.
- Existing Production users continue to use the current endpoint until owner-approved cutover.

## Staging acceptance

1. Cloudflare gateway `/health` is healthy with writes disabled.
2. `gooddeed` route is allowlisted but fail-closed.
3. A Cloudflare Pages staging shell loads without student/deed data files.
4. No secret/PII scanner findings.
5. Submit/review/evidence flows remain disabled until authenticated server adapters and RBAC are implemented and tested.
6. Rollback keeps the current LIFF endpoint available.
