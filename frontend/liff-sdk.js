/*
 * RTAFNC GOOD DEEDS — LIFF OWNER-ONLY LOCKDOWN
 *
 * LIFF profile collection, local mappings, auto-login, Telegram notification,
 * and client-side binding are disabled during incident containment.
 * Re-enable only after server-side ID-token verification + RBAC is deployed.
 */

'use strict';

const LiffHelper = Object.freeze({
  liffId: '',
  isInitialized: false,
  profile: null,

  async init() {
    console.info('RTAFNC security lockdown: LIFF profile collection is disabled.');
    return false;
  },

  isInLineApp() {
    return false;
  },

  login() {
    throw new Error('Security lockdown: LIFF login is disabled until server-side verification is ready.');
  },

  logout() {
    return false;
  },

  bindCurrentStudentProfile() {
    throw new Error('Security lockdown: LINE/student binding must be performed server-side only.');
  },

  handleAutoLogin() {
    return false;
  },

  updateProfileUI() {
    if (typeof document === 'undefined') return;
    const titleEl = document.getElementById('line-liff-title');
    const detailEl = document.getElementById('line-liff-detail');
    const btnEl = document.getElementById('btn-line-connect');
    if (titleEl) titleEl.textContent = '🔒 LINE LIFF อยู่ในโหมดความปลอดภัย';
    if (detailEl) detailEl.textContent = 'ปิดการดึง/เก็บข้อมูลโปรไฟล์จนกว่าจะเปิดใช้ Server-side Verification';
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.textContent = '🔒 ปิดชั่วคราว';
    }
  }
});

if (typeof window !== 'undefined') window.LiffHelper = LiffHelper;
if (typeof globalThis !== 'undefined') globalThis.LiffHelper = LiffHelper;

document.addEventListener('DOMContentLoaded', () => LiffHelper.updateProfileUI());
