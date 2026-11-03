// assets/spectrum/main.js — S-03 skaņas spektra analizators: vadības josla (mikrofons, skats, jutība, “i”), grafiks
// (spektrs vai spektrogramma), rādījumu aile (pamattonis, nots, krāsa, rekordi). Spec. docs/plans/2026-11-01-skanas-spektrs.md.
import { createI18n, createTheme, mountHeaderTools, mountTitleCells, setupCanvas, startLoop } from '../sim-core.js';
import { STRINGS } from './i18n.js';
import { settingsFromURL, warningText, SENS } from './params.js';
import {
  createAnalysis, columnsFrom, columnsFromMerged, createStability, createReadout, addRecord, buildLUT, lutIndex, colorBand,
  formatFreq, octaves, dbWindow, freqAt, hexRGB, classifyMicError, browserOf, DB_FLOOR,
} from './model.js';
import { micSupport, createAudioContext, startMic, listMics, LOW_FFT, HIGH_FFT } from './audio.js';
import { plotRect, drawSpectrum, drawSpectrogram, createHistory, smooth } from './scene.js';
import { nearestNote } from '../sound/model.js';
import { createNotices } from '../measure/notices.js';
import { createSettingsCorner } from '../measure/hud.js';
import { openOverlay } from '../measure/overlay.js';
import { formatNumber } from '../measure/format.js';

document.getElementById('bootMsg')?.remove();
const i18n = createI18n(STRINGS);
const theme = createTheme();
const t = (key, vars) => i18n.t(key, vars);
const el = (id) => document.getElementById(id);
const setText = (node, s) => { if (node.textContent !== s) node.textContent = s; };
const setAttr = (node, name, v) => { const s = String(v); if (node.getAttribute(name) !== s) node.setAttribute(name, s); };
const setHidden = (node, h) => { if (node.hidden !== h) node.hidden = h; };
const MINUS = '−';
const signed = (v) => (v < 0 ? `${MINUS}${Math.abs(v)}` : String(v));

mountHeaderTools(el('headTools'), { i18n, theme });
const titleSmall = el('titleSmall');
mountTitleCells(titleSmall, { i18n, sheet: 'S-03', topicKey: 'tb.topicValue' });
i18n.apply();

const url = settingsFromURL(location.search);
const state = {
  settings: url.settings,
  locked: url.locked,
  status: 'idle', // idle | starting | live | error
  paused: false,
  error: null, // { key, detail }
  ctx: null,
  mic: null,
  deviceId: '',
  an: null,
  time: 0,
  frames: 0,
  rec: { lo: null, hi: null },
  shown: null, // pamattonis lielajā rādījumā (≤ 5 reizes sekundē)
  loud: null, // skaļākā virsotne { f, db } (≤ 5 reizes sekundē)
  cursorU: null,
  cursorKey: false,
  hovering: false,
  flash: { lo: 0, hi: 0 },
  drawScale: 1,
};
const stab = createStability();
const readout = createReadout();
const loudRO = createReadout({ every: 0.2, silence: 0.4 });
const history = createHistory();
const rowBuf = new Float32Array(history.rows);
let colsRaw = new Float32Array(0);
let colsDisp = new Float32Array(0);
let thrRaw = new Float32Array(0);
let thrDisp = new Float32Array(0);
let gramAcc = 0;
let lut = null;
let lutTheme = '';
let recMsg = null;
let recMsgT = -Infinity;

const drawing = el('drawing');
const notices = createNotices(el('notices'), { closeLabel: () => t('notice.close') });
url.warnings.forEach((w, i) => notices.show(`url${i}`, () => warningText(w, { t: i18n.t, lang: i18n.lang() })));

function getLUT() {
  const th = theme.current();
  if (th !== lutTheme || !lut) {
    const c = theme.colors();
    lut = buildLUT({ sheet: c.sheet, field: c.field, dark: th === 'dark' });
    lutTheme = th;
  }
  return lut;
}

// Paziņojums ekrāna lasītājam (role=status jau ir DOM); tas pats teksts atkārtoti — caur tukšu brīdi
const liveEl = el('live');
function announce(text) {
  if (liveEl.textContent === text) {
    liveEl.textContent = '';
    setTimeout(() => { liveEl.textContent = text; }, 60);
  } else liveEl.textContent = text;
}

