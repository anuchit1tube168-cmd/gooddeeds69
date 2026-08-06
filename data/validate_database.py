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
    deeds_paths = [
        os.path.join(BASE_DIR, 'data', 'deeds.json'),
        os.path.join(BASE_DIR, 'frontend', 'data', 'deeds.json')
    ]
    
    for deeds_json_path in deeds_paths:
        if os.path.exists(deeds_json_path):
            try:
                with open(deeds_json_path, 'r', encoding='utf-8') as f:
                    deeds = json.load(f)
                
                error_count = 0
                deed_list = []
                if isinstance(deeds, list):
                    deed_list = deeds
                elif isinstance(deeds, dict):
                    for sid, s_deeds in deeds.items():
                        if isinstance(s_deeds, list):
                            deed_list.extend(s_deeds)

                for deed in deed_list:
                    err = validate_deed(deed, f"deeds.json")
                    if err:
                        print(f"❌ {err}")
                        error_count += 1
                        if error_count > 10: break
                
                if error_count == 0:
                    print(f"✅ {os.path.basename(deeds_json_path)} is 100% valid ({len(deed_list)} deeds)!")
                else:
                    print(f"❌ {os.path.basename(deeds_json_path)} has {error_count} errors")
            except Exception as e:
                print(f"❌ Failed to parse {deeds_json_path}: {e}")

    # 2. Validate records/ directory
    if os.path.exists(RECORDS_DIR):
        print("\nValidating records/ directory...")
        records_count = 0
        records_errors = 0
        for root, dirs, files in os.walk(RECORDS_DIR):
            for file in files:
                if file == 'info.json':
                    records_count += 1
                    try:
                        with open(os.path.join(root, file), 'r', encoding='utf-8') as f:
                            d_info = json.load(f)
                        err = validate_deed(d_info, os.path.join(root, file))
                        if err:
                            records_errors += 1
                    except Exception as e:
                        records_errors += 1
        print(f"Validated {records_count} info.json records in records/. Errors found: {records_errors}")

if __name__ == '__main__':
    main()
