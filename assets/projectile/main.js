import { createI18n, createTheme, mountHeaderTools, mountTitleCells, setupCanvas, startLoop } from '../sim-core.js';
import { STRINGS } from './i18n.js';
import { SCALE, ALPHA } from './scales.js';
import {
  derive, settingsKey, withMode, withH, withV0, withAlpha, withDt, withSecond, withGrid, withSlow,
  changedLocked, v0Range, SLOW_FACTOR, defaultSettings,
} from './model.js';
import { settingsFromURL, warningText, LOCKABLE } from './params.js';
import { sceneBox, sceneLayout, drawScene, handleAnchors, valueFromPointer, launchPoint, arrowGeometry, arcRadius, H_LABEL_GAP } from './scene.js';
import { createHandles } from '../measure/handles.js';
import { createNotices } from '../measure/notices.js';
import { formatNumber } from '../measure/format.js';
import { simulateRun } from './experiment.js';
import { createResults, tableModel } from './results.js';
import { openDataTable } from '../measure/data-table-view.js';
import { openProjectileStrobe } from './strobe.js';
import { resolveRoute, studyFixed, filterStudyParams } from '../measure/studies.js';
import { STUDIES, SETTING_PARAMS } from './studies.js';
import { flightNotice } from './advice.js';
import { quantityRows, quantityState, measureVM } from './hud-model.js';
import { createQuantityList, createMeasureBox, createSettingsCorner, runSlotTop } from '../measure/hud.js';
import { legendScale } from '../measure/ui-scale.js';

document.getElementById('bootMsg')?.remove();
const i18n = createI18n(STRINGS);
const theme = createTheme();
const t = (key, vars) => i18n.t(key, vars);

const route = resolveRoute(location.search, { studies: STUDIES, settingParams: SETTING_PARAMS });
const study = route.kind === 'study' ? route.study : null;
// Pētījumā nofiksētie lielumi: tiek atteikti tāpat kā `lock`, bet netiek rādīti kā vadība un bez FIKS.
const hidden = study ? studyFixed(study, LOCKABLE) : new Set();
// Pētījumā saites parametri nofiksētajiem lielumiem netiek ņemti vērā (paziņojums zemāk).
const linkParams = study ? filterStudyParams(location.search, hidden) : { search: location.search, ignored: [] };
const url = settingsFromURL(linkParams.search, study ? { base: study.preset(defaultSettings()) } : {});
const sheet = study ? `K-02 · ${study.no}` : 'K-02';
// Galvene: atpakaļ uz kartītēm; pētījuma nosaukums un numurs (spec. pētījumi 3)
{
  const back = document.querySelector('header .back');
  back.href = location.pathname.split('/').pop() || 'projectile-motion.html';
  back.dataset.i18n = 'page.backStudies';
  const h1 = document.querySelector('header h1');
  h1.querySelector('.sheet-no').textContent = sheet;
  if (study) {
    const name = document.createElement('span');
    name.className = 'study-name';
    name.dataset.i18n = `study.${study.id}.title`;
    const sep = document.createElement('span');
    sep.className = 'study-sep';
    sep.textContent = ' · ';
    h1.querySelector('[data-i18n="page.heading"]').after(sep, name);
  }
}
mountHeaderTools(document.getElementById('headTools'), { i18n, theme });
const titleSmall = document.getElementById('titleSmall');
mountTitleCells(titleSmall, { i18n, sheet, topicKey: 'tb.topicValue' });
i18n.apply();

const state = {
  settings: url.settings,
  locked: new Set([...url.locked, ...hidden]),
  hidden,
  views: url.locked.has('view') || !study ? url.views : study.views,
  noise: url.noise,
  traps: url.traps,
  seed: url.seed,
  running: null, // { run, simT, lay } — rasējums palaišanas laikā nemainās (lay), lai MĒRĪJUMI var augt
  results: createResults(),
  lastRun: null,
  shownKey: null,
  overlay: null, // { kind, key, close, runIndex? }
  selected: null,
  drag: null, // { id, box, avoid } — rasējuma mērogs velkot nemainās
  drawScale: 1,
};
const access = () => ({ locked: state.locked, hidden: state.hidden, study });

