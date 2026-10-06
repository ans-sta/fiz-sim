// assets/gas/main.js — Gāzes likums pV/T = const (M-02): cilindrs ar virzuli (velkams), blakus panelis ar trim slīdņiem V, T, p,
// kas vienmēr redzami; pV/T vērtība zem tiem. Tikai vizualizācija (Ansis 06.10).
import { createI18n, createTheme, mountHeaderTools, mountTitleCells, setupCanvas, startLoop } from '../sim-core.js';
import { STRINGS } from './i18n.js';
import { RANGES, withQuantity, withLock, constOf, createGas, setGasTemperature, setPistonTarget, stepGas, volumeOf, H_MAX } from './model.js';
import { settingsFromURL, warningText } from './params.js';
import { drawScene, cylinderLayout } from './scene.js';
import { createNotices } from '../measure/notices.js';
import { createSettingsCorner } from '../measure/hud.js';
import { legendScale } from '../measure/ui-scale.js';
import { formatNumber } from '../measure/format.js';
import { TOP_MARGIN, PANEL_GAP, EDGE_PX } from '../measure/hud-layout.js';

document.getElementById('bootMsg')?.remove();
const i18n = createI18n(STRINGS);
const theme = createTheme();
const t = (key, vars) => i18n.t(key, vars);
const setText = (el, s) => { if (el.textContent !== s) el.textContent = s; };
const setAttr = (el, name, v) => { const s = String(v); if (el.getAttribute(name) !== s) el.setAttribute(name, s); };

mountHeaderTools(document.getElementById('headTools'), { i18n, theme });
const titleSmall = document.getElementById('titleSmall');
mountTitleCells(titleSmall, { i18n, sheet: 'M-02', topicKey: 'tb.topicValue' });
i18n.apply();

const url = settingsFromURL(location.search);
const state = { settings: url.settings, drawScale: 1, gas: createGas(url.settings.V, url.settings.T, Date.now() % 2147483647), hits: null, drag: null };

const drawing = document.getElementById('drawing');
const panel = document.getElementById('panel');
const noticesEl = document.getElementById('notices');
const notices = createNotices(noticesEl, { closeLabel: () => t('notice.close') });
url.warnings.forEach((w, i) => notices.show(`url${i}`, () => warningText(w, { t: i18n.t, lang: i18n.lang() })));

function update(next) {
  if (next === state.settings) return;
  const prev = state.settings;
  state.settings = next;
  if (next.T !== prev.T) setGasTemperature(state.gas, next.T);
  if (next.V !== prev.V) setPistonTarget(state.gas, next.V);
  render();
}

// ── panelis: trīs rindas V, T, p, vienmēr redzamas ─────────
const UNITS = { V: 'L', T: 'K', p: 'kPa' };
const DEC = { V: 1, T: 0, p: 0 };
const rows = {};
for (const key of ['V', 'T', 'p']) {
  const row = document.createElement('div');
  row.className = 'g01-row';
  row.innerHTML = `<div class="g01-head"><button class="g01-lock" type="button" aria-pressed="false"><svg viewBox="0 0 16 16" aria-hidden="true"><rect class="body" x="3" y="7" width="10" height="7"/><path class="shackle" d="M5 7V5a3 3 0 0 1 6 0v2"/><path class="shackle-open" d="M5 7V5a3 3 0 0 1 6 0"/></svg></button><span class="g01-sym"></span><span class="g01-name"></span><span class="g01-val"></span></div>
    <div class="g01-ctl"><button class="q-step" type="button">−</button><input class="dim-range" type="range"><button class="q-step" type="button">+</button></div>
    <div class="q-ends"><span></span><span></span></div>`;
  panel.appendChild(row);
  const [minus, input, plus] = [row.querySelector('.q-step'), row.querySelector('input'), row.querySelectorAll('.q-step')[1]];
  input.min = String(RANGES[key].min);
  input.max = String(RANGES[key].max);
  input.step = String(RANGES[key].step);
  input.addEventListener('input', () => update(withQuantity(state.settings, key, Number(input.value))));
  minus.addEventListener('click', () => update(withQuantity(state.settings, key, state.settings[key] - RANGES[key].step)));
  plus.addEventListener('click', () => update(withQuantity(state.settings, key, state.settings[key] + RANGES[key].step)));
  const lock = row.querySelector('.g01-lock');
  lock.addEventListener('click', () => update(withLock(state.settings, key)));
  rows[key] = { row, minus, input, plus, lock, sym: row.querySelector('.g01-sym'), name: row.querySelector('.g01-name'), val: row.querySelector('.g01-val'), ends: row.querySelectorAll('.q-ends span') };
}
const constRow = document.createElement('div');
constRow.className = 'g01-const';
constRow.innerHTML = '<span class="k"></span><span class="v"></span>';
panel.appendChild(constRow);
const hintRow = document.createElement('div');
hintRow.className = 'g01-hint';
panel.appendChild(hintRow);

