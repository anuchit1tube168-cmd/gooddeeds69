const BASE_CAPABILITIES=Object.freeze({
  EXECUTIVE:['dashboard.executive','reports.aggregate','gooddeed.summary','advisor.summary','teaching.summary','health.aggregate','operations.summary'],
  GOVERNANCE:['dashboard.governance','gooddeed.review','gooddeed.approve','advisor.assignments.manage','apparel.manage','borrowing.manage','supplies.manage','scholarship.workflow','reports.governance'],
  FACULTY:['dashboard.faculty','teaching.own','evaluation.own','gooddeed.read_relevant'],
  SUPPLY_SUPPORT:['dashboard.supply','apparel.operate_assigned','borrowing.operate_assigned','supplies.operate','assets.operate_assigned','reports.module'],
  EDU_IT_SUPPORT:['dashboard.support','teaching.process_support','documents.process_support','identity.account_support_no_sensitive','reports.module'],
  SUPPORT:['dashboard.support','module.assigned_only','reports.own_module'],
  HEALTH_AUTHORIZED:['dashboard.health','health.clinical_authorized','health.medication_stock_assigned','health.reports_authorized']
});
const ADDITIVE_CAPABILITIES=Object.freeze({
  ADVISOR_ADDITIVE:['advisor.assigned_students','advisor.meeting','advisor.private_notes','advisor.followup','scholarship.comment_assigned','gooddeed.approved_hours_assigned','health.safe_referral_summary_assigned'],
  APPROVER_ADDITIVE:['workflow.approve_assigned'],
  MODULE_OPERATOR_ADDITIVE:['module.operate_assigned']
});
const ALLOWED_BASE=new Set(Object.keys(BASE_CAPABILITIES));
const ALLOWED_ADDITIVE=new Set(Object.keys(ADDITIVE_CAPABILITIES));
function clean(v,max=200){return String(v??'').trim().slice(0,max)}
function arr(v){return Array.isArray(v)?v:[]}
function safeBinding(raw){
  if(!raw||raw.binding_status!=='VERIFIED') return null;
  const base_role=clean(raw.base_role,60);
  if(!ALLOWED_BASE.has(base_role)) return null;
  const additive_roles=arr(raw.additive_roles).map(x=>clean(x,60)).filter(x=>ALLOWED_ADDITIVE.has(x));
  const module_assignments=arr(raw.module_assignments).map(x=>clean(x,60)).filter(x=>/^[A-Z0-9_]{2,60}$/.test(x));
  return {
    staff_directory_key:clean(raw.staff_directory_key,120),
    display_name:clean(raw.display_name,160),
    member_id:clean(raw.member_id,120),
    line_user_id:clean(raw.line_user_id,160),
    telegram_chat_id:clean(raw.telegram_chat_id,80),
    base_role,
    additive_roles:[...new Set(additive_roles)],
    module_assignments:[...new Set(module_assignments)],
    academic_year:Number(raw.academic_year)||null,
    binding_status:'VERIFIED'
  };
}
export function parseVerifiedBindings(env){
  if(!env.STAFF_BINDINGS_JSON) return [];
  let parsed; try{parsed=JSON.parse(env.STAFF_BINDINGS_JSON)}catch(_){return []}
  if(!Array.isArray(parsed)) return [];
  return parsed.map(safeBinding).filter(Boolean);
}
export function resolveStaffBinding(auth,env){
  const memberId=clean(auth&&auth.member_id,120);
  const lineUserId=clean(auth&&auth.line_user_id,160);
  if(!memberId&&!lineUserId) return {ok:false,status:'PENDING_STAFF_BINDING',reason:'NO_VERIFIED_ACCOUNT_IDENTIFIER'};
  const bindings=parseVerifiedBindings(env);
  const exact=bindings.filter(b=>(memberId&&b.member_id===memberId)||(lineUserId&&b.line_user_id===lineUserId));
  if(exact.length===0) return {ok:false,status:'PENDING_STAFF_BINDING',reason:'NO_EXACT_VERIFIED_BINDING'};
  if(exact.length>1) return {ok:false,status:'BINDING_CONFLICT',reason:'MULTIPLE_VERIFIED_BINDINGS'};
  const b=exact[0], caps=new Set(BASE_CAPABILITIES[b.base_role]||[]);
  for(const role of b.additive_roles) for(const c of (ADDITIVE_CAPABILITIES[role]||[])) caps.add(c);
  for(const m of b.module_assignments) caps.add(`module.${m}.assigned`);
  return {ok:true,status:'VERIFIED',staff:{...b,capabilities:[...caps].sort()}};
}
