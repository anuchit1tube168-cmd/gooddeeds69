# RTAFNC ONE — Storage & Project Governance

## Golden rule
Never let a runtime module browse arbitrary Drive folders directly. Every source must be registered, classified, and selected before use.

## Layers
1. `SOURCE_VAULT` — original Drive projects/files. Read-only. Never rename, move, delete, or overwrite during integration.
2. `STAGING` — clones, normalized catalogs, clean identity projections, data-quality review.
3. `REGISTRY` — project key, source ID, created/modified timestamps, selection status, data policy, academic year, provenance policy.
4. `RUNTIME` — only approved adapters/datasets. No demo/test/quarantine rows.
5. `ARCHIVE/QUARANTINE` — duplicates, obsolete variants, demo/test data, broken sources. Preserve; do not delete.

## Selecting among duplicate projects
Use this order:
1. Confirm intended domain and owner/control.
2. Compare `created_at` and `modified_at` metadata.
3. Inspect actual content/schema/data freshness; timestamps alone are not enough.
4. Prefer the most recently maintained valid project, not the highest version number in its title.
5. Record rejected/older candidates as `REFERENCE_ONLY`, `REVIEW`, or `ARCHIVE_CANDIDATE` rather than deleting them.

## Data-quality states
- VERIFIED — eligible for runtime.
- STAGING — structurally usable but still being reconciled.
- REVIEW — ambiguous/duplicate/outdated.
- DEMO_TEST — test/sample data; never mix with production.
- QUARANTINE — broken or unsafe for runtime.

## Academic year
Cutover = 1 August, timezone Asia/Bangkok. Masters may carry forward after validation. Transactions retain their original academic year and must never be rewritten during rollover.

## Required project registry fields
`project_key, source_title, source_id, created_at, modified_at, selected_status, data_policy, runtime_credit, provenance_policy, notes`.

## Runtime source rule
A module may connect only to a project/data source whose registry state explicitly allows it. Health and other sensitive modules require an additional authorization gate before write access.
