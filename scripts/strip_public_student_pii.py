#!/usr/bin/env python3
"""ตัดข้อมูลส่วนบุคคลออกจากไฟล์รายชื่อนักเรียนที่ deploy ขึ้นเว็บสาธารณะ (frontend/data/)

เหตุผล: ไฟล์ใน frontend/data/ ถูกเสิร์ฟให้ใครก็เปิดดูได้ จึงต้องไม่มีรหัสผ่าน/เบอร์/อีเมล/chat id
ไฟล์ต้นฉบับครบถ้วนยังอยู่ที่ data/ (ไม่ deploy) และสำรองไว้ที่ data/private/ ก่อนเขียนทับ
ต้องรันสคริปต์นี้ซ้ำทุกครั้งหลังสคริปต์อื่นสร้าง frontend/data/students_data.js ใหม่
"""
import json, re, shutil, sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / "frontend" / "data"
SENSITIVE = {"password", "phone", "email", "telegram_chat_id"}


def strip(rows):
    if not isinstance(rows, list):
        raise ValueError("รูปแบบข้อมูลไม่ใช่ list")
    return [{k: v for k, v in r.items() if k not in SENSITIVE} for r in rows]


def main():
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = ROOT / "data" / "private" / f"public_students_backup_{stamp}"
    backup.mkdir(parents=True, exist_ok=True)

    js = PUB / "students_data.js"
    text = js.read_text(encoding="utf-8")
    m = re.search(r"const STUDENTS_DATA = (\[.*?\n\]);", text, re.S)
    if not m:
        sys.exit("ไม่พบ STUDENTS_DATA ใน students_data.js — หยุดเพื่อไม่ให้ไฟล์เสีย")
    rows = json.loads(m.group(1))
    shutil.copy2(js, backup / js.name)
    clean = strip(rows)
    new = text[:m.start(1)] + json.dumps(clean, ensure_ascii=False, indent=2) + text[m.end(1):]
    js.write_text(new, encoding="utf-8")

    sj = PUB / "students.json"
    if sj.exists():
        shutil.copy2(sj, backup / sj.name)
        sj.write_text(json.dumps(strip(json.loads(sj.read_text(encoding="utf-8"))), ensure_ascii=False, indent=2), encoding="utf-8")

    # ตรวจซ้ำว่าไม่เหลือฟิลด์อ่อนไหว
    for f in (js, sj):
        if f.exists():
            t = f.read_text(encoding="utf-8")
            left = [k for k in SENSITIVE if re.search(rf'"{k}"\s*:', t)]
            if left:
                sys.exit(f"ยังพบฟิลด์ {left} ใน {f.name}")
    print(f"OK: {len(clean)} คน | backup: {backup.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
