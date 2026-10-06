// assets/brownian/main.js — Brauna kustība (M-01): vadība vienā rindā zem galvenes (temperatūra ar − +, trajektorija, molekulas,
// ⏸/▶, ↺), pasaule — viss laukums zem tās, bez rāmja. Tikai vizualizācija, bez mērījumiem (Ansis 06.10).
import { createI18n, createTheme, mountHeaderTools, mountTitleCells, setupCanvas, startLoop } from '../sim-core.js';
import { STRINGS } from './i18n.js';
import { RANGES, withT, withTrail, withMolecules, createWorld, setTemperature, resizeWorld, resetDust, step, boxLayout } from './model.js';
import { settingsFromURL, warningText } from './params.js';
import { drawScene } from './scene.js';
import { createNotices } from '../measure/notices.js';
import { createSettingsCorner } from '../measure/hud.js';
import { formatNumber } from '../measure/format.js';

document.getElementById('bootMsg')?.remove();
const i18n = createI18n(STRINGS);
const theme = createTheme();
const t = (key, vars) => i18n.t(key, vars);
const setText = (el, s) => { if (el.textContent !== s) el.textContent = s; };
const setAttr = (el, name, v) => { const s = String(v); if (el.getAttribute(name) !== s) el.setAttribute(name, s); };

mountHeaderTools(document.getElementById('headTools'), { i18n, theme });
const titleSmall = document.getElementById('titleSmall');
mountTitleCells(titleSmall, { i18n, sheet: 'M-01', topicKey: 'tb.topicValue' });
i18n.apply();

const url = settingsFromURL(location.search);
const state = { settings: url.settings, paused: false, drawScale: 1, world: null };

const drawing = document.getElementById('drawing');
const noticesEl = document.getElementById('notices');
const notices = createNotices(noticesEl, { closeLabel: () => t('notice.close') });
url.warnings.forEach((w, i) => notices.show(`url${i}`, () => warningText(w, { t: i18n.t, lang: i18n.lang() })));

function update(next) {
  if (next === state.settings) return;
  const prev = state.settings;
  state.settings = next;
  if (state.world && next.T !== prev.T) setTemperature(state.world, next.T);
  render();
}

// ── vadības rinda ─────────────────────────────────────────
const el = (id) => document.getElementById(id);
const tMinus = el('tMinus');
const tPlus = el('tPlus');
const tRange = el('tRange');
const tVal = el('tVal');
tRange.min = String(RANGES.T.min);
tRange.max = String(RANGES.T.max);
tRange.step = String(RANGES.T.step);
tRange.addEventListener('input', () => update(withT(state.settings, Number(tRange.value))));
tMinus.addEventListener('click', () => update(withT(state.settings, state.settings.T - RANGES.T.step)));
tPlus.addEventListener('click', () => update(withT(state.settings, state.settings.T + RANGES.T.step)));
el('trailBtn').addEventListener('click', () => update(withTrail(state.settings, !state.settings.trail)));
el('molBtn').addEventListener('click', () => update(withMolecules(state.settings, !state.settings.molecules)));
el('pauseBtn').addEventListener('click', () => { state.paused = !state.paused; render(); });
el('resetBtn').addEventListener('click', () => { if (state.world) resetDust(state.world); render(); });
el('bar').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) b.blur(); }); // atstarpe paliek pauzei

document.addEventListener('keydown', (ev) => {
  const tag = ev.target?.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || ev.ctrlKey || ev.metaKey || ev.altKey) return;
  if (ev.key === ' ') { ev.preventDefault(); if (!ev.repeat) { state.paused = !state.paused; render(); } }
  else if (ev.key === 'r' || ev.key === 'R') { if (state.world) resetDust(state.world); render(); }
});

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

const canvas = el('scene');
let view = null;
view = setupCanvas(canvas, () => render());

function layout() {
  const { w, h } = view.size();
  const lay = boxLayout(w, h);
  lay.x0 = (w - lay.pxW) / 2;
  lay.y0 = (h - lay.pxH) / 2;
  lay.drawScale = state.drawScale;
  if (!state.world) state.world = createWorld(lay.w, lay.h, state.settings.T, Date.now() % 2147483647);
  else resizeWorld(state.world, lay.w, lay.h);
  return lay;
}

startLoop((dt) => {
  if (!state.paused && state.world) step(state.world, dt);
  render();
});

function render() {
  if (!view) return;
  const s = state.settings;
  const lang = i18n.lang();
  setText(el('tLabel'), t('bar.T'));
  setText(el('showLabel'), t('bar.show'));
  setText(el('runLabel'), t('bar.run'));
  setText(tVal, `${formatNumber(s.T, 0, lang)} K`);
  if (Number(tRange.value) !== s.T) tRange.value = String(s.T);
  setAttr(tRange, 'aria-label', t('bar.Tname'));
  setAttr(tRange, 'aria-valuetext', `${s.T} K`);
  setAttr(tMinus, 'aria-label', t('dims.decrease', { name: t('bar.Tname') }));
  setAttr(tPlus, 'aria-label', t('dims.increase', { name: t('bar.Tname') }));
  tMinus.disabled = s.T <= RANGES.T.min;
  tPlus.disabled = s.T >= RANGES.T.max;
  setText(el('trailBtn'), t('bar.trail'));
  setAttr(el('trailBtn'), 'aria-pressed', s.trail);
  setText(el('molBtn'), t('bar.molecules'));
  setAttr(el('molBtn'), 'aria-pressed', s.molecules);
  setText(el('pauseBtn'), state.paused ? '▶︎' : '⏸︎');
  setAttr(el('pauseBtn'), 'aria-label', state.paused ? t('run.play') : t('run.pause'));
  setText(el('resetBtn'), t('run.reset'));
  setAttr(el('resetBtn'), 'aria-label', t('run.resetAria'));
  const lay = layout();
  drawScene(view.ctx, lay, { world: state.world, settings: s, colors: theme.colors() });
  gear.setDrawFit(lay.fill);
  const { w, h } = view.size();
  const big = w >= 900 && h >= 560;
  if (titleSmall.hidden === big) titleSmall.hidden = !big;
  drawing.classList.toggle('has-title', big);
}

theme.onChange(render);
i18n.onChange(() => { notices.refresh(); render(); });
document.fonts.ready.then(render);

window.__bm = { get state() { return state; }, layout, setSettings(next) { update(next); } };
render();
