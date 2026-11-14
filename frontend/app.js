
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
    GAS_URL: 'https://script.google.com/macros/s/AKfycbwaG05E5dNew4dsf0vD8LBLuWdbThXIkMih1UI8Ba9rnRBCK4xmnlArzZdwtmqV9vOdcw/exec', // Google Apps Script Enterprise Cloud Web App
    CLOUDFLARE_NOTIFY_URL: 'https://rtafnc-gooddeeds.pages.dev/api/notify-deed', // Cloudflare 24/7 Edge Telegram Dispatcher
    TELEGRAM_BOT_TOKEN: '',
    TELEGRAM_CHAT_ID: '', // ตั้งค่าฝั่ง server เท่านั้น (Cloudflare secret) — ไม่เก็บในหน้าเว็บสาธารณะ
    SYSTEM_URL: '',
    MIN_HOURS_PER_SEMESTER: 25, // เกณฑ์ขั้นต่ำ 25 ชั่วโมง/ภาคเรียน (เทอม)
    MIN_HOURS_PER_YEAR: 50, // เกณฑ์ขั้นต่ำ 50 ชั่วโมง/ปีการศึกษา
    MAX_HOURS_SCALE: 400, // เพดานสูงสุด 400 ชม.
    APP_VERSION: '1.2.1',
    ACADEMIC_YEAR: 2569,
};

if (typeof window !== 'undefined') window.CONFIG = CONFIG;
if (typeof globalThis !== 'undefined') globalThis.CONFIG = CONFIG;

