/**
 * Cloudflare Pages Function - Telegram Deed Notification Dispatcher (24/7 Edge Serverless)
 * ระบบกระจายแจ้งเตือนขออนุมัติความดี วพอ. 2569 ไปยัง Telegram Group อัตโนมัติ ตลอด 24 ชม.
 * รันบน Cloudflare Edge Network ทำงานได้ทันทีเมื่อนักเรียนส่งบันทึกความดีออนไลน์
 */

import { yearLabel, normalizeClassYear } from './_year.js';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400'
};

const CATEGORY_NAMES = {
  1: 'บริจาคโลหิต/เกล็ดเลือด/พลาสมา',
  2: 'โครงการภายนอก (คำสั่ง วพอ.)',
  3: 'ช่วยเหลืองานภายใน วพอ.',
  4: 'เข้าอบรมที่ วพอ. จัดให้',
  5: 'ช่วยงานหน่วยงาน/ชุมชน/มูลนิธิ',
  6: 'ทำนุบำรุงศาสนสถาน',
  7: 'งานฟรีทั่วไป (ช่วยงานผู้ปกครอง)',
  8: 'กิจกรรมจงรักภักดีต่อสถาบัน',
  9: 'ชม. ที่สมควรได้รับ (บทบาทพิเศษ)'
};

const CATEGORY_EMOJIS = {
  1: '🩸',
  2: '🏛️',
  3: '🏥',
  4: '📚',
  5: '🤝',
  6: '🛕',
  7: '🧹',
  8: '👑',
  9: '⭐'
};

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

