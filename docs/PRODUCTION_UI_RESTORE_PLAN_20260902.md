# Production UI Restore Plan — 2026-09-02

Owner instruction: make the current Good Deed LIFF usable in the familiar/original style while preserving the existing LIFF ID and working production endpoint.

Rules:
- Existing LIFF ID remains `2010948179-Ympqt2bT`.
- Do not change LINE Developers endpoint in this patch.
- Preserve Secure Pilot backend actions and Apps Script endpoint.
- Restore familiar dashboard experience: official crest, member card, chibi level, hours, pending/approved metrics, 9 official categories, submit/history/review flows.
- Do not restore public student roster/photos/secrets/browser tokens.
- Student submit form must not allow a student to change the authenticated student ID.
- Keep rollback path before production edit.
