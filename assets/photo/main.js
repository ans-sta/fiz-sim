// assets/photo/main.js — A-02 fotoefekts (spec. docs/plans/2026-11-05-fotoefekts.md).
// Josla zem galvenes (kā A-01), datu panelis, kanvā caurule un “žogs”, apakšā krāsas slīdnis ar spektru.
import { createI18n, createTheme, mountHeaderTools, setupCanvas, startLoop } from '../sim-core.js';
import { STRINGS } from './i18n.js';
import {
  METAL_IDS, METALS, LAMBDA, VIS, freqOf, photonJ, workJ, kineticMaxJ, currentMicroA, thresholdNm, ejects,
  bandOf, lambdaToPos, posToLambda, sci, formatSci, EV,
} from './model.js';
import { createSim } from './sim.js';
import { settingsFromURL, warningText } from './params.js';
import { sceneLayout, drawScene } from './scene.js';
import { photonRGB } from '../atoms/scene.js';
import { hexRGB, spectralRGB } from '../spectrum/model.js';
import { createSettingsCorner } from '../measure/hud.js';
import { legendScale } from '../measure/ui-scale.js';
import { formatNumber } from '../measure/format.js';
import { openOverlay } from '../measure/overlay.js';
import { createNotices } from '../measure/notices.js';

document.getElementById('bootMsg')?.remove();
const i18n = createI18n(STRINGS);
const theme = createTheme();
const t = (key, vars) => i18n.t(key, vars);
const el = (id) => document.getElementById(id);
const setText = (node, s) => { if (node.textContent !== s) node.textContent = s; };
const setAttr = (node, name, v) => { const s = String(v); if (node.getAttribute(name) !== s) node.setAttribute(name, s); };
const setHidden = (node, h) => { if (node.hidden !== h) node.hidden = h; };
const fmt = (v, d) => formatNumber(v, d, i18n.lang()).replace(/^-/, '−'); // īsta mīnusa zīme (U+2212)
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const NB = ' '; // nedalāmā atstarpe starp skaitli un mērvienību

mountHeaderTools(el('headTools'), { i18n, theme });
i18n.apply();
let colors = theme.colors(); // tēmas krāsas — pārlasa tikai, mainot tēmu

// ── iestatījumi no saites ─────────────────────────────────
const url = settingsFromURL(location.search);
const locked = url.locked;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
// samazinātai kustībai lampa sākumā izslēgta (ja saite nesaka citādi) — nekas nekustas, kamēr to neieslēdz
const startOn = new URLSearchParams(location.search).has('light') ? url.settings.light : url.settings.light && !reduced.matches;
const sim = createSim({ lambda: url.settings.lambda, intensity: url.settings.intensity, metal: url.settings.metal, on: startOn });
const ui = {
  fence: url.settings.fence,
  predict: url.settings.predict,
  revealed: false,
  ev: url.settings.ev,
  needle: 0,
  drawScale: 1,
  layout: null,
  descAt: -Infinity,
  sayTimer: 0,
};
document.body.classList.toggle('a02-evmode', ui.ev);
const notices = createNotices(el('notices'), { closeLabel: () => t('notice.close') });
url.warnings.forEach((w, i) => notices.show(`url${i}`, () => warningText(w, { t: i18n.t, lang: i18n.lang() })));

