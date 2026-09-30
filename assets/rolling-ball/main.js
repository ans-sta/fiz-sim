import { createI18n, createTheme, mountTitleBlock, setupCanvas, startLoop } from '../sim-core.js';
import { STRINGS } from './i18n.js';
import {
  derive, settingsKey, withL, withH, withAlpha, withX0, withGate, withGateCount, withLevel, withTimer, withDt, withSlow,
  withAngleMode, withTape, withProfile, withBall, changedLocked, L_MIN, L_MAX, ALPHA_MAX, STEP, hMax, x0Max,
} from './model.js';
import { ballById, ballFits, GROOVE_W } from './balls.js';
import { settingsFromURL, warningText } from './params.js';
import { sceneLayout, drawScene, handleAnchors, valueFromPointer, ballCenter, ARC_R } from './scene.js';
import { createPanel } from './panel.js';
import { createHandles } from './handles.js';
import { createNotices } from '../measure/notices.js';
import { formatNumber } from '../measure/format.js';
import { simulateRun } from './experiment.js';
import { createResults, tableModel } from './results.js';
import { openDataTable } from '../measure/data-table-view.js';
import { openStrobe } from './strobe.js';

document.getElementById('bootMsg')?.remove();
const i18n = createI18n(STRINGS);
const theme = createTheme();
mountTitleBlock(document.getElementById('titleblock'), { i18n, theme, sheet: 'K-01', topicKey: 'tb.topicValue' });
i18n.apply();

const url = settingsFromURL(location.search);
const state = {
  settings: url.settings,
  locked: url.locked,
  views: url.views,
  noise: url.noise,
  traps: url.traps,
  seed: url.seed,
  running: null, // { run, simT }
  results: createResults(),
  lastRun: null,
  shownKey: null,
  overlay: null, // { kind, key, close }
  selected: null,
  drag: null, // { id, fit: { L, alphaRad } } — mērogs velkot nemainās
  ball: { x: null, angle: 0 }, // null → lodīte stāv kustības sākumpunktā
};

const notices = createNotices(document.getElementById('notices'), { closeLabel: () => i18n.t('notice.close') });
url.warnings.forEach((w, i) => {
  notices.show(`url${i}`, () => warningText(w, { t: i18n.t, lang: i18n.lang() }));
});

