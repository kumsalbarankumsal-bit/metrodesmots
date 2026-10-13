/* =====================================================================
   MÉTRO DES MOTS — Sınav modu
   Kesintisiz öğret → her N kelimede kontrol testi (yanlışlar doğru bilinene
   kadar geri gelir) → her 3 partide karma tekrar → kapsam sonunda final.
   Durum S.p.exam içinde saklanır; kaldığın yerden devam edilir.
   ===================================================================== */
let EXR = { q: null, qid: null, answered: false, ok: false, revealed: false, last: 0 };
const EX_PHASE_TR = { learn: 'Öğren', check: 'Kontrol testi', mix: 'Karma tekrar', final: 'Final sınavı' };

function exState() { return S.p.exam || null; }
function exScopeIds(sc) {
  return W.filter(w => sc.type === 'all' || (w.u === sc.u && (sc.type === 'unit' || (w.g >= sc.g1 && w.g <= sc.g2)))).map(w => w.id);
}
function exScopeLabel(sc) {
  if (sc.type === 'all') return 'Bütün kitap · 4 hat';
  if (sc.type === 'unit') return 'Ligne ' + sc.u + ' · ' + UNITS[sc.u];
  return 'Ligne ' + sc.u + ' · durak ' + sc.g1 + '–' + sc.g2;
}
function exTick() {
  const E = exState(); if (!E) return;
  const now = Date.now(); if (EXR.last) E.st.active += Math.min(now - EXR.last, 60000); EXR.last = now;
}
function exEta(E) {
  const left = E.ids.length - E.pos; if (!E.st.learned || !E.st.active) return '';
  const ms = left * (E.st.active / E.st.learned); const m = Math.round(ms / 60000);
  return m < 1 ? '<1 dk' : m < 60 ? `~${m} dk` : `~${Math.floor(m / 60)} sa ${m % 60} dk`;
}
function exFirstPct(E) { return E.st.asked ? Math.round(E.st.firstOk / E.st.asked * 100) : 0; }

