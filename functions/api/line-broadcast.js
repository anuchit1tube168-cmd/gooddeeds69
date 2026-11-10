/**
 * Cloudflare Pages Function - Broadcast & Announcement Gateway (24/7 Edge Serverless)
 * ระบบบรอดแคสต์และส่งข้อความประชาสัมพันธ์ผ่าน LINE OA (@586diwio) และ Telegram
 * รองรับทั้งการประกาศทั่วไป และการแจ้งเตือน นพอ. ที่สะสมชั่วโมงความดีไม่ครบเกณฑ์
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400'
};

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

export async function onRequestGet(context) {
  const { env } = context;
  const token = await getEffectiveLineToken(env);

  return new Response(JSON.stringify({
    status: 'online',
    service: 'RTAFNC Good Deeds Broadcast Gateway',
    environment: 'Cloudflare Edge 24/7 Serverless',
    channelId: '1654464250',
    basicId: '@586diwio',
    capabilities: {
      lineBroadcast: !!token,
      telegramBroadcast: true
    },
    timestamp: new Date().toISOString()
  }, null, 2), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  const messageText = (body.message || '').trim();
  const channels = body.channels || ['telegram', 'line'];
  const dryRun = !!body.dryRun;
  const senderName = body.senderName || 'อาจารย์ผู้ดูแลระบบ วพอ.';
  const title = body.title || 'ประกาศจากระบบบันทึกความดี วพอ.';
  const target = body.target || 'all';
  const toUserId = body.to || '';

  if (!messageText && (!body.messages || !body.messages.length)) {
    return new Response(JSON.stringify({ error: 'Message content is required' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  let lineSuccess = false;
  let lineError = null;
  let telegramSuccess = false;
  let telegramError = null;

  // 1. LINE OA Messaging (Broadcast to all followers or Push to single user)
  if (channels.includes('line')) {
    if (dryRun) {
      lineSuccess = true;
    } else {
      try {
        const lineToken = await getEffectiveLineToken(env);
        if (lineToken) {
          const formattedLineMsg = `📢 ${title}\n━━━━━━━━━━━━━━━\n${messageText}\n\n👨‍🏫 โดย: ${senderName}\n📅 ${new Date().toLocaleDateString('th-TH')}`;
          const lineMessages = (body.messages && Array.isArray(body.messages) && body.messages.length > 0)
            ? body.messages
            : [{ type: 'text', text: formattedLineMsg }];

          let lineUrl = 'https://api.line.me/v2/bot/message/broadcast';
          let lineBody = { messages: lineMessages };

          if (target === 'single' && toUserId) {
            lineUrl = 'https://api.line.me/v2/bot/message/push';
            lineBody = { to: toUserId, messages: lineMessages };
          }

          const lineResp = await fetch(lineUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${lineToken}`
            },
            body: JSON.stringify(lineBody)
          });

          if (lineResp.ok) {
            lineSuccess = true;
          } else {
            const errData = await lineResp.text();
            lineError = errData;
            console.warn('LINE Messaging failed:', errData);
          }
        } else {
          lineError = 'LINE Access Token not available';
        }
      } catch (err) {
        lineError = err.message;
      }
    }
  }

  // 2. Telegram Broadcast (to Teacher/Staff Group)
  if (channels.includes('telegram')) {
    if (dryRun) {
      telegramSuccess = true;
    } else {
      try {
        const botToken = (env && env.TELEGRAM_BOT_TOKEN) ? env.TELEGRAM_BOT_TOKEN : '';
        const defaultChatId = (env && env.TELEGRAM_CHAT_ID) ? env.TELEGRAM_CHAT_ID : '';

        const tgText = `📢 <b>${escapeHtml(title)}</b>\n━━━━━━━━━━━━━━━\n${escapeHtml(messageText)}\n\n👨‍🏫 <b>โดย:</b> ${escapeHtml(senderName)}\n📅 <i>${new Date().toLocaleDateString('th-TH')}</i>`;

        const tgResp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: defaultChatId,
            text: tgText,
            parse_mode: 'HTML'
          })
        });

        telegramSuccess = tgResp.ok;
        if (!tgResp.ok) {
          telegramError = await tgResp.text();
        }
      } catch (err) {
        telegramError = err.message;
      }
    }
  }

  return new Response(JSON.stringify({
    status: (lineSuccess || telegramSuccess) ? 'success' : 'partial_or_failed',
    dryRun: dryRun,
    results: {
      line: { sent: lineSuccess, error: lineError },
      telegram: { sent: telegramSuccess, error: telegramError }
    },
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}

/**
 * Get or automatically issue a valid LINE Channel Access Token
 */
async function getEffectiveLineToken(env) {
  if (env && env.LINE_CHANNEL_ACCESS_TOKEN) {
    return env.LINE_CHANNEL_ACCESS_TOKEN;
  }
  const channelId = (env && env.LINE_CHANNEL_ID) ? env.LINE_CHANNEL_ID : '1654464250';
  const channelSecret = (env && env.LINE_CHANNEL_SECRET) ? env.LINE_CHANNEL_SECRET : '';

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', channelId);
    params.append('client_secret', channelSecret);

    const res = await fetch('https://api.line.me/v2/oauth/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    if (res.ok) {
      const data = await res.json();
      return data.access_token || '';
    }
  } catch (err) {
    console.warn('Auto fetch LINE token error in line-broadcast:', err);
  }
  return '';
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