const drawing = document.getElementById('drawing');
const hudLeft = document.getElementById('hudLeft');
const hudRight = document.getElementById('hudRight');
const runSlot = document.getElementById('runSlot');

const notices = createNotices(document.getElementById('notices'), { closeLabel: () => t('notice.close') });
url.warnings.forEach((w, i) => {
  notices.show(`url${i}`, () => warningText(w, { t: i18n.t, lang: i18n.lang() }));
});
linkParams.ignored.forEach((w, i) => {
  notices.show(`study${i}`, () => t('studies.paramIgnored', { study: t(`study.${study.id}.title`), param: w.param, raw: w.raw }));
});

const quantities = createQuantityList(hudLeft, {
  labels: () => ({
    title: t('hud.title'), fixed: t('dims.fixed'), fixedTitle: t('dims.fixedTitle'), more: t('hud.more'), less: t('hud.less'),
    decrease: (name) => t('dims.decrease', { name }), increase: (name) => t('dims.increase', { name }),
  }),
  onChange: onQuantity,
});

const measures = createMeasureBox(hudRight, {
  labels: () => ({ title: t('hud.measures'), open: t('hud.allTable'), strobe: t('hud.strobe'), select: t('hud.tableSelect') }),
  lang: () => i18n.lang(),
  onOpen() {
    const tb = shownTable();
    if (tb && state.views.table) openTable(tb.key);
  },
  onStrobe() {
    const tb = shownTable();
    if (tb && state.views.strobe) openStrobeView(tb.key);
  },
  onSelect(key) {
    state.shownKey = key || null;
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
  onDrawScale(v) {
    state.drawScale = v;
    if (state.running) state.running.lay = null;
    render();
  },
  onTextScale() {
    render();
  },
});
state.drawScale = gear.drawScale();

const runBtn = document.createElement('button');
runBtn.type = 'button';
runBtn.className = 'btn primary';
runSlot.appendChild(runBtn);
runBtn.addEventListener('click', () => startRun());

const handles = createHandles(document.getElementById('handles'), {
  onChange: onHandleChange,
  onDragStart(id) {
    if (state.running) return false;
    state.drag = { id, box: currentBox(), avoid: measuresBox() };
  },
  onSelect(id) {
    if (state.selected === id) return;
    state.selected = id;
    render();
  },
  onDragEnd() {
    state.drag = null;
    render();
  },
  labels: {
    decrease: (name) => t('dims.decrease', { name }),
    increase: (name) => t('dims.increase', { name }),
  },
});

const canvas = document.getElementById('scene');
let view = null; // setupCanvas izsauc render jau pirms atgriešanās
view = setupCanvas(canvas, () => {
  if (state.running) state.running.lay = null;
  render();
});

// LIELUMI vai MĒRĪJUMI mainās (burti, mērījumi, tabuliņa, atvērts slīdnis) → rasējums un režģa skaitļi no jauna.
{
  let queued = false;
  const ro = new ResizeObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      render();
    });
  });
  ro.observe(hudRight);
  ro.observe(hudLeft);
}

function currentBox() {
  return sceneBox(state.settings);
}

// MĒRĪJUMI rasējumā: zīmējums to apiet tikai, ja tas pārklātu zīmējumu; LIELUMI drīkst pārklāt.
function measuresBox() {
  return { left: hudRight.offsetLeft, bottom: hudRight.offsetTop + hudRight.offsetHeight };
}

function layout() {
  if (!view) return null;
  if (state.running?.lay) return state.running.lay;
  const { w, h } = view.size();
  const lay = sceneLayout(w, h, state.drag ? state.drag.box : currentBox(), {
    drawScale: state.drawScale,
    avoid: state.drag ? state.drag.avoid : measuresBox(),
  });
  if (state.running) state.running.lay = lay;
  return lay;
}

const editable = (key) => quantityState(key, access()) === 'editable';

// Taisnstūris rasējuma pikseļos (ņem vērā transform un position: fixed).
function rectOf(el) {
  const r = el.getBoundingClientRect();
  const d = drawing.getBoundingClientRect();
  return { l: r.left - d.left, r: r.right - d.left, t: r.top - d.top, b: r.bottom - d.top };
}

