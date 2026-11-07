/**
 * Cloudflare Pages Function - LINE Webhook & Bot Gateway (24/7 Edge Serverless)
 * ระบบตอบรับอัตโนมัติและแจ้งเตือนผ่าน LINE Official Account (LINE OA) วพอ. ๒๕๖๙
 * รองรับทั้ง LINE Messaging API, LINE Webhook, Quick Reply, และ Flex Message
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-line-signature',
  'Access-Control-Max-Age': '86400'
};

const LIFF_ID = '2010948179-Ympqt2bT';
const LIFF_URL = `https://liff.line.me/${LIFF_ID}`;
const APP_URL = 'https://rtafnc-gooddeeds.pages.dev';

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

export async function onRequestGet(context) {
  const { env } = context;
  const token = await getEffectiveLineToken(env);
  const hasSecret = !!((env && env.LINE_CHANNEL_SECRET) || '7cf48cc5e433e3b11182e7ec016e44a6');
  const hasToken = !!token;

  return new Response(JSON.stringify({
    status: 'online',
    service: 'RTAFNC Good Deeds LINE OA Gateway',
    channelId: '1654464250',
    basicId: '@586diwio',
    environment: 'Cloudflare Edge 24/7 Serverless',
    liffId: LIFF_ID,
    liffUrl: LIFF_URL,
    appUrl: APP_URL,
    lineConfigured: {
      hasChannelSecret: hasSecret,
      hasChannelAccessToken: hasToken
    },
    ready: true,
    timestamp: new Date().toISOString()
  }, null, 2), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const channelSecret = (env && env.LINE_CHANNEL_SECRET) ? env.LINE_CHANNEL_SECRET : '7cf48cc5e433e3b11182e7ec016e44a6';
  const channelToken = await getEffectiveLineToken(env);

  const signature = request.headers.get('x-line-signature') || '';
  const rawBody = await request.text();

  // 1. Verify LINE Signature if channelSecret is configured
  if (channelSecret && signature) {
    const isValid = await verifyLineSignature(rawBody, signature, channelSecret);
    if (!isValid) {
      console.warn('⚠️ Invalid LINE Webhook signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  const events = body.events || [];

  // 2. Process all incoming LINE events
  for (const event of events) {
    try {
      await handleLineEvent(event, channelToken, env);
    } catch (evtErr) {
      console.error('Error handling LINE event:', evtErr);
    }
  }

  return new Response(JSON.stringify({ ok: true, processedEvents: events.length }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}

/**
 * Handle individual LINE event (message, follow, postback)
 */
