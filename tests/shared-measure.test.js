import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createResults } from '../assets/measure/results-store.js';
import { trapRepeat, TRAP_REPEATS } from '../assets/measure/traps.js';
import { warningText, formatParamValue } from '../assets/measure/url-params.js';
import { makeT } from '../assets/translate.js';

test('results store: one table per key, repeats continue, extra table fields', () => {
  const r = createResults({ tableFields: (s) => ({ level: s.level }) });
  const meta = { seed: 7, noise: 1, traps: ['late'] };
  r.add({ level: 3, a: [1] }, { key: 'A' }, meta);
  r.add({ level: 2 }, { key: 'B' }, meta);
  const a = r.add({ level: 3, a: [1] }, { key: 'A' }, meta);
  assert.equal(r.tables().length, 2);
  assert.equal(a.index, 1);
  assert.equal(a.level, 3);
  assert.equal(a.runs.length, 2);
  assert.equal(r.nextRepeat('A'), 3);
  assert.equal(r.nextRepeat('nav'), 1);
  assert.deepEqual(a.meta, { seed: 7, noise: 1, traps: ['late'] });
});

test('results store copies the settings and works without extra fields', () => {
  const r = createResults();
  const s = { list: [1, 2] };
  const t = r.add(s, { key: 'K' }, { seed: 1, noise: 0, traps: [] });
  s.list.push(3);
  assert.deepEqual(t.settings.list, [1, 2]);
  assert.equal('level' in t, false);
});

test('trapRepeat is 1..3 and deterministic', () => {
  assert.equal(TRAP_REPEATS, 3);
  for (let seed = 1; seed < 200; seed++) {
    const k = trapRepeat(seed, 'key', 'late');
    assert.ok(k >= 1 && k <= 3);
    assert.equal(trapRepeat(seed, 'key', 'late'), k);
  }
});

test('formatParamValue: numbers in the language, lists, empty list', () => {
  const t = makeT({ lv: { 'url.none': 'nav' }, en: { 'url.none': 'none' } }, () => 'lv');
  assert.equal(formatParamValue(2.5, 'lv', t), '2,5');
  assert.equal(formatParamValue(0.02, 'lv', t), '0,02');
  assert.equal(formatParamValue(50, 'en', t), '50');
  assert.equal(formatParamValue([0.1, 0.2], 'lv', t), '0,1; 0,2');
  assert.equal(formatParamValue([0.1, 0.2], 'en', t), '0.1, 0.2');
  assert.equal(formatParamValue([], 'lv', t), 'nav');
  assert.equal(formatParamValue('cm/s', 'lv', t), 'cm/s');
});

test('warningText passes every warning field, formatted, to url.<reason>', () => {
  const dict = {
    lv: { 'url.x': '{param}={raw}: {unit} {max} [{allowed}] → {used}', 'url.bad_list': '{hint}', 'url.listHint': 'H', 'url.none': 'nav' },
    en: { 'url.x': '{param}={raw}: {unit} {max} [{allowed}] → {used}', 'url.bad_list': '{hint}', 'url.listHint': 'H', 'url.none': 'none' },
  };
  const t = makeT(dict, () => 'lv');
  const w = { param: 'h', raw: '120', reason: 'x', unit: 'm', max: 2.5, allowed: [0.1, 0.2], used: [1, 2] };
  assert.equal(warningText(w, { t, lang: 'lv' }), 'h=120: m 2,5 [0,1; 0,2] → 1; 2');
  assert.equal(warningText({ param: 'g', raw: 'x', reason: 'bad_list', used: [] }, { t, lang: 'lv' }), 'H');
});
