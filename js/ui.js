'use strict';
/* =====================================================================
   MÉTRO DES MOTS — arayüz: yönlendirme, ana sayfa, deste sayfaları (Thème 1 · Thème 2),
   tekrar, sözlük, keşif/tekrar oturumu, eşleştirme, paneller, ayarlar
   Desteler hiçbir ekranda karışmaz: her oturum, tekrar ve test tek bir desteden gelir.
   ===================================================================== */
const STATUS_TR = { new: 'Yeni', learn: 'Öğreniliyor', master: 'Ustalaşıldı', known: 'Biliyordum' };
const LETTERS = 'ABCDEFGHIJKL';
const TABS = ['home', 'yazili', 'th1', 'th2', 'studio', 'lex'];
const PAGES = ['home', 'yazili', 'th1', 'th2', 'studio', 'review', 'lex', 'exam'];
const VIEWS = [...PAGES, 'sess', 'match', 'sum', 'examrun', 'play'];
let VIEW = 'home', PREV = 'home', TAB = 'home';
function curDeck() { return DECKS[S.p.deck] ? S.p.deck : 'th2'; }
function deckLine(dk) { const u = S.p.pl && S.p.pl[dk]; return DECKS[dk].units.includes(u) ? u : DECKS[dk].units[0]; }
/* deste işareti: Thème 1 daire (Métro), Thème 2 köşeli kare (RER), 1. Yazılı Y */
function deckMark(dk, cls) { return dk === 'y1' ? badge(5, cls) : `<span class="dkm ${DECKS[dk].cls} ${cls || ''}" title="${esc(DECKS[dk].long)}">${dk === 'th1' ? '1' : '2'}</span>`; }
function trunc(s, n) { return s.length > n ? s.slice(0, Math.max(1, n - 1)) + '…' : s; }
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
function ring(p, size, stroke, color, track) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(1, p)));
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" style="stroke:${track || 'var(--card-3)'}" stroke-width="${stroke}"/>
    <circle class="ring-v" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" style="stroke:${color};stroke-dashoffset:${c.toFixed(1)}" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(1)}" data-ring="${off.toFixed(1)}"/></svg>`;
}
function badge(u, cls) { return `<span class="roundel ${u === 5 ? 'sq' : u >= 6 ? 'rer' : ''} u${u} ${cls || ''}">${lineBadge(u)}</span>`; }
function genderChip(w) { const g = genderOf(w); return g ? `<span class="gchip ${g}" title="${g === 'm' ? 'eril (masculin)' : 'dişil (féminin)'}">${g === 'm' ? 'm · le/un' : 'f · la/une'}</span>` : ''; }
function nCount(n, key, cls) { return `<b class="${cls || 'tnum'}" data-count="${n}" data-ck="${key}">${n}</b>`; }

/* ---------- yönlendirme ---------- */
function renderView(v) {
  if (v === 'th1' || v === 'th2') { renderDeck(v); return; }
  const R = { home: renderHome, yazili: typeof renderYazili === 'function' ? renderYazili : null, studio: typeof renderStudio === 'function' ? renderStudio : null,
    review: renderReview, lex: renderLex, exam: typeof renderExam === 'function' ? renderExam : null }[v];
  if (R) R();
}
function show(v, opts) {
  if (v === 'plan') v = S.p.deck === 'th2' ? 'th2' : 'th1';
  const from = VIEW;
  const dk = v === 'yazili' ? 'y1' : v === 'th1' || v === 'th2' ? v : null;
  if (dk && S.p.deck !== dk) { S.p.deck = dk; saveLocal(); }
  const doit = () => {
    if (PAGES.includes(from) && from !== v) PREV = from;
    VIEW = v;
    VIEWS.forEach(k => { const el = $('#v-' + k); if (el) el.hidden = k !== v; });
    if (TABS.includes(v)) TAB = v; else if (v === 'review') TAB = 'home';
    const inSess = !PAGES.includes(v);
    $$('.nav [data-go], .tabbar [data-go]').forEach(b => { if (!inSess && b.dataset.go === TAB) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    document.body.classList.toggle('in-sess', inSess);
    document.body.dataset.view = v;
    renderView(v);
    if (v !== 'match') stopMatchTimer();
    if (v !== 'play' && typeof plStop === 'function') plStop();
    if (v !== 'home') clearInterval(HERO.timer);
    updateChrome(); moveInd();
    try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, 0); }
  };
  const animate = PAGES.includes(from) && PAGES.includes(v) && from !== v && !(opts && opts.instant);
  if (animate) {
    const ti = x => TABS.indexOf(TABS.includes(x) ? x : x === 'review' ? 'home' : TAB);
    vt(doit, ti(v) < ti(from) ? 'l' : 'r');
  } else doit();
}
function rerender() { applyPrefs(); if (PAGES.includes(VIEW)) show(VIEW, { instant: true }); else updateChrome(); }
function updateChrome() {
  const per = {}; DECK_ORDER.forEach(d => { per[d] = dueList(null, d).length; });
  $$('[data-due]').forEach(b => { const n = per[b.dataset.due] || 0; b.textContent = n > 99 ? '99+' : n; b.hidden = n === 0; b.title = n ? n + ' kelime tekrar bekliyor' : ''; });
  const st = $('#topStreak'); if (st) st.textContent = streakNow();
}
function moveInd() {
  [['.tabbar', '.tab-ind'], ['.nav', '.nav-ind']].forEach(([n, i]) => {
    const nav = $(n), ind = nav && nav.querySelector(i); if (!ind) return;
    const cur = nav.querySelector('[aria-current="page"]');
    if (!cur || !cur.offsetWidth) { ind.style.opacity = '0'; return; }
    ind.style.opacity = '1'; ind.style.width = cur.offsetWidth + 'px'; ind.style.transform = `translateX(${cur.offsetLeft}px)`;
  });
}

/* ---------- ANA SAYFA ---------- */
function deckBar(name, ws, cls) {
  const c = counts(ws), pct = Math.round((c.master + c.known) / c.total * 100), seen = c.total - c.new;
  const seg = (k, n) => n ? `<i class="s-${k}" style="flex:${n}" title="${n} ${STATUS_TR[k].toLowerCase()}"></i>` : '';
  return `<div class="deckbar ${cls}">
    <div class="deckbar-h"><b>${name}</b><span class="faint tnum">${c.total} kelime · %${Math.round(seen / c.total * 100)} görüldü · %${pct} kalıcı</span></div>
    <div class="sbar" role="img" aria-label="${c.new} yeni, ${c.learn} öğreniliyor, ${c.master} ustalaşıldı, ${c.known} biliyordum">${seg('master', c.master)}${seg('known', c.known)}${seg('learn', c.learn)}${seg('new', c.new)}</div>
    <div class="sbar-leg"><span><i class="dot master"></i>${c.master} ustalaşıldı</span><span><i class="dot known"></i>${c.known} biliyordum</span><span><i class="dot learn"></i>${c.learn} öğreniliyor</span><span><i class="dot new"></i>${c.new} yeni</span></div>
  </div>`;
}
function departures() {
  const rows = [], due = dueList(), goalLeft = Math.max(0, S.p.goal - today()[1]);
  // 1. Yazılı hattı
  const ny = nextStation(5, [5]);
  if (ny) {
    const g = GROUPS['5-' + ny.g], nn = g.filter(w => status(w.id) === 'new').length;
    rows.push({ cls: 'u5', badge: badge(5), t: stationName(5, ny.g), s: `Ligne Y · durak ${ny.g}/12 · yeni kelimeleri öğren`, n: nn, nl: 'yeni', act: `data-run="learn:y1"` });
  } else {
    const cy = counts(DECK_WORDS.y1);
    rows.push({ cls: 'u5', badge: badge(5), t: '1. Yazılı: liste bitti', s: `${cy.learn} kelime tekrar sırasında · sınav provası yap`, n: cy.master + cy.known, nl: 'kalıcı', act: `data-stmode="test" data-stset="y1"` });
  }
  // aralıklı tekrar: her deste kendi satırında, asla karışık değil
  if (due.length) {
    DECK_ORDER.forEach(dk => {
      const dd = dueList(null, dk); if (!dd.length) return;
      const late = nowM() - S.w[dd[0].id][1];
      rows.push({ cls: 'rev', badge: `<span class="roundel rv">${IC('review', 'sm')}</span>`, t: 'Tekrar · ' + DECKS[dk].name, s: late > 60 * DAY ? 'Uzun süredir bekliyor; kısa bir tekrarla başla' : late > DAY ? `En eskisi ${Math.floor(late / DAY)} gün bekliyor; aralık kaçmadan yap` : 'Aralıklı tekrar · kelimeler unutulmadan hemen önce', n: dd.length, nl: 'kelime', act: `data-run="review:${dk}"`, hot: true });
    });
  } else {
    const learning = W.filter(w => status(w.id) === 'learn');
    const nd = learning.length ? Math.min(...learning.map(w => S.w[w.id][1])) : null;
    rows.push({ cls: 'rev', badge: `<span class="roundel rv">${IC('review', 'sm')}</span>`, t: 'Tekrar yok', s: nd ? `Sıradaki tekrar ${relDue(nd)}` : 'Öğrendiğin kelimeler yarından itibaren burada', n: '—', nl: '', act: `data-go="review"` });
  }
  // Thème 2 ve Thème 1: sıradaki durak
  ['th2', 'th1'].forEach(dk => {
    const nt = nextStation(deckLine(dk), DECKS[dk].units); if (!nt) return;
    const nn = GROUPS[nt.u + '-' + nt.g].filter(w => status(w.id) === 'new').length;
    rows.push({ cls: 'u' + nt.u, badge: badge(nt.u), t: stationName(nt.u, nt.g), s: `${DECKS[dk].name} · ${lineName(nt.u)} · durak ${nt.g} · keşif${goalLeft ? ` · hedefe ${goalLeft} kelime` : ''}`, n: nn, nl: 'yeni', act: `data-run="discover:${dk}"` });
  });
  // sınav maratonu
  const E = S.p.exam;
  if (E && E.phase !== 'done' && typeof exScopeLabel === 'function') {
    rows.push({ cls: 'ex', badge: `<span class="roundel ex">${IC('target', 'sm')}</span>`, t: 'Sınav maratonu', s: `${exScopeLabel(E.scope)} · kaldığın yerden`, n: Math.round(E.pos / E.ids.length * 100), nl: '%', act: `data-exgo="resume"` });
  }
  return rows;
}
function boardHTML() {
  const d = new Date();
  return `<section class="board s7" aria-label="Sıradaki çalışmalar">
    <div class="board-h"><span lang="fr">Prochains départs</span><time class="tnum" id="boardClock">${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}</time></div>
    <div class="board-rows">${departures().map(r => `<button class="dep ${r.cls} ${r.hot ? 'hot' : ''}" ${r.act}>
      ${r.badge}<span class="dep-m"><b>${esc(r.t)}</b><small>${esc(r.s)}</small></span>
      <span class="dep-n"><b class="tnum">${r.n}</b><small>${r.nl}</small></span>${IC('chev', 'sm dep-c')}</button>`).join('')}</div>
  </section>`;
}
function motdWord() {
  const D = DECK_WORDS[curDeck()], pool = D.filter(w => !['master', 'known'].includes(status(w.id)));
  const P = pool.length ? pool : D;
  return P[hashStr('motd' + ymd() + curDeck()) % P.length];
}
function motdHTML() {
  const w = motdWord(), st = status(w.id), note = S.n[w.id];
  return `<div class="motd u${w.u}" id="motd" data-motd role="button" tabindex="0" aria-label="Günün kelimesi ${esc(w.fr)}. Anlamını görmek için dokun">
    <div class="motd-in">
      <div class="motd-face motd-f">
        <span class="motd-k" lang="fr">Le mot du jour · ${esc(DECKS[w.deck].name)}</span>
        <div class="motd-w" lang="fr">${esc(w.fr)}</div>
        <div class="row" style="gap:8px">${genderChip(w)}<span class="pill ${st}">${STATUS_TR[st]}</span></div>
        <span class="motd-hint">${IC('flip', 'sm')}Anlamı için dokun</span>
        <button class="speak sm motd-sp" data-say="fr" data-id="${w.id}" aria-label="Telaffuzu dinle">${IC('speak', 'sm')}</button>
      </div>
      <div class="motd-face motd-b">
        ${frxHTML(w, { compact: true })}
        <div class="motd-ex" lang="fr">${exHTML(w.ex)}</div>
        ${note && note.k ? `<div class="tkchip mine">${IC('bulb', 'sm')}<span>${esc(note.k)}</span></div>` : ''}
        <div class="row" style="gap:8px;margin-top:auto">${st === 'new' ? `<button class="btn sm uc" data-wact="learn" data-id="${w.id}">${IC('plus', 'sm')}Listeme ekle</button>` : ''}<button class="btn sm ghost" data-word="${w.id}">Ayrıntı</button></div>
      </div>
    </div></div>`;
}
function todayHTML(L) {
  const td = today(), goal = S.p.goal, goalP = Math.min(1, td[1] / goal), sk = streakNow();
  const lp = L.to ? (S.p.xp - L.from) / (L.to - L.from) : 1;
  return `<section class="card today s5" aria-label="Bugün">
    <div class="card-h"><h2>Bugün</h2><span class="faint" style="font-weight:700">${cap1(new Date().toLocaleDateString('tr-TR', { weekday: 'long' }))}</span></div>
    <div class="today-row">
      <div class="ring" style="width:104px;height:104px">${ring(goalP, 104, 11, 'var(--u5)')}<div class="rc"><span>${nCount(td[1], 'td1')}<small>/ ${goal} yeni</small></span></div></div>
      <div class="today-st">
        <div class="tstat"><span class="tflame">${IC('flame')}</span><span>${nCount(sk, 'streak')}<small>gün seri</small></span></div>
        <div class="tstat"><span class="tico">${IC('check')}</span><span>${nCount(td[0], 'td0')}<small>bugün cevap</small></span></div>
      </div>
    </div>
    <p class="faint today-note">${td[1] >= goal ? 'Günlük hedef tamam. Devam etmek serbest; tekrarlar ise yarın sabah hazır olur.' : `Hedefe ${goal - td[1]} yeni kelime kaldı. Öğren ya da Keşfet ile eklediğin kelimeler sayılır.`}</p>
    <button class="lvl-mini" data-info="levels"><span class="arr">${arrLabel(L.arr)}</span><span class="lvl-t"><b>${esc(L.name)}</b><span class="bar"><span data-w="${(lp * 100).toFixed(1)}%"></span></span></span><span class="faint tnum">${S.p.xp.toLocaleString('tr-TR')} XP</span></button>
  </section>`;
}
function studioStripHTML() {
  const sel = (typeof stSet === 'function') ? stSet() : null;
  const pick = ['learn', 'relevez', 'match', 'metro'];
  return `<section class="card s7 hm-studio">
    <div class="card-h"><h2>Stüdyo</h2><button class="linkbtn" data-go="studio">Bütün modlar (17)</button></div>
    <p class="faint" style="margin:-6px 0 12px;font-weight:700">Seçili set: ${sel && typeof stLabel === 'function' ? esc(stLabel(sel)) : '1. Yazılı'}</p>
    <div class="hm-modes">${typeof modeCard === 'function' ? pick.map(k => modeCard(k, true)).join('') : ''}</div>
  </section>`;
}
function deckRow(dk) {
  const D = DECKS[dk], c = counts(DECK_WORDS[dk]), pct = Math.round((c.master + c.known) / c.total * 100);
  let viz = '';
  if (dk === 'y1') {
    for (let g = 1; g <= NGROUPS[5]; g++) { const gc = groupCounts(5, g), seen = gc.total - gc.new, done = gc.master + gc.known; viz += `<i class="${done === gc.total ? 'p3' : seen >= gc.total / 2 ? 'p2' : seen > 0 ? 'p1' : ''}"></i>`; }
    viz = `<span class="strip u5">${viz}</span>`;
  } else viz = `<span class="dl-lines">${D.units.map(u => { const uc = counts(UNIT_WORDS[u]), p = (uc.total - uc.new) / uc.total; return `<span class="dl-line u${u}" title="${esc(lineName(u) + ' · ' + UNITS[u])}">${badge(u, 'xs')}<i><b style="width:${(p * 100).toFixed(1)}%"></b></i></span>`; }).join('')}</span>`;
  return `<button class="line-row deck-row ${D.cls}" data-go="${D.tab}">${deckMark(dk)}
      <span style="min-width:0"><span class="ttl">${esc(D.name)} · <i lang="fr">${esc(D.fr)}</i></span>
        <span class="meta">${c.total.toLocaleString('tr-TR')} kelime · ${DECK_STATIONS[dk]} durak · ${c.learn} öğreniliyor</span>
        ${viz}</span>
      <span class="pct tnum">%${pct}</span></button>`;
}
function renderHome() {
  const c = counts(), L = lvl(S.p.xp), due = dueList();
  const started = Object.keys(S.w).length > 0;
  const learning = W.filter(w => status(w.id) === 'learn');
  const welcome = started ? '' : `
    <section class="card welcome" style="margin:0">
      <div class="card-h"><h2>İlk yolculuk</h2></div>
      <div class="tiles">
        <div class="tile"><b>Bir deste seç</b><span>1. Yazılı, Thème 1 ve Thème 2 ayrı sekmelerde. Her destenin tekrarı, testi ve Stüdyo seti ayrıdır; kelimeler hiç karışmaz.</span></div>
        <div class="tile"><b>Fransızca–Fransızca öğren</b><span>Her kelimenin tanımı, eş anlamlıları ve zıt anlamlıları birlikte gelir. Kalın yazılanlar öğretmeninin listesinden; Türkçe yalnızca destek.</span></div>
        <div class="tile"><b>Tekrar et, ustalaş</b><span>Öğrendiğin her kelime 1 gün, 3 gün, 1 hafta, 2 hafta ve 1 ay sonra farklı bir soruyla geri gelir: tanım, eş anlam, zıt anlam, cümle, yazma.</span></div>
      </div>
    </section>`;
  const decks = DECK_ORDER.map(deckRow).join('');
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const fc = [0, 0, 0, 0, 0, 0, 0];
  learning.forEach(w => { const d = new Date(S.w[w.id][1] * MINUTE); d.setHours(0, 0, 0, 0); const k = Math.max(0, Math.round((d - t0) / 86400000)); if (k < 7) fc[k]++; });
  const fmax = Math.max(4, ...fc);
  const fcHTML = fc.map((v, i) => {
    const d = new Date(t0); d.setDate(d.getDate() + i);
    const lab = i === 0 ? 'bugün' : d.toLocaleDateString('tr-TR', { weekday: 'short' });
    return `<div class="col"><span class="n tnum">${v}</span><div class="b ${i === 0 ? 'today' : ''}" style="height:${Math.max(4, v / fmax * 88)}px"></div><span class="d">${lab}</span></div>`;
  }).join('');
  const end = new Date(); end.setHours(0, 0, 0, 0);
  const start = new Date(end); start.setDate(start.getDate() - (7 * 14 + ((end.getDay() + 6) % 7)));
  let heat = '';
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const v = (S.p.days[ymd(d)] || [0])[0];
    const cls = v === 0 ? '' : v < 10 ? 'h1' : v < 30 ? 'h2' : v < 60 ? 'h3' : 'h4';
    heat += `<i class="${cls} ${ymd(d) === ymd() ? 'today' : ''}" title="${ymd(d)} · ${v} cevap"></i>`;
  }
  const activeDays = Object.values(S.p.days).filter(x => x[0] > 0).length;
  const sk = streakNow();
  const chips = `${sk ? `<span class="hchip">${IC('flame', 'sm')}<b class="tnum">${sk}</b> gün seri</span>` : ''}${due.length ? `<button class="hchip hot" data-run="review">${IC('review', 'sm')}<b class="tnum">${due.length}</b> tekrar hazır</button>` : ''}`;
  $('#v-home').innerHTML = `
  ${heroHTML(chips)}
  <div class="grid home-grid">
    ${boardHTML()}
    ${todayHTML(L)}
    ${welcome ? `<div class="s12">${welcome}</div>` : ''}
    <section class="s5 motd-wrap">${motdHTML()}</section>
    ${studioStripHTML()}
    <section class="card s7">
      <div class="card-h"><h2>Desteler</h2><span class="faint" style="font-weight:700">3 deste · ${W.length.toLocaleString('tr-TR')} kelime</span></div>
      <div class="lines">${decks}</div>
    </section>
    <section class="card s5">
      <div class="card-h"><h2>Semtin</h2><span class="faint" style="font-weight:700">20<sup>e</sup>’den 1<sup>er</sup>’e</span></div>
      <div class="level">${spiralSVG(L.arr)}
        <div class="stack" style="gap:8px;min-width:0">
          <div><span class="arr">${arrLabel(L.arr)}</span> <span class="faint" style="font-weight:700">arrondissement</span></div>
          <div class="quart">${esc(L.name)}</div>
          <div class="bar" aria-label="Sonraki semte ilerleme"><span data-w="${((L.to ? (S.p.xp - L.from) / (L.to - L.from) : 1) * 100).toFixed(1)}%"></span></div>
          <span class="faint tnum" style="font-size:.86rem;font-weight:700">${S.p.xp.toLocaleString('tr-TR')} XP${L.to ? ` · sonraki semte ${(L.to - S.p.xp).toLocaleString('tr-TR')} XP` : ' · Louvre’dasın'}</span>
        </div></div>
      ${routeHTML(L)}
    </section>
    <section class="card s12">
      <div class="card-h"><h2>Kelime durumu</h2><span class="faint" style="font-weight:700">${c.learn + c.master + c.known} / ${c.total} kelime yolda</span></div>
      <div class="deckbars">${DECK_ORDER.map(dk => deckBar(DECKS[dk].long, DECK_WORDS[dk], DECKS[dk].cls)).join('')}</div>
      ${c.hard ? `<div class="row" style="margin-top:14px"><span class="pill hard">${c.hard} zorlu kelime</span><span class="muted" style="font-size:.92rem">En az iki kez yanlış yaptığın kelimeler</span><span class="spacer"></span>${DECK_ORDER.map(dk => { const h = DECK_WORDS[dk].filter(w => isHard(w.id)).length; return h ? `<button class="btn sm no" data-run="hard:${dk}">${esc(DECKS[dk].name)} (${h})</button>` : ''; }).join('')}</div>` : ''}
    </section>
    <section class="card s6">
      <div class="card-h"><h2>Önümüzdeki 7 gün</h2><span class="faint" style="font-weight:700">tekrar takvimi</span></div>
      <div class="fc">${fcHTML}</div>
    </section>
    <section class="card s6">
      <div class="card-h"><h2>Düzen</h2><span class="faint" style="font-weight:700">${activeDays} aktif gün · seri ${sk}</span></div>
      <div class="heat" aria-label="Son 15 haftalık çalışma">${heat}</div>
      <p class="faint" style="font-size:.84rem;margin-top:10px">Her kare bir gün; renk koyulaştıkça o gün daha çok cevap vermişsin.</p>
    </section>
  </div>`;
  heroMount(); countUps($('#v-home'));
  if (typeof stSpotlight === 'function') stSpotlight($('#v-home'));
}
function spiralSVG(cur) {
  const size = 150, c = size / 2, pts = [[c, c]];
  for (let n = 2; n <= 20; n++) { const r = 15 + (n - 2) * 2.9, a = (n - 2) * 0.72 - Math.PI / 2; pts.push([c + r * Math.cos(a), c + r * Math.sin(a)]); }
  let d = ''; for (let k = pts.length - 1; k >= 0; k--) d += (k === pts.length - 1 ? 'M' : ' L') + pts[k][0].toFixed(1) + ' ' + pts[k][1].toFixed(1);
  const dots = pts.slice(1).map((p, k) => {
    const n = k + 2, passed = n > cur, isCur = n === cur;
    return `<circle ${isCur && !REDUCED ? 'class="sp-cur"' : ''} cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${isCur ? 7 : 4}" style="fill:${isCur ? 'var(--rouge)' : passed ? 'var(--bleu)' : 'var(--card)'};stroke:${isCur ? 'var(--card)' : 'var(--bleu)'}" stroke-width="${isCur ? 2.5 : 1.6}"><title>${n}e · ${ARR[20 - n][1]}</title></circle>`;
  }).join('');
  const reached = cur === 1;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Paris arrondissement sarmalı: ${cur}. bölgedesin, merkez Louvre">
    <path d="${d}" fill="none" style="stroke:var(--line-2)" stroke-width="2" stroke-dasharray="3 4"/>${dots}
    <path d="M${c} ${c - 8} L${c - 9} ${c + 6} L${c + 9} ${c + 6} Z" style="fill:${reached ? 'var(--rouge)' : 'var(--card)'};stroke:${reached ? 'var(--rouge)' : 'var(--bleu)'}" stroke-width="1.8" stroke-linejoin="round"><title>1er · Louvre</title></path></svg>`;
}
function routeHTML(L) {
  const next = [];
  for (let k = L.i + 1; k < Math.min(ARR.length, L.i + 4); k++) next.push(`<li><i></i><span class="nm">${arrLabel(ARR[k][0])} · ${esc(ARR[k][1])}</span><span class="xp tnum">${XPT[k].toLocaleString('tr-TR')} XP</span></li>`);
  return `<div class="route"><span class="faint" style="font-weight:800">${next.length ? 'Sıradaki semtler' : 'Louvre’a vardın'}</span>${next.length ? `<ol class="route-list">${next.join('')}</ol>` : ''}
    <p class="xpnote">Doğru tekrar +10 · ustalaşma +25 · yeni kelime +5 · günlük hedef +30 · Stüdyo'da doğru cevap +2–4 · oyun rekoru bonus</p></div>`;
}