async function handleLineEvent(event, channelToken, env) {
  const replyToken = event.replyToken;
  const eventType = event.type;
  const source = event.source || {};
  const userId = source.userId || '';

  // Quick Reply Menu Items
  const quickReply = {
    items: [
      {
        type: 'action',
        action: {
          type: 'uri',
          label: '📝 บันทึกความดี',
          uri: `${LIFF_URL}?redirect=submit-deed.html`
        }
      },
      {
        type: 'action',
        action: {
          type: 'uri',
          label: '📊 แดชบอร์ดของฉัน',
          uri: `${LIFF_URL}?redirect=student-dashboard.html`
        }
      },
      {
        type: 'action',
        action: {
          type: 'uri',
          label: '🏆 ทำเนียบความดี',
          uri: `${APP_URL}/ranking`
        }
      },
      {
        type: 'action',
        action: {
          type: 'uri',
          label: '🗂️ คลังการ์ด นพอ.',
          uri: `${APP_URL}/view_cards`
        }
      },
      {
        type: 'action',
        action: {
          type: 'uri',
          label: '👨‍🏫 อาจารย์ผู้ตรวจ',
          uri: `${APP_URL}/teacher-dashboard`
        }
      }
    ]
  };

  // 1. Follow event (User adds LINE OA as friend)
  if (eventType === 'follow') {
    const welcomeMessages = [
      {
        type: 'text',
        text: 'ยินดีต้อนรับสู่ ระบบบันทึกความดีจิตอาสา ๒๕๖๙\nวิทยาลัยพยาบาลทหารอากาศ กรมแพทย์ทหารอากาศ 🎖️\n\nระบบนี้ช่วยให้ นพอ. บันทึกและสะสมชั่วโมงความดีจิตอาสา ตรวจสอบสถานะการอนุมัติ และสะสมบัตรเกียรติยศ Chibi Card ได้ตลอด 24 ชั่วโมงค่ะ',
        quickReply: quickReply
      }
    ];
    if (replyToken && channelToken) {
      await sendLineReply(replyToken, welcomeMessages, channelToken);
    }
    return;
  }

  // 2. Message event (Text queries)
  if (eventType === 'message' && event.message && event.message.type === 'text') {
    const text = event.message.text.trim();
    const lower = text.toLowerCase();

    // 2.1 Check if text is a 7-digit Student ID
    if (/^\d{7}$/.test(text)) {
      const studentId = text;
      const studentData = await lookupStudentInfo(studentId, env);

      let replyMsg;
      if (studentData) {
        const rank = studentData.rank || 'นพอ.';
        const name = `${rank} ${studentData.first_name || ''} ${studentData.last_name || ''}`.trim();
        const year = studentData.class_year ? `รุ่น ${studentData.class_year}` : '';
        const total = studentData.total_hours || 0;
        const carry = studentData.carry_forward || 0;
        const cum = Math.round((parseFloat(total) + parseFloat(carry)) * 10) / 10;
        const statusBadge = total >= 50 ? '✅ ผ่านเกณฑ์ปี 69 แล้ว' : `⏳ ขาดอีก ${Math.max(0, 50 - total)} ชม.`;

        // Automatically bind studentId with lineUserId in Google Sheets & Cloud
        let lineDisplayName = '';
        if (userId && channelToken) {
          try {
            const profResp = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
              headers: { 'Authorization': `Bearer ${channelToken}` }
            });
            if (profResp.ok) {
              const prof = await profResp.json();
              lineDisplayName = prof.displayName || '';
            }
          } catch (_) {}
        }
        await bindStudentLineAccount(studentId, userId, lineDisplayName, env);

        replyMsg = {
          type: 'flex',
          altText: `📊 สรุปความดี: ${name} (${total} ชม.)`,
          contents: {
            type: 'bubble',
            size: 'mega',
            header: {
              type: 'box',
              layout: 'vertical',
              backgroundColor: '#0a192f',
              paddingAll: '16px',
              contents: [
                { type: 'text', text: 'วิทยาลัยพยาบาลทหารอากาศ', color: '#c9a227', size: 'xs', weight: 'bold' },
                { type: 'text', text: `${name}`, color: '#ffffff', size: 'md', weight: 'bold', margin: 'xs' },
                { type: 'text', text: `รหัส นพอ. ${studentId} (${year})`, color: '#94a3b8', size: 'xs' }
              ]
            },
            body: {
              type: 'box',
              layout: 'vertical',
              paddingAll: '16px',
              contents: [
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    { type: 'text', text: 'สะสมปี ๒๕๖๙:', size: 'sm', color: '#64748b' },
                    { type: 'text', text: `${total} ชม.`, size: 'sm', weight: 'bold', color: '#0b2f64', align: 'end' }
                  ]
                },
                {
                  type: 'box',
                  layout: 'horizontal',
                  margin: 'sm',
                  contents: [
                    { type: 'text', text: 'ยอดยกมาจากปี 68:', size: 'sm', color: '#64748b' },
                    { type: 'text', text: `${carry} ชม.`, size: 'sm', color: '#64748b', align: 'end' }
                  ]
                },
                {
                  type: 'box',
                  layout: 'horizontal',
                  margin: 'sm',
                  contents: [
                    { type: 'text', text: 'รวมสะสมทั้งหมด:', size: 'sm', weight: 'bold', color: '#0b2f64' },
                    { type: 'text', text: `${cum} ชม.`, size: 'md', weight: 'bold', color: '#c9a227', align: 'end' }
                  ]
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  margin: 'md',
                  paddingAll: '8px',
                  backgroundColor: total >= 50 ? '#dcfce7' : '#fef3c7',
                  cornerRadius: '8px',
                  contents: [
                    { type: 'text', text: statusBadge, size: 'xs', weight: 'bold', color: total >= 50 ? '#15803d' : '#b45309', align: 'center' }
                  ]
                },
                {
                  type: 'box',
                  layout: 'horizontal',
                  margin: 'md',
                  contents: [
                    { type: 'text', text: '🔗 บันทึกผูก LINE ID:', size: 'xs', color: '#16a34a' },
                    { type: 'text', text: 'บันทึกเรียบร้อย ✅', size: 'xs', weight: 'bold', color: '#16a34a', align: 'end' }
                  ]
                }
              ]
            },
            footer: {
              type: 'box',
              layout: 'vertical',
              paddingAll: '12px',
              contents: [
                {
                  type: 'button',
                  style: 'primary',
                  color: '#0a192f',
                  action: {
                    type: 'uri',
                    label: '📱 เปิดแดชบอร์ดนักเรียน',
                    uri: `${LIFF_URL}?redirect=student-dashboard.html&sid=${studentId}`
                  }
                }
              ]
            }
          },
          quickReply: quickReply
        };
      } else {
        replyMsg = {
          type: 'text',
          text: `ℹ️ ไม่พบข้อมูล นพอ. รหัส "${studentId}" ในระบบ กรุณาตรวจสอบรหัส 7 หลักอีกครั้งค่ะ`,
          quickReply: quickReply
        };
      }

      if (replyToken && channelToken) {
        await sendLineReply(replyToken, [replyMsg], channelToken);
      }
      return;
    }

    // 2.2 Navigation keywords
    let replyText = '';
    if (lower.includes('ส่งความดี') || lower.includes('บันทึก') || lower.includes('ขออนุมัติ')) {
      replyText = '📝 ต้องการส่งบันทึกความดีใช่ไหมคะ?\nท่านสามารถกดเปิดแบบฟอร์มบันทึกความดีผ่านปุ่มด้านล่างได้ทันทีค่ะ:';
    } else if (lower.includes('ชั่วโมง') || lower.includes('คะแนน') || lower.includes('เช็ค') || lower.includes('สถานะ')) {
      replyText = '📊 ต้องการดูชั่วโมงสะสมและสถานะปี 2569 ใช่ไหมคะ?\nพิมพ์ "รหัสนักเรียน 7 หลัก" ส่งมาที่นี่ หรือกดเปิดแดชบอร์ดด้านล่างได้เลยค่ะ:';
    } else if (lower.includes('อันดับ') || lower.includes('ranking') || lower.includes('ทำเนียบ')) {
      replyText = '🏆 ดูทำเนียบความดีจิตอาสา (Ranking Leaderboard ปี 2569) ได้ที่ลิงก์นี้ค่ะ:\n' + `${APP_URL}/ranking`;
    } else if (lower.includes('การ์ด') || lower.includes('บัตร') || lower.includes('chibi')) {
      replyText = '🗂️ เข้าชมคลังการ์ด นพอ. ทุกรุ่น (ปี 1-4) ได้ที่ลิงก์นี้ค่ะ:\n' + `${APP_URL}/view_cards`;
    } else if (lower.includes('อาจารย์') || lower.includes('ผู้ตรวจ') || lower.includes('แอดมิน')) {
      replyText = '👨‍🏫 แดชบอร์ดอาจารย์ผู้ตรวจประเมินและลงนามสด เข้าได้ที่ลิงก์นี้ค่ะ:\n' + `${APP_URL}/teacher-dashboard`;
    } else {
      replyText = 'สวัสดีค่ะ 🙏 ระบบบันทึกความดีจิตอาสา วพอ. ๒๕๖๙ พร้อมให้บริการค่ะ\n\n• พิมพ์ "รหัส นพอ. 7 หลัก" เพื่อเช็คชั่วโมงสะสมทันที\n• หรือเลือกเมนูด้านล่างเพื่อทำรายการได้เลยค่ะ:';
    }

    if (replyToken && channelToken) {
      await sendLineReply(replyToken, [{
        type: 'text',
        text: replyText,
        quickReply: quickReply
      }], channelToken);
    }
  }
}

