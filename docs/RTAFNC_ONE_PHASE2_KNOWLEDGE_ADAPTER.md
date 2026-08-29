# RTAFNC ONE — Phase 2 Knowledge Registry Adapter

Status: INTEGRATION BRANCH ONLY
Branch: `rtafnc-one-integration`

## Objective
Convert Library from static demo cards to a source-aware, version-aware and role-aware registry before connecting AGIS/Gemini/MCP.

## Core rule
AI must never decide the authoritative document by filename alone.

Pipeline:

`Source → Registry → Duplicate/Version Review → Audience Gate → Knowledge Chapter → AGIS Retrieval`

## Phase 2 files
- `rtafnc-one-pilot/knowledge-registry.js`
- `rtafnc-one-pilot/library-search.js`
- `rtafnc-one-pilot/library.html`

## Verified uploaded sources
### Student Handbook AY 2566
Use as verified source for the 2566 handbook context. It contains education/governance, personnel rights, welfare and student activities.

Knowledge chapters created:
- Student handbook
- Welfare rights/services
- Dormitory
- Laundry
- Food/water/postal
- Student activities

### Advisor Handbook AY 2566
Use as verified source for 2566 advisor workflows and forms.

Knowledge chapters created:
- Advisor workflow
- Confidentiality/access rules
- Forms O.S.1–O.S.4
- O.S.3 recording guide
- O.S.4 annual development summary

## Drive candidates
### Advisor Handbook 2567
Drive file id: `1gHHJKGiFwhjt4XXbvavX8LLK4FmnLF_M`
Status: `CANDIDATE_MASTER`
Reason: newer than 2566 but effective/approved status must be confirmed before superseding the 2566 source.

### Welfare Regulation 2568
Candidate Drive file id: `1We-pkbvwZzgun6LzO2Wc_gvY7PzUlMBU`
Status: `CANDIDATE_MASTER`
Duplicate group: `WELFARE_REGULATION`
Rule: duplicate copies are classified, not deleted.

### Military traits assessment
Candidate Drive file id: `1MgU_BOg9c75n_cZD-rrMd6SZv0NUMqk8`
Status: `DUPLICATE_REVIEW`
Rule: compare modified/version/content before selecting Master.

## Access classes
- `PUBLIC` — safe public knowledge only
- `STUDENT` — all authenticated nursing students
- `ADVISOR` — assigned/authorized advisor context
- `STAFF` — authorized college/governance staff
- `ADMIN` — registry management, not automatic access to every sensitive case
- `RESTRICTED` — purpose/role/assignment check required

## Mandatory security rules
- O.S.1–O.S.4 contents and counseling notes are not public knowledge.
- Health, mental-health, personnel and individual welfare data do not enter a public notebook.
- Knowledge source metadata can be visible without exposing case data.
- A candidate newer file is not automatically authoritative.
- Never delete Drive duplicates during discovery.

## Phase 3 target
Connect `library.search` / Knowledge Agent to AGIS/Gemini and later MCP.
Expected response contract:

```json
{
  "answer": "...",
  "sources": [
    {"source_id":"...","version":"...","pages":"..."}
  ],
  "confidence":"grounded",
  "action_tools": []
}
```

Phase 3 may summarize only retrieved content the caller is allowed to access. If no source supports the answer, AGIS must say so instead of guessing.
