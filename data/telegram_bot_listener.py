#!/usr/bin/env python3
"""
telegram_bot_listener.py
สคริปต์จัดการ Telegram Bot Callback Query แบบอัตโนมัติ (Continuous Long-Polling Listener)
เมื่ออาจารย์กดปุ่ม [ ✅ อนุมัติ ] หรือ [ ❌ ปฏิเสธ ] ในกลุ่ม Telegram:
1. ส่ง answerCallbackQuery ตอบกลับ Telegram ทันทีภายใน 0.5 วินาที เพื่อแสดงป๊อปอัปเด้งแจ้งเตือนอาจารย์บนหน้าจอ
2. อัปเดตสถานะในฐานข้อมูล deeds.json และ deeds_data.js
3. ส่งข้อความตอบกลับใหม่ (Reply Message) ตอบกลับข้อความเดิมอย่างเป็นทางการ
4. พุชข้อมูลขึ้น GitHub Pages อัตโนมัติใน Background
"""
import urllib.request
import urllib.parse
import urllib.error
import json
import os
import time
import subprocess
import threading
import ssl
import sys
import atexit

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(DATA_DIR)

sys.path.insert(0, os.path.join(BASE_DIR, 'backend'))
sys.path.insert(0, DATA_DIR)

try:
    from line_notifier import notify_deed_status_line
except Exception as _ne:
    notify_deed_status_line = None

try:
    from server import save_or_update_deed_in_db, broadcast_event, load_students_map, RECORDS_DIR
except Exception:
    save_or_update_deed_in_db = None
    broadcast_event = None
    load_students_map = None
    RECORDS_DIR = os.path.join(BASE_DIR, 'records')

def get_env_config(key, default=''):
    val = os.environ.get(key)
    if val: return val
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

BOT_TOKEN = get_env_config('TELEGRAM_BOT_TOKEN')
CHAT_ID = get_env_config('TELEGRAM_CHAT_ID', '-4839151586')

LOCK_FILE = '/tmp/gooddeeds_telegram_listener.pid'

def check_and_acquire_lock():
    if os.path.exists(LOCK_FILE):
        try:
            with open(LOCK_FILE, 'r') as f:
                pid = int(f.read().strip())
            if pid != os.getpid():
                os.kill(pid, 0)
                print(f"ℹ️ Telegram Bot Listener already active on PID {pid}. Skipping duplicate listener.")
                return False
        except (OSError, ValueError):
            pass
    try:
        with open(LOCK_FILE, 'w') as f:
            f.write(str(os.getpid()))
        return True
    except Exception:
        return True

def release_lock():
    try:
        if os.path.exists(LOCK_FILE):
            with open(LOCK_FILE, 'r') as f:
                pid = int(f.read().strip())
            if pid == os.getpid():
                os.remove(LOCK_FILE)
    except Exception:
        pass

atexit.register(release_lock)

def send_telegram_request(method, payload):
    if not BOT_TOKEN:
        return {}
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/{method}"
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    ctx = ssl._create_unverified_context()
    timeout_val = 35 if method == 'getUpdates' else 15
    try:
        with urllib.request.urlopen(req, timeout=timeout_val, context=ctx) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as he:
        if he.code == 409:
            print("⚠️ Telegram getUpdates 409 Conflict (another bot instance polling). Waiting 15s...")
            time.sleep(15)
        elif he.code != 400:
            print(f"⚠️ Telegram API HTTP {he.code} ({method}): {he}")
        return {}
    except Exception as e:
        print(f"⚠️ Telegram API Error ({method}): {e}")
        return {}

def load_students():
    if load_students_map:
        try:
            return load_students_map()
        except Exception:
            pass
    for p in [os.path.join(DATA_DIR, 'students.json'), os.path.join(BASE_DIR, 'frontend', 'data', 'students.json'), os.path.join(BASE_DIR, '.local_backup_pdpa', 'students.json')]:
        if os.path.exists(p):
            try:
                with open(p, 'r', encoding='utf-8') as f:
                    return {str(s.get('student_id', '')).strip(): s for s in json.load(f) if s.get('student_id')}
            except Exception:
                pass
    return {}

