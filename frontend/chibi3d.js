/**
 * chibi3d.js — ระบบ Chibi Hero 3D Animation
 * วิทยาลัยพยาบาลทหารอากาศ ปีการศึกษา 2569
 * 
 * Features:
 * - CSS 3D perspective floating animation
 * - Wing flapping keyframes
 * - Particle system (sparkles, orbs, stars)
 * - Level-up cinematic explosion effect
 * - Interactive hover 3D tilt (mouse parallax)
 * - Breathing idle animation
 * - Dynamic glow intensity by level
 */

class ChibiHero3D {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.level = 1;
    this.hours = 0;
    this.prevLevel = 1;
    this.mouseX = 0;
    this.mouseY = 0;
    this.particles = [];
    this.animFrame = null;
    this.canvas = null;
    this.ctx = null;
    this.initialized = false;

    this._buildDOM();
    this._buildCanvas();
    this._bindEvents();
    this._startLoop();
    this.initialized = true;
  }

  // ── DOM Structure ──────────────────────────────────────────────
  _buildDOM() {
    this.container.innerHTML = '';
    this.container.style.cssText = `
      position: relative;
      width: 220px;
      height: 220px;
      perspective: 800px;
      perspective-origin: 50% 50%;
      cursor: pointer;
      user-select: none;
    `;

    // 3D scene wrapper
    this.scene = document.createElement('div');
    this.scene.id = 'chibi-3d-scene';
    this.scene.style.cssText = `
      width: 100%; height: 100%;
      transform-style: preserve-3d;
      transition: transform 0.15s ease-out;
      position: relative;
    `;

    // Glow ring (back layer)
    this.glowRing = document.createElement('div');
    this.glowRing.style.cssText = `
      position: absolute;
      inset: 10px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(201,162,39,0.35) 0%, transparent 70%);
      transform: translateZ(-20px);
      animation: glowPulse 2s ease-in-out infinite;
    `;

    // Character image wrapper (for 3D tilt)
    this.charWrapper = document.createElement('div');
    this.charWrapper.style.cssText = `
      position: absolute;
      inset: 0;
      transform-style: preserve-3d;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // The character image
    this.charImg = document.createElement('img');
    this.charImg.style.cssText = `
      width: 140px;
      height: 140px;
      object-fit: contain;
      filter: drop-shadow(0 8px 24px rgba(201,162,39,0.6));
      transform: translateZ(30px);
      transition: filter 0.5s;
      image-rendering: crisp-edges;
    `;
    this.charImg.onerror = () => this._useFallbackEmoji();

    // Emoji fallback
    this.charEmoji = document.createElement('div');
    this.charEmoji.style.cssText = `
      font-size: 6rem;
      transform: translateZ(30px);
      display: none;
      line-height: 1;
      filter: drop-shadow(0 8px 24px rgba(201,162,39,0.6));
    `;

    // Canvas for particles (top layer)
    this.canvas = document.createElement('canvas');
    this.canvas.width = 220;
    this.canvas.height = 220;
    this.canvas.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 10;
    `;
    this.ctx = this.canvas.getContext('2d');

    // Level badge
    this.badge = document.createElement('div');
    this.badge.style.cssText = `
      position: absolute;
      bottom: 4px;
      left: 50%;
      transform: translateX(-50%) translateZ(40px);
      background: linear-gradient(135deg, #c9a227, #f0c849, #8b6914);
      color: #0a1628;
      font-weight: 900;
      font-size: 0.65rem;
      padding: 4px 12px;
      border-radius: 20px;
      white-space: nowrap;
      box-shadow: 0 2px 12px rgba(201,162,39,0.5);
      letter-spacing: 0.5px;
      font-family: 'Kanit', sans-serif;
      z-index: 5;
    `;

    // Assemble
    this.charWrapper.appendChild(this.charImg);
    this.charWrapper.appendChild(this.charEmoji);
    this.scene.appendChild(this.glowRing);
    this.scene.appendChild(this.charWrapper);
    this.scene.appendChild(this.badge);
    this.container.appendChild(this.scene);
    this.container.appendChild(this.canvas);

    // Inject CSS animations
    this._injectStyles();
  }

  _injectStyles() {
    if (document.getElementById('chibi3d-styles')) return;
    const style = document.createElement('style');
    style.id = 'chibi3d-styles';
    style.textContent = `
      @keyframes glowPulse {
        0%, 100% { opacity: 0.6; transform: translateZ(-20px) scale(1); }
        50% { opacity: 1; transform: translateZ(-20px) scale(1.08); }
      }
      @keyframes floatUpDown {
        0%, 100% { transform: translateY(0px) translateZ(30px); }
        50% { transform: translateY(-12px) translateZ(30px); }
      }
      @keyframes wingFlap {
        0%, 100% { transform: translateZ(30px) scaleX(1); }
        25% { transform: translateZ(30px) scaleX(1.05); }
        75% { transform: translateZ(30px) scaleX(0.96); }
      }
      @keyframes breathe {
        0%, 100% { transform: translateZ(30px) scale(1); }
        50% { transform: translateZ(30px) scale(1.03); }
      }
      @keyframes levelUpBurst {
        0% { transform: translateZ(30px) scale(1) rotate(0deg); filter: brightness(1); }
        20% { transform: translateZ(60px) scale(1.4) rotate(5deg); filter: brightness(2) saturate(2); }
        40% { transform: translateZ(60px) scale(0.9) rotate(-3deg); filter: brightness(1.8); }
        60% { transform: translateZ(50px) scale(1.2) rotate(2deg); filter: brightness(1.5); }
        100% { transform: translateZ(30px) scale(1) rotate(0deg); filter: brightness(1); }
      }
      @keyframes spin360 {
        from { transform: translateZ(30px) rotateY(0deg); }
        to { transform: translateZ(30px) rotateY(360deg); }
      }
      @keyframes badgePop {
        0% { transform: translateX(-50%) translateZ(40px) scale(0.5); opacity: 0; }
        70% { transform: translateX(-50%) translateZ(40px) scale(1.15); opacity: 1; }
        100% { transform: translateX(-50%) translateZ(40px) scale(1); opacity: 1; }
      }

      .chibi-idle {
        animation: floatUpDown 3s ease-in-out infinite, breathe 4s ease-in-out infinite;
      }
      .chibi-lv7-8 {
        animation: floatUpDown 2.5s ease-in-out infinite, wingFlap 1.8s ease-in-out infinite;
      }
      .chibi-levelup {
        animation: levelUpBurst 1.2s ease-in-out forwards !important;
      }
      .chibi-spin {
        animation: spin360 0.8s ease-in-out forwards !important;
      }
    `;
    document.head.appendChild(style);
  }

  _buildCanvas() {
    // Particle types
    this.PARTICLE_TYPES = {
      sparkle: { count: 8, size: [2, 5], speed: [0.5, 1.5], life: [60, 120], colors: ['#f0c849','#fff','#c9a227','#ffd700'] },
      orb:     { count: 4, size: [4, 8], speed: [0.2, 0.6], life: [80, 160], colors: ['rgba(59,130,246,0.7)','rgba(201,162,39,0.6)','rgba(168,85,247,0.6)'] },
      star:    { count: 12, size: [1, 3], speed: [0.8, 2.0], life: [40, 90], colors: ['#ffffff','#ffd700','#87ceeb'] },
      burst:   { count: 20, size: [3, 8], speed: [2, 5], life: [30, 60], colors: ['#ffd700','#ff6b35','#fff','#c9a227','#ff4757'] },
    };
  }

  // ── Event Binding ──────────────────────────────────────────────
  _bindEvents() {
    // Mouse parallax tilt
    this.container.addEventListener('mousemove', (e) => {
      const rect = this.container.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      this.mouseX = (e.clientX - cx) / (rect.width / 2);
      this.mouseY = (e.clientY - cy) / (rect.height / 2);
      this._applyTilt();
    });

    this.container.addEventListener('mouseleave', () => {
      this.mouseX = 0;
      this.mouseY = 0;
      this.scene.style.transform = 'rotateX(0deg) rotateY(0deg)';
    });

    // Click → spin + burst
    this.container.addEventListener('click', () => {
      this._playLevelUpAnim(false);
    });

    // Touch support
    this.container.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this._playLevelUpAnim(false);
    }, { passive: false });
  }

  _applyTilt() {
    const maxTilt = 18;
    const rx = -this.mouseY * maxTilt;
    const ry = this.mouseX * maxTilt;
    this.scene.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
  }

  static getSvgDataUrl(level) {
    const wingsColors = [
      ['#ffffff', '#e2e8f0'], // 1
      ['#93c5fd', '#60a5fa'], // 2
      ['#cd7f32', '#b45309'], // 3
      ['#e2e8f0', '#94a3b8'], // 4
      ['#fde047', '#eab308'], // 5
      ['#38bdf8', '#818cf8'], // 6
      ['#fbbf24', '#f59e0b'], // 7
      ['#f43f5e', '#fbbf24'], // 8
    ];
    const lv = Math.max(1, Math.min(8, parseInt(level) || 1));
    const wCol = wingsColors[lv - 1] || wingsColors[0];
    const hasCrown = lv >= 7;
    const hasHalo = lv >= 5;
    const hasStethoscope = lv >= 3;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
      <defs>
        <linearGradient id="wingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${wCol[0]}"/>
          <stop offset="100%" stop-color="${wCol[1]}"/>
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.3"/>
        </filter>
      </defs>
      ${hasHalo ? '<circle cx="80" cy="28" r="20" fill="none" stroke="#fde047" stroke-width="3.5" filter="url(#shadow)"/>' : ''}
      <g filter="url(#shadow)">
        <path d="M 52 75 C 20 60, 10 30, 25 18 C 38 8, 48 35, 56 62 Z" fill="url(#wingGrad)"/>
        <path d="M 45 80 C 15 80, 5 60, 15 48 C 26 38, 38 60, 48 72 Z" fill="url(#wingGrad)" opacity="0.85"/>
        <path d="M 108 75 C 140 60, 150 30, 135 18 C 122 8, 112 35, 104 62 Z" fill="url(#wingGrad)"/>
        <path d="M 115 80 C 145 80, 155 60, 145 48 C 134 38, 122 60, 112 72 Z" fill="url(#wingGrad)" opacity="0.85"/>
      </g>
      <path d="M 58 95 Q 80 88 102 95 L 110 135 Q 80 142 50 135 Z" fill="#ffffff" filter="url(#shadow)"/>
      <path d="M 72 94 L 80 108 L 88 94 Z" fill="#1e3a8a"/>
      <path d="M 78 108 L 82 108 L 80 120 Z" fill="#c9a227"/>
      <circle cx="80" cy="65" r="32" fill="#ffe4d6" filter="url(#shadow)"/>
      <path d="M 48 65 Q 46 38 80 38 Q 114 38 112 65 Q 112 78 106 82 Q 80 76 54 82 Q 48 78 48 65 Z" fill="#3b2716"/>
      <path d="M 50 56 Q 65 48 80 56 Q 95 48 110 56 Q 105 44 80 44 Q 55 44 50 56 Z" fill="#523824"/>
      <path d="M 60 38 Q 80 30 100 38 L 96 24 Q 80 20 64 24 Z" fill="#ffffff" filter="url(#shadow)"/>
      <path d="M 64 34 Q 80 30 96 34" stroke="#1e3a8a" stroke-width="2.5" fill="none"/>
      <path d="M 78 26 L 82 26 M 80 24 L 80 28" stroke="#dc2626" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="68" cy="66" rx="4.5" ry="6" fill="#1e293b"/>
      <ellipse cx="92" cy="66" rx="4.5" ry="6" fill="#1e293b"/>
      <circle cx="69.5" cy="64" r="1.8" fill="#ffffff"/>
      <circle cx="93.5" cy="64" r="1.8" fill="#ffffff"/>
      <ellipse cx="62" cy="73" rx="4.5" ry="2.5" fill="#f87171" opacity="0.6"/>
      <ellipse cx="98" cy="73" rx="4.5" ry="2.5" fill="#f87171" opacity="0.6"/>
      <path d="M 75 74 Q 80 79 85 74" fill="none" stroke="#b91c1c" stroke-width="2" stroke-linecap="round"/>
      ${hasCrown ? '<path d="M 70 20 L 73 10 L 80 16 L 87 10 L 90 20 Z" fill="#facc15" stroke="#ca8a04" stroke-width="1.5" filter="url(#shadow)"/>' : ''}
      ${hasStethoscope ? '<path d="M 65 98 Q 80 122 95 98" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round"/>' : ''}
    </svg>`;

    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  // ── Public API ─────────────────────────────────────────────────
  setLevel(level, hours, options = {}) {
    const prevLv = this.level;
    this.level = Math.max(1, Math.min(8, level));
    this.hours = hours;

    // Use SVG vector avatar for crisp rendering without 404
    this.charImg.src = ChibiHero3D.getSvgDataUrl(this.level);
    this.charImg.style.display = 'block';
    this.charEmoji.style.display = 'none';

    // Update badge
    const levelNames = [
      '', 'Lv.1 ฝึกหัด', 'Lv.2 ฝึกงาน', 'Lv.3 ปีกทองแดง',
      'Lv.4 ปีกเงิน', 'Lv.5 เวชการบิน', 'Lv.6 เทวทูต',
      'Lv.7 ผู้บัญชาการ', 'Lv.8 ✅ ULTIMATE'
    ];
    this.badge.textContent = levelNames[this.level] || `Lv.${this.level}`;

    // Glow intensity by level
    const glowColors = [
      '', 
      'rgba(139,90,43,0.3)',   // lv1 bronze
      'rgba(139,90,43,0.35)',  // lv2
      'rgba(180,110,50,0.4)',  // lv3 copper
      'rgba(192,192,192,0.4)', // lv4 silver
      'rgba(201,162,39,0.45)', // lv5 gold
      'rgba(100,180,255,0.5)', // lv6 celestial
      'rgba(201,162,39,0.6)',  // lv7 royal gold
      'rgba(255,215,0,0.7)',   // lv8 ultimate
    ];
    this.glowRing.style.background = `radial-gradient(circle, ${glowColors[this.level]} 0%, transparent 70%)`;

    // Idle animation class
    this.charImg.className = '';
    this.charEmoji.className = '';
    if (this.level >= 7) {
      this.charImg.classList.add('chibi-lv7-8');
      this.charEmoji.classList.add('chibi-lv7-8');
    } else {
      this.charImg.classList.add('chibi-idle');
      this.charEmoji.classList.add('chibi-idle');
    }

    // Badge color by level
    const badgeGrads = [
      '',
      'linear-gradient(135deg,#8b5a2b,#cd853f)',
      'linear-gradient(135deg,#8b5a2b,#daa520)',
      'linear-gradient(135deg,#cd7f32,#f4a460)',
      'linear-gradient(135deg,#a8a8a8,#e8e8e8)',
      'linear-gradient(135deg,#c9a227,#f0c849)',
      'linear-gradient(135deg,#3b82f6,#c9a227)',
      'linear-gradient(135deg,#c9a227,#ffd700)',
      'linear-gradient(135deg,#ffd700,#ff6b35,#c9a227)',
    ];
    this.badge.style.background = badgeGrads[this.level] || badgeGrads[8];
    this.badge.style.color = this.level >= 4 ? '#0a1628' : '#fff';

    // Level up animation
    if (prevLv < this.level && this.initialized) {
      this._playLevelUpAnim(true);
    }

    return this;
  }

  // ── Animations ─────────────────────────────────────────────────
  _playLevelUpAnim(isActualLevelUp) {
    const el = this.charImg.style.display !== 'none' ? this.charImg : this.charEmoji;

    // Spin first
    el.classList.remove('chibi-levelup', 'chibi-spin', 'chibi-idle', 'chibi-lv7-8');
    el.classList.add('chibi-spin');

    setTimeout(() => {
      el.classList.remove('chibi-spin');
      el.classList.add('chibi-levelup');

      // Burst particles
      const type = isActualLevelUp ? 'burst' : 'sparkle';
      const count = isActualLevelUp ? 25 : 12;
      this._spawnBurst(110, 110, count, type);

      setTimeout(() => {
        el.classList.remove('chibi-levelup');
        el.classList.add(this.level >= 7 ? 'chibi-lv7-8' : 'chibi-idle');
      }, 1200);
    }, 800);
  }

  _useFallbackEmoji() {
    const emojis = ['','👶','📝','🩺','🧑‍⚕️','✈️','👼','👑','🌟'];
    this.charImg.style.display = 'none';
    this.charEmoji.style.display = 'block';
    this.charEmoji.textContent = emojis[this.level] || '⭐';
    this.charEmoji.classList.add(this.level >= 7 ? 'chibi-lv7-8' : 'chibi-idle');
  }

  // ── Particle System ────────────────────────────────────────────
  _spawnParticle(type = 'sparkle', x, y) {
    const cfg = this.PARTICLE_TYPES[type];
    const color = cfg.colors[Math.floor(Math.random() * cfg.colors.length)];
    const size = cfg.size[0] + Math.random() * (cfg.size[1] - cfg.size[0]);
    const speed = cfg.speed[0] + Math.random() * (cfg.speed[1] - cfg.speed[0]);
    const life = Math.floor(cfg.life[0] + Math.random() * (cfg.life[1] - cfg.life[0]));
    const angle = Math.random() * Math.PI * 2;

    this.particles.push({
      x: x ?? (60 + Math.random() * 100),
      y: y ?? (60 + Math.random() * 100),
      vx: Math.cos(angle) * speed * (type === 'burst' ? 1 : 0.3),
      vy: Math.sin(angle) * speed * (type === 'burst' ? 1 : 0.3) - (type !== 'burst' ? speed : 0),
      size,
      color,
      life,
      maxLife: life,
      type,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.15,
    });
  }

  _spawnBurst(x, y, count, type) {
    for (let i = 0; i < count; i++) {
      this._spawnParticle(type, x, y);
    }
  }

  _spawnAmbient() {
    // Ambient particles based on level
    if (this.particles.length > 60) return;
    const spawnChance = 0.04 + this.level * 0.025;
    if (Math.random() < spawnChance) {
      const type = this.level >= 6 ? (Math.random() < 0.4 ? 'orb' : 'sparkle') : 'sparkle';
      this._spawnParticle(type);
    }
    if (this.level >= 8 && Math.random() < 0.08) {
      this._spawnParticle('star');
    }
  }

  _updateParticles() {
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy -= 0.02; // slight gravity / float up
      p.life--;
      p.rotation += p.rotSpeed;
      p.vx *= 0.98;
      return p.life > 0 && p.x > -10 && p.x < 230 && p.y > -10 && p.y < 230;
    });
  }

  _drawParticles() {
    this.ctx.clearRect(0, 0, 220, 220);

    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);

      if (p.type === 'sparkle' || p.type === 'burst') {
        // 4-point star sparkle
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        const s = p.size;
        this.ctx.moveTo(0, -s * 2);
        this.ctx.lineTo(s * 0.5, -s * 0.5);
        this.ctx.lineTo(s * 2, 0);
        this.ctx.lineTo(s * 0.5, s * 0.5);
        this.ctx.lineTo(0, s * 2);
        this.ctx.lineTo(-s * 0.5, s * 0.5);
        this.ctx.lineTo(-s * 2, 0);
        this.ctx.lineTo(-s * 0.5, -s * 0.5);
        this.ctx.closePath();
        this.ctx.fill();
      } else if (p.type === 'orb') {
        // Glowing orb
        const grad = this.ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
        grad.addColorStop(0, 'rgba(255,255,255,0.9)');
        grad.addColorStop(0.5, p.color);
        grad.addColorStop(1, 'transparent');
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (p.type === 'star') {
        // Simple circle star
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    }
  }

  // ── Main Loop ─────────────────────────────────────────────────
  _startLoop() {
    const loop = () => {
      this._spawnAmbient();
      this._updateParticles();
      this._drawParticles();
      this.animFrame = requestAnimationFrame(loop);
    };
    this.animFrame = requestAnimationFrame(loop);
  }

  destroy() {
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
  }
}

// ── Auto-init helper ──────────────────────────────────────────────
function initChibiHero(containerId, level, hours) {
  const hero = new ChibiHero3D(containerId);
  hero.setLevel(level, hours);
  return hero;
}

window.ChibiHero3D = ChibiHero3D;
window.initChibiHero = initChibiHero;
