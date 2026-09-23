#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
mcp_line_contacts.py - MCP LINE Integration & Student Contact Manager
วิทยาลัยพยาบาลทหารอากาศ กรมแพทย์ทหารอากาศ (วพอ. ๒๕๖๙)

ใช้สำหรับ:
1. จัดเก็บและค้นหา LINE User ID ของ นพอ. เพื่อส่งข้อความหรือแจ้งเตือนผ่าน MCP LINE
2. แสดงรายชื่อ นพอ. ทั้งหมดที่ผูก LINE ID แล้ว
3. Export ข้อมูลในรูปแบบโครงสร้าง JSON สำหรับ MCP LINE Tools
4. บันทึก/อัปเดตการผูก LINE ID ลงใน private storage อย่างปลอดภัย (PDPA 100%)
"""

import os
import sys
import json
import argparse
import time

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')
PRIVATE_DIR = os.path.join(DATA_DIR, 'private')

sys.path.insert(0, os.path.join(BASE_DIR, 'backend'))
try:
    from line_notifier import (
        save_student_line_binding,
        get_student_line,
        find_user_by_line_id,
        get_all_line_mappings
    )
except ImportError:
    pass

def load_students():
    """โหลดข้อมูลนักเรียนจาก private/students.json หรือ data/students.json"""
    for p in [os.path.join(PRIVATE_DIR, 'students.json'), os.path.join(DATA_DIR, 'students.json')]:
        if os.path.exists(p):
            try:
                with open(p, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception:
                pass
    return []

def get_student_contact(student_id):
    """ค้นหาข้อมูลติดต่อ LINE ของนักเรียนตาม student_id"""
    student_id = str(student_id).strip()
    students = load_students()
    student = next((s for s in students if str(s.get('student_id')) == student_id), None)
    
    line_info = None
    try:
        from line_notifier import get_student_line
        line_info = get_student_line(student_id)
    except Exception:
        pass

    line_user_id = (line_info.get('line_user_id') if line_info else None) or (student.get('line_user_id') if student else None)
    line_name = (line_info.get('line_display_name') if line_info else None) or (student.get('line_display_name') if student else '')

    if not student and not line_user_id:
        return None

    return {
        'student_id': student_id,
        'name': f"{student.get('rank', 'นพอ.')} {student.get('first_name', '')} {student.get('last_name', '')}".strip() if student else f"นพอ. ({student_id})",
        'class_year': student.get('class_year', student_id[:2] if len(student_id) >= 2 else '69') if student else '69',
        'year_level': student.get('year_level', '1') if student else '1',
        'line_user_id': line_user_id,
        'line_display_name': line_name,
        'is_bound': bool(line_user_id)
    }

def list_all_line_contacts(only_bound=False):
    """ดึงรายชื่อ นพอ. ทั้งหมดพร้อมสถานะการผูก LINE ID"""
    students = load_students()
    contacts = []
    for s in students:
        sid = str(s.get('student_id', '')).strip()
        if not sid:
            continue
        c = get_student_contact(sid)
        if c:
            if only_bound and not c['is_bound']:
                continue
            contacts.append(c)
    return contacts

def export_for_mcp():
    """สร้างโครงสร้าง JSON สำหรับ MCP LINE Tools"""
    contacts = list_all_line_contacts(only_bound=True)
    export_data = {
        'service': 'RTAFNC Good Deeds Line MCP Integration',
        'academic_year': 2569,
        'generated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'total_bound_students': len(contacts),
        'recipients': [
            {
                'student_id': c['student_id'],
                'name': c['name'],
                'class_year': c['class_year'],
                'year_level': c['year_level'],
                'line_user_id': c['line_user_id'],
                'display_name': c['line_display_name']
            }
            for c in contacts
        ]
    }
    return export_data

def bind_student_line(student_id, line_user_id, display_name=''):
    """ผูก LINE ID เข้ากับรหัสนักเรียนอย่างเป็นทางการ"""
    try:
        from line_notifier import save_student_line_binding
        res = save_student_line_binding(student_id, line_user_id, display_name, verified=True)
        return res
    except Exception as e:
        return {'status': 'error', 'message': str(e)}

def main():
    parser = argparse.ArgumentParser(description='MCP LINE Contacts Manager for RTAFNC Good Deeds')
    parser.add_argument('--list', action='store_true', help='List all students with bound LINE IDs')
    parser.add_argument('--get', metavar='STUDENT_ID', help='Get LINE contact details for a student')
    parser.add_argument('--export', action='store_true', help='Export clean JSON for MCP LINE tools')
    parser.add_argument('--bind', nargs='+', metavar=('STUDENT_ID', 'LINE_USER_ID'), help='Bind student ID to LINE user ID')

    args = parser.parse_args()

    if args.bind:
        sid = args.bind[0]
        luid = args.bind[1]
        name = args.bind[2] if len(args.bind) > 2 else ''
        res = bind_student_line(sid, luid, name)
        print(json.dumps(res, ensure_ascii=False, indent=2))
        return

    if args.get:
        c = get_student_contact(args.get)
        if c:
            print(json.dumps(c, ensure_ascii=False, indent=2))
        else:
            print(f"❌ Student {args.get} not found.")
            sys.exit(1)
        return

    if args.export:
        exp = export_for_mcp()
        print(json.dumps(exp, ensure_ascii=False, indent=2))
        return

    # Default to --list
    contacts = list_all_line_contacts(only_bound=True)
    print(f"📋 RTAFNC Good Deeds — Bound LINE Contacts ({len(contacts)} students):")
    print("-" * 65)
    for c in contacts:
        print(f"🆔 {c['student_id']} | ปี {c['year_level']} (รุ่น {c['class_year']}) | {c['name']} | LINE: {c['line_user_id']} ({c['line_display_name'] or 'N/A'})")
    print("-" * 65)

if __name__ == '__main__':
    main()
