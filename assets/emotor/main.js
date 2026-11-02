// assets/emotor/main.js — E-01 ģenerators un motors (spec. docs/plans/2026-11-02-generators-motors.md).
// Josla zem galvenes (kā M-01/S-03), zīmējums izometrijā, ģeneratorā zem tā grafiks ℰ(t).
import { createI18n, createTheme, mountHeaderTools, mountTitleCells, setupCanvas, startLoop } from '../sim-core.js';
import { STRINGS } from './i18n.js';
import {
  RANGES, K, R, R_LOAD, TAU, createRotor, step, loopCurrent, externalVoltage, flux, poseOf,
  createTrace, resetTrace, pushTrace, traceWindow, bulbStep,
} from './model.js';
import { settingsFromURL, warningText } from './params.js';
import { drawScene, sceneLayout, drawGraph, graphLayout } from './scene.js';
import { createNotices } from '../measure/notices.js';
import { createSettingsCorner } from '../measure/hud.js';
import { legendScale } from '../measure/ui-scale.js';
import { formatNumber, roundTo } from '../measure/format.js';
import { openOverlay } from '../measure/overlay.js';

document.getElementById('bootMsg')?.remove();
const i18n = createI18n(STRINGS);
const theme = createTheme();
const t = (key, vars) => i18n.t(key, vars);
const el = (id) => document.getElementById(id);
const setText = (node, s) => { if (node.textContent !== s) node.textContent = s; };
const setAttr = (node, name, v) => { const s = String(v); if (node.getAttribute(name) !== s) node.setAttribute(name, s); };
const setHidden = (node, h) => { if (node.hidden !== h) node.hidden = h; };
const fmt = (v, d) => formatNumber(v, d, i18n.lang());

mountHeaderTools(el('headTools'), { i18n, theme });
const titleSmall = el('titleSmall');
mountTitleCells(titleSmall, { i18n, sheet: 'E-01', topicKey: 'tb.topicValue' });
i18n.apply();

const url = settingsFromURL(location.search);
const state = {
  s: {
    mode: 'motor',
    U: 3,
    f: 1,
    polarity: 1,
    dir: 1,
    commutator: false,
    free: false,
    show: { current: true, field: true, force: true, flux: false },
  },
  rotor: createRotor(0),
  trace: createTrace(),
  bulb: 0,
  fSmooth: 0,
  paused: false,
  drawScale: 1,
  wasStuck: false,
  descAt: -Infinity,
};

const noticesEl = el('notices');
const notices = createNotices(noticesEl, { closeLabel: () => t('notice.close') });
url.warnings.forEach((w, i) => notices.show(`url${i}`, () => warningText(w, { t: i18n.t, lang: i18n.lang() })));

const liveEl = el('live');
let liveKey = null;
function say(key) {
  state.descAt = -Infinity; // apraksts ekrāna lasītājam atjaunojas uzreiz pēc jebkuras darbības
  liveKey = key;
  liveEl.textContent = '';
  // jauns teksts nākamajā kadrā, lai ekrāna lasītājs to nolasa arī tad, ja tas sakrīt ar iepriekšējo
  requestAnimationFrame(() => { if (liveKey === key) liveEl.textContent = t(key); });
}

// ── režīmi un darbības ────────────────────────────────────
const gen = () => state.s.mode === 'generator';

function startGenerator() {
  const r = state.rotor;
  r.phi = -Math.PI / 2; // stāvoklis B: Φ max, ℰ = 0 — grafiks sākas no nulles kā mācību grāmatā
  r.omega = state.s.dir * TAU * state.s.f;
  resetTrace(state.trace, r.t);
  state.bulb = 0;
}
function startMotor() {
  const r = state.rotor;
  r.phi = 0; // stāvoklis A: plakne gar lauku
  r.omega = 0;
  r.stuck = false;
  state.s.free = false;
  state.wasStuck = false;
  state.fSmooth = 0;
}
function setMode(mode) {
  if (state.s.mode === mode) return;
  state.s.mode = mode;
  if (mode === 'generator') startGenerator();
  else {
    startMotor(); // motors sākas kā ↺: A, nofiksēts, kolektors izslēgts (kolektors bez kustības neko nerāda)
    state.s.commutator = false;
  }
  syncRange();
  say(mode === 'generator' ? 'live.generator' : 'live.motor');
  render();
}
function reset() {
  if (gen()) startGenerator();
  else {
    startMotor();
    state.s.commutator = false;
  }
  say('live.reset');
  render();
}
function togglePause() {
  state.paused = !state.paused;
  say(state.paused ? 'live.paused' : 'live.resumed');
  render();
}

