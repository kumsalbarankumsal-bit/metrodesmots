'use strict';
/* =====================================================================
   MÉTRO DES MOTS — Stüdyo
   Çalışma seti seçimi (önce deste) + 17 mod. Her mod: start · view · after · act · key · summary.
   Bütün modlar Fransızca–Fransızcadır: tanım, eş ve zıt anlamlılar; Türkçe yalnızca destek.
   Stüdyo modları takvimi bozmaz; yalnızca Öğren (ve Kartlar sonunda isteğe bağlı)
   biten yeni kelimeleri aralıklı tekrar listesine ekler.
   ===================================================================== */
const SR_API = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition || null) : null;
const ST_GROUPS = [
  { k: 'tanis', tr: 'Tanış', fr: 'Faire connaissance', d: 'İlk karşılaşma: kartlarla ayıkla, Öğren ile basamak basamak çalış.', modes: ['cards', 'learn'] },
  { k: 'yaz', tr: 'Hatırla ve yaz', fr: 'Se souvenir', d: 'Seçenek yok; kelimeyi kendin üretirsin. En kalıcı iz burada oluşur.', modes: ['write', 'spell', 'gap', 'dict'] },
  { k: 'ib', tr: 'IB sınavı gibi', fr: 'Comme à l’examen', d: 'Paper 2 soru tipleri ve geri bildirimsiz sınav provası.', modes: ['relevez', 'syn', 'test', 'exam'] },
  { k: 'oyun', tr: 'Oyunlar', fr: 'Jouer', d: 'Hız ve dikkat; tanımayı otomatikleştirir. Rekorlar sete göre tutulur.', modes: ['match', 'memory', 'eclair', 'metro'] },
  { k: 'derin', tr: 'Kalıcı yap', fr: 'Ancrer', d: 'Kendi bağlantını kur; cinsiyeti ve telaffuzu oturt.', modes: ['atelier', 'genre', 'speak'] }
];
const ST_FILTERS = [['due', 'Tekrarı gelenler'], ['hard', 'Zorlu'], ['fav', 'Yıldızlı'], ['mine', 'Öğrendiklerim']];

/* ---------- set: önce deste, sonra o destenin içinden kaynak (bütün deste · bir hat · tekrarı gelenler …) ---------- */
function stSet() { if (!S.p.st || typeof S.p.st !== 'object') S.p.st = { deck: curDeck(), src: 'all', g: 0, size: 20, order: 'smart' }; return stNormalize(S.p.st); }
function stUnitOf(sel) { if (sel.deck === 'y1') return sel.src === 'all' ? 5 : 0; const m = /^u(\d)$/.exec(sel.src || ''); return m ? +m[1] : 0; }
function stBase(sel) {
  const dk = DECKS[sel.deck] ? sel.deck : 'y1', D = DECK_WORDS[dk];
  let ws;
  const m = /^u(\d)$/.exec(sel.src || '');
  if (m && DECKS[dk].units.includes(+m[1])) ws = UNIT_WORDS[+m[1]];
  else if (sel.src === 'due') ws = dueList(null, dk);
  else if (sel.src === 'hard') ws = D.filter(w => isHard(w.id));
  else if (sel.src === 'fav') ws = D.filter(w => S.f[w.id]);
  else if (sel.src === 'mine') ws = D.filter(w => ['learn', 'master'].includes(status(w.id)));
  else ws = D;
  const u = stUnitOf(sel);
  if (u && sel.g) ws = ws.filter(w => w.g === sel.g);
  return ws;
}
function stOrdered(ws, order) {
  if (order === 'book') return ws.slice().sort((a, b) => a.i - b.i);
  if (order === 'rand') return shuffle(ws.slice());
  const b = [[], [], [], [], [], []];
  ws.forEach(w => { const s = status(w.id); b[isDue(w.id) ? 0 : isHard(w.id) ? 1 : s === 'learn' ? 2 : s === 'new' ? 3 : s === 'master' ? 4 : 5].push(w); });
  return [...shuffle(b[0]), ...shuffle(b[1]), ...b[2].sort((x, y) => stageOf(x.id) - stageOf(y.id)), ...b[3].sort((x, y) => x.i - y.i), ...shuffle(b[4]), ...shuffle(b[5])];
}
function stLabel(sel) {
  const dk = DECKS[sel.deck] ? sel.deck : 'y1', u = stUnitOf(sel), f = ST_FILTERS.find(x => x[0] === sel.src);
  let t = DECKS[dk].name;
  if (u && u !== 5) t += ' · ' + lineName(u);
  else if (f) t += ' · ' + f[1];
  else if (dk !== 'y1') t += ' · bütün deste';
  return u && sel.g ? `${t} · Durak ${sel.g} · ${stationName(u, sel.g)}` : t;
}
/* rekor anahtarı (eski kayıtlarla uyumlu: 'y1', 'u3' …) */
function stKey(sel) { const u = stUnitOf(sel), base = u ? (u === 5 ? 'y1' : 'u' + u) : sel.src === 'all' ? sel.deck : sel.deck + '-' + sel.src; return base + (sel.g ? '-' + sel.g : ''); }
function stOpt(k, def) { S.p.mo = S.p.mo || {}; const o = Object.assign({}, def, S.p.mo[k] || {}); S.p.mo[k] = o; return o; }
function stBest(P, val, lowerBetter) {
  const key = P.k + ':' + stKey(P.sel), cur = S.p.best[key];
  const better = cur === undefined || (lowerBetter ? val < cur : val > cur);
  if (better) S.p.best[key] = val;
  return { rec: better && cur !== undefined, first: cur === undefined, prev: cur };
}

/* ---------- ortak parçalar ---------- */
function spk(w, sm) { return `<button class="speak ${sm ? 'sm' : ''}" data-say="fr" data-id="${w.id}" aria-label="Telaffuzu dinle">${IC('speak', sm ? 'sm' : '')}</button>`; }
function qPrompt(q) { return qPromptHTML(q); }
function qOpts(q, ans, act) {
  return `<div class="opts">${q.options.map((o, i) => `<button class="opt ${ans ? (o.ok ? 'ok' : o.picked ? 'no' : 'dim') : ''}" data-pl="${act}" data-k="${i}" ${ans ? 'disabled' : ''} lang="fr"><span class="k">${i + 1}</span>${esc(o.text)}</button>`).join('')}</div>`;
}
/* yazma modlarında ipucu kutusu: tanım (yoksa eş/zıt anlamlı) + Türkçe her zaman açıksa */
function clueHTML(w, max) {
  const c = typeClue(w);
  return `<div class="mid qclue" lang="fr">${c.sym ? `<span class="qsym">${c.sym}</span>` : ''}<span>${esc(max ? cut(c.t, max) : c.t)}</span></div>${trMode() === 'always' ? `<p class="trhint">${esc(w.tr)}</p>` : ''}`;
}
function typeBox(P, ph) {
  return `<div class="typein"><input id="plIn" class="pl-in" type="text" lang="fr" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${ph || 'Fransızca yaz…'}" ${P.ans ? `disabled value="${esc(P.typed || '')}"` : ''} aria-label="Cevabın"><button class="btn" data-pl="check" ${P.ans ? 'disabled' : ''}>Kontrol et</button></div>${P.ans ? '' : accentsHTML('plIn')}`;
}
function diffHTML(given, target) {
  const a = [...String(given).toLowerCase()], b = [...target], n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j].toLowerCase() ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  let i = 0, j = 0, out = '';
  while (j < m) {
    if (i < n && a[i] === b[j].toLowerCase()) { out += esc(b[j]); i++; j++; }
    else if (i < n && dp[i + 1][j] >= dp[i][j + 1]) i++;
    else { out += `<mark class="miss">${esc(b[j])}</mark>`; j++; }
  }
  return out;
}
function accentNote(val, w) {
  const art = s => s.replace(/^(le|la|les|un|une|l’|se|s’)\s?/, '');
  const v = art(String(val).trim().toLowerCase().replace(/'/g, '’')), t = art(spellTarget(w));
  return v && v !== t && stripAcc(v) === stripAcc(t) ? `Aksanlara dikkat: doğrusu «${spellTarget(w)}»` : '';
}
function fbBlock(P, w, extra) {
  return `<div class="fb ${P.ok1 ? 'good' : 'bad'}" role="status"><div class="fb-h">${P.ok1 ? `<span class="badge-ok">${P.near ? 'Neredeyse' : 'Doğru'}</span>` : '<span class="badge-no">Yanlış</span>'}<span class="faint" style="font-size:.95rem">${esc(P.note || '')}</span></div>
    ${extra || ''}<div class="w-head"><div class="mid" lang="fr">${esc(w.fr)}</div>${spk(w, true)}</div>${wordInfo(w, { tight: true })}</div>`;
}
function nextBtns(P, label) {
  return `<div class="sess-actions">${P.canOv ? `<button class="btn ghost" data-pl="override">${IC('check')}Aslında doğru yazdım</button>` : ''}<button class="btn uc" data-pl="next">${label || 'Devam'}${IC('arrow')}</button></div><p class="kbd">Enter: devam</p>`;
}
function focusIn() { const i = $('#plIn'); if (i && !i.disabled) setTimeout(() => i.focus({ preventScroll: true }), 60); }

/* =====================================================================
   OYNATICI
   ===================================================================== */
let PL = null;
function stLaunch(k, over) {
  over = over || {};
  const M = MODES[k]; if (!M) return;
  const sel = stNormalize(Object.assign({}, stSet(), over.set || {}));
  if (over.persist) { Object.assign(stSet(), over.set || {}); touch(); }
  if (k === 'exam') { stExam(sel); return; }
  if (M.need === 'tts' && !TTS.ok) { toast('Bu cihazda sesli okuma yok; Dikte için Chrome ya da Samsung Internet dene'); return; }
  if (M.need === 'sr' && !SR_API) { toast('Bu tarayıcı konuşma tanımayı desteklemiyor; Android’de Chrome ile çalışır'); return; }
  let ws = over.ids ? over.ids.map(id => BYID[id]).filter(Boolean) : stOrdered(stBase(sel), sel.order);
  if (over.only === 'new') ws = ws.filter(w => status(w.id) === 'new');
  if (M.elig) ws = ws.filter(M.elig);
  if (M.uniq) ws = uniqBase(ws);
  const size = over.size !== undefined ? over.size : sel.size;
  if (size && !over.ids) ws = ws.slice(0, size);
  const min = M.min || 1;
  if (ws.length < min) { toast(ws.length ? `Bu mod için en az ${min} uygun kelime gerekiyor; sette ${ws.length} var. Daha büyük bir set seç.` : (M.none || 'Bu sette bu moda uygun kelime yok; başka bir set seç.')); return; }
  plStop();
  closeSheet();
  PL = { k, M, sel, over, words: ws, label: over.label || (stLabel(sel) + (over.only === 'new' ? ' · yeni kelimeler' : '')), xp0: S.p.xp, xpShown: 0, t0: Date.now(), ok: 0, no: 0, combo: 0, maxCombo: 0, wrong: new Set(), done: false, from: PAGES.includes(VIEW) ? VIEW : (PL && PL.from) || 'studio', tm: [] };
  M.start(PL);
  show('play'); plRender();
}
function stExam(sel) {
  const u = stUnitOf(sel);
  if (u && sel.g) { EXSET.type = 'range'; EXSET.u = u; EXSET.g1 = EXSET.g2 = sel.g; }
  else if (u) { EXSET.type = 'unit'; EXSET.u = u; }
  else exSetDeck(sel.deck);
  closeSheet(); show('exam');
}
function plStop() {
  if (!PL) return;
  (PL.tm || []).forEach(t => { clearTimeout(t); clearInterval(t); }); PL.tm = [];
  if (PL.raf) cancelAnimationFrame(PL.raf); PL.raf = 0;
  if (PL.rec) { try { PL.rec.abort(); } catch (e) {} PL.rec = null; }
}
function plRender() {
  if (!PL) return;
  const v = $('#v-play'), u = stUnitOf(PL.sel);
  v.className = `view play ${u ? 'u' + u : DECKS[PL.sel.deck] ? DECKS[PL.sel.deck].cls : 'u5'} m-${PL.k}`;
  v.innerHTML = plHeader() + (PL.done ? plSummaryHTML() : PL.M.view(PL));
  if (!PL.done && PL.M.after) PL.M.after(PL);
}
function plHeader() {
  const p = PL.done ? 1 : PL.M.progress ? Math.max(0, Math.min(1, PL.M.progress(PL))) : null;
  return `<div class="pl-top">
    <button class="iconbtn" data-pl="quit" aria-label="${PL.done ? 'Kapat' : 'Bitir'}">${IC('x')}</button>
    <div class="pl-t"><b>${IC(PL.M.ic, 'sm')}${esc(PL.M.tr)}</b><span>${esc(PL.label)}</span></div>
    ${!PL.done && PL.M.hud ? PL.M.hud(PL) : ''}
    <span class="combo" id="plCombo" ${PL.combo >= 3 && !PL.done ? '' : 'hidden'}>${IC('flame', 'sm')}<span>×${PL.combo}</span></span>
    <span class="pl-xp tnum" id="plXP">+${PL.xpShown} XP</span>
  </div>${p !== null ? `<div class="prog train"><span style="width:${(p * 100).toFixed(1)}%"></span></div>` : ''}`;
}
function plHud() {
  if (!PL) return;
  const c = $('#plCombo'); if (c) { c.hidden = !(PL.combo >= 3); const s = c.querySelector('span'); if (s) s.textContent = '×' + PL.combo; }
  const p = $('#v-play .prog span'); if (p && PL.M.progress && !PL.done) p.style.width = (Math.max(0, Math.min(1, PL.M.progress(PL))) * 100).toFixed(1) + '%';
  const h = $('#plHud'); if (h && PL.M.hud) h.outerHTML = PL.M.hud(PL);
}
function plScore(ok, w, o) {
  o = o || {};
  if (ok) { PL.ok++; PL.combo++; PL.maxCombo = Math.max(PL.maxCombo, PL.combo); if (o.xp) addXP(o.xp); }
  else { PL.no++; PL.combo = 0; if (w) PL.wrong.add(w.id); if (o.hard && w && S.w[w.id] && S.w[w.id][0] !== 9) S.w[w.id][3]++; }
  if (o.count !== false) afterActivity(activity(1, 0));
  touch();
}
function plFx(el, ok, xp) {
  if (!PL) return;
  haptic(ok ? 'ok' : 'no'); sfx(ok ? 'ok' : 'no');
  const P = PL, done = () => { if (PL !== P) return; P.xpShown = S.p.xp - P.xp0; const x = $('#plXP'); if (x) x.textContent = '+' + P.xpShown + ' XP'; };
  const c = $('#plCombo');
  if (ok) {
    if (el) sparksAt(el, 14);
    if (xp && el) flyTo(el, $('#plXP'), '+' + xp, 'xp', done); else done();
    if (c && P.combo >= 3) { c.hidden = false; c.querySelector('span').textContent = '×' + P.combo; if (P.combo % 5 === 0) { bump(c); sparksAt(c, 22, ['#F1B400', '#DF3E2C', '#FFFFFF']); haptic('big'); } }
  } else { if (el) shake(el); done(); if (c) c.hidden = true; }
}
function plFinish(st) {
  if (!PL || PL.done) return;
  plStop(); PL.done = true; PL.stats = st; PL.xpShown = S.p.xp - PL.xp0;
  touch(); flush(); plRender();
  try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
  if (st.confetti) setTimeout(() => confetti(st.confetti), 120);
}
function plSummaryHTML() {
  const s = PL.stats, wrong = [...PL.wrong].map(id => BYID[id]).filter(Boolean);
  return `<div class="card pl-sum">
     <div class="sum-head">${s.rec ? `<span class="recpill">${IC('trophy', 'sm')}Yeni rekor</span>` : ''}<h1 lang="${s.fr ? 'fr' : 'tr'}">${esc(s.title)}</h1>${s.big !== undefined ? `<div class="sum-big tnum">${s.big}</div>` : ''}<p class="muted">${esc(s.sub || '')}</p></div>
     <div class="sum-stats">${s.rows.map(([a, b]) => `<div class="stat"><b class="tnum">${b}</b><span>${a}</span></div>`).join('')}</div>
     ${s.note ? `<p class="pl-note">${s.note}</p>` : ''}
     ${s.btns ? `<div class="sess-actions">${s.btns}</div>` : ''}
     <div class="sess-actions">
        <button class="btn uc" data-pl="again">${IC('review')}${s.againLabel || 'Yeniden oyna'}</button>
        ${wrong.length && PL.k !== 'learn' ? `<button class="btn no" data-pl="wrong">${IC('learn')}Yanlışlarla Öğren (${wrong.length})</button>` : ''}
        <button class="btn ghost" data-pl="studio">${IC('studio')}Başka mod</button>
     </div></div>
     ${s.extra || ''}
     ${wrong.length && !s.noWrongList ? `<div class="card" style="margin-top:12px"><div class="card-h"><h2>Gözden geçir</h2><span class="faint" style="font-weight:700">${wrong.length} kelime</span></div><div class="wlist">${wrong.map(wl).join('')}</div></div>` : ''}`;
}
function plQuit() {
  if (!PL) { show('studio'); return; }
  if (PL.done || PL.ok + PL.no === 0) { const f = PL.from; plStop(); PL = null; show(f || 'studio'); return; }
  plFinish(PL.M.summary ? PL.M.summary(PL, true) : { title: 'Ara verdin', rows: [['Doğru', PL.ok], ['Yanlış', PL.no], ['XP', '+' + (S.p.xp - PL.xp0)]] });
}
function plAct(a, t, e) {
  if (!PL) return;
  if (a === 'quit') { plQuit(); return; }
  if (a === 'again') { const P = PL; stLaunch(P.k, Object.assign({}, P.over, { ids: P.words.map(w => w.id), set: P.sel, label: P.label })); return; }
  if (a === 'wrong') { const P = PL; stLaunch('learn', { ids: [...P.wrong], set: P.sel, label: 'Yanlışların · ' + P.M.tr }); return; }
  if (a === 'studio') { plStop(); PL = null; show('studio'); return; }
  if (PL.M.act) PL.M.act(PL, a, t, e);
}

/* =====================================================================
   MODLAR
   ===================================================================== */
const MODES = {};

/* ---------- Kartlar ---------- */
MODES.cards = {
  tr: 'Kartlar', fr: 'Cartes', ic: 'cards', grp: 'tanis', anim: 'cards', ill: '<i class="c1"></i><i class="c2"></i>',
  why: 'Önce hatırlamaya çalış, sonra çevir: arkada tanım, eş ve zıt anlamlılar. Bilmediğin kartlar yeni turda yeniden gelir.',
  start(P) { P.o = stOpt('cards', { front: 'fr' }); P.deck = shuffle(P.words.slice()); P.i = 0; P.round = 1; P.again = []; P.known = new Set(); P.first = new Set(); P.flip = false; },
  progress: P => P.known.size / P.words.length,
  hud: P => `<span class="hud" id="plHud">${P.round}. tur · ${P.deck.length - P.i} kart</span>`,
  view(P) {
    const w = P.deck[P.i], fr = P.o.front === 'fr';
    const frFace = `<div class="fl-top"><span class="tk-no">N° ${w.id}</span>${genderChip(w)}</div><div class="fl-mid"><div class="bigword" lang="fr">${esc(w.fr)}</div></div><div class="fl-bot">${spk(w)}<span class="faint">çevirmek için dokun</span></div>`;
    const X = fxOf(w), hint = X.def && X.syn.length ? `<p class="muted" lang="fr" style="margin-top:8px">≈ ${esc(X.syn.slice(0, 3).map(o => o.t).join(' · '))}</p>` : X.def && X.ant.length ? `<p class="muted" lang="fr" style="margin-top:8px">≠ ${esc(X.ant.slice(0, 2).map(o => o.t).join(' · '))}</p>` : '';
    const defFace = `<div class="fl-top"><span class="tk-no">Tanım</span></div><div class="fl-mid">${clueHTML(w)}${hint}</div><div class="fl-bot"><span class="faint">Hangi kelime? Çevir</span></div>`;
    const back = `<div class="fl-top"><span class="tk-no">${fr ? 'Tanım · eş · zıt' : 'Kelime'}</span>${genderChip(w)}</div>${fr ? '' : `<div class="w-head"><div class="bigword" lang="fr">${esc(w.fr)}</div>${spk(w)}</div>`}${wordInfo(w, { tight: true })}`;
    return `<div class="pl-tools"><div class="seg" role="group" aria-label="Kartın ön yüzü"><button data-pl="front" data-v="fr" aria-pressed="${fr}">Ön yüz: kelime</button><button data-pl="front" data-v="def" aria-pressed="${!fr}">Ön yüz: tanım</button></div></div>
      <div class="flash ${P.flip ? 'flip' : ''}" id="flash" data-pl="flip" role="button" tabindex="0" aria-label="Kartı çevir">
        <span class="swipe-tag l">TEKRAR</span><span class="swipe-tag r">BİLİYORUM</span>
        <div class="flash-in"><div class="flash-face f">${fr ? frFace : defFace}</div><div class="flash-face b">${back}</div></div>
      </div>
      <div class="decide"><button class="btn ghost" data-pl="no">${IC('review')}Tekrar gelsin</button><button class="btn ok" data-pl="yes">${IC('check')}Biliyorum</button></div>
      <p class="kbd">Boşluk: çevir · ← tekrar gelsin · → biliyorum · kartı kaydırabilirsin</p>`;
  },
  after(P) {
    bindDrag($('#flash'), () => cardsDecide(P, false), () => cardsDecide(P, true));
    if (S.p.auto && P.o.front === 'fr' && !P.flip) { const w = P.deck[P.i]; P.tm.push(setTimeout(() => { if (PL === P && P.deck[P.i] === w) speak(speechText(w.fr)); }, 220)); }
  },
  act(P, a, t) {
    if (a === 'flip') { const el = $('#flash'); if (!el || el.dataset.dragged) return; P.flip = !P.flip; el.classList.toggle('flip', P.flip); if (P.flip && P.o.front !== 'fr' && S.p.auto) speak(speechText(P.deck[P.i].fr)); return; }
    if (a === 'yes' || a === 'no') { cardsDecide(P, a === 'yes'); return; }
    if (a === 'front') { P.o.front = t.dataset.v; touch(); P.flip = false; plRender(); return; }
    if (a === 'mk-learn') { const ids = P.toLearn || []; ids.forEach(id => learnWord(id)); afterActivity(activity(0, ids.length)); addXP(5 * ids.length); touch(); toast(`${ids.length} kelime öğrenme listene eklendi · ilk tekrar yarın`); P.toLearn = []; P.stats.btns = cardsBtns(P); plRender(); return; }
    if (a === 'mk-known') { const ids = P.toKnow || []; ids.forEach(id => knowWord(id)); touch(); toast(`${ids.length} kelime “biliyordum” olarak işaretlendi`); P.toKnow = []; P.stats.btns = cardsBtns(P); plRender(); }
  },
  key(P, e, inInput) { if (inInput) return; if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); MODES.cards.act(P, 'flip'); } else if (e.key === 'ArrowRight') cardsDecide(P, true); else if (e.key === 'ArrowLeft') cardsDecide(P, false); },
  summary(P, early) {
    P.toLearn = P.words.filter(w => !P.first.has(w.id) && status(w.id) === 'new').map(w => w.id);
    P.toKnow = [...P.first].filter(id => status(id) === 'new');
    const st = { title: early ? 'Ara verdin' : 'Bütün kartlar tamam', big: `${P.first.size}/${P.words.length}`, sub: 'ilk turda bildiğin kartlar',
      rows: [['Tur', P.round], ['Kart', P.words.length], ['Bilmediğin', P.words.length - P.first.size], ['XP', '+' + (S.p.xp - P.xp0)]],
      note: 'Bilmediğin kartlar için en iyi sonraki adım Öğren modu: aynı kelimeleri önce seçerek, sonra yazarak çalıştırır.' };
    P.stats = st; st.btns = cardsBtns(P); return st;
  }
};
function cardsBtns(P) {
  return (P.toLearn && P.toLearn.length ? `<button class="btn uc" data-pl="mk-learn">${IC('plus')}Bilmediğim ${P.toLearn.length} yeni kelimeyi listeme ekle</button>` : '')
    + (P.toKnow && P.toKnow.length ? `<button class="btn ghost" data-pl="mk-known">${IC('check')}İlk turda bildiğim ${P.toKnow.length} yeni kelimeyi “biliyordum” say</button>` : '');
}
function cardsDecide(P, yes) {
  if (P.busy || P.done) return; P.busy = true;
  const w = P.deck[P.i], el = $('#flash');
  if (yes) { P.known.add(w.id); if (P.round === 1) P.first.add(w.id); addXP(1); PL.ok++; }
  else { P.again.push(w); PL.wrong.add(w.id); PL.no++; }
  afterActivity(activity(1, 0)); touch(); haptic(yes ? 'ok' : 'tap');
  outAnim(el, yes ? 'r' : 'l', () => {
    P.busy = false; P.i++; P.flip = false;
    if (P.i >= P.deck.length) {
      if (P.again.length) { P.deck = shuffle(P.again); P.again = []; P.i = 0; P.round++; toast(`${P.round}. tur · bilmediğin ${P.deck.length} kart`); }
      else { addXP(10); plFinish(MODES.cards.summary(P, false)); return; }
    }
    plRender();
  });
}

