# SOP — ADVISOR / อาจารย์ที่ปรึกษา

## 1. Purpose
จัดการความสัมพันธ์อาจารย์ที่ปรึกษา–นักเรียน การนัดหมาย บันทึกการพบ การติดตาม การส่งต่อ แบบฟอร์ม/รายงาน และ Dashboard เฉพาะผู้รับผิดชอบ โดยให้สิทธิ์จากคำสั่ง/assignment ที่ยืนยันแล้วเท่านั้น

## 2. Assignment authority
Assignment Master ต้องมาจากคำสั่งหรือแหล่งทางการที่ตรวจสอบได้ของปีการศึกษานั้น นักเรียนหนึ่งคนอาจมี PRIMARY/CO_ADVISOR/TEMPORARY ตามแหล่งจริง แต่ระบบห้ามสร้างความสัมพันธ์จากชื่อที่คล้ายกัน ประวัติการคุย ชั้นเรียน นามสกุล หรือตำแหน่งในไฟล์

`teacher` ไม่เท่ากับ `advisor` และชื่ออาจารย์ใน directory ไม่ทำให้มีสิทธิ์เห็นนักเรียนโดยอัตโนมัติ

## 3. Required assignment fields
Academic year, student business key, advisor staff subject key, display label, assignment type/group, effective from/to, status, official source version/reference, approval metadata and audit timestamps. Public code uses placeholder/logical source key only.

## 4. Staff binding
Official assignment by display name is not enough for runtime authorization. Before Dashboard access, each advisor display label must be bound to a verified RTAFNC staff account/subject. Ambiguous or duplicate staff-name match is `PENDING_STAFF_BINDING` and grants zero student scope.

## 5. Authorization rule
Access requires all conditions:
1. authenticated staff subject;
2. role/scope contains Advisor capability;
3. ACTIVE assignment for requested student and current/effective period;
4. requested action is permitted by advisor scope;
5. sensitive sub-domain requires its own additional authorization if applicable.

Admin/governance status alone cannot bypass counselling confidentiality.

## 6. Advisor workflow
`ASSIGNED → APPOINTMENT/CONTACT → MEETING_RECORDED → FOLLOW_UP if needed → REFERRAL if needed → PERIODIC_SUMMARY → YEAR_END/CLOSE`.

Meeting records capture date/time, channel, category/topic at the minimum necessary level, follow-up date, attachments/evidence reference where policy permits and confidentiality classification. Do not copy confidential narrative into general student profile.

## 7. Forms and periodic records
The module may support digital equivalents of official advisor forms, including periodic meeting log and yearly summary where the official manual requires them. Form names/fields must follow the verified manual/source version; do not invent a mandatory field not supported by source.

## 8. Referral
If an issue needs health, counselling, academic, welfare or governance support, create a referral/event with minimum necessary context and explicit destination scope. Advisor does not automatically gain access to the destination module’s detailed case after referral.

## 9. Notifications
Notify student/advisor about appointment or action needed with minimal content. Sensitive conversation summary is never pushed in full to Telegram/LINE. Open authenticated system for details.

## 10. Academic-year rollover
On 1 August preserve all historical assignments and records. Load/verify new official assignment source, compare changes, end prior assignments where appropriate, create new ACTIVE relationships only after verification. Never automatically carry an advisor relationship because it existed last year.

## 11. Audit and rollback
Audit assignment create/change/end, staff binding, appointment changes, meeting record create/update, referral and document export. Assignment correction creates a version/history entry. Rollback restores prior assignment set/pointer; historical counselling records are never deleted during rollback.

## 12. Acceptance tests
- Every advisor-scoped student has an official assignment source.
- Every runtime advisor is bound to a verified staff account.
- Unassigned advisor receives 403/no data.
- Generic teacher/admin cannot bypass assignment rule.
- Student sees only own advisor/contact data allowed by policy.
- Year rollover does not silently copy old assignment.
- Confidential narrative does not leak into notifications/public logs/GitHub.

## 13. Activation gate
Assignment data may be considered verified before staff binding, but Dashboard read/write remains disabled for the advisor until staff account binding passes. Enable by advisor/staff account in controlled batches, not by turning every staff member into Advisor.
