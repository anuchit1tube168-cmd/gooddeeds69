# RTAFNC ONE — Phase 3 AGIS Knowledge Agent

Status: INTEGRATION BRANCH / NOT PRODUCTION

## Goal
Turn Library search into a grounded assistant that can answer from approved RTAFNC knowledge while preserving role, source version and confidentiality.

## User flow
`LINE OA / LIFF / Library -> RTAFNC session -> Knowledge Registry -> authorized retrieval -> Gemini -> answer + source/version/page`

If the authenticated backend is not available, the client remains in `retrieval_only` mode and displays candidate sources instead of inventing an AI answer.

## Components added
- `rtafnc-one-pilot/agis-client.js` — browser client; contains no secrets
- `workers/agis-knowledge/index.js` — server-side Gemini boundary
- `workers/agis-knowledge/README.md` — deployment/security contract
- `mcp/rtafnc-core-tools.phase3.json` — MCP allowlist for Phase 3
- updated `library-search.js` — AGIS mode + safe retrieval fallback
- updated `config.js` — blank `AGIS_API_BASE` until production backend is verified

## Gemini integration
Use server-side Gemini Interactions API. Remote MCP is optional and must be configured only through server environment secrets.

MCP server name: `rtafnc_core`

Phase 3 allowed tools only:
1. `library_search`
2. `library_get_excerpt`

No write tools are enabled in Phase 3.

## Required production gates
### Gate A — Identity
Backend must verify RTAFNC session and derive:
- `rtafnc_id`
- role(s)
- scopes
- advisor/student assignment where relevant

Never accept a role supplied by the browser as authorization.

### Gate B — Source authorization
Client candidate results are ranking hints only. Backend/MCP must re-check that the caller can read each knowledge source.

### Gate C — Source of Truth
For every answer store/return:
- knowledge_id
- source_id
- version
- page/range
- status: VERIFIED / CANDIDATE / REVIEW

A newer filename does not automatically become Master.

### Gate D — Sensitive knowledge
Do not place the following in public/static retrieval:
- individual health records
- mental-health records
- counseling notes / O.S.1–O.S.4 case contents
- personnel records
- individual welfare/financial records

Metadata and approved generic manuals may be indexed according to audience rules.

## Response contract
```json
{
  "ok": true,
  "mode": "grounded",
  "answer": "...",
  "sources": [
    {
      "id": "KB-WEL-003",
      "source_id": "SRC-STUDENT-HANDBOOK-2566",
      "title": "คู่มือนักเรียนพยาบาลทหารอากาศ ปีการศึกษา 2566",
      "version": "2566.1",
      "pages": "122, 125",
      "status": "VERIFIED_SOURCE"
    }
  ],
  "confidence": "grounded_registry"
}
```

## Fail-safe behavior
- No source -> no answer.
- No authenticated backend -> retrieval-only.
- Gemini unavailable -> retrieval-only.
- MCP unavailable -> do not enable MCP-dependent actions.
- Emergency notifications never depend on Gemini or MCP.

## Phase 3 completion criteria
- [x] Knowledge Registry is role-aware.
- [x] Public pilot hides private Drive IDs.
- [x] AGIS client has no secret.
- [x] Worker scaffold fails closed when auth verifier is missing.
- [x] Gemini key remains server-side.
- [x] MCP knowledge tools are allowlisted and read-only.
- [ ] Deploy Worker to controlled URL.
- [ ] Connect real RTAFNC session verifier.
- [ ] Implement MCP `library_search` and `library_get_excerpt` against Drive/Registry.
- [ ] Run E2E tests for Student / Advisor / Staff / Admin.
- [ ] Only then set `AGIS_API_BASE` in client config.
