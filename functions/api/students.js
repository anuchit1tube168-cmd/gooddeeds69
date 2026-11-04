/**
 * Cloudflare Pages Function - Get Students Edge Handler (24/7 Edge Serverless)
 * ดึงรายชื่อนักเรียนและสถิติชั่วโมงจาก Google Sheets Main_2569 พร้อมเชื่อมโยงคะแนนสะสมยอดยกมา (Carry-Forward)
 * และตำแหน่งพิเศษ (น.ต่างๆ) ตามปีการศึกษาอย่างถูกต้อง 100%
 */

import { CARRY_FORWARD_MAP, POSITIONS_MAP } from './_carry_forward.js';

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
    let students = [];
    if (resp.ok) {
      students = await resp.json();
    }

    if (Array.isArray(students) && students.length > 0) {
      // Enrich each student with canonical position, carry-forward hours, and cumulative hours
      for (let i = 0; i < students.length; i++) {
        const s = students[i];
        const sid = String(s.student_id || '').trim();
        s.position = POSITIONS_MAP[sid] || s.position || 'นักเรียนพยาบาล';
        s.carry_forward = (CARRY_FORWARD_MAP && CARRY_FORWARD_MAP[sid] !== undefined) ? CARRY_FORWARD_MAP[sid] : 0.0;
        const annualHrs = parseFloat(s.total_hours) || 0.0;
        s.cumulative_hours = Math.round((annualHrs + s.carry_forward) * 10) / 10;
        s.cumulative_passed = s.cumulative_hours >= 50.0;
      }
    }

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
