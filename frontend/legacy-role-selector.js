(() => {
  'use strict';

  function cleanLogin() {
    const card = document.querySelector('.legacy-login-card');
    if (!card) return;

    card.querySelectorAll('.compat-note').forEach(n => n.remove());
    [...card.querySelectorAll('p,small,div')].forEach((node) => {
      const text = (node.textContent || '').trim();
      if (/Compatibility Mode/i.test(text) || /หน้าเว็บไม่เก็บรายชื่อนักเรียน|token.*GitHub/i.test(text)) node.remove();
    });

    const password = card.querySelector('#student-password');
    if (password) password.placeholder = 'รหัสผ่าน';
    const passwordLabel = password?.closest('label');
    if (passwordLabel) {
      for (const node of [...passwordLabel.childNodes]) {
        if (node.nodeType === Node.TEXT_NODE && /รหัสผ่านครั้งแรก/.test(node.textContent || '')) node.textContent = 'รหัสผ่าน ';
      }
    }

    const tabs = card.querySelector('.legacy-tabs');
    if (!tabs || tabs.dataset.roleReady === '1') return;
    tabs.dataset.roleReady = '1';
    tabs.innerHTML = `
      <button class="active" type="button" data-role="student">👨‍⚕️ นักเรียน</button>
      <button type="button" data-role="teacher">👩‍🏫 อาจารย์</button>
      <button type="button" data-role="admin">🛡️ แอดมิน</button>`;
    tabs.style.gridTemplateColumns = 'repeat(3,1fr)';

    tabs.querySelector('[data-role="student"]')?.addEventListener('click', () => {
      tabs.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.role === 'student'));
      document.querySelector('#student-id')?.focus();
    });
    tabs.querySelector('[data-role="teacher"]')?.addEventListener('click', () => {
      location.href = 'staff-login.html?role=teacher';
    });
    tabs.querySelector('[data-role="admin"]')?.addEventListener('click', () => {
      location.href = 'staff-login.html?role=admin';
    });
  }

  const observer = new MutationObserver(cleanLogin);
  observer.observe(document.documentElement, {childList:true, subtree:true});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cleanLogin);
  else cleanLogin();
})();
