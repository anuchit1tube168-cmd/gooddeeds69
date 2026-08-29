(function(){
  'use strict';
  const TZ='Asia/Bangkok';
  const CUTOVER_MONTH=8;
  const CUTOVER_DAY=1;

  function bangkokParts(date){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date||new Date());
    const out={};
    for(const p of parts) if(p.type!=='literal') out[p.type]=Number(p.value);
    return {year:out.year,month:out.month,day:out.day};
  }

  function academicYearFor(date){
    const p=bangkokParts(date||new Date());
    const afterCutover=p.month>CUTOVER_MONTH || (p.month===CUTOVER_MONTH && p.day>=CUTOVER_DAY);
    return p.year + (afterCutover?543:542);
  }

  function context(date){
    const academic_year=academicYearFor(date);
    const startYear=academic_year-543;
    return Object.freeze({
      academic_year,
      starts_at:`${startYear}-08-01`,
      ends_at:`${startYear+1}-07-31`,
      timezone:TZ,
      cutover:'08-01',
      source:'DATE_RULE'
    });
  }

  function stampRecord(record,date){
    const source=record&&typeof record==='object'?record:{};
    // Never rewrite historical academic_year. Only fill it for a new record when absent.
    if(source.academic_year!==undefined && source.academic_year!==null && source.academic_year!=='') return {...source};
    return {...source,academic_year:academicYearFor(date)};
  }

  window.RTAFNC_ACADEMIC_YEAR=Object.freeze({
    timezone:TZ,
    cutoverMonth:CUTOVER_MONTH,
    cutoverDay:CUTOVER_DAY,
    current:()=>academicYearFor(new Date()),
    forDate:academicYearFor,
    context,
    stampRecord
  });
})();