// ── Mikrofons ─────────────────────────────────────────────
function micEnv() {
  const sup = micSupport();
  return { ...sup, browser: browserOf(navigator.userAgent), mac: /Macintosh|Mac OS X/.test(navigator.userAgent) };
}

const errorText = (e) => t(e.key, { msg: e.detail });

function fail(err) {
  if (state.mic) { state.mic.stop(); state.mic = null; }
  state.status = 'error';
  state.error = err;
  state.paused = false;
  render();
  // fokuss nepazūd: ja tas bija uz atspējotas/paslēptas pogas vai nekur — uz ● SĀKT VĒLREIZ (vai joslas pogu)
  const a = document.activeElement;
  if (!document.querySelector('.overlay') && (!a || a === document.body || a.disabled || a.closest('[hidden]'))) {
    const btn = el('msgBtn');
    (btn.hidden ? el('runBtn') : btn).focus({ preventScroll: true });
  }
}

function attach(mic) {
  if (state.mic && state.mic !== mic) state.mic.stop();
  state.mic = mic;
  state.deviceId = mic.deviceId;
  state.an = createAnalysis(mic.sampleRate);
  stab.reset();
  readout.reset();
  loudRO.reset();
  history.clear();
  colsDisp.fill(DB_FLOOR);
  state.shown = null;
  state.loud = null;
  state.frames = 0;
  state.status = 'live';
  state.paused = false;
  state.error = null;
  mic.track?.addEventListener('ended', () => { if (state.mic === mic) { state.deviceId = ''; fail({ key: 'err.ended', detail: '' }); } });
  silentFor = 0;
  const a = document.activeElement;
  if (a === el('msgBtn') || a === document.body || !a) el('runBtn').focus({ preventScroll: true });
  announce(t('live.started'));
  render();
}

// AudioContext rodas tieši klikšķī (Safari prasa lietotāja darbību); atļauju jautā pārlūks.
// switching — mikrofona maiņa “i” piezīmē: ja neizdodas, vecais mikrofons turpina strādāt, kļūdu atdod izsaucējam.
async function start(deviceId, { switching = false } = {}) {
  const env = micEnv();
  if (!env.secure || !env.hasMedia || !env.hasAudio) { const err = classifyMicError(null, env); fail(err); return err; }
  const wasLive = state.status === 'live';
  if (!wasLive) { state.status = 'starting'; state.error = null; render(); }
  try {
    if (!state.ctx) state.ctx = createAudioContext();
    if (state.ctx.state === 'suspended') state.ctx.resume().catch(() => {});
    const mic = await startMic(state.ctx, { deviceId: deviceId || state.deviceId || undefined });
    attach(mic);
    return null;
  } catch (e) {
    const err = classifyMicError(e, env);
    if (switching && state.mic) return err;
    fail(err);
    return err;
  }
}

function onRun() {
  if (state.status === 'live') {
    state.paused = !state.paused;
    if (!state.paused) stab.reset();
    announce(t(state.paused ? 'live.paused' : 'live.resumed'));
    render();
  } else if (state.status !== 'starting') start();
}

function resetRecords() {
  state.rec = { lo: null, hi: null };
  recMsg = null;
  announce(t('rec.cleared'));
  render();
}

// ── Vadības josla ─────────────────────────────────────────
el('runBtn').addEventListener('click', onRun);
el('msgBtn').addEventListener('click', () => start());
el('viewSpec').addEventListener('click', () => setView('spectrum'));
el('viewGram').addEventListener('click', () => setView('spectrogram'));
function setView(v) {
  if (state.locked.has('view') || state.settings.view === v) return;
  state.settings = { ...state.settings, view: v };
  render();
}
const sensRange = el('sensRange');
sensRange.min = String(SENS.min);
sensRange.max = String(SENS.max);
function setSens(v) {
  if (state.locked.has('sens')) return;
  const s = Math.max(SENS.min, Math.min(SENS.max, Math.round(v)));
  if (s === state.settings.sens) return;
  state.settings = { ...state.settings, sens: s };
  render();
}
sensRange.addEventListener('input', () => setSens(Number(sensRange.value)));
el('sensMinus').addEventListener('click', () => setSens(state.settings.sens - 1));
el('sensPlus').addEventListener('click', () => setSens(state.settings.sens + 1));
el('resetBtn').addEventListener('click', resetRecords);
el('infoBtn').addEventListener('click', openInfo);
// Pēc klikšķa ar peli poga atdod fokusu, lai atstarpe paliek apturēšanai (kā M-01); ar tastatūru fokuss paliek
el('bar').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && e.detail > 0 && b.id !== 'infoBtn') b.blur(); });

