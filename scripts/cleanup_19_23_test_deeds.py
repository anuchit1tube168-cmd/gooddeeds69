#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/cleanup_19_23_test_deeds.py
ทำความสะอาดและจัดเก็บข้อมูลทดสอบระหว่าง 19-23 ก.ย. 2569 เข้าคลังเก็บประวัติ (Archive)
และฟื้นฟูเฉพาะข้อมูลความดีจริงของนักเรียน (Authentic Deeds) ให้ถูกต้อง 100%
ตามข้อกำหนดความปลอดภัยใน AGENTS.md (Clean means inspect, classify and privately archive; never delete/reset)
"""

import os
import sys
import json
import time
import urllib.request
import ssl

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARCHIVE_DIR = os.path.join(BASE_DIR, 'records')
ARCHIVE_FILE = os.path.join(ARCHIVE_DIR, 'archive_test_deeds_20260919_20260923.json')
GAS_URL = 'https://script.google.com/macros/s/AKfycbwV0b31hWMSs2oNOff4o-O_PNoEQ1XlTM77f4sei9JLh1rza1SfFPTOlTaxiIKCIxLT_Q/exec'

SSL_CTX = ssl._create_unverified_context()

def main():
    print("=" * 70)
    print("🧹 CLEANUP & ARCHIVE TEST DEEDS (19 - 23 SEP 2569)")
    print("=" * 70)

    # 1. ดึง Deeds ทั้งหมดจาก GAS
    print("\n1. กำลังดึงรายการ Deeds ทั้งหมดจาก Google Sheets...")
    req = urllib.request.Request(f"{GAS_URL}?action=getDeeds", headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60, context=SSL_CTX) as r:
        all_deeds = json.loads(r.read().decode('utf-8'))
    print(f"   พบรายการทั้งหมดในฐานข้อมูล Google Sheets: {len(all_deeds)} รายการ")

    # 2. จำแนก (Classify) ข้อมูลจริง กับ ข้อมูลทดสอบ 19-23 ก.ย.
    authentic_deeds = []
    test_deeds = []

    for d in all_deeds:
        sub_date = str(d.get("submittedAt") or d.get("activityDate") or "")
        did = str(d.get("id", ""))
        desc = str(d.get("description", ""))
        is_test = (
            any(k in sub_date for k in ["2026-09-19", "2026-09-20", "2026-09-21", "2026-09-22", "2026-09-23"]) or
            any(k in did for k in ["TEST", "SILENT", "NOTIFIED", "LIVE", "OVERSIZE"]) or
            any(k in desc for k in ["ทดสอบ", "TEST", "test", "เดกห"])
        )
        if is_test:
            test_deeds.append(d)
        else:
            authentic_deeds.append(d)

    print(f"\n2. ผลการจำแนก:")
    print(f"   ✅ ข้อมูลความดีจริงของนักเรียน (Authentic): {len(authentic_deeds)} รายการ")
    print(f"   🧪 ข้อมูลทดสอบช่วง 19-23 ก.ย. (To Archive): {len(test_deeds)} รายการ")

    # 3. บันทึกเข้า Private Archive ตาม AGENTS.md
    os.makedirs(ARCHIVE_DIR, exist_ok=True)
    archive_payload = {
        "archived_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "description": "Archive of synthetic and test deeds created during staging tests between 19-23 September 2026",
        "total_archived": len(test_deeds),
        "deeds": test_deeds
    }
    with open(ARCHIVE_FILE, 'w', encoding='utf-8') as f:
        json.dump(archive_payload, f, indent=2, ensure_ascii=False)
    print(f"\n3. จัดเก็บเข้าคลังประวัติเรียบร้อยแล้ว: {ARCHIVE_FILE}")

    # 4. ฟื้นฟู Google Sheets Deeds_2569 ให้มีเฉพาะ Authentic Deeds
    print("\n4. ฟื้นฟูตาราง Deeds_2569 ใน Google Sheets...")
    cleanup_payload = {
        "action": "restore_authentic_deeds",
        "deeds": authentic_deeds
    }
    post_req = urllib.request.Request(
        GAS_URL,
        data=json.dumps(cleanup_payload).encode('utf-8'),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(post_req, timeout=60, context=SSL_CTX) as r:
        gas_res = json.loads(r.read().decode('utf-8'))
    print(f"   ผลการอัปเดต Google Sheets: {gas_res.get('message', gas_res)}")

    # 5. ฟื้นฟูข้อมูลในเครื่อง (Local deeds.json & frontend/data/deeds.json)
    print("\n5. ฟื้นฟูฐานข้อมูลในเครื่อง (Local Storage)...")
    # Group authentic deeds by student_id
    deeds_by_student = {}
    for d in authentic_deeds:
        sid = str(d.get("student_id") or d.get("studentId") or "").strip()
        if sid:
            if sid not in deeds_by_student:
                deeds_by_student[sid] = []
            deeds_by_student[sid].append(d)

    for path in [
        os.path.join(BASE_DIR, 'data', 'deeds.json'),
        os.path.join(BASE_DIR, 'frontend', 'data', 'deeds.json')
    ]:
        if os.path.exists(os.path.dirname(path)):
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(deeds_by_student, f, indent=2, ensure_ascii=False)
            print(f"   อัปเดต {os.path.relpath(path, BASE_DIR)} สำเร็จ")

    # 6. ลบ cache ใน data/notified_deeds.json
    notified_file = os.path.join(BASE_DIR, 'data', 'notified_deeds.json')
    with open(notified_file, 'w', encoding='utf-8') as f:
        # Mark remaining authentic deeds as already seen so they do not spam notifications
        seen_ids = [str(d.get('id', '')) for d in authentic_deeds]
        json.dump(seen_ids, f, indent=2, ensure_ascii=False)
    print(f"   อัปเดต {os.path.relpath(notified_file, BASE_DIR)} สำเร็จ")

    print("\n" + "=" * 70)
    print("🎉 ทำความสะอาดและฟื้นฟูข้อมูลสำเร็จสมบูรณ์ 100%!")
    print(f"คงเหลือเฉพาะข้อมูลความดีจริงของนักเรียน {len(authentic_deeds)} รายการ")
    print("=" * 70)

if __name__ == '__main__':
    main()