// Rasējumā tikai simboli (h, v₀, α); vērtības ir sarakstā LIELUMI.
function handleItems(lay, s) {
  const a = handleAnchors(lay, s);
  const items = [];
  const num = (v, dec) => formatNumber(v, dec, i18n.lang());
  const k = legendScale(gear.textScale()); // simboli aug līdzi burtiem uz pusi — un tā attālums no roktura
  const add = (key, o) => {
    const on = editable(key);
    items.push({ labelAnchor: 'center', ...o, kind: on ? o.kind : 'none', labelClass: on ? 'sym' : 'sym locked' });
  };
  const mid = a.h.y + (lay.groundY - a.h.y) / 2;
  add('h', {
    id: 'h', kind: 'diamond', x: a.h.x, y: a.h.y,
    labelText: 'h', labelX: a.h.x - H_LABEL_GAP, labelY: lay.groundY - a.h.y >= 24 ? mid : a.h.y - 10, labelAnchor: 'right',
    ariaLabel: t('dims.h'), min: SCALE.h.min, max: SCALE.h.max, step: SCALE.h.step, value: s.h, valueText: `${num(s.h, SCALE.h.decimals)} ${SCALE.unit}`,
  });
  const r = v0Range(s.mode);
  const { dir } = arrowGeometry(lay, s);
  const vertical = s.mode === 'vertical';
  const gap = 12 + 8 * k;
  add('v0', {
    id: 'v0', kind: 'diamond', x: a.v0.x, y: a.v0.y,
    labelText: 'v₀',
    labelX: vertical ? a.v0.x + gap : a.v0.x + dir.y * gap,
    labelY: vertical ? a.v0.y : a.v0.y - dir.x * gap,
    labelAnchor: vertical ? 'left' : 'right',
    ariaLabel: t('dims.v0'), min: r.min, max: r.max, step: SCALE.v0.step, value: s.v0, valueText: `${num(s.v0, SCALE.v0.decimals)} ${SCALE.unit}/s`,
  });
  if (s.mode === 'oblique') {
    const p = launchPoint(lay, s);
    const half = (s.alphaDeg * Math.PI) / 360; // loka vidus, virs horizontālās līnijas
    const R = arcRadius(arrowGeometry(lay, s).len) + 8 + 6 * k;
    add('alpha', {
      id: 'alpha', kind: 'diamond', x: a.alpha.x, y: a.alpha.y,
      labelText: 'α', labelX: p.x + R * Math.cos(half), labelY: p.y - R * Math.sin(half) - 6, labelAnchor: 'left',
      ariaLabel: t('dims.alpha'), min: ALPHA.min, max: ALPHA.max, step: ALPHA.step, value: s.alphaDeg, valueText: `${num(s.alphaDeg, 0)}°`,
    });
  }
  return items;
}

const SETTERS = { h: withH, v0: withV0, alpha: withAlpha };
const currentValue = (id, s) => ({ h: s.h, v0: s.v0, alpha: s.alphaDeg })[id];

function onHandleChange(id, change) {
  if (state.running || !editable(id)) return;
  const lay = layout();
  if (!lay) return;
  const s = state.settings;
  let next;
  if (change.pointer) {
    const v = valueFromPointer(id, lay, s, change.pointer);
    next = SETTERS[id](s, v);
    // slīpajā sviedienā bultas galu velkot mainās arī α
    if (id === 'v0' && s.mode === 'oblique' && editable('alpha')) next = withAlpha(next, valueFromPointer('alpha', lay, s, change.pointer));
  } else if ('delta' in change) next = SETTERS[id](s, currentValue(id, s) + change.delta);
  else next = SETTERS[id](s, change.set);
  if (JSON.stringify(next) === JSON.stringify(s)) return;
  applySettings(next);
}

const LOCK_SYMBOLS = { h: 'h', v0: 'v₀', alpha: 'α', dt: 'Δt' };
function lockName(k) {
  return LOCK_SYMBOLS[k] ?? t(`lock.${k}`);
}

// Iestatījumu maiņa, kas izmainītu saitē nofiksētu lielumu, tiek noraidīta.
function applySettings(next) {
  const bad = changedLocked(state.settings, next, state.locked);
  if (bad.length) {
    notices.show('lockConflict', () => t('lockConflict', { names: bad.map(lockName).join(', ') }));
    return false;
  }
  notices.clear('lockConflict');
  state.settings = next;
  resetAfterChange();
  render();
  return true;
}

