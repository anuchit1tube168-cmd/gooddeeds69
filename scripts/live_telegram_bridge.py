#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
live_telegram_bridge.py - Real-Time Interactive Telegram Bot Engine & Webhook Handler
วิทยาลัยพยาบาลทหารอากาศ กรมแพทย์ทหารอากาศ (วพอ.พอ.)

ฟังก์ชันหลัก:
1. ตรวจจับและส่งการ์ดแจ้งเตือนความดีใหม่ (New Deeds) เข้ากลุ่ม Telegram อัตโนมัติแบบ Real-time
2. แนบรูปถ่ายหลักฐานสดหรือการ์ดสลิปพร้อมปุ่ม Action ด้านล่าง
3. ดักจับปุ่ม [ ✅ อนุมัติด่วน ] และ [ ❌ ปฏิเสธ ] จาก Telegram Group
4. ตอบกลับ answerCallbackQuery ทันที (แก้ปัญหาค้าง Loading บนมือถืออาจารย์)
5. เปลี่ยนปุ่มบนข้อความเป็น [ ✅ อนุมัติแล้ว โดย ร.อ.อนุชิต ทำจะดี (Bird) ]
6. ส่งข้อความยืนยันผลการตรวจอนุมัติ/ปฏิเสธลงกลุ่ม Telegram
7. อัปเดตสถานะความดีลงใน Google Sheets (Deeds_2569 & Main_2569) ผ่าน GAS API ทันที
"""

import os
import sys
import time
import json
import ssl
import urllib.request
import urllib.parse
import threading

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_FILE = os.path.join(BASE_DIR, '.env')
NOTIFIED_FILE = os.path.join(BASE_DIR, 'data', 'notified_deeds.json')

def load_env():
    env = {}
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    env[k.strip()] = v.strip().strip("'\"")
    return env

ENV = load_env()
BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN') or ENV.get('TELEGRAM_BOT_TOKEN', '')
CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID') or ENV.get('TELEGRAM_CHAT_ID', '')
GAS_URL = os.environ.get('GAS_URL') or ENV.get('GAS_URL', 'https://script.google.com/macros/s/AKfycbwV0b31hWMSs2oNOff4o-O_PNoEQ1XlTM77f4sei9JLh1rza1SfFPTOlTaxiIKCIxLT_Q/exec')

SSL_CTX = ssl._create_unverified_context()

def load_notified_deeds():
    if os.path.exists(NOTIFIED_FILE):
        try:
            with open(NOTIFIED_FILE, 'r', encoding='utf-8') as f:
                return set(json.load(f))
        except Exception:
            return set()
    return set()

def save_notified_deeds(notified_set):
    os.makedirs(os.path.dirname(NOTIFIED_FILE), exist_ok=True)
    try:
        with open(NOTIFIED_FILE, 'w', encoding='utf-8') as f:
            json.dump(list(notified_set), f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"⚠️ Error saving notified deeds: {e}")

NOTIFIED_DEEDS = load_notified_deeds()

def call_telegram(method, payload):
    if not BOT_TOKEN:
        print("❌ No TELEGRAM_BOT_TOKEN found!")
        return None
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/{method}"
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=15, context=SSL_CTX) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"⚠️ Telegram API {method} error: {e}")
        return None

def forward_to_gas(payload):
    """ส่งข้อมูลไปยัง Google Apps Script Backend"""
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(GAS_URL, data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=20, context=SSL_CTX) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"⚠️ GAS API forward error: {e}")
        return None

def gas_get(query):
    """ดึงข้อมูลจาก Google Apps Script Backend ผ่าน GET"""
    url = f"{GAS_URL}?{query}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=20, context=SSL_CTX) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"⚠️ GAS GET error: {e}")
        return None

def notify_pending_deed(deed):
    """ส่งการ์ดแจ้งเตือนความดีใหม่พร้อมปุ่ม Action เข้ากลุ่ม Telegram"""
    deed_id = str(deed.get('id') or deed.get('deedId') or '').strip()
    student_id = str(deed.get('student_id') or deed.get('studentId') or '').strip()
    student_name = deed.get('student_name') or deed.get('studentName') or f"นพอ. ({student_id})"
    class_year = str(deed.get('class_year') or deed.get('classYear') or (student_id[:2] if len(student_id) >= 2 else '69'))

    year_map = {'69': '1', '68': '2', '67': '3', '66': '4'}
    year_level = year_map.get(str(class_year), '1')
    year_name = f"ชั้นปีที่ {year_level} (รุ่น {class_year})"

    cat_id = int(deed.get('category_id') or deed.get('categoryId') or 1)
    cat_names = {
        1: ('บริจาคโลหิต/เกล็ดเลือด/พลาสมา', '🩸'),
        2: ('โครงการภายนอก (คำสั่ง วพอ.)', '🏛️'),
        3: ('ช่วยเหลืองานภายใน วพอ.', '🏥'),
        4: ('เข้าอบรมที่ วพอ. จัดให้', '📚'),
        5: ('ช่วยงานหน่วยงาน/ชุมชน/มูลนิธิ', '🤝'),
        6: ('ทำนุบำรุงศาสนสถาน', '🛕'),
        7: ('งานฟรีทั่วไป (ช่วยงานผู้ปกครอง)', '🧹'),
        8: ('กิจกรรมจงรักภักดีต่อสถาบัน', '👑'),
        9: ('ชม. ที่สมควรได้รับ (บทบาทพิเศษ)', '⭐'),
    }
    cat_name, cat_emoji = cat_names.get(cat_id, ('กิจกรรมความดี', '📌'))

    hours = deed.get('hours', 0)
    act_date = deed.get('activityDate') or deed.get('event_date') or time.strftime('%Y-%m-%d')
    desc = deed.get('description') or ''
    loc = deed.get('location') or 'วิทยาลัยพยาบาลทหารอากาศ'
    approver = deed.get('approver') or 'ร.อ.อนุชิต ทำจะดี (Bird)'

    base_url = 'https://anuchit1tube168-cmd.github.io/gooddeeds69/frontend'
    q_params = urllib.parse.urlencode({
        'id': deed_id,
        'studentId': student_id,
        'name': student_name,
        'year': class_year,
        'cat': cat_id,
        'catName': cat_name,
        'hours': hours,
        'date': act_date,
        'desc': desc,
        'loc': loc,
        'appr': approver,
        'status': 'pending'
    })
    approve_url = f"{base_url}/approve_sign.html?{q_params}"
    slip_url = f"{base_url}/deed_slip.html?{q_params}"

    reply_markup = {
        'inline_keyboard': [
            [
                {'text': '✅ อนุมัติด่วน', 'callback_data': f"approve_{deed_id}_{student_id}"},
                {'text': '❌ ปฏิเสธ', 'callback_data': f"reject_{deed_id}_{student_id}"}
            ],
            [
                {'text': '✍️ ตรวจสอบ & ลงนาม ↗️', 'url': approve_url},
                {'text': '📄 พิมพ์สลิป A4 (PDF) ↗️', 'url': slip_url}
            ]
        ]
    }

    html_msg = (
        f"🔔 <b>แจ้งเตือนการขออนุมัติความดี (วพอ. 2569)</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"👤 <b>ผู้ขอ:</b> {student_name}\n"
        f"🎫 <b>รหัส นพอ.:</b> <code>{student_id}</code> ({year_name})\n"
        f"📂 <b>หมวดที่ {cat_id}:</b> {cat_emoji} {cat_name}\n"
        f"⏱ <b>จำนวน:</b> <b>{hours} ชั่วโมง</b>\n"
        f"📅 <b>วันที่:</b> {act_date}\n"
        f"📍 <b>สถานที่:</b> {loc}\n"
        f"📝 <b>รายละเอียด:</b> {desc}\n"
        f"👨‍🏫 <b>อาจารย์ผู้ตรวจ:</b> {approver}\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"⏳ <i>กรุณาตรวจสอบและกดอนุมัติหรือลงนามด้านล่าง:</i>"
    )

    photo_sent = False
    img_url = deed.get('imageUrl') or ''
    if img_url and img_url.startswith('data:image'):
        try:
            import base64
            _, b64_data = img_url.split('base64,', 1)
            img_bytes = base64.b64decode(b64_data)

            boundary = f"----WebKitFormBoundary{int(time.time()*1000)}"
            body = bytearray()
            body.extend(f"--{boundary}\r\nContent-Disposition: form-data; name=\"chat_id\"\r\n\r\n{CHAT_ID}\r\n".encode('utf-8'))
            body.extend(f"--{boundary}\r\nContent-Disposition: form-data; name=\"caption\"\r\n\r\n{html_msg}\r\n".encode('utf-8'))
            body.extend(f"--{boundary}\r\nContent-Disposition: form-data; name=\"parse_mode\"\r\n\r\nHTML\r\n".encode('utf-8'))
            body.extend(f"--{boundary}\r\nContent-Disposition: form-data; name=\"reply_markup\"\r\n\r\n{json.dumps(reply_markup, ensure_ascii=False)}\r\n".encode('utf-8'))
            body.extend(f"--{boundary}\r\nContent-Disposition: form-data; name=\"photo\"; filename=\"evidence.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n".encode('utf-8'))
            body.extend(img_bytes)
            body.extend(f"\r\n--{boundary}--\r\n".encode('utf-8'))

            url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendPhoto"
            req = urllib.request.Request(url, data=bytes(body), headers={
                'Content-Type': f'multipart/form-data; boundary={boundary}',
                'Content-Length': str(len(body))
            })
            with urllib.request.urlopen(req, timeout=25, context=SSL_CTX) as resp:
                res = json.loads(resp.read().decode('utf-8'))
                if res.get('ok'):
                    photo_sent = True
        except Exception as pe:
            print(f"⚠️ Photo multipart send notice: {pe}")

    if not photo_sent:
        call_telegram('sendMessage', {
            'chat_id': CHAT_ID,
            'text': html_msg,
            'parse_mode': 'HTML',
            'reply_markup': reply_markup
        })

    print(f"🚀 [NOTIFY SENT] {deed_id} | {student_name} ({student_id}) | Photo: {photo_sent}")
    NOTIFIED_DEEDS.add(deed_id)
    save_notified_deeds(NOTIFIED_DEEDS)
    return True

def poll_new_deeds():
    """เฝ้าตรวจหารายการความดีที่เพิ่งส่งใหม่และอยู่ในสถานะ pending"""
    try:
        deeds = gas_get("action=getDeeds")
        if not deeds or not isinstance(deeds, list):
            return

        for d in deeds:
            deed_id = str(d.get('id') or '').strip()
            status = str(d.get('status') or '').lower().strip()

            # ข้ามถ้าไม่ใช่ pending หรือเคยแจ้งไปแล้ว
            if not deed_id or status != 'pending' or deed_id in NOTIFIED_DEEDS:
                continue

            # ข้ามถ้าเป็น silent / test ที่กำหนดไม่แจ้งเตือน
            if d.get('notify') is False or d.get('silent') is True or 'SILENT' in deed_id:
                NOTIFIED_DEEDS.add(deed_id)
                save_notified_deeds(NOTIFIED_DEEDS)
                continue

            notify_pending_deed(d)
            b_fn = globals().get('broadcast_event')
            if b_fn:
                try:
                    b_fn('deed_submitted', d)
                except Exception:
                    pass
            time.sleep(1.0)
    except Exception as e:
        print(f"⚠️ poll_new_deeds notice: {e}")

def process_callback_query(cq):
    """ประมวลผลการกดปุ่มจาก Telegram"""
    cq_id = cq.get('id')
    from_user = cq.get('from', {})
    user_name = f"{from_user.get('first_name', '')} {from_user.get('last_name', '')}".strip() or "อาจารย์ผู้ตรวจ"
    data = str(cq.get('data', '')).strip()
    msg = cq.get('message', {})
    chat = msg.get('chat', {})
    chat_id = chat.get('id') or CHAT_ID
    msg_id = msg.get('message_id')

    print(f"\n📩 [TELEGRAM CALLBACK] User: {user_name} | Data: {data} | MsgID: {msg_id}")

    is_approve = data.startswith('approve_')
    is_reject = data.startswith('reject_')

    if not is_approve and not is_reject:
        call_telegram('answerCallbackQuery', {
            'callback_query_id': cq_id,
            'text': 'รับข้อมูลเรียบร้อยแล้วค่ะ',
            'show_alert': False
        })
        return

    # 1. ตอบกลับ answerCallbackQuery ทันที (หยุด Loading ทันที!)
    alert_text = "✅ อนุมัติความดีเรียบร้อยแล้ว!" if is_approve else "❌ ปฏิเสธรายการความดีแล้ว"
    call_telegram('answerCallbackQuery', {
        'callback_query_id': cq_id,
        'text': alert_text,
        'show_alert': True
    })
    print(f"⚡ ตอบกลับ answerCallbackQuery: {alert_text}")

    # 2. แกะ deed_id และ student_id
    parts = data.split('_')
    student_id = parts[-1] if len(parts) >= 2 else ''
    deed_id = '_'.join(parts[1:-1]) if len(parts) >= 3 else parts[1]
    new_status = 'approved' if is_approve else 'rejected'
    approver_name = 'ร.อ.อนุชิต ทำจะดี (Bird)'

    # 3. แก้ไขปุ่มบน Telegram ให้แสดงว่าตรวจแล้วทันที
    new_btn_text = f"✅ อนุมัติแล้ว โดย {approver_name}" if is_approve else f"❌ ปฏิเสธแล้ว โดย {approver_name}"
    if chat_id and msg_id:
        call_telegram('editMessageReplyMarkup', {
            'chat_id': chat_id,
            'message_id': msg_id,
            'reply_markup': {
                'inline_keyboard': [
                    [{'text': new_btn_text, 'callback_data': 'done'}]
                ]
            }
        })
        print(f"🔘 แก้ไขปุ่ม Telegram: {new_btn_text}")

    # 4. ส่งข้อความแจ้งเตือนยืนยันลงกลุ่ม Telegram
    confirm_text = ""
    if is_approve:
        confirm_text = (
            f"AGEn Ai Bot\n"
            f"✅ <b>แจ้งเตือนการอนุมัติความดี</b>\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"👤 <b>นักเรียน:</b> นพอ. รหัส {student_id}\n"
            f"🎫 <b>รหัส นพอ.:</b> <code>{student_id}</code>\n"
            f"🆔 <b>รหัสรายการ:</b> <code>{deed_id}</code>\n"
            f"👨‍🏫 <b>ผู้อนุมัติ:</b> {approver_name}\n"
            f"🎉 <i>บันทึกข้อมูลและสะสมชั่วโมงลงฐานข้อมูลเรียบร้อยแล้วค่ะ</i>"
        )
    else:
        confirm_text = (
            f"AGEn Ai Bot\n"
            f"❌ <b>แจ้งเตือนการปฏิเสธความดี</b>\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"👤 <b>นักเรียน:</b> นพอ. รหัส {student_id}\n"
            f"🎫 <b>รหัส นพอ.:</b> <code>{student_id}</code>\n"
            f"🆔 <b>รหัสรายการ:</b> <code>{deed_id}</code>\n"
            f"👨‍🏫 <b>ผู้ปฏิเสธ:</b> {approver_name}\n"
            f"📝 <b>เหตุผล:</b> กรุณาตรวจสอบหลักฐานและส่งใหม่"
        )

    if chat_id:
        call_telegram('sendMessage', {
            'chat_id': chat_id,
            'text': confirm_text,
            'parse_mode': 'HTML'
        })
        print(f"📢 ส่งข้อความยืนยันลงกลุ่ม Telegram สำเร็จ")

    # 5. อัปเดตฐานข้อมูล Google Sheets ผ่าน GAS API
    gas_res = forward_to_gas({
        'action': 'updateDeedStatus',
        'deedId': deed_id,
        'studentId': student_id,
        'status': new_status,
        'approvedBy': approver_name
    })
    print(f"📊 ผลการอัปเดตลง Google Sheets: {gas_res}")

    # 6. อัปเดตฐานข้อมูลในเครื่องและแจ้งเตือน SSE ไปยังหน้า teacher-dashboard.html ทันที
    s_fn = globals().get('save_or_update_deed_in_db')
    b_fn = globals().get('broadcast_event')
    if s_fn:
        try:
            s_fn(student_id, {
                'id': deed_id,
                'student_id': student_id,
                'status': new_status,
                'approvedBy': approver_name,
                'approved_by': approver_name,
                'approvedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
            })
        except Exception as se:
            print(f"⚠️ Local save notice: {se}")
    if b_fn:
        try:
            b_fn('deed_approved' if is_approve else 'deed_rejected', {
                'id': deed_id,
                'studentId': student_id,
                'status': new_status,
                'approvedBy': approver_name
            })
        except Exception as be:
            print(f"⚠️ Local broadcast notice: {be}")

def telegram_listener_loop():
    """เฝ้ารับการกดปุ่มจาก Telegram แบบ Real-time ทันที"""
    offset = 0
    while True:
        try:
            updates_res = call_telegram('getUpdates', {
                'offset': offset,
                'timeout': 10,
                'allowed_updates': ['callback_query', 'message']
            })
            if updates_res and updates_res.get('ok'):
                for u in updates_res.get('result', []):
                    offset = u['update_id'] + 1
                    if 'callback_query' in u:
                        threading.Thread(target=process_callback_query, args=(u['callback_query'],), daemon=True).start()
            time.sleep(0.2)
        except Exception:
            time.sleep(2.0)

def deed_monitor_loop():
    """เฝ้าตรวจหารายการความดีใหม่จาก GAS"""
    while True:
        try:
            poll_new_deeds()
            time.sleep(4.0)
        except Exception:
            time.sleep(3.0)

def run_polling():
    """รันโหมด Multi-threaded Polling เพื่อรับการกดปุ่มแบบ Instant และตรวจจับรายการใหม่"""
    print("🤖 กำลังเริ่มต้น Live Telegram Bot Engine & New Deeds Monitor (Multi-threaded)...")
    call_telegram('deleteWebhook', {'drop_pending_updates': False})
    print("✅ สลับโหมดเป็น Polling (Pending updates preserved)")

    t1 = threading.Thread(target=telegram_listener_loop, daemon=True, name="TelegramListener")
    t2 = threading.Thread(target=deed_monitor_loop, daemon=True, name="DeedMonitor")
    t1.start()
    t2.start()

    while True:
        time.sleep(1.0)

_bridge_thread = None

def start_bridge_in_background():
    """Start bridge polling in a daemon thread"""
    global _bridge_thread
    if _bridge_thread and _bridge_thread.is_alive():
        return _bridge_thread
    _bridge_thread = threading.Thread(target=run_polling, daemon=True, name="LiveTelegramBridge")
    _bridge_thread.start()
    return _bridge_thread

if __name__ == '__main__':
    run_polling()
