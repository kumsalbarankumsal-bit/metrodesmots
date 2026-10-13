/* =====================================================================
   MÉTRO DES MOTS — arayüz
   ===================================================================== */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const IC = (n, c) => `<svg class="ic ${c || ''}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const STATUS_TR = { new: 'Yeni', learn: 'Öğreniliyor', master: 'Ustalaşıldı', known: 'Biliyordum' };
const LETTERS = 'ABCDEFGHIJK';
let VIEW = 'home', PREV = 'home';
const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
function trunc(s, n) { return s.length > n ? s.slice(0, Math.max(1, n - 1)) + '…' : s; }
function plural(n, a) { return n + ' ' + a; }
function relDue(m) {
  const diff = m - nowM();
  if (diff <= 0) return 'şimdi';
  const d = new Date(m * MINUTE), hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  const dayDiff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(new Date().setHours(0, 0, 0, 0))) / 86400000);
  if (dayDiff === 0) return 'bugün ' + hm;
  if (dayDiff === 1) return 'yarın ' + hm;
  if (dayDiff < 7) return dayDiff + ' gün sonra';
  if (dayDiff < 35) return Math.round(dayDiff / 7) + ' hafta sonra';
  return Math.round(dayDiff / 30) + ' ay sonra';
}
function ring(p, size, stroke, color) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(1, p)));
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" style="stroke:var(--card-3)" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" style="stroke:${color}" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/></svg>`;
}

