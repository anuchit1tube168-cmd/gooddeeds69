# RTAFNC ONE — Phase 4 One Identity / Auth Bridge

Status: INTEGRATION BRANCH / NOT PRODUCTION

## Rule
Do not invent a second login while Good Deed V2 already has a working authenticated session.

Current verified legacy auth facts from `backend/CodeV2.gs`:
- MembersV2 stores `memberId`, `studentId`, `displayName`, `cohort`, `role`, `lineUserId`.
- Session cache stores `memberId`, `username`, `studentId`, `displayName`, `cohort`, `role`, `mustChangePassword`.
- `loginWithLine` / `bindLineAndLogin` verify LINE ID token server-side against LINE; browser-supplied userId is not trusted.
- `me` already returns the public authenticated user context.

## Phase 4 decision
Reuse the existing Good Deed V2 session as the first authentication bridge.

`Browser session -> AGIS Worker -> Good Deed V2 action=me -> verified user -> server access tier`

The Worker sends the existing session token to the existing Apps Script endpoint server-to-server. The Apps Script response is currently an iframe/postMessage HTML bridge; Phase 4 parses only its JSON envelope. No changes are made to the production Apps Script in this phase.

## Identity context returned by Worker
```json
{
  "auth_source":"GOODDEED_V2_SESSION",
  "subject_id":"<existing studentId or memberId>",
  "subject_id_type":"student_id | member_id",
  "canonical_rtafnc_id":null,
  "canonical_id_status":"PENDING_IDENTITY_REGISTRY",
  "member_id":"...",
  "student_id":"...",
  "display_name":"...",
  "cohort":"...",
  "legacy_role":"student | teacher | admin",
  "access_tier":"STUDENT | STAFF | ADMIN",
  "scopes":["..."]
}
```

## Important: canonical RTAFNC_ID is NOT guessed
Phase 4 deliberately does not lock a permanent `RTAFNC_ID` format.

Before production identity registry creation, confirm whether canonical identity should be:
1. the 7-digit student code itself for students, with another namespace for staff; or
2. an opaque immutable internal ID, with student code/LINE/Telegram as linked identifiers.

Until confirmed, `subject_id` is a verified bridge key, not the final canonical ID.

## Role policy in Phase 4
Legacy role mapping is deliberately minimal:
- `student` -> `STUDENT`
- `teacher` -> `STAFF`
- `admin` -> `ADMIN`

`teacher` is NOT automatically treated as `ADVISOR`.
Advisor authorization requires a real Advisor Assignment source in a later gate.

## Server-side knowledge authorization
Client Library cards are only ranking hints. The Worker now maintains a separate sanitized server registry and re-hydrates metadata by knowledge ID.

Therefore the browser cannot grant itself access by changing:
- role selector
- title
- source version
- source status
- source summary

## Sensitive boundary
The server registry contains metadata/manual summaries only. It must never contain:
- Health case data
- Mental-health data
- O.S.1–O.S.4 student case contents
- Counseling notes
- Personnel records
- Individual welfare/financial records
- Private Drive IDs or signed URLs

## Phase 4 files
- `rtafnc-one-pilot/agis-client.js`
- `workers/agis-knowledge/index.js`
- `workers/agis-knowledge/registry.v1.js`
- this document

## Required Worker environment
- `AUTH_VERIFY_URL` = existing Good Deed V2 Apps Script Web App endpoint
- `AUTH_VERIFY_ORIGIN` = approved RTAFNC frontend origin (optional if first ALLOWED_ORIGINS entry is correct)
- `ALLOWED_ORIGINS`
- `GEMINI_API_KEY` only when ready
- `RTAFNC_MCP_URL` / `RTAFNC_MCP_TOKEN` only when MCP is ready

Secrets stay server-side.

## Not done / do not claim complete
- canonical RTAFNC_ID registry
- staff/advisor master assignment
- Telegram account binding registry
- secure Drive source resolver
- Worker deployment
- live E2E test
- production cutover

## Next safe gates
1. Confirm canonical identity format.
2. Locate/confirm Advisor Assignment master source.
3. Build Identity Registry schema without moving existing data.
4. Deploy Worker to a controlled URL.
5. Test Student -> Staff -> Admin auth separately.
6. Add Advisor scope only after assignment verification.
