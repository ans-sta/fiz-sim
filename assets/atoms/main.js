// assets/atoms/main.js — A-01 atomu spektri (spec. docs/plans/2026-11-03-atomu-spektri.md).
// Josla zem galvenes (kā E-01), kanvā spektra stabi, atoms un līmeņu shēma; vertikāls slīdnis gar avota stabu.
import { createI18n, createTheme, mountHeaderTools, setupCanvas, startLoop } from '../sim-core.js';
import { STRINGS } from './i18n.js';
import { ATOMS } from './atoms.js';
import { columnAxis, lambdaToPos, posToLambda, hintTargets, snap, edgeNm, levelOf, forbiddenTargets, INTENSITIES, VIS } from './model.js';
import { createSim } from './sim.js';
import { eventText } from './text.js';
import { sceneLayout, drawScene, levelGeometry } from './scene.js';
import { createSettingsCorner } from '../measure/hud.js';
import { legendScale } from '../measure/ui-scale.js';
import { formatNumber } from '../measure/format.js';
import { openOverlay } from '../measure/overlay.js';

document.getElementById('bootMsg')?.remove();
const i18n = createI18n(STRINGS);
const theme = createTheme();
const t = (key, vars) => i18n.t(key, vars);
const el = (id) => document.getElementById(id);
const setText = (node, s) => { if (node.textContent !== s) node.textContent = s; };
const setAttr = (node, name, v) => { const s = String(v); if (node.getAttribute(name) !== s) node.setAttribute(name, s); };
const setHidden = (node, h) => { if (node.hidden !== h) node.hidden = h; };
const fmt = (v, d) => formatNumber(v, d, i18n.lang()).replace(/^-/, '−'); // īsta mīnusa zīme (U+2212)
const fmtLam = (λ) => (λ >= 1000 ? fmt(λ, 0) : fmt(λ, 1));

mountHeaderTools(el('headTools'), { i18n, theme });
i18n.apply();

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const sim = createSim({ atomId: 'H', mode: 'absorb', reducedMotion: reduced.matches });
const ui = {
  slide: 0,
  hints: true,
  drawScale: 1,
  aim: 486.2, // nm — slīdņa vieta
  readout: null, // { key, vars }
  jump: null, // { from, t0 }
  shownLevel: sim.state.level,
  whiteSaidAt: 0,
  roAt: 0,
  descAt: -Infinity,
  layout: null,
};
const atom = () => ATOMS[sim.state.atomId];
const axis = () => columnAxis(atom());
const levelLabel = (id) => (id ? levelOf(atom(), id)?.label ?? id : '—');

// ── paziņojumi ────────────────────────────────────────────
const liveEl = el('live');
let liveText = '';
function say(text) {
  liveText = text;
  liveEl.textContent = '';
  requestAnimationFrame(() => { if (liveText === text) liveEl.textContent = text; });
}

function bandOf(λ) {
  if (λ < VIS.min) return 'uv';
  if (λ > VIS.max) return 'ir';
  if (λ < 450) return 'violet';
  if (λ < 485) return 'blue';
  if (λ < 500) return 'cyan';
  if (λ < 565) return 'green';
  if (λ < 590) return 'yellow';
  if (λ < 625) return 'orange';
  return 'red';
}

function handle(events, now) {
  for (const e of events) {
    const text = eventText(e, { atom: atom(), t, fmt });
    if (!text) continue;
    if (sim.state.white && (e.type === 'absorbed' || e.type === 'passed' || e.type === 'ionised' || e.type === 'returned')) {
      // baltajā gaismā rādījums mainās ne biežāk kā 2 reizes sekundē (tikai absorbcija vai jonizācija),
      // ekrāna lasītājam — kopsavilkums ik pēc 2 s
      if ((e.type === 'absorbed' || e.type === 'ionised') && now - ui.roAt > 500) {
        ui.roAt = now;
        ui.readout = text;
      }
      if (now - ui.whiteSaidAt > 2000) {
        ui.whiteSaidAt = now;
        say(t('live.white', { abs: sim.state.counts.absorbed, shot: sim.state.counts.shot }));
      }
      continue;
    }
    ui.readout = text;
    say(text);
  }
}

