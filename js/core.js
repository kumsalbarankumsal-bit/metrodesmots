'use strict';
/* =====================================================================
   MÉTRO DES MOTS — çekirdek: veri, aralıklı tekrar, seviye, kayıt
   RAW satırı: [id, ünite, grup, fr, tanım, zıt(0/1), tr, örnek, örnek_tr, (türkçe akraba), (cinsiyet)]
   Desteler birbirinden tamamen ayrıdır: tekrar, keşif, çeldiriciler, sınav ve Stüdyo setleri
   hiçbir zaman iki desteyi karıştırmaz.
     y1  = 11. sınıf · 1. dönem · 1. yazılı (Ligne Y, ünite 5)
     th1 = Thème 1 · Identités (Métro 1–4, üniteler 1–4)
     th2 = Thème 2 · Expériences (RER A–D, üniteler 6–9)
   Öğrenme Fransızca–Fransızcadır: tanım + eş anlamlılar + zıt anlamlılar (FRX). Türkçe yalnızca destek.
   ===================================================================== */
const ALL_FIXES = Object.assign({}, FIXES, typeof FIXES_Y1 !== 'undefined' ? FIXES_Y1 : {}, typeof FIXES_T2 !== 'undefined' ? FIXES_T2 : {});
const FRX = Object.assign({}, typeof FRX_T1 !== 'undefined' ? FRX_T1 : {}, typeof FRX_T2 !== 'undefined' ? FRX_T2 : {});
function deckOf(u) { return u >= 6 ? 'th2' : u === 5 ? 'y1' : 'th1'; }
const W = RAW.concat(typeof RAW_Y1 !== 'undefined' ? RAW_Y1 : [], typeof RAW_T2 !== 'undefined' ? RAW_T2 : []).map((r, i) => {
  const [id, u, g, fr, def, anti, tr, ex, et, tk, gnd] = r;
  const parts = tr.split(' ⟷ ');
  return { i, id, u, g, fr, def, anti: !!anti, tr, trMain: parts[0], trAnti: parts[1] || '', ex, et,
           n: +id.split('.')[1], fx: ALL_FIXES[id] || '', tk: tk || '', gnd: gnd || '', deck: deckOf(u) };
});
const BYID = Object.create(null);
W.forEach(w => { BYID[w.id] = w; });
const UNIT_IDS = [1, 2, 3, 4];          /* Thème 1 hatları */
const T2_IDS = [6, 7, 8, 9];            /* Thème 2 hatları (RER A–D) */
const ALL_UNITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
if (typeof UNITS !== 'undefined') { if (!UNITS[5]) UNITS[5] = '1er examen'; if (typeof UNITS_T2 !== 'undefined') Object.assign(UNITS, UNITS_T2); }
const UNIT_TR = {
  1: 'Kimlik, aile ve toplumdaki yerimiz',
  2: 'Farklı yaşam tarzları ve kalıpların dışında yaşamak',
  3: 'Sağlık, beslenme, bağımlılık ve ruh hâli',
  4: 'Diller, dil düzeyleri ve dillerin değişimi',
  5: '11. sınıf · 1. dönem · 1. yazılı — ekolojik mahalle, akıllı bina ve insansı robotlar',
  6: 'Yolculuklar, seyahat deneyimi ve ufku genişletmek',
  7: 'Anılar, hatırlamak, aile geçmişi ve kayıplar',
  8: 'Yetişkinliğe geçiş: ritüeller, bağımsızlık ve sorumluluk',
  9: 'Göç, sınırlar ve daha iyi bir yaşam arayışı'
};
const DECKS = {
  y1: { id: 'y1', units: [5], name: '1. Yazılı', fr: '1er examen', long: '11. sınıf · 1. dönem · 1. yazılı', cls: 'u5', tab: 'yazili', net: 'Ligne Y' },
  th1: { id: 'th1', units: [1, 2, 3, 4], name: 'Thème 1', fr: 'Identités', long: 'Thème 1 · Identités', cls: 'dk1', tab: 'th1', net: 'Métro' },
  th2: { id: 'th2', units: [6, 7, 8, 9], name: 'Thème 2', fr: 'Expériences', long: 'Thème 2 · Expériences', cls: 'dk2', tab: 'th2', net: 'RER' }
};
const DECK_ORDER = ['y1', 'th1', 'th2'];
const GROUPS = Object.create(null);
W.forEach(w => { (GROUPS[w.u + '-' + w.g] = GROUPS[w.u + '-' + w.g] || []).push(w); });
const UNIT_WORDS = {}, NGROUPS = {};
ALL_UNITS.forEach(u => { UNIT_WORDS[u] = W.filter(w => w.u === u); NGROUPS[u] = UNIT_WORDS[u].length ? Math.max(...UNIT_WORDS[u].map(w => w.g)) : 0; });
const DECK_WORDS = { y1: W.filter(w => w.deck === 'y1'), th1: W.filter(w => w.deck === 'th1'), th2: W.filter(w => w.deck === 'th2') };
const DECK_STATIONS = {}; DECK_ORDER.forEach(d => { DECK_STATIONS[d] = DECKS[d].units.reduce((s, u) => s + NGROUPS[u], 0); });
const RER = 'ABCD';
function unitLabel(u) { return u === 5 ? 'Yazılı' : u >= 6 ? 'Hat ' + RER[u - 6] : 'Hat ' + u; }
function lineName(u) { return u === 5 ? 'Ligne Y' : u >= 6 ? 'RER ' + RER[u - 6] : 'Ligne ' + u; }
function lineBadge(u) { return u === 5 ? 'Y' : u >= 6 ? RER[u - 6] : String(u); }
function deckName(dk) { return (DECKS[dk] || DECKS.th1).name; }

