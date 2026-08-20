/**
 * liff-sdk.js - LINE LIFF Integration Module
 * ระบบบันทึกความดี วิทยาลัยพยาบาลทหารอากาศ
 * LIFF ID: 2010948179-Ympqt2bT
 */

const LiffHelper = {
    liffId: localStorage.getItem('gooddeeds_liff_id') || '2010948179-Ympqt2bT',
    isInitialized: false,
    profile: null,

    async init(customLiffId = '') {
        if (customLiffId) {
            this.liffId = customLiffId;
            localStorage.setItem('gooddeeds_liff_id', customLiffId);
        }

        if (!this.liffId) {
            console.log('ℹ️ LINE LIFF ID ยังไม่ได้ถูกตั้งค่า');
            return false;
        }

        if (typeof liff === 'undefined') {
            console.warn('⚠️ LINE LIFF SDK ยังไม่ถูกโหลด');
            return false;
        }

        try {
            await liff.init({ liffId: this.liffId });
            this.isInitialized = true;
            console.log('✅ LINE LIFF initialized successfully!');

            if (liff.isLoggedIn()) {
                this.profile = await liff.getProfile();
                console.log('👤 LINE Profile Loaded:', this.profile);
                this.bindCurrentStudentProfile();
                this.handleAutoLogin();
            } else if (liff.isInClient()) {
                liff.login();
            }
            this.updateProfileUI();
            return true;
        } catch (err) {
            console.error('❌ LIFF Initialization failed:', err);
            return false;
        }
    },

    isInLineApp() {
        return typeof liff !== 'undefined' && liff.isInClient && liff.isInClient();
    },

    login() {
        if (typeof liff !== 'undefined' && liff.isLoggedIn && !liff.isLoggedIn()) {
            liff.login();
        } else if (typeof liff !== 'undefined') {
            liff.login();
        }
    },

    logout() {
        if (typeof liff !== 'undefined' && liff.isLoggedIn && liff.isLoggedIn()) {
            liff.logout();
            window.location.reload();
        }
    },

    bindCurrentStudentProfile() {
        if (!this.profile) return;
        const lineUserId = this.profile.userId;
        const lineName = this.profile.displayName;
        const linePic = this.profile.pictureUrl;

        // Save mapping
        const mappings = JSON.parse(localStorage.getItem('gooddeeds_line_mappings') || '{}');
        
        if (typeof App !== 'undefined' && App.getCurrentUser) {
            const currentUser = App.getCurrentUser();
            if (currentUser && currentUser.student_id) {
                mappings[lineUserId] = currentUser.student_id;
                localStorage.setItem('gooddeeds_line_mappings', JSON.stringify(mappings));

                // Save profile details
                const profileData = App.getProfile(currentUser.student_id) || {};
                profileData.lineUserId = lineUserId;
                profileData.lineDisplayName = lineName;
                profileData.linePictureUrl = linePic;
                App.updateProfile(profileData);
                console.log('🔗 Bound LINE Profile to Student:', currentUser.student_id, lineName);

                // Sync to backend if available
                if (App.canUseBackendApi && App.canUseBackendApi()) {
                    fetch('/api/bind_line', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...(App.getAuthHeaders ? App.getAuthHeaders() : {}) },
                        body: JSON.stringify({
                            studentId: currentUser.student_id,
                            lineUserId,
                            lineDisplayName: lineName,
                            linePictureUrl: linePic
                        })
                    }).catch(err => console.warn('⚠️ Bind LINE sync error:', err));
                }
            }
        }
    },

    handleAutoLogin() {
        if (!this.profile) return;
        const lineUserId = this.profile.userId;
        const mappings = JSON.parse(localStorage.getItem('gooddeeds_line_mappings') || '{}');
        const studentId = mappings[lineUserId];

        if (studentId && typeof App !== 'undefined') {
            const student = App.getStudentById ? App.getStudentById(studentId) : null;
            if (student) {
                console.log('🚀 LIFF Auto-login for student:', student.student_id);
                if (App.setSession) {
                    App.setSession('student', student);
                }
                if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
                    window.location.href = 'student-dashboard.html';
                    return;
                }
            } else {
                // Invalid or outdated mapping, clear it
                delete mappings[lineUserId];
                localStorage.setItem('gooddeeds_line_mappings', JSON.stringify(mappings));
            }
        }
    },

    updateProfileUI() {
        const titleEl = document.getElementById('line-liff-title');
        const detailEl = document.getElementById('line-liff-detail');
        const btnEl = document.getElementById('btn-line-connect');

        if (!titleEl || !detailEl) return;

        if (this.profile) {
            titleEl.textContent = `🟢 เชื่อมต่อบัญชี LINE: ${this.profile.displayName}`;
            titleEl.style.color = '#4ade80';
            detailEl.textContent = `LINE User ID: ${this.profile.userId.slice(0, 10)}... (เชื่อมต่อข้อมูลเรียบร้อย)`;
            if (btnEl) {
                btnEl.textContent = '✅ เชื่อมต่อแล้ว';
                btnEl.style.background = 'rgba(74, 222, 128, 0.2)';
                btnEl.style.color = '#4ade80';
                btnEl.style.border = '1px solid rgba(74, 222, 128, 0.4)';
            }
        } else if (typeof liff !== 'undefined' && liff.isLoggedIn && liff.isLoggedIn()) {
            titleEl.textContent = '🟢 เข้าใช้งานผ่าน LINE LIFF';
            detailEl.textContent = 'กดปุ่มเพื่อดึงข้อมูลโปรไฟล์ LINE';
        } else {
            titleEl.textContent = '📱 เชื่อมต่อบัญชี LINE Official Account';
            detailEl.textContent = 'กดปุ่มเพื่อล็อกอินและรับแจ้งเตือนผ่าน LINE';
        }
    }
};

// Auto initialize on load
window.addEventListener('load', () => {
    LiffHelper.init();
});
