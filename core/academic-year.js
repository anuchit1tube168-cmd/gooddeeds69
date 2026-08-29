const TIMEZONE='Asia/Bangkok';
const CUTOVER_MONTH=8;
const CUTOVER_DAY=1;

function partsAtBangkok(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const p={};
  for(const part of parts) if(part.type!=='literal') p[part.type]=Number(part.value);
  return {year:p.year,month:p.month,day:p.day};
}

export function resolveAcademicYear(date=new Date()){
  const p=partsAtBangkok(date);
  const current=p.month>CUTOVER_MONTH||(p.month===CUTOVER_MONTH&&p.day>=CUTOVER_DAY);
  return p.year+(current?543:542);
}

export function academicYearContext(date=new Date()){
  const academic_year=resolveAcademicYear(date);
  const startGregorian=academic_year-543;
  return Object.freeze({
    academic_year,
    starts_at:`${startGregorian}-08-01`,
    ends_at:`${startGregorian+1}-07-31`,
    timezone:TIMEZONE,
    rollover_key:`AY:${academic_year}`
  });
}

export function stampNewRecord(record,date=new Date()){
  if(!record||typeof record!=='object') throw new TypeError('record must be an object');
  if(record.academic_year!==undefined&&record.academic_year!==null&&record.academic_year!=='') return {...record};
  return {...record,academic_year:resolveAcademicYear(date)};
}

export function validateRecordYear(record,date=new Date()){
  const expected=resolveAcademicYear(date);
  const actual=Number(record&&record.academic_year);
  return {ok:Number.isInteger(actual)&&actual===expected,expected,actual:Number.isFinite(actual)?actual:null};
}

export const ACADEMIC_YEAR_POLICY=Object.freeze({timezone:TIMEZONE,cutover_month:CUTOVER_MONTH,cutover_day:CUTOVER_DAY});