/* ---------- kurulum ekranı ---------- */
const EXSET = { type: 'all', u: 1, g1: 1, g2: 5, size: 25, reveal: true, mix: true, skip: false, confirm: false };
function renderExam() {
  const E = exState(), v = $('#v-exam');
  const ug = EXSET.u;
  const opts = (n, cur) => Array.from({ length: n }, (_, i) => `<option value="${i + 1}" ${cur === i + 1 ? 'selected' : ''}>${i + 1} · ${esc(trunc(stationName(ug, i + 1), 22))}</option>`).join('');
  const preview = exScopeIds(EXSET), skipN = EXSET.skip ? preview.filter(id => ['master', 'known'].includes(status(id))).length : 0;
  const seg = (k, vals) => `<div class="seg" role="group">${vals.map(([val, t]) => `<button data-exset="${k}" data-val="${val}" aria-pressed="${String(EXSET[k]) === String(val)}">${t}</button>`).join('')}</div>`;
  const resume = E && E.phase !== 'done' ? `
    <div class="card s12 exam-resume">
      <div class="card-h"><h2>Devam eden sınav</h2><span class="label">${esc(exScopeLabel(E.scope))}</span></div>
      <div class="bar" style="height:14px"><span style="width:${(E.pos / E.ids.length * 100).toFixed(1)}%;background:var(--rouge)"></span></div>
      <div class="sum-stats" style="margin:14px 0">
        <div class="stat"><b class="tnum">${E.pos} / ${E.ids.length}</b><span>öğrenilen</span></div>
        <div class="stat"><b class="tnum">${E.st.batches}</b><span>tamamlanan parti</span></div>
        <div class="stat"><b class="tnum">%${exFirstPct(E)}</b><span>ilk denemede doğru</span></div>
        <div class="stat"><b class="tnum">${exEta(E) || '—'}</b><span>kalan süre tahmini</span></div>
      </div>
      <div class="row"><button class="btn no" data-exgo="resume">${IC('arrow')}Kaldığın yerden devam et</button>
        ${EXSET.confirm ? `<span class="muted" style="font-weight:800">Bu sınavı silip yenisini mi başlatacaksın?</span><button class="btn sm ghost" data-exgo="cancel">Vazgeç</button><button class="btn sm no" data-exgo="startnew">Evet, yeni başlat</button>` : ''}</div>
    </div>` : '';
  v.innerHTML = `
    <div class="card-h" style="margin-bottom:6px"><h2 class="serif" style="font-size:2rem">Sınav modu</h2><span class="label"><span lang="fr">Mode examen</span></span></div>
    <p class="muted" style="max-width:68ch;margin-bottom:16px">Kelimeler kitap sırasıyla, durmadan önüne gelir. Seçtiğin parti boyu dolunca aynı kelimelerden bir kontrol testi gelir; yanlış bildiğin her kelime, doğru bilene kadar testin sonunda yeniden sorulur. Her üç partide bir önceki partilerden karışık bir tekrar gelir, kapsam bitince de zayıf kelimelerine ağırlık veren bir final sınavı. Öğrendiğin kelimeler aralıklı tekrar listene de girer.</p>
    <div class="grid">${resume}
      <div class="card s12">
        <div class="card-h"><h2>Kapsam</h2><span class="label tnum">${preview.length - skipN} kelime</span></div>
        <div class="filters" style="margin-top:0">
          <button class="fchip" data-exscope="all" aria-pressed="${EXSET.type === 'all'}">Bütün kitap (1793)</button>
          ${UNIT_IDS.map(u => `<button class="fchip ufc u${u}" data-exscope="unit" data-u="${u}" aria-pressed="${EXSET.type === 'unit' && EXSET.u === u}">Hat ${u} (${UNIT_WORDS[u].length})</button>`).join('')}
          <button class="fchip" data-exscope="range" aria-pressed="${EXSET.type === 'range'}">Durak aralığı</button>
        </div>
        ${EXSET.type === 'range' ? `<div class="row ex-range">
          <label>Hat <select id="exU">${UNIT_IDS.map(u => `<option value="${u}" ${u === ug ? 'selected' : ''}>${u} · ${esc(UNITS[u])}</option>`).join('')}</select></label>
          <label>İlk durak <select id="exG1">${opts(NGROUPS[ug], EXSET.g1)}</select></label>
          <label>Son durak <select id="exG2">${opts(NGROUPS[ug], EXSET.g2)}</select></label></div>` : ''}
        <div class="set-row"><div><div class="t">Parti boyu</div><div class="d">Kaç kelimede bir kontrol testi gelsin.</div></div>${seg('size', [[20, '20'], [25, '25'], [30, '30']])}</div>
        <div class="set-row"><div><div class="t">Kart</div><div class="d">“Önce tahmin et”te anlam bir dokunuşla açılır; hatırlamaya çalışmak öğrenmeyi güçlendirir.</div></div>${seg('reveal', [['true', 'Önce tahmin et'], ['false', 'Doğrudan göster']])}</div>
        <div class="set-row"><div><div class="t">Karma tekrar</div><div class="d">Her 3 partide bir, önceki partilerden 12 soru.</div></div>${seg('mix', [['true', 'Açık'], ['false', 'Kapalı']])}</div>
        <div class="set-row"><div><div class="t">Bildiklerimi atla</div><div class="d">Ustalaştığın ve “biliyordum” dediğin kelimeleri öğrenme kısmına alma.</div></div>${seg('skip', [['false', 'Hepsini göster'], ['true', 'Atla']])}</div>
        <button class="btn no full" style="margin-top:14px" data-exgo="start">${IC('target')}Sınav modunu başlat</button>
      </div>
    </div>`;
  const U = $('#exU'), G1 = $('#exG1'), G2 = $('#exG2');
  if (U) U.onchange = () => { EXSET.u = +U.value; EXSET.g1 = 1; EXSET.g2 = Math.min(5, NGROUPS[EXSET.u]); renderExam(); };
  if (G1) G1.onchange = () => { EXSET.g1 = +G1.value; if (EXSET.g2 < EXSET.g1) EXSET.g2 = EXSET.g1; renderExam(); };
  if (G2) G2.onchange = () => { EXSET.g2 = +G2.value; if (EXSET.g1 > EXSET.g2) EXSET.g1 = EXSET.g2; renderExam(); };
}
function exStart() {
  const sc = EXSET.type === 'all' ? { type: 'all' } : EXSET.type === 'unit' ? { type: 'unit', u: EXSET.u } : { type: 'range', u: EXSET.u, g1: EXSET.g1, g2: EXSET.g2 };
  let ids = exScopeIds(sc);
  if (EXSET.skip) ids = ids.filter(id => !['master', 'known'].includes(status(id)));
  if (!ids.length) { toast('Bu kapsamda öğrenilecek kelime kalmadı'); return; }
  S.p.exam = { v: 1, scope: sc, ids, opt: { size: EXSET.size, reveal: EXSET.reveal, mix: EXSET.mix }, pos: 0, phase: 'learn', batch: [], q: [], done: [], weak: {},
    bt: { asked: 0, ok: 0, retry: 0 }, st: { learned: 0, asked: 0, firstOk: 0, batches: 0, active: 0, t0: Date.now() }, fin: { asked: 0, ok: 0 } };
  EXSET.confirm = false; touch(); exRun();
}
function exRun() { EXR = { q: null, qid: null, answered: false, ok: false, revealed: false, last: Date.now() }; show('examrun'); exRender(); }