// ── josla ─────────────────────────────────────────────────
const valRange = el('valRange');
const valMinus = el('valMinus');
const valPlus = el('valPlus');
const key = () => (gen() ? 'f' : 'U');
function syncRange() {
  const k = key();
  const r = RANGES[k];
  setAttr(valRange, 'min', r.min);
  setAttr(valRange, 'max', r.max);
  setAttr(valRange, 'step', r.step);
  valRange.value = String(state.s[k]);
}
function setValue(v) {
  const k = key();
  const r = RANGES[k];
  const next = roundTo(Math.min(r.max, Math.max(r.min, v)), r.step);
  if (next === state.s[k]) return;
  state.s[k] = next;
  render();
}
valRange.addEventListener('input', () => setValue(Number(valRange.value)));
valMinus.addEventListener('click', () => setValue(state.s[key()] - RANGES[key()].step));
valPlus.addEventListener('click', () => setValue(state.s[key()] + RANGES[key()].step));
syncRange();

el('modeMotor').addEventListener('click', () => setMode('motor'));
el('modeGen').addEventListener('click', () => setMode('generator'));
el('flipBtn').addEventListener('click', () => {
  if (gen()) { state.s.dir *= -1; say('live.dir'); } else { state.s.polarity *= -1; say('live.polarity'); }
  render();
});
el('commBtn').addEventListener('click', () => {
  state.s.commutator = !state.s.commutator;
  if (state.s.commutator && !gen()) state.s.free = true; // kolektors bez kustības neko nerāda (spec. § 5)
  say(state.s.commutator ? 'live.commOn' : 'live.commOff');
  render();
});
el('freeBtn').addEventListener('click', () => {
  state.s.free = !state.s.free;
  if (!state.s.free) state.rotor.omega = 0; // nofiksējas, kur ir
  state.wasStuck = false;
  say(state.s.free ? 'live.free' : 'live.locked');
  render();
});
for (const [id, k] of [['showI', 'current'], ['showB', 'field'], ['showF', 'force'], ['showPhi', 'flux']]) {
  el(id).addEventListener('click', () => { state.s.show[k] = !state.s.show[k]; render(); });
}
el('pauseBtn').addEventListener('click', togglePause);
el('resetBtn').addEventListener('click', reset);
el('infoBtn').addEventListener('click', openInfo);
// Pēc peles klikšķa poga atdod fokusu, lai atstarpe paliek laika apturēšanai (kā M-01).
// Ar tastatūru nospiestai pogai (detail = 0) fokuss paliek — tastatūras lietotājs nepazaudē vietu.
el('bar').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && e.detail > 0) b.blur(); });

document.addEventListener('keydown', (ev) => {
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
  const tag = ev.target?.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'A') return;
  if (document.querySelector('.overlay')) return;
  if (ev.key === ' ') { ev.preventDefault(); if (!ev.repeat) togglePause(); }
  else if (ev.key === 'r' || ev.key === 'R') reset();
});

