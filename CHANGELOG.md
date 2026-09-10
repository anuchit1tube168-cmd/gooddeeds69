# Changelog

## Unreleased — 2026-09-10 — Light Mission Control

Continues draft PR #4 from `ce581a7dec158deda4cffec08644810f9367edeb`. No deployment, schema migration, data deletion, real notification or production write.

### Added

- Mission Control shell, desktop sidebar and mobile primary navigation with a More menu; six KPI slots, exact requested hero wording and original aviation/college assets.
- React overview, nine-category circular Radar, six-month analytics, goal and profile views. Monthly calculations use Bangkok dates. Annual progress accepts a separate verified period value and never derives from carry-forward totals.
- In-memory demo drafts, native submission dialog/bottom sheet, student drawing, file-header checks and bounded image preview sizing, Mission ID receipt, mission cards, timeline and rejection/resubmission history.
- Demo review filters, selected-record review sequence, fresh drawing and explicit confirmation for each outcome. There is no batch-approval shortcut. Revisions retain prior evidence/reason and have distinct notification event IDs.
- Controller, projection, drawing/preview and workflow regression tests; architecture, UX and test documentation; root skill entrypoint routing to the existing Fable skill.

### Improved

- Gateway presentation reuses existing authenticated self reads for all new views; duplicate mission IDs and contradictory item owners are rejected before projection.
- Existing official totals, pass/level and stored category IDs remain separate from loaded-list statistics. Missing photos/goals/metadata are explicit rather than fabricated.
- Earlier README operational instructions were replaced because they recommended retired offline credentials, frontend tokens and an unsafe public deployment path.

### Verification and limits

Local syntax passes; 115 JavaScript + 16 Python tests pass. Controller tests use doubles, not a browser. New visual/console/mobile tests are BLOCKED by automatic approval review denying preview access. September 9 screenshots remain historical. Physical LIFF and authenticated provider E2E remain unverified. The requested 6.2–6.9 mapping, annual configuration and secure write/evidence/revision integration are still release gates.


### Concurrent owner updates preserved

Merged source updates through `2bff70e2522f9c92d4dd495ed1b86dd1e793d44a` before publication. Kept name/signature layout and stored sequence improvements; corrected Master column reads and undefined URL-name references, removed unsigned identity fallbacks/student-number arithmetic, restored verified Telegram TLS/accurate delivery results, and suspended public-roster/Git-auto-publish/legacy callback effects. The static preview no longer starts a notification/review daemon. Added eight regression cases for these findings; final local total is 131 (115 JS + 16 Python).
