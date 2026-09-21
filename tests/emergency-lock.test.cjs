const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('security incident keeps legacy Telegram/local API/password surfaces fail-closed', () => {
  const gas = fs.readFileSync('backend/Code.gs','utf8');
  const server = fs.readFileSync('backend/server.py','utf8');
  const listener = fs.readFileSync('data/telegram_bot_listener.py','utf8');

  assert.match(gas, /const EMERGENCY_LOCKDOWN = true/);
  assert.doesNotMatch(gas, /password:\s*getStudentPassword/);
  assert.doesNotMatch(gas, /pwdSheet\.appendRow\(\[studentId, newPassword/);
  assert.match(gas, /AUTHENTICATED_GATEWAY_REQUIRED/);

  assert.match(server, /ENABLE_LOCAL_API'\] = 'false'/);
  assert.doesNotMatch(server, /setdefault\('ENABLE_LOCAL_API', 'true'\)/);
  assert.match(server, /SECURITY_INCIDENT_TELEGRAM_DISABLED/);

  assert.match(listener, /EMERGENCY_LOCKDOWN = True/);
  assert.match(listener, /BOT_TOKEN = ''/);
  assert.doesNotMatch(listener, /BOT_TOKEN = get_env_config\('TELEGRAM_BOT_TOKEN'\)/);
});