def calculate_student_total_hours(student_id):
    p = os.path.join(DATA_DIR, 'deeds.json')
    if not os.path.exists(p):
        return 0.0
    try:
        with open(p, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception:
        return 0.0
    
    deeds_list = []
    if isinstance(data, list):
        deeds_list = data
    elif isinstance(data, dict):
        deeds_list = data.get(str(student_id), [])
        if not deeds_list:
            for dlist in data.values():
                if isinstance(dlist, list):
                    for d in dlist:
                        if str(d.get('student_id') or d.get('studentId')) == str(student_id):
                            deeds_list.append(d)
                            
    total = 0.0
    for d in deeds_list:
        if d.get('status') == 'approved':
            total += float(d.get('hours', 0))
    return total

def _save_deeds_fallback(data):
    deeds_file = os.path.join(DATA_DIR, 'deeds.json')
    for json_p in [deeds_file, os.path.join(BASE_DIR, 'frontend', 'data', 'deeds.json')]:
        try:
            with open(json_p, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"⚠️ Error writing {json_p}: {e}")
        
    js_content = f"// Auto-updated by telegram_bot_listener.py\nconst IMPORTED_DEEDS = {json.dumps(data, ensure_ascii=False, indent=2)};\nconst DEEDS_DATA = IMPORTED_DEEDS;\n\nif (typeof window !== 'undefined') {{ window.IMPORTED_DEEDS = IMPORTED_DEEDS; window.DEEDS_DATA = DEEDS_DATA; }}\nif (typeof globalThis !== 'undefined') {{ globalThis.IMPORTED_DEEDS = IMPORTED_DEEDS; globalThis.DEEDS_DATA = DEEDS_DATA; }}\n"
    for js_p in [os.path.join(DATA_DIR, 'deeds_data.js'), os.path.join(BASE_DIR, 'frontend', 'data', 'deeds_data.js')]:
        try:
            with open(js_p, 'w', encoding='utf-8') as f:
                f.write(js_content)
        except Exception as e:
            print(f"⚠️ Error writing {js_p}: {e}")

def push_updates_to_github_bg(msg="Auto-update deed status from Telegram"):
    def run_push():
        try:
            res = subprocess.run(["git", "branch", "--show-current"], cwd=BASE_DIR, capture_output=True, text=True)
            curr_branch = res.stdout.strip()
            if not curr_branch:
                return
            subprocess.run(["git", "add", "-A"], cwd=BASE_DIR, check=False)
            commit_res = subprocess.run(["git", "commit", "-m", msg], cwd=BASE_DIR, capture_output=True, text=True)
            if "nothing to commit" not in commit_res.stdout:
                subprocess.run(["git", "push", "origin", curr_branch], cwd=BASE_DIR, check=False)
                print(f"🚀 Successfully pushed updates to branch {curr_branch} in background!")
        except Exception as e:
            print(f"ℹ️ Background Git push skipped: {e}")
    threading.Thread(target=run_push, daemon=True).start()

def update_deed_status_in_db(student_id, deed_id, new_status, approver_name):
    student_id = str(student_id).strip()
    deed_id = str(deed_id).strip()
    deeds_file = os.path.join(DATA_DIR, 'deeds.json')
    if not os.path.exists(deeds_file):
        return None
    
    with open(deeds_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    target_deed = None
    all_deeds = []
    if isinstance(data, list):
        all_deeds = data
    elif isinstance(data, dict):
        for sid, dlist in data.items():
            if isinstance(dlist, list):
                all_deeds.extend(dlist)
                
    # 1. Match by exact deed_id
    if deed_id:
        for d in all_deeds:
            if str(d.get('id', '')).strip() == deed_id:
                target_deed = d
                break
                
    # 2. Fallback: Match by student_id and pending status
    if not target_deed and student_id:
        for d in all_deeds:
            if str(d.get('student_id') or d.get('studentId') or '').strip() == student_id and d.get('status') == 'pending':
                target_deed = d
                break
                
    if not target_deed:
        print(f"⚠️ Deed not found for student {student_id}, deed {deed_id}")
        return None

    if not student_id:
        student_id = str(target_deed.get('student_id') or target_deed.get('studentId') or '').strip()

    now_iso = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    target_deed['status'] = new_status
    target_deed['approved_by'] = approver_name
    target_deed['approvedBy'] = approver_name
    target_deed['updated_at'] = now_iso
    target_deed['approvedAt'] = now_iso

    # Canonical persistence using server's save_or_update_deed_in_db
    if save_or_update_deed_in_db:
        try:
            save_or_update_deed_in_db(student_id, target_deed)
        except Exception as _se:
            print(f"⚠️ Error in server save_or_update_deed_in_db: {_se}")
            _save_deeds_fallback(data)
    else:
        _save_deeds_fallback(data)

    print(f"✅ DB Updated for student {student_id} (Deed: {target_deed.get('id')}): status={new_status}")

    # SSE Real-time broadcast to all web clients
    if broadcast_event:
        try:
            broadcast_event("deed_approved", {
                "studentId": student_id,
                "deedId": str(target_deed.get('id', '')),
                "status": new_status,
                "approver": approver_name
            })
        except Exception as _be:
            print(f"⚠️ Broadcast SSE error: {_be}")

    # Auto-create individual student folder & PDF slip in background
    def _run_organize():
        try:
            subprocess.run(["python3", os.path.join(DATA_DIR, "organize_student_records.py")], cwd=BASE_DIR, check=False)
            print("📂 Auto-created individual student folder and PDF slip!")
        except Exception as e:
            print(f"⚠️ Organize error: {e}")
    threading.Thread(target=_run_organize, daemon=True).start()

    # Trigger background git push (optional)
    push_updates_to_github_bg(f"อนุมัติความดี {student_id} โดย {approver_name}")

    # Send LINE notification to student if student has line_user_id
    if notify_deed_status_line and target_deed:
        try:
            notify_deed_status_line(student_id, target_deed, new_status, approver_name)
        except Exception as _le:
            print(f"⚠️ Error pushing LINE notification: {_le}")
        
    return target_deed

def process_callback_query(cb):
    cb_id = cb['id']
    data_str = cb.get('data', '').strip()
    msg = cb.get('message', {})
    msg_id = msg.get('message_id')
    chat = msg.get('chat', {})
    target_chat_id = chat.get('id') or CHAT_ID
    from_user = cb.get('from', {})
    
    approver_name = f"{from_user.get('first_name', '')} {from_user.get('last_name', '')}".strip()
    u_name = (from_user.get('username') or '').lower()
    fn = (from_user.get('first_name') or '').lower()
    if 'anuchit' in u_name or 'bird' in u_name or 'anuchit' in fn or 'bird' in fn or 'อนุชิต' in approver_name:
        approver_name = "ร.อ.อนุชิต ทำจะดี (Bird)"
    elif not approver_name:
        approver_name = "ร.อ.อนุชิต ทำจะดี (Bird)"

    if data_str.startswith('done_'):
        send_telegram_request('answerCallbackQuery', {
            'callback_query_id': cb_id,
            'text': "ℹ️ รายการนี้ได้รับการบันทึกข้อมูลและอนุมัติเรียบร้อยแล้วครับ",
            'show_alert': True
        })
        return

    is_approve = data_str.startswith('approve_')
    is_reject = data_str.startswith('reject_')

    if not is_approve and not is_reject:
        return

    action = 'approve' if is_approve else 'reject'
    rest = data_str[len(action) + 1:].strip()

    # Load all deeds to identify deed and student
    deeds_file = os.path.join(DATA_DIR, 'deeds.json')
    all_deeds = []
    deeds_map_by_student = {}
    if os.path.exists(deeds_file):
        try:
            with open(deeds_file, 'r', encoding='utf-8') as f:
                d_raw = json.load(f)
                if isinstance(d_raw, dict):
                    deeds_map_by_student = d_raw
                    for sid_key, d_list in d_raw.items():
                        if isinstance(d_list, list):
                            all_deeds.extend(d_list)
                elif isinstance(d_raw, list):
                    all_deeds = d_raw
        except Exception as _e:
            print(f"⚠️ Error reading deeds.json: {_e}")

    deed_id = ''
    student_id = ''
    target_deed = None

    # Strategy 1: rest exactly matches a deed ID in database
    exact_match = next((d for d in all_deeds if str(d.get('id', '')).strip() == rest), None)
    if exact_match:
        target_deed = exact_match
        deed_id = str(exact_match.get('id', '')).strip()
        student_id = str(exact_match.get('studentId') or exact_match.get('student_id') or '').strip()

    # Strategy 2: candidate split by rightmost underscore (e.g. deed_1788613140000_6903952_6903952)
    if not target_deed and '_' in rest:
        candidate_deed_id, candidate_student_id = rest.rsplit('_', 1)
        candidate_match = next((d for d in all_deeds if str(d.get('id', '')).strip() == candidate_deed_id), None)
        if candidate_match:
            target_deed = candidate_match
            deed_id = candidate_deed_id
            student_id = str(candidate_match.get('studentId') or candidate_match.get('student_id') or candidate_student_id).strip()
        else:
            if len(candidate_student_id) == 7 and candidate_student_id.isdigit():
                student_id = candidate_student_id
                deed_id = candidate_deed_id
            else:
                deed_id = candidate_deed_id
                student_id = candidate_student_id

    # Strategy 3: rest is a 7-digit student ID
    if not target_deed and len(rest) == 7 and rest.isdigit():
        student_id = rest

    # Strategy 4: match by student_id and pending status
    if not target_deed and student_id:
        s_deeds = deeds_map_by_student.get(student_id, [])
        pending_s = [d for d in s_deeds if d.get('status') == 'pending']
        if deed_id:
            target_deed = next((d for d in s_deeds if str(d.get('id', '')).strip() == deed_id), None)
        if not target_deed and pending_s:
            target_deed = pending_s[0]
            deed_id = str(target_deed.get('id', ''))

    if not target_deed and not deed_id and not student_id:
        send_telegram_request('answerCallbackQuery', {
            'callback_query_id': cb_id,
            'text': "⚠️ ไม่พบรายการความดีดังกล่าวในระบบ หรืออาจถูกลบไปแล้ว",
            'show_alert': True
        })
        return

    # Check idempotency / already decided
    if target_deed:
        current_status = target_deed.get('status')
        if current_status == 'approved' and is_approve:
            send_telegram_request('answerCallbackQuery', {
                'callback_query_id': cb_id,
                'text': "ℹ️ รายการนี้ได้รับการอนุมัติเรียบร้อยแล้วครับ",
                'show_alert': True
            })
            if msg_id:
                send_telegram_request('editMessageReplyMarkup', {
                    'chat_id': target_chat_id,
                    'message_id': msg_id,
                    'reply_markup': {
                        'inline_keyboard': [
                            [{'text': f'✅ บันทึกอนุมัติแล้ว ({target_deed.get("approvedBy") or approver_name})', 'callback_data': f'done_{deed_id}'}]
                        ]
                    }
                })
            return
        elif current_status == 'rejected' and is_reject:
            send_telegram_request('answerCallbackQuery', {
                'callback_query_id': cb_id,
                'text': "ℹ️ รายการนี้ได้รับการปฏิเสธเรียบร้อยแล้วครับ",
                'show_alert': True
            })
            return

    students_map = load_students()
    student = students_map.get(str(student_id).strip(), {})
    student_name = f"{student.get('rank', 'นพอ.')} {student.get('first_name', '')} {student.get('last_name', '')}".strip()
    if not student_name or student_name == 'นพอ.' or 'รหัส' in student_name:
        if target_deed and target_deed.get('student_name'):
            student_name = target_deed['student_name']
        else:
            student_name = f"นพอ. ({student_id})"
    cy = str(student.get('class_year') or (student_id[:2] if len(student_id) >= 2 else '69'))

    if is_approve:
        target_deed = update_deed_status_in_db(student_id, deed_id, 'approved', approver_name)
        total_hrs = calculate_student_total_hours(student_id)
        is_pass = total_hrs >= 50
        deed_desc = target_deed.get('description', 'บันทึกความดีจิตอาสา') if target_deed else 'กิจกรรมจิตอาสา'
        deed_hrs = target_deed.get('hours', 2) if target_deed else 2
        effective_deed_id = target_deed.get('id', deed_id) if target_deed else deed_id

        # IMMEDIATELY ANSWER TELEGRAM CALLBACK QUERY WITH DETAILED POPUP ALERT
        send_telegram_request('answerCallbackQuery', {
            'callback_query_id': cb_id,
            'text': f"✅ บันทึกข้อมูลอนุมัติเรียบร้อยแล้ว!\n\n👤 {student_name}\n📂 {deed_desc}\n⏱ +{deed_hrs} ชม. (รวมสะสม: {total_hrs:.1f} ชม.)\n👩‍🏫 ผู้อนุมัติ: {approver_name}",
            'show_alert': True
        })

        encoded_name = urllib.parse.quote(student_name)
        pdf_slip_url = f"https://liff.line.me/2010948179-Ympqt2bT?page=slip&id={effective_deed_id}&studentId={student_id}&name={encoded_name}"
        approve_sign_url = f"https://anuchit1tube168-cmd.github.io/gooddeeds69/frontend/approve_sign.html?id={effective_deed_id}&studentId={student_id}&name={encoded_name}&status=approved"
        pass_badge = "✅ ผ่านเกณฑ์ขั้นต่ำ 50 ชม." if is_pass else "⏳ กำลังสะสมความดี"

        reply_html = f"""🎉 <b>บันทึกข้อมูลอนุมัติความดีเรียบร้อยแล้ว ✅</b>
━━━━━━━━━━━━━━━━━━━━━━━
👤 <b>นักเรียน:</b> {student_name}
🎫 <b>รหัส นพอ.:</b> <code>{student_id}</code> | รุ่น {cy}
📂 <b>กิจกรรม:</b> {deed_desc}
⏱ <b>จำนวนชั่วโมง:</b> <b>{deed_hrs} ชม.</b>

👩‍🏫 <b>ผู้อนุมัติ:</b> {approver_name}
📊 <b>ชั่วโมงสะสมรวมล่าสุด:</b> <b>{total_hrs:.1f} / 400 ชม.</b> ({pass_badge})
✍️ <b>สถานะการรับรอง:</b> <u>ลงข้อมูลและอนุมัติรับรองในระบบเรียบร้อยแล้ว</u>
<i>(หากต้องการจรดลายมือชื่อสดลงบนเอกสารใบสลิป สามารถคลิกปุ่มด้านล่างเพื่อลงนามสดได้ทุกเมื่อ)</i>
━━━━━━━━━━━━━━━━━━━━━━━
✍️ <a href="{approve_sign_url}">เปิดหน้าจรดลายมือชื่อสด (Live Signature)</a>
📄 <a href="{pdf_slip_url}">เปิดดู / พิมพ์ใบบันทึกความดี A4 (PDF Slip)</a>
🌐 <i>ระบบซิงก์ข้อมูลลงฐานข้อมูลและแสดงผลบนออนไลน์เรียบร้อยแล้ว</i>"""

        send_telegram_request('sendMessage', {
            'chat_id': target_chat_id,
            'text': reply_html,
            'parse_mode': 'HTML',
            'reply_to_message_id': msg_id,
            'reply_markup': {
                'inline_keyboard': [
                    [
                        {'text': '✍️ จรดลายเซ็นสดในระบบ ↗️', 'url': approve_sign_url},
                        {'text': '📄 พิมพ์สลิป A4 (PDF) ↗️', 'url': pdf_slip_url}
                    ]
                ]
            }
        })

        if msg_id:
            send_telegram_request('editMessageReplyMarkup', {
                'chat_id': target_chat_id,
                'message_id': msg_id,
                'reply_markup': {
                    'inline_keyboard': [
                        [{'text': f'✅ บันทึกอนุมัติแล้ว ({approver_name})', 'callback_data': f'done_{effective_deed_id}'}],
                        [
                            {'text': '✍️ จรดลายเซ็นสดในระบบ ↗️', 'url': approve_sign_url},
                            {'text': '📄 พิมพ์สลิป A4 (PDF) ↗️', 'url': pdf_slip_url}
                        ]
                    ]
                }
            })

    elif is_reject:
        target_deed = update_deed_status_in_db(student_id, deed_id, 'rejected', approver_name)
        deed_desc = target_deed.get('description', 'กิจกรรมจิตอาสา') if target_deed else 'กิจกรรมจิตอาสา'
        effective_deed_id = target_deed.get('id', deed_id) if target_deed else deed_id

        send_telegram_request('answerCallbackQuery', {
            'callback_query_id': cb_id,
            'text': f"❌ ปฏิเสธบันทึกความดีของ {student_name} เรียบร้อยแล้ว",
            'show_alert': True
        })

        reply_html = f"""❌ <b>แจ้งปฏิเสธบันทึกความดี</b>
━━━━━━━━━━━━━━━━━━━━━━━
👤 <b>นักเรียน:</b> {student_name}
🎫 <b>รหัส นพอ.:</b> <code>{student_id}</code>
📂 <b>กิจกรรม:</b> {deed_desc}

👩‍🏫 <b>ปฏิเสธโดย:</b> {approver_name} (ผ่าน Telegram)
📝 <b>คำแนะนำ:</b> กรุณาตรวจสอบข้อมูลและรูปภาพหลักฐาน แล้วยื่นบันทึกใหม่อีกครั้ง
━━━━━━━━━━━━━━━━━━━━━━━"""

        send_telegram_request('sendMessage', {
            'chat_id': target_chat_id,
            'text': reply_html,
            'parse_mode': 'HTML',
            'reply_to_message_id': msg_id
        })

        if msg_id:
            send_telegram_request('editMessageReplyMarkup', {
                'chat_id': target_chat_id,
                'message_id': msg_id,
                'reply_markup': {
                    'inline_keyboard': [
                        [{'text': f'❌ ปฏิเสธแล้ว ({approver_name})', 'callback_data': f'done_{effective_deed_id}'}]
                    ]
                }
            })

_LISTENER_THREAD = None

def start_listener_loop():
    if not BOT_TOKEN:
        print("ℹ️ TELEGRAM_BOT_TOKEN not configured; Telegram Bot listener stopped.")
        return
    if not check_and_acquire_lock():
        return
    print("🤖 Telegram Bot Listener Daemon started (24/7 Long-Polling Instant Reaction)...")
    offset = 0
    while True:
        try:
            res = send_telegram_request('getUpdates', {
                'offset': offset,
                'timeout': 20,
                'allowed_updates': ['message', 'callback_query']
            })
            if res.get('ok') and res.get('result'):
                for update in res['result']:
                    offset = max(offset, update['update_id'] + 1)
                    if 'callback_query' in update:
                        print(f"📩 Processing Callback Query ID: {update['callback_query']['id']}")
                        process_callback_query(update['callback_query'])
            elif not res.get('ok'):
                time.sleep(10)
        except Exception as e:
            print(f"⚠️ Listener Loop Error: {e}")
            time.sleep(10)
        time.sleep(1)

def start_listener_in_background():
    global _LISTENER_THREAD
    if _LISTENER_THREAD and _LISTENER_THREAD.is_alive():
        return _LISTENER_THREAD
    _LISTENER_THREAD = threading.Thread(target=start_listener_loop, daemon=True, name="TelegramBotListener")
    _LISTENER_THREAD.start()
    return _LISTENER_THREAD

if __name__ == '__main__':
    start_listener_loop()
