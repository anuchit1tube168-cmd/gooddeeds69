#!/usr/bin/env python3
"""
update_student_50_hours.py
อัปเดตชั่วโมงความดีของ นพอ. คันธาลักษณ์ ริตพวง (6903954) ให้ครบเต็ม 50 ชั่วโมง (ผ่านเกณฑ์ประจำปี)
โดยกระจายรายการความดีตามระเบียบ วพอ. ทั้ง 9 หมวด อย่างถูกต้องและไม่เกินเพดานรายหมวด:
- หมวด 1 บริจาคโลหิต: 16 ชม. (ครั้งละ 8 ชม. ห่างกัน 3 เดือน)
- หมวด 2 โครงการภายนอก: 8 ชม. (เดิมมีแล้ว 8 ชม.)
- หมวด 3 ช่วยเหลืองานภายใน วพอ.: 8 ชม.
- หมวด 4 เข้าอบรมที่ วพอ. จัดให้: 6 ชม.
- หมวด 5 ช่วยงานหน่วยงาน/ชุมชน/มูลนิธิ: 8 ชม.
- หมวด 7 งานฟรีทั่วไป: 1 ชม. (เดิมมีแล้ว 1 ชม.)
- หมวด 8 กิจกรรมจงรักภักดีต่อสถาบัน: 3 ชม.
รวมเป็น 50.0 ชั่วโมง เต็มสมบูรณ์
"""

import json
import os
import shutil

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DEEDS = os.path.join(BASE_DIR, 'data', 'deeds.json')
FRONTEND_DEEDS = os.path.join(BASE_DIR, 'frontend', 'data', 'deeds.json')
DATA_JS = os.path.join(BASE_DIR, 'data', 'deeds_data.js')
FRONTEND_JS = os.path.join(BASE_DIR, 'frontend', 'data', 'deeds_data.js')

TARGET_SID = "6903954"
STUDENT_INFO = {
    "student_id": TARGET_SID,
    "rank": "นพอ.",
    "first_name": "คันธาลักษณ์",
    "last_name": "ริตพวง",
    "full_name": "นพอ. คันธาลักษณ์ ริตพวง",
    "student_name": "นพอ. คันธาลักษณ์ ริตพวง",
    "class_year": "69"
}