/* ---------- yönlendirme ---------- */
function show(v) {
  PREV = ['home', 'plan', 'review', 'lex'].includes(VIEW) ? VIEW : PREV;
  VIEW = v;
  ['home', 'plan', 'review', 'lex', 'sess', 'match', 'sum'].forEach(k => { $('#v-' + k).hidden = k !== v; });
  const tab = ['home', 'plan', 'review', 'lex'].includes(v) ? v : null;
  $$('[data-go]').forEach(b => { if (b.dataset.go === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  document.body.classList.toggle('in-sess', v === 'sess' || v === 'match');
  if (v === 'home') renderHome(); else if (v === 'plan') renderPlan(); else if (v === 'review') renderReview(); else if (v === 'lex') renderLex();
  if (v !== 'match') stopMatchTimer();
  updateChrome();
  try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, 0); }
}
function rerender() { applyPrefs(); if (['home', 'plan', 'review', 'lex'].includes(VIEW)) show(VIEW); else updateChrome(); }
function updateChrome() {
  const n = dueList().length;
  $$('[data-due]').forEach(b => { b.textContent = n > 99 ? '99+' : n; b.hidden = n === 0; });
  $('#topStreak').textContent = streakNow();
}

/* ---------- ANA SAYFA ---------- */
function renderHome() {
  const c = counts(), td = today(), goal = S.p.goal, due = dueList().length, L = lvl(S.p.xp);
  const ns = nextStation(S.p.plan) || { u: S.p.plan || 1, g: 1 };
  const started = c.learn + c.master + c.known > 0;
  const date = cap1(new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));
  const learning = W.filter(w => status(w.id) === 'learn');
  const nextDue = learning.length ? Math.min(...learning.map(w => S.w[w.id][1])) : null;
  const left = Math.max(0, goal - td[1]);
  const goalP = Math.min(1, td[1] / goal);
  const sname = stationName(ns.u, ns.g);

  let reviewTxt, reviewBtn;
  if (due) { reviewTxt = 'kelimenin tekrar zamanı geldi. Bekletme; aralık kaçarsa unutma başlar.'; reviewBtn = `<button class="btn" data-run="review">${IC('review')}Tekrara başla</button>`; }
  else if (learning.length) { reviewTxt = `Bugünlük tekrar yok. Sıradaki tekrar ${relDue(nextDue)}.`; reviewBtn = `<button class="btn" data-run="practice-learning">${IC('bolt')}Serbest pratik</button>`; }
  else { reviewTxt = 'Henüz listende kelime yok. Keşfettiğin kelimeler yarından itibaren burada belirir.'; reviewBtn = `<button class="btn" data-info="how">${IC('spark')}Nasıl çalışır?</button>`; }

  const welcome = started ? '' : `
    <div class="card s12" style="margin-bottom:16px">
      <div class="card-h"><h2>Nasıl çalışır?</h2><span class="label">WordUp mantığı</span></div>
      <div class="tiles">
        <div class="tile"><b>1 · Keşfet</b><span>Her durakta 11 kelime var. Kelimeyi biliyorsan geç, bilmiyorsan öğrenme listene ekle.</span></div>
        <div class="tile"><b>2 · Tekrar et</b><span>Listendeki her kelime 1 gün, 3 gün, 1 hafta, 2 hafta ve 1 ay sonra farklı bir soruyla karşına çıkar.</span></div>
        <div class="tile"><b>3 · Ustalaş</b><span>Beş tekrarı da doğru bilen kelime ustalaşılmış sayılır ve uzun süreli belleğine yerleşir.</span></div>
      </div>
    </div>`;

  const lines = UNIT_IDS.map(u => {
    const uc = counts(UNIT_WORDS[u]);
    const pct = Math.round((uc.master + uc.known) / uc.total * 100);
    let strip = '';
    for (let g = 1; g <= NGROUPS[u]; g++) {
      const gc = groupCounts(u, g), seen = gc.total - gc.new, done = gc.master + gc.known;
      strip += `<i class="${done === gc.total ? 'p3' : seen >= 6 ? 'p2' : seen > 0 ? 'p1' : ''}"></i>`;
    }
    return `<button class="line-row u${u}" data-plan="${u}">
      <span class="roundel">${u}</span>
      <span style="min-width:0"><span class="ttl">${esc(UNITS[u])}</span>
        <span class="meta">${uc.total} kelime · ${NGROUPS[u]} durak · ${uc.learn} öğreniliyor</span>
        <span class="strip">${strip}</span></span>
      <span class="pct tnum">%${pct}</span></button>`;
  }).join('');

  // önümüzdeki 7 gün
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const fc = [0, 0, 0, 0, 0, 0, 0];
  learning.forEach(w => {
    const d = new Date(S.w[w.id][1] * MINUTE); d.setHours(0, 0, 0, 0);
    const k = Math.max(0, Math.round((d - t0) / 86400000)); if (k < 7) fc[k]++;
  });
  const fmax = Math.max(4, ...fc);
  const fcHTML = fc.map((v, i) => {
    const d = new Date(t0); d.setDate(d.getDate() + i);
    const lab = i === 0 ? 'bugün' : d.toLocaleDateString('tr-TR', { weekday: 'short' });
    return `<div class="col"><span class="n tnum">${v}</span><div class="b ${i === 0 ? 'today' : ''}" style="height:${Math.max(4, v / fmax * 88)}px"></div><span class="d">${lab}</span></div>`;
  }).join('');

  // ısı haritası: son 15 hafta (pazartesi başlangıçlı)
  const end = new Date(); end.setHours(0, 0, 0, 0);
  const start = new Date(end); start.setDate(start.getDate() - (7 * 14 + ((end.getDay() + 6) % 7)));
  let heat = '';
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const v = (S.p.days[ymd(d)] || [0])[0];
    const cls = v === 0 ? '' : v < 10 ? 'h1' : v < 30 ? 'h2' : v < 60 ? 'h3' : 'h4';
    heat += `<i class="${cls} ${ymd(d) === ymd() ? 'today' : ''}" title="${ymd(d)} · ${v} cevap"></i>`;
  }
  const activeDays = Object.values(S.p.days).filter(x => x[0] > 0).length;

  const lp = L.to ? (S.p.xp - L.from) / (L.to - L.from) : 1;
  const nextArr = L.to ? ARR[L.i + 1] : null;

  $('#v-home').innerHTML = `
  <div class="hello">
    <div><div class="tricolore" aria-hidden="true"><i></i><i></i><i></i></div>
      <h1>${new Date().getHours() >= 18 || new Date().getHours() < 5 ? 'Bonsoir' : 'Bonjour'}, <em>voyageur</em>.</h1>
      <p class="sub">${date} · Thème 1 · Identités</p></div>
  </div>
  ${welcome}
  <div class="hero-act">
    <div class="act review">
      <span class="label">Tekrar · <span lang="fr">Réviser</span></span>
      <div class="row" style="align-items:flex-end;gap:14px"><span class="bigno tnum">${due}</span><span class="what" style="padding-bottom:6px">${due ? 'kelime hazır' : ''}</span></div>
      <p class="what">${reviewTxt}</p>
      <div>${reviewBtn}</div>
    </div>
    <div class="act discover u${ns.u}">
      <span class="label">Yeni kelimeler · <span lang="fr">Découvrir</span></span>
      <div class="ringrow">
        <div class="ring" style="width:92px;height:92px">${ring(goalP, 92, 10, 'var(--uc)')}<div class="rc"><span><b class="tnum">${td[1]}</b><small>/ ${goal} bugün</small></span></div></div>
        <div class="stack" style="gap:6px;min-width:0">
          <span class="faint" style="font-weight:700">${left ? `Günlük hedefe ${left} kelime kaldı` : 'Günlük hedef tamam. Devam etmek serbest.'}</span>
          <span class="next-stop"><span class="roundel">${ns.u}</span><span style="min-width:0">Durak ${ns.g} · ${esc(sname)}</span></span>
        </div>
      </div>
      <div><button class="btn uc" data-run="discover-next">${IC('plus')}Keşfetmeye başla</button></div>
      <span class="stripe"></span>
    </div>
  </div>
  <div class="grid" style="margin-top:16px">
    <div class="card s7">
      <div class="card-h"><h2>Hatlar</h2><span class="label">Réseau · 4 ünite</span></div>
      <div class="lines">${lines}</div>
    </div>
    <div class="card s5">
      <div class="card-h"><h2>Semtin</h2><span class="label">20<sup>e</sup> → 1<sup>er</sup></span></div>
      <div class="level">
        ${spiralSVG(L.arr)}
        <div class="stack" style="gap:8px;min-width:0">
          <div><span class="arr">${arrLabel(L.arr)}</span> <span class="faint" style="font-weight:700">arrondissement</span></div>
          <div class="quart">${esc(L.name)}</div>
          <div class="bar" aria-label="Sonraki semte ilerleme"><span style="width:${(lp * 100).toFixed(1)}%"></span></div>
          <span class="faint tnum" style="font-size:.86rem;font-weight:700">${S.p.xp.toLocaleString('tr-TR')} XP${nextArr ? ` · sonraki semte ${(L.to - S.p.xp).toLocaleString('tr-TR')} XP` : ' · Louvre’dasın'}</span>
        </div>
      </div>
      ${routeHTML(L)}
    </div>
    <div class="card s12">
      <div class="card-h"><h2>Kelime durumu</h2><span class="label">1793 kelime</span></div>
      <div class="stats">
        <div class="stat"><b class="tnum">${c.new}</b><span><i class="dot new" style="display:inline-block;margin-right:6px"></i>Yeni</span></div>
        <div class="stat"><b class="tnum">${c.learn}</b><span><i class="dot learn" style="display:inline-block;margin-right:6px"></i>Öğreniliyor</span></div>
        <div class="stat"><b class="tnum">${c.master}</b><span><i class="dot master" style="display:inline-block;margin-right:6px"></i>Ustalaşıldı</span></div>
        <div class="stat"><b class="tnum">${c.known}</b><span><i class="dot known" style="display:inline-block;margin-right:6px"></i>Biliyordum</span></div>
      </div>
      ${c.hard ? `<div class="row" style="margin-top:14px"><span class="pill hard">${c.hard} zorlu kelime</span><span class="muted" style="font-size:.92rem">En az iki kez yanlış yaptığın kelimeler</span><span class="spacer"></span><button class="btn sm no" data-run="practice-hard">Zorluları çalış</button></div>` : ''}
    </div>
    <div class="card s6">
      <div class="card-h"><h2>Önümüzdeki 7 gün</h2><span class="label">Tekrar takvimi</span></div>
      <div class="fc">${fcHTML}</div>
    </div>
    <div class="card s6">
      <div class="card-h"><h2>Düzen</h2><span class="label">${activeDays} aktif gün · seri ${streakNow()}</span></div>
      <div class="heat" aria-label="Son 15 haftalık çalışma">${heat}</div>
      <p class="faint" style="font-size:.84rem;margin-top:10px">Her kare bir gün; renk koyulaştıkça o gün daha çok cevap vermişsin.</p>
    </div>
  </div>`;
}
function spiralSVG(cur) {
  const size = 150, c = size / 2, pts = [[c, c]];
  for (let n = 2; n <= 20; n++) { const r = 15 + (n - 2) * 2.9, a = (n - 2) * 0.72 - Math.PI / 2; pts.push([c + r * Math.cos(a), c + r * Math.sin(a)]); }
  let d = ''; for (let k = pts.length - 1; k >= 0; k--) d += (k === pts.length - 1 ? 'M' : ' L') + pts[k][0].toFixed(1) + ' ' + pts[k][1].toFixed(1);
  const dots = pts.slice(1).map((p, k) => {
    const n = k + 2, passed = n > cur, isCur = n === cur;
    return `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${isCur ? 7 : 4}" style="fill:${isCur ? 'var(--rouge)' : passed ? 'var(--bleu)' : 'var(--card)'};stroke:${isCur ? 'var(--card)' : 'var(--bleu)'}" stroke-width="${isCur ? 2.5 : 1.6}"><title>${n}e · ${ARR[20 - n][1]}</title></circle>`;
  }).join('');
  const reached = cur === 1;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Paris arrondissement sarmalı: ${cur}. bölgedesin, merkez Louvre">
    <path d="${d}" fill="none" style="stroke:var(--line-2)" stroke-width="2" stroke-dasharray="3 4"/>${dots}
    <path d="M${c} ${c - 8} L${c - 9} ${c + 6} L${c + 9} ${c + 6} Z" style="fill:${reached ? 'var(--rouge)' : 'var(--card)'};stroke:${reached ? 'var(--rouge)' : 'var(--bleu)'}" stroke-width="1.8" stroke-linejoin="round"><title>1er · Louvre</title></path></svg>`;
}
function routeHTML(L) {
  const next = [];
  for (let k = L.i + 1; k < Math.min(ARR.length, L.i + 4); k++) next.push(`<li><i></i><span class="nm">${arrLabel(ARR[k][0])} · ${esc(ARR[k][1])}</span><span class="xp tnum">${XPT[k].toLocaleString('tr-TR')} XP</span></li>`);
  return `<div class="route"><span class="label">${next.length ? 'Sıradaki semtler' : 'Louvre’a vardın'}</span>${next.length ? `<ol class="route-list">${next.join('')}</ol>` : ''}
    <p class="xpnote">Doğru tekrar +10 · Ustalaşma +25 · Yeni kelime +5 · Günlük hedef +30 · Eşleştirme +15 (hatasız +10)</p></div>`;
}

/* ---------- HAT HARİTASI ---------- */
function renderPlan() {
  const u = S.p.plan || 1, uc = counts(UNIT_WORDS[u]);
  const pick = UNIT_IDS.map(x => `<button class="u${x}" data-plan="${x}" aria-pressed="${x === u}"><span class="roundel">${x}</span>${esc(trunc(UNITS[x], 26))}</button>`).join('');
  const due = UNIT_WORDS[u].filter(w => isDue(w.id)).length;
  $('#v-plan').innerHTML = `
    <div class="linepick" role="group" aria-label="Hat seç">${pick}</div>
    <div class="card u${u}">
      <div class="plan-head">
        <span class="roundel lg">${u}</span>
        <div style="min-width:0;flex:1">
          <div class="them" lang="fr">Thème 1 · Identités · Unité ${u}</div>
          <h1>${esc(UNITS[u])}</h1>
          <p class="muted" style="margin-top:4px">${esc(UNIT_TR[u])}</p>
        </div>
      </div>
      <div class="row" style="margin-top:14px">
        <span class="pill">${uc.total} kelime · ${NGROUPS[u]} durak</span>
        <span class="pill new">${uc.new} yeni</span><span class="pill learn">${uc.learn} öğreniliyor</span>
        <span class="pill master">${uc.master} ustalaşıldı</span><span class="pill known">${uc.known} biliyordum</span>
      </div>
      <div class="row" style="margin-top:14px">
        <button class="btn uc" data-run="discover-line" ${uc.new ? '' : 'disabled'}>${IC('plus')}Bu hatta keşfet</button>
        <button class="btn ghost" data-run="review-line" ${due ? '' : 'disabled'}>${IC('review')}Vadesi gelenler (${due})</button>
        <button class="btn ghost" data-exam="${u}">${IC('target')}Hat sınavı</button>
      </div>
      <div class="mapbox" id="mapbox"></div>
      <div class="legend">
        <span><svg width="22" height="22" aria-hidden="true"><circle cx="11" cy="11" r="8" style="fill:var(--card);stroke:var(--line-2)" stroke-width="3"/></svg>Yeni durak</span>
        <span><svg width="22" height="22" aria-hidden="true"><circle cx="11" cy="11" r="8" style="fill:var(--card);stroke:var(--uc)" stroke-width="3"/></svg>Dış halka: görülen kelime oranı</span>
        <span><svg width="22" height="22" aria-hidden="true"><circle cx="11" cy="11" r="8" style="fill:var(--uc)"/></svg>11 kelimenin hepsi tamam</span>
      </div>
    </div>`;
  drawMap();
}
function drawMap() {
  const box = $('#mapbox'); if (!box) return;
  const u = S.p.plan || 1, n = NGROUPS[u];
  const width = Math.max(300, box.clientWidth || 340);
  const per = width < 420 ? 4 : width < 560 ? 5 : width < 760 ? 7 : width < 940 ? 8 : 10;
  const padX = 52, rowH = 100, top = 34;
  const gx = (width - 2 * padX) / (per - 1), rows = Math.ceil(n / per);
  const pts = [];
  for (let i = 0; i < n; i++) { const r = Math.floor(i / per); let c = i % per; if (r % 2) c = per - 1 - c; pts.push([padX + c * gx, top + r * rowH]); }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1]}`;
  for (let i = 1; i < n; i++) {
    const [x, y] = pts[i], [px, py] = pts[i - 1];
    if (y !== py) d += ` A${rowH / 2} ${rowH / 2} 0 0 ${x > width / 2 ? 1 : 0} ${x.toFixed(1)} ${y}`;
    else d += ` L${x.toFixed(1)} ${y}`;
  }
  const ns = nextStation(u), maxc = Math.max(6, Math.floor(gx / 6.6));
  const C = 2 * Math.PI * 17;
  const st = pts.map((p, i) => {
    const g = i + 1, gc = groupCounts(u, g), seen = gc.total - gc.new, done = gc.master + gc.known, full = done === gc.total;
    const isNext = ns && ns.u === u && ns.g === g;
    const name = stationName(u, g);
    return `<g class="st-hit" tabindex="0" role="button" data-station="${u}-${g}" aria-label="Durak ${g}: ${esc(name)}, ${seen} görüldü, ${done} tamam">
      ${isNext && !REDUCED ? `<circle class="st-pulse" cx="${p[0].toFixed(1)}" cy="${p[1]}" r="17"/>` : ''}
      <circle class="st-ring" cx="${p[0].toFixed(1)}" cy="${p[1]}" r="17" style="fill:var(--card);stroke:var(--line-2)" stroke-width="3.5"/>
      ${seen ? `<circle cx="${p[0].toFixed(1)}" cy="${p[1]}" r="17" fill="none" style="stroke:var(--uc)" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="${(seen / gc.total * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 ${p[0].toFixed(1)} ${p[1]})"/>` : ''}
      <circle cx="${p[0].toFixed(1)}" cy="${p[1]}" r="12" style="fill:${full ? 'var(--uc)' : 'var(--card)'}"/>
      <text x="${p[0].toFixed(1)}" y="${p[1] + 4}" text-anchor="middle" class="st-num" style="fill:${full ? 'var(--uc-ink)' : 'var(--ink)'}">${g}</text>
      <text x="${p[0].toFixed(1)}" y="${p[1] + 36}" text-anchor="middle" class="st-name">${esc(trunc(name, maxc))}</text>
    </g>`;
  }).join('');
  const H = top + (rows - 1) * rowH + 52;
  box.innerHTML = `<svg viewBox="0 0 ${width} ${H}" width="${width}" height="${H}" role="group" aria-label="Ligne ${u} durak haritası">
    <path d="${d}" fill="none" style="stroke:var(--uc)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>${st}</svg>`;
}

