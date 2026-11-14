/**
 * DeedPhoto.gs — เก็บรูปหลักฐานกิจกรรมความดี (หมวด 1–9) ไว้บน Google Drive
 *
 * ปัญหาเดิม: รูปเป็น base64 อยู่ใน localStorage ของเครื่องที่ส่งเท่านั้น (ชีตรับไม่ได้เพราะยาวเกิน)
 * เปิดจากเครื่องอื่น/เบราว์เซอร์อื่น เช่น ส่งใน LINE แล้วพิมพ์ใน Chrome → ใบบันทึกไม่มีรูป
 *
 * DeedPhotos_2569  1 แถว/รายการ: Deed ID, รหัสนักเรียน, Drive File ID, วันที่อัปโหลด
 * ไฟล์ใน Drive เป็น PRIVATE เสมอ (ข้อมูลส่วนบุคคล) — ผู้ใช้ดูผ่าน /api/deed_photo ที่ Cloudflare
 * เรียกผ่าน runTrackerHandle_ (ตรวจ gatewayKey แล้ว)
 */
const DEED_PHOTO_SHEET = 'DeedPhotos_2569';
const DEED_PHOTO_HEADERS = ['Deed ID', 'รหัสนักเรียน', 'Drive File ID', 'อัปโหลดเมื่อ'];
const DEED_PHOTO_FOLDER = 'หลักฐานความดี_2569';
const DEED_PHOTO_MAX_BYTES = 2500000;

function deedPhotoValid_(sid, deedId) {
  return /^\d{7}$/.test(String(sid || '')) && /^[A-Za-z0-9_\-]{6,80}$/.test(String(deedId || ''));
}

function deedPhotoApiPath_(deedId, sid) {
  return '/api/deed_photo?deedId=' + encodeURIComponent(deedId) + '&studentId=' + encodeURIComponent(sid);
}

function deedPhotoFind_(sh, deedId, sid) {
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const rows = sh.getRange(2, 1, last - 1, 2).getValues();
  for (let i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i][0]) === deedId && String(rows[i][1]) === sid) return i + 2;
  }
  return -1;
}

function deedPhotoPut_(data) {
  const sid = String(data.studentId || '').trim();
  const deedId = String(data.deedId || '').trim();
  if (!deedPhotoValid_(sid, deedId)) return { status: 'error', code: 'PHOTO_BAD_ID' };
  const m = String(data.image || '').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+\/=]+)$/);
  if (!m) return { status: 'error', code: 'PHOTO_BAD_IMAGE' };
  const bytes = Utilities.base64Decode(m[2]);
  if (bytes.length > DEED_PHOTO_MAX_BYTES) return { status: 'error', code: 'PHOTO_TOO_LARGE' };

  // ต้องมีรายการนี้ของนักเรียนคนนี้จริงใน Deeds_2569 (กันอัปโหลดรูปผูกกับรายการคนอื่น)
  const ss = runSS_();
  const deeds = ss.getSheetByName('Deeds_2569');
  if (!deeds || deeds.getLastRow() < 2) return { status: 'error', code: 'PHOTO_DEED_NOT_FOUND' };
  const ids = deeds.getRange(2, 1, deeds.getLastRow() - 1, 2).getValues();
  let deedRow = -1;
  for (let i = ids.length - 1; i >= 0; i--) {
    if (String(ids[i][0]) === deedId && String(ids[i][1]).trim() === sid) { deedRow = i + 2; break; }
  }
  if (deedRow < 0) return { status: 'error', code: 'PHOTO_DEED_NOT_FOUND' };

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = runSheet_(DEED_PHOTO_SHEET, DEED_PHOTO_HEADERS);
    const existing = deedPhotoFind_(sh, deedId, sid);
    if (existing > 0 && data.replace !== true) {
      return { status: 'success', path: deedPhotoApiPath_(deedId, sid), existed: true };
    }
    const ext = m[1] === 'image/png' ? 'png' : m[1] === 'image/webp' ? 'webp' : 'jpg';
    const blob = Utilities.newBlob(bytes, m[1], deedId + '.' + ext);
    const root = DriveApp.getFolderById(ROOT_FOLDER_ID);
    const sub = function (parent, name) { const it = parent.getFoldersByName(name); return it.hasNext() ? it.next() : parent.createFolder(name); };
    const file = sub(sub(root, DEED_PHOTO_FOLDER), sid).createFile(blob);
    file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
    const row = [runLiteral_(deedId), runLiteral_(sid), file.getId(), new Date()];
    if (existing > 0) sh.getRange(existing, 1, 1, 4).setValues([row]);
    else sh.appendRow(row);
    // ให้ทุกเครื่องเห็นรูปเดียวกัน: เก็บที่อยู่รูปในคอลัมน์ "รูปหลักฐาน URL" ของรายการ
    deeds.getRange(deedRow, 12).setValue(deedPhotoApiPath_(deedId, sid));
    return { status: 'success', path: deedPhotoApiPath_(deedId, sid) };
  } finally {
    lock.releaseLock();
  }
}

function deedPhotoGet_(data) {
  const sid = String(data.studentId || '').trim();
  const deedId = String(data.deedId || '').trim();
  if (!deedPhotoValid_(sid, deedId)) return { status: 'error', code: 'PHOTO_BAD_ID' };
  const sh = runSS_().getSheetByName(DEED_PHOTO_SHEET);
  if (!sh) return { status: 'error', code: 'PHOTO_NOT_FOUND' };
  const row = deedPhotoFind_(sh, deedId, sid);
  if (row < 0) return { status: 'error', code: 'PHOTO_NOT_FOUND' };
  const fileId = String(sh.getRange(row, 3).getValue());
  const blob = DriveApp.getFileById(fileId).getBlob();
  return { status: 'success', mime: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()) };
}

function deedPhotoHandle_(data) {
  switch (data.action) {
    case 'deedphoto_put': return deedPhotoPut_(data);
    case 'deedphoto_get': return deedPhotoGet_(data);
    default: return { status: 'error', code: 'PHOTO_ACTION_UNKNOWN' };
  }
}
