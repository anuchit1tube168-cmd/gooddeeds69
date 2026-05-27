"""
export_deeds.py
แปลงข้อมูล Main 2568.xlsx → deeds_data.js  (ข้อมูลย้อนหลัง ปีการศึกษา 2568)
อัพเดท: 9 มี.ค. 2569 — ใช้สำหรับนำเข้าข้อมูลเก่าเข้าระบบปี 2569
แต่ละนักเรียนจะได้ deed record หนึ่งรายการต่อหมวดหมู่ (ถ้ามีชั่วโมง > 0)
สถานะ: approved (ผ่านการอนุมัติแล้ว)
"""

import openpyxl
import json
import os
import random
import string
from datetime import datetime, timedelta

EXCEL_PATH = os.path.join(os.path.dirname(__file__), '../Main 2568.xlsx')
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), 'deeds_data.js')

# ชื่อหมวดหมู่ตาม category id ในระบบ
CATEGORY_MAP = [
    (1, 'บริจาคโลหิต/เกล็ดเลือด/พลาสมา'),   # col F (index 5)
    (2, 'โครงการภายนอก (คำสั่ง วพอ.)'),         # col G (index 6)
    (3, 'ช่วยเหลืองานภายใน วพอ.'),              # col H (index 7)
    (4, 'เข้าอบรมที่ วพอ. จัดให้'),             # col I (index 8)
    (5, 'ช่วยงานหน่วยงาน/ชุมชน/มูลนิธิ'),      # col J (index 9)
    (6, 'ทำนุบำรุงศาสนสถาน'),                   # col K (index 10)
    (7, 'งานฟรีทั่วไป'),                         # col L (index 11)
    (8, 'กิจกรรมจงรักภักดีต่อสถาบัน'),          # col M (index 12)
    (9, 'ชม. ที่สมควรได้รับ (บทบาทพิเศษ)'),     # col N (index 13)
]

CAT_COL_START = 5  # column index (0-based) ของหมวดแรก (F)


def rand_id(prefix='deed'):
    chars = string.ascii_lowercase + string.digits
    return prefix + '_' + ''.join(random.choices(chars, k=10))


def make_date(offset_days=0):
    """สร้างวันที่ในปี 2568 สำหรับข้อมูลที่นำเข้าจากปีการศึกษา 2568"""
    base = datetime(2025, 6, 1)  # ปี ค.ศ. 2025 = พ.ศ. 2568
    d = base + timedelta(days=offset_days)
    return d.strftime('%Y-%m-%d')


def main():
    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    ws = wb.active

    all_deeds = {}  # studentId → list of deed objects

    for row_idx, row in enumerate(ws.iter_rows(min_row=4, values_only=True)):
        raw_id = row[1]  # column B
        if raw_id is None:
            continue
        student_id = str(int(raw_id)) if isinstance(raw_id, float) else str(raw_id).strip()
        if not student_id.isdigit():
            continue

        deeds = []
        for i, (cat_id, cat_name) in enumerate(CATEGORY_MAP):
            col_idx = CAT_COL_START + i
            hours_val = row[col_idx]
            if hours_val is None or hours_val == 0:
                continue
            try:
                hours = float(hours_val)
            except (TypeError, ValueError):
                continue
            if hours <= 0:
                continue

            deed = {
                'id': f"import_{student_id}_{cat_id}",
                'studentId': student_id,
                'categoryId': cat_id,
                'hours': hours,
                'description': f'ข้อมูลนำเข้าจากระบบเดิม ปี 2568 — {cat_name}',
                'activityDate': make_date(offset_days=i * 20 + row_idx),
                'imageUrls': [],
                'status': 'approved',
                'submittedAt': '2025-01-01T00:00:00.000Z',
                'approvedBy': 'ระบบนำเข้าข้อมูล',
                'approvedAt': '2025-12-31T00:00:00.000Z',
                'rejectReason': None,
                'note': 'นำเข้าจาก Main 2568.xlsx',
            }
            deeds.append(deed)

        if deeds:
            all_deeds[student_id] = deeds

    # เขียน JS file
    js_content = '// Auto-generated from Main 2568.xlsx — DO NOT EDIT MANUALLY\n'
    js_content += f'// Generated: {datetime.now().strftime("%Y-%m-%d %H:%M")}\n'
    js_content += f'// นักเรียนที่มีข้อมูล: {len(all_deeds)} คน\n\n'
    js_content += 'const IMPORTED_DEEDS = ' + json.dumps(all_deeds, ensure_ascii=False, indent=2) + ';\n'

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        f.write(js_content)

    # Write to frontend/data/
    frontend_output_path = os.path.join(os.path.dirname(OUTPUT_PATH), '../frontend/data/deeds_data.js')
    os.makedirs(os.path.dirname(frontend_output_path), exist_ok=True)
    with open(frontend_output_path, 'w', encoding='utf-8') as f:
        f.write(js_content)

    total_deeds = sum(len(v) for v in all_deeds.values())
    print(f'✅ สำเร็จ! นักเรียน {len(all_deeds)} คน, รายการความดี {total_deeds} รายการ')
    print(f'📄 บันทึกที่: {OUTPUT_PATH}')
    print(f'📄 Sync-copied ที่: {frontend_output_path}')



if __name__ == '__main__':
    main()
