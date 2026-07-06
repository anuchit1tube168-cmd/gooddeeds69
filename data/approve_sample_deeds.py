#!/usr/bin/env python3
import os
import json
import time

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RECORDS_DIR = os.path.join(BASE_DIR, 'records')

def main():
    print("Approving the 10 pending deeds...")
    
    count = 0
    # Walk through the RECORDS_DIR to find all deed_pending_69_*.json files
    for root, dirs, files in os.walk(RECORDS_DIR):
        for file in files:
            if file.startswith("deed_pending_69_") and file.endswith(".json"):
                filepath = os.path.join(root, file)
                
                with open(filepath, 'r', encoding='utf-8') as f:
                    deed = json.load(f)
                
                # Update to approved state
                deed["status"] = "approved"
                deed["approvedBy"] = "อาจารย์พรนภา"
                deed["approvedAt"] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(deed, f, ensure_ascii=False, indent=4)
                
                print(f"Approved deed: {deed['id']} for student {deed['studentId']}")
                count += 1
                
    print(f"\nSuccessfully approved {count} deeds.")

if __name__ == '__main__':
    main()
