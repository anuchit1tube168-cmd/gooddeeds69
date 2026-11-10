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
  const { request, env } = context;
  const url = new URL(request.url);
  const lineUserId = String(url.searchParams.get('lineUserId') || url.searchParams.get('line_user_id') || '').trim();
  const studentId = String(url.searchParams.get('studentId') || url.searchParams.get('student_id') || '').trim();
  const gasUrl = (env && env.GAS_URL) ? env.GAS_URL : 'https://script.google.com/macros/s/AKfycbwaG05E5dNew4dsf0vD8LBLuWdbThXIkMih1UI8Ba9rnRBCK4xmnlArzZdwtmqV9vOdcw/exec';

  if (!lineUserId && !studentId) {
    return new Response(JSON.stringify({
      status: 'online',
      service: 'RTAFNC Good Deeds Line Binding Gateway',
      environment: 'Cloudflare Edge 24/7 Serverless',
      timestamp: new Date().toISOString()
    }, null, 2), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  try {
    const targetUrl = `${gasUrl}?action=getStudents`;
    const resp = await fetch(targetUrl);
    let students = [];
    if (resp.ok) {
      students = await resp.json();
    }

    if (Array.isArray(students)) {
      if (lineUserId) {
        const match = students.find(s => String(s.line_user_id || '').trim() === lineUserId);
        if (match) {
          const sid = String(match.student_id);
          return new Response(JSON.stringify({
            status: 'success',
            bound: true,
            student: {
              student_id: sid,
              rank: match.rank || 'นพอ.',
              first_name: match.first_name || '',
              last_name: match.last_name || '',
              full_name: match.full_name || `${match.rank || 'นพอ.'} ${match.first_name || ''} ${match.last_name || ''}`.trim(),
              class_year: match.class_year || (sid ? sid.substring(0, 2) : '69'),
              year_level: match.year_level || 1,
              role: 'student',
              position: match.position || 'นักเรียนพยาบาล',
              total_hours: match.total_hours || 0,
              passed: match.passed || false,
              line_user_id: lineUserId
            }
          }), {
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' }
          });
        }
        return new Response(JSON.stringify({
          status: 'success',
          bound: false,
          message: 'ยังไม่ได้ผูกบัญชี LINE กับรหัสนักเรียน นพอ.'
        }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' }
        });
      }

      if (studentId) {
        const match = students.find(s => String(s.student_id).trim() === studentId);
        return new Response(JSON.stringify({
          status: 'success',
          studentId: studentId,
          hasBoundLine: !!(match && match.line_user_id),
          lineUserId: match ? (match.line_user_id || '') : ''
        }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' }
        });
      }
    }

    return new Response(JSON.stringify({ status: 'error', message: 'Could not retrieve students' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ status: 'error', message: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
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
