import json
import os
import time
import sys
import re
import io
import threading
import queue
from http.server import SimpleHTTPRequestHandler, HTTPServer, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs
from http.cookies import SimpleCookie

# Real-time event streams for connected clients
clients = []
clients_lock = threading.Lock()

def broadcast_event(event_type, data):
    """Send an event to all connected SSE clients."""
    with clients_lock:
        message = f"event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
        for q in clients:
            try:
                q.put_nowait(message)
            except Exception:
                pass


# Try to import DOCX and pythainlp libraries safely
try:
    from pythainlp import word_tokenize
    from docx import Document
    from docx.shared import Pt, Cm
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    DOCX_SUPPORTED = True
except ImportError as e:
    print(f"⚠️  DOCX generation libraries not fully available: {e}")
    DOCX_SUPPORTED = False

# Set the base directory to the project root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')
RECORDS_DIR = os.path.join(BASE_DIR, 'records')
GDRIVE_DEST = os.path.expanduser('~/Library/CloudStorage/GoogleDrive-anuchit1tube168@gmail.com/ไดรฟ์ของฉัน/ระบบบันทึกความดี_วพอ_2569')

def sync_to_google_drive_bg():
    """Sync data folder to Google Drive in background thread."""
    def run_sync():
        try:
            if os.path.exists(os.path.dirname(GDRIVE_DEST)):
                os.makedirs(GDRIVE_DEST, exist_ok=True)
                import subprocess
                subprocess.run([
                    'rsync', '-av',
                    '--exclude=.git',
                    '--exclude=node_modules',
                    '--exclude=photos_backup',
                    BASE_DIR + '/',
                    GDRIVE_DEST + '/'
                ], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                print("☁️ Synced latest data to Google Drive successfully!")
        except Exception as e:
            print(f"⚠️ Google Drive sync warning: {e}")
    threading.Thread(target=run_sync, daemon=True).start()

CATEGORIES_NAME_MAP = {
    1: 'บริจาคโลหิต/เกล็ดเลือด/พลาสมา',
    2: 'โครงการภายนอก (คำสั่ง วพอ.)',
    3: 'ช่วยเหลืองานภายใน วพอ.',
    4: 'เข้าอบรมที่ วพอ. จัดให้',
    5: 'ช่วยงานหน่วยงาน/ชุมชน/มูลนิธิ',
    6: 'ทำนุบำรุงศาสนสถาน',
    7: 'งานฟรีทั่วไป',
    8: 'กิจกรรมจงรักภักดีต่อสถาบัน',
    9: 'ชม. ที่สมควรได้รับ (บทบาทพิเศษ)'
}

ZWS = "\u200b"  # Zero-Width Space

def insert_zwsp(text, engine="newmm"):
    """Insert Zero-Width Space between Thai words to allow proper Word wrapping."""
    if not text:
        return ""
    thai_pattern = re.compile(r'([\u0E00-\u0E7F]+)')
    parts = thai_pattern.split(str(text))
    result = []
    for part in parts:
        if thai_pattern.fullmatch(part):
            try:
                tokens = word_tokenize(part, engine=engine)
                result.append(ZWS.join(tokens))
            except:
                result.append(part)
        else:
            result.append(part)
    return "".join(result)

def get_category_name(category_id):
    try:
        return CATEGORIES_NAME_MAP.get(int(category_id), "อื่นๆ")
    except:
        return "อื่นๆ"

def parse_cookie_header(cookie_header):
    if not cookie_header:
        return {}
    cookie = SimpleCookie()
    try:
        cookie.load(cookie_header)
    except Exception:
        return {}
    return {key: morsel.value for key, morsel in cookie.items()}

def is_staff_role(role):
    return role in ('teacher', 'admin')

def get_deeds_for_student(student_id):
    """Retrieve all deeds for a student, merging seeded seeds with dynamic records."""
    # 1. Load imported deeds from frontend/data/deeds.json
    imported_deeds = {}
    deeds_json_path = os.path.join(BASE_DIR, 'frontend', 'data', 'deeds.json')
    if os.path.exists(deeds_json_path):
        try:
            with open(deeds_json_path, 'r', encoding='utf-8') as f:
                imported_deeds = json.load(f)
        except Exception as e:
            print(f"Error reading deeds.json: {e}")
            
    student_deeds = imported_deeds.get(student_id, [])
    
    # 2. Load dynamic deeds from records/ recursively
    dynamic_deeds = []
    if os.path.exists(RECORDS_DIR):
        for root, dirs, files in os.walk(RECORDS_DIR):
            if f"Student_{student_id}" in root:
                for file in files:
                    if file.endswith('.json'):
                        file_path = os.path.join(root, file)
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                deed = json.load(f)
                                dynamic_deeds.append(deed)
                        except Exception as e:
                            print(f"Error reading dynamic deed {file_path}: {e}")
                            
    # 3. Merge them to avoid duplicates by deed ID
    merged_map = {d['id']: d for d in student_deeds}
    for d in dynamic_deeds:
        merged_map[d['id']] = d
        
    return list(merged_map.values())

def get_all_deeds():
    """Retrieve all deeds for all students (seeded + dynamic)."""
    # 1. Load all imported deeds
    imported_deeds = {}
    deeds_json_path = os.path.join(BASE_DIR, 'frontend', 'data', 'deeds.json')
    if os.path.exists(deeds_json_path):
        try:
            with open(deeds_json_path, 'r', encoding='utf-8') as f:
                imported_deeds = json.load(f)
        except Exception as e:
            print(f"Error reading deeds.json: {e}")
            
    # 2. Walk records/ directory to find all dynamic deeds
    dynamic_deeds_by_student = {}
    if os.path.exists(RECORDS_DIR):
        for root, dirs, files in os.walk(RECORDS_DIR):
            match = re.search(r'Student_(\d+)', root)
            if match:
                student_id = match.group(1)
                if student_id not in dynamic_deeds_by_student:
                    dynamic_deeds_by_student[student_id] = []
                for file in files:
                    if file.endswith('.json'):
                        file_path = os.path.join(root, file)
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                deed = json.load(f)
                                dynamic_deeds_by_student[student_id].append(deed)
                        except Exception as e:
                            print(f"Error reading dynamic deed {file_path}: {e}")
                            
    # 3. Merge
    all_students = set(list(imported_deeds.keys()) + list(dynamic_deeds_by_student.keys()))
    result = {}
    for sid in all_students:
        student_deeds = imported_deeds.get(sid, [])
        dyn_deeds = dynamic_deeds_by_student.get(sid, [])
        merged_map = {d['id']: d for d in student_deeds}
        for d in dyn_deeds:
            merged_map[d['id']] = d
        result[sid] = list(merged_map.values())
        
    return result

def generate_docx_in_memory(student_id, academic_year=2569):
    """Generate a professional A4 Word document report for a student."""
    if not DOCX_SUPPORTED:
        raise RuntimeError("docx and pythainlp libraries are not installed on this server.")

    # 1. Load student info from frontend/data/students.json
    students = []
    students_json_path = os.path.join(BASE_DIR, 'frontend', 'data', 'students.json')
    if os.path.exists(students_json_path):
        try:
            with open(students_json_path, 'r', encoding='utf-8') as f:
                students = json.load(f)
        except Exception as e:
            print(f"Error reading students.json: {e}")
            
    student = next((s for s in students if s['student_id'] == student_id), None)
    if not student:
        return None
        
    # 2. Get approved deeds
    deeds = get_deeds_for_student(student_id)
    approved_deeds = [d for d in deeds if d.get('status') == 'approved' and d.get('academicYear', 2569) == academic_year]
    approved_deeds.sort(key=lambda x: x.get('activityDate', ''))
    
    total_hours = sum(float(d.get('hours', 0)) for d in approved_deeds)
    passed = total_hours >= 50
    
    # 3. Create document
    doc = Document()
    
    # Page Setup (A4 with 2.54 cm margins)
    section = doc.sections[0]
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(2.54)
    section.bottom_margin = Cm(2.54)
    section.left_margin = Cm(2.54)
    section.right_margin = Cm(2.54)
    
    # Default Font Setup (TH Sarabun New)
    font_name = "TH Sarabun New"
    style = doc.styles["Normal"]
    style.font.name = font_name
    style.font.size = Pt(15)
    style.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
    style.paragraph_format.line_spacing = 1.15
    style.paragraph_format.space_after = Pt(4)
    
    # Report Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_after = Pt(12)
    run_title = p_title.add_run(insert_zwsp("รายงานสรุปการบำเพ็ญประโยชน์จิตอาสา"))
    run_title.font.name = font_name
    run_title.font.size = Pt(20)
    run_title.font.bold = True
    
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_after = Pt(24)
    run_sub = p_sub.add_run(insert_zwsp(f"วิทยาลัยพยาบาลทหารอากาศ ปีการศึกษา {academic_year}"))
    run_sub.font.name = font_name
    run_sub.font.size = Pt(16)
    run_sub.font.bold = True
    
    # Student Profile Section
    p_profile_title = doc.add_paragraph()
    p_profile_title.paragraph_format.space_after = Pt(6)
    run_profile_title = p_profile_title.add_run(insert_zwsp("๑. ข้อมูลประจำตัวนักเรียนพยาบาลทหารอากาศ"))
    run_profile_title.font.name = font_name
    run_profile_title.font.size = Pt(16)
    run_profile_title.font.bold = True
    
    fullname = f"{student.get('rank', 'นพอ.')} {student.get('first_name', '')} {student.get('last_name', '')}"
    
    p_info = doc.add_paragraph()
    p_info.paragraph_format.left_indent = Cm(1.0)
    p_info.paragraph_format.space_after = Pt(6)
    
    info_text = (
        f"ชื่อ-สกุล: {fullname}\n"
        f"เลขประจำตัวนักเรียน: {student.get('student_id', '')}   ชั้นปี: {student.get('year_level', '')} (รุ่น {student.get('class_year', '')})\n"
        f"ชั่วโมงจิตอาสาสะสมได้รับการอนุมัติ: {total_hours:.1f} ชั่วโมง (จากเกณฑ์ขั้นต่ำ 50 ชั่วโมง)\n"
        f"ผลการประเมินชั่วโมงจิตอาสา: {'ผ่านเกณฑ์การสะสมชั่วโมง' if passed else 'ยังไม่ผ่านเกณฑ์การสะสมชั่วโมง'}"
    )
    p_info.add_run(insert_zwsp(info_text))
    
    # Deed Records Section
    p_deeds_title = doc.add_paragraph()
    p_deeds_title.paragraph_format.space_before = Pt(12)
    p_deeds_title.paragraph_format.space_after = Pt(6)
    run_deeds_title = p_deeds_title.add_run(insert_zwsp("๒. ประวัติการบำเพ็ญประโยชน์จิตอาสาที่ได้รับการอนุมัติ"))
    run_deeds_title.font.name = font_name
    run_deeds_title.font.size = Pt(16)
    run_deeds_title.font.bold = True
    
    if not approved_deeds:
        p_empty = doc.add_paragraph()
        p_empty.paragraph_format.left_indent = Cm(1.0)
        p_empty.add_run(insert_zwsp("- ไม่พบประวัติกิจกรรมจิตอาสาที่ได้รับการอนุมัติในระบบ -"))
    else:
        # Table of approved deeds
        table = doc.add_table(rows=1, cols=5)
        table.style = 'Table Grid'
        
        # Header Row
        hdr_cells = table.rows[0].cells
        hdr_cells[0].text = insert_zwsp("ลำดับ")
        hdr_cells[1].text = insert_zwsp("วันที่ทำกิจกรรม")
        hdr_cells[2].text = insert_zwsp("ประเภทจิตอาสา")
        hdr_cells[3].text = insert_zwsp("รายละเอียดกิจกรรม")
        hdr_cells[4].text = insert_zwsp("ชั่วโมง")
        
        # Center align headers and make bold
        for cell in hdr_cells:
            cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in cell.paragraphs[0].runs:
                run.font.name = font_name
                run.font.bold = True
                run.font.size = Pt(14)
                
        # Populate rows
        for idx, d in enumerate(approved_deeds, 1):
            row_cells = table.add_row().cells
            row_cells[0].text = str(idx)
            row_cells[1].text = d.get('activityDate', '')
            
            category_id = d.get('categoryId', 0)
            category_name = get_category_name(category_id)
            row_cells[2].text = insert_zwsp(category_name)
            row_cells[3].text = insert_zwsp(d.get('description', ''))
            row_cells[4].text = f"{float(d.get('hours', 0)):.1f}"
            
            # Formats
            for col_idx, cell in enumerate(row_cells):
                p = cell.paragraphs[0]
                p.paragraph_format.line_spacing = 1.0
                p.paragraph_format.space_after = Pt(2)
                p.paragraph_format.space_before = Pt(2)
                if col_idx in (0, 1, 4):
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                else:
                    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                for run in p.runs:
                    run.font.name = font_name
                    run.font.size = Pt(13)
                    
        # Column Widths
        widths = [Cm(1.2), Cm(2.8), Cm(3.8), Cm(6.5), Cm(1.7)]
        for row in table.rows:
            for idx, width in enumerate(widths):
                row.cells[idx].width = width
                
    # Signatures
    p_sig_space = doc.add_paragraph()
    p_sig_space.paragraph_format.space_before = Pt(40)
    
    table_sig = doc.add_table(rows=1, cols=2)
    table_sig.autofit = False
    
    sig_cells = table_sig.rows[0].cells
    sig_cells[0].width = Cm(8.0)
    sig_cells[1].width = Cm(8.0)
    
    p_sig_left = sig_cells[0].paragraphs[0]
    p_sig_left.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sig_left.add_run(insert_zwsp(
        "ลงชื่อ...........................................................\n"
        f"( {fullname} )\n"
        "นักเรียนพยาบาลทหารอากาศ ผู้รายงาน"
    ))
    for run in p_sig_left.runs:
        run.font.name = font_name
        run.font.size = Pt(14)
        
    p_sig_right = sig_cells[1].paragraphs[0]
    p_sig_right.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sig_right.add_run(insert_zwsp(
        "ลงชื่อ...........................................................\n"
        "( ........................................................... )\n"
        "อาจารย์ผู้รับรอง / ผู้ตรวจสอบ"
    ))
    for run in p_sig_right.runs:
        run.font.name = font_name
        run.font.size = Pt(14)
        
    # Save to buffer
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer


class CustomHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def get_auth_context(self):
        cookies = parse_cookie_header(self.headers.get('Cookie'))
        return {
            'role': self.headers.get('X-GoodDeeds-Role') or cookies.get('gooddeeds_role') or '',
            'student_id': self.headers.get('X-GoodDeeds-Student-Id') or cookies.get('gooddeeds_student_id') or '',
            'username': self.headers.get('X-GoodDeeds-Username') or cookies.get('gooddeeds_username') or '',
        }

    def send_json_response(self, status_code, payload):
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(payload, ensure_ascii=False).encode('utf-8'))

    def deny_json(self, message='Forbidden'):
        self.send_json_response(403, {'status': 'error', 'message': message})

    def can_access_student(self, student_id):
        auth = self.get_auth_context()
        if is_staff_role(auth.get('role')):
            return True
        return auth.get('role') == 'student' and auth.get('student_id') == str(student_id)

    def require_staff(self):
        if is_staff_role(self.get_auth_context().get('role')):
            return True
        self.deny_json('ต้องใช้สิทธิ์อาจารย์หรือผู้ดูแลระบบ')
        return False

    def do_GET(self):
        parsed_path = urlparse(self.path)
        query_params = {}
        if parsed_path.query:
            query_params = {k: v[0] for k, v in parse_qs(parsed_path.query).items()}
            
        if parsed_path.path == '/api/get_deeds':
            student_id = query_params.get('studentId')
            if not student_id:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b"Missing studentId parameter")
                return

            if not self.can_access_student(student_id):
                self.deny_json('นักเรียนสามารถดูข้อมูลได้เฉพาะของตัวเองเท่านั้น')
                return
                
            try:
                deeds = get_deeds_for_student(student_id)
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(deeds, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode('utf-8'))
                
        elif parsed_path.path == '/api/get_all_deeds':
            if not self.require_staff():
                return

            try:
                deeds = get_all_deeds()
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(deeds, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode('utf-8'))
                
        elif parsed_path.path == '/api/export_docx':
            student_id = query_params.get('studentId')
            year_param = query_params.get('academicYear', '2569')
            try:
                academic_year = int(year_param)
            except ValueError:
                academic_year = 2569
                
            if not student_id:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b"Missing studentId parameter")
                return

            if not self.can_access_student(student_id):
                self.send_response(403)
                self.end_headers()
                self.wfile.write("นักเรียนสามารถส่งออกรายงานได้เฉพาะของตัวเองเท่านั้น".encode('utf-8'))
                return
                
            try:
                docx_buffer = generate_docx_in_memory(student_id, academic_year=academic_year)
                if not docx_buffer:
                    self.send_response(404)
                    self.end_headers()
                    self.wfile.write(b"Student not found")
                    return
                    
                self.send_response(200)
                self.send_header('Content-type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
                self.send_header('Content-Disposition', f'attachment; filename="report_{student_id}_{academic_year}.docx"')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(docx_buffer.getvalue())
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode('utf-8'))
        elif parsed_path.path == '/api/events':
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Connection', 'keep-alive')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            q = queue.Queue()
            with clients_lock:
                clients.append(q)
                
            try:
                while True:
                    try:
                        message = q.get(timeout=20.0)
                        self.wfile.write(message.encode('utf-8'))
                        self.wfile.flush()
                    except queue.Empty:
                        self.wfile.write(b": ping\n\n")
                        self.wfile.flush()
            except Exception:
                pass
            finally:
                with clients_lock:
                    if q in clients:
                        clients.remove(q)
            return
        else:
            # Serve static files normally
            super().do_GET()

    def do_POST(self):
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/api/submit_deed':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                deed_data = json.loads(post_data.decode('utf-8'))
                
                academic_year = deed_data.get('academicYear', 2569)
                student = deed_data.get('student', {})
                class_year = student.get('class_year', 'Unknown')
                student_id = str(deed_data.get('studentId') or student.get('student_id') or 'Unknown')
                category_id = deed_data.get('categoryId', 'Unknown')
                deed_id = deed_data.get('id', 'Unknown')

                if not self.can_access_student(student_id):
                    self.deny_json('นักเรียนสามารถส่งข้อมูลได้เฉพาะของตัวเองเท่านั้น')
                    return

                deed_data['studentId'] = student_id
                
                # Save deed directly: records/AY2569/Class_69/Student_6900001/Category_1/{deed_id}.json
                target_dir = os.path.join(
                    RECORDS_DIR, 
                    f"AY{academic_year}", 
                    f"Class_{class_year}", 
                    f"Student_{student_id}",
                    f"Category_{category_id}"
                )
                os.makedirs(target_dir, exist_ok=True)
                
                filepath = os.path.join(target_dir, f"{deed_id}.json")
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(deed_data, f, ensure_ascii=False, indent=4)
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                response = {
                    'status': 'success',
                    'message': 'Deed submitted and saved directly in category folder successfully',
                    'filepath': filepath.replace(BASE_DIR, '')
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))
                print(f"📥 Saved direct PENDING deed to {filepath}")
                broadcast_event("deed_submitted", {"studentId": student_id, "deedId": deed_id})
                
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                response = {'status': 'error', 'message': str(e)}
                self.wfile.write(json.dumps(response).encode('utf-8'))
                print(f"❌ Error submitting deed: {e}")
                
        elif parsed_path.path == '/api/approve_deed':
            if not self.require_staff():
                return

            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                payload = json.loads(post_data.decode('utf-8'))
                student_id = payload.get('studentId')
                deed_id = payload.get('deedId')
                status = payload.get('status')  # 'approved' or 'rejected'
                teacher_name = payload.get('teacherName', 'อาจารย์')
                reject_reason = payload.get('rejectReason', '')
                deed_data = payload.get('deedData', {})
                
                academic_year = deed_data.get('academicYear', 2569)
                student = deed_data.get('student', {})
                class_year = student.get('class_year', 'Unknown')
                category_id = deed_data.get('categoryId', 'Unknown')
                
                # Update deed state in JSON
                deed_data['status'] = status
                deed_data['approvedBy'] = teacher_name
                deed_data['approvedAt'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
                if status == 'rejected':
                    deed_data['rejectReason'] = reject_reason
                
                # Save directly back to same path: records/AY2569/Class_69/Student_6900001/Category_1/{deed_id}.json
                target_dir = os.path.join(
                    RECORDS_DIR, 
                    f"AY{academic_year}", 
                    f"Class_{class_year}", 
                    f"Student_{student_id}",
                    f"Category_{category_id}"
                )
                
                os.makedirs(target_dir, exist_ok=True)
                filepath = os.path.join(target_dir, f"{deed_id}.json")
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(deed_data, f, ensure_ascii=False, indent=4)
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                response = {
                    'status': 'success',
                    'message': f"Deed successfully updated to {status} in place",
                    'filepath': filepath.replace(BASE_DIR, '')
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))
                print(f"❇️ Updated deed [{deed_id}] in place to {status} at {filepath}")
                broadcast_event("deed_approved", {"studentId": student_id, "deedId": deed_id, "status": status})
                
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                response = {'status': 'error', 'message': str(e)}
                self.wfile.write(json.dumps(response).encode('utf-8'))
                print(f"❌ Error updating deed: {e}")
                
        elif parsed_path.path == '/api/update_student':
            if not self.require_staff():
                return

            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                payload = json.loads(post_data.decode('utf-8'))
                student_id = payload.get('studentId')
                rank = payload.get('rank', 'นพอ.')
                first_name = payload.get('firstName', '')
                last_name = payload.get('lastName', '')
                class_year = int(payload.get('classYear', 69))
                email = payload.get('email', '')
                position = payload.get('position', 'นักเรียนพยาบาล')
                
                # Update in frontend/data/students.json
                frontend_json_path = os.path.join(BASE_DIR, 'frontend', 'data', 'students.json')
                frontend_js_path = os.path.join(BASE_DIR, 'frontend', 'data', 'students_data.js')
                root_json_path = os.path.join(BASE_DIR, 'data', 'students.json')
                root_js_path = os.path.join(BASE_DIR, 'data', 'students_data.js')
                
                students_list = []
                if os.path.exists(frontend_json_path):
                    with open(frontend_json_path, 'r', encoding='utf-8') as f:
                        students_list = json.load(f)
                
                # Find student and update
                updated = False
                for s in students_list:
                    if s.get('student_id') == student_id:
                        s['rank'] = rank
                        s['first_name'] = first_name
                        s['last_name'] = last_name
                        s['full_name'] = f"{first_name} {last_name}".strip()
                        s['class_year'] = class_year
                        s['email'] = email
                        s['position'] = position
                        if class_year == 69: s['year_level'] = 1
                        elif class_year == 68: s['year_level'] = 2
                        elif class_year == 67: s['year_level'] = 3
                        elif class_year == 66: s['year_level'] = 4
                        else: s['year_level'] = 5
                        updated = True
                        break
                        
                if not updated:
                    new_student = {
                        'student_id': student_id,
                        'rank': rank,
                        'first_name': first_name,
                        'last_name': last_name,
                        'full_name': f"{first_name} {last_name}".strip(),
                        'class_year': class_year,
                        'year_level': 1 if class_year == 69 else (2 if class_year == 68 else (3 if class_year == 67 else (4 if class_year == 66 else 5))),
                        'note': 'เพิ่มโดยอาจารย์ผ่านระบบ',
                        'password': student_id,
                        'email': email,
                        'telegram_chat_id': '',
                        'role': 'student'
                    }
                    students_list.append(new_student)
                
                # Sort
                students_list.sort(key=lambda x: (x.get('class_year', 69), x.get('student_id', '')))
                
                # Write back to frontend/data/students.json
                with open(frontend_json_path, 'w', encoding='utf-8') as f:
                    json.dump(students_list, f, ensure_ascii=False, indent=2)
                    
                # Write back to frontend/data/students_data.js
                with open(frontend_js_path, 'w', encoding='utf-8') as f:
                    f.write("// Auto-generated student data - DO NOT EDIT MANUALLY\n")
                    f.write("// Generated from: รายชื่อ นพอ.ปี69 ทุกชั้นปี\n\n")
                    f.write("const STUDENTS_DATA = ")
                    json.dump(students_list, f, ensure_ascii=False, indent=2)
                    f.write(";\n")
                    
                # Sync write to root data/ folder if paths exist
                if os.path.exists(os.path.dirname(root_json_path)):
                    with open(root_json_path, 'w', encoding='utf-8') as f:
                        json.dump(students_list, f, ensure_ascii=False, indent=2)
                    with open(root_js_path, 'w', encoding='utf-8') as f:
                        f.write("// Auto-generated student data - DO NOT EDIT MANUALLY\n")
                        f.write("const STUDENTS_DATA = ")
                        json.dump(students_list, f, ensure_ascii=False, indent=2)
                        f.write(";\n")
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                response = {
                    'status': 'success',
                    'message': 'Student updated successfully'
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))
                print(f"👤 Updated student profile for {student_id}")
                broadcast_event("student_updated", {"studentId": student_id})
                
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                response = {'status': 'error', 'message': str(e)}
                self.wfile.write(json.dumps(response).encode('utf-8'))
                print(f"❌ Error updating student: {e}")
        elif self.path == '/api/bind_line':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                payload = json.loads(post_data.decode('utf-8'))
                student_id = payload.get('studentId')
                line_user_id = payload.get('lineUserId')
                line_name = payload.get('lineDisplayName', '')
                line_pic = payload.get('linePictureUrl', '')
                
                if student_id and line_user_id:
                    for json_p in [
                        os.path.join(BASE_DIR, 'data', 'students.json'),
                        os.path.join(BASE_DIR, 'frontend', 'data', 'students.json')
                    ]:
                        if os.path.exists(json_p):
                            with open(json_p, 'r', encoding='utf-8') as f:
                                stu_list = json.load(f)
                            for s in stu_list:
                                if str(s.get('student_id')) == str(student_id):
                                    s['line_user_id'] = line_user_id
                                    s['line_display_name'] = line_name
                                    s['line_picture_url'] = line_pic
                                    break
                            with open(json_p, 'w', encoding='utf-8') as f:
                                json.dump(stu_list, f, ensure_ascii=False, indent=2)

                    # Update JS files
                    for js_p in [
                        os.path.join(BASE_DIR, 'data', 'students_data.js'),
                        os.path.join(BASE_DIR, 'frontend', 'data', 'students_data.js')
                    ]:
                        if os.path.exists(js_p):
                            with open(os.path.join(BASE_DIR, 'frontend', 'data', 'students.json'), 'r', encoding='utf-8') as f:
                                stu_list = json.load(f)
                            js_content = "// Auto-generated student data - DO NOT EDIT MANUALLY\n"
                            js_content += "const STUDENTS_DATA = " + json.dumps(stu_list, ensure_ascii=False, indent=2) + ";\n\n"
                            js_content += "if (typeof window !== 'undefined') { window.STUDENTS_DATA = STUDENTS_DATA; }\n"
                            js_content += "if (typeof globalThis !== 'undefined') { globalThis.STUDENTS_DATA = STUDENTS_DATA; }\n"
                            with open(js_p, 'w', encoding='utf-8') as f:
                                f.write(js_content)

                    print(f"🔗 Bound LINE ID ({line_user_id[:8]}... - {line_name}) to student {student_id}")
                    sync_to_google_drive_bg()

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'success'}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'error', 'message': str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

def run(server_class=ThreadingHTTPServer, handler_class=CustomHandler, port=8000):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f"🚀 Starting custom server on port {port}...")
    print(f"📂 Serving static files from {BASE_DIR}")
    print(f"📁 Saving records to {RECORDS_DIR}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()
    print("Stopping server...\n")

if __name__ == '__main__':
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    run(port=port)
