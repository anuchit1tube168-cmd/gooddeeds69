#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_carry_forward.py
ประมวลผลคะแนนสะสมยอดยกมาตามปีการศึกษา (Carry-Forward Hours) ของนักเรียนพยาบาลทหารอากาศ
จากบันทึกทางการของสถาบัน (data/summary_2568_analysis.json)
และเชื่อมโยงกับฐานข้อมูลนักเรียน (students.json / students_data.js)

ผลลัพธ์:
1. data/students.json (เพิ่มฟิลด์ carry_forward)
2. data/students_data.js & frontend/data/students_data.js
3. frontend/data/carry_forward_data.js (lookup map O(1) สำหรับ Frontend ทุกหน้า)
"""
import os
import json

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(DATA_DIR)
SUMMARY_2568 = os.path.join(DATA_DIR, 'summary_2568_analysis.json')
STUDENTS_JSON = os.path.join(DATA_DIR, 'students.json')
STUDENTS_DATA_JS = os.path.join(DATA_DIR, 'students_data.js')
FRONTEND_STUDENTS_DATA_JS = os.path.join(BASE_DIR, 'frontend', 'data', 'students_data.js')
FRONTEND_CF_JS = os.path.join(BASE_DIR, 'frontend', 'data', 'carry_forward_data.js')

def main():
    print("🚀 เริ่มต้นกระบวนการเชื่อมโยงคะแนนสะสมยอดยกมา (Carry-Forward Hours)...")
    
    # 1. โหลดข้อมูลสรุป 2568
    cf_map = {}
    if os.path.exists(SUMMARY_2568):
        with open(SUMMARY_2568, 'r', encoding='utf-8') as f:
            s2568 = json.load(f)
        for s in s2568.get('pass_list', []) + s2568.get('short_list', []):
            sid = str(s.get('student_id', '')).strip()
            if sid:
                hrs = float(s.get('h_official', s.get('h_main', 0.0)))
                cf_map[sid] = round(hrs, 1)
        print(f"📋 โหลดข้อมูลสรุปปี 2568 สำเร็จ: {len(cf_map)} คน")
    else:
        print(f"⚠️ ไม่พบไฟล์ {SUMMARY_2568}")

    # 2. โหลดรายชื่อนักเรียน Master
    with open(STUDENTS_JSON, 'r', encoding='utf-8') as f:
        students = json.load(f)
    print(f"👥 จำนวนนักเรียนทั้งหมด: {len(students)} คน")

    # 3. อัปเดต carry_forward ในรายชื่อนักเรียน
    cohort_stats = {}
    for s in students:
        sid = str(s.get('student_id', '')).strip()
        cy = str(s.get('class_year', ''))
        
        # รุ่น 69 เป็นชั้นปีที่ 1 เริ่มต้นปีการศึกษา 2569 ยอดยกมา = 0
        if cy == '69':
            cf_hours = 0.0
        else:
            cf_hours = cf_map.get(sid, 0.0)
            
        s['carry_forward'] = cf_hours
        
        if cy not in cohort_stats:
            cohort_stats[cy] = {'count': 0, 'total_cf': 0.0, 'has_cf': 0}
        cohort_stats[cy]['count'] += 1
        cohort_stats[cy]['total_cf'] += cf_hours
        if cf_hours > 0:
            cohort_stats[cy]['has_cf'] += 1

    # 4. บันทึก data/students.json
    with open(STUDENTS_JSON, 'w', encoding='utf-8') as f:
        json.dump(students, f, ensure_ascii=False, indent=2)
    print(f"✅ บันทึก {STUDENTS_JSON}")

    # 5. บันทึก students_data.js ทั้งใน data/ และ frontend/data/
    js_content = "// Auto-generated student data - DO NOT EDIT MANUALLY\n"
    js_content += f"const STUDENTS_DATA = {json.dumps(students, ensure_ascii=False, indent=2)};\n\n"
    js_content += "if (typeof window !== 'undefined') { window.STUDENTS_DATA = STUDENTS_DATA; }\n"
    js_content += "if (typeof globalThis !== 'undefined') { globalThis.STUDENTS_DATA = STUDENTS_DATA; }\n"

    for p in [STUDENTS_DATA_JS, FRONTEND_STUDENTS_DATA_JS]:
        with open(p, 'w', encoding='utf-8') as f:
            f.write(js_content)
        print(f"✅ บันทึก {p}")

    # 6. สร้าง frontend/data/carry_forward_data.js
    cf_js = "// Auto-generated Carry-Forward Hours Lookup - DO NOT EDIT MANUALLY\n"
    cf_js += f"const CARRY_FORWARD_HOURS = {json.dumps(cf_map, ensure_ascii=False, indent=2)};\n\n"
    cf_js += "if (typeof window !== 'undefined') { window.CARRY_FORWARD_HOURS = CARRY_FORWARD_HOURS; }\n"
    cf_js += "if (typeof globalThis !== 'undefined') { globalThis.CARRY_FORWARD_HOURS = CARRY_FORWARD_HOURS; }\n"
    with open(FRONTEND_CF_JS, 'w', encoding='utf-8') as f:
        f.write(cf_js)
    print(f"✅ บันทึก {FRONTEND_CF_JS}")

    # 7. สรุปผลรายงาน
    print("\n📊 สรุปยอดคะแนนสะสมยกมาแยกตามรุ่น:")
    for cy in sorted(cohort_stats.keys(), reverse=True):
        stat = cohort_stats[cy]
        avg = (stat['total_cf'] / stat['count']) if stat['count'] > 0 else 0
        print(f"   รุ่น {cy}: {stat['count']} คน | มียอดยกมา: {stat['has_cf']} คน | ยอดรวม: {stat['total_cf']:.1f} ชม. | เฉลี่ย: {avg:.1f} ชม./คน")

if __name__ == '__main__':
    main()
