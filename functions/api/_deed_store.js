// อ่านรายการความดีจากชีต (ผ่าน Apps Script) สำหรับตรวจเพดาน/ซ้ำ — ไฟล์ขึ้นต้น _ จึงไม่เป็น route
export const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwaG05E5dNew4dsf0vD8LBLuWdbThXIkMih1UI8Ba9rnRBCK4xmnlArzZdwtmqV9vOdcw/exec';

// คืน array หรือ null เมื่ออ่านไม่ได้ (ผู้เรียกตัดสินใจเองว่าจะให้ผ่านหรือไม่)
export async function fetchDeeds(env, studentId, timeoutMs = 8000) {
  const gasUrl = (env && env.GAS_URL) || DEFAULT_GAS_URL;
  const url = studentId ? `${gasUrl}?action=getDeeds&studentId=${encodeURIComponent(studentId)}` : `${gasUrl}?action=getDeeds`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
    if (!resp.ok) return null;
    const data = await resp.json();
    const list = Array.isArray(data) ? data : (data && Array.isArray(data.deeds) ? data.deeds : null);
    if (!list) return null;
    return studentId ? list.filter(d => String(d.studentId || d.student_id || '') === String(studentId)) : list;
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
