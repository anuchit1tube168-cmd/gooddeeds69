/**
 * ui-adapt.js — ปรับหน้าตาให้เข้ากับอุปกรณ์ + กันตัวอักษรอ่านไม่ออกในโหมดกลางวัน/กลางคืน
 *
 * 1) html.in-line   เปิดใน LINE (LIFF) → ใช้หน้าตาแบบแอป LINE (macos.css ส่วน "LINE LIFF")
 *    html.is-touch  จอเล็ก/มือถือ
 * 2) Contrast guard: หลายหน้ามีสีพื้นเข้ม/สว่างเขียนตายตัว (inline style) ทำให้พอสลับธีมแล้ว
 *    ตัวอักษรกลืนกับพื้น — สคริปต์นี้วัด contrast จริงของแต่ละข้อความ ถ้าต่ำกว่าเกณฑ์จะสลับสีตัวอักษร
 *    ให้ตัดกับพื้นหลังที่อยู่ข้างใต้ (ไม่แก้สีพื้น ไม่แตะสีแบรนด์ที่อ่านได้อยู่แล้ว)
 */
(function () {
  'use strict';
  var root = document.documentElement;
  var ua = navigator.userAgent || '';
  if (/\bLine\//i.test(ua) || /[?&]liff\.state=|liff-redirect/.test(location.search)) root.classList.add('in-line');
  function markTouch() { root.classList.toggle('is-touch', window.innerWidth < 900); }
  markTouch();
  window.addEventListener('resize', markTouch, { passive: true });
  // LIFF ที่เปิดผ่าน in-app browser บางรุ่นไม่มี "Line/" ใน UA — ยืนยันซ้ำหลัง liff.init
  var liffTries = 0;
  (function checkLiff() {
    try { if (window.liff && liff.isInClient && liff.isInClient()) { root.classList.add('in-line'); return; } } catch (e) {}
    if (++liffTries < 10) setTimeout(checkLiff, 500);
  })();

  // ---------- Contrast guard ----------
  var MIN_RATIO = 3.6;
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, SVG: 1, CANVAS: 1, IMG: 1, VIDEO: 1, IFRAME: 1, svg: 1 };

  function parse(c) {
    var m = /rgba?\(([^)]+)\)/.exec(c || '');
    if (!m) return null;
    var p = m[1].split(/[ ,\/]+/).filter(Boolean).map(parseFloat);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  function lum(c) {
    function ch(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
  }
  function ratio(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function mix(top, bottom) {
    var a = top.a;
    return { r: top.r * a + bottom.r * (1 - a), g: top.g * a + bottom.g * (1 - a), b: top.b * a + bottom.b * (1 - a), a: 1 };
  }
  // สีแรกของ gradient (พื้นเข้มส่วนใหญ่ของระบบเป็น gradient)
  function gradientColor(img) {
    if (!img || img === 'none' || img.indexOf('url(') === 0) return null;
    var m = img.match(/rgba?\([^)]+\)/g);
    if (!m) return null;
    var cs = m.map(parse).filter(Boolean);
    if (!cs.length) return null;
    var r = 0, g = 0, b = 0, a = 0;
    cs.forEach(function (c) { r += c.r; g += c.g; b += c.b; a += c.a; });
    var n = cs.length;
    return { r: r / n, g: g / n, b: b / n, a: a / n };
  }
  function pageBase() {
    return root.getAttribute('data-theme') === 'day' ? { r: 238, g: 242, b: 248, a: 1 } : { r: 13, g: 26, b: 47, a: 1 };
  }
  // พื้นหลังจริงใต้ element: ไล่ขึ้นไปซ้อนสีกึ่งโปร่งจนถึงพื้นหน้า
  function backdrop(el, cache) {
    var layers = [];
    for (var n = el; n && n.nodeType === 1; n = n.parentElement) {
      if (cache.has(n)) { var base = cache.get(n); return compose(layers, base); }
      var cs = getComputedStyle(n);
      var c = parse(cs.backgroundColor);
      var g = gradientColor(cs.backgroundImage);
      var top = g && g.a > 0.05 ? g : c;
      if (top && top.a > 0.02) {
        layers.push(top);
        if (top.a >= 0.98) return compose(layers, null);
      }
    }
    return compose(layers, pageBase());
  }
  function compose(layers, base) {
    var col = base;
    for (var i = layers.length - 1; i >= 0; i--) col = col ? mix(layers[i], col) : layers[i];
    return col || pageBase();
  }

  function hasOwnText(el) {
    for (var c = el.firstChild; c; c = c.nextSibling) if (c.nodeType === 3 && c.nodeValue.trim()) return true;
    return false;
  }

  var freezeEl = null;
  // สไตล์ปิด transition ชั่วคราว (สลับ .disabled ไม่แตะ class ของ html จึงไม่วนกระตุ้น observer)
  function measureStyle() {
    if (!freezeEl) {
      freezeEl = document.createElement('style');
      freezeEl.textContent = '*,*::before,*::after{transition:none!important}';
      document.head.appendChild(freezeEl);
    }
    return freezeEl;
  }

  var running = false;
  var wantFreeze = false;
  var fullPending = true;       // ตรวจทั้งหน้า (ตอนโหลด/สลับธีม)
  var partialRoots = [];        // ตรวจเฉพาะส่วนที่เพิ่งถูกเพิ่ม (เนื้อหาจาก API/ตัวนับที่วาดใหม่)
  function collect(roots) {
    var out = [];
    roots.forEach(function (r) {
      if (!r.isConnected) return;
      out.push(r);
      var sub = r.getElementsByTagName('*');
      for (var i = 0; i < sub.length && out.length < 6000; i++) out.push(sub[i]);
    });
    return out;
  }
  function run() {
    running = false;
    if (!document.body) return;
    var full = fullPending;
    var roots = partialRoots;
    fullPending = false; partialRoots = [];
    if (!full && !roots.length) return;
    // ปิด transition ระหว่างวัด ไม่งั้นค่าสีที่อ่านได้เป็นค่ากลางทาง (หลังสลับธีมจะตัดสินผิด)
    // ปิด transition เฉพาะรอบหลังสลับธีม — รอบอื่นห้ามปิด เพราะจะตัดแอนิเมชันที่หน้ากำลังเล่นอยู่ทุกครั้งที่ตรวจ
    var freeze = measureStyle(); freeze.disabled = !wantFreeze; wantFreeze = false;
    var marked = full ? document.querySelectorAll('.cg-fix') : collect(roots).filter(function (e) { return e.classList.contains('cg-fix'); });
    // คืนค่าสีเดิมก่อนวัดใหม่ (inline !important ชนะทุกกฎ CSS จึงต้องเก็บค่าเดิมไว้คืน)
    for (var i = 0; i < marked.length; i++) {
      var m = marked[i];
      m.classList.remove('cg-fix');
      m.style.removeProperty('color'); m.style.removeProperty('-webkit-text-fill-color');
      var o = m.getAttribute('data-cg-orig');
      if (o) m.style.setProperty('color', o);
      m.removeAttribute('data-cg-orig');
    }
    var cache = new Map();
    var els = full ? document.body.getElementsByTagName('*') : collect(roots);
    var limit = Math.min(els.length, 6000); // กันหน้าใหญ่ผิดปกติ
    var fixes = [];
    for (var j = 0; j < limit; j++) {
      var el = els[j];
      if (SKIP[el.tagName] || !hasOwnText(el) || el.closest('[data-keep-color],.mac-traffic-lights')) continue;
      var cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      // ข้อความไล่สี (background-clip:text) ตัดสินไม่ได้ ข้าม
      if ((cs.webkitBackgroundClip || cs.backgroundClip) === 'text') continue;
      var fg = parse(cs.color);
      // ตัวอักษรจางโดยตั้งใจ (ลายน้ำ/ตกแต่ง) ไม่แตะ
      if (!fg || fg.a < 0.35 || parseFloat(cs.opacity) < 0.5) continue;
      var bg = backdrop(el, cache);
      var fgSolid = fg.a < 1 ? mix(fg, bg) : fg;
      if (ratio(fgSolid, bg) >= MIN_RATIO) continue;
      var dark = lum(bg) > 0.35;
      fixes.push([el, dark ? '#1d1d1f' : '#f2f5fb']);
    }
    freeze.disabled = true;
    // เขียนทีเดียวหลังอ่านครบ เลี่ยง layout thrash
    fixes.forEach(function (f) {
      var e = f[0];
      if (e.style.color) e.setAttribute('data-cg-orig', e.style.color);
      e.style.setProperty('color', f[1], 'important');
      e.style.setProperty('-webkit-text-fill-color', f[1], 'important');
      e.classList.add('cg-fix');
    });
  }
  function schedule(delay) {
    if (running) return;
    running = true;
    // requestIdleCallback ต้องมี timeout: หน้าที่มีแอนิเมชันตลอดจะไม่เคย idle ทำให้ไม่ได้ตรวจเลย
    setTimeout(function () {
      if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 250 }); else requestAnimationFrame(run);
    }, delay || 120);
  }

  function start() {
    schedule(60);
    // สลับธีม
    // สลับธีม: ตรวจทันที + ตรวจซ้ำหลังพื้นหลังเปลี่ยนเสร็จ
    var themeTimer;
    function onTheme() {
      wantFreeze = true; fullPending = true;
      schedule(30);
      clearTimeout(themeTimer);
      themeTimer = setTimeout(function () { schedule(0); }, 700);
    }
    new MutationObserver(onTheme).observe(root, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    new MutationObserver(onTheme).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    // เนื้อหาที่โหลดทีหลัง (ตาราง/การ์ดจาก API)
    // สนใจเฉพาะ element ที่เพิ่มเข้ามา (ข้อความนาฬิกา/ตัวนับที่เปลี่ยนทุกวินาทีไม่นับ)
    // และตรวจไม่ถี่กว่า 1 ครั้ง/วินาที กันมือถือรุ่นเก่าช้า
    var lastContentRun = 0;
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var added = muts[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          if (added[j].nodeType !== 1) continue;
          for (var k = j; k < added.length; k++) if (added[k].nodeType === 1) partialRoots.push(added[k]);
          for (var q = i + 1; q < muts.length; q++) for (var z = 0; z < muts[q].addedNodes.length; z++) if (muts[q].addedNodes[z].nodeType === 1) partialRoots.push(muts[q].addedNodes[z]);
          var wait = Math.max(250, 1000 - (Date.now() - lastContentRun));
          lastContentRun = Date.now() + wait;
          schedule(wait);
          return;
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('load', function () { fullPending = true; schedule(50); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.UIAdapt = { recheck: function () { fullPending = true; schedule(0); } };
})();
