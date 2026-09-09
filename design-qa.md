# Design QA — 2026-09-09

Scope: requested aviation redesign and warm React experience in the existing Good Deed pilot. This is a redesign, not a pixel-exact clone of the old page. Provider authentication, persistence and notification deployment are outside this local design verdict.

## Source and rendered evidence

- Original source capture: `docs/design/before-login.jpg`, 1363 × 936 pixels, unauthenticated/unconfigured pilot.
- Redesign source direction: user's navy/white/gold, original college crest, minimal Air Force aircraft, slight 3D depth and warmth; existing `styles.css` tokens and `510903.jpg`; generated source asset `frontend/secure-pilot/airforce-flight.png`.
- Same-state implementation: `docs/design/after-login.jpg`, 1363 × 936 pixels, same unauthenticated/unconfigured state.
- Combined comparison input: `docs/design/comparison.jpg`, 1363 × 936. The dev comparison page renders both original captures at the same proportional scale side by side. No source image was replaced by code-drawn art.
- Full dashboard: `docs/design/after-dashboard.jpg`, 1363 × 1569, synthetic student with intention selected. Browser viewport 1363 × 936; captured from scroll position zero so the sticky header does not obscure metrics.
- Narrow dashboard: `docs/design/mobile-dashboard.jpg`, 360 × 800 content capture. The preview iframe is 360 CSS pixels wide; available document width is 345 after the desktop scrollbar. `scrollWidth === clientWidth === 345`.
- Narrow form: `docs/design/mobile-form.jpg`, 1363 × 936 outer capture with the same 360 × 800 iframe. This is a responsive desktop-browser iframe, not device emulation or a physical LINE webview.
- No density scaling was applied to source/implementation captures. Native browser pixels and the stated CSS dimensions are retained. The comparison board alone scales both desktop images equally.

## Comparison history and fixes

1. Initial browser walkthrough exposed a broken form on ordinary HTTP preview (`crypto.randomUUID` unavailable). Replaced the demo-only request identity with an in-memory sequence. Reopened the form, rejected incomplete input, selected generated PNG evidence and submitted successfully. This identity is never used for authentication or the backend.
2. Found stale gateway controls inside guide/submission views, and replacement evidence retaining a previous file after an invalid selection. Removed unrelated controls from those views and clear the previous draft file before validating a replacement.
3. Initial narrow form capture placed its heading behind the sticky header, and the half-hour help looked like a red error. Added scroll margin to the view, separated neutral help from error text, and refreshed. `mobile-form.jpg` shows the heading and neutral hint after the fix. Corrected field errors now clear when the input is corrected.
4. Latest React pass added warm intention choices and encouragement with pressed state, small depth transforms, keyboard operation and no hour changes. The wide layout places this beside the ledger; the narrow layout places it after the ledger.

The combined full-view comparison was opened and assessed alongside focused native captures of the form, dashboard, signatures and React card. The compact comparison alone was not used to judge small Thai text.

## Required fidelity surfaces

| Surface | Evidence and assessment |
| --- | --- |
| Typography | Sarabun loaded successfully in the browser; clear Thai headings, 16px form inputs, readable wrapped activity text. Original crest text remains intact. Small secondary copy remains a possible future refinement on physical devices. |
| Spacing/layout | 1172px content region within the desktop viewport, consistent card padding/gaps, 4→2 metric columns, one-column narrow forms. Corrected scroll anchoring keeps the form title below the header. No observed horizontal document overflow at the inspected width. |
| Colors/tokens | Navy primary actions, warm paper/cream, restrained gold and green/red/amber status treatments. Intention cards distinguish selection through both pressed state and color. |
| Images | Original crest preserved; actual generated raster aircraft loaded. The login/mobile decorative crop is intentional; no factual airframe identity is claimed. No CSS/SVG substitute for representational art. |
| Copy/content | Student-friendly guidance and encouragement; visible synthetic mode; official totals retain provenance; no fake real delivery or production approval claims. Intention reactions are explicitly not certified hours. |
| Accessibility | Semantic labels, error descriptions/live feedback, keyboard-visible focus, 44px+ primary controls and reduced-motion rules. Drawing uses pointer input; assistive alternatives and physical-device accessibility remain production UAT work. |

## Browser interactions observed

- Empty form: field errors, first invalid field focused.
- Submit: valid category/date/2.5 hours/description, generated non-personal PNG selected through the chooser, explicit confirmation; a new pending record appeared and total stayed 15.5.
- Review: empty drawing rejected; synthetic pointer gesture accepted; approval changed total to 18 exactly once. Rejection without a reason was rejected; supplied reason completed rejection with total still 18.
- Delivery: simulated failure followed by simulated retry success; approved total remained 18. No real message was sent.
- React: keyboard Enter selected an intention; encouragement toggled; CTA opened the form; total stayed 15.5 in the reset synthetic session.
- Narrow layout: dashboard/form rendered without horizontal overflow; form heading visible after scroll-margin fix. The React card rendered in the narrow document, but its extra touch/scroll interaction could not be conclusively exercised because the browser automation timed out. Desktop React actions passed; physical-phone interaction remains an explicit gap.
- Console: no application-origin errors after the HTTP-form fix and React integration. Browser-extension metadata warnings and occasional automation protocol timeouts are recorded as tool-environment issues, not hidden as app test passes.

## Remaining limits

No real LINE account, provider session, teacher scope, Google Drive persistence, Telegram delivery or production cutover was tested by this walkthrough. The source integration remains gated. A physical Android/iOS LINE webview and assistive signature alternative need controlled staging UAT. These are not claimed by the local visual result.

No actionable P0/P1/P2 visual issues remain in the inspected local states. P3: refine decorative mobile aircraft cropping and small helper text after physical-device feedback.

final result: passed
