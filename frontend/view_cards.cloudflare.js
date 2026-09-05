(() => {
  "use strict";

  const cfg = window.GOOD_DEED_CLOUDFLARE || {};
  const $ = (id) => document.getElementById(id);
  const state = { session: null, card: null };

  function setStatus(kind, title, detail) {
    const box = $("status-box");
    box.className = `notice ${kind || ""}`.trim();
    $("status-title").textContent = title;
    $("status-detail").textContent = detail || "";
  }

  function levelFromHours(hours) {
    const h = Number(hours || 0);
    if (h >= 400) return { key: "diamond", label: "CROWN DIAMOND", stars: 10, chibi: 8 };
    if (h >= 300) return { key: "platinum", label: "PLATINUM PASS", stars: 8, chibi: 7 };
    if (h >= 150) return { key: "gold", label: "GOLD PASS", stars: 5, chibi: 6 };
    if (h >= 50) return { key: "green", label: "GREEN PASS", stars: 3, chibi: 4 };
    return { key: "welcome", label: "WELCOME PASS", stars: 1, chibi: 1 };
  }

  function renderCard(card) {
    const hours = Number(card.totalHours || 0);
    const level = card.level && typeof card.level === "object" ? card.level : levelFromHours(hours);
    const root = $("my-card");
    root.className = `member-card ${level.key === "welcome" ? "" : level.key}`.trim();
    $("card-level").textContent = level.label || "MEMBER";
    $("card-name").textContent = card.displayName || "สมาชิก วพอ.";
    $("card-student-id").textContent = card.studentId || card.studentRefMasked || "-";
    $("card-cohort").textContent = card.cohortLabel || "-";
    $("card-position").textContent = card.positionLabel || "นักเรียนพยาบาล";
    $("card-hours").textContent = hours.toFixed(hours % 1 ? 1 : 0);
    $("card-stars").textContent = "★".repeat(Math.max(1, Math.min(10, Number(level.stars || 1)))) + "☆".repeat(Math.max(0, 10 - Number(level.stars || 1)));

    const avatar = $("card-avatar");
    avatar.replaceChildren();
    const img = document.createElement("img");
    img.alt = "รูปสมาชิก";
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    img.src = card.photoUrl || `photos/chibi/chibi_lv${Number(level.chibi || 1)}.png`;
    img.addEventListener("error", () => {
      avatar.replaceChildren();
      avatar.textContent = "✈️";
    }, { once: true });
    avatar.appendChild(img);
    root.classList.remove("skeleton");
  }

  async function api(path, options = {}) {
    const res = await fetch(path, {
      credentials: "include",
      cache: "no-store",
      redirect: "error",
      ...options,
      headers: { accept: "application/json", ...(options.headers || {}) }
    });
    let body = null;
    try { body = await res.json(); } catch (_) {}
    return { res, body };
  }

  async function readSession() {
    const { res, body } = await api(cfg.SESSION_ENDPOINT || "/auth/session");
    if (!res.ok || !body?.authenticated) return null;
    return body;
  }

  async function ensureLineSession() {
    const existing = await readSession();
    if (existing) return existing;

    if (!window.liff || !cfg.LIFF_ID) throw new Error("liff_unavailable");
    await window.liff.init({ liffId: cfg.LIFF_ID, withLoginOnExternalBrowser: true });
    if (!window.liff.isLoggedIn()) {
      window.liff.login({ redirectUri: window.location.href });
      return null;
    }

    const idToken = window.liff.getIDToken();
    if (!idToken) throw new Error("line_id_token_missing");
    const { res, body } = await api(cfg.LINE_VERIFY_ENDPOINT || "/auth/line/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken })
    });
    if (!res.ok || !body?.authenticated) throw new Error(body?.error || "line_verification_failed");
    return body;
  }

  async function loadOwnCard() {
    const endpoint = cfg.CARD_SELF_ENDPOINT || "/api/gooddeed/card-self";
    const { res, body } = await api(endpoint);
    if (res.status === 503 && ["module_read_disabled", "adapter_not_configured"].includes(body?.error)) {
      setStatus("", "หน้า Cloudflare พร้อมแล้ว — ข้อมูลจริงยังถูกล็อก", "กำลังรอเปิด Read-only adapter ใน Staging เท่านั้น ระบบ Production เดิมยังไม่เปลี่ยน");
      return;
    }
    if (res.status === 403 && body?.error === "student_master_link_required") {
      setStatus("", "รอยืนยันบัญชีกับ Student Master", "บัญชี LINE นี้ยังไม่ได้รับการเชื่อมโดยผู้ดูแล จึงไม่เปิดข้อมูลบัตร");
      return;
    }
    if (!res.ok || !body?.card) throw new Error(body?.error || `card_load_failed_${res.status}`);
    state.card = body.card;
    renderCard(body.card);
    setStatus("ok", "ยืนยันตัวตนสำเร็จ", "แสดงเฉพาะบัตรของบัญชีที่เข้าสู่ระบบ ไม่มีการโหลดรายชื่อนักเรียนทั้งหมดลง browser");
  }

  async function boot() {
    $("login-btn").disabled = true;
    try {
      setStatus("", "กำลังตรวจสอบสิทธิ์", "ใช้ LINE session และ RTAFNC ONE Core แบบ server-side");
      state.session = await ensureLineSession();
      if (!state.session) return;
      $("login-btn").classList.add("hidden");
      $("logout-btn").classList.remove("hidden");

      if (!state.session.studentLinked) {
        setStatus("", "เข้าสู่ระบบแล้ว แต่ยังไม่เปิดข้อมูล", "ต้องผ่านการเชื่อม Student Master แบบ owner-approved ก่อน");
        return;
      }
      await loadOwnCard();
    } catch (err) {
      const code = err instanceof Error ? err.message : "unknown_error";
      setStatus("error", "ไม่สามารถเปิดบัตรได้", code === "liff_unavailable" ? "ไม่พบ LINE LIFF SDK" : "ระบบปฏิเสธการเข้าถึงแบบ fail-closed กรุณาลองใหม่จาก LINE OA");
      $("login-btn").classList.remove("hidden");
      $("login-btn").disabled = false;
    }
  }

  $("login-btn").addEventListener("click", () => window.location.reload());
  $("logout-btn").addEventListener("click", async () => {
    await api(cfg.LOGOUT_ENDPOINT || "/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.reload();
  });

  window.addEventListener("DOMContentLoaded", boot, { once: true });
})();
