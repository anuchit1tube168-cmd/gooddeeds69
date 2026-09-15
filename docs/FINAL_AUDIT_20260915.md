# Final incident audit — 2026-09-15

Status: **NOT FINAL / NOT PRODUCTION VERIFIED**.

Repair follow-up: owner authorized implementation after this audit. PR #5 now includes bounded login/password-change flow, V2 cancellation/read refresh fixes, honest Telegram delivery reporting with a review-page URL button, fractional-hour preservation, and restored Python boundaries. Local results are now 153/153 JavaScript and 23/23 Python, syntax PASS. The baseline findings below remain historical evidence; actual deployed login, Telegram approval and official totals remain unverified. See the latest WORK_STATE for patch limits.

Reported incident: students cannot finish login, Telegram approval notifications are missing, and approved work does not appear in hours/scores.

## Evidence and limits

Source baseline: `70aa2472ecbc75bee1f1311e22c3646341955ee8` (main, September 15 hotfix). This is source evidence, not proof of the Apps Script deployment version.

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| Public GitHub Pages login | PASS for page load only | Browser displayed student ID/password and login controls at `/frontend/index.html`. No authenticated student session was exercised. |
| Apps Script read-only entry | BLOCKED | Browser returned `net::ERR_BLOCKED_BY_CLIENT`. This is a test-environment restriction, not evidence of a server outage. No alternative transport was used to bypass it. |
| JavaScript baseline | FAIL | `node --test tests/*.test.cjs`: 140/143 pass. Failures cover stale verification after clearing, duplicate/contradictory self projection, and cancellation misclassified as timeout. |
| JavaScript bounded repair | PASS | Same suite: 143/143 pass, zero skipped. Restore existing gateway session/response validation while retaining the new GAS V2 transport and App overrides. |
| Python boundary suite | FAIL | `python3 -m unittest discover -s tests -p 'test_*.py'`: 23 test methods run; runner reports 23 failure entries (including subtests) and 2 errors. These are not 23 distinct failing methods. |
| Telegram delivery, approval and official totals | NOT VERIFIED | No real notification, approval, student record change or score reconciliation was performed. |

The isolated source checkout reused matching tests and retrieved changed files at the pinned main revision. Tests used local fixtures. No production student data was edited.

## Source findings relevant to the report

1. The V2 login transport allows 22 seconds per GAS call. Student login can try LINE binding and then password login, followed by a list request. Sequential waits can look like a stuck login. Whether deployed HtmlService replies reach the expected iframe source is unverified.
2. The V2 backend requires password change for sessions marked `mustChangePassword`, but the new frontend login path does not complete that flow before attempting reads. A list failure is swallowed by login. A rendered login success therefore does not establish a working student session.
3. `CodeV2.gs` sends Telegram text without an approval inline keyboard and has no V2 callback-query approval dispatch. `notifyTelegram_` silently returns if configuration is absent, ignores HTTP/API failure responses, and catches exceptions. The frontend overrides `App.notifyAdmins` to return true without sending a notification. Delivery cannot be inferred from that return value.
4. V2 review updates `GoodDeedRecordsV2`; that path does not reconcile the official `Main_2569` totals. Legacy student summaries round fractional approved hours and use a different fallback when any approved rows exist. Carry-forward, partial list results and official totals must be reconciled against a controlled fixture before any score migration.
5. Current Python server boundary tests detect exposed data paths, accepted forged role context, mutation boundary failures and an event-stream timeout. These describe the tested local Python source, not proof that this server is deployed behind GitHub Pages.

The configured Cloudflare gateway origin is empty, but the latest hotfix adds a separate GAS V2 route. An empty gateway origin alone is therefore not a confirmed cause of the reported login incident.

## Patch scope

Restore the previously tested `createGoodDeedGatewayClient` implementation's cancellation epoch checks, session validation and self-projection validation. Keep the September 15 GAS V2 additions intact. This closes three proven local regressions; it does not resolve the remaining deployed integration problems.

## Required closure evidence

- Identify the active Apps Script editor project, deployed version, and execution error for a controlled failed login. The source endpoint is already known; it does not identify editable deployment state.
- Use a designated test student and assigned teacher through a secure credential flow. Test first-login password change, login errors/timeouts, refresh and logout.
- On staging, test submission, verified Telegram delivery, authorized approve/reject, duplicate callback, failure/retry and audit history.
- Reconcile the same test deed with the official ledger, including 0.5-hour work, carry-forward and repeated approval. Preserve existing student records and totals.
- Repair and rerun Python boundary tests before enabling that server's data routes.

Keep the patch as draft. No production cutover or readiness claim is supported by this audit.