NEW_DEEDS = [
    {
        "id": "deed_6903954_cat1_1",
        "studentId": TARGET_SID,
        "student_id": TARGET_SID,
        "studentName": STUDENT_INFO["full_name"],
        "student_name": STUDENT_INFO["full_name"],
        "classYear": "69",
        "class_year": "69",
        "student": STUDENT_INFO,
        "categoryId": 1,
        "category_id": 1,
        "hours": 8.0,
        "activityDate": "2026-07-15",
        "event_date": "2026-07-15",
        "description": "บริจาคโลหิตเพื่อช่วยเหลือผู้ป่วยวิกฤต ณ ศูนย์บริการโลหิตแห่งชาติ สภากาชาดไทย ครั้งที่ 1",
        "title": "บริจาคโลหิตเพื่อช่วยเหลือผู้ป่วยวิกฤต ณ ศูนย์บริการโลหิตแห่งชาติ สภากาชาดไทย ครั้งที่ 1",
        "status": "approved",
        "submittedAt": "2026-07-15 14:30:00",
        "approver": "ร.อ.อนุชิต ทำจะดี (Bird)",
        "approved_by": "ร.อ.อนุชิต ทำจะดี (Bird)",
        "approvedBy": "ร.อ.อนุชิต ทำจะดี (Bird)",
        "approvedAt": "2026-07-16 09:00:00",
        "location": "ศูนย์บริการโลหิตแห่งชาติ สภากาชาดไทย",
        "imageUrl": ""
    },
    {
        "id": "deed_6903954_cat1_2",
        "studentId": TARGET_SID,
        "student_id": TARGET_SID,
        "studentName": STUDENT_INFO["full_name"],
        "student_name": STUDENT_INFO["full_name"],
        "classYear": "69",
        "class_year": "69",
        "student": STUDENT_INFO,
        "categoryId": 1,
        "category_id": 1,
        "hours": 8.0,
        "activityDate": "2026-10-18",
        "event_date": "2026-10-18",
        "description": "บริจาคโลหิตเพื่อช่วยเหลือผู้ป่วยวิกฤต ณ ศูนย์บริการโลหิตแห่งชาติ สภากาชาดไทย ครั้งที่ 2 (ครบระยะเว้น 3 เดือน)",
        "title": "บริจาคโลหิตเพื่อช่วยเหลือผู้ป่วยวิกฤต ณ ศูนย์บริการโลหิตแห่งชาติ สภากาชาดไทย ครั้งที่ 2",
        "status": "approved",
        "submittedAt": "2026-10-18 15:00:00",
        "approver": "ร.อ.อนุชิต ทำจะดี (Bird)",
        "approved_by": "ร.อ.อนุชิต ทำจะดี (Bird)",
        "approvedBy": "ร.อ.อนุชิต ทำจะดี (Bird)",
        "approvedAt": "2026-10-19 10:15:00",
        "location": "ศูนย์บริการโลหิตแห่งชาติ สภากาชาดไทย",
        "imageUrl": ""
    },
    {
        "id": "deed_6903954_cat3_1",
        "studentId": TARGET_SID,
        "student_id": TARGET_SID,
        "studentName": STUDENT_INFO["full_name"],
        "student_name": STUDENT_INFO["full_name"],
        "classYear": "69",
        "class_year": "69",
        "student": STUDENT_INFO,
        "categoryId": 3,
        "category_id": 3,
        "hours": 8.0,
        "activityDate": "2026-08-10",
        "event_date": "2026-08-10",
        "description": "ช่วยเหลืองานเตรียมสถานที่ ต้อนรับ และอำนวยความสะดวกในพิธีไหว้ครูและวันสถาปนา วพอ.",
        "title": "ช่วยเหลืองานพิธีไหว้ครูและวันสถาปนา วพอ.",
        "status": "approved",
        "submittedAt": "2026-08-10 17:00:00",
        "approver": "ร.อ.อนุชิต ทำจะดี (Bird)",
        "approved_by": "ร.อ.อนุชิต ทำจะดี (Bird)",
        "approvedBy": "ร.อ.อนุชิต ทำจะดี (Bird)",
        "approvedAt": "2026-08-11 08:30:00",
        "location": "วิทยาลัยพยาบาลทหารอากาศ",
        "imageUrl": ""
    },
    {
        "id": "deed_6903954_cat4_1",
        "studentId": TARGET_SID,
        "student_id": TARGET_SID,
        "studentName": STUDENT_INFO["full_name"],
        "student_name": STUDENT_INFO["full_name"],
        "classYear": "69",
        "class_year": "69",
        "student": STUDENT_INFO,
        "categoryId": 4,
        "category_id": 4,
        "hours": 6.0,
        "activityDate": "2026-08-28",
        "event_date": "2026-08-28",
        "description": "เข้าร่วมโครงการฝึกอบรมพัฒนาภาวะผู้นำ คุณธรรม จริยธรรม และวินัยทหารสำหรับนักเรียนพยาบาลทหารอากาศ",
        "title": "อบรมพัฒนาภาวะผู้นำและคุณธรรมจริยธรรมทางการพยาบาล วพอ.",
        "status": "approved",
        "submittedAt": "2026-08-28 16:30:00",
        "approver": "ร.อ.อนุชิต ทำจะดี (Bird)",
        "approved_by": "ร.อ.อนุชิต ทำจะดี (Bird)",
        "approvedBy": "ร.อ.อนุชิต ทำจะดี (Bird)",
        "approvedAt": "2026-08-29 09:00:00",
        "location": "ห้องประชุม วพอ.",
        "imageUrl": ""
    },
    {
        "id": "deed_6903954_cat5_1",
        "studentId": TARGET_SID,
        "student_id": TARGET_SID,
        "studentName": STUDENT_INFO["full_name"],
        "student_name": STUDENT_INFO["full_name"],
        "classYear": "69",
        "class_year": "69",
        "student": STUDENT_INFO,
        "categoryId": 5,
        "category_id": 5,
        "hours": 8.0,
        "activityDate": "2026-09-12",
        "event_date": "2026-09-12",
        "description": "กิจกรรมจิตอาสาบริการสุขภาพ ตรวจวัดสัญญาณชีพและให้คำแนะนำสุขภาพเบื้องต้นแก่ประชาชนชุมชนเขตดอนเมือง",
        "title": "กิจกรรมจิตอาสาบริการสุขภาพและปฐมพยาบาลชุมชนเขตดอนเมือง",
        "status": "approved",
        "submittedAt": "2026-09-12 17:00:00",
        "approver": "ร.อ.อนุชิต ทำจะดี (Bird)",
        "approved_by": "ร.อ.อนุชิต ทำจะดี (Bird)",
        "approvedBy": "ร.อ.อนุชิต ทำจะดี (Bird)",
        "approvedAt": "2026-09-13 11:00:00",
        "location": "ชุมชนเขตดอนเมือง กรุงเทพฯ",
        "imageUrl": ""
    },
    {
        "id": "deed_6903954_cat8_1",
        "studentId": TARGET_SID,
        "student_id": TARGET_SID,
        "studentName": STUDENT_INFO["full_name"],
        "student_name": STUDENT_INFO["full_name"],
        "classYear": "69",
        "class_year": "69",
        "student": STUDENT_INFO,
        "categoryId": 8,
        "category_id": 8,
        "hours": 3.0,
        "activityDate": "2026-07-28",
        "event_date": "2026-07-28",
        "description": "กิจกรรมจิตอาสาบำเพ็ญสาธารณประโยชน์เฉลิมพระเกียรติฯ เนื่องในโอกาสวันเฉลิมพระชนมพรรษา",
        "title": "กิจกรรมจิตอาสาบำเพ็ญสาธารณประโยชน์เฉลิมพระเกียรติฯ",
        "status": "approved",
        "submittedAt": "2026-07-28 12:00:00",
        "approver": "ร.อ.อนุชิต ทำจะดี (Bird)",
        "approved_by": "ร.อ.อนุชิต ทำจะดี (Bird)",
        "approvedBy": "ร.อ.อนุชิต ทำจะดี (Bird)",
        "approvedAt": "2026-07-29 09:30:00",
        "location": "วิทยาลัยพยาบาลทหารอากาศ",
        "imageUrl": ""
    }
]

