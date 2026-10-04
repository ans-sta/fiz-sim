import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quantityRows, quantityState, measureVM, LIVE_ROWS } from '../assets/rolling-ball/hud-model.js';
import { defaultSettings, withLevel, withTimer, withProfile, withBall, withAlpha, settingsKey, seriesKey } from '../assets/rolling-ball/model.js';
import { STUDIES } from '../assets/rolling-ball/studies.js';
import { LOCKABLE } from '../assets/rolling-ball/params.js';
import { studyFixed } from '../assets/measure/studies.js';
import { simulateRun } from '../assets/rolling-ball/experiment.js';
import { createResults, tableModel } from '../assets/rolling-ball/results.js';
import { makeT } from '../assets/translate.js';
import { STRINGS } from '../assets/rolling-ball/i18n.js';

const lv = { t: makeT(STRINGS, () => 'lv'), lang: 'lv' };
const en = { t: makeT(STRINGS, () => 'en'), lang: 'en' };
const cfg = { seed: 482913, noise: 1, traps: [] };
const by = (id) => STUDIES.find((s) => s.id === id);
const full = (extra = {}) => ({ locked: new Set(), hidden: new Set(), study: null, ...lv, ...extra });
const inStudy = (id, urlLocked = []) => {
  const study = by(id);
  const hidden = studyFixed(study, LOCKABLE);
  return { locked: new Set([...urlLocked, ...hidden]), hidden, study, ...lv };
};
const keys = (rows, group) => rows.filter((r) => r.group === group).map((r) => r.key);
const row = (rows, key) => rows.find((r) => r.key === key);

test('full control, level 3: α, h, L, Δt; more: x₀, ball, surface, measure, tape, slow motion; all editable', () => {
  const rows = quantityRows(defaultSettings(), full());
  assert.deepEqual(keys(rows, 'main'), ['alpha', 'h', 'L', 'dt']);
  assert.deepEqual(keys(rows, 'more'), ['x0', 'ball', 'profile', 'level', 'tape', 'slow']);
  for (const r of rows) assert.equal(r.state, 'editable', r.key);
  const a = row(rows, 'alpha');
  assert.deepEqual([a.symbol, a.kind, a.min, a.max, a.step, a.valueText, a.minText, a.maxText], ['α', 'range', 0, 15, 0.1, '2,1°', '0°', '15°']);
  const h = row(rows, 'h');
  assert.deepEqual([h.min, h.max, h.step, h.value, h.valueText, h.maxText], [0, 20.7, 0.1, 3, '3,0 cm', '20,7 cm']);
  const L = row(rows, 'L');
  assert.deepEqual([L.min, L.max, L.step, L.valueText, L.minText, L.maxText], [50, 200, 1, '80 cm', '50 cm', '200 cm']);
  const dt = row(rows, 'dt');
  assert.deepEqual([dt.kind, dt.min, dt.max, dt.step], ['range', 0.1, 2, 0.1]);
  assert.equal(dt.valueText, '0,2 s');
  const x0 = row(rows, 'x0');
  assert.deepEqual([x0.symbol, x0.min, x0.max, x0.step, x0.valueText], ['x₀', 0, 65, 0.5, '0,0 cm']);
  assert.deepEqual(row(rows, 'level').choices.map((c) => c.label), ['1 · laiks', '2 · t(x)', '3 · x(t)']);
  assert.deepEqual(row(rows, 'slow').choices.map((c) => [c.value, c.label]), [[false, '×1'], [true, '×0,25']]);
  assert.deepEqual(row(rows, 'tape').choices.map((c) => [c.value, c.label]), [[true, 'rāda'], [false, 'nerāda']]);
  assert.equal(row(rows, 'tape').valueText, 'rāda');
});

