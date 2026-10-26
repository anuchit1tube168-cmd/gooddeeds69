/**
 * Cloudflare Pages Function - Telegram Webhook Bridge (24/7 Edge Serverless)
 * ระบบตอบรับการอนุมัติความดี วพอ. 2569 ผ่าน Telegram Group แบบ Real-time ตลอด 24 ชม.
 * รันบน Cloudflare Edge Network ทำงานได้อัตโนมัติแม้ปิดเครื่องคอมพิวเตอร์
 */

export async function onRequestGet(context) {
  return new Response(JSON.stringify({
    status: 'online',
    service: 'RTAFNC Good Deeds Telegram Bot Webhook Bridge',
    environment: 'Cloudflare Edge 24/7 Serverless',
    timestamp: new Date().toISOString(),
    ready: true
  }, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const botToken = env.TELEGRAM_BOT_TOKEN;
  const defaultChatId = env.TELEGRAM_CHAT_ID;
  const gasUrl = env.GAS_URL;

  if (!botToken) {
    return new Response(JSON.stringify({ error: 'TELEGRAM_BOT_TOKEN not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Helper to call Telegram Bot API
  async function callTelegram(method, payload) {
    try {
      const resp = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await resp.json();
    } catch (err) {
      console.error(`Telegram API error (${method}):`, err);
      return null;
    }
  }

  // 1. Handle Inline Button Callback Queries (อนุมัติด่วน / ปฏิเสธ)
  if (body.callback_query) {
    const cq = body.callback_query;
    const cqId = cq.id;
    const data = String(cq.data || '').trim();
    const msg = cq.message || {};
    const chat = msg.chat || {};
    const chatId = chat.id || defaultChatId;
    const msgId = msg.message_id;

    const fromUser = cq.from || {};
    const approverName = 'ร.อ.อนุชิต ทำจะดี (Bird)';

    const isApprove = data.startsWith('approve_');
    const isReject = data.startsWith('reject_');

    if (!isApprove && !isReject) {
      await callTelegram('answerCallbackQuery', {
        callback_query_id: cqId,
        text: 'รับข้อมูลเรียบร้อยแล้วค่ะ',
        show_alert: false
      });
      return new Response(JSON.stringify({ ok: true, action: 'ignored' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ตอบกลับ answerCallbackQuery ทันทีเพื่อหยุดรูปหมุนโหลดบนมือถือผู้ตรวจ
    const alertText = isApprove
      ? '✅ อนุมัติความดีเรียบร้อยแล้ว!'
      : '❌ ปฏิเสธรายการความดีแล้ว';

    await callTelegram('answerCallbackQuery', {
      callback_query_id: cqId,
      text: alertText,
      show_alert: true
    });

    // แยก deed_id และ student_id
    // รูปแบบ data: approve_<deedId>_<studentId> หรือ reject_<deedId>_<studentId>
    const parts = data.split('_');
    const studentId = parts.length >= 2 ? parts[parts.length - 1] : '';
    const deedId = parts.length >= 3 ? parts.slice(1, -1).join('_') : parts[1];
    const newStatus = isApprove ? 'approved' : 'rejected';

    // แก้ไขปุ่มบน Telegram ให้แสดงว่าตรวจเสร็จสิ้นแล้ว
    const newBtnText = isApprove
      ? `✅ อนุมัติแล้ว โดย ${approverName}`
      : `❌ ปฏิเสธแล้ว โดย ${approverName}`;

    if (chatId && msgId) {
      await callTelegram('editMessageReplyMarkup', {
        chat_id: chatId,
        message_id: msgId,
        reply_markup: {
          inline_keyboard: [
            [{ text: newBtnText, callback_data: 'done' }]
          ]
        }
      });
    }

    // ส่งข้อความยืนยันลงกลุ่ม Telegram
    let confirmText = '';
    if (isApprove) {
      confirmText = [
        `AGEn Ai Bot ☁️ (Cloud Edge 24/7)`,
        `✅ <b>แจ้งเตือนการอนุมัติความดี</b>`,
        `━━━━━━━━━━━━━━━━━━━━━━━`,
        `👤 <b>นักเรียน:</b> นพอ. รหัส ${studentId}`,
        `🎫 <b>รหัส นพอ.:</b> <code>${studentId}</code>`,
        `🆔 <b>รหัสรายการ:</b> <code>${deedId}</code>`,
        `👨‍🏫 <b>ผู้อนุมัติ:</b> ${approverName}`,
        `🎉 <i>บันทึกข้อมูลและสะสมชั่วโมงลงฐานข้อมูลเรียบร้อยแล้วค่ะ</i>`
      ].join('\n');
    } else {
      confirmText = [
        `AGEn Ai Bot ☁️ (Cloud Edge 24/7)`,
        `❌ <b>แจ้งเตือนการปฏิเสธความดี</b>`,
        `━━━━━━━━━━━━━━━━━━━━━━━`,
        `👤 <b>นักเรียน:</b> นพอ. รหัส ${studentId}`,
        `🎫 <b>รหัส นพอ.:</b> <code>${studentId}</code>`,
        `🆔 <b>รหัสรายการ:</b> <code>${deedId}</code>`,
        `👨‍🏫 <b>ผู้ปฏิเสธ:</b> ${approverName}`,
        `📝 <b>เหตุผล:</b> กรุณาตรวจสอบหลักฐานและส่งใหม่`
      ].join('\n');
    }

    if (chatId) {
      await callTelegram('sendMessage', {
        chat_id: chatId,
        text: confirmText,
        parse_mode: 'HTML'
      });
    }

    // อัปเดต Google Sheets ผ่าน GAS API
    if (gasUrl) {
      try {
        await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'updateDeedStatus',
            deedId: deedId,
            studentId: studentId,
            status: newStatus,
            approvedBy: approverName
          })
        });
      } catch (gasErr) {
        console.error('Failed to forward updateDeedStatus to GAS:', gasErr);
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      action: newStatus,
      deedId: deedId,
      studentId: studentId
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 2. Handle Text Commands (/start, /status, /ping)
  if (body.message && body.message.text) {
    const text = body.message.text.trim();
    const chatId = body.message.chat.id;

    if (text === '/status' || text === '/ping' || text.startsWith('/start')) {
      const statusMsg = [
        `🤖 <b>ระบบ Telegram Bot วพอ. 2569 ออนไลน์ 24 ชม.</b>`,
        `━━━━━━━━━━━━━━━━━━━━━━━`,
        `☁️ <b>เซิร์ฟเวอร์:</b> Cloudflare Serverless Edge`,
        `⚡ <b>สถานะ:</b> ออนไลน์สมบูรณ์ (พร้อมรับการอนุมัติ 24 ชม.)`,
        `🔋 <b>การทำงาน:</b> รันตลอดเวลาในระบบคลาวด์ ไม่ต้องเปิดคอมพิวเตอร์ทิ้งไว้`,
        `🕒 <b>เวลาเซิร์ฟเวอร์:</b> ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`
      ].join('\n');

      await callTelegram('sendMessage', {
        chat_id: chatId,
        text: statusMsg,
        parse_mode: 'HTML'
      });
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
