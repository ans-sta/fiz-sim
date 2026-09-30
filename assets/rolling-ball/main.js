import { createI18n, createTheme, mountTitleBlock, setupCanvas } from '../sim-core.js';
import { STRINGS } from './i18n.js';
import {
  derive, withL, withH, withAlpha, withX0, withGate, withGateCount, withLevel, withTimer, withDt, withSlow,
  withAngleMode, withTape, withProfile, withBall, L_MIN, L_MAX, ALPHA_MAX, STEP, hMax, x0Max,
} from './model.js';
import { ballById, ballFits, GROOVE_W } from './balls.js';
import { settingsFromURL, warningText } from './params.js';
import { sceneLayout, drawScene, handleAnchors, valueFromPointer, ballCenter, ARC_R } from './scene.js';
import { createPanel } from './panel.js';
import { createHandles } from './handles.js';
import { createNotices } from '../measure/notices.js';
import { formatNumber } from '../measure/format.js';

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
  running: false,
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
  labels: { decrease: () => i18n.t('dims.decrease'), increase: () => i18n.t('dims.increase') },
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
      base.labelText = `${o.labelText} ${fixed}`;
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
    const tight = a.gates.some((g, i) => i > 0 && Math.hypot(g.x - a.gates[i - 1].x, g.y - a.gates[i - 1].y) < 90);
    s.gates.forEach((x, i) => {
      add('gate', {
        id: `gate${i}`, kind: 'diamond', x: a.gates[i].x, y: a.gates[i].y,
        labelText: tight && state.selected !== `gate${i}` ? '' : `x = ${num(x, 1)} cm`, labelX: a.gates[i].x, labelY: a.gates[i].y + 18,
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
  state.settings = next;
  state.ball = { x: null, angle: 0 };
  render();
}

function onAction(type, value) {
  if (state.running) return;
  const s = state.settings;
  const lk = (k) => state.locked.has(k);
  switch (type) {
    case 'level': if (!lk('level')) state.settings = withLevel(s, value); break;
    case 'timer': if (!lk('timer')) state.settings = withTimer(s, value); break;
    case 'gateCount': if (!lk('gates')) state.settings = withGateCount(s, s.gates.length + value); break;
    case 'dt': if (!lk('dt')) state.settings = withDt(s, value); break;
    case 'slow': state.settings = withSlow(s, value); break;
    case 'tape': if (!lk('tape')) state.settings = withTape(s, value); break;
    case 'profile': if (!lk('profile')) state.settings = withProfile(s, value); break;
    case 'angleMode': if (!lk('h') && !lk('alpha')) state.settings = withAngleMode(s, value); break;
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
      state.settings = withBall(s, value);
      break;
    }
    case 'run': return; // Task 12
    default: return;
  }
  state.ball = { x: null, angle: 0 };
  render();
}

function render() {
  if (!view) return;
  document.getElementById('drawing').classList.toggle('running', state.running);
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
    stopwatchText: `${formatNumber(0, 2, lang)} s`,
    gateTexts: s.gates.map(() => null),
    showTape: s.tape,
  });
  panel.render({ settings: s, derived: d, locked: state.locked, running: state.running, lang, hasTableForSettings: false });
  handles.update(handleItems(layout(), s, d, lang));
}

theme.onChange(render);
i18n.onChange(() => {
  notices.refresh();
  render();
});
document.fonts.ready.then(render);

// Testu āķis pārlūka pārbaudēm (Playwright): nolasīt stāvokli un mainīt iestatījumus.
window.__rb = {
  get state() {
    return state;
  },
  setSettings(next) {
    state.settings = next;
    render();
  },
};
render();