/* ---------- TEKRAR MERKEZİ ---------- */
function renderReview() {
  const due = dueList(), c = counts();
  const sc = [0, 0, 0, 0, 0, 0];
  for (const k in S.w) { const s = S.w[k][0]; if (s >= 0 && s <= 5) sc[s]++; }
  const learning = W.filter(w => status(w.id) === 'learn');
  const nextDue = learning.length ? Math.min(...learning.map(w => S.w[w.id][1])) : null;
  const sizes = [0, 10, 20, 50].map(n => `<button data-size="${n}" aria-pressed="${S.p.sessSize === n}">${n || 'Kesintisiz'}</button>`).join('');
  const rungs = STAGE_TR.map((t, i) => `<div class="rung"><b class="tnum">${sc[i]}</b><span>${i + 1}. tekrar</span><span>${t} sonra</span></div>`).join('')
    + `<div class="rung m"><b class="tnum">${sc[5]}</b><span>Ustalaşıldı</span><span>uzun süreli</span></div>`;
  const ex = [1, 2, 3, 4].map(u => `<button class="btn sm ghost u${u}" data-exam="${u}"><span class="roundel" style="width:26px;height:26px;font-size:.8rem;box-shadow:none">${u}</span>Hat ${u}</button>`).join('');
  $('#v-review').innerHTML = `
  <div class="grid">
    <div class="card s7">
      <span class="label">Tekrar zamanı gelen</span>
      <div class="row" style="align-items:flex-end;margin:6px 0 4px"><span class="sum-big tnum">${due.length}</span><span class="muted" style="padding-bottom:8px;font-weight:700">kelime</span></div>
      <p class="muted">${due.length ? 'Her kelime, bulunduğu basamağa uygun bir soru tipiyle gelir: ilk tekrarlarda anlam, sonra ters yön ve tanım, en son bağlam ve yazma.' : learning.length ? `Şu an vadesi gelen kelime yok. Sıradaki tekrar ${relDue(nextDue)}.` : 'Listende henüz kelime yok. Önce bir durakta yeni kelimeler keşfet.'}</p>
      <div class="row" style="margin:16px 0"><span class="label">Oturum uzunluğu</span><div class="seg" role="group" aria-label="Oturum uzunluğu">${sizes}</div></div>
      <button class="btn full" data-run="review" ${due.length ? '' : 'disabled'}>${IC('review')}Tekrara başla</button>
    </div>
    <div class="card s5">
      <div class="card-h"><h2>Basamaklar</h2><span class="label">aralıklı tekrar</span></div>
      <div class="ladder">${rungs}</div>
      <p class="faint" style="font-size:.86rem;margin-top:12px">Doğru cevap kelimeyi bir sonraki basamağa taşır. Yanlış cevap onu başa döndürür ve kelime aynı oturumun sonunda bir kez daha sorulur.</p>
    </div>
    <div class="s12"><div class="tiles">
      <button class="tile" data-run="practice-hard" ${c.hard ? '' : 'disabled'}>${IC('bolt')}<b>Zorlu kelimeler (${c.hard})</b><span>En az iki kez yanlış yaptığın kelimelerle hızlı çalışma. Takvimi değiştirmez.</span></button>
      <button class="tile" data-run="practice-learning" ${c.learn + c.master ? '' : 'disabled'}>${IC('spark')}<b>Serbest pratik</b><span>Öğrendiğin kelimelerden rastgele 20 soru. Takvimi değiştirmez, XP kazandırır.</span></button>
      <div class="tile">${IC('target')}<b>Hat sınavı</b><span>Bir ünitenin tamamından rastgele 25 soru; yeni kelimeler de dâhil. Sınav provası.</span><div class="row" style="gap:6px;margin-top:4px">${ex}</div></div>
    </div></div>
  </div>`;
}

/* ---------- SÖZLÜK ---------- */
const LEX = { q: '', u: 0, s: 'all', lim: 120 };
function renderLex() {
  const uchips = [0, 1, 2, 3, 4].map(u => `<button class="fchip ${u ? 'ufc u' + u : ''}" data-lexu="${u}" aria-pressed="${LEX.u === u}">${u ? 'Hat ' + u : 'Tüm hatlar'}</button>`).join('');
  const schips = [['all', 'Hepsi'], ['new', 'Yeni'], ['learn', 'Öğreniliyor'], ['master', 'Ustalaşıldı'], ['known', 'Biliyordum'], ['hard', 'Zorlu'], ['fav', 'Yıldızlı'], ['fix', 'Kitaptan düzeltilen']]
    .map(([k, t]) => `<button class="fchip" data-lexs="${k}" aria-pressed="${LEX.s === k}">${t}</button>`).join('');
  $('#v-lex').innerHTML = `
    <div class="card-h" style="margin-bottom:12px"><h2 class="serif" style="font-size:2rem">Sözlük</h2><span class="label"><span lang="fr">Lexique</span> · 1793 kelime</span></div>
    <div class="search">${IC('search')}<input id="lexq" type="search" placeholder="Fransızca, Türkçe ya da tanım ara…" value="${esc(LEX.q)}" autocomplete="off" spellcheck="false" aria-label="Sözlükte ara"></div>
    <div class="filters" role="group" aria-label="Hat">${uchips}</div>
    <div class="filters" role="group" aria-label="Durum" style="margin-top:-4px">${schips}</div>
    <p class="faint" id="lexcount" style="font-weight:700;margin-bottom:10px"></p>
    <div class="lex-list" id="lexlist"></div>`;
  $('#lexq').addEventListener('input', e => { LEX.q = e.target.value; LEX.lim = 120; renderLexList(); });
  renderLexList();
}
function lexItems() {
  const q = normT(LEX.q);
  return W.filter(w => (!LEX.u || w.u === LEX.u) &&
    (LEX.s === 'all' || (LEX.s === 'hard' ? isHard(w.id) : LEX.s === 'fav' ? !!S.f[w.id] : LEX.s === 'fix' ? !!w.fx : status(w.id) === LEX.s)) &&
    (!q || w.key.includes(q)));
}
function renderLexList() {
  const items = lexItems(), box = $('#lexlist'); if (!box) return;
  $('#lexcount').textContent = items.length + ' kelime';
  if (!items.length) { box.innerHTML = '<div class="empty">Bu filtreye uyan kelime yok.</div>'; return; }
  box.innerHTML = items.slice(0, LEX.lim).map(w => {
    const st = status(w.id);
    return `<button class="lex-row u${w.u}" data-word="${w.id}"><i class="dot ${st}" title="${STATUS_TR[st]}"></i>
      <span class="fr">${S.f[w.id] ? '★ ' : ''}${esc(w.fr)}</span><span class="tr">${esc(w.trMain)}</span><span class="where">H${w.u} · D${w.g}</span></button>`;
  }).join('') + (items.length > LEX.lim ? `<div class="more"><button class="btn ghost sm" data-lexmore>${items.length - LEX.lim} kelime daha göster</button></div>` : '');
}

