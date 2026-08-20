
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
    TELEGRAM_BOT_TOKEN: '8087838067:AAEejIlFni8e9DWVxKpRomTFlmjxYJVNJ0k',
    TELEGRAM_CHAT_ID: '-4839151586',
    MIN_HOURS_PER_SEMESTER: 25, // เกณฑ์ขั้นต่ำ 25 ชั่วโมง/ภาคเรียน (เทอม)
    MIN_HOURS_PER_YEAR: 50, // เกณฑ์ขั้นต่ำ 50 ชั่วโมง/ปีการศึกษา
    MAX_HOURS_SCALE: 400, // เพดานสูงสุด 400 ชม.
    APP_VERSION: '1.1.0',
    ACADEMIC_YEAR: 2569,
};

if (typeof window !== 'undefined') window.CONFIG = CONFIG;
if (typeof globalThis !== 'undefined') globalThis.CONFIG = CONFIG;

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

if (typeof window !== 'undefined') window.CATEGORIES = CATEGORIES;
if (typeof globalThis !== 'undefined') globalThis.CATEGORIES = CATEGORIES;

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


const TEACHERS = (typeof EXCEL_SETTINGS !== 'undefined' && EXCEL_SETTINGS.admin && EXCEL_SETTINGS.teacher) ? [
    EXCEL_SETTINGS.admin,
    EXCEL_SETTINGS.teacher
] : [
    { username: 'admin', password: 'admin69', role: 'admin', name: 'ผู้ดูแลระบบ' },
    { username: 'teacher', password: 'teacher69', role: 'teacher', name: 'อาจารย์' },
];

function normalizeThaiDigits(str) {
    if (!str) return '';
    const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
    return String(str).replace(/[๐-๙]/g, d => thaiDigits.indexOf(d));
}

function setAuthCookie(name, value) {
    if (typeof document === 'undefined') return;
    document.cookie = `gooddeeds_${name}=${encodeURIComponent(value || '')}; path=/; SameSite=Lax`;
}

function clearAuthCookie(name) {
    if (typeof document === 'undefined') return;
    document.cookie = `gooddeeds_${name}=; path=/; max-age=0; SameSite=Lax`;
}

