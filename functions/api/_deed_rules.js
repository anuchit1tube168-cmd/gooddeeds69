// กฎเพดานชั่วโมงและการกันลงซ้ำ ตามข้อกำหนดการบันทึกความดี ปีการศึกษา ๒๕๖๙ (docs/ข้อกำหนด_บันทึกความดี_ปีการศึกษา2569.md)
// ใช้ร่วมกันทั้งตอนส่ง (submit_deed), ตรวจก่อนส่ง (deed_check) และรายงานตรวจรายสัปดาห์ (deed_audit)
// ไฟล์ขึ้นต้น _ จึงไม่เป็น route

export const RULES = {
  1: { name: 'บริจาคโลหิต/เกล็ดเลือด/พลาสมา', perEntry: 8, maxCountYear: 4, spacingDays: 90 },
  2: { name: 'โครงการภายนอก (คำสั่ง วพอ.)', perDay: 8 },
  3: { name: 'ช่วยเหลืองานภายใน วพอ.', perDay: 8 },
  4: { name: 'เข้าอบรมที่ วพอ. จัดให้', perDay: 4 },
  5: { name: 'ช่วยงานหน่วยงาน/ชุมชน/มูลนิธิ', perDay: 4 },
  6: { name: 'ทำนุบำรุงศาสนสถาน', perEntry: 1, perYear: 4 },
  7: { name: 'ความดีทั่วไป/ช่วยเหลือครอบครัว', perEntry: 1, perTerm: 2, perYear: 4 },
  8: { name: 'กิจกรรมจงรักภักดีต่อสถาบัน', perYear: 8 },
  9: { name: 'ชม. ที่สมควรได้รับ (บทบาทพิเศษ)', perTerm: 20, perYear: 40 },
};

const DAY = 86400000;

// วันที่ทุกรูปแบบ → 'YYYY-MM-DD' ตามเวลาไทย ('' ถ้าอ่านไม่ได้)
// ชีตส่งวันที่มาเป็นข้อความแบบ "Tue Nov 17 2026 00:00:00 GMT+0700" หรือ ISO (UTC) จึงต้องแปลงเป็นเวลาไทยก่อนตัดวัน
export function normDate(v) {
  if (v == null || v === '') return '';
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    let y = Number(m[1]); if (y > 2400) y -= 543;
    return `${y}-${m[2]}-${m[3]}`;
  }
  const t = Date.parse(s);
  if (Number.isNaN(t)) return '';
  const th = new Date(t + 7 * 3600 * 1000);
  let y = th.getUTCFullYear(); if (y > 2400) y -= 543;
  return `${y}-${String(th.getUTCMonth() + 1).padStart(2, '0')}-${String(th.getUTCDate()).padStart(2, '0')}`;
}

// ปีการศึกษาเริ่ม ๑ ก.ค. · ภาค ๑ = ก.ค.–พ.ย. · ภาค ๒ = ธ.ค.–มิ.ย.
export function termOf(dateStr) {
  const d = normDate(dateStr);
  if (!d) return null;
  const y = Number(d.slice(0, 4)), mo = Number(d.slice(5, 7));
  const academicYear = (mo >= 7 ? y : y - 1) + 543;
  const semester = mo >= 7 && mo <= 11 ? 1 : 2;
  return { academicYear, semester };
}