// ── paziņojumi ────────────────────────────────────────────
const liveEl = el('live');
let liveText = '';
function say(text) {
  liveText = text;
  liveEl.textContent = '';
  requestAnimationFrame(() => { if (liveText === text) liveEl.textContent = text; });
}
const hiddenResult = () => ui.predict && !ui.revealed;
const current = () => currentMicroA({ lambda: sim.state.lambda, intensity: sim.state.intensity, metal: sim.state.metal, on: sim.state.on });
function outcome() {
  const s = sim.state;
  if (hiddenResult()) return t('out.hidden');
  if (!s.on) return t('out.off');
  if (s.intensity <= 0) return t('out.dark');
  return ejects(s.lambda, s.metal) ? t('out.yes', { I: fmt(current(), 2) }) : t('out.none');
}
const stateText = () => t('live.state', { name: cap(t(`name.${sim.state.metal}`)), lam: sim.state.lambda, n: sim.state.intensity, out: outcome() });
// pēc iestatījuma maiņas (slīdnim — kad apstājas) ekrāna lasītājam īss kopsavilkums
function sayStateSoon() {
  clearTimeout(ui.sayTimer);
  ui.sayTimer = setTimeout(() => say(stateText()), 600);
}
// prognozē jebkura maiņa rezultātu atkal aizsedz — nākamā prognoze
function changed() {
  if (ui.predict) ui.revealed = false;
  ui.descAt = -Infinity;
  sayStateSoon();
  render();
}

// ── josla ─────────────────────────────────────────────────
const metalBtns = [...document.querySelectorAll('#metalBtns [data-metal]')];
metalBtns.forEach((b) => b.addEventListener('click', () => {
  if (locked.has('metal') || sim.state.metal === b.dataset.metal) return;
  sim.setMetal(b.dataset.metal);
  changed();
}));
el('onBtn').addEventListener('click', () => {
  if (locked.has('light')) return;
  sim.setOn(!sim.state.on);
  changed();
});
const brRange = el('brRange');
function setBright(v) {
  if (locked.has('intensity')) return;
  const n = Math.min(100, Math.max(0, Math.round(v)));
  if (n === sim.state.intensity) return;
  sim.setIntensity(n);
  changed();
}
brRange.addEventListener('input', () => setBright(Number(brRange.value)));
// − / + pa 5 % (līdz tuvākajam 5 daudzkārtnim): 30 → 25 → … → 5 → 0
el('brMinus').addEventListener('click', () => setBright(Math.ceil(sim.state.intensity / 5) * 5 - 5));
el('brPlus').addEventListener('click', () => setBright(Math.floor(sim.state.intensity / 5) * 5 + 5));
el('fenceBtn').addEventListener('click', () => {
  if (locked.has('fence')) return;
  ui.fence = !ui.fence;
  ui.descAt = -Infinity;
  say(t(ui.fence ? 'live.fenceOn' : 'live.fenceOff'));
  render();
});
el('predictBtn').addEventListener('click', () => {
  if (locked.has('predict')) return;
  ui.predict = !ui.predict;
  ui.revealed = false;
  ui.descAt = -Infinity;
  say(t(ui.predict ? 'live.predictOn' : 'live.predictOff'));
  render();
});
el('coverBtn').addEventListener('click', () => {
  ui.revealed = true;
  ui.descAt = -Infinity;
  render();
  el('predictBtn').focus({ preventScroll: true }); // aizsegs pazūd — fokuss uz prognozes pogu
  say(stateText());
});
el('infoBtn').addEventListener('click', openInfo);
// Pēc peles klikšķa poga atdod fokusu (kā E-01, A-01); ar tastatūru fokuss paliek
for (const id of ['bar', 'presets']) {
  el(id).addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && e.detail > 0) b.blur(); });
}

// ── krāsas slīdnis (APG Slider: native range; λ aug pa labi) ──
const lam = el('lam');
const RES = 1000;
function setLambda(nm, { fromSlider = false } = {}) {
  if (locked.has('lambda')) return;
  const v = Math.min(LAMBDA.max, Math.max(LAMBDA.min, Math.round(nm)));
  if (!fromSlider) lam.value = String(Math.round(lambdaToPos(v) * RES));
  if (v === sim.state.lambda) return;
  sim.setLambda(v);
  changed();
}
lam.addEventListener('input', () => setLambda(posToLambda(Number(lam.value) / RES), { fromSlider: true }));
lam.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const s = sim.state.lambda;
  const next = {
    ArrowRight: s + 1, ArrowUp: s + 1, ArrowLeft: s - 1, ArrowDown: s - 1,
    PageUp: s + 10, PageDown: s - 10, Home: LAMBDA.min, End: LAMBDA.max,
  }[e.key];
  if (next === undefined) return;
  e.preventDefault();
  setLambda(next);
  render();
});
const presetBtns = [...document.querySelectorAll('#presets [data-nm]')];
presetBtns.forEach((b) => b.addEventListener('click', () => setLambda(Number(b.dataset.nm))));

