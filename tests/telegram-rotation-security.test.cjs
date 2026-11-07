const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const jsEndpoints = [
  'functions/api/telegram-webhook.js',
  'functions/api/notify-deed.js',
  'functions/api/submit_deed.js',
  'functions/api/approve_deed.js',
  'functions/api/delete_deed.js'
];
for (const name of jsEndpoints) {
  test(name + ' contains no Telegram bot token literal', () => {
    const source = fs.readFileSync(path.join(root, name), 'utf8');
    assert.doesNotMatch(source, /\\b\\d{8,12}:[A-Za-z0-9_-]{25,}/);
    assert.match(source, /TELEGRAM_BOT_TOKEN/);
  });
}
test('webhook requires Telegram secret and allowlisted approvers', () => {
  const source = fs.readFileSync(path.join(root, 'functions/api/telegram-webhook.js'), 'utf8');
  assert.match(source, /X-Telegram-Bot-Api-Secret-Token/);
  assert.match(source, /TELEGRAM_WEBHOOK_SECRET/);
  assert.match(source, /TELEGRAM_APPROVER_IDS/);
});
test('bridge verifies TLS and does not auto-register webhook', () => {
  const source = fs.readFileSync(path.join(root, 'scripts/live_telegram_bridge.py'), 'utf8');
  assert.match(source, /ssl\\.create_default_context\\(\\)/);
  assert.doesNotMatch(source, /ssl\\._create_unverified_context\\(\\)/);
  assert.doesNotMatch(source, /call_telegram\\('setWebhook'/);
});
