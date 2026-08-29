# RTAFNC ONE — Phase 2 Knowledge Registry & Secure Source Adapter

Status: IMPLEMENTED ON INTEGRATION BRANCH ONLY
Branch: `rtafnc-one-integration`
Date: 2026-08-29

## Objective
Convert Library from static demo cards to a source-aware, version-aware and role-aware registry before connecting AGIS/Gemini/MCP.

## Core rule
AI must never decide the authoritative document by filename alone.

Pipeline:

`Source → Registry → Duplicate/Version Review → Audience Gate → Knowledge Chapter → AGIS Retrieval`

## Sources reviewed
1. คู่มือนักเรียนพยาบาลทหารอากาศ ปีการศึกษา 2566 — 138 pages
2. คู่มืออาจารย์ที่ปรึกษา ปีการศึกษา 2566 — 31 pages
3. Private Drive candidate: คู่มืออาจารย์ที่ปรึกษา ฉบับปรับปรุง 2567
4. Private Drive candidate: ระเบียบสวัสดิการ วพอ.พอ. พ.ศ.2568
5. Private Drive duplicate-review set: แบบประเมินคุณลักษณะทางทหารและอัตลักษณ์ นพอ.

## Source-backed chapter map
### Student Handbook 2566
One approved source can create multiple searchable knowledge chapters without duplicating the PDF:
- STUDENT — คู่มือนักเรียน
- GOVERNANCE — การปกครอง/ลงทัณฑ์/คะแนนความประพฤติ
- GOVERNANCE — ระเบียบประจำวัน/การใช้อาคารที่พัก
- WELFARE — สิทธิประโยชน์และสวัสดิการ
- WELFARE — หอพัก
- WELFARE — การซัก/ตากผ้า + บริการซักรีด
- WELFARE — อาหาร/น้ำดื่ม/ไปรษณีย์
- ACTIVITY — กิจกรรมนักศึกษา
- ACTIVITY — กีฬาและชมรม
- MILITARY — แบบธรรมเนียม/วินัย/คุณลักษณะทางทหาร
- LEARNING — หลักสูตรและ Learning index

### Advisor Handbook 2566
- ADVISOR — ระบบและกระบวนการให้คำปรึกษา
- RESTRICTED — การรักษาความลับ
- RESTRICTED — อษ.1–อษ.4
- RESTRICTED — Digital อษ.3 guide
- RESTRICTED — อษ.4 annual summary guide

## Secure source policy
The public/static pilot MUST NOT contain:
- private Google Drive IDs for restricted/internal sources
- health/counseling/personnel records
- signed URLs
- tokens or secrets

Public registry stores only a `secureSourceKey`.
Production flow:

`Library → secureSourceKey → Backend verifies RTAFNC_ID + Role + purpose → Audit → authorized/short-lived source access`

Examples of internal keys:
- `student-handbook-2566`
- `advisor-handbook-2566`
- `advisor-handbook-2567`
- `welfare-regulation-2568`
- `military-traits-assessment`

Actual provider IDs remain server-side only.

## Duplicate policy
- Duplicate discovery does not mean deletion.
- Set `duplicateGroup` and `status=DUPLICATE_REVIEW`.
- A newer modified date does not automatically make a file Master.
- Master promotion requires owner/effective-date confirmation.

## Candidate vs Master
`CANDIDATE_MASTER` can be visible to authorized staff but must be visibly labelled.
AGIS must never silently use a Candidate as if it were the approved Master.

## Access classes
- `PUBLIC` — safe public knowledge only
- `STUDENT` — authenticated nursing students
- `ADVISOR` — authorized advisor context
- `STAFF` — authorized college/governance staff
- `ADMIN` — registry administration; not automatic access to every sensitive case
- `RESTRICTED` — role + assignment + purpose check required

## NotebookLM boundary
NotebookLM may receive curated, non-sensitive approved sources for study/reasoning.
Do not publish:
- individual personnel-sensitive documents
- individual health records
- mental-health records
- counseling records / อษ.1–4 individual data
- individual welfare/financial records

## Phase 2 files
- `rtafnc-one-pilot/knowledge-registry.js`
- `rtafnc-one-pilot/library-search.js`
- `rtafnc-one-pilot/library.html`

## Exit criteria
- [x] Source-aware registry
- [x] Multi-category chapters from a single source
- [x] Role-aware visibility in pilot
- [x] Candidate/Master status shown
- [x] Private Drive identifiers removed from public registry/doc
- [x] Secure-source contract represented
- [x] Source-backed Welfare/Dorm/Laundry/Activity/Military chapters
- [ ] Production secure-source backend endpoint
- [ ] RTAFNC_ID authentication wired to Library role
- [ ] AGIS/MCP retrieval with citations — Phase 3

## Phase 3 target
Expected grounded response contract:

```json
{
  "answer": "...",
  "sources": [
    {"source_id":"...","version":"...","pages":"..."}
  ],
  "confidence":"grounded",
  "action_tools": []
}
```

Phase 3 may summarize only retrieved content the caller is allowed to access. If no approved source supports the answer, AGIS must say so instead of guessing.
