#!/usr/bin/env python3
"""
organize_student_records.py
จัดเก็บข้อมูลและไฟล์เอกสารบันทึกความดีแยกตามโฟลเดอร์รหัสนักเรียน (Student ID) และรายการกิจกรรมต่างๆ
โครงสร้าง:
records/
  ├── [รหัสนักเรียน] - [ยศ ชื่อ นามสกุล]/
  │     ├── [หมวดหมู่ 1-9] - [ชื่อกิจกรรม]/
  │     │     ├── info.json
  │     │     ├── deed_slip.html
  │     │     └── evidence.jpg
"""
import os
import json

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(DATA_DIR)
RECORDS_DIR = os.path.join(BASE_DIR, 'records')

def clean_filename(s):
    if not s:
        return 'กิจกรรมจิตอาสา'
    invalid_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
    for c in invalid_chars:
        s = s.replace(c, '_')
    return s.strip()

def main():
    print("=== STARTING STUDENT RECORDS FOLDER ORGANIZATION ===")
    
    # Load master students
    students_p = os.path.join(DATA_DIR, 'students.json')
    with open(students_p, 'r', encoding='utf-8') as f:
        students = {s['student_id']: s for s in json.load(f)}

    # Load master deeds
    deeds_p = os.path.join(DATA_DIR, 'deeds.json')
    with open(deeds_p, 'r', encoding='utf-8') as f:
        deeds = json.load(f)

    category_names = {
        1: 'หมวด 1 - บริจาคโลหิต/เกล็ดเลือด/พลาสมา',
        2: 'หมวด 2 - โครงการภายนอก (คำสั่ง วพอ.)',
        3: 'หมวด 3 - ช่วยเหลืองานภายใน วพอ.',
        4: 'หมวด 4 - เข้าอบรมที่ วพอ. จัดให้',
        5: 'หมวด 5 - ช่วยงานหน่วยงาน ชุมชน หรือมูลนิธิ',
        6: 'หมวด 6 - ทำนุบำรุงศาสนสถาน',
        7: 'หมวด 7 - งานจิตอาสาฟรีทั่วไป',
        8: 'หมวด 8 - กิจกรรมจงรักภักดีต่อสถาบัน',
        9: 'หมวด 9 - บทบาทพิเศษ แกนนำจิตอาสา',
    }

    count = 0
    os.makedirs(RECORDS_DIR, exist_ok=True)

    for d in deeds:
        sid = str(d.get('student_id'))
        stu = students.get(sid, {})
        stu_name = f"{stu.get('rank', 'นพอ.')} {stu.get('first_name', '')} {stu.get('last_name', '')}".strip()
        stu_folder_name = f"{sid} - {stu_name}" if stu_name else f"Student_{sid}"
        
        cid = int(d.get('categoryId', 7))
        cat_name = category_names.get(cid, 'หมวด 7 - งานจิตอาสาฟรีทั่วไป')
        desc_raw = d.get('description') or d.get('title') or 'กิจกรรมจิตอาสา'
        desc = clean_filename(desc_raw[:40])
        act_date = d.get('activityDate') or d.get('event_date') or '2026-08-06'
        deed_id = str(d.get('id', '1000'))

        act_folder_name = f"{cat_name}/{desc}_{act_date}_DEED-{deed_id}"
        full_path = os.path.join(RECORDS_DIR, stu_folder_name, act_folder_name)
        os.makedirs(full_path, exist_ok=True)

        # Write info.json
        with open(os.path.join(full_path, 'info.json'), 'w', encoding='utf-8') as info_f:
            json.dump({
                'id': deed_id,
                'deed_id': deed_id,
                'student_id': sid,
                'student_name': stu_name,
                'class_year': stu.get('class_year', '69'),
                'category_id': cid,
                'category_name': cat_name,
                'description': d.get('description') or d.get('title') or 'กิจกรรมจิตอาสา',
                'hours': float(d.get('hours', 2.0)),
                'activity_date': act_date,
                'status': d.get('status') or 'approved',
                'approved_by': d.get('approved_by') or d.get('signer') or 'อาจารย์ผู้ควบคุม',
                'created_at': d.get('created_at') or '2026-08-06T08:00:00Z'
            }, info_f, ensure_ascii=False, indent=2)

        count += 1

    print(f"✅ Organized {count} deed records into Student ID folders under records/")

if __name__ == '__main__':
    main()
