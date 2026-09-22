const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('security incident keeps legacy Telegram/local API/password surfaces fail-closed', () => {
  const gas = fs.readFileSync('backend/Code.gs','utf8');
  const server = fs.readFileSync('backend/server.py','utf8');
  const codeV2 = fs.readFileSync('backend/CodeV2.gs','utf8');
  const envExample = fs.readFileSync('.env.example','utf8');

  assert.match(gas, /const EMERGENCY_LOCKDOWN = true/);
  assert.doesNotMatch(gas, /password:\s*getStudentPassword/);
  assert.doesNotMatch(gas, /pwdSheet\.appendRow\(\[studentId, newPassword/);
  assert.match(gas, /AUTHENTICATED_GATEWAY_REQUIRED/);

  assert.match(server, /ENABLE_LOCAL_API'\] = 'false'/);
  assert.doesNotMatch(server, /setdefault\('ENABLE_LOCAL_API', 'true'\)/);
  assert.match(server, /TELEGRAM_RUNTIME_RETIRED/);
  assert.doesNotMatch(server, /api\.telegram\.org\/bot/);
  assert.doesNotMatch(server, /get_env_config\(['\"]TELEGRAM_BOT_TOKEN['\"]\)/);
  assert.doesNotMatch(server, /get_env_config\(['\"]TELEGRAM_CHAT_ID['\"]\)/);

  // Retired runtimes must stay deleted rather than being revived in a disabled form.
  assert.equal(fs.existsSync('data/telegram_bot_listener.py'), false);
  assert.equal(fs.existsSync('data/line_webhook_bot.py'), false);

  // Telegram credentials and Bot API calls are Cloudflare-only after the incident.
  assert.match(codeV2, /function retireLegacyTelegramScriptProperties\(\)/);
  assert.doesNotMatch(codeV2, /api\.telegram\.org\/bot/);
  assert.doesNotMatch(codeV2, /getProperty\(['"]TELEGRAM_BOT_TOKEN['"]\)/);
  assert.doesNotMatch(codeV2, /getProperty\(['"]TELEGRAM_CHAT_ID['"]\)/);
  assert.doesNotMatch(envExample, /TELEGRAM_BOT_TOKEN\s*=/);
  assert.doesNotMatch(envExample, /TELEGRAM_CHAT_ID\s*=/);
});
