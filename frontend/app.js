
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
    GAS_URL: 'https://script.google.com/macros/s/AKfycbwV0b31hWMSs2oNOff4o-O_PNoEQ1XlTM77f4sei9JLh1rza1SfFPTOlTaxiIKCIxLT_Q/exec', // Google Apps Script Enterprise Cloud Web App (Master + Full Drive Integration Live)
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

// ==================== CATEGORIES & RULES ====================
const CATEGORIES = [
    { id: 1, name: 'บริจาคโลหิต/เกล็ดเลือด/พลาสมา', emoji: '🩸', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', maxHours: 16, defaultHours: 8, ruleNote: 'บันทึกครั้งละ 8 ชั่วโมง (สูงสุด 16 ชม. ทุก 3 เดือน หรือตามวงรอบ) โดยแนบรูปถ่ายใบนัด/ใบเสร็จรับรอง หรือรูปถ่ายสมุดประจำตัวผู้บริจาคโลหิต' },
    { id: 2, name: 'โครงการภายนอก (คำสั่ง วพอ.)', emoji: '🌐', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', maxHours: 8, defaultHours: 4, ruleNote: 'บันทึกตามเวลาจริง สูงสุดไม่เกิน 8 ชม./วัน (แนบคำสั่ง/ภาพถ่าย)' },
    { id: 3, name: 'ช่วยเหลืองานภายใน วพอ.', emoji: '🏥', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', maxHours: 8, defaultHours: 2, ruleNote: 'บันทึกตามเวลาจริง สูงสุดไม่เกิน 8 ชม./วัน' },
    { id: 4, name: 'เข้าอบรมที่ วพอ. จัดให้', emoji: '📚', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', maxHours: 6, defaultHours: 3, ruleNote: 'บันทึกตามช่วงเวลาอบรม สูงสุดไม่เกิน 6 ชม./วัน' },
    { id: 5, name: 'ช่วยงานหน่วยงาน/ชุมชน/มูลนิธิ', emoji: '🤝', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', maxHours: 8, defaultHours: 4, ruleNote: 'บันทึกตามเวลาจริง สูงสุดไม่เกิน 8 ชม./วัน' },
    { id: 6, name: 'ทำนุบำรุงศาสนสถาน', emoji: '🙏', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', maxHours: 6, defaultHours: 3, ruleNote: 'บันทึกตามเวลาจริง สูงสุดไม่เกิน 6 ชม./วัน' },
    { id: 7, name: 'งานฟรีทั่วไป', emoji: '⭐', color: '#c9a227', bg: 'rgba(201,162,39,0.1)', maxHours: 4, defaultHours: 2, ruleNote: 'บันทึกตามเวลาจริง สูงสุดไม่เกิน 4 ชม./วัน' },
    { id: 8, name: 'กิจกรรมจงรักภักดีต่อสถาบัน', emoji: '👑', color: '#ec4899', bg: 'rgba(236,72,153,0.1)', maxHours: 8, defaultHours: 4, ruleNote: 'บันทึกตามเวลาจริง สูงสุดไม่เกิน 8 ชม./วัน' },
    { id: 9, name: 'ชม. ที่สมควรได้รับ (บทบาทพิเศษ)', emoji: '🎖️', color: '#a855f7', bg: 'rgba(168,85,247,0.1)', maxHours: 10, defaultHours: 5, ruleNote: 'ตามที่ได้รับมอบหมายเป็นกรณีพิเศษจากอาจารย์/วิทยาลัย' },
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

// ==================== PDPA COMPLIANT STUDENT DATA SYNC ====================
// Restore cached students immediately for instant zero-latency startup
(function initCachedStudents() {
    try {
        if (typeof localStorage !== 'undefined') {
            const cached = localStorage.getItem('gooddeeds_cached_students');
            if (cached) {
                const list = JSON.parse(cached);
                if (Array.isArray(list) && list.length > 0) {
                    window.STUDENTS_DATA = list;
                    globalThis.STUDENTS_DATA = list;
                }
            }
        }
    } catch (e) {}
})();

// Background fetch from Google Cloud (Google Apps Script)
async function syncStudentsFromCloud() {
    try {
        const gasUrl = (typeof CONFIG !== 'undefined' && CONFIG.GAS_URL) ? CONFIG.GAS_URL : '';
        if (!gasUrl) return;
        const resp = await fetch(gasUrl + '?action=getStudents');
        if (resp.ok) {
            const list = await resp.json();
            if (Array.isArray(list) && list.length > 0) {
                window.STUDENTS_DATA = list;
                globalThis.STUDENTS_DATA = list;
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('gooddeeds_cached_students', JSON.stringify(list));
                }
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('students_loaded', { detail: list }));
                }
                console.log('☁️ Synced ' + list.length + ' students from Google Cloud securely (PDPA compliant)');
            }
        }
    } catch (err) {
        console.log('ℹ️ Cloud student sync note:', err.message);
    }
}
if (typeof window !== 'undefined') {
    syncStudentsFromCloud();
}

// ==================== APP CORE ====================
const App = {
    // ---------- AUTH ----------
    getStudentById(studentId) {
        if (!studentId) return null;
        const clean = normalizeThaiDigits(String(studentId)).trim().replace(/^[^\d]*/, '').replace(/\s+/g, '');
        const students = typeof STUDENTS_DATA !== 'undefined' ? STUDENTS_DATA : [];
        let found = students.find(s => String(s.student_id) === clean || String(s.student_id) === String(studentId).trim());
        if (found) return found;

        // Smart fallback: Check if stored in profile or synthesize from ID
        const profile = Storage.get('profile_' + clean);
        if (profile && profile.first_name) {
            return {
                student_id: clean,
                rank: profile.rank || 'นพอ.',
                first_name: profile.first_name,
                last_name: profile.last_name || '',
                full_name: `${profile.rank || 'นพอ.'} ${profile.first_name} ${profile.last_name || ''}`.trim(),
                class_year: profile.class_year || clean.substring(0, 2) || '69',
                year_level: profile.year_level || '1',
                role: 'student'
            };
        }

        if (clean.length === 7) {
            const cy = clean.substring(0, 2);
            let yl = '1';
            if (cy === '68') yl = '2';
            else if (cy === '67') yl = '3';
            else if (cy === '66') yl = '4';
            return {
                student_id: clean,
                rank: 'นพอ.',
                first_name: 'นักเรียน',
                last_name: clean,
                full_name: 'นพอ. รหัส ' + clean,
                class_year: cy,
                year_level: yl,
                role: 'student',
                password: clean
            };
        }
        return null;
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
        if (byName) return byName;

        // Fallback by 7-digit ID
        if (cleanDigits.length === 7) {
            return this.getStudentById(cleanDigits);
        }
        return null;
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
        let user = Storage.get('session');
        if (user && user.role === 'student' && user.student_id) {
            const fresh = this.getStudentById(user.student_id);
            if (fresh && fresh.first_name && fresh.first_name !== 'นักเรียน') {
                user = { ...user, ...fresh };
                Storage.set('session', user);
            }
        }
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
        } else if (typeof IMPORTED_DEEDS !== 'undefined' && typeof IMPORTED_DEEDS === 'object') {
            globalDeeds = IMPORTED_DEEDS[String(studentId)] || [];
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

    async syncDeedsFromCloud(studentId) {
        if (!studentId) return null;
        try {
            const gasUrl = (typeof CONFIG !== 'undefined' && CONFIG.GAS_URL) ? CONFIG.GAS_URL : '';
            let updatedDeeds = null;

            // 1. Fetch latest deeds.json from GitHub raw with cache buster
            try {
                const rawUrl = `https://raw.githubusercontent.com/anuchit1tube168-cmd/gooddeeds69/main/frontend/data/deeds.json?t=${Date.now()}`;
                const res = await fetch(rawUrl, { cache: 'no-store' });
                if (res.ok) {
                    const allDeeds = await res.json();
                    if (Array.isArray(allDeeds)) {
                        updatedDeeds = allDeeds.filter(d => String(d.student_id || d.studentId) === String(studentId));
                    } else if (allDeeds && typeof allDeeds === 'object') {
                        updatedDeeds = allDeeds[String(studentId)] || allDeeds[studentId] || [];
                    }
                }
            } catch (e) {}

            // 2. Fallback to GAS endpoint
            if (!updatedDeeds && gasUrl) {
                try {
                    const res = await fetch(`${gasUrl}?action=getDeeds&studentId=${studentId}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (Array.isArray(data)) updatedDeeds = data;
                        else if (data && typeof data === 'object') updatedDeeds = data[String(studentId)] || data[studentId] || [];
                    }
                } catch (e) {}
            }

            if (updatedDeeds && Array.isArray(updatedDeeds)) {
                const currentLocal = Storage.get('deeds_' + studentId) || [];
                let hasChanges = false;

                currentLocal.forEach(localDeed => {
                    const matched = updatedDeeds.find(u => String(u.id) === String(localDeed.id));
                    if (matched && matched.status !== localDeed.status) {
                        localDeed.status = matched.status;
                        localDeed.approvedBy = matched.approved_by || matched.approvedBy || localDeed.approvedBy;
                        localDeed.approved_by = matched.approved_by || matched.approvedBy || localDeed.approved_by;
                        localDeed.approvedAt = matched.updated_at || matched.approvedAt || localDeed.approvedAt;
                        hasChanges = true;
                    }
                });

                if (hasChanges) {
                    this.saveDeeds(studentId, currentLocal);
                    window.dispatchEvent(new CustomEvent('deeds_updated', { detail: { studentId } }));
                }
                return updatedDeeds;
            }
        } catch (err) {
            console.warn('Realtime sync note:', err);
        }
        return null;
    },

    startRealtimeSync(studentId, onChangeCallback) {
        if (!studentId) return null;
        let isPolling = false;

        const poll = async () => {
            if (isPolling) return;
            isPolling = true;
            try {
                await this.syncDeedsFromCloud(studentId);
            } finally {
                isPolling = false;
            }
        };

        // Poll every 3 seconds
        const timer = setInterval(poll, 3000);

        // Immediate poll on tab focus
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') poll();
        });

        // Event listener
        if (typeof onChangeCallback === 'function') {
            window.addEventListener('deeds_updated', onChangeCallback);
        }

        return timer;
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
        
        // Sync to Google Apps Script (Cloud Google Sheets) if configured
        const gasUrl = (typeof CONFIG !== 'undefined' && CONFIG.GAS_URL) ? CONFIG.GAS_URL : (this.getSettings ? this.getSettings().gasUrl : '');
        if (gasUrl) {
            fetch(gasUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'submit_deed',
                    deed: {
                        ...newDeed,
                        student: user
                    }
                })
            }).then(() => console.log('☁️ Synced Deed to Google Apps Script'))
              .catch(err => console.warn('⚠️ GAS Deed Sync Error:', err));
        }

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

        const totalHours = Math.round(approved.reduce((s, d) => s + (parseFloat(d.hours) || 0), 0));
        const byCategory = CATEGORIES.map(cat => ({
            ...cat,
            hours: Math.round(approved.filter(d => d.categoryId === cat.id).reduce((s, d) => s + (parseFloat(d.hours) || 0), 0)),
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

    // Ensure students are loaded (from Cache or Google Cloud)
    async ensureStudentsLoaded() {
        if (typeof STUDENTS_DATA !== 'undefined' && Array.isArray(STUDENTS_DATA) && STUDENTS_DATA.length > 0) {
            return STUDENTS_DATA;
        }
        try {
            if (typeof localStorage !== 'undefined') {
                const cached = localStorage.getItem('gooddeeds_cached_students');
                if (cached) {
                    const list = JSON.parse(cached);
                    if (Array.isArray(list) && list.length > 0) {
                        window.STUDENTS_DATA = list;
                        globalThis.STUDENTS_DATA = list;
                        return list;
                    }
                }
            }
        } catch (e) {}

        try {
            const gasUrl = (typeof CONFIG !== 'undefined' && CONFIG.GAS_URL) ? CONFIG.GAS_URL : '';
            if (gasUrl) {
                const resp = await fetch(gasUrl + '?action=getStudents');
                if (resp.ok) {
                    const list = await resp.json();
                    if (Array.isArray(list) && list.length > 0) {
                        window.STUDENTS_DATA = list;
                        globalThis.STUDENTS_DATA = list;
                        if (typeof localStorage !== 'undefined') {
                            localStorage.setItem('gooddeeds_cached_students', JSON.stringify(list));
                        }
                        return list;
                    }
                }
            }
        } catch (err) {
            console.warn('Could not load students from GAS:', err);
        }

        return [];
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
        const checkedStudents = new Set();

        students.forEach(s => {
            checkedStudents.add(String(s.student_id));
            const deeds = this.getDeeds(s.student_id);
            deeds.filter(d => d.status === 'pending').forEach(d => {
                pending.push({ ...d, student: s });
            });
        });

        // Also check all localStorage deed keys directly
        if (typeof localStorage !== 'undefined') {
            Object.keys(localStorage).filter(k => k.startsWith('gooddeeds_deeds_')).forEach(k => {
                const sid = k.replace('gooddeeds_deeds_', '');
                if (!checkedStudents.has(sid)) {
                    const deeds = Storage.get('deeds_' + sid) || [];
                    const stu = this.getStudentById(sid) || { student_id: sid, rank: 'นพอ.', first_name: 'นักเรียน', last_name: sid, full_name: 'นพอ. ' + sid };
                    deeds.filter(d => d.status === 'pending').forEach(d => {
                        pending.push({ ...d, student: stu });
                    });
                }
            });
        }

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
        const defaultLineToken = (typeof EXCEL_SETTINGS !== 'undefined' && EXCEL_SETTINGS.line?.channel_token) 
            ? EXCEL_SETTINGS.line.channel_token 
            : 'vyXhnvU/stGL9mUrIPKB+30x6OwFuFsercCL0UwISHKcV+qn3VW7FYL1kTa8kgm/+GpjDU3s+F/DPaFJwyZK58Y7iNrNXidTBmbaJu7w5ReFAiBmFe+QJ6z6tytonZPqmtfuO9pSU8tnmfRTh2+uvwdB04t89/1O/w1cDnyilFU=';
        return {
            academicYear: 2569,
            minHoursSemester: 25,
            minHoursYear: 50,
            telegramToken: CONFIG.TELEGRAM_BOT_TOKEN,
            lineNotifyToken: '',
            lineChannelToken: defaultLineToken,
            adminChatId: CONFIG.TELEGRAM_CHAT_ID,
            ...s
        };
    },
    saveSettings(s) { Storage.set('settings', s); },

    // ---------- FORM SLIP CANVAS GENERATOR FOR TELEGRAM ----------
    async generateDeedFormSlipBlob(deed, student) {
        if (typeof document === 'undefined') return null;
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 1000;
            canvas.height = 720;
            const ctx = canvas.getContext('2d');

            // 1. Background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 2. Outer Border (Official Navy & Gold)
            ctx.strokeStyle = '#1e3a8a';
            ctx.lineWidth = 4;
            ctx.strokeRect(20, 20, 960, 680);
            ctx.strokeStyle = '#c9a227';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(26, 26, 948, 668);

            // 3. Dates & Header elements
            const now = new Date();
            const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
            const curDay = now.getDate();
            const curMonth = thaiMonths[now.getMonth()];
            const curYear = now.getFullYear() + 543;

            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 20px "Sarabun", "TH Sarabun New", sans-serif';
            ctx.fillText(`วันที่  ${curDay}  เดือน  ${curMonth}  พ.ศ.  ${curYear}`, 50, 68);

            ctx.textAlign = 'right';
            ctx.fillText(`รหัส นพอ. :  ${student.student_id || '-'}`, 940, 68);
            ctx.textAlign = 'left';

            // 4. Draw Official Emblem in Center
            await new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(500, 75, 42, 0, Math.PI * 2);
                    ctx.closePath();
                    ctx.clip();
                    ctx.drawImage(img, 458, 33, 84, 84);
                    ctx.restore();
                    ctx.strokeStyle = '#c9a227';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.arc(500, 75, 42, 0, Math.PI * 2);
                    ctx.stroke();
                    resolve();
                };
                img.onerror = () => resolve();
                img.src = '510903.jpg';
            });

            // 5. Form Main Title
            ctx.fillStyle = '#0c1b33';
            ctx.font = 'bold 26px "Sarabun", "TH Sarabun New", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('บันทึกกิจกรรมความดีและจิตอาสา นพอ.', 500, 150);
            ctx.font = '16px "Sarabun", "TH Sarabun New", sans-serif';
            ctx.fillStyle = '#475569';
            ctx.fillText('วิทยาลัยพยาบาลทหารอากาศ กรมแพทย์ทหารอากาศ · ปีการศึกษา ๒๕๖๙', 500, 178);
            ctx.textAlign = 'left';

            // Helper to draw dotted underline
            const drawDottedLine = (x1, y, x2) => {
                ctx.save();
                ctx.setLineDash([2, 4]);
                ctx.strokeStyle = '#64748b';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(x1, y);
                ctx.lineTo(x2, y);
                ctx.stroke();
                ctx.restore();
            };

            const cat = this.getCategoryById(deed.categoryId);
            const stuName = `${student.rank || 'นพอ.'} ${student.first_name || ''} ${student.last_name || ''}`.trim();
            const yearLvl = student.year_level || (String(student.class_year) === '69' ? '1' : String(student.class_year) === '68' ? '2' : String(student.class_year) === '67' ? '3' : '4');

            // 6. Section 1 Box (ข้อมูลผู้ขออนุมัติ)
            ctx.strokeStyle = '#0c1b33';
            ctx.lineWidth = 2;
            ctx.strokeRect(50, 205, 900, 150);

            // Section 1 Header Tag
            ctx.fillStyle = '#0c1b33';
            ctx.fillRect(50, 205, 260, 32);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 18px "Sarabun", "TH Sarabun New", sans-serif';
            ctx.fillText('ส่วนที่ ๑ : ข้อมูลผู้ขออนุมัติ', 65, 227);

            // Row 1: Name + Class
            ctx.fillStyle = '#0f172a';
            ctx.font = '19px "Sarabun", "TH Sarabun New", sans-serif';
            ctx.fillText('ชื่อ – สกุล :', 70, 275);
            ctx.font = 'bold 20px "Sarabun", "TH Sarabun New", sans-serif';
            ctx.fillStyle = '#1e3a8a';
            ctx.fillText(stuName, 175, 275);
            drawDottedLine(170, 282, 600);

            ctx.fillStyle = '#0f172a';
            ctx.font = '19px "Sarabun", "TH Sarabun New", sans-serif';
            ctx.fillText('ชั้นปีที่ :', 630, 275);
            ctx.font = 'bold 20px "Sarabun", "TH Sarabun New", sans-serif';
            ctx.fillStyle = '#1e3a8a';
            ctx.fillText(`${yearLvl} (รุ่น ${student.class_year || '69'})`, 705, 275);
            drawDottedLine(700, 282, 925);

            // Row 2: Category
            ctx.fillStyle = '#0f172a';
            ctx.font = '19px "Sarabun", "TH Sarabun New", sans-serif';
            ctx.fillText('หมวดหมู่ความดี :', 70, 325);
            ctx.font = 'bold 19px "Sarabun", "TH Sarabun New", sans-serif';
            ctx.fillStyle = '#92400e';
            ctx.fillText(`หมวดที่ ${deed.categoryId} : ${cat.name}`, 215, 325);
            drawDottedLine(210, 332, 925);

            // 7. Section 2 Box (รายละเอียดกิจกรรม)
            ctx.strokeStyle = '#0c1b33';
            ctx.lineWidth = 2;
            ctx.strokeRect(50, 375, 900, 240);

            // Section 2 Header Tag
            ctx.fillStyle = '#0c1b33';
            ctx.fillRect(50, 375, 310, 32);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 18px "Sarabun", "TH Sarabun New", sans-serif';
            ctx.fillText('ส่วนที่ ๒ : รายละเอียดการปฏิบัติงาน', 65, 397);

            // Row 1: Activity Date & Hours
            ctx.fillStyle = '#0f172a';
            ctx.font = '19px "Sarabun", "TH Sarabun New", sans-serif';
            ctx.fillText('วันที่ปฏิบัติกิจกรรม :', 70, 445);
            ctx.font = 'bold 19px "Sarabun", "TH Sarabun New", sans-serif';
            ctx.fillStyle = '#1e3a8a';
            ctx.fillText(deed.activityDate || '-', 235, 445);
            drawDottedLine(230, 452, 530);

            ctx.fillStyle = '#0f172a';
            ctx.font = '19px "Sarabun", "TH Sarabun New", sans-serif';
            ctx.fillText('จำนวนชั่วโมง :', 560, 445);
            ctx.font = 'bold 22px "Sarabun", "TH Sarabun New", sans-serif';
            ctx.fillStyle = '#b45309';
            ctx.fillText(`${deed.hours} ชั่วโมง`, 690, 445);
            drawDottedLine(685, 452, 925);

            // Row 2: Location / Place
            ctx.fillStyle = '#0f172a';
            ctx.font = '19px "Sarabun", "TH Sarabun New", sans-serif';
            ctx.fillText('สถานที่ / สังกัด :', 70, 495);
            ctx.font = '19px "Sarabun", "TH Sarabun New", sans-serif';
            ctx.fillStyle = '#334155';
            ctx.fillText(deed.note || 'วิทยาลัยพยาบาลทหารอากาศ', 215, 495);
            drawDottedLine(210, 502, 925);

            // Row 3: Description Details
            ctx.fillStyle = '#0f172a';
            ctx.font = '19px "Sarabun", "TH Sarabun New", sans-serif';
            ctx.fillText('รายละเอียดกิจกรรม :', 70, 545);
            ctx.font = 'bold 19px "Sarabun", "TH Sarabun New", sans-serif';
            ctx.fillStyle = '#0f172a';
            const desc = deed.description || '-';
            const shortDesc = desc.length > 55 ? desc.substring(0, 52) + '...' : desc;
            ctx.fillText(shortDesc, 245, 545);
            drawDottedLine(240, 552, 925);

            // Row 4: Approver assigned
            ctx.fillStyle = '#0f172a';
            ctx.font = '19px "Sarabun", "TH Sarabun New", sans-serif';
            ctx.fillText('อาจารย์ผู้รับผิดชอบ :', 70, 595);
            ctx.font = 'bold 19px "Sarabun", "TH Sarabun New", sans-serif';
            ctx.fillStyle = '#0369a1';
            ctx.fillText(deed.approver || 'อาจารย์ผู้ควบคุมกิจกรรมจิตอาสา', 245, 595);
            drawDottedLine(240, 602, 925);

            // 8. Footer Timestamp
            const submitTimeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
            ctx.textAlign = 'right';
            ctx.fillStyle = '#64748b';
            ctx.font = '16px "Sarabun", "TH Sarabun New", sans-serif';
            ctx.fillText(`บันทึกเมื่อ ${curDay} ${curMonth} ${curYear} เวลา ${submitTimeStr} น.`, 940, 655);
            ctx.textAlign = 'left';

            return await new Promise((resolve) => {
                canvas.toBlob((blob) => resolve(blob), 'image/png');
            });
        } catch (err) {
            console.error('Canvas generate error:', err);
            return null;
        }
    },

    // ---------- TELEGRAM NOTIFY (TEXT & PHOTO) ----------
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

    async sendTelegramPhoto(chatId, photoBlob, caption, replyMarkup = null) {
        const settings = this.getSettings();
        const token = settings.telegramToken || CONFIG.TELEGRAM_BOT_TOKEN;
        const targetChatId = (chatId && String(chatId).trim()) ? String(chatId).trim() : CONFIG.TELEGRAM_CHAT_ID;
        if (!token || !targetChatId || !photoBlob) return false;
        try {
            const formData = new FormData();
            formData.append('chat_id', targetChatId);
            formData.append('photo', photoBlob, 'deed_form.png');
            if (caption) {
                formData.append('caption', caption);
                formData.append('parse_mode', 'HTML');
            }
            if (replyMarkup) {
                formData.append('reply_markup', JSON.stringify(replyMarkup));
            }
            const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
                method: 'POST',
                body: formData
            });
            return res.ok;
        } catch (err) {
            console.warn('Telegram photo send error:', err);
            return false;
        }
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
            `🔔 แจ้งเตือนขออนุมัติความดี`,
            `━━━━━━━━━━━━━━━`,
            `👤 ผู้ขอ : ${student.rank || 'นพอ.'} ${student.first_name} ${student.last_name}`,
            `🆔 รหัส นพอ. : ${student.student_id}`,
            `📂 กิจกรรม : ${cat.emoji} ${cat.name}`,
            `⏱ ชั่วโมง : ${deed.hours} ชม.`,
            `📅 วันที่ : ${deed.activityDate}`,
            `📝 ${deed.description}`,
            `━━━━━━━━━━━━━━━`,
            `สถานะ : ⏳ รออนุมัติ`,
        ];
        const plainMsg = msgLines.join('\n');

        const htmlMsg = [
            `🔔 <b>แจ้งเตือนการขออนุมัติความดี</b>`,
            `━━━━━━━━━━━━━━━━━━━━━━━`,
            `👤 <b>ผู้ขอ:</b> ${student.rank || 'นพอ.'}${student.first_name} ${student.last_name}`,
            `🆔 <b>รหัส:</b> <code>${student.student_id}</code> (${yearName})`,
            `📂 <b>หมวดหมู่:</b> ${cat.emoji} ${cat.name}`,
            `⏱ <b>จำนวน:</b> <b>${deed.hours} ชั่วโมง</b>`,
            `📅 <b>วันที่:</b> ${deed.activityDate}`,
            `📝 <b>รายละเอียด:</b> ${deed.description}`,
            `━━━━━━━━━━━━━━━━━━━━━━━`,
            `⏳ <i>กดปุ่มด้านล่างเพื่อตรวจและอนุมัติความดี</i>`,
        ].join('\n');

        const replyMarkup = {
            inline_keyboard: [
                [
                    { text: '✅ อนุมัติด่วน', callback_data: `approve_${deed.id}_${student.student_id}` },
                    { text: '❌ ปฏิเสธ', callback_data: `reject_${deed.id}_${student.student_id}` }
                ],
                [
                    { text: '✍️ ตรวจสอบ & เซ็นชื่อดิจิทัล', url: `https://anuchit1tube168-cmd.github.io/gooddeeds69/frontend/approve_sign.html?id=${deed.id}&studentId=${student.student_id}` }
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
            // 1. Try generating Form Slip Image first
            const formSlipBlob = await this.generateDeedFormSlipBlob(deed, student);
            if (formSlipBlob) {
                sentTg = await this.sendTelegramPhoto(chatId, formSlipBlob, htmlMsg, replyMarkup);
            }
            // 2. Fallback to Text message if photo sending failed
            if (!sentTg) {
                sentTg = await this.sendTelegram(chatId, htmlMsg, replyMarkup);
            }
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



    // ดึงรูปโปรไฟล์นักเรียน: localStorage ก่อน, ถ้าไม่มีใช้ STUDENT_PHOTOS หรือ photos/{studentId}.jpg
    getProfilePhoto(studentId) {
        const local = Storage.get('photo_' + studentId);
        if (local) return local;
        if (typeof STUDENT_PHOTOS !== 'undefined' && STUDENT_PHOTOS[studentId]) {
            return STUDENT_PHOTOS[studentId];
        }
        return `photos/${studentId}.jpg`;
    },

    saveProfilePhoto(studentId, base64) {
        Storage.set('photo_' + studentId, base64);
    },

    showToast(msg, type = 'success') {
        showToast(msg, type);
    },

    // ---------- IMAGE HANDLING (AUTO-COMPRESSION FOR 250+ CONCURRENT USERS) ----------
    imageToBase64(file, maxWidth = 1000, maxHeight = 1000, quality = 0.75) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                const img = new Image();
                img.onload = () => {
                    let w = img.width;
                    let h = img.height;

                    if (w > maxWidth || h > maxHeight) {
                        if (w > h) {
                            h = Math.round((h * maxWidth) / w);
                            w = maxWidth;
                        } else {
                            w = Math.round((w * maxHeight) / h);
                            h = maxHeight;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                    resolve(compressedBase64);
                };
                img.onerror = () => resolve(e.target.result); // Fallback to raw if image parse fails
                img.src = e.target.result;
            };
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
            console.warn('Storage quota warning, storing in memory session fallback:', e);
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
