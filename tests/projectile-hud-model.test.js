import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quantityRows, measureVM, LIVE_ROWS } from '../assets/projectile/hud-model.js';
import { defaultSettings } from '../assets/projectile/model.js';
import { STUDIES } from '../assets/projectile/studies.js';
import { LOCKABLE } from '../assets/projectile/params.js';
import { studyFixed } from '../assets/measure/studies.js';
import { simulateRun } from '../assets/projectile/experiment.js';
import { makeT } from '../assets/translate.js';
import { STRINGS } from '../assets/projectile/i18n.js';

const lv = makeT(STRINGS, () => 'lv');

test('full control, horizontal: h, v₀, Δt; more: mode, second ball, slow motion', () => {
  const rows = quantityRows(defaultSettings('horizontal'), { locked: new Set(), hidden: new Set(), study: null, lang: 'lv', t: lv });
  assert.deepEqual(rows.map((r) => [r.key, r.group, r.state]), [
    ['h', 'main', 'editable'], ['v0', 'main', 'editable'], ['dt', 'main', 'editable'],
    ['mode', 'more', 'editable'], ['second', 'more', 'editable'], ['slow', 'more', 'editable'],
  ]);
  const dt = rows.find((r) => r.key === 'dt');
  assert.deepEqual([dt.kind, dt.min, dt.max, dt.step, dt.valueText], ['range', 0.1, 2, 0.1, '0,2 s']);
  assert.equal(rows.find((r) => r.key === 'h').valueText, '20,0 m');
});
test('oblique has α; vertical v₀ is signed with ↑/↓', () => {
  const ob = quantityRows(defaultSettings('oblique'), { locked: new Set(), hidden: new Set(), study: null, lang: 'lv', t: lv });
  assert.ok(ob.some((r) => r.key === 'alpha' && r.valueText === '45°'));
  const up = quantityRows({ ...defaultSettings('vertical'), v0: 10 }, { locked: new Set(), hidden: new Set(), study: null, lang: 'lv', t: lv });
  const v = up.find((r) => r.key === 'v0');
  assert.deepEqual([v.min, v.max, v.valueText, v.minText, v.maxText], [-30, 30, '10,0 m/s ↑', '30 m/s ↓', '30 m/s ↑']);
  const dn = quantityRows({ ...defaultSettings('vertical'), v0: -5 }, { locked: new Set(), hidden: new Set(), study: null, lang: 'lv', t: lv });
  assert.equal(dn.find((r) => r.key === 'v0').valueText, '5,0 m/s ↓');
  const z = quantityRows(defaultSettings('vertical'), { locked: new Set(), hidden: new Set(), study: null, lang: 'lv', t: lv });
  assert.equal(z.find((r) => r.key === 'v0').valueText, '0,0 m/s');
});
test('studies: free fall h and Δt; horizontal has the second ball in the main group; no more group', () => {
  const free = STUDIES.find((x) => x.id === 'free');
  const rows = quantityRows(free.preset(defaultSettings()), { locked: new Set(), hidden: studyFixed(free, LOCKABLE), study: free, lang: 'lv', t: lv });
  assert.deepEqual(rows.map((r) => [r.key, r.state]), [['h', 'editable'], ['v0', 'fixed'], ['dt', 'editable']]);
  const hz = STUDIES.find((x) => x.id === 'horizontal');
  const hr = quantityRows(hz.preset(defaultSettings()), { locked: new Set(), hidden: studyFixed(hz, LOCKABLE), study: hz, lang: 'lv', t: lv });
  assert.ok(hr.every((r) => r.group === 'main'));
  assert.ok(hr.some((r) => r.key === 'second' && r.state === 'editable'));
});
test('a link lock shows locked (FIKS.)', () => {
  const rows = quantityRows(defaultSettings(), { locked: new Set(['h']), hidden: new Set(), study: null, lang: 'lv', t: lv });
  assert.equal(rows.find((r) => r.key === 'h').state, 'locked');
});
test('MĒRĪJUMI: x of the latest flash while running, t | x; y rows; one-sample run works', () => {
  const s = defaultSettings('horizontal');
  const run = simulateRun(s, { seed: 2, repeat: 1, noise: 0, traps: [] });
  const vm = measureVM({ settings: s, running: { run, simT: 0.45 }, lastRun: null, shown: null, shownModel: null, tables: [], shownKey: '', views: { table: true, strobe: true }, lang: 'lv', t: lv });
  assert.equal(vm.symbol, 'x');
  assert.equal(vm.live, true);
  assert.equal(vm.rows.length, Math.min(LIVE_ROWS, 3)); // flashes at 0; 0,2; 0,4 s
  assert.match(vm.rows[0].b, /^x = \d+,\d m; y = \d+,\d m$/);
  const one = { ...defaultSettings('vertical'), h: 1, v0: 0, dt: 2 };
  const r1 = simulateRun(one, { seed: 1, repeat: 1, noise: 0, traps: [] });
  const v1 = measureVM({ settings: one, running: null, lastRun: r1, shown: null, shownModel: null, tables: [], shownKey: '', views: { table: true, strobe: true }, lang: 'lv', t: lv });
  assert.equal(v1.symbol, 'y');
  assert.equal(v1.valueText, '1,0');
});
test('view=strobe&lock=1: no number, a note to read the strobe image', () => {
  const s = defaultSettings();
  const vm = measureVM({ settings: s, running: null, lastRun: null, shown: null, shownModel: null, tables: [], shownKey: '', views: { table: false, strobe: true }, lang: 'lv', t: lv });
  assert.equal(vm.valueText, '');
  assert.equal(vm.note, lv('hud.readStrobe'));
});
