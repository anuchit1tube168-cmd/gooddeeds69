#!/usr/bin/env python3
"""
sync_all_students.py
อ่านรายชื่อนักเรียนและการตั้งค่าระบบ (Settings) จาก Excel ทุกไฟล์ที่มี แล้ว export เป็น JSON + JS
รองรับทั้ง Sheet ชื่อ SWD68, SWD67... และ นพอ.1, นพอ.2... รวมถึง Sheet Settings / ตั้งค่าระบบ

ผลลัพธ์:
  data/students.json
  frontend/data/students.json
  frontend/data/students_data.js
  frontend/data/app_settings.js
"""
import openpyxl
import json
import re
import os

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(DATA_DIR)

# ===== ไฟล์ Excel ที่จะอ่าน (เรียงลำดับ priority: ตัวใหม่สุดก่อน) =====
EXCEL_FILES = [
    # ไฟล์ล่าสุดจาก Drive (ปีการศึกษา 2569 — มีรุ่น 69!)
    os.path.join(DATA_DIR, "รายชื่อ_นพอ_ปี69_2569.xlsx"),
    # ไฟล์อัปเดต
    os.path.join(DATA_DIR, "รายชื่อ_นพอ_อัปเดตล่าสุด_2569.xlsx"),
    # ไฟล์เดิม
    os.path.join(BASE_DIR, "รายชื่อ นพอ.ปี 69.xlsx"),
    os.path.join(BASE_DIR, "รายชื่อ นพอ.ปี68 ทุกชั้นปี ( 5 ก.พ. 69 ตัดเกาหลี )SWD .xlsx"),
]

# ===== Sheet -> class_year mapping =====
SHEET_MAP = {
    # รูปแบบ SWD
    'SWD69': 69,
    'SWD68': 68,
    'SWD67': 67,
    'SWD66': 66,
    'SWD65': 65,
    'SWD64': 64,
    # รูปแบบ นพอ. (ปีการศึกษา 2568: นพอ.1=รุ่น68, นพอ.2=รุ่น67, นพอ.3=รุ่น66, นพอ.4=รุ่น65)
    'นพอ.1': 68,
    'นพอ.1 ': 68,  # มี space ท้าย
    'นพอ.2': 67,
    'นพอ.3': 66,
    'นพอ.4': 65,
    'นพอ.5': 65,
    # รูปแบบ นพอ.ปี (ปีการศึกษา 2569: นพอ.ปี1=รุ่น69, นพอ.ปี2=รุ่น68, นพอ.ปี3=รุ่น67, นพอ.ปี4=รุ่น66)
    'นพอ.ปี1': 69,
    'นพอ.ปี2': 68,
    'นพอ.ปี3': 67,
    'นพอ.ปี4': 66,
}

def get_study_year(class_year):
    mapping = {69: 1, 68: 2, 67: 3, 66: 4, 65: 5, 64: 5}
    return mapping.get(class_year, 5)

def clean_number(val):
    if val is None:
        return None
    s = str(val).strip().replace('*', '').replace(' ', '')
    try:
        return str(int(float(s)))
    except:
        return None

def clean_rank(val):
    if not val:
        return 'นพอ.'
    s = str(val).strip()
    s = re.sub(r'\s+', ' ', s)
    return s if s else 'นพอ.'

def extract_students_from_sheet(ws, class_year):
    students = []
    for row in ws.iter_rows(min_row=5, values_only=True):
        if not row or len(row) < 5:
            continue
        
        student_id = clean_number(row[1])
        if not student_id or len(student_id) < 6:
            continue
        
        rank = clean_rank(row[2])
        first_name = str(row[3]).strip() if row[3] else ''
        last_name = str(row[4]).strip() if row[4] else ''
        
        if not first_name:
            continue
        
        students.append({
            'student_id': student_id,
            'rank': rank,
            'first_name': first_name,
            'last_name': last_name,
            'class_year': class_year,
            'year': get_study_year(class_year),
        })
    
    return students

def extract_settings_from_sheet(ws):
    settings = {}
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row or not row[0]:
            continue
        key = str(row[0]).strip()
        val = str(row[1]).strip() if row[1] is not None else ''
        settings[key] = val
    return settings