/* ---------- OTURUM MOTORU ---------- */
let SES = null;
function newSession(kind, words, title) {
  SES = { kind, title, items: words.map(w => ({ w, retry: false })), idx: 0, phase: 'front', q: null, answered: false,
          correct: 0, total: 0, wrong: [], learned: [], known: [], advanced: 0, mastered: 0, xp0: S.p.xp, lvl0: lvl(S.p.xp).i, typedState: null, prev: null };
  show('sess'); renderSess();
}
function startDiscover(words, title) {
  if (!words.length) { toast('Burada keşfedilecek yeni kelime kalmadı'); return; }
  newSession('discover', words, title || 'Keşif');
}
function startReview(words, title) {
  if (!words.length) { toast('Vadesi gelen kelime yok'); return; }
  const n = S.p.sessSize || words.length;
  newSession('review', words.slice(0, n), title || 'Tekrar');
}
function startPractice(words, title, max, endless) {
  if (!words.length) { toast('Pratik için kelime yok'); return; }
  newSession('practice', shuffle(words.slice()).slice(0, max || 20), title || 'Pratik');
  if (endless) SES.pool = words.slice();
}
function discoverNext(count) {
  const ns = nextStation(S.p.plan); if (!ns) { toast('Bütün kelimeleri keşfettin. Bravo!'); return; }
  const out = [];
  for (const u of [ns.u, ...UNIT_IDS.filter(x => x !== ns.u)]) {
    for (let g = (u === ns.u ? ns.g : 1); g <= NGROUPS[u]; g++) {
      for (const w of GROUPS[u + '-' + g]) if (status(w.id) === 'new') { out.push(w); if (out.length >= count) break; }
      if (out.length >= count) break;
    }
    if (out.length >= count) break;
  }
  startDiscover(out, 'Keşif · Ligne ' + ns.u);
}
function curItem() { return SES.items[SES.idx]; }
function flowing() { return SES.kind === 'discover' || (SES.kind === 'review' && !S.p.sessSize) || (SES.kind === 'practice' && !!SES.pool); }
function stageDots(id) {
  const st = stageOf(id); const k = st === 9 ? 5 : Math.max(0, Math.min(5, st));
  return `<span class="stage" title="Basamak ${k}/5">${[0, 1, 2, 3, 4].map(i => `<i class="${i < k ? 'on' : ''}"></i>`).join('')}</span>`;
}
function wordInfo(w) {
  const def = w.anti
    ? `<div class="defl"><span class="sym">≠</span><span>Zıttı: <b>${esc(w.def)}</b>${w.trAnti ? ' · ' + esc(w.trAnti) : ''}</span></div>`
    : `<div class="defl"><span class="sym">≈</span><span>${esc(w.def)}</span></div>`;
  return `<div class="stack" style="margin-top:16px">
    <div class="trbig">${esc(w.trMain)}</div>${def}
    <div class="exbox"><div style="min-width:0;flex:1"><div class="fr">${exHTML(w.ex)}</div><div class="tr">${esc(w.et)}</div></div>
      <button class="speak sm" data-say="ex" data-id="${w.id}" aria-label="Örnek cümleyi dinle">${IC('speak', 'sm')}</button></div>
    ${w.fx ? `<div class="fixnote">${IC('pen', 'sm')}<span><b>Kitaptan düzeltildi.</b> ${esc(w.fx)}</span></div>` : ''}
  </div>`;
}
function sessHeader(w) {
  const total = SES.items.length, done0 = SES.idx + (SES.answered || SES.phase === 'learned' ? 1 : 0);
  const batch = SES.kind === 'discover' ? 10 : 20, done = flowing() ? (done0 % batch || (done0 ? batch : 0)) : done0, ptotal = flowing() ? batch : total;
  const kindTR = { discover: 'Keşif', review: 'Tekrar', practice: 'Pratik' }[SES.kind];
  return `<div class="sess-top">
      <button class="iconbtn" data-endsess aria-label="Oturumu bitir">${IC('x')}</button>
      <div class="prog" role="progressbar" aria-valuemin="0" aria-valuemax="${ptotal}" aria-valuenow="${done}"><span style="width:${(done / ptotal * 100).toFixed(1)}%"></span></div>
      <span class="count tnum">${flowing() ? (SES.idx + 1) + ' · akış' : Math.min(SES.idx + 1, total) + ' / ' + total}</span></div>
    <div class="sess-mode"><span class="pill ${SES.kind === 'review' ? 'learn' : SES.kind === 'discover' ? 'known' : ''}">${kindTR}</span>
      <span class="roundel" style="width:28px;height:28px;font-size:.82rem">${w.u}</span>
      <span class="faint" style="font-weight:700">Ligne ${w.u} · Durak ${w.g} · ${esc(stationName(w.u, w.g))}</span>
      ${curItem().retry ? '<span class="pill hard">Pekiştirme</span>' : ''}</div>`;
}
function renderSess() {
  const it = curItem(), w = it.w, v = $('#v-sess');
  v.className = 'view u' + w.u;
  if (SES.kind === 'discover') v.innerHTML = sessHeader(w) + discoverCard(w);
  else {
    if (!SES.q || SES.q.w !== w) { SES.q = makeQ(w, SES.kind === 'review' && !it.retry ? 'review' : 'practice'); SES.answered = false; SES.typedState = null; }
    v.innerHTML = sessHeader(w) + questionCard(SES.q);
  }
  bindSess();
  if (S.p.auto && SES.kind === 'discover' && SES.phase === 'front') setTimeout(() => speak(speechText(w.fr)), 250);
  if (S.p.auto && SES.q && SES.q.type === 'fr2tr' && !SES.answered && SES.kind !== 'discover') setTimeout(() => speak(speechText(w.fr)), 250);
}
function discoverCard(w) {
  const ph = SES.phase;
  const top = `<div class="tk-top"><span class="tk-no">N° ${w.id} · ${w.anti ? 'zıt anlam grubu' : 'kelime'}</span><span class="pill ${status(w.id)}">${STATUS_TR[status(w.id)]}</span></div>
    <div class="w-head"><div class="bigword">${esc(w.fr)}</div><button class="speak" data-say="fr" data-id="${w.id}" aria-label="Telaffuzu dinle">${IC('speak')}</button></div>`;
  if (ph === 'front') return `
    <div class="ticket" id="tk"><span class="swipe-tag l">ÖĞRENMELİYİM</span><span class="swipe-tag r">BİLİYORUM</span>${top}
      <div class="exbox" style="margin-top:18px"><div style="min-width:0;flex:1"><div class="fr">${exHTML(w.ex)}</div></div>
        <button class="speak sm" data-say="ex" data-id="${w.id}" aria-label="Örnek cümleyi dinle">${IC('speak', 'sm')}</button></div>
      <p class="q-prompt-label" style="margin-top:20px">Bu kelimenin anlamını biliyor musun?</p></div>
    <div class="decide"><button class="btn ghost" data-dec="learn">${IC('plus')}Öğrenmeliyim</button><button class="btn ok" data-dec="know">${IC('check')}Biliyorum</button></div>
    <p class="swipe-hint">Kartı sola ya da sağa kaydırabilirsin · klavyede ← →</p>`;
  if (ph === 'check') return `
    <div class="ticket" id="tk">${top}${wordInfo(w)}<p class="q-prompt-label" style="margin-top:20px">Aklındaki anlam bu muydu?</p></div>
    <div class="decide"><button class="btn ghost" data-dec="nope">${IC('x')}Hayır, öğreneyim</button><button class="btn ok" data-dec="yes">${IC('check')}Evet, biliyordum</button></div>`;
  return `
    <div class="ticket" id="tk">${top}${wordInfo(w)}
      <p class="faint" style="margin-top:16px;font-weight:700">${SES.lastDec === 'known' ? 'Biliyordum olarak işaretlendi. İstersen sözlükten öğrenme listene alabilirsin.' : 'Öğrenme listene eklendi · ilk tekrar yarın.'}</p></div>
    <div class="sess-actions"><button class="btn uc" data-next>${SES.idx + 1 >= SES.items.length && !flowing() ? 'Özeti gör' : 'Sonraki kelime'}${IC('arrow')}</button></div>
    <p class="kbd">Enter: devam</p>`;
}
function decide(kind) {
  const w = curItem().w;
  if (kind === 'know') { SES.phase = 'check'; renderSess(); return; }
  if (kind === 'yes') { knowWord(w.id); SES.known.push(w); SES.lastDec = 'known'; addXP(3); const g = activity(1, 0); afterActivity(g); }
  else { learnWord(w.id); SES.learned.push(w); SES.lastDec = 'learned'; addXP(5); const g = activity(1, 1); afterActivity(g); }
  sfx('ok'); touch(); SES.phase = 'learned'; renderSess();
}
function questionCard(q) {
  const w = q.w, review = SES.kind === 'review' && !curItem().retry;
  let prompt = '';
  if (q.type === 'fr2tr') prompt = `<div class="w-head"><div class="bigword">${esc(w.fr)}</div><button class="speak" data-say="fr" data-id="${w.id}" aria-label="Telaffuzu dinle">${IC('speak')}</button></div>`;
  else if (q.type === 'tr2fr') prompt = `<div class="q-prompt-label">Türkçesi</div><div class="mid">${esc(w.trMain)}</div>`;
  else if (q.type === 'def2fr') prompt = `<div class="q-prompt-label">${w.anti ? 'Hangisinin zıt anlamlısı?' : 'Fransızca tanım'}</div><div class="mid">${w.anti ? '≠ ' : '≈ '}${esc(w.def)}</div>`;
  else if (q.type === 'cloze') prompt = `<div class="q-prompt-label">Cümleyi tamamla</div><div class="cloze">${esc(w.ex).replace(/\[[^\]]+\]/, '<span class="gap">&nbsp;</span>')}</div>
      <button class="linkbtn" data-hint style="margin-top:6px">Türkçesini göster</button><p class="muted" id="hint" hidden>${esc(w.et)}</p>`;
  else prompt = `<div class="q-prompt-label">Fransızcasını yaz</div><div class="mid">${esc(w.trMain)}</div>
      <p class="faint" style="margin-top:6px;font-weight:700">İpucu: “${esc(cleanTerm(w.fr).charAt(0))}…” ile başlıyor · ${w.anti ? 'zıttı ' + esc(w.def) : esc(trunc(w.def, 70))}</p>`;
  let body = '';
  if (q.type === 'type') {
    const ts = SES.typedState;
    body = `<div class="typein"><input id="typed" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Fransızca yaz…" ${ts ? 'disabled value="' + esc(ts.value) + '"' : ''} aria-label="Cevabın"><button class="btn" data-check ${ts ? 'disabled' : ''}>Kontrol et</button></div>
      ${ts ? '' : `<div class="accents">${['é', 'è', 'ê', 'à', 'â', 'ç', 'î', 'ô', 'û', 'ù', 'ë', 'ï', 'œ', '’'].map(a => `<button data-acc="${a}" aria-label="${a} ekle">${a}</button>`).join('')}</div>`}`;
  } else {
    body = `<div class="opts">${q.options.map((o, i) => {
      let cls = '';
      if (SES.answered) cls = o.ok ? 'ok' : (o.picked ? 'no' : 'dim');
      return `<button class="opt ${cls}" data-opt="${i}" ${SES.answered ? 'disabled' : ''}><span class="k">${i + 1}</span>${esc(o.text)}</button>`;
    }).join('')}</div>`;
  }
  return `<div class="ticket" id="tk">
      <div class="tk-top"><span class="tk-no">${QTYPES_TR[q.type]}</span>${review ? stageDots(w.id) : ''}</div>
      ${prompt}${body}${SES.answered ? feedbackHTML() : ''}
    </div>
    ${SES.answered ? `<div class="sess-actions">${SES.canOverride ? `<button class="btn ghost" data-override>${IC('check')}Aslında doğru yazdım</button>` : ''}<button class="btn uc" data-next>${SES.idx + 1 >= SES.items.length && !flowing() ? 'Özeti gör' : 'Devam'}${IC('arrow')}</button></div><p class="kbd">Enter: devam</p>`
                   : `<p class="kbd">${q.type === 'type' ? 'Enter: kontrol et' : 'Klavyede 1–4 ile seçebilirsin'}</p>`}`;
}
function feedbackHTML() {
  const w = SES.q.w, ok = SES.lastOk;
  return `<div class="fb" role="status">
    <div class="fb-h">${ok ? `<span class="badge-ok">${SES.near ? 'Neredeyse doğru' : 'Doğru'}</span>` : '<span class="badge-no">Yanlış</span>'}<span class="faint" style="font-size:.95rem">${esc(SES.note || '')}</span></div>
    ${SES.q.type === 'type' && !ok ? `<p>Doğrusu: <b>${esc(w.fr)}</b></p>` : ''}
    <div class="w-head"><div class="mid">${esc(w.fr)}</div><button class="speak sm" data-say="fr" data-id="${w.id}" aria-label="Telaffuzu dinle">${IC('speak', 'sm')}</button></div>
    ${wordInfo(w)}</div>`;
}
function record(ok) {
  const it = curItem(), w = it.w;
  SES.answered = true; SES.total++; SES.lastOk = ok; SES.note = '';
  SES.prev = S.w[w.id] ? S.w[w.id].slice() : null;
  if (ok) SES.correct++; else SES.wrong.push(w);
  if (SES.kind === 'review' && !it.retry) {
    const r = srsAnswer(w.id, ok);
    SES.lastSrs = r;
    if (ok) {
      addXP(10);
      if (r.mastered) { SES.mastered++; addXP(25); SES.note = 'Ustalaştın · bu kelime artık uzun süreli belleğinde'; confetti(70); }
      else { SES.advanced++; SES.note = 'Sonraki tekrar ' + STAGE_TR[r.to] + ' sonra'; }
    } else {
      addXP(1);
      SES.note = 'Başa döndü · yarın yeniden, bu oturumun sonunda bir kez daha';
      if (!SES.items.some((x, k) => k > SES.idx && x.w === w)) SES.items.push({ w, retry: true });
    }
  } else if (SES.kind === 'review') { SES.note = ok ? 'Pekiştirildi' : 'Yarın yeniden sorulacak'; if (ok) addXP(2); }
  else { if (ok) addXP(4); SES.note = SES.kind === 'practice' ? 'Pratik · takvim değişmedi' : ''; }
  const g = activity(1, 0); afterActivity(g);
  sfx(ok ? 'ok' : 'no'); touch();
}
function chooseOpt(i) {
  if (SES.answered) return;
  const o = SES.q.options[i]; if (!o) return;
  o.picked = true; SES.canOverride = false; SES.near = false;
  record(o.ok); renderSess();
  const nb = $('[data-next]'); if (nb) nb.focus({ preventScroll: true });
}
function submitTyped() {
  if (SES.answered) return;
  const inp = $('#typed'); if (!inp || !inp.value.trim()) return;
  const res = checkTyped(inp.value, SES.q.w);
  SES.typedState = { value: inp.value, res };
  SES.near = res === 'near'; SES.canOverride = res === 'no';
  record(res !== 'no'); renderSess();
}
function overrideTyped() {
  if (!SES.canOverride) return;
  const it = curItem(), w = it.w;
  SES.canOverride = false; SES.lastOk = true; SES.correct++;
  SES.wrong = SES.wrong.filter(x => x !== w);
  if (SES.kind === 'review' && !it.retry) {
    if (SES.prev) S.w[w.id] = SES.prev; else delete S.w[w.id];
    const r = srsAnswer(w.id, true); addXP(9);
    for (let k = SES.items.length - 1; k > SES.idx; k--) if (SES.items[k].w === w && SES.items[k].retry) { SES.items.splice(k, 1); break; }
    if (r.mastered) { SES.mastered++; addXP(25); SES.note = 'Ustalaştın'; } else { SES.advanced++; SES.note = 'Sonraki tekrar ' + STAGE_TR[r.to] + ' sonra'; }
  } else SES.note = 'Doğru sayıldı';
  touch(); renderSess();
}
function nextItem() {
  if (SES.kind === 'discover' && SES.phase !== 'learned') return;
  if (SES.kind !== 'discover' && !SES.answered) return;
  SES.idx++; SES.phase = 'front'; SES.q = null; SES.answered = false; SES.typedState = null; SES.canOverride = false;
  if (SES.idx >= SES.items.length && !refill()) { endSession(); return; }
  renderSess();
}
/* Akış: liste bitince oturumu kesmeden sıradakileri ekle; yalnızca ✕ ile durulur */
function refill() {
  const s = SES, inSes = new Set(s.items.map(x => x.w.id));
  let add = [];
  if (s.kind === 'discover') {
    const last = s.items[s.items.length - 1].w;
    for (const u of [last.u, ...UNIT_IDS.filter(x => x !== last.u)]) {
      for (let g = (u === last.u ? last.g : 1); g <= NGROUPS[u] && add.length < 10; g++)
        for (const w of GROUPS[u + '-' + g]) if (add.length < 10 && status(w.id) === 'new' && !inSes.has(w.id)) add.push(w);
      if (add.length >= 10) break;
    }
  } else if (s.kind === 'review' && !S.p.sessSize) {
    add = dueList().filter(w => !inSes.has(w.id)).slice(0, 20);
  } else if (s.kind === 'practice' && s.pool) {
    add = shuffle(s.pool.filter(w => s.pool.length <= 20 || !s.items.slice(-20).some(x => x.w === w))).slice(0, 20);
  }
  if (!add.length) return false;
  s.items.push(...add.map(w => ({ w, retry: false })));
  if (s.kind === 'discover') toast(`Akış sürüyor · bugün ${today()[1]} yeni kelime`);
  return true;
}
function endSession() {
  const s = SES; if (!s) return;
  flush();
  const xp = S.p.xp - s.xp0;
  renderSum({
    kind: s.kind, title: s.title, xp, correct: s.correct, total: s.total, wrong: [...new Set(s.wrong)],
    learned: s.learned, known: s.known, advanced: s.advanced, mastered: s.mastered
  });
  SES = null;
}

