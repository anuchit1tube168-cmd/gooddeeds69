#!/usr/bin/env python3
import urllib.request
import threading
import time
import json

BASE_URL = "http://localhost:3000"

def listen_sse(client_id):
    url = f"{BASE_URL}/api/events"
    try:
        req = urllib.request.Request(url, headers={'Accept': 'text/event-stream'})
        # We set a timeout so the thread eventually terminates
        with urllib.request.urlopen(req, timeout=5) as resp:
            print(f"🟢 Client {client_id} connected successfully!")
            
            # Read response
            for _ in range(3):
                line = resp.readline().decode('utf-8').strip()
                if line:
                    print(f"💬 Client {client_id} received: {line}")
    except Exception as e:
        print(f"❌ Client {client_id} failed: {e}")

def simulate_trigger():
    # Submit a deed to trigger broadcasts
    time.sleep(1.5)
    print("\n⚡ Triggering a live broadcast by submitting a new deed...")
    
    deed_id = f"deed_scale_test_{int(time.time())}"
    submit_payload = {
        "id": deed_id,
        "studentId": "6900001",
        "categoryId": 2,
        "academicYear": 2569,
        "hours": 1.0,
        "description": "กิจกรรมสเกลลิ่งสำหรับการทดสอบแบบ Real-time",
        "activityDate": "2026-06-14",
        "imageUrls": [],
        "status": "pending",
        "submittedAt": "2026-06-14T10:00:00.000Z",
        "student": {
            "student_id": "6900001",
            "class_year": 69,
            "first_name": "กิตติภพ",
            "last_name": "ทองดี",
            "rank": "นพอ.",
            "role": "student"
        }
    }
    
    req = urllib.request.Request(
        f"{BASE_URL}/api/submit_deed",
        data=json.dumps(submit_payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    try:
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode('utf-8'))
            print(f"✅ Deed submission response: {res['status']}\n")
    except Exception as e:
        print(f"❌ Failed to submit deed in trigger thread: {e}\n")

def main():
    print("=== STARTING CONCURRENCY & SSE MULTI-USER REAL-TIME TEST ===")
    
    # Spawn 10 concurrent threads listening to the SSE channel
    threads = []
    for i in range(1, 11):
        t = threading.Thread(target=listen_sse, args=(i,))
        threads.append(t)
        t.start()
        time.sleep(0.1)
        
    # Spawn a trigger thread
    trigger_thread = threading.Thread(target=simulate_trigger)
    trigger_thread.start()
    
    # Wait for all threads to finish
    for t in threads:
        t.join()
    trigger_thread.join()
    
    print("\n=== CONCURRENCY VERIFICATION COMPLETED ===")

if __name__ == '__main__':
    main()
