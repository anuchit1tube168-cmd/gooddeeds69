---
name: rtafnc-gooddeed-mission-control
description: Continue the existing RTAFNC Good Deed Light Mission Control implementation and verify its frontend, legacy API compatibility and staging release boundaries without replacing the ledger or auth stack.
---

# RTAFNC Good Deed entrypoint

Read `AGENTS.md` and the latest `docs/WORK_STATE.md`. Apply the maintained project workflow at `.agents/skills/rtafnc-gooddeed-fable/SKILL.md`; this entrypoint routes to that skill rather than duplicating its rules.

For Mission Control changes, read `docs/GOOD_DEED_UX.md` for display semantics, `docs/GOOD_DEED_ARCHITECTURE.md` for actual module/API/schema boundaries, and `docs/GOOD_DEED_TEST_PLAN.md` before claiming a feature passes.

Use PLAN → REUSE → BUILD → TEST → FIX → DOCUMENT. Audit as KEEP / IMPROVE / REPLACE / MISSING, then make the next authorized, reviewable change. Continue independent source work when runtime access is blocked, but do not use another browser surface to bypass a denial.

## เงื่อนไขบังคับของระบบ (Non-negotiable Conditions)

Follow AGENTS.md: preserve existing records, signatures, hours and LINE bindings; Clean is organization, not deletion. Student Master is canonical. LINE/LIFF verification, RBAC and assigned scope are server-side. Keep sensitive data and secrets private. Reuse Sheets/Drive/Apps Script and the existing gateway. Keep production writes false until controlled staging evidence and authorized cutover. Synthetic UI tests cannot enable production.
