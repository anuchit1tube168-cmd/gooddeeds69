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
                    this.handleAutoLogin();
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
                    const tgToken = settings.telegramToken || '8087838067:AAEejIlFni8e9DWVxKpRomTFlmjxYJVNJ0k';
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
                    window.location.href = 'https://anuchit1tube168-cmd.github.io/gooddeeds69/frontend/student-dashboard.html';
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
    },

    // ---------- FLEX MESSAGE TEMPLATES ----------
    createDeedFlex(deed, student) {
        const cat = (typeof App !== 'undefined' && App.getCategoryById) ? App.getCategoryById(deed.categoryId) : { emoji: '🎖️', name: 'กิจกรรมจิตอาสา' };
        const statusText = deed.status === 'approved' ? '✅ อนุมัติแล้ว' : (deed.status === 'rejected' ? '❌ ปฏิเสธ' : '⏳ รอตรวจประเมิน');
        const statusColor = deed.status === 'approved' ? '#22c55e' : (deed.status === 'rejected' ? '#ef4444' : '#f59e0b');
        const slipUrl = `https://anuchit1tube168-cmd.github.io/gooddeeds69/frontend/deed_slip.html?id=${deed.id}&studentId=${student.student_id}&autoprint=true`;

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
                                label: "📄 พิมพ์ใบบันทึกความดี (A4 Slip)",
                                uri: slipUrl
                            },
                            style: "primary",
                            color: "#0a192f"
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

// Safe conditional initialize on load
window.addEventListener('load', () => {
    // Check if liff is present and valid
    if (typeof liff !== 'undefined' && LiffHelper.liffId && LiffHelper.liffId.includes('-')) {
        try {
            LiffHelper.init().catch(e => console.log('LIFF Standby mode:', e));
        } catch(e) {}
    }
});
