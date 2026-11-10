#!/usr/bin/env python3
"""
update_acting_commanders_2569.py
อัปเดตตำแหน่งผู้ช่วย นพอ.บังคับบัญชา ทำการแทน นพอ.บังคับบัญชา ปี ๖๙
ตามคำสั่งวิทยาลัยพยาบาลทหารอากาศ กรมแพทย์ทหารอากาศ (เฉพาะ) ที่ ๖๓/๒๕๖๙
สั่ง ณ วันที่ ๔ พฤศจิกายน พ.ศ. ๒๕๖๙
"""

import json
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
FRONTEND_DATA_DIR = os.path.join(BASE_DIR, "frontend", "data")

# รายชื่อตามคำสั่งเป็นข้อมูลส่วนบุคคล เก็บที่ data/private/ (ไม่ขึ้น GitHub)
APPOINTMENTS_FILE = os.path.join(BASE_DIR, "data", "private", "acting_commanders_2569.json")
if not os.path.exists(APPOINTMENTS_FILE):
    sys.exit(f"ไม่พบ {APPOINTMENTS_FILE} — ขอไฟล์จากผู้ดูแลระบบ")
with open(APPOINTMENTS_FILE, encoding="utf-8") as _f:
    APPOINTMENTS = json.load(_f)

ORDER_NOTE = "ผู้ช่วย นพอ.บังคับบัญชา ทำการแทน นพอ.บังคับบัญชา ตามคำสั่ง วพอ.พอ. (เฉพาะ) ที่ ๖๓/๒๕๖๙ สั่ง ณ ๔ พ.ย. ๖๙"

def main():
    json_path = os.path.join(DATA_DIR, "students.json")
    with open(json_path, "r", encoding="utf-8") as f:
        students = json.load(f)

    print(f"Loaded {len(students)} students from {json_path}")

    appt_map = {a["student_id"]: a for a in APPOINTMENTS}
    updated_count = 0

    print("\n" + "="*80)
    print("อัปเดตตำแหน่งผู้ช่วย นพอ.บังคับบัญชา ทำการแทน นพอ.บังคับบัญชา ปี ๖๙ (คำสั่งเฉพาะที่ ๖๓/๒๕๖๙)")
    print("="*80)

    for s in students:
        sid = str(s.get("student_id", "")).strip()
        if sid in appt_map:
            appt = appt_map[sid]
            old_pos = s.get("position", "-")
            new_pos = appt["new_position"]

            s["position"] = new_pos
            existing_note = s.get("note", "")
            if ORDER_NOTE not in existing_note:
                s["note"] = f"{ORDER_NOTE}" if not existing_note else f"{existing_note} | {ORDER_NOTE}"

            updated_count += 1
            print(f"[{updated_count:02d}] รหัส {sid} | {appt['name']}")
            print(f"     ตำแหน่งเดิม : {old_pos}")
            print(f"     ตำแหน่งใหม่ : 🎖️ {new_pos}")
            print(f"     คำสั่ง       : {appt['order_item']}")
            print("-" * 80)

    if updated_count != len(APPOINTMENTS):
        print(f"⚠️ คำเตือน: อัปเดตได้ {updated_count} จาก {len(APPOINTMENTS)} คน")
        sys.exit(1)

    # 1. บันทึก data/students.json
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(students, f, ensure_ascii=False, indent=2)
    print(f"\n✅ บันทึก {json_path} เรียบร้อย ({len(students)} รายการ)")

    # 2. บันทึก data/students_data.js และ frontend/data/students_data.js
    js_content = "// Auto-generated student data - DO NOT EDIT MANUALLY\n"
    js_content += "const STUDENTS_DATA = " + json.dumps(students, ensure_ascii=False, indent=2) + ";\n\n"
    js_content += "if (typeof window !== 'undefined') { window.STUDENTS_DATA = STUDENTS_DATA; }\n"
    js_content += "if (typeof globalThis !== 'undefined') { globalThis.STUDENTS_DATA = STUDENTS_DATA; }\n"

    target_js_files = [
        os.path.join(DATA_DIR, "students_data.js"),
        os.path.join(FRONTEND_DATA_DIR, "students_data.js")
    ]

    for p in target_js_files:
        with open(p, "w", encoding="utf-8") as f:
            f.write(js_content)
        print(f"✅ บันทึก {p} เรียบร้อย")

    # ตัดรหัสผ่าน/เบอร์/อีเมลออกจากไฟล์ที่ขึ้นเว็บทุกครั้ง
    import subprocess
    subprocess.run([sys.executable, os.path.join(BASE_DIR, "scripts", "strip_public_student_pii.py")], check=True)

    print("\n🎉 ดำเนินการอัปเดตผู้ช่วย นพอ.บังคับบัญชา ทั้ง 13 คน สำเร็จสมบูรณ์ 100%!")

if __name__ == "__main__":
    main()
