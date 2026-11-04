#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_carry_forward.py
ประมวลผลคะแนนสะสมยอดยกมาตามปีการศึกษา (Cumulative Carry-Forward Hours) ของนักเรียนพยาบาลทหารอากาศ
จากบันทึกทางการของสถาบัน:
- Master Excel: ความดีปีการศึกษา 2568/02_ฐานข้อมูลกลาง_Master_Database/00_ฐานข้อมูลความดีปี2568_Master_พร้อมยอดยกไปปี69.xlsx
- Fallback JSON: data/summary_2568_analysis.json

กฎเกณฑ์และหลักการคำนวณคะแนนสะสมยกมาตามปีการศึกษา:
1. เกณฑ์ขั้นต่ำประจำแต่ละปีการศึกษา: 50 ชั่วโมง/ปี
2. รุ่น 66 (ชั้นปีที่ 4 ในปีการศึกษา 2569):
   - ผ่านมาแล้ว 3 ปีการศึกษา (2566, 2567, 2568)
   - 2 ปีแรก (2566 + 2567): 50 + 50 = 100 ชม.
   - ปี 2568: ตามที่บันทึกไว้ในฐาน 2568 (ผู้ผ่านเกณฑ์ >= 50 ชม.)
   - รวมขั้นต่ำ 150+ ชม. สำหรับผู้ผ่านเกณฑ์
   - ผู้ดำรงตำแหน่งพิเศษ ("น ต่างๆ"): ได้รับเพิ่ม 25 ชม./ปี (+25 ชม.)
3. รุ่น 67 (ชั้นปีที่ 3 ในปีการศึกษา 2569):
   - ผ่านมาแล้ว 2 ปีการศึกษา (2567, 2568)
   - ปีแรก (2567): 50 ชม.
   - ปี 2568: ตามที่บันทึกไว้ในฐาน 2568 (ผู้ผ่านเกณฑ์ >= 50 ชม.)
   - รวมขั้นต่ำ 100+ ชม. สำหรับผู้ผ่านเกณฑ์
   - ผู้ดำรงตำแหน่งพิเศษ ("น ต่างๆ"): ได้รับเพิ่ม 25 ชม./ปี (+25 ชม.)
4. รุ่น 68 (ชั้นปีที่ 2 ในปีการศึกษา 2569):
   - ผ่านมาแล้ว 1 ปีการศึกษา (2568)
   - ปี 2568: ตามที่บันทึกไว้ในฐาน 2568 (50 - 141 ชม.)
   - ผู้ดำรงตำแหน่งพิเศษ ("น ต่างๆ"): ได้รับเพิ่ม 25 ชม.
5. รุ่น 69 (ชั้นปีที่ 1 ในปีการศึกษา 2569):
   - เริ่มต้นศึกษาในปี 2569 ยอดยกมา = 0 ชม.
6. รุ่น 65 (สำเร็จการศึกษา):
   - คงยอดประวัติเดิมไว้ครบถ้วน

