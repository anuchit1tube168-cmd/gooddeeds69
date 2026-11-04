/**
 * Cloudflare Pages Function - Get Students Edge Handler (24/7 Edge Serverless)
 * ดึงรายชื่อนักเรียนและสถิติชั่วโมงจาก Google Sheets Main_2569 พร้อมแคชและ CORS อัตโนมัติ
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-GoodDeeds-Role',
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
  const gasUrl = (env && env.GAS_URL) ? env.GAS_URL : 'https://script.google.com/macros/s/AKfycbwaG05E5dNew4dsf0vD8LBLuWdbThXIkMih1UI8Ba9rnRBCK4xmnlArzZdwtmqV9vOdcw/exec';

  try {
    const targetUrl = `${gasUrl}?action=getStudents`;
    const resp = await fetch(targetUrl);
    if (!resp.ok) {
      return new Response(JSON.stringify({ status: 'error', message: 'GAS returned status ' + resp.status }), {
        status: resp.status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }
    const students = await resp.json();
    return new Response(JSON.stringify(students), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=120'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ status: 'error', message: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}