document.addEventListener('keydown', (ev) => {
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
  if (document.querySelector('.overlay')) return;
  const tag = ev.target?.tagName;
  const onCursor = ev.target === cursorEl; // kursorā atstarpe aptur (lai aplūko vienu mirkli), bultiņas kustina kursoru
  if (onCursor ? ev.key !== ' ' : tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'A') return;
  if (ev.key === ' ') { ev.preventDefault(); if (!ev.repeat) onRun(); }
  else if (ev.key === 'r' || ev.key === 'R') resetRecords();
});

// ── Kursors: pele/pirksts pa grafiku vai bultiņas (native range, fokusā rāmis ap grafiku) ──
const canvas = el('scene');
const cursorEl = el('cursor');
let lastLay = null;
function uFromEvent(ev) {
  if (!lastLay || (ev.target !== canvas && ev.target !== cursorEl)) return null;
  const r = canvas.getBoundingClientRect();
  const px = ev.clientX - r.left;
  const py = ev.clientY - r.top;
  const L = lastLay;
  if (px < L.x || px > L.x + L.w || py < L.y || py > L.y + L.h) return null;
  return state.settings.view === 'spectrum' ? (px - L.x) / L.w : (L.y + L.h - py) / L.h;
}
function pointer(ev) {
  const u = uFromEvent(ev);
  state.hovering = u !== null;
  if (u !== null) {
    state.cursorU = u;
    cursorEl.value = String(Math.round(u * 1000));
  } else if (!state.cursorKey) state.cursorU = null;
  render();
}
drawing.addEventListener('pointermove', pointer);
drawing.addEventListener('pointerdown', pointer);
drawing.addEventListener('pointerleave', () => { state.hovering = false; if (!state.cursorKey) state.cursorU = null; render(); });
// Kursora vērtības teksts ekrāna lasītājam — tikai, kad kursors kustas (dB katrā kadrā mainās; citādi tas runātu bez apstājas)
function cursorText() {
  const u = Number(cursorEl.value) / 1000;
  const f = freqAt(u);
  let s = `${hz(f)}, ${noteText(f)}`;
  if (state.status === 'live' && state.frames > 0 && state.settings.view === 'spectrum' && colsDisp.length) {
    s += `, ${signed(Math.round(colsDisp[Math.min(colsDisp.length - 1, Math.floor(u * colsDisp.length))]))} dB`;
  }
  setAttr(cursorEl, 'aria-valuetext', s);
}
cursorEl.addEventListener('input', () => { state.cursorU = Number(cursorEl.value) / 1000; cursorText(); render(); });
cursorEl.addEventListener('focus', () => { state.cursorKey = true; state.cursorU = Number(cursorEl.value) / 1000; cursorText(); render(); });
cursorEl.addEventListener('blur', () => { state.cursorKey = false; if (!state.hovering) state.cursorU = null; render(); });

// ── ⚙ un kanva ────────────────────────────────────────────
const gear = createSettingsCorner(el('gear'), {
  i18n,
  theme,
  drawing: document.getElementById('drawing'), // tālummaiņa ar diviem pirkstiem virs zīmējuma — ZĪMĒJUMS
  labels: () => ({
    open: t('gear.open'), theme: t('gear.theme'), light: t('gear.light'), dark: t('gear.dark'), lang: t('gear.lang'),
    text: t('gear.text'), textDown: t('gear.textDown'), textUp: t('gear.textUp'),
    draw: t('gear.draw'), drawDown: t('gear.drawDown'), drawUp: t('gear.drawUp'),
    screen: t('gear.screen'), fullscreen: t('gear.fullscreen'),
  }),
  onDrawScale(v) { state.drawScale = v; render(); },
  onTextScale() { render(); },
});
state.drawScale = gear.drawScale();
let view = null;
view = setupCanvas(canvas, () => render());

