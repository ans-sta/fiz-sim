import { createI18n, createTheme, mountHeaderTools, mountTitleCells, setupCanvas, startLoop } from '../sim-core.js';
import { STRINGS } from './i18n.js';
import {
  derive, settingsKey, seriesKey, withL, withH, withAlpha, withX0, withGate, withGateCount, withLevel, withTimer, withDt, withSlow,
  withTape, withProfile, withBall, changedLocked, defaultSettings, L_MIN, L_MAX, ALPHA_MAX, STEP, hMax, x0Max,
} from './model.js';
import { ballById, ballFits, GROOVE_W } from './balls.js';
import { settingsFromURL, warningText, LOCKABLE } from './params.js';
import { sceneLayout, drawScene, handleAnchors, valueFromPointer, ballDraw, ballRadiusPx, H_LABEL_GAP } from './scene.js';
import { createHandles } from './handles.js';
import { createNotices } from '../measure/notices.js';
import { formatNumber } from '../measure/format.js';
import { simulateRun } from './experiment.js';
import { createResults, tableModel } from './results.js';
import { openDataTable } from '../measure/data-table-view.js';
import { openStrobe } from './strobe.js';
import { resolveRoute, studyFixed, filterStudyParams } from '../measure/studies.js';
import { STUDIES, SETTING_PARAMS, studyAngleMode } from './studies.js';
import { quantityRows, quantityState, measureVM } from './hud-model.js';
import { createQuantityList, createMeasureBox, createSettingsCorner, runSlotTop } from '../measure/hud.js';
import { legendScale } from '../measure/ui-scale.js';

document.getElementById('bootMsg')?.remove();
const i18n = createI18n(STRINGS);
const theme = createTheme();
const t = (key, vars) => i18n.t(key, vars);

const route = resolveRoute(location.search, { studies: STUDIES, settingParams: SETTING_PARAMS });
const study = route.kind === 'study' ? route.study : null;
// Pētījumā nofiksētie lielumi: tiek atteikti tāpat kā `lock`, sarakstā ir pelēki un bez FIKS.
const hidden = study ? studyFixed(study, LOCKABLE) : new Set();
// Pētījumā saites parametri nofiksētajiem lielumiem netiek ņemti vērā (paziņojums zemāk).
const linkParams = study ? filterStudyParams(location.search, hidden) : { search: location.search, ignored: [] };
const url = settingsFromURL(linkParams.search, study ? { base: study.preset(defaultSettings()) } : {});
const sheet = study ? `K-01 · ${study.no}` : 'K-01';

// Galvene: atpakaļ uz kartītēm; pētījuma nosaukums un numurs (spec. pētījumi 3); LV · EN · ◐ · ⛶ (spec. izkārtojums 7)
{
  const back = document.querySelector('header .back');
  back.href = location.pathname.split('/').pop() || 'rolling-ball.html';
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
  settings: study ? studyAngleMode(url.settings, study, url.locked) : url.settings,
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
  overlay: null, // { kind, key, close }
  selected: null,
  drag: null, // { id, fit, avoid } — mērogs velkot nemainās
  ball: { x: null, angle: 0 }, // null → lodīte stāv kustības sākumpunktā
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
    title: t('hud.quantities'), fixed: t('dims.fixed'), fixedTitle: t('dims.fixedTitle'), more: t('hud.more'), less: t('hud.less'),
    decrease: (name) => t('dims.decrease', { name }), increase: (name) => t('dims.increase', { name }),
  }),
  onChange: onQuantity,
});

