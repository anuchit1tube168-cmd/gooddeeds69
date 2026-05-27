import json
import os
import time
from http.server import SimpleHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse

# Set the base directory to the project root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')
RECORDS_DIR = os.path.join(BASE_DIR, 'records')

class CustomHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Serve files from the frontend directory by default
        super().__init__(*args, directory=BASE_DIR, **kwargs)

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
                student_id = student.get('student_id', 'Unknown')
                category_id = deed_data.get('categoryId', 'Unknown')
                deed_id = deed_data.get('id', 'Unknown')
                
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
                
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                response = {'status': 'error', 'message': str(e)}
                self.wfile.write(json.dumps(response).encode('utf-8'))
                print(f"❌ Error submitting deed: {e}")
                
        elif parsed_path.path == '/api/approve_deed':
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
                
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                response = {'status': 'error', 'message': str(e)}
                self.wfile.write(json.dumps(response).encode('utf-8'))
                print(f"❌ Error updating deed: {e}")
        else:
            self.send_response(404)
            self.end_headers()

def run(server_class=HTTPServer, handler_class=CustomHandler, port=8000):
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
    run()
