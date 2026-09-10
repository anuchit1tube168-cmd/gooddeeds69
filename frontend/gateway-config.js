// Set only after confirming the owned staging gateway, CORS allowlist and cookies.
// Never read this origin from query parameters, profiles or browser storage.
window.GOODDEED_GATEWAY_CONFIG = Object.freeze({origin:'', timeoutMs:15000});
