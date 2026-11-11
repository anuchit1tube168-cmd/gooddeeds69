#!/usr/bin/env python3
"""เตรียมโค้ด Apps Script ที่ใช้งานจริงก่อน clasp push

ใช้: python3 scripts/build_live_gas.py <โฟลเดอร์ที่ clasp pull มาแล้ว>
- ใช้โค้ดที่ดึงจาก Apps Script จริงเป็นฐานเสมอ (ไม่ทับงานที่แก้ใน editor)
- แทรก hook หมวด 10 ใน doPost ครั้งเดียว (ถ้ามีแล้วไม่แทรกซ้ำ)
- คัดลอก backend/RunTracker.gs → RunTracker.js
- สร้าง RunKey.js จาก data/private/run_keys_DO_NOT_SHARE.txt (ไม่อยู่ใน GitHub)
"""
import re, sys, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HOOK_MARK = "runTrackerHandle_(params)"
HOOK = """  // หมวด 10 วิ่งเพื่อสุขภาพ (RunTracker.js) — ตรวจ gatewayKey ภายใน handler
  if (params && /^(run_|fitness_)/.test(String(params.action || ''))) {
    return ContentService.createTextOutput(JSON.stringify(runTrackerHandle_(params))).setMimeType(ContentService.MimeType.JSON);
  }

"""

def main():
    if len(sys.argv) != 2:
        sys.exit("ต้องระบุโฟลเดอร์ที่ clasp pull มา")
    d = Path(sys.argv[1])
    code = d / "Code.js"
    if not code.exists():
        sys.exit("ไม่พบ Code.js ในโปรเจกต์ที่ดึงมา — หยุด")
    s = code.read_text(encoding="utf-8")
    if HOOK_MARK not in s:
        m = re.search(r"\n(\s*// 1\. Handle Telegram Webhook Callback Query)", s)
        if not m:
            sys.exit("หาโครงสร้าง doPost ที่คาดไว้ไม่เจอ (โค้ดจริงเปลี่ยนไป) — หยุดเพื่อความปลอดภัย")
        s = s[:m.start() + 1] + HOOK + s[m.start() + 1:]
        code.write_text(s, encoding="utf-8")
        print("✅ แทรก hook หมวด 10 ใน doPost")
    else:
        print("✅ มี hook หมวด 10 อยู่แล้ว")
    shutil.copyfile(ROOT / "backend" / "RunTracker.gs", d / "RunTracker.js")
    keyfile = ROOT / "data" / "private" / "run_keys_DO_NOT_SHARE.txt"
    key = ""
    if keyfile.exists():
        for line in keyfile.read_text(encoding="utf-8").splitlines():
            if line.startswith("RUN_GATEWAY_KEY"):
                key = line.split("=", 1)[1].strip()
    if not re.fullmatch(r"[0-9a-f]{32,128}", key):
        sys.exit("ไม่พบ RUN_GATEWAY_KEY ที่ถูกต้องใน data/private/run_keys_DO_NOT_SHARE.txt")
    (d / "RunKey.js").write_text(
        "// สร้างอัตโนมัติตอน deploy — ห้าม commit / ห้ามแชร์\nconst RUN_GATEWAY_KEY_LOCAL = '%s';\n" % key, encoding="utf-8")
    print("✅ เตรียม RunTracker.js + RunKey.js")

if __name__ == "__main__":
    main()
