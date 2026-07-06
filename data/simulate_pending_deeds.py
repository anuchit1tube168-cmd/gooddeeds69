#!/usr/bin/env python3
import os
import json
import random
import time

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RECORDS_DIR = os.path.join(BASE_DIR, 'records')

# Students from Class 69
CLASS69_STUDENTS = [
    {
        "student_id": "6900001",
        "rank": "นพอ.",
        "first_name": "กิตติภพ",
        "last_name": "ทองดี",
        "class_year": 69,
        "year_level": 1,
        "role": "student"
    },
    {
        "student_id": "6900002",
        "rank": "นพอ.",
        "first_name": "พรนภัส",
        "last_name": "จิตใจดี",
        "class_year": 69,
        "year_level": 1,
        "role": "student"
    },
    {
        "student_id": "6900003",
        "rank": "นพอ.",
        "first_name": "วรเมธ",
        "last_name": "รักสงบ",
        "class_year": 69,
        "year_level": 1,
        "role": "student"
    },
    {
        "student_id": "6900004",
        "rank": "นพอ.",
        "first_name": "ชนม์นิภา",
        "last_name": "มีสุข",
        "class_year": 69,
        "year_level": 1,
        "role": "student"
    },
    {
        "student_id": "6900005",
        "rank": "นพอ.",
        "first_name": "ปองพล",
        "last_name": "คนดี",
        "class_year": 69,
        "year_level": 1,
        "role": "student"
    }
]

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
    print("Generating 10 pending deed examples...")
    
    # We will generate 10 unique pending deeds
    created_files = []
    
    for i in range(1, 11):
        student = random.choice(CLASS69_STUDENTS)
        cat_id, hours, desc_template = random.choice(DEED_TEMPLATES)
        
        # Modify description slightly to make them unique
        desc = f"{desc_template} ครั้งที่ {random.randint(1, 3)}"
        
        deed_id = f"deed_pending_69_{i:03d}"
        
        deed_data = {
            "id": deed_id,
            "studentId": student["student_id"],
            "categoryId": cat_id,
            "academicYear": 2569,
            "hours": hours,
            "description": desc,
            "activityDate": f"2026-06-{10+i:02d}",
            "imageUrls": [],
            "status": "pending",
            "submittedAt": f"2026-06-{10+i:02d}T10:00:00.000Z",
            "approvedBy": None,
            "approvedAt": None,
            "rejectReason": None,
            "note": "ตัวอย่างจำลองเพื่อเปิดระบบทดสอบอนุมัติรายคน",
            "student": student
        }
        
        # Save to records/AY2569/Class_69/Student_{student_id}/Category_{categoryId}/{deed_id}.json
        target_dir = os.path.join(
            RECORDS_DIR,
            "AY2569",
            "Class_69",
            f"Student_{student['student_id']}",
            f"Category_{cat_id}"
        )
        os.makedirs(target_dir, exist_ok=True)
        
        filepath = os.path.join(target_dir, f"{deed_id}.json")
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(deed_data, f, ensure_ascii=False, indent=4)
            
        created_files.append(filepath)
        print(f"[{i}] Created pending deed: {deed_id} for student {student['student_id']} in Category {cat_id}")
        
    print(f"\nSuccessfully created {len(created_files)} pending deeds.")

if __name__ == '__main__':
    main()
