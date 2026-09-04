(() => {
  'use strict';

  // Integrity guard for the legacy compatibility submit flow.
  // The legacy POST uses no-cors, so an opaque response cannot prove that the
  // deed reached Google Sheets. Hold the existing submit promise until the
  // exact generated deed ID can be read back through getDeeds.
  // No backend schema, LIFF identity, role or write payload is changed.
  const previousFetch = window.fetch.bind(window);
  const APPS_SCRIPT_HOST = 'script.google.com';
  const VERIFY_DELAYS_MS = [350, 800, 1400, 2200, 3200];

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  function requestUrl(input) {
    try {
      return new URL(typeof input === 'string' ? input : input.url, location.href);
    } catch (_) {
      return null;
    }
  }

  function isAppsScript(url) {
    return Boolean(url && url.hostname === APPS_SCRIPT_HOST && url.pathname.includes('/macros/s/'));
  }

  function parseSubmit(init) {
    if (String(init?.method || 'GET').toUpperCase() !== 'POST') return null;
    try {
      const body = typeof init.body === 'string' ? JSON.parse(init.body) : null;
      if (!body || body.action !== 'submit_deed' || !body.deed) return null;
      const deedId = String(body.deed.id || body.deed.deedId || '').trim();
      const studentId = String(body.deed.studentId || body.deed.student_id || '').trim();
      if (!deedId || !/^\d{7}$/.test(studentId)) return null;
      return { deedId, studentId };
    } catch (_) {
      return null;
    }
  }

  function extractDeeds(data, studentId) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.deeds)) return data.deeds;
    if (data && typeof data === 'object' && Array.isArray(data[studentId])) return data[studentId];
    return [];
  }

  function hasDeed(data, studentId, deedId) {
    return extractDeeds(data, studentId).some((d) => {
      const id = String(d?.id ?? d?.deedId ?? d?.recordId ?? '').trim();
      return id === deedId;
    });
  }

  async function verifyReadBack(baseUrl, studentId, deedId) {
    for (let i = 0; i < VERIFY_DELAYS_MS.length; i += 1) {
      await sleep(VERIFY_DELAYS_MS[i]);
      try {
        const url = new URL(baseUrl.toString());
        url.search = '';
        url.searchParams.set('action', 'getDeeds');
        url.searchParams.set('studentId', studentId);
        // The existing performance cache intentionally ignores only `_`.
        // A unique verifier parameter avoids reusing a stale pre-write read.
        url.searchParams.set('readback', `${deedId}:${i + 1}`);
        url.searchParams.set('_', String(Date.now()));
        const response = await previousFetch(url.toString(), { cache: 'no-store', redirect: 'follow' });
        if (!response.ok) continue;
        const data = await response.json();
        if (hasDeed(data, studentId, deedId)) return true;
      } catch (_) {
        // Keep retrying. The original submit remains unresolved until proven.
      }
    }
    return false;
  }

  window.fetch = async function rtafncSubmitReadbackFetch(input, init = {}) {
    const url = requestUrl(input);
    const submit = isAppsScript(url) ? parseSubmit(init) : null;
    if (!submit) return previousFetch(input, init);

    const response = await previousFetch(input, init);
    const confirmed = await verifyReadBack(url, submit.studentId, submit.deedId);
    if (!confirmed) {
      throw new Error('ยังยืนยันการบันทึกในฐานข้อมูลไม่ได้ กรุณากดอัปเดตข้อมูลก่อน และอย่าส่งรายการซ้ำ');
    }
    return response;
  };
})();
