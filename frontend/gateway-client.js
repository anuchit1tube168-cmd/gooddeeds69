/* RTAFNC Good Deed browser gateway client.
 * - Keeps the existing Cloudflare gateway interface for staged secure cutover.
 * - Uses the deployed Apps Script V2 bridge for current authenticated login/read/write.
 * Secrets are never embedded here.
 */
(function (root) {
  'use strict';

  function createGoodDeedGatewayClient(config = {}) {
    let session = null, csrfToken = '', epoch = 0;
    const inflight = new Set();
    const error = (code, status = 0) => Object.assign(new Error(code), {code, status});
    function origin() {
      if (!config.origin) throw error('GATEWAY_NOT_CONFIGURED');
      let url;
      try { url = new URL(config.origin); } catch (_) { throw error('GATEWAY_CONFIG_INVALID'); }
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw error('GATEWAY_CONFIG_INVALID');
      return url.origin;
    }
    async function request(path, method = 'GET', body, csrf = '') {
      const base = origin(), controller = new AbortController(), current = epoch;
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs || 15000);
      inflight.add(controller);
      try {
        const headers = {Accept:'application/json'};
        if (body !== undefined) headers['Content-Type'] = 'application/json';
        if (csrf) headers['X-CSRF-Token'] = csrf;
        const response = await fetch(base + path, {method, headers, body:body === undefined ? undefined : JSON.stringify(body), credentials:'include', cache:'no-store', redirect:'error', referrerPolicy:'no-referrer', signal:controller.signal});
        if (current !== epoch) throw error('REQUEST_CANCELLED');
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) { session = null; csrfToken = ''; }
          throw error(response.status === 401 ? 'SESSION_REQUIRED' : response.status === 403 ? 'ACCESS_DENIED' : response.status === 429 ? 'RATE_LIMITED' : 'SERVICE_UNAVAILABLE', response.status);
        }
        const data = await response.json();
        if (current !== epoch) throw error('REQUEST_CANCELLED');
        if (!data || typeof data !== 'object' || Array.isArray(data) || data.ok === false || data.error) throw error('RESPONSE_INVALID');
        return data;
      } catch (cause) {
        if (current !== epoch) throw error('REQUEST_CANCELLED');
        if (controller.signal.aborted || cause?.name === 'AbortError') throw error('REQUEST_TIMEOUT');
        if (['SESSION_REQUIRED','ACCESS_DENIED','RATE_LIMITED','SERVICE_UNAVAILABLE','RESPONSE_INVALID'].includes(cause?.code)) throw cause;
        throw error('CONNECTION_FAILED');
      } finally { clearTimeout(timeout); inflight.delete(controller); }
    }
    function acceptSession(data, current) {
      if (current !== epoch) throw error('REQUEST_CANCELLED');
      if (data.authenticated !== true || typeof data.studentLinked !== 'boolean' || typeof data.accountStatus !== 'string' || !Array.isArray(data.roles) || !Array.isArray(data.permissions)) throw error('RESPONSE_INVALID');
      session = {authenticated:true, studentLinked:data.studentLinked, accountStatus:data.accountStatus, roles:data.roles.filter(x=>typeof x==='string'), permissions:data.permissions.filter(x=>typeof x==='string')};
      csrfToken = typeof data.csrfToken === 'string' ? data.csrfToken : '';
      return {...session, roles:[...session.roles], permissions:[...session.permissions]};
    }
    function clear() {
      epoch++; session = null; csrfToken = '';
      inflight.forEach(controller => controller.abort());
    }
    return Object.freeze({
      async verifyLine(idToken) {
        clear();
        if (typeof idToken !== 'string' || !idToken || idToken.length > 4096) throw error('LINE_TOKEN_REQUIRED');
        const current = epoch;
        return acceptSession(await request('/auth/line/verify', 'POST', {idToken}), current);
      },
      async restore() { clear(); const current = epoch; return acceptSession(await request('/auth/session'), current); },
      async readSelf() {
        if (!session?.studentLinked || !session.permissions.includes('gooddeed:self:read')) throw error('LINK_REQUIRED');
        const current = epoch;
        const [cardResult, listResult] = await Promise.all([request('/api/gooddeed/card-self'), request('/api/gooddeed/deeds-self')]);
        if (current !== epoch) throw error('REQUEST_CANCELLED');
        const card = cardResult.card, items = listResult.items;
        if (!card || typeof card.displayName !== 'string' || !/^\d{7}$/.test(card.studentId) || typeof card.totalHours !== 'number' || !Number.isFinite(card.totalHours) || card.totalHours < 0 || !Number.isInteger(card.levelNumber) || card.levelNumber < 1 || card.levelNumber > 10 || typeof card.levelLabel !== 'string' || typeof card.passed !== 'boolean' || ![card.pendingCount,card.approvedCount].every(x=>Number.isInteger(x)&&x>=0) || !Array.isArray(items) || items.length > 150) throw error('RESPONSE_INVALID');
        const seen = new Set();
        for (const item of items) {
          if (!item || typeof item.deedId !== 'string' || !item.deedId.trim() || item.deedId.length > 120 || seen.has(item.deedId) || (item.studentId !== undefined && item.studentId !== card.studentId) || !Number.isInteger(item.categoryId) || item.categoryId < 1 || item.categoryId > 9 || typeof item.hours !== 'number' || item.hours < 0.5 || item.hours > 24 || !Number.isInteger(item.hours * 2) || !['pending','approving','approved','rejected'].includes(item.status)) throw error('RESPONSE_INVALID');
          seen.add(item.deedId);
        }
        return {card, items, loadedAt:new Date().toISOString(), listLimit:150};
      },
      async logout() {
        // Cancel reads before revocation so late responses cannot restore UI data.
        const token = csrfToken; clear();
        let csrf = token;
        if (!csrf) {
          const data = await request('/auth/csrf', 'POST', {});
          csrf = data.csrfToken;
        }
        if (typeof csrf !== 'string' || !csrf) throw error('RESPONSE_INVALID');
        try { return await request('/auth/logout', 'POST', {}, csrf); }
        finally { clear(); }
      },
      clear
    });
  }
  root.createGoodDeedGatewayClient = createGoodDeedGatewayClient;

  const CHANNEL = 'RTAFNC_GOODDEED';
  const TOKEN_KEY = 'gd_v2_session_token';
  const GAS_TIMEOUT = 22000;
  const GAS_PROBE_TIMEOUT = 5000;
  const GAS_PROBE_TTL = 60000;
  const getEndpoint = () => (typeof CONFIG !== 'undefined' && CONFIG.GAS_URL) ? String(CONFIG.GAS_URL) : '';
  const getToken = () => { try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch (_) { return ''; } };
  const setToken = value => { try { value ? sessionStorage.setItem(TOKEN_KEY, value) : sessionStorage.removeItem(TOKEN_KEY); } catch (_) {} };
  let gasEpoch = 0;
  let gasProbe = { endpoint: '', verifiedAt: 0 };
  let gasProbePending = null;
  const pendingCalls = new Set();
  function clearV2() {
    gasEpoch++; setToken(''); pendingCalls.forEach(cancel => cancel());
    try { localStorage.removeItem('gooddeeds_session'); } catch (_) {}
  }
  const rid = () => 'web-' + root.crypto.randomUUID();

  function gasBridgePost(action, payload = {}, token = '', timeoutMs = GAS_TIMEOUT, acceptAnyBridge = false) {
    const endpoint = getEndpoint();
    if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(endpoint)) return Promise.reject(new Error('GAS_V2_NOT_CONFIGURED'));
    const current = gasEpoch;
    return new Promise((resolve, reject) => {
      const requestId = rid();
      const frame = document.createElement('iframe');
      const frameName = 'gdv2_' + requestId.replace(/[^a-z0-9_]/gi, '_');
      frame.name = frameName; frame.style.display = 'none'; frame.setAttribute('aria-hidden', 'true');
      const form = document.createElement('form');
      form.method = 'POST'; form.action = endpoint; form.target = frameName; form.style.display = 'none';
      const fields = { action, payload: JSON.stringify(payload || {}), sessionToken: token || '', requestId, origin: window.location.origin };
      Object.entries(fields).forEach(([name, value]) => {
        const input = document.createElement('input'); input.type = 'hidden'; input.name = name; input.value = value; form.appendChild(input);
      });
      let done = false, submitted = false, bridgeGraceTimer = null;
      const cleanup = () => {
        pendingCalls.delete(cancel);
        window.removeEventListener('message', onMessage);
        frame.removeEventListener('load', onFrameLoad);
        clearTimeout(timer);
        clearTimeout(bridgeGraceTimer);
        setTimeout(() => { form.remove(); frame.remove(); }, 0);
      };
      const onFrameLoad = () => {
        // Ignore the initial about:blank load. After submit, a healthy V2 bridge
        // posts its response immediately; a Google 405/error page never does.
        if (!submitted || done || !acceptAnyBridge) return;
        clearTimeout(bridgeGraceTimer);
        bridgeGraceTimer = setTimeout(() => {
          if (done) return;
          done = true;
          cleanup();
          reject(new Error('GAS_V2_BACKEND_UNAVAILABLE'));
        }, 900);
      };
      const onMessage = event => {
        if (done || current !== gasEpoch || event.source !== frame.contentWindow) return;
        if (!/^https:\/\/(?:script\.google\.com|[a-z0-9-]+\.googleusercontent\.com)$/.test(event.origin)) return;
        const msg = event.data;
        if (!msg || msg.channel !== CHANNEL || msg.requestId !== requestId) return;
        done = true; cleanup();
        if (acceptAnyBridge) { resolve({ bridge: true, ok: msg.ok === true }); return; }
        if (msg.ok === true) resolve(msg.data || {});
        else reject(new Error(String(msg.error || 'GAS_V2_REQUEST_FAILED')));
      };
      const timer = setTimeout(() => { if (done) return; done = true; cleanup(); reject(new Error(acceptAnyBridge ? 'GAS_V2_BACKEND_UNAVAILABLE' : 'GAS_V2_TIMEOUT')); }, timeoutMs);
      const cancel = () => { if (done) return; done = true; cleanup(); reject(new Error('REQUEST_CANCELLED')); };
      pendingCalls.add(cancel);
      window.addEventListener('message', onMessage);
      frame.addEventListener('load', onFrameLoad);
      document.body.appendChild(frame); document.body.appendChild(form);
      try {
        submitted = true;
        form.submit();
      } catch (_) {
        done = true;
        cleanup();
        reject(new Error('GAS_V2_CONNECTION_FAILED'));
      }
    });
  }

  async function ensureGasV2Ready() {
    const endpoint = getEndpoint();
    if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(endpoint)) throw new Error('GAS_V2_NOT_CONFIGURED');
    if (gasProbe.endpoint === endpoint && Date.now() - gasProbe.verifiedAt < GAS_PROBE_TTL) return true;
    if (!gasProbePending) {
      gasProbePending = gasBridgePost('__contract_probe__', {}, '', GAS_PROBE_TIMEOUT, true)
        .then(() => {
          gasProbe = { endpoint, verifiedAt: Date.now() };
          return true;
        })
        .catch(error => {
          gasProbe = { endpoint: '', verifiedAt: 0 };
          if (error && error.message === 'REQUEST_CANCELLED') throw error;
          throw new Error('GAS_V2_BACKEND_UNAVAILABLE');
        })
        .finally(() => { gasProbePending = null; });
    }
    return gasProbePending;
  }

  async function gasCall(action, payload = {}, token = getToken()) {
    await ensureGasV2Ready();
    return gasBridgePost(action, payload, token, GAS_TIMEOUT, false);
  }

  function categoryIdFrom(value) {
    const text = String(value || '').trim();
    const m = text.match(/(?:หมวด\s*)?(\d)/);
    if (m) return Math.max(1, Math.min(9, Number(m[1])));
    if (typeof CATEGORIES !== 'undefined' && Array.isArray(CATEGORIES)) {
      const hit = CATEGORIES.find(c => text.includes(c.name) || String(c.name || '').includes(text));
      if (hit) return Number(hit.id);
    }
    return 7;
  }
  function categoryText(id) {
    if (typeof CATEGORIES !== 'undefined' && Array.isArray(CATEGORIES)) {
      const c = CATEGORIES.find(x => Number(x.id) === Number(id));
      if (c) return `หมวด ${c.id} ${c.name}`;
    }
    return `หมวด ${Number(id) || 7}`;
  }
  function normalizeDeed(d) {
    const id = String(d.recordId || d.id || '');
    const studentId = String(d.studentId || d.student_id || '');
    return { ...d, id, recordId: id, studentId, student_id: studentId,
      categoryId: Number(d.categoryId || categoryIdFrom(d.category)), category_id: Number(d.categoryId || categoryIdFrom(d.category)),
      activityDate: String(d.activityDate || d.activity_date || ''), hours: Number(d.hours || 0), description: String(d.description || ''),
      status: String(d.status || 'pending').toLowerCase(), submittedAt: String(d.submittedAt || d.submitted_at || ''),
      approvedBy: String(d.reviewerName || d.approvedBy || ''), approvedAt: String(d.reviewedAt || d.approvedAt || ''),
      rejectReason: String(d.reviewNote || d.rejectReason || ''), imageUrls: Array.isArray(d.imageUrls) ? d.imageUrls : [] };
  }
  function normalizeUser(u) {
    const sid = String(u.studentId || '');
    if (u.role === 'student') {
      let base = null; try { base = App.getStudentById ? App.getStudentById(sid) : null; } catch (_) {}
      const display = String(u.displayName || sid);
      return { ...(base || {}), student_id: sid, displayName: display, full_name: (base && base.full_name) || display,
        first_name: (base && base.first_name) || display, last_name: (base && base.last_name) || '', rank: (base && base.rank) || 'นพอ.',
        class_year: (base && base.class_year) || null, cohort: String(u.cohort || ''),
        role: 'student', memberId: u.memberId, mustChangePassword: !!u.mustChangePassword };
    }
    return { memberId: u.memberId, username: u.username || u.displayName || '', name: u.displayName || u.username || '', displayName: u.displayName || '', role: u.role,
      isAdmin: u.role === 'admin', isTeacher: u.role === 'teacher' || u.role === 'admin', mustChangePassword: !!u.mustChangePassword };
  }
  async function lineIdToken() {
    try {
      if (!root.liff) return '';
      if (root.liff.ready) await Promise.race([root.liff.ready, new Promise(r => setTimeout(r, 2500))]);
      if (!root.liff.isLoggedIn || !root.liff.isLoggedIn()) return '';
      return String(root.liff.getIDToken ? root.liff.getIDToken() || '' : '');
    } catch (_) { return ''; }
  }
  async function syncDeeds(studentId) {
    if (!getToken()) throw new Error('SESSION_REQUIRED');
    const current = gasEpoch;
    const data = await gasCall('listDeeds', { limit: 500 });
    if (current !== gasEpoch) throw new Error('REQUEST_CANCELLED');
    if (!Array.isArray(data.deeds)) throw new Error('RESPONSE_INVALID');
    const all = data.deeds.map(normalizeDeed);
    if (studentId) {
      const list = all.filter(d => d.studentId === String(studentId));
      if (all.some(d => d.studentId !== String(studentId))) throw new Error('RESPONSE_INVALID');
      if (App.saveDeeds) App.saveDeeds(String(studentId), list);
      window.dispatchEvent(new CustomEvent('deeds_updated', { detail: { source: 'gas-v2', count: list.length } }));
      return list;
    }
    const groups = {};
    all.forEach(d => { if (!groups[d.studentId]) groups[d.studentId] = []; groups[d.studentId].push(d); });
    Object.entries(groups).forEach(([sid, list]) => { if (App.saveDeeds) App.saveDeeds(sid, list); });
    window.dispatchEvent(new CustomEvent('deeds_updated', { detail: { source: 'gas-v2', count: all.length } }));
    return all;
  }

  root.GoodDeedV2 = Object.freeze({ call: gasCall, getToken, clear: clearV2, syncDeeds });

  if (typeof App !== 'undefined' && App) {
    const originalLogout = App.logout ? App.logout.bind(App) : null;
    const originalGetAllPending = App.getAllPendingDeeds ? App.getAllPendingDeeds.bind(App) : () => [];
    const originalGetAllSummary = App.getAllStudentsSummary ? App.getAllStudentsSummary.bind(App) : () => [];

    App.loginStudent = async function(studentId, password) {
      const sid = String(studentId || '').replace(/\D/g, '');
      if (!/^\d{7}$/.test(sid)) return { success: false, message: 'รหัสนักเรียนต้องเป็นตัวเลข 7 หลัก' };
      clearV2(); const current = gasEpoch;
      try {
        const idToken = await lineIdToken();
        if (current !== gasEpoch) throw new Error('REQUEST_CANCELLED');
        let data;
        if (idToken) {
          data = await gasCall('bindLineAndLogin', { username: sid, password: String(password || ''), idToken }, '');
        } else data = await gasCall('login', { username: sid, password: String(password || '') }, '');
        if (typeof data.sessionToken !== 'string' || !data.sessionToken || !data.user || data.user.role !== 'student' || String(data.user.studentId) !== sid) throw new Error('บัญชีนี้ไม่ใช่นักเรียน');
        if (current !== gasEpoch) throw new Error('REQUEST_CANCELLED');
        setToken(data.sessionToken);
        if (data.user.mustChangePassword) return { success: false, requiresPasswordChange: true, message: 'กรุณาเปลี่ยนรหัสผ่านก่อนใช้งาน' };
        const user = normalizeUser(data.user); App.setSession('student', user);
        return { success: true, user };
      } catch (e) { if (current === gasEpoch) clearV2(); return { success: false, message: e.message === 'GAS_V2_BACKEND_UNAVAILABLE' ? 'ระบบหลังบ้านกำลังปรับรุ่น กรุณาลองใหม่ภายหลังหรือแจ้งผู้ดูแลระบบ' : e.message === 'GAS_V2_TIMEOUT' ? 'การเชื่อมต่อหมดเวลา กรุณาลองใหม่ หากยังไม่สำเร็จให้แจ้งผู้ดูแล' : e.message || 'เข้าสู่ระบบไม่สำเร็จ' }; }
    };

    App.loginTeacher = async function(username, password) {
      clearV2(); const current = gasEpoch;
      try {
        const data = await gasCall('login', { username: String(username || '').trim(), password: String(password || '') }, '');
        if (typeof data.sessionToken !== 'string' || !data.sessionToken || !data.user || !['teacher', 'admin'].includes(data.user.role)) throw new Error('บัญชีนี้ไม่มีสิทธิ์อาจารย์/แอดมิน');
        if (current !== gasEpoch) throw new Error('REQUEST_CANCELLED');
        setToken(data.sessionToken);
        if (data.user.mustChangePassword) return { success: false, requiresPasswordChange: true, message: 'กรุณาเปลี่ยนรหัสผ่านก่อนใช้งาน' };
        const user = normalizeUser(data.user); App.setSession(user.role, user);
        return { success: true, user };
      } catch (e) { if (current === gasEpoch) clearV2(); return { success: false, message: e.message === 'GAS_V2_BACKEND_UNAVAILABLE' ? 'ระบบหลังบ้านกำลังปรับรุ่น กรุณาลองใหม่ภายหลังหรือแจ้งผู้ดูแลระบบ' : e.message === 'GAS_V2_TIMEOUT' ? 'การเชื่อมต่อหมดเวลา กรุณาลองใหม่ หากยังไม่สำเร็จให้แจ้งผู้ดูแล' : e.message || 'เข้าสู่ระบบไม่สำเร็จ' }; }
    };

    App.syncDeedsFromCloud = async function(studentId) { return syncDeeds(String(studentId || '')); };
    App.syncDeedsWithBackend = async function(studentId) { return syncDeeds(String(studentId || '')); };
    App.syncAllDeedsWithBackend = async function() { return syncDeeds(''); };

    App.addDeed = async function(input) {
      const current = App.getCurrentUser ? App.getCurrentUser() : null;
      if (!current || current.role !== 'student' || !getToken()) throw new Error('กรุณาเข้าสู่ระบบนักเรียนใหม่');
      const cid = Number(input.categoryId || input.category_id || 7);
      const image = input.imageData || input.imageUrl || (Array.isArray(input.imageUrls) ? input.imageUrls[0] : '');
      let evidence = null;
      if (typeof image === 'string' && image.startsWith('data:')) {
        const m = image.match(/^data:([^;]+);base64,/); if (m) evidence = { dataUrl: image, type: m[1], name: `evidence-${current.student_id}-${Date.now()}` };
      }
      const data = await gasCall('submitDeed', { studentId: String(current.student_id), cohort: String(current.class_year ? 'รุ่น ' + current.class_year : ''),
        category: categoryText(cid), activityDate: String(input.activityDate || ''), hours: Number(input.hours), description: String(input.description || ''), evidence });
      if (!data.deed) throw new Error('บันทึกไม่สำเร็จ');
      const deed = normalizeDeed(data.deed); deed.notification = data.notification || { status: 'unknown' }; await syncDeeds(current.student_id).catch(() => {}); return deed;
    };

    App.updateDeedStatus = async function(studentId, deedId, status, approverName, rejectReason) {
      if (!getToken()) throw new Error('กรุณาเข้าสู่ระบบอาจารย์/แอดมินใหม่');
      const decision = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : '';
      if (!decision) throw new Error('สถานะไม่ถูกต้อง');
      const data = await gasCall('reviewDeed', { recordId: String(deedId), decision, note: String(rejectReason || '') });
      await syncDeeds('').catch(() => {}); return data.deed ? normalizeDeed(data.deed) : null;
    };

    App.notifyAdmins = async function(deed) { return !!(deed && deed.notification && deed.notification.status === 'sent'); };
    App.startRealtimeSync = function(studentId, callback) {
      let stopped = false, busy = false;
      const poll = async () => { if (stopped || busy || !getToken()) return; busy = true; try { await syncDeeds(String(studentId || '')); if (typeof callback === 'function') callback(); } catch (_) {} finally { busy = false; } };
      poll(); const timer = setInterval(poll, 15000); return () => { stopped = true; clearInterval(timer); };
    };

    App.getAllPendingDeeds = function() { const u = App.getCurrentUser ? App.getCurrentUser() : null; if (u && ['teacher','admin'].includes(u.role) && getToken()) return originalGetAllPending(); return []; };
    App.getAllStudentsSummary = function() { const u = App.getCurrentUser ? App.getCurrentUser() : null; if (u && ['teacher','admin'].includes(u.role) && getToken()) return originalGetAllSummary(); return []; };

    App.logout = async function() {
      const token = getToken(); clearV2();
      try { localStorage.removeItem('gooddeeds_session'); } catch (_) {}
      const revoke = token ? gasCall('logout', {}, token).catch(() => ({ revoked: false })) : Promise.resolve();
      if (originalLogout) originalLogout();
      return revoke;
    };
  }

  if (typeof module !== 'undefined') module.exports = { createGoodDeedGatewayClient };
})(typeof window === 'undefined' ? this : window);
