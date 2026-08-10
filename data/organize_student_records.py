#!/usr/bin/env python3
"""
organize_student_records.py
จัดเก็บข้อมูลและไฟล์เอกสารใบบันทึกความดีแบบ PDF/HTML ส่วนบุคคลแยกตามโฟลเดอร์รหัสนักเรียน (Student ID) และรายการกิจกรรมต่างๆ
โครงสร้าง:
records/
  ├── [รหัสนักเรียน] - [ยศ ชื่อ นามสกุล]/
  │     ├── [หมวดหมู่ 1-9] - [ชื่อกิจกรรม]/
  │     │     ├── info.json
  │     │     ├── deed_slip.html (ใบความดี A4 พร้อมพิมพ์/แปลงเป็น PDF)
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

def generate_slip_html(student, deed, cat_name):
    sid = student.get('student_id', '-')
    rank = student.get('rank', 'นพอ.')
    fname = student.get('first_name', '')
    lname = student.get('last_name', '')
    full_name = f"{rank} {fname} {lname}".strip()
    cy = student.get('class_year', '69')
    year = student.get('year', 1)
    
    deed_id = deed.get('id', '1000')
    desc = deed.get('description') or deed.get('title') or 'กิจกรรมจิตอาสา'
    hours = float(deed.get('hours', 2.0))
    act_date = deed.get('activityDate') or deed.get('event_date') or '2026-08-10'
    location = deed.get('note') or deed.get('location') or 'วิทยาลัยพยาบาลทหารอากาศ'
    approver = deed.get('approved_by') or deed.get('signer') or 'อาจารย์ผู้ควบคุมประจำรุ่น'
    status_str = '✅ อนุมัติเรียบร้อย' if deed.get('status') == 'approved' else '⏳ รอการตรวจประเมิน'

    html = f"""<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>ใบบันทึกความดีจิตอาสาส่วนบุคคล — DEED-{deed_id}</title>
    <style>
        body {{ font-family: sans-serif; padding: 20px; color: #0a192f; background: #fff; }}
        .box {{ border: 3px double #0a192f; padding: 20px; max-width: 800px; margin: 0 auto; border-radius: 8px; }}
        .header {{ text-align: center; border-bottom: 2px solid #c9a227; padding-bottom: 10px; margin-bottom: 15px; }}
        .title {{ font-size: 20px; font-weight: bold; color: #0a192f; }}
        .sub {{ font-size: 16px; color: #c9a227; font-weight: bold; margin-top: 5px; }}
        .section {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px; }}
        .sec-title {{ font-weight: bold; color: #0a192f; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px; }}
        .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 14px; }}
        .badge {{ background: #0a192f; color: #f3e5ab; padding: 15px; text-align: center; border-radius: 8px; border: 2px solid #c9a227; margin: 15px 0; font-size: 24px; font-weight: bold; }}
        .footer {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; text-align: center; margin-top: 30px; font-size: 14px; }}
        .sig-line {{ border-bottom: 1px dashed #64748b; height: 35px; margin-bottom: 5px; }}
    </style>
</head>
<body>
    <div class="box">
        <div class="header">
            <div class="title">วิทยาลัยพยาบาลทหารอากาศ (RTAF NURSING COLLEGE)</div>
            <div class="sub">ใบบันทึกชั่วโมงความดีจิตอาสาส่วนบุคคล (Individual Deed Slip)</div>
        </div>
        <div class="section">
            <div class="sec-title">👤 ข้อมูลนักเรียนพยาบาลทหารอากาศ</div>
            <div class="grid">
                <div><b>ยศ-ชื่อ-สกุล:</b> {full_name}</div>
                <div><b>รหัส นพอ.:</b> {sid}</div>
                <div><b>รุ่น / ชั้นปี:</b> รุ่น {cy} (ชั้นปีที่ {year})</div>
                <div><b>สังกัด:</b> วิทยาลัยพยาบาลทหารอากาศ</div>
            </div>
        </div>
        <div class="section">
            <div class="sec-title">📋 รายละเอียดกิจกรรมความดี (DEED-{deed_id})</div>
            <div class="grid">
                <div style="grid-column: 1 / -1;"><b>หมวดหมู่:</b> {cat_name}</div>
                <div style="grid-column: 1 / -1;"><b>รายละเอียด:</b> {desc}</div>
                <div><b>วันที่ปฏิบัติงาน:</b> {act_date}</div>
                <div><b>สถานที่:</b> {location}</div>
                <div><b>สถานะ:</b> {status_str}</div>
                <div><b>ผู้อนุมัติ:</b> {approver}</div>
            </div>
        </div>
        <div class="badge">
            จำนวนชั่วโมงที่ได้รับการอนุมัติ: {hours:.1f} ชั่วโมง
        </div>
        <div class="footer">
            <div>
                <div class="sig-line"></div>
                <div>( {full_name} )</div>
                <div style="font-size: 12px; color: #64748b;">ผู้บันทึกกิจกรรมจิตอาสา</div>
            </div>
            <div>
                <div class="sig-line"></div>
                <div>( {approver} )</div>
                <div style="font-size: 12px; color: #64748b;">อาจารย์ผู้ตรวจประเมินอนุมัติ</div>
            </div>
        </div>
    </div>
</body>
</html>"""
    return html

def main():
    print("=== STARTING STUDENT RECORDS & INDIVIDUAL PDF SLIP GENERATION ===")
    
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
        stu = students.get(sid, {'student_id': sid})
        stu_name = f"{stu.get('rank', 'นพอ.')} {stu.get('first_name', '')} {stu.get('last_name', '')}".strip()
        stu_folder_name = f"{sid} - {stu_name}" if stu_name else f"Student_{sid}"
        
        cid = int(d.get('categoryId', 7))
        cat_name = category_names.get(cid, 'หมวด 7 - งานจิตอาสาฟรีทั่วไป')
        desc_raw = d.get('description') or d.get('title') or 'กิจกรรมจิตอาสา'
        desc = clean_filename(desc_raw[:40])
        act_date = d.get('activityDate') or d.get('event_date') or '2026-08-10'
        deed_id = str(d.get('id', '1000'))

        act_folder_name = f"{cat_name}/{desc}_{act_date}_DEED-{deed_id}"
        full_path = os.path.join(RECORDS_DIR, stu_folder_name, act_folder_name)
        os.makedirs(full_path, exist_ok=True)

        # 1. Write info.json
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
                'created_at': d.get('created_at') or '2026-08-10T08:00:00Z'
            }, info_f, ensure_ascii=False, indent=2)

        # 2. Write individual deed_slip.html
        slip_html = generate_slip_html(stu, d, cat_name)
        with open(os.path.join(full_path, 'deed_slip.html'), 'w', encoding='utf-8') as slip_f:
            slip_f.write(slip_html)

        count += 1

    print(f"✅ Generated individual PDF/HTML deed slips for {count} records across all Student ID folders in records/")

if __name__ == '__main__':
    main()