/**
 * Send Reply Message via LINE Messaging API
 */
async function sendLineReply(replyToken, messages, channelToken) {
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${channelToken}`
      },
      body: JSON.stringify({
        replyToken: replyToken,
        messages: messages
      })
    });
    return res.ok;
  } catch (err) {
    console.error('LINE reply error:', err);
    return false;
  }
}

/**
 * Verify Webhook Signature HMAC-SHA256
 */
async function verifyLineSignature(bodyText, signature, channelSecret) {
  if (!signature || !channelSecret) return true;
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(channelSecret);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(bodyText));
    const computedSignature = btoa(String.fromCharCode(...new Uint8Array(mac)));
    return computedSignature === signature;
  } catch (err) {
    console.error('Signature verification error:', err);
    return false;
  }
}

/**
 * Lookup student summary by 7-digit ID
 */
async function lookupStudentInfo(studentId, env) {
  const sid = String(studentId).trim();
  const gasUrl = (env && env.GAS_URL) ? env.GAS_URL : 'https://script.google.com/macros/s/AKfycbwaG05E5dNew4dsf0vD8LBLuWdbThXIkMih1UI8Ba9rnRBCK4xmnlArzZdwtmqV9vOdcw/exec';

  try {
    const res = await fetch(`${gasUrl}?action=getStudent&studentId=${sid}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.student_id) return data;
    }
  } catch (_) {}

  return null;
}

/**
 * Get or automatically issue a valid LINE Channel Access Token
 */
async function getEffectiveLineToken(env) {
  if (env && env.LINE_CHANNEL_ACCESS_TOKEN) {
    return env.LINE_CHANNEL_ACCESS_TOKEN;
  }
  const channelId = (env && env.LINE_CHANNEL_ID) ? env.LINE_CHANNEL_ID : '1654464250';
  const channelSecret = (env && env.LINE_CHANNEL_SECRET) ? env.LINE_CHANNEL_SECRET : '7cf48cc5e433e3b11182e7ec016e44a6';

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
    console.warn('Auto fetch LINE token error in webhook:', err);
  }
  return '';
}

/**
 * Bind student ID to LINE User ID and save into Google Sheets
 */
async function bindStudentLineAccount(studentId, lineUserId, lineDisplayName, env) {
  const sid = String(studentId || '').trim();
  const lid = String(lineUserId || '').trim();
  if (!sid || !lid) return false;

  const gasUrl = (env && env.GAS_URL) ? env.GAS_URL : 'https://script.google.com/macros/s/AKfycbwaG05E5dNew4dsf0vD8LBLuWdbThXIkMih1UI8Ba9rnRBCK4xmnlArzZdwtmqV9vOdcw/exec';

  try {
    const res = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'bind_line',
        studentId: sid,
        lineUserId: lid,
        lineDisplayName: lineDisplayName || ''
      })
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to bind student LINE account in GAS:', err);
    return false;
  }
}