// ── Apstrāde katrā kadrā ──────────────────────────────────
// Mikrofons dod tikai digitālu klusumu (izslēgts, skaļums 0) — pēc 2 s paziņojums, citādi rādītu tikai “klusums”
let silentFor = 0;
let silentNotice = false;
function checkSilent(buf, dt) {
  let top = -Infinity;
  for (let i = 0; i < buf.length; i++) if (buf[i] > top) top = buf[i];
  silentFor = top > DB_FLOOR + 1 ? 0 : silentFor + dt;
  const silent = silentFor > 2;
  if (silent !== silentNotice) { silentNotice = silent; if (silent) notices.show('silent', () => t('msg.silentInput')); else notices.clear('silent'); }
}

function process(dt) {
  const mic = state.mic;
  mic.read();
  checkSilent(mic.highBuf, dt);
  state.time += dt;
  state.frames++;
  const res = state.an.update(mic.lowBuf, mic.highBuf, dt);
  const n = colsRaw.length;
  if (n) {
    columnsFrom(mic.lowBuf, mic.highBuf, mic.sampleRate, colsRaw);
    const fall = 120 * dt; // līkne krīt ne ātrāk par 120 dB/s — nemirgo, bet arī neizplūst
    for (let i = 0; i < n; i++) colsDisp[i] = colsRaw[i] >= colsDisp[i] ? colsRaw[i] : Math.max(colsRaw[i], colsDisp[i] - fall);
    columnsFromMerged(state.an.map, state.an.thr, thrRaw);
    smooth(thrRaw, thrDisp, Math.max(1, Math.round(n / 120)));
  }
  gramAcc += dt * (history.cols / 10);
  if (gramAcc >= 1) {
    columnsFrom(mic.lowBuf, mic.highBuf, mic.sampleRate, rowBuf);
    while (gramAcc >= 1) { history.push(rowBuf); gramAcc -= 1; }
  }
  const stable = stab.push(state.time, res.pitch ? res.pitch.f0 : null);
  state.shown = readout.update(state.time, stable);
  const loud = res.pitch ? res.pitch.loud : null;
  state.loud = loudRO.update(state.time, loud ? { f: loud.f, db: loud.db } : null);
  if (stable !== null) {
    const r = addRecord(state.rec, stable);
    if (r.changed) {
      state.rec = r.rec;
      const now = performance.now();
      const f = formatFreq(stable, i18n.lang());
      if (r.changed === 'first') { state.flash.lo = now; state.flash.hi = now; recMsg = t('rec.first', { f }); }
      else if (r.changed === 'lo') { state.flash.lo = now; recMsg = t('rec.newLo', { f }); }
      else { state.flash.hi = now; recMsg = t('rec.newHi', { f }); }
    }
  }
  if (recMsg && state.time - recMsgT >= 1.2) { announce(recMsg); recMsg = null; recMsgT = state.time; } // ne biežāk kā reizi 1,2 s
}

// Safari pēc miega vai pārtraukuma aptur AudioContext — analizatori tad dod sastingušus datus: neapstrādā, saka kāpēc, atsāk ar klikšķi
let ctxNotice = false;
const wake = () => { if (state.ctx && state.ctx.state !== 'running' && state.status === 'live') state.ctx.resume().catch(() => {}); };
document.addEventListener('pointerdown', wake, true);
document.addEventListener('keydown', wake, true);
startLoop((dt) => {
  const live = state.status === 'live' && state.mic;
  const ctxDown = Boolean(live && state.ctx && state.ctx.state !== 'running');
  if (ctxDown !== ctxNotice) { ctxNotice = ctxDown; if (ctxDown) notices.show('ctx', () => t('msg.ctxSuspended')); else notices.clear('ctx'); }
  if (live && !state.paused && !ctxDown) process(dt);
  if (!live && silentNotice) { silentNotice = false; notices.clear('silent'); }
  render();
});

// ── Zīmēšana un DOM ───────────────────────────────────────
function noteParts(f) {
  const n = nearestNote(f);
  const oct = Math.max(0, Math.min(10, n.octave));
  return { index: n.index, oct, cents: n.cents };
}
const centsText = (c) => (Math.abs(c) > 20 ? `${c > 0 ? '+' : MINUS}${Math.abs(c)} c` : '');
const noteText = (f) => { const p = noteParts(f); return t('read.note', { note: t(`note.${p.index}`), oct: t(`oct.${p.oct}`) }); };
const hz = (f) => `${formatFreq(f, i18n.lang())} Hz`;

