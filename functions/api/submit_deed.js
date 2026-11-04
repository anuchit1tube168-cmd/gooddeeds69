/**
 * Cloudflare Pages Function - Submit Deed Edge Handler (24/7 Edge Serverless)
 * ระบบบันทึกความดีจิตอาสา วพอ. 2569 ตลอด 24 ชม.
 * รองรับการทำงานจาก submit-deed.html ทั้งบนคอมพิวเตอร์ มือถือ และ LINE LIFF
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-GoodDeeds-Role, X-GoodDeeds-Student-Id, X-GoodDeeds-Username',
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
  const gasUrl = (env && env.GAS_URL) ? env.GAS_URL : 'https://script.google.com/macros/s/AKfycbwaG05E5dNew4dsf0vD8LBLuWdbThXIkMih1UI8Ba9rnRBCK4xmnlArzZdwtmqV9vOdcw/exec';
  const botToken = env ? env.TELEGRAM_BOT_TOKEN : null;

  return new Response(JSON.stringify({
    status: 'online',
    service: 'RTAFNC Good Deeds Submit Edge API',
    environment: 'Cloudflare Edge 24/7 Serverless',
    hasGasUrl: !!gasUrl,
    hasTelegramBot: !!botToken,
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

  const rawDeed = body.deed || body;
  const student = body.student || rawDeed.student || {};
  const studentId = String(rawDeed.studentId || rawDeed.student_id || student.student_id || '').trim();
  const categoryId = parseInt(rawDeed.categoryId || rawDeed.category_id || 1);
  const hours = parseFloat(rawDeed.hours || 0);
  const description = String(rawDeed.description || rawDeed.title || '').trim();
  const activityDate = String(rawDeed.activityDate || rawDeed.event_date || '').trim();
  const location = String(rawDeed.location || rawDeed.note || 'วิทยาลัยพยาบาลทหารอากาศ').trim();
  const approver = String(rawDeed.approver || rawDeed.approved_by || rawDeed.signer || 'ร.อ.อนุชิต ทำจะดี (Bird)').trim();
  const deedId = String(rawDeed.id || ('deed_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6))).trim();
  const imageUrl = rawDeed.imageUrl || (rawDeed.imageUrls && rawDeed.imageUrls[0]) || '';
  const slipImage = body.slipImage || rawDeed.slipImage || '';

  if (!studentId || !description || !activityDate || hours <= 0) {
    return new Response(JSON.stringify({
      status: 'error',
      message: 'ข้อมูลไม่ครบถ้วน กรุณากรอกรหัสนักเรียน รายละเอียด วันที่ และจำนวนชั่วโมงให้ถูกต้อง'
    }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  // Student display info
  const sRank = student.rank || rawDeed.student_rank || 'นพอ.';
  const sFn = student.first_name || rawDeed.student_first_name || '';
  const sLn = student.last_name || rawDeed.student_last_name || '';
  const sName = student.full_name || rawDeed.student_name || rawDeed.studentName || `${sRank} ${sFn} ${sLn}`.trim() || `นพอ. (${studentId})`;
  const sClassYear = student.class_year || rawDeed.class_year || rawDeed.classYear || studentId.substring(0, 2) || '69';
  const yearName = `ชั้นปีที่ ${sClassYear === '69' ? '1' : sClassYear === '68' ? '2' : sClassYear === '67' ? '3' : '4'} (รุ่น ${sClassYear})`;

  const catName = CATEGORY_NAMES[categoryId] || 'จิตอาสาทั่วไป';
  const catEmoji = CATEGORY_EMOJIS[categoryId] || '⭐';

  // 1. Forward to Google Apps Script (Google Sheets Deeds_2569)
  let gasResult = null;
  if (gasUrl) {
    try {
      // Do not send huge base64 images directly to GAS cell to avoid 50k character limit
      const safeDeedPayload = {
        id: deedId,
        studentId: studentId,
        student_id: studentId,
        studentName: sName,
        student_name: sName,
        classYear: sClassYear,
        class_year: sClassYear,
        categoryId: categoryId,
        hours: hours,
        description: description,
        activityDate: activityDate,
        location: location,
        approver: approver,
        status: 'pending',
        imageUrl: (typeof imageUrl === 'string' && imageUrl.length < 500) ? imageUrl : '',
        notify: false, // We handle notification right here on Cloudflare Edge
        silent: true
      };

      const resp = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_deed',
          deed: safeDeedPayload,
          notify: false,
          silent: true
        })
      });
      gasResult = await resp.json();
    } catch (gasErr) {
      console.error('Failed to forward submit_deed to GAS:', gasErr);
      gasResult = { status: 'error', message: String(gasErr) };
    }
  }

  // 2. Dispatch instant notification to Telegram Group via Cloudflare Edge
  let telegramSent = false;
  if (botToken && defaultChatId) {
    try {
      const qParams = new URLSearchParams({
        id: deedId,
        studentId: studentId,
        name: sName,
        year: yearName,
        cat: categoryId,
        catName: catName,
        hours: hours,
        date: activityDate,
        desc: description,
        loc: location,
        appr: approver,
        status: 'pending'
      });

      const baseUrl = 'https://rtafnc-gooddeeds.pages.dev';
      const approveUrl = `${baseUrl}/approve_sign.html?${qParams.toString()}`;
      const slipPdfUrl = `${baseUrl}/deed_slip.html?${qParams.toString()}`;

      const replyMarkup = {
        inline_keyboard: [
          [
            { text: '✅ อนุมัติด่วน', callback_data: `approve_${deedId}_${studentId}` },
            { text: '❌ ปฏิเสธ', callback_data: `reject_${deedId}_${studentId}` }
          ],
          [
            { text: '✍️ ตรวจสอบ & ลงนาม ↗️', url: approveUrl },
            { text: '📄 พิมพ์สลิป A4 (PDF) ↗️', url: slipPdfUrl }
          ]
        ]
      };

      const htmlMsg = [
        `🔔 <b>แจ้งเตือนการขออนุมัติความดี</b>`,
        `━━━━━━━━━━━━━━━━━━━━━━━`,
        `👤 <b>ผู้ขอ:</b> ${sName}`,
        `🆔 <b>รหัส:</b> <code>${studentId}</code> (${yearName})`,
        `📂 <b>หมวดหมู่:</b> ${catEmoji} ${catName}`,
        `⏱ <b>จำนวน:</b> <b>${hours} ชั่วโมง</b>`,
        `📅 <b>วันที่:</b> ${activityDate}`,
        `📝 <b>รายละเอียด:</b> ${description}`,
        `👨‍🏫 <b>อาจารย์ผู้ตรวจ:</b> ${approver}`,
        `━━━━━━━━━━━━━━━━━━━━━━━`,
        `⏳ <i>กดปุ่มด้านล่างเพื่อตรวจและอนุมัติความดี</i>`
      ].join('\n');

      // Check if we have a slip image or evidence photo to send
      const hasPhoto = slipImage && typeof slipImage === 'string' && slipImage.startsWith('data:image');
      if (hasPhoto) {
        try {
          const parts = slipImage.split(',');
          const mimeMatch = parts[0].match(/:(.*?);/);
          const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
          const binaryStr = atob(parts[1]);
          const len = binaryStr.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: mimeType });

          const formData = new FormData();
          formData.append('chat_id', defaultChatId);
          formData.append('photo', blob, `slip_${deedId}.jpg`);
          formData.append('caption', htmlMsg);
          formData.append('parse_mode', 'HTML');
          formData.append('reply_markup', JSON.stringify(replyMarkup));

          const pResp = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
            method: 'POST',
            body: formData
          });
          if (pResp.ok) {
            telegramSent = true;
          }
        } catch (photoErr) {
          console.warn('sendPhoto error, falling back to sendMessage:', photoErr);
        }
      }

      if (!telegramSent) {
        const mResp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: defaultChatId,
            text: htmlMsg,
            parse_mode: 'HTML',
            reply_markup: replyMarkup
          })
        });
        if (mResp.ok) {
          telegramSent = true;
        }
      }
    } catch (tgErr) {
      console.warn('Telegram notify error in submit_deed:', tgErr);
    }
  }

  return new Response(JSON.stringify({
    status: 'success',
    deedId: deedId,
    studentId: studentId,
    message: 'บันทึกความดีและส่งแจ้งเตือนเรียบร้อยแล้ว',
    telegramSent: telegramSent,
    gasResult: gasResult
  }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}
