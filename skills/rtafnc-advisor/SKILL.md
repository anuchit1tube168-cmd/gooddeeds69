# RTAFNC Advisor System Skill

## Purpose
Use this skill to design, build, operate or audit the RTAFNC ONE advisor module. It covers official advisor assignment, appointment/contact, digital advisor records, follow-up/referral, annual summary, reports and advisor-scoped authorization.

The public skill contains workflow/schema only. Real student IDs, advisor names, assignment rows and confidential notes stay in private Drive/backend.

## Hard authorization rules
- Never infer advisor relationship.
- `teacher` is not automatically `advisor`.
- A name in the staff directory does not grant student scope.
- Runtime access requires a verified staff account bound to an ACTIVE official assignment for the target student and effective period.
- Generic admin/governance/IT role does not automatically grant confidential counselling access.
- Name-only staff matching is review-only; ambiguous binding grants zero scope.

## Assignment authority
Priority:
1. Official order/verified assignment source for the academic year.
2. Private assignment staging derived from that source.
3. Historical assignments for read-only history.

Do not create an assignment from class, surname, past consultation, file position, advisor preference or last-year relationship.

## Assignment contract
```text
assignment_id
academic_year
student_id: <student_id_7_digits>
advisor_staff_key: <verified_private_staff_subject>
advisor_display_label: <private>
assignment_type: PRIMARY|CO_ADVISOR|TEMPORARY
assignment_group: <optional>
effective_from
effective_to
status: ACTIVE|ENDED|PENDING_REVIEW
source_version
approved_at
created_at
updated_at
```

Staff display labels may be stored privately before account binding, but must not authorize access until `advisor_staff_key` is verified.

## Source-backed advisor record backbone
When the verified advisor handbook/manual for the applicable version requires them, support digital equivalents of:
- อษ.1 student background/profile for advisor purpose;
- อษ.2 cumulative/advisor development record;
- อษ.3 individual meeting/contact record, including periodic recording expectations defined by the source handbook;
- อษ.4 annual development summary.

Do not silently invent mandatory fields beyond the verified source version.

## Consultation domains
Primary domains may include academic/learning, personal, social and career/professional development according to the verified advisor source. Operational subcategories may be used for search/reporting only when mapped back to an approved primary domain.

## Standard workflow
1. Authenticate RTAFNC ONE subject.
2. Resolve current student/advisor relationship from private assignment registry.
3. Student requests meeting or advisor records an authorized contact.
4. Record purpose, urgency and preferred channel/time at minimum necessary detail.
5. Send minimal operational notification with secure link.
6. Advisor accepts/reschedules/refers.
7. Meeting occurs through approved channel.
8. Advisor records facts/guidance/action/follow-up in confidential advisor scope.
9. Student receives only student-safe summary where policy allows.
10. Follow-up closes or referral opens destination workflow.
11. Generate annual summary from verified records + authorized advisor narrative.
12. Export authorized Word/PDF privately where required.

## Counselling method assistance
The UI/AI may prompt the advisor for rapport, listening/observation, clarification, reflection, summarization, information, encouragement, suggestion that preserves student decision-making, and referral when beyond advisor scope. This is decision support, not autonomous clinical/disciplinary judgment.

## Confidentiality
- Advisor private notes are confidential by default.
- Student-safe summary is a separate projection, not the same field as private notes.
- Health/mental-health/discipline detail must not be copied into advisor notifications or general student profile.
- Cross-domain referral passes minimum necessary context; referral does not automatically grant destination-record access.
- Audit access/download/export of confidential records.

## Link/deep-link rule
Never put student ID, diagnosis, counselling detail or sensitive case content in URL query strings. Use opaque, short-lived task/case tokens. Backend resolves token → verifies session → verifies role + active assignment + purpose/scope → returns authorized data.

## Reports
Authorized reports may include assigned student count, students contacted, consultation count, follow-up due/completed, referral status, topic distribution, monthly trend and annual-form completion. Do not use raw consultation count alone as advisor quality ranking.

## Academic-year rollover
At 1 August:
1. Snapshot current assignments and records.
2. Load the new verified roster; never blindly increment student year level.
3. Load/verify new official advisor source.
4. Compare continued/changed/ended assignments.
5. End or retain historical assignment records without overwrite.
6. Activate only verified new-year relationships.
7. Create annual tasks only after the new assignment set is accepted.

Never carry an advisor relationship into the new year solely because it existed last year.

## Audit and rollback
Audit assignment import/change/end, staff binding, appointment changes, confidential record writes, referral and exports. Assignment corrections are versioned. Rollback restores the prior active assignment set/pointer; it never deletes historical counselling records.

## Failure behavior
Fail closed with explicit states such as `ASSIGNMENT_NOT_VERIFIED`, `STAFF_BINDING_REQUIRED`, `NOT_ASSIGNED`, `SCOPE_DENIED`, `CONFIDENTIAL_SCOPE_REQUIRED`, `SOURCE_VERSION_REQUIRED`. Never show another student as fallback.

## Definition of done
- Official assignment source is verified for the academic year.
- Every runtime advisor has a verified staff account binding.
- Assigned-student access passes and unassigned access fails.
- Student sees only own safe projection.
- Follow-up/referral works without permission leakage.
- Official form/report workflow uses verified source version.
- Academic-year rollover preserves history and does not auto-copy relationships.
- Audit/rollback tested.
- Notifications are redacted/minimal.
- No real student/advisor data is committed to public GitHub.

## Activation gate
Assignment records can be verified before runtime access, but advisor Dashboard read/write stays disabled until staff binding and scope tests pass. Activate advisors in controlled batches; never grant Advisor role to all teachers automatically.