function cursorInfo(hasData) {
  if (state.cursorU === null) return null;
  const u = Math.max(0, Math.min(1, state.cursorU));
  const f = freqAt(u);
  let db = null;
  if (hasData && state.settings.view === 'spectrum' && colsDisp.length) db = Math.round(colsDisp[Math.min(colsDisp.length - 1, Math.floor(u * colsDisp.length))]);
  const parts = [hz(f), noteText(f)];
  if (db !== null) parts.push(`${signed(db)} dB`);
  return { u, label: parts.join(' · ') };
}

function draw() {
  const { w, h } = view.size();
  const lay = plotRect(w, h, state.drawScale);
  lastLay = lay;
  const cw = Math.max(1, Math.round(lay.w));
  if (colsRaw.length !== cw) {
    colsRaw = new Float32Array(cw);
    colsDisp = new Float32Array(cw).fill(DB_FLOOR);
    thrRaw = new Float32Array(cw);
    thrDisp = new Float32Array(cw).fill(DB_FLOOR);
  }
  const box = `left:${lay.x}px;top:${lay.y}px;width:${lay.w}px;height:${lay.h}px`;
  if (cursorEl.dataset.box !== box) { cursorEl.dataset.box = box; cursorEl.style.cssText = box; }
  const c = theme.colors();
  const L = getLUT();
  const win = dbWindow(state.settings.sens);
  const hasData = state.status === 'live' && state.frames > 0;
  const labels = { threshold: t('plot.threshold'), lo: t('plot.lo'), hi: t('plot.hi'), paused: t('plot.paused') };
  const common = { hasData, colors: c, recLo: state.rec.lo, recHi: state.rec.hi, cursor: cursorInfo(hasData), paused: state.paused && hasData, labels };
  if (state.settings.view === 'spectrum') {
    drawSpectrum(view.ctx, lay, {
      ...common,
      cols: colsDisp,
      thr: thrDisp,
      win,
      lut: L,
      loud: state.loud && state.shown ? { ...state.loud, label: hz(state.loud.f) } : null, // tikai līdz ar toni, troksnī nelēkā
      f0: state.shown ? { f: state.shown, label: hz(state.shown) } : null,
    });
  } else {
    drawSpectrogram(view.ctx, lay, { ...common, image: hasData ? history.image(L.rgb, win, hexRGB(c.field)) : null });
  }
}

function swatch(node, f, L) {
  const show = f !== null;
  const bg = show ? L.css[lutIndex(f, L.css.length)] : '';
  if (node.style.backgroundColor !== bg && show) node.style.backgroundColor = bg;
  node.classList.toggle('off', !show);
}

