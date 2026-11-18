/**
 * รายการความดีทั้งระบบ
 * - อาจารย์ (X-Admin-Key ถูกต้อง) → รายการเต็ม
 * - คนอื่น → เฉพาะตัวเลขสำหรับหน้าอันดับ (ไม่มีรายละเอียด สถานที่ รูป ผู้รับรอง)
 */
import { CORS, json, staffOf } from './_gateway.js';
import { fetchDeeds, publicDeed } from './_deed_store.js';

export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });

export async function onRequestGet({ request, env }) {
  const admin = !!(await staffOf(request, env));
  const deeds = await fetchDeeds(env, '', 20000);
  if (!deeds) return json({ status: 'error', code: 'DEEDS_UNAVAILABLE' }, 503);
  const body = admin ? deeds : deeds.map(publicDeed);
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      ...CORS,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': admin ? 'private, no-store' : 'public, max-age=30, stale-while-revalidate=60',
      'Vary': 'X-Admin-Key, X-Staff-Token',
      'X-Deeds-Scope': admin ? 'full' : 'public',
    },
  });
}
