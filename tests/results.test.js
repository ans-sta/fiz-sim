import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createResults, tableModel } from '../assets/rolling-ball/results.js';
import { simulateRun } from '../assets/rolling-ball/experiment.js';
import { defaultSettings, withH, withLevel, withTimer, withAlpha, settingsKey } from '../assets/rolling-ball/model.js';
import { makeT } from '../assets/translate.js';
import { STRINGS } from '../assets/rolling-ball/i18n.js';

const cfg = { seed: 482913, noise: 1, traps: [] };
const lv = { t: makeT(STRINGS, () => 'lv'), lang: 'lv' };
const en = { t: makeT(STRINGS, () => 'en'), lang: 'en' };

function runInto(results, s, n = 1) {
  const key = settingsKey(s, cfg);
  for (let i = 0; i < n; i++) {
    const run = simulateRun(s, { ...cfg, repeat: results.nextRepeat(key) });
    results.add(s, run, cfg);
  }
  return results.byKey(key);
}

test('runs land in the table of their own settings; returning continues that table (Review Focus 2)', () => {
  const r = createResults();
  const a = defaultSettings();
  const b = withH(a, 5);
  runInto(r, a, 2);
  runInto(r, b, 1);
  const t = runInto(r, a, 1);
  assert.equal(r.tables().length, 2);
  assert.equal(t.index, 1);
  assert.deepEqual(t.runs.map((x) => x.repeat), [1, 2, 3]);
  assert.equal(r.byKey(settingsKey(b, cfg)).index, 2);
  assert.equal(r.nextRepeat(settingsKey(a, cfg)), 4);
  assert.equal(r.nextRepeat('nav-tadas'), 1);
});

test('table keeps a copy of the settings', () => {
  const r = createResults();
  const s = defaultSettings();
  const t = runInto(r, s, 1);
  s.gates.push(99);
  assert.equal(t.settings.gates.length, 5);
});

test('level 3 model: t column, one x column per run, blanks for shorter runs', () => {
  const r = createResults();
  const t = runInto(r, defaultSettings(), 3);
  const m = tableModel(t, lv);
  assert.equal(m.title, '1. tabula. Lodītes koordināta x atkarībā no laika t');
  assert.deepEqual(m.columns.map((c) => c.label), ['t, s', 'x₁, cm (±0,5 cm)', 'x₂, cm (±0,5 cm)', 'x₃, cm (±0,5 cm)']);
  assert.deepEqual(m.columns.map((c) => c.decimals), [1, 1, 1, 1]);
  const longest = Math.max(...t.runs.map((x) => x.level3.samples.length));
  assert.equal(m.rows.length, longest);
  assert.equal(m.rows[1][0], 0.2);
  for (const row of m.rows) assert.equal(row.length, 4);
  assert.equal(m.filename, 'lodite-tabula-1');
});

test('level 3 settings line (LV and EN)', () => {
  const r = createResults();
  const t = runInto(r, defaultSettings(), 1);
  assert.equal(
    tableModel(t, lv).settingsLine,
    'Iestatījumi: L = 80 cm; h = 3,0 cm (α = 2,1°); lodīte: tērauds, Ø 16 mm, 16,8 g; renīte; kustības sākumpunkts x₀ = 0,0 cm; Δt = 0,2 s; sēkla 482913',
  );
  assert.equal(
    tableModel(t, en).settingsLine,
    'Settings: L = 80 cm; h = 3.0 cm (α = 2.1°); ball: steel, Ø 16 mm, 16.8 g; groove; release point x₀ = 0.0 cm; Δt = 0.2 s; seed 482913',
  );
});

test('α-mode puts α first in the settings line', () => {
  const r = createResults();
  const t = runInto(r, withAlpha(defaultSettings(), 3), 1);
  assert.ok(tableModel(t, lv).settingsLine.includes('α = 3,0° (h = 4,2 cm)'));
});

test('level 1 model: one row, t₁ t₂ columns with ±0,10 s', () => {
  const r = createResults();
  const t = runInto(r, withLevel(defaultSettings(), 1), 2);
  const m = tableModel(t, lv);
  assert.equal(m.title, '1. tabula. Laiks t, kurā lodīte noripo no starta līdz finišam');
  assert.deepEqual(m.columns.map((c) => c.label), ['t₁, s (±0,10 s)', 't₂, s (±0,10 s)']);
  assert.deepEqual(m.columns.map((c) => c.decimals), [2, 2]);
  assert.equal(m.rows.length, 1);
  assert.ok(m.settingsLine.includes('finišs x = 70,0 cm'));
});

test('level 2 model: x column then t columns; photogates 3 decimals, stopwatches 2', () => {
  const r = createResults();
  const g = tableModel(runInto(r, withLevel(defaultSettings(), 2), 2), lv);
  assert.deepEqual(g.columns.map((c) => c.label), ['x, cm (±0,2 cm)', 't₁, s (±0,001 s)', 't₂, s (±0,001 s)']);
  assert.deepEqual(g.columns.map((c) => c.decimals), [1, 3, 3]);
  assert.deepEqual(g.rows.map((row) => row[0]), [14, 28, 42, 56, 70]);
  assert.ok(g.settingsLine.includes('fotovārti'));
  const h = tableModel(runInto(r, withTimer(withLevel(defaultSettings(), 2), 'hand'), 1), lv);
  assert.deepEqual(h.columns.map((c) => c.label), ['x, cm (±0,2 cm)', 't₁, s (±0,10 s)']);
  assert.equal(h.title.startsWith('2. tabula.'), true);
});

test('student output has only t and x columns (spec 12.10)', () => {
  const r = createResults();
  for (const level of [1, 2, 3]) {
    const m = tableModel(runInto(r, withLevel(defaultSettings(), level), 2), lv);
    for (const c of m.columns) assert.ok(/^(t|x)[₀-₉]*, (s|cm)/.test(c.label), c.label);
  }
});