/* ---------- ÖZET ---------- */
function renderSum(r) {
  const v = $('#v-sum'); v.className = 'view';
  let head, stats, list = '', btns = '';
  if (r.kind === 'discover') {
    head = `<h1>Durak tamam</h1><p class="muted">${r.learned.length} kelime öğrenme listene eklendi, ${r.known.length} kelimeyi zaten biliyordun.</p>`;
    stats = [['Öğrenilecek', r.learned.length], ['Biliyordum', r.known.length], ['Bugün', today()[1] + ' / ' + S.p.goal], ['XP', '+' + r.xp]];
    if (r.learned.length) list = `<div class="card" style="margin-top:6px"><div class="card-h"><h2>Listene eklenenler</h2><span class="label">ilk tekrar yarın</span></div><div class="wlist">${r.learned.map(wl).join('')}</div></div>`;
    btns = (r.learned.length >= 2 ? `<button class="btn" data-sumrun="consolidate">${IC('bolt')}Hemen pekiştir (${r.learned.length} soru)</button>` : '') + `<button class="btn uc" data-run="discover-next">${IC('plus')}Devam et</button>`;
    SUM_WORDS = r.learned;
  } else {
    const pct = r.total ? Math.round(r.correct / r.total * 100) : 0;
    head = `<h1>${pct >= 90 ? 'Magnifique !' : pct >= 70 ? 'Très bien !' : pct >= 50 ? 'Pas mal' : 'Courage'}</h1><div class="sum-big tnum">${r.correct}<span class="faint" style="font-size:.5em"> / ${r.total}</span></div><p class="muted">%${pct} doğru</p>`;
    stats = r.kind === 'review'
      ? [['Basamak atlayan', r.advanced], ['Ustalaşılan', r.mastered], ['Yanlış', r.wrong.length], ['XP', '+' + r.xp]]
      : [['Doğru', r.correct], ['Yanlış', r.wrong.length], ['Seri', streakNow() + ' gün'], ['XP', '+' + r.xp]];
    if (r.wrong.length) list = `<div class="card" style="margin-top:6px"><div class="card-h"><h2>Gözden geçir</h2><span class="label">${r.wrong.length} kelime</span></div><div class="wlist">${r.wrong.map(wl).join('')}</div></div>`;
    btns = (r.wrong.length ? `<button class="btn no" data-sumrun="wrong">${IC('bolt')}Yanlışları çalış</button>` : '') + (dueList().length ? `<button class="btn" data-run="review">${IC('review')}Tekrara devam (${dueList().length})</button>` : '');
    SUM_WORDS = r.wrong;
  }
  v.innerHTML = `<div class="card"><div class="sum-head">${head}</div>
      <div class="sum-stats">${stats.map(([a, b]) => `<div class="stat"><b class="tnum">${b}</b><span>${a}</span></div>`).join('')}</div>
      <div class="sess-actions">${btns}<button class="btn ghost" data-go="home">${IC('home')}Ana sayfa</button></div></div>${list}`;
  show('sum');
  if (r.kind !== 'discover' && r.total >= 5 && r.correct === r.total) confetti(140);
}
let SUM_WORDS = [];
function wl(w) { return `<button class="wl u${w.u}" data-word="${w.id}"><span class="fr">${esc(w.fr)}</span><span class="tr">${esc(w.trMain)}</span><i class="dot ${status(w.id)}"></i></button>`; }

