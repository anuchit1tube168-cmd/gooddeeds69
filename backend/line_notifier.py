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

# Credentials are configured privately. Missing credentials stop delivery.
LINE_CHANNEL_ACCESS_TOKEN = os.environ.get('LINE_CHANNEL_ACCESS_TOKEN', '')

def get_ssl_context():
    return ssl.create_default_context()

def save_student_line_binding(student_id, line_user_id, line_display_name='', line_picture_url=''):
    """Retired unverified binding entrypoint. Activation belongs to Cloudflare.

    Do not infer account ownership from a supplied student number or LINE ID.
    Existing private records are preserved; no JSON/JS/CSV export is written.
    """
    return {'status': 'error', 'code': 'AUTHENTICATED_GATEWAY_REQUIRED'}

def get_student_line(student_id):
    """ดึงข้อมูล LINE ID ของนักเรียนตาม student_id"""
    student_id = str(student_id).strip()
    s_path = os.path.join(PRIVATE_DIR, 'students.json')
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

    for p in [os.path.join(PRIVATE_DIR, 'line_mappings.json')]:
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

    for p in [os.path.join(PRIVATE_DIR, 'line_mappings.json')]:
        if os.path.exists(p):
            try:
                with open(p, 'r', encoding='utf-8') as f:
                    m = json.load(f)
                    user_key = m.get(line_user_id)
                    if isinstance(user_key, str) and len(user_key) == 7 and user_key.isdigit():
                        student_info = get_student_info(user_key)
                        if student_info:
                            return {'type': 'student', 'role': 'student', 'student_id': user_key, 'student': student_info}
            except Exception:
                pass

    s_path = os.path.join(PRIVATE_DIR, 'students.json')
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
    s_path = os.path.join(PRIVATE_DIR, 'students.json')
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
    for p in [os.path.join(PRIVATE_DIR, 'line_mappings.json')]:
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
    """Return True only when LINE accepts the request, not proof of delivery.

    No automatic fallback/retry: an uncertain timeout can already be accepted.
    Durable outbox/retry keys are a separate release gate.
    """
    if not LINE_CHANNEL_ACCESS_TOKEN or not to_line_user_id or not messages:
        return False
    payload = json.dumps({'to': to_line_user_id, 'messages': messages}).encode('utf-8')
    req = urllib.request.Request('https://api.line.me/v2/bot/message/push', data=payload,
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {LINE_CHANNEL_ACCESS_TOKEN}'})
    try:
        with urllib.request.urlopen(req, context=get_ssl_context(), timeout=10) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            return resp.status == 200 and isinstance(result, dict) and not result.get('error')
    except (urllib.error.URLError, ValueError, OSError):
        # Never print provider bodies, credentials, recipient IDs or URLs.
        return False

def send_line_via_gas_proxy(to_line_user_id, messages):
    """Retired proxy: never send a channel token to a raw GAS endpoint."""
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
