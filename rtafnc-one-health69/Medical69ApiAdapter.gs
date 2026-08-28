// RTAFNC ONE · Medical69 API Adapter
// ADDITIVE ONLY: keep existing Medical69 functions unchanged.
// Script Properties required: MEDICAL69_SHARED_SECRET
// IMPORTANT: Deploy only after RTAFNC identity/RBAC gate is ready.

function medical69Json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function medical69Hex_(bytes) {
  return bytes.map(function(b) {
    var v = b < 0 ? b + 256 : b;
    return ('0' + v.toString(16)).slice(-2);
  }).join('');
}

function medical69SafeEqual_(a, b) {
  a = String(a || ''); b = String(b || '');
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function medical69Verify_(req) {
  var secret = PropertiesService.getScriptProperties().getProperty('MEDICAL69_SHARED_SECRET');
  if (!secret) throw new Error('MEDICAL69_SHARED_SECRET is not configured');
  if (!req || !req.ts || !req.nonce || !req.action || !req.sig) throw new Error('Malformed signed request');

  var now = Date.now();
  var ts = Number(req.ts);
  if (!isFinite(ts) || Math.abs(now - ts) > 2 * 60 * 1000) throw new Error('Expired request');

  var cache = CacheService.getScriptCache();
  var nonceKey = 'm69:' + String(req.nonce);
  if (cache.get(nonceKey)) throw new Error('Replay detected');

  var canonical = JSON.stringify({ ts: ts, nonce: String(req.nonce), action: String(req.action), args: req.args || {} });
  var expected = medical69Hex_(Utilities.computeHmacSha256Signature(canonical, secret));
  if (!medical69SafeEqual_(expected, req.sig)) throw new Error('Invalid signature');

  cache.put(nonceKey, '1', 180);
  return true;
}

function medical69Dispatch_(action, args) {
  args = args || {};
  switch (action) {
    case 'getDashboardStats': return getDashboardStats();
    case 'getRecipients': return getRecipients(args.searchQuery || '');
    case 'getRecipientHistory': return getRecipientHistory(args.recipientId);
    case 'saveMedicalRequest': return saveMedicalRequest(args.formData || {});
    case 'getRequests': return getRequests();
    case 'updateRequestStatus': return updateRequestStatus(args.requestId, args.status, args.notes || '');
    case 'saveNewVisit': return saveNewVisit(args.visitData || {});
    default: throw new Error('Action not allowed: ' + action);
  }
}

// If the project already has doPost(), merge this route into that handler instead of creating a second doPost.
function medical69HandlePost_(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    medical69Verify_(req);
    var data = medical69Dispatch_(req.action, req.args);
    return medical69Json_({ ok: true, data: data });
  } catch (err) {
    return medical69Json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

// Example integration if there is no existing doPost:
// function doPost(e) { return medical69HandlePost_(e); }
