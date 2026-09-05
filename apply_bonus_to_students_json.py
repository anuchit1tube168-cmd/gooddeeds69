#!/usr/bin/env python3
"""apply_bonus_to_students_json.py

Merge the 25‑hour bonus (category 9) from the generated FY‑2569 JSON into the
frontend `students.json` used by the web app.

The script:
  1. Loads the original `frontend/data/students.json`.
  2. Loads the bonus file `ความดีปีการศึกษา 2569/มว.1 บันทึกความดี/data_มว1_2569_with_bonus.json`.
  3. For each student present in both files (matched by `student_id` ↔ `id`),
     adds the bonus hours to the existing `cats["9"]` (creating it if missing) and
     updates the `total` field.
  4. Writes the merged data back to `frontend/data/students.json`.

This respects the project rule *"never edit students_data.js by hand"* – we only
modify the source JSON, then later run the export script to regenerate the JS.
"""

import json
import pathlib
import sys
from datetime import datetime

# ---------------------------------------------------------------------------
# Paths (adjust if project layout changes)
# ---------------------------------------------------------------------------
BASE_DIR = pathlib.Path(__file__).resolve().parent
STUDENTS_JSON = BASE_DIR / "frontend" / "data" / "students.json"
BONUS_JSON = BASE_DIR / "ความดีปีการศึกษา 2569" / "มว.1 บันทึกความดี" / "data_มว1_2569_with_bonus.json"

def load(path: pathlib.Path):
    if not path.is_file():
        sys.stderr.write(f"[ERROR] File not found: {path}\n")
        sys.exit(1)
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)

def save(data, path: pathlib.Path):
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def main():
    students = load(STUDENTS_JSON)
    bonus_data = load(BONUS_JSON)
    bonus_students = {stu["id"]: stu for stu in bonus_data.get("students", [])}

    updated = 0
    for stu in students:
        sid = stu.get("student_id")
        if sid in bonus_students:
            bstu = bonus_students[sid]
            cats = stu.setdefault("cats", {})
            bonus_hours = bstu.get("cats", {}).get("9", 0)
            if bonus_hours:
                prev = float(cats.get("9", 0))
                cats["9"] = prev + float(bonus_hours)
                stu["total"] = float(stu.get("total", 0)) + float(bonus_hours)
                updated += 1
    print(f"✅ Updated {updated} student records with bonus hours.")
    save(students, STUDENTS_JSON)
    audit_path = BASE_DIR / "bonus_merge_audit.txt"
    with audit_path.open("w", encoding="utf-8") as f:
        f.write(f"Merged at {datetime.now().isoformat()}, {updated} records updated.\n")

if __name__ == "__main__":
    main()
