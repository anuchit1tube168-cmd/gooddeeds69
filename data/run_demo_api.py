#!/usr/bin/env python3
import urllib.request
import json
import time

BASE_URL = "http://localhost:3000"

def make_post_request(url, payload):
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode('utf-8'))

def make_get_request(url):
    with urllib.request.urlopen(url) as response:
        return json.loads(response.read().decode('utf-8'))

def main():
    print("=== DEMONSTRATING DEED SUBMISSION AND APPROVAL VIA API ===")
    
    deed_id = f"deed_demo_{int(time.time())}"
    
    student_data = {
        "student_id": "6900003",
        "class_year": 69,
        "first_name": "วรเมธ",
        "last_name": "รักสงบ",
        "rank": "นพอ.",
        "role": "student"
    }
    
    submit_payload = {
        "id": deed_id,
        "studentId": "6900003",
        "categoryId": 1,
        "academicYear": 2569,
        "hours": 5.0,
        "description": "บริจาคโลหิตทดสอบการอนุมัติผ่านระบบ API สด",
        "activityDate": "2026-06-14",
        "imageUrls": [],
        "status": "pending",
        "submittedAt": "2026-06-14T10:00:00.000Z",
        "student": student_data
    }
    
    # 1. Submit Deed
    print(f"\n[STEP 1] Submitting a pending deed for student 6900003...")
    print(f"Request Payload:\n{json.dumps(submit_payload, ensure_ascii=False, indent=2)}")
    
    try:
        submit_res = make_post_request(f"{BASE_URL}/api/submit_deed", submit_payload)
        print(f"Response:\n{json.dumps(submit_res, ensure_ascii=False, indent=2)}")
    except Exception as e:
        print(f"❌ Submission Failed: {e}")
        return
        
    # Wait half a second
    time.sleep(0.5)
    
    # 2. Approve Deed
    approve_payload = {
        "studentId": "6900003",
        "deedId": deed_id,
        "status": "approved",
        "teacherName": "อาจารย์จริยธรรม วพอ.",
        "deedData": submit_payload
    }
    print(f"\n[STEP 2] Approving the submitted deed {deed_id}...")
    print(f"Request Payload:\n{json.dumps(approve_payload, ensure_ascii=False, indent=2)}")
    
    try:
        approve_res = make_post_request(f"{BASE_URL}/api/approve_deed", approve_payload)
        print(f"Response:\n{json.dumps(approve_res, ensure_ascii=False, indent=2)}")
    except Exception as e:
        print(f"❌ Approval Failed: {e}")
        return
        
    time.sleep(0.5)
    
    # 3. Verify
    print(f"\n[STEP 3] Verifying the deed state by fetching deeds for student 6900003...")
    try:
        verify_res = make_get_request(f"{BASE_URL}/api/get_deeds?studentId=6900003")
        demo_deed = next((d for d in verify_res if d['id'] == deed_id), None)
        if demo_deed:
            print(f"Found saved deed in database:\n{json.dumps(demo_deed, ensure_ascii=False, indent=2)}")
            print("\n🎉 DEMO COMPLETED SUCCESSFULLY!")
        else:
            print("❌ Deed not found in the verified list.")
    except Exception as e:
        print(f"❌ Verification Failed: {e}")

if __name__ == '__main__':
    main()
