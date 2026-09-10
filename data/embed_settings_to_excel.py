#!/usr/bin/env python3
"""
embed_settings_to_excel.py
เพิ่ม/อัปเดต Sheet "Settings" (ตั้งค่าระบบ) ลงในไฟล์ Excel ฐานข้อมูลทั้งหมด
เก็บไว้เพื่ออ้างอิงเท่านั้น: ปิดการรีเซ็ตชีตเดิมและย้าย credentials ไปยัง backend ที่ตรวจสิทธิ์แล้ว
"""
import openpyxl
import os

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(DATA_DIR)

EXCEL_FILES = [
    os.path.join(DATA_DIR, "รายชื่อ_นพอ_ปี69_2569.xlsx"),
    os.path.join(DATA_DIR, "รายชื่อ_นพอ_อัปเดตล่าสุด_2569.xlsx"),
    os.path.join(BASE_DIR, "รายชื่อ นพอ.ปี 69.xlsx"),
]

SETTINGS_DATA = [
    ["Setting_Key", "Setting_Value", "Description"],
    ["admin_username", "admin", "ชื่อผู้ใช้ Admin"],
    ["admin_name", "ผู้ดูแลระบบ (Admin)", "ชื่อแสดงของ Admin"],
    ["teacher_username", "teacher", "ชื่อผู้ใช้ Teacher (อาจารย์)"],
    ["teacher_name", "อาจารย์ผู้ควบคุม (Teacher)", "ชื่อแสดงของ Teacher"],
    ["min_hours_per_semester", "25", "เกณฑ์ชั่วโมงขั้นต่ำต่อภาคเรียน (เทอม)"],
    ["min_hours_per_year", "50", "เกณฑ์ชั่วโมงขั้นต่ำต่อปีการศึกษา"],
    ["max_hours_scale", "400", "เพดานชั่วโมงสะสมสูงสุด"],
    ["academic_year", "2569", "ปีการศึกษา"],
]

def add_or_update_settings_sheet(file_path):
    raise RuntimeError("Destructive legacy settings reset disabled; preserve settings and configure server secrets privately")
    if not os.path.exists(file_path):
        print(f"⚠️ ไม่พบไฟล์: {file_path}")
        return
    
    print(f"📄 กำลังประมวลผลไฟล์: {os.path.basename(file_path)}")
    wb = openpyxl.load_workbook(file_path)
    
    # ตรวจสอบว่ามี sheet "Settings" หรือ "ตั้งค่าระบบ" หรือไม่
    sheet_name = "Settings"
    if "ตั้งค่าระบบ" in wb.sheetnames:
        sheet_name = "ตั้งค่าระบบ"
        ws = wb["ตั้งค่าระบบ"]
    elif "Settings" in wb.sheetnames:
        ws = wb["Settings"]
    else:
        ws = wb.create_sheet(title="Settings")
    
    # เคลียร์ข้อมูลเดิมและเขียนข้อมูลการตั้งค่าใหม่
    ws.delete_rows(1, ws.max_row + 1)
    
    for row in SETTINGS_DATA:
        ws.append(row)
    
    wb.save(file_path)
    wb.close()
    print(f"✅ บันทึก Sheet '{sheet_name}' ใน {os.path.basename(file_path)} สำเร็จ!")

def main():
    for f in EXCEL_FILES:
        add_or_update_settings_sheet(f)

if __name__ == '__main__':
    main()
