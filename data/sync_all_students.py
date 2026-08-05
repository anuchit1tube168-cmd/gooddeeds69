#!/usr/bin/env python3
"""
sync_all_students.py
อ่านรายชื่อนักเรียนจาก Excel ทุกไฟล์ที่มี แล้ว export เป็น JSON + JS
รองรับทั้ง Sheet ชื่อ SWD68, SWD67... และ นพอ.1, นพอ.2...

ผลลัพธ์:
  data/students.json
  frontend/data/students.json
  frontend/data/students_data.js
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
    os.path.join(BASE_DIR, "รายชื่อ นพอ.ปี68 ทุกชั้นปี ( 5 ก.พ. 69 ตัดเกาหลี )SWD .xlsx"),
]

# ===== Sheet -> class_year mapping =====
# รองรับทั้ง 2 รูปแบบ
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

# ===== ปีการศึกษา -> ชั้นปีที่ =====
def get_study_year(class_year):
    """คำนวณชั้นปีจาก class_year (ปี 2569: รุ่น69=ปี1, รุ่น68=ปี2, ...)"""
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
    """Extract students from a single worksheet"""
    students = []
    for row in ws.iter_rows(min_row=5, values_only=True):
        if not row or len(row) < 5:
            continue
        
        student_id = clean_number(row[1])
        if not student_id:
            continue
        
        # ตรวจ pattern ของรหัสนักเรียน (6 or 7 หลัก)
        if len(student_id) < 6:
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

def main():
    all_students = {}  # key: student_id, value: student dict (dedup by ID)
    
    # Load existing data to preserve edits/passwords
    frontend_json_path = os.path.join(BASE_DIR, 'frontend', 'data', 'students.json')
    existing_students = {}
    if os.path.exists(frontend_json_path):
        try:
            with open(frontend_json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                existing_students = {s['student_id']: s for s in data}
            print(f"📋 Loaded {len(existing_students)} existing records to preserve edits")
        except Exception as e:
            print(f"⚠️ Failed to load existing: {e}")
    
    # Process each Excel file
    for excel_path in EXCEL_FILES:
        if not os.path.exists(excel_path):
            print(f"⚠️ ไม่พบไฟล์: {os.path.basename(excel_path)}")
            continue
        
        print(f"\n📂 กำลังอ่าน: {os.path.basename(excel_path)}")
        wb = openpyxl.load_workbook(excel_path, data_only=True)
        
        for sheet_name in wb.sheetnames:
            # Match sheet name to class_year
            class_year = None
            clean_sheet = sheet_name.strip()
            
            if clean_sheet in SHEET_MAP:
                class_year = SHEET_MAP[clean_sheet]
            elif sheet_name in SHEET_MAP:
                class_year = SHEET_MAP[sheet_name]
            else:
                # Try matching partial
                for key, cy in SHEET_MAP.items():
                    if key.strip() == clean_sheet:
                        class_year = cy
                        break
            
            if class_year is None:
                print(f"  ⏭️ ข้าม Sheet '{sheet_name}' (ไม่ตรง mapping)")
                continue
            
            ws = wb[sheet_name]
            students = extract_students_from_sheet(ws, class_year)
            
            for s in students:
                sid = s['student_id']
                if sid not in all_students:
                    # Merge with existing data (preserve passwords, etc.)
                    if sid in existing_students:
                        merged = existing_students[sid].copy()
                        merged.update(s)  # Update with new name data
                        all_students[sid] = merged
                    else:
                        all_students[sid] = s
            
            print(f"  ✅ Sheet '{sheet_name}' → รุ่น {class_year}: {len(students)} คน")
        
        wb.close()
    
    # Convert to sorted list
    students_list = sorted(all_students.values(), key=lambda x: (x.get('class_year', 0), x.get('student_id', '')))
    
    # Summary
    print(f"\n{'='*50}")
    print(f"📊 สรุปรายชื่อทั้งหมด: {len(students_list)} คน")
    years = {}
    for s in students_list:
        y = s.get('class_year', 'unknown')
        years[y] = years.get(y, 0) + 1
    for y in sorted(years.keys()):
        print(f"   รุ่น {y} (ชั้นปีที่ {get_study_year(y)}): {years[y]} คน")
    print(f"{'='*50}")
    
    # Write outputs
    # 1. data/students.json
    json_path = os.path.join(DATA_DIR, 'students.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(students_list, f, ensure_ascii=False, indent=2)
    print(f"\n✅ เขียน {json_path}")
    
    # 2. frontend/data/students.json
    frontend_dir = os.path.join(BASE_DIR, 'frontend', 'data')
    os.makedirs(frontend_dir, exist_ok=True)
    frontend_json = os.path.join(frontend_dir, 'students.json')
    with open(frontend_json, 'w', encoding='utf-8') as f:
        json.dump(students_list, f, ensure_ascii=False, indent=2)
    print(f"✅ เขียน {frontend_json}")
    
    # 3. frontend/data/students_data.js
    js_path = os.path.join(frontend_dir, 'students_data.js')
    js_content = f"// Auto-generated by sync_all_students.py\n"
    js_content += f"// Total: {len(students_list)} students\n"
    js_content += f"const STUDENTS_DATA = {json.dumps(students_list, ensure_ascii=False, indent=2)};\n"
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write(js_content)
    print(f"✅ เขียน {js_path}")
    
    # 4. Also update data/students_data.js (legacy path)
    legacy_js = os.path.join(DATA_DIR, 'students_data.js')
    with open(legacy_js, 'w', encoding='utf-8') as f:
        f.write(js_content)
    print(f"✅ เขียน {legacy_js}")
    
    print(f"\n🎉 อัปเดตรายชื่อนักเรียนเสร็จสมบูรณ์!")

if __name__ == '__main__':
    main()
