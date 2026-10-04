import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quantityRows, relationsRows, phaseDeg } from '../assets/oscillation/hud-model.js';
import { defaultSettings } from '../assets/oscillation/model.js';
import { makeT } from '../assets/translate.js';
import { STRINGS } from '../assets/oscillation/i18n.js';

const lv = makeT(STRINGS, () => 'lv');
const en = makeT(STRINGS, () => 'en');

test('quantityRows: A, λ, v sliders and the helper-lines checkbox under the separator, Latvian numbers', () => {
  const rows = quantityRows(defaultSettings(), { lang: 'lv', t: lv });
  assert.deepEqual(rows.map((r) => r.key), ['A', 'lambda', 'v', 'lines']);
  const [A, L, V, lines] = rows;
  assert.deepEqual([A.symbol, A.valueText, A.kind, A.state, A.min, A.max, A.step, A.value], ['A', '30 cm', 'range', 'editable', 5, 40, 1, 30]);
  assert.deepEqual([L.symbol, L.valueText], ['λ', '100 cm']);
  assert.deepEqual([V.symbol, V.valueText, V.minText, V.maxText, V.min, V.max, V.step], ['v', '25 cm/s', '−100 cm/s', '100 cm/s', -100, 100, 5]);
  assert.equal(quantityRows({ ...defaultSettings(), v: -15 }, { lang: 'lv', t: lv })[2].valueText, '−15 cm/s');
  assert.deepEqual([lines.kind, lines.group, lines.value, lines.valueText], ['check', 'aside', true, 'rāda']);
  assert.equal(quantityRows({ ...defaultSettings(), lines: false }, { lang: 'lv', t: lv })[3].valueText, 'nerāda');
  assert.equal(quantityRows(defaultSettings(), { lang: 'en', t: en })[2].valueText, '25 cm/s');
});

test('relationsRows: T = λ/v, f, ω with formulas and units; φ live in degrees; v = 0 has no period', () => {
  const rows = relationsRows(defaultSettings(), Math.PI / 2, { lang: 'lv', t: lv });
  assert.deepEqual(rows.map((r) => [r.key, r.k, r.v, r.live]), [
    ['T', 'T = λ/v', '4,0 s', false],
    ['f', 'f = v/λ', '0,25 Hz', false],
    ['omega', 'ω = 2πv/λ', '1,57 rad/s', false],
    ['phi', 'φ', '90°', true],
  ]);
  assert.equal(relationsRows({ ...defaultSettings(), v: 15 }, 0, { lang: 'lv', t: lv })[0].v, '6,7 s');
  assert.equal(relationsRows({ ...defaultSettings(), v: -25 }, 0, { lang: 'en', t: en })[0].v, '4.0 s'); // direction does not change T
  assert.equal(relationsRows({ ...defaultSettings(), v: 0 }, 0, { lang: 'lv', t: lv })[0].v, '—');
  assert.equal(relationsRows(defaultSettings(), 0, { lang: 'en', t: en })[1].v, '0.25 Hz');
  assert.equal(phaseDeg(0), 0);
  assert.equal(phaseDeg(2 * Math.PI - 1e-9), 0);
  assert.equal(phaseDeg(Math.PI), 180);
});
