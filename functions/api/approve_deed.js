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
  const botToken = env ? env.TELEGRAM_BOT_TOKEN : null;
  const defaultChatId = (env && env.TELEGRAM_CHAT_ID) ? env.TELEGRAM_CHAT_ID : '-4839151586';

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

  if (!studentId || !deedId) {
    return new Response(JSON.stringify({ status: 'error', message: 'Missing studentId or deedId' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  // Forward to Google Apps Script (Google Sheets Deeds_2569 & Main_2569)
  let gasResult = null;
  if (gasUrl) {
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
          signature: body.signature || ''
        })
      });
      gasResult = await resp.json();
    } catch (gasErr) {
      console.error('Failed to forward approval to GAS:', gasErr);
      gasResult = { status: 'error', message: String(gasErr) };
    }
  }

  // Optionally send confirmation to Telegram Group if bot configured
  if (botToken && defaultChatId) {
    try {
      const isApprove = status === 'approved';
      const actionText = isApprove ? 'อนุมัติ' : 'ปฏิเสธ';
      const emoji = isApprove ? '✅' : '❌';
      const msgText = [
        `AGEn Ai Bot ☁️ (Mobile Web Approval)`,
        `${emoji} <b>แจ้งเตือนการ${actionText}ความดีผ่านมือถือ</b>`,
        `━━━━━━━━━━━━━━━━━━━━━━━`,
        `👤 <b>นักเรียน:</b> นพอ. รหัส ${studentId}`,
        `🎫 <b>รหัส นพอ.:</b> <code>${studentId}</code>`,
        `🆔 <b>รหัสรายการ:</b> <code>${deedId}</code>`,
        `👨‍🏫 <b>ผู้ตรวจ:</b> ${teacherName}`,
        isApprove ? `🎉 <i>ตรวจอนุมัติและบันทึกคะแนนเรียบร้อยแล้วค่ะ</i>` : `📝 <b>เหตุผล:</b> ${rejectReason || 'หลักฐานไม่ชัดเจน'}`
      ].join('\n');

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: defaultChatId,
          text: msgText,
          parse_mode: 'HTML'
        })
      });
    } catch (tgErr) {
      console.error('Telegram notification error in approve_deed:', tgErr);
    }
  }

  return new Response(JSON.stringify({
    status: 'success',
    deedId: deedId,
    studentId: studentId,
    newStatus: status,
    approver: teacherName,
    gasResult: gasResult
  }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}
