# RTAFNC ONE — AGIS Knowledge Worker (Phase 3)

Status: integration scaffold only. Do not point production LIFF here until auth + source resolver are connected and tested.

## Purpose
Provide a secure server-side boundary between RTAFNC ONE clients and Gemini. The browser never receives `GEMINI_API_KEY`, MCP credentials, private Drive IDs, or restricted source URLs.

## Endpoints
- `GET /health`
- `POST /api/knowledge/ask`
- `POST /api/source/open`

## Required environment bindings
- `GEMINI_API_KEY` — secret
- `AUTH_VERIFY_URL` — RTAFNC session verifier; backend must derive RTAFNC_ID + roles/scopes
- `ALLOWED_ORIGINS` — comma-separated exact frontend origins

## Optional
- `GEMINI_MODEL` — defaults in source, pin explicitly for production
- `RTAFNC_MCP_URL` — remote Streamable HTTP MCP endpoint
- `RTAFNC_MCP_TOKEN` — secret bearer token for MCP

## Security contract
1. Never trust `demo_role` or any role sent from browser.
2. Browser candidate sources are ranking hints only; production retrieval must re-check source access server-side.
3. No API key in GitHub, HTML, LIFF, Apps Script client, or JavaScript config.
4. Restricted source opening requires RTAFNC session + role + purpose + audit.
5. No source means no answer.
6. Candidate/review sources may be surfaced but must not silently replace an approved Master.
7. Emergency routing never depends on Gemini/MCP.

## Production retrieval target
`question -> verify session -> library_search -> library_get_excerpt -> Gemini -> answer + citations`

The two library tools should live behind RTAFNC MCP/Core, not in a public static page.
