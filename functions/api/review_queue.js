/**
 * คิวตรวจของอาจารย์แบบคัดกรองอัตโนมัติ (ผู้ตรวจเท่านั้น)
 * GET /api/review_queue → รายการรออนุมัติทั้งหมด พร้อมธงเตือนจากกฎข้อกำหนดฯ ๒๕๖๙ และการตรวจรูป/ข้อความซ้ำ
 *   level: 'block' = ผิดกฎ (เกินเพดาน/ลงซ้ำ) ไม่ควรอนุมัติ · 'warn' = ควรเปิดดูก่อน · 'ok' = ปกติ อนุมัติเป็นชุดได้
 */
import { CORS, json, staffOf, callGas } from './_gateway.js';
import { checkDeed, usageOf, normDate, normText, photoDuplicates, similarPhotos, RULES } from './_deed_rules.js';
import { fetchDeeds } from './_deed_store.js';

export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });

const DAY = 86400000;
const isPending = (d) => { const s = String(d.status || 'pending').toLowerCase(); return s === 'pending' || s === '' || s === 'waiting'; };
const live = (d) => !['rejected', 'deleted'].includes(String(d.status || '').toLowerCase());
const hasPhoto = (d) => !!(d.imageUrl || (Array.isArray(d.imageUrls) && d.imageUrls.length));

export function buildQueue(deeds, photos, now = new Date()) {
  const pending = deeds.filter(isPending);
  const byStudent = new Map();
  for (const d of deeds) {
    const sid = String(d.studentId || d.student_id || '');
    if (!byStudent.has(sid)) byStudent.set(sid, []);
    byStudent.get(sid).push(d);
  }
  // รูปซ้ำ/คล้าย → deedId → ข้อความ
  const photoFlag = new Map();
  if (photos) {
    for (const g of photoDuplicates(photos.filter(p => p.hash), deeds)) for (const i of g.items) photoFlag.set(i.deedId, g.crossStudent ? 'รูปหลักฐานเป็นไฟล์เดียวกับของ นพอ. คนอื่น' : 'รูปหลักฐานเป็นไฟล์เดียวกับรายการอื่นของตัวเอง');
    for (const g of similarPhotos(photos, deeds)) for (const i of g.items) if (!photoFlag.has(i.deedId)) photoFlag.set(i.deedId, g.crossStudent ? 'รูปหลักฐานคล้ายของ นพอ. คนอื่นมาก' : 'รูปหลักฐานคล้ายรายการอื่นของตัวเองมาก');
  }
  // ข้อความเหมือนกันคนละคน (หมวด 6/7 ทำเองไม่มีคำสั่ง จึงไม่ควรเหมือนกัน)
  const textOwners = new Map();
  for (const d of deeds.filter(live)) {
    const k = normText(d.description);
    if (k.length < 6) continue;
    if (!textOwners.has(k)) textOwners.set(k, new Set());
    textOwners.get(k).add(String(d.studentId || d.student_id || ''));
  }

  const items = pending.map(d => {
    const sid = String(d.studentId || d.student_id || '');
    const others = (byStudent.get(sid) || []).filter(x => String(x.id) !== String(d.id));
    const flags = [];
    const chk = checkDeed(others, { id: d.id, categoryId: d.categoryId, hours: d.hours, activityDate: d.activityDate, description: d.description }, now);
    if (!chk.ok) flags.push({ code: chk.code, level: 'block', text: chk.message });
    else for (const w of chk.warnings) flags.push({ code: 'NOTE', level: /ครบโควตา/.test(w) ? 'info' : 'warn', text: w });
    const cat = Number(d.categoryId);
    if (!hasPhoto(d) && cat !== 9) flags.push({ code: 'NO_PHOTO', level: 'warn', text: 'ไม่มีรูปหลักฐาน' });
    if (photoFlag.has(String(d.id))) flags.push({ code: 'PHOTO_MATCH', level: 'warn', text: photoFlag.get(String(d.id)) });
    const k = normText(d.description);
    const owners = textOwners.get(k);
    if ([6, 7].includes(cat) && owners && owners.size > 1) flags.push({ code: 'SAME_TEXT', level: 'warn', text: `รายละเอียดเหมือนของ นพอ. อีก ${owners.size - 1} คน` });
    if (!String(d.description || '').trim()) flags.push({ code: 'NO_DESC', level: 'warn', text: 'ไม่มีรายละเอียดกิจกรรม' });
    const act = Date.parse(normDate(d.activityDate)), sub = Date.parse(normDate(d.submittedAt) || normDate(now.toISOString()));
    if (act && sub && sub - act > 30 * DAY) flags.push({ code: 'LATE', level: 'warn', text: `ส่งย้อนหลัง ${Math.round((sub - act) / DAY)} วัน` });
    const level = flags.some(f => f.level === 'block') ? 'block' : flags.some(f => f.level === 'warn') ? 'warn' : 'ok';
    const r = RULES[cat] || {};
    const u = usageOf(others, cat, d.activityDate);
    const quota = [
      r.perTerm ? `ภาค ${u.termHours + (parseFloat(d.hours) || 0)}/${r.perTerm}` : '',
      r.perYear ? `ปี ${u.yearHours + (parseFloat(d.hours) || 0)}/${r.perYear}` : '',
    ].filter(Boolean).join(' · ');
    return { ...d, studentId: sid, level, flags, quota };
  });
  const order = { block: 0, warn: 1, ok: 2 };
  items.sort((a, b) => order[a.level] - order[b.level] || String(a.submittedAt || '').localeCompare(String(b.submittedAt || '')));
  return {
    generatedAt: now.toISOString(),
    counts: { total: items.length, block: items.filter(i => i.level === 'block').length, warn: items.filter(i => i.level === 'warn').length, ok: items.filter(i => i.level === 'ok').length },
    photoCheck: !!photos,
    items,
  };
}

export async function onRequestGet({ request, env }) {
  const me = await staffOf(request, env);
  if (!me) return json({ status: 'error', code: 'FORBIDDEN', message: 'ต้องยืนยันตัวตนผู้ตรวจก่อน' }, 403);
  const [deeds, ph] = await Promise.all([
    fetchDeeds(env, '', 20000),
    callGas(env, { action: 'deedphoto_hashes' }).catch(() => null),
  ]);
  if (!deeds) return json({ status: 'error', code: 'DEEDS_UNAVAILABLE' }, 503);
  const photos = ph && ph.status === 'success' && Array.isArray(ph.photos) ? ph.photos : null;
  return json({ status: 'success', reviewer: me.name, ...buildQueue(deeds, photos) });
}