// ── josla ─────────────────────────────────────────────────
const atomBtns = [...document.querySelectorAll('#atomBtns [data-atom]')];
atomBtns.forEach((b) => b.addEventListener('click', () => {
  if (sim.state.atomId === b.dataset.atom) return;
  sim.setAtom(b.dataset.atom);
  ui.jump = null;
  ui.shownLevel = sim.state.level;
  ui.readout = null;
  buildLevelButtons();
  aimAt(defaultAim());
  say(t('live.atom', { name: cap(t(`name.${b.dataset.atom}`)) }));
  render();
}));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function setMode(m) {
  if (sim.state.mode === m) return;
  sim.setMode(m);
  ui.readout = null;
  ui.jump = null;
  ui.shownLevel = sim.state.level;
  if (reduced.matches) ui.slide = m === 'emit' ? 1 : 0;
  say(t(m === 'emit' ? 'live.emit' : 'live.absorb'));
  render();
}
el('modeAbs').addEventListener('click', () => setMode('absorb'));
el('modeEmit').addEventListener('click', () => setMode('emit'));

el('whiteBtn').addEventListener('click', () => {
  sim.setWhite(!sim.state.white);
  ui.whiteSaidAt = performance.now();
  say(sim.state.white ? t('live.whiteOn', { rate: rateAria() }) : t('live.whiteOff'));
  render();
});
const rateIdx = () => INTENSITIES.indexOf(sim.state.rate);
const rateAria = () => t(sim.state.rate === 1 ? 'bar.rateAria1' : 'bar.rateAria', { n: sim.state.rate });
function stepRate(d) {
  const i = Math.min(INTENSITIES.length - 1, Math.max(0, rateIdx() + d));
  if (INTENSITIES[i] === sim.state.rate) return;
  sim.setRate(INTENSITIES[i]);
  say(t('live.rate', { rate: rateAria() }));
  render();
}
el('rateMinus').addEventListener('click', () => stepRate(-1));
el('ratePlus').addEventListener('click', () => stepRate(1));
el('cascadeBtn').addEventListener('click', () => { handle([sim.cascade()], performance.now()); render(); });
el('clearBtn').addEventListener('click', () => { sim.clear(); say(t('live.cleared')); render(); });
el('hintsBtn').addEventListener('click', () => { ui.hints = !ui.hints; render(); });
el('infoBtn').addEventListener('click', openInfo);
// Pēc peles klikšķa poga atdod fokusu (kā E-01); ar tastatūru fokuss paliek
el('bar').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && e.detail > 0) b.blur(); });

// ── slīdnis gar avota stabu (APG Slider: native range, pagriezts vertikāli) ──
const lam = el('lam');
const RES = 1000; // slīdņa solis — tūkstošdaļa staba (bultiņas maina λ precīzāk, skat. keydown)
const defaultAim = () => {
  const h = hintTargets(atom(), sim.state.start).find((x) => x.kind === 'line' && x.λ >= VIS.min && x.λ <= VIS.max);
  return h ? h.λ + 6 : 550;
};
function aimAt(λ) {
  ui.aim = Math.min(10000, Math.max(atom().uvMin, λ));
  lam.value = String(Math.round(lambdaToPos(axis(), ui.aim) * RES));
  setAttr(lam, 'aria-valuetext', t('slider.valuetext', { lam: fmtLam(ui.aim), band: t(`band.${bandOf(ui.aim)}`) }));
}
let pointerKind = 'mouse';
lam.addEventListener('pointerdown', (e) => { pointerKind = e.pointerType; });
lam.addEventListener('input', () => {
  ui.aim = posToLambda(axis(), Number(lam.value) / RES);
  setAttr(lam, 'aria-valuetext', t('slider.valuetext', { lam: fmtLam(ui.aim), band: t(`band.${bandOf(ui.aim)}`) }));
});
lam.addEventListener('pointerup', () => {
  const col = ui.layout?.absCol;
  const maxDp = col && col.h > 0 ? (pointerKind === 'touch' ? 12 : 8) / col.h : 0;
  aimAt(snap(axis(), ui.aim, hintTargets(atom(), sim.state.start), maxDp));
  sim.shoot(ui.aim);
  render();
});
lam.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const inVis = ui.aim >= VIS.min && ui.aim <= VIS.max;
  const stepNm = (dir) => (inVis ? ui.aim - dir * 1 : ui.aim * (1 - dir * 0.001)); // dir +1 — uz augšu (īsāks λ)
  const hints = hintTargets(atom(), sim.state.start).map((h) => h.λ);
  let next = null;
  if (e.key === 'ArrowUp' || e.key === 'ArrowRight') next = stepNm(1);
  else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') next = stepNm(-1);
  else if (e.key === 'PageUp' || e.key === 'PageDown') {
    const up = e.key === 'PageUp';
    if (ui.hints && hints.length) {
      const c = hints.filter((h) => (up ? h < ui.aim - 0.05 : h > ui.aim + 0.05)).sort((a, b) => (up ? b - a : a - b));
      next = c.length ? c[0] : ui.aim;
    } else next = ui.aim + (up ? -10 : 10);
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    if (!e.repeat || e.key === 'Enter') sim.shoot(ui.aim);
    render();
    return;
  }
  if (next === null) return;
  e.preventDefault();
  aimAt(next);
  render();
});