export async function onRequestGet(context) {
  const { env } = context;
  const botToken = (env && env.TELEGRAM_BOT_TOKEN) ? env.TELEGRAM_BOT_TOKEN : '';
  const chatId = (env && env.TELEGRAM_CHAT_ID) ? env.TELEGRAM_CHAT_ID : '';

  return new Response(JSON.stringify({
    status: 'online',
    service: 'RTAFNC Good Deeds Telegram Notification Dispatcher',
    environment: 'Cloudflare Edge 24/7 Serverless',
    telegramConfigured: !!botToken,
    chatId: chatId,
    timestamp: new Date().toISOString()
  }, null, 2), {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const botToken = (env && env.TELEGRAM_BOT_TOKEN) ? env.TELEGRAM_BOT_TOKEN : '';
  const chatId = (env && env.TELEGRAM_CHAT_ID) ? env.TELEGRAM_CHAT_ID : '';

  if (!botToken) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'TELEGRAM_BOT_TOKEN not configured in Cloudflare environment'
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON payload' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  const deed = body.deed || body;
  const student = body.student || deed.student || {};

  const deedId = String(deed.id || deed.deedId || ('deed_' + Date.now())).trim();
  const studentId = String(deed.studentId || deed.student_id || student.student_id || '').trim();

  let studentName = '';
  if (student.full_name && !student.full_name.includes('รหัส')) {
    studentName = student.full_name;
  } else if (student.first_name && !student.first_name.startsWith('รหัส')) {
    studentName = `${student.rank || 'นพอ.'} ${student.first_name} ${student.last_name || ''}`.trim();
  } else if (deed.student_name && !deed.student_name.includes('รหัส')) {
    studentName = deed.student_name;
  } else if (deed.studentName && !deed.studentName.includes('รหัส')) {
    studentName = deed.studentName;
  } else {
    studentName = studentId ? `นพอ. (${studentId})` : 'นพอ. ผู้ขออนุมัติ';
  }

  const classYear = normalizeClassYear(student.class_year || deed.class_year, studentId) || '69';
  const yearName = yearLabel(classYear, studentId);

  const catId = parseInt(deed.categoryId || deed.category_id || 1, 10);
  const catName = CATEGORY_NAMES[catId] || 'กิจกรรมความดี';
  const catEmoji = CATEGORY_EMOJIS[catId] || '📌';

  const hours = deed.hours || 0;
  const activityDate = deed.activityDate || deed.event_date || new Date().toISOString().split('T')[0];
  const description = deed.description || deed.title || '-';
  const location = deed.location || deed.note || 'วิทยาลัยพยาบาลทหารอากาศ';
  const approver = deed.approver || deed.approved_by || deed.signer || 'ร.อ.อนุชิต ทำจะดี (Bird)';

  const baseUrl = (env && env.APP_URL) ? env.APP_URL : 'https://rtafnc-gooddeeds.pages.dev';
  const qParams = new URLSearchParams({
    id: deedId,
    studentId: studentId,
    name: studentName,
    year: yearName,
    cat: String(catId),
    catName: catName,
    hours: String(hours),
    date: activityDate,
    desc: description,
    loc: location,
    appr: approver,
    status: 'pending'
  });

  const approveUrl = `${baseUrl}/approve_sign?${qParams.toString()}`;
  const slipUrl = `${baseUrl}/deed_slip?${qParams.toString()}`;

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '✅ อนุมัติด่วน', callback_data: `approve_${deedId}_${studentId}` },
        { text: '❌ ปฏิเสธ', callback_data: `reject_${deedId}_${studentId}` }
      ],
      [
        { text: '✍️ ตรวจสอบ & ลงนาม ↗️', url: approveUrl },
        { text: '📄 พิมพ์สลิป A4 (PDF) ↗️', url: slipUrl }
      ]
    ]
  };

  const htmlMsg = [
    `🔔 <b>แจ้งเตือนการขออนุมัติความดี (วพอ. ๒๕๖๙)</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━━`,
    `👤 <b>ผู้ขอ:</b> ${studentName}`,
    `🎫 <b>รหัส นพอ.:</b> <code>${studentId}</code> (${yearName})`,
    `📂 <b>หมวดที่ ${catId}:</b> ${catEmoji} ${catName}`,
    `⏱ <b>จำนวน:</b> <b>${hours} ชั่วโมง</b>`,
    `📅 <b>วันที่:</b> ${activityDate}`,
    `📍 <b>สถานที่:</b> ${location}`,
    `📝 <b>รายละเอียด:</b> ${description}`,
    `👨‍🏫 <b>อาจารย์ผู้ตรวจ:</b> ${approver}`,
    `━━━━━━━━━━━━━━━━━━━━━━━`,
    `⏳ <i>กรุณาตรวจสอบและกดอนุมัติหรือลงนามด้านล่าง:</i>`
  ].join('\n');

  // ตรวจสอบรูปภาพสลิป หรือหลักฐาน (Base64 หรือ Web URL)
  const slipImage = body.slipImage || deed.slipImage || deed.imageUrl || (deed.imageUrls && deed.imageUrls[0]) || '';
  let photoSent = false;
  let tgResult = null;

  if (slipImage && typeof slipImage === 'string') {
    try {
      if (slipImage.startsWith('data:image')) {
        const commaIdx = slipImage.indexOf(',');
        const mime = slipImage.substring(5, commaIdx).split(';')[0] || 'image/png';
        const base64Data = slipImage.substring(commaIdx + 1);

        const binaryStr = atob(base64Data);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const ext = mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : 'png';
        const blob = new Blob([bytes], { type: mime });

        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('photo', blob, `deed_slip_${deedId}.${ext}`);
        formData.append('caption', htmlMsg);
        formData.append('parse_mode', 'HTML');
        formData.append('reply_markup', JSON.stringify(replyMarkup));

        const photoResp = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
          method: 'POST',
          body: formData
        });

        const pData = await photoResp.json();
        if (pData && pData.ok) {
          photoSent = true;
          tgResult = pData.result;
        }
      } else if (slipImage.startsWith('http://') || slipImage.startsWith('https://')) {
        const photoResp = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            photo: slipImage,
            caption: htmlMsg,
            parse_mode: 'HTML',
            reply_markup: replyMarkup
          })
        });
        const pData = await photoResp.json();
        if (pData && pData.ok) {
          photoSent = true;
          tgResult = pData.result;
        }
      }
    } catch (imgErr) {
      console.warn('Failed to send photo to Telegram:', imgErr);
    }
  }

  // ส่งเป็น Text Message หากไม่มีรูปหรือส่งรูปไม่สำเร็จ
  if (!photoSent) {
    try {
      const msgResp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: htmlMsg,
          parse_mode: 'HTML',
          reply_markup: replyMarkup
        })
      });
      const mData = await msgResp.json();
      if (mData && mData.ok) {
        tgResult = mData.result;
      } else {
        console.error('Telegram sendMessage error:', mData);
        return new Response(JSON.stringify({
          ok: false,
          error: 'Telegram API returned error',
          details: mData
        }), {
          status: 502,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
      }
    } catch (msgErr) {
      console.error('Failed to send message to Telegram:', msgErr);
      return new Response(JSON.stringify({
        ok: false,
        error: 'Network error calling Telegram API',
        message: msgErr.message
      }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    status: 'sent',
    deedId: deedId,
    studentId: studentId,
    telegramMessageId: tgResult ? tgResult.message_id : null,
    deliveredAt: new Date().toISOString()
  }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}
