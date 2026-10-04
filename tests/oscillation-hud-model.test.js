import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quantityRows, relationsRows, phaseDeg } from '../assets/oscillation/hud-model.js';
import { defaultSettings, withV } from '../assets/oscillation/model.js';
import { makeT } from '../assets/translate.js';
import { STRINGS } from '../assets/oscillation/i18n.js';

const lv = makeT(STRINGS, () => 'lv');
const en = makeT(STRINGS, () => 'en');

test('quantityRows: A, T, λ, v sliders and the helper-lines checkbox under the separator, Latvian numbers', () => {
  const rows = quantityRows(defaultSettings(), { lang: 'lv', t: lv });
  assert.deepEqual(rows.map((r) => r.key), ['A', 'T', 'lambda', 'v', 'lines']);
  const [A, T, L, V, lines] = rows;
  assert.deepEqual([A.symbol, A.valueText, A.kind, A.state, A.min, A.max, A.step, A.value], ['A', '30 cm', 'range', 'editable', 5, 40, 1, 30]);
  assert.deepEqual([T.symbol, T.valueText, T.minText, T.maxText], ['T', '4,0 s', '1 s', '8 s']);
  assert.deepEqual([L.symbol, L.valueText], ['λ', '100 cm']);
  assert.deepEqual([V.symbol, V.valueText, V.minText, V.maxText, V.min, V.max, V.step], ['v', '25 cm/s', '−100 cm/s', '100 cm/s', -100, 100, 5]);
  const adapted = withV(defaultSettings(), -10); // T adapts: v clamped to −12,5 (between steps), T = 8
  const r2 = quantityRows(adapted, { lang: 'lv', t: lv });
  assert.deepEqual([r2[1].valueText, r2[3].valueText], ['8,0 s', '−12,5 cm/s']);
  assert.deepEqual([lines.kind, lines.group, lines.value, lines.valueText], ['check', 'aside', true, 'rāda']);
  assert.equal(quantityRows({ ...defaultSettings(), lines: false }, { lang: 'lv', t: lv })[4].valueText, 'nerāda');
  assert.equal(quantityRows(defaultSettings(), { lang: 'en', t: en })[3].valueText, '25 cm/s');
});

test('relationsRows: f = 1/T, ω = 2π/T with formulas and units; φ live in degrees', () => {
  const rows = relationsRows(defaultSettings(), Math.PI / 2, { lang: 'lv', t: lv });
  assert.deepEqual(rows.map((r) => [r.key, r.k, r.v, r.live]), [
    ['f', 'f = 1/T', '0,25 Hz', false],
    ['omega', 'ω = 2π/T', '1,57 rad/s', false],
    ['phi', 'φ', '90°', true],
  ]);
  assert.equal(relationsRows(defaultSettings(), 0, { lang: 'en', t: en })[0].v, '0.25 Hz');
  assert.equal(phaseDeg(0), 0);
  assert.equal(phaseDeg(2 * Math.PI - 1e-9), 0);
  assert.equal(phaseDeg(Math.PI), 180);
});