// ── ⚙ ────────────────────────────────────────────────────
const gear = createSettingsCorner(el('gear'), {
  i18n,
  theme,
  drawing: el('drawing'), // tālummaiņa ar diviem pirkstiem virs zīmējuma — ZĪMĒJUMS
  labels: () => ({
    open: t('gear.open'), theme: t('gear.theme'), light: t('gear.light'), dark: t('gear.dark'), lang: t('gear.lang'),
    text: t('gear.text'), textDown: t('gear.textDown'), textUp: t('gear.textUp'),
    draw: t('gear.draw'), drawDown: t('gear.drawDown'), drawUp: t('gear.drawUp'),
    screen: t('gear.screen'), fullscreen: t('gear.fullscreen'),
  }),
  onDrawScale(v) { ui.drawScale = v; render(); },
  onTextScale() { colsKey = ''; layoutData(); render(); },
});
ui.drawScale = gear.drawScale();

// ── “i” piezīme ───────────────────────────────────────────
function openInfo() {
  const ov = openOverlay({ title: t('info.title'), closeLabel: t('info.close') });
  ov.root.classList.add('e01-overlay');
  ov.body.classList.add('e01-info-body');
  // garā piezīme ritinās — ar tastatūru tai jāvar piekļūt (WCAG 2.1.1, axe scrollable-region-focusable; kā S-03)
  ov.body.tabIndex = 0;
  ov.body.setAttribute('role', 'region');
  ov.body.setAttribute('aria-label', t('info.title'));
  const list = METAL_IDS.map((m) => t('info.metalItem', {
    name: t(`name.${m}`), A: formatSci(workJ(m), i18n.lang()),
    ev: ui.ev ? ` (${fmt(METALS[m].eV, 2)} eV)` : '', nm: fmt(thresholdNm(m), 0),
  })).join('; ');
  for (const k of ['what', 'photon', 'fence', 'bright', 'metals', 'simp']) {
    const sec = document.createElement('section');
    const h = document.createElement('h3');
    h.textContent = t(`info.${k}H`);
    const p = document.createElement('p');
    p.textContent = k === 'metals' ? t('info.metals', { list: cap(list) }) : t(`info.${k}`);
    sec.append(h, p);
    if (k === 'fence' && ui.ev) {
      const f = document.createElement('p');
      f.textContent = t('info.formula');
      sec.append(f);
    }
    ov.body.append(sec);
  }
}

// ── skaitļi ───────────────────────────────────────────────
const UNIT_SR = { lv: { J: 'džouli', Hz: 'herci', uA: 'mikroampēri' }, en: { J: 'joules', Hz: 'hertz', uA: 'microamperes' } };
const srSci = (v, unit) => {
  const s = sci(v, 3);
  if (!s) return '';
  return `${t('sr.sci', { m: formatNumber(s.mant, s.dec, i18n.lang()), e: s.exp < 0 ? `−${-s.exp}` : String(s.exp) })} ${UNIT_SR[i18n.lang()][unit]}`;
};
const evLine = (J) => `= ${fmt(J / EV, 2)}${NB}eV`;
// Normālforma HTML ar <sup> (fontā augšraksta cipari izklīst); pārzīmē tikai, ja mainījies
function setSci(node, v, unit) {
  const s = sci(v, 3);
  const key = s ? `${formatNumber(s.mant, s.dec, i18n.lang())}|${s.exp}|${unit}` : '';
  if (node.dataset.k === key) return;
  node.dataset.k = key;
  if (!s) { node.textContent = ''; return; }
  const sup = document.createElement('sup');
  sup.textContent = s.exp < 0 ? `−${-s.exp}` : String(s.exp);
  node.replaceChildren(`${key.split('|')[0]}·10`, sup, `${NB}${unit}`);
}
const setPlain = (node, s) => { if (node.dataset.k !== s) { node.dataset.k = s; node.textContent = s; } };