def main():
    all_students = {}
    app_settings = {
        "admin": {"username": "admin", "password": "admin69", "role": "admin", "name": "ผู้ดูแลระบบ"},
        "teacher": {"username": "teacher", "password": "teacher69", "role": "teacher", "name": "อาจารย์"},
        "telegram": {
            "bot_token": "8087838067:AAEejIlFni8e9DWVxKpRomTFlmjxYJVNJ0k",
            "chat_id": "-4839151586"
        },
        "config": {
            "academic_year": 2569,
            "min_hours_semester": 25,
            "min_hours": 50,
            "max_hours": 400
        }
    }
    
    # Load existing student profiles to preserve custom passwords
    frontend_json_path = os.path.join(BASE_DIR, 'frontend', 'data', 'students.json')
    existing_students = {}
    if os.path.exists(frontend_json_path):
        try:
            with open(frontend_json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                existing_students = {s['student_id']: s for s in data}
            print(f"📋 Loaded {len(existing_students)} existing student records")
        except Exception as e:
            print(f"⚠️ Failed to load existing: {e}")
    
    for excel_path in EXCEL_FILES:
        if not os.path.exists(excel_path):
            continue
        
        print(f"\n📂 กำลังอ่าน: {os.path.basename(excel_path)}")
        wb = openpyxl.load_workbook(excel_path, data_only=True)
        
        # Read Settings if sheet exists
        for sheet_name in wb.sheetnames:
            if sheet_name in ['Settings', 'ตั้งค่าระบบ']:
                s_dict = extract_settings_from_sheet(wb[sheet_name])
                if s_dict:
                    if 'admin_username' in s_dict: app_settings['admin']['username'] = s_dict['admin_username']
                    if 'admin_password' in s_dict: app_settings['admin']['password'] = s_dict['admin_password']
                    if 'admin_name' in s_dict: app_settings['admin']['name'] = s_dict['admin_name']
                    if 'teacher_username' in s_dict: app_settings['teacher']['username'] = s_dict['teacher_username']
                    if 'teacher_password' in s_dict: app_settings['teacher']['password'] = s_dict['teacher_password']
                    if 'teacher_name' in s_dict: app_settings['teacher']['name'] = s_dict['teacher_name']
                    if 'telegram_bot_token' in s_dict: app_settings['telegram']['bot_token'] = s_dict['telegram_bot_token']
                    if 'telegram_chat_id' in s_dict: app_settings['telegram']['chat_id'] = s_dict['telegram_chat_id']
                    if 'min_hours_per_semester' in s_dict: app_settings['config']['min_hours_semester'] = int(s_dict['min_hours_per_semester'])
                    if 'min_hours_per_year' in s_dict: app_settings['config']['min_hours'] = int(s_dict['min_hours_per_year'])
                    if 'max_hours_scale' in s_dict: app_settings['config']['max_hours'] = int(s_dict['max_hours_scale'])
                    if 'academic_year' in s_dict: app_settings['config']['academic_year'] = int(s_dict['academic_year'])
                    print(f"  ⚙️ ดึงข้อมูลการตั้งค่าระบบ (Settings) สำเร็จ! Admin: {app_settings['admin']['username']}, Teacher: {app_settings['teacher']['username']}")
        
        # Read Student Roster
        for sheet_name in wb.sheetnames:
            if sheet_name in ['Settings', 'ตั้งค่าระบบ']:
                continue
            
            clean_sheet = sheet_name.strip()
            class_year = SHEET_MAP.get(clean_sheet) or SHEET_MAP.get(sheet_name)
            
            if class_year is None:
                continue
            
            students = extract_students_from_sheet(wb[sheet_name], class_year)
            for s in students:
                sid = s['student_id']
                if sid not in all_students:
                    if sid in existing_students:
                        merged = existing_students[sid].copy()
                        merged.update(s)
                        all_students[sid] = merged
                    else:
                        all_students[sid] = s
            
            print(f"  ✅ Sheet '{sheet_name}' → รุ่น {class_year}: {len(students)} คน")
        
        wb.close()
    
    students_list = sorted(all_students.values(), key=lambda x: (x.get('class_year', 0), x.get('student_id', '')))
    
    print(f"\n{'='*50}")
    print(f"📊 สรุปรายชื่อทั้งหมด: {len(students_list)} คน")
    years = {}
    for s in students_list:
        y = s.get('class_year', 'unknown')
        years[y] = years.get(y, 0) + 1
    for y in sorted(years.keys()):
        print(f"   รุ่น {y} (ชั้นปีที่ {get_study_year(y)}): {years[y]} คน")
    print(f"{'='*50}")
    
    # Write JSON files
    for p in [os.path.join(DATA_DIR, 'students.json'), os.path.join(BASE_DIR, 'frontend', 'data', 'students.json')]:
        with open(p, 'w', encoding='utf-8') as f:
            json.dump(students_list, f, ensure_ascii=False, indent=2)
        print(f"✅ เขียน {p}")
    
    # Write JS files
    js_content = f"// Auto-generated by sync_all_students.py\n"
    js_content += f"// Total: {len(students_list)} students\n"
    js_content += f"const STUDENTS_DATA = {json.dumps(students_list, ensure_ascii=False, indent=2)};\n"
    for p in [os.path.join(BASE_DIR, 'frontend', 'data', 'students_data.js'), os.path.join(DATA_DIR, 'students_data.js')]:
        with open(p, 'w', encoding='utf-8') as f:
            f.write(js_content)
        print(f"✅ เขียน {p}")
        
    # Write App Settings JS
    settings_js = f"// Auto-generated from Excel Settings sheet\n"
    settings_js += f"const EXCEL_SETTINGS = {json.dumps(app_settings, ensure_ascii=False, indent=2)};\n"
    settings_js_path = os.path.join(BASE_DIR, 'frontend', 'data', 'app_settings.js')
    with open(settings_js_path, 'w', encoding='utf-8') as f:
        f.write(settings_js)
    print(f"✅ เขียน {settings_js_path}")

if __name__ == '__main__':
    main()
