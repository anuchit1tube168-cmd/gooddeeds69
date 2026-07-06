#!/usr/bin/env python3
import os
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RECORDS_DIR = os.path.join(BASE_DIR, 'records')

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

def get_category_name(cid):
    return CATEGORIES_NAME_MAP.get(int(cid), 'อื่นๆ')

def get_all_deeds():
    # Load seeded deeds
    imported_deeds = {}
    deeds_json_path = os.path.join(BASE_DIR, 'frontend', 'data', 'deeds.json')
    if os.path.exists(deeds_json_path):
        with open(deeds_json_path, 'r', encoding='utf-8') as f:
            imported_deeds = json.load(f)
            
    # Load dynamic deeds
    dynamic_deeds_by_student = {}
    if os.path.exists(RECORDS_DIR):
        for root, dirs, files in os.walk(RECORDS_DIR):
            for file in files:
                if file.endswith('.json'):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            deed = json.load(f)
                            sid = deed.get('studentId')
                            if sid:
                                if sid not in dynamic_deeds_by_student:
                                    dynamic_deeds_by_student[sid] = []
                                dynamic_deeds_by_student[sid].append(deed)
                    except Exception as e:
                        pass
                        
    # Merge
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

def main():
    students_json_path = os.path.join(BASE_DIR, 'frontend', 'data', 'students.json')
    with open(students_json_path, 'r', encoding='utf-8') as f:
        students = json.load(f)
        
    student_map = {s['student_id']: s for s in students}
    all_deeds = get_all_deeds()
    
    # Let's compile stats for AY 2568 and AY 2569
    for year in [2568, 2569]:
        print(f"\n=================== STATS FOR ACADEMIC YEAR {year} ===================")
        
        class_stats = {} # class_year -> { total_students, passed, total_hours, deeds_count }
        top_students = [] # (student_id, name, class_year, hours)
        category_hours = {cid: 0.0 for cid in CATEGORIES_NAME_MAP.keys()}
        
        total_registered_with_deeds = 0
        total_passed = 0
        total_deeds_count = 0
        total_system_hours = 0.0
        
        for s in students:
            sid = s['student_id']
            class_yr = s['class_year']
            
            if class_yr not in class_stats:
                class_stats[class_yr] = {
                    'total_students': 0,
                    'passed': 0,
                    'total_hours': 0.0,
                    'deeds_count': 0
                }
                
            class_stats[class_yr]['total_students'] += 1
            
            # Calculate hours for this year
            deeds = all_deeds.get(sid, [])
            approved_deeds = [d for d in deeds if d.get('status') == 'approved' and d.get('academicYear', 2569) == year]
            
            hours = sum(float(d.get('hours', 0.0)) for d in approved_deeds)
            deeds_count = len(approved_deeds)
            
            class_stats[class_yr]['total_hours'] += hours
            class_stats[class_yr]['deeds_count'] += deeds_count
            
            passed = hours >= 50.0
            if passed:
                class_stats[class_yr]['passed'] += 1
                total_passed += 1
                
            if hours > 0:
                total_registered_with_deeds += 1
                top_students.append((sid, s['full_name'], class_yr, hours))
                total_deeds_count += deeds_count
                total_system_hours += hours
                
                # Accrue categories
                for d in approved_deeds:
                    cat_id = int(d.get('categoryId', 0))
                    if cat_id in category_hours:
                        category_hours[cat_id] += float(d.get('hours', 0.0))
                        
        # Sort top students
        top_students.sort(key=lambda x: x[3], reverse=True)
        
        # Output summary table
        print("\n### Summary by Class Year")
        print("| Class Year | Total Students | Students with Deeds | Passed (>=50 hrs) | Pass Rate | Total Hours | Avg. Hours |")
        print("|---|---|---|---|---|---|---|")
        for cy in sorted(class_stats.keys()):
            stats = class_stats[cy]
            total_std = stats['total_students']
            pass_count = stats['passed']
            tot_hrs = stats['total_hours']
            pass_rate = (pass_count / total_std * 100) if total_std > 0 else 0
            avg_hrs = (tot_hrs / total_std) if total_std > 0 else 0
            
            # Count students in this class who actually have deeds
            std_with_deeds = sum(1 for s in students if s['class_year'] == cy and any(d.get('status') == 'approved' and d.get('academicYear', 2569) == year for d in all_deeds.get(s['student_id'], [])))
            
            print(f"| Class {cy} | {total_std} | {std_with_deeds} | {pass_count} | {pass_rate:.1f}% | {tot_hrs:.1f} | {avg_hrs:.1f} |")
            
        print(f"\n**Total Approved Hours in System:** {total_system_hours:.1f} hours")
        print(f"**Total Approved Deeds:** {total_deeds_count}")
        print(f"**Overall Pass Rate (Passed / Total Students):** {total_passed}/{len(students)} ({total_passed/len(students)*100:.1f}%)")
        
        # Output category stats
        print("\n### Hours by Category")
        print("| Category ID | Category Name | Total Hours | Percentage |")
        print("|---|---|---|---|")
        for cid, hrs in category_hours.items():
            pct = (hrs / total_system_hours * 100) if total_system_hours > 0 else 0
            print(f"| หมวด {cid} | {get_category_name(cid)} | {hrs:.1f} | {pct:.1f}% |")
            
        # Top 10 Students
        print("\n### Top 10 Students with Most Volunteer Hours")
        print("| Rank | Student ID | Name | Class Year | Total Hours |")
        print("|---|---|---|---|---|")
        for idx, (sid, name, cy, hrs) in enumerate(top_students[:10], 1):
            print(f"| {idx} | {sid} | {name} | Class {cy} | {hrs:.1f} |")

if __name__ == '__main__':
    main()