function resetAfterChange() {
  state.lastRun = null;
  state.shownKey = null;
  notices.clear('flight');
}

function currentKey() {
  return settingsKey(state.settings, { noise: state.noise, traps: state.traps });
}

// Pirmās palaišanas pogas vārds — nejauši viens no trim, vienreiz uz lapas atvēršanu (lai nemainās, velkot slīdni).
const START_KEY = ['run.start1', 'run.start2', 'run.start3'][Math.floor(Math.random() * 3)];

let stopLoop = () => {};

function startRun() {
  if (state.running) return;
  const key = currentKey();
  const run = simulateRun(state.settings, { seed: state.seed, repeat: state.results.nextRepeat(key), noise: state.noise, traps: state.traps });
  if (!run.ok) {
    notices.show('flight', () => flightNotice(run.reason, state.settings, state.locked, i18n.t));
    return;
  }
  notices.clear('flight');
  const lay = layout(); // pirms MĒRĪJUMI sāk mainīties
  state.running = { run, simT: 0, lay };
  state.lastRun = null;
  state.shownKey = null;
  stopLoop = startLoop(step);
  render();
}

function step(dt) {
  const r = state.running;
  if (!r) return;
  r.simT = Math.min(r.run.tEnd, r.simT + dt * (state.settings.slow ? SLOW_FACTOR : 1));
  if (r.simT >= r.run.tEnd) finishRun();
  render();
}

function finishRun() {
  stopLoop();
  state.results.add(state.settings, state.running.run, { seed: state.seed, noise: state.noise, traps: state.traps });
  state.lastRun = state.running.run;
  state.running = null;
}

function ballPositions() {
  const s = state.settings;
  const r = state.running;
  const run = r ? r.run : state.lastRun;
  if (!run) {
    const start = { x: 0, y: s.h, rising: s.v0 > 0 };
    return { ball: start, ball2: s.mode === 'horizontal' && s.second ? start : null };
  }
  const tNow = r ? r.simT : run.tEnd;
  return { ball: { ...run.posAt(tNow), rising: run.risingAt(tNow) }, ball2: run.posAt2 ? run.posAt2(tNow) : null };
}

function shownTable() {
  return state.results.byKey(state.shownKey ?? currentKey());
}

function openTable(key) {
  const table = state.results.byKey(key);
  state.overlay?.close();
  state.overlay = null;
  if (!table) return;
  const lang = i18n.lang();
  const handle = openDataTable(tableModel(table, { t: i18n.t, lang }), {
    lang,
    labels: {
      heading: t('results.table'), copy: t('data.copy'), csv: t('data.csv'), close: t('data.close'),
      copied: t('data.copied'), copyFailed: t('data.copyFailed'),
    },
    onClose() {
      if (state.overlay && state.overlay.close === handle.close) state.overlay = null;
    },
  });
  state.overlay = { kind: 'table', key, close: handle.close };
}

function openStrobeView(key, runIndex) {
  const table = state.results.byKey(key);
  state.overlay?.close();
  state.overlay = null;
  if (!table) return;
  const handle = openProjectileStrobe({
    table,
    runIndex: runIndex ?? table.runs.length - 1,
    t: i18n.t,
    lang: i18n.lang(),
    colors: theme.colors(),
    grid: state.settings.grid,
    gridLocked: state.locked.has('grid') && !state.hidden.has('grid'),
    onGridChange(on) {
      state.settings = withGrid(state.settings, on);
      render();
    },
    onExportFailed({ w, h }) {
      notices.show('export', () => t('strobe.exportFailed', { w, h }));
    },
    onClose() {
      if (state.overlay && state.overlay.close === handle.close) state.overlay = null;
    },
  });
  state.overlay = { kind: 'strobe', key, close: handle.close, runIndex: handle.runIndex };
}

function reopenOverlay() {
  const ov = state.overlay;
  if (!ov) return;
  if (ov.kind === 'strobe') openStrobeView(ov.key, ov.runIndex());
  else openTable(ov.key);
}

