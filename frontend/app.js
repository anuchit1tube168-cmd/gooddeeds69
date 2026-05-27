
// ===== OFF-CANVAS SIDEBAR =====
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('open');
    }
}
// Close sidebar when clicking a link inside it
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if (sidebar) sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('open');
        });
    });
});

/**
 * app.js - Core Application Logic
 * ระบบบันทึกความดี วิทยาลัยพยาบาลทหารอากาศ
 */

// ==================== CONFIG ====================
const CONFIG = {
    GAS_URL: '', // Google Apps Script Web App URL (ตั้งค่าหลัง deploy)
    TELEGRAM_BOT_TOKEN: '', // ตั้งค่าใน settings
    MIN_HOURS_PER_YEAR: 36, // เกณฑ์ขั้นต่ำ ชั่วโมง/ปี
    APP_VERSION: '1.1.0',
    ACADEMIC_YEAR: 2569,
};

// ==================== CATEGORIES ====================
const CATEGORIES = [
    { id: 1, name: 'บริจาคโลหิต/เกล็ดเลือด/พลาสมา', emoji: '🩸', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    { id: 2, name: 'โครงการภายนอก (คำสั่ง วพอ.)', emoji: '🌐', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    { id: 3, name: 'ช่วยเหลืองานภายใน วพอ.', emoji: '🏥', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    { id: 4, name: 'เข้าอบรมที่ วพอ. จัดให้', emoji: '📚', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
    { id: 5, name: 'ช่วยงานหน่วยงาน/ชุมชน/มูลนิธิ', emoji: '🤝', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    { id: 6, name: 'ทำนุบำรุงศาสนสถาน', emoji: '🙏', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { id: 7, name: 'งานฟรีทั่วไป', emoji: '⭐', color: '#c9a227', bg: 'rgba(201,162,39,0.1)' },
    { id: 8, name: 'กิจกรรมจงรักภักดีต่อสถาบัน', emoji: '👑', color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
    { id: 9, name: 'ชม. ที่สมควรได้รับ (บทบาทพิเศษ)', emoji: '🎖️', color: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
];

// ==================== STORAGE ====================
const Storage = {
    get(key) {
        try { return JSON.parse(localStorage.getItem('gooddeeds_' + key)); } catch { return null; }
    },
    set(key, val) {
        localStorage.setItem('gooddeeds_' + key, JSON.stringify(val));
    },
    remove(key) {
        localStorage.removeItem('gooddeeds_' + key);
    },
    clear() {
        Object.keys(localStorage).filter(k => k.startsWith('gooddeeds_')).forEach(k => localStorage.removeItem(k));
    }
};

// ==================== SEED IMPORTED DEEDS ====================
/**
 * โหลดข้อมูลความดีจาก IMPORTED_DEEDS (deeds_data.js) เข้า localStorage
 * ผสานข้อมูลใหม่เสมอเพื่อให้อัปเดตข้อมูลจากสคริปต์ได้โดยไม่ลบข้อมูลเดิม
 */
function seedImportedDeeds() {
    if (typeof IMPORTED_DEEDS === 'undefined') return; // ไม่มีไฟล์ข้อมูล

    let newCount = 0;
    for (const [studentId, deeds] of Object.entries(IMPORTED_DEEDS)) {
        let existing = Storage.get('deeds_' + studentId) || [];

        // Cleanup old random-ID imports to prevent duplicates
        existing = existing.filter(e => e.note !== 'นำเข้าจาก Main 2568.xlsx' || e.id.startsWith('import_'));

        const merged = [...existing];

        // เอาเฉพาะความดีจากไฟล์ที่ยังไม่มีใน localStorage เพิ่มเข้าไป
        deeds.forEach(d => {
            if (!existing.find(e => e.id === d.id)) {
                merged.push(d);
                newCount++;
            }
        });

        Storage.set('deeds_' + studentId, merged);
    }

    if (newCount > 0) {
        console.log(`✅ Seeded ${newCount} NEW deed records from IMPORTED_DEEDS`);
    }
}

// รัน seed ทันทีเมื่อโหลด script
seedImportedDeeds();


const TEACHERS = [
    { username: 'admin', password: 'admin69', role: 'admin', name: 'ผู้ดูแลระบบ' },
    { username: 'teacher', password: 'teacher69', role: 'teacher', name: 'อาจารย์' },
];

// ==================== APP CORE ====================
const App = {
    // ---------- AUTH ----------
    loginStudent(studentId, password) {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Find student from embedded data (strip prefix นพอ. if typed)
                const cleanId = studentId.trim().replace(/^นพอ\.?\s*/, '');
                const student = (typeof STUDENTS_DATA !== 'undefined' ? STUDENTS_DATA : [])
                    .find(s => s.student_id === cleanId);

                if (!student) {
                    resolve({ success: false, message: 'ไม่พบรหัสนักเรียนในระบบ' });
                    return;
                }

                // Check password (default = student_id, or stored password)
                const storedPwd = Storage.get('pwd_' + studentId) || student.student_id;
                if (password !== storedPwd) {
                    resolve({ success: false, message: 'รหัสผ่านไม่ถูกต้อง' });
                    return;
                }

                const session = {
                    ...student,
                    role: 'student',
                    loginAt: Date.now(),
                    token: 'local_' + Math.random().toString(36).slice(2)
                };
                Storage.set('session', session);
                resolve({ success: true, user: session });
            }, 600);
        });
    },

    loginTeacher(username, password) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const teacher = TEACHERS.find(t => t.username === username && t.password === password);
                if (!teacher) {
                    resolve({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
                    return;
                }
                const session = { ...teacher, loginAt: Date.now(), token: 'teacher_' + Math.random().toString(36).slice(2) };
                Storage.set('session', session);
                resolve({ success: true, user: session });
            }, 600);
        });
    },

    logout() {
        Storage.remove('session');
        window.location.href = 'index.html';
    },

    getCurrentUser() {
        return Storage.get('session');
    },

    requireAuth(allowedRoles = ['student', 'teacher', 'admin']) {
        const user = this.getCurrentUser();
        if (!user) { window.location.href = 'index.html'; return null; }
        if (!allowedRoles.includes(user.role)) { window.location.href = 'index.html'; return null; }
        return user;
    },

    // ---------- GOOD DEEDS DATA ----------
    getDeeds(studentId) {
        return Storage.get('deeds_' + studentId) || [];
    },

    saveDeeds(studentId, deeds) {
        Storage.set('deeds_' + studentId, deeds);
    },

    async addDeed(deed) {
        const user = this.getCurrentUser();
        const studentId = deed.studentId || user.student_id;
        const deeds = this.getDeeds(studentId);
        const newDeed = {
            id: 'deed_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            studentId,
            categoryId: deed.categoryId,
            hours: parseFloat(deed.hours),
            description: deed.description,
            activityDate: deed.activityDate,
            imageUrls: deed.imageUrls || [],
            status: 'pending', // pending | approved | rejected
            submittedAt: new Date().toISOString(),
            approvedBy: null,
            approvedAt: null,
            rejectReason: null,
            note: deed.note || '',
        };
        deeds.push(newDeed);
        this.saveDeeds(studentId, deeds);
        
        // Save to backend via API
        try {
            const payload = {
                ...newDeed,
                academicYear: 2569,
                student: user
            };
            
            await fetch('/api/submit_deed', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            console.log('✅ Sent deed to backend successfully');
        } catch (error) {
            console.error('❌ Failed to send deed to backend:', error);
        }
        
        return newDeed;
    },

    async updateDeedStatus(studentId, deedId, status, teacherName, rejectReason = '') {
        const deeds = this.getDeeds(studentId);
        const deed = deeds.find(d => d.id === deedId);
        if (!deed) return null;
        deed.status = status;
        deed.approvedBy = teacherName;
        deed.approvedAt = new Date().toISOString();
        deed.rejectReason = rejectReason;
        this.saveDeeds(studentId, deeds);
        
        // Save to backend via API
        try {
            await fetch('/api/approve_deed', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    studentId,
                    deedId,
                    status,
                    teacherName,
                    rejectReason,
                    deedData: deed
                })
            });
            console.log(`✅ Sent deed [${deedId}] status update [${status}] to backend`);
        } catch (error) {
            console.error('❌ Failed to send deed status update to backend:', error);
        }
        
        return deed;
    },

    editDeed(studentId, deedId, updates) {
        const deeds = this.getDeeds(studentId);
        const index = deeds.findIndex(d => d.id === deedId);
        if (index === -1) return false;
        deeds[index] = { ...deeds[index], ...updates };
        this.saveDeeds(studentId, deeds);
        return true;
    },

    deleteDeed(studentId, deedId) {
        let deeds = this.getDeeds(studentId);
        deeds = deeds.filter(d => d.id !== deedId);
        this.saveDeeds(studentId, deeds);
        return true;
    },

    // ---------- SUMMARY ----------
    getStudentSummary(studentId) {
        const deeds = this.getDeeds(studentId);
        const approved = deeds.filter(d => d.status === 'approved');
        const pending = deeds.filter(d => d.status === 'pending');
        const rejected = deeds.filter(d => d.status === 'rejected');

        const totalHours = approved.reduce((s, d) => s + d.hours, 0);
        const byCategory = CATEGORIES.map(cat => ({
            ...cat,
            hours: approved.filter(d => d.categoryId === cat.id).reduce((s, d) => s + d.hours, 0),
            count: approved.filter(d => d.categoryId === cat.id).length,
        }));

        return {
            totalHours,
            pendingCount: pending.length,
            rejectedCount: rejected.length,
            approvedCount: approved.length,
            totalCount: deeds.length,
            passed: totalHours >= CONFIG.MIN_HOURS_PER_YEAR,
            byCategory,
        };
    },

    // All students summary for teacher view
    getAllStudentsSummary() {
        const students = typeof STUDENTS_DATA !== 'undefined' ? STUDENTS_DATA : [];
        return students.map(s => {
            const summary = this.getStudentSummary(s.student_id);
            return { ...s, ...summary };
        });
    },

    // Pending deeds across all students
    getAllPendingDeeds() {
        const students = typeof STUDENTS_DATA !== 'undefined' ? STUDENTS_DATA : [];
        const pending = [];
        students.forEach(s => {
            const deeds = this.getDeeds(s.student_id);
            deeds.filter(d => d.status === 'pending').forEach(d => {
                pending.push({ ...d, student: s });
            });
        });
        return pending.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    },

    // ---------- PROFILE ----------
    updateProfile(updates) {
        const user = this.getCurrentUser();
        if (!user) return;
        const merged = { ...user, ...updates };
        Storage.set('session', merged);
        // Save email/telegram per student
        const profile = Storage.get('profile_' + user.student_id) || {};
        Storage.set('profile_' + user.student_id, { ...profile, ...updates });
    },

    getProfile(studentId) {
        return Storage.get('profile_' + studentId) || {};
    },

    // ---------- SETTINGS ----------
    getSettings() {
        return Storage.get('settings') || { telegramToken: '', minHours: CONFIG.MIN_HOURS_PER_YEAR };
    },
    saveSettings(s) { Storage.set('settings', s); },

    // ---------- TELEGRAM NOTIFY ----------
    async sendTelegram(chatId, message) {
        const settings = this.getSettings();
        const token = settings.telegramToken || CONFIG.TELEGRAM_BOT_TOKEN;
        if (!token || !chatId) return false;
        try {
            const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
            });
            return res.ok;
        } catch { return false; }
    },

    // ---------- LINE NOTIFY ----------
    async sendLineNotify(message) {
        const settings = this.getSettings();
        const token = settings.lineNotifyToken;
        if (!token) return false;
        try {
            const res = await fetch('https://notify-api.line.me/api/notify', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `message=${encodeURIComponent(message)}`
            });
            return res.ok;
        } catch { return false; }
    },

    // ---------- NOTIFY ALL CHANNELS ----------
    async notifyAdmins(deed, student) {
        const settings = this.getSettings();
        const cat = this.getCategoryById(deed.categoryId);
        const yearName = this.getYearName(student.class_year);

        // Build message
        const msgLines = [
            `🔔 แจ้งเตือนกิจกรรมใหม่`,
            `━━━━━━━━━━━━━━━`,
            `ชื่อ-สกุล : ${student.rank} ${student.first_name} ${student.last_name}`,
            `รหัส นพอ. : ${student.student_id}`,
            `กิจกรรม : ${cat.emoji} ${cat.name}`,
            `ปีการศึกษา ${settings.academicYear || 2569}`,
            `⏱ ชั่วโมง : ${deed.hours} ชม.`,
            `📅 วันที่ : ${deed.activityDate}`,
            `📝 ${deed.description}`,
            `━━━━━━━━━━━━━━━`,
            `สถานะ : ⏳ รออนุมัติ`,
        ];
        const plainMsg = msgLines.join('\n');

        const htmlMsg = [
            `📌 <b>บันทึกความดีใหม่</b>`,
            `━━━━━━━━━━━━━━━`,
            `👤 <b>${student.rank} ${student.first_name} ${student.last_name}</b>`,
            `🎫 รหัส: ${student.student_id} | ${yearName}`,
            `📂 ${cat.emoji} ${cat.name}`,
            `⏱ <b>${deed.hours} ชม.</b> | 📅 ${deed.activityDate}`,
            `📝 ${deed.description}`,
            `━━━━━━━━━━━━━━━`,
            `⏳ <i>รออนุมัติจากอาจารย์</i>`,
        ].join('\n');

        const results = [];

        // Telegram
        if (settings.telegramToken && settings.adminChatId) {
            results.push(await this.sendTelegram(settings.adminChatId, htmlMsg));
        }

        // LINE Notify
        if (settings.lineNotifyToken) {
            results.push(await this.sendLineNotify(plainMsg));
        }

        return results.some(r => r);
    },

    // ---------- UTILS ----------
    formatDate(iso) {
        if (!iso) return '-';
        const d = new Date(iso);
        return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
    },

    formatHours(h) {
        return `${h} ชม.`;
    },

    getCategoryById(id) {
        return CATEGORIES.find(c => c.id === parseInt(id)) || { name: 'อื่นๆ', emoji: '📌', color: '#6b7280', bg: '#374151' };
    },

    getYearName(classYear) {
        const yearMap = {
            69: 'ชั้นปีที่ 1 (รุ่น 69)',
            68: 'ชั้นปีที่ 2 (รุ่น 68)',
            67: 'ชั้นปีที่ 3 (รุ่น 67)',
            66: 'ชั้นปีที่ 4 (รุ่น 66)',
            65: 'ศิษย์เก่า (รุ่น 65)',
        };
        if (yearMap[classYear]) return yearMap[classYear];
        if (classYear <= 64) return `ศิษย์เก่า (รุ่น ${classYear})`;
        return `รุ่น ${classYear}`;
    },



    // ดึงรูปโปรไฟล์นักเรียน: localStorage ก่อน, ถ้าไม่มีใช้ STUDENT_PHOTOS
    getProfilePhoto(studentId) {
        const local = Storage.get('photo_' + studentId);
        if (local) return local;
        if (typeof STUDENT_PHOTOS !== 'undefined' && STUDENT_PHOTOS[studentId]) {
            return STUDENT_PHOTOS[studentId];
        }
        return null;
    },

    saveProfilePhoto(studentId, base64) {
        Storage.set('photo_' + studentId, base64);
    },

    showToast(msg, type = 'success') {
        showToast(msg, type);
    },

    // ---------- IMAGE HANDLING ----------
    imageToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    saveImage(base64, key) {
        Storage.set('img_' + key, base64);
        return 'img_' + key;
    },

    getImage(key) {
        return Storage.get(key);
    },
};

