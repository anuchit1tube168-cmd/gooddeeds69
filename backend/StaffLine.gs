/**
 * StaffLine.gs — รายชื่อผู้ตรวจ (อาจารย์) ที่เข้าระบบด้วย LINE
 * ชีต StaffLine_2569: LINE User ID | ชื่อ (จาก LINE) | สถานะ (pending/active/revoked) | ขอเมื่อ | อนุมัติ/เปลี่ยนโดย | เปลี่ยนเมื่อ
 * เรียกจาก Cloudflare ผ่าน runTrackerHandle_ (ตรวจ gatewayKey แล้ว) — ยืนยันตัวตน LINE ทำที่ Cloudflare ก่อนส่งมา
 */
var STAFF_SHEET_ = 'StaffLine_2569';
var STAFF_HEADERS_ = ['LINE User ID', 'ชื่อ (จาก LINE)', 'สถานะ', 'ขอเมื่อ', 'อนุมัติ/เปลี่ยนโดย', 'เปลี่ยนเมื่อ'];

function staffValidUid_(uid) { return /^U[0-9a-f]{32}$/.test(String(uid || '')); }

function staffFind_(sh, uid) {
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === uid) return i + 2;
  return -1;
}

function staffRow_(sh, r) {
  var v = sh.getRange(r, 1, 1, 6).getValues()[0];
  return { lineUserId: String(v[0]), name: String(v[1]), status: String(v[2]), requestedAt: v[3] ? new Date(v[3]).toISOString() : '', by: String(v[4] || ''), changedAt: v[5] ? new Date(v[5]).toISOString() : '' };
}

function staffHandle_(data) {
  var sh = runSheet_(STAFF_SHEET_, STAFF_HEADERS_);
  var uid = String(data.lineUserId || '');
  switch (data.action) {
    case 'staff_get': {
      if (!staffValidUid_(uid)) return { status: 'error', code: 'STAFF_BAD_ID' };
      var r = staffFind_(sh, uid);
      return { status: 'success', staff: r > 0 ? staffRow_(sh, r) : null };
    }
    case 'staff_request': {
      if (!staffValidUid_(uid)) return { status: 'error', code: 'STAFF_BAD_ID' };
      var lock = LockService.getScriptLock(); lock.waitLock(10000);
      try {
        var r2 = staffFind_(sh, uid);
        if (r2 > 0) return { status: 'success', staff: staffRow_(sh, r2) };
        sh.appendRow([runLiteral_(uid), runLiteral_(String(data.name || '').slice(0, 80)), 'pending', new Date(), '', '']);
        return { status: 'success', staff: staffRow_(sh, sh.getLastRow()), created: true };
      } finally { lock.releaseLock(); }
    }
    case 'staff_list': {
      var last = sh.getLastRow();
      var list = [];
      for (var i = 2; i <= last; i++) list.push(staffRow_(sh, i));
      return { status: 'success', staff: list };
    }
    case 'staff_set': {
      if (!staffValidUid_(uid)) return { status: 'error', code: 'STAFF_BAD_ID' };
      var st = String(data.status || '');
      if (['active', 'revoked', 'pending'].indexOf(st) < 0) return { status: 'error', code: 'STAFF_BAD_STATUS' };
      var r3 = staffFind_(sh, uid);
      if (r3 < 0) return { status: 'error', code: 'STAFF_NOT_FOUND' };
      sh.getRange(r3, 3, 1, 4).setValues([[st, sh.getRange(r3, 4).getValue(), runLiteral_(String(data.by || '').slice(0, 80)), new Date()]]);
      return { status: 'success', staff: staffRow_(sh, r3) };
    }
    default: return { status: 'error', code: 'STAFF_ACTION_UNKNOWN' };
  }
}