const measures = createMeasureBox(hudRight, {
  labels: () => ({ title: t('hud.measurements'), open: t('hud.openTable'), strobe: t('results.strobe'), select: t('hud.tableSelect') }),
  lang: () => i18n.lang(),
  onOpen() {
    const tb = shownTable();
    if (tb && state.views.table) openTable(tb.key);
  },
  onStrobe() {
    const tb = shownTable();
    if (tb && state.views.strobe && tb.level === 3) openStrobeView(tb.key);
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
    state.drag = { id, fit: geometry(), avoid: measuresBox() };
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
let view = null; // setupCanvas kaldina render jau pirms atgriešanās
view = setupCanvas(canvas, () => {
  if (state.running) state.running.lay = null;
  render();
});

// MĒRĪJUMI augstums mainās (burti, mērījumi, tabuliņa) → renīte jāievieto no jauna.
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
}

function geometry() {
  const d = derive(state.settings);
  return { L: state.settings.L, alphaRad: d.alphaRad, ballR: ballRadiusPx(d) };
}

// MĒRĪJUMI rasējumā: renīte to apiet tikai, ja tas pārklātu konstrukciju; LIELUMI drīkst pārklāt (Ansis 04.10).
function measuresBox() {
  return { left: hudRight.offsetLeft, bottom: hudRight.offsetTop + hudRight.offsetHeight };
}

function layout() {
  if (!view) return null;
  if (state.running?.lay) return state.running.lay;
  const { w, h } = view.size();
  const geo = geometry();
  const lay = sceneLayout(w, h, geo, state.drag ? state.drag.fit : geo, {
    avoid: state.drag ? state.drag.avoid : measuresBox(),
    drawScale: state.drawScale,
  });
  if (state.running) state.running.lay = lay;
  return lay;
}

const editable = (key) => quantityState(key, access()) === 'editable';

function handleItems(lay, s, d, lang) {
  const a = handleAnchors(lay, s, d);
  const num = (v, dec) => formatNumber(v, dec, lang);
  const items = [];
  // Rasējumā tikai rombiņi un lieluma simbols; vērtības ir sarakstā LIELUMI (spec. izkārtojums 2.4).
  const add = (key, o) => {
    const on = editable(key);
    items.push({ labelAnchor: 'center', ...o, kind: on ? o.kind : 'none', labelClass: on ? 'sym' : 'sym locked' });
  };
  const up = lay.up;
  const k = legendScale(gear.textScale()); // simboli aug līdzi burtiem uz pusi — un tā attālums no roktura
  add('L', {
    id: 'L', kind: 'diamond', x: a.L.x, y: a.L.y,
    labelText: 'L', labelX: a.L.x + up.x * (8 + 8 * k), labelY: a.L.y + up.y * (8 + 8 * k),
    ariaLabel: t('dims.L'), min: L_MIN, max: L_MAX, step: STEP.L, value: s.L, valueText: `${num(s.L, 0)} cm`,
  });
  add('h', {
    id: 'h', kind: 'diamond', x: a.h.x, y: a.h.y,
    labelText: 'h', labelX: a.h.x - H_LABEL_GAP, labelY: lay.low.y - lay.high.y >= 24 ? (lay.high.y + lay.low.y) / 2 : lay.high.y + 16,
    labelAnchor: 'right',
    ariaLabel: t('dims.h'), min: 0, max: hMax(s.L), step: STEP.h, value: d.h, valueText: `${num(d.h, 1)} cm`,
  });
  add('alpha', {
    id: 'alpha', kind: 'diamond', x: a.alpha.x, y: a.alpha.y,
    labelText: 'α', labelX: a.alpha.x + up.x * (6 + 6 * k), labelY: a.alpha.y + up.y * (6 + 6 * k),
    ariaLabel: t('dims.alpha'), min: 0, max: ALPHA_MAX, step: STEP.alpha, value: d.alphaDeg, valueText: `${num(d.alphaDeg, 1)}°`,
  });
  const lift = ballDraw(d).R + 4 + 6 * k;
  add('x0', {
    id: 'x0', kind: 'ball', x: a.x0.x, y: a.x0.y,
    labelText: 'x₀', labelX: a.x0.x + up.x * lift - 4, labelY: a.x0.y + up.y * lift, labelAnchor: 'right', // pa labi ir STARTS karogs
    ariaLabel: t('dims.x0'), min: 0, max: x0Max(s.L), step: STEP.x, value: s.x0, valueText: `${num(s.x0, 1)} cm`,
  });
  if (s.level === 2) {
    s.gates.forEach((x, i) => {
      add('gate', {
        id: `gate${i}`, kind: 'diamond', x: a.gates[i].x, y: a.gates[i].y,
        labelText: '', labelX: a.gates[i].x, labelY: a.gates[i].y + 18, // numurs ir pie vārtu galotnes rasējumā
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
  if (!editable(kind)) return;
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

function showBallNoFit(ball) {
  notices.show('ballNoFit', () => t('ball.noFit', {
    d: formatNumber(ball.d * 10, 0, i18n.lang()),
    w: formatNumber(GROOVE_W * 10, 1, i18n.lang()),
  }));
}

// LIELUMI: lapa pati pielieto savu with* (noapaļo, ierobežo), pārbauda nofiksēto un pārzīmē.
function onQuantity(key, v) {
  if (state.running || !editable(key)) return;
  const s = state.settings;
  let next = s;
  switch (key) {
    case 'alpha': next = withAlpha(s, v); break;
    case 'h': next = withH(s, v); break;
    case 'L': next = withL(s, v); break;
    case 'x0': next = withX0(s, v); break;
    case 'gateCount': next = withGateCount(s, v); break;
    case 'dt': next = withDt(s, v); break;
    case 'level': next = withLevel(s, v); break;
    case 'timer': next = withTimer(s, v); break;
    case 'tape': next = withTape(s, v); break;
    case 'slow': next = withSlow(s, v); break;
    case 'profile': {
      const ball = ballById(s.ball);
      if (v === 'groove' && !ballFits(ball, 'groove')) {
        showBallNoFit(ball);
        return;
      }
      notices.clear('ballNoFit');
      next = withProfile(s, v);
      break;
    }
    case 'ball': {
      const ball = ballById(v);
      if (!ballFits(ball, s.profile)) {
        showBallNoFit(ball);
        return;
      }
      notices.clear('ballNoFit');
      next = withBall(s, v);
      break;
    }
    default: return;
  }
  if (JSON.stringify(next) === JSON.stringify(s) || !applySettings(next)) render(); // slīdnis atgriežas pie pieņemtās vērtības
}

const LOCK_SYMBOLS = { L: 'L', h: 'h', alpha: 'α', x0: 'x₀', dt: 'Δt' };
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
  state.ball = { x: null, angle: 0 };
  state.lastRun = null;
  state.shownKey = null;
  notices.clear('noRoll');
}

const cfg = () => ({ noise: state.noise, traps: state.traps });
const currentRunKey = () => settingsKey(state.settings, cfg());
const currentTableKey = () => seriesKey(state.settings, cfg()); // 1. līmenī — sērija (spec. izkārtojums 5)

// Pirmās palaišanas pogas vārds — nejauši viens no trim, vienreiz uz lapas atvēršanu (lai nemainās, velkot slīdni).
const START_KEY = ['run.start1', 'run.start2', 'run.start3'][Math.floor(Math.random() * 3)];

let stopLoop = () => {};

function startRun() {
  if (state.running) return;
  const repeat = state.results.nextRepeat(currentTableKey(), currentRunKey());
  const run = simulateRun(state.settings, { seed: state.seed, repeat, noise: state.noise, traps: state.traps });
  if (!run.rolls) {
    notices.show('noRoll', () => (run.hMin === null
      ? t('notice.noRollMax')
      : t('notice.noRoll', {
        h: formatNumber(run.hMin, 1, i18n.lang()),
        a: formatNumber(run.alphaMinDeg, 1, i18n.lang()),
      })));
    return;
  }
  notices.clear('noRoll');
  const lay = layout(); // pirms MĒRĪJUMI sāk mainīties
  state.running = { run, simT: 0, lay };
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
  state.results.add(state.settings, state.running.run, { seed: state.seed, noise: state.noise, traps: state.traps }, { tableKey: currentTableKey() });
  state.lastRun = state.running.run;
  state.running = null;
}

function shownTable() {
  return state.results.byKey(state.shownKey ?? currentTableKey());
}

function openTable(key) {
  const table = state.results.byKey(key);
  if (!table) {
    state.overlay?.close();
    state.overlay = null;
    return;
  }
  state.overlay?.close();
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

let modelCache = { id: null, model: null };
function modelFor(shown, lang) {
  const id = `${shown.key}|${shown.runs.length}|${lang}`;
  if (modelCache.id !== id) modelCache = { id, model: tableModel(shown, { t: i18n.t, lang }) };
  return modelCache.model;
}

function runLabel() {
  if (state.running) return t('run.running');
  const n = state.results.nextRepeat(currentTableKey(), currentRunKey());
  return n > 1 ? t('run.repeatN', { n }) : t(START_KEY); // pirmo reizi — viens no trim vārdiem, tad “↻ ATKĀRTOT 2×” …
}

function render() {
  if (!view) return;
  drawing.classList.toggle('running', !!state.running);
  const s = state.settings;
  const d = derive(s);
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
    shownKey: state.shownKey ?? currentTableKey(),
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

  const lay = layout();
  drawScene(view.ctx, lay, {
    settings: s,
    derived: d,
    colors: theme.colors(),
    t: i18n.t,
    lang,
    ballX: state.ball.x ?? s.x0,
    ballAngle: state.ball.angle,
    showTape: s.tape,
    legend: legendScale(gear.textScale()),
    avoid: { l: (w - runSlot.offsetWidth) / 2, r: (w + runSlot.offsetWidth) / 2 }, // poga zem zemes līnijas
  });
  gear.setDrawFit(lay.fill);
  // poga centrēta zem zemes, atstarpe — puse pogas augstuma; paziņojumi zem pogas (spec. izkārtojums 2.5–2.6)
  const runTop = runSlotTop(lay.tableY, runSlot.offsetHeight);
  runSlot.style.top = `${runTop}px`;
  drawing.style.setProperty('--notices-top', `${runTop + runSlot.offsetHeight + 10}px`);

  const items = handleItems(lay, s, d, lang);
  handles.update(items);
  if (state.selected && !items.some((it) => it.id === state.selected)) {
    state.selected = null;
    handles.setSelected(null);
  }
  // rakstlaukums tikai lielā rasējumā (datorā), telefonā tā nav
  const big = w >= 900 && h >= 560;
  titleSmall.hidden = !big;
  drawing.classList.toggle('has-title', big);
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
