#!/usr/bin/env python3
"""
line_webhook_bot.py
รับ Webhook จาก LINE OA → บันทึก LINE userId ของนักเรียนลงฐานข้อมูล
+ ส่งแจ้งเตือน Admin ผ่าน Telegram เมื่อมีข้อความเข้า
+ Admin ตอบกลับจาก Telegram ได้ทันที

วิธีใช้:
1. รัน: python3 data/line_webhook_bot.py
2. ใช้ ngrok หรือ cloudflare tunnel: ngrok http 3001
3. นำ URL ไปใส่ LINE Developers Console → Webhook URL

Flow:
- นักเรียนพิมพ์ "รหัสนักเรียน" (เช่น 6803893) → ระบบผูก LINE userId
- นักเรียนพิมพ์ข้อความอื่น → ส่งต่อไป Telegram Admin + มีปุ่มตอบกลับ
- Admin ตอบใน Telegram → ส่งกลับไป LINE user
"""
import json
import os
import re
import time
import threading
import subprocess
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(DATA_DIR)

# === CONFIG ===
LINE_CHANNEL_TOKEN = 'vyXhnvU/stGL9mUrIPKB+30x6OwFuFsercCL0UwISHKcV+qn3VW7FYL1kTa8kgm/+GpjDU3s+F/DPaFJwyZK58Y7iNrNXidTBmbaJu7w5ReFAiBmFe+QJ6z6tytonZPqmtfuO9pSU8tnmfRTh2+uvwdB04t89/1O/w1cDnyilFU='
TELEGRAM_BOT_TOKEN = '8087838067:AAEejIlFni8e9DWVxKpRomTFlmjxYJVNJ0k'
TELEGRAM_CHAT_ID = '-4839151586'
WEBHOOK_PORT = 3001

# === In-Memory: LINE userId → Telegram message mapping for replies ===
# { line_user_id: { 'name': str, 'student_id': str, 'last_msg': str } }
line_users_cache = {}

# ======================================================================
# UTILITY FUNCTIONS
# ======================================================================

