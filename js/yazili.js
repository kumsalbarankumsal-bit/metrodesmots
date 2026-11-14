'use strict';
/* =====================================================================
   MÉTRO DES MOTS — 1. Yazılı sekmesi (Ligne Y · 129 kelime · 12 durak)
   ===================================================================== */
const YZ = { open: new Set() };
function daysUntil(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number), t = new Date(y, m - 1, d), t0 = new Date(); t0.setHours(0, 0, 0, 0);
  return Math.round((t - t0) / 86400000);
}
function yzCountdown(c) {
  const days = daysUntil(S.p.examDate);
  if (days === null) return `<section class="card yz-cd s5">
      <div class="card-h"><h2>Sınav günü</h2>${IC('calendar')}</div>
      <p class="muted">Tarihi girersen geri sayım başlar ve kalan kelimeleri günlere bölüp sana günlük bir tempo öneririm.</p>
      <div class="row" style="margin-top:12px"><input type="date" class="date-in" id="yzDate" aria-label="1. Yazılı tarihi"><button class="btn sm u5 uc" data-yz="date">Kaydet</button></div>
    </section>`;
  const left = c.new, study = Math.max(1, days - 3), per = Math.ceil(left / study);
  let msg;
  if (days < 0) msg = `Sınav tarihi geçti. Yeni bir tarih girebilir ya da bu listeyi tekrarlarla taze tutabilirsin.`;
  else if (days === 0) msg = `Sınav bugün. Yeni kelime ekleme; zorlandığın kelimelerle kısa bir test çöz ve Relevez ile ısın. Bonne chance !`;
  else if (!left) msg = `Bütün kelimeler listende. Kalan günlerde tekrarları kaçırma; sınavdan önceki gün bir test çöz.`;
  else if (days <= 3) msg = `Kalan ${left} kelimeyi bugün ve yarın öğren; son gün yalnızca tekrar ve test.`;
  else msg = `Günde yaklaşık <b>${per} yeni kelime</b> öğrenirsen listeyi sınavdan 3 gün önce bitirirsin; böylece her kelime sınavdan önce en az iki kez (1 gün ve 3 gün sonra) tekrar gelir.`;
  return `<section class="card yz-cd s5 ${days >= 0 && days <= 3 ? 'soon' : ''}">
      <div class="card-h"><h2>Sınav günü</h2><button class="linkbtn" data-yz="datechange">Değiştir</button></div>
      <div class="yz-days"><b class="tnum" data-count="${Math.max(0, days)}" data-ck="yzdays">${Math.max(0, days)}</b><span>${days === 0 ? 'bugün' : days < 0 ? 'gün önceydi' : 'gün kaldı'}</span></div>
      <p class="muted">${msg}</p>
      <div class="yz-datebox" id="yzDateBox" hidden><input type="date" class="date-in" id="yzDate" value="${esc(S.p.examDate)}" aria-label="1. Yazılı tarihi"><button class="btn sm uc" data-yz="date">Kaydet</button><button class="btn sm ghost" data-yz="dateclear">Tarihi kaldır</button></div>
    </section>`;
}
function renderYazili() {
  const ws = DECK_WORDS.y1, c = counts(ws), due = ws.filter(w => isDue(w.id)).length;
  const seen = c.total - c.new, kalici = c.master + c.known;
  const ns = nextStation(5, [5]);
  const E = S.p.exam, exOn = E && E.phase !== 'done' && E.scope && E.scope.u === 5;
  const stations = [];
  for (let g = 1; g <= NGROUPS[5]; g++) {
    const gw = GROUPS['5-' + g], gc = counts(gw), gseen = gc.total - gc.new, done = gc.master + gc.known;
    const cur = ns && ns.g === g, full = done === gc.total;
    const open = YZ.open.has(g);
    stations.push(`<details class="ystation ${full ? 'full' : gseen ? 'seen' : ''} ${cur ? 'cur' : ''}" data-yg="${g}" ${open ? 'open' : ''}>
      <summary>
        <span class="ys-dot" aria-hidden="true">${cur ? `<span class="ys-train">${IC('train', 'sm')}</span>` : ''}</span>
        <span class="ys-m"><b lang="fr">${esc(stationName(5, g))}</b><small>Durak ${g} · ${gc.total} kelime${gc.learn ? ` · ${gc.learn} öğreniliyor` : ''}${full ? ' · tamam' : ''}</small></span>
        <span class="ys-bar" aria-hidden="true"><i class="b-m" style="width:${(done / gc.total * 100).toFixed(1)}%"></i><i class="b-l" style="width:${((gseen - done) / gc.total * 100).toFixed(1)}%"></i></span>
        <span class="ys-n tnum">${gseen}/${gc.total}</span>${IC('chev', 'sm ys-chev')}
      </summary>
      <div class="ys-body">
        <div class="ys-words">${gw.map(w => `<button class="ywl" data-word="${w.id}"><i class="dot ${status(w.id)}"></i><span class="fr" lang="fr">${esc(w.fr)}</span><span class="tr" lang="fr">${esc(gloss(w))}</span></button>`).join('')}</div>
        <div class="row ys-acts">
          ${gc.new ? `<button class="btn sm uc" data-stgo="learn" data-st="y1:${g}">${IC('learn', 'sm')}Öğren (${gc.new})</button>` : ''}
          <button class="btn sm ghost" data-sact="match" data-st="5-${g}">${IC('match', 'sm')}Eşleştir</button>
          <button class="btn sm ghost" data-stgo="relevez" data-st="y1:${g}">${IC('mark', 'sm')}Relevez</button>
          <button class="btn sm ghost" data-stopen="y1" data-g="${g}">${IC('studio', 'sm')}Stüdyo</button>
        </div>
      </div>
    </details>`);
  }
  const fixN = Object.keys(ALL_FIXES).filter(id => BYID[id] && BYID[id].u === 5).length;
  $('#v-yazili').innerHTML = `
  <section class="yz-hero u5">
    <div class="yz-hero-in">
      <div class="yz-id">${badge(5, 'lg')}
        <div style="min-width:0"><p class="yz-k" lang="fr">Ligne Y · 1er examen</p><h1>1. Yazılı</h1><p class="yz-s">11. sınıf · 1. dönem · ${c.total} kelime · 12 durak</p></div></div>
      <div class="yz-ring">
        <div class="ring" style="width:132px;height:132px">${ring(seen / c.total, 132, 12, '#FFFFFF', 'rgba(255,255,255,.22)')}<div class="rc"><span><b class="tnum" data-count="${seen}" data-ck="yzseen">${seen}</b><small>/ ${c.total} görüldü</small></span></div></div>
      </div>
    </div>
    <div class="yz-pills"><span class="ypill"><i class="dot new"></i>${c.new} yeni</span><span class="ypill"><i class="dot learn"></i>${c.learn} öğreniliyor</span><span class="ypill"><i class="dot master"></i>${c.master} ustalaşıldı</span><span class="ypill"><i class="dot known"></i>${c.known} biliyordum</span>${c.hard ? `<span class="ypill hard">${c.hard} zorlu</span>` : ''}</div>
    <p class="yz-theme">${esc(cap1((UNIT_TR[5].split('—')[1] || '').trim()))}</p>
  </section>
  <div class="grid" style="margin-top:16px">
    <section class="card s7 yz-act">
      <div class="card-h"><h2>Şimdi ne yapayım?</h2><span class="faint" style="font-weight:700">%${Math.round(kalici / c.total * 100)} kalıcı</span></div>
      <div class="yz-acts">
        ${ns ? `<button class="yact main" data-stgo="learn" data-st="y1:${ns.g}">${IC('learn')}<span><b>${seen ? 'Öğrenmeye devam' : 'Öğrenmeye başla'}</b><small>Durak ${ns.g} · ${esc(stationName(5, ns.g))} · ${GROUPS['5-' + ns.g].filter(w => status(w.id) === 'new').length} yeni kelime</small></span>${IC('arrow')}</button>`
              : `<button class="yact main" data-stmode="test" data-stset="y1">${IC('test')}<span><b>Sınav provası</b><small>Liste bitti; 129 kelimeden karışık, notlu test</small></span></button>`}
        <button class="yact" data-run="review:y1" ${due ? '' : 'disabled'}>${IC('review')}<span><b>Tekrar${due ? ` (${due})` : ''}</b><small>${due ? 'vadesi gelenler, yalnız bu liste' : 'şu an yok'}</small></span></button>
        <button class="yact" data-yz="exam">${IC('target')}<span><b>${exOn ? 'Maratona devam' : 'Maraton'}</b><small>${exOn ? `${E.pos}/${E.ids.length} · kaldığın yerden` : 'hepsi, durmadan'}</small></span></button>
        <button class="yact" data-stmode="test" data-stset="y1">${IC('test')}<span><b>Test</b><small>tanım, eş ve zıt anlamlı karışık</small></span></button>
        <button class="yact" data-stmode="relevez" data-stset="y1">${IC('mark')}<span><b>Relevez</b><small>Paper 2 tarzı</small></span></button>
        <button class="yact" data-stmode="cards" data-stset="y1">${IC('cards')}<span><b>Kartlar</b><small>hızlı ayıklama</small></span></button>
        <button class="yact" data-stopen="y1">${IC('studio')}<span><b>Stüdyo</b><small>17 modun hepsi</small></span></button>
      </div>
    </section>
    ${yzCountdown(c)}
    <section class="card s12 yz-line">
      <div class="card-h"><h2 lang="fr">Plan de ligne</h2><span class="faint" style="font-weight:700">Durağa dokun: kelimeler ve kısa yollar açılır</span></div>
      <div class="ylist">${stations.join('')}</div>
      <div class="row" style="margin-top:12px"><button class="linkbtn" data-yz="openall">${YZ.open.size === NGROUPS[5] ? 'Hepsini kapat' : 'Bütün durakları aç'}</button><span class="spacer"></span>${fixN ? `<button class="linkbtn" data-info="fixes">Listede ${fixN} düzeltme var</button>` : ''}</div>
    </section>
  </div>`;
  countUps($('#v-yazili'));
  $$('#v-yazili details.ystation').forEach(d => d.addEventListener('toggle', () => { const g = +d.dataset.yg; if (d.open) YZ.open.add(g); else YZ.open.delete(g); }));
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-yz]'); if (!t) return;
  const a = t.dataset.yz;
  if (a === 'date') { const i = $('#yzDate'); if (i && i.value) { S.p.examDate = i.value; touch(); toast('Sınav tarihi kaydedildi'); renderYazili(); } else toast('Önce bir tarih seç'); }
  else if (a === 'datechange') { const b = $('#yzDateBox'); if (b) { b.hidden = !b.hidden; if (!b.hidden) $('#yzDate').focus(); } }
  else if (a === 'dateclear') { S.p.examDate = ''; touch(); renderYazili(); }
  else if (a === 'openall') { if (YZ.open.size === NGROUPS[5]) YZ.open.clear(); else for (let g = 1; g <= NGROUPS[5]; g++) YZ.open.add(g); renderYazili(); }
  else if (a === 'exam') {
    const E = S.p.exam;
    if (E && E.phase !== 'done' && E.scope && E.scope.u === 5) exRun();
    else { EXSET.type = 'unit'; EXSET.u = 5; show('exam'); }
  }
});
