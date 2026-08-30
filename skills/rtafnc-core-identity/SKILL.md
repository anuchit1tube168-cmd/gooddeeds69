# RTAFNC Core Identity Skill

## Purpose
Use this skill whenever an agent/developer needs to resolve or manage RTAFNC ONE student identity, academic-year roster, central authentication projection, LINE/Telegram binding or cross-module person linkage.

## Hard rules
- Never guess identity.
- Never use display name, file order, class number or LINE profile as a substitute for the verified seven-digit student business key.
- Real identities and account identifiers stay in private backend/Drive. GitHub examples use placeholders only.
- Preserve legacy technical keys during migration; do not destructively rename/delete them.
- Staff identity is a different subject namespace. Do not generate staff keys from names.

## Source hierarchy
1. Verified official student roster for target academic year.
2. Identity staging created from that roster.
3. Exact module-reference reconciliation.
4. Name/cohort similarity only as human-review hints.

If sources conflict, stop activation and output a conflict report. Do not choose a winner silently.

## Canonical student contract
```text
student_id: <student_id_7_digits>
display_name: <private>
cohort: <verified>
status: ACTIVE|INACTIVE|GRADUATED|HOLD
academic_year: <current_or_record_year>
identity_version: <version>
legacy_member_id: <optional_private_mapping>
line_binding: <server_verified_private>
telegram_binding: <server_verified_private>
```

## Allowed reads
- Resolve current authenticated subject to canonical identity.
- Read self-safe identity projection.
- Read roster validation status/counts for authorized operations.
- Read legacy mapping only in migration/admin scope.

## Allowed writes
Only through authenticated backend with explicit scope: staging import, reviewed activation, status change, verified LINE binding, one-time Telegram binding, controlled rebind/unbind. Every write is audited.

## Validation algorithm
1. Parse source row without mutation.
2. Require `^[0-9]{7}$` for student ID.
3. Normalize official name for comparison without replacing stored official value.
4. Check duplicate active ID.
5. Exact ID + exact official-name match → `MATCHED_EXACT`.
6. Valid new ID absent from registry → `NEW_IDENTITY` for review/activation.
7. ID/name contradiction → `CONFLICT`.
8. Name-only match → `REVIEW_ONLY`.
9. Required field absent → `MISSING_REQUIRED_DATA`.
10. No automatic production write for conflict/review states.

## Authentication behavior
LINE: accept ID token at backend, verify issuer/audience/expiry/sub against configured channel, map verified LINE subject to private binding, issue secure application session. Never accept browser-supplied LINE userId as authority.

Telegram: authenticated user requests a random high-entropy one-time binding token; store hash server-side with short configurable TTL; `/start <token>` binds Telegram chat to the already verified identity; invalidate token after success. Never embed student ID in token.

## Authorization projection
Return only needed claims/scopes. Student self-service must never accept arbitrary target student ID from UI. Advisor scope requires official active assignment plus verified staff binding. Admin does not imply clinical/counselling scope.

## Academic-year behavior
At 1 August run snapshot → new roster staging → exact validation → conflict review → activate pointer. Do not blindly increment year level. Historical identity/relationship versions remain readable.

## Audit/idempotency
Record actor subject, action, target identity key reference, source version, reason, correlation ID and outcome. Repeated binding/import request with same idempotency key must not create duplicate identity/binding rows.

## Failure behavior
Fail closed with machine-readable errors such as `IDENTITY_NOT_READY`, `IDENTITY_CONFLICT`, `SESSION_REQUIRED`, `BINDING_NOT_VERIFIED`, `SCOPE_DENIED`. Never return another person's record as fallback.

## Acceptance checks
Unique valid active IDs, exact roster reconciliation, server-verified external account bindings, cross-module self-only test, advisor assignment test, rollback snapshot test and public-repository PDPA scan.

## Activation gate
Do not enable identity-backed production writes until source roster is verified, conflict set is resolved, auth verification is live, audit works and rollback exists.
