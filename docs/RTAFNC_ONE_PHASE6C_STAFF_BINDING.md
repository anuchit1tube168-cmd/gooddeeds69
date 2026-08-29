# RTAFNC ONE — Phase 6C Staff Account Binding & Dashboard Router

Status: **Integration only / Production write disabled**
Academic year: **2569** (runtime rollover every 1 August, Asia/Bangkok)

## Decision lock

1. **Activate advisor relationships first.** The current live relationship source is the official academic-year-2569 advisor order in private Google Drive.
2. Other faculty/support personnel stay in `STAFF_REFERENCE_DIRECTORY` for later lookup only. They are not an active runtime identity/permission database yet.
3. Staff photos are not populated until the official photo set is supplied.
4. Display name is **never** an authentication or authorization key.
5. A real staff account can be activated only by an exact verified account binding (`member_id` and/or `line_user_id`) after review.
6. Advisor access requires both a verified staff account and an active advisor assignment for the current academic year.
7. Technical/Admin roles do not automatically inherit clinical records or advisor private notes.
8. All project source files remain read-only; runtime reads through Registry/Staging/Adapters.
9. **GitHub is code-only.** No real student names, 7-digit student IDs, LINE user IDs, Telegram chat IDs, personal email addresses, health/counselling records, or real staff-to-student binding tables may be committed.

## Private Google Drive core tabs

- `ADVISOR_ACTIVE_2569` — minimum active relationship mapping: academic year + student ID + advisor group/name as written in the official order. `PRIVATE_DRIVE_ONLY`.
- `STAFF_REFERENCE_DIRECTORY` — personnel-name reference for future modules; not an active authorization database.
- `STAFF_ACCOUNT_BINDING` — activation queue; remains empty until an account identifier is explicitly verified.
- `ROLE_ACCESS_MATRIX` — generic role-to-dashboard policy, contains no real identity mappings.
- `ADVISOR_NAME_REVIEW` — review area where order/roster spellings differ.
- `PROVENANCE` — internal source/origin history.

## Advisor relationship state

`ADVISOR_ACTIVE_2569` may be `ACTIVE_BY_OFFICIAL_ORDER` even while the account is `PENDING_STAFF_ACCOUNT`.

This means the organizational relationship is known, but the teacher cannot yet sign in as that advisor until their real account is verified.

## Staff account binding states

- `PENDING_ACCOUNT`
- `PENDING_REVIEW`
- `VERIFIED`
- `SUSPENDED`
- `ENDED`

Only `VERIFIED` can receive runtime capabilities.

## Backend flow

```text
LINE / RTAFNC session
  -> server-side session verifier
  -> /api/staff/me
  -> exact STAFF_ACCOUNT_BINDING resolver
  -> current academic-year assignment resolver
  -> capability resolver
  -> Staff Portal
```

No exact binding = no staff dashboard access.
Multiple exact bindings = conflict and hard stop.

## GitHub privacy gate

The repository contains `scripts/pii-guard.mjs` and `.github/workflows/pii-guard.yml`.

The guard blocks common real-identity literals such as:
- RTAFNC student IDs in the 7-digit academic-series pattern
- LINE user ID literals
- personal email literals
- literal Telegram chat IDs assigned to Telegram fields

Use placeholders such as `<STUDENT_ID_7_DIGIT>` or server-side environment/database references in GitHub.

## Future base dashboards

The code can support Executive, Governance, Faculty, Supply, Support and Health dashboards, but **no non-advisor personnel record is activated merely because it exists in the reference directory**.

## Credit / provenance

Runtime/system footer:

> ผปค.วพอ.พอ. ร.อ.อนุชิต ทำจะดี ผู้พัฒนา

Source attribution, licence requirements, third-party template origin and historical project provenance remain in private/internal provenance records when required and are not rewritten as ownership claims.

## Remaining production gates

- verify each advisor account identifier
- resolve advisor-name variants before account binding
- derive Advisor Panel from `ADVISOR_ACTIVE_2569` only
- deploy backend/AGIS Worker
- run PII guard and negative authorization tests
- later review/activate non-advisor staff roles one group at a time