def load_students():
    """Load students from JSON."""
    p = os.path.join(DATA_DIR, 'students.json')
    if not os.path.exists(p):
        p = os.path.join(BASE_DIR, 'frontend', 'data', 'students.json')
    if os.path.exists(p):
        with open(p, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []


def find_student_by_id(student_id):
    """Find student by student_id."""
    students = load_students()
    for s in students:
        if str(s.get('student_id', '')) == str(student_id):
            return s
    return None


def bind_line_user_id(student_id, line_user_id, line_name, line_pic=''):
    """Save LINE userId to student record in students.json and students_data.js."""
    updated = False
    for json_p in [
        os.path.join(DATA_DIR, 'students.json'),
        os.path.join(BASE_DIR, 'frontend', 'data', 'students.json')
    ]:
        if not os.path.exists(json_p):
            continue
        with open(json_p, 'r', encoding='utf-8') as f:
            stu_list = json.load(f)
        for s in stu_list:
            if str(s.get('student_id')) == str(student_id):
                s['line_user_id'] = line_user_id
                s['line_display_name'] = line_name
                s['line_picture_url'] = line_pic
                updated = True
                break
        with open(json_p, 'w', encoding='utf-8') as f:
            json.dump(stu_list, f, ensure_ascii=False, indent=2)

    # Update JS files
    if updated:
        src = os.path.join(BASE_DIR, 'frontend', 'data', 'students.json')
        if os.path.exists(src):
            with open(src, 'r', encoding='utf-8') as f:
                stu_list = json.load(f)
            js_content = "// Auto-generated student data - DO NOT EDIT MANUALLY\n"
            js_content += "const STUDENTS_DATA = " + json.dumps(stu_list, ensure_ascii=False, indent=2) + ";\n\n"
            js_content += "if (typeof window !== 'undefined') { window.STUDENTS_DATA = STUDENTS_DATA; }\n"
            js_content += "if (typeof globalThis !== 'undefined') { globalThis.STUDENTS_DATA = STUDENTS_DATA; }\n"
            for js_p in [
                os.path.join(DATA_DIR, 'students_data.js'),
                os.path.join(BASE_DIR, 'frontend', 'data', 'students_data.js')
            ]:
                with open(js_p, 'w', encoding='utf-8') as f:
                    f.write(js_content)
        print(f"✅ Bound LINE user {line_name} ({line_user_id[:10]}...) → Student {student_id}")

    return updated


def send_line_reply(reply_token, messages):
    """Send reply via LINE Messaging API."""
    url = 'https://api.line.me/v2/bot/message/reply'
    payload = json.dumps({'replyToken': reply_token, 'messages': messages}).encode('utf-8')
    req = urllib.request.Request(url, data=payload, headers={
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {LINE_CHANNEL_TOKEN}'
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status
    except Exception as e:
        print(f"⚠️ LINE Reply Error: {e}")
        return None


def send_line_push(line_user_id, messages):
    """Send push message to LINE user."""
    url = 'https://api.line.me/v2/bot/message/push'
    payload = json.dumps({'to': line_user_id, 'messages': messages}).encode('utf-8')
    req = urllib.request.Request(url, data=payload, headers={
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {LINE_CHANNEL_TOKEN}'
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status
    except Exception as e:
        print(f"⚠️ LINE Push Error: {e}")
        return None


def get_line_profile(line_user_id):
    """Get LINE user profile."""
    url = f'https://api.line.me/v2/bot/profile/{line_user_id}'
    req = urllib.request.Request(url, headers={
        'Authorization': f'Bearer {LINE_CHANNEL_TOKEN}'
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"⚠️ LINE Profile Error: {e}")
        return {}


def send_telegram(text, reply_markup=None):
    """Send message to Telegram admin group."""
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        'chat_id': TELEGRAM_CHAT_ID,
        'text': text,
        'parse_mode': 'HTML'
    }
    if reply_markup:
        payload['reply_markup'] = reply_markup
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"⚠️ Telegram Send Error: {e}")
        return {}


def push_to_github_bg(msg="LINE bind update"):
    """Push changes to GitHub in background."""
    def run_push():
        try:
            subprocess.run(["git", "add", "-A"], cwd=BASE_DIR, check=True)
            subprocess.run(["git", "commit", "-m", msg], cwd=BASE_DIR, check=False)
            subprocess.run(["git", "push", "origin", "main"], cwd=BASE_DIR, check=True)
            print(f"🚀 Git push done: {msg}")
        except Exception as e:
            print(f"⚠️ Git push error: {e}")
    threading.Thread(target=run_push, daemon=True).start()


# ======================================================================
# LINE WEBHOOK HANDLER
# ======================================================================

class LineWebhookHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/webhook' or self.path == '/line/webhook':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"status":"ok"}')

            # Process events asynchronously
            threading.Thread(target=self.process_events, args=(body,), daemon=True).start()
        else:
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'LINE Webhook Bot OK')

    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.end_headers()
        count = len([u for u in line_users_cache.values() if u.get('student_id')])
        self.wfile.write(f"""
        <html><body style="font-family:sans-serif;text-align:center;padding:40px;">
        <h1>🤖 LINE Webhook Bot</h1>
        <p>SMART DBS RTAFNC (ฟ้าใส)</p>
        <p>Bound students: <b>{count}</b></p>
        <p>Status: ✅ Running on port {WEBHOOK_PORT}</p>
        </body></html>
        """.encode('utf-8'))

    def log_message(self, format, *args):
        print(f"[LINE-WH] {args[0]}" if args else "")

    def process_events(self, body):
        try:
            data = json.loads(body.decode('utf-8'))
        except:
            return

        events = data.get('events', [])
        for event in events:
            event_type = event.get('type', '')
            source = event.get('source', {})
            line_user_id = source.get('userId', '')
            reply_token = event.get('replyToken', '')

            if not line_user_id:
                continue

            # Get LINE profile
            profile = get_line_profile(line_user_id)
            line_name = profile.get('displayName', 'ไม่ทราบชื่อ')
            line_pic = profile.get('pictureUrl', '')

            # Cache user
            if line_user_id not in line_users_cache:
                line_users_cache[line_user_id] = {'name': line_name, 'pic': line_pic}

            # ── FOLLOW EVENT (เพิ่มเพื่อน) ──
            if event_type == 'follow':
                print(f"👋 New follower: {line_name} ({line_user_id[:10]}...)")
                send_line_reply(reply_token, [{
                    'type': 'text',
                    'text': f'สวัสดีค่ะ {line_name} 🙏\n\nยินดีต้อนรับสู่ระบบบันทึกความดีจิตอาสา วพอ.พอ. ปีการศึกษา 2569\n\n📌 พิมพ์ "รหัสนักเรียน 7 หลัก" เพื่อผูกบัญชี LINE\nเช่น: 6803893\n\nหลังผูกแล้วจะได้รับ:\n✅ แจ้งเตือนอนุมัติความดี\n✅ Flex Message สรุปชั่วโมง\n✅ ข่าวสาร/ประกาศจากอาจารย์'
                }])
                send_telegram(
                    f"👋 <b>มีผู้ติดตามใหม่ใน LINE OA</b>\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"👤 ชื่อ: <b>{line_name}</b>\n"
                    f"🆔 LINE ID: <code>{line_user_id}</code>\n"
                    f"📷 <a href=\"{line_pic}\">รูปโปรไฟล์</a>\n"
                    f"⏳ ยังไม่ได้ผูกรหัสนักเรียน"
                )
                continue

            # ── MESSAGE EVENT ──
            if event_type == 'message':
                msg = event.get('message', {})
                msg_type = msg.get('type', '')
                text = msg.get('text', '').strip()

                if msg_type != 'text' or not text:
                    continue

                print(f"💬 LINE msg from {line_name}: {text}")

                # Check if text is a student ID (7 digits)
                clean_text = re.sub(r'\s+', '', text)
                if re.match(r'^\d{7}$', clean_text):
                    student = find_student_by_id(clean_text)
                    if student:
                        student_name = f"{student.get('rank', 'นพอ.')} {student.get('first_name', '')} {student.get('last_name', '')}".strip()
                        cy = student.get('class_year', '?')

                        # Bind
                        success = bind_line_user_id(clean_text, line_user_id, line_name, line_pic)
                        line_users_cache[line_user_id]['student_id'] = clean_text

                        if success:
                            send_line_reply(reply_token, [{
                                'type': 'flex',
                                'altText': f'ผูกบัญชีสำเร็จ - {student_name}',
                                'contents': {
                                    'type': 'bubble',
                                    'size': 'kilo',
                                    'header': {
                                        'type': 'box', 'layout': 'vertical',
                                        'backgroundColor': '#1a365d',
                                        'paddingAll': '16px',
                                        'contents': [
                                            {'type': 'text', 'text': '✅ ผูกบัญชีสำเร็จ!', 'color': '#4ade80', 'weight': 'bold', 'size': 'lg'},
                                        ]
                                    },
                                    'body': {
                                        'type': 'box', 'layout': 'vertical',
                                        'backgroundColor': '#0f172a',
                                        'paddingAll': '16px',
                                        'contents': [
                                            {'type': 'text', 'text': student_name, 'color': '#ffffff', 'weight': 'bold', 'size': 'md'},
                                            {'type': 'text', 'text': f'รหัส {clean_text} | รุ่น {cy}', 'color': '#94a3b8', 'size': 'sm', 'margin': 'sm'},
                                            {'type': 'separator', 'margin': 'lg'},
                                            {'type': 'text', 'text': '🎉 บัญชี LINE ของคุณถูกผูกกับระบบบันทึกความดีเรียบร้อยแล้ว จะได้รับแจ้งเตือนผ่าน LINE อัตโนมัติ', 'color': '#cbd5e1', 'size': 'xs', 'wrap': True, 'margin': 'lg'},
                                        ]
                                    }
                                }
                            }])
                            send_telegram(
                                f"🔗 <b>ผูกบัญชี LINE สำเร็จ!</b>\n"
                                f"━━━━━━━━━━━━━━━━━━\n"
                                f"👤 LINE: <b>{line_name}</b>\n"
                                f"🎫 รหัส: <code>{clean_text}</code>\n"
                                f"📛 ชื่อ: <b>{student_name}</b> (รุ่น {cy})\n"
                                f"✅ ระบบบันทึกเรียบร้อยแล้ว"
                            )
                            push_to_github_bg(f"🔗 LINE bind: {student_name} ({clean_text})")
                        else:
                            send_line_reply(reply_token, [{'type': 'text', 'text': '⚠️ เกิดข้อผิดพลาดในการผูกบัญชี กรุณาลองใหม่อีกครั้งค่ะ'}])
                    else:
                        send_line_reply(reply_token, [{
                            'type': 'text',
                            'text': f'❌ ไม่พบรหัสนักเรียน "{clean_text}" ในระบบ\n\nกรุณาตรวจสอบรหัส 7 หลัก แล้วพิมพ์ใหม่อีกครั้งค่ะ\nเช่น: 6803893'
                        }])
                    continue

                # ── GENERAL MESSAGE → Forward to Telegram ──
                cached = line_users_cache.get(line_user_id, {})
                bound_sid = cached.get('student_id', '')
                student_info = ''
                if bound_sid:
                    st = find_student_by_id(bound_sid)
                    if st:
                        student_info = f"\n🎫 รหัส: <code>{bound_sid}</code> | {st.get('rank','')} {st.get('first_name','')} {st.get('last_name','')}"

                tg_result = send_telegram(
                    f"💬 <b>ข้อความจาก LINE OA</b>\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"👤 จาก: <b>{line_name}</b>{student_info}\n"
                    f"📝 ข้อความ:\n<blockquote>{text}</blockquote>\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"💡 ตอบกลับ: reply ข้อความนี้ใน Telegram\n"
                    f"🆔 <code>linereply_{line_user_id}</code>",
                    reply_markup={
                        'inline_keyboard': [[
                            {'text': '💬 ตอบกลับผ่าน LINE', 'callback_data': f'linereply_{line_user_id}'}
                        ]]
                    }
                )

                # Auto-reply in LINE
                send_line_reply(reply_token, [{
                    'type': 'text',
                    'text': f'ได้รับข้อความแล้วค่ะ 📩\nอาจารย์/Admin จะตอบกลับให้เร็วที่สุด 🙏'
                }])


# ======================================================================
# TELEGRAM REPLY LISTENER (runs alongside LINE webhook)
# ======================================================================

def telegram_reply_listener():
    """Listen for Telegram replies to forward back to LINE users."""
    print("🤖 Telegram ↔ LINE Reply Listener started...")
    offset = 0
    while True:
        try:
            url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getUpdates"
            payload = json.dumps({'offset': offset, 'timeout': 20}).encode('utf-8')
            req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req, timeout=30) as resp:
                result = json.loads(resp.read().decode('utf-8'))

            if result.get('ok') and result.get('result'):
                for update in result['result']:
                    offset = max(offset, update['update_id'] + 1)

                    # Handle callback query (button click)
                    cb = update.get('callback_query')
                    if cb:
                        data_str = cb.get('data', '')

                        # LINE reply callback
                        if data_str.startswith('linereply_'):
                            line_uid = data_str[len('linereply_'):]
                            cb_id = cb['id']
                            cached_name = line_users_cache.get(line_uid, {}).get('name', 'ผู้ใช้')

                            # Answer callback
                            ans_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/answerCallbackQuery"
                            ans_data = json.dumps({
                                'callback_query_id': cb_id,
                                'text': f'💬 พิมพ์ข้อความตอบกลับ {cached_name} แล้ว Reply ข้อความนี้ใน Telegram',
                                'show_alert': True
                            }).encode('utf-8')
                            urllib.request.urlopen(
                                urllib.request.Request(ans_url, data=ans_data, headers={'Content-Type': 'application/json'}),
                                timeout=5
                            )

                            # Send instruction message
                            send_telegram(
                                f"💬 <b>พิมพ์ข้อความตอบกลับ</b> ให้ <b>{cached_name}</b>\n"
                                f"แล้ว <b>Reply (ตอบกลับ)</b> ข้อความนี้ใน Telegram ได้เลยครับ\n\n"
                                f"🆔 <code>linereply_{line_uid}</code>"
                            )
                            continue

                        # Deed approve/reject (existing logic from telegram_bot_listener.py)
                        if data_str.startswith('approve_') or data_str.startswith('reject_'):
                            # Let the existing telegram_bot_listener handle these
                            continue

                    # Handle text message (reply to forwarded LINE msg)
                    message = update.get('message', {})
                    reply_to = message.get('reply_to_message', {})
                    msg_text = message.get('text', '').strip()

                    if reply_to and msg_text:
                        # Check if the replied message contains a linereply_ ID
                        reply_text = reply_to.get('text', '')
                        match = re.search(r'linereply_(U[a-f0-9]+)', reply_text)
                        if match:
                            line_uid = match.group(1)
                            from_user = message.get('from', {})
                            admin_name = f"{from_user.get('first_name', 'Admin')} {from_user.get('last_name', '')}".strip()

                            # Send reply to LINE user
                            result_push = send_line_push(line_uid, [{
                                'type': 'flex',
                                'altText': f'ตอบกลับจาก {admin_name}',
                                'contents': {
                                    'type': 'bubble',
                                    'size': 'kilo',
                                    'header': {
                                        'type': 'box', 'layout': 'vertical',
                                        'backgroundColor': '#1a365d',
                                        'paddingAll': '14px',
                                        'contents': [
                                            {'type': 'text', 'text': '💬 ตอบกลับจากอาจารย์/Admin', 'color': '#60a5fa', 'weight': 'bold', 'size': 'sm'},
                                        ]
                                    },
                                    'body': {
                                        'type': 'box', 'layout': 'vertical',
                                        'backgroundColor': '#0f172a',
                                        'paddingAll': '16px',
                                        'contents': [
                                            {'type': 'text', 'text': msg_text, 'color': '#ffffff', 'size': 'md', 'wrap': True},
                                            {'type': 'separator', 'margin': 'lg'},
                                            {'type': 'text', 'text': f'👩‍🏫 โดย: {admin_name}', 'color': '#94a3b8', 'size': 'xs', 'margin': 'md'},
                                            {'type': 'text', 'text': f'🕐 {time.strftime("%d/%m/%Y %H:%M")}', 'color': '#64748b', 'size': 'xxs', 'margin': 'sm'},
                                        ]
                                    }
                                }
                            }])

                            cached_name = line_users_cache.get(line_uid, {}).get('name', 'ผู้ใช้')
                            if result_push == 200:
                                print(f"✅ Sent reply to LINE user {cached_name}: {msg_text[:50]}")
                                send_telegram(f"✅ ส่งข้อความถึง <b>{cached_name}</b> ใน LINE เรียบร้อยแล้ว")
                            else:
                                print(f"⚠️ Failed to send reply to LINE user {line_uid}")
                                send_telegram(f"⚠️ ส่งข้อความไปยัง LINE ไม่สำเร็จ (อาจยังไม่ได้เพิ่มเพื่อน)")

        except Exception as e:
            print(f"⚠️ Telegram Reply Listener Error: {e}")
            time.sleep(5)
        time.sleep(1)


# ======================================================================
# MAIN
# ======================================================================

def main():
    print("=" * 60)
    print("🤖 LINE ↔ Telegram Bridge Bot")
    print(f"   LINE Webhook: http://0.0.0.0:{WEBHOOK_PORT}/webhook")
    print(f"   Telegram Admin Chat: {TELEGRAM_CHAT_ID}")
    print("=" * 60)
    print()
    print("📌 วิธีใช้:")
    print(f"   1. รัน ngrok: ngrok http {WEBHOOK_PORT}")
    print("   2. คัดลอก URL (เช่น https://xxxx.ngrok.io/webhook)")
    print("   3. ไปใส่ใน LINE Developers Console → Webhook URL")
    print("   4. เปิดใช้งาน Webhook ใน LINE OA")
    print()

    # Load existing bindings into cache
    students = load_students()
    bound = 0
    for s in students:
        lid = s.get('line_user_id', '')
        if lid:
            line_users_cache[lid] = {
                'name': s.get('line_display_name', ''),
                'student_id': str(s.get('student_id', '')),
                'pic': s.get('line_picture_url', '')
            }
            bound += 1
    print(f"📊 Loaded {bound} existing LINE bindings from database")
    print()

    # Start Telegram reply listener in background
    tg_thread = threading.Thread(target=telegram_reply_listener, daemon=True)
    tg_thread.start()

    # Start LINE webhook HTTP server
    server = HTTPServer(('0.0.0.0', WEBHOOK_PORT), LineWebhookHandler)
    print(f"🚀 LINE Webhook Server started on port {WEBHOOK_PORT}")
    print("   Waiting for LINE events...")
    print()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    server.server_close()
    print("\n🛑 Server stopped.")


if __name__ == '__main__':
    main()
