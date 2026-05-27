import os
import glob
import re

frontend_dir = "/Users/agislamious/งานบันทึกความดี 69/ระบบบันทึกความดี/frontend"

# Update student sidebar files
student_files = ["student-dashboard.html", "submit-deed.html", "history.html", "profile.html"]
for file in student_files:
    filepath = os.path.join(frontend_dir, file)
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            content = f.read()
        
        # Check if ranking.html already exists
        if "ranking.html" not in content:
            # Replace after history.html
            replacement = r'<a href="history.html" class="sidebar-item\1"><span class="icon">📋</span> ประวัติความดี</a>\n            <a href="ranking.html" class="sidebar-item"><span class="icon">🏆</span> จัดอันดับ & สถิติ</a>'
            
            content = re.sub(r'<a href="history.html" class="sidebar-item([^>]*)"><span class="icon">📋</span> ประวัติความดี</a>', replacement, content)
            
            with open(filepath, "w") as f:
                f.write(content)

# Update teacher sidebar files
teacher_files = ["teacher-dashboard.html", "settings.html"]
for file in teacher_files:
    filepath = os.path.join(frontend_dir, file)
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            content = f.read()
            
        if "ranking.html" not in content:
            if "sb-stats" in content:
                content = re.sub(
                    r'(<a href="#" class="sidebar-item" id="sb-stats" onclick="switchTab\(\'stats\',this\)">\s*<span class="icon">📊</span> สถิติภาพรวม\s*</a>)',
                    r'\1\n      <a href="ranking.html" class="sidebar-item"><span class="icon">🏆</span> จัดอันดับ & สถิติ</a>',
                    content
                )
            elif "nav-settings" in content:
                content = content.replace(
                    '<a href="settings.html" class="sidebar-item active" id="nav-settings"><span class="icon">⚙️</span> ตั้งค่าระบบ</a>',
                    '<a href="ranking.html" class="sidebar-item"><span class="icon">🏆</span> จัดอันดับ & สถิติ</a>\n      <a href="settings.html" class="sidebar-item active" id="nav-settings"><span class="icon">⚙️</span> ตั้งค่าระบบ</a>'
                )
            with open(filepath, "w") as f:
                f.write(content)

print("Done adding links")
