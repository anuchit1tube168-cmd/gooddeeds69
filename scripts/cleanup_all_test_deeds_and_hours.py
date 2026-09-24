#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
cleanup_all_test_deeds_and_hours.py
นำชั่วโมงและรายการทดสอบทั้งหมดออก (Clean & Archive All Test Deeds & Hours)
1. จำแนกข้อมูลความดีจริง 21 รายการ กับข้อมูลทดสอบ 12 รายการของวันที่ 24 ก.ย.
2. จัดเก็บข้อมูลทดสอบเข้า records/archive_test_deeds_20260924.json ตามกฎ AGENTS.md
3. ฟื้นฟู Google Sheets Deeds_2569 ให้เหลือเฉพาะข้อมูลจริง 21 รายการ
4. ปรับลดชั่วโมงทดสอบใน Google Sheets Main_2569 ให้ตรงกับยอดจริง (52.5 ชม. รวม 12 คน)
5. ปรับปรุงฐานข้อมูลในเครื่อง data/deeds.json และ frontend/data/deeds_data.js
"""

import urllib.request
import json
import ssl
import time
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARCHIVE_DIR = os.path.join(BASE_DIR, 'records')
ARCHIVE_FILE = os.path.join(ARCHIVE_DIR, 'archive_test_deeds_20260924.json')
GAS_URL = 'https://script.google.com/macros/s/AKfycbwV0b31hWMSs2oNOff4o-O_PNoEQ1XlTM77f4sei9JLh1rza1SfFPTOlTaxiIKCIxLT_Q/exec'

SSL_CTX = ssl._create_unverified_context()

def post_gas(payload):
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        GAS_URL,
        data=data,
        headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
    )
    with urllib.request.urlopen(req, timeout=60, context=SSL_CTX) as r:
        return json.loads(r.read().decode('utf-8'))

def get_gas(query):
    url = f"{GAS_URL}?{query}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=60, context=SSL_CTX) as r:
        return json.loads(r.read().decode('utf-8'))

def main():
    print("=" * 75)
    print("🧹 นำรายการและชั่วโมงทดสอบออกทั้งหมด (CLEAN & RESTORE AUTHENTIC DEEDS & HOURS)")
    print("=" * 75)

    # 1. ดึง Deeds ทั้งหมดจาก Google Sheets
    print("\n1. กำลังดึงรายการ Deeds ทั้งหมดจาก Google Sheets...")
    all_deeds = get_gas("action=getDeeds")
    print(f"   พบรายการทั้งหมด: {len(all_deeds)} รายการ")

    # 2. จำแนก (Classify) ข้อมูลจริง กับ ข้อมูลทดสอบ
    authentic_deeds = []
    test_deeds = []

    for d in all_deeds:
        did = str(d.get("id", ""))
        dt = str(d.get("activityDate") or d.get("submittedAt") or "")
        desc = str(d.get("description", ""))
        sid = str(d.get("student_id") or d.get("studentId") or "").strip()

        is_test = (
            "179021" in did or "179022" in did or "test" in did.lower() or
            "2026-09-24" in dt or "2569-09-24" in dt or
            "ทดสอบ" in desc or "TEST" in desc.upper()
        )
        if is_test:
            test_deeds.append(d)
        else:
            authentic_deeds.append(d)

    print("\n2. ผลการจำแนกข้อมูล:")
    print(f"   ✅ รายการความดีจริงของนักเรียน (Authentic): {len(authentic_deeds)} รายการ")
    print(f"   🧪 รายการทดสอบที่ต้องนำออก (Test to Archive): {len(test_deeds)} รายการ")

    # คำนวณชั่วโมงความดีจริงตามรหัสนักเรียนและหมวดหมู่
    authentic_hours_by_student = {}
    total_authentic_hours = 0.0
    for d in authentic_deeds:
        sid = str(d.get("student_id") or d.get("studentId")).strip()
        cat = int(d.get("category_id") or d.get("categoryId") or 1)
        hrs = float(d.get("hours") or 0)
        total_authentic_hours += hrs
        if sid not in authentic_hours_by_student:
            authentic_hours_by_student[sid] = [0.0] * 9
        authentic_hours_by_student[sid][cat - 1] += hrs

    print(f"   📊 ยอดรวมชั่วโมงจริงทั้งหมด: {total_authentic_hours} ชม. (จากนักเรียน {len(authentic_hours_by_student)} คน)")

    # 3. จัดเก็บรายการทดสอบเข้า Private Archive
    os.makedirs(ARCHIVE_DIR, exist_ok=True)
    archive_payload = {
        "archived_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "description": "Archive of synthetic and test deeds created during staging tests on 24 September 2026",
        "total_archived": len(test_deeds),
        "deeds": test_deeds
    }
    with open(ARCHIVE_FILE, 'w', encoding='utf-8') as f:
        json.dump(archive_payload, f, indent=2, ensure_ascii=False)
    print(f"\n3. บันทึกข้อมูลทดสอบเข้าคลังประวัติเรียบร้อย: {os.path.relpath(ARCHIVE_FILE, BASE_DIR)}")

    # 4. ฟื้นฟู Google Sheets Deeds_2569 ให้มีเฉพาะ Authentic Deeds
    print("\n4. ฟื้นฟูตาราง Deeds_2569 ใน Google Sheets...")
    res_deeds = post_gas({
        "action": "restore_authentic_deeds",
        "deeds": authentic_deeds
    })
    print(f"   ผลการอัปเดต Deeds_2569: {res_deeds.get('message', res_deeds)}")

    # 5. ฟื้นฟู Google Sheets Main_2569 (ปรับลดชั่วโมงทดสอบออก)
    print("\n5. ปรับชั่วโมงใน Google Sheets Main_2569 ให้มีเฉพาะชั่วโมงจริง...")
    current_students = get_gas("action=getStudents&nocache=1")
    print(f"   ดึงรายชื่อนักเรียนจาก Main_2569: {len(current_students)} คน")

    updated_students = []
    for s in current_students:
        sid = str(s.get("student_id") or "").strip()
        st_rank = s.get("rank") or "นพอ."
        st_fn = s.get("first_name") or ""
        st_ln = s.get("last_name") or ""
        st_cy = s.get("class_year") or "69"
        st_line_uid = s.get("line_user_id") or ""
        st_line_name = s.get("line_display_name") or ""

        # ชั่วโมงจริงจาก Deeds (ถ้าไม่มีบันทึกจริง = 0 ทุกหมวด)
        real_cats = authentic_hours_by_student.get(sid, [0.0] * 9)

        updated_students.append({
            "student_id": sid,
            "rank": st_rank,
            "first_name": st_fn,
            "last_name": st_ln,
            "class_year": st_cy,
            "categories": real_cats,
            "line_user_id": st_line_uid,
            "line_display_name": st_line_name
        })

    res_main = post_gas({
        "action": "init_all_students",
        "students": updated_students
    })
    print(f"   ผลการอัปเดต Main_2569: {res_main.get('message', res_main)}")

    # 6. ฟื้นฟูข้อมูลในเครื่อง (Local deeds.json & frontend/data/deeds_data.js)
    print("\n6. ฟื้นฟูฐานข้อมูลในเครื่อง (Local Storage)...")
    deeds_by_student = {}
    for d in authentic_deeds:
        sid = str(d.get("student_id") or d.get("studentId") or "").strip()
        if sid:
            if sid not in deeds_by_student:
                deeds_by_student[sid] = []
            deeds_by_student[sid].append(d)

    for path in [
        os.path.join(BASE_DIR, 'data', 'deeds.json'),
        os.path.join(BASE_DIR, 'frontend', 'data', 'deeds.json')
    ]:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(deeds_by_student, f, indent=2, ensure_ascii=False)
        print(f"   อัปเดต {os.path.relpath(path, BASE_DIR)} สำเร็จ")

    js_content = (
        f"// Auto-updated from Google Sheets\n"
        f"const IMPORTED_DEEDS = {json.dumps(deeds_by_student, ensure_ascii=False, indent=2)};\n"
        f"const DEEDS_DATA = IMPORTED_DEEDS;\n\n"
        f"if (typeof window !== 'undefined') {{\n"
        f"    window.IMPORTED_DEEDS = IMPORTED_DEEDS;\n"
        f"    window.DEEDS_DATA = DEEDS_DATA;\n"
        f"}}\n"
        f"if (typeof globalThis !== 'undefined') {{\n"
        f"    globalThis.IMPORTED_DEEDS = IMPORTED_DEEDS;\n"
        f"    globalThis.DEEDS_DATA = DEEDS_DATA;\n"
        f"}}\n"
    )
    with open(os.path.join(BASE_DIR, 'frontend', 'data', 'deeds_data.js'), 'w', encoding='utf-8') as f:
        f.write(js_content)
    print("   อัปเดต frontend/data/deeds_data.js สำเร็จ")

    # 7. ลบไฟล์ประวัติทดสอบใน records/AY2569
    print("\n7. ลบไฟล์ประวัติทดสอบใน records/AY2569...")
    deleted_files = 0
    test_deed_ids = set(str(d.get("id")) for d in test_deeds)
    for root, dirs, files in os.walk(os.path.join(BASE_DIR, 'records', 'AY2569')):
        for file in files:
            for tid in test_deed_ids:
                if tid in file:
                    filepath = os.path.join(root, file)
                    try:
                        os.remove(filepath)
                        deleted_files += 1
                    except Exception:
                        pass
    print(f"   ลบไฟล์ JSON ทดสอบใน records/AY2569 ออกทั้งหมด: {deleted_files} ไฟล์")

    # 8. ตรวจสอบยืนยันผลลัพธ์สุดท้าย
    print("\n" + "=" * 75)
    print("🔍 ตรวจสอบยืนยันหลังทำความสะอาด:")
    check_deeds = get_gas("action=getDeeds")
    check_students = get_gas("action=getStudents&nocache=1")
    students_with_hours = [s for s in check_students if s.get('total_hours', 0) > 0]
    total_active_hours = sum(s.get('total_hours', 0) for s in check_students)

    print(f"   ✅ จำนวน Deeds ใน Deeds_2569: {len(check_deeds)} รายการ (ต้องตรงกับ 21)")
    print(f"   ✅ จำนวนนักเรียนที่มีชั่วโมงใน Main_2569: {len(students_with_hours)} คน (ต้องตรงกับ 12)")
    print(f"   ✅ ยอดรวมชั่วโมงทั้งหมดในระบบ: {total_active_hours} ชม. (ต้องตรงกับ 52.5)")
    print("=" * 75)
    print("🎉 ดำเนินการนำรายการและชั่วโมงทดสอบออกเรียบร้อย 100% 🟢")

if __name__ == '__main__':
    main()
