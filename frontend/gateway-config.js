// Set only after confirming the owned staging gateway, CORS allowlist and cookies.
// Never read this origin from query parameters, profiles or browser storage.
window.GOODDEED_GATEWAY_CONFIG = Object.freeze({origin:'', timeoutMs:15000});

// Production safety guard.
// The legacy app still contains local/demo authentication code for historical UI
// compatibility. The secure gateway client loaded immediately after this file must
// replace those login methods. If it does not load, authentication MUST fail closed.
(function (root) {
  'use strict';

  function secureGatewayReady() {
    return !!(root.GoodDeedV2 && typeof root.GoodDeedV2.call === 'function');
  }

  function failClosedWhenSecureGatewayMissing() {
    if (!root.App || secureGatewayReady()) return;
    root.App.loginStudent = async function () {
      return { success: false, message: 'ระบบยืนยันตัวตน V2 ยังไม่พร้อม กรุณาปิดหน้าแล้วเปิดใหม่จาก LINE OA' };
    };
    root.App.loginTeacher = async function () {
      return { success: false, message: 'ระบบยืนยันตัวตน V2 ยังไม่พร้อม กรุณารีโหลดหน้าเข้าสู่ระบบ' };
    };
  }

  function disableLegacyCredentialHelpers() {
    // Never expose or auto-fill legacy staff credentials on a production page.
    root.quickLoginAdmin = function () {
      if (typeof root.showAlert === 'function') root.showAlert('บัญชีตัวอย่างถูกปิดใช้งานบนระบบจริง กรุณาใช้บัญชีที่ผู้ดูแลออกให้');
    };
    root.quickLoginAnuchit = root.quickLoginAdmin;

    // Student ID is an identity key, not a password. First-login credentials are
    // provisioned server-side and must be delivered privately by the administrator.
    root.showForgotPasswordHelp = function (event) {
      if (event) event.preventDefault();
      if (typeof root.showAlert === 'function') {
        root.showAlert('หากยังไม่มีรหัสผ่านหรือจำรหัสผ่านไม่ได้ กรุณาติดต่อผู้ดูแลระบบเพื่อรับรหัสชั่วคราวใหม่');
      }
    };
  }

  function hardenLoginUi() {
    try {
      var studentPassword = document.getElementById('student-password');
      if (studentPassword) {
        studentPassword.value = '';
        studentPassword.placeholder = 'รหัสผ่านที่ได้รับจากผู้ดูแลระบบ';
        studentPassword.setAttribute('autocomplete', 'current-password');
      }

      var teacherPassword = document.getElementById('teacher-password');
      if (teacherPassword) {
        teacherPassword.value = '';
        teacherPassword.placeholder = 'รหัสผ่าน';
        teacherPassword.setAttribute('autocomplete', 'current-password');
      }

      document.querySelectorAll('button[onclick*="quickLogin"]').forEach(function (button) {
        button.removeAttribute('onclick');
        button.disabled = true;
        button.setAttribute('aria-disabled', 'true');
        button.title = 'ปิดใช้งานบัญชีตัวอย่างบน Production';
        button.style.opacity = '0.45';
      });

      // Remove any values inserted by legacy URL shortcuts after all load handlers.
      if (teacherPassword) teacherPassword.value = '';
    } catch (_) {}
  }

  function sanitizeLegacyHints() {
    try {
      var alertMessage = document.getElementById('alert-message');
      if (!alertMessage || !root.MutationObserver) return;
      var sanitize = function () {
        var text = String(alertMessage.textContent || '');
        if (/4\s*ตัวท้าย|1234|123456|teacher69|admin69|รหัส\s*7\s*หลัก\s*เป็นรหัส/i.test(text)) {
          alertMessage.textContent = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง — กรุณาใช้รหัสผ่านที่ออกโดยระบบ หรือ ติดต่อผู้ดูแลระบบ';
        }
      };
      sanitize();
      new MutationObserver(sanitize).observe(alertMessage, { childList: true, subtree: true, characterData: true });
    } catch (_) {}
  }

  function applyGuard() {
    disableLegacyCredentialHelpers();
    hardenLoginUi();
    failClosedWhenSecureGatewayMissing();
    sanitizeLegacyHints();
  }

  if (document.readyState === 'complete') setTimeout(applyGuard, 0);
  else root.addEventListener('load', function () { setTimeout(applyGuard, 0); }, { once: true });

  // Covers slow/failed script loads and legacy load handlers without affecting a
  // healthy secure gateway. These retries only harden the UI; they perform no writes.
  setTimeout(applyGuard, 600);
  setTimeout(applyGuard, 1500);
})();