// Datu panelis: 6, 3 vai 2 kolonnas — pēc platākās iespējamās vērtības (ne pašreizējās), lai, mainoties skaitļiem, nekas nelec
const dataEl = el('data');
const probe = document.createElement('span');
probe.setAttribute('aria-hidden', 'true');
probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;left:0;top:0';
probe.innerHTML = '<span>8,88·10<sup>15</sup> Hz</span><br><span>8,88·10<sup>−21</sup> J</span>';
el('vLam').parentElement.append(probe);
let colsKey = '';
function layoutData() {
  const cell = dataEl.firstElementChild;
  const cs = getComputedStyle(cell);
  const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + 2;
  const need = Math.max(...[...probe.querySelectorAll('span')].map((x) => x.getBoundingClientRect().width)) + pad;
  const W = dataEl.clientWidth;
  const key = `${W}|${Math.round(need)}`;
  if (key === colsKey) return;
  colsKey = key;
  const cols = W >= 6 * need ? 6 : W >= 3 * need ? 3 : 2;
  dataEl.dataset.cols = String(cols);
  dataEl.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
}

function renderData() {
  const s = sim.state;
  const hide = hiddenResult();
  const out = ejects(s.lambda, s.metal);
  const W = photonJ(s.lambda);
  const A = workJ(s.metal);
  const Wk = kineticMaxJ(s.lambda, s.metal);
  const L = i18n.lang();
  setText(el('vLam'), `${s.lambda}${NB}nm`);
  setSci(el('vF'), freqOf(s.lambda), 'Hz');
  setText(el('sF'), srSci(freqOf(s.lambda), 'Hz'));
  setSci(el('vW'), W, 'J');
  setText(el('sW'), srSci(W, 'J'));
  setSci(el('vA'), A, 'J');
  setText(el('sA'), srSci(A, 'J'));
  if (hide || !out) setPlain(el('vWk'), hide ? '?' : '—');
  else setSci(el('vWk'), Wk, 'J');
  setText(el('sWk'), hide ? t('data.hiddenSr') : out ? srSci(Wk, 'J') : t('data.noneSr'));
  const I = current();
  setPlain(el('vI'), hide ? '?' : `${fmt(I, 2)}${NB}µA`);
  setText(el('sI'), hide ? t('data.hiddenSr') : `${fmt(I, 2)} ${UNIT_SR[L].uA}`);
  for (const [id, J, show] of [['eW', W, true], ['eA', A, true], ['eWk', Wk, !hide && out]]) {
    setHidden(el(id), !ui.ev);
    // ev=1: rinda paliek arī tad, kad vērtības nav (nekas nelec)
    setText(el(id), ui.ev ? (show ? (id === 'eA' ? `= ${fmt(METALS[s.metal].eV, 2)}${NB}eV` : evLine(J)) : NB) : '');
  }
  for (const [id, k] of [['nLam', 'lambda'], ['nF', 'f'], ['nW', 'W'], ['nA', 'A'], ['nWk', 'Wk'], ['nI', 'I']]) setText(el(id), t(`data.${k}`));
  setAttr(el('data'), 'aria-label', t('data.group'));
}