test('full control, level 2: gate count row (2–6) in the main group, timer in more, no slow motion', () => {
  const rows = quantityRows(withLevel(defaultSettings(), 2), full());
  assert.deepEqual(keys(rows, 'main'), ['alpha', 'h', 'L', 'gateCount']);
  assert.deepEqual(keys(rows, 'more'), ['x0', 'ball', 'profile', 'level', 'timer', 'tape']);
  const g = row(rows, 'gateCount');
  assert.deepEqual([g.symbol, g.kind, g.min, g.max, g.step, g.value, g.valueText], ['vārti', 'range', 2, 6, 1, 5, '5']);
  assert.equal(row(quantityRows(withTimer(withLevel(defaultSettings(), 2), 'hand'), full()), 'gateCount').symbol, 'atzīmes');
  assert.deepEqual(row(rows, 'timer').choices.map((c) => c.label), ['fotovārti', 'hronometri']);
});

test('full control, level 1: α, h, L only in the main group', () => {
  const rows = quantityRows(withLevel(defaultSettings(), 1), full());
  assert.deepEqual(keys(rows, 'main'), ['alpha', 'h', 'L']);
  assert.deepEqual(keys(rows, 'more'), ['x0', 'ball', 'profile', 'level', 'tape']);
});

test('ball choices: all nine, short names; the ones that do not fit the groove are shown but marked unavailable', () => {
  const rows = quantityRows(defaultSettings(), full());
  const b = row(rows, 'ball');
  assert.equal(b.choices.length, 9);
  assert.equal(b.valueText, 'tērauds Ø 16');
  assert.deepEqual(b.choices.find((c) => c.value === 'pingpong40').label, 'galda teniss Ø 40');
  assert.equal(b.choices.find((c) => c.value === 'steel10').unavailable, true);
  assert.equal(b.choices.find((c) => c.value === 'steel16').unavailable, false);
  const flat = quantityRows(withBall(withProfile(defaultSettings(), 'flat'), 'steel10'), full());
  assert.equal(row(flat, 'ball').choices.find((c) => c.value === 'steel10').unavailable, false);
  assert.equal(row(flat, 'profile').choices.find((c) => c.value === 'groove').unavailable, true, 'this ball does not fit the groove');
  assert.equal(row(quantityRows(defaultSettings(), { ...full(), ...en }), 'ball').valueText, 'steel Ø 16');
});

test('study a(α): α, h and L editable, no more group', () => {
  const s = by('a').preset(defaultSettings());
  const rows = quantityRows(s, inStudy('a'));
  assert.deepEqual(rows.map((r) => [r.key, r.state, r.group]), [['alpha', 'editable', 'main'], ['h', 'editable', 'main'], ['L', 'editable', 'main']]);
});

test('study t(Δx): α, h, L and the gate count are editable; study x(Δt): α, h, L and Δt', () => {
  const t = quantityRows(by('t').preset(defaultSettings()), inStudy('t'));
  assert.deepEqual(t.map((r) => [r.key, r.state]), [['alpha', 'editable'], ['h', 'editable'], ['L', 'editable'], ['gateCount', 'editable']]);
  const x = quantityRows(by('x').preset(defaultSettings()), inStudy('x'));
  assert.deepEqual(x.map((r) => [r.key, r.state]), [['alpha', 'editable'], ['h', 'editable'], ['L', 'editable'], ['dt', 'editable']]);
});

test('study STROBOSKOPS: the tape, editable there, is listed in the main group', () => {
  const rows = quantityRows(by('strobe').preset(defaultSettings()), inStudy('strobe'));
  assert.deepEqual(rows.map((r) => [r.key, r.state, r.group]), [
    ['alpha', 'editable', 'main'], ['h', 'editable', 'main'], ['L', 'editable', 'main'], ['dt', 'editable', 'main'], ['tape', 'editable', 'main'],
  ]);
});

test('teacher link with lock: L, h, Δt FIKS.; α grey because it would change h', () => {
  const rows = quantityRows(defaultSettings(), full({ locked: new Set(['L', 'h', 'ball', 'level', 'dt', 'view']) }));
  const st = Object.fromEntries(rows.map((r) => [r.key, r.state]));
  assert.deepEqual([st.L, st.h, st.dt, st.alpha, st.ball, st.level, st.x0, st.tape], ['locked', 'locked', 'locked', 'fixed', 'locked', 'locked', 'editable', 'editable']);
});

