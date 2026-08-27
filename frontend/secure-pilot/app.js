(function () {
  "use strict";
  const CONFIG = window.GOOD_DEED_CONFIG;
  const app = document.getElementById("app");
  const bridge = document.getElementById("api-bridge");
  const callbacks = new Map();
  const state = { sessionToken: sessionStorage.getItem("gd_session") || "", user: null, deeds: [], members: [], membersLoaded: false, issuedCredential: null, tab: "records", busy: false, loginRole: "student", liffReady: false, liffLoggedIn: false, liffError: "" };

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
    clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove("show"), 3200);
  }

  window.addEventListener("message", (event) => {
    if (!CONFIG.RESPONSE_ORIGINS.includes(event.origin)) return;
    const data = event.data;
    if (!data || data.channel !== "RTAFNC_GOODDEED" || !data.requestId) return;
    const pending = callbacks.get(data.requestId);
    if (!pending) return;
    clearTimeout(pending.timeout); callbacks.delete(data.requestId); pending.cleanup();
    data.ok ? pending.resolve(data.data) : pending.reject(new Error(data.error || "ระบบไม่ตอบสนอง"));
  });

  function api(action, payload={}) {
    return new Promise((resolve, reject) => {
      const id = requestId();
      const frame = document.createElement("iframe");
      const form = document.createElement("form");
      const frameName = `gas_${id.replace(/[^a-zA-Z0-9]/g, "")}`;
      frame.name = frameName; frame.hidden = true;
      form.method = "POST"; form.action = CONFIG.GAS_WEB_APP_URL; form.target = frameName; form.hidden = true;
      const fields = { action, requestId:id, origin:location.origin, sessionToken:state.sessionToken, payload:JSON.stringify(payload) };
      Object.entries(fields).forEach(([name,value]) => { const input=document.createElement("input"); input.type="hidden"; input.name=name; input.value=value; form.appendChild(input); });
      const cleanup = () => { form.remove(); frame.remove(); };
      const timeout = setTimeout(() => { callbacks.delete(id); cleanup(); reject(new Error("หมดเวลารอ Apps Script กรุณาลองใหม่")); }, CONFIG.REQUEST_TIMEOUT_MS);
      callbacks.set(id,{resolve,reject,timeout,cleanup}); bridge.append(frame,form); form.submit();
    });
  }

  async function fileToEvidence(file) {
    if (!file || !file.size) return null;
    if (file.size > CONFIG.MAX_EVIDENCE_BYTES) throw new Error("ไฟล์หลักฐานต้องไม่เกิน 2 MB");
    if (!["image/jpeg","image/png","application/pdf"].includes(file.type)) throw new Error("รองรับ JPG, PNG หรือ PDF เท่านั้น");
    const dataUrl = await new Promise((resolve,reject) => { const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=reject; reader.readAsDataURL(file); });
    return {name:file.name,type:file.type,size:file.size,dataUrl};
  }

  function renderLogin() {
    const lineStatus = state.liffError ? `<div class="line-status error">LINE LIFF: ${escapeHtml(state.liffError)}</div>` : state.liffLoggedIn ? '<div class="line-status ok">เชื่อมต่อบัญชี LINE แล้ว</div>' : '<div class="line-status">นักเรียนเปิดผ่าน LINE เพื่อเข้าสู่ระบบและรับผลการอนุมัติ</div>';
    app.innerHTML = `<main class="login"><section class="login-card"><div class="login-mark"><img src="510903.jpg" alt="ตราวิทยาลัยพยาบาลทหารอากาศ" width="92" height="92"></div><div class="pilot-badge">SECURE PILOT · LIFF VERIFIED</div><h1>ระบบบันทึกความดีจิตอาสา</h1><p>วิทยาลัยพยาบาลทหารอากาศ · ปีการศึกษา 2569</p><div class="login-tabs" role="tablist" aria-label="ประเภทผู้ใช้งาน"><button type="button" class="login-tab ${state.loginRole === "student" ? "active" : ""}" data-login-role="student" role="tab" aria-selected="${state.loginRole === "student"}">นักเรียน</button><button type="button" class="login-tab ${state.loginRole === "staff" ? "active" : ""}" data-login-role="staff" role="tab" aria-selected="${state.loginRole === "staff"}">อาจารย์ / ผู้ดูแล</button></div><div class="line-box"><button type="button" id="line-login" class="btn btn-line" ${state.liffReady && !state.liffLoggedIn ? "" : "hidden"}>เข้าสู่ระบบด้วย LINE</button>${lineStatus}</div><form id="login-form"><div class="field"><label for="username">รหัสนักเรียน / ชื่อผู้ใช้</label><input id="username" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required></div><div class="field"><label for="password">รหัสผ่าน</label><input id="password" name="password" type="password" autocomplete="current-password" required></div><button class="btn btn-primary" style="width:100%;margin-top:7px" type="submit">${state.loginRole === "student" && state.liffLoggedIn ? "ผูกบัญชีนักเรียนกับ LINE และเข้าสู่ระบบ" : "เข้าสู่ระบบอย่างปลอดภัย"}</button></form><div class="security-strip"><b>🔒 LINE user ID ตรวจสอบที่ Apps Script</b>GitHub เก็บเฉพาะหน้าเว็บ ไม่เก็บรายชื่อนักเรียน รหัสผ่าน Channel token หรือ Channel secret</div><div class="login-note">การผูก LINE ครั้งแรกต้องยืนยันด้วยรหัสนักเรียนและรหัสผ่าน</div></section></main>`;
    document.getElementById("login-form").addEventListener("submit", login);
    const lineButton = document.getElementById("line-login");
    if (lineButton) lineButton.addEventListener("click", () => window.liff.login({ redirectUri: location.origin + location.pathname }));
    document.querySelectorAll("[data-login-role]").forEach((tab) => tab.addEventListener("click", () => {
      state.loginRole = tab.dataset.loginRole;
      renderLogin(); document.getElementById("username").focus();
    }));
  }

  async function login(event) {
    event.preventDefault();
    const button=event.submitter; button.disabled=true; button.innerHTML='<span class="loading"></span> กำลังตรวจสอบ';
    try {
      const shouldBindLine = state.loginRole === "student" && state.liffLoggedIn && window.liff && window.liff.getIDToken();
      const action = shouldBindLine ? "bindLineAndLogin" : "login";
      const result=await api(action,{username:event.target.username.value.trim(),password:event.target.password.value,idToken:shouldBindLine?window.liff.getIDToken():""});
      state.sessionToken=result.sessionToken; sessionStorage.setItem("gd_session",result.sessionToken); state.user=result.user;
      if (state.user.mustChangePassword) renderPasswordChange(); else await loadDashboard();
    } catch(error) { toast(error.message,"error"); button.disabled=false; button.textContent="เข้าสู่ระบบอย่างปลอดภัย"; }
  }

  async function restoreSession() {
    if (!state.sessionToken) return renderLogin();
    try { const result=await api("me"); state.user=result.user; if (state.user.mustChangePassword) renderPasswordChange(); else await loadDashboard(); }
    catch { sessionStorage.removeItem("gd_session"); state.sessionToken=""; renderLogin(); }
  }

  function renderPasswordChange() {
    app.innerHTML=`<main class="login"><section class="login-card"><div class="login-mark"><img src="510903.jpg" alt="ตราวิทยาลัยพยาบาลทหารอากาศ" width="92" height="92"></div><h1>ตั้งรหัสผ่านใหม่</h1><p>บัญชีนี้ใช้รหัสผ่านชั่วคราว กรุณาเปลี่ยนก่อนใช้งาน</p><form id="password-form"><div class="field"><label for="currentPassword">รหัสผ่านชั่วคราว</label><input id="currentPassword" name="currentPassword" type="password" autocomplete="current-password" required></div><div class="field"><label for="newPassword">รหัสผ่านใหม่</label><input id="newPassword" name="newPassword" type="password" minlength="8" autocomplete="new-password" required><small>อย่างน้อย 8 ตัวอักษร</small></div><div class="field"><label for="confirmPassword">ยืนยันรหัสผ่านใหม่</label><input id="confirmPassword" name="confirmPassword" type="password" minlength="8" autocomplete="new-password" required></div><button class="btn btn-primary" style="width:100%;margin-top:7px" type="submit">บันทึกรหัสผ่านใหม่</button></form><button id="password-logout" class="btn btn-secondary" style="width:100%;margin-top:10px">ออกจากระบบ</button></section></main>`;
    document.getElementById("password-form").onsubmit=changePassword;
    document.getElementById("password-logout").onclick=logout;
  }

  async function changePassword(event) {
    event.preventDefault();
    const form=event.target; const button=event.submitter;
    if(form.newPassword.value!==form.confirmPassword.value) return toast("ยืนยันรหัสผ่านไม่ตรงกัน","error");
    button.disabled=true; button.innerHTML='<span class="loading"></span> กำลังบันทึก';
    try {
      await api("changePassword",{currentPassword:form.currentPassword.value,newPassword:form.newPassword.value});
      sessionStorage.removeItem("gd_session"); state.sessionToken=""; state.user=null; renderLogin(); toast("เปลี่ยนรหัสผ่านแล้ว กรุณาเข้าสู่ระบบอีกครั้ง","success");
    } catch(error) { toast(error.message,"error"); button.disabled=false; button.textContent="บันทึกรหัสผ่านใหม่"; }
  }

  async function loadDashboard() {
    try { const result=await api("listDeeds",{limit:250}); state.deeds=result.deeds || []; renderDashboard(); }
    catch(error) { toast(error.message,"error"); renderDashboard(); }
  }

  function renderDashboard() {
    const user=state.user; const approved=state.deeds.filter(d=>d.status==="approved"); const pending=state.deeds.filter(d=>d.status==="pending");
    const totalHours=approved.reduce((sum,d)=>sum+Number(d.hours||0),0); const canReview=["teacher","admin"].includes(user.role);
    app.innerHTML=`<div class="shell"><header class="topbar"><div class="topbar-inner"><div class="brand"><div class="crest">วพอ.</div><div><h1>ระบบบันทึกความดีออนไลน์</h1><small>Air Force Nursing College · 2569</small></div></div><div class="userbar"><span class="role">${escapeHtml(roleLabel(user.role))}</span><button id="logout" class="btn btn-secondary">ออกจากระบบ</button></div></div></header><main class="page"><section class="hero"><div class="hero-main"><p class="eyebrow">RTAFNC GOOD DEED COMMAND CENTER</p><h2>สวัสดี ${escapeHtml(user.displayName)}</h2><p>${canReview?"ตรวจรายการ อนุมัติหลักฐาน และติดตามร่องรอยการดำเนินงานจากจุดเดียว":"ยื่นบันทึกความดี ติดตามสถานะ และเก็บผลงานของตนเองอย่างเป็นระบบ"}</p></div><div class="hero-side"><div class="metric approved"><strong>${totalHours.toLocaleString("th-TH")}</strong><span>ชั่วโมงอนุมัติ</span></div><div class="metric pending"><strong>${pending.length}</strong><span>รายการรอตรวจ</span></div></div></section><nav class="tabs"><button class="tab ${state.tab==="records"?"active":""}" data-tab="records">รายการทั้งหมด</button><button class="tab ${state.tab==="submit"?"active":""}" data-tab="submit">＋ ยื่นความดี</button>${canReview?`<button class="tab ${state.tab==="review"?"active":""}" data-tab="review">คิวอนุมัติ (${pending.length})</button>`:""}${user.role==="admin"?`<button class="tab ${state.tab==="users"?"active":""}" data-tab="users">จัดการผู้ใช้</button>`:""}</nav><section id="view"></section></main></div>`;
    document.getElementById("logout").onclick=logout; document.querySelectorAll("[data-tab]").forEach(btn=>btn.onclick=()=>{state.tab=btn.dataset.tab;renderDashboard();}); renderView();
  }

  function renderView() {
    const view=document.getElementById("view"); if(state.tab==="submit") return renderSubmit(view); if(state.tab==="review") return renderRecords(view,state.deeds.filter(d=>d.status==="pending"),true); if(state.tab==="users"&&state.user.role==="admin") return renderUsers(view); return renderRecords(view,state.deeds,false);
  }

  function renderRecords(view,records,reviewMode) {
    view.innerHTML=`<div class="panel"><div class="panel-head"><h3>${reviewMode?"รายการรอการอนุมัติ":"ประวัติบันทึกความดี"}</h3><button id="refresh" class="btn btn-secondary">↻ รีเฟรช</button></div>${records.length?`<div class="table-wrap"><table><thead><tr><th>วันที่</th><th>ผู้ยื่น</th><th>ประเภท/รายละเอียด</th><th>ชั่วโมง</th><th>หลักฐาน</th><th>สถานะ</th><th>ดำเนินการ</th></tr></thead><tbody>${records.map(recordRow).join("")}</tbody></table></div>`:`<div class="empty"><b>${reviewMode?"ไม่มีรายการค้าง":"ยังไม่มีบันทึกความดี"}</b>${reviewMode?"ทุกรายการได้รับการตรวจแล้ว":"เริ่มต้นด้วยการกด ‘ยื่นความดี’"}</div>`}</div>`;
    document.getElementById("refresh").onclick=loadDashboard; document.querySelectorAll("[data-review]").forEach(btn=>btn.onclick=()=>review(btn.dataset.review,btn.dataset.decision)); document.querySelectorAll("[data-evidence]").forEach(btn=>btn.onclick=()=>openEvidence(btn.dataset.evidence));
  }

  function recordRow(record) {
    const evidence=record.hasEvidence?`<button class="btn btn-secondary" data-evidence="${escapeHtml(record.recordId)}">เปิดไฟล์</button>`:"—";
    const controls=state.user.role!=="student"&&record.status==="pending"?`<div class="record-actions"><button class="btn btn-success" data-review="${escapeHtml(record.recordId)}" data-decision="approved">อนุมัติ</button><button class="btn btn-danger" data-review="${escapeHtml(record.recordId)}" data-decision="rejected">ไม่อนุมัติ</button></div>`:"—";
    return `<tr><td>${formatDate(record.activityDate)}</td><td>${escapeHtml(record.ownerName)}<br><small>${escapeHtml(record.studentId||"")}</small></td><td><b>${escapeHtml(record.category)}</b><br>${escapeHtml(record.description)}</td><td>${Number(record.hours).toLocaleString("th-TH")}</td><td>${evidence}</td><td><span class="status ${escapeHtml(record.status)}">${statusLabel(record.status)}</span></td><td>${controls}</td></tr>`;
  }

  function renderSubmit(view) {
    const today=new Date().toISOString().slice(0,10); view.innerHTML=`<div class="panel"><div class="panel-head"><h3>ยื่นบันทึกความดีใหม่</h3><span class="role">ข้อมูลส่งตรงไป Apps Script</span></div><div class="panel-body"><form id="deed-form"><div class="grid-form"><div class="field"><label>รหัสนักเรียน *</label><input name="studentId" value="${escapeHtml(state.user.studentId||"")}" required></div><div class="field"><label>รุ่น / ชั้นปี</label><input name="cohort" value="${escapeHtml(state.user.cohort||"")}" placeholder="เช่น รุ่น 69"></div><div class="field"><label>วันที่ทำกิจกรรม *</label><input type="date" name="activityDate" value="${today}" required></div><div class="field"><label>จำนวนชั่วโมง *</label><input type="number" name="hours" min="0.5" max="24" step="0.5" value="1" required></div><div class="field full"><label>ประเภทความดี *</label><select name="category" required><option value="">เลือกประเภท</option><option>จิตอาสาและบำเพ็ญประโยชน์</option><option>วินัยและความรับผิดชอบ</option><option>ช่วยเหลือเพื่อนและส่วนรวม</option><option>ส่งเสริมวิชาชีพพยาบาล</option><option>อนุรักษ์สิ่งแวดล้อม</option><option>กิจกรรมสถาบันและกองทัพอากาศ</option><option>อื่น ๆ</option></select></div><div class="field full"><label>รายละเอียดกิจกรรม *</label><textarea name="description" maxlength="1200" required placeholder="ทำอะไร ที่ไหน มีผลต่อใคร อย่างไร"></textarea></div><div class="field full"><label>หลักฐาน JPG / PNG / PDF</label><input type="file" name="evidence" accept="image/jpeg,image/png,application/pdf"><small>สูงสุด 2 MB · ไฟล์จะเก็บแบบส่วนตัวใน Google Drive</small></div></div><div class="actions"><button type="button" class="btn btn-secondary" id="cancel-submit">ยกเลิก</button><button type="submit" class="btn btn-primary">ส่งบันทึกความดี</button></div></form></div></div>`;
    document.getElementById("cancel-submit").onclick=()=>{state.tab="records";renderDashboard();}; document.getElementById("deed-form").onsubmit=submitDeed;
  }

  async function submitDeed(event) {
    event.preventDefault(); const button=event.submitter; button.disabled=true; button.innerHTML='<span class="loading"></span> กำลังส่ง';
    try { const form=new FormData(event.target); const evidence=await fileToEvidence(form.get("evidence")); await api("submitDeed",{studentId:form.get("studentId"),cohort:form.get("cohort"),activityDate:form.get("activityDate"),hours:form.get("hours"),category:form.get("category"),description:form.get("description"),evidence}); toast("ส่งบันทึกความดีแล้ว","success"); state.tab="records"; await loadDashboard(); }
    catch(error){toast(error.message,"error");button.disabled=false;button.textContent="ส่งบันทึกความดี";}
  }

  async function review(recordId,decision) {
    const note=prompt(decision==="approved"?"ข้อเสนอแนะ (เว้นว่างได้)":"โปรดระบุเหตุผลที่ไม่อนุมัติ") ?? null; if(note===null) return; if(decision==="rejected"&&!note.trim()) return toast("ต้องระบุเหตุผลที่ไม่อนุมัติ","error");
    try { const result=await api("reviewDeed",{recordId,decision,note}); toast(result.lineNotified?"บันทึกผลและส่งแจ้งเตือน LINE แล้ว":"บันทึกผลแล้ว แต่บัญชีนี้ยังรับข้อความ LINE ไม่ได้",result.lineNotified?"success":"info"); await loadDashboard(); } catch(error){toast(error.message,"error");}
  }

  async function openEvidence(recordId) {
    const preview=window.open("about:blank","_blank"); if(preview) preview.opener=null;
    try {
      const file=await api("getEvidence",{recordId});
      const binary=atob(file.dataBase64); const bytes=new Uint8Array(binary.length);
      for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
      const url=URL.createObjectURL(new Blob([bytes],{type:file.mimeType||"application/octet-stream"}));
      if(preview) preview.location=url; else window.open(url,"_blank","noopener");
      setTimeout(()=>URL.revokeObjectURL(url),60000);
    } catch(error) { if(preview) preview.close(); toast(error.message,"error"); }
  }

  function renderUsers(view) {
    if(!state.membersLoaded) {
      view.innerHTML='<div class="panel"><div class="panel-body"><span class="loading"></span> กำลังโหลดผู้ใช้</div></div>';
      loadMembers(); return;
    }
    const issued=state.issuedCredential?`<div class="security-strip"><b>บัญชีที่สร้างล่าสุด</b><br>ชื่อผู้ใช้: <code>${escapeHtml(state.issuedCredential.username)}</code><br>รหัสผ่านชั่วคราว: <code>${escapeHtml(state.issuedCredential.temporaryPassword)}</code><br><small>คัดลอกส่งให้เจ้าของบัญชีผ่านช่องทางส่วนตัว หน้านี้จะไม่เก็บรหัสผ่านไว้ถาวร</small></div>`:"";
    view.innerHTML=`<div class="panel"><div class="panel-head"><h3>เพิ่มผู้ใช้</h3><span class="role">เฉพาะผู้ดูแลระบบ</span></div><div class="panel-body">${issued}<form id="member-form"><div class="grid-form"><div class="field"><label>ชื่อผู้ใช้ *</label><input name="username" required autocomplete="off"></div><div class="field"><label>รหัสนักเรียน</label><input name="studentId" autocomplete="off"></div><div class="field"><label>ชื่อที่แสดง *</label><input name="displayName" required></div><div class="field"><label>รุ่น / ชั้นปี</label><input name="cohort" placeholder="เช่น รุ่น 69"></div><div class="field"><label>บทบาท *</label><select name="role"><option value="student">นักเรียน</option><option value="teacher">อาจารย์ผู้ตรวจ</option><option value="admin">ผู้ดูแลระบบ</option></select></div></div><div class="actions"><button class="btn btn-primary" type="submit">สร้างบัญชีและรหัสผ่านชั่วคราว</button></div></form></div></div><div class="panel" style="margin-top:18px"><div class="panel-head"><h3>ผู้ใช้ในระบบ (${state.members.length})</h3><button id="refresh-members" class="btn btn-secondary">↻ รีเฟรช</button></div><div class="table-wrap"><table><thead><tr><th>ชื่อ</th><th>ชื่อผู้ใช้ / รหัสนักเรียน</th><th>รุ่น</th><th>บทบาท</th><th>สถานะ</th></tr></thead><tbody>${state.members.map(member=>`<tr><td>${escapeHtml(member.displayName)}</td><td>${escapeHtml(member.username)}<br><small>${escapeHtml(member.studentId||"")}</small></td><td>${escapeHtml(member.cohort||"—")}</td><td>${escapeHtml(roleLabel(member.role))}</td><td><span class="status ${member.active?"approved":"rejected"}">${member.active?"ใช้งาน":"ปิดใช้งาน"}</span></td></tr>`).join("")}</tbody></table></div></div>`;
    document.getElementById("member-form").onsubmit=createMember;
    document.getElementById("refresh-members").onclick=()=>{state.membersLoaded=false;state.issuedCredential=null;renderDashboard();};
  }

  async function loadMembers() {
    try { const result=await api("listMembers"); state.members=result.members||[]; state.membersLoaded=true; renderDashboard(); }
    catch(error) { toast(error.message,"error"); state.tab="records"; renderDashboard(); }
  }

  async function createMember(event) {
    event.preventDefault(); const button=event.submitter; button.disabled=true; button.innerHTML='<span class="loading"></span> กำลังสร้าง';
    try {
      const form=new FormData(event.target); const result=await api("createMember",{username:form.get("username"),studentId:form.get("studentId"),displayName:form.get("displayName"),cohort:form.get("cohort"),role:form.get("role")});
      state.issuedCredential={username:result.member.studentId||form.get("username"),temporaryPassword:result.temporaryPassword}; state.membersLoaded=false; toast("สร้างบัญชีแล้ว","success"); await loadMembers();
    } catch(error) { toast(error.message,"error"); button.disabled=false; button.textContent="สร้างบัญชีและรหัสผ่านชั่วคราว"; }
  }

  async function logout() { try{await api("logout");}catch{} sessionStorage.removeItem("gd_session");state.sessionToken="";state.user=null;state.deeds=[];state.members=[];state.membersLoaded=false;state.issuedCredential=null;renderLogin(); }

  async function initializeLiff() {
    if (!CONFIG.LIFF_ID || !window.liff) return;
    try {
      await window.liff.init({ liffId: CONFIG.LIFF_ID });
      state.liffReady = true;
      state.liffLoggedIn = window.liff.isLoggedIn();
      if (!state.sessionToken && state.liffLoggedIn) {
        try {
          const result = await api("loginWithLine", { idToken: window.liff.getIDToken() });
          state.sessionToken = result.sessionToken;
          sessionStorage.setItem("gd_session", result.sessionToken);
          state.user = result.user;
          if (state.user.mustChangePassword) return renderPasswordChange();
          return loadDashboard();
        } catch (error) {
          state.liffError = error.message === "บัญชี LINE นี้ยังไม่ผูกกับนักเรียน" ? "ยังไม่ผูกบัญชี กรุณายืนยันรหัสด้านล่างหนึ่งครั้ง" : error.message;
        }
      }
    } catch (error) {
      state.liffError = "เชื่อมต่อไม่ได้ กรุณาตรวจ LIFF ID และ Endpoint URL";
    }
  }

  async function initializeApp() {
    if (state.sessionToken) return restoreSession();
    await initializeLiff();
    if (!state.user) renderLogin();
  }
  initializeApp();
})();
