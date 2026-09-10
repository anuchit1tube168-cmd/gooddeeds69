#!/usr/bin/env python3
"""Export student data from Excel to JSON for import into Google Sheets
   ปีการศึกษา 2569 — อัพเดท 9 มี.ค. 2569
"""
import json
import re
import os
import zipfile
import xml.etree.ElementTree as ET

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(DATA_DIR)
EXCEL_FILE = os.path.join(BASE_DIR, "รายชื่อ นพอ.ปี68 ทุกชั้นปี ( 5 ก.พ. 69 ตัดเกาหลี )SWD .xlsx")

# Sheet -> class year mapping (ปีการศึกษา 2569)
SHEET_CLASS_MAP = {
    'SWD69': {'year': 1, 'class_year': 69},  # ชั้นปีที่ 1 (รุ่น 69) - ยังไม่มีในไฟล์
    'SWD68': {'year': 2, 'class_year': 68},  # ชั้นปีที่ 2 (รุ่น 68)
    'SWD67': {'year': 3, 'class_year': 67},  # ชั้นปีที่ 3 (รุ่น 67)
    'SWD66': {'year': 4, 'class_year': 66},  # ชั้นปีที่ 4 (รุ่น 66)
    'SWD65': {'year': 5, 'class_year': 65},  # ศิษย์เก่า (รุ่น 65)
    'SWD64': {'year': 5, 'class_year': 64},  # ศิษย์เก่า (รุ่น 64)
}

def clean_number(val):
    if val is None:
        return None
    s = str(val).strip().replace('*', '')
    try:
        return int(float(s))
    except:
        return None

def calculate_cohort_no(sid_str):
    try:
        n = int(str(sid_str).strip())
        if 6903946 <= n <= 6904009: return n - 6903945
        if 6803882 <= n <= 6803945: return n - 6803881
        if 6703818 <= n <= 6703881: return n - 6703817
        if 6603754 <= n <= 6603817: return n - 6603753
        if 6503690 <= n <= 6503753: return n - 6503689
        if 6403626 <= n <= 6403689: return n - 6403625
    except Exception:
        pass
    return None