ผลลัพธ์:
1. data/students.json (เพิ่มฟิลด์ carry_forward, ปรับปรุง position ให้ถูกต้อง)
2. data/students_data.js & frontend/data/students_data.js
3. frontend/data/carry_forward_data.js (lookup map O(1) สำหรับ Frontend ทุกหน้า)
4. functions/api/carry_forward_map.json (lookup map สำหรับ Cloudflare Edge API)
"""
import os
import json

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(DATA_DIR)
EXCEL_MASTER = os.path.join(BASE_DIR, 'ความดีปีการศึกษา 2568', '02_ฐานข้อมูลกลาง_Master_Database', '00_ฐานข้อมูลความดีปี2568_Master_พร้อมยอดยกไปปี69.xlsx')
SUMMARY_2568 = os.path.join(DATA_DIR, 'summary_2568_analysis.json')
STUDENTS_JSON = os.path.join(DATA_DIR, 'students.json')
STUDENTS_DATA_JS = os.path.join(DATA_DIR, 'students_data.js')
FRONTEND_STUDENTS_DATA_JS = os.path.join(BASE_DIR, 'frontend', 'data', 'students_data.js')
FRONTEND_CF_JS = os.path.join(BASE_DIR, 'frontend', 'data', 'carry_forward_data.js')
EDGE_CF_JS = os.path.join(BASE_DIR, 'functions', 'api', '_carry_forward.js')

def load_master_excel_data():
    excel_data = {}
    if not os.path.exists(EXCEL_MASTER):
        print(f"⚠️ ไม่พบไฟล์ Master Excel: {EXCEL_MASTER}")
        return excel_data

    try:
        import openpyxl
        wb = openpyxl.load_workbook(EXCEL_MASTER, data_only=True)
        if 'ยอดยกไปฐานปี2569 (192คน)' in wb.sheetnames:
            sheet = wb['ยอดยกไปฐานปี2569 (192คน)']
            rows = list(sheet.iter_rows(values_only=True))[4:]
            for r in rows:
                if r[1]:
                    sid = str(r[1]).strip()
                    cy = str(r[4]).strip()
                    pos = str(r[7]).strip() if r[7] else ''
                    h_68 = float(r[17] or 0)
                    is_pass = 'ผ่านเกณฑ์' in str(r[18])
                    excel_data[sid] = {
                        'sid': sid,
                        'name': r[3],
                        'cohort': cy,
                        'pos': pos,
                        'h_68': h_68,
                        'is_pass': is_pass
                    }
            print(f"📗 โหลดข้อมูลจาก Master Excel สำเร็จ: {len(excel_data)} คน")
        wb.close()
    except Exception as e:
        print(f"⚠️ เกิดข้อผิดพลาดในการอ่าน Excel: {e}")

    return excel_data

def main():
    print("🚀 เริ่มต้นกระบวนการเชื่อมโยงคะแนนสะสมยอดยกมาตามปีการศึกษา...")

    # 1. โหลดข้อมูลจาก Master Excel (ถ้ามี)
    excel_data = load_master_excel_data()

    # 2. โหลดข้อมูลสรุป 2568 (Fallback)
    fallback_map = {}
    if os.path.exists(SUMMARY_2568):
        with open(SUMMARY_2568, 'r', encoding='utf-8') as f:
            s2568 = json.load(f)
        for s in s2568.get('pass_list', []) + s2568.get('short_list', []):
            sid = str(s.get('student_id', '')).strip()
            if sid:
                hrs = float(s.get('h_official', s.get('h_main', 0.0)))
                fallback_map[sid] = {
                    'hrs': hrs,
                    'pos': s.get('position', ''),
                    'is_pass': s.get('is_pass', True)
                }

    # 3. โหลดรายชื่อนักเรียน Master
    with open(STUDENTS_JSON, 'r', encoding='utf-8') as f:
        students = json.load(f)
    print(f"👥 จำนวนนักเรียนทั้งหมดในฐาน: {len(students)} คน")

    # 4. อัปเดต carry_forward และ position ให้ถูกต้องตามเกณฑ์
    cf_map = {}
    positions_map = {}
    cohort_stats = {}

    for s in students:
        sid = str(s.get('student_id', '')).strip()
        cy = str(s.get('class_year', ''))

        # ปรับปรุงตำแหน่งจาก Master Excel ถ้ามี
        if sid in excel_data:
            ex_pos = excel_data[sid]['pos']
            if ex_pos:
                s['position'] = ex_pos
        elif not s.get('position') or s.get('position') == 'None':
            # ตรวจสอบจาก fallback_map
            fb_pos = fallback_map.get(sid, {}).get('pos', '')
            if fb_pos:
                s['position'] = fb_pos
            else:
                s['position'] = 'นักเรียนพยาบาล'

        pos = s.get('position', 'นักเรียนพยาบาล')
        positions_map[sid] = pos
        is_special_role = (pos != 'นักเรียนพยาบาล') and bool(pos) and (pos.strip() != '')

        # คำนวณชั่วโมงสะสมยกมาตามรุ่น (Cohort Progression)
        if cy == '66':
            # ผ่านมา 3 ปี: ปี 66 (50h) + ปี 67 (50h) = 100h base
            base_prior = 100.0
            if sid in excel_data:
                ex = excel_data[sid]
                h_68_eff = max(50.0, ex['h_68']) if ex['is_pass'] else ex['h_68']
            else:
                fb = fallback_map.get(sid, {})
                h_68_eff = max(50.0, fb.get('hrs', 50.0)) if fb.get('is_pass', True) else fb.get('hrs', 50.0)
            role_bonus = 25.0 if is_special_role else 0.0
            cf_hours = base_prior + h_68_eff + role_bonus

        elif cy == '67':
            # ผ่านมา 2 ปี: ปี 67 (50h) base
            base_prior = 50.0
            if sid in excel_data:
                ex = excel_data[sid]
                h_68_eff = max(50.0, ex['h_68']) if ex['is_pass'] else ex['h_68']
            else:
                fb = fallback_map.get(sid, {})
                h_68_eff = max(50.0, fb.get('hrs', 50.0)) if fb.get('is_pass', True) else fb.get('hrs', 50.0)
            role_bonus = 25.0 if is_special_role else 0.0
            cf_hours = base_prior + h_68_eff + role_bonus

        elif cy == '68':
            # ผ่านมา 1 ปี: ปี 68
            if sid in excel_data:
                ex = excel_data[sid]
                h_68_eff = max(50.0, ex['h_68']) if ex['is_pass'] else ex['h_68']
            else:
                fb = fallback_map.get(sid, {})
                h_68_eff = max(50.0, fb.get('hrs', 50.0)) if fb.get('is_pass', True) else fb.get('hrs', 50.0)
            role_bonus = 25.0 if is_special_role else 0.0
            cf_hours = h_68_eff + role_bonus

        elif cy == '69':
            # นักเรียนใหม่ชั้นปีที่ 1 ปีการศึกษา 2569 ยอดยกมาเริ่มต้น = 0
            cf_hours = 0.0

        else:
            # ศิษย์เก่า (รุ่น 65, 64) คงยอดเดิมไว้
            cf_hours = float(s.get('carry_forward', 0.0))

        cf_hours = round(cf_hours, 1)
        s['carry_forward'] = cf_hours
        cf_map[sid] = cf_hours

        if cy not in cohort_stats:
            cohort_stats[cy] = {
                'count': 0, 'total_cf': 0.0, 'has_cf': 0,
                'min': 9999.0, 'max': 0.0, 'specials': 0,
                'gold': 0, 'platinum': 0, 'diamond': 0
            }
        cohort_stats[cy]['count'] += 1
        cohort_stats[cy]['total_cf'] += cf_hours
        if cf_hours > 0:
            cohort_stats[cy]['has_cf'] += 1
        if cf_hours < cohort_stats[cy]['min']:
            cohort_stats[cy]['min'] = cf_hours
        if cf_hours > cohort_stats[cy]['max']:
            cohort_stats[cy]['max'] = cf_hours
        if is_special_role:
            cohort_stats[cy]['specials'] += 1
        if cf_hours >= 400:
            cohort_stats[cy]['diamond'] += 1
        elif cf_hours >= 300:
            cohort_stats[cy]['platinum'] += 1
        elif cf_hours >= 150:
            cohort_stats[cy]['gold'] += 1

    # 5. บันทึก data/students.json
    with open(STUDENTS_JSON, 'w', encoding='utf-8') as f:
        json.dump(students, f, ensure_ascii=False, indent=2)
    print(f"✅ บันทึก {STUDENTS_JSON}")

    # 6. บันทึก students_data.js ทั้งใน data/ และ frontend/data/
    js_content = "// Auto-generated student data - DO NOT EDIT MANUALLY\n"
    js_content += f"const STUDENTS_DATA = {json.dumps(students, ensure_ascii=False, indent=2)};\n\n"
    js_content += "if (typeof window !== 'undefined') { window.STUDENTS_DATA = STUDENTS_DATA; }\n"
    js_content += "if (typeof globalThis !== 'undefined') { globalThis.STUDENTS_DATA = STUDENTS_DATA; }\n"

    for p in [STUDENTS_DATA_JS, FRONTEND_STUDENTS_DATA_JS]:
        with open(p, 'w', encoding='utf-8') as f:
            f.write(js_content)
        print(f"✅ บันทึก {p}")

    # 7. สร้าง frontend/data/carry_forward_data.js
    cf_js = "// Auto-generated Carry-Forward Hours Lookup - DO NOT EDIT MANUALLY\n"
    cf_js += f"const CARRY_FORWARD_HOURS = {json.dumps(cf_map, ensure_ascii=False, indent=2)};\n\n"
    cf_js += "if (typeof window !== 'undefined') { window.CARRY_FORWARD_HOURS = CARRY_FORWARD_HOURS; }\n"
    cf_js += "if (typeof globalThis !== 'undefined') { globalThis.CARRY_FORWARD_HOURS = CARRY_FORWARD_HOURS; }\n"
    with open(FRONTEND_CF_JS, 'w', encoding='utf-8') as f:
        f.write(cf_js)
    print(f"✅ บันทึก {FRONTEND_CF_JS}")

    # 8. สร้าง functions/api/_carry_forward.js สำหรับ Cloudflare Edge API
    edge_js = "// Auto-generated Carry-Forward & Position Map for Cloudflare Edge Functions - DO NOT EDIT MANUALLY\n"
    edge_js += f"export const CARRY_FORWARD_MAP = {json.dumps(cf_map, ensure_ascii=False, indent=2)};\n\n"
    edge_js += f"export const POSITIONS_MAP = {json.dumps(positions_map, ensure_ascii=False, indent=2)};\n"
    with open(EDGE_CF_JS, 'w', encoding='utf-8') as f:
        f.write(edge_js)
    print(f"✅ บันทึก {EDGE_CF_JS}")

    # 9. สรุปผลรายงาน
    print("\n📊 สรุปยอดคะแนนสะสมยกมาแยกตามรุ่น (Cumulative Carry-Forward Summary):")
    for cy in sorted(cohort_stats.keys(), reverse=True):
        st = cohort_stats[cy]
        avg = (st['total_cf'] / st['count']) if st['count'] > 0 else 0
        min_v = st['min'] if st['min'] != 9999.0 else 0.0
        print(f"   รุ่น {cy}: {st['count']} คน | ยอดรวม: {st['total_cf']:.1f} ชม. | เฉลี่ย: {avg:.1f} ชม./คน | Min: {min_v:.1f} | Max: {st['max']:.1f} | น.ต่างๆ: {st['specials']} คน | Gold(150+): {st['gold']} | Platinum(300+): {st['platinum']} | Diamond(400+): {st['diamond']}")

if __name__ == '__main__':
    main()
