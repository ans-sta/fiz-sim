// assets/oscillation/main.js
import { createI18n, createTheme, mountHeaderTools, mountTitleCells, setupCanvas, startLoop } from '../sim-core.js';
import { STRINGS } from './i18n.js';
import {
  VIEWS, VIEW_POSE, AXIS_CM, RANGES, defaultSettings, withA, withT, withLambda, withLines, advancePhase, advancePose, poseAngles, sceneLayout,
} from './model.js';
import { settingsFromURL, warningText } from './params.js';
import { quantityRows, relationsRows } from './hud-model.js';
import { drawScene } from './scene.js';
import { createNotices } from '../measure/notices.js';
import { createQuantityList, createSettingsCorner } from '../measure/hud.js';
import { legendScale } from '../measure/ui-scale.js';
import { TOP_MARGIN, PANEL_GAP, EDGE_PX } from '../measure/hud-layout.js';

document.getElementById('bootMsg')?.remove();
const i18n = createI18n(STRINGS);
const theme = createTheme();
const t = (key, vars) => i18n.t(key, vars);

mountHeaderTools(document.getElementById('headTools'), { i18n, theme });
const titleSmall = document.getElementById('titleSmall');
mountTitleCells(titleSmall, { i18n, sheet: 'S-01', topicKey: 'tb.topicValue' });
i18n.apply();

const url = settingsFromURL(location.search);
const state = {
  settings: url.settings,
  view: url.view, // mērķa stāvoklis (poga)
  pose: { ...VIEW_POSE[url.view] }, // saites skats atveras uzreiz, bez pagrieziena
  phase: 0,
  paused: false,
  drawScale: 1,
  leftH: 0, // LIELUMI augstums aizvērtā stāvoklī (atvērts slīdnis zīmējumu nebīda)
};

const drawing = document.getElementById('drawing');
const hudLeft = document.getElementById('hudLeft');
const hudRight = document.getElementById('hudRight');
const viewSlot = document.getElementById('viewSlot');

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
    const next = { A: () => withA(s, v), T: () => withT(s, v), lambda: () => withLambda(s, v), lines: () => withLines(s, v) }[key]?.() ?? s;
    state.settings = next;
    render();
  },
});

// SAKARĪBAS — mazs lauciņš pie labās malas: f, ω, v (pelēki) un dzīvā φ
hudRight.classList.add('hud', 's01-rel');
const relTitle = document.createElement('div');
relTitle.className = 'hud-title';
hudRight.appendChild(relTitle);
const relRows = new Map();
function paintRelations() {
  relTitle.textContent = t('rel.title');
  for (const r of relationsRows(state.settings, state.phase, { lang: i18n.lang() })) {
    let el = relRows.get(r.key);
    if (!el) {
      el = document.createElement('div');
      el.className = `r-row${r.live ? ' live' : ''}`;
      el.innerHTML = '<span class="k"></span><span class="v"></span>';
      hudRight.appendChild(el);
      relRows.set(r.key, el);
    }
    if (el.firstChild.textContent !== r.k) el.firstChild.textContent = r.k;
    if (el.lastChild.textContent !== r.v) el.lastChild.textContent = r.v;
  }
}

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

// Skatu pogas: APLIS · ŠĶĒRSVILNIS · GARENVILNIS un ⏸/▶ (spec. 4.3)
const viewBtns = new Map();
for (const v of VIEWS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn';
  b.addEventListener('click', () => setView(v));
  viewSlot.appendChild(b);
  viewBtns.set(v, b);
}
const pauseBtn = document.createElement('button');
pauseBtn.type = 'button';
pauseBtn.className = 'btn pause';
pauseBtn.addEventListener('click', () => { state.paused = !state.paused; render(); });
viewSlot.appendChild(pauseBtn);

function setView(v) {
  if (!VIEWS.includes(v) || v === state.view) return;
  state.view = v;
  render();
}

document.addEventListener('keydown', (ev) => {
  const tag = ev.target?.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  if (ev.key === '1') setView('circle');
  else if (ev.key === '2') setView('trans');
  else if (ev.key === '3') setView('long');
  else if (ev.key === ' ' && tag !== 'BUTTON') { ev.preventDefault(); state.paused = !state.paused; render(); }
});

const canvas = document.getElementById('scene');
let view = null;
view = setupCanvas(canvas, () => render());
new ResizeObserver(() => render()).observe(hudRight);

function layout() {
  const { w, h } = view.size();
  if (!hudLeft.classList.contains('sliding')) state.leftH = hudLeft.offsetHeight; // atvērts slīdnis zīmējumu nebīda
  const top = TOP_MARGIN + Math.max(state.leftH, hudRight.offsetHeight) + PANEL_GAP;
  const hint = document.getElementById('turnHint');
  const hintH = hint.offsetParent ? hint.offsetHeight : 0;
  const bottom = h - viewSlot.offsetTop + PANEL_GAP + hintH;
  // GARENVILNĪ galējie punkti aiziet līdz A aiz ass galiem: platumā rezervē 2·A_max (A mērogu nemaina — kā augstumā)
  const fitW = (w - 2 * EDGE_PX) / (AXIS_CM + 2 * RANGES.A.max);
  return sceneLayout(w, h, { top, bottom, drawScale: state.drawScale, edge: (w - AXIS_CM * fitW) / 2 });
}

function step(dt) {
  if (!state.paused) state.phase = advancePhase(state.phase, dt, state.settings.T);
  state.pose = advancePose(state.pose, state.view, dt);
  render();
}
startLoop(step);

function render() {
  if (!view) return;
  quantities.update(quantityRows(state.settings, { lang: i18n.lang(), t: i18n.t }));
  paintRelations();
  for (const [v, b] of viewBtns) {
    const label = t(`view.${v}`);
    if (b.textContent !== label) b.textContent = label;
    b.setAttribute('aria-pressed', String(v === state.view));
  }
  viewSlot.setAttribute('aria-label', t('view.group'));
  pauseBtn.textContent = state.paused ? '▶' : '⏸';
  pauseBtn.setAttribute('aria-label', state.paused ? t('run.play') : t('run.pause'));
  pauseBtn.setAttribute('aria-pressed', String(state.paused));

  const lay = layout();
  drawScene(view.ctx, lay, {
    settings: state.settings,
    phase: state.phase,
    pose: state.pose,
    angles: poseAngles(state.pose),
    colors: theme.colors(),
    legend: legendScale(gear.textScale()),
    t: i18n.t,
  });
  gear.setDrawFit(lay.fill);
  const { w, h } = view.size();
  // paziņojumi virs skatu pogām — pogas ir rasējuma apakšā, zem tām vietas nav
  const noticesBottom = `${h - viewSlot.offsetTop + PANEL_GAP}px`;
  if (noticesEl.style.bottom !== noticesBottom) noticesEl.style.bottom = noticesBottom;
  const big = w >= 900 && h >= 560;
  titleSmall.hidden = !big;
  drawing.classList.toggle('has-title', big);
}

theme.onChange(render);
i18n.onChange(() => { notices.refresh(); render(); });
document.fonts.ready.then(render);

// Testu āķis pārlūka pārbaudēm (Playwright)
window.__hm = {
  get state() { return state; },
  setView,
  setSettings(next) { state.settings = next; render(); },
  layout,
};
render();
