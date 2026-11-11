/**
 * liff-sdk.js - LINE LIFF Integration Module
 * ระบบบันทึกความดี วิทยาลัยพยาบาลทหารอากาศ
 * LIFF ID: 2010948179-Ympqt2bT
 */

const LiffHelper = {
    liffId: localStorage.getItem('gooddeeds_liff_id') || '2010948179-Ympqt2bT',
    isInitialized: false,
    profile: null,
    verifiedSession: null,
    connectionState: "idle",
    gateway: null,

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
                    console.log('✅ LINE profile retrieved:', this.profile.displayName, this.profile.userId);
                    // Automatically bind student LINE account if logged in
                    if (typeof App !== 'undefined' && App.bindLineAccount) {
                        const cur = App.getCurrentUser ? App.getCurrentUser() : null;
                        if (cur && cur.student_id && this.profile && this.profile.userId) {
                            App.bindLineAccount(cur.student_id, this.profile.userId, this.profile.displayName, this.profile.pictureUrl);
                        }
                    }
                    // LINE profile is for display only; verify its token on the server.
                    await this.handleAutoLogin();
                } catch (pe) {
                    console.warn('⚠️ Could not get LINE profile:', pe);
                }
            }
            this.updateProfileUI();
            // ไม่ว่าผลจะเป็นอย่างไร (ไม่ได้ login LINE, เคยกดออกจากระบบ, ยังไม่ผูกบัญชี, API ผิดพลาด)
            // ต้องเอาหน้าจอ "กำลังเชื่อมต่อระบบ LINE..." ออก ให้เห็นฟอร์มเข้าสู่ระบบ — ถ้ากำลังเปลี่ยนหน้าอยู่ก็ไม่มีผล
            document.documentElement.classList.remove('liff-pending-auth');
            return true;
        } catch (err) {
            console.warn('ℹ️ LIFF Init Note:', err);
            document.documentElement.classList.remove('liff-pending-auth');
            return false;
        }
    },

    isInLineApp() {
        return typeof liff !== 'undefined' && liff.isInClient && liff.isInClient();
    },

    async login() {
        const needsInit = !this.isInitialized;
        if (needsInit && !(await this.init())) return false;
        if (typeof liff === 'undefined') return false;
        if (liff.isLoggedIn()) {
            if (needsInit && this.verifiedSession) return true;
            return this.handleAutoLogin(true);
        }
        liff.login();
        return false;
    },

    async logout() {
        this.verifiedSession = null;
        if (this.gateway) {
            try { await this.gateway.logout(); }
            catch (_) { this.connectionState = 'error'; this.updateProfileUI(); return false; }
        }
        this.profile = null; this.connectionState = 'idle';
        if (typeof liff !== 'undefined' && liff.isLoggedIn && liff.isLoggedIn()) liff.logout();
        this.updateProfileUI();
        return true;
    },

    async bindCurrentStudentProfile() {
        // Compatibility entrypoint: verification does not create a student binding.
        return this.handleAutoLogin();
    },

    async handleAutoLogin(interactive = false) {
        this.verifiedSession = null;
        const loggedOut = ['gooddeeds_logged_out', 'gooddeeds_auto_login_disabled'].some(key => localStorage.getItem(key) === 'true') || sessionStorage.getItem('gooddeeds_logged_out') === 'true';
        if (!interactive && (loggedOut || new URLSearchParams(window.location.search).has('logout'))) return false;

        // 1. Direct Edge Verification via Cloudflare Serverless
        if (this.profile && this.profile.userId) {
            this.connectionState = 'checking';
            this.updateProfileUI();
            try {
                const edgeUrl = (typeof App !== 'undefined' && App.getEdgeApiUrl)
                    ? App.getEdgeApiUrl('/api/bind_line?lineUserId=' + encodeURIComponent(this.profile.userId))
                    : 'https://rtafnc-gooddeeds.pages.dev/api/bind_line?lineUserId=' + encodeURIComponent(this.profile.userId);

                const resp = await fetch(edgeUrl);
                if (resp.ok) {
                    const data = await resp.json();
                    if (data && data.bound && data.student) {
                        const stu = data.student;
                        console.log('✅ LINE Account automatically verified for student:', stu.student_id);

                        // Strict Security: Session is locked to this verified student only (Self)
                        if (typeof App !== 'undefined' && App.setSession) {
                            App.setSession({
                                student_id: stu.student_id,
                                rank: stu.rank || 'นพอ.',
                                first_name: stu.first_name || '',
                                last_name: stu.last_name || '',
                                full_name: stu.full_name || '',
                                class_year: stu.class_year || '',
                                year_level: stu.year_level || 1,
                                role: 'student',
                                position: stu.position || 'นักเรียนพยาบาล',
                                lineUserId: this.profile.userId,
                                lineDisplayName: this.profile.displayName || '',
                                linePictureUrl: this.profile.pictureUrl || ''
                            });
                        }
                        this.verifiedSession = stu;
                        this.connectionState = 'verified';
                        this.updateProfileUI();

                        // If on landing/index page, automatically navigate to requested destination
                        const path = window.location.pathname;
                        const isLanding = path === '/' || path.endsWith('/') || path.endsWith('index.html') || path.includes('index');
                        if (isLanding) {
                            const urlParams = new URLSearchParams(window.location.search);
                            const redirect = urlParams.get('redirect');
                            const targetPage = (redirect && !redirect.includes('teacher-dashboard') && !redirect.includes('settings'))
                                ? redirect
                                : 'student-dashboard.html';
                            window.location.replace(targetPage);
                        }
                        return true;
                    } else {
                        // User's LINE is not bound to a student ID yet
                        this.connectionState = 'pending';
                        this.updateProfileUI();
                        document.documentElement.classList.remove('liff-pending-auth');
                    }
                }
            } catch (edgeErr) {
                console.warn('⚠️ LIFF Edge check note:', edgeErr);
                document.documentElement.classList.remove('liff-pending-auth');
            }
        }

        const config = window.GOODDEED_GATEWAY_CONFIG;
        if (!config?.origin || typeof window.createGoodDeedGatewayClient !== 'function') {
            if (this.connectionState !== 'pending' && this.connectionState !== 'verified') {
                this.connectionState = 'unavailable';
            }
            this.updateProfileUI();
            return false;
        }
        this.gateway ||= window.createGoodDeedGatewayClient(config);
        this.connectionState = 'checking'; this.updateProfileUI();
        try {
            const token = typeof liff !== 'undefined' && liff.getIDToken ? liff.getIDToken() : null;
            const result = await this.gateway.verifyLine(token);
            this.verifiedSession = result;
            this.connectionState = result.studentLinked ? 'verified' : 'pending';
            return true;
        } catch (_) { this.connectionState = 'error'; return false; }
        finally { this.updateProfileUI(); }
    },

    updateProfileUI() {
        const titleEl = document.getElementById('line-liff-title');
        const detailEl = document.getElementById('line-liff-detail');
        const btnEl = document.getElementById('btn-line-connect');
        if (titleEl && detailEl) {
            const messages = {
                idle:['เชื่อมต่อบัญชี LINE', 'เข้าสู่ LINE เพื่อให้ระบบตรวจสอบบัญชีของคุณ', 'ตรวจสอบบัญชี'],
                checking:['กำลังตรวจสอบบัญชี', 'กรุณารอสักครู่', 'กำลังตรวจสอบ…'],
                verified:['ยืนยันบัญชี LINE แล้ว', 'ระบบยืนยันการเชื่อมบัญชีนักเรียนแล้ว สถานะการรับแจ้งเตือนต้องตรวจแยกต่างหาก', 'ตรวจสอบอีกครั้ง'],
                pending:['ยืนยัน LINE แล้ว รอเชื่อมบัญชีนักเรียน', 'ติดต่อผู้ดูแลเพื่อตรวจสอบสิทธิ์และเชื่อมบัญชี', 'ตรวจสอบอีกครั้ง'],
                unavailable:['การยืนยันบัญชียังไม่พร้อม', 'กรุณาติดต่อผู้ดูแลเพื่อเปิดใช้งานการยืนยันบัญชี', 'ตรวจสอบอีกครั้ง'],
                error:['ยังยืนยันบัญชีไม่ได้', 'ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง ข้อมูลในเครื่องไม่ใช้แทนการยืนยันบัญชี', 'ลองอีกครั้ง']
            };
            const message = messages[this.connectionState] || messages.idle;
            titleEl.textContent = message[0]; detailEl.textContent = message[1];
            titleEl.style.color = this.connectionState === 'verified' ? '#146c43' : '';
            detailEl.setAttribute('role', 'status'); detailEl.setAttribute('aria-live', 'polite');
            if (btnEl) { btnEl.textContent = message[2]; btnEl.disabled = this.connectionState === 'checking'; }
        }

        const liffBanner = document.getElementById('liff-login-banner');
        if (liffBanner && this.profile) {
            if (this.connectionState === 'verified' && this.verifiedSession) {
                liffBanner.innerHTML = `
                    <div style="display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:4px;">
                        <span style="font-size:1.2rem;">✅</span>
                        <span style="font-weight:700; color:#4ade80; font-size:0.95rem;">ยืนยันตัวตนผ่าน LINE สำเร็จ</span>
                    </div>
                    <div style="font-size:0.85rem; color:#ffffff; font-weight:600;">
                        ${this.verifiedSession.full_name} (รหัส ${this.verifiedSession.student_id})
                    </div>
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">
                        เข้าสู่ระบบเฉพาะบัญชีของตนเองเรียบร้อยแล้ว
                    </div>
                `;
            } else if (this.connectionState === 'pending') {
                liffBanner.innerHTML = `
                    <div style="display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:4px;">
                        <span style="font-size:1.2rem;">🟢</span>
                        <span style="font-weight:700; color:#4ade80; font-size:0.95rem;">LINE: ${this.profile.displayName}</span>
                    </div>
                    <div style="font-size:0.8rem; color:#fde047; margin-bottom:4px;">
                        ⚠️ ยังไม่ได้ผูกรหัสนักเรียน นพอ. กับบัญชี LINE นี้
                    </div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">
                        กรุณาเข้าสู่ระบบด้วยรหัสนักเรียน 7 หลักด้านล่าง เพื่อผูกบัญชีใช้งานเฉพาะตนเองค่ะ
                    </div>
                `;
            }
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

// Safe conditional initialize on load - Auto-initialize on landing, submit-deed, dashboard, and history pages
window.addEventListener('load', () => {
    const path = window.location.pathname;
    const isLanding = path.endsWith('index.html') || path === '/' || path.endsWith('/') || path.includes('index');
    const isStudentPage = path.includes('submit-deed') || path.includes('history') || path.includes('student-dashboard');
    if ((isLanding || isStudentPage) && typeof liff !== 'undefined' && LiffHelper.liffId && LiffHelper.liffId.includes('-')) {
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
