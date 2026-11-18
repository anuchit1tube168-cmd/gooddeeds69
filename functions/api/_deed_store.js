// อ่านรายการความดีจากชีต (ผ่าน Apps Script) — ไฟล์ขึ้นต้น _ จึงไม่เป็น route
// Apps Script ต้องได้ gatewayKey ถึงจะคืนรายการ (ปิดการดึงข้อมูลทุกคนจากภายนอก) จึงเรียกแบบ POST ฝั่งเซิร์ฟเวอร์เท่านั้น
export const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwaG05E5dNew4dsf0vD8LBLuWdbThXIkMih1UI8Ba9rnRBCK4xmnlArzZdwtmqV9vOdcw/exec';

const toList = (data) => Array.isArray(data) ? data
  : (data && Array.isArray(data.deeds) ? data.deeds : (data && Array.isArray(data.data) ? data.data : null));

// คืน array หรือ null เมื่ออ่านไม่ได้ (ผู้เรียกตัดสินใจเองว่าจะให้ผ่านหรือไม่)
export async function fetchDeeds(env, studentId, timeoutMs = 8000) {
  const gasUrl = (env && env.GAS_URL) || DEFAULT_GAS_URL;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'getDeeds', studentId: studentId || '', gatewayKey: (env && env.RUN_GATEWAY_KEY) || '' }),
      redirect: 'follow',
      signal: ctrl.signal,
    });
    if (!resp.ok) return null;
    const list = toList(await resp.json());
    if (!list) return null;
    return studentId ? list.filter(d => String(d.studentId || d.student_id || '') === String(studentId)) : list;
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// สำหรับหน้าอันดับ/สถิติที่ทุกคนเห็น: ตัดรายละเอียด สถานที่ รูป ผู้รับรอง ออก เหลือแค่ตัวเลขที่ใช้จัดอันดับ
const PUBLIC_FIELDS = ['id', 'studentId', 'student_id', 'categoryId', 'category_id', 'hours', 'status', 'activityDate', 'submittedAt', 'studentName', 'student_name', 'classYear', 'class_year'];
export function publicDeed(d) {
  const o = {};
  for (const k of PUBLIC_FIELDS) if (d[k] !== undefined) o[k] = d[k];
  return o;
}
