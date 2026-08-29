# RTAFNC ONE — Phase 6C Staff Account Binding & Dashboard Router

Status: **Integration only / Production write disabled**
Academic year: **2569** (runtime rollover every 1 August, Asia/Bangkok)

## Decision lock

1. Runtime staff profile uses only necessary fields: display name, role/capabilities, academic year, photo status/account status.
2. Staff photos are not populated until the official photo set is supplied.
3. Display name is **never** an authentication or authorization key.
4. Staff access is activated only by an exact verified account binding (`member_id` and/or `line_user_id`).
5. Advisor is an additive role and requires an active advisor assignment for the current academic year.
6. Technical/Admin roles do not automatically inherit clinical records or advisor private notes.
7. All project source files remain read-only; runtime reads through Registry/Staging/Adapters.

## Google Drive core tabs

- `STAFF_DIRECTORY` — minimal runtime directory; role classification is candidate data until reviewed.
- `STAFF_ACCOUNT_BINDING` — authoritative activation queue for staff accounts; empty until verified.
- `ROLE_ACCESS_MATRIX` — role-to-dashboard scope policy.
- `ADVISOR_NAME_REVIEW` — canonical-name review where order/roster spellings differ.
- `PROVENANCE` — internal source/origin history; never used as end-user credit text.

## Binding states

- `PENDING_ACCOUNT`
- `PENDING_REVIEW`
- `VERIFIED`
- `SUSPENDED`
- `ENDED`

Only `VERIFIED` can receive runtime capabilities.

## Backend flow

```text
LINE / RTAFNC session
  -> Good Deed V2 server-side session verifier
  -> /api/staff/me
  -> exact STAFF_ACCOUNT_BINDING resolver
  -> capability resolver
  -> Staff Portal
```

No exact binding = no staff dashboard access.
Multiple exact bindings = conflict and hard stop.

## Base dashboards

- `EXECUTIVE` -> Executive Dashboard
- `GOVERNANCE` -> Governance Dashboard
- `FACULTY` -> Faculty Dashboard
- `SUPPLY_SUPPORT` -> Supply Dashboard
- `EDU_IT_SUPPORT` -> Support Dashboard
- `SUPPORT` -> assigned modules only
- `HEALTH_AUTHORIZED` -> Health Dashboard

## Additive access

- `ADVISOR_ADDITIVE` -> assigned students only
- `APPROVER_ADDITIVE` -> assigned approval queues only
- `MODULE_OPERATOR_ADDITIVE` -> assigned modules only

## Credit / provenance

Runtime/system footer:

> ผปค.วพอ.พอ. ร.อ.อนุชิต ทำจะดี ผู้พัฒนา

Source attribution, licence requirements, third-party template origin and historical project provenance must remain in internal `PROVENANCE` records and must not be falsified or deleted when legally/contractually required.

## Remaining production gates

- verify staff account identifiers
- review canonical advisor names
- approve role classifications/module assignments
- configure `STAFF_BINDINGS_JSON` (or future database adapter) as a server secret/config, never public frontend
- deploy AGIS Worker
- test Student/Faculty/Advisor/Governance/Supply/IT/Health separation
- perform negative authorization tests before production cutover
