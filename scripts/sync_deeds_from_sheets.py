#!/usr/bin/env python3
"""
sync_deeds_from_sheets.py
ดึงข้อมูลประวัติความดี (Deeds) และข้อมูลนักเรียนล่าสุดจาก Google Sheets (Apps Script Web App)
มาอัปเดตลงในฐานข้อมูลท้องถิ่น:
1. data/deeds.json
2. frontend/data/deeds.json
3. data/deeds_data.js
4. frontend/data/deeds_data.js
5. รันการจัดเก็บลงใน records/ แยกตามรหัสนักเรียนแต่ละคน (organize_student_records)
"""

import os
import json
import urllib.request
import urllib.error
import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')
FRONTEND_DATA_DIR = os.path.join(BASE_DIR, 'frontend', 'data')
RECORDS_DIR = os.path.join(BASE_DIR, 'records')

# Load GAS_URL from env or default
GAS_URL = os.environ.get('GAS_URL', 'https://script.google.com/macros/s/AKfycbwaG05E5dNew4dsf0vD8LBLuWdbThXIkMih1UI8Ba9rnRBCK4xmnlArzZdwtmqV9vOdcw/exec')

def fetch_from_gas(action, retries=3):
    url = f"{GAS_URL}?action={action}"
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'})
            with urllib.request.urlopen(req, timeout=45) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                return data
        except Exception as e:
            print(f"⚠️ ครั้งที่ {attempt}/{retries} ในการดึง {action}: {e}")
            if attempt == retries:
                raise
    return None

def main():
    print(f"🚀 เริ่มต้นซิงค์ข้อมูลจาก Google Sheets...")
    print(f"📡 GAS URL: {GAS_URL}")

    # 1. โหลดข้อมูลเดิมในเครื่องเพื่อเก็บภาพ base64 ไว้ (ป้องกันกรณี Sheets ส่ง string ว่างมา)
    local_deeds_map = {}
    local_deeds_path = os.path.join(DATA_DIR, 'deeds.json')
    if os.path.exists(local_deeds_path):
        try:
            with open(local_deeds_path, 'r', encoding='utf-8') as f:
                prev_deeds = json.load(f)
                if isinstance(prev_deeds, list):
                    for d in prev_deeds:
                        local_deeds_map[str(d.get('id'))] = d
        except Exception as e:
            print(f"⚠️ อ่าน {local_deeds_path} เดิมไม่สำเร็จ: {e}")

    # 2. ดึง Deeds จาก Sheets
    print("\n1. กำลังดึงรายการ Deeds ทั้งหมดจาก Google Sheets...")
    gas_deeds = fetch_from_gas('getDeeds')
    if not isinstance(gas_deeds, list):
        if isinstance(gas_deeds, dict) and 'deeds' in gas_deeds:
            gas_deeds = gas_deeds['deeds']
        else:
            raise ValueError(f"ผลลัพธ์ getDeeds ไม่ถูกต้อง: {type(gas_deeds)}")

    print(f"✅ ดึงสำเร็จ! พบทั้งหมด {len(gas_deeds)} รายการ")

    # รวมข้อมูลภาพเดิมหากใน Sheets ว่าง
    merged_deeds = []
    restored_img_count = 0
    for d in gas_deeds:
        did = str(d.get('id'))
        if not d.get('imageUrl') and did in local_deeds_map:
            prev = local_deeds_map[did]
            if prev.get('imageUrl'):
                d['imageUrl'] = prev['imageUrl']
                restored_img_count += 1
            if prev.get('imageUrls') and not d.get('imageUrls'):
                d['imageUrls'] = prev['imageUrls']
        merged_deeds.append(d)

    if restored_img_count > 0:
        print(f"   (รักษารูปภาพหลักฐานเดิม {restored_img_count} รายการ)")

    # 3. บันทึก data/deeds.json และ frontend/data/deeds.json
    print("\n2. บันทึกข้อมูล JSON ลงในระบบ...")
    for p in [os.path.join(DATA_DIR, 'deeds.json'), os.path.join(FRONTEND_DATA_DIR, 'deeds.json')]:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, 'w', encoding='utf-8') as f:
            json.dump(merged_deeds, f, indent=2, ensure_ascii=False)
        print(f"   ✅ อัปเดต {os.path.relpath(p, BASE_DIR)} ({len(merged_deeds)} รายการ)")

    # 4. บันทึก deeds_data.js ทั้งใน data/ และ frontend/data/
    now_str = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    js_content = f"// Auto-synced from Google Sheets - {now_str}\nvar DEEDS_DATA = {json.dumps(merged_deeds, indent=2, ensure_ascii=False)};\n"
    for p in [os.path.join(DATA_DIR, 'deeds_data.js'), os.path.join(FRONTEND_DATA_DIR, 'deeds_data.js')]:
        with open(p, 'w', encoding='utf-8') as f:
            f.write(js_content)
        print(f"   ✅ อัปเดต {os.path.relpath(p, BASE_DIR)}")

    # 5. ดึงสรุปรายชื่อและชั่วโมงนักเรียน (Students)
    print("\n3. กำลังดึงข้อมูลสรุปชั่วโมงนักเรียน (Students) จาก Google Sheets...")
    gas_students = fetch_from_gas('getStudents')
    if isinstance(gas_students, list):
        print(f"✅ ดึงสำเร็จ! พบนักเรียน {len(gas_students)} คน")
        
        # ตรวจสอบตัวอย่าง นพอ. 6903979
        sample_s = next((s for s in gas_students if str(s.get('student_id')) == '6903979'), None)
        if sample_s:
            print(f"   📌 ตรวจสอบ นพอ. 6903979: ชม.รวม = {sample_s.get('total_hours')} ชม. (หมวด 1: {sample_s.get('categories', [0])[0]} ชม.)")

    # 6. รัน organize_student_records เพื่อจัดแฟ้มแยกรายบุคคลใน records/
    print("\n4. จัดระเบียบแฟ้มข้อมูลและใบบันทึกความดีแยกตามนักเรียนแต่ละคน (records/)...")
    try:
        import subprocess
        res = subprocess.run(['python3', os.path.join(DATA_DIR, 'organize_student_records.py')], capture_output=True, text=True)
        if res.returncode == 0:
            print("   ✅ รัน organize_student_records สำเร็จ:")
            for line in res.stdout.strip().split('\n'):
                if 'Generated' in line or 'records' in line:
                    print(f"      {line}")
        else:
            print(f"   ⚠️ รัน organize_student_records พบข้อผิดพลาด: {res.stderr}")
    except Exception as e:
        print(f"   ⚠️ ไม่สามารถรัน organize_student_records ได้: {e}")

    print("\n🎉 การซิงค์และอัปเดตระบบเสร็จสมบูรณ์เรียบร้อยแล้ว!")

if __name__ == '__main__':
    main()