/* ---------- DESTE SAYFASI (Thème 1 · Thème 2): kendi tekrarı, keşfi, sınavı, Stüdyo'su ve hat haritası ---------- */
function renderDeck(dk) {
  const D = DECKS[dk], ws = DECK_WORDS[dk], c = counts(ws), due = dueList(null, dk).length;
  const seen = c.total - c.new, kalici = c.master + c.known;
  const u = deckLine(dk), uc = counts(UNIT_WORDS[u]), udue = UNIT_WORDS[u].filter(w => isDue(w.id)).length;
  const ns = nextStation(u, D.units), nsW = ns ? GROUPS[ns.u + '-' + ns.g].filter(w => status(w.id) === 'new').length : 0;
  const E = S.p.exam, exOn = E && E.phase !== 'done' && typeof exScopeDeck === 'function' && exScopeDeck(E.scope) === dk;
  const learnN = ws.filter(w => ['learn', 'master'].includes(status(w.id))).length;
  const lineRows = D.units.map(x => {
    const xc = counts(UNIT_WORDS[x]), p = (xc.total - xc.new) / xc.total, k = (xc.master + xc.known) / xc.total;
    return `<button class="dline u${x}" data-plan="${x}" aria-pressed="${x === u}">${badge(x)}
      <span class="dl-m"><b lang="fr">${esc(UNITS[x])}</b><small>${lineName(x)} · ${xc.total} kelime · ${NGROUPS[x]} durak</small>
        <span class="ys-bar" aria-hidden="true"><i class="b-m" style="width:${(k * 100).toFixed(1)}%"></i><i class="b-l" style="width:${((p - k) * 100).toFixed(1)}%"></i></span></span>
      <span class="ys-n tnum">%${Math.round(p * 100)}</span></button>`;
  }).join('');
  $('#v-' + dk).innerHTML = `
  <section class="yz-hero dk-hero ${D.cls}">
    <div class="yz-hero-in">
      <div class="yz-id">${deckMark(dk, 'xl')}
        <div style="min-width:0"><p class="yz-k" lang="fr">${D.net} · ${dk === 'th1' ? 'lignes 1 à 4' : 'lignes A à D'}</p><h1>${D.name}</h1><p class="yz-s"><span lang="fr">${D.fr}</span> · ${c.total.toLocaleString('tr-TR')} kelime · ${DECK_STATIONS[dk]} durak</p></div></div>
      <div class="yz-ring">
        <div class="ring" style="width:132px;height:132px">${ring(seen / c.total, 132, 12, '#FFFFFF', 'rgba(255,255,255,.22)')}<div class="rc"><span><b class="tnum" data-count="${seen}" data-ck="dk${dk}">${seen}</b><small>/ ${c.total.toLocaleString('tr-TR')} görüldü</small></span></div></div>
      </div>
    </div>
    <div class="yz-pills"><span class="ypill"><i class="dot new"></i>${c.new} yeni</span><span class="ypill"><i class="dot learn"></i>${c.learn} öğreniliyor</span><span class="ypill"><i class="dot master"></i>${c.master} ustalaşıldı</span><span class="ypill"><i class="dot known"></i>${c.known} biliyordum</span>${c.hard ? `<span class="ypill hard">${c.hard} zorlu</span>` : ''}</div>
    <p class="yz-theme">Bu sekmedeki her şey yalnızca ${D.name} kelimeleriyle çalışır: tekrar, keşif, test, maraton ve Stüdyo.</p>
  </section>
  <div class="grid" style="margin-top:16px">
    <section class="card s7 yz-act ${D.cls}">
      <div class="card-h"><h2>Şimdi ne yapayım?</h2><span class="faint" style="font-weight:700">%${Math.round(kalici / c.total * 100)} kalıcı</span></div>
      <div class="yz-acts">
        ${ns ? `<button class="yact main" data-run="learn:${dk}">${IC('learn')}<span><b>${seen ? 'Öğrenmeye devam' : 'Öğrenmeye başla'}</b><small>${lineName(ns.u)} · durak ${ns.g} · ${esc(stationName(ns.u, ns.g))} · ${nsW} yeni kelime · tanı, seç, yaz</small></span>${IC('arrow')}</button>`
              : `<button class="yact main" data-stmode="test" data-stset="${dk}">${IC('test')}<span><b>Deste bitti: sınav provası</b><small>${c.total} kelimeden karışık, notlu test</small></span></button>`}
        <button class="yact" data-run="review:${dk}" ${due ? '' : 'disabled'}>${IC('review')}<span><b>Tekrar${due ? ` (${due})` : ''}</b><small>${due ? 'vadesi gelenler, yalnız bu deste' : 'şu an yok'}</small></span></button>
        <button class="yact" data-run="discover:${dk}" ${c.new ? '' : 'disabled'}>${IC('plus')}<span><b>Hızlı keşif</b><small>kartı gör: biliyorsan geç, bilmiyorsan listene al</small></span></button>
        <button class="yact" data-exdeck="${dk}">${IC('target')}<span><b>${exOn ? 'Maratona devam' : 'Sınav maratonu'}</b><small>${exOn ? `${E.pos}/${E.ids.length} · kaldığın yerden` : 'desteyi ya da bir hattı durmadan öğren'}</small></span></button>
        <button class="yact" data-stmode="test" data-stset="${dk}">${IC('test')}<span><b>Test</b><small>tanım, eş ve zıt anlamlı karışık</small></span></button>
        <button class="yact" data-run="hard:${dk}" ${c.hard ? '' : 'disabled'}>${IC('bolt')}<span><b>Zorlu (${c.hard})</b><small>en az iki kez yanlış yaptıkların</small></span></button>
        <button class="yact" data-run="free:${dk}" ${learnN ? '' : 'disabled'}>${IC('spark')}<span><b>Serbest pratik</b><small>öğrendiklerinden karışık; takvim değişmez</small></span></button>
        <button class="yact" data-stopen="${dk}">${IC('studio')}<span><b>Stüdyo</b><small>17 mod, bu desteyle</small></span></button>
      </div>
    </section>
    <section class="card s5 dk-lines">
      <div class="card-h"><h2>Hatlar</h2><span class="faint" style="font-weight:700">bir hat seç</span></div>
      <div class="dlines">${lineRows}</div>
    </section>
    <section class="card s12 u${u} linecard" id="lineCard-${dk}">
      <div class="plan-head">${badge(u, 'lg')}
        <div style="min-width:0;flex:1">
          <div class="them" lang="fr">${esc(D.long)} · ${lineName(u)}</div>
          <h1 lang="fr">${esc(UNITS[u])}</h1>
          <p class="muted" style="margin-top:4px">${esc(UNIT_TR[u])}</p>
        </div>
      </div>
      <div class="row" style="margin-top:14px">
        <span class="pill">${uc.total} kelime · ${NGROUPS[u]} durak</span>
        <span class="pill new">${uc.new} yeni</span><span class="pill learn">${uc.learn} öğreniliyor</span>
        <span class="pill master">${uc.master} ustalaşıldı</span><span class="pill known">${uc.known} biliyordum</span>
      </div>
      <div class="row" style="margin-top:14px">
        <button class="btn uc" data-run="dline:${u}" ${uc.new ? '' : 'disabled'}>${IC('plus')}Bu hatta keşfet</button>
        <button class="btn ghost" data-run="rline:${u}" ${udue ? '' : 'disabled'}>${IC('review')}Vadesi gelenler (${udue})</button>
        <button class="btn ghost" data-exam="${u}">${IC('target')}Hat testi</button>
        <button class="btn ghost" data-stopen="u${u}">${IC('studio')}Stüdyo</button>
      </div>
      <div class="mapbox" id="mapbox-${dk}"></div>
      <div class="legend">
        <span><svg width="22" height="22" aria-hidden="true"><circle cx="11" cy="11" r="8" style="fill:var(--card);stroke:var(--line-2)" stroke-width="3"/></svg>Yeni durak</span>
        <span><svg width="22" height="22" aria-hidden="true"><circle cx="11" cy="11" r="8" style="fill:var(--card);stroke:var(--uc)" stroke-width="3"/></svg>Dış halka: görülen kelime oranı</span>
        <span><svg width="22" height="22" aria-hidden="true"><circle cx="11" cy="11" r="8" style="fill:var(--uc)"/></svg>Duraktaki bütün kelimeler tamam</span>
      </div>
    </section>
  </div>`;
  countUps($('#v-' + dk));
  drawMap();
}
function drawMap() {
  const dk = VIEW === 'th2' ? 'th2' : 'th1', box = $('#mapbox-' + dk); if (!box) return;
  const u = deckLine(dk), n = NGROUPS[u];
  const width = Math.max(300, box.clientWidth || 340);
  const per = width < 420 ? 4 : width < 560 ? 5 : width < 760 ? 7 : width < 940 ? 8 : 10;
  const padX = 52, rowH = 100, top = 34;
  const gx = (width - 2 * padX) / (per - 1), rows = Math.ceil(n / per);
  const pts = [];
  for (let i = 0; i < n; i++) { const r = Math.floor(i / per); let c = i % per; if (r % 2) c = per - 1 - c; pts.push([padX + c * gx, top + r * rowH]); }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1]}`;
  for (let i = 1; i < n; i++) {
    const [x, y] = pts[i], [, py] = pts[i - 1];
    if (y !== py) d += ` A${rowH / 2} ${rowH / 2} 0 0 ${x > width / 2 ? 1 : 0} ${x.toFixed(1)} ${y}`;
    else d += ` L${x.toFixed(1)} ${y}`;
  }
  const ns = nextStation(u, [u]), maxc = Math.max(6, Math.floor(gx / 6.6));
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
  box.innerHTML = `<svg viewBox="0 0 ${width} ${H}" width="${width}" height="${H}" role="group" aria-label="${lineName(u)} durak haritası">
    <path class="map-line" pathLength="1" d="${d}" fill="none" style="stroke:var(--uc)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>${st}</svg>`;
}

