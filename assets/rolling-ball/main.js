import { createI18n, createTheme, mountTitleBlock, setupCanvas } from '../sim-core.js';
import { STRINGS } from './i18n.js';

const i18n = createI18n(STRINGS);
const theme = createTheme();
mountTitleBlock(document.getElementById('titleblock'), { i18n, theme, sheet: 'K-01', topicKey: 'tb.topicValue' });
i18n.apply();

const canvas = document.getElementById('scene');
let view = null; // setupCanvas kaldina redraw jau pirms atgriešanās
view = setupCanvas(canvas, () => redraw());

function redraw() {
  if (!view) return;
  const { w, h } = view.size();
  view.ctx.fillStyle = theme.colors().field;
  view.ctx.fillRect(0, 0, w, h);
}

theme.onChange(redraw);
redraw();
