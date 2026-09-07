#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
line_notifier.py
ระบบจัดการ LINE User ID และแจ้งเตือนอัตโนมัติ (RTAFNC 2569):
1. จัดเก็บ LINE User ID ของทุกคนลงฐานข้อมูลกลาง (students.json, line_mappings.json, Main_2569_Summary.csv, Google Sheets)
2. ตรวจสอบและดึงข้อมูล LINE ID อัตโนมัติ ("ถ้ามีแล้วไม่ต้องรายคน") เพื่อให้เข้าใช้งานและรับแจ้งเตือนได้ทันที
3. ส่งแจ้งเตือนอัตโนมัติทุกครั้งเมื่อมีการส่งความดี หรือได้รับการอนุมัติ/ปฏิเสธ (Push Flex Message)
"""
import os
import sys
import json
import csv
import time
import ssl
import urllib.request
import urllib.error
import threading

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')
FRONTEND_DATA_DIR = os.path.join(BASE_DIR, 'frontend', 'data')
PRIVATE_DIR = os.path.join(DATA_DIR, 'private')

LINE_CHANNEL_ACCESS_TOKEN = os.environ.get(
    'LINE_CHANNEL_ACCESS_TOKEN',
    'vyXhnvU/stGL9mUrIPKB+30x6OwFuFsercCL0UwISHKcV+qn3VW7FYL1kTa8kgm/+GpjDU3s+F/DPaFJwyZK58Y7iNrNXidTBmbaJu7w5ReFAiBmFe+QJ6z6tytonZPqmtfuO9pSU8tnmfRTh2+uvwdB04t89/1O/w1cDnyilFU='
)
GAS_URL = 'https://script.google.com/macros/s/AKfycbwV0b31hWMSs2oNOff4o-O_PNoEQ1XlTM77f4sei9JLh1rza1SfFPTOlTaxiIKCIxLT_Q/exec'

def get_ssl_context():
    return ssl._create_unverified_context()

# -------------------------------------------------------------
# 1. จัดเก็บ LINE User ID ถาวร (Centralized Storage)
# -------------------------------------------------------------
def save_student_line_binding(student_id, line_user_id, line_display_name='', line_picture_url=''):
    """
    บันทึก LINE ID ของนักเรียนหรือผู้ดูแลระบบลงทุกระบบอย่างสมบูรณ์
    """
    student_id = str(student_id).strip()
    line_user_id = str(line_user_id).strip()
    if not student_id or not line_user_id:
        return {'status': 'error', 'message': 'Missing student_id or line_user_id'}

    now_iso = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    os.makedirs(PRIVATE_DIR, exist_ok=True)
    os.makedirs(FRONTEND_DATA_DIR, exist_ok=True)

    # 1. Update line_mappings.json in both private and frontend/data
    mappings = {}
    for p in [os.path.join(PRIVATE_DIR, 'line_mappings.json'), os.path.join(FRONTEND_DATA_DIR, 'line_mappings.json')]:
        if os.path.exists(p):
            try:
                with open(p, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        mappings.update(data)
            except Exception:
                pass

    # Bidirectional mapping
    mappings[line_user_id] = student_id
    mappings[student_id] = {
        'student_id': student_id,
        'line_user_id': line_user_id,
        'line_display_name': line_display_name,
        'line_picture_url': line_picture_url,
        'updated_at': now_iso
    }

    for p in [os.path.join(PRIVATE_DIR, 'line_mappings.json'), os.path.join(FRONTEND_DATA_DIR, 'line_mappings.json')]:
        try:
            with open(p, 'w', encoding='utf-8') as f:
                json.dump(mappings, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"⚠️ Error saving line_mappings to {p}: {e}")

    # 2. Update students.json and students_data.js
    for p in [os.path.join(DATA_DIR, 'students.json'), os.path.join(FRONTEND_DATA_DIR, 'students.json')]:
        if os.path.exists(p):
            try:
                with open(p, 'r', encoding='utf-8') as f:
                    s_list = json.load(f)
                for s in s_list:
                    if str(s.get('student_id')) == student_id:
                        s['line_user_id'] = line_user_id
                        s['line_display_name'] = line_display_name
                        if line_picture_url:
                            s['line_picture_url'] = line_picture_url
                        s['line_bound_at'] = now_iso
                with open(p, 'w', encoding='utf-8') as f:
                    json.dump(s_list, f, ensure_ascii=False, indent=2)

                # Re-export students_data.js
                js_file = p.replace('.json', '_data.js')
                js_json = json.dumps(s_list, ensure_ascii=False, indent=2)
                js_content = (
                    "// Auto-updated by line_notifier.py\n"
                    f"const STUDENTS_DATA = {js_json};\n\n"
                    "if (typeof window !== 'undefined') window.STUDENTS_DATA = STUDENTS_DATA;\n"
                    "if (typeof globalThis !== 'undefined') globalThis.STUDENTS_DATA = STUDENTS_DATA;\n"
                )
                with open(js_file, 'w', encoding='utf-8') as jf:
                    jf.write(js_content)
            except Exception as e:
                print(f"⚠️ Error updating {p}: {e}")

    # 3. Update Main_2569_Summary.csv
    csv_path = os.path.join(BASE_DIR, 'Main_2569_Summary.csv')
    if os.path.exists(csv_path):
        try:
            rows = []
            with open(csv_path, 'r', encoding='utf-8-sig') as f:
                reader = csv.reader(f)
                rows = list(reader)

            if rows and len(rows) > 1:
                header = rows[0]
                uid_idx = 21 if len(header) > 21 and 'LINE User ID' in header[21] else -1
                name_idx = 22 if len(header) > 22 and 'ชื่อ LINE' in header[22] else -1

                if uid_idx != -1:
                    for r in rows[1:]:
                        if len(r) > 1 and str(r[1]).strip() == student_id:
                            r[uid_idx] = line_user_id
                            if name_idx != -1 and line_display_name:
                                r[name_idx] = line_display_name
                            break

                    with open(csv_path, 'w', encoding='utf-8-sig', newline='') as f:
                        writer = csv.writer(f)
                        writer.writerows(rows)
        except Exception as e:
            print(f"⚠️ Error updating Main_2569_Summary.csv: {e}")

    # 4. Sync to Google Apps Script Cloud in background thread
    def _sync_gas():
        try:
            post_payload = json.dumps({
                'action': 'bind_line',
                'studentId': student_id,
                'lineUserId': line_user_id,
                'lineDisplayName': line_display_name,
                'linePictureUrl': line_picture_url
            }).encode('utf-8')
            req = urllib.request.Request(GAS_URL, data=post_payload, headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req, context=get_ssl_context(), timeout=15) as resp:
                pass
        except Exception:
            pass

    threading.Thread(target=_sync_gas, daemon=True).start()

    print(f"🟢 Bound & Stored LINE ID: Student={student_id} | LINE={line_display_name} ({line_user_id[:10]}...)")
    return {'status': 'success', 'studentId': student_id, 'lineUserId': line_user_id}

# -------------------------------------------------------------
# 2. ค้นหาข้อมูล LINE ID ("ถ้ามีแล้วไม่ต้องรายคน")
# -------------------------------------------------------------
def get_student_line(student_id):
    """ดึงข้อมูล LINE ID ของนักเรียนตาม student_id"""
    student_id = str(student_id).strip()
    s_path = os.path.join(FRONTEND_DATA_DIR, 'students.json')
    if not os.path.exists(s_path):
        s_path = os.path.join(DATA_DIR, 'students.json')
    if os.path.exists(s_path):
        try:
            with open(s_path, 'r', encoding='utf-8') as f:
                for s in json.load(f):
                    if str(s.get('student_id')) == student_id:
                        uid = s.get('line_user_id')
                        if uid:
                            return {
                                'line_user_id': uid,
                                'line_display_name': s.get('line_display_name', ''),
                                'line_picture_url': s.get('line_picture_url', '')
                            }
        except Exception:
            pass

    for p in [os.path.join(FRONTEND_DATA_DIR, 'line_mappings.json'), os.path.join(PRIVATE_DIR, 'line_mappings.json')]:
        if os.path.exists(p):
            try:
                with open(p, 'r', encoding='utf-8') as f:
                    m = json.load(f)
                    info = m.get(student_id)
                    if isinstance(info, dict) and info.get('line_user_id'):
                        return info
                    elif isinstance(info, str) and info.startswith('U'):
                        return {'line_user_id': info, 'line_display_name': ''}
            except Exception:
                pass

    return None

def find_user_by_line_id(line_user_id):
    """
    ค้นหาว่า LINE User ID นี้เป็นของนักเรียนหรืออาจารย์ท่านใด
    ช่วยให้ล็อกอินอัตโนมัติโดยไม่ต้องกรอกข้อมูลซ้ำ ("ถ้ามีแล้วไม่ต้องรายคน")
    """
    line_user_id = str(line_user_id).strip()
    if not line_user_id:
        return None

    for p in [os.path.join(FRONTEND_DATA_DIR, 'line_mappings.json'), os.path.join(PRIVATE_DIR, 'line_mappings.json')]:
        if os.path.exists(p):
            try:
                with open(p, 'r', encoding='utf-8') as f:
                    m = json.load(f)
                    user_key = m.get(line_user_id)
                    if user_key:
                        if user_key in ['admin', 'anuchit', 'bird', 'teacher']:
                            return {'type': 'staff', 'role': 'admin' if user_key in ['admin', 'anuchit', 'bird'] else 'teacher', 'username': user_key}
                        else:
                            student_info = get_student_info(user_key)
                            return {'type': 'student', 'role': 'student', 'student_id': str(user_key), 'student': student_info}
            except Exception:
                pass

    s_path = os.path.join(FRONTEND_DATA_DIR, 'students.json')
    if not os.path.exists(s_path):
        s_path = os.path.join(DATA_DIR, 'students.json')
    if os.path.exists(s_path):
        try:
            with open(s_path, 'r', encoding='utf-8') as f:
                for s in json.load(f):
                    if s.get('line_user_id') == line_user_id:
                        return {'type': 'student', 'role': 'student', 'student_id': str(s.get('student_id')), 'student': s}
        except Exception:
            pass

    return None

def get_student_info(student_id):
    s_path = os.path.join(FRONTEND_DATA_DIR, 'students.json')
    if not os.path.exists(s_path):
        s_path = os.path.join(DATA_DIR, 'students.json')
    if os.path.exists(s_path):
        try:
            with open(s_path, 'r', encoding='utf-8') as f:
                for s in json.load(f):
                    if str(s.get('student_id')) == str(student_id):
                        return s
        except Exception:
            pass
    return None

def get_all_line_mappings():
    mappings = {}
    for p in [os.path.join(FRONTEND_DATA_DIR, 'line_mappings.json'), os.path.join(PRIVATE_DIR, 'line_mappings.json')]:
        if os.path.exists(p):
            try:
                with open(p, 'r', encoding='utf-8') as f:
                    m = json.load(f)
                    if isinstance(m, dict):
                        mappings.update(m)
            except Exception:
                pass
    return mappings

# -------------------------------------------------------------
# 3. ส่งข้อความแจ้งเตือนอัตโนมัติ (Automated Notification)
# -------------------------------------------------------------
def send_line_push_message(to_line_user_id, messages):
    """ส่งข้อความ Push Message ผ่าน LINE Official Account"""
    if not to_line_user_id or not messages:
        return False

    url = 'https://api.line.me/v2/bot/message/push'
    payload = {
        'to': to_line_user_id,
        'messages': messages
    }
    req_data = json.dumps(payload).encode('utf-8')
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {LINE_CHANNEL_ACCESS_TOKEN}'
    }

    req = urllib.request.Request(url, data=req_data, headers=headers)
    try:
        with urllib.request.urlopen(req, context=get_ssl_context(), timeout=10) as resp:
            print(f"📲 LINE Push Success to {to_line_user_id[:10]}... (HTTP {resp.status})")
            return True
    except urllib.error.HTTPError as e:
        err = e.read().decode('utf-8', errors='ignore')
        print(f"⚠️ LINE Push HTTP Error: {e.code} - {err}")
        return send_line_via_gas_proxy(to_line_user_id, messages)
    except Exception as e:
        print(f"⚠️ LINE Push Request Error: {e}")
        return send_line_via_gas_proxy(to_line_user_id, messages)

def send_line_via_gas_proxy(to_line_user_id, messages):
    """Proxy ส่งข้อความผ่าน Google Apps Script"""
    try:
        proxy_payload = json.dumps({
            'action': 'send_line_message',
            'target': 'single',
            'to': to_line_user_id,
            'messages': messages,
            'token': LINE_CHANNEL_ACCESS_TOKEN
        }).encode('utf-8')
        req = urllib.request.Request(GAS_URL, data=proxy_payload, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, context=get_ssl_context(), timeout=15) as resp:
            return True
    except Exception as e:
        print(f"⚠️ GAS Proxy Error: {e}")
        return False

def notify_deed_status_line(student_id, deed, status, approver_name='ร.อ.อนุชิต ทำจะดี (Bird)', note=None):
    """
    ส่งแจ้งเตือนผลการประเมินความดี (อนุมัติ/ปฏิเสธ) ไปยัง LINE ของ นพอ. ทันที
    """
    line_info = get_student_line(student_id)
    if not line_info or not line_info.get('line_user_id'):
        print(f"ℹ️ Student {student_id} has no LINE User ID. Skipping LINE notification.")
        return False

    to_uid = line_info['line_user_id']
    st = get_student_info(student_id) or {}
    student_name = f"{st.get('rank', 'นพอ.')} {st.get('first_name', '')} {st.get('last_name', '')}".strip() or f"นพอ. รหัส {student_id}"

    title = deed.get('title') or deed.get('description') or 'กิจกรรมจิตอาสา'
    hours = deed.get('hours', 0)
    deed_id = deed.get('id', '')
    slip_url = f"https://anuchit1tube168-cmd.github.io/gooddeeds69/frontend/deed_slip.html?id={deed_id}&studentId={student_id}&autoprint=true"

    is_approved = (status == 'approved')
    status_thai = "อนุมัติเรียบร้อยแล้ว ✅" if is_approved else "ไม่ผ่านการอนุมัติ ❌"
    status_color = "#22c55e" if is_approved else "#ef4444"
    header_title = "ผลการตรวจอนุมัติบันทึกความดี"

    flex_bubble = {
        "type": "bubble",
        "size": "mega",
        "header": {
            "type": "box",
            "layout": "vertical",
            "backgroundColor": "#0a192f",
            "paddingAll": "20px",
            "contents": [
                { "type": "text", "text": "วิทยาลัยพยาบาลทหารอากาศ", "color": "#c9a227", "size": "xs", "weight": "bold" },
                { "type": "text", "text": header_title, "color": "#ffffff", "size": "md", "weight": "bold", "margin": "xs" }
            ]
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "spacing": "md",
            "contents": [
                {
                    "type": "box",
                    "layout": "horizontal",
                    "contents": [
                        { "type": "text", "text": "สถานะ:", "size": "sm", "color": "#888888", "flex": 2 },
                        { "type": "text", "text": status_thai, "size": "sm", "weight": "bold", "color": status_color, "flex": 5 }
                    ]
                },
                {
                    "type": "box",
                    "layout": "horizontal",
                    "contents": [
                        { "type": "text", "text": "นักเรียน:", "size": "sm", "color": "#888888", "flex": 2 },
                        { "type": "text", "text": student_name, "size": "sm", "weight": "bold", "color": "#111827", "flex": 5 }
                    ]
                },
                {
                    "type": "box",
                    "layout": "horizontal",
                    "contents": [
                        { "type": "text", "text": "กิจกรรม:", "size": "sm", "color": "#888888", "flex": 2 },
                        { "type": "text", "text": str(title), "size": "sm", "color": "#374151", "wrap": True, "flex": 5 }
                    ]
                },
                {
                    "type": "box",
                    "layout": "horizontal",
                    "contents": [
                        { "type": "text", "text": "ชั่วโมง:", "size": "sm", "color": "#888888", "flex": 2 },
                        { "type": "text", "text": f"+{hours} ชม.", "size": "sm", "weight": "bold", "color": "#0284c7", "flex": 5 }
                    ]
                },
                {
                    "type": "box",
                    "layout": "horizontal",
                    "contents": [
                        { "type": "text", "text": "ผู้ตรวจ:", "size": "sm", "color": "#888888", "flex": 2 },
                        { "type": "text", "text": str(approver_name), "size": "sm", "color": "#4b5563", "flex": 5 }
                    ]
                }
            ]
        },
        "footer": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "button",
                    "action": {
                        "type": "uri",
                        "label": "📄 เปิดดูใบบันทึกความดี A4 (PDF)",
                        "uri": slip_url
                    },
                    "style": "primary",
                    "color": "#0a192f"
                }
            ]
        }
    }

    message = {
        "type": "flex",
        "altText": f"🎖️ แจ้งสถานะบันทึกความดี: {title} ({status_thai})",
        "contents": flex_bubble
    }

    def _push():
        send_line_push_message(to_uid, [message])
    threading.Thread(target=_push, daemon=True).start()
    return True

def notify_deed_submission_line(student_id, deed):
    """
    ส่งแจ้งเตือนยืนยันการรับบันทึกความดีเข้าสู่ระบบไปยัง LINE ของ นพอ.
    """
    line_info = get_student_line(student_id)
    if not line_info or not line_info.get('line_user_id'):
        return False

    to_uid = line_info['line_user_id']
    title = deed.get('title') or deed.get('description') or 'กิจกรรมจิตอาสา'
    hours = deed.get('hours', 0)

    msg_text = (
        "📥 บันทึกความดีของคุณถูกส่งเข้าสู่ระบบแล้ว!\n"
        "━━━━━━━━━━━━━━━━━━\n"
        f"📋 กิจกรรม: {title}\n"
        f"⏱ จำนวน: {hours} ชั่วโมง\n"
        "⏳ สถานะ: รออาจารย์ตรวจประเมิน\n\n"
        "ระบบจะแจ้งเตือนให้ทราบทันทีเมื่อได้รับการอนุมัติครับ 🎖️"
    )
    message = {
        "type": "text",
        "text": msg_text
    }
    def _push():
        send_line_push_message(to_uid, [message])
    threading.Thread(target=_push, daemon=True).start()
    return True
