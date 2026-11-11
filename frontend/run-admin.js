/* run-admin.js — ผู้ตรวจ: ภาพรวม / ตรวจอนุมัติ / สมรรถภาพ / กติกา (สิทธิ์จริงตรวจที่ server ด้วย X-Admin-Key) */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const user = App.requireAuth(['teacher', 'admin']);
  if (!user) return;
  const API = (App.getApiBaseUrl ? App.getApiBaseUrl() : '') + '/api/runs';
  const KEY = 'gd_run_admin_key';
  const students = (typeof STUDENTS_DATA !== 'undefined' ? STUDENTS_DATA : []).filter((s) => Number(s.year_level) >= 1 && Number(s.year_level) <= 4); // ศิษย์เก่า = year_level 5
  const byId = Object.fromEntries(students.map((s) => [String(s.student_id), s]));
  let data = { runs: [], fitness: [], settings: {} };
  document.getElementById('who').textContent = user.name || user.username || 'ผู้ตรวจ';

  const toast = (m) => { const t = $('toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3200); };
  const nameOf = (sid) => { const s = byId[sid]; return s ? `${s.rank || 'นพอ.'} ${s.full_name || s.first_name + ' ' + s.last_name}` : sid; };
  const yearOf = (sid) => { const s = byId[sid]; return s && s.year_level ? Number(s.year_level) : (69 - Number(String(sid).slice(0, 2)) + 1); };
  const deedHoursOf = (sid) => { try { return Number((App.getStudentSummary(sid) || {}).totalHours) || 0; } catch (_) { return 0; } };

  async function call(method, body, query = '') {
    const r = await fetch(API + query, { method, cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': sessionStorage.getItem(KEY) || '' },
      body: body ? JSON.stringify(body) : undefined });
    const d = await r.json().catch(() => ({ status: 'error', code: 'bad_response' }));
    if (r.status === 401) { sessionStorage.removeItem(KEY); showKey('รหัสผู้ตรวจไม่ถูกต้อง'); throw new Error('ADMIN_KEY_REQUIRED'); }
    if (d.status !== 'success') throw new Error(d.code || 'error');
    return d;
  }

  function showKey(err) { $('key-card').hidden = false; $('app').hidden = true; $('key-err').hidden = !err; $('key-err').textContent = err || ''; }
  $('key-form').addEventListener('submit', (e) => { e.preventDefault(); sessionStorage.setItem(KEY, $('key-input').value.trim()); load(); });
  $('btn-lock').addEventListener('click', () => { sessionStorage.removeItem(KEY); showKey(); });

  async function load() {
    if (!sessionStorage.getItem(KEY)) return showKey();
    try {
      data = await call('GET', null, '?all=1');
      $('key-card').hidden = true; $('app').hidden = false;
      renderAll();
    } catch (e) {
      if (e.message !== 'ADMIN_KEY_REQUIRED') showKey('โหลดข้อมูลไม่สำเร็จ: ' + e.message);
    }
  }

  // ---------- tabs ----------
  document.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('active', x === b));
    document.querySelectorAll('[data-pane]').forEach((p) => { p.hidden = p.dataset.pane !== b.dataset.tab; });
  }));

  function renderAll() { renderDash(); renderQueue(); renderFitness(); renderSettings(); }

  function table(head, rows) {
    return `<table><thead><tr>${head.map((h) => `<th class="${h.num ? 'num' : ''}">${h.t}</th>`).join('')}</tr></thead><tbody>${rows.join('') || `<tr><td colspan="${head.length}" class="rn-note">ยังไม่มีข้อมูล</td></tr>`}</tbody></table>`;
  }

  function renderDash() {
    const approved = data.runs.filter((r) => r.status === 'approved');
    const pending = data.runs.filter((r) => r.status === 'pending');
    const runners = new Set(approved.map((r) => r.studentId));
    $('k-pending').textContent = pending.length;
    $('q-count').textContent = pending.length ? `(${pending.length})` : '';
    $('k-runners').textContent = runners.size;
    $('k-km').textContent = Math.round(approved.reduce((a, r) => a + r.distanceKm, 0) * 10) / 10;
    $('k-hours').textContent = approved.reduce((a, r) => a + r.approvedHours, 0);

    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(Date.now() - i * 7 * 86400000).toISOString().slice(0, 10);
      weeks.push(Strength.isoWeekKey(d));
    }
    const kmW = weeks.map((w) => approved.filter((r) => Strength.isoWeekKey(r.date) === w).reduce((a, r) => a + r.distanceKm, 0));
    const maxW = Math.max(1, ...kmW);
    $('weeks').innerHTML = weeks.map((w, i) => `<div><b>${Math.round(kmW[i])}</b><i style="height:${(kmW[i] / maxW) * 100}%"></i>${w.split('-W')[1] ? 'W' + w.split('-W')[1] : ''}</div>`).join('');

    // ค่าพลังรายคน (เฉพาะคนที่มีข้อมูลวิ่งหรือสมรรถภาพ)
    const sids = new Set([...data.runs.map((r) => r.studentId), ...data.fitness.map((f) => f.studentId)]);
    const power = [...sids].map((sid) => ({ sid, ...Strength.compute({
      runs: data.runs.filter((r) => r.studentId === sid), fitness: data.fitness.filter((f) => f.studentId === sid), deedHours: deedHoursOf(sid) }) }));

    const years = [1, 2, 3, 4].map((y) => {
      const list = power.filter((p) => yearOf(p.sid) === y);
      const total = students.filter((s) => Number(s.year_level) === y).length;
      const km = list.reduce((a, p) => a + p.totalKm, 0);
      const avg = list.length ? Math.round(list.reduce((a, p) => a + p.score, 0) / list.length) : 0;
      return `<tr><td>ชั้นปีที่ ${y}</td><td class="num">${list.filter((p) => p.runs).length}/${total || '–'}</td><td class="num">${Math.round(km * 10) / 10}</td><td class="num">${avg}</td></tr>`;
    });
    $('by-year').innerHTML = table([{ t: 'ชั้นปี' }, { t: 'คนที่วิ่ง/ทั้งหมด', num: 1 }, { t: 'ระยะรวม (กม.)', num: 1 }, { t: 'ค่าพลังเฉลี่ย', num: 1 }], years);

    const top = power.sort((a, b) => b.score - a.score).slice(0, 15).map((p, i) =>
      `<tr><td>${i + 1}</td><td>${esc(nameOf(p.sid))}<br><small class="rn-note">${esc(p.sid)} · ปี ${yearOf(p.sid)}</small></td><td>Lv.${p.level} ${esc(p.levelName)}</td><td class="num">${p.totalKm}</td><td class="num">${Strength.formatPace(p.avgPace)}</td><td>${esc(p.aura.name)}</td><td class="num"><b>${p.score}</b></td></tr>`);
    $('top').innerHTML = table([{ t: '#' }, { t: 'นักเรียน' }, { t: 'เลเวล' }, { t: 'กม.', num: 1 }, { t: 'เพซ', num: 1 }, { t: 'ออร่า' }, { t: 'ค่าพลัง', num: 1 }], top);
  }

  function renderQueue() {
    const pending = data.runs.filter((r) => r.status === 'pending').sort((a, b) => String(a.submittedAt).localeCompare(String(b.submittedAt)));
    $('queue').innerHTML = pending.length ? pending.map((r) => {
      let gps = '';
      try { const g = r.gps ? JSON.parse(r.gps) : null; if (g) gps = `GPS ${g.points} จุด · ${new Date(g.start).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })}–${new Date(g.end).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })}`; } catch (_) {}
      return `<div class="rn-card ad-q" data-id="${esc(r.id)}">
        <div><h3>${esc(nameOf(r.studentId))} <small class="rn-note">${esc(r.studentId)} · ปี ${yearOf(r.studentId)}</small></h3>
          <div class="meta">วันที่วิ่ง <b>${esc(r.date)}</b> · <b>${esc(r.distanceKm)} กม.</b> · ${esc(r.durationMin)} นาที · เพซ ${esc(Strength.formatPace(r.paceMinPerKm))}/กม.<br>
          ${r.type === 'event' ? `<b style="color:#c9a227">🏅 10.2 งานวิ่ง: ${esc(r.eventName)}</b> · ` : '10.1 วิ่งส่วนตัว · '}${r.source === 'gps' ? '📍 จับ GPS ในแอป' : '📱 ภาพจากแอปวิ่ง'} ${esc(gps)} · ประเมินตอนส่ง ~${esc(r.estimatedHours)} ชม. (เพดานคิดตอนอนุมัติ)<br>
          ${r.evidenceUrl ? `<a href="${esc(r.evidenceUrl)}" target="_blank" rel="noopener" style="color:#c9a227">เปิดภาพหลักฐานใน Drive ↗</a>` : 'ไม่มีหลักฐาน'}</div></div>
        <div class="acts"><button class="btn btn-ok" data-act="approve">อนุมัติ</button><button class="btn btn-no" data-act="reject">ไม่อนุมัติ</button></div>
        <textarea class="form-input" placeholder="หมายเหตุ (จำเป็นเมื่อไม่อนุมัติ)"></textarea></div>`;
    }).join('') : '<div class="rn-card"><p class="rn-note" style="margin:0">ไม่มีรายการรอตรวจ 🎉</p></div>';
  }

  $('queue').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const card = btn.closest('[data-id]'), note = card.querySelector('textarea').value.trim();
    if (btn.dataset.act === 'reject' && !note) { card.querySelector('textarea').focus(); return toast('กรุณาระบุเหตุผลที่ไม่อนุมัติ'); }
    card.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    try {
      const r = await call('POST', { action: 'review', runId: card.dataset.id, decision: btn.dataset.act, note, reviewer: user.name || user.username || 'ผู้ตรวจ' });
      toast(r.decision === 'approve' ? `อนุมัติ ${r.approvedHours} ชม.${r.capNote ? ' · ' + r.capNote : ''}` : 'บันทึกไม่อนุมัติแล้ว');
      await load();
    } catch (err) {
      toast('ไม่สำเร็จ: ' + err.message);
      card.querySelectorAll('button').forEach((b) => { b.disabled = false; });
    }
  });

  // ---------- fitness ----------
  $('stu-list').innerHTML = students.map((s) => `<option value="${esc(s.student_id)}">${esc(s.full_name || '')}</option>`).join('');
  $('fit-date').value = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
  $('fit-sid').addEventListener('input', () => { $('fit-name').textContent = byId[$('fit-sid').value] ? nameOf($('fit-sid').value) : ''; });
  function parseMinSec(v) {
    v = String(v || '').trim(); if (!v) return '';
    const m = v.match(/^(\d{1,2})[:.](\d{1,2})$/); if (m) return Number(m[1]) + Number(m[2]) / 60;
    return Number(v);
  }
  function renderFitness() {
    const rows = data.fitness.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 30).map((f) =>
      `<tr><td>${esc(f.date)}</td><td>${esc(nameOf(f.studentId))}</td><td class="num">${f.run2400Min ? Strength.formatPace(f.run2400Min) : '–'}</td><td class="num">${f.pushups ?? '–'}</td><td class="num">${f.situps ?? '–'}</td><td>${esc(f.recorder)}</td></tr>`);
    $('fit-list').innerHTML = table([{ t: 'วันที่' }, { t: 'นักเรียน' }, { t: '2.4 กม.', num: 1 }, { t: 'ดันพื้น', num: 1 }, { t: 'ลุกนั่ง', num: 1 }, { t: 'ผู้บันทึก' }], rows);
  }
  $('fit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('fit-err'); err.hidden = true;
    const sid = $('fit-sid').value.trim();
    if (!byId[sid]) { err.textContent = 'ไม่พบรหัสนักเรียนนี้'; err.hidden = false; return; }
    const run = parseMinSec($('fit-run').value);
    if (run !== '' && !(run >= 6 && run <= 40)) { err.textContent = 'เวลาวิ่ง 2.4 กม. ต้องอยู่ระหว่าง 6–40 นาที (รูปแบบ 12:30)'; err.hidden = false; return; }
    try {
      await call('POST', { action: 'fitness', record: { studentId: sid, date: $('fit-date').value, run2400Min: run,
        pushups: $('fit-push').value, situps: $('fit-sit').value, recorder: user.name || user.username || 'ผู้ตรวจ' } });
      toast('บันทึกผลสมรรถภาพแล้ว');
      ['fit-sid', 'fit-run', 'fit-push', 'fit-sit'].forEach((id) => { $(id).value = ''; }); $('fit-name').textContent = '';
      await load();
    } catch (x) { err.textContent = 'บันทึกไม่สำเร็จ: ' + x.message; err.hidden = false; }
  });

  // ---------- settings ----------
  const FIELDS = [['academicYear', 'ปีการศึกษา (พ.ศ.)'],
    ['kmPerHour', '10.1 กม. ต่อ 1 ชม.'], ['maxPaceForHours', '10.1 เพซช้าสุดที่ได้ชั่วโมง'], ['maxHoursPerDay', '10.1 เพดาน ชม./วัน'],
    ['maxHoursPerSemester', '10.1 เพดาน ชม./ภาค'], ['maxHoursPerYear', '10.1 เพดาน ชม./ปี'], ['maxHoursPerYearYear4', '10.1 เพดาน ชม./ปี (ชั้นปี 4)'],
    ['eventHours', '10.2 ชม. ต่องานวิ่ง'], ['eventMinKm', '10.2 ระยะขั้นต่ำ (กม.)'], ['maxEventsPerSemester', '10.2 งาน/ภาคสูงสุด'],
    ['maxKmPerRun', 'ระยะสูงสุด/ครั้ง (กม.)'], ['minPaceMinPerKm', 'เพซเร็วสุดที่รับ (นาที/กม.)'], ['maxPaceMinPerKm', 'เพซช้าสุดที่รับ (นาที/กม.)'], ['maxSubmitAgeDays', 'ส่งย้อนหลังได้ (วัน)']];
  function renderSettings() {
    const s = data.settings || {};
    $('set-fields').innerHTML = FIELDS.map(([k, t]) => `<div class="form-group"><label class="form-label">${t}</label><input type="number" step="0.1" class="form-input" data-k="${k}" value="${esc(s[k])}"></div>`).join('');
    $('set-sem').value = JSON.stringify(s.semesters || [], null, 2);
  }
  $('set-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('set-err'); err.hidden = true;
    const settings = {};
    document.querySelectorAll('#set-fields [data-k]').forEach((i) => { settings[i.dataset.k] = Number(i.value); });
    try { settings.semesters = JSON.parse($('set-sem').value); } catch (_) { err.textContent = 'รูปแบบ JSON ภาคเรียนไม่ถูกต้อง'; err.hidden = false; return; }
    if (!confirm('ยืนยันเปลี่ยนกติกา? มีผลกับการอนุมัติครั้งถัดไป')) return;
    try { await call('POST', { action: 'settings', settings }); toast('บันทึกกติกาแล้ว'); await load(); }
    catch (x) { err.textContent = 'บันทึกไม่สำเร็จ: ' + x.message; err.hidden = false; }
  });

  // ---------- LINE Rich Menu ----------
  async function richmenu(method) {
    const msg = $('rm-msg');
    msg.textContent = method === 'POST' ? 'กำลังติดตั้ง…' : 'กำลังตรวจ…';
    try {
      const r = await fetch((App.getApiBaseUrl ? App.getApiBaseUrl() : '') + '/api/richmenu-setup', { method, cache: 'no-store',
        headers: { 'X-Admin-Key': sessionStorage.getItem(KEY) || '' } });
      const d = await r.json();
      if (d.status !== 'success') throw new Error(d.code || r.status);
      msg.textContent = method === 'POST' ? '✅ ติดตั้งแล้ว เปิด LINE OA เพื่อดูเมนูใหม่' : `ติดตั้งอยู่ ${d.installed.length} แท็บ`;
    } catch (e) {
      msg.textContent = '❌ ' + ({ LINE_TOKEN_MISSING: 'ยังไม่มี LINE token ใน Cloudflare', ADMIN_KEY_REQUIRED: 'รหัสผู้ตรวจไม่ถูกต้อง' }[e.message] || e.message);
    }
  }
  $('rm-install').addEventListener('click', () => { if (confirm('ติดตั้งเมนู LINE ชุดใหม่ให้ผู้ใช้ทุกคน?')) richmenu('POST'); });
  $('rm-status').addEventListener('click', () => richmenu('GET'));

  load();
})();
