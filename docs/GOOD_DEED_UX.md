# Good Deed UX — Light Mission Control

Updated 2026-09-10. Implemented in the existing secure pilot; not a production release. Source baseline: draft PR #4 at `ce581a7dec158deda4cffec08644810f9367edeb`.

## Product direction

Air Force + Nursing + Youthful + Warm. The welcome to a student's own work is **“ทุกความดี คือภารกิจที่มีคุณค่า”**. Clear official information comes first; encouragement never creates hours or changes evaluation. Preserve the college crest and restrained aircraft illustration. No borrowed branding, coins, competitive gaming UI or heavy 3D engine.

| Token | Implementation |
| --- | --- |
| Canvas | `#f5f7fa`, white cards |
| Primary | Air Force navy `#132b49`, chart blue `#447b9f` |
| Secondary | Light sky `#eaf2f9` |
| Accent | Warm gold `#b28b42` |
| Success | Restrained green `#32694f` |
| Shape / depth | 16–22px cards, thin borders, soft shadow and small lower edge |
| Type | Sarabun, 16px form controls; no extra heading font |
| Motion | 150–220ms interactions; reduced-motion rules disable effects |
| Controls | At least 44px for primary touch actions, visible focus, text status badges |

`design.css` retains aviation styling. `mission.css` contains the new shell, cards, charts and responsive overrides. This is incremental presentation work in the existing application.

## Navigation and first screen

Desktop uses a sidebar. At widths up to 760px the bottom bar has Overview, My Missions, Add, Radar and More. More contains Analytics, History, Profile, Guide and the demo teacher queue when that view is selected. The remaining menu items are not discarded. The FAB sits above the bottom bar/safe area; it is absent while the submission dialog is open.

The hero shows the authenticated name, cohort, student ID and linked state. The current API does not expose a verified private photo route, so the UI uses a name initial with a missing-photo label. It never substitutes a fabricated student photograph. Profile correction routes to the responsible teacher until a secure edit API exists.

## Numerical truth

| Surface | Source and interpretation |
| --- | --- |
| Total mission hours | `card.totalHours` from official Master, including verified carry-forward; never recomputed from recent rows |
| Month hours | Approved rows in the currently loaded list, by Bangkok activity date; explicitly labelled as partial in the gateway |
| Activity count | Loaded non-draft rows, including pending/rejected; not an institution-wide count |
| Pending / approved | Counts supplied by the existing card endpoint; draft demo uses its own labelled counts |
| Annual goal | Separate target and approved hours within an explicitly verified period; missing configuration shows “รอยืนยัน” |
| Radar | Approved loaded hours by stored category ID; each ring compares against the largest loaded category, not an official ceiling |
| Six-month cumulative trend | Approved loaded rows within the six displayed calendar months; no carry-forward and no implied academic-year policy |
| Achievements | Recognized approved activity / hour thresholds; no points, coins, ranking or effect on evaluation |

The sample goal is **25 hours of approved demo rows**, excluding its synthetic carry-forward. It is clearly described as a demonstration, not a college regulation. A missing goal must never be replaced by 50 or 100 solely to fill a chart.

## Category compatibility

The verified schema has nine IDs, 1–9, including blood donation. The new request refers to sections 6.2–6.9, which is eight labels. No verified mapping was found in the reviewed implementation/schema. All nine existing IDs and labels remain selectable and visible. Do not drop category 1, shift columns, reinterpret past records or assert that ID 2 equals section 6.2 without an authoritative mapping.

## Mission workflow

| Stored/UI state | Thai label | Available behavior |
| --- | --- | --- |
| `draft` | แบบร่าง | Resume incomplete data; no credited hours. Currently demo memory only |
| `submitted` | ส่งแล้ว | Presentation vocabulary for accepted dispatch; not added to the existing real ledger contract |
| `pending` | รอตรวจ | Server/demo has a saved submission awaiting review |
| `approving` | กำลังตรวจสอบยอด | Existing uncertain-write state; stop retrying and reconcile |
| `approved` | อนุมัติแล้ว | Official credit comes only from the authoritative backend; no direct edit/reversal |
| `rejected` | ให้แก้ไข | Read the reason; the demo offers “แก้ไขและส่งใหม่”. Real revision API remains gated |

Mission cards expose category, activity date, hours, description, evidence presence, status, reviewer/update metadata and Mission ID. Missing metadata is labelled, not inferred. Timeline uses actual returned timestamps; it does not invent a review-start time from a submitted time. Demo seed timestamps are explicitly synthetic fixtures.

## Submission and drafts

The native dialog is a bottom sheet on small screens. It preserves category, date, 0.5–24 hours in 0.5 increments, description, evidence and student drawing. Selecting/dropping one file checks size, declared type and PNG/JPEG/PDF signature bytes. Image previews use browser bitmap/canvas facilities when available, cap the preview's longest edge to 1280px without upscaling, and reject decoded images above 24 million pixels. This is a client preview check, not malware scanning or server validation.

The progress bar reports **local preparation**, not an invented Drive upload. PDFs retain a local file link. Temporary object URLs are reclaimed when unreferenced; prior review evidence is retained for the demo history. Images load lazily in details. Real evidence must use an authenticated endpoint and server validation.

Draft text and drawing autosave after a short pause and on close. A draft can be opened from My Missions. Storage is in this page's memory only, explicitly labelled; reload recovery and cross-device drafts need an authenticated backend contract. A corrected rejected item preserves its earlier description/hours/evidence/reason in a prior revision and adds a resubmission timeline entry. Approved missions cannot be edited through that path.

Success is **“ส่งภารกิจความดีเรียบร้อยแล้ว”** plus the stored Mission ID, followed by the visible demo notice. Submission itself never adds official hours.

## Review control

The demo teacher queue filters year, student, category, month, status and search. Selecting several pending records creates a review sequence, not a mass approval. Each record must be inspected, signed and explicitly confirmed. Changing note, decision or signature invalidates the prepared confirmation. A copied/stale confirmation callback cannot act on another record. Rejection requires a reason and does not add hours.

A role selector exists only in the disconnected demonstration. Real staff access requires server identity plus assigned student/cohort scope; there is no backend admin queue enabled by these UI controls.

## Current validation boundary

Source has breakpoints for 360/390/430px, tablet and desktop, keyboard drawing callbacks, reduced motion and native dialog semantics. New rendered layout, dialog focus containment, screen-reader behavior, console status, performance measurements and physical LINE webviews are **not yet verified** because current browser preview access was denied by automatic approval review. Controller doubles and old screenshots do not close those gates. See the test plan.