// ── spektra josla zem slīdņa ──────────────────────────────
const specCanvas = el('specCanvas');
const specCtx = specCanvas.getContext('2d');
const UV_A = [92, 84, 116];
const UV_B = [124, 92, 176];
const IR_A = [128, 24, 24];
const IR_B = [64, 34, 34];
const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
function bandRGB(nm) {
  if (nm < VIS.min) return mix(UV_A, UV_B, (nm - LAMBDA.min) / (VIS.min - LAMBDA.min));
  if (nm > VIS.max) return mix(IR_A, IR_B, (nm - VIS.max) / (LAMBDA.max - VIS.max));
  return spectralRGB(nm);
}
let specKey = '';
function drawSpectrum() {
  const box = el('spec').getBoundingClientRect();
  const w = Math.max(1, Math.round(box.width));
  const h = Math.max(1, Math.round(box.height));
  const key = `${w}|${h}|${lam.offsetHeight}|${theme.current()}|${i18n.lang()}`;
  if (key === specKey) return; // pārzīmē tikai, ja mainījies izmērs, tēma vai valoda
  specKey = key;
  const dpr = window.devicePixelRatio || 1;
  if (specCanvas.width !== Math.round(w * dpr) || specCanvas.height !== Math.round(h * dpr)) {
    specCanvas.width = Math.round(w * dpr);
    specCanvas.height = Math.round(h * dpr);
  }
  const ctx = specCtx;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const c = colors;
  const bh = lam.offsetHeight || 28;
  const inset = 6; // pusi roktura platuma: roktura centrs iet no 6 līdz w − 6
  const xOf = (nm) => inset + lambdaToPos(nm) * (w - 2 * inset);
  for (let x = 0; x < w; x++) {
    const p = Math.min(1, Math.max(0, (x + 0.5 - inset) / (w - 2 * inset)));
    const [r, g, b] = bandRGB(posToLambda(p));
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(x, 0, 1, bh);
  }
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w - 1, bh - 1);
  // UV un IS uzraksti joslā (balti — ≥ 4,5 : 1 pret abām tumšajām joslām)
  ctx.fillStyle = '#fff';
  ctx.font = `600 ${Math.round(Math.min(12, bh * 0.45))}px 'IBM Plex Mono', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(t('lbl.uv'), (xOf(LAMBDA.min) + xOf(VIS.min)) / 2, bh / 2);
  ctx.fillText(t('lbl.ir'), (xOf(VIS.max) + xOf(LAMBDA.max)) / 2, bh / 2);
  // nm skala zem joslas
  const ticks = w < 420 ? [200, 400, 600, 800, 1200] : [200, 300, 400, 500, 600, 700, 800, 1000, 1200];
  ctx.fillStyle = c.inkDim;
  ctx.strokeStyle = c.inkDim;
  ctx.font = `400 ${w < 420 ? 9 : 10}px 'IBM Plex Mono', monospace`;
  ctx.textBaseline = 'top';
  for (const nm of ticks) {
    const x = Math.round(xOf(nm)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, bh);
    ctx.lineTo(x, bh + 4);
    ctx.stroke();
    ctx.textAlign = nm === 1200 ? 'right' : 'center';
    ctx.fillText(String(nm), nm === 1200 ? Math.min(x + 3, w) : x, bh + 5);
  }
}

// ── kanvas un cilpa ───────────────────────────────────────
const canvas = el('scene');
let view = null;
view = setupCanvas(canvas, () => render());

startLoop((dt) => {
  if (dt > 0) {
    sim.step(dt);
    const target = current();
    ui.needle = reduced.matches ? target : ui.needle + (target - ui.needle) * Math.min(1, dt / 0.15);
  }
  render();
});

function describe() {
  const s = sim.state;
  const name = t(`gen.${s.metal}`);
  let state;
  if (hiddenResult()) state = `${t('desc.light', { lam: s.lambda, band: t(`band.${bandOf(s.lambda)}`), n: s.intensity })} ${t('out.hidden')}`;
  else if (!s.on) state = t('out.off');
  else {
    const light = t('desc.light', { lam: s.lambda, band: t(`band.${bandOf(s.lambda)}`), n: s.intensity });
    const res = s.intensity <= 0 ? t('out.dark') : ejects(s.lambda, s.metal) ? t('desc.yes', { I: fmt(current(), 2) }) : t('desc.none');
    state = `${light} ${res}`;
  }
  let text = t('desc.scene', { name, state });
  if (ui.fence && !hiddenResult()) {
    const out = ejects(s.lambda, s.metal);
    text += ` ${t('desc.fence', {
      W: srSci(photonJ(s.lambda), 'J'), A: srSci(workJ(s.metal), 'J'),
      cmp: out ? t('desc.fenceYes', { Wk: srSci(kineticMaxJ(s.lambda, s.metal), 'J') }) : t('desc.fenceNo'),
    })}`;
  }
  return text;
}

function render() {
  if (!view) return;
  const s = sim.state;
  // josla
  setText(el('metalLabel'), t('bar.metal'));
  for (const b of metalBtns) {
    const on = b.dataset.metal === s.metal;
    setAttr(b, 'aria-pressed', on);
    b.disabled = locked.has('metal') && !on;
    setText(b.querySelector('[data-name]'), ` — ${t(`name.${b.dataset.metal}`)}`);
  }
  for (const [fixId, key] of [['metalFix', 'metal'], ['lightFix', 'light'], ['lamFix', 'lambda']]) {
    const lockedHere = key === 'light' ? locked.has('light') || locked.has('intensity') : locked.has(key);
    setHidden(el(fixId), !lockedHere);
    setText(el(fixId), t('bar.fixed'));
  }
  setText(el('lightLabel'), t('bar.light'));
  setText(el('onBtn'), t('bar.on'));
  setAttr(el('onBtn'), 'aria-label', t('bar.onAria'));
  setAttr(el('onBtn'), 'aria-pressed', s.on);
  el('onBtn').disabled = locked.has('light');
  setText(el('brightK'), t('bar.bright'));
  if (Number(brRange.value) !== s.intensity) brRange.value = String(s.intensity);
  setAttr(brRange, 'aria-label', t('bar.brightName'));
  setAttr(brRange, 'aria-valuetext', t('bar.brightVal', { n: s.intensity }));
  const brLock = locked.has('intensity');
  brRange.disabled = brLock;
  el('brMinus').disabled = brLock || s.intensity <= 0;
  el('brPlus').disabled = brLock || s.intensity >= 100;
  setAttr(el('brMinus'), 'aria-label', t('dims.decrease', { name: t('bar.brightName') }));
  setAttr(el('brPlus'), 'aria-label', t('dims.increase', { name: t('bar.brightName') }));
  setText(el('brVal'), t('bar.brightVal', { n: s.intensity }));
  setText(el('showLabel'), t('bar.show'));
  setText(el('fenceBtn'), t('bar.fence'));
  setAttr(el('fenceBtn'), 'aria-label', `${t('bar.fence')}: ${t('bar.fenceAria')}`);
  setAttr(el('fenceBtn'), 'aria-pressed', ui.fence);
  el('fenceBtn').disabled = locked.has('fence');
  setText(el('predictBtn'), t('bar.predict'));
  setAttr(el('predictBtn'), 'aria-label', `${t('bar.predict')}: ${t('bar.predictAria')}`);
  setAttr(el('predictBtn'), 'aria-pressed', ui.predict);
  el('predictBtn').disabled = locked.has('predict');
  setAttr(el('infoBtn'), 'aria-label', t('info.btnAria'));

  // krāsas josla
  setText(el('colorLabel'), t('strip.label'));
  setAttr(lam, 'aria-label', t('slider.name'));
  setAttr(lam, 'aria-valuetext', t('slider.valuetext', { lam: s.lambda, band: t(`band.${bandOf(s.lambda)}`) }));
  lam.disabled = locked.has('lambda');
  if (document.activeElement !== lam && Math.round(posToLambda(Number(lam.value) / RES)) !== s.lambda) lam.value = String(Math.round(lambdaToPos(s.lambda) * RES));
  setText(el('lamVal'), `${s.lambda}${NB}nm`);
  setSci(el('lamF'), freqOf(s.lambda), 'Hz');
  const dark = theme.current() === 'dark';
  const field = hexRGB(colors.field);
  for (const b of presetBtns) {
    const nm = Number(b.dataset.nm);
    const w = b.querySelector('[data-name]');
    setText(w, t(`preset.${w.dataset.name}`));
    b.disabled = locked.has('lambda');
    const [r, g, bb] = photonRGB(nm, field, dark);
    const sw = b.querySelector('.a02-sw');
    const bg = nm < VIS.min ? `repeating-linear-gradient(45deg, rgb(${r}, ${g}, ${bb}) 0 2px, transparent 2px 4px)` : `rgb(${r}, ${g}, ${bb})`;
    if (sw.style.background !== bg) sw.style.background = bg;
  }
  drawSpectrum();
  renderData();

  // kanva
  const { w, h } = view.size();
  const lay = sceneLayout(w, h, { fence: ui.fence });
  ui.layout = lay;
  const legend = w < 520 || h < 420 ? Math.min(1.15, legendScale(gear.textScale())) : legendScale(gear.textScale());
  drawScene(view.ctx, lay, {
    st: s, predict: ui.predict, revealed: ui.revealed, ev: ui.ev, needle: ui.needle,
    legend, theme: theme.current(), colors, fmt,
    labels: {
      plate: t('lbl.plate'), collector: t('lbl.collector'), vacuum: t('lbl.vacuum'), metalTitle: t(`title.${s.metal}`),
      invisible: t('lbl.invisible', { band: s.lambda < VIS.min ? t('lbl.uv') : t('lbl.ir') }), lampOff: t('lbl.lampOff'), dark: t('lbl.dark'),
      current: fmt(current(), 2), // cipari — tieši; rādītājs — ar nelielu inerci
      fenceTitle: t('fence.title'), fenceAxis: t('fence.axis'), fenceMetal: t('fence.metal'), fenceVacuum: t('fence.vacuum'),
      fenceAbove: t('fence.above'), fenceBelow: t('fence.below'), formula: 'hf = A + Wₖ',
    },
  });
  // aizsegs prognozei
  const cover = el('coverBtn');
  setHidden(cover, !hiddenResult());
  if (!cover.hidden) {
    const r = lay.cover;
    const st = cover.style;
    for (const [k, v] of [['left', r.x], ['top', r.y], ['width', r.w], ['height', r.h]]) {
      const px = `${Math.round(v)}px`;
      if (st[k] !== px) st[k] = px;
    }
    st.setProperty('--q', `${Math.round(Math.min(r.h * 0.42, 72))}px`);
    setText(el('coverW'), t('cover.show'));
    setAttr(cover, 'aria-label', t('cover.aria'));
  }
  setAttr(canvas, 'aria-label', t('page.heading'));
  const now = performance.now();
  if (now - ui.descAt > 1000) {
    ui.descAt = now;
    setText(el('sceneDesc'), describe());
  }
}

theme.onChange(() => { colors = theme.colors(); render(); });
i18n.onChange(() => { ui.descAt = -Infinity; notices.refresh(); render(); });
document.fonts.ready.then(() => { colsKey = ''; specKey = ''; layoutData(); render(); });
new ResizeObserver(() => layoutData()).observe(dataEl);
new ResizeObserver(() => render()).observe(el('bar'));
new ResizeObserver(() => render()).observe(el('spec'));
lam.value = String(Math.round(lambdaToPos(sim.state.lambda) * RES));
ui.needle = current();
layoutData();
render();
window.__a02 = { sim, ui }; // pārbaudēm (Playwright)
