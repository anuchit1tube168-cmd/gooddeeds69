(() => {
  'use strict';

  // RTAFNC Good Deed production load-shedding hotfix.
  // Network/timing behavior only: no LIFF ID, endpoint, role, data or payload changes.
  const originalFetch = window.fetch.bind(window);
  const originalSetInterval = window.setInterval.bind(window);
  const responseCache = new Map();
  const inFlight = new Map();
  const GET_TIMEOUT_MS = 10000;
  const POST_TIMEOUT_MS = 25000;
  const LEGACY_POLL_MS = 15000;
  const POLL_MIN_MS = 90000;
  const POLL_JITTER_MS = 30000;
  const TTL_MS = Object.freeze({
    getStudents: 5 * 60 * 1000,
    getDeeds: 20 * 1000,
  });

  // The legacy dashboard schedules exactly one 15s polling loop. Stretch only that
  // interval and add per-client jitter so 100+ open LIFF clients do not synchronize.
  window.setInterval = function rtafncSetInterval(handler, timeout, ...args) {
    if (Number(timeout) === LEGACY_POLL_MS) {
      const spread = POLL_MIN_MS + Math.floor(Math.random() * (POLL_JITTER_MS + 1));
      return originalSetInterval(handler, spread, ...args);
    }
    return originalSetInterval(handler, timeout, ...args);
  };

  function requestInfo(input, init = {}) {
    let url;
    try {
      url = new URL(typeof input === 'string' ? input : input.url, location.href);
    } catch (_) {
      return null;
    }
    const method = String(init.method || (typeof input !== 'string' && input.method) || 'GET').toUpperCase();
    const isAppsScript = url.hostname === 'script.google.com' && url.pathname.includes('/macros/s/');
    if (!isAppsScript) return null;
    return { url, method, action: String(url.searchParams.get('action') || '') };
  }

  function cacheKey(info) {
    if (!info || info.method !== 'GET' || !Object.prototype.hasOwnProperty.call(TTL_MS, info.action)) return '';
    const url = new URL(info.url.toString());
    url.searchParams.delete('_');
    return `${info.method}:${url.toString()}`;
  }

  function responseFromPayload(payload) {
    return new Response(payload.text, {
      status: payload.status,
      statusText: payload.statusText,
      headers: payload.headers,
    });
  }

  async function fetchWithTimeout(input, init, timeoutMs) {
    const controller = new AbortController();
    const upstreamSignal = init && init.signal;
    let upstreamAbort;
    if (upstreamSignal) {
      if (upstreamSignal.aborted) controller.abort();
      else {
        upstreamAbort = () => controller.abort();
        upstreamSignal.addEventListener('abort', upstreamAbort, { once: true });
      }
    }
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await originalFetch(input, { ...(init || {}), signal: controller.signal });
    } catch (error) {
      if (controller.signal.aborted && !(upstreamSignal && upstreamSignal.aborted)) {
        throw new Error('ระบบหลังบ้านตอบช้า กรุณาลองใหม่อีกครั้ง');
      }
      throw error;
    } finally {
      clearTimeout(timer);
      if (upstreamSignal && upstreamAbort) upstreamSignal.removeEventListener('abort', upstreamAbort);
    }
  }

  window.fetch = async function rtafncFetch(input, init = {}) {
    const info = requestInfo(input, init);
    if (!info) return originalFetch(input, init);

    if (info.method !== 'GET') {
      // A write may change the student's latest state. Never serve stale cached reads after it.
      responseCache.clear();
      return fetchWithTimeout(input, init, POST_TIMEOUT_MS);
    }

    const key = cacheKey(info);
    if (!key) return fetchWithTimeout(input, init, GET_TIMEOUT_MS);

    const ttl = TTL_MS[info.action] || 0;
    const cached = responseCache.get(key);
    if (cached && Date.now() - cached.savedAt < ttl) {
      return responseFromPayload(cached.payload);
    }

    if (inFlight.has(key)) {
      const payload = await inFlight.get(key);
      return responseFromPayload(payload);
    }

    const pending = (async () => {
      const response = await fetchWithTimeout(input, init, GET_TIMEOUT_MS);
      const text = await response.text();
      const payload = {
        text,
        status: response.status,
        statusText: response.statusText,
        headers: Array.from(response.headers.entries()),
      };
      if (response.ok) responseCache.set(key, { savedAt: Date.now(), payload });
      return payload;
    })();

    inFlight.set(key, pending);
    try {
      const payload = await pending;
      return responseFromPayload(payload);
    } finally {
      inFlight.delete(key);
    }
  };
})();
