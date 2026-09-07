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

        // Dynamically load LIFF SDK if missing
        if (typeof liff === 'undefined') {
            await new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
                script.onload = () => {
                    console.log('📦 LINE LIFF SDK CDN loaded dynamically!');
                    resolve();
                };
                script.onerror = () => {
                    console.warn('⚠️ Could not load LINE LIFF SDK from CDN');
                    resolve();
                };
                document.head.appendChild(script);
            });
        }

        if (typeof liff === 'undefined') {
            console.warn('⚠️ LINE LIFF SDK ยังไม่พร้อมใช้งาน');
            return false;
        }

        try {
            await liff.init({ liffId: this.liffId });
            this.isInitialized = true;
            console.log('✅ LINE LIFF initialized successfully! InClient:', liff.isInClient(), 'LoggedIn:', liff.isLoggedIn());

            if (liff.isLoggedIn()) {
                try {
                    this.profile = await liff.getProfile();
                    console.log('👤 LINE Profile Loaded:', this.profile);
                    this.bindCurrentStudentProfile();
                    await this.handleAutoLogin();
                } catch (pe) {
                    console.warn('⚠️ Could not get LINE profile:', pe);
                }
            }
            this.updateProfileUI();
            return true;
        } catch (err) {
            console.warn('ℹ️ LIFF Init Note:', err);
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
        const lineName = this.profile.displayName || 'LINE User';
        const linePic = this.profile.pictureUrl || '';

        // Save mapping
        const mappings = JSON.parse(localStorage.getItem('gooddeeds_line_mappings') || '{}');
        
        if (typeof App !== 'undefined' && App.getCurrentUser) {
            const currentUser = App.getCurrentUser();
            if (currentUser) {
                const userKey = currentUser.student_id || currentUser.username || 'admin';
                mappings[lineUserId] = userKey;
                localStorage.setItem('gooddeeds_line_mappings', JSON.stringify(mappings));

                // Save profile details
                const profileData = App.getProfile(userKey) || {};
                profileData.lineUserId = lineUserId;
                profileData.lineDisplayName = lineName;
                profileData.linePictureUrl = linePic;
                App.updateProfile(profileData);
                console.log('🔗 Bound LINE Profile to User:', userKey, lineName, currentUser.role);

                // Always Send Telegram Notification & Sync Cloud
                try {
                    let displayName = '';
                    let roleTitle = '';
                    if (currentUser.role === 'admin') {
                        displayName = currentUser.name || 'ผู้ดูแลระบบ (Admin)';
                        roleTitle = '🛡️ บัญชี: ผู้ดูแลระบบ (Super Admin)';
                    } else if (currentUser.role === 'teacher') {
                        displayName = currentUser.name || 'อาจารย์ผู้ควบคุม';
                        roleTitle = '👩‍🏫 บัญชี: อาจารย์ผู้ควบคุม (Teacher)';
                    } else {
                        displayName = `${currentUser.rank || 'นพอ.'} ${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim();
                        roleTitle = `🎫 รหัส นพอ.: <code>${currentUser.student_id}</code> (รุ่น ${currentUser.class_year || '69'})`;
                    }

                    const settings = App.getSettings();
                    const tgToken = (settings.telegramToken && !settings.telegramToken.includes('AAEejIlFni8e9DWVxKpRomTFlmjxYJVNJ0k'))
                        ? settings.telegramToken 
                        : '8087838067:AAGld1ygsrvnyc6hDX02sGxyDOZwQbyRU0s';
                    const tgChat = settings.adminChatId || '-4839151586';

                    if (tgToken && tgChat) {
                        App.sendTelegram(tgChat, 
                            `🔗 <b>ผูกบัญชี LINE สำเร็จ (เปิดผ่าน LIFF SMART DBS)!</b>\n` +
                            `━━━━━━━━━━━━━━━━━━\n` +
                            `👤 LINE: <b>${lineName}</b>\n` +
                            `📛 ชื่อ: <b>${displayName}</b>\n` +
                            `${roleTitle}\n` +
                            `🆔 LINE User ID: <code>${lineUserId}</code>\n` +
                            `✅ บันทึกข้อมูลเข้าสู่ระบบเรียบร้อยแล้ว`
                        );
                    }
                } catch (tge) {
                    console.warn('⚠️ Telegram notify error:', tge);
                }

                // Sync to Google Apps Script (Cloud Google Sheets) if configured
                const gasUrl = (typeof CONFIG !== 'undefined' && CONFIG.GAS_URL) ? CONFIG.GAS_URL : (App.getSettings ? App.getSettings().gasUrl : '');
                if (gasUrl) {
                    fetch(gasUrl, {
                        method: 'POST',
                        mode: 'no-cors',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'bind_line',
                            studentId: currentUser.student_id || currentUser.username,
                            lineUserId,
                            lineDisplayName: lineName,
                            linePictureUrl: linePic
                        })
                    }).then(() => console.log('☁️ Synced LINE ID to Google Apps Script'))
                      .catch(err => console.warn('⚠️ GAS Sync Error:', err));
                }

                // Sync to backend if available
                if (App.canUseBackendApi && App.canUseBackendApi()) {
                    fetch('/api/bind_line', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...(App.getAuthHeaders ? App.getAuthHeaders() : {}) },
                        body: JSON.stringify({
                            studentId: currentUser.student_id || currentUser.username,
                            lineUserId,
                            lineDisplayName: lineName,
                            linePictureUrl: linePic
                        })
                    }).catch(err => console.warn('⚠️ Bind LINE sync error:', err));
                }
            }
        }
    },

    async handleAutoLogin() {
        if (!this.profile) return;
        // Suppress auto-login if user explicitly logged out or wants to switch accounts
        try {
            const urlParams = (typeof window !== 'undefined' && window.location) ? new URLSearchParams(window.location.search) : null;
            const isLogoutParam = urlParams && (urlParams.get('logout') === 'true' || urlParams.get('logout') === '1');
            const isLoggedOutSession = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('gooddeeds_logged_out') === 'true';
            const isLoggedOutLocal = typeof localStorage !== 'undefined' && (
                localStorage.getItem('gooddeeds_logged_out') === 'true' || 
                localStorage.getItem('gooddeeds_auto_login_disabled') === 'true'
            );

            if (isLogoutParam || isLoggedOutSession || isLoggedOutLocal) {
                console.log('ℹ️ User explicitly logged out. Auto-login suppressed to allow switching accounts or admin login.');
                return;
            }
        } catch (e) {}

        const lineUserId = this.profile.userId;
        const mappings = JSON.parse(localStorage.getItem('gooddeeds_line_mappings') || '{}');
        let userKey = mappings[lineUserId];

        // 1. If not found in localStorage, scan global STUDENTS_DATA ("ถ้ามีแล้วไม่ต้องรายคน")
        if (!userKey && typeof STUDENTS_DATA !== 'undefined' && Array.isArray(STUDENTS_DATA)) {
            const matched = STUDENTS_DATA.find(s => s.line_user_id === lineUserId);
            if (matched) {
                userKey = String(matched.student_id);
                mappings[lineUserId] = userKey;
                localStorage.setItem('gooddeeds_line_mappings', JSON.stringify(mappings));
                console.log('🎯 Found student from central database:', userKey, matched.full_name);
            }
        }

        // 2. If still not found, check backend endpoint
        if (!userKey && typeof App !== 'undefined' && App.canUseBackendApi && App.canUseBackendApi()) {
            try {
                const resp = await fetch(`/api/get_line_user?lineUserId=${encodeURIComponent(lineUserId)}`);
                if (resp.ok) {
                    const resData = await resp.json();
                    if (resData.status === 'found') {
                        userKey = resData.student_id || resData.username;
                        mappings[lineUserId] = userKey;
                        localStorage.setItem('gooddeeds_line_mappings', JSON.stringify(mappings));
                        console.log('☁️ Recognized user from server line mapping:', userKey);
                    }
                }
            } catch (fe) {}
        }

        if (userKey && typeof App !== 'undefined') {
            // 1. Check if mapped to staff (Teacher / Admin)
            if (userKey === 'admin' || userKey === 'anuchit' || userKey === 'bird' || userKey === 'teacher') {
                const staffAccounts = App.getStaffAccounts ? App.getStaffAccounts() : [];
                const staff = staffAccounts.find(t => t.username === userKey) || {
                    username: userKey,
                    role: (userKey === 'teacher') ? 'teacher' : 'admin',
                    name: (userKey === 'anuchit' || userKey === 'bird') ? 'ร.อ.อนุชิต ทำจะดี (Bird)' : 'ผู้ดูแลระบบ'
                };
                console.log('🚀 LIFF Auto-login for staff:', staff.username);
                if (App.setSession) {
                    App.setSession(staff.role, staff);
                }
                if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
                    const target = (window.location.pathname.indexOf('/frontend/') !== -1) ? 'teacher-dashboard.html' : 'frontend/teacher-dashboard.html';
                    window.location.href = target;
                    return;
                }
            }

            // 2. Check if mapped to student
            const student = App.getStudentById ? App.getStudentById(userKey) : (App.findStudent ? App.findStudent(userKey) : null);
            if (student) {
                console.log('🚀 LIFF Auto-login for student:', student.student_id);
                if (App.setSession) {
                    App.setSession('student', student);
                }
                if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
                    const target = (window.location.pathname.indexOf('/frontend/') !== -1) ? 'student-dashboard.html' : 'frontend/student-dashboard.html';
                    window.location.href = target;
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

        // Check if current user already has line_user_id in DB ("ถ้ามีแล้วไม่ต้องรายคน")
        let existingLineId = '';
        let existingLineName = '';
        if (typeof App !== 'undefined' && App.getCurrentUser) {
            const u = App.getCurrentUser();
            if (u) {
                existingLineId = u.line_user_id || u.lineUserId || '';
                existingLineName = u.line_display_name || u.lineDisplayName || '';
                if (!existingLineId && typeof STUDENTS_DATA !== 'undefined' && u.student_id) {
                    const st = STUDENTS_DATA.find(s => String(s.student_id) === String(u.student_id));
                    if (st && st.line_user_id) {
                        existingLineId = st.line_user_id;
                        existingLineName = st.line_display_name || '';
                    }
                }
            }
        }

        if (this.profile) {
            titleEl.textContent = `🟢 เชื่อมต่อบัญชี LINE: ${this.profile.displayName}`;
            titleEl.style.color = '#4ade80';
            detailEl.textContent = `LINE User ID: ${this.profile.userId.slice(0, 10)}... (เชื่อมต่อระบบกลางแล้ว พร้อมรับแจ้งเตือนทุกครั้ง)`;
            if (btnEl) {
                btnEl.textContent = '✅ เชื่อมต่อแล้ว';
                btnEl.style.background = 'rgba(74, 222, 128, 0.2)';
                btnEl.style.color = '#4ade80';
                btnEl.style.border = '1px solid rgba(74, 222, 128, 0.4)';
            }
        } else if (existingLineId) {
            titleEl.textContent = `🟢 เชื่อมต่อบัญชี LINE แล้ว${existingLineName ? ': ' + existingLineName : ''}`;
            titleEl.style.color = '#4ade80';
            detailEl.textContent = `LINE User ID: ${existingLineId.slice(0, 10)}... (บันทึกในระบบกลางแล้ว พร้อมรับแจ้งเตือนทุกครั้ง)`;
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
            detailEl.textContent = 'กดปุ่มเพื่อเชื่อมต่อและรับแจ้งเตือนผลความดีทุกครั้ง';
        }
    },

    // ---------- FLEX MESSAGE TEMPLATES ----------
    createDeedFlex(deed, student) {
        const cat = (typeof App !== 'undefined' && App.getCategoryById) ? App.getCategoryById(deed.categoryId) : { emoji: '🎖️', name: 'กิจกรรมจิตอาสา' };
        const statusText = deed.status === 'approved' ? '✅ อนุมัติแล้ว' : (deed.status === 'rejected' ? '❌ ปฏิเสธ' : '⏳ รอตรวจประเมิน');
        const statusColor = deed.status === 'approved' ? '#22c55e' : (deed.status === 'rejected' ? '#ef4444' : '#f59e0b');
        const isApproved = deed.status === 'approved';
        const baseUrl = (typeof App !== 'undefined' && App.getBaseUrl) ? App.getBaseUrl() : window.location.origin;
        const slipUrl = `${baseUrl}/deed_slip.html?id=${deed.id}&studentId=${student.student_id}&autoprint=true`;
        const signUrl = `${baseUrl}/approve_sign.html?id=${deed.id}&studentId=${student.student_id}`;

        return {
            type: "flex",
            altText: `🎖️ ใบบันทึกความดี: ${student.first_name} (${deed.hours} ชม.)`,
            contents: {
                type: "bubble",
                size: "mega",
                header: {
                    type: "box",
                    layout: "vertical",
                    backgroundColor: "#0a192f",
                    paddingAll: "20px",
                    contents: [
                        {
                            type: "text",
                            text: "วิทยาลัยพยาบาลทหารอากาศ",
                            color: "#c9a227",
                            size: "xs",
                            weight: "bold"
                        },
                        {
                            type: "text",
                            text: "ใบบันทึกความดีจิตอาสา ๒๕๖๙",
                            color: "#ffffff",
                            size: "lg",
                            weight: "bold",
                            margin: "xs"
                        }
                    ]
                },
                body: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                        {
                            type: "box",
                            layout: "horizontal",
                            contents: [
                                {
                                    type: "text",
                                    text: "👤 นพอ.:",
                                    size: "sm",
                                    color: "#888888",
                                    flex: 2
                                },
                                {
                                    type: "text",
                                    text: `${student.rank || 'นพอ.'} ${student.first_name} ${student.last_name}`,
                                    size: "sm",
                                    weight: "bold",
                                    color: "#111111",
                                    flex: 5
                                }
                            ]
                        },
                        {
                            type: "box",
                            layout: "horizontal",
                            margin: "sm",
                            contents: [
                                {
                                    type: "text",
                                    text: "🎫 รหัส:",
                                    size: "sm",
                                    color: "#888888",
                                    flex: 2
                                },
                                {
                                    type: "text",
                                    text: `${student.student_id} (รุ่น ${student.class_year || '69'})`,
                                    size: "sm",
                                    color: "#333333",
                                    flex: 5
                                }
                            ]
                        },
                        {
                            type: "separator",
                            margin: "lg"
                        },
                        {
                            type: "box",
                            layout: "vertical",
                            margin: "lg",
                            contents: [
                                {
                                    type: "text",
                                    text: `${cat.emoji} ${cat.name}`,
                                    size: "xs",
                                    color: "#3b82f6",
                                    weight: "bold"
                                },
                                {
                                    type: "text",
                                    text: deed.description || "กิจกรรมจิตอาสา",
                                    size: "sm",
                                    color: "#111111",
                                    wrap: true,
                                    margin: "xs"
                                }
                            ]
                        },
                        {
                            type: "box",
                            layout: "horizontal",
                            margin: "lg",
                            contents: [
                                {
                                    type: "box",
                                    layout: "vertical",
                                    contents: [
                                        {
                                            type: "text",
                                            text: "ชั่วโมงกิจกรรม",
                                            size: "xs",
                                            color: "#888888"
                                        },
                                        {
                                            type: "text",
                                            text: `${deed.hours} ชม.`,
                                            size: "xl",
                                            weight: "bold",
                                            color: "#c9a227"
                                        }
                                    ]
                                },
                                {
                                    type: "box",
                                    layout: "vertical",
                                    alignItems: "flex-end",
                                    contents: [
                                        {
                                            type: "text",
                                            text: "สถานะ",
                                            size: "xs",
                                            color: "#888888"
                                        },
                                        {
                                            type: "text",
                                            text: statusText,
                                            size: "sm",
                                            weight: "bold",
                                            color: statusColor
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                footer: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                        {
                            type: "button",
                            action: {
                                type: "uri",
                                label: isApproved ? "📄 พิมพ์ใบบันทึกความดี (A4 PDF)" : "✍️ ส่งให้ผู้ตรวจ / ผู้ปกครอง เซ็นชื่อ",
                                uri: isApproved ? slipUrl : signUrl
                            },
                            style: "primary",
                            color: isApproved ? "#0a192f" : "#0284c7"
                        }
                    ]
                }
            }
        };
    },

    // Share Flex Message via LINE App (Share Target Picker)
    async shareFlex(flexPayload) {
        if (typeof liff === 'undefined' || !liff.isLoggedIn || !liff.isLoggedIn()) {
            alert('กรุณาเปิดผ่าน LINE LIFF เพื่อแชร์ข้อความ');
            return false;
        }
        try {
            if (liff.isApiAvailable('shareTargetPicker')) {
                const res = await liff.shareTargetPicker([flexPayload]);
                if (res) {
                    alert('📤 แชร์ข้อความ Flex Message สำเร็จเรียบร้อยแล้ว!');
                    return true;
                }
            } else if (liff.isInClient()) {
                await liff.sendMessages([flexPayload]);
                alert('📤 ส่งข้อความ Flex Message เข้าแชทเรียบร้อยแล้ว!');
                return true;
            } else {
                alert('อุปกรณ์ของคุณไม่รองรับการแชร์ข้อความ LINE โดยตรง');
            }
        } catch (err) {
            console.error('❌ Share Flex Error:', err);
            alert('เกิดข้อผิดพลาดในการแชร์: ' + err.message);
        }
        return false;
    }
};

// Safe conditional initialize on load - Only auto-initialize on the landing/login page to prevent OAuth redirect loops on dashboards
window.addEventListener('load', () => {
    const isLanding = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/');
    if (isLanding && typeof liff !== 'undefined' && LiffHelper.liffId && LiffHelper.liffId.includes('-')) {
        try {
            LiffHelper.init().catch(e => console.log('LIFF Standby mode:', e));
        } catch(e) {}
    } else {
        // Automatically check and update LINE connection status card if on profile or dashboard
        try {
            if (typeof LiffHelper !== 'undefined' && LiffHelper.updateProfileUI) {
                LiffHelper.updateProfileUI();
            }
        } catch(e) {}
    }
});
