// Server-side authorization + metadata registry for AGIS Knowledge Pilot.
// Metadata only. Never put private Drive IDs, case records, health/mental-health records,
// counseling notes, personnel records, individual welfare records or secrets here.

const STUDENT_SOURCE={source_id:'SRC-STUDENT-HANDBOOK-2566',source_title:'คู่มือนักเรียนพยาบาลทหารอากาศ ปีการศึกษา 2566',version:'2566.1',status:'VERIFIED_SOURCE'};
const ADVISOR_SOURCE={source_id:'SRC-ADVISOR-HANDBOOK-2566',source_title:'คู่มืออาจารย์ที่ปรึกษา ปีการศึกษา 2566',version:'2566.1',status:'VERIFIED_SOURCE'};

export const SERVER_KNOWLEDGE = Object.freeze({
  version:'1.1.0',
  entries:{
    'KB-STU-001':{...STUDENT_SOURCE,title:'คู่มือนักเรียนพยาบาลทหารอากาศ',summary:'คู่มือหลักสำหรับการปฏิบัติตน ครอบคลุมสถาบัน การศึกษา การปกครอง สิทธิกำลังพล/สวัสดิการ กิจกรรมนักศึกษา และข้อกำหนดการศึกษา',pages:'1–138',audience:['STUDENT','STAFF','ADMIN'],sensitivity:'NORMAL'},
    'KB-GOV-001':{...STUDENT_SOURCE,title:'การปกครอง การลงทัณฑ์ และคะแนนความประพฤติ',summary:'กรอบการปกครอง การรายงาน การสอบสวน การลงทัณฑ์ และการตัดคะแนนความประพฤติของ นพอ. ตามเอกสารในคู่มือ',pages:'84–115',audience:['STUDENT','STAFF','ADMIN'],sensitivity:'NORMAL'},
    'KB-GOV-002':{...STUDENT_SOURCE,title:'ระเบียบประจำวันและการใช้อาคารที่พัก',summary:'ข้อปฏิบัติประจำวัน การกลับหอพัก การตรวจยอด ความสะอาด และการใช้อาคารที่พัก/พื้นที่ส่วนกลาง',pages:'104–122',audience:['STUDENT','STAFF','ADMIN'],sensitivity:'NORMAL'},
    'KB-WEL-001':{...STUDENT_SOURCE,title:'สิทธิประโยชน์ระหว่างการศึกษาและสวัสดิการ นพอ.',summary:'สิทธิด้านเงินเดือน/เบี้ยเลี้ยง/อาภรณ์ภัณฑ์ตามประเภททุน สิทธิรักษาพยาบาล และบริการสวัสดิการที่ วพอ.พอ.จัดให้',pages:'123–125',audience:['STUDENT','STAFF','ADMIN'],sensitivity:'NORMAL'},
    'KB-WEL-002':{...STUDENT_SOURCE,title:'หอพัก นพอ. และสิ่งอำนวยความสะดวก',summary:'หอพักและสิ่งอำนวยความสะดวกเพื่อความสะดวก ปลอดภัย เอื้อต่อการศึกษา ฝึกระเบียบวินัย และการอยู่ร่วมกัน',pages:'120–124',audience:['STUDENT','STAFF','ADMIN'],sensitivity:'NORMAL'},
    'KB-WEL-003':{...STUDENT_SOURCE,title:'การใช้พื้นที่ซัก/ตากผ้าและบริการซักรีด',summary:'ชนิดผ้าที่ซัก/ตากเองได้ พื้นที่ที่จัดไว้ การแต่งกายระหว่างซักตาก และบริการบริษัทซักรีดที่ วพอ.พอ.จัดให้',pages:'122, 125',audience:['STUDENT','STAFF','ADMIN'],sensitivity:'NORMAL'},
    'KB-WEL-004':{...STUDENT_SOURCE,title:'บริการอาหาร น้ำดื่ม และไปรษณีย์',summary:'บริการอาหาร น้ำดื่ม และการรับ-ส่งพัสดุหรือไปรษณียภัณฑ์ตามคู่มือ',pages:'125',audience:['STUDENT','STAFF','ADMIN'],sensitivity:'NORMAL'},
    'KB-WEL-REG':{source_id:'SRC-WELFARE-REG-2568',source_title:'ระเบียบ วพอ.พอ.ว่าด้วยสวัสดิการ วิทยาลัยพยาบาลทหารอากาศ พ.ศ.2568',version:'2568.candidate',status:'CANDIDATE_MASTER',title:'ระเบียบสวัสดิการ วพอ.พอ. พ.ศ.2568',summary:'Candidate ระเบียบสวัสดิการที่พบใน Drive ต้องยืนยัน Master และวันมีผลก่อนใช้ตอบเชิงกฎหรือสิทธิ',pages:'',audience:['STAFF','ADMIN'],sensitivity:'INTERNAL'},
    'KB-ACT-001':{...STUDENT_SOURCE,title:'กิจกรรมนักศึกษาและคณะกรรมการ นพอ.',summary:'กิจกรรมนักศึกษาสัมพันธ์ กีฬา ศิลปวัฒนธรรม วิชาการ บำเพ็ญประโยชน์/สิ่งแวดล้อม และกิจกรรมพิเศษ',pages:'118–120',audience:['STUDENT','STAFF','ADMIN'],sensitivity:'NORMAL'},
    'KB-ACT-002':{...STUDENT_SOURCE,title:'กีฬาและชมรม นพอ.',summary:'กิจกรรมออกกำลังกาย กีฬาในวิทยาลัย/ภายนอก และตัวอย่างชมรมกีฬา/ศิลปวัฒนธรรม',pages:'119–120',audience:['STUDENT','STAFF','ADMIN'],sensitivity:'NORMAL'},
    'KB-MIL-001':{...STUDENT_SOURCE,title:'แบบธรรมเนียม วินัย และคุณลักษณะทางทหาร',summary:'การปฏิบัติตนตามระเบียบแบบธรรมเนียมของทางราชการ วินัย ความประพฤติ และคุณลักษณะความสง่าอย่างทหาร',pages:'9–13, 84–122',audience:['STUDENT','STAFF','ADMIN'],sensitivity:'NORMAL'},
    'KB-MIL-002':{source_id:'SRC-MILITARY-TRAITS',source_title:'แบบประเมินคุณลักษณะทางทหารและอัตลักษณ์ของ นพอ.',version:'candidate',status:'DUPLICATE_REVIEW',title:'แบบประเมินคุณลักษณะทางทหารและอัตลักษณ์',summary:'ชุดแบบประเมินใน Drive ที่ยังอยู่ระหว่างตรวจสำเนาซ้ำ/เลือก Master',pages:'',audience:['STAFF','ADMIN'],sensitivity:'INTERNAL'},
    'KB-ADV-001':{...ADVISOR_SOURCE,title:'ระบบอาจารย์ที่ปรึกษาและการให้คำปรึกษา',summary:'บทบาท กระบวนการให้คำปรึกษา การส่งต่อ การประสาน และจรรยาบรรณ',pages:'3–20',audience:['STAFF','ADMIN'],sensitivity:'INTERNAL'},
    'KB-ADV-002':{...ADVISOR_SOURCE,title:'การรักษาความลับข้อมูลนักเรียน',summary:'ข้อกำหนดการรักษาความลับ สิทธิ์การเข้าถึง และการรายงานข้อมูลอย่างจำกัด',pages:'20',audience:['STAFF','ADMIN'],sensitivity:'INTERNAL'},
    'KB-ADV-003':{...ADVISOR_SOURCE,title:'แบบ อษ.1–อษ.4',summary:'โครงแบบฟอร์มทะเบียนประวัติ ระเบียนสะสม บันทึกการพบ และสรุปพัฒนาการประจำปี; ไม่รวมข้อมูล case จริง',pages:'22–31',audience:['STAFF','ADMIN'],sensitivity:'INTERNAL'},
    'KB-ADV-004':{...ADVISOR_SOURCE,title:'Digital อษ.3 — หลักการบันทึก',summary:'แนวทางการบันทึกรายบุคคล การติดตาม และข้อกำหนดความลับตามคู่มือ',pages:'28–29',audience:['STAFF','ADMIN'],sensitivity:'INTERNAL'},
    'KB-ADV-005':{...ADVISOR_SOURCE,title:'อษ.4 — สรุปพัฒนาการรายปี',summary:'แนวทางสรุปพัฒนาการประจำปีตามแบบ อษ.4; ไม่รวมข้อมูลนักเรียนรายบุคคล',pages:'30–31',audience:['STAFF','ADMIN'],sensitivity:'INTERNAL'},
    'KB-LEARN-001':{...STUDENT_SOURCE,title:'Learning Center — ฐานหัวข้อจากคู่มือนักเรียน',summary:'ฐานหมวดการเรียนรู้จากคู่มือนักเรียนสำหรับพัฒนา Video/YouTube/บทเรียนออนไลน์ในเฟสถัดไป',pages:'1–138',audience:['STUDENT','STAFF','ADMIN'],sensitivity:'NORMAL'}
  }
});

export function legacyRoleToTier(role){
  const r=String(role||'').toLowerCase();
  if(r==='admin') return 'ADMIN';
  if(r==='teacher') return 'STAFF';
  if(r==='student') return 'STUDENT';
  return 'NONE';
}

export function hydrateAuthorizedCandidates(clientCandidates,auth){
  const tier=legacyRoleToTier(auth&&auth.legacy_role);
  if(tier==='NONE'||!Array.isArray(clientCandidates)) return [];
  const seen=new Set(),out=[];
  for(const hint of clientCandidates.slice(0,12)){
    const id=String(hint&&hint.id||'');
    if(!id||seen.has(id)) continue;
    const entry=SERVER_KNOWLEDGE.entries[id];
    if(!entry||!entry.audience.includes(tier)) continue;
    seen.add(id);
    out.push({id,title:entry.title,summary:entry.summary,source_id:entry.source_id,source_title:entry.source_title,version:entry.version,pages:entry.pages,status:entry.status,sensitivity:entry.sensitivity});
    if(out.length>=8) break;
  }
  return out;
}
