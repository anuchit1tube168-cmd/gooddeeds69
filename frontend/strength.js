/**
 * strength.js — คำนวณ "ค่าพลังรายคน" + ออร่าแต้มบุญ + เลเวล chibi (1–10)
 * ใช้ร่วมกันทั้งหน้านักเรียน (run.html) และผู้ตรวจ (run-admin.html)
 *
 * คะแนนเต็ม 1000 แบ่ง 5 ด้าน (ปรับน้ำหนักที่ WEIGHTS ได้ที่เดียว):
 *   ความอึด    ระยะวิ่งสะสมที่อนุมัติ         เต็มที่ 200 กม.
 *   ความเร็ว   เพซเฉลี่ย (ต้องวิ่ง ≥ 3 ครั้ง)  4:00 = เต็ม, 9:00 = 0
 *   สม่ำเสมอ   สัปดาห์ที่มีการวิ่งใน 8 สัปดาห์ล่าสุด
 *   สมรรถภาพ   ผลทดสอบล่าสุด (2.4 กม., ดันพื้น, ลุกนั่ง)
 *   แต้มบุญ    ชม.ความดีหมวด 1–9 + ชม.วิ่งที่อนุมัติ  เต็มที่ 50 ชม.
 * นับเฉพาะรายการ "อนุมัติแล้ว" — รายการรอตรวจไม่เพิ่มพลัง (ตามนโยบายรออนุมัติจากแอดมิน)
 */
(function (root) {
  'use strict';
  const WEIGHTS = { endurance: 250, speed: 150, consistency: 100, fitness: 200, merit: 300 };
  const TARGET = { km: 200, bestPace: 4, worstPace: 9, meritHours: 50, weeks: 8,
    run2400Best: 10, run2400Worst: 18, pushupsFull: 60, situpsFull: 60 };
  const AURAS = [
    { min: 0, key: 'none', name: 'ยังไม่มีออร่า', color: 'rgba(148,163,184,0)' },
    { min: 10, key: 'mist', name: 'ออร่าจาง ๆ', color: 'rgba(148,197,255,0.45)' },
    { min: 20, key: 'silver', name: 'ออร่าเงิน', color: 'rgba(226,232,240,0.6)' },
    { min: 35, key: 'gold', name: 'ออร่าทอง', color: 'rgba(250,204,21,0.65)' },
    { min: 50, key: 'divine', name: 'ออร่าศักดิ์สิทธิ์', color: 'rgba(255,236,153,0.85)' },
  ];
  const LEVEL_NAMES = ['', 'นักฝึกหัด', 'นักวิ่งฝึกงาน', 'ปีกทองแดง', 'ปีกเงิน', 'เวชการบิน',
    'เทวทูต', 'ผู้บัญชาการ', 'อัศวินฟ้า', 'จอมทัพจิตอาสา', 'ตำนาน วพอ.'];

  const clamp01 = (x) => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
  const round1 = (x) => Math.round(x * 10) / 10;

  function isoWeekKey(dateStr) {
    const d = new Date(dateStr + 'T00:00:00Z');
    if (isNaN(d)) return '';
    const day = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - day + 3);
    const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
    const week = 1 + Math.round(((d - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
    return d.getUTCFullYear() + '-W' + week;
  }

  function compute({ runs = [], fitness = [], deedHours = 0, today = new Date() } = {}) {
    const approved = runs.filter((r) => r && r.status === 'approved' && r.distanceKm > 0);
    const pending = runs.filter((r) => r && r.status === 'pending');
    const totalKm = approved.reduce((a, r) => a + Number(r.distanceKm || 0), 0);
    const totalMin = approved.reduce((a, r) => a + Number(r.durationMin || 0), 0);
    const avgPace = approved.length && totalKm > 0 ? totalMin / totalKm : null;
    const runHours = approved.reduce((a, r) => a + Number(r.approvedHours || 0), 0);

    const weeks = new Set();
    for (let i = 0; i < TARGET.weeks; i++) {
      const d = new Date(today.getTime() - i * 7 * 86400000);
      weeks.add(isoWeekKey(d.toISOString().slice(0, 10)));
    }
    const activeWeeks = new Set(approved.map((r) => isoWeekKey(r.date)).filter((w) => weeks.has(w))).size;

    const latestFit = fitness.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] || null;
    let fitnessScore = 0, fitnessParts = 0;
    if (latestFit) {
      if (latestFit.run2400Min) { fitnessScore += clamp01((TARGET.run2400Worst - latestFit.run2400Min) / (TARGET.run2400Worst - TARGET.run2400Best)); fitnessParts++; }
      if (latestFit.pushups != null && latestFit.pushups !== '') { fitnessScore += clamp01(latestFit.pushups / TARGET.pushupsFull); fitnessParts++; }
      if (latestFit.situps != null && latestFit.situps !== '') { fitnessScore += clamp01(latestFit.situps / TARGET.situpsFull); fitnessParts++; }
    }
    const merit = Number(deedHours || 0) + runHours;

    const parts = {
      endurance: WEIGHTS.endurance * clamp01(totalKm / TARGET.km),
      speed: approved.length >= 3 && avgPace ? WEIGHTS.speed * clamp01((TARGET.worstPace - avgPace) / (TARGET.worstPace - TARGET.bestPace)) : 0,
      consistency: WEIGHTS.consistency * clamp01(activeWeeks / TARGET.weeks),
      fitness: fitnessParts ? WEIGHTS.fitness * (fitnessScore / 3) : 0,
      merit: WEIGHTS.merit * clamp01(merit / TARGET.meritHours),
    };
    Object.keys(parts).forEach((k) => { parts[k] = Math.round(parts[k]); });
    const score = Object.values(parts).reduce((a, b) => a + b, 0);
    const level = Math.min(10, Math.floor(score / 100) + 1);
    const aura = AURAS.filter((a) => merit >= a.min).pop();
    const nextAura = AURAS.find((a) => a.min > merit) || null;

    return {
      score, level, levelName: LEVEL_NAMES[level], nextLevelAt: level < 10 ? level * 100 : null,
      parts, max: WEIGHTS,
      totalKm: round1(totalKm), runs: approved.length, pendingRuns: pending.length,
      pendingKm: round1(pending.reduce((a, r) => a + Number(r.distanceKm || 0), 0)),
      pendingHours: pending.reduce((a, r) => a + Number(r.estimatedHours || 0), 0),
      avgPace, runHours, merit: round1(merit), activeWeeks, latestFit, aura, nextAura,
    };
  }

  function formatPace(minPerKm) {
    if (!minPerKm || !Number.isFinite(minPerKm)) return '–';
    const m = Math.floor(minPerKm), s = Math.round((minPerKm - m) * 60);
    return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, '0')}`;
  }

  // ระยะทางระหว่างพิกัด (เมตร) — ใช้ตอนจับ GPS ในแอป
  function haversine(a, b) {
    const R = 6371000, toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  const api = { compute, formatPace, haversine, isoWeekKey, WEIGHTS, AURAS, LEVEL_NAMES, TARGET };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Strength = api;
})(typeof window !== 'undefined' ? window : globalThis);
