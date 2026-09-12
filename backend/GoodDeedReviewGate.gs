/**
 * Internal, read-only review prerequisite check. No HTTP route or writer.
 * Ports must be implemented by trusted server code, never deserialized from a
 * request. They must resolve current private records, not client attestations.
 * Passing this check is NOT a transaction or reusable authorization token.
 * See docs/REVIEW_STORAGE_CONTRACT.md before integration.
 */
function checkGoodDeedReviewPrerequisites_(request, ports, now) {
  const fail = code => { throw new Error(code); };
  const ref = value => typeof value === 'string' && /^[A-Za-z0-9._:-]{3,120}$/.test(value);
  if (!request || typeof request !== 'object' || Array.isArray(request) ||
      Object.keys(request).some(k => !['requestId','deedId','decision','note','signatureRef'].includes(k)) ||
      !ref(request.requestId) || !ref(request.deedId) || !ref(request.signatureRef) ||
      !['approved','rejected'].includes(request.decision) || typeof request.note !== 'string' ||
      request.note.length > 1200 || (request.decision === 'rejected' && !request.note.trim())) fail('REVIEW_REQUEST_INVALID');
  if (!Number.isSafeInteger(now) || now < 0) fail('REVIEW_CLOCK_INVALID');
  const names = ['session','deed','assignment','signature'];
  if (!ports || names.some(k => typeof ports[k] !== 'function')) fail('REVIEW_PRIVATE_RESOLVERS_REQUIRED');
  function read(name, args) {
    try { return ports[name].apply(null, args); }
    catch (_) { fail('REVIEW_PRIVATE_LOOKUP_FAILED'); }
  }
  const activeTime = record => record && Number.isSafeInteger(record.validFrom) &&
    Number.isSafeInteger(record.expiresAt) && record.validFrom <= now && record.validFrom >= 0 && record.expiresAt > now;
  // Session is obtained from authenticated server context; no request actor ID.
  const actor = read('session', []);
  if (!activeTime(actor) || actor.active !== true || !ref(actor.actorRef) || !ref(actor.sessionRef) ||
      !['teacher','admin'].includes(actor.role)) fail('REVIEW_AUTH_REQUIRED');
  const deed = read('deed', [request.deedId]);
  if (!deed || deed.deedId !== request.deedId || !/^\d{7}$/.test(deed.studentId) ||
      typeof deed.studentId !== 'string' || typeof deed.revisionDigest !== 'string' ||
      !/^[a-f0-9]{64}$/.test(deed.revisionDigest)) fail('REVIEW_STORED_DEED_INVALID');
  // A final/uncertain transition must use the durable receipt/reconciliation
  // path, which does not exist here. Never authorize a second credit.
  if (deed.status !== 'pending') fail('REVIEW_CURRENT_PENDING_REQUIRED');
  const scope = read('assignment', [actor.actorRef, deed.studentId]);
  if (!activeTime(scope) || scope.active !== true || scope.actorRef !== actor.actorRef ||
      scope.studentId !== deed.studentId || scope.permission !== 'gooddeed.review' || !ref(scope.version)) fail('REVIEW_ASSIGNED_SCOPE_REQUIRED');
  const canonical = JSON.stringify(['gooddeed-review-intent-v1', actor.actorRef, actor.sessionRef,
    deed.deedId, deed.studentId, deed.revisionDigest, scope.version,
    request.requestId, request.decision, request.note]);
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, canonical, Utilities.Charset.UTF_8)
    .map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('');
  const proof = read('signature', [request.signatureRef]);
  if (!activeTime(proof) || proof.signatureRef !== request.signatureRef ||
      proof.purpose !== 'gooddeed.review' || proof.state !== 'verified-private' || proof.consumed !== false ||
      proof.actorRef !== actor.actorRef || proof.sessionRef !== actor.sessionRef || proof.intentDigest !== digest ||
      now - proof.validFrom > 300000 || proof.expiresAt - proof.validFrom > 300000) fail('REVIEW_FRESH_SIGNATURE_REQUIRED');
  return {checksPassed: true, executable: false, deedId: deed.deedId,
    requestId: request.requestId, revisionDigest: deed.revisionDigest, scopeVersion: scope.version,
    intentDigest: digest, validUntil: Math.min(actor.expiresAt, scope.expiresAt, proof.expiresAt),
    remaining: ['locked-reread','official-policy','durable-signature-consumption','journal-and-outbox']};
}