/* ---------- TEKRAR MERKEZİ: her deste ayrı tekrar edilir ---------- */
function renderReview() {
  const due = dueList();
  const sc = [0, 0, 0, 0, 0, 0];
  for (const k in S.w) { const s = S.w[k][0]; if (s >= 0 && s <= 5) sc[s]++; }
  const learning = W.filter(w => status(w.id) === 'learn');
  const nextDue = learning.length ? Math.min(...learning.map(w => S.w[w.id][1])) : null;
  const sizes = [0, 10, 20, 50].map(n => `<button data-size="${n}" aria-pressed="${S.p.sessSize === n}">${n || 'Kesintisiz'}</button>`).join('');
  const rungs = STAGE_TR.map((t, i) => `<div class="rung"><b class="tnum">${sc[i]}</b><span>${i + 1}. tekrar</span><span>${t} sonra</span></div>`).join('')
    + `<div class="rung m"><b class="tnum">${sc[5]}</b><span>Ustalaşıldı</span><span>uzun süreli</span></div>`;
  const decks = DECK_ORDER.map(dk => {
    const D = DECKS[dk], n = dueList(null, dk).length, h = DECK_WORDS[dk].filter(w => isHard(w.id)).length, lr = DECK_WORDS[dk].filter(w => ['learn', 'master'].includes(status(w.id))).length;
    return `<div class="rv-deck ${D.cls}">${deckMark(dk)}
      <div class="rv-m"><b>${esc(D.name)} <i lang="fr">${esc(D.fr)}</i></b><small>${n ? n + ' kelime tekrar bekliyor' : lr ? 'şu an vadesi gelen yok' : 'henüz öğrenilen kelime yok'}</small></div>
      <div class="rv-b"><button class="btn sm" data-run="review:${dk}" ${n ? '' : 'disabled'}>${IC('review', 'sm')}Tekrar (${n})</button>
        <button class="btn sm ghost" data-run="hard:${dk}" ${h ? '' : 'disabled'}>${IC('bolt', 'sm')}Zorlu (${h})</button>
        <button class="btn sm ghost" data-run="free:${dk}" ${lr ? '' : 'disabled'}>${IC('spark', 'sm')}Pratik</button></div></div>`;
  }).join('');
  const ex = DECK_ORDER.map(dk => `<div class="rv-ex"><span class="faint" style="font-weight:800">${esc(DECKS[dk].name)}</span><div class="row" style="gap:6px">${DECKS[dk].units.map(u => `<button class="btn sm ghost u${u}" data-exam="${u}">${badge(u, 'xs')}${u === 5 ? 'Yazılı' : unitLabel(u)}</button>`).join('')}</div></div>`).join('');
  $('#v-review').innerHTML = `
  <div class="grid">
    <div class="card s7">
      <span class="faint" style="font-weight:800">Tekrar zamanı gelen</span>
      <div class="row" style="align-items:flex-end;margin:6px 0 4px"><span class="sum-big tnum">${due.length}</span><span class="muted" style="padding-bottom:8px;font-weight:700">kelime, üç destede toplam</span></div>
      <p class="muted">${due.length ? 'Desteler ayrı ayrı tekrar edilir; bir oturumda yalnız tek destenin kelimeleri gelir. Her kelime basamağına uygun bir soruyla döner: önce listedeki eşi ve tanımı, sonra eş ve zıt anlamlıları, en son cümlede ve yazarak.' : learning.length ? `Şu an vadesi gelen kelime yok. Sıradaki tekrar ${relDue(nextDue)}.` : 'Listende henüz kelime yok. Önce bir destede yeni kelimeler öğren.'}</p>
      <div class="rv-decks">${decks}</div>
      <div class="row" style="margin-top:14px"><span class="faint" style="font-weight:800">Oturum uzunluğu</span><div class="seg" role="group" aria-label="Oturum uzunluğu">${sizes}</div></div>
    </div>
    <div class="card s5">
      <div class="card-h"><h2>Basamaklar</h2><span class="faint" style="font-weight:700">aralıklı tekrar</span></div>
      <div class="ladder">${rungs}</div>
      <p class="faint" style="font-size:.86rem;margin-top:12px">Doğru cevap kelimeyi bir sonraki basamağa taşır. Yanlış cevap onu başa döndürür ve kelime aynı oturumun sonunda bir kez daha sorulur.</p>
    </div>
    <div class="card s12">
      <div class="card-h"><h2>Hat testi</h2><span class="faint" style="font-weight:700">bir hattın tamamından 25 soru · takvim değişmez</span></div>
      <div class="rv-exs">${ex}</div>
    </div>
  </div>`;
}

