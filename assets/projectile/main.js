import { createI18n, createTheme, mountTitleBlock, setupCanvas, startLoop } from '../sim-core.js';
import { STRINGS } from './i18n.js';
import { SCALES, ALPHA } from './scales.js';
import {
  derive, settingsKey, withMode, withScale, withH, withV0, withAlpha, withDt, withSecond, withGrid, withSlow,
  changedLocked, v0Range, SLOW_FACTOR, defaultSettings,
} from './model.js';
import { settingsFromURL, warningText, LOCKABLE } from './params.js';
import { sceneBox, sceneLayout, drawScene, handleAnchors, valueFromPointer, launchPoint, arrowGeometry, arcRadius } from './scene.js';
import { createPanel } from './panel.js';
import { createHandles } from '../measure/handles.js';
import { createNotices } from '../measure/notices.js';
import { formatNumber } from '../measure/format.js';
import { simulateRun } from './experiment.js';
import { createResults, tableModel } from './results.js';
import { openDataTable } from '../measure/data-table-view.js';
import { openProjectileStrobe } from './strobe.js';
import { resolveRoute, studyFixed, filterStudyParams } from '../measure/studies.js';
import { STUDIES, SETTING_PARAMS, fixedSummary } from './studies.js';
import { flightNotice } from './advice.js';

document.getElementById('bootMsg')?.remove();
const i18n = createI18n(STRINGS);
const theme = createTheme();

const route = resolveRoute(location.search, { studies: STUDIES, settingParams: SETTING_PARAMS });
const study = route.kind === 'study' ? route.study : null;
// Pētījumā nofiksētie lielumi: tiek atteikti tāpat kā `lock`, bet netiek rādīti kā vadība un bez FIKS.
const hidden = study ? studyFixed(study, LOCKABLE) : new Set();
// Pētījumā saites parametri nofiksētajiem lielumiem netiek ņemti vērā (paziņojums zemāk).
const linkParams = study ? filterStudyParams(location.search, hidden) : { search: location.search, ignored: [] };
const url = settingsFromURL(linkParams.search, study ? { base: study.preset(defaultSettings()) } : {});
const sheet = study ? `K-02 · ${study.no}` : 'K-02';
mountTitleBlock(document.getElementById('titleblock'), { i18n, theme, sheet, topicKey: 'tb.topicValue' });

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
i18n.apply();

const state = {
  settings: url.settings,
  locked: new Set([...url.locked, ...hidden]),
  hidden,
  views: url.locked.has('view') || !study ? url.views : study.views,
  noise: url.noise,
  traps: url.traps,
  seed: url.seed,
  running: null, // { run, simT }
  results: createResults(),
  lastRun: null,
  shownKey: null,
  overlay: null, // { kind, key, close, runIndex? }
  selected: null,
  drag: null, // { id, box } — rasējuma mērogs velkot nemainās
};

const notices = createNotices(document.getElementById('notices'), { closeLabel: () => i18n.t('notice.close') });
url.warnings.forEach((w, i) => {
  notices.show(`url${i}`, () => warningText(w, { t: i18n.t, lang: i18n.lang() }));
});
linkParams.ignored.forEach((w, i) => {
  notices.show(`study${i}`, () => i18n.t('studies.paramIgnored', { study: i18n.t(`study.${study.id}.title`), param: w.param, raw: w.raw }));
});

const panel = createPanel(document.getElementById('controls'), { t: i18n.t, onAction });
const handles = createHandles(document.getElementById('handles'), {
  onChange: onHandleChange,
  onDragStart(id) {
    if (state.running) return false;
    state.drag = { id, box: currentBox() };
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
    decrease: (name) => i18n.t('dims.decrease', { name }),
    increase: (name) => i18n.t('dims.increase', { name }),
  },
});

const canvas = document.getElementById('scene');
let view = null; // setupCanvas izsauc render jau pirms atgriešanās
view = setupCanvas(canvas, () => render());

function currentBox() {
  return sceneBox(state.settings, derive(state.settings));
}

function layout() {
  if (!view) return null;
  const { w, h } = view.size();
  return sceneLayout(w, h, state.drag ? state.drag.box : currentBox());
}

