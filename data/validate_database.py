#!/usr/bin/env python3
import os
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RECORDS_DIR = os.path.join(BASE_DIR, 'records')

def validate_deed(deed, source_info):
    if not isinstance(deed, dict):
        return f"Deed is not a dictionary: {deed}"
    
    required_keys = ['id', 'status', 'hours']
    for k in required_keys:
        if k not in deed:
            return f"Missing key '{k}' in {deed.get('id', 'unknown_id')} ({source_info})"
            
    # Check status value
    status = deed.get('status')
    if status not in ['pending', 'approved', 'rejected']:
        return f"Invalid status '{status}' in deed {deed.get('id')} ({source_info})"
        
    # Check hours
    hours = deed.get('hours')
    try:
        float(hours)
    except (ValueError, TypeError):
        return f"Invalid hours value '{hours}' in deed {deed.get('id')} ({source_info})"
        
    return None

def main():
    print("=== VALIDATING DATABASE FILES ===")
    
    # 1. Validate deeds.json
    deeds_json_path = os.path.join(BASE_DIR, 'frontend', 'data', 'deeds.json')
    if os.path.exists(deeds_json_path):
        try:
            with open(deeds_json_path, 'r', encoding='utf-8') as f:
                deeds = json.load(f)
            if not isinstance(deeds, dict):
                print("❌ deeds.json root is not a dictionary/map!")
                return
            
            error_count = 0
            for student_id, student_deeds in deeds.items():
                if not isinstance(student_deeds, list):
                    print(f"❌ Student {student_id} deeds is not a list in deeds.json")
                    error_count += 1
                    continue
                for deed in student_deeds:
                    err = validate_deed(deed, f"deeds.json / student {student_id}")
                    if err:
                        print(f"❌ {err}")
                        error_count += 1
            if error_count == 0:
                print("✅ deeds.json is 100% valid!")
            else:
                print(f"❌ deeds.json has {error_count} errors")
        except Exception as e:
            print(f"❌ Failed to parse deeds.json: {e}")
            
    # 2. Validate records/ directory
    if os.path.exists(RECORDS_DIR):
        print("\nValidating records/ directory...")
        record_errors = 0
        record_count = 0
        for root, dirs, files in os.walk(RECORDS_DIR):
            for file in files:
                if file.endswith('.json'):
                    filepath = os.path.join(root, file)
                    record_count += 1
                    try:
                        with open(filepath, 'r', encoding='utf-8') as f:
                            deed = json.load(f)
                        err = validate_deed(deed, f"file: {file}")
                        if err:
                            print(f"❌ {err} at path {filepath}")
                            record_errors += 1
                    except Exception as e:
                        print(f"❌ Failed to parse file {filepath}: {e}")
                        record_errors += 1
        print(f"Validated {record_count} files in records/. Errors found: {record_errors}")

if __name__ == '__main__':
    main()