def read_xlsx_sheet_rows(filename, sheet_name):
    """Read rows from an xlsx file without third-party dependencies."""
    if not os.path.exists(filename):
        return []
    with zipfile.ZipFile(filename, 'r') as z:
        sst = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            sst = [''.join(t.text for t in si.findall('.//{*}t') if t.text) for si in tree.findall('{*}si')]

        wb_tree = ET.fromstring(z.read('xl/workbook.xml'))
        rels_tree = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
        rel_map = {r.attrib['Id']: r.attrib['Target'] for r in rels_tree.findall('{*}Relationship')}

        sheet_path = None
        for s in wb_tree.findall('.//{*}sheet'):
            if s.attrib.get('name') == sheet_name:
                target = rel_map[s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']].lstrip('/')
                if not target.startswith('xl/'):
                    target = 'xl/' + target
                sheet_path = target
                break

        if not sheet_path or sheet_path not in z.namelist():
            return []

        ws_tree = ET.fromstring(z.read(sheet_path))
        rows = []
        for row_el in ws_tree.findall('.//{*}row'):
            row_dict = {}
            for c in row_el.findall('{*}c'):
                ref = c.attrib.get('r', '')
                col = ''.join([ch for ch in ref if ch.isalpha()])
                t = c.attrib.get('t')
                if t == 'inlineStr':
                    t_el = c.find('.//{*}t')
                    val = t_el.text if t_el is not None else ''
                elif t == 's':
                    v_el = c.find('{*}v')
                    idx = v_el.text if v_el is not None else ''
                    val = sst[int(idx)] if idx.isdigit() and int(idx) < len(sst) else ''
                else:
                    v_el = c.find('{*}v')
                    val = v_el.text if v_el is not None else ''
                row_dict[col] = val
            rows.append(row_dict)
        return rows

def main():
    students = []
    
    # Load existing student profiles to merge edits (prevent data loss)
    existing_students = {}
    frontend_json_path = os.path.join(BASE_DIR, 'frontend', 'data', 'students.json')
    if os.path.exists(frontend_json_path):
        try:
            with open(frontend_json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                existing_students = {s['student_id']: s for s in data}
            print(f"Loaded {len(existing_students)} existing student records to preserve edits/passwords.")
        except Exception as e:
            print(f"⚠️ Failed to load existing students.json for merging: {e}")

    for sheet_name, meta in SHEET_CLASS_MAP.items():
        rows = read_xlsx_sheet_rows(EXCEL_FILE, sheet_name)
        if not rows:
            continue
        
        for r in rows:
            student_id = clean_number(r.get('B'))
            if student_id is None or len(str(student_id)) != 7:
                continue
            
            no_val = clean_number(r.get('A'))
            rank = str(r.get('C', '')).strip() if r.get('C') else 'นพอ.'
            first_name = str(r.get('D', '')).strip() if r.get('D') else ''
            last_name = str(r.get('E', '')).strip() if r.get('E') else ''
            note = str(r.get('F', '')).strip() if r.get('F') else ''
            
            student_id_str = str(student_id)
            password = student_id_str
            email = ''
            telegram_chat_id = ''
            role = 'student'
            class_year = meta['class_year']
            year_level = meta['year']
            
            position = 'นักเรียนพยาบาล'
            nickname = ''
            phone = ''

            # Fallback sequence number if missing in sheet
            cohort_no = no_val or calculate_cohort_no(student_id_str)

            # Merge edits from existing database if present
            if student_id_str in existing_students:
                existing = existing_students[student_id_str]
                rank = existing.get('rank', rank)
                first_name = existing.get('first_name', first_name)
                last_name = existing.get('last_name', last_name)
                password = existing.get('password', password)
                email = existing.get('email', email)
                telegram_chat_id = existing.get('telegram_chat_id', telegram_chat_id)
                role = existing.get('role', role)
                class_year = existing.get('class_year', class_year)
                year_level = existing.get('year_level', year_level)
                note = existing.get('note', note)
                position = existing.get('position', position)
                nickname = existing.get('nickname', nickname)
                phone = existing.get('phone', phone)
                cohort_no = cohort_no or existing.get('no')

            student = {
                'student_id': student_id_str,
                'no': cohort_no,
                'rank': rank,
                'first_name': first_name,
                'last_name': last_name,
                'full_name': f"{first_name} {last_name}".strip(),
                'nickname': nickname,
                'phone': phone,
                'class_year': class_year,
                'year_level': year_level,
                'note': note,
                'position': position,
                'password': password,
                'email': email,
                'telegram_chat_id': telegram_chat_id,
                'role': role
            }
            students.append(student)

    # Load official Class 69 students from 'รายชื่อ นพอ.ปี 69.xlsx' sheet 'นพอ.ปี1'
    excel_69_path = os.path.join(BASE_DIR, "รายชื่อ นพอ.ปี 69.xlsx")
    if os.path.exists(excel_69_path):
        try:
            rows69 = read_xlsx_sheet_rows(excel_69_path, 'นพอ.ปี1')
            for r in rows69:
                sid = clean_number(r.get('B'))
                fname_v = str(r.get('D', '')).strip()
                if not sid or not fname_v:
                    continue
                
                no_val = clean_number(r.get('A'))
                rank_v = str(r.get('C', '')).strip() or 'นพอ.'
                lname_v = str(r.get('E', '')).strip()
                note_v = str(r.get('F', '')).strip()
                sid_str = str(sid)
                cohort_no = no_val or calculate_cohort_no(sid_str)

                s = {
                    'student_id': sid_str,
                    'no': cohort_no,
                    'rank': rank_v,
                    'first_name': fname_v,
                    'last_name': lname_v,
                    'full_name': f"{fname_v} {lname_v}".strip(),
                    'nickname': '',
                    'phone': '',
                    'class_year': 69,
                    'year_level': 1,
                    'note': note_v or 'นักเรียนพยาบาลทหารอากาศ ชั้นปีที่ 1 (รุ่น 69)',
                    'position': 'นักเรียนพยาบาล',
                    'password': sid_str,
                    'email': '',
                    'telegram_chat_id': '',
                    'line_user_id': '',
                    'line_display_name': '',
                    'line_picture_url': '',
                    'role': 'student'
                }
                
                if sid_str in existing_students:
                    existing = existing_students[sid_str]
                    for k, v in existing.items():
                        if v and not s.get(k):
                            s[k] = v
                    if existing.get('no'):
                        s['no'] = existing.get('no')
                students.append(s)
            print(f"✅ Loaded {len([s for s in students if s['class_year'] == 69])} official Class 69 students from {excel_69_path}")
        except Exception as e:
            print(f"⚠️ Error reading Class 69 workbook: {e}")
    
    # Missing historical students loaded securely from private storage (PDPA Zero-Leak)
    missing_historical_students = []
    missing_json_path = os.path.join(DATA_DIR, "private", "missing_historical_students.json")
    if os.path.exists(missing_json_path):
        try:
            with open(missing_json_path, "r", encoding="utf-8") as f:
                missing_historical_students = json.load(f)
        except Exception as _e:
            print(f"⚠️ Note: Could not load missing_historical_students.json: {_e}")
    
    # Merge existing modifications for missing historical students
    for s in missing_historical_students:
        sid = s['student_id']
        s['no'] = s.get('no') or calculate_cohort_no(sid)
        if sid in existing_students:
            existing = existing_students[sid]
            s['rank'] = existing.get('rank', s['rank'])
            s['first_name'] = existing.get('first_name', s['first_name'])
            s['last_name'] = existing.get('last_name', s['last_name'])
            s['full_name'] = existing.get('full_name', s['full_name'])
            s['class_year'] = existing.get('class_year', s['class_year'])
            s['year_level'] = existing.get('year_level', s['year_level'])
            s['password'] = existing.get('password', s['password'])
            s['email'] = existing.get('email', s['email'])
            s['telegram_chat_id'] = existing.get('telegram_chat_id', s['telegram_chat_id'])
            s['role'] = existing.get('role', s['role'])
            s['note'] = existing.get('note', s['note'])
            s['no'] = existing.get('no') or s.get('no') or calculate_cohort_no(sid)

    students.extend(missing_historical_students)
    
    # Deduplicate by student_id
    seen_ids = set()
    unique_students = []
    for s in students:
        if s['student_id'] not in seen_ids:
            seen_ids.add(s['student_id'])
            unique_students.append(s)
    students = unique_students

    # Sort by class year then student_id
    students.sort(key=lambda x: (x['class_year'], x['student_id']))
    
    print(f"Total students exported: {len(students)}")
    
    # Print breakdown
    from collections import Counter
    years = Counter(s['class_year'] for s in students)
    for y, count in sorted(years.items()):
        print(f"  Class {y}: {count} students")
    
    # Save to JSON
    json_path = os.path.join(DATA_DIR, 'students.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(students, f, ensure_ascii=False, indent=2)
    
    print(f"\nSaved to {json_path}")
    
    # Also save as JS module for frontend use
    js_path = os.path.join(DATA_DIR, 'students_data.js')
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write("// Auto-generated student data - DO NOT EDIT MANUALLY\n")
        f.write("// Generated from: รายชื่อ นพอ.ปี69 ทุกชั้นปี\n\n")
        f.write("const STUDENTS_DATA = ")
        json.dump(students, f, ensure_ascii=False, indent=2)
        f.write(";\n\n")
        f.write("if (typeof window !== 'undefined') { window.STUDENTS_DATA = STUDENTS_DATA; }\n")
        f.write("if (typeof globalThis !== 'undefined') { globalThis.STUDENTS_DATA = STUDENTS_DATA; }\n")
    
    print(f"Saved to {js_path}")

    # Write to frontend/data/
    frontend_json_path = os.path.join(BASE_DIR, 'frontend', 'data', 'students.json')
    frontend_js_path = os.path.join(BASE_DIR, 'frontend', 'data', 'students_data.js')
    os.makedirs(os.path.dirname(frontend_js_path), exist_ok=True)
    
    with open(frontend_json_path, 'w', encoding='utf-8') as f:
        json.dump(students, f, ensure_ascii=False, indent=2)
    
    with open(frontend_js_path, 'w', encoding='utf-8') as f:
        f.write("// Auto-generated student data - DO NOT EDIT MANUALLY\n")
        f.write("// Generated from: รายชื่อ นพอ.ปี69 ทุกชั้นปี\n\n")
        f.write("const STUDENTS_DATA = ")
        json.dump(students, f, ensure_ascii=False, indent=2)
        f.write(";\n\n")
        f.write("if (typeof window !== 'undefined') { window.STUDENTS_DATA = STUDENTS_DATA; }\n")
        f.write("if (typeof globalThis !== 'undefined') { globalThis.STUDENTS_DATA = STUDENTS_DATA; }\n")
        
    print(f"Sync-copied to {frontend_js_path}")

if __name__ == '__main__':
    main()