// LIELUMI: lapa pati pielieto savu with* (noapaļo, ierobežo), pārbauda nofiksēto un pārzīmē.
function onQuantity(key, v) {
  if (state.running || !editable(key)) return;
  const s = state.settings;
  let next = s;
  switch (key) {
    case 'h': next = withH(s, v); break;
    case 'v0': next = withV0(s, v); break;
    case 'alpha': next = withAlpha(s, v); break;
    case 'dt': next = withDt(s, v); break;
    case 'mode': next = withMode(s, v); break;
    case 'second': next = withSecond(s, v); break;
    case 'slow': next = withSlow(s, v); break;
    default: return;
  }
  if (next === s || JSON.stringify(next) === JSON.stringify(s) || !applySettings(next)) render(); // slīdnis atgriežas pie pieņemtās vērtības
}

let modelCache = { id: null, model: null };
function modelFor(shown, lang) {
  const id = `${shown.key}|${shown.runs.length}|${lang}`;
  if (modelCache.id !== id) modelCache = { id, model: tableModel(shown, { t: i18n.t, lang }) };
  return modelCache.model;
}

// Pirmo reizi — viens no trim vārdiem, tad “↻ ATKĀRTOT 2×” …
function runLabel() {
  if (state.running) return t('run.running');
  const n = state.results.nextRepeat(currentKey());
  return n > 1 ? t('run.repeatN', { n }) : t(START_KEY);
}

function render() {
  if (!view) return;
  drawing.classList.toggle('running', !!state.running);
  const s = state.settings;
  const lang = i18n.lang();
  const shown = shownTable();
  quantities.update(quantityRows(s, { ...access(), lang, t: i18n.t }), { disabled: !!state.running });
  measures.update(measureVM({
    settings: s,
    running: state.running,
    lastRun: state.lastRun,
    shown,
    shownModel: shown ? modelFor(shown, lang) : null,
    tables: state.results.tables(),
    shownKey: state.shownKey ?? currentKey(),
    views: state.views,
    lang,
    t: i18n.t,
  }));
  const label = runLabel();
  if (runBtn.textContent !== label) runBtn.textContent = label;
  runBtn.disabled = !!state.running;
  const { w, h } = view.size();
  // tabuliņa ir simboliska: ja MĒRĪJUMI sniegtos zemāk par 45 % rasējuma (lieli burti), to nerāda — paliek ↗ VISA TABULA
  if (!state.running) {
    hudRight.classList.remove('mini-off');
    hudRight.classList.toggle('mini-off', hudRight.offsetTop + hudRight.offsetHeight > h * 0.45);
  }
  const big = w >= 900 && h >= 560; // rakstlaukums tikai lielā rasējumā (datorā), telefonā tā nav
  titleSmall.hidden = !big;
  drawing.classList.toggle('has-title', big);

  const lay = layout();
  const pos = ballPositions();
  // poga centrēta zem zemes, atstarpe — puse pogas augstuma; paziņojumi zem pogas
  const runTop = runSlotTop(lay.groundY, runSlot.offsetHeight);
  runSlot.style.top = `${runTop}px`;
  drawing.style.setProperty('--notices-top', `${runTop + runSlot.offsetHeight + 10}px`);

  const avoidRects = [hudLeft, hudRight, runSlot, document.querySelector('#gear .gear-btn') ?? document.getElementById('gear')].map(rectOf);
  if (big) avoidRects.push(rectOf(titleSmall));
  drawScene(view.ctx, lay, {
    settings: s, derived: derive(s), colors: theme.colors(), t: i18n.t, lang, ball: pos.ball, ball2: pos.ball2, avoidRects,
  });
  gear.setDrawFit(lay.fill);
  const items = handleItems(lay, s);
  handles.update(items);
  if (state.selected && !items.some((it) => it.id === state.selected)) {
    state.selected = null;
    handles.setSelected(null);
  }
}

theme.onChange(() => {
  render();
  if (state.overlay?.kind === 'strobe') reopenOverlay();
});
i18n.onChange(() => {
  notices.refresh();
  render();
  reopenOverlay();
});
document.fonts.ready.then(render);

// Testu āķis pārlūka pārbaudēm (Playwright): nolasīt stāvokli un mainīt iestatījumus.
window.__pm = {
  get state() {
    return state;
  },
  get study() {
    return study;
  },
  layout: () => layout(),
  setSettings(next) {
    state.settings = next;
    resetAfterChange();
    render();
  },
};
render();