function renderDom() {
  const s = state.settings;
  const lang = i18n.lang();
  const live = state.status === 'live';
  const L = getLUT();
  // josla
  setText(el('micLabel'), t('bar.mic'));
  const run = el('runBtn');
  const runKey = live ? (state.paused ? 'run.resume' : 'run.pause') : state.status === 'starting' ? 'run.starting' : 'run.start';
  setText(run, t(runKey));
  setAttr(run, 'aria-label', t(live ? (state.paused ? 'run.resumeAria' : 'run.pauseAria') : 'run.startAria'));
  run.disabled = state.status === 'starting';
  run.classList.toggle('live', live && !state.paused);
  setText(el('viewLabel'), t('bar.view'));
  setText(el('viewSpec'), t('view.spectrum'));
  setText(el('viewGram'), t('view.spectrogram'));
  setAttr(el('viewSpec'), 'aria-pressed', s.view === 'spectrum');
  setAttr(el('viewGram'), 'aria-pressed', s.view === 'spectrogram');
  const vLock = state.locked.has('view');
  el('viewSpec').disabled = vLock && s.view !== 'spectrum';
  el('viewGram').disabled = vLock && s.view !== 'spectrogram';
  setHidden(el('viewFix'), !vLock);
  setText(el('viewFix'), t('bar.fixed'));
  setText(el('sensLabel'), t('bar.sens'));
  const sLock = state.locked.has('sens');
  setHidden(el('sensFix'), !sLock);
  setText(el('sensFix'), t('bar.fixed'));
  setText(el('sensVal'), String(s.sens));
  if (Number(sensRange.value) !== s.sens) sensRange.value = String(s.sens);
  sensRange.disabled = sLock;
  setAttr(sensRange, 'aria-label', t('bar.sensName'));
  setAttr(sensRange, 'aria-valuetext', String(s.sens));
  el('sensMinus').disabled = sLock || s.sens <= SENS.min;
  el('sensPlus').disabled = sLock || s.sens >= SENS.max;
  setAttr(el('sensMinus'), 'aria-label', t('dims.decrease', { name: t('bar.sensName') }));
  setAttr(el('sensPlus'), 'aria-label', t('dims.increase', { name: t('bar.sensName') }));
  setAttr(el('infoBtn'), 'aria-label', t('info.btnAria'));

  // ziņa grafika vietā (pirms SĀKT, gaidot atļauju, kļūda)
  setHidden(el('msgBox'), live);
  if (!live) {
    let text = t('msg.intro');
    let detail = '';
    let btn = t('msg.startBtn');
    let showBtn = true;
    if (state.status === 'starting') { text = t('msg.starting'); showBtn = false; }
    else if (state.status === 'error' && state.error) {
      const e = state.error;
      text = errorText(e);
      if (e.detail && e.key !== 'err.other') detail = t('msg.detail', { detail: e.detail });
      btn = t('msg.retryBtn');
      showBtn = e.key !== 'err.insecure' && e.key !== 'err.unsupported';
    }
    setText(el('msgText'), text);
    setText(el('msgDetail'), detail);
    setHidden(el('msgDetail'), !detail);
    setText(el('msgBtn'), btn);
    setHidden(el('msgBtn'), !showBtn);
  }

  // lielais rādījums
  setText(el('readTitleText'), t('read.title'));
  const f = live ? state.shown : null;
  setText(el('bigNum'), f ? formatFreq(f, lang) : '—');
  setHidden(el('bigUnit'), !f);
  setText(el('bigNote'), f ? noteText(f) : t(live ? 'read.silence' : 'read.off'));
  setText(el('bigCents'), f ? centsText(noteParts(f).cents) : '');
  swatch(el('bigSwatch'), f || null, L);
  const band = f ? colorBand(f) : null;
  setText(el('bigColor'), band ? t(`color.${band}`) : '');
  setText(el('foot'), t('read.foot'));

  // rekordi
  const now = performance.now();
  for (const [key, val] of [['Lo', state.rec.lo], ['Hi', state.rec.hi]]) {
    setText(el(`rec${key}K`), t(`rec.${key.toLowerCase()}`));
    setText(el(`rec${key}V`), val ? hz(val) : '—');
    setText(el(`rec${key}N`), val ? noteText(val) : '');
    swatch(el(`rec${key}Sw`), val || null, L);
    el(`rec${key}Row`).classList.toggle('new', now - state.flash[key.toLowerCase()] < 1200);
  }
  const { lo, hi } = state.rec;
  setText(el('recSpan'), lo && hi && hi / lo > 1.0001 ? t('rec.span', { n: formatNumber(octaves(lo, hi), 1, lang) }) : '');
  setText(el('resetBtn'), t('rec.reset'));
  setAttr(el('resetBtn'), 'aria-label', t('rec.resetAria'));

  // kanva un kursors
  setAttr(canvas, 'aria-label', t(s.view === 'spectrum' ? 'scene.aria' : 'scene.ariaGram'));
  setAttr(cursorEl, 'aria-label', t('cursor.aria'));

  // mazais rakstlaukums tikai lielā ekrānā (aile atstāj tam vietu apakšā)
  const side = el('side');
  const big = window.innerWidth >= 1000 && window.innerHeight >= 600 && side.scrollHeight <= side.clientHeight + 1;
  if (titleSmall.hidden === big) titleSmall.hidden = !big;
  document.body.classList.toggle('s03-has-title', big);
}

function render() {
  if (!view) return;
  renderDom();
  draw();
}

