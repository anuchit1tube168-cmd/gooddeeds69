#!/usr/bin/env python3
"""
line_flex_sender.py
สคริปต์ส่งข้อความ LINE Flex Message ถึงนักเรียนรายคน (Push), กลุ่มนักเรียน (Multicast) หรือทุกคน (Broadcast)
"""
import urllib.request
import json
import os
import sys

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(DATA_DIR)

# ใส่ LINE Messaging API Channel Access Token (จาก LINE Developers Console)
LINE_CHANNEL_ACCESS_TOKEN = os.environ.get('LINE_CHANNEL_ACCESS_TOKEN', '')

def send_line_api_request(endpoint, payload):
    if not LINE_CHANNEL_ACCESS_TOKEN:
        print("⚠️ กรุณาตั้งค่า LINE_CHANNEL_ACCESS_TOKEN ก่อนส่ง API")
        return {"error": "Missing LINE_CHANNEL_ACCESS_TOKEN"}
        
    url = f"https://api.line.me/v2/bot/message/{endpoint}"
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {LINE_CHANNEL_ACCESS_TOKEN}'
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8')
        print(f"❌ LINE API HTTP Error: {e.code} - {err_msg}")
        return {"error": err_msg, "code": e.code}
    except Exception as e:
        print(f"❌ LINE Request Error: {e}")
        return {"error": str(e)}

def build_deed_flex_message(deed, student):
    slip_url = f"https://anuchit1tube168-cmd.github.io/gooddeeds69/frontend/deed_slip.html?id={deed.get('id')}&studentId={student.get('student_id')}&autoprint=true"
    status_text = "✅ อนุมัติแล้ว" if deed.get('status') == 'approved' else ("❌ ปฏิเสธ" if deed.get('status') == 'rejected' else "⏳ รอตรวจประเมิน")
    status_color = "#22c55e" if deed.get('status') == 'approved' else ("#ef4444" if deed.get('status') == 'rejected' else "#f59e0b")
    
    return {
        "type": "flex",
        "altText": f"🎖️ แจ้งสถานะบันทึกความดี: {student.get('first_name')} ({deed.get('hours')} ชม.)",
        "contents": {
            "type": "bubble",
            "size": "mega",
            "header": {
                "type": "box",
                "layout": "vertical",
                "backgroundColor": "#0a192f",
                "paddingAll": "20px",
                "contents": [
                    {
                        "type": "text",
                        "text": "วิทยาลัยพยาบาลทหารอากาศ",
                        "color": "#c9a227",
                        "size": "xs",
                        "weight": "bold"
                    },
                    {
                        "type": "text",
                        "text": "ผลการประเมินบันทึกความดีจิตอาสา",
                        "color": "#ffffff",
                        "size": "md",
                        "weight": "bold",
                        "margin": "xs"
                    }
                ]
            },
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "box",
                        "layout": "horizontal",
                        "contents": [
                            {"type": "text", "text": "👤 นพอ.:", "size": "sm", "color": "#888888", "flex": 2},
                            {"type": "text", "text": f"{student.get('rank', 'นพอ.')} {student.get('first_name', '')} {student.get('last_name', '')}", "size": "sm", "weight": "bold", "color": "#111111", "flex": 5}
                        ]
                    },
                    {
                        "type": "box",
                        "layout": "horizontal",
                        "margin": "sm",
                        "contents": [
                            {"type": "text", "text": "🎫 รหัส:", "size": "sm", "color": "#888888", "flex": 2},
                            {"type": "text", "text": f"{student.get('student_id')} (รุ่น {student.get('class_year', '69')})", "size": "sm", "color": "#333333", "flex": 5}
                        ]
                    },
                    {"type": "separator", "margin": "lg"},
                    {
                        "type": "box",
                        "layout": "vertical",
                        "margin": "lg",
                        "contents": [
                            {"type": "text", "text": "📂 กิจกรรม:", "size": "xs", "color": "#3b82f6", "weight": "bold"},
                            {"type": "text", "text": str(deed.get('description', 'กิจกรรมจิตอาสา')), "size": "sm", "color": "#111111", "wrap": True, "margin": "xs"}
                        ]
                    },
                    {
                        "type": "box",
                        "layout": "horizontal",
                        "margin": "lg",
                        "contents": [
                            {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {"type": "text", "text": "ชั่วโมงกิจกรรม", "size": "xs", "color": "#888888"},
                                    {"type": "text", "text": f"{deed.get('hours', 0)} ชม.", "size": "xl", "weight": "bold", "color": "#c9a227"}
                                ]
                            },
                            {
                                "type": "box",
                                "layout": "vertical",
                                "alignItems": "flex-end",
                                "contents": [
                                    {"type": "text", "text": "สถานะ", "size": "xs", "color": "#888888"},
                                    {"type": "text", "text": status_text, "size": "sm", "weight": "bold", "color": status_color}
                                ]
                            }
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
    }

def push_to_student(student_id, flex_message):
    """ส่ง Flex Message รายบุคคลไปยัง LINE User ID ของนักเรียน"""
    students_file = os.path.join(DATA_DIR, 'students.json')
    if not os.path.exists(students_file):
        return {"error": "students.json not found"}
        
    with open(students_file, 'r', encoding='utf-8') as f:
        students = json.load(f)
        
    student = next((s for s in students if str(s.get('student_id')) == str(student_id)), None)
    if not student:
        return {"error": f"Student {student_id} not found"}
        
    line_user_id = student.get('line_user_id')
    if not line_user_id:
        return {"error": f"Student {student_id} hasn't bound LINE ID yet"}
        
    payload = {
        "to": line_user_id,
        "messages": [flex_message]
    }
    return send_line_api_request("push", payload)

def broadcast_to_all(flex_message):
    """บรอดแคสต์ Flex Message ถึงทุกคนที่ติดตาม LINE Official Account"""
    payload = {
        "messages": [flex_message]
    }
    return send_line_api_request("broadcast", payload)

if __name__ == '__main__':
    print("🤖 LINE Flex Message Module Loaded Ready!")
