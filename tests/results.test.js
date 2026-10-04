import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createResults, tableModel } from '../assets/rolling-ball/results.js';
import { simulateRun } from '../assets/rolling-ball/experiment.js';
import { defaultSettings, withH, withLevel, withTimer, withAlpha, withBall, withL, settingsKey, seriesKey } from '../assets/rolling-ball/model.js';
import { toTSV, toCSV } from '../assets/measure/table-export.js';
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

test('level 1 model: one slope row, α and h columns then t₁ t₂ columns with ±0,10 s', () => {
  const r = createResults();
  const t = runInto(r, withLevel(defaultSettings(), 1), 2);
  const m = tableModel(t, lv);
  assert.equal(m.title, '1. tabula. Laiks t, kurā lodīte noripo no starta līdz finišam');
  assert.deepEqual(m.columns.map((c) => c.label), ['α, °', 'h, cm', 't₁, s (±0,10 s)', 't₂, s (±0,10 s)']);
  assert.deepEqual(m.columns.map((c) => c.decimals), [1, 1, 2, 2]);
  assert.equal(m.rows.length, 1);
  assert.deepEqual(m.rows[0].slice(0, 2), [2.1, 3], 'h = 3 cm on L = 80 cm → α = 2,1°');
  assert.ok(m.settingsLine.includes('finišs x = 70,0 cm'));
  assert.ok(!m.settingsLine.includes('h ='), 'the slope is in the rows, not in the settings line');
});

// Sērija (spec. izkārtojums 5): 1. līmenī slīpumi krājas vienā tabulā, katram sava rinda.
function runSeries(results, s, n = 1) {
  const tableKey = seriesKey(s, cfg);
  const runKey = settingsKey(s, cfg);
  const out = [];
  for (let i = 0; i < n; i++) {
    const run = simulateRun(s, { ...cfg, repeat: results.nextRepeat(tableKey, runKey) });
    results.add(s, run, cfg, { tableKey });
    out.push(run);
  }
  return { table: results.byKey(tableKey), runs: out };
}

test('seriesKey: level 1 ignores the slope and whether it is set by h or α; levels 2–3 = settingsKey', () => {
  const l1 = withLevel(defaultSettings(), 1);
  assert.equal(seriesKey(l1, cfg), seriesKey(withH(l1, 7), cfg));
  assert.equal(seriesKey(l1, cfg), seriesKey(withAlpha(l1, 3), cfg));
  assert.equal(seriesKey(withAlpha(l1, 3), cfg), seriesKey(withAlpha(l1, 9), cfg));
  assert.notEqual(seriesKey(l1, cfg), seriesKey(withBall(l1, 'glass25'), cfg));
  assert.notEqual(seriesKey(l1, cfg), seriesKey(withL(l1, 120), cfg));
  assert.notEqual(seriesKey(l1, cfg), seriesKey(l1, { noise: 0, traps: [] }));
  for (const level of [2, 3]) {
    const s = withLevel(defaultSettings(), level);
    assert.equal(seriesKey(s, cfg), settingsKey(s, cfg));
  }
});

test('level 1 series: three slopes × 3 runs → one table, 3 rows × 3 t columns, rows in order of first use', () => {
  const r = createResults();
  const base = withLevel(defaultSettings(), 1);
  for (const h of [5, 3, 8]) runSeries(r, withH(base, h), 3);
  assert.equal(r.tables().length, 1);
  const m = tableModel(r.tables()[0], lv);
  assert.deepEqual(m.columns.map((c) => c.label), ['α, °', 'h, cm', 't₁, s (±0,10 s)', 't₂, s (±0,10 s)', 't₃, s (±0,10 s)']);
  assert.deepEqual(m.rows.map((row) => row[1]), [5, 3, 8]);
  for (const row of m.rows) {
    assert.equal(row.length, 5);
    for (const v of row) assert.equal(typeof v, 'number');
  }
  assert.ok(m.rows[0][2] < m.rows[1][2], 'a steeper slope gives a shorter time');
});

test('level 1 series: each slope numbers its own repeats, so a row has the same noise as its own table had', () => {
  const r = createResults();
  const base = withLevel(defaultSettings(), 1);
  const a = runSeries(r, withH(base, 5), 2);
  const b = runSeries(r, withH(base, 3), 1);
  const a3 = runSeries(r, withH(base, 5), 1);
  assert.deepEqual([...a.runs, ...a3.runs].map((x) => x.repeat), [1, 2, 3]);
  assert.deepEqual(b.runs.map((x) => x.repeat), [1]);
  const alone = createResults();
  const solo = runSeries(alone, withH(base, 3), 1);
  assert.equal(b.runs[0].level1.t, solo.runs[0].level1.t);
  const m = tableModel(r.tables()[0], lv);
  assert.deepEqual(m.rows.map((row) => row.length), [5, 5]);
  assert.equal(m.rows[1][3], null, 'a shorter row is padded with blanks');
  assert.equal(m.rows[1][4], null);
});

test('level 1 series: a ball change starts a new table; slopes set by h and by α share one table with α and h', () => {
  const r = createResults();
  const base = withLevel(defaultSettings(), 1);
  runSeries(r, withH(base, 5), 1);
  runSeries(r, withBall(withH(base, 5), 'glass25'), 1);
  assert.equal(r.tables().length, 2);
  runSeries(r, withAlpha(base, 4), 1);
  runSeries(r, withAlpha(base, 6.5), 1);
  assert.equal(r.tables().length, 2, 'setting the slope by α continues the h table');
  const m = tableModel(r.tables()[0], en);
  assert.deepEqual(m.columns.slice(0, 2).map((c) => c.label), ['α, °', 'h, cm']);
  assert.deepEqual(m.rows.map((row) => row.slice(0, 2)), [[3.6, 5], [4, 5.6], [6.5, 9.1]]);
});

test('level 1 series exports: TSV and CSV have the slope column and blanks for missing repeats', () => {
  const r = createResults();
  const base = withLevel(defaultSettings(), 1);
  runSeries(r, withH(base, 5), 2);
  runSeries(r, withH(base, 3), 1);
  const m = tableModel(r.tables()[0], lv);
  const tsv = toTSV(m, 'lv').split('\n');
  assert.equal(tsv[0], m.title);
  assert.equal(tsv[2], 'α, °\th, cm\tt₁, s (±0,10 s)\tt₂, s (±0,10 s)');
  assert.match(tsv[3], /^3,6\t5,0\t\d+,\d\d\t\d+,\d\d$/);
  assert.match(tsv[4], /^2,1\t3,0\t\d+,\d\d\t$/);
  const csv = toCSV(m, 'lv').split('\r\n');
  assert.equal(csv[2], 'α, °;h, cm;t₁, s (±0,10 s);t₂, s (±0,10 s)');
  assert.match(csv[4], /^2,1;3,0;\d+,\d\d;$/);
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

test('student output has only t and x columns (spec 12.10); level 1 also the slope as α and h', () => {
  const r = createResults();
  for (const level of [1, 2, 3]) {
    const m = tableModel(runInto(r, withLevel(defaultSettings(), level), 2), lv);
    const cols = level === 1 ? m.columns.slice(2) : m.columns;
    if (level === 1) assert.deepEqual(m.columns.slice(0, 2).map((c) => c.label), ['α, °', 'h, cm']);
    for (const c of cols) assert.ok(/^(t|x)[₀-₉]*, (s|cm)/.test(c.label), c.label);
  }
});
