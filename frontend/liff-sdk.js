/**
 * liff-sdk.js - LINE LIFF Integration Module
 * ระบบบันทึกความดี วิทยาลัยพยาบาลทหารอากาศ
 */

const LiffHelper = {
    // กำหนด LIFF ID (สามารถเปลี่ยนใน CONFIG หรือตั้งค่าผ่าน UI)
    liffId: localStorage.getItem('gooddeeds_liff_id') || '2010948179-Ympqt2bT',

    // สถานะการเริ่มต้นใช้งาน LIFF
    isInitialized: false,
    profile: null,

    /**
     * เริ่มต้นใช้งาน LINE LIFF SDK
     * @param {string} customLiffId 
     */
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
                console.log('👤 LINE Profile:', this.profile);
                this.handleAutoLogin();
            } else if (liff.isInClient()) {
                liff.login();
            }
            return true;
        } catch (err) {
            console.error('❌ LIFF Initialization failed:', err);
            return false;
        }
    },

    /**
     * ตรวจสอบว่าเปิดผ่าน LINE App หรือไม่
     */
    isInLineApp() {
        return typeof liff !== 'undefined' && liff.isInClient && liff.isInClient();
    },

    /**
     * บังคับให้ผู้ใช้เข้าสู่ระบบ LINE
     */
    login() {
        if (typeof liff !== 'undefined' && liff.isLoggedIn && !liff.isLoggedIn()) {
            liff.login();
        }
    },

    /**
     * ออกจากระบบ LINE
     */
    logout() {
        if (typeof liff !== 'undefined' && liff.isLoggedIn && liff.isLoggedIn()) {
            liff.logout();
            window.location.reload();
        }
    },

    /**
     * จัดการ Auto Login หากผูก LINE User ID กับรหัสนักเรียนไว้แล้ว
     */
    handleAutoLogin() {
        if (!this.profile) return;
        const lineUserId = this.profile.userId;
        
        // ค้นหานักเรียนที่มี line_user_id ตรงกันใน localStorage
        const mappings = JSON.parse(localStorage.getItem('gooddeeds_line_mappings') || '{}');
        const studentId = mappings[lineUserId];

        if (studentId && typeof App !== 'undefined') {
            const student = App.getStudentById(studentId);
            if (student) {
                console.log('🚀 LIFF Auto-login for student:', student.student_id);
                App.setSession('student', student);
                if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
                    window.location.href = 'student-dashboard.html';
                }
            }
        }
    },

    /**
     * ผูกบัญชี LINE ปัจจุบันกับรหัสนักเรียน
     * @param {string} studentId 
     */
    linkLineAccount(studentId) {
        if (!this.profile) return false;
        const mappings = JSON.parse(localStorage.getItem('gooddeeds_line_mappings') || '{}');
        mappings[this.profile.userId] = studentId;
        localStorage.setItem('gooddeeds_line_mappings', JSON.stringify(mappings));
        console.log(`🔗 Linked LINE User ${this.profile.userId} to Student ${studentId}`);
        return true;
    },

    /**
     * แชร์การ์ดความดี/เกียรติบัตรไปยังแชต LINE (Flex Message)
     * @param {Object} deedData 
     */
    async shareDeedCard(deedData) {
        if (typeof liff === 'undefined' || !liff.isApiAvailable('shareTargetPicker')) {
            alert('⚠️ ฟีเจอร์นี้เปิดใช้งานได้เฉพาะเมื่อเปิดผ่านแอป LINE บนมือถือเท่านั้น');
            return false;
        }

        const flexMessage = {
            type: 'flex',
            altText: `🌟 การ์ดบันทึกความดี: ${deedData.title}`,
            contents: {
                type: 'bubble',
                hero: deedData.photo ? {
                    type: 'image',
                    url: deedData.photo,
                    size: 'full',
                    aspectRatio: '20:13',
                    aspectMode: 'cover'
                } : undefined,
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: '🎖️ บันทึกความดีจิตอาสา',
                            weight: 'bold',
                            color: '#c9a227',
                            size: 'sm'
                        },
                        {
                            type: 'text',
                            text: deedData.title || 'กิจกรรมจิตอาสา',
                            weight: 'bold',
                            size: 'xl',
                            margin: 'md',
                            wrap: true
                        },
                        {
                            type: 'box',
                            layout: 'vertical',
                            margin: 'lg',
                            spacing: 'sm',
                            contents: [
                                {
                                    type: 'box',
                                    layout: 'baseline',
                                    spacing: 'sm',
                                    contents: [
                                        { type: 'text', text: 'หมวดหมู่:', color: '#aaaaaa', size: 'sm', flex: 2 },
                                        { type: 'text', text: deedData.categoryName || '-', wrap: true, color: '#666666', size: 'sm', flex: 4 }
                                    ]
                                },
                                {
                                    type: 'box',
                                    layout: 'baseline',
                                    spacing: 'sm',
                                    contents: [
                                        { type: 'text', text: 'จำนวนชั่วโมง:', color: '#aaaaaa', size: 'sm', flex: 2 },
                                        { type: 'text', text: `${deedData.hours || 0} ชม.`, weight: 'bold', color: '#22c55e', size: 'sm', flex: 4 }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    spacing: 'sm',
                    contents: [
                        {
                            type: 'button',
                            style: 'link',
                            height: 'sm',
                            action: {
                                type: 'uri',
                                label: 'วิทยาลัยพยาบาลทหารอากาศ',
                                uri: window.location.origin
                            }
                        }
                    ]
                }
            }
        };

        try {
            const res = await liff.shareTargetPicker([flexMessage]);
            if (res) {
                alert('🎉 แชร์การ์ดความดีเข้าแชต LINE สำเร็จ!');
                return true;
            }
        } catch (err) {
            console.error('❌ Share Target Picker failed:', err);
            alert('เกิดข้อผิดพลาดในการแชร์: ' + err.message);
        }
        return false;
    },

    /**
     * สแกน QR Code จากใน LINE LIFF
     */
    async scanQRCode() {
        if (typeof liff === 'undefined' || !liff.scanCodeV2) {
            alert('⚠️ ฟีเจอร์กล้องสแกน QR Code เปิดใช้งานได้เฉพาะบนแอป LINE เท่านั้น');
            return null;
        }

        try {
            const result = await liff.scanCodeV2();
            return result.value;
        } catch (err) {
            console.error('❌ QR Scan failed:', err);
            return null;
        }
    }
};

// โหลด LINE LIFF SDK อัตโนมัติและเริ่มต้นระบบ
(function loadLiffSdk() {
    if (typeof liff === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
        script.onload = () => LiffHelper.init();
        document.head.appendChild(script);
    } else {
        LiffHelper.init();
    }
})();
