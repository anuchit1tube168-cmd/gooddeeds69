const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('retired duplicate backend refuses public reads and writes without storage access', () => {
  const context = vm.createContext({ContentService: {
    MimeType: {JSON: 'json'},
    createTextOutput: text => ({setMimeType: () => JSON.parse(text)})
  }});
  vm.runInContext(fs.readFileSync('data/google_apps_script_backend.js', 'utf8'), context);
  for (const handler of ['doGet', 'doPost']) {
    assert.equal(context[handler]({parameter: {action: 'getStudents'}}).code,
      'AUTHENTICATED_GATEWAY_REQUIRED');
  }
});

test('Telegram transport exceptions never place credentials in logs', () => {
  const logs = [];
  const token = 'synthetic-private-credential';
  const context = vm.createContext({
    console: {error: value => logs.push(String(value))},
    PropertiesService: {getScriptProperties: () => ({getProperty: key =>
      key === 'TELEGRAM_BOT_TOKEN' ? token : 'synthetic-chat'})},
    UrlFetchApp: {fetch: url => {throw new Error('Provider failed at ' + url);}}
  });
  vm.runInContext(fs.readFileSync('backend/CodeV2.gs', 'utf8'), context);
  context.notifyTelegram_('synthetic notification');
  assert.deepEqual(logs, ['TELEGRAM_REQUEST_FAILED']);
  assert.equal(logs.join('').includes(token), false);
});

test('request handler logs no provider stack or private payload', () => {
  const logs = [];
  const context = vm.createContext({console: {error: value => logs.push(String(value))}});
  vm.runInContext(fs.readFileSync('backend/CodeV2.gs', 'utf8'), context);
  context.allowedOrigin_ = () => 'https://example.test';
  context.ensureSetup_ = () => {throw new Error('synthetic-private-request-body');};
  context.bridge_ = data => data;
  context.doPost({parameter: {requestId: 'synthetic-request'}});
  assert.deepEqual(logs, ['GOODDEED_REQUEST_FAILED']);
});
