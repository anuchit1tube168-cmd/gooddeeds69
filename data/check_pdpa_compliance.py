#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
check_pdpa_compliance.py - Automated Security & PDPA Compliance Guard
ระบบบันทึกความดีจิตอาสา วิทยาลัยพยาบาลทหารอากาศ

ตรวจสอบให้แน่ใจว่า:
1. ไม่มีข้อมูลนักเรียน (ชื่อ, นามสกุล, รหัสนักเรียน, รูปถ่าย) อยู่ใน Git Tracking
2. ไม่มีประวัติความดี (deeds.json, deeds_data.js) อยู่ใน Git Tracking
3. .gitignore ครอบคลุมไฟล์สำคัญครบ 100%
4. Git Index (Staged/Tracked) ปลอดภัย 100%
"""

import os
import sys
import subprocess

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

FORBIDDEN_TRACKED_PATTERNS = [
    'frontend/data/students',
    'frontend/data/deeds',
    'frontend/data/line_mappings',
    'frontend/data/photos.json',
    'data/students.json',
    'data/students_data.js',
    'data/students_photos.js',
    'data/deeds.json',
    'data/deeds_data.js',
    'records/',
    'backups/',
    'exports/',
    '.xlsx',
    '.xls'
]

REQUIRED_GITIGNORE_ENTRIES = [
    'frontend/data/students',
    'frontend/data/deeds',
    'data/students',
    'data/deeds',
    'records/',
    '*.xlsx'
]

def check_gitignore():
    print("\n🔍 1. ตรวจสอบความสมบูรณ์ของ .gitignore...")
    gitignore_path = os.path.join(PROJECT_ROOT, '.gitignore')
    if not os.path.exists(gitignore_path):
        print("❌ ไม่พบไฟล์ .gitignore ในโฟลเดอร์โครงการ!")
        return False

    with open(gitignore_path, 'r', encoding='utf-8') as f:
        content = f.read()

    missing = []
    for pattern in REQUIRED_GITIGNORE_ENTRIES:
        if pattern not in content:
            missing.append(pattern)

    if missing:
        print(f"⚠️ คำเตือน: .gitignore ขาดรูปแบบต่อไปนี้: {missing}")
        return False
    
    print("✅ .gitignore ครอบคลุมไฟล์สำคัญและข้อมูลส่วนบุคคล นพอ. ครบถ้วน 100%")
    return True

def check_git_tracked_files():
    print("\n🔍 2. สแกนไฟล์ที่ถูกติดตามใน Git (Tracked Files)...")
    try:
        res = subprocess.run(
            ['git', 'ls-files'],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            check=True
        )
        tracked_files = res.stdout.strip().splitlines()
    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาดในการรัน git ls-files: {e}")
        return False

    violations = []
    for filepath in tracked_files:
        for forbidden in FORBIDDEN_TRACKED_PATTERNS:
            if forbidden in filepath:
                violations.append((filepath, forbidden))

    if violations:
        print("❌ พบไฟล์ข้อมูลสำคัญ/ส่วนบุคคลถูกติดตามใน Git:")
        for path, pattern in violations:
            print(f"   🚨 {path} (ตรงกับกฎ: {pattern})")
        print("\n👉 กรุณารัน: git rm --cached <file> เพื่อนำออกจาก Git Tracking")
        return False

    print(f"✅ ปลอดภัย! สแกนไฟล์ทั้งหมด {len(tracked_files)} ไฟล์ ไม่พบข้อมูล นพอ. หรือประวัติความดีใน Git Tracking")
    return True

def check_local_data_integrity():
    print("\n🔍 3. ตรวจสอบความสมบูรณ์ของฐานข้อมูลจริงในเครื่อง (Local Storage)...")
    required_local_files = [
        'data/deeds.json',
        'data/students_data.js',
        'frontend/data/deeds.json',
        'frontend/data/students_data.js'
    ]

    all_exist = True
    for f in required_local_files:
        p = os.path.join(PROJECT_ROOT, f)
        if os.path.exists(p):
            size_kb = os.path.getsize(p) / 1024
            print(f"   💾 {f}: มีอยู่จริง ({size_kb:.1f} KB)")
        else:
            print(f"   ⚠️ ไม่พบไฟล์ {f} ในเครื่อง!")
            all_exist = False

    if all_exist:
        print("✅ ฐานข้อมูลจริงในเครื่อง (Local) ยังคงอยู่ครบถ้วนสมบูรณ์ 100%")
    return all_exist

def main():
    print("=" * 60)
    print("🛡️ RTAFNC GOOD DEEDS — PDPA & SECURITY COMPLIANCE AUDIT")
    print("=" * 60)

    pass_gitignore = check_gitignore()
    pass_git_tracked = check_git_tracked_files()
    pass_local_data = check_local_data_integrity()

    print("\n" + "=" * 60)
    if pass_gitignore and pass_git_tracked and pass_local_data:
        print("🎉 ผลการตรวจสอบ: ผ่านเกณฑ์ความปลอดภัย PDPA 100% 🟢")
        print("🔒 สรุป: ข้อมูลสำคัญจะไม่ถูกส่งขึ้น GitHub แต่มีครบในเครื่องพร้อมใช้งาน")
        print("=" * 60)
        return 0
    else:
        print("❌ ผลการตรวจสอบ: มีจุดที่ต้องแก้ไขด้านความปลอดภัย 🔴")
        print("=" * 60)
        return 1

if __name__ == '__main__':
    sys.exit(main())