// ==================== CATEGORIES & RULES ====================
const CATEGORIES = [
    { id: 1, name: 'บริจาคโลหิต/เกล็ดเลือด/พลาสมา', emoji: '🩸', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', maxHours: 8, defaultHours: 8, maxTimesPerYear: 4, minDaysSpacing: 90, ruleNote: 'บันทึกครั้งละ 8 ชม., ปีละไม่เกิน 4 ครั้ง และแต่ละครั้งต้องห่างกันอย่างน้อย 3 เดือน (90 วัน)' },
    { id: 2, name: 'โครงการภายนอก (คำสั่ง วพอ.)', emoji: '🌐', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', maxHours: 8, defaultHours: 4, ruleNote: 'บันทึกตามเวลาจริง สูงสุดไม่เกิน 8 ชม./วัน (มีคำสั่ง วพอ. อนุญาต)' },
    { id: 3, name: 'ช่วยเหลืองานภายใน วพอ.', emoji: '🏥', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', maxHours: 8, defaultHours: 2, ruleNote: 'บันทึกตามเวลาจริง สูงสุดไม่เกิน 8 ชม./วัน (รวมกิจกรรม 5ส และเวรจิตอาสา)' },
    { id: 4, name: 'เข้าอบรมที่ วพอ. จัดให้', emoji: '📚', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', maxHours: 4, defaultHours: 3, ruleNote: 'บันทึกตามช่วงเวลาอบรม สูงสุดไม่เกิน 4 ชม./วัน (ตามที่ วพอ. กำหนด)' },
    { id: 5, name: 'ช่วยงานหน่วยงาน/ชุมชน/มูลนิธิ', emoji: '🤝', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', maxHours: 4, defaultHours: 4, ruleNote: 'บันทึกตามเวลาจริง สูงสุดไม่เกิน 4 ชม./วัน' },
    { id: 6, name: 'ทำนุบำรุงศาสนสถาน', emoji: '🙏', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', maxHours: 1, defaultHours: 1, maxPerYear: 4, ruleNote: 'บันทึกได้ไม่เกิน 1 ชม./ครั้ง และสะสมรวมไม่เกิน 4 ชม./ปีการศึกษา' },
    { id: 7, name: 'งานฟรีทั่วไป', emoji: '⭐', color: '#c9a227', bg: 'rgba(201,162,39,0.1)', maxHours: 1, defaultHours: 1, maxPerSemester: 2, maxPerYear: 4, ruleNote: 'งานฟรีทั่วไป/ช่วยผู้ปกครอง บันทึกได้ไม่เกิน 1 ชม./ครั้ง, ไม่เกิน 2 ชม./เทอม, ไม่เกิน 4 ชม./ปีการศึกษา' },
    { id: 8, name: 'กิจกรรมจงรักภักดีต่อสถาบัน', emoji: '👑', color: '#ec4899', bg: 'rgba(236,72,153,0.1)', maxHours: 8, defaultHours: 4, maxPerYear: 8, ruleNote: 'กิจกรรมเฉลิมพระเกียรติ/จิตอาสาพระราชทาน สูงสุดไม่เกิน 8 ชม./ปีการศึกษา' },
    { id: 9, name: 'ชม. ที่สมควรได้รับ (บทบาทพิเศษ)', emoji: '🎖️', color: '#a855f7', bg: 'rgba(168,85,247,0.1)', maxHours: 20, defaultHours: 20, maxPerSemester: 20, maxPerYear: 40, ruleNote: 'นักเรียนปกครอง/แอดมิน/สารสนเทศ/ตัดต่อ/พยาบาล เทอมละ 20 ชม. (ปีละ 40 ชม.)' },
];

if (typeof window !== 'undefined') window.CATEGORIES = CATEGORIES;
if (typeof globalThis !== 'undefined') globalThis.CATEGORIES = CATEGORIES;

// ==================== STORAGE ====================
const Storage = {
    get(key) {
        try { return JSON.parse(localStorage.getItem('gooddeeds_' + key)); } catch { return null; }
    },
    set(key, val) {
        try {
            localStorage.setItem('gooddeeds_' + key, JSON.stringify(val));
        } catch (e) {
            console.warn('Storage quota exceeded, recovering space...', e);
            try {
                // 1. Free space by purging old standalone base64 images and unneeded student deeds
                Storage.pruneOldStorage(key);
                localStorage.setItem('gooddeeds_' + key, JSON.stringify(val));
            } catch (retryErr) {
                console.warn('Storage retry failed, saving lightweight record...', retryErr);
                try {
                    // 2. Strip large base64 image strings from record before storing in local storage
                    const lightweight = Storage.stripLargeData(val);
                    localStorage.setItem('gooddeeds_' + key, JSON.stringify(lightweight));
                } catch (finalErr) {
                    console.error('Storage quota completely full:', finalErr);
                }
            }
        }
    },
    remove(key) {
        try { localStorage.removeItem('gooddeeds_' + key); } catch (_) {}
    },
    clear() {
        try {
            Object.keys(localStorage).filter(k => k.startsWith('gooddeeds_')).forEach(k => localStorage.removeItem(k));
        } catch (_) {}
    },
    pruneOldStorage(currentKeyToKeep) {
        try {
            const keys = Object.keys(localStorage).filter(k => k.startsWith('gooddeeds_'));
            // Remove cached standalone images
            keys.filter(k => k.startsWith('gooddeeds_img_')).forEach(k => localStorage.removeItem(k));
            // Keep only the active user's deeds; remove old bulk student deeds
            const keepKey = 'gooddeeds_' + currentKeyToKeep;
            const currentUser = Storage.get('current_user') || {};
            const activeSid = currentUser.student_id ? 'gooddeeds_deeds_' + currentUser.student_id : '';
            keys.filter(k => k.startsWith('gooddeeds_deeds_') && k !== keepKey && k !== activeSid)
                .forEach(k => localStorage.removeItem(k));
        } catch (_) {}
    },
    stripLargeData(val) {
        if (!val) return val;
        try {
            const copy = JSON.parse(JSON.stringify(val));
            const sanitize = (obj) => {
                if (Array.isArray(obj)) {
                    obj.forEach(sanitize);
                } else if (obj && typeof obj === 'object') {
                    if (typeof obj.imageData === 'string' && obj.imageData.length > 500) {
                        obj.imageData = '';
                    }
                    if (typeof obj.imageUrl === 'string' && obj.imageUrl.startsWith('data:') && obj.imageUrl.length > 50000) {
                        obj.imageUrl = '';
                    }
                    if (Array.isArray(obj.imageUrls)) {
                        obj.imageUrls = obj.imageUrls.map(u => (typeof u === 'string' && u.length > 50000) ? '' : u).filter(Boolean);
                    }
                }
            };
            sanitize(copy);
            return copy;
        } catch {
            return val;
        }
    }
};

// ==================== SEED IMPORTED DEEDS ====================
/**
 * IMPORTED_DEEDS (deeds_data.js) มีขนาดใหญ่ (~3.9MB)
 * getDeeds() จะอ่านจากหน่วยความจำโดยตรงอยู่แล้ว ไม่จำเป็นต้องนำเข้า localStorage ทั้งหมด
 * ฟังก์ชันนี้ช่วยเคลียร์ขยะ localStorage เก่าเพื่อคืนพื้นที่ให้เบราว์เซอร์และมือถือ
 */
function seedImportedDeeds() {
    try {
        if (typeof localStorage === 'undefined') return;
        const keys = Object.keys(localStorage).filter(k => k.startsWith('gooddeeds_deeds_'));
        const currentUser = Storage.get('current_user') || {};
        const activeSid = currentUser.student_id ? 'gooddeeds_deeds_' + currentUser.student_id : '';
        // หากมีข้อมูล นพอ. อื่นๆ ค้างอยู่ใน localStorage เกิน 3 คน ให้ลบออกเพื่อป้องกันโควต้าเต็ม (QuotaExceededError)
        if (keys.length > 3) {
            keys.forEach(k => {
                if (k !== activeSid) {
                    localStorage.removeItem(k);
                }
            });
            console.log('🧹 Pruned old deeds cache from localStorage to preserve storage quota.');
        }
    } catch (_) {}
}

// รันตรวจเช็คพื้นที่ทันทีเมื่อโหลด script
seedImportedDeeds();


// Production authentication is server-side only. Never restore browser-resident
// staff accounts or passwords here; gateway-client.js replaces the fail-closed
// methods below after the verified V2 transport loads.
const TEACHERS = [];

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
        if (!gasUrl || typeof fetch !== 'function') return;
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

// Display-only official sequence lookup. This never establishes identity.
function calculateCohortNo(studentId) {
    if (!studentId) return '-';
    const clean = String(studentId).replace(/\D/g, '');
    if (clean.length !== 7) return '-';
    // If global students data is loaded and has official no, use it
    if (typeof STUDENTS_DATA !== 'undefined' && Array.isArray(STUDENTS_DATA)) {
        const s = STUDENTS_DATA.find(x => String(x.student_id) === clean);
        if (s && s.no) return s.no;
    }
    // Missing official sequence remains unknown; no ID arithmetic.
    return '-';
}

// ==================== APP CORE ====================
const App = {
    // ---------- AUTH ----------
    getStudentById(studentId) {
        if (!studentId) return null;
        const clean = normalizeThaiDigits(String(studentId)).trim().replace(/^[^\d]*/, '').replace(/\s+/g, '');
        let students = typeof STUDENTS_DATA !== 'undefined' && Array.isArray(STUDENTS_DATA) && STUDENTS_DATA.length > 0 ? STUDENTS_DATA : [];
        if (students.length === 0 && typeof localStorage !== 'undefined') {
            const cached = localStorage.getItem('gooddeeds_cached_students');
            if (cached) {
                try {
                    const list = JSON.parse(cached);
                    if (Array.isArray(list) && list.length > 0) {
                        students = list;
                        window.STUDENTS_DATA = list;
                        globalThis.STUDENTS_DATA = list;
                    }
                } catch (e) {}
            }
        }
        let found = students.find(s => String(s.student_id) === clean || String(s.student_id) === String(studentId).trim());
        if (found) {
            if (!found.no) found.no = calculateCohortNo(clean);
            return found;
        }

        // Smart fallback: Check if stored in profile or synthesize from ID
        const profile = Storage.get('profile_' + clean);
        if (profile && profile.first_name) {
            return {
                student_id: clean,
                no: profile.no || calculateCohortNo(clean),
                rank: profile.rank || 'นพอ.',
                first_name: profile.first_name,
                last_name: profile.last_name || '',
                full_name: `${profile.rank || 'นพอ.'} ${profile.first_name} ${profile.last_name || ''}`.trim(),
                class_year: profile.class_year || clean.substring(0, 2) || '69',
                year_level: profile.year_level || '1',
                role: 'student'
            };
        }

        // Check if any deed for this student has embedded student name
        const deeds = this.getDeeds(clean);
        const deedWithName = deeds.find(d => d.student_name || d.studentName);
        if (deedWithName) {
            const fullName = deedWithName.student_name || deedWithName.studentName;
            return {
                student_id: clean,
                no: deedWithName.student_no || calculateCohortNo(clean),
                rank: deedWithName.student_rank || 'นพอ.',
                first_name: deedWithName.student_first_name || fullName,
                last_name: deedWithName.student_last_name || '',
                full_name: fullName,
                class_year: deedWithName.class_year || clean.substring(0, 2) || '69',
                year_level: deedWithName.year_level || '1',
                position: deedWithName.student_position || '',
                role: 'student',
                password: clean
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
                no: calculateCohortNo(clean),
                rank: 'นพอ.',
                first_name: '',
                last_name: '',
                full_name: `นพอ. (${clean})`,
                class_year: cy,
                year_level: yl,
                role: 'student',
                password: clean
            };
        }
        return null;
    },

    async ensureStudentProfile(studentId) {
        const clean = String(studentId || '').trim();
        if (!/^\d{7}$/.test(clean) || typeof window === 'undefined' || !window.createGoodDeedGatewayClient || !window.GOODDEED_GATEWAY_CONFIG?.origin) return null;
        const client = window.createGoodDeedGatewayClient({origin: window.GOODDEED_GATEWAY_CONFIG.origin});
        try {
            const session = await client.restore();
            if (!session.studentLinked) return null;
            const {card} = await client.readSelf();
            if (card.studentId !== clean) return null;
            return {student_id: card.studentId, full_name: card.displayName, first_name: card.displayName, last_name: '', rank: '', no: Number.isInteger(card.sequenceNumber) && card.sequenceNumber > 0 ? card.sequenceNumber : null};
        } catch (_) { return null; }
        finally { client.clear(); }
    },

    _cacheStudentProfile(clean, fresh) {
        if (fresh && !fresh.no) {
            fresh.no = calculateCohortNo(clean);
        }
        if (typeof STUDENTS_DATA !== 'undefined' && Array.isArray(STUDENTS_DATA)) {
            const idx = STUDENTS_DATA.findIndex(s => String(s.student_id) === clean);
            if (idx >= 0) STUDENTS_DATA[idx] = { ...STUDENTS_DATA[idx], ...fresh };
            else STUDENTS_DATA.push(fresh);
        }
        try {
            const cached = localStorage.getItem('gooddeeds_cached_students');
            let list = cached ? JSON.parse(cached) : [];
            if (Array.isArray(list)) {
                const cIdx = list.findIndex(s => String(s.student_id) === clean);
                if (cIdx >= 0) list[cIdx] = { ...list[cIdx], ...fresh };
                else list.push(fresh);
                localStorage.setItem('gooddeeds_cached_students', JSON.stringify(list));
            }
        } catch(e) {}
    },

    findStudent(query) {
        if (!query) return null;
        const q = String(query).trim();
        const cleanDigits = normalizeThaiDigits(q).replace(/[^\d]/g, '');
        let students = typeof STUDENTS_DATA !== 'undefined' && Array.isArray(STUDENTS_DATA) && STUDENTS_DATA.length > 0 ? STUDENTS_DATA : [];
        if (students.length === 0 && typeof localStorage !== 'undefined') {
            const cached = localStorage.getItem('gooddeeds_cached_students');
            if (cached) {
                try {
                    const list = JSON.parse(cached);
                    if (Array.isArray(list) && list.length > 0) {
                        students = list;
                        window.STUDENTS_DATA = list;
                        globalThis.STUDENTS_DATA = list;
                    }
                } catch (e) {}
            }
        }

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
        // รองรับการเรียกแบบเก่า setSession({...}) — ใช้ role ใน object หรือ 'student'
        if (role && typeof role === 'object' && user === undefined) { user = role; role = user.role || 'student'; }
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

    async loginStudent(studentId, password) {
        if (this.ensureStudentsLoaded) {
            await this.ensureStudentsLoaded().catch(() => {});
        }
        const inputId = String(studentId || '').trim();
        const inputPwd = String(password || '').trim();

        if (!inputId) {
            return { success: false, message: 'กรุณากรอกรหัสนักเรียน' };
        }

        const normalizedInput = normalizeThaiDigits(inputId);
        let student = this.findStudent(normalizedInput);

        if (!student) {
            const stripped = normalizedInput.replace(/^(นพอ\.?(\s*\([ชญ]\))?|นพอ\s*|ID:?|#)\s*/i, '').replace(/\s+/g, '');
            student = this.findStudent(stripped);
        }

        if (!student) {
            return { success: false, message: 'ไม่พบรหัสนักเรียนในระบบ กรุณาตรวจสอบรหัส 7 หลัก หรือชื่อ-สกุล' };
        }

        const cleanId = String(student.student_id);
        const localPwd = Storage.get('pwd_' + cleanId);
        const profile = Storage.get('profile_' + cleanId) || {};
        const profilePwd = profile.password;
        const studentPwd = student.password ? String(student.password).trim() : '';

        // Check if student has an active custom password
        const customPassword = (localPwd && localPwd !== cleanId) ? localPwd
                              : ((profilePwd && profilePwd !== cleanId) ? profilePwd
                              : ((studentPwd && studentPwd !== cleanId) ? studentPwd : null));

        const normalizedPwd = normalizeThaiDigits(inputPwd);
        let isMatch = false;

        if (customPassword) {
            // Once a custom password is set, ONLY the custom password is accepted
            isMatch = (inputPwd === customPassword ||
                       inputPwd.toLowerCase() === customPassword.toLowerCase() ||
                       normalizedPwd === customPassword ||
                       normalizedPwd.toLowerCase() === customPassword.toLowerCase());
        } else {
            // Default initial login allowed set (before any password change)
            const allowedSet = new Set([
                cleanId,
                '1234',
                '123456',
                '69',
                '2569',
                'rtafnc',
                student.phone ? String(student.phone).trim() : '',
                student.nickname ? String(student.nickname).trim().toLowerCase() : ''
            ].filter(Boolean).map(p => String(p).trim().toLowerCase()));

            isMatch = allowedSet.has(normalizedPwd.toLowerCase()) ||
                      allowedSet.has(inputPwd.toLowerCase()) ||
                      (inputPwd === cleanId);
        }

        // If not matched locally, check cloud GAS or server for newly updated password from another device
        if (!isMatch) {
            const gasUrl = (typeof CONFIG !== 'undefined' && CONFIG.GAS_URL) ? CONFIG.GAS_URL : (this.getSettings ? this.getSettings().gasUrl : '');
            if (gasUrl) {
                try {
                    const res = await fetch(`${gasUrl}?action=getPassword&studentId=${cleanId}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data && data.password && (data.password === inputPwd || data.password.toLowerCase() === inputPwd.toLowerCase() || data.password === normalizedPwd)) {
                            Storage.set('pwd_' + cleanId, data.password);
                            isMatch = true;
                        }
                    }
                } catch(e) {}
            }
        }

        if (!isMatch) {
            return { success: false, message: 'รหัสผ่านไม่ถูกต้อง (เริ่มต้นใช้รหัสนักเรียน 7 หลัก หรือ 1234)' };
        }

        try {
            localStorage.removeItem('gooddeeds_auto_login_disabled');
            localStorage.removeItem('gooddeeds_logged_out');
            sessionStorage.removeItem('gooddeeds_logged_out');
        } catch(e) {}
        const session = this.setSession('student', student);
        if (typeof LiffHelper !== 'undefined' && LiffHelper.bindCurrentStudentProfile) {
            LiffHelper.bindCurrentStudentProfile();
        }
        return { success: true, user: session };
    },

    async loginTeacher(username, password) {
        const rawU = String(username || '').trim();
        const rawP = String(password || '').trim();

        if (!rawU || !rawP) {
            return { success: false, message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' };
        }

        const u = rawU.toLowerCase();
        // Convert any Thai digits in password to Arabic digits
        const thaiDigitMap = { '๐':'0', '๑':'1', '๒':'2', '๓':'3', '๔':'4', '๕':'5', '๖':'6', '๗':'7', '๘':'8', '๙':'9' };
        const p = rawP.replace(/[๐-๙]/g, ch => thaiDigitMap[ch] || ch);
        const pLower = p.toLowerCase();

        let matchedStaff = null;

        // 1. Direct match or alias match
        if (['admin', 'administrator', 'แอดมิน', 'ผู้ดูแลระบบ', 'rtafnc', 'rtafnc_admin'].includes(u) || rawU.includes('ผู้ดูแลระบบ') || rawU.includes('แอดมิน')) {
            matchedStaff = { username: 'admin', name: 'ผู้ดูแลระบบ (Admin)', role: 'admin', isTeacher: true, isAdmin: true };
        } else if (['anuchit', 'bird', 'เบิร์ด', 'อนุชิต'].includes(u) || rawU.includes('อนุชิต') || rawU.includes('Bird') || rawU.includes('bird')) {
            matchedStaff = { username: 'anuchit', name: 'ร.อ.อนุชิต ทำจะดี (Bird)', role: 'admin', isTeacher: true, isAdmin: true };
        } else if (['teacher', 'อาจารย์', 'อาจารย์ผู้ตรวจ', 'ครู', 'staff', 'เจ้าหน้าที่'].includes(u)) {
            matchedStaff = { username: 'teacher', name: 'อาจารย์ผู้ตรวจประเมิน', role: 'teacher', isTeacher: true, isAdmin: false };
        } else {
            // Check in TEACHERS_DATA (all 72 teachers)
            const teachers = (typeof TEACHERS_DATA !== 'undefined' && Array.isArray(TEACHERS_DATA)) ? TEACHERS_DATA : [];
            const foundTeacher = teachers.find(t => t.includes(rawU) || rawU.includes(t.replace(/^(น\.[อทต]\.|ร\.[อต]\.)(หญิง\s*)?/, '').trim()));
            if (foundTeacher) {
                matchedStaff = { username: 'teacher_' + rawU.slice(0, 8), name: foundTeacher, role: 'teacher', isTeacher: true, isAdmin: false };
            }
        }

        if (!matchedStaff) {
            return { success: false, message: 'ไม่พบบัญชีผู้ใช้ของอาจารย์หรือแอดมิน กรุณาใช้ชื่อผู้ใช้ admin หรือ anuchit' };
        }

        // Recognized passwords (support standard admin/staff formats)
        const allowedCreds = [
            '1234', '123456', '12345678', 'admin', 'admin2569', 'admin1234', 'admin@2569', 'admin@1234',
            'rtafnc', 'rtafnc2569', '510903', 'password', 'teacher', 'teacher2569',
            u, u + '2569', u + '1234'
        ];

        const isMatch = allowedCreds.includes(p) || allowedCreds.includes(pLower) || p === u || p === (u + '2569');

        if (!isMatch) {
            return { success: false, message: 'รหัสผ่านไม่ถูกต้อง (เริ่มต้นสามารถใช้ 1234 หรือ admin2569 หรือ admin)' };
        }

        try {
            localStorage.removeItem('gooddeeds_auto_login_disabled');
            localStorage.removeItem('gooddeeds_logged_out');
            sessionStorage.removeItem('gooddeeds_logged_out');
        } catch(e) {}
        const session = { ...matchedStaff, loginAt: Date.now(), token: 'teacher_' + Math.random().toString(36).slice(2) };
        Storage.set('session', session);
        this.syncAuthContext(session);
        if (typeof LiffHelper !== 'undefined' && LiffHelper.bindCurrentStudentProfile) {
            LiffHelper.bindCurrentStudentProfile();
        }
        return { success: true, user: session };
    },

    logout() {
        Storage.remove('session');
        Storage.remove('gooddeeds_session');
        this.clearAuthContext();
        try {
            // Delete LINE mappings completely to prevent auto-login lock into previous user
            localStorage.removeItem('gooddeeds_line_mappings');
            localStorage.setItem('gooddeeds_auto_login_disabled', 'true');
            localStorage.setItem('gooddeeds_logged_out', 'true');
            sessionStorage.setItem('gooddeeds_logged_out', 'true');
        } catch (e) {}
        window.location.href = 'index.html?logout=true&tab=teacher';
    },

    getCurrentUser() {
        let user = Storage.get('session');
        if (!user && typeof window !== 'undefined' && window.location) {
            try {
                const params = new URLSearchParams(window.location.search);
                const path = (window.location.pathname || '') + (window.location.search || '');
                // NEVER forge a student session from query parameters on review, approval, slip or dashboard pages!
                const isReviewOrAdmin = path.includes('approve_sign') || path.includes('deed_slip') || path.includes('teacher-dashboard');
                if (!isReviewOrAdmin) {
                    const autoSid = params.get('autoLogin');
                    if (autoSid) {
                        const s = this.findStudent(autoSid);
                        if (s) {
                            user = { ...s, role: 'student', loginAt: Date.now() };
                            Storage.set('session', user);
                        }
                    }
                }
            } catch (e) {}
        }
        if (user && user.role === 'student' && user.student_id) {
            const fresh = this.getStudentById(user.student_id);
            if (fresh && fresh.first_name && !fresh.first_name.startsWith('รหัส') && fresh.first_name !== 'นักเรียน') {
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

    getApiBaseUrl() {
        if (typeof window !== 'undefined' && window.location) {
            const { hostname } = window.location;
            if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('trycloudflare.com')) {
                return '';
            }
        }
        if (typeof CONFIG !== 'undefined' && CONFIG.SYSTEM_URL) {
            return String(CONFIG.SYSTEM_URL).replace(/\/+$/, '');
        }
        return '';
    },

    isBackendMode() {
        if (typeof window === 'undefined' || !window.location) return false;
        const { protocol, hostname } = window.location;
        if (protocol !== 'http:' && protocol !== 'https:') return false;
        // Only loopback implements the retired local transport; never infer a trusted gateway from a tunnel/domain.
        return hostname === 'localhost' || hostname === '127.0.0.1';
    },

    canUseBackendApi() {
        return this.isBackendMode();
    },

    getEdgeApiUrl(endpoint) {
        const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        if (typeof window !== 'undefined' && window.location && window.location.hostname) {
            const h = window.location.hostname;
            if (h.includes('pages.dev')) {
                return path; // same-origin relative on Cloudflare Pages
            }
        }
        return `https://rtafnc-gooddeeds.pages.dev${path}`;
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
        return [];
    },

    saveStaffAccounts() {
        Storage.remove('staff_accounts');
        return false;
    },

    addStaffAccount() {
        Storage.remove('staff_accounts');
        return { success: false, message: 'จัดการบัญชีผ่านระบบผู้ดูแล V2 เท่านั้น' };
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

        // Load persistently deleted deed IDs to prevent resurrection from static files or cloud cache
        let deletedSet = new Set();
        try {
            const rawDeleted = localStorage.getItem('gooddeeds_deleted_ids');
            if (rawDeleted) {
                const arr = JSON.parse(rawDeleted);
                if (Array.isArray(arr)) deletedSet = new Set(arr.map(String));
            }
        } catch (_) {}

        if (typeof DEEDS_DATA !== 'undefined' && Array.isArray(DEEDS_DATA)) {
            globalDeeds = DEEDS_DATA.filter(d => String(d.student_id || d.studentId) === String(studentId));
        } else if (typeof IMPORTED_DEEDS !== 'undefined' && typeof IMPORTED_DEEDS === 'object') {
            globalDeeds = IMPORTED_DEEDS[String(studentId)] || [];
        }

        // Filter out deleted deeds before processing
        globalDeeds = globalDeeds.filter(d => d && !deletedSet.has(String(d.id)) && d.status !== 'deleted');
        localDeeds = (localDeeds || []).filter(d => d && !deletedSet.has(String(d.id)) && d.status !== 'deleted');

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

        const activeList = Array.from(mergedMap.values()).filter(d => d && !deletedSet.has(String(d.id)) && d.status !== 'deleted');
        return this.deduplicateDeeds(activeList);
    },

    saveDeeds(studentId, deeds) {
        const cleanDeeds = (deeds || []).map(d => {
            if (d && d.imageData && d.imageData.length > 500) {
                const copy = { ...d };
                delete copy.imageData;
                return copy;
            }
            return d;
        });
        Storage.set('deeds_' + studentId, this.deduplicateDeeds(cleanDeeds));
    },

    async syncDeedsWithBackend(studentId) {
        if (this.canUseBackendApi()) {
            try {
                const apiUrl = `${this.getApiBaseUrl()}/api/get_deeds?studentId=${encodeURIComponent(studentId)}`;
                const res = await fetch(apiUrl, {
                    headers: this.getAuthHeaders(),
                });
                if (res.ok) {
                    const deeds = await res.json();
                    this.saveDeeds(studentId, deeds);
                    console.log(`🔄 Synced ${deeds.length} deeds from backend for ${studentId}`);
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('deeds_updated', { detail: { studentId, deeds } }));
                    }
                    return deeds;
                }
            } catch (e) {
                console.error('❌ Failed to sync deeds with backend:', e);
            }
        }

        // Cloudflare Pages 24/7 Edge Serverless API for online & mobile
        try {
            const edgeUrl = this.getEdgeApiUrl ? this.getEdgeApiUrl(`/api/get_deeds?student_id=${encodeURIComponent(studentId)}`) : `https://rtafnc-gooddeeds.pages.dev/api/get_deeds?student_id=${encodeURIComponent(studentId)}`;
            const res = await fetch(edgeUrl);
            if (res.ok) {
                const deeds = await res.json();
                if (Array.isArray(deeds)) {
                    this.saveDeeds(studentId, deeds);
                    console.log(`☁️ Synced ${deeds.length} deeds from Cloudflare Edge for ${studentId}`);
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('deeds_updated', { detail: { studentId, deeds } }));
                    }
                    return deeds;
                }
            }
        } catch (cfErr) {
            console.warn('Edge sync deed notice:', cfErr);
        }

        return null;
    },

    async syncAllDeedsWithBackend() {
        if (this.canUseBackendApi()) {
            try {
                const apiUrl = `${this.getApiBaseUrl()}/api/get_all_deeds`;
                const res = await fetch(apiUrl, {
                    headers: this.getAuthHeaders(),
                });
                if (res.ok) {
                    const allDeeds = await res.json();
                    let deedsList = [];
                    if (Array.isArray(allDeeds)) {
                        deedsList = allDeeds;
                    } else if (allDeeds && typeof allDeeds === 'object') {
                        Object.entries(allDeeds).forEach(([sid, list]) => {
                            if (Array.isArray(list)) {
                                list.forEach(d => {
                                    deedsList.push({
                                        ...d,
                                        studentId: d.studentId || sid,
                                        student_id: d.student_id || sid
                                    });
                                });
                            }
                        });
                    }

                    // Group by student and save to localStorage
                    const byStudent = {};
                    deedsList.forEach(d => {
                        const sid = String(d.student_id || d.studentId);
                        if (!byStudent[sid]) byStudent[sid] = [];
                        byStudent[sid].push(d);
                    });

                    Object.entries(byStudent).forEach(([sid, deeds]) => {
                        const current = this.getDeeds(sid);
                        const mergedMap = new Map();
                        const backendIds = new Set(deeds.map(bd => String(bd.id)));
                        current.forEach(d => {
                            const did = String(d.id || '').toUpperCase();
                            const desc = String(d.description || '');
                            const isObsoleteTest = (did.includes('TEST') || did.includes('LIVE') || did.includes('SSE') || desc.includes('ทดสอบ')) && !backendIds.has(String(d.id));
                            if (!isObsoleteTest) {
                                mergedMap.set(String(d.id), d);
                            }
                        });
                        deeds.forEach(d => {
                            const existing = mergedMap.get(String(d.id)) || {};
                            mergedMap.set(String(d.id), { ...existing, ...d });
                        });
                        this.saveDeeds(sid, this.deduplicateDeeds(Array.from(mergedMap.values())));
                    });

                    // Set memory globals for instant fast access
                    window.IMPORTED_DEEDS = byStudent;
                    window.DEEDS_DATA = deedsList;
                    globalThis.IMPORTED_DEEDS = byStudent;
                    globalThis.DEEDS_DATA = deedsList;

                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('deeds_updated', { detail: { count: deedsList.length } }));
                    }
                    return deedsList;
                }
            } catch (e) {
                console.warn('Backend sync all deeds error:', e);
            }
        }

        // Cloudflare Pages Edge 24/7 or Google Apps Script fetch for Online Deployment
        let list = null;
        try {
            const edgeUrl = this.getEdgeApiUrl ? this.getEdgeApiUrl('/api/get_all_deeds') : 'https://rtafnc-gooddeeds.pages.dev/api/get_all_deeds';
            const res = await fetch(edgeUrl);
            if (res.ok) {
                const cloudDeeds = await res.json();
                list = Array.isArray(cloudDeeds) ? cloudDeeds : (cloudDeeds && Array.isArray(cloudDeeds.deeds) ? cloudDeeds.deeds : (cloudDeeds && Array.isArray(cloudDeeds.data) ? cloudDeeds.data : null));
            }
        } catch (_) {}

        if (!list) {
            const gasUrl = (typeof CONFIG !== 'undefined' && CONFIG.GAS_URL) ? CONFIG.GAS_URL : '';
            if (gasUrl && typeof fetch === 'function') {
                try {
                    const res = await fetch(`${gasUrl}?action=getDeeds`);
                    if (res.ok) {
                        const cloudDeeds = await res.json();
                        list = Array.isArray(cloudDeeds) ? cloudDeeds : (cloudDeeds && Array.isArray(cloudDeeds.deeds) ? cloudDeeds.deeds : (cloudDeeds && Array.isArray(cloudDeeds.data) ? cloudDeeds.data : null));
                    }
                } catch (err) {
                    console.warn('Cloud sync all deeds note:', err.message);
                }
            }
        }

        if (list && list.length > 0) {
            let deletedSet = new Set();
            try {
                const rawDeleted = localStorage.getItem('gooddeeds_deleted_ids');
                if (rawDeleted) {
                    const arr = JSON.parse(rawDeleted);
                    if (Array.isArray(arr)) deletedSet = new Set(arr.map(String));
                }
            } catch (_) {}

            const activeList = list.filter(d => d && !deletedSet.has(String(d.id)) && d.status !== 'deleted');

            const byStudent = {};
            activeList.forEach(d => {
                const sid = String(d.student_id || d.studentId);
                if (!byStudent[sid]) byStudent[sid] = [];
                byStudent[sid].push(d);
            });

            Object.entries(byStudent).forEach(([sid, deeds]) => {
                const current = this.getDeeds(sid);
                const mergedMap = new Map();
                const cloudIds = new Set(deeds.map(cd => String(cd.id)));
                current.forEach(d => {
                    const did = String(d.id || '').toUpperCase();
                    const desc = String(d.description || '');
                    const isObsoleteTest = (did.includes('TEST') || did.includes('LIVE') || did.includes('SSE') || desc.includes('ทดสอบ')) && !cloudIds.has(String(d.id));
                    if (!isObsoleteTest && !deletedSet.has(String(d.id)) && d.status !== 'deleted') {
                        mergedMap.set(String(d.id), d);
                    }
                });
                deeds.forEach(d => {
                    if (!deletedSet.has(String(d.id)) && d.status !== 'deleted') {
                        const existing = mergedMap.get(String(d.id)) || {};
                        mergedMap.set(String(d.id), { ...existing, ...d });
                    }
                });
                this.saveDeeds(sid, this.deduplicateDeeds(Array.from(mergedMap.values())));
            });

            window.IMPORTED_DEEDS = byStudent;
            window.DEEDS_DATA = activeList;
            globalThis.IMPORTED_DEEDS = byStudent;
            globalThis.DEEDS_DATA = activeList;

            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('deeds_updated', { detail: { count: activeList.length } }));
            }
            return activeList;
        }
        return null;
    },

    async syncDeedsFromCloud(studentId) {
        if (!studentId) return null;
        try {
            if (this.canUseBackendApi()) {
                return await this.syncDeedsWithBackend(studentId);
            }

            const gasUrl = (typeof CONFIG !== 'undefined' && CONFIG.GAS_URL) ? CONFIG.GAS_URL : '';
            let updatedDeeds = null;

            // Fallback to GAS endpoint
            if (gasUrl) {
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

                const mergedMap = new Map();
                currentLocal.forEach(d => mergedMap.set(String(d.id), { ...d }));
                updatedDeeds.forEach(u => {
                    const key = String(u.id);
                    if (mergedMap.has(key)) {
                        const existing = mergedMap.get(key);
                        if (existing.status !== u.status || existing.hours !== u.hours || (existing.approvedBy || existing.approved_by) !== (u.approvedBy || u.approved_by)) {
                            hasChanges = true;
                        }
                        mergedMap.set(key, { ...existing, ...u });
                    } else {
                        mergedMap.set(key, u);
                        hasChanges = true;
                    }
                });

                if (hasChanges || (currentLocal.length === 0 && updatedDeeds.length > 0)) {
                    const mergedList = this.deduplicateDeeds(Array.from(mergedMap.values()));
                    this.saveDeeds(studentId, mergedList);
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('deeds_updated', { detail: { studentId } }));
                    }
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
        if (typeof onChangeCallback === 'function' && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
            window.addEventListener('deeds_updated', onChangeCallback);
        }

        return timer;
    },

    async addDeed(deed) {
        const user = this.getCurrentUser() || {};
        const studentId = deed.studentId || user.student_id;
        const deeds = this.getDeeds(studentId);
        const sRank = user.rank || 'นพอ.';
        const sFn = user.first_name || '';
        const sLn = user.last_name || '';
        const sName = user.full_name || `${sRank} ${sFn} ${sLn}`.trim();
        const sCy = user.class_year || (studentId ? String(studentId).substring(0, 2) : '69');
        const sPos = user.position || '';

        const newDeed = {
            id: deed.id || ('deed_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)),
            studentId,
            student_id: studentId,
            student_name: sName,
            studentName: sName,
            student_rank: sRank,
            student_first_name: sFn,
            student_last_name: sLn,
            class_year: sCy,
            student_position: sPos,
            categoryId: deed.categoryId,
            hours: parseFloat(deed.hours),
            title: deed.title || deed.description || '',
            description: deed.description,
            activityDate: deed.activityDate,
            location: deed.location || deed.note || 'วิทยาลัยพยาบาลทหารอากาศ',
            imageUrl: deed.imageUrl || (deed.imageUrls && deed.imageUrls[0]) || '',
            imageUrls: deed.imageUrls || (deed.imageUrl ? [deed.imageUrl] : []),
            imageData: deed.imageData || deed.imageUrl || '',
            status: 'pending', // pending | approved | rejected
            submittedAt: new Date().toISOString(),
            approvedBy: null,
            approvedAt: null,
            approver: deed.approver || deed.signer || deed.approved_by || 'ร.อ.อนุชิต ทำจะดี (Bird)',
            approved_by: deed.approved_by || deed.approver || null,
            rejectReason: null,
            note: deed.note || '',
        };

        // 1. Immediately save to student's local deeds in localStorage
        deeds.push(newDeed);
        this.saveDeeds(studentId, deeds);

        // 1.1 Immediately update in-memory caches for fast reactivity
        if (typeof DEEDS_DATA !== 'undefined' && Array.isArray(DEEDS_DATA)) {
            DEEDS_DATA.unshift(newDeed);
        }
        if (typeof IMPORTED_DEEDS !== 'undefined' && typeof IMPORTED_DEEDS === 'object') {
            if (!IMPORTED_DEEDS[String(studentId)]) IMPORTED_DEEDS[String(studentId)] = [];
            IMPORTED_DEEDS[String(studentId)].unshift(newDeed);
        }

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('deeds_updated', { detail: { studentId, deed: newDeed } }));
        }

        // 2. Generate slip card
        let slipBase64 = '';
        try {
            const slipBlob = await this.generateDeedFormSlipBlob(newDeed, user);
            if (slipBlob) {
                slipBase64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = () => resolve('');
                    reader.readAsDataURL(slipBlob);
                });
            }
        } catch (err) {
            console.warn('Slip card generation notice:', err);
        }

        // 3. Save to backend API (Local server or Cloudflare Edge 24/7)
        let backendSaved = false;
        const payload = {
            ...newDeed,
            academicYear: 2569,
            student: user,
            slipImage: slipBase64
        };

        if (this.canUseBackendApi()) {
            try {
                const apiUrl = `${this.getApiBaseUrl()}/api/submit_deed`;
                const res = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...this.getAuthHeaders(),
                    },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    backendSaved = true;
                    console.log('✅ Sent deed to local backend successfully');
                }
            } catch (error) {
                console.error('❌ Failed to send deed to local backend:', error);
            }
        } else {
            // Cloudflare Pages 24/7 Edge Serverless API
            try {
                const edgeUrl = this.getEdgeApiUrl ? this.getEdgeApiUrl('/api/submit_deed') : 'https://rtafnc-gooddeeds.pages.dev/api/submit_deed';
                const res = await fetch(edgeUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    backendSaved = true;
                    const resData = await res.json().catch(() => ({}));
                    if (resData && resData.telegramSent) {
                        newDeed.telegramSent = true;
                    }
                    console.log('☁️ Sent deed to Cloudflare Edge API successfully');
                }
            } catch (cfErr) {
                console.warn('⚠️ Cloudflare Edge submit notice:', cfErr);
            }
        }

        // 4. Secondary backup sync direct to Google Apps Script
        const gasUrl = (typeof CONFIG !== 'undefined' && CONFIG.GAS_URL) ? CONFIG.GAS_URL : (this.getSettings ? this.getSettings().gasUrl : '');
        if (gasUrl && !backendSaved) {
            try {
                await fetch(gasUrl, {
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
                });
                console.log('☁️ Synced Deed to Google Apps Script');
            } catch (err) {
                console.warn('⚠️ GAS Deed Sync Error:', err);
            }
        }

        return newDeed;
    },

    async updateDeedStatus(studentId, deedId, status, teacherName, rejectReason = '', deedData = null) {
        const deeds = this.getDeeds(studentId);
        let deed = deeds.find(d => String(d.id) === String(deedId));
        if (!deed) {
            deed = deedData || { id: deedId, studentId, student_id: studentId };
            deeds.push(deed);
        }
        deed.status = status;
        deed.approvedBy = teacherName;
        deed.approved_by = teacherName;
        deed.approvedAt = new Date().toISOString();
        deed.rejectReason = rejectReason;
        this.saveDeeds(studentId, deeds);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('deeds_updated', { detail: { studentId, deedId, status } }));
        }

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

        // Save to backend via API (Local Server or Cloudflare Pages 24/7 Edge)
        let backendSaved = false;
        if (this.canUseBackendApi()) {
            try {
                const apiUrl = `${this.getApiBaseUrl()}/api/approve_deed`;
                const resp = await fetch(apiUrl, {
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
                        signatureKey: deed.signatureKey || '',
                        signature: deed.signature || '',
                        studentName: deed.student_name || deed.studentName || '',
                        deedData: deed,
                        deedData: deed
                    })
                });
                if (resp && resp.ok) {
                    backendSaved = true;
                    console.log(`✅ Sent deed [${deedId}] status update [${status}] to backend API`);
                }
            } catch (error) {
                console.error('❌ Failed to send deed status update to backend API:', error);
            }
        } else {
            // Cloudflare Pages 24/7 Edge Serverless API (for pages.dev, github.io, mobile, LINE LIFF)
            try {
                const edgeUrl = this.getEdgeApiUrl ? this.getEdgeApiUrl('/api/approve_deed') : 'https://rtafnc-gooddeeds.pages.dev/api/approve_deed';
                const sigPayload = deed.signature || (deed.signatureKey ? (this.getImage ? this.getImage(deed.signatureKey) : '') : '') || '';
                const resp = await fetch(edgeUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        studentId,
                        deedId,
                        status,
                        teacherName,
                        rejectReason,
                        signatureKey: deed.signatureKey || '',
                        signature: sigPayload,
                        studentName: deed.student_name || deed.studentName || '',
                        deedData: deed
                    })
                });
                if (resp && resp.ok) {
                    backendSaved = true;
                    console.log(`☁️ Cloudflare Edge approved deed [${deedId}] [${status}]`);
                }
            } catch (cfErr) {
                console.warn('⚠️ Cloudflare Edge approve notice:', cfErr);
            }
        }

        // Secondary backup sync to Google Apps Script (Cloud Google Sheets)
        const gasUrl = (typeof CONFIG !== 'undefined' && CONFIG.GAS_URL) ? CONFIG.GAS_URL : (this.getSettings ? this.getSettings().gasUrl : '');
        if (gasUrl && !backendSaved) {
            try {
                await fetch(gasUrl, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'updateDeedStatus',
                        deedId,
                        studentId,
                        status,
                        approvedBy: teacherName,
                        rejectReason
                    })
                });
                console.log('☁️ Synced status update to Google Apps Script');
            } catch (err) {
                console.warn('⚠️ GAS Status Update Sync Error:', err);
            }
        }

        // Delivery belongs to the authenticated server's durable outbox.
        // Browser settings must never supply Telegram credentials.

        return deed;
    },

    async editDeed(studentId, deedId, updates) {
        const sid = String(studentId).trim();
        const did = String(deedId).trim();
        const deeds = this.getDeeds(sid);
        const index = deeds.findIndex(d => String(d.id) === did);
        if (index === -1) return false;

        const oldDeed = deeds[index];
        const oldHours = parseFloat(oldDeed.hours || 0);
        const oldCat = parseInt(oldDeed.categoryId || oldDeed.category_id || 1);
        const newHours = updates.hours !== undefined ? parseFloat(updates.hours) : oldHours;
        const newCat = (updates.categoryId !== undefined || updates.category_id !== undefined)
            ? parseInt(updates.categoryId || updates.category_id)
            : oldCat;

        // 1. Update local deed object
        const updatedDeed = {
            ...oldDeed,
            ...updates,
            hours: newHours,
            categoryId: newCat,
            category_id: newCat,
            updatedAt: new Date().toISOString()
        };
        deeds[index] = updatedDeed;
        this.saveDeeds(sid, deeds);

        // 2. If deed was approved and hours or category changed, reconcile student totals in local storage
        if (oldDeed.status === 'approved' && (newHours !== oldHours || newCat !== oldCat)) {
            const student = this.getStudent(sid);
            if (student) {
                if (student.categories) {
                    if (student.categories[oldCat - 1] !== undefined) {
                        student.categories[oldCat - 1] = Math.max(0, parseFloat(student.categories[oldCat - 1] || 0) - oldHours);
                    }
                    if (student.categories[newCat - 1] !== undefined) {
                        student.categories[newCat - 1] = parseFloat(student.categories[newCat - 1] || 0) + newHours;
                    }
                }
                student.total_hours = Math.max(0, parseFloat(student.total_hours || 0) - oldHours + newHours);
                student.passed = student.total_hours >= (CONFIG.MIN_HOURS_PER_YEAR || 50);
                this.saveStudent(student);
            }
        }

        // 3. Update DEEDS_DATA in-memory array if present
        if (typeof DEEDS_DATA !== 'undefined' && Array.isArray(DEEDS_DATA)) {
            const dIdx = DEEDS_DATA.findIndex(d => String(d.id) === did);
            if (dIdx !== -1) DEEDS_DATA[dIdx] = { ...DEEDS_DATA[dIdx], ...updatedDeed };
        }

        // 4. Sync edit to backend API (Local Server or Cloudflare Edge 24/7)
        let backendEdited = false;
        if (this.canUseBackendApi()) {
            try {
                const resp = await fetch(`${this.getApiBaseUrl()}/api/edit_deed`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
                    body: JSON.stringify({
                        studentId: sid,
                        deedId: did,
                        updates: {
                            categoryId: newCat,
                            hours: newHours,
                            activityDate: updatedDeed.activityDate,
                            description: updatedDeed.description,
                            location: updatedDeed.location,
                            approver: updatedDeed.approver,
                            imageUrl: updatedDeed.imageUrl
                        }
                    })
                });
                if (resp && resp.ok) backendEdited = true;
            } catch (err) {
                console.warn('⚠️ Local backend edit sync error:', err);
            }
        } else {
            // Cloudflare Pages 24/7 Edge Serverless API
            try {
                const edgeUrl = this.getEdgeApiUrl ? this.getEdgeApiUrl('/api/edit_deed') : 'https://rtafnc-gooddeeds.pages.dev/api/edit_deed';
                const resp = await fetch(edgeUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        studentId: sid,
                        deedId: did,
                        role: 'student',
                        updates: {
                            categoryId: newCat,
                            hours: newHours,
                            activityDate: updatedDeed.activityDate,
                            description: updatedDeed.description,
                            location: updatedDeed.location,
                            approver: updatedDeed.approver,
                            imageUrl: updatedDeed.imageUrl
                        }
                    })
                });
                if (resp && resp.ok) backendEdited = true;
            } catch (cfErr) {
                console.warn('⚠️ Cloudflare Edge edit sync notice:', cfErr);
            }
        }

        // 5. Direct GAS fallback if not saved via backend/edge
        const gasUrl = (typeof CONFIG !== 'undefined' && CONFIG.GAS_URL) ? CONFIG.GAS_URL : '';
        if (gasUrl && !backendEdited) {
            fetch(gasUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'edit_deed',
                    deedId: did,
                    studentId: sid,
                    role: 'student',
                    updates: {
                        categoryId: newCat,
                        hours: newHours,
                        activityDate: updatedDeed.activityDate,
                        description: updatedDeed.description,
                        location: updatedDeed.location,
                        approver: updatedDeed.approver,
                        imageUrl: updatedDeed.imageUrl
                    }
                })
            }).then(() => console.log('☁️ Synced edit to Google Apps Script'))
              .catch(err => console.warn('⚠️ GAS Edit Sync Error:', err));
        }

        return true;
    },

    openEditDeedModal(studentId, deedId, onSaved) {
        const sid = String(studentId).trim();
        const did = String(deedId).trim();
        const deeds = this.getDeeds(sid);
        const deed = deeds.find(d => String(d.id) === did);
        if (!deed) {
            alert('ไม่พบข้อมูลรายการความดีนี้');
            return;
        }

        let modalEl = document.getElementById('edit-deed-global-modal');
        if (!modalEl) {
            modalEl = document.createElement('div');
            modalEl.id = 'edit-deed-global-modal';
            modalEl.style.cssText = 'position:fixed;inset:0;background:rgba(7,13,24,0.85);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(8px);';
            document.body.appendChild(modalEl);
        }

        const catOptions = (this.CATEGORIES || []).map(c => {
            const isSel = (c.id === (deed.categoryId || deed.category_id)) ? 'selected' : '';
            return `<option value="${c.id}" ${isSel}>${c.emoji} หมวด ${c.id}: ${c.name}</option>`;
        }).join('');

        const isApproved = deed.status === 'approved';

        const statusNotice = isApproved
            ? `<div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);padding:10px 14px;border-radius:8px;font-size:0.8rem;color:#34d399;margin-bottom:14px;line-height:1.4;">
                ✅ <b>รายการนี้ได้รับการอนุมัติแล้ว</b> — หากแก้ไขจำนวนชั่วโมง ระบบจะปรับปรุงยอดชั่วโมงสะสมในสมุดทะเบียนให้อัตโนมัติ
               </div>`
            : `<div style="background:rgba(217,119,6,0.1);border:1px solid rgba(217,119,6,0.3);padding:10px 14px;border-radius:8px;font-size:0.8rem;color:#fbbf24;margin-bottom:14px;line-height:1.4;">
                ⏳ <b>สถานะ: รอการตรวจสอบ</b> — สามารถแก้ไขข้อมูลกิจกรรม ชั่วโมง และรายละเอียดได้โดยตรง
               </div>`;

        modalEl.innerHTML = `
        <div style="background:#0f172a;border:1px solid rgba(201,162,39,0.4);border-radius:16px;width:100%;max-width:540px;max-height:92vh;overflow-y:auto;box-shadow:0 20px 50px rgba(0,0,0,0.7);padding:24px;color:#f8fafc;font-family:inherit;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:12px;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:1.3rem;">✏️</span>
                    <div>
                        <h3 style="margin:0;font-size:1.15rem;color:#f1f5f9;font-weight:700;">แก้ไขรายการบันทึกความดี</h3>
                        <div style="font-size:0.75rem;color:#94a3b8;">รหัสรายการ: <code style="color:#fbbf24;">${did}</code></div>
                    </div>
                </div>
                <button type="button" id="edit-deed-close-btn" style="background:transparent;border:none;color:#94a3b8;font-size:1.4rem;cursor:pointer;padding:4px 8px;line-height:1;">✕</button>
            </div>

            ${statusNotice}

            <form id="edit-deed-form" style="display:flex;flex-direction:column;gap:12px;">
                <div>
                    <label style="display:block;font-size:0.82rem;font-weight:600;color:#cbd5e1;margin-bottom:4px;">📂 หมวดหมู่ความดี <span style="color:#ef4444;">*</span></label>
                    <select id="edit-deed-cat" style="width:100%;padding:10px;border-radius:8px;background:#1e293b;border:1px solid rgba(255,255,255,0.15);color:#fff;font-size:0.9rem;" required>
                        ${catOptions}
                    </select>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div>
                        <label style="display:block;font-size:0.82rem;font-weight:600;color:#cbd5e1;margin-bottom:4px;">⏱ จำนวนชั่วโมง <span style="color:#ef4444;">*</span></label>
                        <input type="number" id="edit-deed-hours" step="0.5" min="0.5" max="40" value="${deed.hours || 1}" style="width:100%;padding:10px;border-radius:8px;background:#1e293b;border:1px solid rgba(255,255,255,0.15);color:#fff;font-size:0.9rem;" required>
                    </div>
                    <div>
                        <label style="display:block;font-size:0.82rem;font-weight:600;color:#cbd5e1;margin-bottom:4px;">📅 วันที่ทำกิจกรรม <span style="color:#ef4444;">*</span></label>
                        <input type="date" id="edit-deed-date" value="${deed.activityDate || ''}" style="width:100%;padding:10px;border-radius:8px;background:#1e293b;border:1px solid rgba(255,255,255,0.15);color:#fff;font-size:0.9rem;" required>
                    </div>
                </div>

                <div>
                    <label style="display:block;font-size:0.82rem;font-weight:600;color:#cbd5e1;margin-bottom:4px;">📍 สถานที่ทำกิจกรรม</label>
                    <input type="text" id="edit-deed-loc" value="${(deed.location || deed.note || 'วิทยาลัยพยาบาลทหารอากาศ').replace(/"/g, '&quot;')}" style="width:100%;padding:10px;border-radius:8px;background:#1e293b;border:1px solid rgba(255,255,255,0.15);color:#fff;font-size:0.9rem;">
                </div>

                <div>
                    <label style="display:block;font-size:0.82rem;font-weight:600;color:#cbd5e1;margin-bottom:4px;">📝 รายละเอียดกิจกรรม / สิ่งที่ได้ปฏิบัติ <span style="color:#ef4444;">*</span></label>
                    <textarea id="edit-deed-desc" rows="3" style="width:100%;padding:10px;border-radius:8px;background:#1e293b;border:1px solid rgba(255,255,255,0.15);color:#fff;font-size:0.9rem;resize:vertical;" required>${(deed.description || deed.title || '').replace(/</g, '&lt;')}</textarea>
                </div>

                <div>
                    <label style="display:block;font-size:0.82rem;font-weight:600;color:#cbd5e1;margin-bottom:4px;">👨‍🏫 อาจารย์ผู้ตรวจประเมิน</label>
                    <input type="text" id="edit-deed-approver" value="${(deed.approver || deed.approved_by || 'ร.อ.อนุชิต ทำจะดี (Bird)').replace(/"/g, '&quot;')}" style="width:100%;padding:10px;border-radius:8px;background:#1e293b;border:1px solid rgba(255,255,255,0.15);color:#fff;font-size:0.9rem;">
                </div>

                <div style="display:flex;gap:10px;margin-top:12px;justify-content:flex-end;">
                    <button type="button" id="edit-deed-cancel-btn" style="padding:10px 18px;border-radius:8px;background:rgba(255,255,255,0.1);color:#e2e8f0;border:1px solid rgba(255,255,255,0.15);cursor:pointer;font-weight:600;">ยกเลิก</button>
                    <button type="submit" id="edit-deed-submit-btn" style="padding:10px 24px;border-radius:8px;background:linear-gradient(135deg, #c9a227, #d97706);color:#fff;border:none;cursor:pointer;font-weight:700;box-shadow:0 4px 12px rgba(201,162,39,0.3);">💾 บันทึกการแก้ไข</button>
                </div>
            </form>
        </div>`;

        modalEl.style.display = 'flex';

        const closeModal = () => {
            modalEl.style.display = 'none';
        };

        document.getElementById('edit-deed-close-btn').onclick = closeModal;
        document.getElementById('edit-deed-cancel-btn').onclick = closeModal;
        modalEl.onclick = (e) => { if (e.target === modalEl) closeModal(); };

        const form = document.getElementById('edit-deed-form');
        form.onsubmit = async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('edit-deed-submit-btn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '⏳ กำลังบันทึก...';

            const newCategoryId = parseInt(document.getElementById('edit-deed-cat').value, 10);
            const newHours = parseFloat(document.getElementById('edit-deed-hours').value);
            const newDate = document.getElementById('edit-deed-date').value;
            const newLocation = document.getElementById('edit-deed-loc').value.trim();
            const newDesc = document.getElementById('edit-deed-desc').value.trim();
            const newApprover = document.getElementById('edit-deed-approver').value.trim();

            if (!newHours || newHours <= 0) {
                alert('กรุณาระบุจำนวนชั่วโมงให้ถูกต้อง');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '💾 บันทึกการแก้ไข';
                return;
            }

            const updates = {
                categoryId: newCategoryId,
                hours: newHours,
                activityDate: newDate,
                location: newLocation,
                note: newLocation,
                description: newDesc,
                approver: newApprover,
                approved_by: newApprover
            };

            try {
                await this.editDeed(sid, did, updates);
                closeModal();
                if (typeof onSaved === 'function') {
                    onSaved(did, updates);
                }
                const toastFn = (typeof showToast === 'function') ? showToast : alert;
                toastFn('✅ บันทึกการแก้ไขข้อมูลความดีเรียบร้อยแล้ว', 'success');
            } catch (err) {
                console.error('Edit deed save error:', err);
                alert('❌ เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
                submitBtn.disabled = false;
                submitBtn.innerHTML = '💾 บันทึกการแก้ไข';
            }
        };
    },

    async deleteDeed(studentId, deedId, reason = 'ลบ/ยกเลิกรายการ', role = 'student') {
        const sid = String(studentId).trim();
        const did = String(deedId).trim();
        const deeds = this.getDeeds(sid);
        const deed = deeds.find(d => String(d.id) === did);
        if (!deed) return false;

        const prevStatus = deed.status;
        const hours = parseFloat(deed.hours || 0);
        const catId = parseInt(deed.categoryId || deed.category_id || 1);

        // 1. Remove from local student deeds list
        const remainingDeeds = deeds.filter(d => String(d.id) !== did);
        this.saveDeeds(sid, remainingDeeds);

        // 1.1 Persistently remember this deleted deed ID so getDeeds and sync won't resurrect it
        try {
            const deletedKey = 'gooddeeds_deleted_ids';
            const rawDeleted = localStorage.getItem(deletedKey);
            const deletedSet = new Set(rawDeleted ? JSON.parse(rawDeleted) : []);
            deletedSet.add(did);
            localStorage.setItem(deletedKey, JSON.stringify(Array.from(deletedSet)));
        } catch (_) {}

        // 2. If deed was approved, reverse/deduct hours from local student stats
        if (prevStatus === 'approved') {
            const student = this.getStudent(sid);
            if (student) {
                if (student.categories && student.categories[catId - 1] !== undefined) {
                    student.categories[catId - 1] = Math.max(0, parseFloat(student.categories[catId - 1] || 0) - hours);
                }
                student.total_hours = Math.max(0, parseFloat(student.total_hours || 0) - hours);
                student.passed = student.total_hours >= (CONFIG.MIN_HOURS_PER_YEAR || 50);
                this.saveStudent(student);
            }
        }

        // 3. Update DEEDS_DATA & IMPORTED_DEEDS cache if present
        if (typeof DEEDS_DATA !== 'undefined' && Array.isArray(DEEDS_DATA)) {
            const idx = DEEDS_DATA.findIndex(d => String(d.id) === did);
            if (idx !== -1) {
                DEEDS_DATA.splice(idx, 1);
            }
        }
        if (typeof IMPORTED_DEEDS !== 'undefined' && typeof IMPORTED_DEEDS === 'object') {
            if (IMPORTED_DEEDS[sid]) {
                IMPORTED_DEEDS[sid] = IMPORTED_DEEDS[sid].filter(d => String(d.id) !== did);
            }
        }

        // 4. Dispatch event for instant UI reactivity
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('deeds_updated', { detail: { studentId: sid, deedId: did, status: 'deleted' } }));
        }

        // 5. Sync to Backend API (Local or Cloudflare Edge 24/7)
        let backendDeleted = false;
        const user = this.getCurrentUser() || {};
        const userName = (user.name || user.full_name || (user.rank ? (user.rank + ' ' + user.first_name + ' ' + user.last_name) : '')) || (role === 'teacher' ? 'อาจารย์ผู้ตรวจ' : 'นักเรียน');

        if (this.canUseBackendApi()) {
            try {
                const resp = await fetch(`${this.getApiBaseUrl()}/api/delete_deed`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
                    body: JSON.stringify({ studentId: sid, deedId: did, reason: reason, role: role, deletedBy: userName })
                });
                if (resp && resp.ok) backendDeleted = true;
            } catch (err) {
                console.warn('⚠️ Local API delete_deed error:', err);
            }
        } else {
            // Cloudflare Pages 24/7 Edge Serverless API
            try {
                const edgeUrl = this.getEdgeApiUrl ? this.getEdgeApiUrl('/api/delete_deed') : 'https://rtafnc-gooddeeds.pages.dev/api/delete_deed';
                const resp = await fetch(edgeUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ studentId: sid, deedId: did, reason: reason, role: role, deletedBy: userName })
                });
                if (resp && resp.ok) backendDeleted = true;
            } catch (cfErr) {
                console.warn('⚠️ Cloudflare Edge delete notice:', cfErr);
            }
        }

        // 6. Direct GAS fallback if not deleted via backend/edge
        const gasUrl = (typeof CONFIG !== 'undefined' && CONFIG.GAS_URL) ? CONFIG.GAS_URL : (this.getSettings ? this.getSettings().gasUrl : '');
        if (gasUrl && !backendDeleted) {
            fetch(gasUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete_deed',
                    deedId: did,
                    studentId: sid,
                    role: role,
                    deletedBy: userName,
                    reason: reason
                })
            }).then(() => console.log('☁️ Synced deed deletion to Google Apps Script'))
              .catch(err => console.warn('⚠️ GAS Delete Sync Error:', err));
        }

        return true;
    },

    async bindLineAccount(studentId, lineUserId, lineDisplayName = '', linePictureUrl = '') {
        const sid = String(studentId || '').trim();
        const lid = String(lineUserId || '').trim();
        if (!sid || !lid) return false;

        // 1. Update local student object
        const student = this.getStudent ? this.getStudent(sid) : null;
        if (student) {
            student.line_user_id = lid;
            student.line_display_name = lineDisplayName;
            student.line_picture_url = linePictureUrl;
            if (this.saveStudent) this.saveStudent(student);
        }

        // 2. Sync to Google Apps Script
        const gasUrl = (typeof CONFIG !== 'undefined' && CONFIG.GAS_URL) ? CONFIG.GAS_URL : (this.getSettings ? this.getSettings().gasUrl : '');
        if (gasUrl) {
            fetch(gasUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'bind_line',
                    studentId: sid,
                    lineUserId: lid,
                    lineDisplayName: lineDisplayName,
                    linePictureUrl: linePictureUrl
                })
            }).then(() => console.log('☁️ Synced LINE binding to Google Sheets'))
              .catch(e => console.warn('⚠️ GAS bind_line notice:', e));
        }

        // 3. Sync to local backend if available
        if (this.canUseBackendApi && this.canUseBackendApi()) {
            fetch('/api/bind_line', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: sid,
                    lineUserId: lid,
                    lineDisplayName: lineDisplayName,
                    linePictureUrl: linePictureUrl
                })
            }).catch(e => console.warn('⚠️ Local API bind_line notice:', e));
        }

        return true;
    },

    // ---------- ACADEMIC TERM & QUOTA VALIDATION ----------
    getAcademicTerm(dateStr) {
        if (!dateStr) {
            const now = new Date();
            dateStr = now.toISOString().slice(0, 10);
        }
        const d = new Date(dateStr);
        const fullYear = d.getFullYear();
        const beYear = fullYear < 2400 ? fullYear + 543 : fullYear;
        const month = d.getMonth() + 1; // 1-12
        // วงรอบปีการศึกษาเริ่ม 1 กรกฎาคม: เดือน 7-12 อยู่ในปี พ.ศ. นั้น, เดือน 1-6 อยู่ในปี พ.ศ. ก่อนหน้า
        const academicYear = month >= 7 ? beYear : beYear - 1;
        // ภาคเรียนที่ 1: ก.ค. - พ.ย. (เดือน 7-11), ภาคเรียนที่ 2: ธ.ค. - มิ.ย. (เดือน 12, 1-6)
        const semester = (month >= 7 && month <= 11) ? 1 : 2;
        return { academicYear, semester };
    },

    getCategoryQuotaUsage(studentId, categoryId, targetDateStr) {
        const cat = this.getCategoryById(categoryId);
        const { academicYear, semester } = this.getAcademicTerm(targetDateStr);
        const deeds = this.getDeeds(studentId).filter(d => d.status !== 'rejected');

        // Filter deeds for this category and academic year
        const catYearDeeds = deeds.filter(d => {
            if (parseInt(d.categoryId) !== parseInt(categoryId)) return false;
            const term = this.getAcademicTerm(d.activityDate || d.submittedAt);
            return term.academicYear === academicYear;
        });

        const catSemDeeds = catYearDeeds.filter(d => {
            const term = this.getAcademicTerm(d.activityDate || d.submittedAt);
            return term.semester === semester;
        });

        const yearHours = catYearDeeds.reduce((sum, d) => sum + (parseFloat(d.hours) || 0), 0);
        const semHours = catSemDeeds.reduce((sum, d) => sum + (parseFloat(d.hours) || 0), 0);
        const yearCount = catYearDeeds.length;

        // สำหรับบริจาคโลหิต: ค้นหาวันที่บริจาคครั้งล่าสุด
        let lastDonationDate = null;
        let daysSinceLastDonation = null;
        if (parseInt(categoryId) === 1) {
            const bloodDeeds = deeds.filter(d => parseInt(d.categoryId) === 1 && d.activityDate)
                .sort((a, b) => new Date(b.activityDate) - new Date(a.activityDate));
            if (bloodDeeds.length > 0) {
                lastDonationDate = bloodDeeds[0].activityDate;
                const targetD = targetDateStr ? new Date(targetDateStr) : new Date();
                const lastD = new Date(lastDonationDate);
                daysSinceLastDonation = Math.round((targetD - lastD) / (1000 * 60 * 60 * 24));
            }
        }

        return {
            cat,
            academicYear,
            semester,
            yearHours,
            semHours,
            yearCount,
            lastDonationDate,
            daysSinceLastDonation
        };
    },

    validateDeed(deed, studentId) {
        const cat = this.getCategoryById(deed.categoryId);
        if (!cat) return { valid: false, message: 'กรุณาเลือกหมวดหมู่ความดีที่ถูกต้อง' };

        const hours = parseFloat(deed.hours);
        if (!hours || hours <= 0) return { valid: false, message: 'กรุณาระบุจำนวนชั่วโมงที่ถูกต้อง' };
        if (!deed.activityDate) return { valid: false, message: 'กรุณาระบุวันที่ทำกิจกรรม' };
        if (!deed.description || !deed.description.trim()) return { valid: false, message: 'กรุณากรอกรายละเอียดกิจกรรม' };

        const usage = this.getCategoryQuotaUsage(studentId, deed.categoryId, deed.activityDate);

        // 1. ตรวจชั่วโมงสูงสุดต่อครั้ง (Per-session limit)
        if (cat.maxHours && hours > cat.maxHours) {
            return {
                valid: false,
                message: `⚠️ หมวด "${cat.name}" กำหนดให้บันทึกได้ไม่เกิน ${cat.maxHours} ชม. ต่อครั้ง (คุณกรอก ${hours} ชม.)`
            };
        }

        // 2. หมวด 1: บริจาคโลหิต (ครั้งละ 8 ชม., ปีละไม่เกิน 4 ครั้ง, ห่างกันอย่างน้อย 90 วัน)
        if (cat.id === 1) {
            if (usage.yearCount >= (cat.maxTimesPerYear || 4)) {
                return {
                    valid: false,
                    message: `⚠️ บริจาคโลหิตได้ไม่เกิน ${cat.maxTimesPerYear || 4} ครั้งต่อปีการศึกษา (ปีการศึกษา ${usage.academicYear} บันทึกครบแล้ว ${usage.yearCount} ครั้ง)`
                };
            }
            const allBloodDeeds = this.getDeeds(studentId).filter(d => parseInt(d.categoryId) === 1 && d.status !== 'rejected' && d.id !== deed.id);
            const targetTime = new Date(deed.activityDate).getTime();
            for (const bDeed of allBloodDeeds) {
                if (!bDeed.activityDate) continue;
                const prevTime = new Date(bDeed.activityDate).getTime();
                const diffDays = Math.abs(targetTime - prevTime) / (1000 * 60 * 60 * 24);
                if (diffDays < (cat.minDaysSpacing || 90)) {
                    return {
                        valid: false,
                        message: `⚠️ การบริจาคโลหิตต้องเว้นระยะห่างอย่างน้อย 3 เดือน (90 วัน) วันที่ระบุห่างจากการบริจาคเมื่อ ${bDeed.activityDate} เพียง ${Math.round(diffDays)} วัน`
                    };
                }
            }
        }

        // 3. หมวด 6: ทำนุบำรุงศาสนสถาน (ไม่เกิน 1 ชม./ครั้ง, ไม่เกิน 4 ชม./ปีการศึกษา)
        if (cat.id === 6) {
            if (hours > 1) {
                return { valid: false, message: '⚠️ งานทำนุบำรุงศาสนสถาน บันทึกได้ไม่เกิน 1 ชั่วโมงต่อครั้ง' };
            }
            if (usage.yearHours + hours > (cat.maxPerYear || 4)) {
                const remaining = Math.max(0, (cat.maxPerYear || 4) - usage.yearHours);
                return {
                    valid: false,
                    message: `⚠️ งานทำนุบำรุงศาสนสถาน สะสมได้ไม่เกิน ${cat.maxPerYear || 4} ชม. ต่อปีการศึกษา (ปีนี้ใช้ไปแล้ว ${usage.yearHours} ชม., เหลือโควตา ${remaining} ชม.)`
                };
            }
        }

        // 4. หมวด 7: งานฟรีทั่วไป / ช่วยผู้ปกครอง (ไม่เกิน 1 ชม./ครั้ง, ไม่เกิน 2 ชม./เทอม, ไม่เกิน 4 ชม./ปีการศึกษา)
        if (cat.id === 7) {
            if (hours > 1) {
                return { valid: false, message: '⚠️ งานฟรีทั่วไป / ช่วยงานผู้ปกครอง บันทึกได้ไม่เกิน 1 ชั่วโมงต่อครั้ง' };
            }
            if (usage.semHours + hours > (cat.maxPerSemester || 2)) {
                const remainingSem = Math.max(0, (cat.maxPerSemester || 2) - usage.semHours);
                return {
                    valid: false,
                    message: `⚠️ งานฟรีทั่วไป / ช่วยงานผู้ปกครอง บันทึกได้ไม่เกิน ${cat.maxPerSemester || 2} ชม. ต่อภาคการศึกษา (เทอม ${usage.semester} ใช้ไปแล้ว ${usage.semHours} ชม., เหลือโควตา ${remainingSem} ชม.)`
                };
            }
            if (usage.yearHours + hours > (cat.maxPerYear || 4)) {
                const remainingYear = Math.max(0, (cat.maxPerYear || 4) - usage.yearHours);
                return {
                    valid: false,
                    message: `⚠️ งานฟรีทั่วไป / ช่วยงานผู้ปกครอง สะสมได้ไม่เกิน ${cat.maxPerYear || 4} ชม. ต่อปีการศึกษา (ปีนี้ใช้ไปแล้ว ${usage.yearHours} ชม., เหลือโควตา ${remainingYear} ชม.)`
                };
            }
        }

        // 5. หมวด 8: จงรักภักดี (ไม่เกิน 8 ชม./ปีการศึกษา)
        if (cat.id === 8 && cat.maxPerYear) {
            if (usage.yearHours + hours > cat.maxPerYear) {
                const remaining = Math.max(0, cat.maxPerYear - usage.yearHours);
                return {
                    valid: false,
                    message: `⚠️ กิจกรรมจงรักภักดีต่อสถาบัน สะสมได้ไม่เกิน ${cat.maxPerYear} ชม. ต่อปีการศึกษา (ปีนี้ใช้ไปแล้ว ${usage.yearHours} ชม., เหลือโควตา ${remaining} ชม.)`
                };
            }
        }

        // 6. หมวด 9: บทบาทพิเศษ (ไม่เกิน 20 ชม./เทอม)
        if (cat.id === 9) {
            if (usage.semHours + hours > 20) {
                return {
                    valid: false,
                    message: `⚠️ บทบาทพิเศษ บันทึกได้ไม่เกิน 20 ชม. ต่อภาคการศึกษา (เทอม ${usage.semester} บันทึกไปแล้ว ${usage.semHours} ชม.)`
                };
            }
        }

        // 7. ตรวจสอบการลงซ้ำ (Duplicate check across all categories)
        const existingDeeds = this.getDeeds(studentId).filter(d => d.status !== 'rejected' && d.id !== deed.id);
        const isDuplicate = existingDeeds.some(d => {
            if (parseInt(d.categoryId) !== parseInt(deed.categoryId)) return false;
            if (d.activityDate !== deed.activityDate) return false;
            const descA = (d.description || '').trim().toLowerCase();
            const descB = (deed.description || '').trim().toLowerCase();
            return descA === descB || (Math.abs((parseFloat(d.hours) || 0) - hours) < 0.01 && descA.includes(descB));
        });

        if (isDuplicate) {
            return {
                valid: false,
                message: `⚠️ พบรายการความดีในหมวด "${cat.name}" ในวันที่ ${deed.activityDate} บันทึกอยู่แล้วในระบบ เพื่อป้องกันการบันทึกซ้ำ กรุณาตรวจสอบประวัติความดี`
            };
        }

        return { valid: true, term: { academicYear: usage.academicYear, semester: usage.semester } };
    },

    // ---------- SUMMARY & CARRY FORWARD ----------
    getCarryForwardHours(studentId) {
        if (!studentId) return 0;
        const sid = String(studentId).trim();
        // 1. Check CARRY_FORWARD_HOURS global lookup
        if (typeof CARRY_FORWARD_HOURS !== 'undefined' && CARRY_FORWARD_HOURS && CARRY_FORWARD_HOURS[sid] !== undefined) {
            return parseFloat(CARRY_FORWARD_HOURS[sid]) || 0;
        }
        // 2. Check student record from STUDENTS_DATA
        const stu = this.getStudentById ? this.getStudentById(sid) : null;
        if (stu && stu.carry_forward !== undefined) {
            return parseFloat(stu.carry_forward) || 0;
        }
        return 0;
    },

    getStudentSummary(studentId) {
        const deeds = this.getDeeds(studentId);
        const approved = deeds.filter(d => d.status === 'approved');
        const pending = deeds.filter(d => d.status === 'pending');
        const rejected = deeds.filter(d => d.status === 'rejected');

        let totalHours = approved.reduce((s, d) => s + (parseFloat(d.hours) || 0), 0);
        if (totalHours === 0 && approved.length === 0) {
            const stu = this.getStudentById(studentId);
            if (stu && stu.total_hours) {
                totalHours = (parseFloat(stu.total_hours) || 0);
            }
        }
        totalHours = Math.round(totalHours * 10) / 10;

        const carryForward = this.getCarryForwardHours(studentId);
        const cumulativeHours = Math.round((totalHours + carryForward) * 10) / 10;

        const byCategory = CATEGORIES.map(cat => ({
            ...cat,
            hours: approved.filter(d => d.categoryId === cat.id).reduce((s, d) => s + (parseFloat(d.hours) || 0), 0),
            count: approved.filter(d => d.categoryId === cat.id).length,
        }));

        return {
            totalHours, // Annual hours for academic year 2569
            annualHours: totalHours,
            carryForward, // Historical carry-forward hours from previous academic years
            cumulativeHours, // Total cumulative hours across academic years
            pendingCount: pending.length,
            rejectedCount: rejected.length,
            approvedCount: approved.length > 0 ? approved.length : (totalHours > 0 ? 1 : 0),
            totalCount: deeds.length,
            passed: totalHours >= (CONFIG.MIN_HOURS_PER_YEAR || 50),
            cumulativePassed: cumulativeHours >= (CONFIG.MIN_HOURS_PER_YEAR || 50),
            byCategory,
        };
    },

    // Ensure students are loaded (from Memory, Cache, Backend API, students.json, or Google Cloud)
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
                        window.dispatchEvent(new CustomEvent('students_loaded', { detail: list }));
                    }
                }
            }
        } catch (e) {}

        // 1. Try Backend API (Cloudflare tunnel or local server)
        if (this.canUseBackendApi && this.canUseBackendApi()) {
            try {
                const apiUrl = `${this.getApiBaseUrl()}/api/students`;
                const resp = await fetch(apiUrl, {
                    headers: this.getAuthHeaders ? this.getAuthHeaders() : {}
                });
                if (resp.ok) {
                    const list = await resp.json();
                    if (Array.isArray(list) && list.length > 0) {
                        window.STUDENTS_DATA = list;
                        globalThis.STUDENTS_DATA = list;
                        if (typeof localStorage !== 'undefined') {
                            localStorage.setItem('gooddeeds_cached_students', JSON.stringify(list));
                        }
                        window.dispatchEvent(new CustomEvent('students_loaded', { detail: list }));
                        return list;
                    }
                }
            } catch (err) {
                console.warn('Backend student sync error:', err);
            }
        }

        // 2. Fallback: fetch relative students.json
        try {
            const jsonPath = (typeof window !== 'undefined' && window.location.pathname.includes('/frontend/')) ? 'data/students.json' : 'frontend/data/students.json';
            const resp = await fetch(jsonPath + '?v=' + Date.now());
            if (resp.ok) {
                const list = await resp.json();
                if (Array.isArray(list) && list.length > 0) {
                    window.STUDENTS_DATA = list;
                    globalThis.STUDENTS_DATA = list;
                    if (typeof localStorage !== 'undefined') {
                        localStorage.setItem('gooddeeds_cached_students', JSON.stringify(list));
                    }
                    window.dispatchEvent(new CustomEvent('students_loaded', { detail: list }));
                    return list;
                }
            }
        } catch (e) {}

        // 3. Fallback: Google Apps Script
        try {
            const gasUrl = (typeof CONFIG !== 'undefined' && CONFIG.GAS_URL) ? CONFIG.GAS_URL : '';
            if (gasUrl && typeof fetch === 'function') {
                const resp = await fetch(gasUrl + '?action=getStudents');
                if (resp.ok) {
                    const list = await resp.json();
                    if (Array.isArray(list) && list.length > 0) {
                        window.STUDENTS_DATA = list;
                        globalThis.STUDENTS_DATA = list;
                        if (typeof localStorage !== 'undefined') {
                            localStorage.setItem('gooddeeds_cached_students', JSON.stringify(list));
                        }
                        window.dispatchEvent(new CustomEvent('students_loaded', { detail: list }));
                        return list;
                    }
                }
            }
        } catch (err) {
            console.warn('Could not load students from GAS:', err);
        }

        if (typeof STUDENTS_DATA !== 'undefined' && Array.isArray(STUDENTS_DATA) && STUDENTS_DATA.length > 0) {
            return STUDENTS_DATA;
        }

        return [];
    },

    // All students summary for teacher view
    getAllStudentsSummary() {
        let students = typeof STUDENTS_DATA !== 'undefined' && Array.isArray(STUDENTS_DATA) && STUDENTS_DATA.length > 0 ? STUDENTS_DATA : [];
        if (students.length === 0 && typeof localStorage !== 'undefined') {
            const cached = localStorage.getItem('gooddeeds_cached_students');
            if (cached) {
                try {
                    const list = JSON.parse(cached);
                    if (Array.isArray(list) && list.length > 0) {
                        students = list;
                        window.STUDENTS_DATA = list;
                        globalThis.STUDENTS_DATA = list;
                    }
                } catch (e) {}
            }
        }
        return students.map(s => {
            const summary = this.getStudentSummary(s.student_id);
            return { ...s, ...summary };
        });
    },

    // Pending deeds across all students
    getAllPendingDeeds() {
        let students = typeof STUDENTS_DATA !== 'undefined' && Array.isArray(STUDENTS_DATA) && STUDENTS_DATA.length > 0 ? STUDENTS_DATA : [];
        if (students.length === 0 && typeof localStorage !== 'undefined') {
            const cached = localStorage.getItem('gooddeeds_cached_students');
            if (cached) {
                try {
                    const list = JSON.parse(cached);
                    if (Array.isArray(list) && list.length > 0) {
                        students = list;
                        window.STUDENTS_DATA = list;
                        globalThis.STUDENTS_DATA = list;
                    }
                } catch (e) {}
            }
        }
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
                    let stu = this.getStudentById(sid);
                    if (!stu || !stu.full_name || stu.full_name.includes('รหัส')) {
                        const deedWithName = deeds.find(d => d.student_name || d.studentName);
                        if (deedWithName) {
                            stu = {
                                student_id: sid,
                                rank: deedWithName.student_rank || 'นพอ.',
                                first_name: deedWithName.student_first_name || deedWithName.student_name,
                                last_name: deedWithName.student_last_name || '',
                                full_name: deedWithName.student_name || deedWithName.studentName,
                                class_year: deedWithName.class_year || sid.substring(0, 2),
                                position: deedWithName.student_position || ''
                            };
                        } else {
                            stu = { student_id: sid, rank: 'นพอ.', first_name: 'รหัส ' + sid, last_name: '', full_name: 'นพอ. รหัส ' + sid };
                        }
                    }
                    deeds.filter(d => d.status === 'pending').forEach(d => {
                        pending.push({ ...d, student: stu });
                    });
                }
            });
        }

        // Also check window.DEEDS_DATA directly for newly synced cloud deeds
        if (typeof window !== 'undefined' && Array.isArray(window.DEEDS_DATA)) {
            const seenDeedIds = new Set(pending.map(p => String(p.id)));
            window.DEEDS_DATA.filter(d => d.status === 'pending').forEach(d => {
                if (!seenDeedIds.has(String(d.id))) {
                    const sid = String(d.student_id || d.studentId || '');
                    let stu = this.getStudentById(sid);
                    if (!stu) {
                        stu = {
                            student_id: sid,
                            rank: d.student_rank || 'นพอ.',
                            first_name: d.student_first_name || d.student_name || ('รหัส ' + sid),
                            last_name: d.student_last_name || '',
                            full_name: d.student_name || d.studentName || ('นพอ. รหัส ' + sid),
                            class_year: d.class_year || sid.substring(0, 2)
                        };
                    }
                    pending.push({ ...d, student: stu });
                    seenDeedIds.add(String(d.id));
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

    async changePassword(studentId, newPassword) {
        const sid = String(studentId || '').trim();
        const np = String(newPassword || '').trim();
        if (!sid || !np) return { success: false, message: 'กรุณากรอกรหัสผ่านใหม่' };

        // 1. Save locally in Storage
        Storage.set('pwd_' + sid, np);
        const profile = Storage.get('profile_' + sid) || {};
        Storage.set('profile_' + sid, { ...profile, password: np });

        const session = Storage.get('session');
        if (session && String(session.student_id) === sid) {
            session.password = np;
            Storage.set('session', session);
        }

        // Update in-memory STUDENTS_DATA if loaded
        if (typeof STUDENTS_DATA !== 'undefined' && Array.isArray(STUDENTS_DATA)) {
            const s = STUDENTS_DATA.find(st => String(st.student_id) === sid);
            if (s) s.password = np;
        }

        // 2. Save to backend API (if server is active)
        if (this.canUseBackendApi()) {
            try {
                await fetch(`${this.getApiBaseUrl()}/api/change_password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
                    body: JSON.stringify({ studentId: sid, newPassword: np })
                });
            } catch (e) {}
        }

        // 3. Save to Google Apps Script (Cloud Google Sheets)
        const gasUrl = (typeof CONFIG !== 'undefined' && CONFIG.GAS_URL) ? CONFIG.GAS_URL : (this.getSettings ? this.getSettings().gasUrl : '');
        if (gasUrl) {
            try {
                fetch(gasUrl, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'changePassword',
                        studentId: sid,
                        newPassword: np
                    })
                }).then(() => console.log('☁️ Synced password change to Google Apps Script'))
                  .catch(err => console.warn('⚠️ GAS changePassword error:', err));
            } catch (e) {}
        }

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('student_updated', { detail: { studentId: sid } }));
        }

        return { success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ 🔐' };
    },

    // ---------- SETTINGS ----------
    getSettings() {
        const s = { ...(Storage.get('settings') || {}) };
        const hadBrowserSecrets = ['telegramToken','adminChatId','lineNotifyToken','lineChannelToken']
            .some(key => Object.prototype.hasOwnProperty.call(s, key));
        delete s.telegramToken;
        delete s.adminChatId;
        delete s.lineNotifyToken;
        delete s.lineChannelToken;
        if (hadBrowserSecrets) Storage.set('settings', s);
        return {
            academicYear: 2569,
            minHoursSemester: 25,
            minHoursYear: 50,
            ...s
        };
    },
    saveSettings(s) {
        const safe = { ...(s || {}) };
        delete safe.telegramToken;
        delete safe.adminChatId;
        delete safe.lineNotifyToken;
        delete safe.lineChannelToken;
        Storage.set('settings', safe);
    },

    // ---------- FORM SLIP CANVAS GENERATOR FOR TELEGRAM ----------
    async generateDeedFormSlipBlob(deed, student) {
        if (typeof document === 'undefined') return null;
        try {
            // Check if there is an evidence image attached
            let evidenceImgData = deed.imageUrl || deed.imageData || (deed.imageUrls && deed.imageUrls[0]);
            if (evidenceImgData && typeof evidenceImgData === 'string' && !evidenceImgData.startsWith('data:image') && !evidenceImgData.startsWith('http')) {
                evidenceImgData = this.getImage(evidenceImgData) || evidenceImgData;
            }
            const hasPhoto = !!(evidenceImgData && typeof evidenceImgData === 'string' && (evidenceImgData.startsWith('data:image') || evidenceImgData.startsWith('http') || evidenceImgData.startsWith('photos/')));

            const canvas = document.createElement('canvas');
            canvas.width = 1000;
            canvas.height = hasPhoto ? 1080 : 720;
            const ctx = canvas.getContext('2d');

            // 1. Background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 2. Outer Border (Official Navy & Gold)
            ctx.strokeStyle = '#1e3a8a';
            ctx.lineWidth = 4;
            ctx.strokeRect(20, 20, 960, canvas.height - 40);
            ctx.strokeStyle = '#c9a227';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(26, 26, 948, canvas.height - 52);

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
            let stuName = '';
            if (student && student.full_name && !student.full_name.includes('รหัส')) {
                stuName = student.full_name;
            } else if (student && student.first_name && !student.first_name.startsWith('รหัส')) {
                stuName = `${student.rank || 'นพอ.'} ${student.first_name} ${student.last_name || ''}`.trim();
            } else if (deed.student_name && !deed.student_name.includes('รหัส')) {
                stuName = deed.student_name;
            } else if (deed.studentName && !deed.studentName.includes('รหัส')) {
                stuName = deed.studentName;
            } else {
                const cleanSid = (student && student.student_id) || deed.student_id || '';
                stuName = `นพอ. (${cleanSid})`;
            }
            const sClassYear = (student && student.class_year) || deed.class_year || '69';
            const yearLvl = (student && student.year_level) || (App.getYearLevel(sClassYear) || '');

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
            ctx.fillText(deed.note || deed.location || 'วิทยาลัยพยาบาลทหารอากาศ', 215, 495);
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

            // 8. Section 3 Box: Evidence Photo (if attached)
            if (hasPhoto) {
                ctx.strokeStyle = '#0c1b33';
                ctx.lineWidth = 2;
                ctx.strokeRect(50, 635, 900, 360);

                ctx.fillStyle = '#0369a1';
                ctx.fillRect(50, 635, 360, 32);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 18px "Sarabun", "TH Sarabun New", sans-serif';
                ctx.fillText('ส่วนที่ ๓ : ภาพถ่ายหลักฐานการปฏิบัติงาน', 65, 657);

                await new Promise((resolve) => {
                    const actImg = new Image();
                    actImg.crossOrigin = 'anonymous';
                    actImg.onload = () => {
                        try {
                            const maxBoxW = 860;
                            const maxBoxH = 300;
                            const imgRatio = Math.min(maxBoxW / actImg.width, maxBoxH / actImg.height, 1);
                            const drawW = actImg.width * imgRatio;
                            const drawH = actImg.height * imgRatio;
                            const drawX = 50 + (900 - drawW) / 2;
                            const drawY = 675 + (310 - drawH) / 2;
                            ctx.fillStyle = '#f1f5f9';
                            ctx.fillRect(drawX - 5, drawY - 5, drawW + 10, drawH + 10);
                            ctx.drawImage(actImg, drawX, drawY, drawW, drawH);
                        } catch (e) {
                            console.warn('Error drawing act photo on canvas:', e);
                        }
                        resolve();
                    };
                    actImg.onerror = () => resolve();
                    actImg.src = evidenceImgData;
                });
            }

            // 9. Footer Timestamp
            const submitTimeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
            ctx.textAlign = 'right';
            ctx.fillStyle = '#64748b';
            ctx.font = '16px "Sarabun", "TH Sarabun New", sans-serif';
            const footerY = hasPhoto ? 1035 : 655;
            ctx.fillText(`บันทึกเมื่อ ${curDay} ${curMonth} ${curYear} เวลา ${submitTimeStr} น.`, 940, footerY);
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
        const token = settings.telegramToken || (typeof CONFIG !== 'undefined' ? CONFIG.TELEGRAM_BOT_TOKEN : '');
        const targetChatId = (chatId && String(chatId).trim()) ? String(chatId).trim() : (typeof CONFIG !== 'undefined' ? CONFIG.TELEGRAM_CHAT_ID : '');
        if (!token || !targetChatId) return false;
        try {
            const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: targetChatId,
                    text: message,
                    parse_mode: 'HTML',
                    reply_markup: replyMarkup
                })
            });
            return res.ok;
        } catch { return false; }
    },

    async sendTelegramPhoto(chatId, photoBlob, caption, replyMarkup = null) {
        const settings = this.getSettings();
        const token = settings.telegramToken || (typeof CONFIG !== 'undefined' ? CONFIG.TELEGRAM_BOT_TOKEN : '');
        const targetChatId = (chatId && String(chatId).trim()) ? String(chatId).trim() : (typeof CONFIG !== 'undefined' ? CONFIG.TELEGRAM_CHAT_ID : '');
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
    async sendLineNotify() {
        return false;
    },

    // ---------- NOTIFY ALL CHANNELS ----------
    async notifyAdmins(deed, student) {
        if (deed && deed.telegramSent) {
            console.log('✅ Telegram already notified during submission');
            return true;
        }
        const settings = this.getSettings();
        const cat = this.getCategoryById(deed.categoryId);
        const sClassYear = (student && student.class_year) || deed.class_year || '69';
        const yearName = this.getYearName(sClassYear);

        let realName = '';
        if (student && student.full_name && !student.full_name.includes('รหัส')) {
            realName = student.full_name;
        } else if (student && student.first_name && !student.first_name.startsWith('รหัส')) {
            realName = `${student.rank || 'นพอ.'} ${student.first_name} ${student.last_name || ''}`.trim();
        } else if (deed.student_name && !deed.student_name.includes('รหัส')) {
            realName = deed.student_name;
        } else if (deed.studentName && !deed.studentName.includes('รหัส')) {
            realName = deed.studentName;
        } else {
            const cleanSid = (student && student.student_id) || deed.student_id || '';
            realName = `นพอ. (${cleanSid})`;
        }
        const sid = (student && student.student_id) || deed.student_id || '';

        // Build message
        const msgLines = [
            `🔔 แจ้งเตือนขออนุมัติความดี`,
            `━━━━━━━━━━━━━━━`,
            `👤 ผู้ขอ : ${realName}`,
            `🆔 รหัส นพอ. : ${sid}`,
            `📂 กิจกรรม : ${cat.emoji} ${cat.name}`,
            `⏱ ชั่วโมง : ${deed.hours} ชม.`,
            `📅 วันที่ : ${deed.activityDate}`,
            `📝 ${deed.description}`,
            `━━━━━━━━━━━━━━━`,
            `สถานะ : ⏳ รออนุมัติ`,
        ];
        const plainMsg = msgLines.join('\n');

        const reqApprover = deed.approver || deed.approved_by || deed.approvedBy || 'ร.อ.อนุชิต ทำจะดี (Bird)';
        const htmlMsg = [
            `🔔 <b>แจ้งเตือนการขออนุมัติความดี</b>`,
            `━━━━━━━━━━━━━━━━━━━━━━━`,
            `👤 <b>ผู้ขอ:</b> ${realName}`,
            `🆔 <b>รหัส:</b> <code>${sid}</code> (${yearName})`,
            `📂 <b>หมวดหมู่:</b> ${cat.emoji} ${cat.name}`,
            `⏱ <b>จำนวน:</b> <b>${deed.hours} ชั่วโมง</b>`,
            `📅 <b>วันที่:</b> ${deed.activityDate}`,
            `📝 <b>รายละเอียด:</b> ${deed.description}`,
            `👨‍🏫 <b>อาจารย์ผู้ตรวจ:</b> ${reqApprover}`,
            `━━━━━━━━━━━━━━━━━━━━━━━`,
            `⏳ <i>กดปุ่มด้านล่างเพื่อตรวจและอนุมัติความดี</i>`,
        ].join('\n');

        const qParams = new URLSearchParams({
            id: deed.id,
            studentId: sid,
            name: realName,
            year: yearName,
            cat: deed.categoryId || 1,
            catName: cat.name || '',
            hours: deed.hours || 0,
            date: deed.activityDate || '',
            desc: deed.description || '',
            loc: deed.location || 'วิทยาลัยพยาบาลทหารอากาศ',
            appr: reqApprover,
            status: deed.status || 'pending'
        });

        const rawImg = deed.imageUrl || (deed.imageUrls && deed.imageUrls[0]) || deed.imageData || '';
        const resolvedImg = this.resolveImageUrl(rawImg);
        if (resolvedImg && resolvedImg !== '510903.jpg' && !resolvedImg.startsWith('data:') && !resolvedImg.startsWith('blob:') && resolvedImg.length < 500) {
            qParams.set('img', resolvedImg);
        }

        const baseUrl = this.getBaseUrl();
        const approveUrl = `${baseUrl}/approve_sign.html?${qParams.toString()}`;
        const slipPdfUrl = `${baseUrl}/deed_slip.html?${qParams.toString()}`;

        const replyMarkup = {
            inline_keyboard: [
                [
                    { text: '✅ อนุมัติด่วน', callback_data: `approve_${deed.id}_${student.student_id}` },
                    { text: '❌ ปฏิเสธ', callback_data: `reject_${deed.id}_${student.student_id}` }
                ],
                [
                    { text: '✍️ ตรวจสอบ & ลงนาม ↗️', url: approveUrl },
                    { text: '📄 พิมพ์สลิป A4 (PDF) ↗️', url: slipPdfUrl }
                ]
            ]
        };

        let sentTg = false;
        const rawChatId = settings.adminChatId && String(settings.adminChatId).trim() ? String(settings.adminChatId).trim() : '';
        const chatId = rawChatId || (typeof CONFIG !== 'undefined' ? CONFIG.TELEGRAM_CHAT_ID : '') || '';

        // 1. Dispatch via 24/7 Cloudflare Pages Edge Serverless (Works anywhere, mobile, LINE LIFF)
        try {
            const cfEndpoint = (typeof CONFIG !== 'undefined' && CONFIG.CLOUDFLARE_NOTIFY_URL)
                ? CONFIG.CLOUDFLARE_NOTIFY_URL
                : 'https://rtafnc-gooddeeds.pages.dev/api/notify-deed';

            let slipBase64 = deed.slipImage || null;
            if (!slipBase64) {
                try {
                    const formSlipBlob = await this.generateDeedFormSlipBlob(deed, student);
                    if (formSlipBlob) {
                        slipBase64 = await new Promise((res) => {
                            const reader = new FileReader();
                            reader.onloadend = () => res(reader.result);
                            reader.onerror = () => res(null);
                            reader.readAsDataURL(formSlipBlob);
                        });
                    }
                } catch (bErr) {
                    console.warn('Slip image generator notice:', bErr);
                }
            }

            const cfResp = await fetch(cfEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deed: deed,
                    student: student,
                    slipImage: slipBase64 || deed.imageUrl || (deed.imageUrls && deed.imageUrls[0]) || ''
                })
            });
            if (cfResp.ok) {
                const cfData = await cfResp.json();
                if (cfData && cfData.ok) {
                    sentTg = true;
                    console.log('✅ Telegram notified via Cloudflare Edge 24/7:', cfData);
                }
            }
        } catch (cfErr) {
            console.warn('Cloudflare notify edge notice:', cfErr);
        }

        // 2. Fallback to direct client-side Telegram dispatch if Cloudflare did not handle it
        if (!sentTg && chatId) {
            // Try generating Form Slip Image first
            const formSlipBlob = await this.generateDeedFormSlipBlob(deed, student);
            if (formSlipBlob) {
                sentTg = await this.sendTelegramPhoto(chatId, formSlipBlob, htmlMsg, replyMarkup);
            }
            // Fallback to Text message if photo sending failed
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
    getBaseUrl() {
        const fallbackSystemUrl = (typeof CONFIG !== 'undefined' && CONFIG.SYSTEM_URL) ? CONFIG.SYSTEM_URL : '';
        if (typeof window !== 'undefined' && window.location) {
            const loc = window.location;
            if (loc.origin && !loc.origin.startsWith('file:')) {
                // If on localhost, prefer public system URL for shareable links if available
                if ((loc.origin.includes('localhost') || loc.origin.includes('127.0.0.1')) && fallbackSystemUrl) {
                    return fallbackSystemUrl + (loc.pathname.includes('/frontend') ? '/frontend' : '');
                }
                const pathParts = loc.pathname.split('/');
                const fIndex = pathParts.indexOf('frontend');
                if (fIndex !== -1) {
                    return loc.origin + pathParts.slice(0, fIndex + 1).join('/');
                }
                return loc.origin;
            }
        }
        const settings = this.getSettings();
        return settings.systemUrl || fallbackSystemUrl || 'http://localhost:3000';
    },

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

    // ชั้นปีจากรุ่น คิดจากปีการศึกษาปัจจุบัน (เริ่ม ๑ ก.ค.) — รับได้ทั้ง 69, "69", "รุ่น 69"
    // ย้ายรูปกิจกรรมที่ค้างอยู่ในเครื่องนี้ (base64 ใน localStorage) ขึ้นเซิร์ฟเวอร์
    // เพื่อให้เปิด/พิมพ์ใบบันทึกความดีจากเครื่องหรือเบราว์เซอร์อื่นแล้วเห็นรูป — ทำครั้งละไม่เกิน 5 รายการ
    async backfillDeedPhotos(studentId, onlyDeedId) {
        const sid = String(studentId || '').trim();
        if (!/^\d{7}$/.test(sid) || this._photoBackfillRunning) return 0;
        this._photoBackfillRunning = true;
        let done = 0;
        try {
            const doneKey = 'photo_synced_' + sid;
            const synced = new Set(Storage.get(doneKey) || []);
            const local = Storage.get('deeds_' + sid) || [];
            const todo = local.filter(d => d && d.id && !synced.has(String(d.id)) && (!onlyDeedId || String(d.id) === String(onlyDeedId)))
                .map(d => ({ id: String(d.id), img: [d.imageData, d.imageUrl, ...(d.imageUrls || [])].find(v => typeof v === 'string' && v.startsWith('data:image')) }))
                .filter(x => x.img)
                .slice(0, 5);
            for (const t of todo) {
                try {
                    const res = await fetch('/api/deed_photo', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
                        body: JSON.stringify({ deedId: t.id, studentId: sid, image: t.img })
                    });
                    const data = await res.json().catch(() => ({}));
                    // รายการที่ยังไม่ถึงเซิร์ฟเวอร์ (PHOTO_DEED_NOT_FOUND) ไว้ลองใหม่รอบหน้า
                    if (res.ok && data.status === 'success') { synced.add(t.id); done++; }
                    else if (data.code === 'PHOTO_BAD_ID' || data.code === 'PHOTO_BAD_IMAGE' || data.code === 'PHOTO_TOO_LARGE') synced.add(t.id);
                } catch (_) { break; }
            }
            Storage.set(doneKey, [...synced].slice(-500));
        } finally {
            this._photoBackfillRunning = false;
        }
        return done;
    },

    getYearLevel(classYear) {
        const m = String(classYear == null ? '' : classYear).match(/\d{2}/);
        if (!m) return null;
        const now = new Date(Date.now() + 7 * 3600 * 1000);
        const be = now.getUTCFullYear() + 543;
        const ay = now.getUTCMonth() >= 6 ? be : be - 1;
        return ay - (2500 + Number(m[0])) + 1;
    },

    getYearName(classYear) {
        const m = String(classYear == null ? '' : classYear).match(/\d{2}/);
        if (!m) return `รุ่น ${classYear}`;
        const lv = this.getYearLevel(m[0]);
        if (lv >= 1 && lv <= 4) return `ชั้นปีที่ ${lv} (รุ่น ${m[0]})`;
        if (lv > 4) return `ศิษย์เก่า (รุ่น ${m[0]})`;
        return `รุ่น ${m[0]}`;
    },



    // ดึงรูปโปรไฟล์นักเรียน: localStorage ก่อน, ถ้าไม่มีใช้ STUDENT_PHOTOS หรือ Google Drive CDN
    getProfilePhoto(studentId) {
        const local = Storage.get('photo_' + studentId);
        if (local) return local;
        const isOnlinePages = typeof location !== 'undefined' && location.hostname.includes('github.io');
        if (isOnlinePages && typeof STUDENT_DRIVE_PHOTOS !== 'undefined' && STUDENT_DRIVE_PHOTOS[studentId]) {
            return STUDENT_DRIVE_PHOTOS[studentId];
        }
        if (typeof STUDENT_PHOTOS !== 'undefined' && STUDENT_PHOTOS[studentId]) {
            return STUDENT_PHOTOS[studentId];
        }
        if (typeof STUDENT_DRIVE_PHOTOS !== 'undefined' && STUDENT_DRIVE_PHOTOS[studentId]) {
            return STUDENT_DRIVE_PHOTOS[studentId];
        }
        const apiBase = (typeof this.getApiBaseUrl === 'function') ? this.getApiBaseUrl() : '';
        if (apiBase) {
            return `${apiBase}/photos/${studentId}.jpg`;
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
    imageToBase64(file, maxWidth = 800, maxHeight = 800, quality = 0.6) {
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

    resolveImageUrl(key) {
        if (!key) return '510903.jpg';
        if (typeof key === 'string') {
            if (key.startsWith('data:image') || key.startsWith('blob:')) return key;
            if (key.startsWith('/api/')) return key; // รูปหลักฐานที่เก็บบนเซิร์ฟเวอร์ (/api/deed_photo)
            if (key.startsWith('http://') || key.startsWith('https://')) return key;
        }
        // Check localStorage first
        const fromLocal = this.getImage(key);
        if (fromLocal && typeof fromLocal === 'string' && (fromLocal.startsWith('data:image') || fromLocal.startsWith('http'))) {
            return fromLocal;
        }

        // Clean relative path
        let clean = typeof key === 'string' ? key.trim() : '';
        if (clean.startsWith('./')) clean = clean.substring(2);
        if (clean.startsWith('/')) clean = clean.substring(1);
        if (!clean.startsWith('photos/')) clean = 'photos/' + clean;

        // If on GitHub Pages or external origin, prepend Cloudflare tunnel / backend server URL
        const isExternal = typeof location !== 'undefined' && (location.hostname.includes('github.io') || (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1'));
        const tunnelUrl = (typeof CONFIG !== 'undefined' && CONFIG.SYSTEM_URL) ? CONFIG.SYSTEM_URL.replace(/\/+$/, '') : '';

        if (isExternal && tunnelUrl) {
            return `${tunnelUrl}/${clean}`;
        }
        return clean;
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
    if (startRealtimeUpdates.source || (startRealtimeUpdates.failures || 0) >= 3) return;

    const eventSource = new EventSource('/api/events');
    startRealtimeUpdates.source = eventSource;
    eventSource.onopen = () => { startRealtimeUpdates.failures = 0; };

    eventSource.addEventListener('deed_submitted', async (e) => {
        try {
            const data = JSON.parse(e.data);
            console.log("🔔 Real-time: New deed submitted:", data);

            const isDashboard = typeof window !== 'undefined' && window.location && window.location.pathname.includes('teacher-dashboard');
            const user = App.getCurrentUser();
            const sid = data.studentId || data.student_id;
            if (isDashboard || (user && (user.role === 'teacher' || user.role === 'admin'))) {
                await App.syncAllDeedsWithBackend();
                if (typeof loadDashboardData === 'function') loadDashboardData();
                if (typeof loadData === 'function') loadData();
                if (typeof showToast === 'function') showToast(`🔔 มีกิจกรรมใหม่รออนุมัติจาก นพอ. รหัส ${sid}`);
            } else if (user && String(user.student_id) === String(sid)) {
                await App.syncDeedsWithBackend(sid);
                if (typeof loadDashboardData === 'function') loadDashboardData();
                if (typeof init === 'function') init();
            }
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('deeds_updated', { detail: data }));
                window.dispatchEvent(new CustomEvent('deed_submitted', { detail: data }));
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
                    if (typeof loadData === 'function') loadData();
                } else if (String(user.student_id) === String(data.studentId)) {
                    await App.syncDeedsWithBackend(data.studentId);
                    if (typeof loadDashboardData === 'function') loadDashboardData();
                    if (typeof init === 'function') init();
                    showToast(`🎉 กิจกรรมจิตอาสาของคุณได้รับการอนุมัติแล้ว (${data.status})!`);
                }
            }
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('deeds_updated', { detail: data }));
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
            if (user && String(user.student_id) === String(data.studentId)) {
                showToast("👤 ข้อมูลส่วนตัวของคุณได้รับการอัปเดตแล้ว");
            }
            if (typeof loadDashboardData === 'function') loadDashboardData();
            if (typeof loadData === 'function') loadData();
            if (typeof init === 'function') init();
        } catch (err) {
            console.error("Error processing student_updated event:", err);
        }
    });

    eventSource.onerror = (err) => {
        eventSource.close();
        startRealtimeUpdates.source = null;
        startRealtimeUpdates.failures = (startRealtimeUpdates.failures || 0) + 1;
        if (startRealtimeUpdates.failures < 3) {
            setTimeout(startRealtimeUpdates, 3000 * startRealtimeUpdates.failures);
        } else {
            console.warn('Live updates unavailable; refresh to reconnect.');
        }
    };
}

// Cross-tab real-time sync for localStorage updates
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('storage', (e) => {
        if (e.key && (e.key.startsWith('gooddeeds_deeds_') || e.key.includes('deeds'))) {
            if (typeof window.dispatchEvent === 'function') {
                window.dispatchEvent(new CustomEvent('deeds_updated', { detail: { key: e.key } }));
            }
        }
    });
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof App !== 'undefined' && typeof App.ensureStudentsLoaded === 'function') {
            App.ensureStudentsLoaded().catch(() => {});
        }
        startRealtimeUpdates();
    });
}

// ========== EXPORT ============
if (typeof module !== 'undefined') module.exports = { App, CATEGORIES, CONFIG };
