// assets/oscillation/main.js
import { createI18n, createTheme, mountHeaderTools, mountTitleCells, setupCanvas, startLoop } from '../sim-core.js';
import { STRINGS } from './i18n.js';
import {
  VIEWS, VIEW_POSE, AXIS_CM, RANGES, withA, withV, withLambda, withLines, advancePhase, longAmplitude, advancePose, poseAngles, sceneLayout, circleLayout, blendLayout,
} from './model.js';
import { settingsFromURL, warningText } from './params.js';
import { quantityRows, relationsRows } from './hud-model.js';
import { drawScene } from './scene.js';
import { createNotices } from '../measure/notices.js';
import { formatNumber } from '../measure/format.js';
import { createQuantityList, createSettingsCorner, createFold } from '../measure/hud.js';
import { legendScale } from '../measure/ui-scale.js';
import { TOP_MARGIN, PANEL_GAP, EDGE_PX } from '../measure/hud-layout.js';

document.getElementById('bootMsg')?.remove();
const i18n = createI18n(STRINGS);
const theme = createTheme();
const t = (key, vars) => i18n.t(key, vars);
// render() iet katrā kadrā: DOM raksta tikai, ja vērtība mainījusies
const setText = (el, s) => { if (el.textContent !== s) el.textContent = s; };
const setAttr = (el, name, v) => { const s = String(v); if (el.getAttribute(name) !== s) el.setAttribute(name, s); };

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
  leftH: 0, // LIELUMI augstums un platums aizvērtā stāvoklī (atvērts slīdnis zīmējumu nebīda)
  leftW: 0,
};
const painted = { settings: null, lang: null }; // ko LIELUMI pēdējo reizi rādīja

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
    const next = { A: () => withA(s, v), lambda: () => withLambda(s, v), v: () => withV(s, v), lines: () => withLines(s, v) }[key]?.() ?? s;
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
  setText(relTitle, t('rel.title'));
  for (const r of relationsRows(state.settings, state.phase, { lang: i18n.lang(), t: i18n.t })) {
    let el = relRows.get(r.key);
    if (!el) {
      el = document.createElement('div');
      el.className = `r-row${r.live ? ' live' : ''}`;
      el.innerHTML = '<span class="k"></span><span class="v"></span>';
      hudRight.appendChild(el);
      relRows.set(r.key, el);
    }
    setText(el.firstChild, r.k);
    setText(el.lastChild, r.v);
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

// Telefonā abi paneļi sākumā salocīti — tikai virsraksts un ▾ (Ansis 04.10); datorā poga paslēpta (CSS)
const MOBILE = matchMedia('(max-width: 700px), (max-height: 480px)');
const foldLabels = () => ({ open: t('hud.unfold'), close: t('hud.fold') });
hudLeft.classList.add('narrow'); // īsas rindas — panelis šaurāks
const foldOpts = () => ({ labels: foldLabels, folded: MOBILE.matches, active: () => MOBILE.matches });
const folds = [createFold(hudLeft, foldOpts()), createFold(hudRight, foldOpts())];
i18n.onChange(() => folds.forEach((f) => f.repaint()));

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
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
  if (ev.key === '1') setView('circle');
  else if (ev.key === '2') setView('trans');
  else if (ev.key === '3') setView('long');
  else if (ev.key === ' ' && tag !== 'BUTTON') {
    ev.preventDefault();
    if (ev.repeat) return;
    state.paused = !state.paused;
    render();
  }
});

const canvas = document.getElementById('scene');
let view = null;
view = setupCanvas(canvas, () => render());

function layout() {
  const { w, h } = view.size();
  if (!hudLeft.classList.contains('sliding')) { // atvērts slīdnis zīmējumu nebīda
    state.leftH = hudLeft.offsetHeight;
    state.leftW = hudLeft.offsetWidth;
  }
  const top = TOP_MARGIN + Math.max(state.leftH, hudRight.offsetHeight) + PANEL_GAP;
  const bottom = h - viewSlot.offsetTop + PANEL_GAP; // pogas un (telefonā stāvus) padoms zem tām
  // GARENVILNĪ galējie punkti aiziet līdz A aiz ass galiem: platumā rezervē 2·A_max (A mērogu nemaina — kā augstumā)
  const fitW = (w - 2 * EDGE_PX) / (AXIS_CM + 2 * RANGES.A.max);
  const side = sceneLayout(w, h, { top, bottom, drawScale: state.drawScale, edge: (w - AXIS_CM * fitW) / 2 });
  // APLIS: tuvplāns — aplis ar A_max aizpilda joslu starp paneļiem vai zem tiem; pagriezienā mērogs mīksti pāriet uz ass mērogu
  const clearW = w - 2 * (Math.max(state.leftW, hudRight.offsetWidth) + 8 + PANEL_GAP);
  const circle = circleLayout(w, h, { topFree: TOP_MARGIN, topBelow: top, bottom, clearW, drawScale: state.drawScale });
  return blendLayout(circle, side, state.pose.kappa);
}

function step(dt) {
  if (!state.paused) state.phase = advancePhase(state.phase, dt, state.settings);
  // garenvilnī amplitūda ierobežota (λ/2π) — paziņojums ar iemeslu, kamēr skats ir GARENVILNIS un ierobežojums darbojas
  const limited = state.view === 'long' && state.pose.theta > 0.5 && longAmplitude(state.settings) < state.settings.A;
  if (limited !== state.limitShown) {
    state.limitShown = limited;
    if (limited) notices.show('longLimit', () => t('notice.longLimit', { a: formatNumber(longAmplitude(state.settings), 1, i18n.lang()) }));
    else notices.clear('longLimit');
  } else if (limited) notices.refresh();
  state.pose = advancePose(state.pose, state.view, dt);
  render();
}
startLoop(step);

function render() {
  if (!view) return;
  // LIELUMI pārzīmē tikai, kad mainās iestatījumi vai valoda (kopīgais saraksts citādi katrā kadrā pārraksta atribūtus)
  if (state.settings !== painted.settings || i18n.lang() !== painted.lang) {
    painted.settings = state.settings;
    painted.lang = i18n.lang();
    quantities.update(quantityRows(state.settings, { lang: painted.lang, t: i18n.t }));
  }
  paintRelations();
  for (const [v, b] of viewBtns) {
    const label = t(`view.${v}`);
    setText(b, label);
    setAttr(b, 'aria-pressed', v === state.view);
  }
  setAttr(viewSlot, 'aria-label', t('view.group'));
  setText(pauseBtn, state.paused ? '▶\uFE0E' : '⏸\uFE0E'); // U+FE0E — teksta zīme, ne krāsaina emocijzīme telefonā
  setAttr(pauseBtn, 'aria-label', state.paused ? t('run.play') : t('run.pause'));

  const lay = layout();
  drawScene(view.ctx, lay, {
    settings: state.settings,
    phase: state.phase,
    pose: state.pose,
    angles: poseAngles(state.pose),
    colors: theme.colors(),
    legend: legendScale(gear.textScale()),
  });
  gear.setDrawFit(lay.fill);
  const { w, h } = view.size();
  // paziņojumi virs skatu pogām — pogas ir rasējuma apakšā, zem tām vietas nav
  const noticesBottom = `${h - viewSlot.offsetTop + PANEL_GAP}px`;
  if (noticesEl.style.bottom !== noticesBottom) noticesEl.style.bottom = noticesBottom;
  const big = w >= 900 && h >= 560;
  if (titleSmall.hidden === big) titleSmall.hidden = !big;
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
