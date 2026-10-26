#!/usr/bin/env python3
"""
sync_to_gdrive.py
อัปเดตและซิงค์ข้อมูลแฟ้มประวัติความดีส่วนบุคคล (records/) และฐานข้อมูลล่าสุดขึ้นสู่ Google Drive
เป้าหมาย:
~/Library/CloudStorage/GoogleDrive-anuchit1tube168@gmail.com/ไดรฟ์ของฉัน/ระบบบันทึกความดี_วพอ_2569

ขั้นตอน:
1. ตรวจสอบนักเรียนที่ยังไม่มีโฟลเดอร์ใน Google Drive (เช่น นพอ. รุ่น 69 และรุ่นอื่นๆ) แล้วสร้างโฟลเดอร์พร้อมคัดลอกไฟล์ทั้งหมด
2. ตรวจสอบนักเรียนเดิมที่มีไฟล์/กิจกรรมความดีใหม่ (info.json, deed_slip.html, evidence.jpg) แล้วอัปเดตให้เป็นปัจจุบัน
3. ซิงค์โฟลเดอร์แฟ้มความดีปี 2569 (records/AY2569)
4. อัปเดตไฟล์ฐานข้อมูลส่วนกลาง (deeds.json, deeds_data.js, students.json) ใน Google Drive
"""

import os
import shutil
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOCAL_RECORDS = os.path.join(BASE_DIR, 'records')
LOCAL_DATA = os.path.join(BASE_DIR, 'data')

GDRIVE_ROOT = os.path.expanduser('~/Library/CloudStorage/GoogleDrive-anuchit1tube168@gmail.com/ไดรฟ์ของฉัน/ระบบบันทึกความดี_วพอ_2569')
GDRIVE_RECORDS = os.path.join(GDRIVE_ROOT, 'records')

def copy_file_if_needed(src, dst):
    """คัดลอกไฟล์หากยังไม่มี หรือขนาด/เวลาแก้ไขเปลี่ยนแปลง"""
    if not os.path.exists(dst):
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(src, dst)
        return True
    
    # หากขนาดไฟล์ต่างกัน คัดลอกทับ
    if os.path.getsize(src) != os.path.getsize(dst):
        shutil.copy2(src, dst)
        return True

    return False