// ── panelis velkams aiz virsraksta; vieta paliek ierīcē; dubultklikšķis — atpakaļ (Ansis 06.10) ──
const PANEL_KEY = 'fiz-sim-gas-panel';
const panelTitle = document.getElementById('panelTitle');
let panelPos = null; // { x, y } px no rasējuma augšējā kreisā stūra vai null (sākotnējā vieta)
try { const raw = localStorage.getItem(PANEL_KEY); if (raw) panelPos = JSON.parse(raw); } catch (e) { panelPos = null; }
function placePanel() {
  if (!panelPos) {
    panel.style.left = '';
    panel.style.top = '';
    panel.style.right = '';
    panel.style.bottom = '';
    panel.classList.remove('moved');
    return;
  }
  const { w, h } = view ? view.size() : { w: drawing.clientWidth, h: drawing.clientHeight };
  const x = Math.max(0, Math.min(w - panel.offsetWidth, panelPos.x));
  const y = Math.max(0, Math.min(h - panel.offsetHeight, panelPos.y));
  panel.style.left = `${x}px`;
  panel.style.top = `${y}px`;
  panel.style.right = 'auto';
  panel.style.bottom = 'auto';
  panel.classList.add('moved');
}
let panelDrag = null;
panelTitle.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  panelTitle.setPointerCapture(e.pointerId);
  const r = panel.getBoundingClientRect();
  const d = drawing.getBoundingClientRect();
  panelDrag = { dx: e.clientX - r.left, dy: e.clientY - r.top, ox: d.left, oy: d.top };
});
panelTitle.addEventListener('pointermove', (e) => {
  if (!panelDrag) return;
  panelPos = { x: e.clientX - panelDrag.ox - panelDrag.dx, y: e.clientY - panelDrag.oy - panelDrag.dy };
  placePanel();
  render();
});
const endPanelDrag = () => {
  if (!panelDrag) return;
  panelDrag = null;
  try { localStorage.setItem(PANEL_KEY, JSON.stringify(panelPos)); } catch (e) { /* privātais režīms */ }
};
panelTitle.addEventListener('pointerup', endPanelDrag);
panelTitle.addEventListener('pointercancel', endPanelDrag);
panelTitle.addEventListener('dblclick', () => {
  panelPos = null;
  try { localStorage.removeItem(PANEL_KEY); } catch (e) { /* privātais režīms */ }
  placePanel();
  render();
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

const canvas = document.getElementById('scene');
let view = null;
view = setupCanvas(canvas, () => render());

// virzuli velk: pieskāriens pie virzuļa, kāta vai roktura; y → tilpums (p pieskaņojas kā slīdnim)
const MOBILE = matchMedia('(max-width: 700px)');
const inRect = (p, r) => r && p.x >= r.x - 10 && p.x <= r.x + r.w + 10 && p.y >= r.y - 10 && p.y <= r.y + r.h + 10;
const canvasPos = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPos(e);
  const h = state.hits;
  if (!h || !(inRect(p, h.piston) || inRect(p, h.rod) || inRect(p, h.grip))) return;
  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);
  state.drag = { dy: p.y - h.piston.y - h.piston.h };
  canvas.classList.add('dragging');
});
canvas.addEventListener('pointermove', (e) => {
  const p = canvasPos(e);
  if (state.drag) {
    const lay = layout();
    const yGas = p.y - state.drag.dy; // virzuļa apakša ekrānā
    const hWorld = H_MAX - (yGas - lay.y0) / lay.scale;
    update(withQuantity(state.settings, 'V', volumeOf(hWorld)));
    return;
  }
  const h = state.hits;
  canvas.classList.toggle('grab', Boolean(h && (inRect(p, h.piston) || inRect(p, h.rod) || inRect(p, h.grip))));
});
const endDrag = () => { state.drag = null; canvas.classList.remove('dragging'); };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

