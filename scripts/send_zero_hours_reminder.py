#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/send_zero_hours_reminder.py
ระบบส่งข้อความแจ้งเตือนนักเรียนที่ยังไม่มีชั่วโมงความดีในเทอมนี้ (0 ชั่วโมง)
ส่งแจ้งเตือนทั้งผ่าน Telegram Group และ LINE Broadcast (ผ่าน Google Apps Script Cloud Relay)
"""
import os
import sys
import json
import ssl
import urllib.request
import urllib.error

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')

def get_env_config(key, default=''):
    val = os.environ.get(key)
    if val:
        return val
    env_file = os.path.join(BASE_DIR, '.env')
    if os.path.exists(env_file):
        try:
            with open(env_file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line.startswith(f"{key}="):
                        return line.split('=', 1)[1].strip(' "\'')
        except Exception:
            pass
    return default

def get_ssl_context():
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return ctx

def analyze_zero_hour_students():
    students_file = os.path.join(DATA_DIR, 'students.json')
    deeds_file = os.path.join(DATA_DIR, 'deeds.json')

    with open(students_file, 'r', encoding='utf-8') as f:
        students = json.load(f)
    with open(deeds_file, 'r', encoding='utf-8') as f:
        deeds = json.load(f)

    active_cohorts = ['69', '68', '67', '66']
    cohort_titles = {
        '69': 'ชั้นปีที่ 1 (รุ่น 69)',
        '68': 'ชั้นปีที่ 2 (รุ่น 68)',
        '67': 'ชั้นปีที่ 3 (รุ่น 67)',
        '66': 'ชั้นปีที่ 4 (รุ่น 66)'
    }

    stats = {}
    zero_students_by_year = {}

    for c in active_cohorts:
        stats[c] = {'total': 0, 'approved': 0, 'pending': 0, 'zero': 0}
        zero_students_by_year[c] = []

    for s in students:
        c = str(s.get('class_year', ''))
        if c not in stats:
            continue
        stats[c]['total'] += 1
        sid = str(s.get('student_id'))
        s_deeds = deeds.get(sid, [])
        app_hrs = sum(float(d.get('hours', 0)) for d in s_deeds if d.get('status') == 'approved')
        pen_deeds = [d for d in s_deeds if d.get('status') == 'pending']

        if app_hrs > 0:
            stats[c]['approved'] += 1
        elif len(pen_deeds) > 0:
            stats[c]['pending'] += 1
        else:
            stats[c]['zero'] += 1
            zero_students_by_year[c].append(s)

    total_active = sum(stats[c]['total'] for c in active_cohorts)
    total_approved = sum(stats[c]['approved'] for c in active_cohorts)
    total_pending = sum(stats[c]['pending'] for c in active_cohorts)
    total_zero = sum(stats[c]['zero'] for c in active_cohorts)

    return {
        'stats': stats,
        'zero_students_by_year': zero_students_by_year,
        'cohort_titles': cohort_titles,
        'total_active': total_active,
        'total_approved': total_approved,
        'total_pending': total_pending,
        'total_zero': total_zero
    }

def send_telegram_reminder(summary_data):
    token = get_env_config('TELEGRAM_BOT_TOKEN')
    chat_id = get_env_config('TELEGRAM_CHAT_ID')
    if not token or not chat_id:
        print("⚠️ Telegram token หรือ chat_id ไม่ได้ตั้งค่าไว้")
        return False, "Missing credentials"

    stats = summary_data['stats']
    titles = summary_data['cohort_titles']
    total_zero = summary_data['total_zero']
    total_active = summary_data['total_active']

    text = (
        "📢 <b>[ประกาศแจ้งเตือนด่วน] บันทึกชั่วโมงความดีจิตอาสา</b>\n"
        "<b>วิทยาลัยพยาบาลทหารอากาศ กรมแพทย์ทหารอากาศ</b>\n"
        "ภาคเรียนที่ 1 ปีการศึกษา 2569\n"
        "━━━━━━━━━━━━━━━━━━━━\n"
        f"เรียน นักเรียนพยาบาลทหารอากาศ ทุกชั้นปี (ปี 1 - 4)\n\n"
        f"📊 จากการตรวจสอบระบบ พบว่ายังมี นพอ. จำนวน <b>{total_zero} นาย</b> (จากทั้งหมด {total_active} นาย) "
        "ที่ยังไม่มีการบันทึกชั่วโมงความดีจิตอาสาในเทอมนี้:\n\n"
        f"• <b>{titles['69']}</b>: ยังไม่บันทึก <b>{stats['69']['zero']}</b> นาย (บันทึกแล้ว {stats['69']['approved']} นาย, รอตรวจ {stats['69']['pending']} นาย)\n"
        f"• <b>{titles['68']}</b>: ยังไม่บันทึก <b>{stats['68']['zero']}</b> นาย (บันทึกแล้ว {stats['68']['approved']} นาย)\n"
        f"• <b>{titles['67']}</b>: ยังไม่บันทึก <b>{stats['67']['zero']}</b> นาย (บันทึกแล้ว {stats['67']['approved']} นาย, รอตรวจ {stats['67']['pending']} นาย)\n"
        f"• <b>{titles['66']}</b>: ยังไม่บันทึก <b>{stats['66']['zero']}</b> นาย (บันทึกแล้ว {stats['66']['approved']} นาย)\n\n"
        "🎯 <b>เกณฑ์ข้อบังคับ:</b> นักเรียนต้องสะสมความดีอย่างน้อย <b>50 ชั่วโมง/ปีการศึกษา</b>\n"
        "⏱ ขอให้นักเรียนทุกนายที่ยังไม่มีชั่วโมงความดี ทยอยเข้าร่วมกิจกรรมจิตอาสาและบันทึกความดีพร้อมแนบภาพหลักฐานเข้าสู่ระบบโดยเร็วครับ\n\n"
        "📲 <b>เข้าสู่ระบบบันทึกความดี:</b>\n"
        "https://anuchit1tube168-cmd.github.io/gooddeeds69/frontend/index.html\n"
        "━━━━━━━━━━━━━━━━━━━━"
    )

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        'chat_id': chat_id,
        'text': text,
        'parse_mode': 'HTML',
        'disable_web_page_preview': False,
        'reply_markup': {
            'inline_keyboard': [
                [
                    {
                        'text': '📝 บันทึกความดีออนไลน์ทันที',
                        'url': 'https://anuchit1tube168-cmd.github.io/gooddeeds69/frontend/index.html'
                    }
                ],
                [
                    {
                        'text': '🏆 ตรวจสอบกระดานคะแนนความดี',
                        'url': 'https://anuchit1tube168-cmd.github.io/gooddeeds69/frontend/ranking.html'
                    }
                ]
            ]
        }
    }

    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=15, context=get_ssl_context()) as resp:
            res = json.loads(resp.read().decode('utf-8'))
            ok = res.get('ok', False)
            return ok, res
    except Exception as e:
        return False, str(e)

def send_line_broadcast_reminder(summary_data):
    gas_url = "https://script.google.com/macros/s/AKfycbwV0b31hWMSs2oNOff4o-O_PNoEQ1XlTM77f4sei9JLh1rza1SfFPTOlTaxiIKCIxLT_Q/exec"
    stats = summary_data['stats']
    titles = summary_data['cohort_titles']
    total_zero = summary_data['total_zero']

    body_text = (
        f"แจ้งเตือน นพอ. ทุกชั้นปีที่ยังไม่มีชั่วโมงความดีในเทอมนี้ ({total_zero} นาย)\n\n"
        f"• ปี 1 (รุ่น 69): ยังไม่บันทึก {stats['69']['zero']} นาย\n"
        f"• ปี 2 (รุ่น 68): ยังไม่บันทึก {stats['68']['zero']} นาย\n"
        f"• ปี 3 (รุ่น 67): ยังไม่บันทึก {stats['67']['zero']} นาย\n"
        f"• ปี 4 (รุ่น 66): ยังไม่บันทึก {stats['66']['zero']} นาย\n\n"
        "ขอให้นักเรียนเข้าร่วมกิจกรรมจิตอาสาและบันทึกความดีให้ครบตามเกณฑ์ 50 ชม./ปีการศึกษา"
    )

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
                { "type": "text", "text": "📢 แจ้งเตือนบันทึกความดีจิตอาสา 2569", "color": "#ffffff", "size": "md", "weight": "bold", "margin": "xs" }
            ]
        },
        "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                { "type": "text", "text": body_text, "size": "sm", "color": "#1f2937", "wrap": True },
                { "type": "separator", "margin": "lg" },
                {
                    "type": "box",
                    "layout": "horizontal",
                    "margin": "lg",
                    "contents": [
                        {
                            "type": "box",
                            "layout": "vertical",
                            "contents": [
                                { "type": "text", "text": "เกณฑ์ขั้นต่ำ", "size": "xs", "color": "#888888" },
                                { "type": "text", "text": "50 ชม.", "size": "lg", "weight": "bold", "color": "#c9a227" }
                            ]
                        },
                        {
                            "type": "box",
                            "layout": "vertical",
                            "alignItems": "flex-end",
                            "contents": [
                                { "type": "text", "text": "ปีการศึกษา", "size": "xs", "color": "#888888" },
                                { "type": "text", "text": "2569", "size": "sm", "weight": "bold", "color": "#0a192f" }
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
                        "label": "📝 บันทึกความดีออนไลน์",
                        "uri": "https://anuchit1tube168-cmd.github.io/gooddeeds69/frontend/index.html"
                    },
                    "style": "primary",
                    "color": "#0a192f"
                }
            ]
        }
    }

    proxy_payload = {
        "action": "send_line_message",
        "target": "broadcast",
        "messages": [
            {
                "type": "flex",
                "altText": "📢 แจ้งเตือนบันทึกชั่วโมงความดีจิตอาสา 2569 วพอ.",
                "contents": flex_bubble
            }
        ]
    }

    data = json.dumps(proxy_payload).encode('utf-8')
    req = urllib.request.Request(gas_url, data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=15, context=get_ssl_context()) as resp:
            res_text = resp.read().decode('utf-8')
            return True, res_text
    except Exception as e:
        return False, str(e)

if __name__ == '__main__':
    print("==================================================")
    print("🚀 ระบบแจ้งเตือน นพอ. ที่ยังไม่มีชั่วโมงความดี (0 ชม.)")
    print("==================================================")
    summary = analyze_zero_hour_students()
    print(f"📊 นักเรียนปัจจุบันทั้งหมด: {summary['total_active']} นาย")
    print(f"✅ บันทึกแล้วมีชั่วโมง (Approved): {summary['total_approved']} นาย")
    print(f"⏳ รอตรวจประเมิน (Pending): {summary['total_pending']} นาย")
    print(f"⚠️ ยังไม่มีชั่วโมงในเทอมนี้: {summary['total_zero']} นาย")
    print("--------------------------------------------------")

    # 1. ส่ง Telegram
    print("📡 กำลังส่งแจ้งเตือนเข้า Telegram Group...")
    tg_ok, tg_resp = send_telegram_reminder(summary)
    if tg_ok:
        print("✅ ส่ง Telegram สำเร็จเรียบร้อย!")
    else:
        print(f"⚠️ Telegram: {tg_resp}")

    # 2. ส่ง LINE Broadcast (GAS)
    print("📡 กำลังส่งแจ้งเตือน LINE Broadcast...")
    line_ok, line_resp = send_line_broadcast_reminder(summary)
    if line_ok:
        print(f"✅ ส่ง LINE Broadcast ผ่าน Google Apps Script สำเร็จ: {line_resp}")
    else:
        print(f"⚠️ LINE Broadcast: {line_resp}")

    print("==================================================")
    print("🎉 ดำเนินการส่งข้อความแจ้งเตือนเสร็จสิ้น")