// ==================== TOAST GLOBAL ====================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(50px)'; setTimeout(() => toast.remove(), 300); }, 3500);
}

// ==================== PRINT REPORT ====================
function printStudentReport(studentId) {
    const students = typeof STUDENTS_DATA !== 'undefined' ? STUDENTS_DATA : [];
    const student = students.find(s => s.student_id === studentId);
    if (!student) return;

    const summary = App.getStudentSummary(studentId);
    const deeds = App.getDeeds(studentId).filter(d => d.status === 'approved');

    const rows = deeds.map(d => {
        const cat = App.getCategoryById(d.categoryId);
        return `<tr>
      <td>${cat.emoji} ${cat.name}</td>
      <td>${d.description || '-'}</td>
      <td style="text-align:center">${d.hours}</td>
      <td>${App.formatDate(d.activityDate)}</td>
      <td>${App.formatDate(d.approvedAt)}</td>
    </tr>`;
    }).join('');

    const catRows = summary.byCategory.filter(c => c.hours > 0).map(c =>
        `<tr><td>${c.emoji} ${c.name}</td><td style="text-align:center; font-weight:bold">${c.hours} ชม.</td></tr>`
    ).join('');

    const win = window.open('', '_blank');
    win.document.write(`
<!DOCTYPE html><html lang="th"><head>
<meta charset="UTF-8">
<title>บันทึกความดี - ${student.first_name} ${student.last_name}</title>
<style>
  body { font-family: 'Sarabun', sans-serif; color: #1a1a1a; margin: 0; }
  @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap');
  .page { max-width: 800px; margin: 0 auto; padding: 32px; }
  .header { text-align:center; border-bottom: 3px solid #c9a227; padding-bottom: 20px; margin-bottom: 24px; }
  .header h1 { font-size:1.4rem; color:#0a1628; margin:0; }
  .header h2 { font-size:1rem; color:#5a6272; margin:4px 0 0; font-weight:400; }
  .meta { display:flex; gap:24px; margin-bottom:24px; }
  .meta-item { flex:1; background:#f8f9fa; padding:12px 16px; border-radius:8px; }
  .meta-label { font-size:0.75rem; color:#666; }
  .meta-value { font-size:1.1rem; font-weight:700; color:#0a1628; }
  .status-pass { color:#16a34a; }
  .status-fail { color:#dc2626; }
  table { width:100%; border-collapse:collapse; margin-bottom:24px; font-size:0.875rem; }
  th { background:#0a1628; color:#f0f4ff; padding:10px 12px; text-align:left; }
  td { border-bottom:1px solid #e5e7eb; padding:9px 12px; }
  tr:nth-child(even) { background:#f9fafb; }
  .section-title { font-size:1rem; font-weight:700; color:#0a1628; margin:20px 0 10px; border-left:4px solid #c9a227; padding-left:10px; }
  .footer { margin-top:40px; display:flex; justify-content:space-between; font-size:0.8rem; color:#666; }
  .sign-box { text-align:center; }
  .sign-line { border-top:1px solid #333; width:200px; margin:40px auto 4px; }
  @media print { body { margin:0; } .page { padding:16px; } }
</style>
</head><body><div class="page">
  <div class="header">
    <h1>บันทึกชั่วโมงความดีจิตอาสา</h1>
    <h2>วิทยาลัยพยาบาลทหารอากาศ กรมแพทย์ทหารอากาศ ปีการศึกษา ${CONFIG.ACADEMIC_YEAR}</h2>
  </div>
  <div class="meta">
    <div class="meta-item"><div class="meta-label">รหัสนักเรียน</div><div class="meta-value">${student.student_id}</div></div>
    <div class="meta-item"><div class="meta-label">ชื่อ-สกุล</div><div class="meta-value">${student.rank} ${student.first_name} ${student.last_name}</div></div>
    <div class="meta-item"><div class="meta-label">ชั้นปี</div><div class="meta-value">${App.getYearName(student.class_year)}</div></div>
    <div class="meta-item"><div class="meta-label">รวมชั่วโมง</div><div class="meta-value ${summary.passed ? 'status-pass' : 'status-fail'}">${summary.totalHours} ชม. ${summary.passed ? '✓ ผ่าน' : '✗ ไม่ผ่าน'}</div></div>
  </div>
  <div class="section-title">สรุปตามหมวดหมู่</div>
  <table><thead><tr><th>หมวดหมู่</th><th style="text-align:center">ชั่วโมง</th></tr></thead><tbody>${catRows}</tbody></table>
  <div class="section-title">รายการความดีที่ได้รับอนุมัติ (${deeds.length} รายการ)</div>
  <table><thead><tr><th>หมวดหมู่</th><th>กิจกรรม</th><th style="text-align:center">ชม.</th><th>วันที่ทำ</th><th>อนุมัติเมื่อ</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="footer">
    <div>พิมพ์วันที่: ${new Date().toLocaleDateString('th-TH')}</div>
    <div class="sign-box"><div class="sign-line"></div>ผู้อำนวยการ / ผู้อนุมัติ</div>
  </div>
</div>
<script>window.print();</script>
</body></html>`);
    win.document.close();
}

// ========== EXPORT ============
if (typeof module !== 'undefined') module.exports = { App, CATEGORIES, CONFIG };
