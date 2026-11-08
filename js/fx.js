'use strict';
/* =====================================================================
   MÉTRO DES MOTS — görsel ve hareket katmanı
   Yaşayan Paris (saatle değişen gökyüzü, ay evresi, geçen metro, ışıldayan kule),
   kapı açılışı, parçacıklar, uçan XP, dokunsal geri bildirim, sayfa geçişleri.
   ===================================================================== */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const IC = (n, c) => `<svg class="ic ${c || ''}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- dokunsal geri bildirim (Android) ---------- */
function haptic(kind) {
  if (!S.p.haptic || !navigator.vibrate) return;
  const P = { tap: 8, ok: 14, no: [28, 60, 28], big: [14, 40, 14, 40, 70], warn: 45 };
  try { navigator.vibrate(P[kind] || 10); } catch (e) {}
}

/* ---------- parçacık motoru (konfeti + kıvılcım) ---------- */
const PX = { list: [], raf: 0, ctx: null, w: 0, h: 0 };
function pxCtx() {
  const cv = document.getElementById('confetti'); if (!cv || !cv.getContext) return null;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (!PX.ctx || PX.w !== innerWidth || PX.h !== innerHeight) {
    PX.ctx = cv.getContext('2d'); PX.w = innerWidth; PX.h = innerHeight;
    cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr); PX.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  return PX.ctx;
}
function pxRun() {
  if (PX.raf || !pxCtx()) return;
  let last = performance.now();
  const step = t => {
    const dt = Math.min(2.5, (t - last) / 16.67); last = t;
    const ctx = PX.ctx; ctx.clearRect(0, 0, PX.w, PX.h);
    PX.list = PX.list.filter(p => (p.life -= dt) > 0 && p.y < PX.h + 60);
    for (const p of PX.list) {
      if (p.k === 'c') {
        p.vy += 0.24 * dt; p.vx *= Math.pow(0.985, dt); p.vy *= Math.pow(0.985, dt);
        p.x += (p.vx + Math.sin(p.ph) * 0.9) * dt; p.y += p.vy * dt; p.ph += p.vph * dt; p.r += p.vr * dt;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(1, Math.max(0.12, Math.abs(Math.cos(p.ph))));
        ctx.globalAlpha = Math.min(1, p.life / 30); ctx.fillStyle = p.c;
        if (p.star) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5, rr = i % 2 ? p.s * .42 : p.s; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
        else { ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); if (p.c === '#FFFFFF') { ctx.strokeStyle = '#C5CEDB'; ctx.lineWidth = .8; ctx.strokeRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); } }
        ctx.restore();
      } else {
        p.vy += 0.12 * dt; p.vx *= Math.pow(0.95, dt); p.vy *= Math.pow(0.95, dt); p.x += p.vx * dt; p.y += p.vy * dt;
        const a = Math.max(0, p.life / p.l0);
        ctx.globalAlpha = a; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (0.4 + a * 0.6), 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      }
    }
    if (PX.list.length) PX.raf = requestAnimationFrame(step); else { PX.raf = 0; ctx.clearRect(0, 0, PX.w, PX.h); }
  };
  PX.raf = requestAnimationFrame(step);
}
const CONF_COLS = ['#2350C8', '#FFFFFF', '#DF3E2C', '#F1B400', '#12A05C', '#B5318A', '#6A3BD6'];
function confetti(n, opt) {
  if (REDUCED || !pxCtx()) return;
  n = n || 120; opt = opt || {};
  const sides = n >= 140;
  for (let i = 0; i < n; i++) {
    let x, y, vx, vy;
    if (sides && i % 3 !== 0) { const L = i % 2 === 0; x = L ? -10 : innerWidth + 10; y = innerHeight * (0.55 + Math.random() * .2); vx = (L ? 1 : -1) * (6 + Math.random() * 9); vy = -9 - Math.random() * 9; }
    else { x = (opt.x ?? innerWidth / 2) + (Math.random() - .5) * 90; y = opt.y ?? innerHeight * .34; vx = (Math.random() - .5) * 15; vy = -Math.random() * 12 - 5; }
    PX.list.push({ k: 'c', x, y, vx, vy, s: 7 + Math.random() * 7, r: Math.random() * 6, vr: (Math.random() - .5) * .25, ph: Math.random() * 6, vph: .08 + Math.random() * .14, c: CONF_COLS[i % CONF_COLS.length], star: Math.random() < .12, life: 170 + Math.random() * 40 });
  }
  pxRun();
}
function sparks(x, y, n, cols) {
  if (REDUCED || !pxCtx()) return;
  cols = cols || ['#F1B400', '#12A05C', '#FFFFFF', '#2350C8'];
  for (let i = 0; i < (n || 14); i++) {
    const a = Math.random() * Math.PI * 2, v = 2.5 + Math.random() * 5.5;
    PX.list.push({ k: 's', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, s: 2 + Math.random() * 2.6, c: cols[i % cols.length], life: 34 + Math.random() * 18, l0: 52 });
  }
  pxRun();
}
function sparksAt(el, n, cols) { if (!el) return; const r = el.getBoundingClientRect(); sparks(r.left + r.width / 2, r.top + r.height / 2, n, cols); }

/* ---------- uçan jeton (+XP), zıplama, sallanma ---------- */
function flyTo(fromEl, toEl, text, cls, done) {
  if (!fromEl || !document.body.animate) { done && done(); return; }
  const a = fromEl.getBoundingClientRect();
  const el = document.createElement('div'); el.className = 'fly ' + (cls || ''); el.textContent = text; el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  const x0 = a.left + a.width / 2, y0 = a.top + Math.min(a.height / 2, 40);
  const b = toEl && toEl.getBoundingClientRect();
  if (REDUCED || !b || !b.width) {
    el.style.left = x0 + 'px'; el.style.top = y0 + 'px';
    const an = el.animate([{ transform: 'translate(-50%,-50%) scale(.7)', opacity: 0 }, { transform: 'translate(-50%,-90%) scale(1)', opacity: 1, offset: .25 }, { transform: 'translate(-50%,-230%) scale(1)', opacity: 0 }], { duration: REDUCED ? 500 : 900, easing: 'cubic-bezier(.2,.7,.2,1)' });
    an.onfinish = () => { el.remove(); done && done(); };
    return;
  }
  const x1 = b.left + b.width / 2, y1 = b.top + b.height / 2;
  const mx = (x0 + x1) / 2 + (x1 > x0 ? -60 : 60), my = Math.min(y0, y1) - 90;
  const k = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12, u = 1 - t, x = u * u * x0 + 2 * u * t * mx + t * t * x1, y = u * u * y0 + 2 * u * t * my + t * t * y1;
    k.push({ transform: `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%) scale(${(1.1 - t * .45).toFixed(2)})`, opacity: i === 12 ? .3 : 1 });
  }
  el.style.left = '0px'; el.style.top = '0px';
  const an = el.animate(k, { duration: 760, easing: 'cubic-bezier(.45,0,.25,1)' });
  an.onfinish = () => { el.remove(); bump(toEl); done && done(); };
}
function bump(el) { if (!el || !el.animate || REDUCED) return; el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.22)' }, { transform: 'scale(1)' }], { duration: 340, easing: 'cubic-bezier(.3,1.6,.5,1)' }); }
function shake(el) { if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 460); }
function outAnim(el, dir, cb) {
  if (!el || !el.animate || REDUCED) { cb(); return; }
  const x = dir === 'l' ? '-115%' : dir === 'r' ? '115%' : '0', r = dir === 'l' ? -10 : dir === 'r' ? 10 : 0;
  const an = el.animate([{ transform: getComputedStyle(el).transform === 'none' ? 'none' : getComputedStyle(el).transform, opacity: 1 }, { transform: `translateX(${x}) rotate(${r}deg)`, opacity: dir === 'u' ? 0 : .2 }], { duration: 230, easing: 'cubic-bezier(.4,0,.8,.6)', fill: 'forwards' });
  an.onfinish = cb;
}

/* ---------- sayılar ---------- */
const COUNTS = Object.create(null);
function countUps(root) {
  $$('[data-count]', root).forEach(el => {
    const to = +el.dataset.count, key = el.dataset.ck || '', from = key in COUNTS ? COUNTS[key] : 0;
    COUNTS[key] = to;
    const fmt = v => (el.dataset.pre || '') + Math.round(v).toLocaleString('tr-TR') + (el.dataset.suf || '');
    if (REDUCED || from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), ms = Math.min(1100, 420 + Math.abs(to - from) * 8);
    el.textContent = fmt(from);
    const f = t => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (to - from) * e); if (k < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
  $$('[data-ring]', root).forEach(c => {
    const off = c.getAttribute('data-ring'); if (REDUCED) { c.style.strokeDashoffset = off; return; }
    requestAnimationFrame(() => requestAnimationFrame(() => { c.style.strokeDashoffset = off; }));
  });
  $$('[data-w]', root).forEach(b => { const w = b.getAttribute('data-w'); if (REDUCED) { b.style.width = w; return; } requestAnimationFrame(() => requestAnimationFrame(() => { b.style.width = w; })); });
}

/* ---------- sayfa geçişleri (View Transitions) ---------- */
function vt(update, dir) {
  if (REDUCED || !document.startViewTransition || document.visibilityState !== 'visible') { update(); return; }
  document.documentElement.dataset.vdir = dir || '';
  try { document.startViewTransition(update); } catch (e) { update(); }
}

/* =====================================================================
   YAŞAYAN PARİS — gökyüzü saatin kendisi
   ===================================================================== */
function solarTimes(d) {
  const tz = -d.getTimezoneOffset() / 60;
  const lat = tz === 3 ? 41.0 : 45, lon = tz === 3 ? 29.0 : tz * 15;
  const n = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
  const g = 2 * Math.PI / 365 * (n - 1);
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const R = Math.PI / 180, phi = lat * R;
  const c = Math.max(-1, Math.min(1, Math.cos(90.833 * R) / (Math.cos(phi) * Math.cos(dec)) - Math.tan(phi) * Math.tan(dec)));
  const ha = Math.acos(c) / R;
  return { rise: 720 - 4 * (lon + ha) - eq + tz * 60, set: 720 - 4 * (lon - ha) - eq + tz * 60 };
}
function skyPhase(d) {
  d = d || new Date();
  const { rise, set } = solarTimes(d), m = d.getHours() * 60 + d.getMinutes();
  if (m >= rise - 75 && m < rise + 30) return 'dawn';
  if (m >= rise + 30 && m < set - 75) return 'day';
  if (m >= set - 75 && m < set + 15) return 'golden';
  if (m >= set + 15 && m < set + 75) return 'blue';
  return (m >= 60 && m < rise - 75) ? 'late' : 'night';
}
const SKY = {
  late:   { top: '#050A22', mid: '#0D1944', low: '#203268', ink: 'light', stars: 1, moon: 1, sun: 0, win: .07, tower: 'dim', cloud: '#2A3866', cO: .32, far: '#16214A', fac: '#1B2650', roof: '#111938', woff: '#24315E', won: '#FFCF6E', steel: '#141C38', stone: '#1D2747', water1: '#0B1638', water2: '#050B22', tree: '#0E1C2E', train: '#B8C0D2', tw: '#FFE4A0' },
  night:  { top: '#081443', mid: '#182B70', low: '#3A4E98', ink: 'light', stars: 1, moon: 1, sun: 0, win: .38, tower: 'gold', cloud: '#2E3E74', cO: .38, far: '#1C2858', fac: '#1F2B58', roof: '#141D40', woff: '#27356A', won: '#FFD27A', steel: '#17203F', stone: '#222D52', water1: '#0E1C4A', water2: '#060C28', tree: '#102033', train: '#C4CBDA', tw: '#FFE6A3' },
  dawn:   { top: '#283B7E', mid: '#B57AA6', low: '#FFC38C', ink: 'light', stars: .35, moon: .7, sun: 1, win: .16, tower: 'dim', cloud: '#F3B9B4', cO: .7, far: '#8C7DA6', fac: '#C9A9A4', roof: '#6A6A92', woff: '#9C93B6', won: '#FFD27A', steel: '#4A4C6E', stone: '#9D8D9F', water1: '#C58E9F', water2: '#5A5A8C', tree: '#4E5A5E', train: '#EEF0F4', tw: '#3A4466' },
  day:    { top: '#5B98E8', mid: '#A3CDF5', low: '#E2F2FF', ink: 'dark', stars: 0, moon: 0, sun: 1, win: 0, tower: 'day', cloud: '#FFFFFF', cO: .92, far: '#A9BEDA', fac: '#EBDDC4', roof: '#6F809D', woff: '#9DB3CC', won: '#FFE6A3', steel: '#3F5350', stone: '#CDBFA6', water1: '#7FAEDC', water2: '#3F6EA8', tree: '#4F7F55', train: '#F3F5F8', tw: '#2B3A5C' },
  golden: { top: '#4860B8', mid: '#EE9E7E', low: '#FFD68C', ink: 'light', stars: 0, moon: 0, sun: 1, win: .12, tower: 'day', cloud: '#FFD9C2', cO: .85, far: '#B58FA0', fac: '#E8BF95', roof: '#6E6A8F', woff: '#B79A9E', won: '#FFD27A', steel: '#4A4A5E', stone: '#C9A184', water1: '#E59C83', water2: '#6C5F9A', tree: '#5F6B4E', train: '#F6EFE6', tw: '#3A3F5C' },
  blue:   { top: '#152568', mid: '#4757A6', low: '#E08F7A', ink: 'light', stars: .55, moon: 1, sun: 0, win: .34, tower: 'gold', cloud: '#5A64A6', cO: .5, far: '#33407A', fac: '#36417A', roof: '#232C5C', woff: '#3E4A86', won: '#FFD27A', steel: '#1F2850', stone: '#3A4372', water1: '#3B4B92', water2: '#141E52', tree: '#1C2B3E', train: '#D2D7E4', tw: '#FFE6A3' }
};
const MOON_NAMES = [['Nouvelle lune', 'yeni ay'], ['Premier croissant', 'büyüyen hilal'], ['Premier quartier', 'ilk dördün'], ['Lune gibbeuse croissante', 'büyüyen şişkin ay'], ['Pleine lune', 'dolunay'], ['Lune gibbeuse décroissante', 'küçülen şişkin ay'], ['Dernier quartier', 'son dördün'], ['Dernier croissant', 'küçülen hilal']];
function moonAge(d) { const syn = 29.530588853, ref = Date.UTC(2000, 0, 6, 18, 14); return ((((d || new Date()) - ref) / 86400000) % syn + syn) % syn; }
function moonName(age) { const i = Math.floor(((age / 29.530588853) * 8 + 0.5)) % 8; return MOON_NAMES[i]; }
function moonPath(cx, cy, r, age) {
  const p = age / 29.530588853, k = Math.cos(2 * Math.PI * p), rx = Math.max(0.01, Math.abs(k) * r), wax = p < .5, cres = k > 0;
  const top = `${cx} ${cy - r}`, bot = `${cx} ${cy + r}`;
  return `M${top} A${r} ${r} 0 0 ${wax ? 1 : 0} ${bot} A${rx.toFixed(2)} ${r} 0 0 ${wax ? (cres ? 0 : 1) : (cres ? 1 : 0)} ${top} Z`;
}
const TOWER_X = 690, TOWER_Y = 306, TOWER_S = 0.94;
const TOWER_D = 'M-66 0C-52-22-41-48-36-70H-43V-78H43V-70H36C41-48 52-22 66 0H47C36-30-36-30-47 0Z M-31-78L-21-140H-26V-147H26V-140H21L31-78Z M-15-147L-5-238H5L15-147Z M-8-238V-251H8V-238Z M-1.6-251V-282H1.6V-251Z';
const CITY = (() => {
  const r = rng(1789), out = []; let x = -16;
  while (x < 1216) {
    if (x >= 576 && x < 816) { x = 816; continue; }
    const w = 16 * (4 + Math.floor(r() * 3)), rows = 3 + Math.floor(r() * 3);
    out.push({ x, w, rows, roof: 14 + Math.floor(r() * 2) * 5, chim: r() < .75, cx: r(), dorm: r() < .85 });
    x += w;
  }
  return out;
})();
function parisSVG(d, opts) {
  d = d || new Date(); opts = opts || {};
  const ph = opts.phase || skyPhase(d), K = SKY[ph], hr = d.getHours(), mn = d.getMinutes();
  const night = ph === 'night' || ph === 'late' || ph === 'blue';
  const sparkle = opts.sparkle || ((ph === 'night' || ph === 'blue') && mn < 5 && (hr >= 17 || hr < 1));
  const seedDay = hashStr(ymd(d) + ph), r = rng(seedDay), rs = rng(42);
  const base = 300;
  let o = `<svg class="paris-svg" viewBox="0 0 1200 380" preserveAspectRatio="xMidYMax slice" role="img" aria-label="Paris silüeti: ${ph === 'day' ? 'gündüz' : ph === 'dawn' ? 'şafak' : ph === 'golden' ? 'gün batımı' : ph === 'blue' ? 'alacakaranlık' : 'gece'}">
  <defs>
    <linearGradient id="pSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${K.top}"/><stop offset=".62" stop-color="${K.mid}"/><stop offset="1" stop-color="${K.low}"/></linearGradient>
    <linearGradient id="pWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${K.water1}"/><stop offset="1" stop-color="${K.water2}"/></linearGradient>
    <radialGradient id="pGlow"><stop offset="0" stop-color="#FFD27A" stop-opacity=".55"/><stop offset="1" stop-color="#FFD27A" stop-opacity="0"/></radialGradient>
    <radialGradient id="pSunG"><stop offset="0" stop-color="#FFF6D8" stop-opacity=".95"/><stop offset=".35" stop-color="#FFE29A" stop-opacity=".5"/><stop offset="1" stop-color="#FFE29A" stop-opacity="0"/></radialGradient>
    <radialGradient id="pMoonG"><stop offset="0" stop-color="#F4F1FF" stop-opacity=".35"/><stop offset="1" stop-color="#F4F1FF" stop-opacity="0"/></radialGradient>
    <pattern id="pWin" width="16" height="20" patternUnits="userSpaceOnUse"><rect x="4" y="5" width="7" height="11" rx="1" fill="${K.woff}"/></pattern>
    <pattern id="pLat" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 0L5 5M5 0L0 5" stroke="${night ? '#FFF1C4' : '#FFFFFF'}" stroke-opacity="${night ? .35 : .18}" stroke-width=".6"/></pattern>
    <linearGradient id="pBeam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFF3C8" stop-opacity=".55"/><stop offset="1" stop-color="#FFF3C8" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="1200" height="380" fill="url(#pSky)"/>`;
  // yıldızlar
  if (K.stars) {
    o += `<g class="p-stars" opacity="${K.stars}">`;
    for (let i = 0; i < 70; i++) {
      const x = rs() * 1200, y = rs() * 190, s = .5 + rs() * 1.3, tw = i % 4 === 0;
      o += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${s.toFixed(2)}" fill="#fff"${tw ? ` class="p-tw" style="animation-delay:-${(rs() * 5).toFixed(2)}s;animation-duration:${(2.6 + rs() * 3).toFixed(2)}s"` : ` opacity="${(.45 + rs() * .5).toFixed(2)}"`}/>`;
    }
    o += `</g>`;
  }
  // güneş / ay
  if (K.sun) {
    const sy = ph === 'day' ? 74 : 196, sx = ph === 'dawn' ? 470 : ph === 'golden' ? 905 : 840;
    o += `<g class="p-sun"><circle cx="${sx}" cy="${sy}" r="120" fill="url(#pSunG)"/><circle cx="${sx}" cy="${sy}" r="${ph === 'day' ? 26 : 34}" fill="${ph === 'day' ? '#FFF4CC' : '#FFE0A0'}"/></g>`;
  }
  if (K.moon) {
    const age = moonAge(d), mx = 842, my = 74, mr = 17;
    o += `<g class="p-moon" data-moon opacity="${K.moon}" style="cursor:pointer"><circle cx="${mx}" cy="${my}" r="60" fill="url(#pMoonG)"/>
      <circle cx="${mx}" cy="${my}" r="${mr}" fill="#F4F1FF" opacity=".10"/>
      <path d="${moonPath(mx, my, mr, age)}" fill="#F7F3E4"/>
      <circle cx="${mx}" cy="${my}" r="26" fill="transparent"><title>${moonName(age)[0]} · ${moonName(age)[1]}</title></circle></g>`;
  }
  // bulutlar
  const cl = [[70, 1.15, 150, -40], [118, .8, 190, -120], [46, .6, 120, -70], [150, .95, 230, -10]];
  o += `<g class="p-clouds" opacity="${K.cO}">`;
  cl.forEach(([y, s, dur, del], i) => {
    o += `<g class="p-cloud" style="animation-duration:${dur}s;animation-delay:${del}s"><g transform="translate(0 ${y}) scale(${s})" fill="${K.cloud}">
      <ellipse cx="60" cy="20" rx="60" ry="15"/><ellipse cx="40" cy="10" rx="28" ry="18"/><ellipse cx="78" cy="6" rx="32" ry="20"/><ellipse cx="108" cy="16" rx="26" ry="13"/></g></g>`;
  });
  o += `</g>`;
  // uzak siluet: kubbeler, kuleler
  o += `<path class="p-far" fill="${K.far}" d="M0 262 L0 230 L40 230 L40 214 L70 214 L70 226 L118 226 L118 205 L128 205 L128 198 L150 198 L150 224 L196 224 L196 212 C204 186 236 186 244 212 L250 212 L250 222 L300 222 L300 206 L322 206 L322 150 L352 150 L352 206 L372 206 L372 222 L430 222 L430 210 L470 210 L470 226 L520 226 L520 218 L560 218 L560 262 Z M820 262 L820 222 L862 222 L862 206 C866 176 902 176 906 206 L912 206 L912 196 L918 168 L924 196 L930 196 L930 220 L980 220 L980 210 L1010 210 L1010 224 L1064 224 L1064 200 L1084 200 L1084 222 L1130 222 L1130 214 L1200 214 L1200 262 Z"/>`;
  // kule
  const tg = K.tower === 'gold', td = K.tower === 'dim';
  const tFill = tg ? '#E2A845' : td ? '#1A2244' : ph === 'day' ? '#5B4A3E' : '#4A3E48';
  o += `<g class="p-tower" data-tower style="cursor:pointer">`;
  if (tg) o += `<circle cx="${TOWER_X}" cy="${TOWER_Y - 120}" r="190" fill="url(#pGlow)" opacity=".75"/>`;
  if (tg && !REDUCED) o += `<g class="p-beam" style="transform-origin:${TOWER_X}px ${(TOWER_Y - 262 * TOWER_S).toFixed(1)}px"><path d="M${TOWER_X} ${(TOWER_Y - 262 * TOWER_S).toFixed(1)} L${TOWER_X + 520} ${(TOWER_Y - 262 * TOWER_S - 26).toFixed(1)} L${TOWER_X + 520} ${(TOWER_Y - 262 * TOWER_S + 22).toFixed(1)} Z" fill="url(#pBeam)"/></g>`;
  o += `<g transform="translate(${TOWER_X} ${TOWER_Y}) scale(${TOWER_S})"><path d="${TOWER_D}" fill="${tFill}" fill-rule="evenodd"/><path d="${TOWER_D}" fill="url(#pLat)" fill-rule="evenodd"/>
    ${tg ? '<path d="M-43-74H43M-26-143H26" stroke="#FFF1C4" stroke-width="2.4" opacity=".85"/>' : ''}<circle cx="0" cy="-262" r="${tg ? 3 : 1.6}" fill="${tg ? '#FFF6D8' : td ? '#3C4670' : '#7A6A60'}"/></g>`;
  if (sparkle && !REDUCED) {
    o += `<g class="p-sparkle">`;
    const sr = rng(seedDay + 7);
    for (let i = 0; i < 70; i++) {
      const yy = -sr() * 270, half = yy > -70 ? 66 - (-yy) * .43 : yy > -147 ? 31 - (-yy - 78) * .14 : yy > -238 ? 15 - (-yy - 147) * .11 : 5;
      const xx = (sr() * 2 - 1) * half * .92;
      o += `<circle class="p-spk" cx="${(TOWER_X + xx * TOWER_S).toFixed(1)}" cy="${(TOWER_Y + yy * TOWER_S).toFixed(1)}" r="${(1 + sr() * 1.2).toFixed(2)}" fill="#FFFFFF" style="animation-delay:-${(sr() * .9).toFixed(2)}s;animation-duration:${(.5 + sr() * .7).toFixed(2)}s"/>`;
    }
    o += `</g>`;
  }
  o += `</g>`;
  // Champ de Mars ağaçları
  o += `<g fill="${K.tree}">`;
  for (let x = 580; x < 816; x += 22) { const h = 10 + ((x * 7) % 9); o += `<ellipse cx="${x + 10}" cy="${base - h / 2 + 2}" rx="13" ry="${h}"/>`; }
  o += `</g>`;
  // Haussmann blokları
  let lit = '', facades = '', roofs = '', deco = '';
  const studentWin = { b: 2, c: 1, rr: 1 };
  CITY.forEach((b, bi) => {
    const ft = base - b.rows * 20, cols = b.w / 16;
    facades += `<rect x="${b.x}" y="${ft}" width="${b.w}" height="${b.rows * 20}" fill="${K.fac}"/><rect x="${b.x}" y="${ft}" width="${b.w}" height="${b.rows * 20}" fill="url(#pWin)"/>`;
    deco += `<rect x="${b.x}" y="${ft + 36}" width="${b.w}" height="2" fill="${K.roof}" opacity=".55"/><rect x="${b.x}" y="${ft - 3}" width="${b.w}" height="3" fill="${K.roof}" opacity=".8"/>`;
    roofs += `<path d="M${b.x + 1} ${ft - 2} L${b.x + 8} ${ft - b.roof} L${b.x + b.w - 8} ${ft - b.roof} L${b.x + b.w - 1} ${ft - 2} Z" fill="${K.roof}"/>`;
    if (b.dorm) for (let c = 1; c < cols - 1; c += 2) roofs += `<rect x="${b.x + c * 16 + 4}" y="${ft - b.roof + 5}" width="7" height="8" rx="3" fill="${night && r() < K.win * 1.3 ? K.won : K.woff}"/>`;
    if (b.chim) { const cx = b.x + 8 + Math.floor(b.cx * (b.w - 24)); roofs += `<rect x="${cx}" y="${ft - b.roof - 9}" width="9" height="10" fill="${K.roof}"/><rect x="${cx + 1}" y="${ft - b.roof - 12}" width="2.6" height="4" fill="${K.roof}"/><rect x="${cx + 5}" y="${ft - b.roof - 12}" width="2.6" height="4" fill="${K.roof}"/>`; }
    if (K.win) for (let rr = 0; rr < b.rows; rr++) for (let c = 0; c < cols; c++) {
      const isStudent = ph === 'late' && bi === studentWin.b && c === studentWin.c && rr === studentWin.rr;
      if (isStudent || r() < K.win) {
        const flick = !isStudent && r() < .08 && !REDUCED;
        lit += `<rect x="${b.x + c * 16 + 4}" y="${ft + rr * 20 + 5}" width="7" height="11" rx="1" fill="${isStudent ? '#FFB547' : K.won}"${flick ? ` class="p-flick" style="animation-delay:-${(r() * 20).toFixed(1)}s"` : ''}/>`;
      }
    }
  });
  o += `<g>${roofs}${facades}${deco}${lit}</g>`;
  // viyadük + metro
  o += `<rect x="0" y="${base}" width="1200" height="9" fill="${K.steel}"/><rect x="0" y="${base - 3}" width="1200" height="3" fill="${K.steel}" opacity=".7"/>`;
  let cols2 = ''; for (let x = 8; x < 1200; x += 46) cols2 += `<rect x="${x}" y="${base + 9}" width="5" height="30" fill="${K.steel}"/><path d="M${x + 5} ${base + 36} Q${x + 25.5} ${base + 4} ${x + 46} ${base + 36}" stroke="${K.steel}" stroke-width="2.6" fill="none"/><path d="M${x + 5} ${base + 18} H${x + 46}" stroke="${K.steel}" stroke-width="1.2" opacity=".55"/>`;
  o += cols2;
  o += `<g class="p-train${REDUCED ? ' still' : ''}"><g transform="translate(0 ${base - 25})">`;
  for (let c = 0; c < 5; c++) {
    const x = c * 70, front = c === 4;
    o += `<path d="${front ? `M${x} 2 H${x + 54} Q${x + 66} 3 ${x + 67} 14 V22 H${x} Z` : `M${x} 2 H${x + 66} V22 H${x} Z`}" fill="${K.train}"/>
      <rect x="${x}" y="15" width="${front ? 67 : 66}" height="3" fill="#2350C8"/>`;
    for (let k = 0; k < 4; k++) o += `<rect x="${x + 6 + k * 14}" y="6" width="9" height="7" rx="1" fill="${night ? K.tw : '#2B3A5C'}"${night ? '' : ' opacity=".85"'}/>`;
  }
  o += `</g></g>`;
  // taş köprü + Seine
  o += `<rect x="0" y="${base + 39}" width="1200" height="12" fill="${K.stone}"/>`;
  o += `<rect x="0" y="${base + 51}" width="1200" height="29" fill="url(#pWater)"/>`;
  o += `<g class="p-ripples" fill="${night ? '#FFD27A' : '#FFFFFF'}" opacity="${night ? .5 : .35}">`;
  const rr2 = rng(99);
  for (let i = 0; i < 26; i++) o += `<rect x="${(rr2() * 1200).toFixed(0)}" y="${(base + 55 + rr2() * 22).toFixed(0)}" width="${(10 + rr2() * 36).toFixed(0)}" height="1.4" rx=".7"/>`;
  if (tg) for (let i = 0; i < 6; i++) o += `<rect x="${TOWER_X - 10 + (i % 2) * 6}" y="${base + 55 + i * 4}" width="${14 - i}" height="1.6" rx=".8" fill="#FFD27A" opacity=".9"/>`;
  o += `</g>`;
  // rıhtım fenerleri
  [372, 1028].forEach(x => {
    o += `<rect x="${x}" y="${base + 22}" width="3" height="58" fill="${K.steel}"/><rect x="${x - 4}" y="${base + 16}" width="11" height="9" rx="2" fill="${night ? '#FFE6A3' : K.steel}"/>`;
    if (night) o += `<circle cx="${x + 1.5}" cy="${base + 20}" r="26" fill="url(#pGlow)"/>`;
  });
  o += `</svg>`;
  return o;
}
function greetingFor(d) {
  const h = d.getHours(), ph = skyPhase(d);
  if (ph === 'late' || (h >= 1 && h < 5)) return 'Nuit blanche ?';
  if (h >= 18 || h < 1) return 'Bonsoir.';
  return 'Bonjour.';
}
const HERO = { phase: '', timer: 0, io: null, sparkUntil: 0 };
function heroHTML(chips) {
  const d = new Date(), ph = skyPhase(d), K = SKY[ph];
  HERO.phase = ph;
  const date = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return `<section class="hero ink-${K.ink}" id="hero" data-phase="${ph}" aria-label="Karşılama">
    <div class="hero-sky" id="heroSky">${parisSVG(d)}</div>
    <div class="hero-txt">
      <h1 class="hero-hi" lang="fr">${greetingFor(d)}</h1>
      <p class="hero-date" lang="fr"><time id="heroClock" class="tnum">${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}</time> <span>${date}</span></p>
      ${chips ? `<div class="hero-chips">${chips}</div>` : ''}
    </div>
  </section>`;
}
function heroMount() {
  clearInterval(HERO.timer);
  const hero = $('#hero'); if (!hero) return;
  HERO.timer = setInterval(heroTick, 15000);
  if ('IntersectionObserver' in window) {
    if (HERO.io) HERO.io.disconnect();
    HERO.io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('paused', !e.isIntersecting)), { threshold: 0 });
    HERO.io.observe(hero);
  }
}
function heroTick() {
  const hero = $('#hero'); if (!hero) { clearInterval(HERO.timer); return; }
  const d = new Date(), c = $('#heroClock');
  if (c) c.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  const ph = skyPhase(d), m = d.getMinutes();
  const wantSpark = (ph === 'night' || ph === 'blue') && m < 5;
  if (ph !== HERO.phase || (wantSpark !== !!hero.querySelector('.p-sparkle') && Date.now() > HERO.sparkUntil)) {
    HERO.phase = ph; hero.dataset.phase = ph; hero.className = hero.className.replace(/ink-\w+/, 'ink-' + SKY[ph].ink);
    $('#heroSky').innerHTML = parisSVG(d);
    const hi = hero.querySelector('.hero-hi'); if (hi) hi.textContent = greetingFor(d);
  }
}
function heroSparkle() {
  const sky = $('#heroSky'); if (!sky) return;
  HERO.sparkUntil = Date.now() + 7000;
  const d = new Date(), ph = skyPhase(d);
  sky.innerHTML = parisSVG(d, { sparkle: true, phase: ph });
  haptic('tap');
  setTimeout(() => { if (Date.now() >= HERO.sparkUntil && $('#heroSky')) $('#heroSky').innerHTML = parisSVG(new Date()); }, 7100);
}
document.addEventListener('click', e => {
  if (e.target.closest && e.target.closest('[data-tower]')) { heroSparkle(); toast('La tour scintille · kule ışıldıyor'); return; }
  if (e.target.closest && e.target.closest('[data-moon]')) { const n = moonName(moonAge()); toast(`${n[0]} · bu gece ${n[1]}`); }
});
document.addEventListener('visibilitychange', () => { const h = $('#hero'); if (h) h.classList.toggle('paused', document.visibilityState !== 'visible'); if (document.visibilityState === 'visible') heroTick(); });