function layout() {
  const { w, h } = view.size();
  placePanel();
  // pārbīdīts panelis vietu nerezervē — cilindrs izmanto visu laukumu (Ansis izvēlas, kur panelim būt)
  const avail = panelPos ? { x: EDGE_PX, y: TOP_MARGIN, w: w - 2 * EDGE_PX, h: h - 2 * TOP_MARGIN } : MOBILE.matches
    ? { x: EDGE_PX, y: TOP_MARGIN, w: w - 2 * EDGE_PX, h: h - panel.offsetHeight - 2 * PANEL_GAP - TOP_MARGIN }
    : { x: EDGE_PX, y: TOP_MARGIN, w: w - panel.offsetWidth - 2 * EDGE_PX - PANEL_GAP, h: h - 2 * TOP_MARGIN };
  return cylinderLayout(avail, { drawScale: state.drawScale });
}

startLoop((dt) => { stepGas(state.gas, dt); render(); });

function render() {
  if (!view) return;
  const s = state.settings;
  const lang = i18n.lang();
  setText(panelTitle, t('panel.title'));
  setAttr(panelTitle, 'title', t('panel.move'));
  for (const key of ['V', 'T', 'p']) {
    const r = rows[key];
    setText(r.sym, key);
    setText(r.name, t(`q.${key}`));
    setText(r.val, `${formatNumber(s[key], DEC[key], lang)} ${UNITS[key]}`);
    if (Math.abs(Number(r.input.value) - s[key]) > RANGES[key].step / 2) r.input.value = String(s[key]);
    setAttr(r.input, 'aria-label', t(`q.${key}`));
    setAttr(r.input, 'aria-valuetext', `${formatNumber(s[key], DEC[key], lang)} ${UNITS[key]}`);
    setAttr(r.minus, 'aria-label', t('dims.decrease', { name: t(`q.${key}`) }));
    setAttr(r.plus, 'aria-label', t('dims.increase', { name: t(`q.${key}`) }));
    r.minus.disabled = s[key] <= RANGES[key].min;
    r.plus.disabled = s[key] >= RANGES[key].max;
    setText(r.ends[0], `${formatNumber(RANGES[key].min, 0, lang)} ${UNITS[key]}`);
    setText(r.ends[1], `${formatNumber(RANGES[key].max, 0, lang)} ${UNITS[key]}`);
    const locked = s.lock === key;
    setAttr(r.lock, 'aria-pressed', locked);
    setAttr(r.lock, 'aria-label', t(locked ? 'panel.unlock' : 'panel.lock', { name: t(`q.${key}`) }));
    r.row.classList.toggle('locked', locked);
    r.input.disabled = locked;
    if (locked) { r.minus.disabled = true; r.plus.disabled = true; }
    // pieskaņosies nākamajā maiņā: ar atslēgu — nekad aizslēgtais; bez — visagrāk mainītais
    r.row.classList.toggle('adapts', !locked && !s.lock && s.order[0] === key);
  }
  setText(constRow.firstChild, `${t('panel.const')} =`);
  setText(constRow.lastChild, `${formatNumber(constOf(s), 2, lang)} kPa·L/K`);
  setText(hintRow, t('panel.hint'));
  const lay = layout();
  state.hits = drawScene(view.ctx, lay, { gas: state.gas, settings: s, colors: theme.colors(), legend: legendScale(gear.textScale()) });
  gear.setDrawFit(lay.fill);
  const { w, h } = view.size();
  const big = w >= 900 && h >= 560;
  if (titleSmall.hidden === big) titleSmall.hidden = !big;
  drawing.classList.toggle('has-title', big);
}

new ResizeObserver(() => render()).observe(panel);
theme.onChange(render);
i18n.onChange(() => { notices.refresh(); render(); });
document.fonts.ready.then(render);

window.__gas = { get state() { return state; }, layout, setSettings(next) { update(next); } };
render();