// ── līmeņu pogas virs shēmas ──────────────────────────────
const levelsEl = el('levels');
let levelBtns = new Map();
function buildLevelButtons() {
  levelsEl.replaceChildren();
  levelBtns = new Map();
  for (const l of atom().levels) {
    if (l.kind === 'limit') continue;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'a01-level';
    b.dataset.id = l.id;
    b.addEventListener('click', () => {
      handle([sim.setLevel(l.id)], performance.now());
      render();
    });
    levelsEl.append(b);
    levelBtns.set(l.id, b);
  }
}
buildLevelButtons();

// Līmeņi, uz kuriem no elektrona līmeņa pāriet nevar (shēmā sarkans ×): starošanā — zemākie, absorbcijā — augstākie
function forbiddenSet() {
  const s = sim.state;
  if (s.mode === 'absorb') return s.ionised ? null : new Set(forbiddenTargets(atom(), s.start, 'up'));
  return s.level ? new Set(forbiddenTargets(atom(), s.level, 'down')) : null;
}

function placeOverlays(lay, legend) {
  // slīdnis — pagriezts pret pulksteņrādītāja virzienu, lai vērtība aug uz augšu
  const c = lay.absCol;
  const show = ui.slide < 0.02 && sim.state.mode === 'absorb';
  setHidden(lam, !show);
  if (show) {
    const st = lam.style;
    const wpx = `${Math.round(c.h)}px`;
    const hpx = `${Math.round(c.w + 16)}px`;
    if (st.width !== wpx) st.width = wpx;
    if (st.height !== hpx) st.height = hpx;
    const tr = `translate(${Math.round(c.x + c.w / 2 - c.h / 2)}px, ${Math.round(c.y + c.h / 2 - (c.w + 16) / 2)}px) rotate(-90deg)`;
    if (st.transform !== tr) st.transform = tr;
  }
  // baltās gaismas poga — virs avota staba, aizslīd līdzi
  const wb = el('whiteBtn');
  setHidden(wb, ui.slide >= 0.999);
  if (!wb.hidden) {
    const q = lay.whiteBtn;
    const st = wb.style;
    for (const [k, v] of [['left', q.x], ['top', q.y], ['width', q.w], ['height', q.h]]) {
      const px = `${Math.round(v)}px`;
      if (st[k] !== px) st[k] = px;
    }
    const fs = `${Math.round(q.w * 0.6)}px`;
    if (st.fontSize !== fs) st.fontSize = fs;
  }
  const geo = levelGeometry(atom(), lay.diagram, legend);
  const cur = sim.state.level;
  const forb = forbiddenSet();
  for (const g of geo) {
    const b = levelBtns.get(g.id);
    if (!b) continue;
    const lvl = levelOf(atom(), g.id);
    // hēlija blakus posmi — poga ir pats posms (savā augstumā); citiem poga seko uzrakstam (uzraksti ≥ 24 px viens no otra)
    const x = Math.round(g.x0 - (g.groupLabel ? 2 : 4));
    const w = Math.round((g.groupLabel ? g.x1 + 2 : g.single ? g.labelX + 150 : g.narrow ? g.x1 + 4 : g.x1 + Math.min(46, 0.5 * g.colW - 6)) - x);
    const top = Math.round(g.groupLabel ? g.y - 12 : g.narrow ? g.labelY - 16 : g.labelY - 12);
    const s = b.style;
    const L = `${x}px`; const T = `${top}px`; const W = `${Math.max(24, w)}px`;
    if (s.left !== L) s.left = L;
    if (s.top !== T) s.top = T;
    if (s.width !== W) s.width = W;
    setAttr(b, 'aria-label', t('lvl.aria', { label: lvl.label, E: fmt(lvl.E, 2) }) + (lvl.metastable ? t('lvl.meta') : '') + (g.id === cur ? t('lvl.here') : '') + (forb?.has(g.id) ? t('lvl.forbidden') : ''));
    setAttr(b, 'aria-current', g.id === cur ? 'true' : 'false');
  }
}

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
  onTextScale() { render(); },
});
ui.drawScale = gear.drawScale();