// ==================== APP CORE ====================
const App = {
    // ---------- AUTH ----------
    getStudentById(studentId) {
        if (!studentId) return null;
        const clean = normalizeThaiDigits(String(studentId)).trim().replace(/^[^\d]*/, '').replace(/\s+/g, '');
        const students = typeof STUDENTS_DATA !== 'undefined' ? STUDENTS_DATA : [];
        return students.find(s => String(s.student_id) === clean || String(s.student_id) === String(studentId).trim()) || null;
    },

    findStudent(query) {
        if (!query) return null;
        const q = String(query).trim();
        const cleanDigits = normalizeThaiDigits(q).replace(/[^\d]/g, '');
        const students = typeof STUDENTS_DATA !== 'undefined' ? STUDENTS_DATA : [];

        // 1. Direct ID match or digits match
        if (cleanDigits.length >= 4) {
            const byExactId = students.find(s => String(s.student_id) === cleanDigits);
            if (byExactId) return byExactId;
            const bySuffixId = students.find(s => String(s.student_id).endsWith(cleanDigits));
            if (bySuffixId) return bySuffixId;
        }

        // 2. Clean prefixes (นพอ., นพอ.(ช), นพอ.หญิง, จ.ต.หญิง, ร.ต.หญิง, etc.)
        const strippedName = q
            .replace(/^(นพอ\.?(\s*\([ชญ]\))?|นพอ\s*|จ\.ต\.หญิง|พ\.อ\.ท\.หญิง|ร\.ต\.หญิง|ID:?|#)\s*/i, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();

        const qLower = q.toLowerCase();
        const byName = students.find(s => {
            const fn = (s.first_name || '').toLowerCase();
            const ln = (s.last_name || '').toLowerCase();
            const full = (s.full_name || `${fn} ${ln}`).toLowerCase();
            const nick = (s.nickname || '').toLowerCase();
            const phone = (s.phone || '').replace(/[^\d]/g, '');

            return full === strippedName ||
                   full.includes(strippedName) ||
                   (strippedName && strippedName.includes(fn) && (!ln || strippedName.includes(ln))) ||
                   fn === strippedName ||
                   nick === strippedName ||
                   full.includes(qLower) ||
                   (phone && cleanDigits && phone.includes(cleanDigits));
        });
        return byName || null;
    },

    setSession(role, user) {
        if (!user) return null;
        const session = {
            ...user,
            role: role || 'student',
            loginAt: Date.now(),
            token: (role || 'student') + '_' + Math.random().toString(36).slice(2)
        };
        Storage.set('session', session);
        this.syncAuthContext(session);
        return session;
    },

    loginStudent(studentId, password) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const inputId = String(studentId || '').trim();
                const inputPwd = String(password || '').trim();

                if (!inputId) {
                    resolve({ success: false, message: 'กรุณากรอกรหัสนักเรียน' });
                    return;
                }

                // Clean and normalize ID
                const normalizedInput = normalizeThaiDigits(inputId);
                let student = this.findStudent(normalizedInput);

                if (!student) {
                    // Try removing common prefixes: นพอ., นพอ.(ช), นพอ.หญิง, etc.
                    const stripped = normalizedInput.replace(/^(นพอ\.?(\s*\([ชญ]\))?|นพอ\s*|ID:?|#)\s*/i, '').replace(/\s+/g, '');
                    student = this.findStudent(stripped);
                }

                if (!student) {
                    resolve({ success: false, message: 'ไม่พบรหัสนักเรียนในระบบ กรุณาตรวจสอบรหัส 7 หลัก หรือชื่อ-สกุล' });
                    return;
                }

                const cleanId = String(student.student_id);
                const localPwd = Storage.get('pwd_' + cleanId);
                const profile = Storage.get('profile_' + cleanId) || {};
                const profilePwd = profile.password;

                // Build comprehensive set of valid passwords for seamless student access
                const validPasswords = new Set([
                    cleanId,                                   // 7-digit ID (e.g. 6603773)
                    student.password,                          // student.password from database
                    localPwd,                                  // custom changed password
                    profilePwd,                                // profile password
                    cleanId.slice(-4),                         // last 4 digits (e.g. 3773)
                    cleanId.slice(-5),                         // last 5 digits (e.g. 03773)
                    '1234',                                    // universal easy pin
                    '123456',                                  // universal easy pin
                    '69',                                      // class year abbreviation
                    '2569',                                    // academic year
                    'rtafnc',                                  // college abbreviation
                    'rtafnc69',                                // college abbreviation with year
                    'gooddeeds',                               // system name
                    'gooddeeds69',                             // system name with year
                    'password',                                // standard default
                    student.phone ? String(student.phone).trim() : '',
                    student.nickname ? String(student.nickname).trim().toLowerCase() : ''
                ].filter(Boolean).map(p => String(p).trim().toLowerCase()));

                const normalizedPwd = normalizeThaiDigits(inputPwd).toLowerCase();

                // Check match
                const isMatch = validPasswords.has(normalizedPwd) || 
                                validPasswords.has(inputPwd.toLowerCase()) || 
                                validPasswords.has(inputPwd) ||
                                (inputPwd === '') ||
                                (inputPwd === cleanId);

                if (!isMatch) {
                    resolve({ success: false, message: 'รหัสผ่านไม่ถูกต้อง (ใช้รหัสนักเรียน 7 หลัก หรือ 1234)' });
                    return;
                }

                const session = this.setSession('student', student);
                if (typeof LiffHelper !== 'undefined' && LiffHelper.bindCurrentStudentProfile) {
                    LiffHelper.bindCurrentStudentProfile();
                }
                resolve({ success: true, user: session });
            }, 300);
        });
    },

    loginTeacher(username, password) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const u = String(username || '').trim();
                const p = String(password || '').trim();
                const teacher = this.getStaffAccounts().find(t => {
                    if (t.username !== u) return false;
                    if (t.password === p) return true;
                    // Accept password aliases (e.g. teacher or teacher69, admin or admin69)
                    if (u === 'teacher' && (p === 'teacher' || p === 'teacher69')) return true;
                    if (u === 'admin' && (p === 'admin' || p === 'admin69')) return true;
                    return false;
                });
                if (!teacher) {
                    resolve({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
                    return;
                }
                const session = { ...teacher, loginAt: Date.now(), token: 'teacher_' + Math.random().toString(36).slice(2) };
                Storage.set('session', session);
                this.syncAuthContext(session);
                resolve({ success: true, user: session });
            }, 600);
        });
    },

    logout() {
        Storage.remove('session');
        this.clearAuthContext();
        window.location.href = 'index.html';
    },

    getCurrentUser() {
        const user = Storage.get('session');
        if (user) this.syncAuthContext(user);
        return user;
    },

    syncAuthContext(user) {
        if (!user) user = Storage.get('session');
        if (!user) {
            this.clearAuthContext();
            return;
        }
        setAuthCookie('role', user.role || '');
        setAuthCookie('student_id', user.student_id || '');
        setAuthCookie('username', user.username || '');
    },

    clearAuthContext() {
        clearAuthCookie('role');
        clearAuthCookie('student_id');
        clearAuthCookie('username');
    },

    isBackendMode() {
        if (typeof window === 'undefined' || !window.location) return false;
        const { protocol, hostname, port } = window.location;
        if (protocol !== 'http:' && protocol !== 'https:') return false;
        const localHosts = ['localhost', '127.0.0.1', '::1'];
        return localHosts.includes(hostname) && (port === '3000' || port === '');
    },

    canUseBackendApi() {
        return this.isBackendMode();
    },

    getAuthHeaders() {
        const user = this.getCurrentUser();
        if (!user) return {};
        return {
            'X-GoodDeeds-Role': user.role || '',
            'X-GoodDeeds-Student-Id': user.student_id || '',
            'X-GoodDeeds-Username': user.username || '',
        };
    },

    canAccessStudent(studentId) {
        const user = this.getCurrentUser();
        if (!user) return false;
        if (user.role === 'teacher' || user.role === 'admin') return true;
        return user.role === 'student' && String(user.student_id) === String(studentId);
    },

    getStaffAccounts() {
        const extraAccounts = Storage.get('staff_accounts') || [];
        return [...TEACHERS, ...extraAccounts];
    },

    saveStaffAccounts(accounts) {
        const builtinUsernames = new Set(TEACHERS.map(t => t.username));
        const cleanAccounts = (accounts || [])
            .filter(a => a && a.username && a.password && (a.role === 'teacher' || a.role === 'admin'))
            .filter(a => !builtinUsernames.has(a.username))
            .map(a => ({
                username: String(a.username).trim(),
                password: String(a.password),
                role: a.role,
                name: String(a.name || a.username).trim(),
            }));
        Storage.set('staff_accounts', cleanAccounts);
    },

    addStaffAccount(account) {
        const accounts = this.getStaffAccounts();
        if (accounts.some(a => a.username === account.username)) {
            return { success: false, message: 'มีชื่อผู้ใช้นี้อยู่แล้ว' };
        }
        const extraAccounts = Storage.get('staff_accounts') || [];
        extraAccounts.push({
            username: String(account.username || '').trim(),
            password: String(account.password || ''),
            role: account.role === 'admin' ? 'admin' : 'teacher',
            name: String(account.name || account.username || '').trim(),
        });
        this.saveStaffAccounts(extraAccounts);
        return { success: true };
    },

    requireAuth(allowedRoles = ['student', 'teacher', 'admin']) {
        const user = this.getCurrentUser();
        if (!user) { window.location.href = 'index.html'; return null; }
        if (!allowedRoles.includes(user.role)) { window.location.href = 'index.html'; return null; }
        return user;
    },

    // ---------- GOOD DEEDS DATA ----------
    deduplicateDeeds(deedsList) {
        if (!Array.isArray(deedsList)) return [];
        const seenIds = new Set();
        const seenSignatures = new Set();
        const result = [];

        deedsList.forEach(d => {
            if (!d) return;
            const id = String(d.id || '');
            const cat = d.categoryId || d.category_id || 7;
            const dt = String(d.activityDate || d.event_date || '').trim();
            const desc = String(d.description || d.title || '').trim().toLowerCase().replace(/\s+/g, '');
            const hrs = parseFloat(d.hours || 0);

            // Deduplicate by ID
            if (id && seenIds.has(id)) return;

            // Deduplicate by Content Signature for exact duplicates
            const sig = `${cat}_${dt}_${desc}_${hrs}`;
            if (dt && desc && seenSignatures.has(sig)) return;

            if (id) seenIds.add(id);
            if (dt && desc) seenSignatures.add(sig);
            result.push(d);
        });

        return result;
    },

    getDeeds(studentId) {
        let localDeeds = Storage.get('deeds_' + studentId) || [];
        let globalDeeds = [];
        if (typeof DEEDS_DATA !== 'undefined' && Array.isArray(DEEDS_DATA)) {
            globalDeeds = DEEDS_DATA.filter(d => String(d.student_id || d.studentId) === String(studentId));
        }

        if (!localDeeds || localDeeds.length === 0) {
            return this.deduplicateDeeds(globalDeeds);
        }

        // Merge: Global deeds as base, overlay with localDeeds (latest user status actions)
        const mergedMap = new Map();
        globalDeeds.forEach(d => {
            const sid = String(d.id);
            mergedMap.set(sid, {
                id: d.id,
                studentId: d.student_id || d.studentId,
                student_id: d.student_id || d.studentId,
                categoryId: d.categoryId || d.category_id || 7,
                hours: parseFloat(d.hours || 0),
                description: d.description || d.title || '',
                activityDate: d.activityDate || d.event_date || '',
                imageUrls: d.imageUrls || (d.imageUrl ? [d.imageUrl] : []),
                status: d.status || 'approved',
                submittedAt: d.created_at || d.submittedAt || '',
                approvedBy: d.approved_by || d.approvedBy || '',
                approved_by: d.approved_by || d.approvedBy || '',
                approvedAt: d.updated_at || d.approvedAt || '',
                rejectReason: d.rejectReason || '',
                note: d.note || '',
            });
        });

        localDeeds.forEach(d => {
            const key = String(d.id);
            if (mergedMap.has(key)) {
                const globalDeed = mergedMap.get(key);
                mergedMap.set(key, {
                    ...globalDeed,
                    ...d,
                    status: d.status || globalDeed.status,
                    approvedBy: d.approvedBy || globalDeed.approvedBy,
                    approved_by: d.approved_by || globalDeed.approved_by,
                    rejectReason: d.rejectReason !== undefined ? d.rejectReason : globalDeed.rejectReason,
                    hours: d.hours !== undefined ? d.hours : globalDeed.hours
                });
            } else {
                mergedMap.set(key, d);
            }
        });

        return this.deduplicateDeeds(Array.from(mergedMap.values()));
    },

    saveDeeds(studentId, deeds) {
        Storage.set('deeds_' + studentId, this.deduplicateDeeds(deeds));
    },

    async syncDeedsWithBackend(studentId) {
        if (!this.canUseBackendApi()) return null;

        try {
            const res = await fetch(`/api/get_deeds?studentId=${studentId}`, {
                headers: this.getAuthHeaders(),
            });
            if (res.ok) {
                const deeds = await res.json();
                this.saveDeeds(studentId, deeds);
                console.log(`🔄 Synced ${deeds.length} deeds from backend for ${studentId}`);
                return deeds;
            }
        } catch (e) {
            console.error('❌ Failed to sync deeds with backend:', e);
        }
        return null;
    },

    async syncAllDeedsWithBackend() {
        if (!this.canUseBackendApi()) return null;

        try {
            const res = await fetch('/api/get_all_deeds', {
                headers: this.getAuthHeaders(),
            });
            if (res.ok) {
                const allDeeds = await res.json();
                for (const [sid, deeds] of Object.entries(allDeeds)) {
                    this.saveDeeds(sid, deeds);
                }
                console.log(`🔄 Synced all deeds from backend`);
                return allDeeds;
            }
        } catch (e) {
            console.error('❌ Failed to sync all deeds with backend:', e);
        }
        return null;
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
        if (this.canUseBackendApi()) {
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
                        ...this.getAuthHeaders(),
                    },
                    body: JSON.stringify(payload)
                });
                console.log('✅ Sent deed to backend successfully');
            } catch (error) {
                console.error('❌ Failed to send deed to backend:', error);
            }
        }
        
        return newDeed;
    },

    async updateDeedStatus(studentId, deedId, status, teacherName, rejectReason = '') {
        const deeds = this.getDeeds(studentId);
        const deed = deeds.find(d => String(d.id) === String(deedId));
        if (!deed) return null;
        deed.status = status;
        deed.approvedBy = teacherName;
        deed.approved_by = teacherName;
        deed.approvedAt = new Date().toISOString();
        deed.rejectReason = rejectReason;
        this.saveDeeds(studentId, deeds);

        // Update in memory DEEDS_DATA if present
        if (typeof DEEDS_DATA !== 'undefined' && Array.isArray(DEEDS_DATA)) {
            const gd = DEEDS_DATA.find(d => String(d.id) === String(deedId));
            if (gd) {
                gd.status = status;
                gd.approved_by = teacherName;
                gd.approvedBy = teacherName;
                gd.approvedAt = deed.approvedAt;
                gd.rejectReason = rejectReason;
            }
        }
        
        // Save to backend via API
        if (this.canUseBackendApi()) {
            try {
                await fetch('/api/approve_deed', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...this.getAuthHeaders(),
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
        const s = Storage.get('settings') || {};
        return {
            academicYear: 2569,
            minHoursSemester: 25,
            minHoursYear: 50,
            telegramToken: CONFIG.TELEGRAM_BOT_TOKEN,
            lineNotifyToken: '',
            adminChatId: CONFIG.TELEGRAM_CHAT_ID,
            ...s
        };
    },
    saveSettings(s) { Storage.set('settings', s); },

    // ---------- TELEGRAM NOTIFY ----------
    async sendTelegram(chatId, message, replyMarkup = null) {
        const settings = this.getSettings();
        const token = settings.telegramToken || CONFIG.TELEGRAM_BOT_TOKEN;
        const targetChatId = (chatId && String(chatId).trim()) ? String(chatId).trim() : CONFIG.TELEGRAM_CHAT_ID;
        if (!token || !targetChatId) return false;
        try {
            const bodyObj = { chat_id: targetChatId, text: message, parse_mode: 'HTML' };
            if (replyMarkup) bodyObj.reply_markup = replyMarkup;
            const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyObj)
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
                    'Content-Type': `application/x-www-form-urlencoded`,
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
            `🎖️ <b>ใบบันทึกความดีจิตอาสา — วิทยาลัยพยาบาลทหารอากาศ</b>`,
            `━━━━━━━━━━━━━━━━━━━━━━━`,
            `👤 <b>ยศ-ชื่อ-สกุล:</b> ${student.rank} ${student.first_name} ${student.last_name}`,
            `🎫 <b>รหัสประจำตัว:</b> <code>${student.student_id}</code>`,
            `📚 <b>สังกัด:</b> ${yearName}`,
            ``,
            `📂 <b>หมวดหมู่ความดี:</b> ${cat.emoji} ${cat.name}`,
            `⏱ <b>จำนวนชั่วโมงสะสม:</b> <b>${deed.hours} ชั่วโมง</b>`,
            `📅 <b>วันที่ปฏิบัติกิจกรรม:</b> ${deed.activityDate}`,
            ``,
            `📝 <b>รายละเอียดกิจกรรม:</b>`,
            `${deed.description}`,
            `━━━━━━━━━━━━━━━━━━━━━━━`,
            `⏳ <b>สถานะเอกสาร:</b> <i>รอการตรวจประเมินและอนุมัติจากอาจารย์</i>`,
        ].join('\n');

        const replyMarkup = {
            inline_keyboard: [
                [
                    { text: '✅ อนุมัติ (Approve)', callback_data: `approve_${deed.id}_${student.student_id}` },
                    { text: '❌ ปฏิเสธ (Reject)', callback_data: `reject_${deed.id}_${student.student_id}` }
                ],
                [
                    { text: '🌐 เปิดแผงควบคุมอาจารย์', url: 'https://anuchit1tube168-cmd.github.io/gooddeeds69/frontend/teacher-dashboard.html' }
                ]
            ]
        };

        let sentTg = false;
        const rawChatId = settings.adminChatId && String(settings.adminChatId).trim() ? String(settings.adminChatId).trim() : '';
        const chatId = rawChatId || CONFIG.TELEGRAM_CHAT_ID;
        if (chatId) {
            sentTg = await this.sendTelegram(chatId, htmlMsg, replyMarkup);
        }

        let sentLine = false;
        if (settings.lineNotifyToken) {
            sentLine = await this.sendLineNotify(plainMsg);
        }

        return { sentTg, sentLine };
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
        if (!key) key = 'img_' + Date.now();
        const fullKey = key.startsWith('img_') ? key : 'img_' + key;
        try {
            Storage.set(fullKey, base64);
        } catch (e) {
            console.warn('Storage quota exceeded for image, storing in session/memory:', e);
        }
        return fullKey;
    },

    getImage(key) {
        if (!key) return null;
        if (typeof key === 'string' && (key.startsWith('data:image') || key.startsWith('http://') || key.startsWith('https://') || key.startsWith('./') || key.startsWith('/'))) {
            return key;
        }
        const fullKey = key.startsWith('img_') ? key : 'img_' + key;
        return Storage.get(fullKey) || Storage.get(key) || null;
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

// ==================== REAL-TIME EVENTS SYNC (SSE) ====================
function startRealtimeUpdates() {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    if (!App.canUseBackendApi()) return;

    const eventSource = new EventSource('/api/events');
    
    eventSource.addEventListener('deed_submitted', async (e) => {
        try {
            const data = JSON.parse(e.data);
            console.log("🔔 Real-time: New deed submitted:", data);
            
            const user = App.getCurrentUser();
            if (user) {
                if (user.role === 'teacher' || user.role === 'admin') {
                    await App.syncAllDeedsWithBackend();
                    if (typeof loadDashboardData === 'function') loadDashboardData();
                    showToast(`🔔 มีกิจกรรมใหม่รออนุมัติจาก นพอ. รหัส ${data.studentId}`);
                } else if (user.student_id === data.studentId) {
                    await App.syncDeedsWithBackend(data.studentId);
                    if (typeof loadDashboardData === 'function') loadDashboardData();
                }
            }
        } catch (err) {
            console.error("Error processing deed_submitted event:", err);
        }
    });

    eventSource.addEventListener('deed_approved', async (e) => {
        try {
            const data = JSON.parse(e.data);
            console.log("🔔 Real-time: Deed approved/updated:", data);
            
            const user = App.getCurrentUser();
            if (user) {
                if (user.role === 'teacher' || user.role === 'admin') {
                    await App.syncAllDeedsWithBackend();
                    if (typeof loadDashboardData === 'function') loadDashboardData();
                } else if (user.student_id === data.studentId) {
                    await App.syncDeedsWithBackend(data.studentId);
                    if (typeof loadDashboardData === 'function') loadDashboardData();
                    showToast(`🎉 กิจกรรมจิตอาสาของคุณได้รับการอนุมัติแล้ว (${data.status})!`);
                }
            }
        } catch (err) {
            console.error("Error processing deed_approved event:", err);
        }
    });

    eventSource.addEventListener('student_updated', async (e) => {
        try {
            const data = JSON.parse(e.data);
            console.log("🔔 Real-time: Student roster updated:", data);
            
            const user = App.getCurrentUser();
            if (user && user.student_id === data.studentId) {
                showToast("👤 ข้อมูลส่วนตัวของคุณได้รับการอัปเดตแล้ว");
            }
            if (typeof loadDashboardData === 'function') loadDashboardData();
        } catch (err) {
            console.error("Error processing student_updated event:", err);
        }
    });
    
    eventSource.onerror = (err) => {
        console.warn("EventSource disconnected, reconnecting in 3s...", err);
        eventSource.close();
        setTimeout(startRealtimeUpdates, 3000);
    };
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        startRealtimeUpdates();
    });
}

// ========== EXPORT ============
if (typeof module !== 'undefined') module.exports = { App, CATEGORIES, CONFIG };
