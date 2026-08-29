function clean(v,max=200){return String(v??'').trim().slice(0,max)}

export async function resolveAdvisorAssignments(staff,env){
  if(!staff||!Array.isArray(staff.additive_roles)||!staff.additive_roles.includes('ADVISOR_ADDITIVE')){
    return {ok:false,error:'ADVISOR_ROLE_REQUIRED'};
  }
  if(!env.ADVISOR_ASSIGNMENT_RESOLVER_URL){
    return {ok:false,error:'ADVISOR_RESOLVER_NOT_CONFIGURED'};
  }
  const body={
    staff_directory_key:clean(staff.staff_directory_key,120),
    academic_year:Number(staff.academic_year)||null,
    purpose:'ADVISOR_ASSIGNED_STUDENTS'
  };
  const headers={'content-type':'application/json'};
  if(env.ADVISOR_ASSIGNMENT_RESOLVER_TOKEN)headers.authorization=`Bearer ${env.ADVISOR_ASSIGNMENT_RESOLVER_TOKEN}`;
  let res;
  try{res=await fetch(env.ADVISOR_ASSIGNMENT_RESOLVER_URL,{method:'POST',headers,body:JSON.stringify(body)})}
  catch(_){return {ok:false,error:'ADVISOR_RESOLVER_UNREACHABLE'}}
  const data=await res.json().catch(()=>null);
  if(!res.ok||!data||data.ok!==true)return {ok:false,error:'ADVISOR_RESOLVER_REJECTED'};
  const assignments=Array.isArray(data.assignments)?data.assignments:[];
  return {ok:true,assignments,source_status:clean(data.source_status,80)||'PRIVATE_RESOLVER'};
}