test('quantityState maps gates and gate handles to the lock key gates', () => {
  const ctx = { locked: new Set(['gates']), hidden: new Set(), study: null };
  assert.equal(quantityState('gate', ctx), 'locked');
  assert.equal(quantityState('gateCount', ctx), 'locked');
  assert.equal(quantityState('x0', ctx), 'editable');
  const s = inStudy('t');
  assert.equal(quantityState('gate', s), 'editable');
  assert.equal(quantityState('x0', s), 'fixed');
  assert.equal(quantityState('L', s), 'editable');
  const a = inStudy('a', ['h']);
  assert.equal(quantityState('alpha', a), 'fixed', 'a URL-locked h fixes α too');
});

// ── MĒRĪJUMI ───────────────────────────────────────────

function vmFor(s, extra = {}) {
  return measureVM({
    settings: s, running: null, lastRun: null, shown: null, shownModel: null, tables: [], shownKey: settingsKey(s, cfg),
    views: { table: true, strobe: true }, ...lv, ...extra,
  });
}
const run1 = (s, repeat = 1) => simulateRun(s, { ...cfg, repeat });

test('level 1: “t = —” before a run, the stopwatch while running, then the measured time', () => {
  const s = withLevel(defaultSettings(), 1);
  const v0 = vmFor(s);
  assert.deepEqual([v0.symbol, v0.valueText, v0.unit, v0.live, v0.rows, v0.mini, v0.canOpen, v0.strobe], ['t', '—', 's', false, null, null, false, false]);
  const run = run1(s);
  const live = vmFor(s, { running: { run, simT: 1.234 } });
  assert.deepEqual([live.valueText, live.live], ['1,23', true]);
  const end = vmFor(s, { running: { run, simT: run.tEnd } });
  assert.equal(end.valueText, run.level1.t.toFixed(2).replace('.', ','));
  assert.equal(vmFor(s, { lastRun: run }).valueText, run.level1.t.toFixed(2).replace('.', ','));
});

test('level 2: big t of the last gate passed; a row per gate, the time once it is passed', () => {
  const s = withLevel(defaultSettings(), 2);
  const run = run1(s);
  const simT = (run.timeTo(s.gates[1]) + run.timeTo(s.gates[2])) / 2;
  const v = vmFor(s, { running: { run, simT } });
  assert.equal(v.symbol, 't');
  assert.equal(v.valueText, run.level2.gates[1].t.toFixed(3).replace('.', ','));
  assert.equal(v.rows.length, 5);
  assert.deepEqual(v.rows[0], { a: 'x = 14,0 cm', b: `t = ${run.level2.gates[0].t.toFixed(3).replace('.', ',')} s` });
  assert.deepEqual(v.rows[2], { a: 'x = 42,0 cm', b: 't = —' });
  const before = vmFor(s, { running: { run, simT: 0.01 } });
  assert.equal(before.valueText, '—');
  const after = vmFor(s, { lastRun: run });
  assert.equal(after.valueText, run.level2.gates[4].t.toFixed(3).replace('.', ','));
  assert.equal(after.rows[4].b.startsWith('t = '), true);
  const hand = withTimer(s, 'hand');
  const hr = run1(hand);
  assert.equal(vmFor(hand, { lastRun: hr }).valueText, hr.level2.gates[4].t.toFixed(2).replace('.', ','));
});

