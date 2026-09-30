import { createI18n, createTheme, mountTitleBlock, setupCanvas } from '../sim-core.js';
import { STRINGS } from './i18n.js';
import { defaultSettings, derive } from './model.js';
import { sceneLayout, drawScene } from './scene.js';
import { formatNumber } from '../measure/format.js';

const i18n = createI18n(STRINGS);
const theme = createTheme();
mountTitleBlock(document.getElementById('titleblock'), { i18n, theme, sheet: 'K-01', topicKey: 'tb.topicValue' });
i18n.apply();

const state = {
  settings: defaultSettings(),
  drag: null, // { id, fit: { L, alphaRad } } — mērogs velkot nemainās
  ball: { x: null, angle: 0 }, // null → lodīte stāv kustības sākumpunktā
};

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

function render() {
  if (!view) return;
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
}

theme.onChange(render);
i18n.onChange(render);
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
