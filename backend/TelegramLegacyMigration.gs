/**
 * RTAFNC Good Deed — Telegram legacy property migration helper
 * SAFE: never logs or returns secret values.
 * Add this file to the same Apps Script project as CodeV2.gs.
 */
function migrateLegacyTelegramProperties() {
  const props = PropertiesService.getScriptProperties();

  const tokenKeys = [
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_TOKEN',
    'BOT_TOKEN',
    'TG_BOT_TOKEN',
    'TELEGRAM_BOT_API_TOKEN'
  ];
  const chatKeys = [
    'TELEGRAM_CHAT_ID',
    'CHAT_ID',
    'TG_CHAT_ID',
    'TELEGRAM_ADMIN_CHAT_ID',
    'TELEGRAM_GROUP_CHAT_ID'
  ];

  function firstExisting_(keys) {
    for (let i = 0; i < keys.length; i++) {
      const value = props.getProperty(keys[i]);
      if (value) return { key: keys[i], value: value };
    }
    return null;
  }

  const canonicalToken = props.getProperty('TELEGRAM_BOT_TOKEN');
  const canonicalChat = props.getProperty('TELEGRAM_CHAT_ID');
  const tokenSource = canonicalToken ? { key: 'TELEGRAM_BOT_TOKEN', value: canonicalToken } : firstExisting_(tokenKeys.slice(1));
  const chatSource = canonicalChat ? { key: 'TELEGRAM_CHAT_ID', value: canonicalChat } : firstExisting_(chatKeys.slice(1));

  if (!canonicalToken && tokenSource) props.setProperty('TELEGRAM_BOT_TOKEN', tokenSource.value);
  if (!canonicalChat && chatSource) props.setProperty('TELEGRAM_CHAT_ID', chatSource.value);

  const result = {
    ok: Boolean(tokenSource && chatSource),
    tokenConfigured: Boolean(tokenSource),
    chatConfigured: Boolean(chatSource),
    tokenSourceKey: tokenSource ? tokenSource.key : null,
    chatSourceKey: chatSource ? chatSource.key : null,
    secretsExposed: false
  };

  console.log('TELEGRAM_PROPERTY_MIGRATION ' + JSON.stringify(result));
  return result;
}

/** Run after migrateLegacyTelegramProperties(). Never returns secret values. */
function telegramLegacyConfigStatus() {
  const props = PropertiesService.getScriptProperties();
  return {
    ok: Boolean(props.getProperty('TELEGRAM_BOT_TOKEN') && props.getProperty('TELEGRAM_CHAT_ID')),
    tokenConfigured: Boolean(props.getProperty('TELEGRAM_BOT_TOKEN')),
    chatConfigured: Boolean(props.getProperty('TELEGRAM_CHAT_ID')),
    secretsExposed: false
  };
}