/* ---------- EŞLEŞTİRME (kitaptaki gibi) ---------- */
let MT = null, MT_TIMER = 0;
function startMatch(u, g, mode) {
  const words = GROUPS[u + '-' + g].slice();
  mode = mode || S.p.matchMode || 'def';
  const target = w => mode === 'tr' ? w.trMain : (w.anti ? '≠ ' : '') + w.def;
  MT = { u, g, mode, words, right: shuffle(words.map(w => ({ id: w.id, text: target(w) }))), target, sel: null, done: new Set(), doneR: new Set(), miss: 0, t0: Date.now(), end: 0 };
  show('match'); renderMatch();
  stopMatchTimer(); MT_TIMER = setInterval(() => { const el = $('#mtime'); if (el && MT && !MT.end) el.textContent = fmtTime(Date.now() - MT.t0); }, 500);
}
function stopMatchTimer() { clearInterval(MT_TIMER); MT_TIMER = 0; }
function fmtTime(ms) { const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function renderMatch() {
  const m = MT, v = $('#v-match'); v.className = 'view u' + m.u;
  const best = S.p.match[m.u + '-' + m.g + '-' + m.mode];
  const left = m.words.map(w => `<button class="mitem ${m.done.has(w.id) ? 'done' : ''} ${m.sel === w.id ? 'sel' : ''}" data-ml="${w.id}" ${m.done.has(w.id) ? 'disabled' : ''}><span class="mk">${w.n}</span>${esc(w.fr)}</button>`).join('');
  const right = m.right.map((r, i) => `<button class="mitem ${m.doneR.has(i) ? 'done' : ''}" data-mr="${i}" ${m.doneR.has(i) ? 'disabled' : ''}><span class="mk">${LETTERS[i]}</span>${esc(r.text)}</button>`).join('');
  const fin = m.end ? `<div class="card" style="margin-top:16px;text-align:center">
      <h2 class="serif" style="font-size:1.8rem">${m.miss === 0 ? 'Sans faute !' : 'Terminé !'}</h2>
      <p class="muted" style="margin:6px 0 14px">${fmtTime(m.end - m.t0)} · ${m.miss} hata${best ? ' · en iyi süren ' + fmtTime(best * 1000) : ''}</p>
      <div class="sess-actions" style="justify-content:center"><button class="btn uc" data-mrestart>${IC('match')}Yeniden oyna</button>
        <button class="btn ghost" data-mmode="${m.mode === 'tr' ? 'def' : 'tr'}">${m.mode === 'tr' ? 'Tanımlarla oyna' : 'Türkçeyle oyna'}</button>
        <button class="btn ghost" data-station="${m.u}-${m.g}">Durağa dön</button></div></div>` : '';
  v.innerHTML = `<div class="match-top">
      <button class="iconbtn" data-go="plan" aria-label="Haritaya dön">${IC('x')}</button>
      <span class="roundel">${m.u}</span>
      <div style="min-width:0"><h2>Eşleştir</h2><span class="faint" style="font-weight:700">Durak ${m.g} · ${esc(stationName(m.u, m.g))}</span></div>
      <span class="spacer"></span>
      <div class="seg" role="group" aria-label="Eşleştirme türü"><button data-mmode="def" aria-pressed="${m.mode === 'def'}">Tanım (kitap)</button><button data-mmode="tr" aria-pressed="${m.mode === 'tr'}">Türkçe</button></div>
      <span class="mstat tnum">${IC('clock', 'sm')}<span id="mtime">${fmtTime((m.end || Date.now()) - m.t0)}</span></span><span class="mstat tnum" id="mscore">${m.done.size}/11 · ${m.miss} hata</span>
    </div>
    <p class="faint" style="margin-bottom:12px;font-weight:700">Soldan bir kelime seç, sonra sağdan ${m.mode === 'tr' ? 'Türkçe karşılığını' : 'tanımını (≠ olanlarda zıt anlamlısını)'} seç.</p>
    <div class="match"><div class="mcol">${left}</div><div class="mcol">${right}</div></div>${fin}`;
}
function matchLeft(id) { if (!MT || MT.end || MT.done.has(id)) return; MT.sel = MT.sel === id ? null : id; renderMatch(); }
function matchRight(i) {
  if (!MT || MT.end || MT.doneR.has(i)) return;
  if (!MT.sel) { toast('Önce soldan bir kelime seç'); return; }
  const w = BYID[MT.sel];
  if (normT(MT.right[i].text) === normT(MT.target(w))) {
    MT.done.add(w.id); MT.doneR.add(i); MT.sel = null; sfx('ok');
    if (MT.done.size === MT.words.length) {
      MT.end = Date.now(); stopMatchTimer();
      const key = MT.u + '-' + MT.g + '-' + MT.mode, secs = Math.round((MT.end - MT.t0) / 1000);
      const best = S.p.match[key];
      if (!best || secs < best) S.p.match[key] = secs;
      addXP(15 + (MT.miss === 0 ? 10 : 0)); const g = activity(11, 0); afterActivity(g); touch();
      if (MT.miss === 0) confetti(120);
    }
    renderMatch();
  } else {
    MT.miss++; sfx('no');
    const el = $(`[data-mr="${i}"]`), el2 = $(`[data-ml="${w.id}"]`);
    [el, el2].forEach(e => { if (e) { e.classList.remove('bad'); void e.offsetWidth; e.classList.add('bad'); setTimeout(() => e.classList.remove('bad'), 450); } });
    const st = $('#mscore'); if (st) st.textContent = MT.done.size + '/11 · ' + MT.miss + ' hata';
  }
}

/* ---------- PANELLER (sheet) ---------- */
function openSheet(html, cls) {
  const s = $('#sheet'); s.className = 'sheet ' + (cls || ''); s.innerHTML = html;
  $('#sheetBg').hidden = false;
  const f = s.querySelector('[data-close]'); if (f) f.focus({ preventScroll: true });
}
function closeSheet() { $('#sheetBg').hidden = true; $('#sheet').innerHTML = ''; }
function sheetHead(label, title, u) {
  return `<div class="sheet-h">${u ? `<span class="roundel">${u}</span>` : ''}<div style="min-width:0"><div class="label">${label}</div><h2>${title}</h2></div>
    <button class="iconbtn close" data-close aria-label="Kapat">${IC('x')}</button></div>`;
}
function openWord(id) {
  const w = BYID[id]; if (!w) return;
  const st = status(id), r = S.w[id];
  let state = '';
  if (st === 'learn') state = `Basamak ${r[0] + 1}/5 · sıradaki tekrar ${relDue(r[1])}`;
  else if (st === 'master') state = 'Beş tekrarın hepsi tamam';
  else if (st === 'known') state = 'Keşifte “biliyorum” dedin';
  else state = 'Henüz keşfedilmedi';
  const acts = [];
  if (st === 'new' || st === 'known') acts.push(`<button class="btn uc sm" data-wact="learn" data-id="${id}">${IC('plus', 'sm')}Öğrenme listeme ekle</button>`);
  if (st === 'new') acts.push(`<button class="btn ghost sm" data-wact="know" data-id="${id}">${IC('check', 'sm')}Zaten biliyorum</button>`);
  if (st === 'master') acts.push(`<button class="btn ghost sm" data-wact="learn" data-id="${id}">${IC('review', 'sm')}Yeniden öğren</button>`);
  if (st !== 'new') acts.push(`<button class="btn ghost sm" data-wact="reset" data-id="${id}">İlerlemeyi sıfırla</button>`);
  acts.push(`<button class="btn ghost sm" data-station="${w.u}-${w.g}">${IC('map', 'sm')}Durağa git</button>`);
  openSheet(`<div class="u${w.u}">${sheetHead(`Ligne ${w.u} · Durak ${w.g} · N° ${w.id}`, esc(w.fr), w.u)}
    <div class="row"><button class="speak" data-say="fr" data-id="${id}" aria-label="Telaffuzu dinle">${IC('speak')}</button>
      <span class="pill ${st}">${STATUS_TR[st]}</span>${isHard(id) ? '<span class="pill hard">Zorlu</span>' : ''}
      <span class="faint" style="font-size:.9rem;font-weight:700">${state}</span><span class="spacer"></span>
      <button class="iconbtn" data-fav="${id}" aria-pressed="${!!S.f[id]}" aria-label="Yıldızla" style="${S.f[id] ? 'color:var(--or);border-color:var(--or)' : ''}">${IC('star')}</button></div>
    ${wordInfo(w)}
    ${r && st !== 'known' ? `<p class="faint" style="margin-top:12px;font-size:.88rem;font-weight:700">${r[2]} doğru · ${r[3]} yanlış</p>` : ''}
    <div class="row" style="margin-top:16px">${acts.join('')}</div></div>`);
}
function openStation(u, g) {
  const words = GROUPS[u + '-' + g], gc = counts(words);
  const due = words.filter(w => isDue(w.id));
  const bestD = S.p.match[u + '-' + g + '-def'], bestT = S.p.match[u + '-' + g + '-tr'];
  openSheet(`<div class="u${u}">${sheetHead(`Ligne ${u} · ${esc(UNITS[u])}`, `Durak ${g} · ${esc(stationName(u, g))}`, u)}
    <div class="row" style="margin-bottom:14px"><span class="pill new">${gc.new} yeni</span><span class="pill learn">${gc.learn} öğreniliyor</span><span class="pill master">${gc.master} ustalaşıldı</span><span class="pill known">${gc.known} biliyordum</span>
      ${bestD || bestT ? `<span class="faint" style="font-size:.86rem;font-weight:700">En iyi eşleştirme: ${bestD ? fmtTime(bestD * 1000) + ' (tanım)' : ''}${bestD && bestT ? ' · ' : ''}${bestT ? fmtTime(bestT * 1000) + ' (Türkçe)' : ''}</span>` : ''}</div>
    <div class="tiles" style="grid-template-columns:repeat(2,minmax(0,1fr))">
      <button class="tile" data-sact="discover" data-st="${u}-${g}" ${gc.new ? '' : 'disabled'}>${IC('plus')}<b>Keşfet (${gc.new})</b><span>Yeni kelimeleri tanı, bilmediklerini listene ekle.</span></button>
      <button class="tile" data-sact="match" data-st="${u}-${g}">${IC('match')}<b>Eşleştir</b><span>Kitaptaki alıştırma: 11 kelime, 11 tanım.</span></button>
      <button class="tile" data-sact="test" data-st="${u}-${g}">${IC('target')}<b>Durak testi</b><span>11 kelimenin hepsinden karışık sorular.</span></button>
      <button class="tile" data-sact="review" data-st="${u}-${g}" ${due.length ? '' : 'disabled'}>${IC('review')}<b>Vadesi gelenler (${due.length})</b><span>Bu duraktaki tekrarları şimdi yap.</span></button>
    </div>
    <div class="wlist" style="margin-top:14px">${words.map(wl).join('')}</div></div>`);
}
function openSettings() {
  const seg = (name, cur, opts) => `<div class="seg" role="group">${opts.map(([v, t]) => `<button data-set="${name}" data-val="${v}" aria-pressed="${String(cur) === String(v)}">${t}</button>`).join('')}</div>`;
  const tog = (name, on) => `<button class="toggle" role="switch" aria-checked="${!!on}" data-tog="${name}" aria-label="${name}"></button>`;
  openSheet(`${sheetHead('<span lang="fr">Réglages</span>', 'Ayarlar')}
    <div class="set-row"><div><div class="t">Görünüm</div><div class="d">Gece modu, sabah erken ya da akşam çalışırken gözü yormaz.</div></div>${seg('night', S.p.night ? 1 : 0, [[0, 'Gündüz'], [1, 'Gece']])}</div>
    <div class="set-row"><div><div class="t">Yazı boyutu</div><div class="d">Bütün metinleri birlikte büyütür.</div></div>${seg('fs', S.p.fs, [[1, 'A'], [1.12, 'A+'], [1.25, 'A++']])}</div>
    <div class="set-row"><div><div class="t">Günlük yeni kelime hedefi</div><div class="d">Keşifte listene eklediğin kelimeler sayılır.</div></div>${seg('goal', S.p.goal, [[5, '5'], [10, '10'], [15, '15'], [20, '20'], [30, '30']])}</div>
    <div class="set-row"><div><div class="t">Otomatik telaffuz</div><div class="d">Kart açılınca Fransızca kelimeyi seslendirir.</div></div>${tog('auto', S.p.auto)}</div>
    <div class="set-row"><div><div class="t">Konuşma hızı</div></div>${seg('rate', S.p.rate, [[0.75, 'Yavaş'], [0.92, 'Normal'], [1.05, 'Hızlı']])}</div>
    <div class="set-row"><div><div class="t">Ses efektleri</div><div class="d">Doğru ve yanlış cevapta kısa bir ton.</div></div>${tog('sfx', S.p.sfx)}</div>
    <div class="set-row"><div><div class="t">Kayıt</div><div class="d">${SYNC.mode === 'cloud' ? 'İlerlemen hesabına kaydediliyor; tablet, telefon ve bilgisayarda aynı kalır.' : 'İlerlemen bu tarayıcıda tutuluyor. Claude hesabına giriş yapmış olarak açtığında cihazlar arası eşitlenir.'}</div></div><span class="sync ${SYNC.mode === 'cloud' ? 'cloud' : ''}"></span></div>
    ${STANDALONE ? '' : `<div class="set-row"><div><div class="t">Uygulama olarak yükle</div><div class="d">Ana ekranına ikon olarak ekler; tam ekran ve çevrimdışı çalışır.</div></div><button class="btn sm" data-install>Yükle</button></div>`}
    <div class="set-row"><div><div class="t">Kitap düzeltmeleri</div><div class="d">PDF'teki dizgi ve cevap anahtarı hatalarından düzelttiğim ${Object.keys(FIXES).length} madde.</div></div><button class="btn ghost sm" data-info="fixes">Listeyi gör</button></div>
    <div class="set-row"><div><div class="t">Tekrar sistemi</div><div class="d">Basamakların ve soru tiplerinin nasıl işlediği.</div></div><button class="btn ghost sm" data-info="how">Açıklama</button></div>
    <div class="danger" id="dangerZone"><div class="row"><div style="flex:1;min-width:200px"><div class="t" style="font-weight:800">İlerlemeyi sıfırla</div><div class="d faint" style="font-size:.86rem">Bütün kelime durumları, XP, seri ve rekorlar silinir.</div></div><button class="btn sm no" data-reset1>Sıfırla…</button></div></div>`);
}
function openInfo(kind) {
  if (kind === 'fixes') {
    const rows = Object.keys(FIXES).map(id => { const w = BYID[id]; return `<button class="wl u${w.u}" data-word="${id}"><span class="fr">${esc(w.fr)}<span class="faint" style="font-weight:700"> · ${id}</span></span><span class="tr" style="font-size:.9rem">${esc(FIXES[id])}</span><i class="dot ${status(id)}"></i></button>`; }).join('');
    openSheet(`${sheetHead('PDF ile karşılaştırma', 'Kitap düzeltmeleri')}<p class="muted" style="margin-bottom:10px">Kitapta bazı terimler yanlış basılmış, cevap anahtarında bazı eşleşmeler kaymış. Uygulamada bunların doğrusu kullanılıyor; her maddeye dokunarak ayrıntısını görebilirsin.</p><div class="wlist">${rows}</div>`);
    return;
  }
  openSheet(`${sheetHead('WordUp mantığı', 'Nasıl çalışır?')}
    <div class="stack">
      <p><b>Keşfet.</b> Her durakta kitaptaki gibi 11 kelime var. Kart önce kelimeyi ve bir örnek cümleyi gösterir. Biliyorsan “Biliyorum” de; uygulama anlamı açar ve gerçekten doğru bilip bilmediğini sorar. Bilmiyorsan kelime öğrenme listene girer.</p>
      <p><b>Tekrar et.</b> Listendeki her kelime beş kez, giderek uzayan aralıklarla geri gelir: 1 gün, 3 gün, 1 hafta, 2 hafta ve 1 ay. Unutmanın başladığı ana denk gelen tekrar, hafızayı en çok güçlendiren tekrardır.</p>
      <p><b>Soru tipleri basamakla zorlaşır.</b> İlk tekrarda Fransızcadan Türkçeye anlam, sonra Türkçeden Fransızcaya ve kitaptaki gibi Fransızca tanımdan kelimeyi bulma, ardından örnek cümlede boşluk doldurma, en son kelimeyi kendin yazma.</p>
      <p><b>Yanlış yaparsan</b> kelime başa döner ve aynı oturumun sonunda bir kez daha sorulur. En az iki kez yanlış yaptığın kelimeler “Zorlu kelimeler” listesinde toplanır.</p>
      <p><b>Ustalaşmak.</b> Beş tekrarın hepsini doğru bilen kelime ustalaşılmış sayılır. Her doğru cevap XP kazandırır; XP biriktikçe Paris'in 20. bölgesinden başlayıp Louvre'a, yani 1. bölgeye doğru ilerlersin.</p>
    </div>`);
}

/* ---------- XP, hedef, kutlama ---------- */
function addXP(n) {
  const a = lvl(S.p.xp).i; S.p.xp += n; const b = lvl(S.p.xp).i;
  if (b > a) { const L = lvl(S.p.xp); setTimeout(() => { toast(`Yeni semt: ${arrText(L.arr)} arrondissement · ${L.name}`, 'gold'); confetti(160); sfx('lvl'); }, 300); }
}
function afterActivity(g) { if (g === 'goal') { addXP(30); setTimeout(() => { toast(`Günlük hedef tamam: ${S.p.goal} yeni kelime · +30 XP`, 'gold'); confetti(120); }, 200); } updateChrome(); }
function toast(msg, kind) {
  const b = $('#toasts'); if (!b) return;
  const t = document.createElement('div'); t.className = 'toast ' + (kind || ''); t.textContent = msg; b.appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity .35s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 380); }, 3000);
}
let CF = null;
function confetti(n) {
  if (REDUCED) return;
  const cv = $('#confetti'); if (!cv || !cv.getContext) return;
  const ctx = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cols = ['#2350C8', '#FFFFFF', '#DF3E2C', '#F1B400', '#12A05C', '#B5318A'];
  const P = []; for (let i = 0; i < (n || 120); i++) P.push({ x: innerWidth / 2 + (Math.random() - .5) * 120, y: innerHeight * .35, vx: (Math.random() - .5) * 13, vy: -Math.random() * 12 - 4, s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: cols[i % cols.length] });
  const t0 = performance.now(); cancelAnimationFrame(CF);
  const step = t => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    P.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .35; p.vx *= .99; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .66);
      if (p.c === '#FFFFFF') { ctx.strokeStyle = '#C5CEDB'; ctx.lineWidth = 1; ctx.strokeRect(-p.s / 2, -p.s / 3, p.s, p.s * .66); } ctx.restore(); });
    if (t - t0 < 2600) CF = requestAnimationFrame(step); else ctx.clearRect(0, 0, innerWidth, innerHeight);
  };
  CF = requestAnimationFrame(step);
}

