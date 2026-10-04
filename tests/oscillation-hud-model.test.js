import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quantityRows, relationsRows, phaseDeg } from '../assets/oscillation/hud-model.js';
import { defaultSettings } from '../assets/oscillation/model.js';
import { makeT } from '../assets/translate.js';
import { STRINGS } from '../assets/oscillation/i18n.js';

const lv = makeT(STRINGS, () => 'lv');
const en = makeT(STRINGS, () => 'en');

test('quantityRows: A, T, λ sliders and the helper-lines choice, Latvian numbers', () => {
  const rows = quantityRows(defaultSettings(), { lang: 'lv', t: lv });
  assert.deepEqual(rows.map((r) => r.key), ['A', 'T', 'lambda', 'lines']);
  const [A, T, L, lines] = rows;
  assert.deepEqual([A.symbol, A.valueText, A.kind, A.state, A.min, A.max, A.step, A.value], ['A', '20 cm', 'range', 'editable', 5, 40, 1, 20]);
  assert.deepEqual([T.symbol, T.valueText, T.minText, T.maxText], ['T', '4,0 s', '1 s', '8 s']);
  assert.deepEqual([L.symbol, L.valueText], ['λ', '100 cm']);
  assert.deepEqual([lines.kind, lines.value, lines.valueText], ['choice', true, 'rāda']);
  assert.deepEqual(lines.choices.map((c) => [c.value, c.label]), [[true, 'rāda'], [false, 'nerāda']]);
  assert.equal(quantityRows({ ...defaultSettings(), T: 2.5 }, { lang: 'en', t: en })[1].valueText, '2.5 s');
});

test('relationsRows: f, ω, v with formulas and units; φ live in degrees', () => {
  const rows = relationsRows(defaultSettings(), Math.PI / 2, { lang: 'lv', t: lv });
  assert.deepEqual(rows.map((r) => [r.key, r.k, r.v, r.live]), [
    ['f', 'f = 1/T', '0,25 Hz', false],
    ['omega', 'ω = 2π/T', '1,57 rad/s', false],
    ['v', 'v = λ/T', '25 cm/s', false],
    ['phi', 'φ', '90°', true],
  ]);
  assert.equal(relationsRows(defaultSettings(), 0, { lang: 'en', t: en })[0].v, '0.25 Hz');
  assert.equal(phaseDeg(0), 0);
  assert.equal(phaseDeg(2 * Math.PI - 1e-9), 0);
  assert.equal(phaseDeg(Math.PI), 180);
});

test('relationsRows: v keeps one decimal when λ/T is not a whole number', () => {
  const v = (lambda) => relationsRows({ ...defaultSettings(), lambda }, 0, { lang: 'lv', t: lv })[2].v;
  assert.equal(v(100), '25 cm/s');
  assert.equal(v(50), '12,5 cm/s');
  assert.equal(v(150), '37,5 cm/s');
});
