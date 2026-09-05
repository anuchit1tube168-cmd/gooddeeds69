#!/usr/bin/env python3
"""bonus_approval_skill.py

Automates the addition of a 25‑hour bonus (category 9) for eligible special‑role students
per term, starting FY 2569.

Eligibility:
  • Student is enrolled in FY 2569 (has a class_year_2569 value).
  • Student's role matches one of the allowed special‑role tokens.
  • Student passed FY 2568 (total ≥ 50 hrs) – flag `passed_2568` must be true.
  • Student has at least one hour in any of the regular categories (1‑8) for the
    current term.

If all conditions are met, 25 hrs are added to `cats[9]` (the bonus category) and the
total is updated.  The script writes a new JSON file `data_มว1_2569_with_bonus.json`
containing the enriched records and prints a concise summary.

Run examples:
  python3 bonus_approval_skill.py --term 1   # Term 1 (December)
  python3 bonus_approval_skill.py --term 2   # Term 2 (April)
"""

import argparse
import json
import pathlib
import sys
from datetime import datetime

BASE_DIR = pathlib.Path(__file__).resolve().parent
INPUT_JSON = BASE_DIR / "ความดีปีการศึกษา 2568" / "มว.1 บันทึกความดี" / "data_มว1_2568_verified.json"
OUTPUT_JSON = BASE_DIR / "ความดีปีการศึกษา 2569" / "มว.1 บันทึกความดี" / "data_มว1_2569_with_bonus.json"

ALLOWED_ROLES = {
    "น.พยาบาล",
    "น.ไอที",
    "น.IT",
    "น.ตัดต่อ",
    "น.กราฟฟิก",
    "น.แอดมิน",
    "น.สารสนเทศ",
    "นปค",
    "หัวหน้านักเรียน",
    "รองหัวหน้านักเรียน",
}

def load_data(path: pathlib.Path):
    if not path.is_file():
        sys.stderr.write(f"[ERROR] Input file not found: {path}\n")
        sys.exit(1)
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)

def save_data(data, path: pathlib.Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def role_is_allowed(raw_role: str) -> bool:
    tokens = [t.strip().lower() for t in raw_role.replace("/", ",").split(",")]
    allowed = {r.lower() for r in ALLOWED_ROLES}
    return any(tok in allowed for tok in tokens)

def has_regular_hours(student: dict) -> bool:
    cats = student.get("cats", {})
    return any(float(cats.get(str(i), 0)) > 0 for i in range(1, 9))

def apply_bonus(students, term: int):
    approved = 0
    for stu in students:
        if not stu.get("class_year_2569"):
            continue
        if not role_is_allowed(stu.get("role", "")):
            continue
        if not stu.get("passed_2568", False):
            continue
        if not has_regular_hours(stu):
            continue
        cats = stu.setdefault("cats", {})
        cats["9"] = float(cats.get("9", 0)) + 25.0
        stu["total"] = float(stu.get("total", 0)) + 25.0
        stu["bonus_added"] = True
        stu["bonus_term"] = term
        approved += 1
    return approved

def main():
    parser = argparse.ArgumentParser(description="Add 25‑hour special‑role bonus per term")
    parser.add_argument("--term", type=int, choices=[1, 2], required=True,
                        help="Term number: 1 (Dec) or 2 (Apr)")
    args = parser.parse_args()
    data = load_data(INPUT_JSON)
    students = data.get("students", [])
    approved = apply_bonus(students, args.term)
    data.update({
        "year": 2569,
        "generated": datetime.now().isoformat(),
        "term": args.term,
        "total_students": len(students),
        "bonus_approved": approved,
    })
    save_data(data, OUTPUT_JSON)
    print(f"✅ Bonus applied for term {args.term}: {approved} students updated.")
    print(f"📁 Output written to {OUTPUT_JSON}")

if __name__ == "__main__":
    main()
