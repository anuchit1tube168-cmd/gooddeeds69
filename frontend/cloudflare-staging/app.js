(() => {
  "use strict";

  const config = window.GOOD_DEED_CLOUDFLARE || {};
  const state = {
    health: null,
    session: null,
    csrfToken: "",
    busy: false
  };

  const $ = (id) => document.getElementById(id);

  function text(value) {
    return value === undefined || value === null || value === "" ? "—" : String(value);
  }

  function toast(message, isError = false) {
    const node = $("toast");
    node.textContent = message;
    node.classList.toggle("error", Boolean(isError));
    node.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove("show"), 3200);
  }

  function gatewayOrigin() {
    const base = config.GATEWAY_BASE_URL || window.location.origin;
    return new URL(base, window.location.origin).origin;
  }

  function assertFailClosedConfig() {
    if (config.PRODUCTION_CUTOVER !== false) throw new Error("staging_config_must_keep_production_cutover_false");
    if (config.WRITES_ENABLED !== false) throw new Error("staging_config_must_keep_writes_false");
    if (config.SAME_ORIGIN_REQUIRED !== true) throw new Error("same_origin_guard_required");
    if (gatewayOrigin() !== window.location.origin) throw new Error("gateway_must_be_same_origin_for_host_session_cookie");
  }

  function endpoint(path) {
    return new URL(path, gatewayOrigin()).toString();
  }

  async function request(path, options = {}) {
    assertFailClosedConfig();
    const response = await fetch(endpoint(path), {
      method: options.method || "GET",
      credentials: "include",
      cache: "no-store",
      headers: {
        accept: "application/json",
        ...(options.body ? { "content-type": "application/json" } : {}),
        ...(options.headers || {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch {
      payload = { error: "invalid_json_response" };
    }

    return { ok: response.ok, status: response.status, payload };
  }

  function renderHealth() {
    const node = $("health");
    const h = state.health;
    if (!h) {
      node.innerHTML = "<div><dt>สถานะ</dt><dd>ยังไม่มีข้อมูล</dd></div>";
      return;
    }
    const module = Array.isArray(h.modules) ? h.modules.find((item) => item.key === "gooddeed") : null;
    node.innerHTML = "";
    const rows = [
      ["Gateway", h.ok ? "พร้อมตอบสนอง" : "ผิดปกติ"],
      ["Environment", text(h.environment)],
      ["Auth session", h.authSessionEnabled ? "enabled" : "disabled"],
      ["D1 binding", h.d1Bound ? "bound" : "not bound"],
      ["Good Deed read", module ? String(module.readEnabled) : "unknown"],
      ["Good Deed write", module ? String(module.writeEnabled) : "unknown"],
      ["Production cutover", String(Boolean(h.productionCutover))]
    ];
    for (const [label, value] of rows) {
      const div = document.createElement("div");
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = label;
      dd.textContent = value;
      div.append(dt, dd);
      node.append(div);
    }
  }

  function renderSession() {
    const node = $("session");
    const s = state.session;
    node.innerHTML = "";
    const rows = s && s.authenticated ? [
      ["Authenticated", "true"],
      ["Account status", text(s.accountStatus)],
      ["Student Master linked", String(Boolean(s.studentLinked))],
      ["Roles", Array.isArray(s.roles) && s.roles.length ? s.roles.join(", ") : "—"],
      ["Permissions", Array.isArray(s.permissions) && s.permissions.length ? s.permissions.join(", ") : "—"],
      ["Expires", s.expiresAt ? new Date(Number(s.expiresAt) * 1000).toLocaleString("th-TH") : "—"]
    ] : [
      ["Authenticated", "false"],
      ["สถานะ", "รอ LINE verification บน Core"]
    ];

    for (const [label, value] of rows) {
      const div = document.createElement("div");
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = label;
      dd.textContent = value;
      div.append(dt, dd);
      node.append(div);
    }

    $("logout").disabled = !(s && s.authenticated);
  }

  async function checkHealth() {
    try {
      const result = await request("/health");
      state.health = result.payload;
      renderHealth();
      if (!result.ok) toast(`Gateway health HTTP ${result.status}`, true);
    } catch (error) {
      state.health = { ok: false, environment: "unreachable" };
      renderHealth();
      toast(error.message || "ตรวจ Gateway ไม่สำเร็จ", true);
    }
  }

  async function checkSession() {
    try {
      const result = await request("/auth/session");
      state.session = result.ok ? result.payload : { authenticated: false };
      renderSession();
    } catch (error) {
      state.session = { authenticated: false };
      renderSession();
      toast(error.message || "ตรวจ session ไม่สำเร็จ", true);
    }
  }

  async function connectLine() {
    if (state.busy) return;
    state.busy = true;
    const button = $("line-connect");
    button.disabled = true;
    try {
      assertFailClosedConfig();
      const liffId = String(config.STAGING_LIFF_ID || "");
      if (!liffId || liffId.startsWith("REPLACE-")) throw new Error("ยังไม่ได้ตั้งค่า STAGING_LIFF_ID");
      if (!window.liff) throw new Error("โหลด LINE LIFF SDK ไม่สำเร็จ");

      await window.liff.init({ liffId });
      if (!window.liff.isLoggedIn()) {
        window.liff.login({ redirectUri: window.location.href });
        return;
      }

      const idToken = window.liff.getIDToken();
      if (!idToken) throw new Error("ไม่พบ LINE ID token");

      const result = await request("/auth/line/verify", {
        method: "POST",
        body: { idToken }
      });
      if (!result.ok) throw new Error(result.payload.error || `LINE verify HTTP ${result.status}`);

      state.csrfToken = result.payload.csrfToken || "";
      state.session = result.payload;
      renderSession();
      toast("LINE verification ผ่าน Core แล้ว");
    } catch (error) {
      toast(error.message || "เชื่อมต่อ LINE ไม่สำเร็จ", true);
    } finally {
      state.busy = false;
      button.disabled = false;
    }
  }

  async function logout() {
    try {
      await request("/auth/logout", { method: "POST", body: {} });
    } finally {
      state.session = { authenticated: false };
      state.csrfToken = "";
      renderSession();
      $("probe").textContent = "ยังไม่ได้ทดสอบโมดูล";
    }
  }

  async function probeModule() {
    const output = $("probe");
    output.textContent = "กำลังทดสอบ…";
    try {
      const result = await request(config.MODULE_PATH || "/api/gooddeed");
      output.textContent = JSON.stringify({ status: result.status, ...result.payload }, null, 2);
      if (result.status === 503 && result.payload.error === "module_read_disabled") {
        toast("ถูกต้องสำหรับ Phase 3A: Good Deed read ยังถูกล็อก");
      } else if (result.status === 503 && result.payload.error === "adapter_not_configured") {
        toast("Core auth/RBAC ผ่านแล้ว แต่ adapter ยังไม่เปิด");
      } else if (!result.ok) {
        toast(`Module probe HTTP ${result.status}`, true);
      }
    } catch (error) {
      output.textContent = error.message || "probe_failed";
      toast(error.message || "ทดสอบโมดูลไม่สำเร็จ", true);
    }
  }

  async function init() {
    try {
      assertFailClosedConfig();
    } catch (error) {
      $("mode-badge").textContent = "CONFIG BLOCKED";
      toast(error.message, true);
      renderHealth();
      renderSession();
      return;
    }

    $("check-health").addEventListener("click", checkHealth);
    $("line-connect").addEventListener("click", connectLine);
    $("logout").addEventListener("click", logout);
    $("probe-module").addEventListener("click", probeModule);

    await Promise.all([checkHealth(), checkSession()]);
  }

  init();
})();