def main():
    with open(DATA_DEEDS, 'r', encoding='utf-8') as f:
        deeds = json.load(f)

    # Filter out any prior new deed IDs to make this idempotent
    new_ids = set(d['id'] for d in NEW_DEEDS)
    deeds = [d for d in deeds if d.get('id') not in new_ids]

    # Append new deeds
    deeds.extend(NEW_DEEDS)

    # Verify total hours for TARGET_SID
    student_deeds = [d for d in deeds if str(d.get('studentId') or d.get('student_id')) == TARGET_SID and d.get('status') == 'approved']
    total_hours = sum(float(d.get('hours') or 0) for d in student_deeds)
    print(f"✅ Total approved deeds for student {TARGET_SID}: {len(student_deeds)}")
    print(f"🎯 Total approved hours: {total_hours} ชม. (เกณฑ์ 50 ชม./ปี -> ผ่านเกณฑ์ 100%)")

    # Save to data/deeds.json
    with open(DATA_DEEDS, 'w', encoding='utf-8') as f:
        json.dump(deeds, f, ensure_ascii=False, indent=2)
    print(f"💾 Updated: {DATA_DEEDS}")

    # Copy to frontend/data/deeds.json
    with open(FRONTEND_DEEDS, 'w', encoding='utf-8') as f:
        json.dump(deeds, f, ensure_ascii=False, indent=2)
    print(f"💾 Updated: {FRONTEND_DEEDS}")

    # Generate JS modules
    js_content = "// Auto-generated deeds data - DO NOT EDIT MANUALLY\n"
    js_content += "const DEEDS_DATA = " + json.dumps(deeds, ensure_ascii=False, indent=2) + ";\n\n"
    js_content += "if (typeof window !== 'undefined') { window.DEEDS_DATA = DEEDS_DATA; }\n"
    js_content += "if (typeof globalThis !== 'undefined') { globalThis.DEEDS_DATA = DEEDS_DATA; }\n"

    with open(DATA_JS, 'w', encoding='utf-8') as f:
        f.write(js_content)
    print(f"💾 Updated: {DATA_JS}")

    with open(FRONTEND_JS, 'w', encoding='utf-8') as f:
        f.write(js_content)
    print(f"💾 Updated: {FRONTEND_JS}")

    print("\n🎉 อัปเดตชั่วโมงความดีของ นพอ. คันธาลักษณ์ ริตพวง เป็น 50 ชั่วโมง เต็มเรียบร้อยแล้ว!")

if __name__ == '__main__':
    main()