// ── “i” piezīme ───────────────────────────────────────────
function openInfo() {
  const ov = openOverlay({ title: t('info.title'), closeLabel: t('info.close') });
  ov.root.classList.add('e01-overlay');
  ov.body.classList.add('e01-info-body');
  for (const k of ['abs', 'emit', 'ion', 'simp']) {
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
const canvas = el('scene');
let view = null;
view = setupCanvas(canvas, () => render());

startLoop((dt) => {
  const now = performance.now();
  if (dt > 0) {
    handle(sim.step(dt), now);
    const target = sim.state.mode === 'emit' ? 1 : 0;
    if (ui.slide !== target) {
      const d = reduced.matches ? 1 : dt / 0.5;
      ui.slide = target > ui.slide ? Math.min(target, ui.slide + d) : Math.max(target, ui.slide - d);
    }
  }
  if (sim.state.level !== ui.shownLevel) {
    ui.jump = { from: ui.shownLevel, t0: now };
    ui.shownLevel = sim.state.level;
  }
  render();
});

function describe() {
  const s = sim.state;
  const name = cap(t(`name.${s.atomId}`));
  if (s.mode === 'absorb' && s.ionised) return t('desc.ionised', { name });
  const lv = levelOf(atom(), s.level);
  const src = s.mode === 'absorb' ? s.stripes : s.lines;
  const vals = [...src.values()].sort((a, b) => a - b);
  const list = vals.length ? ` (${vals.slice(0, 12).map((λ) => `${fmtLam(λ)} nm`).join(', ')}${vals.length > 12 ? ' …' : ''})` : '';
  return t(s.mode === 'absorb' ? 'desc.abs' : 'desc.emit', { name, level: lv.label, E: fmt(lv.E, 2), n: vals.length, list });
}

function render() {
  if (!view) return;
  const s = sim.state;
  const emit = s.mode === 'emit';
  // josla
  setText(el('atomLabel'), t('bar.atom'));
  for (const b of atomBtns) {
    setAttr(b, 'aria-pressed', b.dataset.atom === s.atomId);
    const sr = b.querySelector('[data-name]');
    setText(sr, ` — ${t(`name.${b.dataset.atom}`)}`);
  }
  setText(el('modeLabel'), t('bar.mode'));
  setText(el('modeAbs'), t('mode.absorb'));
  setText(el('modeEmit'), t('mode.emit'));
  setAttr(el('modeAbs'), 'aria-pressed', !emit);
  setAttr(el('modeEmit'), 'aria-pressed', emit);
  setText(el('lightLabel'), t('bar.light'));
  setAttr(el('whiteBtn'), 'aria-label', t('bar.whiteAria'));
  setAttr(el('whiteBtn'), 'aria-pressed', s.white);
  setText(el('whiteSym'), s.white ? '☀' : '☼');
  setText(el('rateK'), t('bar.rate'));
  setText(el('rateText'), t('bar.rateVal', { n: s.rate }));
  setAttr(el('rateMinus'), 'aria-label', t('dims.decrease', { name: `${t('bar.rateName')}, ${rateAria()}` }));
  setAttr(el('ratePlus'), 'aria-label', t('dims.increase', { name: `${t('bar.rateName')}, ${rateAria()}` }));
  el('rateMinus').disabled = rateIdx() <= 0;
  el('ratePlus').disabled = rateIdx() >= INTENSITIES.length - 1;
  for (const id of ['rateK', 'rateMinus', 'rateText', 'ratePlus']) setHidden(el(id), emit);
  setHidden(el('cascadeBtn'), !emit);
  setText(el('cascadeW'), t('bar.cascade'));
  setText(el('toolsLabel'), t('bar.tools'));
  setText(el('clearBtn'), t('bar.clear'));
  setAttr(el('clearBtn'), 'aria-label', `${t('bar.clear')}: ${t('bar.clearAria')}`);
  setText(el('hintsBtn'), t('bar.hints'));
  setAttr(el('hintsBtn'), 'aria-label', `${t('bar.hints')}: ${t('bar.hintsAria')}`);
  setAttr(el('hintsBtn'), 'aria-pressed', ui.hints);
  setAttr(el('infoBtn'), 'aria-label', t('info.btnAria'));
  setAttr(lam, 'aria-label', t('slider.name'));
  setAttr(levelsEl, 'aria-label', t('levels.group'));

  // kanva
  const { w, h } = view.size();
  const lay = sceneLayout(w, h, { slide: ui.slide, drawScale: ui.drawScale, topPad: el('readout').offsetHeight + 4 });
  ui.layout = lay;
  // šaurā ekrānā kanvas burti aug ne vairāk kā līdz 115 % (kā josla E-01), citādi uzraksti saduras
  const legend = lay.portrait || h < 420 ? Math.min(1.15, legendScale(gear.textScale())) : legendScale(gear.textScale());
  const now = performance.now();
  const ax = axis();
  drawScene(view.ctx, lay, {
    atom: atom(), st: s, axis: ax, posToLambda: (p) => posToLambda(ax, p),
    hints: hintTargets(atom(), s.start), showHints: ui.hints && !emit, edge: emit ? NaN : edgeNm(atom(), s.start),
    mode: s.mode, slide: ui.slide, legend, theme: theme.current(), colors: theme.colors(), fmt,
    fmtMicron: (λ) => fmt(λ / 1000, 1),
    trail: s.trail[s.mode], forbidden: forbiddenSet(),
    jump: ui.jump ? { from: ui.jump.from, k: Math.min(1, (now - ui.jump.t0) / (reduced.matches ? 120 : 320)) } : null,
    aim: !emit && ui.slide < 0.02 ? ui.aim : null,
    labels: {
      ir: t('lbl.ir'), core: t('lbl.core'), notToScale: t('lbl.notToScale'), energyAxis: t('lbl.energyAxis'),
      ionisation: t('lbl.ionisation'), para: t('lbl.para'), ortho: t('lbl.ortho'),
      series: { 1: t('series.1'), 2: t('series.2'), 3: t('series.3'), 4: t('series.4'), 5: t('series.5') },
      atomName: `${t(`title.${s.atomId}`)} ${s.atomId}`, aim: fmtLam(ui.aim), // bez “nm” — tas ir staba galvā
    },
  });
  placeOverlays(lay, legend);
  setAttr(canvas, 'aria-label', t('page.heading'));

  // rādījums
  const idle = emit ? t('ro.idleEmit') : t('ro.idleAbs', { level: levelLabel(s.start) });
  const counts = !emit && s.counts.shot ? ` · ${t('ro.counts', { shot: s.counts.shot, abs: s.counts.absorbed })}` : '';
  setText(el('readout'), (ui.readout || idle) + counts);

  if (now - ui.descAt > 1000) {
    ui.descAt = now;
    setText(el('sceneDesc'), describe());
  }
}

theme.onChange(render);
i18n.onChange(() => { ui.descAt = -Infinity; ui.readout = null; aimAt(ui.aim); render(); });
document.fonts.ready.then(render);
new ResizeObserver(() => render()).observe(el('bar'));
aimAt(defaultAim());
render();
window.__a01 = { sim, ui }; // pārbaudēm (Playwright)