/* ---------- SÖZLÜK ---------- */
const LEX = { q: '', d: '', u: 0, s: 'all', lim: 120 };
function renderLex() {
  const dchips = [['', 'Bütün desteler'], ...DECK_ORDER.map(dk => [dk, DECKS[dk].name])].map(([dk, t]) => `<button class="fchip ${dk ? 'dfc ' + DECKS[dk].cls : ''}" data-lexd="${dk}" aria-pressed="${LEX.d === dk}">${dk ? deckMark(dk, 'xs') : ''}${esc(t)}</button>`).join('');
  const uchips = LEX.d && LEX.d !== 'y1' ? [0, ...DECKS[LEX.d].units].map(u => `<button class="fchip ${u ? 'ufc u' + u : ''}" data-lexu="${u}" aria-pressed="${LEX.u === u}">${u ? unitLabel(u) : 'Bütün hatlar'}</button>`).join('') : '';
  const schips = [['all', 'Her durum'], ['new', 'Yeni'], ['learn', 'Öğreniliyor'], ['master', 'Ustalaşıldı'], ['known', 'Biliyordum'], ['hard', 'Zorlu'], ['fav', 'Yıldızlı'], ['note', 'Notlu'], ['fix', 'Düzeltilen']]
    .map(([k, t]) => `<button class="fchip" data-lexs="${k}" aria-pressed="${LEX.s === k}">${t}</button>`).join('');
  $('#v-lex').innerHTML = `
    <div class="page-h"><h1 class="serif">Sözlük</h1><span class="faint" style="font-weight:700"><span lang="fr">Lexique</span> · ${W.length.toLocaleString('tr-TR')} kelime</span></div>
    <div class="search">${IC('search')}<input id="lexq" type="search" placeholder="Kelime, tanım, eş ya da zıt anlamlı ara…" value="${esc(LEX.q)}" autocomplete="off" spellcheck="false" aria-label="Sözlükte ara"></div>
    <div class="filters" role="group" aria-label="Deste">${dchips}</div>
    ${uchips ? `<div class="filters" role="group" aria-label="Hat" style="margin-top:-4px">${uchips}</div>` : ''}
    <div class="filters" role="group" aria-label="Durum" style="margin-top:-4px">${schips}</div>
    <p class="faint" id="lexcount" style="font-weight:700;margin-bottom:10px"></p>
    <div class="lex-list" id="lexlist"></div>`;
  $('#lexq').addEventListener('input', e => { LEX.q = e.target.value; LEX.lim = 120; renderLexList(); });
  renderLexList();
}
function lexItems() {
  const q = normT(LEX.q);
  return W.filter(w => (!LEX.d || w.deck === LEX.d) && (!LEX.u || w.u === LEX.u) &&
    (LEX.s === 'all' || (LEX.s === 'hard' ? isHard(w.id) : LEX.s === 'fav' ? !!S.f[w.id] : LEX.s === 'fix' ? !!w.fx : LEX.s === 'note' ? !!S.n[w.id] : status(w.id) === LEX.s)) &&
    (!q || w.key.includes(q)));
}
function renderLexList() {
  const items = lexItems(), box = $('#lexlist'); if (!box) return;
  $('#lexcount').textContent = items.length.toLocaleString('tr-TR') + ' kelime' + (LEX.d ? ' · ' + DECKS[LEX.d].name : ' · üç deste');
  if (!items.length) { box.innerHTML = '<div class="empty">Bu filtreye uyan kelime yok. Aramayı kısaltmayı ya da başka bir desteyi seçmeyi dene.</div>'; return; }
  box.innerHTML = items.slice(0, LEX.lim).map(w => {
    const st = status(w.id);
    return `<button class="lex-row u${w.u}" data-word="${w.id}"><i class="dot ${st}" title="${STATUS_TR[st]}"></i>
      <span class="fr" lang="fr">${S.f[w.id] ? '★ ' : ''}${esc(w.fr)}</span><span class="tr" lang="fr">${esc(gloss(w))}${trMode() === 'always' ? ` <i class="trmini" lang="tr">${esc(w.trMain)}</i>` : ''}</span><span class="where" title="${esc(DECKS[w.deck].long + ' · ' + lineName(w.u) + ' · durak ' + w.g)}">${badge(w.u, 'xs')}<span>D${w.g}</span></span></button>`;
  }).join('') + (items.length > LEX.lim ? `<div class="more"><button class="btn ghost sm" data-lexmore>${items.length - LEX.lim} kelime daha göster</button></div>` : '');
}

