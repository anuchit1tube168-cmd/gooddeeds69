# RTAFNC ONE · HEALTH 69

หน้ากากใหม่ของระบบเวชระเบียน 69 โดย **ไม่เปลี่ยนฐานข้อมูลเดิม** และใช้ Design System เดียวกับระบบบันทึกความดี (navy/gold, card/action feed, mobile-first).

## Existing Google Drive / Sheets model kept as-is
- Users / Sessions
- ServiceRecipients
- Visits
- Vitals
- Assessments
- Treatments
- Medicines / Dispensing / InventoryTransactions
- ContactNotifications
- Referrals
- FollowUps
- Attachments (Drive file metadata)
- Settings
- AuditLogs

## Existing Apps Script functions to preserve
- `getDashboardStats()`
- `getRecipients(searchQuery)`
- `getRecipientHistory(recipientId)`
- `saveMedicalRequest(formData)`
- `getRequests()`
- `updateRequestStatus(requestId,status,notes)`
- `saveNewVisit(visitData)`

## Target architecture

```text
LINE LIFF / browser
       ↓
Cloudflare Pages (this UI)
       ↓
Cloudflare Worker / API Gateway
       ↓  signed server-to-server request
Google Apps Script API Adapter
       ↓
Existing Medical69 functions
       ↓
Google Sheets + Google Drive
```

### Why an adapter is required
The old frontend uses `google.script.run`. That API exists only when the page itself is served by Apps Script HTML Service. A page hosted on Cloudflare cannot call `google.script.run` directly.

Do **not** expose the Apps Script Medical69 functions as an unauthenticated public endpoint. Health records are sensitive data.

## Security gates before real data is enabled
1. RTAFNC_ID session verified at Worker.
2. Role: `student_self`, `medical_authorized`, or specifically scoped staff role.
3. Student may read only own permitted record.
4. General Good Deed admins do not automatically receive medical access.
5. Every read/write writes an AuditLogs event.
6. Telegram/LINE alerts contain only privacy-safe summaries; sensitive details remain behind authenticated LIFF.
7. Google Drive attachments remain private; never publish direct public links.

## Deployment plan
- Demo UI can be published immediately.
- Real Medical69 API integration is enabled only after identity/RBAC and the Worker→Apps Script signed adapter are connected.
- Keep current Apps Script production deployment online during pilot; no cutover until test passes.
