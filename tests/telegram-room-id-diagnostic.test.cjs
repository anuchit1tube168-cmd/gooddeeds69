const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('Telegram room ID diagnostic remains opt-in and emergency-safe', () => {
  const gas = fs.readFileSync('backend/Code.gs', 'utf8');

  assert.match(gas, /const EMERGENCY_LOCKDOWN = true/);
  assert.match(gas, /TELEGRAM_ROOM_ID_DIAGNOSTIC_ENABLED/);
  assert.match(gas, /TELEGRAM_WEBHOOK_KEY/);
  assert.match(gas, /expectedKey\.length < 32/);
  assert.match(gas, /TELEGRAM_BOT_TOKEN/);
  assert.match(gas, /\['group', 'supergroup'\]\.includes\(chatType\)/);
  assert.match(gas, /\/sendMessage/);
  assert.match(gas, /Chat ID:/);
  assert.doesNotMatch(gas, /const EMERGENCY_LOCKDOWN = false/);
});

test('room ID command is handled before the general emergency lockdown gate only behind opt-in', () => {
  const gas = fs.readFileSync('backend/Code.gs', 'utf8');
  const diagnosticIndex = gas.indexOf('telegramRoomIdDiagnosticEnabled_() && isTelegramRoomIdCommand_');
  const lockdownIndex = gas.indexOf("if (EMERGENCY_LOCKDOWN) {", diagnosticIndex);

  assert.ok(diagnosticIndex >= 0);
  assert.ok(lockdownIndex > diagnosticIndex);
});
