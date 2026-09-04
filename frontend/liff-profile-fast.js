(() => {
  'use strict';

  // Fast-path only. Identity/authorization behavior is unchanged.
  // Use the already-issued LIFF ID token as a client-side hint so the
  // compatibility UI can begin its existing auto-login without waiting for
  // an additional profile request. Server-side verification remains the
  // target security model; if the token does not expose a valid LINE subject,
  // fall back to LIFF's original getProfile().
  const liff = window.liff;
  if (!liff || typeof liff.getProfile !== 'function' || liff.__rtafncFastProfile) return;

  const originalGetProfile = liff.getProfile.bind(liff);
  const fastGetProfile = async function rtafncFastGetProfile() {
    try {
      const decoded = typeof liff.getDecodedIDToken === 'function' ? liff.getDecodedIDToken() : null;
      const userId = String(decoded && decoded.sub || '');
      if (/^U[0-9a-f]{32}$/i.test(userId)) {
        return {
          userId,
          displayName: String(decoded && decoded.name || ''),
          pictureUrl: String(decoded && decoded.picture || ''),
          statusMessage: ''
        };
      }
    } catch (_) {
      // Fall through to the SDK's normal profile request.
    }
    return originalGetProfile();
  };

  try {
    liff.getProfile = fastGetProfile;
  } catch (_) {
    return;
  }

  try {
    Object.defineProperty(liff, '__rtafncFastProfile', { value: true, configurable: false });
  } catch (_) {
    // The speed-up is still safe even if the marker cannot be installed.
  }
})();
