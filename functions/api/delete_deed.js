/**
 * Cloudflare Pages Function - Delete Deed Edge Handler (24/7 Edge Serverless)
 * ระบบยกเลิก/ลบรายการความดีจิตอาสา วพอ. 2569 ตลอด 24 ชม.
 * รองรับการทำงานทั้งจาก student-dashboard.html, history.html และ teacher-dashboard.html
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
    service: 'RTAFNC Good Deeds Delete Edge API',
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

  // Incident containment: never bypass the production write gate.
  // Authorization is a separate release blocker even when this gate is enabled.
  if (!env || env.PRODUCTION_WRITE_ENABLED !== 'true') {
    return new Response(JSON.stringify({ status: 'error', code: 'PRODUCTION_WRITES_DISABLED' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

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
  const role = String(body.role || 'student').trim();
  const reason = String(body.reason || 'ลบ/ยกเลิกรายการ').trim();
  const deletedBy = String(body.deletedBy || body.userName || (role === 'teacher' ? 'อาจารย์ผู้ตรวจ' : 'นักเรียนเจ้าของรายการ')).trim();

  if (!studentId || !deedId) {
    return new Response(JSON.stringify({ status: 'error', message: 'Missing studentId or deedId' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  // Forward deletion to Google Apps Script (Google Sheets Deeds_2569 & Main_2569)
  let gasResult = null;
  if (gasUrl) {
    try {
      const resp = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_deed',
          deedId: deedId,
          studentId: studentId,
          role: role,
          deletedBy: deletedBy,
          reason: reason
        })
      });
      gasResult = await resp.json();
    } catch (gasErr) {
      console.error('Failed to forward delete to GAS:', gasErr);
      gasResult = { status: 'error', message: String(gasErr) };
    }
  }

  // Optionally send audit notification to Telegram Group
  if (botToken && defaultChatId) {
    try {
      const isTeacher = role === 'teacher' || role === 'admin';
      const actorLabel = isTeacher ? 'อาจารย์ผู้ตรวจ' : 'นพอ. เจ้าของรายการ';
      const msgText = [
        `AGEn Ai Bot ☁️ (Deed Cancellation Audit)`,
        `🗑️ <b>แจ้งเตือนการยกเลิก/ลบรายการความดี</b>`,
        `━━━━━━━━━━━━━━━━━━━━━━━`,
        `👤 <b>ผู้ดำเนินการ:</b> ${deletedBy} (${actorLabel})`,
        `🎫 <b>รหัส นพอ.:</b> <code>${studentId}</code>`,
        `🆔 <b>รหัสรายการ:</b> <code>${deedId}</code>`,
        `📝 <b>เหตุผล:</b> ${reason}`,
        `ℹ️ <i>รายการถูกทำเครื่องหมายยกเลิกและปรับลดยอดชั่วโมงสะสมในฐานข้อมูลแล้ว</i>`
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
      console.warn('Telegram audit notice in delete_deed:', tgErr);
    }
  }

  return new Response(JSON.stringify({
    status: 'success',
    deedId: deedId,
    studentId: studentId,
    action: 'deleted',
    message: 'Deed deleted successfully',
    gasResult: gasResult
  }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}