/* ---------- Öğren ---------- */
MODES.learn = {
  tr: 'Öğren', fr: 'Apprendre', ic: 'learn', grp: 'tanis', anim: 'steps', ill: '<i></i><i></i><i></i>',
  why: 'Her kelime üç basamaktan geçer: tanımını tanı, kelimeyi seç, tanımdan yaz. Bitenler aralıklı tekrar listene girer.',
  start(P) {
    P.lv = {}; P.miss = {}; P.words.forEach(w => { P.lv[w.id] = 0; P.miss[w.id] = 0; });
    P.queue = P.words.slice(); P.active = []; P.recent = []; P.finished = []; P.added = 0;
    learnFill(P); learnNext(P);
  },
  progress: P => P.words.reduce((s, w) => s + P.lv[w.id], 0) / (P.words.length * 3),
  hud: P => `<span class="hud" id="plHud">${P.finished.length}/${P.words.length} tamam</span>`,
  view(P) {
    const q = P.q, w = q.w, Lc = Math.max(0, Math.min(2, P.qL || 0));
    const strip = P.active.concat(P.finished.slice(-3)).map(x => `<i class="lv${Math.min(3, P.lv[x.id])} ${x === w ? 'cur' : ''}" title="${esc(cleanTerm(x.fr))}"></i>`).join('');
    let body;
    if (q.type === 'type') body = typeBox(P) + (P.ans ? '' : `<div class="row" style="margin-top:8px"><span class="spacer"></span><button class="linkbtn" data-pl="idk">Bilmiyorum</button></div>`);
    else body = qOpts(q, P.ans, 'opt');
    const extra = q.type === 'type' && P.typed && (!P.ok1 || P.near) ? `<p>Doğrusu: <b lang="fr">${diffHTML(P.typed, spellTarget(w))}</b></p>` : '';
    return `<div class="lv-strip" aria-label="Çalışılan kelimeler ve basamakları">${strip}</div>
      <div class="ticket ${P.ans ? '' : 'enter'}" id="tk">${P.ans && P.ok1 ? '<i class="punch" aria-hidden="true"></i>' : ''}
        <div class="tk-top"><span class="tk-no">${['Tanı', 'Seç', 'Yaz'][Lc]} · basamak ${Lc + 1}/3</span><span class="stage">${[0, 1, 2].map(i => `<i class="${i < P.lv[w.id] ? 'on' : ''}"></i>`).join('')}</span></div>
        ${qPrompt(q)}${body}
        ${P.ans ? (P.ok1 && !P.near ? `<div class="fb good slim" role="status"><div class="fb-h"><span class="badge-ok">Doğru</span><span class="faint" style="font-size:.95rem">${esc(P.note)}</span></div><p class="faint" style="font-weight:700" lang="fr">${esc(frHead(w))} <span class="lsym">${w.anti ? '≠' : '='}</span> ${esc(listText(w))}</p>${trMode() === 'always' ? `<p class="trhint">${esc(w.tr)}</p>` : ''}</div>` : fbBlock(P, w, extra)) : ''}
      </div>
      ${P.ans ? nextBtns(P) : `<p class="kbd">${q.type === 'type' ? 'Enter: kontrol et' : '1–4 ile seçebilirsin'}</p>`}`;
  },
  after(P) {
    focusIn();
    if (S.p.auto && WORD_PROMPT.has(P.q.type) && !P.ans) { const w = P.q.w; P.tm.push(setTimeout(() => { if (PL === P && P.q.w === w && !P.ans) speak(speechText(w.fr)); }, 220)); }
  },
  act(P, a, t) {
    if (a === 'opt' && !P.ans) { const o = P.q.options[+t.dataset.k]; if (!o) return; o.picked = true; P.typed = null; P.near = false; P.canOv = false; learnAnswer(P, o.ok); plRender(); plFx($(`[data-pl="opt"][data-k="${t.dataset.k}"]`), o.ok, o.ok ? 3 : 0); if (o.ok) learnAuto(P, 800); return; }
    if ((a === 'check' || a === 'idk') && !P.ans) {
      const v = a === 'idk' ? '' : (($('#plIn') || {}).value || '').trim(); if (a === 'check' && !v) return;
      const res = a === 'idk' ? 'no' : checkTyped(v, P.q.w);
      P.typed = v; P.near = res === 'near'; P.canOv = res === 'no' && a !== 'idk';
      learnAnswer(P, res !== 'no');
      if (res !== 'no') { const an = accentNote(v, P.q.w); if (an) { P.near = true; P.note = an; } }
      plRender(); plFx($('#plIn') || $('#tk'), res !== 'no', res !== 'no' ? 3 : 0);
      if (res !== 'no' && !P.near) learnAuto(P, 1000);
      return;
    }
    if (a === 'override' && P.canOv) { const w = P.q.w; P.canOv = false; P.lv[w.id] = Math.min(3, (P.qL || 0) + 1); P.miss[w.id] = Math.max(0, P.miss[w.id] - 1); PL.no--; PL.ok++; PL.wrong.delete(w.id); P.ok1 = true; P.note = 'Doğru sayıldı'; if (P.lv[w.id] >= 3) learnDone(P, w); plRender(); return; }
    if (a === 'next' && P.ans) learnGo(P);
  },
  key(P, e, inInput) {
    if (inInput) { if (e.key === 'Enter') { e.preventDefault(); MODES.learn.act(P, P.ans ? 'next' : 'check'); } return; }
    if (!P.ans && /^[1-4]$/.test(e.key) && P.q.options) { const b = $(`[data-pl="opt"][data-k="${+e.key - 1}"]`); if (b) MODES.learn.act(P, 'opt', b); }
    else if (P.ans && e.key === 'Enter') { e.preventDefault(); learnGo(P); }
  },
  summary(P, early) {
    const acc = PL.ok + PL.no ? Math.round(PL.ok / (PL.ok + PL.no) * 100) : 0;
    const hard = P.words.filter(w => P.miss[w.id] >= 2).length;
    const dk = DECKS[P.sel.deck] ? P.sel.deck : 'y1';
    const ny = P.over && P.over.only === 'new' && !early ? nextStation(dk === 'y1' ? 5 : (stUnitOf(P.sel) || deckLine(dk)), DECKS[dk].units) : null;
    return { title: early ? 'Mola' : 'Öğrendin !', big: `${P.finished.length}/${P.words.length}`, sub: 'kelime üç basamağı da geçti',
      btns: ny ? `<button class="btn uc" data-run="learn:${dk}">${IC('arrow')}Sonraki durak: ${esc(DECKS[dk].name)} · ${esc(stationName(ny.u, ny.g))}</button>` : '',
      rows: [['Doğruluk', '%' + acc], ['Listene giren', P.added], ['Zorlandığın', hard], ['Süre', fmtTime(Date.now() - P.t0)]],
      note: P.added ? `${P.added} kelime aralıklı tekrar listene girdi; ilk tekrarları yarın. Tekrarları yaptıkça 3 gün, 1 hafta, 2 hafta ve 1 ay sonra yeniden gelecekler.` : (early ? 'Kaldığın kelimeler bir dahaki Öğren oturumunda yine önüne gelir.' : ''),
      againLabel: 'Aynı kelimelerle yeniden', confetti: !early && P.finished.length >= 5 ? 120 : 0 };
  }
};
function learnFill(P) { while (P.active.length < 7 && P.queue.length) P.active.push(P.queue.shift()); }
function learnNext(P) {
  if (!P.active.length) { plFinish(MODES.learn.summary(P, false)); return false; }
  let cand = P.active.filter(w => !P.recent.includes(w.id)); if (!cand.length) cand = P.active;
  const minL = Math.min(...cand.map(w => P.lv[w.id]));
  const pool = cand.filter(w => P.lv[w.id] <= minL + (Math.random() < .3 ? 1 : 0));
  const w = pick(pool), L = P.lv[w.id];
  const X = fxOf(w), seeT = ['def2fr', 'syn2fr', 'ant2fr'].filter(t => qAvail(w, t));
  const type = L === 0 ? (X.def && !X.defL && Math.random() < .5 ? 'fr2def' : 'list')
    : L === 1 ? (seeT.length ? pick(seeT) : 'list')
    : (qAvail(w, 'type') ? 'type' : qAvail(w, 'cloze') ? 'cloze' : seeT.length ? pick(seeT) : 'list');
  P.q = makeQ(w, 'practice', type); P.qL = L; P.ans = false; P.typed = null; P.near = false; P.canOv = false; P.note = '';
  P.recent.push(w.id); if (P.recent.length > 2) P.recent.shift();
  return true;
}
function learnDone(P, w) {
  P.active = P.active.filter(x => x !== w); if (!P.finished.includes(w)) P.finished.push(w);
  if (status(w.id) === 'new') {
    learnWord(w.id); if (P.miss[w.id]) S.w[w.id][3] = P.miss[w.id]; P.added++; afterActivity(activity(0, 1)); touch();
    P.addedNote = true;
  }
  learnFill(P);
}
function learnAnswer(P, ok) {
  const w = P.q.w;
  P.ans = true; P.ok1 = ok;
  if (ok) { P.lv[w.id]++; if (P.lv[w.id] >= 3) { P.addedNote = false; learnDone(P, w); P.note = P.addedNote ? 'Tamam · tekrar listene girdi, ilk tekrar yarın' : 'Bu kelime tamam'; } else P.note = P.lv[w.id] === 1 ? 'Sırada: tanımdan kelimeyi seçmek' : 'Sırada: tanımdan kendin yazmak'; }
  else { P.lv[w.id] = Math.max(0, P.lv[w.id] - 1); P.miss[w.id]++; P.note = 'Bir basamak geri; birazdan yeniden gelecek'; }
  plScore(ok, w, { xp: ok ? 3 : 0, hard: true });
}
function learnAuto(P, ms) { const q = P.q; P.tm.push(setTimeout(() => { if (PL === P && P.q === q && P.ans && !P.done) learnGo(P); }, ms)); }
function learnGo(P) { if (learnNext(P)) plRender(); }