// ── “i” piezīme ───────────────────────────────────────────
function procRows(container) {
  container.replaceChildren();
  if (!state.mic) {
    const p = document.createElement('p');
    p.textContent = state.status === 'error' && state.error ? errorText(state.error) : t('info.notStarted');
    container.append(p);
    return;
  }
  const st = state.mic.settings || {};
  const dl = document.createElement('dl');
  dl.className = 's03-proc';
  for (const [k, v] of [['info.procEcho', st.echoCancellation], ['info.procNoise', st.noiseSuppression], ['info.procGain', st.autoGainControl]]) {
    const dt = document.createElement('dt');
    dt.textContent = t(k);
    const dd = document.createElement('dd');
    dd.textContent = v === false ? t('info.off') : v === true ? t('info.on') : t('info.unknown');
    dl.append(dt, dd);
  }
  container.append(dl);
}

function techText() {
  const lang = i18n.lang();
  const sr = state.mic ? state.mic.sampleRate : state.ctx ? state.ctx.sampleRate : 48000;
  const n2 = (v) => formatNumber(v, 2, lang);
  return t('info.tech', {
    sr: formatFreq(sr, lang),
    nLow: formatFreq(LOW_FFT, lang), dfLow: n2(sr / LOW_FFT), tLow: n2(LOW_FFT / sr),
    nHigh: formatFreq(HIGH_FFT, lang), dfHigh: n2(sr / HIGH_FFT), tHigh: n2(HIGH_FFT / sr),
  });
}

function openInfo() {
  const ov = openOverlay({ title: t('info.title'), closeLabel: t('info.close') });
  ov.root.classList.add('s03-overlay');
  const body = ov.body;
  body.classList.add('s03-info-body');
  const section = (title, text) => {
    const sec = document.createElement('section');
    const h = document.createElement('h3');
    h.textContent = title;
    sec.append(h);
    if (text) { const p = document.createElement('p'); p.textContent = text; sec.append(p); }
    body.append(sec);
    return sec;
  };
  section(t('info.colorH'), t('info.color'));
  section(t('info.pitchH'), t('info.pitch'));
  section(t('info.dbH'), t('info.db'));
  section(t('info.micH'), t('info.mic'));
  const proc = section(t('info.procH'));
  const rows = document.createElement('div');
  proc.append(rows);
  procRows(rows);
  const micBox = document.createElement('div');
  micBox.className = 's03-micpick';
  proc.append(micBox);
  if (state.mic) {
    listMics().then((mics) => {
      if (mics.length < 2) {
        if (state.mic?.label) { const p = document.createElement('p'); p.textContent = `${t('info.micLabel')}: ${state.mic.label}`; micBox.append(p); }
        return;
      }
      const label = document.createElement('label');
      label.htmlFor = 's03Mic';
      label.textContent = t('info.micLabel');
      const sel = document.createElement('select');
      sel.id = 's03Mic';
      sel.className = 'select';
      mics.forEach((m, i) => {
        const o = document.createElement('option');
        o.value = m.deviceId;
        o.textContent = m.label || t('info.micUnnamed', { n: i + 1 });
        sel.append(o);
      });
      // Chrome noklusētajam mikrofonam dod deviceId “default” — tad atpazīst pēc nosaukuma vai grupas
      const cur = mics.find((m) => m.deviceId === state.deviceId)
        || mics.find((m) => m.label && m.label === state.mic.label)
        || mics.find((m) => m.groupId && m.groupId === state.mic.settings.groupId);
      if (cur) sel.value = cur.deviceId;
      else {
        const o = document.createElement('option');
        o.value = '';
        o.textContent = state.mic.label || t('info.micLabel');
        sel.prepend(o);
        sel.value = '';
      }
      let prev = sel.value;
      sel.addEventListener('change', async () => {
        if (!sel.value) return;
        ov.status(t('info.micSwitching'));
        const err = await start(sel.value, { switching: true });
        if (err) sel.value = prev;
        else prev = sel.value;
        ov.status(err ? errorText(err) : '');
        procRows(rows);
      });
      micBox.append(label, sel);
    });
  }
  section(t('info.techH'), techText());
  const p = document.createElement('p');
  p.className = 's03-privacy';
  p.textContent = t('info.privacy');
  body.append(p);
}

theme.onChange(() => { lut = null; render(); });
i18n.onChange(() => { notices.refresh(); cursorText(); render(); });
document.fonts.ready.then(render);
window.addEventListener('resize', render);

window.__s03 = { get state() { return state; }, start, resetRecords };
render();
cursorText();