/* ---------- kaydırma (keşif kartı) ---------- */
function bindSwipe() {
  const tk = $('#tk'); if (!tk || !SES || SES.kind !== 'discover' || SES.phase !== 'front') return;
  let x0 = null, y0 = 0, dx = 0, id = null;
  const L = tk.querySelector('.swipe-tag.l'), R = tk.querySelector('.swipe-tag.r');
  tk.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; x0 = e.clientX; y0 = e.clientY; dx = 0; id = e.pointerId; tk.setPointerCapture(id); tk.style.transition = 'none'; });
  tk.addEventListener('pointermove', e => {
    if (x0 === null || e.pointerId !== id) return; dx = e.clientX - x0;
    if (Math.abs(e.clientY - y0) > Math.abs(dx) * 1.3 && Math.abs(dx) < 20) return;
    tk.style.transform = `translateX(${dx}px) rotate(${dx / 30}deg)`;
    L.style.opacity = dx < -30 ? Math.min(1, (-dx - 30) / 80) : 0; R.style.opacity = dx > 30 ? Math.min(1, (dx - 30) / 80) : 0;
  });
  const end = () => {
    if (x0 === null) return; x0 = null;
    tk.style.transition = 'transform .25s ease';
    if (dx > 110) { tk.style.transform = 'translateX(120%) rotate(12deg)'; setTimeout(() => decide('know'), 180); }
    else if (dx < -110) { tk.style.transform = 'translateX(-120%) rotate(-12deg)'; setTimeout(() => decide('learn'), 180); }
    else { tk.style.transform = ''; L.style.opacity = 0; R.style.opacity = 0; }
  };
  tk.addEventListener('pointerup', end); tk.addEventListener('pointercancel', end);
}
function bindSess() {
  bindSwipe();
  const inp = $('#typed');
  if (inp && !inp.disabled) { setTimeout(() => inp.focus({ preventScroll: true }), 60); inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submitTyped(); } }); }
}

