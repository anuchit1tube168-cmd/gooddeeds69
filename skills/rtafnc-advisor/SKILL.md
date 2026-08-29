# RTAFNC Advisor System Skill

## Purpose
ใช้สกิลนี้เมื่อออกแบบ/พัฒนา/ตรวจระบบอาจารย์ที่ปรึกษา วิทยาลัยพยาบาลทหารอากาศ (RTAFNC ONE) โดยยึดคู่มืออาจารย์ที่ปรึกษา ปีการศึกษา 2566 เป็น baseline และไม่ทำลายระบบ Production เดิม

## Core principle
One student identity → one advisor assignment history → one consultation timeline → one annual development summary.

## Source-backed backbone
- อษ.1 ทะเบียนประวัตินักเรียนพยาบาล: ข้อมูลพื้นฐานและครอบครัว ใช้เพื่อรู้จักผู้เรียนและอัปเดตตามระยะ
- อษ.2 ระเบียนสะสม: ผลการศึกษา ทุน/รางวัล กิจกรรม บทบาท และพัฒนาการตามปีการศึกษา
- อษ.3 บันทึกการพบ: บันทึกรายบุคคล ทั้งการพบเป็นทางการ/ไม่เป็นทางการหรือเหตุที่ควรบันทึก และควรมีอย่างน้อยเดือนละ 1 ครั้ง
- อษ.4 สรุปผลพัฒนาการ: สรุปภาพรวมอย่างน้อยปีละ 1 ครั้ง

## Primary consultation domains
คู่มือกำหนดหัวข้อหลัก 4 กลุ่ม:
1. การศึกษา/การเรียนการสอน
2. เรื่องส่วนตัว
3. เรื่องสังคม
4. งานอาชีพ/อนาคต

Operational subcategories ที่ระบบใช้เพื่อค้นหา/รายงานได้ละเอียดขึ้น โดย map กลับเข้าหมวดหลักเสมอ:
- Academic / Learning
- Personal / Family
- Social / Peer / Adjustment
- Career / Professional goal
- Health / Physical
- Emotional / Mental well-being
- Financial / Scholarship
- Discipline / Conduct
- Military/social adjustment
- Activities / Leadership
- Other

## Standard workflow
1. Student opens Advisor LIFF.
2. Resolve RTAFNC_ID and active advisor assignment.
3. Student requests meeting or advisor creates meeting record.
4. Select purpose/topic, urgency and preferred channel/time.
5. Advisor receives Telegram primary alert with secure link.
6. Advisor accepts/reschedules/refers.
7. Meeting occurs: onsite / phone / secure chat / video / other approved channel.
8. Advisor completes digital อษ.3:
   - date/time
   - formal/informal
   - topic/domain
   - concise facts / student concern
   - advisor observation
   - guidance/counseling provided
   - what student gained/understood
   - agreed action plan
   - follow-up date
   - referral if needed
9. Student may receive a non-sensitive meeting summary and next action.
10. Follow-up task closes or escalates.
11. At academic-year summary, generate digital อษ.4 from verified data + advisor narrative.
12. Export authorized reports to PDF/Word and archive privately in Drive.

## Counseling method checklist
During a consultation, guide the advisor through:
- Build rapport / safe atmosphere
- Listening and observation
- Leading / clarification
- Reflection
- Summarization
- Informing
- Encouragement
- Suggestion while preserving student decision-making
- Referral when beyond advisor scope

## Minimum record rules
- Do not force advisor to write detailed sensitive notes while the student is watching.
- อษ.3 target: at least 1 individual record/student/month when applicable per handbook baseline.
- อษ.4 target: at least 1 annual summary/student/academic year.
- Every record has academic_year, student_id, advisor_id, timestamp, source, version, status and audit metadata.

## Confidentiality & access
- Consultation notes are confidential by default.
- Student sees only student-safe summary, not internal advisor notes unless policy explicitly permits.
- Advisor sees assigned students within assignment dates.
- Head/governance roles see only authorized scope.
- General admin/IT role does NOT automatically grant access to sensitive counseling notes.
- Reports containing confidential information should prefer student code over full name unless the recipient is authorized and a name is required.
- Never put detailed health/mental-health/disciplinary content in Telegram or LINE lock-screen notifications; send case ID + urgency + secure link.
- All access/download/export actions must be audit logged.

## Assignment model
AdvisorAssignment:
- assignment_id
- student_id
- advisor_id
- academic_year
- start_at
- end_at
- status
- assigned_by
- note

Support reassignment without overwriting history.
Baseline planning ratio from handbook: advisor should normally have no more than 1:8 students where applicable.

## Data model
StudentProfile (prefill from RTAFNC Master)
AdvisorAssignment
ConsultationRequest
ConsultationSession
ConsultationTopic
ConsultationOutcome
FollowUpTask
Referral
AdvisorNotePrivate
StudentSummarySafe
AnnualDevelopmentSummary (อษ.4)
AdvisorAvailability
NotificationEvent
ConsentPrivacyReceipt
AuditLog

## Prefill sources
Reuse verified existing data instead of retyping:
- student name / code / cohort / year / photo
- advisor assignment
- GPAX / academic progress
- scholarship history
- good-deed / volunteer-hour summaries
- health case status only where purpose/role permits; do not expose clinical detail by default
- activities / awards / leadership roles
- conduct data only for authorized workflow

## Reporting requirements
Filters:
- academic year
- semester
- advisor
- cohort/year
- student
- topic/domain
- session status
- referral/follow-up status

Core metrics:
- number of assigned students per advisor
- number of students who met advisor
- total consultations
- consultations per student
- consultations per advisor
- monthly trend
- topic distribution
- formal vs informal encounters
- follow-ups due/completed/overdue
- referrals by destination category
- annual อษ.4 completion rate

Do not rank advisors by raw consultation counts alone. Counts are operational evidence, not a quality score.

## Outputs
1. Student LIFF: advisor card, request appointment, history-safe summary, next actions.
2. Advisor LIFF: group dashboard, student list, pending requests, meeting form, follow-up queue, annual summary.
3. Admin: assignment management, academic year rollover, report center, template/version control.
4. Telegram: primary operational notification + secure deep link.
5. LINE: urgent/special notification only according to RTAFNC notification policy.
6. Word/PDF: digital อษ.1–อษ.4 and management reports.

## Link pattern
Never place sensitive data in query strings.
Use opaque short-lived tokens, e.g.
`/advisor.html?task=ADV-<opaque-token>`
Backend resolves task → verifies identity/role/purpose → returns authorized data.

## Year rollover
At start of academic year:
- create AcademicYear config
- roll student year level
- keep prior advisor assignment history
- allow admin to continue/change assignments
- reset annual report counters while preserving historical sessions
- create annual อษ.4 task per active student

## Definition of done
A module is not complete until:
- student can request/see safe status
- advisor can receive link and record session
- follow-up/referral works
- admin can assign/reassign advisor
- yearly/monthly report works
- Word/PDF export works
- access controls and audit are tested
- sensitive notification redaction is tested
- no real student data is committed to public GitHub
