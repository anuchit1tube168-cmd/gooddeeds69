/* run.js — หน้านักเรียน หมวด 10 วิ่งเพื่อสุขภาพ (ส่งผล → รอผู้ตรวจอนุมัติ → ค่าพลัง/chibi อัปเดต) */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const user = App.requireAuth(['student']);
  if (!user) return;
  const API = (App.getApiBaseUrl ? App.getApiBaseUrl() : '') + '/api/runs';
  const DEFAULTS = { academicYear: 2569, kmPerHour: 10, maxPaceForHours: 10, maxHoursPerDay: 1, maxHoursPerSemester: 3, maxHoursPerYear: 6,
    maxHoursPerYearYear4: 4, eventHours: 2, eventMinKm: 5, maxEventsPerSemester: 2, maxKmPerRun: 42.2, minPaceMinPerKm: 3, maxPaceMinPerKm: 20,
    maxSubmitAgeDays: 7, semesters: [{ term: '1/2569', start: '2026-07-01', end: '2026-11-30' }, { term: '2/2569', start: '2026-12-01', end: '2027-06-30' }] };
  let settings = DEFAULTS, state = { runs: [], fitness: [] }, imageData = '', mode = 'shot', gpsSummary = '';

  const runType = () => (document.querySelector('input[name=rtype]:checked') || {}).value || 'personal';
  const termOf = (d) => ((settings.semesters || []).find((x) => d >= x.start && d <= x.end) || {}).term || '';
  const inYear = (d) => { const m = settings.semesters || []; return m.length && d >= m[0].start && d <= m[m.length - 1].end; };
  const yearLevel = () => (settings.academicYear % 100) - Number(String(user.student_id).slice(0, 2)) + 1;
  const toast = (msg) => { const t = $('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3200); };
  const todayStr = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10); // เวลาไทย

  $('stu-name').textContent = (user.rank || 'นพอ.') + ' ' + (user.full_name || ((user.first_name || '') + ' ' + (user.last_name || '')));
  $('f-date').value = todayStr();
  $('f-date').max = todayStr();

  function deedHours() {
    try { return Number((App.getStudentSummary(user.student_id) || {}).totalHours) || 0; } catch (_) { return 0; }
  }

  // ---------- render ----------
  function render() {
    const s = Strength.compute({ runs: state.runs, fitness: state.fitness, deedHours: deedHours() });
    $('chibi-img').src = `photos/chibi/chibi_lv${s.level}.png`;
    $('lv-badge').textContent = 'Lv.' + s.level;
    $('lv-name').textContent = s.levelName;
    $('score').textContent = s.score;
    $('score-bar').style.width = (s.score / 10) + '%';
    $('next-hint').textContent = s.nextLevelAt ? `อีก ${s.nextLevelAt - s.score} คะแนน จะเลื่อนเป็น Lv.${s.level + 1}` : 'ถึงระดับสูงสุดแล้ว';
    const aura = $('aura');
    aura.className = 'rn-aura aura-' + s.aura.key;
    aura.style.setProperty('--aura', s.aura.color);
    $('aura-label').textContent = `${s.aura.name} · แต้มบุญ ${s.merit} ชม.` + (s.nextAura ? ` (อีก ${Math.max(0, s.nextAura.min - s.merit).toFixed(1)} ชม. → ${s.nextAura.name})` : '');

    $('st-km').textContent = s.totalKm;
    $('st-pace').textContent = Strength.formatPace(s.avgPace);
    $('st-hours').textContent = s.runHours;
    $('st-weeks').textContent = s.activeWeeks;

    const pb = $('pending-box');
    pb.hidden = !s.pendingRuns;
    pb.textContent = s.pendingRuns ? `⏳ รอผู้ตรวจอนุมัติ ${s.pendingRuns} ครั้ง (${s.pendingKm} กม. · ประมาณ ${s.pendingHours} ชม.) — ค่าพลังจะเพิ่มหลังอนุมัติ` : '';

    const term = termOf(todayStr());
    const appr = state.runs.filter((r) => r.status === 'approved');
    const sumH = (list) => list.reduce((a, r) => a + Number(r.approvedHours || 0), 0);
    const per = appr.filter((r) => r.type !== 'event'), ev = appr.filter((r) => r.type === 'event' && r.approvedHours > 0);
    const yearCap = yearLevel() >= 4 ? settings.maxHoursPerYearYear4 : settings.maxHoursPerYear;
    const q = [
      ['10.1 วิ่งส่วนตัว · ภาค ' + (term || '–'), sumH(per.filter((r) => termOf(r.date) === term)), settings.maxHoursPerSemester, 'ชม.'],
      ['10.1 วิ่งส่วนตัว · ทั้งปี' + (yearLevel() >= 4 ? ' (ชั้นปี 4)' : ''), sumH(per.filter((r) => inYear(r.date))), yearCap, 'ชม.'],
      ['10.2 งานวิ่ง · ภาค ' + (term || '–'), ev.filter((r) => termOf(r.date) === term).length, settings.maxEventsPerSemester, 'งาน'],
    ];
    $('quota').innerHTML = q.map(([t, used, cap, u]) => `<div class="rn-q"><span>${t}</span><b>${used}/${cap} ${u}</b><div class="rn-bar sm"><i style="width:${cap ? Math.min(100, used / cap * 100) : 0}%"></i></div></div>`).join('');
    $('rules').innerHTML = `<ul>
      <li><b>10.1 วิ่งส่วนตัว:</b> ทุก ${settings.kmPerHour} กม. = 1 ชม. (ปัดลงทีละ 0.5 ชม. → ขั้นต่ำ ${settings.kmPerHour / 2} กม. ได้ 0.5 ชม.)</li>
      <li>ได้ชั่วโมงเมื่อเพซไม่ช้ากว่า ${settings.maxPaceForHours} นาที/กม. (ช้ากว่านี้ถือเป็นการเดิน นับค่าพลังแต่ไม่ได้ชั่วโมง)</li>
      <li>เพดาน ${settings.maxHoursPerDay} ชม./วัน · ${settings.maxHoursPerSemester} ชม./ภาค · ${settings.maxHoursPerYear} ชม./ปี (ชั้นปี 4: ${settings.maxHoursPerYearYear4} ชม./ปี)</li>
      <li><b>10.2 งานวิ่ง/วิ่งการกุศล:</b> ${settings.eventHours} ชม./งาน ระยะตั้งแต่ ${settings.eventMinKm} กม. ไม่เกิน ${settings.maxEventsPerSemester} งาน/ภาค ต้องแนบเบอร์วิ่งหรือใบประกาศ</li>
      <li>ไปตามคำสั่ง วพอ. ให้บันทึกหมวด 2 (โครงการภายนอก) แทน ห้ามบันทึกซ้ำทั้งสองหมวด</li>
      <li>ระยะ 0.5–${settings.maxKmPerRun} กม./ครั้ง · เพซ ${settings.minPaceMinPerKm}–${settings.maxPaceMinPerKm} นาที/กม. · ส่งย้อนหลังไม่เกิน ${settings.maxSubmitAgeDays} วัน · ต้องมีภาพหลักฐานทุกครั้ง</li>
      <li>ชั่วโมงและค่าพลังนับหลังผู้ตรวจอนุมัติเท่านั้น เพดานคิด ณ วันที่อนุมัติ</li></ul>`;

    const labels = { endurance: 'ความอึด (ระยะสะสม)', speed: 'ความเร็ว (เพซ)', consistency: 'ความสม่ำเสมอ', fitness: 'สมรรถภาพร่างกาย', merit: 'แต้มบุญ (ชม.ความดี)' };
    $('parts').innerHTML = Object.keys(labels).map((k) => {
      const pct = Math.round((s.parts[k] / s.max[k]) * 100);
      return `<div class="rn-part"><div class="rn-part-h"><span>${labels[k]}</span><b>${s.parts[k]}/${s.max[k]}</b></div><div class="rn-bar sm"><i class="p-${k}" style="width:${pct}%"></i></div></div>`;
    }).join('');
    const f = s.latestFit;
    $('fit-note').textContent = f
      ? `ผลทดสอบล่าสุด ${f.date}: วิ่ง 2.4 กม. ${f.run2400Min ? Strength.formatPace(f.run2400Min) + ' นาที' : '–'} · ดันพื้น ${f.pushups ?? '–'} · ลุกนั่ง ${f.situps ?? '–'}`
      : 'ยังไม่มีผลทดสอบสมรรถภาพ — ผู้ตรวจจะบันทึกให้หลังการทดสอบประจำภาค';
    if (s.runs < 3) $('fit-note').textContent += ' · ด้านความเร็วนับเมื่อวิ่งที่อนุมัติแล้วครบ 3 ครั้ง';

    const st = { pending: ['รอตรวจ', 'pending'], approved: ['อนุมัติ', 'ok'], rejected: ['ไม่อนุมัติ', 'no'] };
    const list = state.runs.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
    $('history').innerHTML = list.length ? list.map((r) => {
      const [label, cls] = st[r.status] || [r.status, ''];
      const hrs = r.status === 'approved' ? `${r.approvedHours} ชม.` : r.status === 'pending' ? `~${r.estimatedHours} ชม.` : '0 ชม.';
      return `<div class="rn-item"><div><b>${esc(r.distanceKm)} กม.</b> · ${esc(Strength.formatPace(r.paceMinPerKm))} นาที/กม.<small>${esc(r.date)} · ${r.type === 'event' ? '🏅 ' + esc(r.eventName || 'งานวิ่ง') : 'วิ่งส่วนตัว'} · ${r.source === 'gps' ? 'GPS ในแอป' : 'ภาพจากแอปวิ่ง'}</small>${r.reviewNote ? `<small class="rn-review">💬 ${esc(r.reviewNote)}</small>` : ''}</div><div class="rn-item-r"><span class="chip ${cls}">${label}</span><small>${hrs}</small></div></div>`;
    }).join('') : '<p class="rn-note">ยังไม่มีบันทึกการวิ่ง เริ่มบันทึกครั้งแรกได้ด้านบน</p>';
  }

  async function load() {
    try {
      const r = await fetch(`${API}?studentId=${encodeURIComponent(user.student_id)}`, { cache: 'no-store' });
      const d = await r.json();
      if (d.status !== 'success') throw new Error(d.code || 'load_failed');
      state = { runs: d.runs || [], fitness: d.fitness || [] };
      settings = Object.assign({}, DEFAULTS, d.settings || {});
    } catch (e) {
      $('history').innerHTML = `<p class="rn-note">โหลดข้อมูลไม่สำเร็จ (${esc(e.message)}) — ลองใหม่ภายหลัง</p>`;
    }
    render();
    estimate();
  }

  // ---------- form ----------
  function estimate() {
    const km = Number($('f-km').value), min = Number($('f-min').value), el = $('f-est'), type = runType();
    if (!(km > 0 && min > 0)) { el.textContent = 'กรอกระยะทางและเวลาเพื่อดูชั่วโมงโดยประมาณ'; el.className = 'rn-estimate'; return; }
    const pace = min / km;
    let msg, bad = pace < settings.minPaceMinPerKm || pace > settings.maxPaceMinPerKm;
    if (bad) msg = `เพซ ${Strength.formatPace(pace)} นาที/กม. อยู่นอกช่วงที่รับได้ (${settings.minPaceMinPerKm}–${settings.maxPaceMinPerKm} นาที/กม.)`;
    else if (type === 'event') {
      bad = km < settings.eventMinKm;
      msg = bad ? `งานวิ่งต้องมีระยะตั้งแต่ ${settings.eventMinKm} กม.` : `เพซ ${Strength.formatPace(pace)} · งานวิ่ง ได้ ${settings.eventHours} ชม. ถ้ายังไม่ครบ ${settings.maxEventsPerSemester} งานในภาคนี้`;
    } else if (pace > settings.maxPaceForHours) {
      msg = `เพซ ${Strength.formatPace(pace)} ช้ากว่า ${settings.maxPaceForHours} นาที/กม. — นับค่าพลังได้ แต่ไม่ได้ชั่วโมงความดี`;
    } else {
      const hrs = Math.floor((km / settings.kmPerHour) * 2) / 2;
      msg = hrs > 0 ? `เพซ ${Strength.formatPace(pace)} · ประมาณ ${Math.min(hrs, settings.maxHoursPerDay)} ชม.${hrs > settings.maxHoursPerDay ? ` (คำนวณได้ ${hrs} แต่เพดาน ${settings.maxHoursPerDay} ชม./วัน)` : ''} — ยอดจริงคิดตอนอนุมัติ`
        : `ระยะยังไม่ถึง ${settings.kmPerHour / 2} กม. — นับค่าพลังได้ แต่ยังไม่ได้ชั่วโมง`;
    }
    el.className = 'rn-estimate' + (bad ? ' bad' : '');
    el.textContent = msg;
  }
  document.querySelectorAll('input[name=rtype]').forEach((r) => r.addEventListener('change', () => { $('event-box').hidden = runType() !== 'event'; estimate(); }));
  ['f-km', 'f-min'].forEach((id) => $(id).addEventListener('input', estimate));

  // ย่อภาพก่อนส่ง: ภาพมือถือ 3–8 MB ทำให้ LINE ค้างและเกินขนาดที่ Apps Script รับ
  function compressImage(file, maxSide = 1280, quality = 0.8) {
    return new Promise((resolve, reject) => {
      if (!/^image\//.test(file.type)) return reject(new Error('ไฟล์ต้องเป็นรูปภาพ'));
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('อ่านรูปภาพไม่ได้')); };
      img.src = url;
    });
  }
  $('f-img').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      imageData = await compressImage(file);
      $('f-preview').src = imageData; $('f-preview').hidden = false;
      $('f-img-text').textContent = 'เปลี่ยนภาพ';
    } catch (err) { showErr(err.message); }
  });

  function showErr(msg) { const e = $('f-err'); e.textContent = msg; e.hidden = !msg; }
  const ERR = {
    invalid_date: 'วันที่ไม่ถูกต้อง (ห้ามเป็นวันในอนาคต)', too_old: 'ส่งย้อนหลังได้ไม่เกินจำนวนวันที่กำหนด',
    invalid_distance: 'ระยะทางต้องอยู่ระหว่าง 0.5–42.2 กม.', pace_out_of_range: 'เพซผิดปกติ กรุณาตรวจระยะทางและเวลา',
    evidence_required: 'กรุณาแนบภาพหลักฐาน', evidence_invalid: 'ภาพหลักฐานไม่ถูกต้องหรือใหญ่เกินไป',
    duplicate_run: 'มีรายการวิ่งวันนี้ระยะเท่ากันอยู่แล้ว', event_name_required: 'กรุณาระบุชื่องานวิ่ง', event_too_short: 'ระยะของงานวิ่งต่ำกว่าที่กำหนด', student_not_found: 'ไม่พบรหัสนักเรียนในทะเบียน',
    RUN_NOT_CONFIGURED: 'ระบบวิ่งยังไม่เปิดใช้งาน กรุณาแจ้งผู้ดูแลระบบ', RUN_GATEWAY_DENIED: 'ระบบวิ่งยังไม่เปิดใช้งาน กรุณาแจ้งผู้ดูแลระบบ',
  };

  $('run-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    showErr('');
    const km = Number($('f-km').value), min = Number($('f-min').value), date = $('f-date').value;
    if (!date || !(km >= 0.5) || !(min > 0)) return showErr('กรุณากรอกวันที่ ระยะทาง และเวลาให้ครบ');
    if (runType() === 'event' && $('f-event').value.trim().length < 3) return showErr('กรุณาระบุชื่องานวิ่ง');
    if (!imageData) return showErr(mode === 'gps' ? 'กรุณาจบการวิ่งเพื่อสร้างภาพเส้นทางก่อน' : 'กรุณาแนบภาพหน้าจอผลวิ่ง');
    const btn = $('f-submit'); btn.disabled = true; btn.textContent = 'กำลังส่ง…';
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        action: 'submit',
        run: { studentId: user.student_id, studentName: user.first_name || '', date, distanceKm: km, durationMin: min,
          source: mode === 'gps' ? 'gps' : 'screenshot', gpsSummary, imageData, type: runType(), eventName: $('f-event').value.trim() },
      }) });
      const d = await r.json();
      if (d.status !== 'success') throw new Error(ERR[d.code] || d.code || 'ส่งไม่สำเร็จ');
      toast(`ส่งแล้ว รอผู้ตรวจอนุมัติ (ประมาณ ${d.estimatedHours} ชม.)`);
      $('run-form').reset(); $('f-date').value = todayStr(); $('event-box').hidden = true;
      imageData = ''; gpsSummary = ''; $('f-preview').hidden = true; $('f-img-text').textContent = 'แตะเพื่อเลือกภาพ';
      await load();
    } catch (err) {
      showErr(err.message);
    } finally {
      btn.disabled = false; btn.textContent = 'ส่งให้ผู้ตรวจอนุมัติ';
    }
  });

  // ---------- mode switch ----------
  document.querySelectorAll('.rn-seg button').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('.rn-seg button').forEach((x) => x.classList.toggle('active', x === b));
    mode = b.dataset.mode;
    $('mode-gps').hidden = mode !== 'gps';
    $('mode-shot').hidden = mode !== 'shot';
    ['f-km', 'f-min'].forEach((id) => { $(id).readOnly = mode === 'gps'; });
    imageData = ''; $('f-preview').hidden = true;
  }));

  // ---------- GPS tracker ----------
  const gps = { watch: null, points: [], meters: 0, startedAt: 0, elapsed: 0, running: false, timer: null, wake: null };
  const MAX_ACCURACY_M = 35, MAX_SPEED_MS = 7; // > 25 กม./ชม. ถือว่าไม่ใช่การวิ่ง (กันพิกัดกระโดด/ขึ้นรถ)
  const fmtTime = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
  const elapsedSec = () => gps.elapsed + (gps.running ? (Date.now() - gps.startedAt) / 1000 : 0);

  function gpsTick() {
    const km = gps.meters / 1000, sec = elapsedSec();
    $('g-km').textContent = km.toFixed(2);
    $('g-time').textContent = fmtTime(sec);
    $('g-pace').textContent = km > 0.05 ? Strength.formatPace(sec / 60 / km) : '–';
  }
  function onPos(pos) {
    const { latitude: lat, longitude: lng, accuracy } = pos.coords;
    if (accuracy > MAX_ACCURACY_M) { $('g-status').textContent = `สัญญาณ GPS อ่อน (±${Math.round(accuracy)} ม.) รอสักครู่…`; return; }
    const p = { lat, lng, t: pos.timestamp };
    const last = gps.points[gps.points.length - 1];
    if (last) {
      const d = Strength.haversine(last, p), dt = (p.t - last.t) / 1000;
      if (d < 5) return; // ยืนนิ่ง/สัญญาณแกว่ง
      if (dt > 0 && d / dt > MAX_SPEED_MS) { $('g-status').textContent = 'ตรวจพบความเร็วผิดปกติ ไม่นับช่วงนี้'; gps.points.push(p); return; }
      gps.meters += d;
    }
    gps.points.push(p);
    $('g-status').textContent = `กำลังบันทึก · สัญญาณ ±${Math.round(accuracy)} ม.`;
  }
  async function keepAwake() { try { if ('wakeLock' in navigator) gps.wake = await navigator.wakeLock.request('screen'); } catch (_) {} }

  $('g-start').addEventListener('click', () => {
    if (!('geolocation' in navigator)) return showErr('อุปกรณ์นี้ไม่รองรับ GPS — ใช้แบบ "ภาพจากแอปวิ่ง" แทน');
    if (!gps.running) {
      gps.running = true; gps.startedAt = Date.now();
      gps.watch = navigator.geolocation.watchPosition(onPos, (err) => { $('g-status').textContent = 'ใช้ GPS ไม่ได้: ' + (err.code === 1 ? 'ยังไม่อนุญาตตำแหน่ง' : err.message); }, { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
      gps.timer = setInterval(gpsTick, 1000);
      keepAwake();
      $('g-start').disabled = true; $('g-pause').disabled = false; $('g-stop').disabled = false; $('g-start').textContent = 'วิ่งต่อ';
    }
  });
  $('g-pause').addEventListener('click', () => {
    if (!gps.running) return;
    gps.elapsed = elapsedSec(); gps.running = false;
    navigator.geolocation.clearWatch(gps.watch); clearInterval(gps.timer);
    gps.points.push(null); // แบ่งช่วง ไม่ลากเส้นข้ามช่วงพัก
    $('g-start').disabled = false; $('g-pause').disabled = true; $('g-status').textContent = 'พักการวิ่ง';
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && gps.running) keepAwake(); });

  $('g-stop').addEventListener('click', () => {
    if (gps.running) $('g-pause').click();
    const km = Math.round((gps.meters / 1000) * 100) / 100, min = Math.round((gps.elapsed / 60) * 10) / 10;
    if (km < 0.5) { showErr('ระยะทางน้อยกว่า 0.5 กม. ยังส่งไม่ได้'); return; }
    $('f-km').value = km; $('f-min').value = min; $('f-date').value = todayStr();
    const pts = gps.points.filter(Boolean);
    gpsSummary = JSON.stringify({ points: pts.length, start: new Date(pts[0].t).toISOString(), end: new Date(pts[pts.length - 1].t).toISOString(), km, min });
    imageData = drawRoute(km, min);
    $('f-preview').src = imageData; $('f-preview').hidden = false;
    $('g-start').disabled = true; $('g-stop').disabled = true;
    if (gps.wake) gps.wake.release().catch(() => {});
    estimate();
    toast('สร้างภาพเส้นทางแล้ว ตรวจข้อมูลแล้วกดส่ง');
  });

  // วาดเส้นทาง + สรุปลงภาพ ใช้เป็นหลักฐานให้ผู้ตรวจ (ไม่ส่งพิกัดดิบทั้งหมด เพื่อลดข้อมูลตำแหน่งส่วนบุคคล)
  function drawRoute(km, min) {
    const c = $('g-canvas'), ctx = c.getContext('2d'), pts = gps.points.filter(Boolean);
    ctx.fillStyle = '#0a1628'; ctx.fillRect(0, 0, c.width, c.height);
    const lats = pts.map((p) => p.lat), lngs = pts.map((p) => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const pad = 40, w = c.width - pad * 2, h = c.height - pad * 2 - 70;
    const sx = (maxLng - minLng) || 1e-6, sy = (maxLat - minLat) || 1e-6, s = Math.min(w / sx, h / sy);
    ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
    ctx.beginPath();
    let pen = false;
    gps.points.forEach((p) => {
      if (!p) { pen = false; return; }
      const x = pad + (p.lng - minLng) * s, y = pad + 70 + (maxLat - p.lat) * s;
      if (!pen) { ctx.moveTo(x, y); pen = true; } else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.fillStyle = '#c9a227'; ctx.font = 'bold 30px sans-serif';
    ctx.fillText(`${km} กม. · ${fmtTime(min * 60)} · ${Strength.formatPace(min / km)}/กม.`, pad, 50);
    ctx.fillStyle = '#94a3b8'; ctx.font = '18px sans-serif';
    ctx.fillText(`${user.student_id} · ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })} · GPS ${pts.length} จุด`, pad, c.height - 16);
    return c.toDataURL('image/jpeg', 0.85);
  }

  // ลิงก์จากเมนู LINE: ?mode=gps เปิดโหมด GPS, ?focus=power|rules เลื่อนไปส่วนนั้น
  const qs = new URLSearchParams(location.search);
  if (qs.get('mode') === 'gps') { const b = document.querySelector('.rn-seg button[data-mode=gps]'); if (b) b.click(); }
  load().then(() => {
    const f = qs.get('focus') || (qs.get('mode') === 'gps' ? 'submit-card' : '');
    if (f === 'rules') $('rules-box').open = true;
    const el = $(f === 'rules' ? 'rules-box' : f);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
