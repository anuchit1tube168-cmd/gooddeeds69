#!/usr/bin/env python3
import os
import json
import random
import time

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')
RECORDS_DIR = os.path.join(BASE_DIR, 'records')

# Load Students from Class 64 (รุ่น 64) dynamically
def get_class64_students():
    students_file = os.path.join(DATA_DIR, 'students.json')
    if os.path.exists(students_file):
        with open(students_file, 'r', encoding='utf-8') as f:
            all_s = json.load(f)
            c64 = [s for s in all_s if s.get('class_year') == 64]
            if c64:
                return c64[:10]
    return [
        {"student_id": f"640362{i}", "first_name": f"นักเรียนจำลอง{i}", "last_name": "ทดสอบระบบ", "rank": "นพอ.", "class_year": 64, "year_level": 5, "role": "student"}
        for i in range(10)
    ]

CLASS64_STUDENTS = get_class64_students()

DEED_TEMPLATES = [
    (1, 4.0, "บริจาคโลหิตเพื่อช่วยเหลือผู้ป่วยวิกฤต ณ โรงพยาบาลภูมิพลอดุลยเดช"),
    (2, 6.0, "เข้าร่วมกิจกรรมจิตอาสาพัฒนาสิ่งแวดล้อมนอกสถานที่ตามคำสั่ง วพอ."),
    (3, 3.0, "ช่วยงานฝ่ายธุรการและอำนวยความสะดวกในงานปฐมนิเทศ ณ อาคารอำนวยการ วพอ."),
    (4, 2.0, "เข้าร่วมโครงการอบรมคุณธรรม จริยธรรม และการบำเพ็ญตนเพื่อส่วนรวม"),
    (5, 5.0, "เป็นอาสาสมัครช่วยสอนหนังสือเด็กด้อยโอกาส ณ มูลนิธิพัฒนาเด็ก"),
    (6, 4.0, "ร่วมพัฒนาทำความสะอาดและปรับปรุงภูมิทัศน์ วัดดอนเมือง กรุงเทพฯ"),
    (7, 2.0, "ช่วยเก็บขยะและบำเพ็ญประโยชน์สาธารณะรอบบริเวณสถาบัน"),
    (8, 3.0, "เข้าร่วมพิธีถวายพระพรชัยมงคลและบำเพ็ญประโยชน์เพื่อถวายเป็นพระราชกุศล"),
    (9, 8.0, "ได้รับมอบหมายเป็นหัวหน้านักเรียนจัดกิจกรรมสัปดาห์จิตอาสา วพอ.")
]

def main():
    print("Generating 10 pending deed examples for Class 64...")
    
    created_files = []
    
    for idx, student in enumerate(CLASS64_STUDENTS, 1):
        cat_id, hours, desc_template = random.choice(DEED_TEMPLATES)
        
        # Modify description slightly to make them unique
        desc = f"{desc_template} (ทดสอบระบบอนุมัติสด รุ่น 64)"
        
        deed_id = f"deed_pending_64_{idx:03d}"
        
        deed_data = {
            "id": deed_id,
            "studentId": student["student_id"],
            "categoryId": cat_id,
            "academicYear": 2569,
            "hours": hours,
            "description": desc,
            "activityDate": "2026-06-14",
            "imageUrls": [],
            "status": "pending",
            "submittedAt": "2026-06-14T10:05:00.000Z",
            "approvedBy": None,
            "approvedAt": None,
            "rejectReason": None,
            "note": "ตัวอย่างจำลองเพื่อให้อาจารย์ทดสอบอนุมัติสดรุ่น 64",
            "student": student
        }
        
        # Save to records/AY2569/Class_64/Student_{student_id}/Category_{categoryId}/{deed_id}.json
        target_dir = os.path.join(
            RECORDS_DIR,
            "AY2569",
            "Class_64",
            f"Student_{student['student_id']}",
            f"Category_{cat_id}"
        )
        os.makedirs(target_dir, exist_ok=True)
        
        filepath = os.path.join(target_dir, f"{deed_id}.json")
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(deed_data, f, ensure_ascii=False, indent=4)
            
        created_files.append(filepath)
        print(f"[{idx}] Created pending deed: {deed_id} for student {student['student_id']} in Category {cat_id}")
        
    print(f"\nSuccessfully created {len(created_files)} pending deeds for Class 64 (รุ่น 64).")

if __name__ == '__main__':
    main()
