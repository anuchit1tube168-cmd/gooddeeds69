const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('frontend/gateway-client.js', 'utf8');

test('GAS V2 operational calls require a credential-free bridge probe first', () => {
  assert.match(source, /gasBridgePost\('__contract_probe__', \{\}, '', GAS_PROBE_TIMEOUT, true\)/);
  assert.match(source, /GAS_V2_BACKEND_UNAVAILABLE/);

  const start = source.indexOf('async function gasCall(');
  const end = source.indexOf('function categoryIdFrom', start);
  assert.ok(start >= 0 && end > start, 'gasCall block must exist');
  const block = source.slice(start, end);
  const probeIndex = block.indexOf('await ensureGasV2Ready()');
  const postIndex = block.indexOf('gasBridgePost(action');
  assert.ok(probeIndex >= 0, 'gasCall must probe V2 readiness');
  assert.ok(postIndex > probeIndex, 'operational POST must happen only after the readiness probe');
});

test('readiness probe never carries credentials or a LINE token', () => {
  const start = source.indexOf('async function ensureGasV2Ready()');
  const end = source.indexOf('async function gasCall(', start);
  assert.ok(start >= 0 && end > start, 'readiness function must exist');
  const block = source.slice(start, end);
  assert.match(block, /gasBridgePost\('__contract_probe__', \{\}, '', GAS_PROBE_TIMEOUT, true\)/);
  assert.doesNotMatch(block, /password|idToken|sessionToken\s*:/);
});

test('student and teacher login surface a backend-upgrade message instead of waiting for legacy auth fallback', () => {
  const matches = source.match(/ระบบหลังบ้านกำลังปรับรุ่น กรุณาลองใหม่ภายหลังหรือแจ้งผู้ดูแลระบบ/g) || [];
  assert.ok(matches.length >= 2, 'both student and staff login should report backend readiness failure');
  assert.doesNotMatch(source, /GAS_V2_BACKEND_UNAVAILABLE[^\n]*localStorage[^\n]*session/i);
});


test('stale Apps Script error pages are detected by iframe load and fail fast', () => {
  assert.match(source, /frame\.addEventListener\('load', onFrameLoad\)/);
  assert.match(source, /frame\.removeEventListener\('load', onFrameLoad\)/);
  assert.match(source, /submitted = true;\s*form\.submit\(\)/);
  assert.match(source, /bridgeGraceTimer = setTimeout/);
  assert.match(source, /reject\(new Error\('GAS_V2_BACKEND_UNAVAILABLE'\)\)/);
});
