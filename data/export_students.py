#!/usr/bin/env python3
"""Export student data from Excel to JSON for import into Google Sheets
   ปีการศึกษา 2569 — อัพเดท 9 มี.ค. 2569
"""
import openpyxl
import json
import re
import os

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

def main():
    wb = openpyxl.load_workbook(EXCEL_FILE)
    students = []
    
    for sheet_name, meta in SHEET_CLASS_MAP.items():
        if sheet_name not in wb.sheetnames:
            continue
        ws = wb[sheet_name]
        
        for row in ws.iter_rows(min_row=5, values_only=True):
            student_id = clean_number(row[1])
            if student_id is None:
                continue
            
            rank = str(row[2]).strip() if row[2] else 'นพอ.'
            first_name = str(row[3]).strip() if row[3] else ''
            last_name = str(row[4]).strip() if row[4] else ''
            note = str(row[5]).strip() if row[5] else ''
            
            student = {
                'student_id': str(student_id),
                'rank': rank,
                'first_name': first_name,
                'last_name': last_name,
                'full_name': f"{first_name} {last_name}".strip(),
                'class_year': meta['class_year'],
                'year_level': meta['year'],
                'note': note,
                'password': str(student_id),  # default password = student_id
                'email': '',
                'telegram_chat_id': '',
                'role': 'student'
            }
            students.append(student)

    # Append Class 69 test students since they are not in the Excel sheets yet
    class69_students = [
        {
            "student_id": "6900001",
            "rank": "นพอ.",
            "first_name": "กิตติภพ",
            "last_name": "ทองดี",
            "full_name": "กิตติภพ ทองดี",
            "class_year": 69,
            "year_level": 1,
            "note": "นักเรียนใหม่ชั้นปีที่ 1",
            "password": "6900001",
            "email": "",
            "telegram_chat_id": "",
            "role": "student"
        },
        {
            "student_id": "6900002",
            "rank": "นพอ.",
            "first_name": "พรนภัส",
            "last_name": "จิตใจดี",
            "full_name": "พรนภัส จิตใจดี",
            "class_year": 69,
            "year_level": 1,
            "note": "นักเรียนใหม่ชั้นปีที่ 1",
            "password": "6900002",
            "email": "",
            "telegram_chat_id": "",
            "role": "student"
        },
        {
            "student_id": "6900003",
            "rank": "นพอ.",
            "first_name": "วรเมธ",
            "last_name": "รักสงบ",
            "full_name": "วรเมธ รักสงบ",
            "class_year": 69,
            "year_level": 1,
            "note": "นักเรียนใหม่ชั้นปีที่ 1",
            "password": "6900003",
            "email": "",
            "telegram_chat_id": "",
            "role": "student"
        },
        {
            "student_id": "6900004",
            "rank": "นพอ.",
            "first_name": "ชนม์นิภา",
            "last_name": "มีสุข",
            "full_name": "ชนม์นิภา มีสุข",
            "class_year": 69,
            "year_level": 1,
            "note": "นักเรียนใหม่ชั้นปีที่ 1",
            "password": "6900004",
            "email": "",
            "telegram_chat_id": "",
            "role": "student"
        },
        {
            "student_id": "6900005",
            "rank": "นพอ.",
            "first_name": "ปองพล",
            "last_name": "คนดี",
            "full_name": "ปองพล คนดี",
            "class_year": 69,
            "year_level": 1,
            "note": "นักเรียนใหม่ชั้นปีที่ 1",
            "password": "6900005",
            "email": "",
            "telegram_chat_id": "",
            "role": "student"
        }
    ]
    students.extend(class69_students)
    
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
        f.write(";\n")
    
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
        f.write(";\n")
        
    print(f"Sync-copied to {frontend_js_path}")

if __name__ == '__main__':
    main()