function handleItems(lay, s, lang) {
  const t = i18n.t;
  const sc = SCALES[s.scale];
  const a = handleAnchors(lay, s);
  const num = (v, dec) => formatNumber(v, dec, lang);
  const items = [];
  const add = (key, o) => {
    const base = { labelAnchor: 'center', labelClass: '', ...o };
    if (base.labelAnchor === 'center') base.labelX = Math.min(Math.max(base.labelX, 70), lay.width - 70);
    if (state.locked.has(key)) {
      base.kind = 'none';
      base.labelClass = 'locked';
      base.labelText = state.hidden.has(key) ? o.labelText : `${o.labelText} ${t('dims.fixed')}`; // pētījumā bez FIKS.
    }
    items.push(base);
  };

  const hText = `h = ${num(s.h, sc.h.decimals)} ${sc.unit}`;
  add('h', {
    id: 'h', kind: 'diamond', x: a.h.x, y: a.h.y,
    labelText: hText, labelX: a.h.x - 10, labelY: (a.h.y + lay.toScreen(0, 0).y) / 2, labelAnchor: 'right',
    ariaLabel: t('dims.h'), min: sc.h.min, max: sc.h.max, step: sc.h.step, value: s.h, valueText: hText,
  });

  const r = v0Range(s.scale, s.mode);
  const dirWord = s.mode === 'vertical' && s.v0 !== 0 ? ` ${t(s.v0 > 0 ? 'dir.up' : 'dir.down')}` : '';
  const vText = `v₀ = ${num(Math.abs(s.v0), sc.v0.decimals)} ${sc.unit}/s${dirWord}`;
  const { len, dir } = arrowGeometry(lay, s);
  const vertical = s.mode === 'vertical';
  // etiķete beidzas pie bultas gala, virs bultas (α rokturis ir uz bultas turpinājuma); vertikāli — pa labi no gala
  add('v0', {
    id: 'v0', kind: 'diamond', x: a.v0.x, y: a.v0.y,
    labelText: vText,
    labelX: vertical ? a.v0.x + 16 : a.v0.x + dir.y * 18,
    labelY: vertical ? a.v0.y : a.v0.y - dir.x * 18,
    labelAnchor: vertical ? 'left' : 'right',
    ariaLabel: t('dims.v0'), min: r.min, max: r.max, step: sc.v0.step, value: s.v0, valueText: vText,
  });

  if (s.mode === 'oblique') {
    const p = launchPoint(lay, s);
    const aText = `α = ${num(s.alphaDeg, 0)}°`;
    const mid = (s.alphaDeg * Math.PI) / 360; // loka vidus, virs horizontālās līnijas
    const R = arcRadius(len) + 14;
    add('alpha', {
      id: 'alpha', kind: 'diamond', x: a.alpha.x, y: a.alpha.y,
      labelText: aText, labelX: p.x + R * Math.cos(mid), labelY: p.y - R * Math.sin(mid) - 8, labelAnchor: 'left',
      ariaLabel: t('dims.alpha'), min: ALPHA.min, max: ALPHA.max, step: ALPHA.step, value: s.alphaDeg, valueText: aText,
    });
  }
  return items;
}

const SETTERS = { h: withH, v0: withV0, alpha: withAlpha };
const currentValue = (id, s) => ({ h: s.h, v0: s.v0, alpha: s.alphaDeg })[id];

function onHandleChange(id, change) {
  if (state.running || state.locked.has(id)) return;
  const lay = layout();
  if (!lay) return;
  const s = state.settings;
  let next;
  if (change.pointer) {
    const v = valueFromPointer(id, lay, s, change.pointer);
    next = SETTERS[id](s, v);
    // slīpajā sviedienā bultas galu velkot mainās arī α
    if (id === 'v0' && s.mode === 'oblique' && !state.locked.has('alpha')) next = withAlpha(next, valueFromPointer('alpha', lay, s, change.pointer));
  } else if ('delta' in change) next = SETTERS[id](s, currentValue(id, s) + change.delta);
  else next = SETTERS[id](s, change.set);
  if (JSON.stringify(next) === JSON.stringify(s)) return;
  applySettings(next);
}

const LOCK_SYMBOLS = { h: 'h', v0: 'v₀', alpha: 'α', dt: 'Δt' };
function lockName(k) {
  return LOCK_SYMBOLS[k] ?? i18n.t(`lock.${k}`);
}

