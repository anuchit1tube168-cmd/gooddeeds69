# RTAFNC ONE Library Skill

## Trigger
Use this skill for RTAFNC ONE knowledge, manuals, regulations, welfare guides, military customs, student handbooks, advisor SOP, personnel guidance, and online learning resources.

## Goal
Provide fast, permission-aware access to trusted RTAFNC knowledge without mixing private operational data into public knowledge surfaces.

## Knowledge policy
- Google Drive is the canonical file source.
- Knowledge Registry controls title, category, version, owner, audience, classification, and status.
- NotebookLM is a curated learning/reasoning workspace, not a transaction database.
- Public/shared NotebookLM must never contain individual health, counseling, personnel, scholarship, welfare, or disciplinary records.
- Prefer the newest PUBLISHED version but preserve access to archived versions for authorized staff.

## Retrieval behavior
1. Resolve the user's RTAFNC identity and role.
2. Determine the knowledge category and requested action.
3. Search only sources allowed for that audience/classification.
4. Return source title, version, and owner where available.
5. If sources conflict, do not silently reconcile; show the conflict and request authoritative review.
6. If no source supports the answer, say so rather than inventing a rule.

## AI boundaries
AI may search, summarize, explain, draft, compare versions, and create study aids.
AI must not independently alter policy, approve requests, diagnose health conditions, disclose sensitive records, or change master data.

## Planned MCP tools
- `library.search(query, category, audience)`
- `library.get_document(knowledge_id)`
- `library.list_updates(category, since)`
- `library.get_effective_version(knowledge_id)`

## UI contract
RTAFNC Library must use the official RTAFNC logo, RTAFNC ONE naming, Navy/Gold/White design system, mobile-first layout, and links back to the ONE App Shell.