/* ---------- olaylar ---------- */
function applyPrefs() {
  document.documentElement.classList.toggle('night', !!S.p.night);
  document.documentElement.style.setProperty('--fs', S.p.fs || 1);
}
function runAction(a) {
  if (a === 'review') startReview(dueList());
  else if (a === 'discover-next') { const left = Math.max(0, S.p.goal - today()[1]); discoverNext(left > 0 ? left : 10); }
  else if (a === 'discover-line') { const u = S.p.plan || 1; const ws = UNIT_WORDS[u].filter(w => status(w.id) === 'new').slice(0, Math.max(5, S.p.goal - today()[1]) || 10); startDiscover(ws, 'Keşif · Ligne ' + u); }
  else if (a === 'review-line') { const u = S.p.plan || 1; startReview(dueList().filter(w => w.u === u), 'Tekrar · Ligne ' + u); }
  else if (a === 'practice-hard') startPractice(W.filter(w => isHard(w.id)), 'Zorlu kelimeler', 20, true);
  else if (a === 'practice-learning') startPractice(W.filter(w => ['learn', 'master'].includes(status(w.id))), 'Serbest pratik', 20, true);
}
function bind() {
  document.addEventListener('click', e => {
    const t = e.target.closest('button, [data-station], [data-plan]'); if (!t) { return; }
    const d = t.dataset;
    if (d.go) { closeSheet(); show(d.go); return; }
    if (t.id === 'brand') { show('home'); return; }
    if (t.id === 'btnSettings') { openSettings(); return; }
    if (t.id === 'btnInstall' || 'install' in d) { closeSheet(); doInstall(); return; }
    if ('close' in d) { closeSheet(); return; }
    if (d.run) { closeSheet(); runAction(d.run); return; }
    if (d.info) { openInfo(d.info); return; }
    if (d.plan) { S.p.plan = +d.plan; touch(); show('plan'); return; }
    if (d.station) { const [u, g] = d.station.split('-').map(Number); if (VIEW !== 'plan' && VIEW !== 'match') { S.p.plan = u; } openStation(u, g); return; }
    if (d.word) { openWord(d.word); return; }
    if (d.say) { const w = BYID[d.id] || (SES && SES.q && SES.q.w) || (SES && curItem().w); if (w) speak(d.say === 'ex' ? exPlain(w.ex) : speechText(w.fr), t); return; }
    if (d.dec) { decide(d.dec); return; }
    if (d.opt !== undefined) { chooseOpt(+d.opt); return; }
    if ('next' in d) { nextItem(); return; }
    if ('check' in d) { submitTyped(); return; }
    if ('override' in d) { overrideTyped(); return; }
    if (d.acc) { const i = $('#typed'); if (i) { const p = i.selectionStart ?? i.value.length; i.value = i.value.slice(0, p) + d.acc + i.value.slice(i.selectionEnd ?? p); i.focus(); i.setSelectionRange(p + 1, p + 1); } return; }
    if ('hint' in d) { const h = $('#hint'); if (h) h.hidden = false; t.hidden = true; return; }
    if ('endsess' in d) { if (SES && SES.total + SES.learned.length + SES.known.length > 0) endSession(); else { SES = null; show(PREV || 'home'); } return; }
    if (d.size !== undefined) { S.p.sessSize = +d.size; touch(); renderReview(); return; }
    if (d.exam) { closeSheet(); const u = +d.exam; startPractice(UNIT_WORDS[u], 'Hat sınavı · Ligne ' + u, 25); return; }
    if (d.lexu !== undefined) { LEX.u = +d.lexu; LEX.lim = 120; renderLex(); return; }
    if (d.lexs) { LEX.s = d.lexs; LEX.lim = 120; renderLex(); return; }
    if ('lexmore' in d) { LEX.lim += 200; renderLexList(); return; }
    if (d.sact) {
      const [u, g] = d.st.split('-').map(Number), ws = GROUPS[u + '-' + g]; closeSheet();
      if (d.sact === 'discover') startDiscover(ws.filter(w => status(w.id) === 'new'), 'Keşif · Durak ' + g);
      else if (d.sact === 'match') startMatch(u, g);
      else if (d.sact === 'test') startPractice(ws, 'Durak testi · ' + g, 11);
      else if (d.sact === 'review') startReview(ws.filter(w => isDue(w.id)), 'Tekrar · Durak ' + g);
      return;
    }
    if (d.ml) { matchLeft(d.ml); return; }
    if (d.mr !== undefined) { matchRight(+d.mr); return; }
    if ('mrestart' in d) { startMatch(MT.u, MT.g, MT.mode); return; }
    if (d.mmode) { S.p.matchMode = d.mmode; touch(); if (MT) startMatch(MT.u, MT.g, d.mmode); return; }
    if (d.sumrun) { if (d.sumrun === 'consolidate') startPractice(SUM_WORDS, 'Pekiştirme', SUM_WORDS.length); else startPractice(SUM_WORDS, 'Yanlışları çalış', SUM_WORDS.length); return; }
    if (d.wact) {
      const id = d.id;
      if (d.wact === 'learn') { learnWord(id); addXP(5); afterActivity(activity(0, 1)); toast('Öğrenme listene eklendi · ilk tekrar yarın'); }
      else if (d.wact === 'know') { knowWord(id); toast('Biliyordum olarak işaretlendi'); }
      else if (d.wact === 'reset') { resetWord(id); toast('İlerleme sıfırlandı'); }
      touch(); openWord(id); refreshUnder(); return;
    }
    if (d.fav) { if (S.f[d.fav]) delete S.f[d.fav]; else S.f[d.fav] = 1; touch(); openWord(d.fav); refreshUnder(); return; }
    if (d.set) {
      const v = d.val;
      if (d.set === 'night') S.p.night = v === '1'; else if (d.set === 'fs') S.p.fs = +v; else if (d.set === 'goal') S.p.goal = +v; else if (d.set === 'rate') S.p.rate = +v;
      touch(); applyPrefs(); openSettings(); refreshUnder(); return;
    }
    if (d.tog) { S.p[d.tog] = !S.p[d.tog]; touch(); openSettings(); if (d.tog === 'sfx' && S.p.sfx) sfx('ok'); return; }
    if ('reset1' in d) { $('#dangerZone').innerHTML = `<p style="font-weight:800;margin-bottom:10px">Emin misin? Bu işlem geri alınamaz.</p><div class="row"><button class="btn ghost sm" data-reset0>Vazgeç</button><button class="btn no sm" data-reset2>Evet, her şeyi sıfırla</button></div>`; return; }
    if ('reset0' in d) { openSettings(); return; }
    if ('reset2' in d) { const keep = { night: S.p.night, fs: S.p.fs, goal: S.p.goal, auto: S.p.auto, sfx: S.p.sfx, rate: S.p.rate }; S = normalizeState({}); Object.assign(S.p, keep); touch(); closeSheet(); show('home'); toast('İlerleme sıfırlandı'); return; }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#sheetBg').hidden) { closeSheet(); return; }
    if (!$('#sheetBg').hidden) return;
    if (VIEW === 'sess' && SES) {
      if (e.target && e.target.id === 'typed') return;
      if (SES.kind === 'discover') {
        if (SES.phase === 'front' && e.key === 'ArrowRight') decide('know');
        else if (SES.phase === 'front' && e.key === 'ArrowLeft') decide('learn');
        else if (SES.phase === 'check' && (e.key === 'ArrowRight' || e.key === 'y')) decide('yes');
        else if (SES.phase === 'check' && (e.key === 'ArrowLeft' || e.key === 'n')) decide('nope');
        else if (SES.phase === 'learned' && e.key === 'Enter') { e.preventDefault(); nextItem(); }
      } else {
        if (!SES.answered && /^[1-4]$/.test(e.key)) chooseOpt(+e.key - 1);
        else if (SES.answered && e.key === 'Enter') { e.preventDefault(); nextItem(); }
      }
    }
    if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.classList && e.target.classList.contains('st-hit')) { e.preventDefault(); const [u, g] = e.target.dataset.station.split('-').map(Number); openStation(u, g); }
  });
  $('#sheetBg').addEventListener('click', e => { if (e.target.id === 'sheetBg') closeSheet(); });
  let rz = 0; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (VIEW === 'plan') drawMap(); }, 160); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); else if (!SES && !MT_TIMER) refreshRemote(rerender); });
  window.addEventListener('pagehide', () => flush());
}
function refreshUnder() { if (['home', 'plan', 'review'].includes(VIEW)) show(VIEW); else if (VIEW === 'lex') renderLexList(); updateChrome(); }

/* ---------- yükleme (PWA) ---------- */
let INSTALL = null;
const STANDALONE = (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); INSTALL = e; const b = $('#btnInstall'); if (b) b.hidden = false; });
window.addEventListener('appinstalled', () => { INSTALL = null; const b = $('#btnInstall'); if (b) b.hidden = true; toast('Métro des Mots ana ekranına eklendi'); });
async function doInstall() {
  if (INSTALL) { INSTALL.prompt(); try { await INSTALL.userChoice; } catch (e) {} INSTALL = null; const b = $('#btnInstall'); if (b) b.hidden = true; return; }
  openSheet(`${sheetHead('Ana ekrana ekle', 'Uygulamayı yükle')}<div class="stack">
    <p>Chrome'da sağ üstteki <b>⋮</b> menüsüne dokun ve <b>Uygulamayı yükle</b> (bazı sürümlerde <b>Ana ekrana ekle</b>) seçeneğini seç. Samsung Internet'te alttaki menüden <b>Sayfayı ekle → Ana ekran</b>.</p>
    <p class="faint">Seçenek görünmüyorsa sayfayı bir kez yenile; Chrome yükleme hazırlığını ilk ziyarette tamamlar.</p></div>`);
}

/* ---------- açılış ---------- */
function boot() {
  const loc = loadLocal(); if (loc) S = normalizeState(loc);
  applyPrefs(); bind(); setSync('local');
  const h = (location.hash || '').slice(1);
  show(['plan', 'review', 'lex'].includes(h) ? h : 'home');
  initRemote(() => { if (!SES && !MT_TIMER) rerender(); });
}
boot();
