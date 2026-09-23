/**
 * Cloudflare Worker Telegram Webhook Proxy for RTAFNC Good Deeds 2569
 * วิทยาลัยพยาบาลทหารอากาศ กรมแพทย์ทหารอากาศ
 * 
 * Flow:
 * Telegram -> Cloudflare Worker (Returns HTTP 200 OK) -> Google Apps Script (Follows 302)
 * แก้ปัญหา Telegram Webhook ได้รับ HTTP 302 Redirect จาก Google Apps Script
 */

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwV0b31hWMSs2oNOff4o-O_PNoEQ1XlTM77f4sei9JLh1rza1SfFPTOlTaxiIKCIxLT_Q/exec';

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({
        status: 'active',
        service: 'RTAFNC Good Deeds Telegram Webhook Proxy 🟢',
        time: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    try {
      const body = await request.text();
      const targetUrl = (env && env.GAS_URL) ? env.GAS_URL : GAS_URL;

      // ส่งต่อไปยัง Google Apps Script โดย follow 302 redirect อัตโนมัติ
      const upstream = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        redirect: 'follow'
      });

      const responseText = await upstream.text();

      // ส่ง HTTP 200 OK กลับไปหา Telegram ทันที เพื่อไม่ให้ Telegram ค้างหรือฟ้อง 302
      return new Response(JSON.stringify({ ok: true, forwarded: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    } catch (err) {
      // แม้เกิดข้อผิดพลาด ให้ส่ง HTTP 200 กลับไปหา Telegram เสมอเพื่อป้องกัน Webhook โดนระงับ
      return new Response(JSON.stringify({ ok: false, error: err.message }), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
  }
};
