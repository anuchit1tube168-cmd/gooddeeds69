---
name: rtafnc-gooddeed-fable
description: Diagnose, test and improve the RTAFNC Good Deed LINE LIFF, Cloudflare and Google Apps Script system while preserving student records and handoff continuity. Use for this project's debugging, implementation, approval workflow and release preparation.
---

# Fable for RTAFNC Good Deed

Read root `AGENTS.md` and `docs/WORK_STATE.md`. Domain policy and mandatory preservation rules live in AGENTS.md; do not duplicate or reinterpret them.

## 1. INSPECT

Identify current branch/commit and working changes. Trace the selected operation across frontend → actual API → storage → notification. Distinguish legacy, v2 pilot and Cloudflare gateway. Determine the deployed version from read-only evidence; never infer it from main. Read adjacent code and the failing test.

## 2. CLARIFY

Use existing context. Ask only when missing information changes architecture, data ownership or a required external operation. If production access is unavailable, proceed with synthetic local tests, code fixes and documentation. Preserve the access blocker for final handoff.

## 3. DESIGN

State one expected observable behavior and its failure behavior. Prefer the existing verified module. Specify the data invariant and a meaningful regression test. For cross-sheet writes, plan partial-failure recovery explicitly. For notifications, define event identity and retry ownership.

## 4. BUILD

Change one bounded behavior in an isolated branch. Do not publish credentials or real student fixtures. Never change production schema, LIFF endpoints or sharing to make a test pass. Keep UI changes independent of auth decisions. Use the existing crest and light CSS depth.

## 5. VERIFY

Run the relevant regression, then syntax checks. Capture a before/after failure if practical. Mocked Apps Script tests do not prove live Sheets, LINE or Telegram behavior. For browser testing inspect visible state, console errors and real narrow/wide layouts; do not invent an account. For blocked runtime tests record provider, operation and observed error without secrets.

If two attempts fail with the same cause, update the hypothesis rather than retry the same operation. Never bypass approvals, quotas, identity checks or tests. Continue tasks that do not depend on the blocker.

## 6. DELIVER / RESUME

Update `docs/WORK_STATE.md` and `WIKI.md` as needed. Record modified files, tests with scope, open P0/P1 risks and the next exact action. Commit/push only reviewed files; never bulk-push backups or a partial checkout as a replacement repository. Prepare a draft PR. Final production approval comes after staging proof, not before implementation.

At interruption/model switch: read WORK_STATE, verify HEAD, rerun only the affected verification, and resume the named task. Never start from scratch solely because the model changed.

## Expected output

- Outcome and evidence in Thai.
- Code/tests in the project with no real data.
- Honest readiness: local pass, browser pass, staging blocked or production verified.
- Human instructions in WIKI; AI instructions here and in AGENTS.
