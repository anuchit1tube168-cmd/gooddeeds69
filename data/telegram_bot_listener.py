#!/usr/bin/env python3
"""
telegram_bot_listener.py
สคริปต์จัดการ Telegram Bot Callback Query แบบอัตโนมัติ
เมื่ออาจารย์กดปุ่ม [ ✅ อนุมัติ ] หรือ [ ❌ ปฏิเสธ ] ในกลุ่ม Telegram:
1. ป๊อปอัปแจ้งเตือนความสำเร็จใน Telegram (answerCallbackQuery)
2. อัปเดตสถานะในฐานข้อมูล deeds.json และ deeds_data.js
3. ส่งข้อความตอบกลับใหม่ (Reply Message) ตอบกลับข้อความเดิมอย่างเป็นทางการ
"""
import urllib.request
import json
import os
import time

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(DATA_DIR)

BOT_TOKEN = '8087838067:AAEejIlFni8e9DWVxKpRomTFlmjxYJVNJ0k'
CHAT_ID = '-4839151586'

def send_telegram_request(method, payload):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/{method}"
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"⚠️ Telegram API Error ({method}): {e}")
        return {}

def load_students():
    p = os.path.join(DATA_DIR, 'students.json')
    if os.path.exists(p):
        with open(p, 'r', encoding='utf-8') as f:
            return {s['student_id']: s for s in json.load(f)}
    return {}

def calculate_student_total_hours(student_id):
    p = os.path.join(DATA_DIR, 'deeds.json')
    if not os.path.exists(p):
        return 0.0
    with open(p, 'r', encoding='utf-8') as f:
        deeds = json.load(f)
    total = 0.0
    for d in deeds:
        if str(d.get('student_id')) == str(student_id) and d.get('status') == 'approved':
            total += float(d.get('hours', 0))
    return total

def update_deed_status_in_db(student_id, deed_id, new_status, approver_name):
    deeds_file = os.path.join(DATA_DIR, 'deeds.json')
    if not os.path.exists(deeds_file):
        return False
    
    with open(deeds_file, 'r', encoding='utf-8') as f:
        deeds = json.load(f)
    
    updated = False
    target_deed = None
    
    for d in deeds:
        if (str(d.get('id')) == str(deed_id) or str(d.get('student_id')) == str(student_id)) and d.get('status') == 'pending':
            d['status'] = new_status
            d['approved_by'] = approver_name
            d['updated_at'] = time.strftime('%Y-%m-%dT%H:%M:%SZ')
            target_deed = d
            updated = True
            break
            
    if updated:
        # Save deeds.json
        with open(deeds_file, 'w', encoding='utf-8') as f:
            json.dump(deeds, f, ensure_ascii=False, indent=2)
            
        # Update JS files
        js_content = f"// Auto-updated by telegram_bot_listener.py\nconst DEEDS_DATA = {json.dumps(deeds, ensure_ascii=False, indent=2)};\n"
        for js_p in [os.path.join(DATA_DIR, 'deeds_data.js'), os.path.join(BASE_DIR, 'frontend', 'data', 'deeds_data.js')]:
            with open(js_p, 'w', encoding='utf-8') as f:
                f.write(js_content)
        print(f"✅ DB Updated for student {student_id}: status={new_status}")
        
    return target_deed

