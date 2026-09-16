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

  function hardenLoginUi() {
    try {
      var studentPassword = document.getElementById('student-password');
      if (studentPassword) {
        studentPassword.placeholder = 'รหัสนักเรียน 7 หลักสำหรับการเข้าใช้ครั้งแรก';
      }
      var teacherPassword = document.getElementById('teacher-password');
      if (teacherPassword) teacherPassword.value = '';

      document.querySelectorAll('button[onclick*="quickLogin"]').forEach(function (button) {
        button.removeAttribute('onclick');
        button.disabled = true;
        button.setAttribute('aria-disabled', 'true');
        button.title = 'ปิดใช้งานบัญชีตัวอย่างบน Production';
        button.style.opacity = '0.45';
      });

      // Replace the legacy helper with the only supported first-login rule.
      root.showForgotPasswordHelp = function (event) {
        if (event) event.preventDefault();
        var sid = String((document.getElementById('student-id') || {}).value || '').replace(/\D/g, '');
        if (sid.length === 7) {
          if (studentPassword) studentPassword.value = sid;
          if (typeof root.showToast === 'function') root.showToast('ใช้รหัสนักเรียน 7 หลักเป็นรหัสเริ่มต้น แล้วกดเข้าสู่ระบบ', 'info');
        } else if (typeof root.showAlert === 'function') {
          root.showAlert('กรุณากรอกรหัสนักเรียน 7 หลักก่อน หรือ ติดต่อผู้ดูแลระบบ');
        }
      };

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
        if (/4\s*ตัวท้าย|1234|123456|teacher69|admin69/i.test(text)) {
          alertMessage.textContent = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง — นักเรียนเข้าใช้ครั้งแรกด้วยรหัสนักเรียน 7 หลักเท่านั้น';
        }
      };
      sanitize();
      new MutationObserver(sanitize).observe(alertMessage, { childList: true, subtree: true, characterData: true });
    } catch (_) {}
  }

  function applyGuard() {
    hardenLoginUi();
    failClosedWhenSecureGatewayMissing();
    sanitizeLegacyHints();
  }

  if (document.readyState === 'complete') setTimeout(applyGuard, 0);
  else root.addEventListener('load', function () { setTimeout(applyGuard, 0); }, { once: true });

  // Covers slow/failed script loads without affecting a healthy secure gateway.
  setTimeout(applyGuard, 1500);
})();
