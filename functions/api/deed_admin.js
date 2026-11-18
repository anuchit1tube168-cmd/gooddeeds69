/**
 * ผู้ตรวจจัดการรายการที่รายงานตรวจพบ (ลงซ้ำ/เกินเพดาน) — ต้องเป็นผู้ตรวจ (LINE token หรือรหัสผู้ตรวจ)
 * POST /api/deed_admin
 *   { op:'delete', studentId, deedId, reason }
 *   { op:'merge',  studentId, keepId, deedIds:[...] }  รวมชั่วโมง+รายละเอียดเข้ารายการ keepId (ไม่เกินเพดานต่อวัน/ครั้งของหมวด) แล้วลบที่เหลือ
 *   { op:'set_dhash', items:[{deedId, studentId, dhash}] }  เก็บลายนิ้วมือความคล้ายของรูปเก่า (คำนวณในเบราว์เซอร์ผู้ตรวจ)
 * ชื่อผู้ตรวจที่บันทึกลงชีตมาจาก token ที่ตรวจแล้ว ไม่ใช่จากข้อความที่ส่งมา
 */
import { CORS, json, staffOf, validSid, callGas } from './_gateway.js';
import { RULES, normDate } from './_deed_rules.js';
import { fetchDeeds, DEFAULT_GAS_URL } from './_deed_store.js';

export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });

const validDeedId = (s) => /^[A-Za-z0-9_\-]{3,80}$/.test(String(s || ''));

async function legacyGas(env, payload) {
  try {
    const r = await fetch((env && env.GAS_URL) || DEFAULT_GAS_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), redirect: 'follow',
    });
    return await r.json().catch(() => ({ status: 'error', code: 'GAS_BAD_RESPONSE' }));
  } catch (_) { return { status: 'error', code: 'GAS_UNREACHABLE' }; }
}

export async function onRequestPost({ request, env }) {
  const me = await staffOf(request, env);
  if (!me) return json({ status: 'error', code: 'FORBIDDEN', message: 'ต้องยืนยันตัวตนผู้ตรวจก่อน' }, 403);
  let body = {};
  try { body = await request.json(); } catch (_) { return json({ status: 'error', code: 'BAD_JSON' }, 400); }
  const who = me.name;

  if (body.op === 'set_dhash') {
    const items = (Array.isArray(body.items) ? body.items : []).slice(0, 80)
      .filter(i => validDeedId(i.deedId) && validSid(i.studentId) && /^[0-9a-f]{16}$/.test(String(i.dhash || '')));
    if (!items.length) return json({ status: 'error', code: 'NO_ITEMS' }, 400);
    const r = await callGas(env, { action: 'deedphoto_setdhash', items });
    return json(r, r && r.status === 'success' ? 200 : 503);
  }

  const sid = String(body.studentId || '').trim();
  if (!validSid(sid)) return json({ status: 'error', code: 'BAD_STUDENT_ID' }, 400);

  if (body.op === 'delete') {
    const deedId = String(body.deedId || '');
    if (!validDeedId(deedId)) return json({ status: 'error', code: 'BAD_DEED_ID' }, 400);
    const reason = String(body.reason || 'ลบรายการซ้ำ/เกินเพดานจากรายงานตรวจ').slice(0, 200);
    const r = await legacyGas(env, { action: 'delete_deed', deedId, studentId: sid, role: 'teacher', deletedBy: who, reason });
    return json({ status: r && r.status === 'success' ? 'success' : 'error', by: who, gas: r }, r && r.status === 'success' ? 200 : 502);
  }

  if (body.op === 'merge') {
    const keepId = String(body.keepId || '');
    const ids = [...new Set((body.deedIds || []).map(String))].filter(validDeedId);
    if (!validDeedId(keepId) || !ids.includes(keepId) || ids.length < 2) return json({ status: 'error', code: 'BAD_MERGE' }, 400);
    const deeds = await fetchDeeds(env, sid);
    if (!deeds) return json({ status: 'error', code: 'DEEDS_UNAVAILABLE' }, 503);
    const group = ids.map(id => deeds.find(d => String(d.id) === id)).filter(Boolean);
    if (group.length !== ids.length) return json({ status: 'error', code: 'DEED_NOT_FOUND' }, 404);
    const cat = Number(group[0].categoryId), date = normDate(group[0].activityDate);
    if (group.some(d => Number(d.categoryId) !== cat || normDate(d.activityDate) !== date)) return json({ status: 'error', code: 'NOT_SAME_GROUP', message: 'รวมได้เฉพาะหมวดเดียวกัน วันเดียวกัน' }, 400);
    const r = RULES[cat] || {};
    const cap = r.perDay || r.perEntry || Infinity;
    const total = group.reduce((s, d) => s + (parseFloat(d.hours) || 0), 0);
    const hours = Math.min(total, cap);
    const keep = group.find(d => String(d.id) === keepId);
    const others = group.filter(d => String(d.id) !== keepId);
    const desc = [keep, ...others].map(d => String(d.description || '').trim()).filter((v, i, a) => v && a.indexOf(v) === i).join(' / ').slice(0, 500);
    const ed = await legacyGas(env, { action: 'edit_deed', deedId: keepId, studentId: sid, role: 'teacher', editedBy: who, updates: { hours, description: desc } });
    if (!ed || ed.status !== 'success') return json({ status: 'error', code: 'EDIT_FAILED', gas: ed }, 502);
    const removed = [];
    for (const d of others) {
      const del = await legacyGas(env, { action: 'delete_deed', deedId: String(d.id), studentId: sid, role: 'teacher', deletedBy: who, reason: `รวมกับรายการ ${keepId} (ลงซ้ำวันเดียวกัน)` });
      removed.push({ id: String(d.id), ok: !!(del && del.status === 'success') });
    }
    return json({ status: removed.every(x => x.ok) ? 'success' : 'partial', by: who, keepId, hours, capped: total > cap, removed });
  }

  return json({ status: 'error', code: 'BAD_OP' }, 400);
}