def process_callback_query(cb):
    cb_id = cb['id']
    data_str = cb.get('data', '')
    msg = cb.get('message', {})
    msg_id = msg.get('message_id')
    from_user = cb.get('from', {})
    
    approver_name = f"{from_user.get('first_name', 'อาจารย์')} {from_user.get('last_name', '')}".strip()
    if not approver_name:
        approver_name = "อาจารย์ผู้ควบคุม"

    is_approve = 'approve' in data_str
    is_reject = 'reject' in data_str

    if not is_approve and not is_reject:
        return

    # Extract IDs from callback_data (e.g. approve_6603764 or approve_deedId_studentId)
    parts = data_str.split('_')
    student_id = parts[-1]
    deed_id = parts[1] if len(parts) > 2 else ''

    students_map = load_students()
    student = students_map.get(student_id, {})
    student_name = f"{student.get('rank', 'นพอ.')} {student.get('first_name', '')} {student.get('last_name', '')}".strip()
    cy = student.get('class_year', '69')

    if is_approve:
        target_deed = update_deed_status_in_db(student_id, deed_id, 'approved', approver_name)
        total_hrs = calculate_student_total_hours(student_id)
        is_pass = total_hrs >= 36

        # Answer Callback Popup
        send_telegram_request('answerCallbackQuery', {
            'callback_query_id': cb_id,
            'text': f"✅ อนุมัติความดีของ {student_name} เรียบร้อยแล้ว!",
            'show_alert': True
        })

        # Send Official Reply Message
        reply_html = f"""🎉 <b>อนุมัติความดีเรียบร้อยแล้ว!</b>
━━━━━━━━━━━━━━━━━━━━━━━
👤 <b>นักเรียน:</b> {student_name}
🎫 <b>รหัส นพอ.:</b> <code>{student_id}</code> | ชั้นปีที่ {student.get('year', 1)} (รุ่น {cy})
📂 <b>กิจกรรม:</b> {target_deed.get('description', 'บันทึกความดีจิตอาสา') if target_deed else 'กิจกรรมจิตอาสา'}
⏱ <b>ชั่วโมงกิจกรรม:</b> {target_deed.get('hours', 2)} ชม.

👩‍🏫 <b>อนุมัติโดย:</b> {approver_name} (ผ่าน Telegram)
📊 <b>ชั่วโมงสะสมรวมล่าสุด:</b> <b>{total_hrs:.1f} / 400 ชม.</b> ({'✅ ผ่านเกณฑ์ขั้นต่ำ 36 ชม.' if is_pass else '⏳ สะสมความดี'})
━━━━━━━━━━━━━━━━━━━━━━━
🌐 <i>ระบบอัปเดตชั่วโมงเข้าสู่ฐานข้อมูลเรียบร้อยแล้ว</i>"""

        send_telegram_request('sendMessage', {
            'chat_id': CHAT_ID,
            'text': reply_html,
            'parse_mode': 'HTML',
            'reply_to_message_id': msg_id
        })

    elif is_reject:
        target_deed = update_deed_status_in_db(student_id, deed_id, 'rejected', approver_name)
        
        send_telegram_request('answerCallbackQuery', {
            'callback_query_id': cb_id,
            'text': f"❌ ปฏิเสธบันทึกความดีของ {student_name} เรียบร้อยแล้ว",
            'show_alert': True
        })

        reply_html = f"""❌ <b>แจ้งปฏิเสธบันทึกความดี</b>
━━━━━━━━━━━━━━━━━━━━━━━
👤 <b>นักเรียน:</b> {student_name}
🎫 <b>รหัส นพอ.:</b> <code>{student_id}</code>
📂 <b>กิจกรรม:</b> {target_deed.get('description', 'กิจกรรมจิตอาสา') if target_deed else 'กิจกรรมจิตอาสา'}

👩‍🏫 <b>ปฏิเสธโดย:</b> {approver_name} (ผ่าน Telegram)
📝 <b>คำแนะนำ:</b> กรุณาตรวจสอบข้อมูลและรูปภาพหลักฐาน แล้วยื่นบันทึกใหม่อีกครั้ง
━━━━━━━━━━━━━━━━━━━━━━━"""

        send_telegram_request('sendMessage', {
            'chat_id': CHAT_ID,
            'text': reply_html,
            'parse_mode': 'HTML',
            'reply_to_message_id': msg_id
        })

def run_once():
    """Check recent Telegram updates once"""
    res = send_telegram_request('getUpdates', {'offset': -10, 'timeout': 2})
    if res.get('ok') and res.get('result'):
        for update in res['result']:
            if 'callback_query' in update:
                process_callback_query(update['callback_query'])

if __name__ == '__main__':
    print("🤖 Telegram Bot Listener running...")
    run_once()
