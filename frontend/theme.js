/**
 * theme.js - Day / Night Mode & iPhone Slide Switch Manager
 * ระบบบันทึกความดี วิทยาลัยพยาบาลทหารอากาศ กรมแพทย์ทหารอากาศ (วพอ.พอ.)
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'gooddeeds_theme';

  // 1. Instant FOUC Prevention (runs immediately)
  function getInitialTheme() {
    try {
      const urlTheme = new URLSearchParams(window.location.search).get('theme');
      if (urlTheme === 'day' || urlTheme === 'night') {
        localStorage.setItem(STORAGE_KEY, urlTheme);
        return urlTheme;
      }
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'day' || saved === 'night') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'day';
      }
    } catch (_) {}
    return 'night'; // Default to deep navy theme
  }

  const initialTheme = getInitialTheme();
  document.documentElement.setAttribute('data-theme', initialTheme);

  function applyBodyTheme(theme) {
    if (!document.body) return;
    if (theme === 'day') {
      document.body.classList.remove('theme-night');
      document.body.classList.add('theme-day');
    } else {
      document.body.classList.remove('theme-day');
      document.body.classList.add('theme-night');
    }
  }

  if (document.body) {
    applyBodyTheme(initialTheme);
  } else {
    document.addEventListener('DOMContentLoaded', () => applyBodyTheme(getInitialTheme()));
  }

  // 2. ThemeManager Object
  const ThemeManager = {
    getTheme() {
      return document.documentElement.getAttribute('data-theme') || 'night';
    },

    setTheme(theme) {
      const newTheme = theme === 'day' ? 'day' : 'night';
      document.documentElement.setAttribute('data-theme', newTheme);
      applyBodyTheme(newTheme);

      try {
        localStorage.setItem(STORAGE_KEY, newTheme);
      } catch (_) {}

      // Try light haptic feedback on touch devices
      try {
        if (navigator.vibrate) navigator.vibrate(12);
      } catch (_) {}

      this.updateSwitchControls(newTheme);

      window.dispatchEvent(new CustomEvent('theme_changed', { detail: { theme: newTheme } }));
    },

    toggle() {
      const current = this.getTheme();
      const target = current === 'day' ? 'night' : 'day';
      this.setTheme(target);
    },

    createSwitchElement(id = 'main-theme-toggle', showLabel = true) {
      const isDay = this.getTheme() === 'day';
      const container = document.createElement('div');
      container.className = 'ios-theme-toggle-container';
      container.title = 'สลับโหมดกลางวัน/กลางคืน (Day/Night Mode)';

      container.innerHTML = `
        <button type="button" class="ios-theme-switch" id="${id}" role="switch"
                aria-label="สลับโหมดกลางวัน/กลางคืน (Day/Night Mode)"
                aria-checked="${isDay ? 'true' : 'false'}">
          <span class="ios-theme-track">
            <span class="ios-track-icon track-sun" title="กลางวัน">☀️</span>
            <span class="ios-track-icon track-moon" title="กลางคืน">🌙</span>
          </span>
          <span class="ios-theme-thumb">
            <span class="ios-thumb-icon">${isDay ? '☀️' : '🌙'}</span>
          </span>
        </button>
        ${showLabel ? `<span class="ios-theme-label">${isDay ? 'กลางวัน' : 'กลางคืน'}</span>` : ''}
      `;

      const btn = container.querySelector('.ios-theme-switch');
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggle();
      });

      return container;
    },

    updateSwitchControls(theme) {
      const isDay = theme === 'day';
      const switches = document.querySelectorAll('.ios-theme-switch');
      switches.forEach((sw) => {
        sw.setAttribute('aria-checked', isDay ? 'true' : 'false');
        const thumbIcon = sw.querySelector('.ios-thumb-icon');
        if (thumbIcon) thumbIcon.textContent = isDay ? '☀️' : '🌙';
      });

      const labels = document.querySelectorAll('.ios-theme-label');
      labels.forEach((lbl) => {
        lbl.textContent = isDay ? 'กลางวัน' : 'กลางคืน';
      });
    },

    mountUI() {
      // Avoid duplicate mounts
      if (document.querySelector('.ios-theme-toggle-container')) {
        this.updateSwitchControls(this.getTheme());
        return;
      }

      // 1. If page has top-nav actions bar (student/teacher dashboard, submit-deed, ranking, history)
      const navActions = document.querySelector('.nav-actions');
      if (navActions) {
        const switchEl = this.createSwitchElement('nav-theme-toggle', true);
        navActions.insertBefore(switchEl, navActions.firstChild);
        return;
      }

      // 2. If page has top-nav without nav-actions
      const topNav = document.querySelector('.top-nav, .navbar');
      if (topNav) {
        const switchEl = this.createSwitchElement('nav-theme-toggle', true);
        topNav.appendChild(switchEl);
        return;
      }

      // 3. Fallback for Login screen or modal/fullscreen pages: Floating top-right corner widget
      const cornerWidget = document.createElement('div');
      cornerWidget.className = 'ios-theme-floating-corner';
      const switchEl = this.createSwitchElement('floating-theme-toggle', true);
      cornerWidget.appendChild(switchEl);
      document.body.appendChild(cornerWidget);
    }
  };

  // Cross-tab synchronization
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && (e.newValue === 'day' || e.newValue === 'night')) {
      ThemeManager.setTheme(e.newValue);
    }
  });

  // Auto mount on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ThemeManager.mountUI());
  } else {
    ThemeManager.mountUI();
  }

  window.ThemeManager = ThemeManager;
})();
