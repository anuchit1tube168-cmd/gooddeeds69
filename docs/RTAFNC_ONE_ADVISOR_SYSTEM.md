# RTAFNC ONE — Advisor & Counseling System

## Goal
ระบบอาจารย์ที่ปรึกษาสำหรับนักเรียนพยาบาลทหารอากาศที่ทำงานแบบรายบุคคลและรายกลุ่ม ตั้งแต่การขอเข้าพบ การนัดหมาย การบันทึก อษ.3 การติดตาม/ส่งต่อ ไปจนถึงสรุปพัฒนาการ อษ.4 และรายงานตามปีการศึกษา

## Source baseline
คู่มืออาจารย์ที่ปรึกษา ปีการศึกษา 2566 เป็น policy/SOP baseline. ถ้าข้อกำหนดภายหลังมีฉบับใหม่กว่า ให้ version เอกสารและ migration rule แทนการเขียนทับประวัติ

## Main user journeys

### Student
1. เปิด RTAFNC ONE > อาจารย์ที่ปรึกษา
2. เห็นอาจารย์ที่ปรึกษาปัจจุบัน / ช่องทาง / Office hour
3. กด “ขอเข้าพบ”
4. เลือกหัวข้อหลัก: การศึกษา / ส่วนตัว / สังคม / อาชีพ
5. เลือก subcategory, ความเร่งด่วน, วันเวลาที่สะดวก, ช่องทาง
6. พิมพ์ข้อความสั้น ๆ โดยไม่บังคับให้เปิดเผยรายละเอียดอ่อนไหวก่อนพบ
7. ส่งคำขอ
8. ระบบแจ้ง Telegram ให้อาจารย์พร้อม secure link
9. นักเรียนเห็นสถานะ: ส่งแล้ว / นัดแล้ว / พบแล้ว / ติดตาม / ปิดเรื่อง
10. หลังพบ นักเรียนเห็น “สิ่งที่ได้จากการเข้าพบ/สิ่งที่ตกลงร่วมกัน/นัดครั้งถัดไป” ในเวอร์ชันที่ปลอดภัย

### Advisor
1. เปิด secure link จาก Telegram หรือ Advisor LIFF
2. ยืนยันตัวตนและสิทธิ์
3. ดูคำขอเฉพาะนักเรียนในกลุ่มตน
4. รับนัด / เปลี่ยนเวลา / ส่งต่อ
5. หลังพบ บันทึก digital อษ.3
6. ระบุ outcome และ follow-up
7. ถ้าเกินขอบเขต ส่งต่อผู้เชี่ยวชาญและสร้าง Referral task
8. สิ้นปี สรุป อษ.4 โดยระบบ prefill ข้อมูลที่ตรวจสอบแล้ว

### Mother Admin / Governance Admin
- จัดอาจารย์ที่ปรึกษาให้กลุ่มนักเรียน
- เปลี่ยน/ต่ออายุ assignment โดยเก็บ history
- ตั้งปีการศึกษา/ภาคเรียน
- ตรวจ completeness ไม่จำเป็นต้องอ่าน note ลับทุก record
- ดูรายงาน operational ตาม scope
- ส่ง link/reminder ให้อาจารย์
- เปิด/ปิด template version
- export management report PDF/Word/CSV ตามสิทธิ์

## SOP flow
Student need → receive request → match advisor/expert → acknowledge/schedule → counseling → document อษ.3 → report/plan → follow-up/referral → close → annual อษ.4.

Time targets from handbook workflow baseline:
- รับแจ้ง: daily operation
- ส่งเรื่องให้ผู้เชี่ยวชาญ/อาจารย์ที่เหมาะสม: approximately 15 minutes in the documented workflow
- แจ้งตอบรับ/นัด: within 2 working days
- หารายละเอียด/ข้อเท็จจริงเบื้องต้นและแนวทาง: within 3 working days
- รายงานผล/แนวทางต่อผู้เกี่ยวข้อง: within 3 working days
These are configurable SLA values in the system, not hard-coded forever.

## Topics and outcome taxonomy
### Core topic
EDUCATION
PERSONAL
SOCIAL
CAREER

### Operational subcategory
learning_method, grade_progress, clinical_learning, finance_scholarship, family, peer_relation, adaptation, discipline, physical_health, emotional_wellbeing, career_goal, professional_identity, activity_leadership, other

### Session outcome
INFORMATION_GIVEN
GUIDANCE
COUNSELING
ACTION_PLAN
FOLLOW_UP
REFERRAL
RESOLVED
MONITOR

## Digital อษ.3 fields
- consultation_id
- sequence_no (ครั้งที่)
- student_id
- advisor_id
- academic_year / semester
- date / start_time / end_time
- encounter_type: formal / informal / event-triggered
- channel
- core_topic
- subcategory
- student_stated_need (restricted)
- key_facts (restricted)
- advisor_observation (private/restricted)
- techniques_used: listening / leading / reflection / summary / informing / encouragement / suggestion
- guidance_given
- student_safe_takeaway
- action_plan
- follow_up_required
- follow_up_at
- referral_required
- referral_category
- status
- privacy_level
- version / created_at / updated_at / audit

## Digital อษ.4 fields
Prefill from verified data + advisor narrative:
- knowledge / academic development
- teamwork
- systematic/effective work
- emotional maturity
- creativity/initiative
- professional attitude
- public-mindedness/sacrifice
- discipline/responsibility
- works/awards table
- special strengths
- additional comments
- advisor signature transaction
- academic year

## Report Center
### Per advisor / academic year
- assigned_students
- students_seen
- total_sessions
- average_sessions_per_seen_student
- sessions_by_month
- sessions_by_topic
- followups_due/completed/overdue
- referrals_count
- annual_summary_completed

### Per advisor group
- student list
- last contact date
- sessions this academic year
- main topic categories (authorized aggregate)
- next follow-up
- annual summary status

### Per student
- consultation timeline
- session count by academic year
- safe summary of outcomes
- follow-up history
- referral status
- annual development summaries

### Management aggregate
- academic-year totals
- advisor coverage
- percent students seen
- month distribution
- topic distribution
- overdue follow-up
- อษ.4 completion
Use de-identified/aggregated view by default.

## Link & notification model
Telegram = primary operational channel.
Message example:
“มีคำขอเข้าพบอาจารย์ที่ปรึกษาใหม่ • รหัสงาน ADV-xxxx • ระดับปกติ • [เปิดรายการ]”
No problem detail in notification body.

Secure link:
`https://<RTAFNC-APP>/advisor.html?task=<opaque>`
Token is short-lived and cannot itself grant access; user must pass identity + role check.

## Privacy rules
- อษ.1–อษ.4 and counseling notes are private student records.
- Internal note ≠ student-visible summary.
- Admin role ≠ automatic counseling-content access.
- When management report needs sensitive case counts, use aggregate/ID-first presentation.
- Every view/export is logged.

## Data reuse / prefill
Pull from shared RTAFNC Master by student ID:
- profile/address/family from Student Profile/อษ.1
- academic GPA/GPAX
- scholarship history
- good deed/volunteer hours
- activity/award/leadership
- current advisor assignment
- health/mental-health only through purpose-specific adapter and authorized role

## Academic-year rollover
A year can be changed by authorized admin without destroying old records. All sessions carry academic_year. Reports default to current year but can select prior years at any time.

## Pilot safety
- Demo data only on public GitHub.
- No real counseling content in public static pages.
- Production write/API must remain disabled until identity, private storage and authorization are verified.
