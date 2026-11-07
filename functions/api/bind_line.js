/**
 * Cloudflare Pages Function - Bind LINE Account to Student ID (24/7 Edge Serverless)
 * บันทึกและผูกบัญชี LINE (LINE User ID) เข้ากับรหัสนักเรียน (Student ID 7 หลัก)
 * เพื่อใช้ในการแจ้งเตือนผลการตรวจอนุมัติ และบันทึกประวัติการเชื่อมต่อใน Google Sheets
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
  return new Response(JSON.stringify({
    status: 'online',
    service: 'RTAFNC Good Deeds Line Binding Gateway',
    environment: 'Cloudflare Edge 24/7 Serverless',
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
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  const studentId = String(body.studentId || body.student_id || '').trim();
  const lineUserId = String(body.lineUserId || body.line_user_id || '').trim();
  const lineDisplayName = String(body.lineDisplayName || body.line_display_name || '').trim();
  const linePictureUrl = String(body.linePictureUrl || body.line_picture_url || '').trim();

  // Validate 7-digit Student ID
  if (!/^\d{7}$/.test(studentId)) {
    return new Response(JSON.stringify({ error: 'Invalid student ID format (must be 7 digits)' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  if (!lineUserId) {
    return new Response(JSON.stringify({ error: 'Missing lineUserId' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  // Forward binding to Google Apps Script
  const gasUrl = (env && env.GAS_URL) ? env.GAS_URL : 'https://script.google.com/macros/s/AKfycbwaG05E5dNew4dsf0vD8LBLuWdbThXIkMih1UI8Ba9rnRBCK4xmnlArzZdwtmqV9vOdcw/exec';

  let gasSuccess = false;
  try {
    const gasResp = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'bind_line',
        studentId: studentId,
        lineUserId: lineUserId,
        lineDisplayName: lineDisplayName,
        linePictureUrl: linePictureUrl
      })
    });
    gasSuccess = gasResp.ok;
  } catch (gasErr) {
    console.warn('Failed to sync LINE binding to GAS:', gasErr);
  }

  return new Response(JSON.stringify({
    status: 'success',
    studentId: studentId,
    lineUserId: lineUserId,
    lineDisplayName: lineDisplayName,
    gasSynced: gasSuccess,
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}
