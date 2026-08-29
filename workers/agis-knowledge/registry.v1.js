// Server-side authorization registry for AGIS Knowledge Pilot.
// Contains metadata only. No private Drive IDs, case records, health records, counseling notes or secrets.

export const SERVER_KNOWLEDGE = Object.freeze({
  version:'1.0.0',
  entries:{
    'KB-STU-001':{audience:['STUDENT','STAFF','ADMIN'],sensitivity:'NORMAL'},
    'KB-GOV-001':{audience:['STUDENT','STAFF','ADMIN'],sensitivity:'NORMAL'},
    'KB-GOV-002':{audience:['STUDENT','STAFF','ADMIN'],sensitivity:'NORMAL'},
    'KB-WEL-001':{audience:['STUDENT','STAFF','ADMIN'],sensitivity:'NORMAL'},
    'KB-WEL-002':{audience:['STUDENT','STAFF','ADMIN'],sensitivity:'NORMAL'},
    'KB-WEL-003':{audience:['STUDENT','STAFF','ADMIN'],sensitivity:'NORMAL'},
    'KB-WEL-004':{audience:['STUDENT','STAFF','ADMIN'],sensitivity:'NORMAL'},
    'KB-WEL-REG':{audience:['STAFF','ADMIN'],sensitivity:'INTERNAL'},
    'KB-ACT-001':{audience:['STUDENT','STAFF','ADMIN'],sensitivity:'NORMAL'},
    'KB-ACT-002':{audience:['STUDENT','STAFF','ADMIN'],sensitivity:'NORMAL'},
    'KB-MIL-001':{audience:['STUDENT','STAFF','ADMIN'],sensitivity:'NORMAL'},
    'KB-MIL-002':{audience:['STAFF','ADMIN'],sensitivity:'INTERNAL'},
    'KB-ADV-001':{audience:['STAFF','ADMIN'],sensitivity:'INTERNAL'},
    'KB-ADV-002':{audience:['STAFF','ADMIN'],sensitivity:'INTERNAL'},
    'KB-ADV-003':{audience:['STAFF','ADMIN'],sensitivity:'INTERNAL'},
    'KB-ADV-004':{audience:['STAFF','ADMIN'],sensitivity:'INTERNAL'},
    'KB-ADV-005':{audience:['STAFF','ADMIN'],sensitivity:'INTERNAL'},
    'KB-LEARN-001':{audience:['STUDENT','STAFF','ADMIN'],sensitivity:'NORMAL'}
  }
});

export function legacyRoleToTier(role){
  const r=String(role||'').toLowerCase();
  if(r==='admin') return 'ADMIN';
  if(r==='teacher') return 'STAFF';
  if(r==='student') return 'STUDENT';
  return 'NONE';
}

export function authorizeCandidate(candidate,auth){
  const policy=SERVER_KNOWLEDGE.entries[String(candidate&&candidate.id||'')];
  if(!policy) return false;
  const tier=legacyRoleToTier(auth&&auth.legacy_role);
  if(tier==='NONE') return false;
  return policy.audience.includes(tier);
}