/* ---------- koşucu ---------- */
function exHeader(label, sub) {
  const E = exState(), pct = E.pos / E.ids.length * 100;
  return `<div class="sess-top">
      <button class="iconbtn" data-exgo="exit" aria-label="Sınavdan çık (kaldığın yer saklanır)">${IC('x')}</button>
      <div class="prog" title="Kapsamın %${pct.toFixed(0)}'i"><span style="width:${pct.toFixed(1)}%;background:var(--rouge)"></span></div>
      <span class="count tnum">${E.pos} / ${E.ids.length}</span></div>
    <div class="sess-mode"><span class="pill hard">${label}</span><span class="faint" style="font-weight:700">${sub}</span></div>`;
}
function exRender() {
  const E = exState(), v = $('#v-examrun'); if (!E) { show('exam'); return; }
  v.className = 'view';
  if (E.phase === 'learn') {
    if (E.pos >= E.ids.length) { exAfterLearnEnd(); return; }
    const w = BYID[E.ids[E.pos]]; v.className = 'view u' + w.u;
    const inBatch = E.batch.length + 1, size = E.opt.size;
    const showAll = !E.opt.reveal || EXR.revealed;
    v.innerHTML = exHeader('Öğren', `Parti ${E.st.batches + 1} · ${inBatch}/${size} · Ligne ${w.u} · Durak ${w.g}`) + `
      <div class="ticket" id="tk">
        <div class="tk-top"><span class="tk-no">N° ${w.id} · ${STATUS_TR[status(w.id)]}</span><span class="stage">${Array.from({ length: Math.min(size, 30) }, (_, i) => `<i class="${i < inBatch - 1 ? 'on' : ''}" style="width:7px;height:7px"></i>`).join('')}</span></div>
        <div class="w-head"><div class="bigword">${esc(w.fr)}</div><button class="speak" data-say="fr" data-id="${w.id}" aria-label="Telaffuzu dinle">${IC('speak')}</button></div>
        ${showAll ? wordInfo(w) : `<div class="exbox" style="margin-top:18px"><div style="min-width:0;flex:1"><div class="fr">${exHTML(w.ex)}</div></div><button class="speak sm" data-say="ex" data-id="${w.id}" aria-label="Örnek cümleyi dinle">${IC('speak', 'sm')}</button></div>
          <p class="q-prompt-label" style="margin-top:20px">Anlamını hatırlamaya çalış, sonra aç.</p>`}
      </div>
      ${showAll ? `<div class="decide"><button class="btn ghost" data-exlearn="new">${IC('plus')}Yeni öğrendim</button><button class="btn ok" data-exlearn="knew">${IC('check')}Biliyordum</button></div>
        <p class="kbd">← yeni öğrendim · → biliyordum</p>`
      : `<div class="sess-actions"><button class="btn uc" data-exreveal>${IC('spark')}Anlamını göster</button></div><p class="kbd">Boşluk ya da Enter: göster</p>`}`;
    if (S.p.auto && !EXR.revealed) setTimeout(() => speak(speechText(w.fr)), 220);
    return;
  }
  if (E.phase === 'sum') { exRenderSum(); return; }
  if (E.phase === 'finalintro') { exRenderFinalIntro(); return; }
  if (E.phase === 'result') { exRenderResult(); return; }
  // soru fazları: check / mix / final
  if (!E.q.length) { exQueueDone(); return; }
  const head = E.q[0], w = BYID[head.id];
  if (!EXR.q || EXR.qid !== head.id) { EXR.q = makeQ(w, 'practice'); EXR.qid = head.id; EXR.answered = false; }
  v.className = 'view u' + w.u;
  const left = E.q.length, retry = !head.first;
  // questionCard SES'e bağlı; burada eşdeğerini kuruyoruz
  const q = EXR.q;
  let prompt = '';
  if (q.type === 'fr2tr') prompt = `<div class="w-head"><div class="bigword">${esc(w.fr)}</div><button class="speak" data-say="fr" data-id="${w.id}" aria-label="Telaffuzu dinle">${IC('speak')}</button></div>`;
  else if (q.type === 'tr2fr') prompt = `<div class="q-prompt-label">Türkçesi</div><div class="mid">${esc(w.trMain)}</div>`;
  else if (q.type === 'def2fr') prompt = `<div class="q-prompt-label">${w.anti ? 'Hangisinin zıt anlamlısı?' : 'Fransızca tanım'}</div><div class="mid">${w.anti ? '≠ ' : '≈ '}${esc(w.def)}</div>`;
  else prompt = `<div class="q-prompt-label">Cümleyi tamamla</div><div class="cloze">${esc(w.ex).replace(/\[[^\]]+\]/, '<span class="gap">&nbsp;</span>')}</div>`;
  const opts = `<div class="opts">${q.options.map((o, i) => `<button class="opt ${EXR.answered ? (o.ok ? 'ok' : o.picked ? 'no' : 'dim') : ''}" data-exopt="${i}" ${EXR.answered ? 'disabled' : ''}><span class="k">${i + 1}</span>${esc(o.text)}</button>`).join('')}</div>`;
  const fb = EXR.answered ? `<div class="fb" role="status"><div class="fb-h">${EXR.ok ? '<span class="badge-ok">Doğru</span>' : '<span class="badge-no">Yanlış</span>'}<span class="faint" style="font-size:.95rem">${EXR.ok ? (retry ? 'Bu sefer tamam' : '') : 'Bu kelime testin sonunda yeniden sorulacak'}</span></div>
      <div class="w-head"><div class="mid">${esc(w.fr)}</div><button class="speak sm" data-say="fr" data-id="${w.id}" aria-label="Telaffuzu dinle">${IC('speak', 'sm')}</button></div>${wordInfo(w)}</div>` : '';
  const sub = E.phase === 'final' ? `${E.fin.asked} soru cevaplandı · kalan ${left}` : `Kalan ${left} soru${E.phase === 'check' ? ' · parti ' + (E.st.batches + 1) : ''}`;
  v.innerHTML = exHeader(EX_PHASE_TR[E.phase] + (retry ? ' · tekrar' : ''), sub) + `
    <div class="ticket" id="tk"><div class="tk-top"><span class="tk-no">${QTYPES_TR[q.type]}</span>${retry ? '<span class="pill hard">İkinci şans</span>' : ''}</div>${prompt}${opts}${fb}</div>
    ${EXR.answered ? `<div class="sess-actions"><button class="btn uc" data-exnext>Devam${IC('arrow')}</button></div><p class="kbd">Enter: devam</p>` : '<p class="kbd">Klavyede 1–4 ile seçebilirsin</p>'}`;
  if (S.p.auto && q.type === 'fr2tr' && !EXR.answered) setTimeout(() => speak(speechText(w.fr)), 220);
}
function exLearn(kind) {
  const E = exState(); if (!E || E.phase !== 'learn') return;
  exTick();
  const id = E.ids[E.pos], st = status(id);
  let learned = 0;
  if (st === 'new') { if (kind === 'knew') knowWord(id); else { learnWord(id); learned = 1; } }
  else if (kind === 'new' && (st === 'known' || st === 'master')) { learnWord(id); learned = 1; }
  addXP(kind === 'new' ? 5 : 3); afterActivity(activity(1, learned));
  E.batch.push(id); E.pos++; E.st.learned++; EXR.revealed = false;
  if (E.batch.length >= E.opt.size || E.pos >= E.ids.length) {
    E.phase = 'check'; E.q = shuffle(E.batch.slice()).map(id => ({ id, first: true })); E.bt = { asked: 0, ok: 0, retry: 0 };
    toast(`Parti doldu · ${E.batch.length} kelimelik kontrol testi`);
  }
  touch(); exRender();
}
function exAnswer(i) {
  const E = exState(); if (!E || EXR.answered || !EXR.q) return;
  const o = EXR.q.options[i]; if (!o) return;
  exTick(); o.picked = true; EXR.answered = true; EXR.ok = o.ok;
  const head = E.q[0];
  if (head.first) {
    if (E.phase === 'final') { E.fin.asked++; if (o.ok) E.fin.ok++; }
    else { E.st.asked++; E.bt.asked++; if (o.ok) { E.st.firstOk++; E.bt.ok++; } }
  }
  if (!o.ok) {
    E.weak[head.id] = (E.weak[head.id] || 0) + 1;
    const r = S.w[head.id]; if (r && head.first) r[3]++;
    E.q.push({ id: head.id, first: false }); if (E.phase !== 'final') E.bt.retry++;
  }
  addXP(o.ok ? 4 : 1); afterActivity(activity(1, 0)); sfx(o.ok ? 'ok' : 'no'); touch(); exRender();
  const nb = $('[data-exnext]'); if (nb) nb.focus({ preventScroll: true });
}
function exNext() { const E = exState(); if (!E || !EXR.answered) return; E.q.shift(); EXR.q = null; EXR.answered = false; touch(); exRender(); }
function exQueueDone() {
  const E = exState();
  if (E.phase === 'check') {
    E.st.batches++; E.done.push(...E.batch);
    E.hist = E.hist || []; E.hist.push(E.bt.asked ? Math.round(E.bt.ok / E.bt.asked * 100) : 100);
    if (E.bt.asked && E.bt.ok === E.bt.asked) confetti(90);
    E.phase = 'sum';
  } else if (E.phase === 'mix') { toast('Karma tekrar tamam · öğrenmeye devam'); E.phase = 'learn'; }
  else if (E.phase === 'final') { E.phase = 'result'; if (E.fin.asked && E.fin.ok / E.fin.asked >= 0.9) confetti(160); }
  touch(); exRender();
}
function exRenderSum() {
  const E = exState(), v = $('#v-examrun'), b = E.bt;
  const pct = b.asked ? Math.round(b.ok / b.asked * 100) : 100;
  const weakNow = E.batch.filter(id => E.weak[id]).map(id => BYID[id]);
  const willMix = E.opt.mix && E.st.batches % 3 === 0 && E.done.length > E.batch.length;
  const last = E.pos >= E.ids.length;
  v.innerHTML = exHeader('Parti tamam', `Parti ${E.st.batches}`) + `
    <div class="card"><div class="sum-head"><h1>${pct >= 90 ? 'Excellent !' : pct >= 70 ? 'Bien joué' : 'On continue'}</h1>
      <div class="sum-big tnum">${b.ok}<span class="faint" style="font-size:.5em"> / ${b.asked}</span></div><p class="muted">ilk denemede doğru · %${pct}</p></div>
      <div class="sum-stats">
        <div class="stat"><b class="tnum">${b.retry}</b><span>ikinci şansla bilinen</span></div>
        <div class="stat"><b class="tnum">%${exFirstPct(E)}</b><span>sınav geneli</span></div>
        <div class="stat"><b class="tnum">${E.ids.length - E.pos}</b><span>kalan kelime</span></div>
        <div class="stat"><b class="tnum">${exEta(E) || '—'}</b><span>kalan süre</span></div></div>
      ${weakNow.length ? `<div class="card-h" style="margin:4px 0 6px"><h2 style="font-size:1.15rem">Bu partide zorlandıkların</h2></div><div class="wlist">${weakNow.map(wl).join('')}</div>` : ''}
      <div class="sess-actions"><button class="btn no" data-exgo="cont">${last ? 'Final sınavına geç' : willMix ? 'Karma tekrara geç' : 'Sonraki partiye geç'}${IC('arrow')}</button></div>
      <p class="kbd">Enter: devam</p></div>`;
}
function exContinue() {
  const E = exState(); if (!E || E.phase !== 'sum') return;
  const willMix = E.opt.mix && E.st.batches % 3 === 0 && E.done.length > E.batch.length;
  const prev = E.done.filter(id => !E.batch.includes(id));
  E.batch = [];
  if (E.pos >= E.ids.length) { E.phase = 'finalintro'; }
  else if (willMix && prev.length) {
    const weakFirst = prev.filter(id => E.weak[id]).sort((a, b) => E.weak[b] - E.weak[a]).slice(0, 6);
    const rest = shuffle(prev.filter(id => !weakFirst.includes(id))).slice(0, 12 - weakFirst.length);
    E.phase = 'mix'; E.q = shuffle([...weakFirst, ...rest]).map(id => ({ id, first: true })); E.bt = { asked: 0, ok: 0, retry: 0 };
  } else E.phase = 'learn';
  touch(); exRender();
}
function exAfterLearnEnd() { const E = exState(); if (E.batch.length) { E.phase = 'check'; E.q = shuffle(E.batch.slice()).map(id => ({ id, first: true })); } else E.phase = 'finalintro'; touch(); exRender(); }
function exFinalPool(E) {
  const weak = E.done.filter(id => E.weak[id]).sort((a, b) => E.weak[b] - E.weak[a]);
  const n = Math.min(E.done.length, Math.max(20, Math.min(60, Math.round(E.done.length * 0.08) + weak.length)));
  const w1 = weak.slice(0, Math.ceil(n / 2));
  return shuffle([...w1, ...shuffle(E.done.filter(id => !w1.includes(id))).slice(0, n - w1.length)]);
}
function exRenderFinalIntro() {
  const E = exState(), v = $('#v-examrun'), n = exFinalPool(E).length, weakN = Object.keys(E.weak).length;
  v.innerHTML = exHeader('Kapsam bitti', esc(exScopeLabel(E.scope))) + `
    <div class="card" style="text-align:center"><h1 class="serif" style="font-size:2.2rem">Terminus !</h1>
      <p class="muted" style="margin:8px auto 16px;max-width:56ch">${E.ids.length} kelimenin hepsini öğrendin ve ${E.st.batches} kontrol testini geçtin. Final sınavı yaklaşık ${n} soru; zorlandığın ${weakN} kelimeye ağırlık veriyor, geri kalanı rastgele.</p>
      <div class="sess-actions" style="justify-content:center"><button class="btn no" data-exgo="final">${IC('target')}Final sınavını başlat</button><button class="btn ghost" data-exgo="finish">Finalsiz bitir</button></div></div>`;
}
function exRenderResult() {
  const E = exState(), v = $('#v-examrun'), f = E.fin, pct = f.asked ? Math.round(f.ok / f.asked * 100) : 0;
  const mins = Math.round(E.st.active / 60000);
  const weak = Object.keys(E.weak).sort((a, b) => E.weak[b] - E.weak[a]).map(id => BYID[id]);
  v.innerHTML = exHeader('Sonuç', esc(exScopeLabel(E.scope))) + `
    <div class="card"><div class="sum-head"><h1>${pct >= 90 ? 'Prêt pour l’examen !' : pct >= 75 ? 'Très bien' : 'Encore un effort'}</h1>
      <div class="sum-big tnum">%${pct}</div><p class="muted">final sınavı · ${f.ok} / ${f.asked}</p></div>
      <div class="sum-stats">
        <div class="stat"><b class="tnum">${E.ids.length}</b><span>öğrenilen kelime</span></div>
        <div class="stat"><b class="tnum">%${exFirstPct(E)}</b><span>kontrol testleri, ilk denemede</span></div>
        <div class="stat"><b class="tnum">${weak.length}</b><span>zorlandığın kelime</span></div>
        <div class="stat"><b class="tnum">${mins} dk</b><span>aktif çalışma</span></div></div>
      <div class="sess-actions">${weak.length ? `<button class="btn no" data-exgo="weak">${IC('bolt')}Zorlandıklarını çalış (${weak.length})</button>` : ''}<button class="btn ghost" data-exgo="finish">${IC('home')}Bitir</button></div></div>
    ${weak.length ? `<div class="card" style="margin-top:12px"><div class="card-h"><h2>Zorlandıkların</h2><span class="label">en çok yanlıştan aza</span></div><div class="wlist">${weak.slice(0, 80).map(wl).join('')}</div></div>` : ''}`;
}

