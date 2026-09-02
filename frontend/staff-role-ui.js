(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const desired = params.get('role') === 'admin' ? 'admin' : 'teacher';
  const desiredLabel = desired === 'admin' ? 'แอดมิน' : 'อาจารย์';
  let switchedToStaff = false;

  function apply() {
    const card = document.querySelector('.login-card');
    if (!card) return;

    card.querySelectorAll('.security-strip,.legacy-note,.compat-note').forEach(n => n.remove());
    [...card.querySelectorAll('p,small,div')].forEach((node) => {
      const text = (node.textContent || '').trim();
      if (/Compatibility Mode/i.test(text) || /หน้าเว็บไม่เก็บรายชื่อนักเรียน|token.*GitHub/i.test(text)) node.remove();
    });

    const staffTab = card.querySelector('[data-login-role="staff"]');
    if (!switchedToStaff && staffTab) {
      switchedToStaff = true;
      staffTab.click();
      return;
    }

    const tabs = card.querySelector('.login-tabs');
    if (tabs) {
      tabs.innerHTML = `<button type="button" class="login-tab active" disabled>${desired === 'admin' ? '🛡️' : '👩‍🏫'} ${desiredLabel}</button>`;
      tabs.style.gridTemplateColumns = '1fr';
    }

    const badge = card.querySelector('.pilot-badge');
    if (badge) badge.textContent = `เข้าสู่ระบบ${desiredLabel}`;
    const title = card.querySelector('h1');
    if (title) title.textContent = `ระบบบันทึกความดี · ${desiredLabel}`;

    const usernameLabel = card.querySelector('label[for="username"]');
    if (usernameLabel) usernameLabel.textContent = `ชื่อผู้ใช้${desiredLabel}`;
    const submit = card.querySelector('#login-form button[type="submit"]');
    if (submit && !submit.disabled) submit.textContent = `เข้าสู่ระบบ${desiredLabel}`;

    if (!card.querySelector('.staff-back-home')) {
      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'btn btn-secondary staff-back-home';
      back.style.cssText = 'width:100%;margin-top:10px';
      back.textContent = '← กลับไปเลือกประเภทผู้ใช้งาน';
      back.addEventListener('click', () => { location.href = 'index.html'; });
      card.appendChild(back);
    }
  }

  const observer = new MutationObserver(apply);
  observer.observe(document.documentElement, {childList:true, subtree:true});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
})();