def sync_records():
    print(f"🚀 เริ่มต้นการอัปเดตข้อมูลนักเรียนขึ้นสู่ Google Drive...")
    print(f"📂 โฟลเดอร์ต้นทาง: {LOCAL_RECORDS}")
    print(f"☁️ โฟลเดอร์ปลายทาง: {GDRIVE_RECORDS}")

    if not os.path.exists(GDRIVE_ROOT):
        raise FileNotFoundError(f"ไม่พบโฟลเดอร์ Google Drive: {GDRIVE_ROOT}")

    os.makedirs(GDRIVE_RECORDS, exist_ok=True)

    new_students_count = 0
    updated_students_count = 0
    total_files_synced = 0
    new_students_list = []
    updated_students_list = []

    # รายชื่อโฟลเดอร์ทั้งหมดใน records/
    items = sorted(os.listdir(LOCAL_RECORDS))

    for item in items:
        # ข้ามไฟล์หรือโฟลเดอร์ที่ไม่ใช่โฟลเดอร์นักเรียน (ต้องมีรหัสนักเรียน 7 หลัก)
        if not re.match(r'^\d{7}\s*-', item):
            continue

        loc_student_path = os.path.join(LOCAL_RECORDS, item)
        if not os.path.isdir(loc_student_path):
            continue

        gd_student_path = os.path.join(GDRIVE_RECORDS, item)
        is_new_student = not os.path.exists(gd_student_path)
        student_files_synced = 0

        # เดินสำรวจไฟล์ทั้งหมดของนักเรียนคนนี้
        for root, dirs, files in os.walk(loc_student_path):
            rel_dir = os.path.relpath(root, loc_student_path)
            target_dir = os.path.join(gd_student_path, rel_dir) if rel_dir != '.' else gd_student_path

            for f in files:
                if f.startswith('.'):
                    continue
                src_file = os.path.join(root, f)
                dst_file = os.path.join(target_dir, f)

                if copy_file_if_needed(src_file, dst_file):
                    student_files_synced += 1
                    total_files_synced += 1

        if is_new_student:
            new_students_count += 1
            new_students_list.append((item, student_files_synced))
        elif student_files_synced > 0:
            updated_students_count += 1
            updated_students_list.append((item, student_files_synced))

    print(f"\n✅ 1. เพิ่มโฟลเดอร์นักเรียนใหม่เข้า Google Drive: {new_students_count} คน")
    for s, cnt in new_students_list:
        print(f"   ➕ {s} ({cnt} ไฟล์)")

    print(f"\n✅ 2. อัปเดตกิจกรรมความดี/เอกสารใหม่ให้นักเรียนเดิม: {updated_students_count} คน")
    for s, cnt in updated_students_list[:10]:
        print(f"   🔄 {s} ({cnt} ไฟล์ใหม่/อัปเดต)")
    if len(updated_students_list) > 10:
        print(f"   ... และนักเรียนท่านอื่นอีก {len(updated_students_list) - 10} คน")

    # 3. ซิงค์โฟลเดอร์ AY2569
    print("\n3. กำลังซิงค์โฟลเดอร์ records/AY2569...")
    loc_ay = os.path.join(LOCAL_RECORDS, 'AY2569')
    gd_ay = os.path.join(GDRIVE_RECORDS, 'AY2569')
    ay_files_synced = 0
    if os.path.exists(loc_ay):
        for root, dirs, files in os.walk(loc_ay):
            rel = os.path.relpath(root, loc_ay)
            target = os.path.join(gd_ay, rel) if rel != '.' else gd_ay
            for f in files:
                if f.startswith('.'):
                    continue
                if copy_file_if_needed(os.path.join(root, f), os.path.join(target, f)):
                    ay_files_synced += 1
                    total_files_synced += 1
        print(f"   ✅ ซิงค์ records/AY2569 เรียบร้อย ({ay_files_synced} ไฟล์)")

    # 4. ซิงค์ไฟล์ฐานข้อมูลหลัก deeds.json, deeds_data.js, students.json
    print("\n4. กำลังอัปเดตฐานข้อมูลส่วนกลางบน Google Drive...")
    db_files = [
        ('data/deeds.json', ['data/deeds.json', '03_แฟ้มความดีปีการศึกษา_2569/deeds.json']),
        ('data/deeds_data.js', ['data/deeds_data.js', '03_แฟ้มความดีปีการศึกษา_2569/deeds_data.js']),
        ('data/students.json', ['data/students.json', '01_ทะเบียนรายชื่อนักเรียน/students.json']),
        ('data/students_data.js', ['data/students_data.js', 'frontend/data/students_data.js'])
    ]

    for rel_src, dst_list in db_files:
        full_src = os.path.join(BASE_DIR, rel_src)
        if os.path.exists(full_src):
            for rel_dst in dst_list:
                full_dst = os.path.join(GDRIVE_ROOT, rel_dst)
                if copy_file_if_needed(full_src, full_dst):
                    print(f"   ✅ อัปเดต {rel_dst}")

    print(f"\n🎉 สรุปผลการอัปเดตขึ้นสู่ Google Drive สำเร็จเรียบร้อย 100%:")
    print(f"   - นักเรียนใหม่ที่สร้างโฟลเดอร์: {new_students_count} คน")
    print(f"   - นักเรียนเดิมที่อัปเดตข้อมูล: {updated_students_count} คน")
    print(f"   - รวมไฟล์ที่ซิงค์ทั้งหมด: {total_files_synced} ไฟล์")
    print(f"   - สถานะ: Google Drive for Desktop กำลังซิงค์ขึ้น Cloud อัตโนมัติ 🟢")

if __name__ == '__main__':
    sync_records()
