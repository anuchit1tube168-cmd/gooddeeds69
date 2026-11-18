// ตรวจก่อนส่ง: เพดานชั่วโมง (ครั้ง/วัน/ภาค/ปี) และการลงซ้ำ — หน้าบันทึกความดีเรียกก่อนกดส่ง
// GET /api/deed_check?studentId=&categoryId=&hours=&activityDate=&description=
// hours=0 → ขอดูโควตาคงเหลืออย่างเดียว
import { CORS, json, staffOf, validSid } from './_gateway.js';
import { checkDeed, usageOf, RULES } from './_deed_rules.js';
import { fetchDeeds } from './_deed_store.js';

export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });

export async function onRequestGet({ request, env }) {
  const q = new URL(request.url).searchParams;
  const studentId = String(q.get('studentId') || '').trim();
  if (!validSid(studentId)) return json({ status: 'error', code: 'BAD_STUDENT_ID' }, 400);
  // ดูได้เฉพาะของตัวเอง (หรือผู้ดูแล)
  const own = String(request.headers.get('X-GoodDeeds-Student-Id') || '').trim() === studentId;
  if (!own && !(await staffOf(request, env))) return json({ status: 'error', code: 'FORBIDDEN' }, 403);
  const all = !q.get('categoryId');
  const categoryId = Number(q.get('categoryId'));
  if (!all && !RULES[categoryId]) return json({ status: 'error', code: 'CATEGORY_INVALID' }, 400);
  const activityDate = q.get('activityDate') || new Date().toISOString();

  const deeds = await fetchDeeds(env, studentId);
  if (!deeds) return json({ status: 'unavailable', code: 'DEEDS_UNAVAILABLE', message: 'ตรวจโควตาจากเซิร์ฟเวอร์ไม่ได้ชั่วคราว ระบบจะตรวจอีกครั้งตอนส่ง' }, 503);

  // ไม่ระบุหมวด → โควตาทุกหมวดที่มีเพดานภาค/ปี (หน้า "โควตาของฉัน")
  if (all) {
    const quotas = Object.keys(RULES).map(Number)
      .filter(c => RULES[c].perTerm || RULES[c].perYear || RULES[c].maxCountYear)
      .map(c => { const u = usageOf(deeds, c, activityDate); delete u.bloodDates; return u; });
    return json({ status: 'success', quotas });
  }

  const hours = Number(q.get('hours')) || 0;
  if (!hours) return json({ status: 'success', ok: true, usage: usageOf(deeds, categoryId, activityDate) });
  const r = checkDeed(deeds, { categoryId, hours, activityDate, description: q.get('description') || '' });
  return json({ status: 'success', ...r });
}
