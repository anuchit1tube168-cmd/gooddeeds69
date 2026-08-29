export const BASE_ROLES = Object.freeze({
  EXECUTIVE: 'EXECUTIVE',
  GOVERNANCE: 'GOVERNANCE',
  FACULTY: 'FACULTY',
  SUPPLY_SUPPORT: 'SUPPLY_SUPPORT',
  EDU_IT_SUPPORT: 'EDU_IT_SUPPORT',
  SUPPORT: 'SUPPORT',
  HEALTH_AUTHORIZED: 'HEALTH_AUTHORIZED'
});

export const ADDITIVE_ROLES = Object.freeze({
  ADVISOR: 'ADVISOR_ADDITIVE',
  APPROVER: 'APPROVER_ADDITIVE',
  MODULE_OPERATOR: 'MODULE_OPERATOR_ADDITIVE'
});

const BASE_CAPABILITIES = Object.freeze({
  EXECUTIVE: ['dashboard.executive','reports.aggregate','gooddeed.summary','advisor.summary','teaching.summary','health.aggregate','operations.summary'],
  GOVERNANCE: ['dashboard.governance','gooddeed.review','gooddeed.approve','advisor.assignments.manage','apparel.manage','borrowing.manage','supplies.manage','scholarship.workflow','reports.governance'],
  FACULTY: ['dashboard.faculty','teaching.own','evaluation.own','gooddeed.read_relevant'],
  SUPPLY_SUPPORT: ['dashboard.supply','apparel.operate_assigned','borrowing.operate_assigned','supplies.operate','assets.operate_assigned','reports.module'],
  EDU_IT_SUPPORT: ['dashboard.support','teaching.process_support','documents.process_support','identity.account_support_no_sensitive','reports.module'],
  SUPPORT: ['dashboard.support','module.assigned_only','reports.own_module'],
  HEALTH_AUTHORIZED: ['dashboard.health','health.clinical_authorized','health.medication_stock_assigned','health.reports_authorized']
});

const ADDITIVE_CAPABILITIES = Object.freeze({
  ADVISOR_ADDITIVE: ['advisor.assigned_students','advisor.meeting','advisor.private_notes','advisor.followup','scholarship.comment_assigned','gooddeed.approved_hours_assigned','health.safe_referral_summary_assigned'],
  APPROVER_ADDITIVE: ['workflow.approve_assigned'],
  MODULE_OPERATOR_ADDITIVE: ['module.operate_assigned']
});

export function resolveStaffAccess({baseRole='SUPPORT', additiveRoles=[], moduleAssignments=[]}={}) {
  const capabilities = new Set(BASE_CAPABILITIES[baseRole] || BASE_CAPABILITIES.SUPPORT);
  for (const role of additiveRoles) for (const cap of (ADDITIVE_CAPABILITIES[role] || [])) capabilities.add(cap);
  for (const moduleKey of moduleAssignments) capabilities.add(`module.${moduleKey}.assigned`);
  return Object.freeze({baseRole, additiveRoles:[...additiveRoles], moduleAssignments:[...moduleAssignments], capabilities:[...capabilities].sort()});
}

export function can(access, capability) {
  return Boolean(access && Array.isArray(access.capabilities) && access.capabilities.includes(capability));
}

// Privacy hard-stop: technical/admin roles do not inherit clinical or counselling detail by default.
export const SENSITIVE_CAPABILITIES = Object.freeze(['health.clinical_authorized','advisor.private_notes']);