// ข้อความสำหรับเทียบซ้ำ: ตัดช่องว่าง/เครื่องหมาย/ตัวพิมพ์ใหญ่เล็ก
export function normText(s) {
  return String(s || '').toLowerCase().replace(/[\s​.,;:!?'"()\[\]{}\-_/\\|]+/g, '');
}

const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
// ไม่นับรายการที่ไม่อนุมัติ และรายการที่ถูกลบ (ชีตเก็บไว้เป็นสถานะ deleted)
const counts = (d) => !['rejected', 'deleted'].includes(String(d.status || '').toLowerCase());
const fmt = (n) => String(Math.round(n * 100) / 100);

/**
 * สรุปการใช้โควตาของหมวดหนึ่ง ณ วันที่หนึ่ง (ไม่นับรายการที่ไม่อนุมัติ)
 */
export function usageOf(deeds, categoryId, dateStr, excludeId) {
  const cat = Number(categoryId);
  const term = termOf(dateStr);
  const date = normDate(dateStr);
  const same = (deeds || []).filter(d => counts(d) && Number(d.categoryId) === cat && String(d.id) !== String(excludeId || ''));
  let yearHours = 0, termHours = 0, dayHours = 0, yearCount = 0;
  const bloodDates = [];
  for (const d of same) {
    const t = termOf(d.activityDate || d.submittedAt);
    if (!t || !term) continue;
    const h = num(d.hours);
    if (t.academicYear === term.academicYear) {
      yearHours += h; yearCount++;
      if (t.semester === term.semester) termHours += h;
    }
    if (normDate(d.activityDate) === date) dayHours += h;
    if (cat === 1 && normDate(d.activityDate)) bloodDates.push(normDate(d.activityDate));
  }
  const r = RULES[cat] || {};
  return {
    categoryId: cat, name: r.name || '', term,
    yearHours, termHours, dayHours, yearCount,
    perYear: r.perYear || null, perTerm: r.perTerm || null, perDay: r.perDay || null,
    remainingYear: r.perYear ? Math.max(0, r.perYear - yearHours) : null,
    remainingTerm: r.perTerm ? Math.max(0, r.perTerm - termHours) : null,
    remainingCount: r.maxCountYear ? Math.max(0, r.maxCountYear - yearCount) : null,
    full: !!((r.perYear && yearHours >= r.perYear) || (r.perTerm && termHours >= r.perTerm) || (r.maxCountYear && yearCount >= r.maxCountYear)),
    bloodDates,
  };
}

/**
 * ตรวจรายการใหม่เทียบกับรายการเดิมของนักเรียนคนเดียวกัน
 * คืน { ok, code, message, warnings[], usage }
 * code: HOURS_INVALID | DATE_INVALID | DATE_FUTURE | CATEGORY_INVALID | DUPLICATE | PER_ENTRY | DAY_CAP | TERM_CAP | YEAR_CAP | BLOOD_COUNT | BLOOD_SPACING
 */
export function checkDeed(existing, deed, now = new Date()) {
  const cat = Number(deed.categoryId);
  const r = RULES[cat];
  const hours = num(deed.hours);
  const date = normDate(deed.activityDate);
  const warnings = [];
  const fail = (code, message, usage) => ({ ok: false, code, message, warnings, usage: usage || null });

  if (!r) return fail('CATEGORY_INVALID', 'ไม่พบหมวดความดีนี้ กรุณาเลือกหมวดใหม่');
  if (!date) return fail('DATE_INVALID', 'วันที่ทำกิจกรรมไม่ถูกต้อง');
  const today = normDate(now.toISOString());
  if (date > today) return fail('DATE_FUTURE', 'ยังบันทึกกิจกรรมของวันที่ยังไม่ถึงไม่ได้');
  if (!(hours > 0)) return fail('HOURS_INVALID', 'จำนวนชั่วโมงต้องมากกว่า 0');

  const usage = usageOf(existing, cat, date, deed.id);
  const mine = (existing || []).filter(d => counts(d) && String(d.id) !== String(deed.id || ''));

  // ห้ามบันทึกซ้ำ: หมวดเดียวกัน วันเดียวกัน (ข้อกำหนดฯ ข้อ ๒)
  const dup = mine.find(d => Number(d.categoryId) === cat && normDate(d.activityDate) === date);
  if (dup) {
    return fail('DUPLICATE', `บันทึกซ้ำไม่ได้: หมวด "${r.name}" วันที่ ${date} บันทึกไปแล้ว (${fmt(num(dup.hours))} ชม. สถานะ ${statusTh(dup.status)}) — ถ้าทำหลายงานในวันเดียวให้รวมเป็นรายการเดียว`, usage);
  }

  if (r.perEntry && hours > r.perEntry) {
    return fail('PER_ENTRY', `หมวด "${r.name}" บันทึกได้ไม่เกิน ${r.perEntry} ชม. ต่อครั้ง (กรอก ${fmt(hours)} ชม.)`, usage);
  }
  if (r.perDay && hours > r.perDay) {
    return fail('DAY_CAP', `หมวด "${r.name}" บันทึกได้ไม่เกิน ${r.perDay} ชม. ต่อวัน (กรอก ${fmt(hours)} ชม.)`, usage);
  }
  if (cat === 1) {
    if (usage.yearCount >= r.maxCountYear) {
      return fail('BLOOD_COUNT', `บริจาคโลหิตบันทึกครบ ${r.maxCountYear} ครั้งของปีการศึกษา ${usage.term.academicYear} แล้ว ห้ามบันทึกเพิ่ม`, usage);
    }
    const near = usage.bloodDates.find(d => Math.abs(Date.parse(d) - Date.parse(date)) < r.spacingDays * DAY);
    if (near) {
      return fail('BLOOD_SPACING', `บริจาคโลหิตต้องห่างกันอย่างน้อย ${r.spacingDays} วัน (มีบันทึกวันที่ ${near} แล้ว)`, usage);
    }
  }
  if (r.perTerm) {
    if (usage.termHours >= r.perTerm) {
      return fail('TERM_CAP', `หมวด "${r.name}" ภาคการศึกษาที่ ${usage.term.semester}/${usage.term.academicYear} บันทึกครบ ${r.perTerm} ชม. แล้ว ห้ามบันทึกเพิ่มในภาคนี้`, usage);
    }
    if (usage.termHours + hours > r.perTerm) {
      return fail('TERM_CAP', `หมวด "${r.name}" ภาคนี้เหลือโควตา ${fmt(r.perTerm - usage.termHours)} ชม. (กรอก ${fmt(hours)} ชม.)`, usage);
    }
  }
  if (r.perYear) {
    if (usage.yearHours >= r.perYear) {
      return fail('YEAR_CAP', `หมวด "${r.name}" ปีการศึกษา ${usage.term.academicYear} บันทึกครบ ${r.perYear} ชม. แล้ว ห้ามบันทึกเพิ่ม`, usage);
    }
    if (usage.yearHours + hours > r.perYear) {
      return fail('YEAR_CAP', `หมวด "${r.name}" ปีนี้เหลือโควตา ${fmt(r.perYear - usage.yearHours)} ชม. (กรอก ${fmt(hours)} ชม.)`, usage);
    }
  }

  // เตือน (ไม่บล็อก): รายละเอียดเหมือนรายการเดิมทุกตัวอักษร — อาจคัดลอกมาลงซ้ำต่างวัน
  const key = normText(deed.description);
  if (key.length >= 6) {
    const same = mine.filter(d => normText(d.description) === key);
    if (same.length) {
      warnings.push(`รายละเอียดนี้เหมือนที่เคยบันทึกไว้ ${same.length} ครั้ง (ล่าสุดวันที่ ${same.map(d => normDate(d.activityDate)).sort().pop()}) — ตรวจว่าไม่ได้ลงงานเดิมซ้ำ`);
    }
  }
  const after = r.perYear ? r.perYear - usage.yearHours - hours : null;
  if (after === 0) warnings.push(`หลังรายการนี้ หมวด "${r.name}" จะครบโควตาปีการศึกษาแล้ว`);
  if (r.perTerm && r.perTerm - usage.termHours - hours === 0) warnings.push(`หลังรายการนี้ หมวด "${r.name}" จะครบโควตาภาคนี้แล้ว`);
  return { ok: true, code: 'OK', message: '', warnings, usage };
}

export function statusTh(s) {
  s = String(s || '').toLowerCase();
  return s === 'approved' ? 'อนุมัติแล้ว' : s === 'rejected' ? 'ไม่อนุมัติ' : 'รอตรวจ';
}

/**
 * รายงานตรวจทั้งระบบ: รายการซ้ำ เกินเพดาน ข้อมูลผิดรูปแบบ และกิจกรรมเดียวกันหลายคน
 * deeds = รายการทั้งหมดจากชีต · opts.academicYear (พ.ศ.) ถ้าไม่ระบุใช้ทุกปี
 */
export function auditDeeds(deeds, opts = {}) {
  const now = opts.now || new Date();
  const today = normDate(now.toISOString());
  const yearFilter = opts.academicYear ? Number(opts.academicYear) : null;
  const list = (deeds || []).filter(d => {
    if (!yearFilter) return true;
    const t = termOf(d.activityDate || d.submittedAt);
    return t && t.academicYear === yearFilter;
  });

  const invalid = [];
  const duplicates = [];
  const overCap = [];
  const byStudent = new Map();
  for (const d of list) {
    if (!counts(d)) continue; // รายการที่ไม่อนุมัติ/ลบแล้ว ไม่ต้องตรวจ
    const sid = String(d.studentId || d.student_id || '').trim();
    const issues = [];
    if (!/^\d{7}$/.test(sid)) issues.push('รหัสนักเรียนไม่ใช่ 7 หลัก');
    const cat = Number(d.categoryId);
    if (!RULES[cat]) issues.push('หมวดไม่ถูกต้อง');
    const date = normDate(d.activityDate);
    if (!date) issues.push('ไม่มีวันที่/วันที่อ่านไม่ได้');
    else if (date > today) issues.push('วันที่ในอนาคต');
    const h = num(d.hours);
    if (!(h > 0)) issues.push('ชั่วโมงเป็น 0 หรือติดลบ');
    const r = RULES[cat];
    if (r && r.perEntry && h > r.perEntry) issues.push(`เกิน ${r.perEntry} ชม./ครั้ง`);
    if (r && r.perDay && h > r.perDay) issues.push(`เกิน ${r.perDay} ชม./วัน`);
    if (!String(d.description || '').trim()) issues.push('ไม่มีรายละเอียด');
    if (issues.length) invalid.push({ ...brief(d), issues });
    if (!byStudent.has(sid)) byStudent.set(sid, []);
    byStudent.get(sid).push(d);
  }

  for (const [sid, ds] of byStudent) {
    const live = ds.filter(counts);
    // ซ้ำ: หมวดเดียวกัน วันเดียวกัน
    const seen = new Map();
    for (const d of live) {
      const k = Number(d.categoryId) + '|' + normDate(d.activityDate);
      if (!seen.has(k)) seen.set(k, []);
      seen.get(k).push(d);
    }
    for (const [k, g] of seen) if (g.length > 1 && k.split('|')[1]) duplicates.push({ studentId: sid, categoryId: Number(k.split('|')[0]), date: k.split('|')[1], count: g.length, ids: g.map(x => String(x.id)) });
    // เกินเพดานรายภาค/รายปี/จำนวนครั้ง
    const agg = new Map();
    for (const d of live) {
      const t = termOf(d.activityDate || d.submittedAt);
      if (!t) continue;
      const cat = Number(d.categoryId);
      const yk = `${cat}|${t.academicYear}`, tk = `${cat}|${t.academicYear}|${t.semester}`;
      if (!agg.has(yk)) agg.set(yk, { h: 0, n: 0 });
      if (!agg.has(tk)) agg.set(tk, { h: 0, n: 0 });
      agg.get(yk).h += num(d.hours); agg.get(yk).n++;
      agg.get(tk).h += num(d.hours); agg.get(tk).n++;
    }
    for (const [k, v] of agg) {
      const [cat, ay, sem] = k.split('|').map(Number);
      const r = RULES[cat]; if (!r) continue;
      if (sem) { if (r.perTerm && v.h > r.perTerm) overCap.push({ studentId: sid, categoryId: cat, scope: `ภาค ${sem}/${ay}`, hours: v.h, limit: r.perTerm }); }
      else {
        if (r.perYear && v.h > r.perYear) overCap.push({ studentId: sid, categoryId: cat, scope: `ปี ${ay}`, hours: v.h, limit: r.perYear });
        if (r.maxCountYear && v.n > r.maxCountYear) overCap.push({ studentId: sid, categoryId: cat, scope: `ปี ${ay}`, count: v.n, limit: r.maxCountYear, unit: 'ครั้ง' });
      }
    }
  }

  // กิจกรรมเดียวกันหลายคน (รายละเอียด+วันที่+สถานที่ตรงกัน) — ช่วยตรวจว่าใครทำที่ไหน และจับการคัดลอกข้อความกัน
  const groups = new Map();
  for (const d of list.filter(counts)) {
    const key = normText(d.description);
    if (key.length < 6) continue;
    const g = `${key}|${normDate(d.activityDate)}|${normText(d.location)}`;
    if (!groups.has(g)) groups.set(g, { description: String(d.description || '').trim().slice(0, 120), date: normDate(d.activityDate), location: String(d.location || '').trim().slice(0, 80), categoryId: Number(d.categoryId), students: new Set(), hours: [] });
    const x = groups.get(g); x.students.add(String(d.studentId || d.student_id || '')); x.hours.push(num(d.hours));
  }
  const sharedActivities = [...groups.values()].filter(g => g.students.size > 1).map(g => ({
    ...g, students: [...g.students].sort(), count: g.students.size,
    hoursMismatch: new Set(g.hours).size > 1,
    // หมวด ๖/๗ เป็นงานที่ทำเองโดยไม่มีคำสั่ง ข้อความเหมือนกันหลายคนจึงน่าสงสัยกว่าหมวดที่มีคำสั่ง
    suspicious: [6, 7].includes(g.categoryId) || new Set(g.hours).size > 1,
  })).sort((a, b) => Number(b.suspicious) - Number(a.suspicious) || b.count - a.count);

  // ความถี่รายหมวด
  const perCategory = {};
  for (const d of list.filter(counts)) {
    const c = Number(d.categoryId);
    perCategory[c] ||= { categoryId: c, name: (RULES[c] || {}).name || 'ไม่ทราบหมวด', entries: 0, hours: 0, students: new Set() };
    perCategory[c].entries++; perCategory[c].hours += num(d.hours); perCategory[c].students.add(String(d.studentId || d.student_id || ''));
  }
  const categories = Object.values(perCategory).map(c => ({ ...c, students: c.students.size })).sort((a, b) => a.categoryId - b.categoryId);

  return {
    generatedAt: now.toISOString(),
    academicYear: yearFilter,
    totals: { deeds: list.filter(counts).length, students: byStudent.size, invalid: invalid.length, duplicates: duplicates.length, overCap: overCap.length, sharedActivities: sharedActivities.length, suspicious: sharedActivities.filter(s => s.suspicious).length },
    invalid, duplicates, overCap, sharedActivities, categories,
  };
}

function brief(d) {
  return { id: String(d.id || ''), studentId: String(d.studentId || d.student_id || ''), categoryId: Number(d.categoryId), date: normDate(d.activityDate), hours: num(d.hours), status: String(d.status || '') };
}

/**
 * รูปหลักฐานซ้ำ: ไฟล์เดียวกัน (SHA-256 ตรงกัน) ถูกใช้กับหลายรายการ
 * photos = [{deedId, studentId, hash}] · deeds ใช้เติมหมวด/วันที่ (ตัดรายการที่ไม่อนุมัติออก)
 * จับได้เฉพาะไฟล์ที่เหมือนกันทุกไบต์ — รูปที่ถูกครอปหรือบีบอัดใหม่จะไม่ถูกจับ
 */
export function photoDuplicates(photos, deeds) {
  const byId = new Map((deeds || []).map(d => [String(d.id), d]));
  const groups = new Map();
  for (const p of photos || []) {
    const d = byId.get(String(p.deedId));
    if (d && !counts(d)) continue;
    if (!p.hash) continue;
    if (!groups.has(p.hash)) groups.set(p.hash, []);
    groups.get(p.hash).push({ deedId: String(p.deedId), studentId: String(p.studentId), categoryId: d ? Number(d.categoryId) : null, date: d ? normDate(d.activityDate) : '' });
  }
  return [...groups.values()].filter(g => g.length > 1).map(items => {
    const students = [...new Set(items.map(i => i.studentId))];
    return { count: items.length, students, crossStudent: students.length > 1, items };
  }).sort((a, b) => Number(b.crossStudent) - Number(a.crossStudent) || b.count - a.count);
}

// ระยะแฮมมิงของ dHash 64 บิต (hex 16 ตัว)
export function hamming(a, b) {
  let d = 0;
  for (let i = 0; i < 16; i += 4) {
    let x = parseInt(a.slice(i, i + 4), 16) ^ parseInt(b.slice(i, i + 4), 16);
    while (x) { d += x & 1; x >>= 1; }
  }
  return d;
}

/**
 * รูปคล้ายกัน (ถ่ายซ้ำ/ครอป/ย่อ/บีบอัดใหม่) จาก dHash — ต่างกันไม่เกิน maxDist บิตจาก 64
 * ไม่รวมคู่ที่เป็นไฟล์เดียวกันทุกไบต์ (รายงานแยกใน photoDuplicates แล้ว)
 */
export function similarPhotos(photos, deeds, maxDist = 6) {
  const byId = new Map((deeds || []).map(d => [String(d.id), d]));
  const list = (photos || []).filter(p => /^[0-9a-f]{16}$/.test(String(p.dhash || '')) && (!byId.get(String(p.deedId)) || counts(byId.get(String(p.deedId)))));
  // dHash ของภาพสีพื้นเรียบ (ทั้งขาว/ทั้งดำ) เป็น 0 เกือบทั้งหมด จับคู่กันมั่ว → ข้าม
  const usable = list.filter(p => { const z = hamming(p.dhash, '0000000000000000'); return z > 4 && z < 60; });
  const parent = usable.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const pairs = [];
  for (let i = 0; i < usable.length; i++) for (let j = i + 1; j < usable.length; j++) {
    const a = usable[i], b = usable[j];
    if (a.hash && a.hash === b.hash) continue;
    const dist = hamming(a.dhash, b.dhash);
    if (dist <= maxDist) { parent[find(i)] = find(j); pairs.push(dist); }
  }
  const groups = new Map();
  usable.forEach((p, i) => { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(p); });
  return [...groups.values()].filter(g => g.length > 1).map(g => {
    const items = g.map(p => { const d = byId.get(String(p.deedId)); return { deedId: String(p.deedId), studentId: String(p.studentId), categoryId: d ? Number(d.categoryId) : null, date: d ? normDate(d.activityDate) : '' }; });
    const students = [...new Set(items.map(i => i.studentId))];
    return { count: items.length, students, crossStudent: students.length > 1, items };
  }).sort((a, b) => Number(b.crossStudent) - Number(a.crossStudent) || b.count - a.count);
}
