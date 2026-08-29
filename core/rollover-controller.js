import {academicYearContext} from './academic-year.js';

// Storage adapter contract expected by runAcademicYearRollover:
// getCurrentAcademicYear(), hasRollover(key), createSnapshot(context),
// prepareYear(context), validatePreparedYear(context), activateYear(context),
// markRollover(key, result), rollbackPreparedYear(context, snapshot)

export async function runAcademicYearRollover(storage,{now=new Date(),trigger='REQUEST'}={}){
  const ctx=academicYearContext(now);
  const current=Number(await storage.getCurrentAcademicYear());
  if(current===ctx.academic_year) return {ok:true,changed:false,academic_year:current,reason:'ALREADY_CURRENT'};
  if(current>ctx.academic_year) return {ok:false,changed:false,error:'REGISTRY_YEAR_AHEAD',current,expected:ctx.academic_year};
  if(await storage.hasRollover(ctx.rollover_key)) return {ok:true,changed:false,academic_year:ctx.academic_year,reason:'IDEMPOTENT_ALREADY_DONE'};

  let snapshot=null;
  try{
    snapshot=await storage.createSnapshot({...ctx,trigger});
    await storage.prepareYear({...ctx,previous_academic_year:current,snapshot});
    const validation=await storage.validatePreparedYear(ctx);
    if(!validation||validation.ok!==true) throw Object.assign(new Error('ROLLOVER_VALIDATION_FAILED'),{validation});
    await storage.activateYear({...ctx,previous_academic_year:current,snapshot});
    const result={ok:true,changed:true,previous_academic_year:current,academic_year:ctx.academic_year,trigger,snapshot,validation};
    await storage.markRollover(ctx.rollover_key,result);
    return result;
  }catch(error){
    if(snapshot&&storage.rollbackPreparedYear){
      try{await storage.rollbackPreparedYear(ctx,snapshot)}catch(_){/* audit adapter must record rollback failure */}
    }
    return {ok:false,changed:false,error:error&&error.message||'ROLLOVER_FAILED',academic_year:ctx.academic_year,snapshot,validation:error&&error.validation||null};
  }
}

export const ROLLOVER_CARRY_FORWARD=Object.freeze({
  reference_masters:['identity','staff','item_catalog','equipment_catalog','medicine_catalog','templates','settings'],
  review_each_year:['advisor_assignments','student_year_level','entitlement_rates'],
  never_rewrite_history:['good_deed_ledger','borrow_transactions','requisitions','stock_moves','visits','dispensing','inventory_transactions','procurement_transactions']
});