test('level 3: big x of the latest flash (live) and the last (t, x) pairs as they appear', () => {
  const s = defaultSettings();
  const run = run1(s);
  const p = run.level3.samples;
  const simT = p[6].t + run.truth.tau + 0.01;
  const v = vmFor(s, { running: { run, simT } });
  assert.deepEqual([v.symbol, v.unit, v.live], ['x', 'cm', true]);
  assert.equal(v.valueText, p[6].x.toFixed(1).replace('.', ','));
  assert.equal(v.rows.length, LIVE_ROWS);
  assert.deepEqual(v.rows[LIVE_ROWS - 1], { a: `t = ${p[6].t.toFixed(1).replace('.', ',')} s`, b: `x = ${p[6].x.toFixed(1).replace('.', ',')} cm` });
  const after = vmFor(s, { lastRun: run });
  assert.equal(after.valueText, p[p.length - 1].x.toFixed(1).replace('.', ','));
  assert.deepEqual(vmFor(s).rows, []);
});

test('level 3, view=strobe&lock=1: no x numbers, a note to read the strobe image, the strobe link', () => {
  const s = defaultSettings();
  const run = run1(s);
  const r = createResults();
  const tb = r.add(s, run, cfg);
  const v = vmFor(s, { lastRun: run, shown: tb, shownModel: tableModel(tb, lv), tables: r.tables(), views: { table: false, strobe: true } });
  assert.equal(v.valueText, '');
  assert.equal(v.note, STRINGS.lv['hud.readStrobe']);
  assert.equal(v.rows, null);
  assert.equal(v.mini, null);
  assert.equal(v.canOpen, false);
  assert.equal(v.strobe, true);
});

test('the full table opens from the 1st run, the tiny table shows from the 2nd; strobe only for level 3', () => {
  const s = withLevel(defaultSettings(), 1);
  const r = createResults();
  const key = seriesKey(s, cfg);
  const tb = r.add(s, run1(s), cfg, { tableKey: key });
  const one = vmFor(s, { shown: tb, shownModel: tableModel(tb, lv), tables: r.tables(), shownKey: key });
  assert.deepEqual([one.canOpen, one.mini, one.strobe, one.tableChoices], [true, null, false, null]);
  r.add(s, run1(s, 2), cfg, { tableKey: key });
  const model = tableModel(tb, lv);
  const two = vmFor(s, { shown: tb, shownModel: model, tables: r.tables(), shownKey: key });
  assert.equal(two.mini, model);
  const l3 = defaultSettings();
  const t3 = r.add(l3, run1(l3), cfg);
  assert.equal(vmFor(l3, { shown: t3, shownModel: tableModel(t3, lv), tables: r.tables(), shownKey: t3.key }).strobe, true);
});

test('table choices: one per table, with “—” first when the current settings have no table yet', () => {
  const s = withLevel(defaultSettings(), 1);
  const r = createResults();
  const k1 = seriesKey(s, cfg);
  r.add(s, run1(s), cfg, { tableKey: k1 });
  const other = withAlpha(s, 5);
  const v = vmFor(other, { tables: r.tables(), shownKey: seriesKey(other, cfg) });
  assert.deepEqual(v.tableChoices, [{ key: '', label: '—' }, { key: k1, label: '1. tabula · mērījumi: 1' }]);
  assert.equal(v.shownKey, '');
  const own = vmFor(s, { shown: r.byKey(k1), shownModel: tableModel(r.byKey(k1), lv), tables: r.tables(), shownKey: k1 });
  assert.equal(own.tableChoices, null, 'one table and it is the shown one: no selector');
  assert.equal(own.shownKey, k1);
});

test('while running only the live rows; when idle the tiny table if there is one, else the rows', () => {
  const s = defaultSettings();
  const r = createResults();
  const a = run1(s, 1);
  const b = run1(s, 2);
  r.add(s, a, cfg);
  const tb = r.add(s, b, cfg);
  const base = { shown: tb, shownModel: tableModel(tb, lv), tables: r.tables(), shownKey: tb.key };
  const idle = vmFor(s, { ...base, lastRun: b });
  assert.ok(idle.mini);
  assert.equal(idle.rows, null);
  const c = run1(s, 3);
  const live = vmFor(s, { ...base, running: { run: c, simT: 0.5 } });
  assert.equal(live.mini, null);
  assert.ok(live.rows.length > 0);
  assert.equal(live.canOpen, true);
});
