import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quantityRows, relationsRows, noteText } from '../assets/sound/hud-model.js';
import { defaultSettings, withView, withPhi, withPreset, withF, withSplit, withHarmonic } from '../assets/sound/model.js';
import { makeT } from '../assets/translate.js';
import { STRINGS } from '../assets/sound/i18n.js';

const lv = makeT(STRINGS, () => 'lv');
const en = makeT(STRINGS, () => 'en');

test('waveform view: f (log slider position), shape choice, volume under the separator', () => {
  const rows = quantityRows(defaultSettings(), { lang: 'lv', t: lv });
  assert.deepEqual(rows.map((r) => [r.key, r.kind, r.group]), [['f', 'range', 'main'], ['wave', 'choice', 'main'], ['vol', 'range', 'aside']]);
  const [f, wave, vol] = rows;
  assert.deepEqual([f.symbol, f.valueText, f.min, f.max, f.step, f.minText, f.maxText], ['f', '220,0 Hz', 0, 1000, 2, '40 Hz', '20 kHz']);
  assert.ok(Math.abs(f.value - 274.3) < 0.5); // log position of 220 Hz on 40…20 000
  assert.equal(quantityRows(withF(defaultSettings(), 12345), { lang: 'lv', t: lv })[0].valueText, '12345 Hz'); // above 1 kHz without decimals
  assert.deepEqual([wave.value, wave.valueText, wave.choices.length], ['sine', 'SINUSOĪDA', 4]);
  assert.deepEqual([vol.valueText, vol.value], ['60 %', 60]);
  assert.equal(quantityRows(defaultSettings(), { lang: 'en', t: en })[0].valueText, '220.0 Hz');
});

test('two sources view: amplitudes, φ, source checks, output choice', () => {
  const rows = quantityRows(withView(defaultSettings(), 'two'), { lang: 'lv', t: lv });
  assert.deepEqual(rows.map((r) => r.key), ['f', 'ampA', 'ampB', 'phi', 'srcA', 'srcB', 'out', 'vol']);
  assert.deepEqual([rows[1].symbol, rows[1].valueText, rows[1].step], ['A', '1,00', 0.05]);
  assert.deepEqual([rows[3].symbol, rows[3].valueText, rows[3].min, rows[3].max, rows[3].step], ['φ', '60°', 0, 360, 5]);
  assert.deepEqual([rows[4].kind, rows[4].group, rows[4].value, rows[4].valueText], ['check', 'aside', true, 'skan']);
  assert.deepEqual([rows[6].kind, rows[6].value, rows[6].valueText], ['choice', false, 'ABI KOPĀ']);
});

test('harmonics view: preset and instrument choices share the preset value, overlay check', () => {
  const s = withPreset(withView(defaultSettings(), 'harmonics'), 'flute');
  const rows = quantityRows(s, { lang: 'lv', t: lv });
  assert.deepEqual(rows.map((r) => r.key), ['f', 'preset', 'instr', 'overlay', 'vol']);
  assert.deepEqual([rows[1].valueText, rows[2].valueText], ['—', 'FLAUTA']);
  const edited = withHarmonic(s, 2, { amp: 0.3 });
  assert.deepEqual(quantityRows(edited, { lang: 'lv', t: lv }).slice(1, 3).map((r) => r.valueText), ['—', '—']);
  assert.equal(quantityRows(withPreset(s, 'square'), { lang: 'lv', t: lv })[1].valueText, 'TAISNSTŪRIS');
});

test('note text: 440 → la, 1. ; 445 → +20 c; English letters', () => {
  assert.equal(noteText(440, { lang: 'lv', t: lv }), 'la, 1.');
  assert.equal(noteText(445, { lang: 'lv', t: lv }), 'la, 1. +20 c');
  assert.equal(noteText(220, { lang: 'en', t: en }), 'A, small');
  assert.equal(noteText(20000, { lang: 'lv', t: lv }), 're♯, 7. +8 c'); // 20 kHz is just above C10 = 16 744 Hz — the octave name must exist
});

test('relations: T and λ in every view; two sources add φ in π, Δt and R (live) with a state note', () => {
  const w = relationsRows(defaultSettings(), { lang: 'lv', t: lv });
  assert.deepEqual(w.rows.map((r) => [r.key, r.v]), [['T', '4,55 ms'], ['lambda', '1,56 m'], ['note', 'la, mazā']]);
  assert.equal(w.note, lv('wave.about'));
  assert.equal(relationsRows(withF(defaultSettings(), 1000), { lang: 'lv', t: lv }).rows[1].v, '34,3 cm');
  const two = relationsRows(withPhi(withView(defaultSettings(), 'two'), 90), { lang: 'lv', t: lv });
  assert.deepEqual(two.rows.map((r) => [r.key, r.v, r.live]), [
    ['T', '4,55 ms', false], ['note', 'la, mazā', false], ['phi', 'π/2 rad', false], ['dt', '1,14 ms', false], ['R', '1,41', true],
  ]);
  assert.ok(two.note.startsWith('Daļēja pastiprināšanās.'));
  assert.ok(relationsRows(withSplit(withView(defaultSettings(), 'two'), true), { lang: 'lv', t: lv }).note.includes('kreisajā'));
  assert.equal(relationsRows(withPhi(withView(defaultSettings(), 'two'), 7), { lang: 'lv', t: lv }).rows[2].v, '0,03π rad');
  const h = relationsRows(withView(defaultSettings(), 'harmonics'), { lang: 'lv', t: lv });
  assert.deepEqual(h.rows[3], { key: 'count', k: 'ieslēgtas', v: '3 no 12', live: true });
  assert.equal(h.note, lv('harm.about'));
  assert.ok(relationsRows(withPreset(withView(defaultSettings(), 'harmonics'), 'trumpet'), { lang: 'en', t: en }).note.startsWith('Trumpet:'));
});