/* ---------- OTURUM MOTORU (keşif · tekrar · pratik) ---------- */
let SES = null;
function newSession(kind, words, title, units) {
  SES = { kind, title, deck: words[0].deck, units: units || null, items: words.map(w => ({ w, retry: false })), idx: 0, phase: 'front', q: null, answered: false,
          correct: 0, total: 0, wrong: [], learned: [], known: [], advanced: 0, mastered: 0, xp0: S.p.xp, xpShown: 0, lvl0: lvl(S.p.xp).i, typedState: null, prev: null, combo: 0 };
  show('sess'); renderSess();
}
function startDiscover(words, title, units) {
  if (!words.length) { toast('Burada keşfedilecek yeni kelime kalmadı'); return; }
  newSession('discover', words, title || 'Keşif · ' + DECKS[words[0].deck].name, units || DECKS[words[0].deck].units);
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
function discoverNext(count, units) {
  units = units || UNIT_IDS;
  const dk = deckOf(units[0]), pref = dk === 'y1' ? 5 : deckLine(dk);
  const ns = nextStation(units.includes(pref) ? pref : units[0], units);
  if (!ns) { toast('Bu hatlardaki bütün kelimeleri keşfettin. Bravo!'); return; }
  const out = [];
  for (const u of [ns.u, ...units.filter(x => x !== ns.u)]) {
    for (let g = (u === ns.u ? ns.g : 1); g <= NGROUPS[u]; g++) {
      for (const w of GROUPS[u + '-' + g]) if (status(w.id) === 'new') { out.push(w); if (out.length >= count) break; }
      if (out.length >= count) break;
    }
    if (out.length >= count) break;
  }
  startDiscover(out, 'Keşif · ' + DECKS[deckOf(ns.u)].name, units);
}
function curItem() { return SES.items[SES.idx]; }
function flowing() { return SES.kind === 'discover' || (SES.kind === 'review' && !S.p.sessSize) || (SES.kind === 'practice' && !!SES.pool); }
function stageDots(id) {
  const st = stageOf(id); const k = st === 9 ? 5 : Math.max(0, Math.min(5, st));
  return `<span class="stage" title="Basamak ${k}/5">${[0, 1, 2, 3, 4].map(i => `<i class="${i < k ? 'on' : ''}"></i>`).join('')}</span>`;
}
/* Fransızca–Fransızca kart: tanım · eş anlamlılar · zıt anlamlılar (kalın = öğretmeninin listesi) + Türkçe destek */
function xList(arr) { return arr.map(o => o.L ? `<b title="Öğretmeninin listesinden">${esc(o.t)}</b>` : `<span>${esc(o.t)}</span>`).join('<i class="xsep" aria-hidden="true">·</i>'); }
function frxHTML(w, opt) {
  opt = opt || {};
  const X = fxOf(w), rows = [], m = trMode();
  if (X.def) rows.push(`<div class="xr d"><span class="xk" title="définition · tanım">déf.</span><span class="xv" lang="fr">${X.defL ? `<b title="Öğretmeninin listesinden">${esc(X.def)}</b>` : esc(X.def)}</span></div>`);
  if (X.syn.length) rows.push(`<div class="xr s"><span class="xk" title="synonymes · eş anlamlılar">syn.</span><span class="xv" lang="fr">${xList(X.syn)}</span></div>`);
  if (X.ant.length) rows.push(`<div class="xr a"><span class="xk" title="antonymes · zıt anlamlılar">ant.</span><span class="xv" lang="fr">${xList(X.ant)}</span></div>`);
  if (!opt.noTr) rows.push(m === 'off' ? `<details class="xr t trpeek"><summary><span class="xk">tr.</span><span class="xv">Türkçesini göster</span></summary><span class="xv">${esc(w.tr)}</span></details>`
    : `<div class="xr t"><span class="xk" title="Türkçe destek">tr.</span><span class="xv">${esc(w.tr)}</span></div>`);
  return `<div class="xbox ${opt.compact ? 'compact' : ''}">${rows.join('')}</div>`;
}
function wordInfo(w, opt) {
  const note = S.n[w.id], m = trMode();
  return `<div class="stack winfo" style="margin-top:${opt && opt.tight ? 8 : 16}px">
    ${frxHTML(w)}
    <div class="exbox"><div style="min-width:0;flex:1"><div class="fr" lang="fr">${exHTML(w.ex)}</div>${m === 'off' ? '' : `<div class="tr">${esc(w.et)}</div>`}</div>
      <button class="speak sm" data-say="ex" data-id="${w.id}" aria-label="Örnek cümleyi dinle">${IC('speak', 'sm')}</button></div>
    ${w.tk && m !== 'off' ? `<div class="tkchip">${IC('spark', 'sm')}<span>Türkçede: <b>${esc(w.tk)}</b></span></div>` : ''}
    ${note && (note.k || note.s) ? `<div class="tkchip mine">${IC('bulb', 'sm')}<span>${note.k ? esc(note.k) : ''}${note.k && note.s ? ' · ' : ''}${note.s ? '<i lang="fr">' + esc(note.s) + '</i>' : ''}</span></div>` : ''}
    ${w.fx ? `<div class="fixnote">${IC('pen', 'sm')}<span><b>Listeden düzeltildi.</b> ${esc(w.fx)}</span></div>` : ''}
  </div>`;
}
/* soru başlığı: bütün oturumlarda (tekrar, Stüdyo, sınav) ortak */
function qPromptHTML(q, o) {
  o = o || {};
  const w = q.w, X = fxOf(w), m = trMode();
  const big = `<div class="w-head"><div class="bigword" lang="fr">${esc(w.fr)}</div><button class="speak" data-say="fr" data-id="${w.id}" aria-label="Telaffuzu dinle">${IC('speak')}</button></div>`;
  const lab = t => `<div class="q-prompt-label">${t}</div>`;
  const clue = (sym, t) => `<div class="mid qclue" lang="fr">${sym ? `<span class="qsym">${sym}</span>` : ''}<span>${esc(t)}</span></div>`;
  let h;
  if (q.type === 'list') h = lab(w.anti ? 'Listede zıttı olarak hangisi var?' : 'Listede karşısında hangisi var?') + big;
  else if (q.type === 'fr2def') h = lab('Tanımı hangisi?') + big;
  else if (q.type === 'fr2syn') h = lab('Eş anlamlısı hangisi?') + big;
  else if (q.type === 'fr2ant') h = lab('Zıt anlamlısı hangisi?') + big;
  else if (q.type === 'def2fr') h = lab('Bu tanıma uyan kelime') + clue('', q.shown);
  else if (q.type === 'syn2fr') h = lab('Hangi kelimenin eş anlamlısı?') + clue('≈', q.shown);
  else if (q.type === 'ant2fr') h = lab('Hangi kelimenin zıt anlamlısı?') + clue('≠', q.shown);
  else if (q.type === 'cloze') h = lab('Cümleyi tamamla') + `<div class="cloze" lang="fr">${esc(w.ex).replace(/\[[^\]]+\]/, '<span class="gap">&nbsp;</span>')}</div>`
    + (o.hint ? `<button class="linkbtn" data-hint style="margin-top:6px">İpucu: tanımı göster</button><p class="muted" id="hint" lang="fr" hidden>${X.def ? esc(X.def) : esc(gloss(w))}</p>` : '');
  else { const c = q.clue || typeClue(w); h = lab('Kelimeyi yaz') + clue(c.sym, c.t) + `<p class="faint qfirst">İpucu: «${esc(cleanTerm(w.fr).charAt(0))}…» ile başlıyor</p>`; }
  if (m === 'always') h += `<p class="trhint">${esc(q.type === 'cloze' ? w.et : w.tr)}</p>`;
  return h;
}
function sessHeader(w) {
  const total = SES.items.length, done0 = SES.idx + (SES.answered || SES.phase === 'learned' ? 1 : 0);
  const batch = SES.kind === 'discover' ? 10 : 20, done = flowing() ? (done0 % batch || (done0 ? batch : 0)) : done0, ptotal = flowing() ? batch : total;
  const kindTR = { discover: 'Keşif', review: 'Tekrar', practice: 'Pratik' }[SES.kind];
  return `<div class="sess-top">
      <button class="iconbtn" data-endsess aria-label="Oturumu bitir">${IC('x')}</button>
      <div class="prog train" role="progressbar" aria-valuemin="0" aria-valuemax="${ptotal}" aria-valuenow="${done}"><span style="width:${(done / ptotal * 100).toFixed(1)}%"></span></div>
      <span class="count tnum">${flowing() ? (SES.idx + 1) + ' · akış' : Math.min(SES.idx + 1, total) + ' / ' + total}</span></div>
    <div class="sess-mode"><span class="pill ${SES.kind === 'review' ? 'learn' : SES.kind === 'discover' ? 'known' : ''}">${kindTR}</span>
      ${badge(w.u, 'xs')}
      <span class="faint sm-where">${esc(DECKS[w.deck].name)} · ${lineName(w.u)} · Durak ${w.g} · ${esc(stationName(w.u, w.g))}</span>
      ${curItem().retry ? '<span class="pill hard">Pekiştirme</span>' : ''}
      <span class="spacer"></span>${SES.combo >= 3 ? `<span class="combo">${IC('flame', 'sm')}×${SES.combo}</span>` : ''}<span class="pl-xp tnum" id="sessXP">+${SES.xpShown} XP</span></div>`;
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
  if (S.p.auto && SES.q && WORD_PROMPT.has(SES.q.type) && !SES.answered && SES.kind !== 'discover') setTimeout(() => speak(speechText(w.fr)), 250);
}
function sessXPFly(src) {
  const gained = S.p.xp - SES.xp0, set = () => { if (!SES) return; SES.xpShown = gained; const x = $('#sessXP'); if (x) x.textContent = '+' + gained + ' XP'; };
  const diff = gained - SES.xpShown;
  if (src && diff > 0) flyTo(src, $('#sessXP'), '+' + diff, 'xp', set); else set();
}
function discoverCard(w) {
  const ph = SES.phase;
  const top = `<div class="tk-top"><span class="tk-no">N° ${w.id} · ${w.anti ? 'zıt anlam grubu' : 'kelime'}</span><span class="row" style="gap:6px">${genderChip(w)}<span class="pill ${status(w.id)}">${STATUS_TR[status(w.id)]}</span></span></div>
    <div class="w-head"><div class="bigword" lang="fr">${esc(w.fr)}</div><button class="speak" data-say="fr" data-id="${w.id}" aria-label="Telaffuzu dinle">${IC('speak')}</button></div>`;
  if (ph === 'front') return `
    <div class="ticket enter" id="tk"><span class="swipe-tag l">ÖĞRENMELİYİM</span><span class="swipe-tag r">BİLİYORUM</span>${top}
      <div class="exbox" style="margin-top:18px"><div style="min-width:0;flex:1"><div class="fr" lang="fr">${exHTML(w.ex)}</div></div>
        <button class="speak sm" data-say="ex" data-id="${w.id}" aria-label="Örnek cümleyi dinle">${IC('speak', 'sm')}</button></div>
      <p class="q-prompt-label" style="margin-top:20px">Tanımını, eş ve zıt anlamlılarını biliyor musun?</p></div>
    <div class="decide"><button class="btn ghost" data-dec="learn">${IC('plus')}Öğrenmeliyim</button><button class="btn ok" data-dec="know">${IC('check')}Biliyorum</button></div>
    <p class="swipe-hint">Kartı sola ya da sağa kaydırabilirsin · klavyede ← →</p>`;
  if (ph === 'check') return `
    <div class="ticket" id="tk">${top}${wordInfo(w)}<p class="q-prompt-label" style="margin-top:20px">Aklındaki anlam bu muydu?</p></div>
    <div class="decide"><button class="btn ghost" data-dec="nope">${IC('x')}Hayır, öğreneyim</button><button class="btn ok" data-dec="yes">${IC('check')}Evet, biliyordum</button></div>`;
  return `
    <div class="ticket" id="tk">${SES.lastDec === 'learned' ? '<i class="punch" aria-hidden="true"></i>' : ''}${top}${wordInfo(w)}
      <p class="faint" style="margin-top:16px;font-weight:700">${SES.lastDec === 'known' ? 'Biliyordum olarak işaretlendi. İstersen sözlükten öğrenme listene alabilirsin.' : 'Öğrenme listene eklendi · ilk tekrar yarın.'}</p></div>
    <div class="sess-actions"><button class="btn uc" data-next>${SES.idx + 1 >= SES.items.length && !flowing() ? 'Özeti gör' : 'Sonraki kelime'}${IC('arrow')}</button></div>
    <p class="kbd">Enter: devam</p>`;
}
function decide(kind) {
  const w = curItem().w;
  if (kind === 'know') { SES.phase = 'check'; renderSess(); return; }
  if (kind === 'yes') { knowWord(w.id); SES.known.push(w); SES.lastDec = 'known'; addXP(3); afterActivity(activity(1, 0)); }
  else { learnWord(w.id); SES.learned.push(w); SES.lastDec = 'learned'; addXP(5); afterActivity(activity(1, 1)); }
  sfx('ok'); haptic('ok'); touch(); SES.phase = 'learned'; renderSess();
  sessXPFly($('#tk .bigword'));
}
function questionCard(q) {
  const w = q.w, review = SES.kind === 'review' && !curItem().retry;
  const prompt = qPromptHTML(q, { hint: true });
  let body = '';
  if (q.type === 'type') {
    const ts = SES.typedState;
    body = `<div class="typein"><input id="typed" type="text" lang="fr" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Fransızca yaz…" ${ts ? 'disabled value="' + esc(ts.value) + '"' : ''} aria-label="Cevabın"><button class="btn" data-check ${ts ? 'disabled' : ''}>Kontrol et</button></div>
      ${ts ? '' : accentsHTML()}`;
  } else {
    body = `<div class="opts">${q.options.map((o, i) => {
      let cls = '';
      if (SES.answered) cls = o.ok ? 'ok' : (o.picked ? 'no' : 'dim');
      return `<button class="opt ${cls}" data-opt="${i}" ${SES.answered ? 'disabled' : ''} lang="fr"><span class="k">${i + 1}</span>${esc(o.text)}</button>`;
    }).join('')}</div>`;
  }
  return `<div class="ticket ${SES.answered ? '' : 'enter'}" id="tk">${SES.answered && SES.lastOk ? '<i class="punch" aria-hidden="true"></i>' : ''}
      <div class="tk-top"><span class="tk-no">${QTYPES_TR[q.type]}</span>${review ? stageDots(w.id) : ''}</div>
      ${prompt}${body}${SES.answered ? feedbackHTML() : ''}
    </div>
    ${SES.answered ? `<div class="sess-actions">${SES.canOverride ? `<button class="btn ghost" data-override>${IC('check')}Aslında doğru yazdım</button>` : ''}<button class="btn uc" data-next>${SES.idx + 1 >= SES.items.length && !flowing() ? 'Özeti gör' : 'Devam'}${IC('arrow')}</button></div><p class="kbd">Enter: devam</p>`
                   : `<p class="kbd">${q.type === 'type' ? 'Enter: kontrol et' : 'Klavyede 1–4 ile seçebilirsin'}</p>`}`;
}
function accentsHTML(id) { return `<div class="accents" ${id ? `data-for="${id}"` : ''}>${['é', 'è', 'ê', 'à', 'â', 'ç', 'î', 'ô', 'û', 'ù', 'ë', 'ï', 'œ', '’'].map(a => `<button type="button" data-acc="${a}" aria-label="${a} ekle">${a}</button>`).join('')}</div>`; }
function feedbackHTML() {
  const w = SES.q.w, ok = SES.lastOk;
  return `<div class="fb ${ok ? 'good' : 'bad'}" role="status">
    <div class="fb-h">${ok ? `<span class="badge-ok">${SES.near ? 'Neredeyse doğru' : 'Doğru'}</span>` : '<span class="badge-no">Yanlış</span>'}<span class="faint" style="font-size:.95rem">${esc(SES.note || '')}</span></div>
    ${SES.q.type === 'type' && !ok ? `<p>Doğrusu: <b lang="fr">${esc(w.fr)}</b></p>` : ''}
    <div class="w-head"><div class="mid" lang="fr">${esc(w.fr)}</div><button class="speak sm" data-say="fr" data-id="${w.id}" aria-label="Telaffuzu dinle">${IC('speak', 'sm')}</button></div>
    ${wordInfo(w, { tight: true })}</div>`;
}
function record(ok) {
  const it = curItem(), w = it.w;
  SES.answered = true; SES.total++; SES.lastOk = ok; SES.note = '';
  SES.prev = S.w[w.id] ? S.w[w.id].slice() : null;
  if (ok) { SES.correct++; SES.combo++; } else { SES.wrong.push(w); SES.combo = 0; }
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
  afterActivity(activity(1, 0));
  sfx(ok ? 'ok' : 'no'); haptic(ok ? 'ok' : 'no'); touch();
}
function answerFx(selector, ok) {
  const el = $(selector);
  if (ok) { sparksAt(el, 16); sessXPFly(el); if (SES.combo && SES.combo % 5 === 0) { const c = $('.sess-mode .combo'); bump(c); sparksAt(c, 24, ['#F1B400', '#DF3E2C', '#FFFFFF']); haptic('big'); } }
  else { shake($('#tk')); sessXPFly(null); }
}
function chooseOpt(i) {
  if (SES.answered) return;
  const o = SES.q.options[i]; if (!o) return;
  o.picked = true; SES.canOverride = false; SES.near = false;
  record(o.ok); renderSess();
  answerFx(`[data-opt="${i}"]`, o.ok);
  const nb = $('[data-next]'); if (nb) nb.focus({ preventScroll: true });
}
function submitTyped() {
  if (SES.answered) return;
  const inp = $('#typed'); if (!inp || !inp.value.trim()) return;
  const res = checkTyped(inp.value, SES.q.w);
  SES.typedState = { value: inp.value, res };
  SES.near = res === 'near'; SES.canOverride = res === 'no';
  record(res !== 'no'); renderSess();
  answerFx('#typed', res !== 'no');
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
  touch(); renderSess(); sessXPFly($('#tk'));
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
    const last = s.items[s.items.length - 1].w, units = s.units || DECKS[s.deck].units;
    for (const u of [last.u, ...units.filter(x => x !== last.u)]) {
      for (let g = (u === last.u ? last.g : 1); g <= NGROUPS[u] && add.length < 10; g++)
        for (const w of GROUPS[u + '-' + g]) if (add.length < 10 && status(w.id) === 'new' && !inSes.has(w.id)) add.push(w);
      if (add.length >= 10) break;
    }
  } else if (s.kind === 'review' && !S.p.sessSize) {
    add = dueList(null, s.deck).filter(w => !inSes.has(w.id)).slice(0, 20);
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
  renderSum({ kind: s.kind, deck: s.deck, title: s.title, xp, correct: s.correct, total: s.total, wrong: [...new Set(s.wrong)], learned: s.learned, known: s.known, advanced: s.advanced, mastered: s.mastered });
  SES = null;
}

/* ---------- ÖZET ---------- */
function renderSum(r) {
  const v = $('#v-sum'); v.className = 'view';
  let head, stats, list = '', btns = '';
  if (r.kind === 'discover') {
    head = `<h1>Durak tamam</h1><p class="muted">${r.learned.length} kelime öğrenme listene eklendi, ${r.known.length} kelimeyi zaten biliyordun.</p>`;
    stats = [['Öğrenilecek', r.learned.length], ['Biliyordum', r.known.length], ['Bugün', today()[1] + ' / ' + S.p.goal], ['XP', '+' + r.xp]];
    if (r.learned.length) list = `<div class="card" style="margin-top:12px"><div class="card-h"><h2>Listene eklenenler</h2><span class="faint" style="font-weight:700">ilk tekrar yarın</span></div><div class="wlist">${r.learned.map(wl).join('')}</div></div>`;
    btns = (r.learned.length >= 2 ? `<button class="btn" data-sumrun="consolidate">${IC('bolt')}Hemen pekiştir (${r.learned.length} soru)</button>` : '') + `<button class="btn uc" data-run="discover:${r.deck}">${IC('plus')}${esc(DECKS[r.deck].name)}: devam et</button>`;
    SUM_WORDS = r.learned;
  } else {
    const pct = r.total ? Math.round(r.correct / r.total * 100) : 0;
    head = `<h1 lang="fr">${pct >= 90 ? 'Magnifique !' : pct >= 70 ? 'Très bien !' : pct >= 50 ? 'Pas mal' : 'Courage'}</h1><div class="sum-big tnum">${r.correct}<span class="faint" style="font-size:.5em"> / ${r.total}</span></div><p class="muted">%${pct} doğru</p>`;
    stats = r.kind === 'review'
      ? [['Basamak atlayan', r.advanced], ['Ustalaşılan', r.mastered], ['Yanlış', r.wrong.length], ['XP', '+' + r.xp]]
      : [['Doğru', r.correct], ['Yanlış', r.wrong.length], ['Seri', streakNow() + ' gün'], ['XP', '+' + r.xp]];
    if (r.wrong.length) list = `<div class="card" style="margin-top:12px"><div class="card-h"><h2>Gözden geçir</h2><span class="faint" style="font-weight:700">${r.wrong.length} kelime</span></div><div class="wlist">${r.wrong.map(wl).join('')}</div></div>`;
    const dn = dueList(null, r.deck).length;
    btns = (r.wrong.length ? `<button class="btn no" data-sumrun="wrong">${IC('bolt')}Yanlışları çalış</button>` : '') + (dn ? `<button class="btn" data-run="review:${r.deck}">${IC('review')}${esc(DECKS[r.deck].name)}: tekrara devam (${dn})</button>` : '');
    SUM_WORDS = r.wrong;
  }
  v.innerHTML = `<div class="card sum-card"><div class="sum-head">${head}</div>
      <div class="sum-stats">${stats.map(([a, b]) => `<div class="stat"><b class="tnum">${b}</b><span>${a}</span></div>`).join('')}</div>
      <div class="sess-actions">${btns}<button class="btn ghost" data-go="${PREV || 'home'}">${IC('home')}Geri dön</button></div></div>${list}`;
  show('sum');
  if (r.kind !== 'discover' && r.total >= 5 && r.correct === r.total) confetti(140);
}
let SUM_WORDS = [];
function wl(w) { return `<button class="wl u${w.u}" data-word="${w.id}"><span class="fr" lang="fr">${esc(w.fr)}</span><span class="tr" lang="fr">${esc(gloss(w))}${trMode() === 'always' ? ` <i class="trmini" lang="tr">${esc(w.trMain)}</i>` : ''}</span><i class="dot ${status(w.id)}"></i></button>`; }

/* ---------- EŞLEŞTİRME (kitaptaki gibi, duraktan) ---------- */
let MT = null, MT_TIMER = 0;
function startMatch(u, g, mode) {
  const words = GROUPS[u + '-' + g].slice();
  mode = mode === 'dfn' || mode === 'def' ? mode : S.p.matchMode === 'dfn' ? 'dfn' : 'def';
  const target = w => { if (mode === 'dfn') { const d = fxOf(w).def; if (d) return d; } return gloss(w); };
  MT = { u, g, mode, words, right: shuffle(words.map(w => ({ id: w.id, text: target(w) }))), target, sel: null, done: new Set(), doneR: new Set(), miss: 0, t0: Date.now(), end: 0 };
  show('match'); renderMatch();
  stopMatchTimer(); MT_TIMER = setInterval(() => { const el = $('#mtime'); if (el && MT && !MT.end) el.textContent = fmtTime(Date.now() - MT.t0); }, 500);
}
function stopMatchTimer() { clearInterval(MT_TIMER); MT_TIMER = 0; }
function fmtTime(ms) { const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function renderMatch() {
  const m = MT, v = $('#v-match'); v.className = 'view u' + m.u;
  const best = S.p.match[m.u + '-' + m.g + '-' + m.mode], N = m.words.length;
  const left = m.words.map(w => `<button class="mitem ${m.done.has(w.id) ? 'done' : ''} ${m.sel === w.id ? 'sel' : ''}" data-ml="${w.id}" ${m.done.has(w.id) ? 'disabled' : ''} lang="fr"><span class="mk">${w.n}</span>${esc(w.fr)}</button>`).join('');
  const right = m.right.map((r, i) => `<button class="mitem ${m.doneR.has(i) ? 'done' : ''}" data-mr="${i}" ${m.doneR.has(i) ? 'disabled' : ''} lang="fr"><span class="mk">${LETTERS[i]}</span>${esc(r.text)}</button>`).join('');
  const fin = m.end ? `<div class="card" style="margin-top:16px;text-align:center">
      <h2 class="serif" style="font-size:1.8rem" lang="fr">${m.miss === 0 ? 'Sans faute !' : 'Terminé !'}</h2>
      <p class="muted" style="margin:6px 0 14px">${fmtTime(m.end - m.t0)} · ${m.miss} hata${best ? ' · en iyi süren ' + fmtTime(best * 1000) : ''}</p>
      <div class="sess-actions" style="justify-content:center"><button class="btn uc" data-mrestart>${IC('match')}Yeniden oyna</button>
        <button class="btn ghost" data-mmode="${m.mode === 'dfn' ? 'def' : 'dfn'}">${m.mode === 'dfn' ? 'Listeyle oyna' : 'Tanımlarla oyna'}</button>
        <button class="btn ghost" data-station="${m.u}-${m.g}">Durağa dön</button></div></div>` : '';
  v.innerHTML = `<div class="match-top">
      <button class="iconbtn" data-go="${PREV || DECKS[deckOf(m.u)].tab}" aria-label="Geri dön">${IC('x')}</button>
      ${badge(m.u)}
      <div style="min-width:0"><h2>Eşleştir</h2><span class="faint" style="font-weight:700">${esc(DECKS[deckOf(m.u)].name)} · Durak ${m.g} · ${esc(stationName(m.u, m.g))}</span></div>
      <span class="spacer"></span>
      <div class="seg" role="group" aria-label="Eşleştirme türü"><button data-mmode="def" aria-pressed="${m.mode === 'def'}">Liste</button><button data-mmode="dfn" aria-pressed="${m.mode === 'dfn'}">Tanım</button></div>
      <span class="mstat tnum">${IC('clock', 'sm')}<span id="mtime">${fmtTime((m.end || Date.now()) - m.t0)}</span></span><span class="mstat tnum" id="mscore">${m.done.size}/${N} · ${m.miss} hata</span>
    </div>
    <p class="faint" style="margin-bottom:12px;font-weight:700">Soldan bir kelime seç, sonra sağdan ${m.mode === 'dfn' ? 'Fransızca tanımını' : 'listedeki karşılığını (≠ olanlarda zıt anlamlısını)'} seç.</p>
    <div class="match"><div class="mcol">${left}</div><div class="mcol">${right}</div></div>${fin}`;
}
function matchLeft(id) { if (!MT || MT.end || MT.done.has(id)) return; MT.sel = MT.sel === id ? null : id; renderMatch(); }
function matchRight(i) {
  if (!MT || MT.end || MT.doneR.has(i)) return;
  if (!MT.sel) { toast('Önce soldan bir kelime seç'); return; }
  const w = BYID[MT.sel], N = MT.words.length;
  const R = BYID[MT.right[i].id];
  // aynı kelimenin farklı anlamları (suivre¹ … suivre⁴) aynı duraktaysa, hangisiyle eşlenirse eşlensin kabul
  if (normT(MT.right[i].text) === normT(MT.target(w)) || (R && baseKey(R) === baseKey(w))) {
    MT.done.add(w.id); MT.doneR.add(i); MT.sel = null; sfx('ok'); haptic('ok');
    if (MT.done.size === N) {
      MT.end = Date.now(); stopMatchTimer();
      const key = MT.u + '-' + MT.g + '-' + MT.mode, secs = Math.round((MT.end - MT.t0) / 1000);
      const best = S.p.match[key];
      if (!best || secs < best) S.p.match[key] = secs;
      addXP(15 + (MT.miss === 0 ? 10 : 0)); afterActivity(activity(N, 0)); touch();
      if (MT.miss === 0) confetti(120);
    }
    renderMatch(); sparksAt($(`[data-mr="${i}"]`), 12);
  } else {
    MT.miss++; sfx('no'); haptic('no');
    const el = $(`[data-mr="${i}"]`), el2 = $(`[data-ml="${w.id}"]`);
    [el, el2].forEach(e => { if (e) { e.classList.remove('bad'); void e.offsetWidth; e.classList.add('bad'); setTimeout(() => e.classList.remove('bad'), 450); } });
    const st = $('#mscore'); if (st) st.textContent = MT.done.size + '/' + N + ' · ' + MT.miss + ' hata';
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
  return `<div class="sheet-h">${u ? badge(u) : ''}<div style="min-width:0"><div class="faint" style="font-weight:800;font-size:.86rem">${label}</div><h2>${title}</h2></div>
    <button class="iconbtn close" data-close aria-label="Kapat">${IC('x')}</button></div>`;
}
function openWord(id) {
  const w = BYID[id]; if (!w) return;
  const st = status(id), r = S.w[id];
  let state = '';
  if (st === 'learn') state = `Basamak ${r[0] + 1}/5 · sıradaki tekrar ${relDue(r[1])}`;
  else if (st === 'master') state = 'Beş tekrarın hepsi tamam';
  else if (st === 'known') state = 'Keşifte “biliyorum” dedin';
  else state = 'Henüz öğrenilmedi';
  const acts = [];
  if (st === 'new' || st === 'known') acts.push(`<button class="btn uc sm" data-wact="learn" data-id="${id}">${IC('plus', 'sm')}Öğrenme listeme ekle</button>`);
  if (st === 'new') acts.push(`<button class="btn ghost sm" data-wact="know" data-id="${id}">${IC('check', 'sm')}Zaten biliyorum</button>`);
  if (st === 'master') acts.push(`<button class="btn ghost sm" data-wact="learn" data-id="${id}">${IC('review', 'sm')}Yeniden öğren</button>`);
  acts.push(`<button class="btn ghost sm" data-stword="${id}">${IC('bulb', 'sm')}${S.n[id] ? 'Notunu düzenle' : 'Bağ kur: not yaz'}</button>`);
  if (st !== 'new') acts.push(`<button class="btn ghost sm" data-wact="reset" data-id="${id}">İlerlemeyi sıfırla</button>`);
  acts.push(`<button class="btn ghost sm" data-station="${w.u}-${w.g}">${IC('map', 'sm')}Durağa git</button>`);
  openSheet(`<div class="u${w.u}">${sheetHead(`${esc(DECKS[w.deck].name)} · ${lineName(w.u)} · Durak ${w.g} · N° ${w.id}`, `<span lang="fr">${esc(w.fr)}</span>`, w.u)}
    <div class="row"><button class="speak" data-say="fr" data-id="${id}" aria-label="Telaffuzu dinle">${IC('speak')}</button>
      <span class="pill ${st}">${STATUS_TR[st]}</span>${isHard(id) ? '<span class="pill hard">Zorlu</span>' : ''}${genderChip(w)}
      <span class="faint" style="font-size:.9rem;font-weight:700">${state}</span><span class="spacer"></span>
      <button class="iconbtn" data-fav="${id}" aria-pressed="${!!S.f[id]}" aria-label="Yıldızla" style="${S.f[id] ? 'color:var(--or);border-color:var(--or)' : ''}">${IC('star')}</button></div>
    ${wordInfo(w)}
    <p class="listline"><span class="faint">Öğretmeninin listesinde</span> <b lang="fr">${esc(noSup(w.fr))}</b> <span class="lsym">${w.anti ? '≠' : '='}</span> <span lang="fr">${esc(w.def)}</span></p>
    ${r && st !== 'known' ? `<p class="faint" style="margin-top:12px;font-size:.88rem;font-weight:700">${r[2]} doğru · ${r[3]} yanlış</p>` : ''}
    <div class="row" style="margin-top:16px">${acts.join('')}</div></div>`);
}
function openStation(u, g) {
  const words = GROUPS[u + '-' + g], gc = counts(words), N = words.length;
  const due = words.filter(w => isDue(w.id));
  const bestD = S.p.match[u + '-' + g + '-def'], bestT = S.p.match[u + '-' + g + '-dfn'];
  const src = u === 5 ? 'y1' : 'u' + u;
  openSheet(`<div class="u${u}">${sheetHead(`${esc(DECKS[deckOf(u)].name)} · ${lineName(u)} · <span lang="fr">${esc(UNITS[u])}</span>`, `Durak ${g} · <span lang="fr">${esc(stationName(u, g))}</span>`, u)}
    <div class="row" style="margin-bottom:14px"><span class="pill new">${gc.new} yeni</span><span class="pill learn">${gc.learn} öğreniliyor</span><span class="pill master">${gc.master} ustalaşıldı</span><span class="pill known">${gc.known} biliyordum</span>
      ${bestD || bestT ? `<span class="faint" style="font-size:.86rem;font-weight:700">En iyi eşleştirme: ${bestD ? fmtTime(bestD * 1000) + ' (liste)' : ''}${bestD && bestT ? ' · ' : ''}${bestT ? fmtTime(bestT * 1000) + ' (tanım)' : ''}</span>` : ''}</div>
    <div class="tiles t2">
      <button class="tile" data-stgo="learn" data-st="${src}:${g}" ${gc.new ? '' : 'disabled'}>${IC('learn')}<b>Öğren (${gc.new})</b><span>Yeni kelimeleri basamak basamak: tanımı tanı, kelimeyi seç, kendin yaz. Bitenler tekrar listene girer.</span></button>
      <button class="tile" data-sact="discover" data-st="${u}-${g}" ${gc.new ? '' : 'disabled'}>${IC('plus')}<b>Hızlı keşif (${gc.new})</b><span>Kartı gör, biliyorsan geç; bilmiyorsan listene ekle.</span></button>
      <button class="tile" data-sact="match" data-st="${u}-${g}">${IC('match')}<b>Eşleştir</b><span>Listedeki gibi: ${N} kelime, ${N} karşılık. İstersen Fransızca tanımlarla.</span></button>
      <button class="tile" data-sact="test" data-st="${u}-${g}">${IC('target')}<b>Durak testi</b><span>${N} kelimenin hepsinden tanım, eş ve zıt anlam soruları.</span></button>
      <button class="tile" data-sact="review" data-st="${u}-${g}" ${due.length ? '' : 'disabled'}>${IC('review')}<b>Vadesi gelenler (${due.length})</b><span>Bu duraktaki tekrarları şimdi yap.</span></button>
      <button class="tile" data-stopen="${src}" data-g="${g}">${IC('studio')}<b>Stüdyo'da çalış</b><span>Bu durağı 17 moddan biriyle çalış: kartlar, Relevez, oyunlar…</span></button>
    </div>
    <div class="wlist" style="margin-top:14px">${words.map(wl).join('')}</div></div>`);
}
function openSettings() {
  const seg = (name, cur, opts) => `<div class="seg" role="group">${opts.map(([v, t]) => `<button data-set="${name}" data-val="${v}" aria-pressed="${String(cur) === String(v)}">${t}</button>`).join('')}</div>`;
  const tog = (name, on, label) => `<button class="toggle" role="switch" aria-checked="${!!on}" data-tog="${name}" aria-label="${label}"></button>`;
  openSheet(`${sheetHead('<span lang="fr">Réglages</span>', 'Ayarlar')}
    <div class="set-row"><div><div class="t">Görünüm</div><div class="d">Gece modu, sabah erken ya da akşam çalışırken gözü yormaz.</div></div>${seg('night', S.p.night ? 1 : 0, [[0, 'Gündüz'], [1, 'Gece']])}</div>
    <div class="set-row"><div><div class="t">Yazı boyutu</div><div class="d">Bütün metinleri birlikte büyütür.</div></div>${seg('fs', S.p.fs, [[1, 'A'], [1.12, 'A+'], [1.25, 'A++']])}</div>
    <div class="set-row"><div><div class="t">Türkçe destek</div><div class="d">Öğrenme Fransızca–Fransızca: tanım, eş ve zıt anlamlılar. Türkçe anlam ve cümle çevirisi yalnızca destek olarak; gizliyken de kartlarda “Türkçesini göster” ile açılır.</div></div>${seg('trs', trMode(), [['off', 'Gizli'], ['after', 'Cevaptan sonra'], ['always', 'Her zaman']])}</div>
    <div class="set-row"><div><div class="t">Günlük yeni kelime hedefi</div><div class="d">Öğren ve Keşfet ile listene eklediğin kelimeler sayılır.</div></div>${seg('goal', S.p.goal, [[5, '5'], [10, '10'], [15, '15'], [20, '20'], [30, '30']])}</div>
    <div class="set-row"><div><div class="t">1. Yazılı tarihi</div><div class="d">Geri sayım ve günlük tempo önerisi için.</div></div><input type="date" class="date-in" id="setExamDate" value="${esc(S.p.examDate || '')}" aria-label="Sınav tarihi"></div>
    <div class="set-row"><div><div class="t">Açılış animasyonu</div><div class="d">Uygulama açılırken metro kapıları açılır.</div></div>${seg('intro', S.p.intro, [['day', 'Günde bir'], ['always', 'Her açılışta'], ['off', 'Kapalı']])}</div>
    <div class="set-row"><div><div class="t">Titreşim</div><div class="d">Doğru ve yanlış cevapta kısa bir titreşim (Android).</div></div>${tog('haptic', S.p.haptic, 'Titreşim')}</div>
    <div class="set-row"><div><div class="t">Otomatik telaffuz</div><div class="d">Kart açılınca Fransızca kelimeyi seslendirir.</div></div>${tog('auto', S.p.auto, 'Otomatik telaffuz')}</div>
    <div class="set-row"><div><div class="t">Konuşma hızı</div></div>${seg('rate', S.p.rate, [[0.75, 'Yavaş'], [0.92, 'Normal'], [1.05, 'Hızlı']])}</div>
    <div class="set-row"><div><div class="t">Ses efektleri</div><div class="d">Doğru ve yanlış cevapta kısa bir ton.</div></div>${tog('sfx', S.p.sfx, 'Ses efektleri')}</div>
    <div class="set-row"><div><div class="t">Kayıt</div><div class="d">${SYNC.mode === 'cloud' ? 'İlerlemen hesabına kaydediliyor; tablet, telefon ve bilgisayarda aynı kalır.' : 'İlerlemen bu tarayıcıda tutuluyor. Tarayıcı verilerini silersen ilerleme de silinir.'}</div></div><span class="sync ${SYNC.mode === 'cloud' ? 'cloud' : ''}"></span></div>
    ${STANDALONE ? '' : `<div class="set-row"><div><div class="t">Uygulama olarak yükle</div><div class="d">Ana ekranına ikon olarak ekler; tam ekran ve çevrimdışı çalışır.</div></div><button class="btn sm" data-install>Yükle</button></div>`}
    <div class="set-row"><div><div class="t">Liste düzeltmeleri</div><div class="d">Kaynak listelerdeki hatalardan düzeltilen ${Object.keys(ALL_FIXES).length} madde (1. Yazılı, Thème 1, Thème 2).</div></div><button class="btn ghost sm" data-info="fixes">Listeyi gör</button></div>
    <div class="set-row"><div><div class="t">Nasıl çalışır?</div><div class="d">Tekrar sistemi ve Stüdyo modlarının bilimsel dayanağı.</div></div><button class="btn ghost sm" data-info="how">Açıklama</button></div>
    <div class="danger" id="dangerZone"><div class="row"><div style="flex:1;min-width:200px"><div class="t" style="font-weight:800">İlerlemeyi sıfırla</div><div class="d faint" style="font-size:.86rem">Bütün kelime durumları, notlar, XP, seri ve rekorlar silinir.</div></div><button class="btn sm no" data-reset1>Sıfırla…</button></div></div>`);
  const di = $('#setExamDate'); if (di) di.onchange = () => { S.p.examDate = di.value || ''; touch(); refreshUnder(); toast(di.value ? 'Sınav tarihi kaydedildi' : 'Sınav tarihi kaldırıldı'); };
}
function openInfo(kind) {
  if (kind === 'fixes') {
    const row = id => { const w = BYID[id]; return `<button class="wl u${w.u}" data-word="${id}"><span class="fr"><span lang="fr">${esc(w.fr)}</span><span class="faint" style="font-weight:700"> · ${id}</span></span><span class="tr" style="font-size:.9rem">${esc(ALL_FIXES[id])}</span><i class="dot ${status(id)}"></i></button>`; };
    const by = dk => Object.keys(ALL_FIXES).filter(id => BYID[id] && BYID[id].deck === dk).sort((a, b) => BYID[a].i - BYID[b].i);
    openSheet(`${sheetHead('Kaynakla karşılaştırma', 'Liste düzeltmeleri')}
      <p class="muted" style="margin-bottom:10px">Kaynaklarda bazı terimler yanlış basılmış ya da eşleşmeler kaymış. Uygulamada doğrusu kullanılıyor; her maddeye dokunarak ayrıntısını görebilirsin. Sınavda öğretmeninin listesindeki hâlin sorulabileceğini unutma; kelime kartında listedeki eşleşme ayrıca yazıyor.</p>
      ${DECK_ORDER.map(dk => { const ids = by(dk); return ids.length ? `<h3 class="sheet-sub">${esc(DECKS[dk].long)} (${ids.length})</h3><div class="wlist">${ids.map(row).join('')}</div>` : ''; }).join('')}`);
    return;
  }
  if (kind === 'levels') {
    const L = lvl(S.p.xp);
    openSheet(`${sheetHead('20e → 1er', 'Semtler')}<div class="level" style="margin-bottom:12px">${spiralSVG(L.arr)}<div><div class="arr serif" style="font-size:2rem;font-weight:800">${arrLabel(L.arr)}</div><div class="quart">${esc(L.name)}</div><p class="faint tnum" style="font-weight:700">${S.p.xp.toLocaleString('tr-TR')} XP</p></div></div>${routeHTML(L)}`);
    return;
  }
  openSheet(`${sheetHead('WordUp mantığı + Stüdyo', 'Nasıl çalışır?')}
    <div class="stack">
      <p><b>Üç ayrı deste.</b> 1. Yazılı (129 kelime, 12 durak), Thème 1 · Identités (1793 kelime, 163 durak) ve Thème 2 · Expériences (1584 kelime, 144 durak) ayrı sekmelerde. Tekrar, keşif, test, sınav maratonu ve Stüdyo setleri her zaman tek bir desteden gelir; çoktan seçmeli sorulardaki yanlış seçenekler bile aynı desteden seçilir.</p>
      <p><b>Fransızca–Fransızca.</b> Her kelimenin Fransızca tanımı (déf.), eş anlamlıları (syn.) ve zıt anlamlıları (ant.) birlikte öğrenilir. Kalın yazılanlar öğretmeninin listesindeki eşleşmedir ve hep önce gelir; ≠ işaretli maddelerde listedeki ifade zıt anlamlıdır. Türkçe yalnızca destek: Ayarlar → Türkçe destek ile gizleyebilir, cevaptan sonra ya da her zaman gösterebilirsin.</p>
      <p><b>Öğren ya da keşfet.</b> Öğren modu her kelimeyi üç basamaktan geçirir: kelimeyi görüp tanımını ya da listedeki eşini tanı, tanımdan veya eş/zıt anlamlıdan kelimeyi seç, en son tanımdan kendin yaz. Hızlı keşifte kartı görür, biliyorsan geçersin.</p>
      <p><b>Tekrar et.</b> Listendeki her kelime beş kez, giderek uzayan aralıklarla geri gelir: 1 gün, 3 gün, 1 hafta, 2 hafta ve 1 ay. Unutmanın başladığı ana denk gelen tekrar, hafızayı en çok güçlendiren tekrardır.</p>
      <p><b>Soru tipleri basamakla zorlaşır.</b> İlk tekrarda listedeki eşi ve tanımı tanıma; sonra tanımdan, eş anlamlıdan ya da zıt anlamlıdan kelimeyi bulma; ardından kelimenin eş ve zıt anlamlısını seçme (zıt anlam sorularında eş anlamlı bir tuzak seçenek olabilir) ve cümlede boşluk doldurma; en son kelimeyi tanımdan kendin yazma.</p>
      <p><b>Stüdyo neden var?</b> Hatırlamaya çalışmak (seçenek görmeden) okumaktan çok daha kalıcıdır; tekrarları zamana yaymak hepsini bir oturuma sıkıştırmaktan iyidir; kelimeyi farklı yönlerden çalışmak farklı bilgileri güçlendirir. Kendi cümleni ya da çağrışımını üretmek de hatırlamayı belirgin biçimde artırır.</p>
      <p><b>Ustalaşmak.</b> Beş tekrarın hepsini doğru bilen kelime ustalaşılmış sayılır. Her doğru cevap XP kazandırır; XP biriktikçe Paris'in 20. bölgesinden başlayıp Louvre'a, yani 1. bölgeye doğru ilerlersin.</p>
    </div>`);
}

/* ---------- XP, hedef, kutlama ---------- */
function addXP(n) {
  const a = lvl(S.p.xp).i; S.p.xp += n; const b = lvl(S.p.xp).i;
  if (b > a) { const L = lvl(S.p.xp); setTimeout(() => { toast(`Yeni semt: ${arrText(L.arr)} arrondissement · ${L.name}`, 'gold'); confetti(160); sfx('lvl'); haptic('big'); }, 300); }
}
function afterActivity(g) { if (g === 'goal') { addXP(30); setTimeout(() => { toast(`Günlük hedef tamam: ${S.p.goal} yeni kelime · +30 XP`, 'gold'); confetti(120); haptic('big'); }, 200); } updateChrome(); }
function toast(msg, kind) {
  const b = $('#toasts'); if (!b) return;
  while (b.children.length > 2) b.firstChild.remove();
  const t = document.createElement('div'); t.className = 'toast ' + (kind || ''); t.textContent = msg; b.appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity .35s, transform .35s'; t.style.opacity = '0'; t.style.transform = 'translateY(-8px)'; setTimeout(() => t.remove(), 380); }, 3000);
}

/* ---------- kaydırma (keşif kartı) ---------- */
function bindDrag(el, onL, onR) {
  if (!el) return;
  let x0 = null, y0 = 0, dx = 0, id = null;
  const L = el.querySelector('.swipe-tag.l'), R = el.querySelector('.swipe-tag.r');
  el.addEventListener('pointerdown', e => { if (e.target.closest('button,input,textarea')) return; x0 = e.clientX; y0 = e.clientY; dx = 0; id = e.pointerId; el.style.transition = 'none'; });
  el.addEventListener('pointermove', e => {
    if (x0 === null || e.pointerId !== id) return; dx = e.clientX - x0;
    if (Math.abs(e.clientY - y0) > Math.abs(dx) * 1.3 && Math.abs(dx) < 20) return;
    if (Math.abs(dx) > 8) { try { el.setPointerCapture(id); } catch (er) {} el.dataset.dragged = '1'; }
    el.style.transform = `translateX(${dx}px) rotate(${dx / 30}deg)`;
    if (L) L.style.opacity = dx < -30 ? Math.min(1, (-dx - 30) / 80) : 0; if (R) R.style.opacity = dx > 30 ? Math.min(1, (dx - 30) / 80) : 0;
  });
  const end = () => {
    if (x0 === null) return; x0 = null;
    el.style.transition = 'transform .25s ease';
    if (dx > 110) { el.style.transform = 'translateX(120%) rotate(12deg)'; setTimeout(onR, 160); }
    else if (dx < -110) { el.style.transform = 'translateX(-120%) rotate(-12deg)'; setTimeout(onL, 160); }
    else { el.style.transform = ''; if (L) L.style.opacity = 0; if (R) R.style.opacity = 0; }
    setTimeout(() => { delete el.dataset.dragged; }, 60);
  };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}
function bindSess() {
  if (SES && SES.kind === 'discover' && SES.phase === 'front') bindDrag($('#tk'), () => decide('learn'), () => decide('know'));
  const inp = $('#typed');
  if (inp && !inp.disabled) { setTimeout(() => inp.focus({ preventScroll: true }), 60); inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submitTyped(); } }); }
}

