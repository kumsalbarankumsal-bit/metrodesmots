'use strict';
/* =====================================================================
   MÉTRO DES MOTS — çekirdek: veri, aralıklı tekrar, seviye, kayıt
   RAW satırı: [id, ünite, grup, fr, tanım, zıt(0/1), tr, örnek, örnek_tr]
   ===================================================================== */
const W = RAW.map((r, i) => {
  const [id, u, g, fr, def, anti, tr, ex, et] = r;
  const parts = tr.split(' ⟷ ');
  return { i, id, u, g, fr, def, anti: !!anti, tr, trMain: parts[0], trAnti: parts[1] || '', ex, et,
           n: +id.split('.')[1], fx: FIXES[id] || '' };
});
const BYID = Object.create(null);
W.forEach(w => { BYID[w.id] = w; });
const UNIT_IDS = [1, 2, 3, 4];
const UNIT_TR = {
  1: 'Kimlik, aile ve toplumdaki yerimiz',
  2: 'Farklı yaşam tarzları ve kalıpların dışında yaşamak',
  3: 'Sağlık, beslenme, bağımlılık ve ruh hâli',
  4: 'Diller, dil düzeyleri ve dillerin değişimi'
};
const GROUPS = Object.create(null);
W.forEach(w => { (GROUPS[w.u + '-' + w.g] = GROUPS[w.u + '-' + w.g] || []).push(w); });
const UNIT_WORDS = {}, NGROUPS = {};
UNIT_IDS.forEach(u => { UNIT_WORDS[u] = W.filter(w => w.u === u); NGROUPS[u] = Math.max(...UNIT_WORDS[u].map(w => w.g)); });

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
function stationName(u, g) { return cleanTerm(GROUPS[u + '-' + g][0].fr); }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
W.forEach(w => { w.key = normT(w.fr + ' ' + w.tr + ' ' + w.def); w.brackets = (w.ex.match(/\[[^\]]+\]/g) || []).length; });

/* ---------- durum ---------- */
const DEF_P = { xp: 0, streak: 0, last: '', days: {}, goal: 10, goalDay: '', night: false, fs: 1, auto: true, sfx: false,
                rate: 0.92, match: {}, sessSize: 0, flowV: 1, matchMode: 'def', plan: 1, lvlSeen: 0 };
let S = { v: 1, t: 0, w: {}, f: {}, p: JSON.parse(JSON.stringify(DEF_P)) };
function normalizeState(x) {
  const o = { v: 1, t: +x?.t || 0, w: (x && typeof x.w === 'object' && x.w) || {}, f: (x && typeof x.f === 'object' && x.f) || {},
              p: Object.assign(JSON.parse(JSON.stringify(DEF_P)), (x && x.p) || {}) };
  for (const k in o.w) { if (!BYID[k] || !Array.isArray(o.w[k])) delete o.w[k]; }
  if (o.p.flowV !== 1) { o.p.sessSize = 0; o.p.flowV = 1; }
  return o;
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
function dueList(t) { t = t ?? nowM(); return W.filter(w => isDue(w.id, t)).sort((a, b) => S.w[a.id][1] - S.w[b.id][1]); }
function counts(list) {
  const c = { new: 0, learn: 0, master: 0, known: 0, hard: 0, total: 0 };
  (list || W).forEach(w => { c[status(w.id)]++; c.total++; if (isHard(w.id)) c.hard++; });
  return c;
}
function groupCounts(u, g) { return counts(GROUPS[u + '-' + g]); }
function nextStation(prefU) {
  const order = prefU ? [prefU, ...UNIT_IDS.filter(x => x !== prefU)] : UNIT_IDS;
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
function speak(text, el) {
  if (!TTS.ok) { toast('Bu tarayıcı sesli okumayı desteklemiyor'); return; }
  try {
    speechSynthesis.cancel();
    if (!TTS.voice) pickVoice();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR'; if (TTS.voice) u.voice = TTS.voice; u.rate = S.p.rate || 0.92;
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

/* ---------- soru üretimi ---------- */
function sameish(a, b) { return normT(a.fr) === normT(b.fr) || normT(a.trMain) === normT(b.trMain) || normT(a.def) === normT(b.def); }
function distractors(w, n, extra, keyFn) {
  const out = [], seen = new Set(), keys = new Set(keyFn ? [normT(keyFn(w))] : []);
  const pools = [GROUPS[w.u + '-' + w.g], UNIT_WORDS[w.u], W];
  for (const pool of pools) {
    for (const c of shuffle(pool.slice())) {
      if (c === w || sameish(c, w)) continue;
      if (extra && !extra(c)) continue;
      if (out.some(o => sameish(o, c))) continue;
      if (seen.has(c.id)) continue;
      if (keyFn) { const k = normT(keyFn(c)); if (!k || keys.has(k)) continue; keys.add(k); }
      seen.add(c.id); out.push(c);
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
const QTYPES_TR = { fr2tr: 'Anlamı ne?', tr2fr: 'Fransızcası hangisi?', def2fr: 'Tanıma uyan kelime', cloze: 'Boşluğu doldur', type: 'Fransızcasını yaz' };
function chooseType(w, mode) {
  const st = Math.max(0, stageOf(w.id));
  let types;
  if (mode === 'review') {
    if (st === 0) types = ['fr2tr', 'fr2tr', 'def2fr'];
    else if (st === 1) types = ['tr2fr', 'def2fr', 'fr2tr'];
    else if (st === 2) types = ['cloze', 'def2fr', 'tr2fr'];
    else types = ['type', 'cloze', 'tr2fr', 'def2fr'];
  } else types = ['fr2tr', 'tr2fr', 'def2fr', 'cloze', 'fr2tr'];
  types = types.filter(t => (t !== 'cloze' || clozeable(w)) && (t !== 'type' || typeable(w)));
  return pick(types.length ? types : ['fr2tr']);
}
function makeQ(w, mode) {
  const type = chooseType(w, mode);
  const q = { type, w };
  if (type === 'type') { q.answer = w.fr; return q; }
  let ds, opt;
  if (type === 'fr2tr') { ds = distractors(w, 3, null, c => c.trMain); opt = c => c.trMain; }
  else if (type === 'tr2fr' || type === 'def2fr') { ds = distractors(w, 3, null, c => c.fr); opt = c => c.fr; }
  else { ds = distractors(w, 3, c => c.brackets === 1, bracketText); opt = c => bracketText(c); }
  q.answer = opt(w);
  q.options = shuffle([{ text: opt(w), ok: true }, ...ds.map(c => ({ text: opt(c), ok: false, id: c.id }))]);
  return q;
}