const panel = createPanel(document.getElementById('controls'), { t: i18n.t, onAction });
const handles = createHandles(document.getElementById('handles'), {
  onChange: onHandleChange,
  onDragStart(id) {
    if (state.running) return false;
    const d = derive(state.settings);
    state.drag = { id, fit: { L: state.settings.L, alphaRad: d.alphaRad } };
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
let view = null; // setupCanvas kaldina render jau pirms atgriešanās
view = setupCanvas(canvas, () => render());

function layout() {
  if (!view) return null;
  const { w, h } = view.size();
  const d = derive(state.settings);
  const geo = { L: state.settings.L, alphaRad: d.alphaRad };
  return sceneLayout(w, h, geo, state.drag ? state.drag.fit : geo);
}

function isLocked(kind) {
  return state.locked.has(kind === 'gate' ? 'gates' : kind);
}

function handleItems(lay, s, d, lang) {
  const t = i18n.t;
  const a = handleAnchors(lay, s, d);
  const num = (v, dec) => formatNumber(v, dec, lang);
  const fixed = t('dims.fixed');
  const items = [];
  const add = (kind, o) => {
    const lockedQ = isLocked(kind === 'alpha' ? 'alpha' : kind);
    const base = { labelAnchor: 'center', labelClass: '', ...o };
    if (base.labelAnchor === 'center') base.labelX = Math.min(Math.max(base.labelX, 70), lay.width - 70); // etiķete nepazūd aiz malas
    if (lockedQ) {
      base.kind = 'none';
      base.labelClass = 'locked';
      base.labelText = o.labelText ? `${o.labelText} ${fixed}` : '';
    }
    items.push(base);
  };
  const up = lay.up;
  add('L', {
    id: 'L', kind: 'diamond', x: a.L.x, y: a.L.y,
    labelText: `L = ${num(s.L, 0)} cm`, labelX: a.L.x + up.x * 16, labelY: a.L.y + up.y * 16,
    ariaLabel: t('dims.L'), min: L_MIN, max: L_MAX, step: STEP.L, value: s.L, valueText: `${num(s.L, 0)} cm`,
  });
  const hMode = s.angleMode === 'h';
  add('h', {
    id: 'h', kind: hMode ? 'diamond' : 'none', x: a.h.x, y: a.h.y,
    labelText: `h = ${num(d.h, 1)} cm`, labelX: Math.max(a.h.x - 8, 90), labelY: lay.low.y - lay.high.y >= 24 ? (lay.high.y + lay.low.y) / 2 : lay.high.y + 16, // kā x₀ etiķete augšā, tāpēc īsai līnijai — zem galotnes
    labelAnchor: 'right', labelClass: hMode ? '' : 'derived',
    ariaLabel: t('dims.h'), min: 0, max: hMax(s.L), step: STEP.h, value: d.h, valueText: `${num(d.h, 1)} cm`,
  });
  add('alpha', {
    id: 'alpha', kind: hMode ? 'none' : 'diamond', x: a.alpha.x, y: a.alpha.y,
    labelText: `α = ${num(d.alphaDeg, 1)}°`, labelX: lay.low.x - ARC_R - 14, labelY: lay.tableY + 20, labelAnchor: 'right', // virs renītes tā aizsegtu renīti un lodīti
    labelClass: hMode ? 'derived' : '',
    ariaLabel: t('dims.alpha'), min: 0, max: ALPHA_MAX, step: STEP.alpha, value: d.alphaDeg, valueText: `${num(d.alphaDeg, 1)}°`,
  });
  const bc = ballCenter(lay, s.x0, d.rEff);
  const lift = d.r * lay.s + 16;
  add('x0', {
    id: 'x0', kind: 'ball', x: bc.x, y: bc.y,
    labelText: `x₀ = ${num(s.x0, 1)} cm`, labelX: bc.x + up.x * lift, labelY: bc.y + up.y * lift,
    ariaLabel: t('dims.x0'), min: 0, max: x0Max(s.L), step: STEP.x, value: s.x0, valueText: `${num(s.x0, 1)} cm`,
  });
  if (s.level === 2) {
    const gatesLocked = isLocked('gate');
    const minGap = gatesLocked ? 150 : 90; // nofiksētai etiķetei klāt nāk FIKS.
    const tight = a.gates.some((g, i) => i > 0 && Math.hypot(g.x - a.gates[i - 1].x, g.y - a.gates[i - 1].y) < minGap);
    s.gates.forEach((x, i) => {
      add('gate', {
        id: `gate${i}`, kind: 'diamond', x: a.gates[i].x, y: a.gates[i].y,
        labelText: tight && !gatesLocked && state.selected !== `gate${i}` ? '' : `x = ${num(x, 1)} cm`,
        labelX: a.gates[i].x, labelY: a.gates[i].y + 18 + (tight && gatesLocked ? i * 18 : 0), // nofiksētiem vārtiem vērtība vienmēr redzama; tuvos — katrs savā rindā
        ariaLabel: t(s.timer === 'gate' ? 'dims.gate' : 'dims.gateHand', { i: i + 1 }),
        min: 0, max: s.L, step: STEP.x, value: x, valueText: `${num(x, 1)} cm`,
      });
    });
  }
  return items;
}

function currentValue(kind, i) {
  const s = state.settings;
  return { L: s.L, h: derive(s).h, alpha: derive(s).alphaDeg, x0: s.x0, gate: s.gates[i] }[kind];
}

function onHandleChange(id, change) {
  if (state.running) return;
  const m = /^gate(\d+)$/.exec(id);
  const kind = m ? 'gate' : id;
  if (isLocked(kind)) return;
  const i = m ? Number(m[1]) : 0;
  const lay = layout();
  if (!lay) return;
  const s = state.settings;
  let v;
  if (change.pointer) v = valueFromPointer(kind, lay, change.pointer);
  else if ('delta' in change) v = currentValue(kind, i) + change.delta;
  else v = change.set;
  const next = {
    L: () => withL(s, v),
    h: () => withH(s, v),
    alpha: () => withAlpha(s, v),
    x0: () => withX0(s, v),
    gate: () => withGate(s, i, v),
  }[kind]();
  if (JSON.stringify(next) === JSON.stringify(s)) return;
  applySettings(next);
}

const LOCK_SYMBOLS = { L: 'L', h: 'h', alpha: 'α', x0: 'x₀', dt: 'Δt' };
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
  state.ball = { x: null, angle: 0 };
  state.lastRun = null;
  state.shownKey = null;
  notices.clear('noRoll');
}

function currentKey() {
  return settingsKey(state.settings, { noise: state.noise, traps: state.traps });
}

let stopLoop = () => {};

function startRun() {
  if (state.running) return;
  const key = currentKey();
  const run = simulateRun(state.settings, { seed: state.seed, repeat: state.results.nextRepeat(key), noise: state.noise, traps: state.traps });
  if (!run.rolls) {
    notices.show('noRoll', () => (run.hMin === null
      ? i18n.t('notice.noRollMax')
      : i18n.t('notice.noRoll', {
        h: formatNumber(run.hMin, 1, i18n.lang()),
        a: formatNumber(run.alphaMinDeg, 1, i18n.lang()),
      })));
    return;
  }
  notices.clear('noRoll');
  state.running = { run, simT: 0 };
  state.lastRun = null;
  state.shownKey = null;
  state.ball = { x: run.x0, angle: 0 };
  stopLoop = startLoop(step);
  render();
}

function step(dt) {
  const r = state.running;
  if (!r) return;
  const slow = state.settings.slow && state.settings.level === 3 ? 0.25 : 1;
  r.simT = Math.min(r.run.tEnd, r.simT + dt * slow);
  const x = r.run.xAt(r.simT);
  state.ball = { x, angle: (x - r.run.x0) / derive(state.settings).r };
  if (r.simT >= r.run.tEnd) finishRun();
  render();
}

function finishRun() {
  stopLoop();
  state.results.add(state.settings, state.running.run, { seed: state.seed, noise: state.noise, traps: state.traps });
  state.lastRun = state.running.run;
  state.running = null;
}

function shownTable() {
  return state.results.byKey(state.shownKey ?? currentKey());
}

function openTable(key) {
  const table = state.results.byKey(key);
  if (!table) {
    state.overlay?.close();
    state.overlay = null;
    return;
  }
  state.overlay?.close();
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
  if (!table || table.level !== 3) {
    state.overlay?.close();
    state.overlay = null;
    return;
  }
  state.overlay?.close();
  const handle = openStrobe({
    table,
    runIndex: runIndex ?? table.runs.length - 1,
    t: i18n.t,
    lang: i18n.lang(),
    colors: theme.colors(),
    tape: state.settings.tape,
    tapeLocked: state.locked.has('tape'),
    onTapeChange(on) {
      state.settings = withTape(state.settings, on);
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
    if (tb && state.views.strobe && tb.level === 3) openStrobeView(tb.key);
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
    case 'level': if (!lk('level')) next = withLevel(s, value); break;
    case 'timer': if (!lk('timer')) next = withTimer(s, value); break;
    case 'gateCount': if (!lk('gates')) next = withGateCount(s, s.gates.length + value); break;
    case 'dt': if (!lk('dt')) next = withDt(s, value); break;
    case 'slow': next = withSlow(s, value); break;
    case 'tape': if (!lk('tape')) next = withTape(s, value); break;
    case 'profile':
      if (!lk('profile')) {
        next = withProfile(s, value);
        notices.clear('ballNoFit');
      }
      break;
    case 'angleMode': if (!lk('h') && !lk('alpha')) next = withAngleMode(s, value); break;
    case 'ball': {
      if (lk('ball')) return;
      const ball = ballById(value);
      if (!ballFits(ball, s.profile)) {
        notices.show('ballNoFit', () => i18n.t('ball.noFit', {
          d: formatNumber(ball.d * 10, 0, i18n.lang()),
          w: formatNumber(GROOVE_W * 10, 1, i18n.lang()),
        }));
        return;
      }
      notices.clear('ballNoFit');
      next = withBall(s, value);
      break;
    }
    default: return;
  }
  applySettings(next);
}

function stopwatchValue() {
  if (state.settings.level !== 1) return 0;
  const r = state.running;
  if (r) return r.simT < r.run.timeTo(r.run.xf) ? r.simT : r.run.level1.t;
  return state.lastRun?.level1 ? state.lastRun.level1.t : 0;
}

function gateText(i, lang) {
  const s = state.settings;
  const r = state.running;
  const run = r ? (r.simT >= r.run.timeTo(s.gates[i]) ? r.run : null) : state.lastRun;
  const g = run?.level2?.gates[i];
  if (!g) return null;
  return `${formatNumber(g.t, s.timer === 'gate' ? 3 : 2, lang)} s`;
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
    showCompact: state.views.table, // view=strobe&lock=1: x vērtībām jābūt lasāmām tikai attēlā
    compactModel: shown ? compactModelFor(shown, lang) : null,
    canTable: state.views.table && !!shown,
    canStrobe: state.views.strobe && !!shown && shown.level === 3,
  };
}

function render() {
  if (!view) return;
  document.getElementById('drawing').classList.toggle('running', !!state.running);
  const s = state.settings;
  const d = derive(s);
  const lang = i18n.lang();
  drawScene(view.ctx, layout(), {
    settings: s,
    derived: d,
    colors: theme.colors(),
    t: i18n.t,
    lang,
    ballX: state.ball.x ?? s.x0,
    ballAngle: state.ball.angle,
    stopwatchText: `${formatNumber(stopwatchValue(), 2, lang)} s`,
    gateTexts: s.gates.map((_, i) => (s.level === 2 ? gateText(i, lang) : null)),
    showTape: s.tape,
  });
  panel.render({
    settings: s, derived: d, locked: state.locked, running: state.running, lang,
    hasTableForSettings: !!state.results.byKey(currentKey()),
    results: resultsVM(lang),
  });
  const items = handleItems(layout(), s, d, lang);
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
window.__rb = {
  get state() {
    return state;
  },
  setSettings(next) {
    state.settings = next;
    resetAfterChange();
    render();
  },
};
render();