// Iestatījumu maiņa, kas izmainītu saitē nofiksētu lielumu, tiek noraidīta.
function applySettings(next) {
  const bad = changedLocked(state.settings, next, state.locked);
  if (bad.length) {
    notices.show('lockConflict', () => i18n.t('lockConflict', { names: bad.map(lockName).join(', ') }));
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
  state.running = { run, simT: 0 };
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
    const start = { x: 0, y: s.h };
    return { ball: start, ball2: s.mode === 'horizontal' && s.second ? start : null };
  }
  const tNow = r ? r.simT : run.tEnd;
  return { ball: run.posAt(tNow), ball2: run.posAt2 ? run.posAt2(tNow) : null };
}

function shownTable() {
  return state.results.byKey(state.shownKey ?? currentKey());
}

function openTable(key) {
  const table = state.results.byKey(key);
  state.overlay?.close();
  state.overlay = null;
  if (!table) return;
  const t = i18n.t;
  const lang = i18n.lang();
  const handle = openDataTable(tableModel(table, { t, lang }), {
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
      notices.show('export', () => i18n.t('strobe.exportFailed', { w, h }));
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

function onAction(type, value) {
  if (type === 'selectTable') {
    state.shownKey = value || null;
    render();
    return;
  }
  if (type === 'openTable') {
    const tb = shownTable();
    if (tb && state.views.table) openTable(tb.key);
    return;
  }
  if (type === 'openStrobe') {
    const tb = shownTable();
    if (tb && state.views.strobe) openStrobeView(tb.key);
    return;
  }
  if (state.running) return;
  if (type === 'run') {
    startRun();
    return;
  }
  const s = state.settings;
  const lk = (k) => state.locked.has(k);
  let next = s;
  switch (type) {
    case 'mode': if (!lk('mode')) next = withMode(s, value); break;
    case 'scale': if (!lk('scale')) next = withScale(s, value); break;
    case 'dt': if (!lk('dt')) next = withDt(s, value); break;
    case 'slow': next = withSlow(s, value); break;
    case 'second': if (!lk('second')) next = withSecond(s, value); break;
    case 'grid': if (!lk('grid')) next = withGrid(s, value); break;
    default: return;
  }
  if (next === s) return;
  applySettings(next);
}

let compactCache = { id: null, model: null };
function compactModelFor(shown, lang) {
  const id = `${shown.key}|${shown.runs.length}|${lang}`;
  if (compactCache.id !== id) compactCache = { id, model: tableModel(shown, { t: i18n.t, lang }) };
  return compactCache.model;
}

function resultsVM(lang) {
  const t = i18n.t;
  const tables = state.results.tables();
  const cur = currentKey();
  const shown = shownTable();
  const shownKey = state.shownKey ?? cur;
  return {
    tables: tables.map((tb) => ({ key: tb.key, label: t('results.option', { n: tb.index, m: tb.runs.length }) })),
    shownKey,
    shownIsOther: !!shown && shownKey !== cur,
    otherText: shown ? t('results.other', { n: shown.index }) : '',
    showCompact: state.views.table, // view=strobe&lock=1: x, y skolēns nolasa tikai no attēla
    compactModel: shown ? compactModelFor(shown, lang) : null,
    canTable: state.views.table && !!shown,
    canStrobe: state.views.strobe && !!shown,
  };
}

function render() {
  if (!view) return;
  document.getElementById('drawing').classList.toggle('running', !!state.running);
  const s = state.settings;
  const lang = i18n.lang();
  const lay = layout();
  const pos = ballPositions();
  drawScene(view.ctx, lay, {
    settings: s, derived: derive(s), colors: theme.colors(), t: i18n.t, lang, ball: pos.ball, ball2: pos.ball2, showGrid: s.grid,
  });
  panel.render({
    settings: s, locked: state.locked, hidden: state.hidden, running: state.running, lang,
    fixedText: study ? fixedSummary(s, state.hidden, { t: i18n.t, lang }) : '',
    hasTableForSettings: !!state.results.byKey(currentKey()),
    results: resultsVM(lang),
  });
  const items = handleItems(lay, s, lang);
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
  setSettings(next) {
    state.settings = next;
    resetAfterChange();
    render();
  },
};
render();
