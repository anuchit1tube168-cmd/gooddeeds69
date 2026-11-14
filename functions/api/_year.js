// ชั้นปีของ นพอ. จากรุ่น (๒ หลักแรกของรหัส / class_year) — ใช้ร่วมทุก API
// คิดจากปีการศึกษาปัจจุบัน (เริ่ม ๑ ก.ค.) จึงเลื่อนชั้นเองทุกปี ไม่ต้องแก้ตารางรุ่นในโค้ด
// เดิมเทียบ class_year === '69' แบบข้อความ — ถ้าค่าเป็นตัวเลข 69 จะตกไปเป็น "ชั้นปีที่ 4" (บัค)

export function academicYearBE(now = new Date()) {
  // เวลาไทย: ปีการศึกษาเริ่ม ๑ ก.ค.
  const th = new Date(now.getTime() + 7 * 3600 * 1000);
  const be = th.getUTCFullYear() + 543;
  return th.getUTCMonth() >= 6 ? be : be - 1;
}

export function normalizeClassYear(classYear, studentId) {
  const m = String(classYear == null ? '' : classYear).match(/\d{2}/);
  if (m) return m[0];
  const sid = String(studentId || '').trim();
  return /^\d{7}$/.test(sid) ? sid.slice(0, 2) : '';
}

export function yearLevelOf(classYear, studentId, now = new Date()) {
  const cy = normalizeClassYear(classYear, studentId);
  if (!cy) return null;
  return academicYearBE(now) - (2500 + Number(cy)) + 1;
}

export function yearLabel(classYear, studentId, now = new Date()) {
  const cy = normalizeClassYear(classYear, studentId);
  const lv = yearLevelOf(cy, studentId, now);
  if (!cy || lv == null) return 'ไม่ทราบชั้นปี';
  if (lv >= 1 && lv <= 4) return `ชั้นปีที่ ${lv} (รุ่น ${cy})`;
  if (lv > 4) return `ศิษย์เก่า (รุ่น ${cy})`;
  return `รุ่น ${cy}`;
}
