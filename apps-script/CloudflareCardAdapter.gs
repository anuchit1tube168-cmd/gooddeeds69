/**
 * RTAFNC Good Deed — Cloudflare card-self adapter
 * STAGING ONLY / READ ONLY
 *
 * Drop this file into the existing Good Deed Apps Script project.
 * Required Script Property:
 *   CLOUDFLARE_CARD_ADAPTER_SECRET = random secret >= 32 chars
 *
 * Hook in doPost(e), after action/payload/requestId are parsed and BEFORE legacy session auth:
 *   if (action === 'cloudflareCardSelf') return cloudflareCardSelfResponse_(payload, requestId);
 *
 * This adapter never accepts browser credentials and never performs writes.
 */

function cloudflareCardSelfResponse_(payload, requestId) {
  try {
    ensureSetup_();
    var input = payload || {};
    var memberRef = clean_(input.memberId, 128);
    var timestamp = Number(input.timestamp || 0);
    var nonce = clean_(input.nonce, 128);
    var signature = clean_(input.signature, 128).toLowerCase();
    var rid = clean_(requestId, 96);

    if (!/^[A-Za-z0-9._:-]{7,128}$/.test(memberRef)) throw new Error('ADAPTER_MEMBER_REF_INVALID');
    if (!/^[A-Za-z0-9._:-]{1,96}$/.test(rid)) throw new Error('ADAPTER_REQUEST_ID_INVALID');
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(nonce)) throw new Error('ADAPTER_NONCE_INVALID');
    if (!/^[0-9a-f]{64}$/.test(signature)) throw new Error('ADAPTER_SIGNATURE_INVALID');

    var now = Math.floor(Date.now() / 1000);
    if (!isFinite(timestamp) || Math.abs(now - timestamp) > 120) throw new Error('ADAPTER_TIMESTAMP_INVALID');

    var props = PropertiesService.getScriptProperties();
    var secret = String(props.getProperty('CLOUDFLARE_CARD_ADAPTER_SECRET') || '');
    if (secret.length < 32) throw new Error('ADAPTER_DISABLED');

    var canonical = ['v1', memberRef, rid, String(timestamp), nonce].join('\n');
    var expected = hmacSha256Hex_(canonical, secret);
    if (!constantTimeEqual_(expected, signature)) throw new Error('ADAPTER_SIGNATURE_INVALID');

    var replayKey = 'cf-card-nonce:' + tokenHash_(nonce).slice(0, 40);
    var cache = CacheService.getScriptCache();
    if (cache.get(replayKey)) throw new Error('ADAPTER_REPLAY_DETECTED');
    cache.put(replayKey, '1', 300);

    var member = findMember_(function(row) {
      return String(row.studentId || '') === memberRef || String(row.memberId || '') === memberRef;
    });
    if (!member || !truthy_(member.active)) throw new Error('ADAPTER_MEMBER_NOT_FOUND');

    var records = table_(GD.SHEETS.RECORDS).rows.filter(function(row) {
      return String(row.memberId || '') === String(member.memberId || '') ||
        (member.studentId && String(row.studentId || '') === String(member.studentId));
    });

    var totalHours = 0;
    var approvedCount = 0;
    var pendingCount = 0;
    records.forEach(function(row) {
      var status = String(row.status || '').toLowerCase();
      if (status === 'approved') {
        approvedCount++;
        var hours = Number(row.hours || 0);
        if (isFinite(hours) && hours > 0) totalHours += hours;
      } else if (status === 'pending') {
        pendingCount++;
      }
    });

    var card = {
      displayName: clean_(member.displayName, 120),
      studentId: /^\d{7}$/.test(String(member.studentId || '')) ? String(member.studentId) : undefined,
      cohortLabel: clean_(member.cohort, 80) || '-',
      positionLabel: 'นักเรียนพยาบาล',
      totalHours: Math.round(totalHours * 100) / 100,
      approvedCount: approvedCount,
      pendingCount: pendingCount
    };
    if (card.studentId === undefined) delete card.studentId;

    audit_('cloudflare-core', 'cloudflare.card_self.read', 'member', member.memberId, {
      requestId: rid,
      minimumNecessary: true
    }, rid);

    return json_({ ok: true, data: { card: card } });
  } catch (error) {
    return json_({ ok: false, error: cloudflareAdapterSafeError_(error) });
  }
}

function hmacSha256Hex_(value, secret) {
  var bytes = Utilities.computeHmacSha256Signature(String(value), String(secret), Utilities.Charset.UTF_8);
  return bytes.map(function(byte) {
    var n = byte < 0 ? byte + 256 : byte;
    var h = n.toString(16);
    return h.length === 1 ? '0' + h : h;
  }).join('');
}

function cloudflareAdapterSafeError_(error) {
  var code = error && error.message ? String(error.message) : 'ADAPTER_ERROR';
  var allowed = [
    'ADAPTER_MEMBER_REF_INVALID', 'ADAPTER_REQUEST_ID_INVALID', 'ADAPTER_NONCE_INVALID',
    'ADAPTER_SIGNATURE_INVALID', 'ADAPTER_TIMESTAMP_INVALID', 'ADAPTER_DISABLED',
    'ADAPTER_REPLAY_DETECTED', 'ADAPTER_MEMBER_NOT_FOUND'
  ];
  return allowed.indexOf(code) >= 0 ? code : 'ADAPTER_ERROR';
}
