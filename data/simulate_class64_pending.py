#!/usr/bin/env python3
import os
import json
import random
import time

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RECORDS_DIR = os.path.join(BASE_DIR, 'records')

# 10 Students from Class 64 (รุ่น 64)
CLASS64_STUDENTS = [
    {"student_id": "6403626", "first_name": "กชกร", "last_name": "รัตนเวชสิทธิ", "rank": "นพอ.", "class_year": 64, "year_level": 5, "role": "student"},
    {"student_id": "6403627", "first_name": "กชนิภา", "last_name": "บุญพลอย", "rank": "นพอ.", "class_year": 64, "year_level": 5, "role": "student"},
    {"student_id": "6403628", "first_name": "กัญญารัตน์", "last_name": "มีลา", "rank": "นพอ.", "class_year": 64, "year_level": 5, "role": "student"},
    {"student_id": "6403629", "first_name": "กัลย์สุดา", "last_name": "ปิยะพงษ์", "rank": "นพอ.", "class_year": 64, "year_level": 5, "role": "student"},
    {"student_id": "6403630", "first_name": "กาญจนา", "last_name": "พิชิตชัยปกรณ์", "rank": "นพอ.", "class_year": 64, "year_level": 5, "role": "student"},
    {"student_id": "6403631", "first_name": "เกศินี", "last_name": "เรืองแก้ว", "rank": "นพอ.", "class_year": 64, "year_level": 5, "role": "student"},
    {"student_id": "6403633", "first_name": "จิณิฐตา", "last_name": "พรมมูล", "rank": "นพอ.", "class_year": 64, "year_level": 5, "role": "student"},
    {"student_id": "6403634", "first_name": "จุฑามาศ", "last_name": "พึ่งเพาะ", "rank": "นพอ.", "class_year": 64, "year_level": 5, "role": "student"},
    {"student_id": "6403635", "first_name": "ชลดา", "last_name": "หวังเขื่อนกลาง", "rank": "นพอ.", "class_year": 64, "year_level": 5, "role": "student"},
    {"student_id": "6403636", "first_name": "ชาลิสา", "last_name": "เลียบทวี", "rank": "นพอ.", "class_year": 64, "year_level": 5, "role": "student"}
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
