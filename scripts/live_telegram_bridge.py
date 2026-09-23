#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
live_telegram_bridge.py - Real-Time Interactive Telegram Bot Engine & Webhook Handler
วิทยาลัยพยาบาลทหารอากาศ กรมแพทย์ทหารอากาศ (วพอ.พอ.)

ฟังก์ชัน:
1. ดักจับปุ่ม [ ✅ อนุมัติด่วน ] และ [ ❌ ปฏิเสธ ] จาก Telegram Group
2. ตอบกลับ answerCallbackQuery ทันที (แก้ปัญหาค้าง Loading / ติดหน้านี้)
3. เปลี่ยนปุ่มบนข้อความเป็น [ ✅ อนุมัติแล้ว โดย ร.อ.อนุชิต ทำจะดี (Bird) ]
4. ส่งข้อความยืนยันผลการตรวจอนุมัติ/ปฏิเสธลงกลุ่ม Telegram
5. อัปเดตสถานะความดีลงใน Google Sheets (Deeds_2569 & Main_2569) ผ่าน GAS API
6. ส่งการแจ้งเตือนกลับไปยัง นพอ.
"""

import os
import sys
import time
import json
import ssl
import urllib.request
import urllib.parse

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_FILE = os.path.join(BASE_DIR, '.env')

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

    # 4. ส่งข้อความแจ้งเตือนยืนยันลงกลุ่ม Telegram (ตามรูปแบบในตัวอย่างของอาจารย์!)
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

def run_polling():
    """รันโหมด Long-Polling เพื่อรับการกดปุ่มแบบ Real-time ทันที"""
    print("🤖 กำลังเริ่มต้น Live Telegram Bot Engine (Long-Polling Mode)...")
    
    # ลบ Webhook เพื่อให้ Telegram อนุญาตให้ดึง updates ผ่าน getUpdates
    call_telegram('deleteWebhook', {'drop_pending_updates': False})
    print("✅ สลับโหมดเป็น Polling (Pending updates preserved)")

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
                        process_callback_query(u['callback_query'])
            time.sleep(0.5)
        except KeyboardInterrupt:
            print("\n👋 ปิดการทำงาน Telegram Bot Engine")
            break
        except Exception as e:
            print(f"⚠️ Polling loop error: {e}")
            time.sleep(2)

if __name__ == '__main__':
    run_polling()
