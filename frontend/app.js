/*
 * RTAFNC GOOD DEEDS — OWNER-ONLY SECURITY LOCKDOWN
 *
 * Incident-containment build.
 * This client intentionally does NOT:
 * - contain credentials, passwords, bot tokens, chat IDs, API keys, or private endpoints
 * - load or cache student rosters
 * - store profiles/deeds/auth data in localStorage
 * - send data to Telegram, LINE Messaging API, Google Apps Script, or third parties
 * - perform client-side admin/teacher authentication
 *
 * Sensitive functionality must be re-enabled only through a trusted server-side API
 * with verified identity, RBAC, audit logging, and secrets stored server-side.
 */

'use strict';

const SECURITY_LOCKDOWN = Object.freeze({
  enabled: true,
  mode: 'OWNER_ONLY_NO_CLIENT_DATA',
  reason: 'Client-side credential and personal-data handling disabled pending secure server migration.'
});

const CONFIG = Object.freeze({
  GAS_URL: '',
  MIN_HOURS_PER_SEMESTER: 25,
  MIN_HOURS_PER_YEAR: 50,
  MAX_HOURS_SCALE: 400,
  APP_VERSION: 'lockdown-1.0.0',
  ACADEMIC_YEAR: 2569
});

const CATEGORIES = Object.freeze([
  { id: 1, name: 'บริจาคโลหิต/เกล็ดเลือด/พลาสมา', emoji: '🩸' },
  { id: 2, name: 'โครงการภายนอก (คำสั่ง วพอ.)', emoji: '🌐' },
  { id: 3, name: 'ช่วยเหลืองานภายใน วพอ.', emoji: '🏥' },
  { id: 4, name: 'เข้าอบรมที่ วพอ. จัดให้', emoji: '📚' },
  { id: 5, name: 'ช่วยงานหน่วยงาน/ชุมชน/มูลนิธิ', emoji: '🤝' },
  { id: 6, name: 'ทำนุบำรุงศาสนสถาน', emoji: '🙏' },
  { id: 7, name: 'งานฟรีทั่วไป', emoji: '⭐' },
  { id: 8, name: 'กิจกรรมจงรักภักดีต่อสถาบัน', emoji: '👑' },
  { id: 9, name: 'ชม. ที่สมควรได้รับ (บทบาทพิเศษ)', emoji: '🎖️' }
]);

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('open');
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
}

const Storage = Object.freeze({
  get() { return null; },
  set() { throw new Error('Security lockdown: client-side persistent storage is disabled.'); },
  remove() {},
  clear() {}
});

const App = Object.freeze({
  securityLockdown: SECURITY_LOCKDOWN,
  canUseBackendApi() { return false; },
  getAuthHeaders() { return {}; },
  getCurrentUser() { return null; },
  getStudentById() { return null; },
  findStudent() { return null; },
  getProfile() { return null; },
  updateProfile() { throw new Error('Security lockdown: profile mutation is server-side only.'); },
  getSettings() { return { securityMode: SECURITY_LOCKDOWN.mode }; },
  sendTelegram() { throw new Error('Security lockdown: browser-to-Telegram transmission is disabled.'); },
  setSession() { throw new Error('Security lockdown: client-side session creation is disabled.'); },
  getCategoryById(id) { return CATEGORIES.find(c => c.id === Number(id)) || null; }
});

if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
  window.CATEGORIES = CATEGORIES;
  window.App = App;
  window.SECURITY_LOCKDOWN = SECURITY_LOCKDOWN;
}
if (typeof globalThis !== 'undefined') {
  globalThis.CONFIG = CONFIG;
  globalThis.CATEGORIES = CATEGORIES;
  globalThis.App = App;
  globalThis.SECURITY_LOCKDOWN = SECURITY_LOCKDOWN;
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.sidebar-item').forEach(item => item.addEventListener('click', closeSidebar));

  const banner = document.createElement('div');
  banner.id = 'owner-only-security-lockdown';
  banner.setAttribute('role', 'status');
  banner.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483647;padding:10px 14px;background:#111827;color:#fff;font:14px/1.4 system-ui;text-align:center;border-top:1px solid #374151';
  banner.textContent = 'ระบบอยู่ในโหมดความปลอดภัย OWNER-ONLY: ปิดการเก็บ/ส่งข้อมูลจาก Browser ชั่วคราวจนกว่าจะยืนยัน Backend ใหม่';
  document.body.appendChild(banner);
});