/* =====================================================================
   VARIŞ — metro kapıları açılır (günde bir kez, isteğe bağlı)
   ===================================================================== */
function maybeIntro(stationTxt) {
  const mode = S.p.intro || 'day';
  if (REDUCED || mode === 'off') return;
  if (mode === 'day' && S.p.introDay === ymd()) return;
  S.p.introDay = ymd(); saveLocal();
  const box = document.createElement('div');
  box.className = 'intro'; box.id = 'intro'; box.setAttribute('aria-hidden', 'true');
  box.innerHTML = `<div class="door l"><i class="dwin"></i><i class="dbar"></i></div><div class="door r"><i class="dwin"></i><i class="dbar"></i></div>
    <div class="intro-sign"><span class="intro-lamp"></span><div class="plaque big"><small lang="fr">Prochain arrêt</small><b lang="fr">${esc(stationTxt || 'Métro des Mots')}</b></div></div>`;
  document.body.appendChild(box);
  let gone = false;
  const open = fast => {
    if (gone) return; gone = true;
    box.classList.add('open'); if (fast) box.classList.add('fast');
    setTimeout(() => box.classList.add('fade'), fast ? 260 : 900);
    setTimeout(() => box.remove(), fast ? 520 : 1300);
  };
  box.addEventListener('pointerdown', () => open(true));
  requestAnimationFrame(() => box.classList.add('on'));
  setTimeout(() => open(false), 950);
}
