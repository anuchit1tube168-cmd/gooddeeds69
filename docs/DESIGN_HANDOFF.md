# Aviation and warm React design — 2026-09-09

Status: implementation and synthetic walkthrough completed; production integration is not released.
Repository: `anuchit1tube168-cmd/gooddeeds69`, existing draft PR #4.
Remote parent for this continuation: `bcfb46baed4218643198a888cfe37623570ca371`.

## What changed

- Original college crest, Sarabun typography, white/navy/champagne palette, restrained card shadows and a generated aircraft illustration. Desktop and narrow layouts share the existing pilot components.
- React intention/encouragement card: choose helping a friend, caring for shared spaces or sharing knowledge; receive a kind response; continue to the activity form. These actions never create hours, rankings, student records or analytics.
- Synthetic student/reviewer walkthrough: nine categories, half-hour input, date/description validation, temporary image evidence, pending queue, new drawing per review, rejection reason, result tracking and simulated delivery retry. No provider API calls or persisted data.
- Existing authenticated card/list view receives the same design. Official totals still come from the server master, while partial loaded rows remain labelled. Submission/review/evidence integration is still gated.

## Preview without installing software

From the project root, run `node scripts/preview.cjs`. The default host is loopback, port 4173. Open its root login page, then select the clearly labelled sample-data link. The development service serves only explicitly allowlisted assets, never the repository or private directories. `/_preview/mobile` embeds the same page at 360 CSS pixels for layout inspection; it is not a real phone/LIFF test. `/_preview/compare` shows the captured before/after login images together.

Entry files:

| File | Role |
| --- | --- |
| `frontend/secure-pilot/index.html` | Existing gateway/session entry |
| `frontend/gooddeed-ui.js` | Shared presentation and domain labels |
| `frontend/secure-pilot/design.css` | Aviation/soft-depth/responsive design |
| `frontend/secure-pilot/kindness-react.js` | Optional React presentation island |
| `frontend/secure-pilot/demo.html` | Explicit synthetic walkthrough |
| `frontend/secure-pilot/workflow.js` | In-memory model, never a backend adapter |
| `frontend/secure-pilot/demo.js` | Form, evidence preview, signature and demo navigation |

## React provenance

The client-side production UMD distributions are pinned to **18.3.1**, served from this repository, and unchanged. No React Server Components, framework server, npm installation or third-party runtime script URL was added. License: `frontend/secure-pilot/REACT-LICENSE.txt` (MIT).

| File | Download source | SHA-256 |
| --- | --- | --- |
| `react-18.3.1.production.min.js` | https://unpkg.com/react@18.3.1/umd/react.production.min.js | `d949f1c3687aedadcedac85261865f29b17cd273997e7f6b2bfc53b2f9d4c4dd` |
| `react-dom-18.3.1.production.min.js` | https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js | `35f4f974f4b2bcd44da73963347f8952e341f83909e4498227d4e26b98f66f0d` |

The integration follows React's documented support for [partially React pages and root cleanup](https://react.dev/reference/react-dom/client/createRoot) and [local component state](https://react.dev/reference/react/useState). This is a gradual addition to the working pilot, not a conversion of its business logic to a new stack.

## Aircraft asset

`frontend/secure-pilot/airforce-flight.png`: generated with ImageGen for this project; 1774 × 887 pixels. It depicts a generic Air Force-inspired aircraft, not an identified RTAF airframe or official photograph. The existing `510903.jpg` crest is retained unchanged.

Prompt: Premium minimal 3D illustration of one generic Air Force-inspired aircraft in peaceful flight, satin midnight navy with tiny champagne-gold accents, soft ivory-white clouds, aircraft concentrated right, clean left negative space, soft daylight, restrained depth; no specific airframe identity, UI, text, logos, badges, crest, people, or combat.

## Verification and remaining work

See `design-qa.md` at the project root and `docs/design/` screenshots. Local syntax, 88 JavaScript tests and 12 Python boundary tests pass. The optional DOCX dependency `pythainlp` is absent locally; this design change does not test DOCX generation. Provider production testing is not included in these counts.

Runtime blockers remain in `docs/WORK_STATE.md` and `docs/REVIEW_STORAGE_CONTRACT.md`: verified Apps Script/Cloudflare deployment identity and configuration, scoped review/signature proof, official policy/academic periods, private evidence storage, durable journal/outbox, credential rotation and backup/restore proof. Keep the existing LIFF endpoints and all write flags unchanged until those checks pass.

## เงื่อนไขบังคับของระบบ (Non-negotiable Conditions)

Preserve existing records, approved/carry-forward hours, signatures and LINE bindings. Clean means archive, not delete. Student Master remains canonical, LINE/LIFF verification and assigned scope remain server-side, and health/evidence data remains private. Google Drive/Sheets through Apps Script stores authoritative business data. GitHub contains code, synthetic examples and non-personal design assets. A reversible reviewed release and controlled staging evidence must precede production cutover.