// ── ⚙ ────────────────────────────────────────────────────
const gear = createSettingsCorner(el('gear'), {
  i18n,
  theme,
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

// ── “i” piezīme ───────────────────────────────────────────
function openInfo() {
  const ov = openOverlay({ title: t('info.title'), closeLabel: t('info.close') });
  ov.root.classList.add('e01-overlay');
  ov.body.classList.add('e01-info-body');
  for (const k of ['force', 'comm', 'emf', 'lenz', 'numbers']) {
    const sec = document.createElement('section');
    const h = document.createElement('h3');
    h.textContent = t(`info.${k}H`);
    const p = document.createElement('p');
    p.textContent = t(`info.${k}`);
    sec.append(h, p);
    ov.body.append(sec);
  }
}

// ── kanvas un cilpa ───────────────────────────────────────
const drawing = el('drawing');
const graphBox = el('graphBox');
const sceneCanvas = el('scene');
const graphCanvas = el('graph');
let view = null;
let gview = null;
view = setupCanvas(sceneCanvas, () => render());
gview = setupCanvas(graphCanvas, () => render());

const physics = () => ({ ...state.s });
const Iref = () => (gen() ? (K * TAU * RANGES.f.max) / R_LOAD : RANGES.U.max / R);

startLoop((dt) => {
  if (!state.paused && dt > 0) {
    const s = physics();
    step(state.rotor, dt, s);
    const r = state.rotor;
    if (gen()) {
      const u = externalVoltage(r, s);
      pushTrace(state.trace, r.t, u, flux(r.phi) / K);
      const pMax = (K * TAU * RANGES.f.max) ** 2 / R_LOAD;
      state.bulb = bulbStep(state.bulb, (u * u) / R_LOAD, pMax, dt);
    } else {
      const fNow = Math.abs(r.omega) / TAU;
      state.fSmooth += (fNow - state.fSmooth) * (1 - Math.exp(-dt / 0.4));
      // rāmītis apstājās bez kolektora — paziņojums vienreiz
      if (s.free && !s.commutator && r.stuck && !state.wasStuck && poseOf(r.phi) !== 'along') say('live.stopped');
      state.wasStuck = r.stuck;
    }
  }
  render();
});

function describe(now) {
  const s = state.s;
  const r = state.rotor;
  const contacts = t(s.commutator ? 'scene.viaComm' : 'scene.viaRings');
  const dir = t(r.omega < 0 ? 'dir.cw' : 'dir.ccw'); // ω < 0 — pulksteņrādītāja virzienā, skatoties no kontaktu puses
  if (gen()) {
    return t('scene.generator', { f: fmt(s.f, 1), dir: t(s.dir < 0 ? 'dir.cw' : 'dir.ccw'), contacts, kind: t(s.commutator ? 'kind.dc' : 'kind.ac') });
  }
  const pose = t(`pose.${poseOf(r.phi)}`);
  let st;
  if (!s.free) st = t('scene.locked', { pose });
  else if (Math.abs(r.omega) < 0.05) st = t('scene.still', { pose });
  else if (s.commutator && state.fSmooth > 0.2) st = t('scene.turning', { f: fmt(state.fSmooth, 1), dir });
  else st = t('scene.swinging', { pose });
  void now;
  return t('scene.motor', { contacts, state: st, plus: t(s.polarity > 0 ? 'side.right' : 'side.left') });
}

function render() {
  if (!view || !gview) return;
  const s = state.s;
  const g = gen();
  const lang = i18n.lang();

  // josla
  setText(el('modeLabel'), t('bar.mode'));
  setText(el('modeMotor'), t('mode.motor'));
  setText(el('modeGen'), t('mode.generator'));
  setAttr(el('modeMotor'), 'aria-pressed', !g);
  setAttr(el('modeGen'), 'aria-pressed', g);
  const k = key();
  const name = t(g ? 'bar.fname' : 'bar.Uname');
  setText(el('valLabel'), t(g ? 'bar.f' : 'bar.U'));
  const valStr = g ? `${fmt(s.f, 1)} Hz` : `${fmt(s.U, 1)} V`;
  setText(el('valText'), valStr);
  const turning = !g && s.free && s.commutator && state.fSmooth > 0.05; // šūpojoties bez kolektora f nerāda
  setText(el('freqText'), turning ? `${fmt(state.fSmooth, 1)} Hz` : '');
  if (Math.abs(Number(valRange.value) - s[k]) > RANGES[k].step / 2) valRange.value = String(s[k]);
  setAttr(valRange, 'aria-label', name);
  setAttr(valRange, 'aria-valuetext', valStr);
  setAttr(valMinus, 'aria-label', t('dims.decrease', { name }));
  setAttr(valPlus, 'aria-label', t('dims.increase', { name }));
  valMinus.disabled = s[k] <= RANGES[k].min;
  valPlus.disabled = s[k] >= RANGES[k].max;
  // galā poga kļūst neaktīva — fokuss pāriet uz slīdni, nevis paliek uz neaktīvas pogas
  if ((valMinus.disabled && document.activeElement === valMinus) || (valPlus.disabled && document.activeElement === valPlus)) valRange.focus();
  setText(el('flipW'), t(g ? 'bar.dir' : 'bar.polarity'));
  setText(el('flipS'), t(g ? 'bar.dirShort' : 'bar.polarityShort'));
  setText(el('circuitLabel'), t('bar.circuit'));
  setText(el('commBtn'), t('bar.commutator'));
  setAttr(el('commBtn'), 'aria-pressed', s.commutator);
  setText(el('freeBtn'), t('bar.free'));
  setAttr(el('freeBtn'), 'aria-pressed', s.free);
  setHidden(el('freeBtn'), g);
  setText(el('showLabel'), t('bar.show'));
  // šaurā ekrānā vārds paslēpts tikai vizuāli (redzams ✓ I, ✓ B …) — pieejamais nosaukums paliek pilns (WCAG 2.5.3)
  for (const [id, kk] of [['showI', 'current'], ['showB', 'field'], ['showF', 'force'], ['showPhi', 'flux']]) {
    setText(el(`${id}W`), t(`show.${kk}`));
    setAttr(el(id), 'aria-pressed', s.show[kk]);
  }
  setHidden(el('showPhi'), !g);
  setText(el('timeLabel'), t('bar.time'));
  setText(el('pauseBtn'), state.paused ? '▶︎' : '⏸︎');
  setAttr(el('pauseBtn'), 'aria-label', t(state.paused ? 'run.play' : 'run.pause'));
  setText(el('resetBtn'), t('run.reset'));
  setAttr(el('resetBtn'), 'aria-label', t(g ? 'run.resetGenAria' : 'run.resetMotorAria'));
  setAttr(el('infoBtn'), 'aria-label', t('info.btnAria'));
  setHidden(graphBox, !g);

  // zīmējums
  const { w, h } = view.size();
  const lay = sceneLayout(w, h, state.drawScale);
  const legend = legendScale(gear.textScale());
  const physicsS = physics();
  const I = loopCurrent(state.rotor, physicsS);
  drawScene(view.ctx, lay, {
    rotor: state.rotor, settings: physicsS, I, Iref: Iref(), colors: theme.colors(), theme: theme.current(),
    legend, bulb: state.bulb, show: s.show,
  });
  gear.setDrawFit(lay.fill);
  setAttr(sceneCanvas, 'aria-label', t('page.heading'));

  // grafiks
  if (g) {
    const gs = gview.size();
    const gl = graphLayout(gs.w, gs.h, legend);
    const emfAmp = K * Math.abs(state.rotor.omega);
    drawGraph(gview.ctx, gl, {
      trace: state.trace, window: traceWindow(state.trace, state.rotor.t), settings: { commutator: s.commutator, showFlux: s.show.flux },
      colors: theme.colors(), theme: theme.current(), legend, emfAmp, fmt,
    });
  }

  // apraksti ekrāna lasītājam — ne biežāk kā reizi sekundē
  const now = performance.now();
  if (now - state.descAt > 1000) {
    state.descAt = now;
    setText(el('sceneDesc'), describe(now));
    if (g) {
      const em = K * TAU * s.f;
      setAttr(graphCanvas, 'aria-label', t('graph.aria', { kind: t(s.commutator ? 'kind.dc' : 'kind.ac'), em: fmt(em, 2), T: fmt(1 / s.f, 2) }));
    }
  }

  const big = w >= 900 && h >= 560;
  setHidden(titleSmall, !(big && !g));
  drawing.classList.toggle('has-title', big && !g);
  void lang;
}

theme.onChange(render);
i18n.onChange(() => { notices.refresh(); state.descAt = -Infinity; render(); });
document.fonts.ready.then(render);
new ResizeObserver(() => render()).observe(el('bar'));

// saite ?mode=generator — atver ģeneratora režīmā (bez paziņojuma)
if (url.settings.mode === 'generator') {
  state.s.mode = 'generator';
  startGenerator();
  syncRange();
  // ja ierīcē ieslēgts “samazināt kustību”, saite atver ģeneratoru apturētu (▶ vai atstarpe — sākt)
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) state.paused = true;
}

window.__e01 = { get state() { return state; }, setMode, reset };
render();
