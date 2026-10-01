import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createResults, tableModel, settingsLine } from '../assets/projectile/results.js';
import { simulateRun } from '../assets/projectile/experiment.js';
import { defaultSettings, withMode, withScale, withV0, withH, settingsKey } from '../assets/projectile/model.js';
import { makeT } from '../assets/translate.js';
import { STRINGS } from '../assets/projectile/i18n.js';
import { toTSV } from '../assets/measure/table-export.js';

const cfg = { seed: 123456, noise: 1, traps: [] };
const lv = { t: makeT(STRINGS, () => 'lv'), lang: 'lv' };
const en = { t: makeT(STRINGS, () => 'en'), lang: 'en' };

function runInto(results, s, n = 1) {
  const key = settingsKey(s, cfg);
  for (let i = 0; i < n; i++) results.add(s, simulateRun(s, { ...cfg, repeat: results.nextRepeat(key) }), cfg);
  return results.byKey(key);
}

test('alternating settings: each run in its own table, numbering continues (Review Focus 3)', () => {
  const r = createResults();
  const a = defaultSettings();
  const b = withScale(a, 'tower');
  runInto(r, a, 2);
  runInto(r, b, 1);
  const t = runInto(r, a, 1);
  assert.equal(r.tables().length, 2);
  assert.equal(t.index, 1);
  assert.deepEqual(t.runs.map((x) => x.repeat), [1, 2, 3]);
  assert.equal('level' in t, false);
});

test('horizontal: t, then an x and a y column per run, blanks for shorter runs', () => {
  const r = createResults();
  const t = runInto(r, defaultSettings(), 2);
  const m = tableModel(t, lv);
  assert.equal(m.title, '1. tabula. Bumbiņas koordinātas x un y atkarībā no laika t');
  assert.deepEqual(m.columns.map((c) => c.label), ['t, s', 'x₁, cm (±0,5 cm)', 'y₁, cm (±0,5 cm)', 'x₂, cm (±0,5 cm)', 'y₂, cm (±0,5 cm)']);
  assert.deepEqual(m.columns.map((c) => c.decimals), [2, 1, 1, 1, 1]);
  const longest = Math.max(...t.runs.map((x) => x.samples.length));
  assert.equal(m.rows.length, longest);
  assert.equal(m.rows[1][0], 0.05);
  for (const row of m.rows) assert.equal(row.length, 5);
  assert.equal(m.rows[0][1], t.runs[0].samples[0].x);
  assert.equal(m.rows[0][2], t.runs[0].samples[0].y);
  assert.equal(m.filename, 'sviedieni-tabula-1');
});

test('vertical: only t and y columns; tower units and Δt decimals', () => {
  const r = createResults();
  const s = withV0(withMode(withScale(defaultSettings(), 'tower'), 'vertical'), -5);
  const m = tableModel(runInto(r, s, 2), lv);
  assert.equal(m.title, '1. tabula. Bumbiņas koordināta y atkarībā no laika t');
  assert.deepEqual(m.columns.map((c) => c.label), ['t, s', 'y₁, m (±0,1 m)', 'y₂, m (±0,1 m)']);
  assert.deepEqual(m.columns.map((c) => c.decimals), [1, 1, 1]);
});

test('only directly readable quantities: every column is t, x or y', () => {
  const r = createResults();
  for (const s of [defaultSettings(), withMode(defaultSettings(), 'oblique'), withMode(defaultSettings(), 'vertical')]) {
    const m = tableModel(runInto(r, withH(s, 120), 3), en);
    for (const c of m.columns) assert.match(c.label, /^(t|x|y)/);
  }
});

test('settings line LV and EN', () => {
  const r = createResults();
  const t = runInto(r, defaultSettings(), 1);
  assert.equal(settingsLine(t, lv), 'Iestatījumi: horizontālais sviediens; galds; h = 80 cm; v₀ = 150 cm/s; Δt = 0,05 s; sēkla 123456');
  assert.equal(settingsLine(t, en), 'Settings: horizontal throw; table; h = 80 cm; v₀ = 150 cm/s; Δt = 0.05 s; seed 123456');
  const down = runInto(r, withV0(withMode(withScale(defaultSettings(), 'tower'), 'vertical'), -5), 1);
  assert.equal(settingsLine(down, lv), 'Iestatījumi: kritiens vai vertikālais sviediens; tornis; h = 20,0 m; v₀ = 5,0 m/s uz leju; Δt = 0,2 s; sēkla 123456');
  const free = runInto(r, withMode(defaultSettings(), 'vertical'), 1);
  assert.ok(settingsLine(free, lv).includes('v₀ = 150 cm/s uz augšu'));
  const zero = runInto(r, withV0(withMode(defaultSettings(), 'vertical'), 0), 1);
  assert.ok(settingsLine(zero, lv).includes('v₀ = 0 (brīvā krišana)'));
  const obl = runInto(r, withMode(defaultSettings(), 'oblique'), 1);
  assert.ok(settingsLine(obl, lv).includes('slīpais sviediens; galds; h = 80 cm; v₀ = 150 cm/s; α = 45°'));
});

test('TSV export has the title, the settings line and the header', () => {
  const r = createResults();
  const m = tableModel(runInto(r, defaultSettings(), 1), lv);
  const lines = toTSV(m, 'lv').split('\n');
  assert.equal(lines[0], m.title);
  assert.equal(lines[1], m.settingsLine);
  assert.equal(lines[2], 't, s\tx₁, cm (±0,5 cm)\ty₁, cm (±0,5 cm)');
});
