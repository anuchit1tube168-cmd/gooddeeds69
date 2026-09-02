(function () {
  "use strict";

  const UI_ROLE_KEY = "gd_ui_role";
  let uiRole = sessionStorage.getItem(UI_ROLE_KEY) || "student";
  if (!["student", "teacher", "admin"].includes(uiRole)) uiRole = "student";

  function roleLabel(role) {
    return role === "teacher" ? "อาจารย์" : role === "admin" ? "แอดมิน" : "นักเรียน";
  }

  function applyLoginUi() {
    const card = document.querySelector(".login-card");
    if (!card) return;

    document.querySelectorAll(".security-strip,.legacy-note,.compatibility-note").forEach((node) => node.remove());

    [...card.querySelectorAll("div,p,small")].forEach((node) => {
      const text = (node.textContent || "").trim();
      if (/Compatibility Mode/i.test(text) || /หน้าเว็บไม่เก็บรายชื่อนักเรียน|token.*GitHub/i.test(text)) node.remove();
    });

    const originalTabs = card.querySelector(".login-tabs");
    if (!originalTabs || originalTabs.dataset.roleUiReady === "1") return;

    const studentOriginal = originalTabs.querySelector('[data-login-role="student"]');
    const staffOriginal = originalTabs.querySelector('[data-login-role="staff"]');
    if (!studentOriginal || !staffOriginal) return;

    originalTabs.dataset.roleUiReady = "1";
    originalTabs.style.gridTemplateColumns = "repeat(3,1fr)";
    originalTabs.replaceChildren();

    const roles = [
      ["student", "นักเรียน"],
      ["teacher", "อาจารย์"],
      ["admin", "แอดมิน"],
    ];

    roles.forEach(([role, label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `login-tab${uiRole === role ? " active" : ""}`;
      button.dataset.uiRole = role;
      button.textContent = label;
      button.addEventListener("click", () => {
        uiRole = role;
        sessionStorage.setItem(UI_ROLE_KEY, uiRole);
        if (role === "student") studentOriginal.click();
        else staffOriginal.click();
      });
      originalTabs.appendChild(button);
    });

    const usernameLabel = card.querySelector('label[for="username"]');
    if (usernameLabel) usernameLabel.textContent = uiRole === "student" ? "รหัสนักเรียน 7 หลัก" : `ชื่อผู้ใช้${uiRole === "admin" ? "แอดมิน" : "อาจารย์"}`;

    const form = card.querySelector("#login-form");
    if (form && !form.querySelector(".selected-role-note")) {
      const note = document.createElement("div");
      note.className = "selected-role-note";
      note.style.cssText = "font-size:12px;text-align:center;color:#60758b;margin:10px 0 0";
      note.textContent = `เข้าสู่ระบบในฐานะ: ${roleLabel(uiRole)}`;
      form.appendChild(note);
    }
  }

  const observer = new MutationObserver(() => applyLoginUi());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", applyLoginUi);
  else applyLoginUi();
})();
