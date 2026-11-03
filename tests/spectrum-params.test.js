import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settingsFromURL, warningText, PARAM_SCHEMA, defaultSettings, TIMES, timeAtSlider, sliderOfTime } from '../assets/spectrum/params.js';
import { makeT } from '../assets/translate.js';
import { STRINGS } from '../assets/spectrum/i18n.js';

const lv = makeT(STRINGS, () => 'lv');

test('no params: spectrum view, sensitivity 5, spectrogram 10 s, nothing locked', () => {
  const r = settingsFromURL('');
  assert.deepEqual(r.settings, defaultSettings());
  assert.deepEqual(r.settings, { view: 'spectrum', sens: 5, time: 10 });
  assert.equal(r.locked.size, 0);
  assert.deepEqual(Object.keys(PARAM_SCHEMA).sort(), ['sens', 'time', 'view']);
});

test('time: 5, 10, 20, 30 or 60 s; another value → 10 s with a notice; the slider runs slow → fast', () => {
  const r = settingsFromURL('?time=60&lock=1');
  assert.equal(r.settings.time, 60);
  assert.deepEqual([...r.locked], ['time']);
  const w = settingsFromURL('?time=15');
  assert.equal(w.settings.time, 10);
  assert.equal(warningText(w.warnings[0], { t: lv, lang: 'lv' }), 'Saites parametra time vērtība “15” nav atļauta. Atļautās vērtības: 5; 10; 20; 30; 60. Izmantots time = 10.');
  assert.deepEqual([0, 1, 2, 3, 4].map(timeAtSlider), [60, 30, 20, 10, 5]);
  for (const s of TIMES) assert.equal(timeAtSlider(sliderOfTime(s)), s);
});

test('view and sens apply; lock=1 locks only what the link gives; unknown ignored', () => {
  const r = settingsFromURL('?view=spectrogram&sens=8&fbclid=x');
  assert.deepEqual(r.settings, { view: 'spectrogram', sens: 8, time: 10 });
  assert.equal(r.locked.size, 0);
  assert.deepEqual(r.warnings, []);
  const l = settingsFromURL('?view=spectrogram&lock=1');
  assert.deepEqual([...l.locked], ['view']);
  assert.equal(l.settings.sens, 5);
  assert.deepEqual([...settingsFromURL('?sens=3&view=spectrum&lock=true').locked].sort(), ['sens', 'view']);
});

test('out of range and wrong values: clamped or default, with a notice', () => {
  const c = settingsFromURL('?sens=99');
  assert.equal(c.settings.sens, 10);
  assert.equal(warningText(c.warnings[0], { t: lv, lang: 'lv' }), 'Saites parametrs sens=99 ir ārpus robežām (1–10). Izmantots sens = 10.');
  const v = settingsFromURL('?view=wave');
  assert.equal(v.settings.view, 'spectrum');
  assert.equal(warningText(v.warnings[0], { t: lv, lang: 'lv' }), 'Saites parametra view vērtība “wave” nav atļauta. Atļautās vērtības: spectrum; spectrogram. Izmantots view = spectrum.');
  const n = settingsFromURL('?sens=abc');
  assert.equal(n.settings.sens, 5);
  assert.equal(warningText(n.warnings[0], { t: lv, lang: 'lv' }), 'Saites parametrs sens=abc nav skaitlis. Izmantots sens = 5.');
});
