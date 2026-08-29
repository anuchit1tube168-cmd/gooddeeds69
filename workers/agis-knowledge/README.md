# RTAFNC ONE — AGIS Knowledge Worker (Phase 4)

Status: integration scaffold only. Do not point production LIFF here until deployment + auth + source resolver are tested.

## Purpose
Secure server-side boundary between RTAFNC ONE clients and Gemini/MCP. The browser never receives `GEMINI_API_KEY`, MCP credentials, private Drive IDs, restricted source URLs, or LINE Messaging secrets.

## Current auth bridge
Phase 4 reuses the existing Good Deed V2 session instead of creating a second login.

`Browser X-RTAFNC-Session -> Worker -> existing Apps Script action=me -> verified legacy user -> access tier`

The current Apps Script returns an iframe/postMessage HTML bridge, so the Worker extracts only the JSON envelope. No change to `CodeV2.gs` is required for this phase.

## Endpoints
- `GET /health`
- `POST /api/auth/me`
- `POST /api/knowledge/ask`
- `POST /api/source/open`

## Required environment bindings
- `AUTH_VERIFY_URL` — existing Good Deed V2 Apps Script Web App endpoint
- `ALLOWED_ORIGINS` — comma-separated exact frontend origins

Recommended:
- `AUTH_VERIFY_ORIGIN` — exact origin registered by the Apps Script bridge

Only when AI is enabled:
- `GEMINI_API_KEY` — secret

Optional later:
- `GEMINI_MODEL` — pin explicitly after model choice is verified
- `RTAFNC_MCP_URL` — remote MCP endpoint
- `RTAFNC_MCP_TOKEN` — secret bearer token for MCP

## Security contract
1. Never trust `ui_role_hint`, `demo_role`, student ID, LINE userId, title, summary, source version or source status sent from browser as authorization.
2. Existing session is verified server-to-server using `action=me`.
3. Browser candidate sources provide knowledge IDs only as ranking hints.
4. `registry.v1.js` re-hydrates source metadata and checks access server-side.
5. `teacher` maps only to STAFF in this phase; it does not automatically mean ADVISOR.
6. Canonical `RTAFNC_ID` remains unset until the identity format is explicitly confirmed.
7. No API key or private Drive ID is stored in static frontend.
8. Restricted source opening still requires a future secure resolver + audit.
9. No authorized source means no answer.
10. Emergency routing never depends on Gemini/MCP.

## Current identity response
`/api/auth/me` returns a verified bridge context with:
- subject_id
- subject_id_type
- member_id
- student_id
- display_name
- cohort
- legacy_role
- access_tier
- scopes
- `canonical_rtafnc_id: null`
- `canonical_id_status: PENDING_IDENTITY_REGISTRY`

## Production retrieval target
`question -> verify existing session -> server registry/MCP authorization -> retrieve approved excerpt -> Gemini -> answer + source/version/page`

## Still blocked before production
- canonical identity registry decision
- Advisor Assignment master source
- secure Drive source resolver
- real Worker deployment URL
- Student/Staff/Admin E2E tests
- MCP excerpt retrieval against the approved source repository