/* ---------- olaylar ---------- */
function applyPrefs() {
  document.documentElement.classList.toggle('night', !!S.p.night);
  document.documentElement.style.setProperty('--fs', S.p.fs || 1);
  const tc = document.querySelector('meta[name="theme-color"]'); if (tc) tc.content = S.p.night ? '#0C142D' : '#1C3984';
}
function goalLeftN() { const left = Math.max(0, S.p.goal - today()[1]); return left > 0 ? left : 10; }
/* eylemler: 'review:th2', 'discover:th1', 'learn:y1', 'hard:th2', 'free:th1', 'dline:6', 'rline:3' — hep tek deste */
function runAction(a) {
  const legacy = { 'review-y1': 'review:y1', 'th1-discover': 'discover:th1', 'discover-next': 'discover:th1', 'y1-discover': 'discover:y1', 'y1-learn': 'learn:y1',
    'practice-hard': 'hard:' + curDeck(), 'practice-learning': 'free:' + curDeck(), 'discover-line': 'dline:' + deckLine(curDeck() === 'y1' ? 'th1' : curDeck()), 'review-line': 'rline:' + deckLine(curDeck() === 'y1' ? 'th1' : curDeck()) };
  if (legacy[a]) { runAction(legacy[a]); return; }
  const [k, arg] = a.split(':'), dk = DECKS[arg] ? arg : null;
  if (k === 'review') {
    if (dk) { const d = dueList(null, dk); if (d.length) startReview(d, 'Tekrar · ' + DECKS[dk].name); else toast(DECKS[dk].name + ': şu an vadesi gelen kelime yok'); return; }
    const ds = DECK_ORDER.filter(d => dueList(null, d).length);
    if (ds.length === 1) runAction('review:' + ds[0]); else show('review');
  }
  else if (k === 'discover') { const d = dk || curDeck(); discoverNext(goalLeftN(), DECKS[d].units); }
  else if (k === 'learn') {
    const d = dk || curDeck(), ns = nextStation(d === 'y1' ? 5 : deckLine(d), DECKS[d].units);
    if (ns) stLaunch('learn', { set: { deck: d, src: d === 'y1' ? 'all' : 'u' + ns.u, g: ns.g, order: 'book' }, only: 'new', size: 0 });
    else stLaunch('test', { set: { deck: d, src: 'all', g: 0 } });
  }
  else if (k === 'hard') { const d = dk || curDeck(); startPractice(DECK_WORDS[d].filter(w => isHard(w.id)), 'Zorlu · ' + DECKS[d].name, 20, true); }
  else if (k === 'free') { const d = dk || curDeck(); startPractice(DECK_WORDS[d].filter(w => ['learn', 'master'].includes(status(w.id))), 'Serbest pratik · ' + DECKS[d].name, 20, true); }
  else if (k === 'dline') { const u = +arg; if (!UNIT_WORDS[u]) return; const ws = UNIT_WORDS[u].filter(w => status(w.id) === 'new').slice(0, Math.max(5, S.p.goal - today()[1]) || 10); startDiscover(ws, 'Keşif · ' + DECKS[deckOf(u)].name + ' · ' + lineName(u), [u]); }
  else if (k === 'rline') { const u = +arg; if (!UNIT_WORDS[u]) return; startReview(dueList(null, deckOf(u)).filter(w => w.u === u), 'Tekrar · ' + DECKS[deckOf(u)].name + ' · ' + lineName(u)); }
}
function insertAccent(ch, btn) {
  const box = btn && btn.closest('.accents');
  const id = box && box.dataset.for;
  const i = (id && document.getElementById(id)) || $('#typed') || $('.pl-in') || (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName) ? document.activeElement : null);
  if (!i || i.disabled) return;
  const p = i.selectionStart ?? i.value.length;
  i.value = i.value.slice(0, p) + ch + i.value.slice(i.selectionEnd ?? p);
  i.focus(); try { i.setSelectionRange(p + ch.length, p + ch.length); } catch (e) {}
  i.dispatchEvent(new Event('input', { bubbles: true }));
}
function bind() {
  document.addEventListener('pointerdown', e => { const a = e.target.closest && e.target.closest('[data-acc]'); if (a) e.preventDefault(); }, true);
  document.addEventListener('click', e => {
    const motd = e.target.closest('[data-motd]');
    if (motd && !e.target.closest('button')) { motd.classList.toggle('flip'); haptic('tap'); return; }
    const t = e.target.closest('button, [data-station], [data-plan]'); if (!t) { return; }
    const d = t.dataset;
    if (d.go) { closeSheet(); show(d.go); return; }
    if (t.id === 'brand') { show('home'); return; }
    if (t.id === 'btnSettings') { openSettings(); return; }
    if (t.id === 'btnInstall' || 'install' in d) { closeSheet(); doInstall(); return; }
    if ('close' in d) { closeSheet(); return; }
    if (d.run) { closeSheet(); runAction(d.run); return; }
    if (d.info) { openInfo(d.info); return; }
    if (d.plan) { const u = +d.plan, dk = deckOf(u); if (dk !== 'y1') { S.p.pl[dk] = u; touch(); } if (VIEW === dk) { renderDeck(dk); const lc = $('#lineCard-' + dk); if (lc && lc.getBoundingClientRect().top > innerHeight * 0.6) lc.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' }); } else show(dk === 'y1' ? 'yazili' : dk); return; }
    if (d.station) { const [u, g] = d.station.split('-').map(Number), dk = deckOf(u); if (dk !== 'y1' && VIEW !== dk && VIEW !== 'match') S.p.pl[dk] = u; openStation(u, g); return; }
    if (d.word) { openWord(d.word); return; }
    if (d.say) { const w = BYID[d.id] || (SES && SES.q && SES.q.w) || (SES && curItem().w); if (w) speak(d.say === 'ex' ? exPlain(w.ex) : speechText(w.fr), t); return; }
    if (d.dec) { decide(d.dec); return; }
    if (d.opt !== undefined) { chooseOpt(+d.opt); return; }
    if ('next' in d) { nextItem(); return; }
    if ('check' in d) { submitTyped(); return; }
    if ('override' in d) { overrideTyped(); return; }
    if (d.acc) { insertAccent(d.acc, t); return; }
    if ('hint' in d) { const h = $('#hint'); if (h) h.hidden = false; t.hidden = true; return; }
    if ('endsess' in d) { if (SES && SES.total + SES.learned.length + SES.known.length > 0) endSession(); else { SES = null; show(PREV || 'home'); } return; }
    if (d.size !== undefined) { S.p.sessSize = +d.size; touch(); renderReview(); return; }
    if (d.exam) { closeSheet(); const u = +d.exam; startPractice(UNIT_WORDS[u], 'Hat testi · ' + DECKS[deckOf(u)].name + ' · ' + lineName(u), 25); return; }
    if (d.lexd !== undefined) { LEX.d = d.lexd; LEX.u = 0; LEX.lim = 120; renderLex(); return; }
    if (d.lexu !== undefined) { LEX.u = +d.lexu; LEX.lim = 120; renderLex(); return; }
    if (d.lexs) { LEX.s = d.lexs; LEX.lim = 120; renderLex(); return; }
    if ('lexmore' in d) { LEX.lim += 200; renderLexList(); return; }
    if (d.sact) {
      const [u, g] = d.st.split('-').map(Number), ws = GROUPS[u + '-' + g]; closeSheet();
      if (d.sact === 'discover') startDiscover(ws.filter(w => status(w.id) === 'new'), 'Keşif · ' + DECKS[deckOf(u)].name + ' · Durak ' + g, [u]);
      else if (d.sact === 'match') startMatch(u, g);
      else if (d.sact === 'test') startPractice(ws, 'Durak testi · ' + DECKS[deckOf(u)].name + ' · ' + g, ws.length);
      else if (d.sact === 'review') startReview(ws.filter(w => isDue(w.id)), 'Tekrar · ' + DECKS[deckOf(u)].name + ' · Durak ' + g);
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
      touch(); if (!$('#sheetBg').hidden) openWord(id); refreshUnder(); return;
    }
    if (d.fav) { if (S.f[d.fav]) delete S.f[d.fav]; else S.f[d.fav] = 1; touch(); openWord(d.fav); refreshUnder(); return; }
    if (d.set) {
      const v = d.val;
      if (d.set === 'night') S.p.night = v === '1'; else if (d.set === 'fs') S.p.fs = +v; else if (d.set === 'goal') S.p.goal = +v; else if (d.set === 'rate') S.p.rate = +v; else if (d.set === 'intro') S.p.intro = v; else if (d.set === 'trs') S.p.trs = v;
      touch(); applyPrefs(); openSettings(); refreshUnder(); return;
    }
    if (d.tog) { S.p[d.tog] = !S.p[d.tog]; touch(); openSettings(); if (d.tog === 'sfx' && S.p.sfx) sfx('ok'); if (d.tog === 'haptic' && S.p.haptic) haptic('ok'); return; }
    if ('reset1' in d) { $('#dangerZone').innerHTML = `<p style="font-weight:800;margin-bottom:10px">Emin misin? Bu işlem geri alınamaz.</p><div class="row"><button class="btn ghost sm" data-reset0>Vazgeç</button><button class="btn no sm" data-reset2>Evet, her şeyi sıfırla</button></div>`; return; }
    if ('reset0' in d) { openSettings(); return; }
    if ('reset2' in d) { const keep = { night: S.p.night, fs: S.p.fs, goal: S.p.goal, auto: S.p.auto, sfx: S.p.sfx, rate: S.p.rate, haptic: S.p.haptic, intro: S.p.intro, introDay: S.p.introDay, examDate: S.p.examDate }; S = normalizeState({}); Object.assign(S.p, keep); touch(); closeSheet(); show('home'); toast('İlerleme sıfırlandı'); return; }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#sheetBg').hidden) { closeSheet(); return; }
    if (!$('#sheetBg').hidden) return;
    if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.matches && e.target.matches('[data-motd]')) { e.preventDefault(); e.target.classList.toggle('flip'); return; }
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
  let rz = 0; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (VIEW === 'th1' || VIEW === 'th2') drawMap(); moveInd(); }, 160); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); else if (!SES && !MT_TIMER && VIEW !== 'play' && VIEW !== 'examrun') refreshRemote(rerender); });
  window.addEventListener('pagehide', () => flush());
  setInterval(() => { const c = $('#boardClock'); if (c) { const d = new Date(); c.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); } }, 15000);
}
function refreshUnder() { if (PAGES.includes(VIEW)) show(VIEW, { instant: true }); updateChrome(); }

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
  show(['plan', 'review', 'lex', 'exam', 'yazili', 'studio', 'th1', 'th2'].includes(h) ? h : 'home', { instant: true });
  const dk = curDeck(), ny = nextStation(dk === 'y1' ? 5 : deckLine(dk), DECKS[dk].units);
  maybeIntro(ny ? stationName(ny.u, ny.g) : 'Métro des Mots');
  initRemote(() => { if (!SES && !MT_TIMER && VIEW !== 'play' && VIEW !== 'examrun') rerender(); });
}
