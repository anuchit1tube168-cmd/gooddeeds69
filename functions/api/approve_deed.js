/**
 * Cloudflare Pages Function - Approve Deed Edge Handler (24/7 Edge Serverless)
 * ระบบอนุมัติความดี วพอ. 2569 ผ่านเว็บ รองรับทั้งมือถือและคอมพิวเตอร์ ตลอด 24 ชม.
 * รับคำขอจากทั้ง teacher-dashboard.html และ approve_sign.html
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-GoodDeeds-Role, X-GoodDeeds-Student-Id, X-GoodDeeds-Username',
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
  const gasUrl = (env && env.GAS_URL) ? env.GAS_URL : 'https://script.google.com/macros/s/AKfycbwaG05E5dNew4dsf0vD8LBLuWdbThXIkMih1UI8Ba9rnRBCK4xmnlArzZdwtmqV9vOdcw/exec';

  return new Response(JSON.stringify({
    status: 'online',
    service: 'RTAFNC Good Deeds Approve Edge API',
    environment: 'Cloudflare Edge 24/7 Serverless',
    hasGasUrl: !!gasUrl,
    timestamp: new Date().toISOString()
  }, null, 2), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const gasUrl = (env && env.GAS_URL) ? env.GAS_URL : 'https://script.google.com/macros/s/AKfycbwaG05E5dNew4dsf0vD8LBLuWdbThXIkMih1UI8Ba9rnRBCK4xmnlArzZdwtmqV9vOdcw/exec';
  const botToken = (env && env.TELEGRAM_BOT_TOKEN) ? env.TELEGRAM_BOT_TOKEN : '';
  const defaultChatId = (env && env.TELEGRAM_CHAT_ID) ? env.TELEGRAM_CHAT_ID : '';

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return new Response(JSON.stringify({ status: 'error', message: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  const studentId = String(body.studentId || body.student_id || '').trim();
  const deedId = String(body.deedId || body.id || '').trim();
  const status = String(body.status || 'approved').trim();
  const teacherName = String(body.teacherName || body.approvedBy || 'ร.อ.อนุชิต ทำจะดี (Bird)').trim();
  const rejectReason = String(body.rejectReason || '').trim();
  const studentName = String(body.studentName || body.student_name || body.name || '').trim();

  if (!studentId || !deedId) {
    return new Response(JSON.stringify({ status: 'error', message: 'Missing studentId or deedId' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  // 1. Parallel execution: Forward to GAS and notify Telegram simultaneously
  const gasPromise = (async () => {
    if (!gasUrl) return null;
    try {
      const resp = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateDeedStatus',
          deedId: deedId,
          studentId: studentId,
          status: status,
          approvedBy: teacherName,
          rejectReason: rejectReason,
          signatureKey: body.signatureKey || '',
          signature: body.signature || '',
          deedData: body.deedData || body.deed || null
        })
      });
      return await resp.json();
    } catch (gasErr) {
      console.error('Failed to forward approval to GAS:', gasErr);
      return { status: 'error', message: String(gasErr) };
    }
  })();

  const tgPromise = (async () => {
    if (!botToken || !defaultChatId) return false;
    try {
      const isApprove = status === 'approved';
      const actionText = isApprove ? 'อนุมัติ' : 'ปฏิเสธ';
      const emoji = isApprove ? '✅' : '❌';
      const sDisplay = studentName ? `${studentName} (รหัส ${studentId})` : `นพอ. รหัส ${studentId}`;
      const msgText = [
        `AGEn Ai Bot ☁️ (Mobile Web Approval)`,
        `${emoji} <b>แจ้งเตือนการ${actionText}ความดีผ่านมือถือ</b>`,
        `━━━━━━━━━━━━━━━━━━━━━━━`,
        `👤 <b>นักเรียน:</b> ${sDisplay}`,
        `🎫 <b>รหัส นพอ.:</b> <code>${studentId}</code>`,
        `🆔 <b>รหัสรายการ:</b> <code>${deedId}</code>`,
        `👨‍🏫 <b>ผู้ตรวจ:</b> ${teacherName}`,
        isApprove ? `🎉 <i>ตรวจอนุมัติและบันทึกคะแนนเรียบร้อยแล้วค่ะ</i>` : `📝 <b>เหตุผล:</b> ${rejectReason || 'หลักฐานไม่ชัดเจน'}`
      ].join('\n');

      const tgResp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: defaultChatId,
          text: msgText,
          parse_mode: 'HTML'
        })
      });
      return tgResp.ok;
    } catch (tgErr) {
      console.error('Telegram notification error in approve_deed:', tgErr);
      return false;
    }
  })();

  const lineUserId = body.lineUserId || (body.deedData && (body.deedData.lineUserId || body.deedData.line_user_id)) || '';

  const linePromise = (async () => {
    if (!lineUserId) return false;
    const lineToken = await getEffectiveLineToken(env);
    if (!lineToken) return false;
    try {
      const isApprove = status === 'approved';
      const hoursText = (body.deedData && body.deedData.hours) ? `${body.deedData.hours} ชั่วโมง` : '';
      const catText = (body.deedData && (body.deedData.categoryName || body.deedData.category_name)) ? (body.deedData.categoryName || body.deedData.category_name) : 'กิจกรรมจิตอาสา';
      const text = isApprove
        ? `🎉 ยินดีด้วยค่ะ นพอ.!\nรายการความดีของคุณได้รับการอนุมัติเรียบร้อยแล้ว\n━━━━━━━━━━━━━━━\n📂 หมวด: ${catText}\n⏱ จำนวน: ${hoursText}\n👨‍🏫 ผู้อนุมัติ: ${teacherName}\n✨ ชั่วโมงถูกสะสมเข้าระบบปี ๒๕๖๙ เรียบร้อยแล้วค่ะ`
        : `⚠️ แจ้งเตือนสถานะความดี นพอ.\nรายการความดีของคุณไม่ผ่านการอนุมัติ\n━━━━━━━━━━━━━━━\n📂 หมวด: ${catText}\n👨‍🏫 ผู้ตรวจ: ${teacherName}\n📝 เหตุผล: ${rejectReason || 'หลักฐานไม่ชัดเจน'}\nกรุณาตรวจสอบและส่งใหม่นะคะ`;

      const resp = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lineToken}`
        },
        body: JSON.stringify({
          to: lineUserId,
          messages: [{ type: 'text', text }]
        })
      });
      return resp.ok;
    } catch (lineErr) {
      console.warn('LINE push notice:', lineErr);
      return false;
    }
  })();

  const [gasResult, telegramSent, lineSent] = await Promise.all([gasPromise, tgPromise, linePromise]);

  return new Response(JSON.stringify({
    status: 'success',
    deedId: deedId,
    studentId: studentId,
    newStatus: status,
    approver: teacherName,
    telegramSent: telegramSent,
    lineSent: lineSent,
    gasResult: gasResult
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
    console.warn('Auto fetch LINE token error in approve_deed:', err);
  }
  return '';
}