/* ---------- Yaz ---------- */
MODES.write = {
  tr: 'Yaz', fr: 'Écrire', ic: 'type', grp: 'yaz', anim: 'type', ill: '<i class="ln"></i><i class="cur"></i>', elig: w => typeable(w),
  why: 'Tanımı oku, kelimeyi kendin yaz. Kendin üretmek, seçenekten tanımaktan çok daha kalıcıdır.',
  start(P) { P.list = P.words.slice(); P.i = 0; P.first = new Set(); P.tries = {}; P.hint = 0; P.ans = false; },
  progress: P => P.i / P.list.length,
  hud: P => `<span class="hud" id="plHud">${Math.min(P.i + 1, P.list.length)}/${P.list.length}</span>`,
  view(P) {
    const w = P.list[P.i], tgt = spellTarget(w);
    const mask = [...tgt].map((ch, k) => /[\s’'\-.]/.test(ch) ? ch : k < P.hint ? ch : '·').join('');
    const extra = P.ans && P.typed && (!P.ok1 || P.near) ? `<p>Doğrusu: <b lang="fr">${diffHTML(P.typed, tgt)}</b></p>` : '';
    return `<div class="ticket ${P.ans ? '' : 'enter'}" id="tk">${P.ans && P.ok1 ? '<i class="punch" aria-hidden="true"></i>' : ''}
      <div class="tk-top"><span class="tk-no">Kelimeyi yaz</span>${P.tries[w.id] ? '<span class="pill hard">Yeniden</span>' : ''}</div>
      ${clueHTML(w)}
      ${fxOf(w).defL ? '' : `<p class="muted" lang="fr" style="margin-top:6px">${w.anti ? '≠ ' : '≈ '}${esc(listText(w))}</p>`}
      ${P.hint && !P.ans ? `<p class="hintmask" lang="fr">${esc(mask)}</p>` : ''}
      ${typeBox(P)}
      ${P.ans ? fbBlock(P, w, extra) : `<div class="row" style="margin-top:8px"><button class="linkbtn" data-pl="hint">İpucu: bir harf aç</button><span class="spacer"></span><button class="linkbtn" data-pl="idk">Bilmiyorum</button></div>`}
    </div>
    ${P.ans ? nextBtns(P) : '<p class="kbd">Enter: kontrol et</p>'}`;
  },
  after() { focusIn(); },
  act(P, a) {
    const w = P.list[P.i];
    if (a === 'hint' && !P.ans) { P.hint = Math.min(spellTarget(w).length - 1, P.hint + 1); const v = ($('#plIn') || {}).value || ''; plRender(); const i = $('#plIn'); if (i) i.value = v; return; }
    if ((a === 'check' || a === 'idk') && !P.ans) {
      const v = a === 'idk' ? '' : (($('#plIn') || {}).value || '').trim(); if (a === 'check' && !v) return;
      const res = a === 'idk' ? 'no' : checkTyped(v, w), first = !P.tries[w.id] && !P.hint;
      P.ans = true; P.typed = v; P.ok1 = res !== 'no'; P.near = res === 'near'; P.canOv = res === 'no' && a !== 'idk';
      P.note = P.ok1 ? (first ? 'İlk denemede' : P.hint ? 'İpucuyla' : 'Bu sefer tamam') : 'Bu kelime sonda bir kez daha gelecek';
      if (P.ok1) { const an = accentNote(v, w); if (an) { P.near = true; P.note = an; } if (first) P.first.add(w.id); }
      else { P.tries[w.id] = (P.tries[w.id] || 0) + 1; if (P.tries[w.id] <= 2) P.list.push(w); }
      plScore(P.ok1, w, { xp: P.ok1 ? (first ? 4 : 2) : 0, hard: true });
      plRender(); plFx($('#plIn'), P.ok1, P.ok1 ? (first ? 4 : 2) : 0);
      return;
    }
    if (a === 'override' && P.canOv) {
      P.canOv = false; P.ok1 = true; P.note = 'Doğru sayıldı'; PL.no--; PL.ok++; PL.wrong.delete(w.id);
      for (let k = P.list.length - 1; k > P.i; k--) if (P.list[k] === w) { P.list.splice(k, 1); break; }
      P.tries[w.id] = Math.max(0, (P.tries[w.id] || 1) - 1); plRender(); return;
    }
    if (a === 'next' && P.ans) { P.i++; P.hint = 0; P.ans = false; P.typed = ''; if (P.i >= P.list.length) plFinish(MODES.write.summary(P, false)); else plRender(); }
  },
  key(P, e, inInput) { if (e.key === 'Enter') { e.preventDefault(); MODES.write.act(P, P.ans ? 'next' : 'check'); } },
  summary(P, early) {
    const n = new Set(P.list.slice(0, Math.max(P.i, 1)).map(w => w.id)).size, pct = n ? Math.round(P.first.size / n * 100) : 0;
    return { title: early ? 'Ara verdin' : pct >= 85 ? 'Parfait !' : 'Bien écrit', fr: true, big: '%' + pct, sub: 'ilk denemede, ipucusuz doğru',
      rows: [['Kelime', n], ['İlk denemede', P.first.size], ['Yanlış', PL.wrong.size], ['Süre', fmtTime(Date.now() - P.t0)]], confetti: !early && pct >= 90 && n >= 5 ? 120 : 0 };
  }
};

/* ---------- Harf harf ---------- */
const SP_PH = /^(qqch|qqn|f\.|qqch\.)$/;
function spellBuild(w) {
  const t = spellTarget(w), words = t.split(' '), movable = words.filter(x => !SP_PH.test(x));
  const letters = movable.join('').replace(/[’'\-.]/g, '').length;
  if (movable.length >= 3 || letters > 16) {
    const slots = [];
    words.forEach(x => { const last = slots[slots.length - 1]; if (SP_PH.test(x)) { if (last && last.fix) last.fix += ' ' + x; else slots.push({ fix: x }); } else slots.push({ want: x }); });
    return { mode: 'word', t, slots, tiles: shuffle(movable.map((x, i) => ({ ch: x, id: i }))), mis: 0, slotMis: 0 };
  }
  const slots = [];
  words.forEach((x, wi) => {
    const last = slots[slots.length - 1];
    if (SP_PH.test(x) && last && last.ph) { last.fix += ' ' + x; return; }
    if (wi) slots.push({ fix: ' ' });
    if (SP_PH.test(x)) { slots.push({ fix: x, ph: true }); return; }
    for (const ch of x) slots.push(/[’'\-.]/.test(ch) ? { fix: ch } : { want: ch });
  });
  const wants = slots.filter(s => s.want).map(s => s.want);
  return { mode: 'letter', t, slots, tiles: shuffle([...wants, ...spellExtras(wants)].map((ch, i) => ({ ch, id: i }))), mis: 0, slotMis: 0 };
}
function spellExtras(chars) {
  const V = { e: ['é', 'è'], é: ['e', 'è'], è: ['é', 'e'], ê: ['é', 'è'], a: ['à', 'â'], à: ['a', 'â'], â: ['a', 'à'], i: ['î'], î: ['i'], o: ['ô'], ô: ['o'], u: ['û', 'ù'], û: ['u'], ù: ['u'], c: ['ç'], ç: ['c'] };
  const out = [];
  for (const ch of shuffle(chars.slice())) { const v = V[ch]; if (v) { const p = pick(v); if (!chars.includes(p) && !out.includes(p)) out.push(p); } if (out.length >= 2) break; }
  return out;
}
function spellNeed(c) { return c.slots.find(s => s.want && !s.got); }
MODES.spell = {
  tr: 'Harf harf', fr: 'Lettre à lettre', ic: 'tiles', grp: 'yaz', anim: 'tiles', ill: '<i>é</i><i>t</i><i>a</i>',
  elig: w => { const t = spellTarget(w).replace(/[^a-zàâäçéèêëîïôöùûüœæ]/gi, ''); return t.length >= 3 && spellTarget(w).length <= 40; },
  why: 'Karışık harflerden kelimeyi kur; é ile e’yi doğru yere koymayı da öğretir.',
  start(P) { P.list = shuffle(P.words.slice()); P.i = 0; P.c = spellBuild(P.list[0]); P.perfect = 0; P.solved = false; },
  progress: P => (P.i + (P.solved ? 1 : 0)) / P.list.length,
  hud: P => `<span class="hud" id="plHud">${P.i + 1}/${P.list.length}</span>`,
  view(P) {
    const w = P.list[P.i], c = P.c, need = spellNeed(c);
    const slots = c.slots.map(s => s.fix === ' ' ? '<span class="sl gap"></span>' : s.fix ? `<span class="sl fx">${esc(s.fix)}</span>` : `<span class="sl ${s.got ? 'on' : ''} ${s === need ? 'cur' : ''} ${c.mode === 'word' ? 'wd' : ''}">${s.got ? esc(s.got) : ''}</span>`).join('');
    const hintCh = need && c.slotMis >= 2 ? need.want : null;
    const tiles = c.tiles.map(t => `<button class="tile-l ${t.used ? 'used' : ''} ${c.mode === 'word' ? 'wd' : ''} ${hintCh && !t.used && t.ch === hintCh ? 'glow' : ''}" data-pl="tile" data-k="${t.id}" ${t.used || P.solved ? 'disabled' : ''} lang="fr">${esc(t.ch)}</button>`).join('');
    return `<div class="ticket" id="tk">${P.solved ? '<i class="punch" aria-hidden="true"></i>' : ''}
      <div class="tk-top"><span class="tk-no">${c.mode === 'word' ? 'Kelimeleri sırala' : 'Harfleri sırala'}</span><span class="faint" style="font-weight:700">${c.mis ? c.mis + ' hata' : ''}</span></div>
      ${clueHTML(w, 110)}
      ${fxOf(w).defL ? '' : `<p class="muted" lang="fr" style="margin-top:6px">${w.anti ? '≠ ' : '≈ '}${esc(trunc(listText(w), 90))}</p>`}
      <div class="slots ${c.mode}" id="spSlots" lang="fr">${slots}</div>
      ${P.solved ? `<div class="fb good slim"><div class="fb-h"><span class="badge-ok">${c.mis ? 'Tamam' : 'Hatasız'}</span>${spk(w, true)}</div><div class="exbox"><div style="flex:1;min-width:0"><div class="fr" lang="fr">${exHTML(w.ex)}</div>${trMode() === 'off' ? '' : `<div class="tr">${esc(w.et)}</div>`}</div></div></div>` : `<div class="tiles-l ${c.mode}">${tiles}</div>`}
    </div>
    ${P.solved ? nextBtns(P, P.i + 1 >= P.list.length ? 'Bitir' : 'Sonraki') : `<p class="kbd">${c.mode === 'word' ? 'Kelimelere doğru sırayla dokun' : 'Harflere sırayla dokun · klavyeyle de yazabilirsin'}</p>`}`;
  },
  act(P, a, t) {
    if (a === 'tile' && !P.solved) spellTap(P, +t.dataset.k, t);
    if (a === 'next' && P.solved) spellNext(P);
  },
  key(P, e, inInput) {
    if (inInput) return;
    if (P.solved) { if (e.key === 'Enter') { e.preventDefault(); spellNext(P); } return; }
    if (P.c.mode !== 'letter' || e.key.length !== 1 || e.ctrlKey || e.metaKey) return;
    const need = spellNeed(P.c); if (!need) return;
    const k = e.key.toLowerCase();
    if (k === need.want || stripAcc(k) === stripAcc(need.want) && !P.c.tiles.some(x => !x.used && x.ch === k && x.ch !== need.want)) {
      const tile = P.c.tiles.find(x => !x.used && x.ch === need.want); if (tile) spellTap(P, tile.id, $(`[data-pl="tile"][data-k="${tile.id}"]`));
    } else { const tile = P.c.tiles.find(x => !x.used && x.ch === k); spellTap(P, tile ? tile.id : -1, tile ? $(`[data-pl="tile"][data-k="${tile.id}"]`) : null); }
  },
  summary(P, early) {
    const n = P.i + (P.solved ? 1 : 0);
    return { title: early ? 'Ara verdin' : 'Harf harf tamam', big: `${P.perfect}/${n}`, sub: 'kelimeyi hatasız kurdun', rows: [['Kelime', n], ['Hatasız', P.perfect], ['Toplam hata', PL.no], ['Süre', fmtTime(Date.now() - P.t0)]], confetti: !early && n >= 5 && P.perfect === n ? 110 : 0 };
  }
};
function spellTap(P, id, el) {
  const c = P.c, need = spellNeed(c), tile = c.tiles.find(x => x.id === id);
  if (!need) return;
  if (tile && !tile.used && tile.ch === need.want) {
    tile.used = true; need.got = tile.ch; c.slotMis = 0; haptic('tap');
    if (!spellNeed(c)) {
      P.solved = true; const w = P.list[P.i]; if (!c.mis) P.perfect++;
      plScore(true, w, { xp: c.mis ? 2 : 4 }); plRender(); plFx($('#spSlots'), true, c.mis ? 2 : 4);
      if (S.p.auto) speak(speechText(w.fr));
      return;
    }
    plRender();
  } else {
    c.mis++; c.slotMis++; PL.no++; PL.combo = 0; PL.wrong.add(P.list[P.i].id); haptic('no'); sfx('no');
    if (el) shake(el); else shake($('#spSlots'));
    if (c.slotMis === 2) plRender();
    const h = $('.ticket .tk-top .faint'); if (h) h.textContent = c.mis + ' hata';
  }
}
function spellNext(P) { P.i++; P.solved = false; if (P.i >= P.list.length) { addXP(5); plFinish(MODES.spell.summary(P, false)); return; } P.c = spellBuild(P.list[P.i]); plRender(); }

/* ---------- Boşluk doldur ---------- */
MODES.gap = {
  tr: 'Boşluk doldur', fr: 'Phrase à trous', ic: 'gap', grp: 'yaz', anim: 'gap', ill: '<i class="t"></i><i class="g"></i><i class="t2"></i>',
  elig: w => w.brackets === 1 && bracketText(w).length <= 40,
  why: 'Kelimeyi cümlede, çekimli hâliyle yaz. Yazılıda tam olarak bu istenir.',
  start(P) { P.list = P.words.slice(); P.i = 0; P.first = 0; P.tries = {}; P.showTr = false; P.showW = false; P.ans = false; },
  progress: P => P.i / P.list.length,
  hud: P => `<span class="hud" id="plHud">${Math.min(P.i + 1, P.list.length)}/${P.list.length}</span>`,
  view(P) {
    const w = P.list[P.i], m = w.ex.match(/^(.*?)\[([^\]]+)\](.*)$/) || ['', '', bracketText(w), ''];
    const ansW = m[2];
    const input = P.ans ? `<span class="gapans ${P.ok1 ? 'ok' : 'no'}">${esc(P.typed || '—')}</span>${P.ok1 && !P.near ? '' : ` <span class="gapright">${esc(ansW)}</span>`}`
      : `<input id="plIn" class="pl-in gapin" type="text" lang="fr" autocomplete="off" autocapitalize="off" spellcheck="false" style="width:${Math.max(5, ansW.length + 2)}ch" aria-label="Boşluğa gelen kelime">`;
    return `<div class="ticket ${P.ans ? '' : 'enter'}" id="tk">${P.ans && P.ok1 ? '<i class="punch" aria-hidden="true"></i>' : ''}
      <div class="tk-top"><span class="tk-no">Boşluğa uygun kelimeyi yaz</span><span class="faint gap-aim" lang="fr">aranan: ${typeClue(w).sym ? typeClue(w).sym + ' ' : ''}${esc(cut(typeClue(w).t, 64))}</span></div>
      <p class="gapline" lang="fr">${esc(m[1])}${input}${esc(m[3])}</p>
      ${P.ans ? '' : `${accentsHTML('plIn')}<div class="row" style="margin-top:10px;gap:16px">${trMode() !== 'always' ? '' : P.showTr ? `<span class="muted">${esc(w.et)}</span>` : '<button class="linkbtn" data-pl="tr">Cümlenin Türkçesi</button>'}${P.showW ? `<span class="faint" style="font-weight:700">sözlük hâli: <b lang="fr">${esc(w.fr)}</b></span>` : '<button class="linkbtn" data-pl="word">Kelimeyi göster</button>'}<span class="spacer"></span><button class="linkbtn" data-pl="idk">Bilmiyorum</button></div>
        <div class="sess-actions"><button class="btn" data-pl="check">Kontrol et</button></div>`}
      ${P.ans ? fbBlock(P, w) : ''}
    </div>${P.ans ? nextBtns(P) : '<p class="kbd">Enter: kontrol et</p>'}`;
  },
  after() { focusIn(); },
  act(P, a) {
    const w = P.list[P.i];
    if (a === 'tr' || a === 'word') { const v = ($('#plIn') || {}).value || ''; if (a === 'tr') P.showTr = true; else P.showW = true; plRender(); const i = $('#plIn'); if (i) { i.value = v; } return; }
    if ((a === 'check' || a === 'idk') && !P.ans) {
      const v = a === 'idk' ? '' : (($('#plIn') || {}).value || '').trim(); if (a === 'check' && !v) return;
      const tgt = bracketText(w), cv = canon(v), ct = canon(tgt);
      let ok = !!cv && cv === ct, near = false;
      if (!ok && cv && ct.length >= 5 && lev(cv, ct) <= 1) { ok = true; near = true; }
      P.ans = true; P.typed = v; P.ok1 = ok; P.near = near; P.canOv = false;
      const first = !P.tries[w.id] && !P.showW;
      P.note = ok ? (near ? 'Küçük bir yazım farkı: «' + tgt + '»' : first ? 'İlk denemede' : '') : (v && checkTyped(v, w) === 'ok' ? `Kelime doğru; cümledeki hâli «${tgt}»` : 'Bu cümle sonda bir kez daha gelecek');
      if (ok && !near && stripAcc(v.toLowerCase()) === stripAcc(tgt.toLowerCase()) && v.toLowerCase() !== tgt.toLowerCase()) { P.near = true; P.note = `Aksanlara dikkat: «${tgt}»`; }
      if (ok && first) P.first++;
      if (!ok) { P.tries[w.id] = (P.tries[w.id] || 0) + 1; if (P.tries[w.id] <= 2) P.list.push(w); }
      plScore(ok, w, { xp: ok ? (first ? 4 : 2) : 0, hard: true });
      plRender(); plFx($('.gapans') || $('#tk'), ok, ok ? (first ? 4 : 2) : 0);
      return;
    }
    if (a === 'next' && P.ans) { P.i++; P.ans = false; P.showTr = false; P.showW = false; if (P.i >= P.list.length) plFinish(MODES.gap.summary(P, false)); else plRender(); }
  },
  key(P, e) { if (e.key === 'Enter') { e.preventDefault(); MODES.gap.act(P, P.ans ? 'next' : 'check'); } },
  summary(P, early) {
    const n = new Set(P.list.slice(0, Math.max(1, P.i)).map(w => w.id)).size, pct = n ? Math.round(P.first / n * 100) : 0;
    return { title: early ? 'Ara verdin' : 'Phrases complètes', fr: !early, big: '%' + pct, sub: 'ilk denemede, ipucusuz doğru', rows: [['Cümle', n], ['İlk denemede', P.first], ['Yanlış', PL.wrong.size], ['Süre', fmtTime(Date.now() - P.t0)]], confetti: !early && pct >= 90 && n >= 5 ? 110 : 0 };
  }
};

/* ---------- Dikte ---------- */
MODES.dict = {
  tr: 'Dikte', fr: 'Dictée', ic: 'dict', grp: 'yaz', anim: 'wave', ill: '<i></i><i></i><i></i>', need: 'tts', elig: w => typeable(w),
  why: 'Duy ve yaz: ses ile yazımı birbirine bağlar, aksanları kulaktan tanıtır.',
  start(P) { P.list = shuffle(P.words.slice()); P.i = 0; P.first = 0; P.tries = {}; P.ans = false; },
  progress: P => P.i / P.list.length,
  hud: P => `<span class="hud" id="plHud">${Math.min(P.i + 1, P.list.length)}/${P.list.length}</span>`,
  view(P) {
    const w = P.list[P.i];
    const extra = P.ans && P.typed && (!P.ok1 || P.near) ? `<p>Doğrusu: <b lang="fr">${diffHTML(P.typed, spellTarget(w))}</b></p>` : '';
    return `<div class="ticket ${P.ans ? '' : 'enter'}" id="tk">${P.ans && P.ok1 ? '<i class="punch" aria-hidden="true"></i>' : ''}
      <div class="tk-top"><span class="tk-no">Duyduğunu yaz</span>${P.tries[w.id] ? '<span class="pill hard">Yeniden</span>' : ''}</div>
      <div class="dict-row"><button class="dict-play" data-pl="play" aria-label="Kelimeyi dinle">${IC('speak', 'lg')}</button><button class="btn sm ghost" data-pl="slow">Yavaş dinle</button>${P.ans ? '' : '<button class="linkbtn" data-pl="tr">Tanımı göster</button>'}</div>
      ${P.showTr && !P.ans ? `<div style="margin-top:8px">${clueHTML(w, 140)}</div>` : ''}
      ${typeBox(P, 'Duyduğunu yaz…')}
      ${P.ans ? fbBlock(P, w, extra) : '<div class="row" style="margin-top:8px"><span class="spacer"></span><button class="linkbtn" data-pl="idk">Bilmiyorum</button></div>'}
    </div>${P.ans ? nextBtns(P) : '<p class="kbd">Enter: kontrol et · tanımlıkları (le, la, un…) yazmak zorunda değilsin</p>'}`;
  },
  after(P) { focusIn(); if (!P.ans && !P.played) { P.played = true; const w = P.list[P.i]; P.tm.push(setTimeout(() => { if (PL === P && P.list[P.i] === w) speak(speechText(w.fr)); }, 300)); } },
  act(P, a, t) {
    const w = P.list[P.i];
    if (a === 'play') { speak(speechText(w.fr), t); focusIn(); return; }
    if (a === 'slow') { speak(speechText(w.fr), t, 0.62); focusIn(); return; }
    if (a === 'tr') { const v = ($('#plIn') || {}).value || ''; P.showTr = true; plRender(); const i = $('#plIn'); if (i) i.value = v; return; }
    if ((a === 'check' || a === 'idk') && !P.ans) {
      const v = a === 'idk' ? '' : (($('#plIn') || {}).value || '').trim(); if (a === 'check' && !v) return;
      const res = a === 'idk' ? 'no' : checkTyped(v, w), first = !P.tries[w.id];
      P.ans = true; P.typed = v; P.ok1 = res !== 'no'; P.near = res === 'near'; P.canOv = res === 'no' && a !== 'idk'; P.note = '';
      if (P.ok1) { const an = accentNote(v, w); if (an) { P.near = true; P.note = an; } if (first) P.first++; }
      else { P.tries[w.id] = (P.tries[w.id] || 0) + 1; if (P.tries[w.id] <= 2) P.list.push(w); P.note = 'Sonda bir kez daha gelecek'; }
      plScore(P.ok1, w, { xp: P.ok1 ? 3 : 0 }); plRender(); plFx($('#plIn'), P.ok1, P.ok1 ? 3 : 0);
      return;
    }
    if (a === 'override' && P.canOv) { P.canOv = false; P.ok1 = true; P.note = 'Doğru sayıldı'; PL.no--; PL.ok++; PL.wrong.delete(w.id); for (let k = P.list.length - 1; k > P.i; k--) if (P.list[k] === w) { P.list.splice(k, 1); break; } plRender(); return; }
    if (a === 'next' && P.ans) { P.i++; P.ans = false; P.showTr = false; P.played = false; if (P.i >= P.list.length) plFinish(MODES.dict.summary(P, false)); else plRender(); }
  },
  key(P, e) { if (e.key === 'Enter') { e.preventDefault(); MODES.dict.act(P, P.ans ? 'next' : 'check'); } },
  summary(P, early) { const n = new Set(P.list.slice(0, Math.max(1, P.i)).map(w => w.id)).size; return { title: early ? 'Ara verdin' : 'Dictée finie', fr: !early, big: `${P.first}/${n}`, sub: 'ilk denemede doğru yazdın', rows: [['Kelime', n], ['İlk denemede', P.first], ['Yanlış', PL.wrong.size], ['Süre', fmtTime(Date.now() - P.t0)]] }; }
};

/* ---------- Relevez (IB Paper 2) ---------- */
function relTokens(ex) {
  const out = []; let inB = false; const re = /\[|\]|\s+|[^\s\[\]]+/g; let m;
  while ((m = re.exec(ex))) { const s = m[0]; if (s === '[') inB = true; else if (s === ']') inB = false; else if (/^\s+$/.test(s)) out.push({ sp: true }); else out.push({ t: s, b: inB, word: /[\p{L}\p{N}]/u.test(s) }); }
  return out;
}
MODES.relevez = {
  tr: 'Relevez', fr: 'Relevez', ic: 'mark', grp: 'ib', anim: 'hl', ill: '<i class="l1"></i><i class="l2"></i><i class="hl"></i>', elig: w => w.brackets === 1,
  why: 'Paper 2’nin “Relevez le mot qui signifie…” sorusu: anlamı verilen kelimeyi cümlede bul.',
  start(P) { P.list = P.words.slice(); P.i = 0; P.first = 0; P.tries = {}; P.pick = -1; P.ans = false; P.tr = false; },
  progress: P => P.i / P.list.length,
  hud: P => `<span class="hud" id="plHud">${Math.min(P.i + 1, P.list.length)}/${P.list.length}</span>`,
  view(P) {
    const w = P.list[P.i], tk = relTokens(w.ex);
    const sent = tk.map((x, k) => x.sp ? ' ' : !x.word ? `<span class="rp">${esc(x.t)}</span>` : `<button class="rtok ${P.ans ? (x.b ? 'hit' : k === P.pick ? 'miss' : '') : ''}" data-pl="tok" data-k="${k}" ${P.ans ? 'disabled' : ''}>${esc(x.t)}</button>`).join('');
    return `<div class="ib-paper ticket ${P.ans ? '' : 'enter'}" id="tk">
      <div class="tk-top"><span class="tk-no" lang="fr">Paper 2 · question ${P.i + 1}</span>${P.tries[w.id] ? '<span class="pill hard">Yeniden</span>' : ''}</div>
      <p class="ib-q" lang="fr">Relevez dans la phrase le mot ou l’expression qui signifie${w.anti ? ' le contraire de' : ''} : <b>« ${esc(w.def)} »</b></p>
      <p class="ib-help">${P.tr || P.ans ? `İpucu: <b lang="fr">${esc(fxOf(w).def && !fxOf(w).defL ? fxOf(w).def : '«' + bracketText(w).charAt(0) + '…» ile başlıyor')}</b>${trMode() === 'always' ? ` · ${esc(w.trMain)}` : ''}` : '<button class="linkbtn" data-pl="tr">İpucu</button>'} · cümlede doğru kelimeye dokun</p>
      <div class="ib-sent" lang="fr">${sent}</div>
      ${P.ans ? fbBlock(P, w, P.ok1 ? '' : `<p>Cevap: <b lang="fr">${esc(bracketText(w))}</b></p>`) : ''}
    </div>${P.ans ? nextBtns(P) : '<p class="kbd">Cümledeki kelimeye dokun</p>'}`;
  },
  act(P, a, t) {
    const w = P.list[P.i];
    if (a === 'tr') { P.tr = true; plRender(); return; }
    if (a === 'tok' && !P.ans) {
      const k = +t.dataset.k, tk = relTokens(w.ex), ok = !!(tk[k] && tk[k].b), first = !P.tries[w.id] && !P.tr;
      P.ans = true; P.pick = k; P.ok1 = ok; P.near = false; P.canOv = false; P.note = ok ? (first ? 'İlk denemede' : '') : 'Bu cümle sonda yeniden gelecek';
      if (ok && first) P.first++;
      if (!ok) { P.tries[w.id] = (P.tries[w.id] || 0) + 1; if (P.tries[w.id] <= 2) P.list.push(w); }
      plScore(ok, w, { xp: ok ? (first ? 4 : 2) : 0, hard: true });
      plRender(); plFx($(ok ? '.rtok.hit' : '.rtok.miss'), ok, ok ? (first ? 4 : 2) : 0);
      return;
    }
    if (a === 'next' && P.ans) { P.i++; P.ans = false; P.tr = false; P.pick = -1; if (P.i >= P.list.length) plFinish(MODES.relevez.summary(P, false)); else plRender(); }
  },
  key(P, e) { if (P.ans && e.key === 'Enter') { e.preventDefault(); MODES.relevez.act(P, 'next'); } },
  summary(P, early) { const n = new Set(P.list.slice(0, Math.max(1, P.i)).map(w => w.id)).size, pct = n ? Math.round(P.first / n * 100) : 0; return { title: early ? 'Ara verdin' : pct >= 85 ? 'Excellent !' : 'Bien relevé', fr: true, big: '%' + pct, sub: 'ilk denemede, ipucusuz bulduğun', rows: [['Soru', n], ['İlk denemede', P.first], ['Yanlış', PL.wrong.size], ['Süre', fmtTime(Date.now() - P.t0)]], confetti: !early && pct >= 90 && n >= 5 ? 110 : 0 }; }
};

/* ---------- Eş & zıt anlamlılar ---------- */
function synQ(w, kind) {
  const X = fxOf(w);
  let k = kind === 'syn' || kind === 'ant' ? kind : (X.syn.length && (!X.ant.length || Math.random() < .55) ? 'syn' : 'ant');
  if (k === 'syn' && !X.syn.length) k = 'ant';
  if (k === 'ant' && !X.ant.length) k = 'syn';
  const mine = (k === 'syn' ? X.syn : X.ant).map(o => o.t);
  const correct = shuffle(mine.slice()).slice(0, Math.min(3, mine.length));
  const other = k === 'syn' ? X.ant : X.syn;
  const trap = other.length && (k === 'ant' || Math.random() < .5) ? [pick(other).t] : [];
  const ds = textDistractors(w, 6 - correct.length - trap.length, c => (k === 'syn' ? fxOf(c).syn : fxOf(c).ant).map(o => o.t));
  return { w, k, opts: shuffle([...correct.map(t => ({ t, ok: true })), ...trap.map(t => ({ t, ok: false, trap: true })), ...ds.map(t => ({ t, ok: false }))]) };
}
MODES.syn = {
  tr: 'Eş & zıt anlam', fr: 'Synonymes · antonymes', ic: 'equal', grp: 'ib', anim: 'syn', ill: '<i class="p"></i><b>=</b><i class="p"></i>', elig: w => fxOf(w).syn.length + fxOf(w).ant.length > 0, min: 3,
  why: 'Kelimenin bütün eş anlamlılarını ya da zıt anlamlılarını seç. Dikkat: zıt anlam sorusunda bir eş anlamlı tuzak olarak durabilir.',
  start(P) { P.o = stOpt('syn', { kind: 'mix' }); P.list = P.o.kind === 'mix' ? P.words.slice() : P.words.filter(w => (P.o.kind === 'syn' ? fxOf(w).syn : fxOf(w).ant).length); if (!P.list.length) P.list = P.words.slice(); P.i = 0; P.q = synQ(P.list[0], P.o.kind); P.chosen = new Set(); P.ans = false; P.perfect = 0; },
  progress: P => P.i / P.list.length,
  hud: P => `<span class="hud" id="plHud">${P.i + 1}/${P.list.length}</span>`,
  view(P) {
    const q = P.q, w = q.w, nOk = q.opts.filter(o => o.ok).length;
    const chips = q.opts.map((o, i) => { const s = P.chosen.has(i), cls = P.ans ? (o.ok && s ? 'ok' : o.ok ? 'missed' : s ? 'no' : 'dim') : s ? 'on' : ''; return `<button class="syn ${cls}" data-pl="sy" data-k="${i}" ${P.ans ? 'disabled' : ''} aria-pressed="${s}" lang="fr">${P.ans && o.ok && !s ? '<small>kaçırdın</small>' : P.ans && o.trap ? `<small>${q.k === 'ant' ? 'eş anlamlı' : 'zıt anlamlı'}</small>` : ''}${esc(o.t)}</button>`; }).join('');
    const kseg = [['mix', 'Karışık'], ['syn', 'Eş anlamlı'], ['ant', 'Zıt anlamlı']].map(([k, t]) => `<button data-pl="sk" data-v="${k}" aria-pressed="${P.o.kind === k}">${t}</button>`).join('');
    return `<div class="pl-tools"><div class="seg" role="group" aria-label="Soru türü">${kseg}</div></div>
      <div class="ticket ${P.ans ? '' : 'enter'}" id="tk">${P.ans && P.ok1 ? '<i class="punch" aria-hidden="true"></i>' : ''}
      <div class="tk-top"><span class="tk-no">${q.k === 'syn' ? 'Eş anlamlılarını seç' : 'Zıt anlamlılarını seç'}</span><span class="faint" style="font-weight:700">${nOk > 1 && P.ans ? nOk + ' doğru vardı' : ''}</span></div>
      <div class="w-head"><div class="bigword" lang="fr">${esc(w.fr)}</div>${spk(w)}</div>
      <p class="muted" style="margin-top:4px">${q.k === 'syn' ? 'Hangileri aynı anlama gelir (≈)?' : 'Hangileri zıt anlama gelir (≠)?'} Bir, iki ya da üç doğru olabilir.</p>
      <div class="syn-grid">${chips}</div>
      ${P.ans ? fbBlock(P, w) : ''}
    </div>
    ${P.ans ? nextBtns(P) : `<div class="sess-actions"><button class="btn" data-pl="sycheck" ${P.chosen.size ? '' : 'disabled'}>Kontrol et</button></div><p class="kbd">Seçeneklere dokun, sonra kontrol et</p>`}`;
  },
  act(P, a, t) {
    if (a === 'sk') { P.o.kind = t.dataset.v; touch(); const done = P.i; MODES.syn.start(P); P.i = Math.min(done, P.list.length - 1); P.q = synQ(P.list[P.i], P.o.kind); plRender(); return; }
    if (a === 'sy' && !P.ans) { const k = +t.dataset.k; if (P.chosen.has(k)) P.chosen.delete(k); else P.chosen.add(k); t.classList.toggle('on'); t.setAttribute('aria-pressed', P.chosen.has(k)); const c = $('[data-pl="sycheck"]'); if (c) c.disabled = !P.chosen.size; haptic('tap'); return; }
    if (a === 'sycheck' && !P.ans && P.chosen.size) {
      const q = P.q, ok = q.opts.every((o, i) => o.ok === P.chosen.has(i));
      const hits = q.opts.filter((o, i) => o.ok && P.chosen.has(i)).length, tot = q.opts.filter(o => o.ok).length, trapped = q.opts.some((o, i) => o.trap && P.chosen.has(i));
      P.ans = true; P.ok1 = ok; P.near = false; P.note = ok ? 'Hepsi doğru' : trapped ? (q.k === 'ant' ? 'Tuzağa düştün: işaretlediğin biri eş anlamlı' : 'Tuzağa düştün: işaretlediğin biri zıt anlamlı') : hits ? `${tot} doğrudan ${hits} tanesini buldun` : '';
      if (ok) P.perfect++;
      plScore(ok, q.w, { xp: ok ? 4 : hits ? 1 : 0, hard: true });
      plRender(); plFx($('.syn-grid'), ok, ok ? 4 : 0);
      return;
    }
    if (a === 'next' && P.ans) { P.i++; P.ans = false; P.chosen = new Set(); if (P.i >= P.list.length) plFinish(MODES.syn.summary(P, false)); else { P.q = synQ(P.list[P.i], P.o.kind); plRender(); } }
  },
  key(P, e) { if (P.ans && e.key === 'Enter') { e.preventDefault(); MODES.syn.act(P, 'next'); } else if (!P.ans && e.key === 'Enter' && P.chosen.size) { e.preventDefault(); MODES.syn.act(P, 'sycheck'); } },
  summary(P, early) { const n = P.i + (P.ans ? 1 : 0); return { title: early ? 'Ara verdin' : 'Synonymes et antonymes : fini', fr: !early, big: `${P.perfect}/${Math.max(1, n)}`, sub: 'soruda doğruların hepsini buldun', rows: [['Soru', n], ['Tam isabet', P.perfect], ['Eksik/yanlış', n - P.perfect], ['Süre', fmtTime(Date.now() - P.t0)]] }; }
};

/* ---------- Test ---------- */
MODES.test = {
  tr: 'Test', fr: 'Contrôle', ic: 'test', grp: 'ib', anim: 'test', ill: '<i></i><i></i><i></i>', min: 4,
  why: 'Geri bildirimsiz sınav provası; sonunda puanın ve cevap anahtarın.',
  fmtBest: b => '%' + b,
  start(P) { P.o = stOpt('test', { n: 20, types: ['mc', 'tf', 'write', 'gap'], dir: 'mix' }); if (!['mix', 'list', 'def', 'syn', 'ant'].includes(P.o.dir)) P.o.dir = 'mix'; P.phase = 'setup'; },
  progress: P => P.phase === 'run' ? P.qi / P.qs.length : 0,
  hud: P => P.phase === 'run' ? `<span class="hud" id="plHud">${P.qi + 1}/${P.qs.length}</span>` : '',
  view(P) {
    if (P.phase === 'setup') {
      const o = P.o, maxN = P.words.length;
      const tchip = (k, t) => `<button class="fchip" data-pl="tt" data-v="${k}" aria-pressed="${o.types.includes(k)}">${t}</button>`;
      return `<div class="card t-setup">
        <h2 class="serif">Testi hazırla</h2>
        <p class="muted">${maxN} kelimelik setten sorular seçilecek. Cevapların sonda değerlendirilir; test sırasında doğru ya da yanlış gösterilmez.</p>
        <div class="set-row"><div><div class="t">Soru sayısı</div></div><div class="seg">${[10, 20, 30, 0].map(n => `<button data-pl="tn" data-v="${n}" aria-pressed="${o.n === n}" ${n && n > maxN ? 'disabled' : ''}>${n || 'Hepsi (' + maxN + ')'}</button>`).join('')}</div></div>
        <div class="set-row"><div><div class="t">Soru tipleri</div><div class="d">En az birini seç.</div></div><div class="filters" style="margin:0">${tchip('mc', 'Çoktan seçmeli')}${tchip('tf', 'Doğru / yanlış')}${tchip('write', 'Yazılı cevap')}${tchip('gap', 'Boşluk doldurma')}</div></div>
        <div class="set-row"><div><div class="t">Konu</div><div class="d">Çoktan seçmeli sorular neyi sorsun? Liste: öğretmeninin eşleşmesi.</div></div><div class="seg seg-wrap">${[['mix', 'Karışık'], ['list', 'Liste'], ['def', 'Tanım'], ['syn', 'Eş anlam'], ['ant', 'Zıt anlam']].map(([k, t]) => `<button data-pl="td" data-v="${k}" aria-pressed="${o.dir === k}">${t}</button>`).join('')}</div></div>
        <button class="btn full uc" data-pl="tgo" style="margin-top:14px" ${o.types.length ? '' : 'disabled'}>${IC('test')}Testi başlat</button>
      </div>`;
    }
    const q = P.qs[P.qi], w = q.w;
    let body;
    if (q.kind === 'mc') body = qPrompt(q) + `<div class="opts">${q.options.map((o, i) => `<button class="opt" data-pl="ta" data-k="${i}" lang="fr"><span class="k">${i + 1}</span>${esc(o.text)}</button>`).join('')}</div>`;
    else if (q.kind === 'tf') body = `<div class="q-prompt-label">Bu eşleşme doğru mu? <span class="faint">${TF_SYM[q.sym] || ''}</span></div><div class="tf-pair"><span class="bigword" lang="fr">${esc(frHead(w))}</span><span class="tf-eq">${esc(q.sym)}</span><span class="mid" lang="fr">${esc(q.shown)}</span></div><div class="decide"><button class="btn no" data-pl="ta" data-k="f">${IC('x')}Yanlış</button><button class="btn ok" data-pl="ta" data-k="t">${IC('check')}Doğru</button></div>`;
    else body = `<div class="q-prompt-label">Kelimeyi yaz</div>${clueHTML(w)}<div class="typein"><input id="plIn" class="pl-in" type="text" lang="fr" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Fransızca yaz…" aria-label="Cevabın"><button class="btn" data-pl="ta" data-k="w">Cevapla</button></div>${accentsHTML('plIn')}`;
    return `<div class="ticket enter" id="tk"><div class="tk-top"><span class="tk-no">Soru ${P.qi + 1} / ${P.qs.length}</span><button class="linkbtn" data-pl="ta" data-k="skip">Boş bırak</button></div>${body}</div>
      <p class="kbd">${q.kind === 'write' ? 'Enter: cevapla' : q.kind === 'tf' ? '← yanlış · → doğru' : '1–4 ile seçebilirsin'}</p>`;
  },
  after() { focusIn(); },
  act(P, a, t) {
    if (P.phase === 'setup') {
      if (a === 'tn') { P.o.n = +t.dataset.v; touch(); plRender(); return; }
      if (a === 'tt') { const v = t.dataset.v, i = P.o.types.indexOf(v); if (i >= 0) P.o.types.splice(i, 1); else P.o.types.push(v); touch(); plRender(); return; }
      if (a === 'td') { P.o.dir = t.dataset.v; touch(); plRender(); return; }
      if (a === 'tgo' && P.o.types.length) { testBuild(P); plRender(); }
      return;
    }
    if (a === 'ta') testAnswer(P, t.dataset.k);
  },
  key(P, e, inInput) {
    if (P.phase !== 'run') return;
    const q = P.qs[P.qi];
    if (q.kind === 'write') { if (e.key === 'Enter') { e.preventDefault(); testAnswer(P, 'w'); } return; }
    if (inInput) return;
    if (q.kind === 'mc' && /^[1-4]$/.test(e.key)) testAnswer(P, String(+e.key - 1));
    if (q.kind === 'tf') { if (e.key === 'ArrowRight') testAnswer(P, 't'); else if (e.key === 'ArrowLeft') testAnswer(P, 'f'); }
  },
  summary(P, early) {
    if (P.phase !== 'res' && (!P.answers || !P.answers.length)) return { title: 'Test yapılmadı', rows: [['Soru', 0]] };
    return testSummary(P, early);
  }
};
function testBuild(P) {
  const o = P.o, ws = shuffle(P.words.slice()).slice(0, o.n || P.words.length), types = o.types.length ? o.types : ['mc'];
  P.qs = ws.map((w, i) => {
    let t = types[i % types.length];
    if (t === 'write' && !typeable(w)) t = 'mc';
    if (t === 'gap' && !clozeable(w)) t = 'mc';
    if (t === 'mc') { const av = (TEST_TYPES[o.dir] || TEST_TYPES.mix).filter(x => qAvail(w, x)); return Object.assign(makeQ(w, 'practice', av.length ? pick(av) : 'list'), { kind: 'mc' }); }
    if (t === 'gap') return Object.assign(makeQ(w, 'practice', 'cloze'), { kind: 'mc' });
    if (t === 'write') return { kind: 'write', type: 'type', w };
    const tf = tfPair(w);
    return { kind: 'tf', type: 'tf', w, truth: tf.truth, shown: tf.shown, sym: tf.sym, right: tf.right };
  });
  shuffle(P.qs); P.qi = 0; P.answers = []; P.phase = 'run'; P.tq0 = Date.now();
}
function testAnswer(P, k) {
  if (P.phase !== 'run') return;
  const q = P.qs[P.qi]; let ok = false, given = '';
  if (k === 'skip') given = '—';
  else if (q.kind === 'mc') { const o = q.options[+k]; if (!o) return; ok = o.ok; given = o.text; }
  else if (q.kind === 'tf') { ok = (k === 't') === q.truth; given = k === 't' ? 'Doğru' : 'Yanlış'; }
  else { const v = (($('#plIn') || {}).value || '').trim(); if (!v) return; ok = checkTyped(v, q.w) !== 'no'; given = v; }
  P.answers.push({ q, ok, given });
  if (ok) PL.ok++; else { PL.no++; PL.wrong.add(q.w.id); if (S.w[q.w.id] && S.w[q.w.id][0] !== 9) S.w[q.w.id][3]++; }
  afterActivity(activity(1, 0)); touch(); haptic('tap');
  P.qi++;
  if (P.qi >= P.qs.length) { P.phase = 'res'; addXP(2 * PL.ok); plFinish(testSummary(P, false)); }
  else plRender();
}
const TEST_TYPES = { list: ['list'], def: ['fr2def', 'def2fr'], syn: ['fr2syn', 'syn2fr'], ant: ['fr2ant', 'ant2fr'], mix: ['list', 'fr2def', 'def2fr', 'fr2syn', 'syn2fr', 'fr2ant', 'ant2fr'] };
const TF_SYM = { '≈': '≈ eş anlamlı', '≠': '≠ zıt anlamlı', ':': ': tanımı' };
function testQText(q) {
  const w = q.w, F = t => `<span lang="fr">${esc(t)}</span>`;
  if (q.kind === 'tf') return [`${F(frHead(w))} ${esc(q.sym)} ${F(q.shown)}`, q.truth ? 'Doğru' : `Yanlış · ${esc(q.sym)} ${F(q.right)}`];
  if (q.type === 'type') return [F(cut(typeClue(w).t, 90)), F(frHead(w))];
  if (q.type === 'cloze') return [`<span lang="fr">${esc(w.ex).replace(/\[[^\]]+\]/, '____')}</span>`, F(bracketText(w))];
  if (q.type === 'def2fr' || q.type === 'syn2fr' || q.type === 'ant2fr') return [`${q.sym ? esc(q.sym) + ' ' : ''}${F(cut(q.shown, 90))}`, F(q.answer)];
  return [`${F(frHead(w))} <small class="faint">${esc(QTYPES_TR[q.type] || '')}</small>`, F(q.answer)];
}
function testSummary(P, early) {
  const n = P.answers.length, ok = P.answers.filter(a => a.ok).length, pct = n ? Math.round(ok / n * 100) : 0;
  const b = !early && n >= 5 ? stBest(P, pct, false) : {};
  const rows = P.answers.map((a, i) => { const [qq, cc] = testQText(a.q); return `<div class="tres ${a.ok ? 'ok' : 'no'}"><span class="ti">${a.ok ? IC('check', 'sm') : IC('x', 'sm')}</span><span class="tq"><small>${i + 1}.</small> ${qq}</span><span class="ta">${a.ok ? '' : `<s>${esc(a.given)}</s> `}<b>${cc}</b></span></div>`; }).join('');
  return { title: early ? 'Test yarıda kaldı' : pct >= 90 ? 'Excellent !' : pct >= 75 ? 'Très bien' : pct >= 50 ? 'Pas mal' : 'Courage', fr: true, rec: b.rec, big: '%' + pct, sub: `${n} sorudan ${ok} doğru`,
    rows: [['Doğru', ok], ['Yanlış / boş', n - ok], ['Süre', fmtTime(Date.now() - (P.tq0 || P.t0))], ['En iyi', S.p.best['test:' + stKey(P.sel)] !== undefined ? '%' + S.p.best['test:' + stKey(P.sel)] : '—']],
    btns: PL.wrong.size ? `<button class="btn ghost" data-pl="starwrong">${IC('star')}Yanlışları yıldızla</button>` : '',
    extra: n ? `<div class="card" style="margin-top:12px"><div class="card-h"><h2>Cevap anahtarı</h2><span class="faint" style="font-weight:700">yanlışların üstü çizili</span></div><div class="tres-list">${rows}</div></div>` : '',
    noWrongList: true, againLabel: 'Yeni test', confetti: !early && pct >= 90 && n >= 10 ? 150 : 0 };
}

/* ---------- Eşleştir ---------- */
MODES.match = {
  tr: 'Eşleştir', fr: 'Associer', ic: 'match', grp: 'oyun', anim: 'match', ill: '<i class="l"></i><i class="r"></i>', min: 3, uniq: true,
  why: 'Altı çift, olabildiğince hızlı. Zaman baskısı tanımayı otomatikleştirir.',
  fmtBest: b => fmtTime(b) + '.' + String(Math.floor(b % 1000 / 100)),
  start(P) { P.o = stOpt('match', { kind: 'syn' }); if (!['def', 'dfn', 'syn'].includes(P.o.kind)) P.o.kind = 'syn'; matchDeal(P); },
  progress: P => P.gone.size / P.board.length,
  hud: P => `<span class="hud tnum" id="plHud">${IC('clock', 'sm')}<span id="mClock">${matchClock(P)}</span></span>`,
  view(P) {
    return `<div class="pl-tools"><div class="seg" role="group" aria-label="Eşleştirme türü"><button data-pl="kind" data-v="syn" aria-pressed="${P.o.kind === 'syn'}">Eş anlamlı</button><button data-pl="kind" data-v="def" aria-pressed="${P.o.kind === 'def'}">Liste</button><button data-pl="kind" data-v="dfn" aria-pressed="${P.o.kind === 'dfn'}">Tanım</button></div><span class="faint" style="font-weight:700">Yanlış eşleşme +1 sn</span></div>
      <div class="mgrid2">${P.board.map((c, i) => `<button class="mtile s-${c.s} ${P.gone.has(i) ? 'gone' : ''}" data-pl="mt" data-k="${i}" lang="fr">${esc(c.t)}</button>`).join('')}</div>`;
  },
  after(P) { if (!P.tick) { P.tick = setInterval(() => { const c = $('#mClock'); if (c && PL === P && !P.end) c.textContent = matchClock(P); }, 100); P.tm.push(P.tick); } },
  act(P, a, t) {
    if (a === 'kind') { P.o.kind = t.dataset.v; touch(); clearInterval(P.tick); P.tick = 0; matchDeal(P); plRender(); return; }
    if (a !== 'mt' || P.end) return;
    const i = +t.dataset.k; if (P.gone.has(i)) return;
    if (P.pickI === -1) { P.pickI = i; t.classList.add('sel'); haptic('tap'); return; }
    if (P.pickI === i) { P.pickI = -1; t.classList.remove('sel'); return; }
    const A = P.board[P.pickI], B = P.board[i], ea = $(`.mtile[data-k="${P.pickI}"]`);
    const ok = A.s !== B.s && (A.id === B.id || baseKey(BYID[A.id]) === baseKey(BYID[B.id]));
    if (ok) {
      P.gone.add(P.pickI); P.gone.add(i); [ea, t].forEach(e => { e.classList.remove('sel'); e.classList.add('gone'); });
      plScore(true, BYID[A.id], { xp: 1 }); plFx(t, true, 0); plHud();
      if (P.gone.size === P.board.length) matchEnd(P);
    } else {
      P.pen += 1000; [ea, t].forEach(e => { e.classList.remove('sel'); shake(e); });
      plScore(false, BYID[A.id], {}); PL.wrong.add(B.id); haptic('no'); sfx('no'); plHud();
    }
    P.pickI = -1;
  },
  summary(P, early) { return { title: early ? 'Yarıda kaldı' : 'Eşleştirme tamam', rows: [['Süre', matchClock(P)], ['Hata', P.miss || PL.no], ['XP', '+' + (S.p.xp - P.xp0)]] }; }
};
function matchDeal(P) {
  const ws = shuffle(P.words.slice()).slice(0, 6);
  P.board = shuffle(ws.flatMap(w => [{ id: w.id, s: 'fr', t: frShort(w) }, { id: w.id, s: 'x', t: matchText(w, P.o.kind) }]));
  P.pickI = -1; P.gone = new Set(); P.pen = 0; P.tStart = Date.now(); P.end = 0;
}
/* eşleştirme kartının karşı yüzü: liste eşi, Fransızca tanım ya da kısa eş (≠ ile zıt) */
function matchText(w, kind) {
  if (kind === 'def') return cut(gloss(w), 80);
  if (kind === 'dfn') { const d = fxOf(w).def; return cut(d || gloss(w), 90); }
  const sp = shortPartner(w); return (sp.rel === 'ant' ? '≠ ' : '') + sp.t;
}
function matchClock(P) { const ms = (P.end || Date.now()) - P.tStart + P.pen; return (ms / 1000).toFixed(1) + ' sn'; }
function matchEnd(P) {
  P.end = Date.now(); const ms = P.end - P.tStart + P.pen;
  P.pickI = -1;
  const b = stBest({ k: 'match-' + P.o.kind, sel: P.sel }, ms, true);
  addXP(10 + (PL.no === 0 ? 10 : 0));
  setTimeout(() => plFinish({ title: PL.no === 0 ? 'Sans faute !' : 'Terminé !', fr: true, rec: b.rec, big: (ms / 1000).toFixed(1) + ' sn', sub: `${P.board.length / 2} çift · ${PL.no} hata${P.pen ? ` · ${P.pen / 1000} sn ceza` : ''}`,
    rows: [['Süre', (ms / 1000).toFixed(1) + ' sn'], ['Hata', PL.no], ['Rekor', S.p.best['match-' + P.o.kind + ':' + stKey(P.sel)] ? (S.p.best['match-' + P.o.kind + ':' + stKey(P.sel)] / 1000).toFixed(1) + ' sn' : '—'], ['XP', '+' + (S.p.xp - P.xp0)]],
    againLabel: 'Yeni 6 çift', confetti: b.rec || PL.no === 0 ? 140 : 0 }), 450);
}

/* ---------- Hafıza ---------- */
MODES.memory = {
  tr: 'Hafıza', fr: 'Mémoire', ic: 'grid', grp: 'oyun', anim: 'mem', ill: '<i></i><i></i><i></i><i></i>', min: 3, uniq: true,
  why: 'Kartları çevir, kelimeyi eş anlamlısıyla buluştur. Yeri ve anlamı birlikte hatırlamak dikkati diri tutar.',
  fmtBest: b => b + ' hamle',
  start(P) { const ws = shuffle(P.words.slice()).slice(0, 6); P.cards = shuffle(ws.flatMap(w => [{ id: w.id, s: 'fr', t: frShort(w) }, { id: w.id, s: 'tr', t: matchText(w, 'syn') }])); P.up = []; P.gone = new Set(); P.moves = 0; P.lock = false; },
  progress: P => P.gone.size / P.cards.length,
  hud: P => `<span class="hud" id="plHud"><b class="tnum">${P.moves}</b> hamle</span>`,
  view(P) { return `<div class="mem-grid">${P.cards.map((c, i) => `<button class="mem ${P.gone.has(i) ? 'up done' : P.up.includes(i) ? 'up' : ''}" data-pl="mem" data-k="${i}" aria-label="Kart ${i + 1}"><span class="mem-in"><span class="mem-b" aria-hidden="true">${IC('train')}</span><span class="mem-f s-${c.s}" lang="fr">${esc(c.t)}</span></span></button>`).join('')}</div><p class="kbd">İki kart çevir; kelime ile eş anlamlısı (≠ işaretlilerde zıttı) eşleşirse açık kalır.</p>`; },
  act(P, a, t) { if (a === 'mem') memFlip(P, +t.dataset.k, t); },
  summary(P, early) { return { title: early ? 'Yarıda kaldı' : 'Bravo', rows: [['Hamle', P.moves], ['Bulunan çift', P.gone.size / 2], ['Süre', fmtTime(Date.now() - P.t0)]] }; }
};
function memFlip(P, i, el) {
  if (P.lock || P.gone.has(i) || P.up.includes(i)) return;
  P.up.push(i); el.classList.add('up'); haptic('tap');
  if (P.up.length < 2) return;
  P.moves++;
  const [a, b] = P.up, A = P.cards[a], B = P.cards[b];
  const ok = A.s !== B.s && (A.id === B.id || baseKey(BYID[A.id]) === baseKey(BYID[B.id]));
  if (ok) {
    P.gone.add(a); P.gone.add(b); P.up = [];
    [a, b].forEach(k => { const e = $(`.mem[data-k="${k}"]`); if (e) e.classList.add('done'); });
    plScore(true, BYID[A.id], { xp: 2 }); plFx(el, true, 2); plHud();
    if (P.gone.size === P.cards.length) {
      const b2 = stBest(P, P.moves, true); addXP(10);
      P.tm.push(setTimeout(() => plFinish({ title: P.moves <= P.cards.length / 2 + 2 ? 'Mémoire d’éléphant !' : 'Bravo !', fr: true, rec: b2.rec, big: P.moves + ' hamle', sub: `${P.cards.length / 2} çift · en az ${P.cards.length / 2} hamle mümkün`, rows: [['Hamle', P.moves], ['Süre', fmtTime(Date.now() - P.t0)], ['Rekor', (S.p.best['memory:' + stKey(P.sel)] || '—') + ' hamle'], ['XP', '+' + (S.p.xp - P.xp0)]], againLabel: 'Yeni kartlar', noWrongList: true, confetti: b2.rec ? 130 : 0 }), 700));
    }
  } else {
    P.lock = true; PL.combo = 0; plHud();
    P.tm.push(setTimeout(() => { [a, b].forEach(k => { const e = $(`.mem[data-k="${k}"]`); if (e) e.classList.remove('up'); }); P.up = []; P.lock = false; }, 950));
  }
}

/* ---------- Şimşek (doğru/yanlış, 60 sn) ---------- */
MODES.eclair = {
  tr: 'Şimşek', fr: 'Éclair', ic: 'bolt', grp: 'oyun', anim: 'bolt', ill: `<i class="b">${IC('bolt')}</i><i class="t">✓</i><i class="f">✕</i>`, min: 4, uniq: true,
  why: '60 saniye: ≈ eş anlamlı, ≠ zıt anlamlı, : tanım. Eşleşme doğru mu? Üst üste doğrular puanı katlar.',
  fmtBest: b => b + ' puan',
  start(P) { P.score = 0; P.mult = 1; P.T = 60000; P.left = 60000; P.last = []; P.n = 0; P.wq = []; P.cur = eclairPair(P); P.fb = ''; },
  hud: P => `<span class="hud" id="plHud"><b class="tnum">${P.score}</b> puan</span>`,
  view(P) {
    return `<div class="ec-top"><div class="ec-time"><i id="ecBar" style="width:${(P.left / P.T * 100).toFixed(2)}%"></i></div><span class="tnum ec-sec" id="ecSec">${Math.ceil(P.left / 1000)}</span><span class="ec-mult" id="ecMult">×${P.mult}</span></div>
      <div class="ec-stage"><div class="ec-card" id="ecCard">${eclairCard(P.cur)}</div></div>
      <p class="ec-fb" id="ecFb" aria-live="polite">${P.fb}</p>
      <div class="ec-btns"><button class="btn no" data-pl="f">${IC('x')}Yanlış</button><button class="btn ok" data-pl="t">${IC('check')}Doğru</button></div>
      <p class="kbd">≈ eş anlamlı · ≠ zıt anlamlı · : tanım — ← yanlış · → doğru · kartı kaydırabilirsin</p>`;
  },
  after(P) {
    bindDrag($('#ecCard'), () => eclairAns(P, false), () => eclairAns(P, true));
    if (P.raf) return;
    let last = performance.now();
    const loop = t => {
      if (PL !== P || P.done) return;
      const dt = Math.min(100, t - last); last = t;
      if (document.visibilityState === 'visible') P.left -= dt;
      const bar = $('#ecBar'), sec = $('#ecSec');
      if (bar) bar.style.width = Math.max(0, P.left / P.T * 100).toFixed(2) + '%';
      if (sec) sec.textContent = Math.max(0, Math.ceil(P.left / 1000));
      if (P.left <= 0) { eclairEnd(P); return; }
      P.raf = requestAnimationFrame(loop);
    };
    P.raf = requestAnimationFrame(loop);
  },
  act(P, a) { if (a === 't' || a === 'f') eclairAns(P, a === 't'); },
  key(P, e) { if (e.key === 'ArrowRight') eclairAns(P, true); else if (e.key === 'ArrowLeft') eclairAns(P, false); },
  summary(P, early) { return eclairStats(P, early); }
};
function eclairCard(c) { return `<span class="ec-w" lang="fr">${esc(frShort(c.w))}</span><span class="ec-eq" title="${esc(TF_SYM[c.sym] || '')}">${esc(c.sym)}</span><span class="ec-t" lang="fr">${esc(cut(c.shown, 90))}</span>`; }
function eclairPair(P) {
  const src = P.wq.length && Math.random() < .35 ? P.wq : P.words;
  let w, tries = 0;
  do { w = pick(src); tries++; } while (P.last.includes(w.id) && tries < 10);
  P.last.push(w.id); if (P.last.length > Math.min(5, P.words.length - 1)) P.last.shift();
  return tfPair(w);
}
function eclairAns(P, said) {
  if (P.done || P.lock || !P.cur) return;
  const c = P.cur, ok = said === c.truth, card = $('#ecCard');
  P.n++;
  if (ok) { plScore(true, c.w, { count: true }); P.mult = Math.min(5, 1 + Math.floor(PL.combo / 4)); P.score += 10 * P.mult; P.fb = ''; }
  else { plScore(false, c.w, {}); P.mult = 1; if (!P.wq.includes(c.w)) P.wq.push(c.w); P.fb = c.truth ? `Doğruydu: ${frShort(c.w)} ${c.sym} ${cut(c.shown, 70)}` : `Doğrusu: ${frShort(c.w)} ${c.sym} ${cut(c.right, 70)}`; }
  haptic(ok ? 'ok' : 'no'); sfx(ok ? 'ok' : 'no');
  if (ok) sparksAt(card, 10); else shake(card);
  const m = $('#ecMult'); if (m) { m.textContent = '×' + P.mult; if (ok && PL.combo % 4 === 0) bump(m); }
  const fb = $('#ecFb'); if (fb) fb.textContent = P.fb;
  plHud();
  P.lock = true;
  outAnim(card, said ? 'r' : 'l', () => {
    P.lock = false; if (P.done || PL !== P) return;
    P.cur = eclairPair(P);
    const st = $('.ec-stage'); if (!st) return;
    st.innerHTML = `<div class="ec-card enter" id="ecCard">${eclairCard(P.cur)}</div>`;
    bindDrag($('#ecCard'), () => eclairAns(P, false), () => eclairAns(P, true));
  });
}
function eclairStats(P, early) {
  const acc = P.n ? Math.round(PL.ok / P.n * 100) : 0;
  return { title: early ? 'Yarıda kaldı' : P.score >= 400 ? 'Fulgurant !' : 'Temps écoulé', fr: true, rec: P.isRec, big: P.score + ' puan', sub: `${P.n} kart · %${acc} doğru · en uzun seri ${PL.maxCombo}`,
    rows: [['Doğru', PL.ok], ['Yanlış', PL.no], ['En uzun seri', PL.maxCombo], ['Rekor', (S.p.best['eclair:' + stKey(P.sel)] || 0) + ' puan']], againLabel: 'Yeniden 60 sn', confetti: P.rec ? 150 : 0 };
}
function eclairEnd(P) { if (P.done) return; const b = stBest(P, P.score, false); P.isRec = b.rec; addXP(Math.round(P.score / 20)); plFinish(eclairStats(P, false)); }

/* ---------- Son metro (arcade) ---------- */
MODES.metro = {
  tr: 'Son metro', fr: 'Dernier métro', ic: 'train', grp: 'oyun', anim: 'train', ill: '<i class="trk"></i><i class="trn"></i>', min: 3, uniq: true,
  why: 'Tabeladaki tanıma ya da eş anlamlıya uyan kelimeyi taşıyan treni kaçırma; trenler giderek hızlanır.',
  fmtBest: b => b + ' puan',
  start(P) { P.lives = 3; P.score = 0; P.level = 1; P.caught = 0; P.queue = shuffle(P.words.slice()); P.wave = null; P.between = false; },
  hud: P => `<span class="hud" id="plHud"><span class="mt-lives" aria-label="${P.lives} hak">${[0, 1, 2].map(i => `<i class="${i < P.lives ? 'on' : ''}">${IC('ticket', 'sm')}</i>`).join('')}</span><b class="tnum">${P.score}</b></span>`,
  view(P) {
    return `<div class="mt-sign" id="mtSign"><small id="mtSmall">Buna uyan kelimeyi taşıyan treni yakala</small><b id="mtPrompt" lang="fr"></b></div>
      <div class="mt-yard" id="mtYard">${[0, 1, 2].map(i => `<div class="mt-lane" data-lane="${i}"><span class="mt-k" aria-hidden="true">${i + 1}</span><div class="mt-rails"></div></div>`).join('')}</div>
      <p class="kbd" id="mtLv">Trene dokun · klavyede 1, 2, 3 · hız ${P.level}</p>`;
  },
  after(P) { if (!P.wave) metroWave(P); if (!P.raf) metroLoop(P); },
  act(P, a, t) { if (a === 'train') metroTap(P, +t.dataset.k); },
  key(P, e) { if (/^[1-3]$/.test(e.key) && P.wave) { const tr = P.wave.trains.find(x => x.lane === +e.key - 1 && !x.gone); if (tr) metroTap(P, tr.k); } },
  summary(P, early) { return metroStats(P, early); }
};
function metroWave(P) {
  if (P.done || PL !== P) return;
  if (P.lives <= 0) { metroEnd(P); return; }
  if (!P.queue.length) P.queue = shuffle(P.words.slice());
  const w = P.queue.shift(), ds = distractors(w, 2, null, c => frShort(c)), opts = shuffle([w, ...ds]);
  const yard = $('#mtYard'); if (!yard) return;
  $$('.mt-train', yard).forEach(e => e.remove());
  const W0 = yard.clientWidth, dur = Math.max(4.2, 9.6 * Math.pow(0.92, P.level - 1)) * (REDUCED ? 1.4 : 1);
  P.wave = { w, trains: [] };
  const pr = $('#mtPrompt'); if (pr) { pr.textContent = metroClue(w); pr.setAttribute('lang', 'fr'); }
  const sm = $('#mtSmall'); if (sm) { sm.textContent = 'Buna uyan kelimeyi taşıyan treni yakala'; sm.className = ''; }
  const lanes = shuffle([0, 1, 2]), lanesEl = $$('.mt-lane', yard);
  opts.forEach((c, k) => {
    const el = document.createElement('button');
    el.className = 'mt-train'; el.dataset.pl = 'train'; el.dataset.k = k; el.setAttribute('lang', 'fr');
    el.innerHTML = `<span class="mt-car mt-front"><span class="mt-dest">${esc(frShort(c))}</span></span><span class="mt-car"></span><span class="mt-car"></span>`;
    lanesEl[lanes[k]].appendChild(el);
    const tw = el.offsetWidth, x0 = W0 + 20 + k * W0 * .16 + Math.random() * W0 * .14;
    el.style.transform = `translateX(${x0}px)`;
    P.wave.trains.push({ k, lane: lanes[k], el, x: x0, wd: tw, v: (W0 + tw) / (dur * 1000), ok: c === w, gone: false, w: c });
  });
}
function metroClue(w) {
  const X = fxOf(w);
  if (X.def && X.def.length <= 70) return X.def;
  const s = X.syn.find(o => o.t.length <= 40); if (s) return '≈ ' + s.t;
  const a = X.ant.find(o => o.t.length <= 40); if (a) return '≠ ' + a.t;
  return cut(X.def || gloss(w), 70);
}
function metroLoop(P) {
  let last = performance.now();
  const step = t => {
    if (PL !== P || P.done) return;
    const dt = Math.min(64, t - last); last = t;
    if (document.visibilityState === 'visible' && P.wave && !P.between) {
      for (const tr of P.wave.trains) {
        if (tr.gone) continue;
        tr.x -= tr.v * dt; tr.el.style.transform = `translateX(${tr.x.toFixed(1)}px)`;
        if (tr.x < -tr.wd - 8) { tr.gone = true; tr.el.remove(); if (tr.ok) { metroMiss(P); break; } }
      }
    }
    P.raf = requestAnimationFrame(step);
  };
  P.raf = requestAnimationFrame(step);
}
function metroTap(P, k) {
  if (!P.wave || P.between || P.done) return;
  const tr = P.wave.trains.find(x => x.k === k && !x.gone); if (!tr) return;
  if (tr.ok) {
    P.caught++; P.score += 10 * P.level + (tr.x > 0 ? 5 : 0);
    plScore(true, P.wave.w, { xp: 2 }); plFx(tr.el, true, 2);
    tr.el.classList.add('caught'); P.wave.trains.forEach(x => { if (x !== tr && !x.gone) x.el.classList.add('fade'); });
    P.between = true;
    P.tm.push(setTimeout(() => { if (PL !== P) return; P.between = false; if (P.caught % 5 === 0) { P.level++; toast(`Hız ${P.level} · trenler hızlanıyor`); } const lv = $('#mtLv'); if (lv) lv.textContent = `Trene dokun · klavyede 1, 2, 3 · hız ${P.level}`; plHud(); metroWave(P); }, 620));
  } else {
    P.lives--; plScore(false, P.wave.w, {}); tr.gone = true; tr.el.classList.add('wrong'); haptic('no'); sfx('no'); shake($('#mtSign'));
    P.tm.push(setTimeout(() => tr.el.remove(), 420)); plHud();
    if (P.lives <= 0) { P.between = true; metroReveal(P); P.tm.push(setTimeout(() => metroEnd(P), 1300)); }
  }
}
function metroReveal(P) {
  const sm = $('#mtSmall'); if (sm) { sm.textContent = `Doğrusu: ${frShort(P.wave.w)}`; sm.className = 'miss'; }
  P.wave.trains.forEach(x => { if (x.ok && !x.gone) x.el.classList.add('hint'); });
}
function metroMiss(P) {
  P.lives--; plScore(false, P.wave.w, {}); haptic('no'); sfx('no'); plHud();
  P.between = true; metroReveal(P);
  P.tm.push(setTimeout(() => { if (PL !== P) return; P.between = false; if (P.lives <= 0) metroEnd(P); else metroWave(P); }, 1300));
}
function metroStats(P, early) {
  return { title: early ? 'İstasyonda kaldın' : P.score >= 150 ? 'Terminus, bravo !' : 'Dernier métro parti', fr: true, rec: P.isRec, big: P.score + ' puan', sub: `${P.caught} tren yakaladın · ulaştığın hız ${P.level}`,
    rows: [['Yakalanan', P.caught], ['Kaçan / yanlış', PL.no], ['Hız', P.level], ['Rekor', (S.p.best['metro:' + stKey(P.sel)] || 0) + ' puan']], againLabel: 'Yeni sefer', confetti: P.rec ? 150 : 0 };
}
function metroEnd(P) { if (P.done) return; const b = stBest(P, P.score, false); P.isRec = b.rec; addXP(Math.round(P.score / 10)); plFinish(metroStats(P, false)); }

/* ---------- Bağ kur (çağrışım + kendi cümlen) ---------- */
function stemOf(x) { return x.length > 5 ? x.slice(0, x.length - 2) : x; }
MODES.atelier = {
  tr: 'Bağ kur', fr: 'Atelier', ic: 'bulb', grp: 'derin', anim: 'bulb', ill: `<i class="bulb">${IC('bulb')}</i><i class="ray r1"></i><i class="ray r2"></i><i class="ray r3"></i>`,
  why: 'Kendi cümleni ve çağrışımını yaz. Kendi kurduğun bağ kelimeyi hafızana sabitler.',
  start(P) { const a = P.words.filter(w => !S.n[w.id]), b = P.words.filter(w => S.n[w.id]); P.list = P.over.ids ? P.words.slice() : [...a, ...b]; P.i = 0; P.saved = 0; },
  progress: P => P.i / P.list.length,
  hud: P => `<span class="hud" id="plHud">${Math.min(P.i + 1, P.list.length)}/${P.list.length}</span>`,
  view(P) {
    const w = P.list[P.i], n = S.n[w.id] || {};
    const ph = w.tk ? `ör. ${w.tk.split(' (')[0]} → ${w.trMain.split(',')[0]}` : `ör. ${cleanTerm(w.fr)} → kendi çağrışımın`;
    return `<div class="ticket at-card" id="tk">
      <div class="tk-top"><span class="tk-no" lang="fr">N° ${w.id} · ${esc(stationName(w.u, w.g))}</span>${n.t ? '<span class="pill master">notlu</span>' : ''}</div>
      <div class="w-head"><div class="bigword" lang="fr">${esc(w.fr)}</div>${spk(w)}</div>
      <div style="margin-top:8px">${frxHTML(w, { compact: true })}</div>
      <div class="exbox" style="margin-top:12px"><div style="flex:1;min-width:0"><div class="fr" lang="fr">${exHTML(w.ex)}</div>${trMode() === 'off' ? '' : `<div class="tr">${esc(w.et)}</div>`}</div></div>
      ${w.tk ? `<div class="tkchip" style="margin-top:12px">${IC('spark', 'sm')}<span>Türkçede: <b>${esc(w.tk)}</b></span><button class="linkbtn" data-pl="usetk">çağrışım yap</button></div>` : ''}
      <label class="at-f"><span><b>Çağrışım</b> · sesine ya da anlamına benzeyen bir şey, küçük bir sahne (Türkçe ya da Fransızca)</span><input id="atK" class="pl-in" type="text" maxlength="160" value="${esc(n.k || '')}" placeholder="${esc(ph)}"></label>
      <label class="at-f"><span><b>Kendi cümlen</b> · kelimeyi kendi hayatından bir Fransızca cümlede kullan</span><textarea id="atS" rows="2" maxlength="260" lang="fr" placeholder="Ex. : …">${esc(n.s || '')}</textarea></label>
      ${accentsHTML('atS')}
      <p class="at-check" id="atChk" aria-live="polite"></p>
    </div>
    <div class="sess-actions"><button class="btn ghost" data-pl="prev" ${P.i ? '' : 'disabled'}>Önceki</button><button class="btn ghost" data-pl="skip">Atla</button><button class="btn uc" data-pl="save">${IC('check')}Kaydet, sonraki</button></div>
    <p class="kbd">Ctrl + Enter: kaydet</p>`;
  },
  after(P) { const s = $('#atS'); if (s) { s.addEventListener('input', () => atCheck(P)); atCheck(P); } },
  act(P, a) {
    const w = P.list[P.i];
    if (a === 'usetk') { const k = $('#atK'); if (k) { k.value = `${w.tk.split(' (')[0]} → ${w.trMain.split(',')[0]}: `; k.focus(); } return; }
    if (a === 'prev') { P.i = Math.max(0, P.i - 1); plRender(); return; }
    if (a === 'skip') { atStep(P); return; }
    if (a === 'save') {
      const k = (($('#atK') || {}).value || '').trim(), s = (($('#atS') || {}).value || '').trim(), had = !!S.n[w.id];
      if (k || s) { S.n[w.id] = { k, s, t: Date.now() }; if (!had) { addXP(s ? 6 : 3); P.saved++; PL.ok++; afterActivity(activity(1, 0)); } }
      else delete S.n[w.id];
      touch(); haptic('ok'); if (k || s) sparksAt($('[data-pl="save"]'), 12);
      atStep(P);
    }
  },
  key(P, e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); MODES.atelier.act(P, 'save'); } },
  summary(P, early) { const all = Object.keys(S.n).length; return { title: early ? 'Kaydedildi' : 'Atelier fermé', fr: !early, big: '+' + P.saved, sub: 'yeni notlu kelime', rows: [['Bu oturumda', P.saved], ['Toplam notlu', all], ['XP', '+' + (S.p.xp - P.xp0)]], note: 'Notların kelime kartlarının arkasında, geri bildirimlerde ve sözlükte görünür. Sözlükte “Notlu” filtresiyle hepsini bulabilirsin.', againLabel: 'Baştan', noWrongList: true }; }
};
function atStep(P) { P.i++; if (P.i >= P.list.length) plFinish(MODES.atelier.summary(P, false)); else plRender(); }
function atCheck(P) {
  const w = P.list[P.i], s = $('#atS'), out = $('#atChk'); if (!s || !out) return;
  const v = canon(s.value); if (!v) { out.innerHTML = ''; out.className = 'at-check'; return; }
  const used = frVariants(w.fr).some(x => { const st = stemOf(stripArt(x).split(' ')[0] || ''); return st.length >= 3 && (' ' + v).includes(' ' + st); });
  out.innerHTML = used ? `${IC('check', 'sm')}Kelimeyi cümlende kullandın` : `Cümlende «${esc(spellTarget(w))}» (ya da çekimli bir hâli) geçsin`;
  out.className = 'at-check ' + (used ? 'ok' : '');
}

/* ---------- Le ou la ? ---------- */
MODES.genre = {
  tr: 'Le ou la ?', fr: 'Genre', ic: 'genre', grp: 'derin', anim: 'genre', ill: '<i>le</i><i>la</i>', elig: w => !!genderOf(w), min: 3, uniq: true,
  none: 'Bu sette cinsiyeti belli isim yok; bütün desteyi ya da bir hattı seç.',
  why: 'l’ ile başlayan isimlerde cinsiyet görünmez; sıfat uyumunda puan kaybettirmesin.',
  start(P) { P.list = shuffle(P.words.slice()); P.i = 0; P.ans = false; P.tries = {}; P.first = 0; },
  progress: P => P.i / P.list.length,
  hud: P => `<span class="hud" id="plHud">${Math.min(P.i + 1, P.list.length)}/${P.list.length}</span>`,
  view(P) {
    const w = P.list[P.i], n = bareNoun(w), g = genderOf(w), art = g === 'f' ? 'la' : 'le';
    return `<div class="gn-card ${P.ans ? (P.ok1 ? 'good' : 'bad') : 'enter'} ${P.ans ? 'g-' + g : ''}" id="gnCard">
        <span class="gn-art">${P.ans ? art : '?'}</span><div class="gn-w" lang="fr">${esc(n)}</div>
        ${P.ans ? `<p class="gn-full" lang="fr"><b>${esc(withArticle(w))}</b> · ${esc(withArticle(w, true))}</p><p class="muted" lang="fr">${esc(cut(gloss(w), 90))}</p>` : '<p class="muted">Eril mi, dişil mi?</p>'}
      </div>
      <div class="gn-btns"><button class="gbtn m" data-pl="g" data-v="m" ${P.ans ? 'disabled' : ''}><b lang="fr">le</b><small>un · masculin</small></button><button class="gbtn f" data-pl="g" data-v="f" ${P.ans ? 'disabled' : ''}><b lang="fr">la</b><small>une · féminin</small></button></div>
      ${P.ans && !P.ok1 ? nextBtns(P) : '<p class="kbd">← le · → la</p>'}`;
  },
  act(P, a, t) {
    const w = P.list[P.i];
    if (a === 'g' && !P.ans) {
      const ok = t.dataset.v === genderOf(w), first = !P.tries[w.id];
      P.ans = true; P.ok1 = ok;
      if (ok && first) P.first++;
      if (!ok) { P.tries[w.id] = 1; P.list.push(w); }
      plScore(ok, w, { xp: ok ? 2 : 0 }); plRender(); plFx($('#gnCard'), ok, ok ? 2 : 0);
      if (ok) { const cur = P.i; P.tm.push(setTimeout(() => { if (PL === P && P.i === cur && P.ans) genreNext(P); }, 750)); }
      return;
    }
    if (a === 'next' && P.ans) genreNext(P);
  },
  key(P, e) { if (!P.ans) { if (e.key === 'ArrowLeft') MODES.genre.act(P, 'g', { dataset: { v: 'm' } }); else if (e.key === 'ArrowRight') MODES.genre.act(P, 'g', { dataset: { v: 'f' } }); } else if (e.key === 'Enter') { e.preventDefault(); genreNext(P); } },
  summary(P, early) { const n = new Set(P.list.slice(0, Math.max(1, P.i)).map(w => w.id)).size; return { title: early ? 'Ara verdin' : 'Genre : maîtrisé', fr: !early, big: `${P.first}/${n}`, sub: 'ilk denemede doğru', rows: [['İsim', n], ['İlk denemede', P.first], ['Yanlış', PL.wrong.size], ['En uzun seri', PL.maxCombo]] }; }
};
function genreNext(P) { P.i++; P.ans = false; if (P.i >= P.list.length) plFinish(MODES.genre.summary(P, false)); else plRender(); }

/* ---------- Telaffuz ---------- */
MODES.speak = {
  tr: 'Telaffuz', fr: 'Prononcer', ic: 'mic', grp: 'derin', anim: 'mic', ill: `<i class="m">${IC('mic')}</i><i class="p1"></i><i class="p2"></i>`, need: 'sr', elig: w => typeable(w),
  why: 'Sesli söyle, cihaz ne duyduğunu yazsın. Sesli üretmek hatırlamayı güçlendirir.',
  start(P) { P.list = P.words.slice(); P.i = 0; P.tries = 0; P.heard = ''; P.st = 'idle'; P.msg = ''; P.ok1 = false; P.good = 0; },
  progress: P => P.i / P.list.length,
  hud: P => `<span class="hud" id="plHud">${Math.min(P.i + 1, P.list.length)}/${P.list.length}</span>`,
  view(P) {
    const w = P.list[P.i];
    const msg = P.st === 'rec' ? 'Dinliyorum… kelimeyi söyle' : P.heard ? `Duyulan: «${esc(P.heard)}»${P.ok1 ? ' · doğru' : ''}` : P.msg ? esc(P.msg) : 'Mikrofona dokun ve kelimeyi söyle';
    return `<div class="ticket ${P.ok1 ? 'sp-ok' : ''}" id="tk">${P.ok1 ? '<i class="punch" aria-hidden="true"></i>' : ''}
      <div class="tk-top"><span class="tk-no">Sesli söyle</span><span class="faint" style="font-weight:700">${P.tries}/3 deneme</span></div>
      <div class="bigword" lang="fr">${esc(w.fr)}</div><p class="muted" lang="fr" style="margin-top:6px;font-size:1.05rem">${esc(cut(typeClue(w).t, 110))}</p>
      <div class="sp-row"><button class="btn ghost" data-say="fr" data-id="${w.id}">${IC('speak')}Önce dinle</button><button class="micbtn ${P.st === 'rec' ? 'on' : ''}" data-pl="mic" aria-label="${P.st === 'rec' ? 'Dinlemeyi durdur' : 'Söyle'}">${IC('mic', 'lg')}</button></div>
      <p class="sp-heard ${P.heard && !P.ok1 ? 'no' : P.ok1 ? 'ok' : ''}" id="spHeard">${msg}</p>
    </div>
    <div class="sess-actions"><button class="btn ${P.ok1 ? 'uc' : 'ghost'}" data-pl="next">${P.ok1 ? 'Sonraki' : 'Geç'}${IC('arrow')}</button></div>`;
  },
  act(P, a) { if (a === 'mic') spListen(P); else if (a === 'next') spNext(P); },
  key(P, e) { if (e.key === 'Enter') { e.preventDefault(); spNext(P); } else if (e.key === ' ') { e.preventDefault(); spListen(P); } },
  summary(P, early) { const n = P.i + (P.ok1 ? 1 : 0); return { title: early ? 'Ara verdin' : 'Bien prononcé', fr: !early, big: `${P.good}/${Math.max(1, n)}`, sub: 'kelime cihaz tarafından doğru anlaşıldı', rows: [['Kelime', n], ['Anlaşılan', P.good], ['Deneme', PL.ok + PL.no]] }; }
};
function spListen(P) {
  if (P.st === 'rec') { try { P.rec && P.rec.stop(); } catch (e) {} return; }
  if (P.tries >= 3 && !P.ok1) { toast('Bu kelime için 3 deneme bitti; geçebilirsin'); return; }
  let R; try { R = new SR_API(); } catch (e) { toast('Konuşma tanıma başlatılamadı'); return; }
  R.lang = 'fr-FR'; R.interimResults = false; R.maxAlternatives = 5;
  P.rec = R; P.st = 'rec'; P.heard = ''; P.msg = ''; plRender();
  R.onresult = e => { const alts = [...e.results[0]].map(x => x.transcript); spJudge(P, alts); };
  R.onerror = e => { P.st = 'idle'; P.rec = null; P.msg = e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'Mikrofon izni verilmedi. Tarayıcı ayarlarından bu siteye mikrofon izni ver.' : e.error === 'no-speech' ? 'Ses duyulmadı; mikrofona biraz daha yakın konuş.' : e.error === 'network' ? 'Konuşma tanıma internet bağlantısı istiyor.' : 'Dinleme yarıda kaldı; yeniden dene.'; if (PL === P) plRender(); };
  R.onend = () => { if (P.st === 'rec') { P.st = 'idle'; P.rec = null; if (PL === P) plRender(); } };
  try { R.start(); haptic('tap'); } catch (e) { P.st = 'idle'; P.rec = null; P.msg = 'Dinleme başlatılamadı.'; plRender(); }
}
function spJudge(P, alts) {
  if (PL !== P) return;
  const w = P.list[P.i], vs = frVariants(w.fr);
  const good = alts.some(a => { const n = canon(a), n2 = stripArt(n); return vs.some(v => { const v2 = stripArt(v); return v === n || v2 === n2 || (v2.length >= 5 && lev(v2, n2) <= 2) || (' ' + n + ' ').includes(' ' + v2 + ' '); }); });
  P.tries++; P.heard = alts[0] || ''; P.st = 'idle'; P.rec = null; P.ok1 = good;
  if (good) P.good++;
  plScore(good, w, { xp: good ? 3 : 0 }); plRender(); plFx($('.micbtn'), good, good ? 3 : 0);
  if (good) P.tm.push(setTimeout(() => { if (PL === P && P.ok1) spNext(P); }, 1300));
}
function spNext(P) { if (P.rec) { try { P.rec.abort(); } catch (e) {} P.rec = null; } P.i++; P.tries = 0; P.heard = ''; P.msg = ''; P.ok1 = false; P.st = 'idle'; if (P.i >= P.list.length) plFinish(MODES.speak.summary(P, false)); else plRender(); }

/* ---------- Sınav maratonu (sınav moduna yönlendirir) ---------- */
MODES.exam = {
  tr: 'Sınav maratonu', fr: 'Marathon', ic: 'target', grp: 'ib', anim: 'target', ill: '<i></i><i></i><i></i>',
  why: 'Bütün listeyi durmadan öğren; her 25 kelimede kontrol testi, sonunda final.',
  start() {}, view() { return ''; }
};

/* =====================================================================
   STÜDYO SAYFASI
   ===================================================================== */
function miniBar(c) {
  const seg = (k, n) => n ? `<i class="s-${k}" style="flex:${n}"></i>` : '';
  return `<div class="sbar sm" aria-hidden="true">${seg('master', c.master)}${seg('known', c.known)}${seg('learn', c.learn)}${seg('new', c.new)}</div>`;
}
function modeCard(k, compact) {
  const M = MODES[k], sel = stSet();
  const bestKey = k === 'match' ? 'match-' + ((S.p.mo.match || {}).kind || 'syn') : k;
  const best = S.p.best[bestKey + ':' + stKey(sel)];
  const off = (M.need === 'tts' && !TTS.ok) || (M.need === 'sr' && !SR_API);
  return `<button class="mcard g-${M.grp} ${compact ? 'mini' : ''} ${off ? 'off' : ''}" data-stmode="${k}">
    <span class="mill a-${M.anim}" aria-hidden="true">${M.ill}</span>
    <span class="mname">${IC(M.ic, 'sm')}<b>${M.tr}</b></span>${compact ? '' : `<span class="mfr" lang="fr">${M.fr}</span>`}
    ${compact ? '' : `<span class="mwhy">${M.why}</span>`}
    ${!compact && (best !== undefined || M.need) ? `<span class="mfoot">${best !== undefined ? `<span class="mbest">${IC('trophy', 'sm')}${M.fmtBest ? M.fmtBest(best) : best}</span>` : ''}${M.need ? `<span class="mneed">${M.need === 'tts' ? 'ses gerekir' : 'mikrofon gerekir'}${off ? ' · bu cihazda yok' : ''}</span>` : ''}</span>` : ''}
  </button>`;
}
let SPOT = 0, ST_OPEN = false;
function stSpotlight(root) {
  clearInterval(SPOT); if (REDUCED || !root) return;
  const tick = () => {
    if (!root.isConnected || root.hidden || document.visibilityState !== 'visible') return;
    const cards = $$('.mcard:not(.off)', root).filter(c => { const r = c.getBoundingClientRect(); return r.bottom > 60 && r.top < innerHeight - 40; });
    $$('.mcard.live', root).forEach(c => c.classList.remove('live'));
    if (cards.length) pick(cards).classList.add('live');
  };
  SPOT = setInterval(tick, 2800); setTimeout(tick, 700);
}
function stRoute(c, dk) {
  const stops = [['cards', 'Kartlar', 'ayıkla'], ['learn', 'Öğren', 'tanı · seç · yaz'], ['atelier', 'Bağ kur', 'zorlananlara'], ['relevez', 'Relevez', 'bağlamda bul'], ['test', 'Test', 'prova']];
  const rec = !c.total ? '' : c.new === c.total ? 'cards' : c.new > 0 ? 'learn' : (c.hard ? 'atelier' : c.learn > (c.master + c.known) ? 'relevez' : 'test');
  return `<section class="st-route" aria-label="Önerilen çalışma sırası">
    <div class="st-route-h"><h2 lang="fr">Parcours conseillé</h2><p>Yeni bir seti bu sırayla çalış; tekrarlar ise zamanı gelince kendiliğinden gelir.</p></div>
    <ol class="rline">${stops.map(([k, t, s]) => `<li class="${k === rec ? 'rec' : ''}"><button data-stmode="${k}"><i class="rdot" aria-hidden="true"></i><b>${t}</b><small>${k === rec ? 'şimdi bu' : s}</small></button></li>`).join('')}
      <li class="term"><button data-run="review:${dk}"><i class="rdot" aria-hidden="true"></i><b>Tekrar</b><small>1 gün sonra</small></button></li></ol>
  </section>`;
}
function renderStudio() {
  const sel = stSet(), dk = sel.deck, base = stBase(sel), c = counts(base), u = stUnitOf(sel), due = dueList(null, dk).length;
  const decks = DECK_ORDER.map(d => { const n = DECK_WORDS[d].length; return `<button class="st-deck ${DECKS[d].cls}" data-stdeck="${d}" aria-pressed="${dk === d}">${deckMark(d)}<span><b>${esc(DECKS[d].name)}</b><small><span lang="fr">${esc(DECKS[d].fr)}</span> · ${n.toLocaleString('tr-TR')}</small></span></button>`; }).join('');
  const srcs = [['all', dk === 'y1' ? 'Bütün liste' : 'Bütün deste'], ...(dk === 'y1' ? [] : DECKS[dk].units.map(x => ['u' + x, unitLabel(x)])), ...ST_FILTERS];
  const srcChips = srcs.map(([k, t]) => {
    const m = /^u(\d)$/.exec(k), uu = m ? +m[1] : 0, n = stBase({ deck: dk, src: k, g: 0 }).length;
    if (!n && sel.src !== k && !uu && k !== 'all') return '';
    return `<button class="fchip ${uu ? 'ufc u' + uu : ''}" data-stsrc="${k}" aria-pressed="${sel.src === k}">${t} <span class="tnum cnt">${n}</span></button>`;
  }).join('');
  const stationSel = u ? `<label class="st-lab">Durak <select id="stG">${[0, ...Array.from({ length: NGROUPS[u] }, (_, i) => i + 1)].map(g => `<option value="${g}" ${sel.g === g ? 'selected' : ''}>${g ? g + ' · ' + esc(trunc(stationName(u, g), 30)) : 'Bütün duraklar'}</option>`).join('')}</select></label>` : '';
  const sizes = [[10, '10'], [20, '20'], [40, '40'], [0, 'Hepsi']].map(([n, t]) => `<button data-stsize="${n}" aria-pressed="${sel.size === n}">${t}</button>`).join('');
  const orders = [['smart', 'Akıllı'], ['book', 'Liste'], ['rand', 'Karışık']].map(([k, t]) => `<button data-storder="${k}" aria-pressed="${sel.order === k}" title="${k === 'smart' ? 'Önce tekrarı gelenler ve zorlular, sonra öğrendiklerin, en son yeniler' : k === 'book' ? 'Listedeki sırayla' : 'Rastgele'}">${t}</button>`).join('');
  const take = sel.size ? Math.min(base.length, sel.size) : base.length;
  $('#v-studio').innerHTML = `
    <div class="page-h"><h1 class="serif">Stüdyo</h1><span class="faint" style="font-weight:700"><span lang="fr">Atelier de mots</span> · 17 mod</span></div>
    <p class="muted st-intro">Aynı kelimeleri farklı yollardan çalış: tanım, eş anlamlı, zıt anlamlı, cümle. Önce desteyi seç; bir oturumdaki bütün kelimeler o desteden gelir.</p>
    <details class="card st-set ${u ? 'u' + u : DECKS[dk].cls}" id="stSetBox" ${ST_OPEN ? 'open' : ''}>
      <summary aria-label="Çalışma setini değiştir">
        <span class="st-cur"><span class="st-k">Çalışma seti</span><b>${esc(stLabel(sel))}</b><small class="tnum">${take} kelimelik oturum · ${sel.order === 'smart' ? 'akıllı sıra' : sel.order === 'book' ? 'liste sırası' : 'karışık'} · sette ${c.new} yeni, ${c.learn} öğreniliyor, ${c.master + c.known} kalıcı</small>${miniBar(c)}</span>
        <span class="btn sm ghost st-chg">${ST_OPEN ? 'Kapat' : 'Değiştir'}</span>
      </summary>
      <div class="st-body">
        <div class="st-decks" role="group" aria-label="Deste">${decks}</div>
        <div class="filters" style="margin:0" role="group" aria-label="Kaynak">${srcChips}</div>
        <div class="st-row st-row2">${stationSel}<div class="st-lab">Kelime sayısı <div class="seg" role="group">${sizes}</div></div><div class="st-lab">Sıra <div class="seg" role="group">${orders}</div></div></div>
      </div>
    </details>
    ${due ? `<button class="st-due" data-run="review:${dk}">${IC('review')}<span><b>${esc(DECKS[dk].name)}: ${due} kelime tekrar bekliyor</b><small>Aralıklı tekrar Stüdyo'dan önce gelir: zamanı geçmiş tekrar, unutmanın başladığı yerdir.</small></span>${IC('chev', 'sm')}</button>` : ''}
    ${stRoute(c, dk)}
    ${ST_GROUPS.map(g => `<section class="st-grp g-${g.k}"><div class="st-grp-h"><h2>${g.tr} <i lang="fr">${g.fr}</i></h2><p>${g.d}</p></div><div class="mgrid">${g.modes.map(k => modeCard(k)).join('')}</div></section>`).join('')}`;
  const G = $('#stG'); if (G) G.onchange = () => { stSet().g = +G.value; touch(); renderStudio(); };
  const D = $('#stSetBox'); if (D) D.addEventListener('toggle', () => { ST_OPEN = D.open; const c2 = D.querySelector('.st-chg'); if (c2) c2.textContent = D.open ? 'Kapat' : 'Değiştir'; });
  stSpotlight($('#v-studio'));
}

/* ---------- olaylar ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-pl],[data-stmode],[data-stdeck],[data-stsrc],[data-stsize],[data-storder],[data-stopen],[data-stgo],[data-stword]');
  if (!t) return;
  const btn = e.target.closest('button');
  if (btn && btn !== t && t.contains(btn)) return;
  const d = t.dataset;
  if (d.pl) { plAct(d.pl, t, e); return; }
  if (d.stmode) { if (t.classList.contains('off')) { toast(MODES[d.stmode].need === 'tts' ? 'Bu cihazda sesli okuma yok' : 'Bu tarayıcı konuşma tanımayı desteklemiyor; Android’de Chrome ile çalışır'); return; } stLaunch(d.stmode, d.stset ? { set: stFrom(d.stset, +(d.stg || 0)) } : null); return; }
  if (d.stdeck) { const s = stSet(); if (s.deck !== d.stdeck) { s.deck = d.stdeck; s.src = 'all'; s.g = 0; touch(); } renderStudio(); haptic('tap'); return; }
  if (d.stsrc) { const s = stSet(); s.src = d.stsrc; s.g = 0; touch(); renderStudio(); haptic('tap'); return; }
  if (d.stsize !== undefined) { stSet().size = +d.stsize; touch(); renderStudio(); return; }
  if (d.storder) { stSet().order = d.storder; touch(); renderStudio(); return; }
  if (d.stopen) { Object.assign(stSet(), stFrom(d.stopen, +(d.g || 0))); touch(); closeSheet(); show('studio'); return; }
  if (d.stgo) { const [src, g] = d.st.split(':'); stLaunch(d.stgo, { set: Object.assign(stFrom(src, +g || 0), { order: 'book' }), only: d.stgo === 'learn' ? 'new' : undefined, size: 0 }); return; }
  if (d.stword) { stLaunch('atelier', { ids: [d.stword], label: 'Tek kelime' }); }
});
document.addEventListener('keydown', e => {
  if (VIEW !== 'play' || !PL || !$('#sheetBg').hidden) return;
  if (e.key === 'Escape') { plQuit(); return; }
  if (PL.done) return;
  const inInput = !!(e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName));
  if (PL.M.key) PL.M.key(PL, e, inInput);
});
document.addEventListener('click', e => {
  const t = e.target.closest('[data-pl="starwrong"]'); if (!t || !PL) return;
  PL.wrong.forEach(id => { S.f[id] = 1; }); touch(); toast(`${PL.wrong.size} kelime yıldızlandı · Stüdyo'da “Yıldızlı” setinde`); t.disabled = true;
}, true);