/* ---------- metin yardımcıları ---------- */
const TRMAP = { 'ğ': 'g', 'ı': 'i', 'İ': 'i', 'ş': 's', 'ü': 'u', 'ö': 'o', 'ç': 'c', 'Ğ': 'g', 'Ş': 's', 'Ü': 'u', 'Ö': 'o', 'Ç': 'c' };
function normT(s) {
  return String(s).replace(/[ğıİşüöçĞŞÜÖÇ]/g, c => TRMAP[c]).toLowerCase()
    .replace(/[’`´]/g, "'").replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function exHTML(ex) { return esc(ex).replace(/\[([^\]]+)\]/g, '<mark>$1</mark>'); }
function exPlain(ex) { return ex.replace(/[\[\]]/g, ''); }
function cap1(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function cleanTerm(fr) {
  let s = fr.replace(/[¹²³⁴]/g, '').split(/\s*[←‹]\s*/)[0].split(' / ')[0];
  s = s.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  return cap1(s);
}
function stationName(u, g) { return (typeof STATION_NAMES_Y1 !== 'undefined' && STATION_NAMES_Y1[u + '-' + g]) || cleanTerm(GROUPS[u + '-' + g][0].fr); }
/* isim cinsiyeti: açık etiket, (m)/(f) işareti ya da le/la/un/une tanımlığı */
function genderOf(w) {
  if (w._g !== undefined) return w._g;
  const f = w.fr.replace(/[¹²³⁴]/g, '').split(/\s*[←‹]\s*/)[0].trim();
  let g = '';
  const g0 = f.replace(/\s*\((m|f)\)/g, '');
  if (!/^les\s/i.test(f) && !/\//.test(f) && !/[()]/.test(g0) && /^(le|la|l’|l'|un|une)\s?\S/i.test(g0)) {
    const mk = (f.match(/\((m|f)\)/) || [])[1];
    if (mk) g = mk;
    else if (w.gnd === 'm' || w.gnd === 'f') g = w.gnd;
    else if (/^(le|un)\s/i.test(g0)) g = 'm';
    else if (/^(la|une)\s/i.test(g0)) g = 'f';
  }
  w._g = g; return g;
}
function bareNoun(w) { return w.fr.replace(/[¹²³⁴]/g, '').split(/\s*[←‹]\s*/)[0].replace(/\s*\((m|f)\)/g, '').replace(/^(le|la|un|une)\s+/i, '').replace(/^l[’']\s?/i, '').trim(); }
function startsVowel(s) { return /^[aeiouyhâàäéèêëîïôöûùüœæ]/i.test(s); }
function withArticle(w, def) {
  const n = bareNoun(w), g = genderOf(w);
  if (def) return (startsVowel(n) ? 'l’' : g === 'f' ? 'la ' : 'le ') + n;
  return (g === 'f' ? 'une ' : 'un ') + n;
}
/* aynı kelimenin farklı anlamları (suivre¹, suivre²…) için ortak anahtar */
function baseKey(w) { return normT(w.fr.replace(/[¹²³⁴]/g, '').split(/\s*[←‹]\s*/)[0]); }
function uniqBase(ws) { const seen = new Set(); return ws.filter(w => { const k = baseKey(w); if (seen.has(k)) return false; seen.add(k); return true; }); }
/* yazım alıştırmaları için hedef biçim: ilk seçenek, eril, yer tutucusuz */
function spellTarget(w) {
  let s = w.fr.replace(/[¹²³⁴≠]/g, '').split(/\s*[←‹]\s*/)[0].split(/\s+\/\s+/)[0];
  s = s.replace(/\s*\+\s*(infinitif|nom|adj|phrase|subjonctif|indicatif)\b/g, '').replace(/\(([^)]*)\)/g, '').replace(/\s+/g, ' ').trim();
  return s.toLowerCase();
}
/* oyunlarda kısa gösterim: üst simgesiz, ok işaretsiz, büyük harfe çevirmeden */
function frShort(w) { let s = w.fr.replace(/[¹²³⁴]/g, '').split(/\s*[←‹]\s*/)[0].trim(); if (s.length > 26 && s.includes(' / ')) s = s.split(' / ')[0]; return s.replace(/\s+\+\s*infinitif/, ''); }
/* seçeneklerde kelimenin baş hâli: türetme oku (← large) ve üst simgeler olmadan */
function frHead(w) { return noSup(w.fr).split(/\s*[←‹]\s*/)[0].trim(); }
function stripAcc(s) { return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
W.forEach(w => { const r = FRX[w.id]; w.key = normT(w.fr + ' ' + w.tr + ' ' + w.def + ' ' + w.tk + (r ? ' ' + r.join(' ') : '')); w.brackets = (w.ex.match(/\[[^\]]+\]/g) || []).length; });

/* ---------- Fransızca–Fransızca: définition · synonymes · antonymes ----------
   Öğretmenin listesindeki eşleşme her zaman önce gelir (L: true):
   · zıt olmayan maddede listedeki tanım eş anlamlılardır; FRX tanımı ayrıca verir
   · FRX tanımı boşsa listedeki ifade zaten bir tanımdır, tanım olarak gösterilir
   · ≠ maddelerinde listedeki ifade zıt anlamlıdır; tanım FRX'ten gelir */
function noSup(s) { return String(s).replace(/[¹²³⁴]/g, ''); }
function splitTeacher(s) { return noSup(s).split(/\s+\/\s+|\s+·\s+/).map(x => x.trim()).filter(Boolean); }
function splitExtra(s) { return String(s || '').split(';').map(x => x.trim()).filter(Boolean); }
function listText(w) { return noSup(w.def).trim(); }
function gloss(w) { return (w.anti ? '≠ ' : '') + listText(w); }
function termKey(t) { return stripArt(canon(t)); }
function fxOf(w) {
  if (w._x) return w._x;
  const r = FRX[w.id] || ['', '', ''], T = splitTeacher(w.def);
  const self = new Set(frVariants(w.fr).map(stripArt)), seen = new Set();
  const take = (arr, L) => arr.map(t => ({ t, L })).filter(o => { const k = termKey(o.t); if (!k || self.has(k) || seen.has(k)) return false; seen.add(k); return true; });
  let def = (r[0] || '').trim(), defL = false;
  if (!def && !w.anti) { def = listText(w); defL = true; }
  const syn = take(w.anti || defL ? [] : T, true).concat(take(splitExtra(r[1]), false));
  const ant = take(w.anti ? T : [], true).concat(take(splitExtra(r[2]), false));
  /* tanım bir eşle aynıysa iki kez gösterme; listedeki ifadeyse tanım öğretmenin tanımı sayılır */
  if (def && !defL) { const k = termKey(def), i = syn.findIndex(o => termKey(o.t) === k); if (i >= 0) { if (syn[i].L) defL = true; syn.splice(i, 1); } }
  const terms = new Set(self);
  syn.concat(ant).forEach(o => terms.add(termKey(o.t)));
  T.forEach(t => { const k = termKey(t); if (k) terms.add(k); });
  terms.delete('');
  w._x = { def, defL, syn, ant, terms };
  return w._x;
}
/* iki kelime aynı anlam ağında mı? (ortak terim: kendisi, eşi ya da zıttı) — çeldiricide ikinci doğru cevap çıkmasın */
function related(a, b) {
  if (a === b || baseKey(a) === baseKey(b)) return true;
  const A = fxOf(a).terms, B = fxOf(b).terms, [s, l] = A.size < B.size ? [A, B] : [B, A];
  for (const k of s) if (l.has(k)) return true;
  return false;
}
function cut(s, n) { s = String(s); return s.length > n ? s.slice(0, Math.max(1, n - 1)).replace(/[\s,;·/]+$/, '') + '…' : s; }
/* oyunlarda kısa eş: önce eş anlamlı, sonra zıt anlamlı, sonra kısa tanım */
function shortPartner(w, max) {
  max = max || 44; const X = fxOf(w);
  const s = X.syn.find(o => o.t.length <= max); if (s) return { t: s.t, rel: 'syn', sym: '≈' };
  const a = X.ant.find(o => o.t.length <= max); if (a) return { t: a.t, rel: 'ant', sym: '≠' };
  if (X.def) return { t: cut(X.def, max + 26), rel: 'def', sym: '' };
  return { t: cut(gloss(w), max + 26), rel: 'list', sym: '' };
}
/* Türkçe destek: off = gizli · after = cevaptan sonra (varsayılan) · always = her zaman */
function trMode() { const m = S.p.trs; return m === 'off' || m === 'always' ? m : 'after'; }

/* ---------- durum ---------- */
const DEF_P = { xp: 0, streak: 0, last: '', days: {}, goal: 10, goalDay: '', night: false, fs: 1, auto: true, sfx: false,
                rate: 0.92, match: {}, sessSize: 0, flowV: 1, matchMode: 'def', plan: 1, lvlSeen: 0,
                haptic: true, intro: 'day', introDay: '', examDate: '', best: {}, st: { deck: 'th2', src: 'all', g: 0, size: 20, order: 'smart' }, mo: {},
                trs: 'after', deck: '', pl: { th1: 1, th2: 6 } };
let S = { v: 1, t: 0, w: {}, f: {}, n: {}, p: JSON.parse(JSON.stringify(DEF_P)) };
function normalizeState(x) {
  const o = { v: 1, t: +x?.t || 0, w: (x && typeof x.w === 'object' && x.w) || {}, f: (x && typeof x.f === 'object' && x.f) || {},
              n: (x && typeof x.n === 'object' && x.n) || {},
              p: Object.assign(JSON.parse(JSON.stringify(DEF_P)), (x && x.p) || {}) };
  for (const k in o.n) { if (!BYID[k] || typeof o.n[k] !== 'object') delete o.n[k]; }
  for (const k in o.w) { if (!BYID[k] || !Array.isArray(o.w[k])) delete o.w[k]; }
  if (o.p.flowV !== 1) { o.p.sessSize = 0; o.p.flowV = 1; }
  if (o.p.intro === true) o.p.intro = 'day'; else if (o.p.intro === false) o.p.intro = 'off';
  if (!o.p.st || typeof o.p.st !== 'object') o.p.st = JSON.parse(JSON.stringify(DEF_P.st));
  if (!o.p.mo || typeof o.p.mo !== 'object') o.p.mo = {};
  if (!o.p.best || typeof o.p.best !== 'object') o.p.best = {};
  /* v7: Thème 2 + Fransızca–Fransızca */
  if (!['off', 'after', 'always'].includes(o.p.trs)) o.p.trs = 'after';
  if (!(x && x.p && x.p.pl && typeof x.p.pl === 'object')) o.p.pl = { th1: UNIT_IDS.includes(o.p.plan) ? o.p.plan : 1, th2: 6 };
  if (!UNIT_IDS.includes(o.p.pl.th1)) o.p.pl.th1 = 1;
  if (!T2_IDS.includes(o.p.pl.th2)) o.p.pl.th2 = 6;
  if (!DECKS[o.p.deck]) o.p.deck = '';
  if (o.p.matchMode !== 'def' && o.p.matchMode !== 'dfn') o.p.matchMode = o.p.matchMode === 'tr' ? 'dfn' : 'def';
  const mo = o.p.mo;
  if (mo.cards && mo.cards.front !== 'fr' && mo.cards.front !== 'def') mo.cards.front = 'def';
  if (mo.match && !['def', 'dfn', 'syn'].includes(mo.match.kind)) mo.match.kind = 'syn';
  if (mo.test && !['mix', 'list', 'def', 'syn', 'ant'].includes(mo.test.dir)) mo.test.dir = 'mix';
  stNormalize(o.p.st);
  const E = o.p.exam;
  if (E && E.scope && E.scope.type === 'all' && !DECKS[E.scope.deck]) E.scope.deck = 'th1';
  if (E && Array.isArray(E.ids)) E.ids = E.ids.filter(id => BYID[id]);
  return o;
}
/* Stüdyo seti: { deck, src: all | uN | due | hard | fav | mine, g, size, order } — eski { src: 'y1' | 'u3' | 'due' … } kayıtları çevrilir */
function stNormalize(sel) {
  if (!sel || typeof sel !== 'object') return sel;
  const m = /^u(\d)$/.exec(sel.src || '');
  if (!DECKS[sel.deck]) {
    if (sel.src === 'y1') { sel.deck = 'y1'; sel.src = 'all'; }
    else if (DECKS[sel.src]) { sel.deck = sel.src; sel.src = 'all'; }
    else if (m) sel.deck = deckOf(+m[1]);
    else sel.deck = 'y1';
  }
  const m2 = /^u(\d)$/.exec(sel.src || '');
  if (m2 && (+m2[1] === 5 || !DECKS[sel.deck].units.includes(+m2[1]))) { sel.src = 'all'; if (+m2[1] !== 5) sel.g = 0; }
  if (!m2 && !['all', 'due', 'hard', 'fav', 'mine'].includes(sel.src)) sel.src = 'all';
  if (typeof sel.g !== 'number') sel.g = 0;
  if (![0, 10, 20, 40].includes(sel.size)) sel.size = 20;
  if (!['smart', 'book', 'rand'].includes(sel.order)) sel.order = 'smart';
  return sel;
}
/* düğmelerdeki kısa set adı: 'y1' | 'th1' | 'th2' (bütün deste) ya da 'uN' (bir hat) */
function stFrom(tok, g) {
  const m = /^u(\d)$/.exec(tok || '');
  if (m) { const u = +m[1]; return { deck: deckOf(u), src: u === 5 ? 'all' : 'u' + u, g: g || 0 }; }
  return { deck: DECKS[tok] ? tok : 'y1', src: 'all', g: g || 0 };
}

/* ---------- aralıklı tekrar (WordUp usulü 5 basamak) ----------
   w[id] = [basamak, vade(dk), doğru, yanlış]
   basamak 0–4 öğreniliyor · 5 ustalaşıldı · 9 zaten biliniyor
   Öğrenince ilk tekrar 1 gün sonra; her doğru bir sonraki aralığa taşır:
   1 gün → 3 gün → 1 hafta → 2 hafta → 1 ay → ustalaşıldı. Yanlış: başa (1 gün). */
const MINUTE = 60000, DAY = 1440;
const INT = [DAY, 3 * DAY, 7 * DAY, 14 * DAY, 30 * DAY];
const STAGE_TR = ['1 gün', '3 gün', '1 hafta', '2 hafta', '1 ay'];
function nowM() { return Math.floor(Date.now() / MINUTE); }
function rec(id) { return S.w[id]; }
function status(id) { const r = S.w[id]; if (!r) return 'new'; if (r[0] === 9) return 'known'; if (r[0] >= 5) return 'master'; return 'learn'; }
function stageOf(id) { const r = S.w[id]; return r ? r[0] : -1; }
function isDue(id, t) { const r = S.w[id]; return !!r && r[0] < 5 && r[1] <= (t ?? nowM()); }
function isHard(id) { const r = S.w[id]; return !!r && r[0] < 5 && r[3] >= 2; }
function ensure(id) { if (!S.w[id]) S.w[id] = [0, 0, 0, 0]; return S.w[id]; }
function learnWord(id) { const r = ensure(id); r[0] = 0; r[1] = nowM() + INT[0]; }
function knowWord(id) { const r = ensure(id); r[0] = 9; r[1] = 0; }
function srsAnswer(id, ok) {
  const r = ensure(id); const from = r[0];
  if (from === 9) return { from, to: 9 };
  if (ok) {
    r[2]++;
    const s = Math.min(from, 4) + 1;
    if (s >= 5) { r[0] = 5; r[1] = 0; return { from, to: 5, mastered: true }; }
    r[0] = s; r[1] = nowM() + INT[s];
    return { from, to: s };
  }
  r[3]++; r[0] = 0; r[1] = nowM() + INT[0];
  return { from, to: 0, fail: true };
}
function resetWord(id) { delete S.w[id]; }
function dueList(t, dk) { t = t ?? nowM(); return (dk && DECK_WORDS[dk] ? DECK_WORDS[dk] : W).filter(w => isDue(w.id, t)).sort((a, b) => S.w[a.id][1] - S.w[b.id][1]); }
function counts(list) {
  const c = { new: 0, learn: 0, master: 0, known: 0, hard: 0, total: 0 };
  (list || W).forEach(w => { c[status(w.id)]++; c.total++; if (isHard(w.id)) c.hard++; });
  return c;
}
function groupCounts(u, g) { return counts(GROUPS[u + '-' + g]); }
function nextStation(prefU, units) {
  units = units || UNIT_IDS;
  const order = prefU && units.includes(prefU) ? [prefU, ...units.filter(x => x !== prefU)] : units;
  for (const u of order) for (let g = 1; g <= NGROUPS[u]; g++) {
    if (GROUPS[u + '-' + g].some(w => status(w.id) === 'new')) return { u, g };
  }
  return null;
}

/* ---------- XP · arrondissement seviyeleri (20ᵉ → 1ᵉʳ) ---------- */
const ARR = [[20, 'Belleville'], [19, 'Buttes-Chaumont'], [18, 'Montmartre'], [17, 'Batignolles'], [16, 'Trocadéro'],
  [15, 'Vaugirard'], [14, 'Montparnasse'], [13, 'Butte-aux-Cailles'], [12, 'Bercy'], [11, 'Oberkampf'],
  [10, 'Canal Saint-Martin'], [9, 'Opéra'], [8, 'Champs-Élysées'], [7, 'Tour Eiffel'], [6, 'Saint-Germain-des-Prés'],
  [5, 'Quartier latin'], [4, 'Notre-Dame'], [3, 'Le Marais'], [2, 'La Bourse'], [1, 'Louvre']];
const XPT = [0, 100, 300, 600, 1000, 1600, 2400, 3400, 4700, 6300, 8300, 10800, 13800, 17500, 22000, 27500, 34000, 42000, 51000, 62000];
function lvl(xp) {
  let i = 0; while (i + 1 < XPT.length && xp >= XPT[i + 1]) i++;
  return { i, arr: ARR[i][0], name: ARR[i][1], from: XPT[i], to: i + 1 < XPT.length ? XPT[i + 1] : null };
}
function arrLabel(n) { return n === 1 ? '1<sup>er</sup>' : n + '<sup>e</sup>'; }
function arrText(n) { return n === 1 ? '1er' : n + 'e'; }

/* ---------- gün, seri, hedef ---------- */
function ymd(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function ymdShift(n) { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); }
function streakNow() { return (S.p.last === ymd() || S.p.last === ymdShift(-1)) ? S.p.streak : 0; }
function today() { return S.p.days[ymd()] || [0, 0]; }
function activity(answers, learned) {
  const t = ymd();
  const d = S.p.days[t] || (S.p.days[t] = [0, 0]);
  d[0] += answers; d[1] += learned;
  if (S.p.last !== t) { S.p.streak = (S.p.last === ymdShift(-1)) ? S.p.streak + 1 : 1; S.p.last = t; }
  const keys = Object.keys(S.p.days).sort();
  while (keys.length > 160) delete S.p.days[keys.shift()];
  if (learned && d[1] >= S.p.goal && S.p.goalDay !== t) { S.p.goalDay = t; return 'goal'; }
  return '';
}

/* ---------- kayıt: tarayıcı + hesap (cihazlar arası) ---------- */
const LS_KEY = 'metro-des-mots-v1';
const SYNC = { db: null, ref: null, ready: false, writing: false, dirty: false, timer: 0, mode: 'local' };
function loadLocal() { try { const s = localStorage.getItem(LS_KEY); if (s) return JSON.parse(s); } catch (e) {} return null; }
function saveLocal() { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) {} }
function touch() { S.t = Date.now(); saveLocal(); markDirty(); }
function markDirty() { SYNC.dirty = true; clearTimeout(SYNC.timer); SYNC.timer = setTimeout(flush, 1500); }
async function flush() {
  if (!SYNC.ready || !SYNC.ref || !SYNC.dirty) return;
  if (SYNC.writing) { clearTimeout(SYNC.timer); SYNC.timer = setTimeout(flush, 800); return; }
  SYNC.writing = true; SYNC.dirty = false;
  try { await SYNC.ref.set(JSON.parse(JSON.stringify(S))); setSync('cloud'); }
  catch (e) {
    SYNC.dirty = true;
    if (e && (e.code === 'unavailable' || e.code === 'resource_exhausted')) { clearTimeout(SYNC.timer); SYNC.timer = setTimeout(flush, 2500 + Math.random() * 2500); }
    else setSync('err');
  } finally { SYNC.writing = false; }
}
async function initRemote(onAdopt) {
  const c = window.claude;
  if (!c || typeof c.use !== 'function') { setSync('local'); return; }
  try {
    const [db, user] = await Promise.all([c.use('db'), c.use('user')]);
    if (!db || !user) { setSync('local'); return; }
    const uid = await user.id();
    if (!uid) { setSync('local'); return; }
    SYNC.db = db; SYNC.ref = db.doc('data/users/' + uid + '/state');
    const snap = await SYNC.ref.get();
    const r = snap.exists ? snap.data() : null;
    if (r && (+r.t || 0) > S.t) { S = normalizeState(JSON.parse(JSON.stringify(r))); saveLocal(); onAdopt && onAdopt(); }
    else if (S.t > 0) SYNC.dirty = true;
    SYNC.ready = true; setSync('cloud');
    if (SYNC.dirty) flush();
  } catch (e) { setSync('local'); }
}
async function refreshRemote(onAdopt) {
  if (!SYNC.ready || !SYNC.ref || SYNC.dirty || SYNC.writing) return;
  try {
    const snap = await SYNC.ref.get(); const r = snap.exists ? snap.data() : null;
    if (r && (+r.t || 0) > S.t) { S = normalizeState(JSON.parse(JSON.stringify(r))); saveLocal(); onAdopt && onAdopt(); }
  } catch (e) {}
}
function setSync(mode) {
  SYNC.mode = mode;
  const dot = document.getElementById('syncDot'), txt = document.getElementById('syncTxt');
  if (!dot || !txt) return;
  dot.className = 'sync ' + (mode === 'cloud' ? 'cloud' : mode === 'err' ? 'err' : '');
  txt.textContent = mode === 'cloud' ? 'Hesabına kaydediliyor · tüm cihazlarında aynı' : mode === 'err' ? 'Kayıt şu an yapılamadı · bu cihazda tutuluyor' : 'Bu tarayıcıda kaydediliyor';
}

/* ---------- telaffuz ---------- */
const TTS = { ok: typeof window !== 'undefined' && 'speechSynthesis' in window, voice: null, warned: false };
function pickVoice() {
  if (!TTS.ok) return;
  try {
    const vs = speechSynthesis.getVoices();
    TTS.voice = vs.find(v => /^fr[-_]FR/i.test(v.lang) && /google|amélie|amelie|thomas|audrey|marie|denise|henri|virginie/i.test(v.name))
             || vs.find(v => /^fr[-_]FR/i.test(v.lang)) || vs.find(v => /^fr/i.test(v.lang)) || null;
    TTS.count = vs.length;
  } catch (e) {}
}
if (TTS.ok) { pickVoice(); try { speechSynthesis.onvoiceschanged = pickVoice; } catch (e) {} }
function speechText(fr) {
  let s = fr.replace(/[¹²³⁴≠]/g, '').split(/\s*[←‹]\s*/)[0].split(' / ')[0];
  s = s.replace(/\([^)]*\)/g, ' ').replace(/\bqqch\b/g, 'quelque chose').replace(/\bqqn\b/g, 'quelqu’un')
       .replace(/\bf\.\s*/g, 'faire ').replace(/\+\s*[\wéè.]+/g, ' ').replace(/…|\.\.\./g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}
function speak(text, el, rate) {
  if (!TTS.ok) { toast('Bu tarayıcı sesli okumayı desteklemiyor'); return; }
  try {
    speechSynthesis.cancel();
    if (!TTS.voice) pickVoice();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR'; if (TTS.voice) u.voice = TTS.voice; u.rate = rate || S.p.rate || 0.92;
    if (el) { el.classList.add('on'); u.onend = u.onerror = () => el.classList.remove('on'); }
    speechSynthesis.speak(u);
    if (!TTS.voice && TTS.count > 0 && !TTS.warned) { TTS.warned = true; toast('Cihazında Fransızca ses paketi bulunamadı; telaffuz varsayılan sesle okunuyor'); }
  } catch (e) {}
}

/* ---------- ses efekti (isteğe bağlı) ---------- */
let AC = null;
function sfx(kind) {
  if (!S.p.sfx) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = 'sine'; o.connect(g); g.connect(AC.destination);
    const f = kind === 'ok' ? [660, 990] : kind === 'no' ? [320, 200] : [523, 1046];
    o.frequency.setValueAtTime(f[0], t); o.frequency.exponentialRampToValueAtTime(f[1], t + 0.14);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.start(t); o.stop(t + 0.3);
  } catch (e) {}
}

/* ---------- soru üretimi (Fransızca–Fransızca) ---------- */
function sameish(a, b) { return normT(a.fr) === normT(b.fr) || normT(a.trMain) === normT(b.trMain) || normT(a.def) === normT(b.def); }
/* çeldiriciler yalnızca aynı desteden gelir: önce aynı durak, sonra aynı hat, sonra deste */
function deckPools(w) { return [GROUPS[w.u + '-' + w.g], UNIT_WORDS[w.u], DECK_WORDS[w.deck]]; }
function distractors(w, n, extra, keyFn) {
  const out = [], seen = new Set(), keys = new Set(keyFn ? [normT(keyFn(w))] : []);
  for (const pool of deckPools(w)) {
    for (const c of shuffle(pool.slice())) {
      if (c === w || sameish(c, w) || related(w, c)) continue;
      if (extra && !extra(c)) continue;
      if (out.some(o => sameish(o, c) || related(o, c))) continue;
      if (seen.has(c.id)) continue;
      if (keyFn) { const k = normT(keyFn(c)); if (!k || keys.has(k)) continue; keys.add(k); }
      seen.add(c.id); out.push(c);
      if (out.length >= n) return out;
    }
  }
  return out;
}
/* metin çeldiricileri: başka kelimelerin tanımı / eşi / zıttı (aynı desteden, anlam ağı ayrı) */
function textDistractors(w, n, texts, extra) {
  const out = [], keys = new Set(fxOf(w).terms), ck = new Set();
  if (n <= 0) return out;
  for (const pool of deckPools(w)) {
    for (const c of shuffle(pool.slice())) {
      if (c === w || ck.has(c.id) || related(w, c)) continue;
      if (extra && !extra(c)) continue;
      ck.add(c.id);
      for (const t of shuffle(texts(c).slice())) {
        const k = termKey(t); if (!k || keys.has(k)) continue;
        keys.add(k); out.push(t); break;
      }
      if (out.length >= n) return out;
    }
  }
  return out;
}
function bracketText(w) { const m = w.ex.match(/\[([^\]]+)\]/); return m ? m[1] : ''; }
const PLACEHOLDER = /\b(qqch|qqn|f|phrase|infinitif|imparfait|temps|adj|nom)\b/g;
function canon(s) { return normT(s).replace(PLACEHOLDER, ' ').replace(/\s+/g, ' ').trim(); }
function femForm(p) {
  return p.replace(/(\S*?)ier\(ière\)/g, '$1ière').replace(/(\S*?)er\(ère\)/g, '$1ère')
    .replace(/(\S*?)teur\(trice\)/g, '$1trice').replace(/(\S*?)eur\(euse\)/g, '$1euse').replace(/(\S*?)eux\(euse\)/g, '$1euse')
    .replace(/(\S*?)f\(ve\)/g, '$1ve').replace(/(\S*?)x\(se\)/g, '$1se')
    .replace(/(\S*?)\((e|ne|le|te|se|s|es|ne)\)/g, '$1$2');
}
function frVariants(fr) {
  const s = fr.replace(/[¹²³⁴≠]/g, '').split(/\s*[←‹]\s*/)[0];
  const out = new Set();
  s.split(/\s*\/\s*/).forEach(p => {
    [p, femForm(p)].forEach(x => {
      const a = canon(x.replace(/\([^)]*\)/g, ' '));
      if (a) { out.add(a); out.add(stripArt(a)); if (a.startsWith('etre ')) out.add(a.slice(5)); }
    });
  });
  return [...out];
}
function stripArt(a) { return a.replace(/^(le|la|les|l|un|une|des|du|de la|se|s)\s+/, '').trim(); }
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function checkTyped(input, w) {
  const n = canon(input); if (!n) return 'no';
  const n2 = stripArt(n), vs = frVariants(w.fr);
  for (const v of vs) if (v === n || v === n2 || stripArt(v) === n2) return 'ok';
  for (const v of vs) { const v2 = stripArt(v); if (v2.length >= 5 && (lev(v2, n2) <= 1 || lev(v, n) <= 1)) return 'near'; }
  return 'no';
}
function typeable(w) { const vs = frVariants(w.fr); return vs.length && Math.min(...vs.map(v => v.length)) <= 28; }
function clozeable(w) {
  if (w.brackets !== 1) return false;
  return distractors(w, 3, c => c.brackets === 1, bracketText).length === 3;
}
/* soru tipleri
   list   kelime → listedeki eşi (sınavdaki gibi; ≠ maddelerde zıttı)
   fr2def kelime → tanımı          def2fr tanım → kelime
   fr2syn kelime → eş anlamlısı    syn2fr eş anlamlı → kelime
   fr2ant kelime → zıt anlamlısı   ant2fr zıt anlamlı → kelime (çeldiricilerden biri kelimenin eşi olabilir)
   cloze  örnek cümlede boşluk     type   tanımdan kelimeyi yaz */
const QTYPES_TR = { list: 'Liste', fr2def: 'Tanım', def2fr: 'Tanımdan kelime', fr2syn: 'Eş anlamlı', syn2fr: 'Eş anlamlıdan kelime',
  fr2ant: 'Zıt anlamlı', ant2fr: 'Zıt anlamlıdan kelime', cloze: 'Cümlede', type: 'Yazma' };
const WORD_PROMPT = new Set(['list', 'fr2def', 'fr2syn', 'fr2ant']);
function qAvail(w, t) {
  const X = fxOf(w);
  if (t === 'list') return !!listText(w);
  if (t === 'fr2def' || t === 'def2fr') return !!X.def && X.def.length <= 170;
  if (t === 'fr2syn' || t === 'syn2fr') return X.syn.length > 0;
  if (t === 'fr2ant' || t === 'ant2fr') return X.ant.length > 0;
  if (t === 'cloze') return clozeable(w);
  if (t === 'type') return typeable(w) && !!(X.def || X.syn.length || X.ant.length);
  return false;
}
function chooseType(w, mode) {
  const st = Math.max(0, stageOf(w.id));
  let types;
  if (mode === 'review') {
    if (st === 0) types = ['list', 'fr2def', 'list'];
    else if (st === 1) types = ['def2fr', 'syn2fr', 'ant2fr', 'list'];
    else if (st === 2) types = ['fr2syn', 'fr2ant', 'cloze', 'def2fr'];
    else types = ['type', 'cloze', 'fr2ant', 'fr2syn', 'syn2fr'];
  } else types = ['list', 'fr2def', 'def2fr', 'fr2syn', 'syn2fr', 'fr2ant', 'ant2fr', 'cloze'];
  types = types.filter(t => qAvail(w, t));
  return pick(types.length ? types : ['list']);
}
/* yazma sorusunda gösterilen ipucu: tanım, yoksa eş/zıt anlamlı */
function typeClue(w) { const X = fxOf(w); return X.def ? { t: X.def, sym: '' } : X.syn.length ? { t: X.syn.map(o => o.t).slice(0, 3).join(' · '), sym: '≈' } : { t: X.ant.map(o => o.t).slice(0, 3).join(' · '), sym: '≠' }; }
function makeQ(w, mode, force) {
  const type = force && qAvail(w, force) ? force : chooseType(w, mode);
  const X = fxOf(w), q = { type, w };
  const mc = (answer, ds) => { q.answer = answer; q.options = shuffle([{ text: answer, ok: true }, ...ds.map(t => ({ text: t, ok: false }))]); return q; };
  if (type === 'type') { q.answer = w.fr; q.clue = typeClue(w); return q; }
  if (type === 'list') { q.sym = w.anti ? '≠' : '≈'; return mc(listText(w), textDistractors(w, 3, c => [listText(c)], c => c.anti === w.anti)); }
  if (type === 'fr2def') return mc(X.def, textDistractors(w, 3, c => { const d = fxOf(c).def; return d && d.length <= 170 ? [d] : []; }));
  if (type === 'fr2syn') return mc(pick(X.syn).t, textDistractors(w, 3, c => fxOf(c).syn.map(o => o.t)));
  if (type === 'fr2ant') {
    const trap = X.syn.length && Math.random() < 0.6 ? [pick(X.syn).t] : [];
    return mc(pick(X.ant).t, trap.concat(textDistractors(w, 3 - trap.length, c => fxOf(c).ant.concat(fxOf(c).syn).map(o => o.t))));
  }
  if (type === 'def2fr' || type === 'syn2fr' || type === 'ant2fr') {
    q.shown = type === 'def2fr' ? X.def : type === 'syn2fr' ? pick(X.syn).t : pick(X.ant).t;
    q.sym = type === 'syn2fr' ? '≈' : type === 'ant2fr' ? '≠' : '';
    const ds = distractors(w, 3, null, c => frHead(c));
    q.answer = frHead(w); q.options = shuffle([{ text: q.answer, ok: true }, ...ds.map(c => ({ text: frHead(c), ok: false, id: c.id }))]);
    return q;
  }
  const ds = distractors(w, 3, c => c.brackets === 1, bracketText);
  q.answer = bracketText(w);
  q.options = shuffle([{ text: q.answer, ok: true }, ...ds.map(c => ({ text: bracketText(c), ok: false, id: c.id }))]);
  return q;
}
/* doğru/yanlış eşleşmesi (Test, Şimşek): kelime ≈ eşi · ≠ zıttı · : tanımı; yanlışlarda tuzak olarak zıttı ≈ ile gösterilebilir */
function tfPair(w) {
  const X = fxOf(w), rels = [];
  if (X.syn.length) rels.push('syn', 'syn');
  if (X.ant.length) rels.push('ant');
  if (X.def && X.def.length <= 90) rels.push('def');
  if (!rels.length) rels.push('list');
  const rel = pick(rels);
  let truth = Math.random() < 0.5, shown = '', sym = rel === 'syn' ? '≈' : rel === 'ant' ? '≠' : rel === 'def' ? ':' : (w.anti ? '≠' : '≈');
  const right = rel === 'syn' ? pick(X.syn).t : rel === 'ant' ? pick(X.ant).t : rel === 'def' ? X.def : listText(w);
  if (!truth) {
    if (rel === 'syn' && X.ant.length && Math.random() < 0.4) shown = pick(X.ant).t;
    else if (rel === 'ant' && X.syn.length && Math.random() < 0.4) shown = pick(X.syn).t;
    else shown = textDistractors(w, 1, c => { const C = fxOf(c); return rel === 'syn' ? C.syn.map(o => o.t) : rel === 'ant' ? C.ant.map(o => o.t) : rel === 'def' ? (C.def && C.def.length <= 90 ? [C.def] : []) : (c.anti === w.anti ? [listText(c)] : []); })[0] || '';
  }
  if (!shown) { truth = true; shown = right; }
  return { w, rel, truth, shown, sym, right };
}
