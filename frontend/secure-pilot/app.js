(function () {
  "use strict";

  const CONFIG = window.GOOD_DEED_CONFIG;
  const app = document.getElementById("app");
  const bridge = document.getElementById("api-bridge");
  const callbacks = new Map();
  const SESSION_KEY = "gd_session";

  const CATEGORIES = [
    { id: 1, name: "บริจาคโลหิต/เกล็ดเลือด/พลาสมา", short: "บริจาคโลหิต", emoji: "🩸", max: 16 },
    { id: 2, name: "โครงการภายนอก (คำสั่ง วพอ.)", short: "โครงการภายนอก", emoji: "🌐", max: 8 },
    { id: 3, name: "ช่วยเหลืองานภายใน วพอ.", short: "ช่วยงานภายใน", emoji: "🏥", max: 8 },
    { id: 4, name: "เข้าอบรมที่ วพอ. จัดให้", short: "การอบรม", emoji: "📚", max: 6 },
    { id: 5, name: "ช่วยงานหน่วยงาน/ชุมชน/มูลนิธิ", short: "ช่วยชุมชน", emoji: "🤝", max: 8 },
    { id: 6, name: "ทำนุบำรุงศาสนสถาน", short: "ศาสนสถาน", emoji: "🙏", max: 6 },
    { id: 7, name: "งานจิตอาสาฟรีทั่วไป", short: "งานฟรีทั่วไป", emoji: "⭐", max: 4 },
    { id: 8, name: "กิจกรรมจงรักภักดีต่อสถาบัน", short: "จงรักภักดี", emoji: "👑", max: 8 },
    { id: 9, name: "ชม. ที่สมควรได้รับ (บทบาทพิเศษ)", short: "บทบาทพิเศษ", emoji: "🎖️", max: 10 },
  ];

  const LEVELS = [
    { min: 350, level: 10, label: "Celestial Supreme Commander", title: "จอมจักรพรรดิจิตอาสาสวรรค์" },
    { min: 300, level: 9, label: "Platinum Sovereign Angel Hero", title: "อัครเทวทูตปีกทองคำพิเศษ" },
    { min: 250, level: 8, label: "Ultimate Sovereign Angel Hero", title: "สุดยอดวีรบุรุษปีกทองคำ" },
    { min: 180, level: 7, label: "Royal Air Force Nurse Commander", title: "ผู้บัญชาการจิตอาสา วพอ." },
    { min: 120, level: 6, label: "Guardian Angel of Health", title: "เทวทูตผู้พิทักษ์สุขภาพ" },
    { min: 80, level: 5, label: "Gold Flight Rescue Hero", title: "ฮีโร่กู้ชีพเวชศาสตร์การบิน" },
    { min: 50, level: 4, label: "Silver Care Hero", title: "วีรบุรุษพยาบาลปีกเงิน" },
    { min: 25, level: 3, label: "Bronze Service Cadet", title: "พยาบาลจิตอาสาปีกทองแดง" },
    { min: 10, level: 2, label: "Cadet Apprentice", title: "นักเรียนฝึกงานพยาบาล" },
    { min: 0, level: 1, label: "Cadet Novice", title: "นักเรียนพยาบาลฝึกหัด" },
  ];

  const state = {
    sessionToken: sessionStorage.getItem(SESSION_KEY) || "",
    user: null,
    deeds: [],
    members: [],
    membersLoaded: false,
    issuedCredential: null,
    tab: "home",
    loginRole: "student",
    liffReady: false,
    liffLoggedIn: false,
    liffError: "",
    liffPilotOnly: false,
  };

  function injectLegacyTheme() {
    if (document.getElementById("legacy-theme")) return;
    const style = document.createElement("style");
    style.id = "legacy-theme";
    style.textContent = `
      .classic-shell{min-height:100vh;background:linear-gradient(180deg,#071528 0,#0b2240 48%,#eef5fb 48%,#f6f9fc 100%)}
      .classic-top{position:sticky;top:0;z-index:30;background:rgba(4,17,34,.96);color:#fff;border-bottom:2px solid #d6b75c;backdrop-filter:blur(14px)}
      .classic-top-inner{max-width:1180px;margin:auto;padding:12px 18px;display:flex;align-items:center;justify-content:space-between;gap:14px}
      .classic-brand{display:flex;align-items:center;gap:11px}.classic-logo{width:50px;height:50px;border-radius:50%;object-fit:cover;border:2px solid rgba(214,183,92,.7)}
      .classic-brand h1{font:600 17px Kanit,sans-serif;margin:0}.classic-brand small{display:block;color:#bdcce0;font-size:11px;margin-top:2px}
      .classic-page{max-width:1180px;margin:auto;padding:20px 18px 50px}
      .member-card{position:relative;overflow:hidden;color:#fff;border-radius:24px;padding:20px;background:linear-gradient(135deg,#17355d 0,#081a32 65%,#281f0b 100%);border:1px solid rgba(214,183,92,.42);box-shadow:0 18px 45px rgba(0,0,0,.3);min-height:230px}
      .member-card:before{content:"";position:absolute;inset:-60% auto auto -20%;width:360px;height:360px;border-radius:50%;background:radial-gradient(circle,rgba(214,183,92,.23),transparent 67%)}
      .member-card-head{position:relative;display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.member-card-brand{display:flex;gap:10px;align-items:center}.member-card-brand img{width:46px;height:46px;border-radius:50%;object-fit:cover;background:#fff;border:2px solid rgba(255,255,255,.35)}
      .member-card-brand b{display:block;font:600 14px Kanit,sans-serif}.member-card-brand small{font-size:9px;color:#cdd8e8}.member-level{padding:6px 10px;border-radius:999px;background:linear-gradient(135deg,#d6b75c,#f2de91);color:#182338;font:800 11px Kanit,sans-serif;white-space:nowrap}
      .member-card-body{position:relative;display:grid;grid-template-columns:82px 1fr 90px;align-items:center;gap:14px;margin-top:17px}.member-avatar{width:76px;height:76px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.1);border:3px solid rgba(255,255,255,.25);font:700 30px Kanit,sans-serif}.member-name{font:700 20px Kanit,sans-serif}.member-meta{margin-top:5px;color:#cbd8e9;font-size:12px;display:flex;flex-wrap:wrap;gap:8px 14px}.member-chibi{width:88px;height:88px;object-fit:contain;filter:drop-shadow(0 8px 13px rgba(0,0,0,.45));animation:gdFloat 3s ease-in-out infinite}@keyframes gdFloat{50%{transform:translateY(-6px)}}
      .member-card-foot{position:relative;margin-top:15px;padding-top:13px;border-top:1px solid rgba(255,255,255,.12);display:flex;align-items:end;justify-content:space-between;gap:10px}.member-hours strong{font:800 23px Kanit,sans-serif;color:#f2de91}.member-hours span{font-size:11px;color:#cbd8e9}.member-code{font:600 12px ui-monospace,monospace;letter-spacing:2px;color:#dfe7f1}.member-progress{height:7px;background:rgba(255,255,255,.12);border-radius:999px;overflow:hidden;margin-top:7px;max-width:320px}.member-progress span{display:block;height:100%;background:linear-gradient(90deg,#d6b75c,#f4e6a3);border-radius:inherit}
      .classic-grid{display:grid;grid-template-columns:1.25fr .75fr;gap:16px}.classic-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.classic-stat{background:#fff;border:1px solid #d7e2ed;border-radius:17px;padding:15px;text-align:center;box-shadow:0 8px 22px rgba(8,31,57,.07)}.classic-stat strong{display:block;font:700 24px Kanit,sans-serif;color:#0b2d55}.classic-stat span{font-size:11px;color:#667b91}
      .classic-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}.classic-action{border:1px solid #d7e2ed;border-radius:16px;background:#fff;padding:14px 10px;text-align:center;color:#0b2d55;box-shadow:0 7px 20px rgba(7,26,50,.06)}.classic-action span{font-size:25px;display:block}.classic-action b{display:block;font:600 12px Kanit,sans-serif;margin-top:4px}.classic-action.active{border-color:#d6b75c;background:#fffaf0}.classic-action:disabled{opacity:.5}
      .category-strip{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:14px}.category-mini{background:#fff;border:1px solid #d8e4ef;border-radius:14px;padding:10px;text-align:center}.category-mini .emoji{font-size:20px}.category-mini b{display:block;font-size:11px;color:#0b2d55;margin-top:4px}.category-mini strong{display:block;color:#b27c00;font:700 16px Kanit,sans-serif;margin-top:3px}.classic-section{margin-top:16px}.classic-title{font:600 16px Kanit,sans-serif;margin:0 0 10px;color:#0b2d55}
      .login-card .pilot-badge{background:#fff5d9;border-color:#ead28c;color:#785600}.legacy-note{font-size:11px;color:#64798f;text-align:center;margin-top:10px}
      @media(max-width:820px){.classic-grid{grid-template-columns:1fr}.member-card-body{grid-template-columns:66px 1fr 70px}.member-avatar{width:62px;height:62px}.member-chibi{width:68px;height:68px}.member-name{font-size:16px}.classic-actions{grid-template-columns:repeat(2,1fr)}.category-strip{grid-template-columns:repeat(3,1fr)}.classic-page{padding:14px 10px 38px}}
      @media(max-width:430px){.classic-top-inner{padding:9px 10px}.classic-logo{width:42px;height:42px}.classic-brand h1{font-size:14px}.member-card{padding:15px;border-radius:18px}.member-card-body{grid-template-columns:52px 1fr 58px;gap:9px}.member-avatar{width:50px;height:50px;font-size:22px}.member-chibi{width:56px;height:56px}.member-meta{font-size:10px}.category-strip{grid-template-columns:repeat(2,1fr)}}
    `;
    document.head.appendChild(style);
  }

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);
  const statusLabel = (value) => ({pending:"รอตรวจ",approved:"อนุมัติแล้ว",rejected:"ไม่อนุมัติ"})[value] || value;
  const roleLabel = (value) => ({student:"นักเรียน",teacher:"อาจารย์ผู้ตรวจ",admin:"ผู้ดูแลระบบ"})[value] || value;
  const formatDate = (value) => value ? new Intl.DateTimeFormat("th-TH",{dateStyle:"medium"}).format(new Date(value)) : "—";
  const requestId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

  function toast(message, kind="info") {
    const node = document.getElementById("toast");
    node.textContent = message;
    node.style.background = kind === "error" ? "#8d2331" : kind === "success" ? "#0b6b49" : "#071a32";
    node.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove("show"), 3200);
  }

  window.addEventListener("message", (event) => {
    if (!CONFIG.RESPONSE_ORIGINS.includes(event.origin)) return;
    const data = event.data;
    if (!data || data.channel !== "RTAFNC_GOODDEED" || !data.requestId) return;
    const pending = callbacks.get(data.requestId);
    if (!pending) return;
    clearTimeout(pending.timeout);
    callbacks.delete(data.requestId);
    pending.cleanup();
    data.ok ? pending.resolve(data.data) : pending.reject(new Error(data.error || "ระบบไม่ตอบสนอง"));
  });

  function api(action, payload={}) {
    return new Promise((resolve, reject) => {
      const id = requestId();
      const frame = document.createElement("iframe");
      const form = document.createElement("form");
      const frameName = `gas_${id.replace(/[^a-zA-Z0-9]/g, "")}`;
      frame.name = frameName;
      frame.hidden = true;
      form.method = "POST";
      form.action = CONFIG.GAS_WEB_APP_URL;
      form.target = frameName;
      form.hidden = true;
      const fields = { action, requestId:id, origin:location.origin, sessionToken:state.sessionToken, payload:JSON.stringify(payload) };
      Object.entries(fields).forEach(([name,value]) => {
        const input=document.createElement("input");
        input.type="hidden";
        input.name=name;
        input.value=value;
        form.appendChild(input);
      });
      const cleanup = () => { form.remove(); frame.remove(); };
      const timeout = setTimeout(() => {
        callbacks.delete(id);
        cleanup();
        reject(new Error("หมดเวลารอ Apps Script กรุณาลองใหม่"));
      }, CONFIG.REQUEST_TIMEOUT_MS);
      callbacks.set(id,{resolve,reject,timeout,cleanup});
      bridge.append(frame,form);
      form.submit();
    });
  }

  async function fileToEvidence(file) {
    if (!file || !file.size) return null;
    if (file.size > CONFIG.MAX_EVIDENCE_BYTES) throw new Error("ไฟล์หลักฐานต้องไม่เกิน 2 MB");
    if (!["image/jpeg","image/png","application/pdf"].includes(file.type)) throw new Error("รองรับ JPG, PNG หรือ PDF เท่านั้น");
    const dataUrl = await new Promise((resolve,reject) => {
      const reader=new FileReader();
      reader.onload=()=>resolve(reader.result);
      reader.onerror=reject;
      reader.readAsDataURL(file);
    });
    return {name:file.name,type:file.type,size:file.size,dataUrl};
  }

  function levelForHours(hours) {
    return LEVELS.find((item) => hours >= item.min) || LEVELS[LEVELS.length - 1];
  }

  function categoryForRecord(record) {
    const raw = String(record.category || record.categoryName || record.categoryId || "").toLowerCase();
    if (/^\d+$/.test(raw)) return CATEGORIES.find((c) => c.id === Number(raw)) || null;
    const checks = [
      [1, ["บริจาค", "โลหิต", "เกล็ดเลือด", "พลาสมา"]],
      [2, ["โครงการภายนอก", "ภายนอก"]],
      [3, ["ภายใน วพอ", "ช่วยเหลืองานภายใน", "ช่วยงานภายใน"]],
      [4, ["อบรม", "ฝึกอบรม"]],
      [5, ["ชุมชน", "มูลนิธิ", "หน่วยงาน"]],
      [6, ["ศาสนสถาน", "ศาสนา"]],
      [7, ["ฟรีทั่วไป", "จิตอาสาและบำเพ็ญประโยชน์", "จิตอาสา"]],
      [8, ["จงรักภักดี", "เทิดทูน", "สถาบัน", "กองทัพอากาศ"]],
      [9, ["บทบาทพิเศษ", "สมควรได้รับ", "แกนนำ"]],
    ];
    for (const [id, words] of checks) if (words.some((w) => raw.includes(w))) return CATEGORIES.find((c) => c.id === id);
    return null;
  }

  function summary() {
    const approved = state.deeds.filter((d) => d.status === "approved");
    const pending = state.deeds.filter((d) => d.status === "pending");
    const rejected = state.deeds.filter((d) => d.status === "rejected");
    const totalHours = approved.reduce((sum,d) => sum + Number(d.hours || 0), 0);
    const categoryHours = Object.fromEntries(CATEGORIES.map((c) => [c.id, 0]));
    approved.forEach((d) => {
      const cat = categoryForRecord(d);
      if (cat) categoryHours[cat.id] += Number(d.hours || 0);
    });
    return { approved, pending, rejected, totalHours, categoryHours };
  }

  function renderLogin() {
    const lineStatus = state.liffPilotOnly
      ? '<div class="line-status">เปิดผ่านหน้า LIFF หลักเพื่อใช้ LINE Login</div>'
      : state.liffError
        ? `<div class="line-status error">LINE LIFF: ${escapeHtml(state.liffError)}</div>`
        : state.liffLoggedIn
          ? '<div class="line-status ok">✅ เชื่อมต่อบัญชี LINE แล้ว</div>'
          : '<div class="line-status">เปิดจากเมนู LINE OA เพื่อเข้าสู่ระบบ</div>';

    app.innerHTML = `<main class="login"><section class="login-card">
      <div class="login-mark"><img src="510903.jpg" alt="ตราวิทยาลัยพยาบาลทหารอากาศ" width="92" height="92"></div>
      <div class="pilot-badge">ระบบบันทึกความดีจิตอาสา วพอ. 2569</div>
      <h1>ระบบบันทึกความดี</h1>
      <p>วิทยาลัยพยาบาลทหารอากาศ กรมแพทย์ทหารอากาศ</p>
      <div class="login-tabs" role="tablist" aria-label="ประเภทผู้ใช้งาน">
        <button type="button" class="login-tab ${state.loginRole === "student" ? "active" : ""}" data-login-role="student">นักเรียน</button>
        <button type="button" class="login-tab ${state.loginRole === "staff" ? "active" : ""}" data-login-role="staff">อาจารย์ / ผู้ดูแล</button>
      </div>
      <div class="line-box">
        <button type="button" id="line-login" class="btn btn-line" ${state.liffReady && !state.liffLoggedIn ? "" : "hidden"}>เข้าสู่ระบบด้วย LINE</button>
        ${lineStatus}
      </div>
      <form id="login-form">
        <div class="field"><label for="username">${state.loginRole === "student" ? "รหัสนักเรียน 7 หลัก" : "ชื่อผู้ใช้"}</label><input id="username" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required></div>
        <div class="field"><label for="password">รหัสผ่าน</label><input id="password" name="password" type="password" autocomplete="current-password" required></div>
        <button class="btn btn-primary" style="width:100%;margin-top:7px" type="submit">${state.loginRole === "student" && state.liffLoggedIn ? "ยืนยันครั้งแรกและเข้าสู่ระบบ" : "เข้าสู่ระบบ"}</button>
      </form>
      <div class="security-strip"><b>🔒 ข้อมูลนักเรียนและหลักฐานอยู่ใน Google Drive/Sheets ส่วนตัว</b>LINE ตรวจสอบผ่าน Apps Script หลังบ้าน หน้าเว็บไม่เก็บรายชื่อนักเรียนทั้งชุด</div>
      <div class="legacy-note">หากเคยผูก LINE แล้ว ระบบจะเข้าให้อัตโนมัติเมื่อเปิดจาก LINE OA</div>
    </section></main>`;

    document.getElementById("login-form").addEventListener("submit", login);
    const lineButton = document.getElementById("line-login");
    if (lineButton) lineButton.addEventListener("click", () => window.liff.login({ redirectUri: location.origin + location.pathname }));
    document.querySelectorAll("[data-login-role]").forEach((tab) => tab.addEventListener("click", () => {
      state.loginRole = tab.dataset.loginRole;
      renderLogin();
      document.getElementById("username").focus();
    }));
  }

  async function login(event) {
    event.preventDefault();
    const button=event.submitter;
    button.disabled=true;
    button.innerHTML='<span class="loading"></span> กำลังตรวจสอบ';
    try {
      const shouldBindLine = state.loginRole === "student" && state.liffLoggedIn && window.liff && window.liff.getIDToken();
      const action = shouldBindLine ? "bindLineAndLogin" : "login";
      const result=await api(action,{
        username:event.target.username.value.trim(),
        password:event.target.password.value,
        idToken:shouldBindLine ? window.liff.getIDToken() : ""
      });
      state.sessionToken=result.sessionToken;
      sessionStorage.setItem(SESSION_KEY,result.sessionToken);
      state.user=result.user;
      state.tab = state.user.role === "student" ? "home" : "records";
      if (state.user.mustChangePassword) renderPasswordChange(); else await loadDashboard();
    } catch(error) {
      toast(error.message,"error");
      button.disabled=false;
      button.textContent="เข้าสู่ระบบ";
    }
  }

  async function restoreSession() {
    if (!state.sessionToken) return renderLogin();
    try {
      const result=await api("me");
      state.user=result.user;
      if (state.user.mustChangePassword) renderPasswordChange(); else await loadDashboard();
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
      state.sessionToken="";
      renderLogin();
    }
  }

  function renderPasswordChange() {
    app.innerHTML=`<main class="login"><section class="login-card"><div class="login-mark"><img src="510903.jpg" alt="ตราวิทยาลัยพยาบาลทหารอากาศ" width="92" height="92"></div><h1>ตั้งรหัสผ่านใหม่</h1><p>บัญชีนี้ใช้รหัสผ่านชั่วคราว กรุณาเปลี่ยนก่อนใช้งาน</p><form id="password-form"><div class="field"><label for="currentPassword">รหัสผ่านชั่วคราว</label><input id="currentPassword" name="currentPassword" type="password" autocomplete="current-password" required></div><div class="field"><label for="newPassword">รหัสผ่านใหม่</label><input id="newPassword" name="newPassword" type="password" minlength="8" autocomplete="new-password" required><small>อย่างน้อย 8 ตัวอักษร</small></div><div class="field"><label for="confirmPassword">ยืนยันรหัสผ่านใหม่</label><input id="confirmPassword" name="confirmPassword" type="password" minlength="8" autocomplete="new-password" required></div><button class="btn btn-primary" style="width:100%;margin-top:7px" type="submit">บันทึกรหัสผ่านใหม่</button></form><button id="password-logout" class="btn btn-secondary" style="width:100%;margin-top:10px">ออกจากระบบ</button></section></main>`;
    document.getElementById("password-form").onsubmit=changePassword;
    document.getElementById("password-logout").onclick=logout;
  }

  async function changePassword(event) {
    event.preventDefault();
    const form=event.target;
    const button=event.submitter;
    if(form.newPassword.value!==form.confirmPassword.value) return toast("ยืนยันรหัสผ่านไม่ตรงกัน","error");
    button.disabled=true;
    button.innerHTML='<span class="loading"></span> กำลังบันทึก';
    try {
      await api("changePassword",{currentPassword:form.currentPassword.value,newPassword:form.newPassword.value});
      sessionStorage.removeItem(SESSION_KEY);
      state.sessionToken="";
      state.user=null;
      renderLogin();
      toast("เปลี่ยนรหัสผ่านแล้ว กรุณาเข้าสู่ระบบอีกครั้ง","success");
    } catch(error) {
      toast(error.message,"error");
      button.disabled=false;
      button.textContent="บันทึกรหัสผ่านใหม่";
    }
  }

  async function loadDashboard() {
    try {
      const result=await api("listDeeds",{limit:250});
      state.deeds=result.deeds || [];
      renderDashboard();
    } catch(error) {
      toast(error.message,"error");
      renderDashboard();
    }
  }

  function renderStudentHome() {
    const user = state.user;
    const s = summary();
    const level = levelForHours(s.totalHours);
    const progress = Math.min(100, (s.totalHours / 400) * 100);
    const initial = String(user.displayName || user.studentId || "?").trim().replace(/^นพอ\.\s*/, "").charAt(0) || "?";
    const chibi = `photos/chibi/chibi_lv${level.level}.png`;
    const categories = CATEGORIES.map((c) => `<div class="category-mini"><div class="emoji">${c.emoji}</div><b>${c.short}</b><strong>${Number(s.categoryHours[c.id] || 0).toLocaleString("th-TH")} ชม.</strong></div>`).join("");

    return `<section class="classic-grid">
      <article class="member-card">
        <div class="member-card-head">
          <div class="member-card-brand"><img src="510903.jpg" alt="ตรา วพอ."><div><b>วิทยาลัยพยาบาลทหารอากาศ</b><small>ROYAL THAI AIR FORCE NURSING COLLEGE</small></div></div>
          <div class="member-level">LV.${level.level}</div>
        </div>
        <div class="member-card-body">
          <div class="member-avatar">${escapeHtml(initial)}</div>
          <div><div class="member-name">${escapeHtml(user.displayName || "นักเรียนพยาบาล")}</div><div class="member-meta"><span>🎫 รหัส: <b>${escapeHtml(user.studentId || "-")}</b></span><span>📚 รุ่น: <b>${escapeHtml(user.cohort || "-")}</b></span></div><div style="margin-top:9px;color:#f2de91;font:600 12px Kanit,sans-serif">${escapeHtml(level.title)}</div></div>
          <img class="member-chibi" src="${chibi}" alt="Chibi Level ${level.level}" onerror="this.src='photos/chibi/chibi_lv1.png'">
        </div>
        <div class="member-card-foot"><div class="member-hours"><strong>${s.totalHours.toLocaleString("th-TH",{maximumFractionDigits:1})}</strong> <span>ชั่วโมงสะสม</span><div class="member-progress"><span style="width:${progress}%"></span></div></div><div class="member-code">${escapeHtml(user.studentId || "0000000")}</div></div>
      </article>
      <div class="classic-summary"><div class="classic-stat"><strong>${s.totalHours.toLocaleString("th-TH",{maximumFractionDigits:1})}</strong><span>ชั่วโมงอนุมัติ</span></div><div class="classic-stat"><strong>${s.approved.length}</strong><span>อนุมัติแล้ว</span></div><div class="classic-stat"><strong>${s.pending.length}</strong><span>รอตรวจ</span></div></div>
    </section>
    <section class="classic-actions">
      <button class="classic-action" data-go="submit"><span>✍️</span><b>บันทึกความดีใหม่</b></button>
      <button class="classic-action" data-go="records"><span>📋</span><b>ประวัติความดี</b></button>
      <button class="classic-action" id="refresh-home"><span>🔄</span><b>อัปเดตสถานะ</b></button>
      <button class="classic-action" data-go="profile-help"><span>💳</span><b>บัตร & Chibi</b></button>
    </section>
    <section class="classic-section"><h3 class="classic-title">📊 สรุปชั่วโมงจิตอาสา 9 หมวด</h3><div class="category-strip">${categories}</div></section>
    <section class="classic-section"><h3 class="classic-title">🎖️ ระดับความดีของฉัน</h3><div class="panel"><div class="panel-body"><b>Lv.${level.level} — ${escapeHtml(level.label)}</b><div style="color:var(--muted);margin-top:5px">${escapeHtml(level.title)} · เกณฑ์ผ่านประจำปี 50 ชั่วโมง</div></div></div></section>`;
  }

  function renderDashboard() {
    const user=state.user;
    const s=summary();
    const canReview=["teacher","admin"].includes(user.role);
    const isStudent=user.role==="student";
    if (isStudent && !["home","records","submit"].includes(state.tab)) state.tab="home";
    if (!isStudent && state.tab==="home") state.tab="records";

    app.innerHTML=`<div class="classic-shell"><header class="classic-top"><div class="classic-top-inner"><div class="classic-brand"><img class="classic-logo" src="510903.jpg" alt="ตรา วพอ."><div><h1>ระบบบันทึกความดีจิตอาสา</h1><small>วิทยาลัยพยาบาลทหารอากาศ · ปีการศึกษา 2569</small></div></div><div class="userbar"><span class="role">${escapeHtml(roleLabel(user.role))}</span><button id="logout" class="btn btn-secondary">ออก</button></div></div></header><main class="classic-page">
      ${isStudent && state.tab==="home" ? renderStudentHome() : `<section class="hero"><div class="hero-main"><p class="eyebrow">RTAFNC GOOD DEED</p><h2>${canReview?"ศูนย์ตรวจและอนุมัติ":"ระบบบันทึกความดี"}</h2><p>${canReview?"ตรวจรายการ หลักฐาน และบันทึกผลจากจุดเดียว":"ยื่นบันทึกความดีและติดตามสถานะ"}</p></div><div class="hero-side"><div class="metric approved"><strong>${s.totalHours.toLocaleString("th-TH",{maximumFractionDigits:1})}</strong><span>ชั่วโมงอนุมัติ</span></div><div class="metric pending"><strong>${s.pending.length}</strong><span>รายการรอตรวจ</span></div></div></section>`}
      <nav class="tabs">${isStudent?`<button class="tab ${state.tab==="home"?"active":""}" data-tab="home">🏠 หน้าหลัก</button>`:""}<button class="tab ${state.tab==="records"?"active":""}" data-tab="records">📋 ประวัติ</button><button class="tab ${state.tab==="submit"?"active":""}" data-tab="submit">✍️ บันทึกความดี</button>${canReview?`<button class="tab ${state.tab==="review"?"active":""}" data-tab="review">✅ คิวอนุมัติ (${s.pending.length})</button>`:""}${user.role==="admin"?`<button class="tab ${state.tab==="users"?"active":""}" data-tab="users">👥 ผู้ใช้</button>`:""}</nav>
      <section id="view"></section></main></div>`;

    document.getElementById("logout").onclick=logout;
    document.querySelectorAll("[data-tab]").forEach(btn=>btn.onclick=()=>{state.tab=btn.dataset.tab;renderDashboard();});
    document.querySelectorAll("[data-go]").forEach(btn=>btn.onclick=()=>{
      if(btn.dataset.go==="profile-help") return toast("บัตรและ Chibi แสดงอยู่บนหน้าหลักแล้ว","info");
      state.tab=btn.dataset.go; renderDashboard();
    });
    const refreshHome=document.getElementById("refresh-home");
    if(refreshHome) refreshHome.onclick=loadDashboard;
    renderView();
  }

  function renderView() {
    const view=document.getElementById("view");
    if(!view) return;
    if(state.tab==="home") { view.innerHTML=""; return; }
    if(state.tab==="submit") return renderSubmit(view);
    if(state.tab==="review") return renderRecords(view,state.deeds.filter(d=>d.status==="pending"),true);
    if(state.tab==="users"&&state.user.role==="admin") return renderUsers(view);
    return renderRecords(view,state.deeds,false);
  }

  function renderRecords(view,records,reviewMode) {
    view.innerHTML=`<div class="panel"><div class="panel-head"><h3>${reviewMode?"รายการรอการอนุมัติ":"ประวัติบันทึกความดี"}</h3><button id="refresh" class="btn btn-secondary">↻ รีเฟรช</button></div>${records.length?`<div class="table-wrap"><table><thead><tr><th>วันที่</th><th>ผู้ยื่น</th><th>ประเภท/รายละเอียด</th><th>ชั่วโมง</th><th>หลักฐาน</th><th>สถานะ</th><th>ดำเนินการ</th></tr></thead><tbody>${records.map(recordRow).join("")}</tbody></table></div>`:`<div class="empty"><b>${reviewMode?"ไม่มีรายการค้าง":"ยังไม่มีบันทึกความดี"}</b>${reviewMode?"ทุกรายการได้รับการตรวจแล้ว":"เริ่มต้นด้วยการกด ‘บันทึกความดี’"}</div>`}</div>`;
    document.getElementById("refresh").onclick=loadDashboard;
    document.querySelectorAll("[data-review]").forEach(btn=>btn.onclick=()=>review(btn.dataset.review,btn.dataset.decision));
    document.querySelectorAll("[data-evidence]").forEach(btn=>btn.onclick=()=>openEvidence(btn.dataset.evidence));
  }

  function recordRow(record) {
    const evidence=record.hasEvidence?`<button class="btn btn-secondary" data-evidence="${escapeHtml(record.recordId)}">เปิดไฟล์</button>`:"—";
    const controls=state.user.role!=="student"&&record.status==="pending"?`<div class="record-actions"><button class="btn btn-success" data-review="${escapeHtml(record.recordId)}" data-decision="approved">อนุมัติ</button><button class="btn btn-danger" data-review="${escapeHtml(record.recordId)}" data-decision="rejected">ไม่อนุมัติ</button></div>`:"—";
    return `<tr><td>${formatDate(record.activityDate)}</td><td>${escapeHtml(record.ownerName||state.user.displayName||"")}<br><small>${escapeHtml(record.studentId||"")}</small></td><td><b>${escapeHtml(record.category||"-")}</b><br>${escapeHtml(record.description||"")}</td><td>${Number(record.hours||0).toLocaleString("th-TH")}</td><td>${evidence}</td><td><span class="status ${escapeHtml(record.status)}">${statusLabel(record.status)}</span></td><td>${controls}</td></tr>`;
  }

  function renderSubmit(view) {
    const today=new Date().toISOString().slice(0,10);
    const isStudent=state.user.role==="student";
    const options=CATEGORIES.map(c=>`<option value="${escapeHtml(c.name)}">${c.emoji} ${c.id}. ${escapeHtml(c.name)}</option>`).join("");
    view.innerHTML=`<div class="panel"><div class="panel-head"><h3>✍️ บันทึกความดีใหม่</h3><span class="role">ส่งเข้า Apps Script / Private Google Drive</span></div><div class="panel-body"><form id="deed-form"><div class="grid-form"><div class="field"><label>รหัสนักเรียน *</label><input name="studentId" value="${escapeHtml(state.user.studentId||"")}" ${isStudent?"readonly":""} required></div><div class="field"><label>รุ่น / ชั้นปี</label><input name="cohort" value="${escapeHtml(state.user.cohort||"")}" ${isStudent?"readonly":""} placeholder="เช่น รุ่น 69"></div><div class="field"><label>วันที่ทำกิจกรรม *</label><input type="date" name="activityDate" value="${today}" required></div><div class="field"><label>จำนวนชั่วโมง *</label><input type="number" name="hours" min="0.5" max="24" step="0.5" value="1" required></div><div class="field full"><label>ประเภทความดี 9 หมวด *</label><select name="category" required><option value="">เลือกประเภท</option>${options}</select></div><div class="field full"><label>รายละเอียดกิจกรรม *</label><textarea name="description" maxlength="1200" required placeholder="ระบุชื่อกิจกรรม สถานที่ บทบาท และรายละเอียดที่ตรวจสอบได้"></textarea></div><div class="field full"><label>หลักฐาน JPG / PNG / PDF</label><input type="file" name="evidence" accept="image/jpeg,image/png,application/pdf"><small>สูงสุด 2 MB · เก็บแบบส่วนตัวใน Google Drive</small></div></div><div class="actions"><button type="button" class="btn btn-secondary" id="cancel-submit">ยกเลิก</button><button type="submit" class="btn btn-primary">ส่งบันทึกความดี</button></div></form></div></div>`;
    document.getElementById("cancel-submit").onclick=()=>{state.tab=isStudent?"home":"records";renderDashboard();};
    document.getElementById("deed-form").onsubmit=submitDeed;
  }

  async function submitDeed(event) {
    event.preventDefault();
    const button=event.submitter;
    button.disabled=true;
    button.innerHTML='<span class="loading"></span> กำลังส่ง';
    try {
      const form=new FormData(event.target);
      const evidence=await fileToEvidence(form.get("evidence"));
      await api("submitDeed",{
        studentId:state.user.role==="student" ? state.user.studentId : form.get("studentId"),
        cohort:state.user.role==="student" ? state.user.cohort : form.get("cohort"),
        activityDate:form.get("activityDate"),
        hours:form.get("hours"),
        category:form.get("category"),
        description:form.get("description"),
        evidence
      });
      toast("ส่งบันทึกความดีแล้ว รออาจารย์ตรวจอนุมัติ","success");
      state.tab=state.user.role==="student"?"home":"records";
      await loadDashboard();
    } catch(error){
      toast(error.message,"error");
      button.disabled=false;
      button.textContent="ส่งบันทึกความดี";
    }
  }

  async function review(recordId,decision) {
    const note=prompt(decision==="approved"?"ข้อเสนอแนะ (เว้นว่างได้)":"โปรดระบุเหตุผลที่ไม่อนุมัติ") ?? null;
    if(note===null) return;
    if(decision==="rejected"&&!note.trim()) return toast("ต้องระบุเหตุผลที่ไม่อนุมัติ","error");
    try {
      const result=await api("reviewDeed",{recordId,decision,note});
      toast(result.lineNotified?"บันทึกผลและส่งแจ้งเตือน LINE แล้ว":"บันทึกผลแล้ว แต่บัญชีนี้ยังรับข้อความ LINE ไม่ได้",result.lineNotified?"success":"info");
      await loadDashboard();
    } catch(error){toast(error.message,"error");}
  }

  async function openEvidence(recordId) {
    const preview=window.open("about:blank","_blank");
    if(preview) preview.opener=null;
    try {
      const file=await api("getEvidence",{recordId});
      const binary=atob(file.dataBase64);
      const bytes=new Uint8Array(binary.length);
      for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
      const url=URL.createObjectURL(new Blob([bytes],{type:file.mimeType||"application/octet-stream"}));
      if(preview) preview.location=url; else window.open(url,"_blank","noopener");
      setTimeout(()=>URL.revokeObjectURL(url),60000);
    } catch(error) {
      if(preview) preview.close();
      toast(error.message,"error");
    }
  }

  function renderUsers(view) {
    if(!state.membersLoaded) {
      view.innerHTML='<div class="panel"><div class="panel-body"><span class="loading"></span> กำลังโหลดผู้ใช้</div></div>';
      loadMembers();
      return;
    }
    const issued=state.issuedCredential?`<div class="security-strip"><b>บัญชีที่สร้างล่าสุด</b><br>ชื่อผู้ใช้: <code>${escapeHtml(state.issuedCredential.username)}</code><br>รหัสผ่านชั่วคราว: <code>${escapeHtml(state.issuedCredential.temporaryPassword)}</code><br><small>ส่งให้เจ้าของบัญชีผ่านช่องทางส่วนตัว</small></div>`:"";
    view.innerHTML=`<div class="panel"><div class="panel-head"><h3>เพิ่มผู้ใช้</h3><span class="role">เฉพาะผู้ดูแลระบบ</span></div><div class="panel-body">${issued}<form id="member-form"><div class="grid-form"><div class="field"><label>ชื่อผู้ใช้ *</label><input name="username" required autocomplete="off"></div><div class="field"><label>รหัสนักเรียน</label><input name="studentId" autocomplete="off"></div><div class="field"><label>ชื่อที่แสดง *</label><input name="displayName" required></div><div class="field"><label>รุ่น / ชั้นปี</label><input name="cohort" placeholder="เช่น รุ่น 69"></div><div class="field"><label>บทบาท *</label><select name="role"><option value="student">นักเรียน</option><option value="teacher">อาจารย์ผู้ตรวจ</option><option value="admin">ผู้ดูแลระบบ</option></select></div></div><div class="actions"><button class="btn btn-primary" type="submit">สร้างบัญชีและรหัสผ่านชั่วคราว</button></div></form></div></div><div class="panel" style="margin-top:18px"><div class="panel-head"><h3>ผู้ใช้ในระบบ (${state.members.length})</h3><button id="refresh-members" class="btn btn-secondary">↻ รีเฟรช</button></div><div class="table-wrap"><table><thead><tr><th>ชื่อ</th><th>ชื่อผู้ใช้ / รหัสนักเรียน</th><th>รุ่น</th><th>บทบาท</th><th>สถานะ</th></tr></thead><tbody>${state.members.map(member=>`<tr><td>${escapeHtml(member.displayName)}</td><td>${escapeHtml(member.username)}<br><small>${escapeHtml(member.studentId||"")}</small></td><td>${escapeHtml(member.cohort||"—")}</td><td>${escapeHtml(roleLabel(member.role))}</td><td><span class="status ${member.active?"approved":"rejected"}">${member.active?"ใช้งาน":"ปิดใช้งาน"}</span></td></tr>`).join("")}</tbody></table></div></div>`;
    document.getElementById("member-form").onsubmit=createMember;
    document.getElementById("refresh-members").onclick=()=>{state.membersLoaded=false;state.issuedCredential=null;renderDashboard();};
  }

  async function loadMembers() {
    try {
      const result=await api("listMembers");
      state.members=result.members||[];
      state.membersLoaded=true;
      renderDashboard();
    } catch(error) {
      toast(error.message,"error");
      state.tab="records";
      renderDashboard();
    }
  }

  async function createMember(event) {
    event.preventDefault();
    const button=event.submitter;
    button.disabled=true;
    button.innerHTML='<span class="loading"></span> กำลังสร้าง';
    try {
      const form=new FormData(event.target);
      const result=await api("createMember",{username:form.get("username"),studentId:form.get("studentId"),displayName:form.get("displayName"),cohort:form.get("cohort"),role:form.get("role")});
      state.issuedCredential={username:result.member.studentId||form.get("username"),temporaryPassword:result.temporaryPassword};
      state.membersLoaded=false;
      toast("สร้างบัญชีแล้ว","success");
      await loadMembers();
    } catch(error) {
      toast(error.message,"error");
      button.disabled=false;
      button.textContent="สร้างบัญชีและรหัสผ่านชั่วคราว";
    }
  }

  async function logout() {
    try{await api("logout");}catch{}
    sessionStorage.removeItem(SESSION_KEY);
    state.sessionToken="";
    state.user=null;
    state.deeds=[];
    state.members=[];
    state.membersLoaded=false;
    state.issuedCredential=null;
    state.tab="home";
    renderLogin();
  }

  async function initializeLiff() {
    if (!CONFIG.LIFF_ID || !window.liff) return;
    if (CONFIG.LIFF_ENDPOINT_PATH && location.pathname !== CONFIG.LIFF_ENDPOINT_PATH) {
      state.liffPilotOnly = true;
      return;
    }
    try {
      await window.liff.init({ liffId: CONFIG.LIFF_ID });
      state.liffReady = true;
      state.liffLoggedIn = window.liff.isLoggedIn();
      if (!state.sessionToken && state.liffLoggedIn) {
        try {
          const result = await api("loginWithLine", { idToken: window.liff.getIDToken() });
          state.sessionToken = result.sessionToken;
          sessionStorage.setItem(SESSION_KEY, result.sessionToken);
          state.user = result.user;
          state.tab = state.user.role === "student" ? "home" : "records";
          if (state.user.mustChangePassword) return renderPasswordChange();
          return loadDashboard();
        } catch (error) {
          state.liffError = error.message === "บัญชี LINE นี้ยังไม่ผูกกับนักเรียน" ? "ยังไม่ผูกบัญชี กรุณายืนยันรหัสนักเรียนด้านล่างหนึ่งครั้ง" : error.message;
        }
      }
    } catch (error) {
      state.liffError = "เชื่อมต่อ LINE ไม่สำเร็จ กรุณาปิดหน้าแล้วเปิดจากเมนู LINE OA ใหม่";
    }
  }

  async function initializeApp() {
    injectLegacyTheme();
    if (state.sessionToken) return restoreSession();
    await initializeLiff();
    if (!state.user) renderLogin();
  }

  initializeApp();
})();