/* ---------- olaylar ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset, E = exState();
  if (d.exscope) { EXSET.type = d.exscope; if (d.u) EXSET.u = +d.u; if (EXSET.type === 'range') { EXSET.g1 = Math.min(EXSET.g1, NGROUPS[EXSET.u]); EXSET.g2 = Math.min(Math.max(EXSET.g2, EXSET.g1), NGROUPS[EXSET.u]); } renderExam(); return; }
  if (d.exset) { const v = d.val; EXSET[d.exset] = v === 'true' ? true : v === 'false' ? false : +v; renderExam(); return; }
  if (d.exgo) {
    const g = d.exgo;
    if (g === 'start') { if (E && E.phase !== 'done') { EXSET.confirm = true; renderExam(); const el = $('.exam-resume'); if (el) el.scrollIntoView({ block: 'center' }); } else exStart(); }
    else if (g === 'startnew') exStart();
    else if (g === 'cancel') { EXSET.confirm = false; renderExam(); }
    else if (g === 'resume') exRun();
    else if (g === 'exit') { exTick(); touch(); flush(); toast('Sınav kaydedildi · kaldığın yerden devam edebilirsin'); show('exam'); }
    else if (g === 'cont') exContinue();
    else if (g === 'final') { E.phase = 'final'; E.q = exFinalPool(E).map(id => ({ id, first: true })); E.fin = { asked: 0, ok: 0 }; touch(); exRender(); }
    else if (g === 'finish') { E.phase = 'done'; touch(); show('exam'); }
    else if (g === 'weak') { const ws = Object.keys(E.weak).map(id => BYID[id]); E.phase = 'done'; touch(); startPractice(ws, 'Sınav · zorlandıkların', 20, true); }
    return;
  }
  if ('exreveal' in d) { EXR.revealed = true; exRender(); return; }
  if (d.exlearn) { exLearn(d.exlearn); return; }
  if (d.exopt !== undefined) { exAnswer(+d.exopt); return; }
  if ('exnext' in d) { exNext(); return; }
});
document.addEventListener('keydown', e => {
  if (VIEW !== 'examrun' || !$('#sheetBg').hidden) return;
  const E = exState(); if (!E) return;
  if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  if (E.phase === 'learn') {
    const showAll = !E.opt.reveal || EXR.revealed;
    if (!showAll && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); EXR.revealed = true; exRender(); }
    else if (showAll && (e.key === 'ArrowLeft' || e.key === '1')) exLearn('new');
    else if (showAll && (e.key === 'ArrowRight' || e.key === '2')) exLearn('knew');
  } else if (E.phase === 'sum') { if (e.key === 'Enter') { e.preventDefault(); exContinue(); } }
  else if (['check', 'mix', 'final'].includes(E.phase)) {
    if (!EXR.answered && /^[1-4]$/.test(e.key)) exAnswer(+e.key - 1);
    else if (EXR.answered && e.key === 'Enter') { e.preventDefault(); exNext(); }
  }
});

/* ---------- ana sayfa ve tekrar merkezine bağlantı ---------- */
const _renderHome = renderHome;
renderHome = function () {
  _renderHome();
  const E = exState(), host = $('#v-home .hero-act'); if (!host) return;
  const div = document.createElement('div');
  div.className = 'card exam-strip';
  div.innerHTML = E && E.phase !== 'done'
    ? `<div class="row"><span class="pill hard">Sınav modu</span><b>${esc(exScopeLabel(E.scope))}</b><span class="faint tnum" style="font-weight:700">${E.pos} / ${E.ids.length} · %${exFirstPct(E)} ilk denemede</span><span class="spacer"></span><button class="btn sm no" data-exgo="resume">${IC('arrow', 'sm')}Devam et</button></div>
       <div class="bar" style="margin-top:12px"><span style="width:${(E.pos / E.ids.length * 100).toFixed(1)}%;background:var(--rouge)"></span></div>`
    : `<div class="row"><span class="pill hard">Sınav modu</span><span class="muted" style="font-weight:700;flex:1;min-width:220px">Sınav öncesi: bütün kelimeleri durmadan öğren, her partide kendini test et.</span><button class="btn sm no" data-go="exam">${IC('target', 'sm')}Sınav modunu aç</button></div>`;
  host.insertAdjacentElement('afterend', div);
};

/* açılış: ana sayfa sınav modülünden önce çizildiyse yeniden çiz; #exam bağlantısı */
if ((location.hash || '') === '#exam') show('exam'); else if (VIEW === 'home') renderHome();
