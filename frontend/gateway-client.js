/* Browser client for the existing rtafnc-one gateway. Never stores credentials. */
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
        if (cause.code) throw cause;
        throw error(cause.name === 'AbortError' ? 'REQUEST_TIMEOUT' : 'CONNECTION_FAILED');
      } finally { clearTimeout(timeout); inflight.delete(controller); }
    }
    function acceptSession(data) {
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
        return acceptSession(await request('/auth/line/verify', 'POST', {idToken}));
      },
      async restore() { clear(); return acceptSession(await request('/auth/session')); },
      async readSelf() {
        if (!session?.studentLinked || !session.permissions.includes('gooddeed:self:read')) throw error('LINK_REQUIRED');
        const [cardResult, listResult] = await Promise.all([request('/api/gooddeed/card-self'), request('/api/gooddeed/deeds-self')]);
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
  if (typeof module !== 'undefined') module.exports = {createGoodDeedGatewayClient};
})(typeof window === 'undefined' ? this : window);
