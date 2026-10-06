// assets/brownian/main.js — Brauna kustība (M-01): trauks pa visu laukumu starp paneļiem un pogām, MAINĪGIE LIELUMI (T, rūtiņas),
// ⏸/▶ un ↺ apakšā, ⚙ apakšā pa kreisi. Tikai vizualizācija, bez mērījumiem (Ansis 06.10).
import { createI18n, createTheme, mountHeaderTools, mountTitleCells, setupCanvas, startLoop } from '../sim-core.js';
import { STRINGS } from './i18n.js';
import { withT, withTrail, withMolecules, createWorld, setTemperature, resizeWorld, resetDust, step, boxLayout } from './model.js';
import { settingsFromURL, warningText } from './params.js';
import { quantityRows } from './hud-model.js';
import { drawScene } from './scene.js';
import { createNotices } from '../measure/notices.js';
import { createQuantityList, createSettingsCorner, createFold } from '../measure/hud.js';
import { TOP_MARGIN, PANEL_GAP, EDGE_PX } from '../measure/hud-layout.js';

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
const state = { settings: url.settings, paused: false, drawScale: 1, leftH: 0, leftW: 0, world: null };
const painted = { settings: null, lang: null };

const drawing = document.getElementById('drawing');
const hudLeft = document.getElementById('hudLeft');
const runSlot = document.getElementById('runSlot');
const hint = document.getElementById('hint');
const noticesEl = document.getElementById('notices');
const notices = createNotices(noticesEl, { closeLabel: () => t('notice.close') });
url.warnings.forEach((w, i) => notices.show(`url${i}`, () => warningText(w, { t: i18n.t, lang: i18n.lang() })));

const quantities = createQuantityList(hudLeft, {
  labels: () => ({
    title: t('hud.quantities'), fixed: '', more: t('hud.more'), less: t('hud.less'),
    decrease: (name) => t('dims.decrease', { name }), increase: (name) => t('dims.increase', { name }),
  }),
  onChange(key, v) {
    const s = state.settings;
    const next = { T: () => withT(s, v), trail: () => withTrail(s, v), molecules: () => withMolecules(s, v) }[key]?.() ?? s;
    if (next === s) return;
    state.settings = next;
    if (state.world && key === 'T') setTemperature(state.world, next.T);
    render();
  },
});

const gear = createSettingsCorner(document.getElementById('gear'), {
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

const MOBILE = matchMedia('(max-width: 700px), (max-height: 480px)');
const fold = createFold(hudLeft, { labels: () => ({ open: t('hud.unfold'), close: t('hud.fold') }), folded: MOBILE.matches, active: () => MOBILE.matches });
i18n.onChange(() => fold.repaint());

// pogas: ⏸/▶ un ↺ NO CENTRA
const pauseBtn = document.createElement('button');
pauseBtn.type = 'button';
pauseBtn.className = 'btn pause';
pauseBtn.addEventListener('click', () => { state.paused = !state.paused; render(); });
const resetBtn = document.createElement('button');
resetBtn.type = 'button';
resetBtn.className = 'btn';
resetBtn.addEventListener('click', () => { if (state.world) resetDust(state.world); render(); });
runSlot.append(pauseBtn, resetBtn);

document.addEventListener('keydown', (ev) => {
  const tag = ev.target?.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || ev.ctrlKey || ev.metaKey || ev.altKey) return;
  if (ev.key === ' ' && tag !== 'BUTTON') { ev.preventDefault(); if (!ev.repeat) { state.paused = !state.paused; render(); } }
  else if (ev.key === 'r' || ev.key === 'R') { if (state.world) resetDust(state.world); render(); }
});

const canvas = document.getElementById('scene');
let view = null;
view = setupCanvas(canvas, () => render());

function layout() {
  const { w, h } = view.size();
  if (!hudLeft.classList.contains('sliding')) {
    state.leftH = hudLeft.offsetHeight;
    state.leftW = hudLeft.offsetWidth;
  }
  const top = TOP_MARGIN + state.leftH + PANEL_GAP;
  const bottom = h - runSlot.offsetTop + PANEL_GAP + hint.offsetHeight;
  const availW = w - 2 * EDGE_PX;
  const availH = Math.max(60, h - top - bottom);
  const lay = boxLayout(availW, availH, { drawScale: state.drawScale });
  lay.x0 = EDGE_PX + (availW - lay.pxW) / 2;
  lay.y0 = top + (availH - lay.pxH) / 2;
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
  if (state.settings !== painted.settings || i18n.lang() !== painted.lang) {
    painted.settings = state.settings;
    painted.lang = i18n.lang();
    quantities.update(quantityRows(state.settings, { lang: painted.lang, t: i18n.t }));
  }
  setText(pauseBtn, state.paused ? '▶︎' : '⏸︎');
  setAttr(pauseBtn, 'aria-label', state.paused ? t('run.play') : t('run.pause'));
  setText(resetBtn, t('run.reset'));
  setAttr(resetBtn, 'aria-label', t('run.resetAria'));
  setText(hint, state.settings.molecules ? '' : t('hint.molecules'));
  hint.hidden = state.settings.molecules;
  const lay = layout();
  drawScene(view.ctx, lay, { world: state.world, settings: state.settings, colors: theme.colors() });
  gear.setDrawFit(lay.fill);
  const { w, h } = view.size();
  const noticesBottom = `${h - runSlot.offsetTop + PANEL_GAP}px`;
  if (noticesEl.style.bottom !== noticesBottom) noticesEl.style.bottom = noticesBottom;
  const big = w >= 900 && h >= 560;
  if (titleSmall.hidden === big) titleSmall.hidden = !big;
  drawing.classList.toggle('has-title', big);
}

theme.onChange(render);
i18n.onChange(() => { notices.refresh(); render(); });
document.fonts.ready.then(render);

window.__bm = { get state() { return state; }, layout, setSettings(next) { state.settings = next; render(); } };
render();
