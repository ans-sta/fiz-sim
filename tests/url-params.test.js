import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseParams } from '../assets/measure/url-params.js';

const schema = {
  L: { type: 'number', min: 40, max: 200 },
  dt: { type: 'number', values: [0.1, 0.2, 0.5] },
  seed: { type: 'int', min: 1, max: 2147483647 },
  ball: { type: 'enum', values: ['steel16', 'glass16'] },
  tape: { type: 'bool' },
  gates: { type: 'list-number', min: 0, max: 200, minLen: 2, maxLen: 6 },
  traps: { type: 'list-enum', values: ['push', 'late'] },
};

test('empty search gives nothing', () => {
  const p = parseParams('', schema);
  assert.deepEqual(p.values, {});
  assert.equal(p.given.size, 0);
  assert.equal(p.lock, false);
  assert.deepEqual(p.warnings, []);
});

test('valid values of every type', () => {
  const p = parseParams('?L=80&dt=0,5&seed=42&ball=glass16&tape=0&gates=10,20.5,30&traps=late,push,late&lock=1', schema);
  assert.deepEqual(p.values, { L: 80, dt: 0.5, seed: 42, ball: 'glass16', tape: false, gates: [10, 20.5, 30], traps: ['late', 'push'] });
  assert.deepEqual([...p.given].sort(), ['L', 'ball', 'dt', 'gates', 'seed', 'tape', 'traps']);
  assert.equal(p.lock, true);
  assert.deepEqual(p.warnings, []);
});

test('decimal comma is accepted for numbers', () => {
  assert.equal(parseParams('?L=80,5', schema).values.L, 80.5);
});

test('out of range is clamped and reported', () => {
  const p = parseParams('?L=500', schema);
  assert.equal(p.values.L, 200);
  assert.deepEqual(p.warnings, [{ param: 'L', raw: '500', reason: 'out_of_range', min: 40, max: 200, used: 200 }]);
});

test('not a number / not allowed / bad list are reported and dropped', () => {
  const p = parseParams('?L=abc&dt=0.3&ball=steel12&tape=maybe&gates=10&traps=push,foo&seed=1.5', schema);
  assert.deepEqual(p.values, {});
  const byParam = Object.fromEntries(p.warnings.map((w) => [w.param, w]));
  assert.equal(byParam.L.reason, 'not_number');
  assert.equal(byParam.dt.reason, 'not_allowed');
  assert.deepEqual(byParam.dt.allowed, [0.1, 0.2, 0.5]);
  assert.equal(byParam.ball.reason, 'not_allowed');
  assert.deepEqual(byParam.ball.allowed, ['steel16', 'glass16']);
  assert.equal(byParam.tape.reason, 'not_allowed');
  assert.equal(byParam.gates.reason, 'bad_list');
  assert.equal(byParam.traps.reason, 'not_allowed');
  assert.equal(byParam.seed.reason, 'not_number');
});

test('list with an item out of range or wrong length is a bad list', () => {
  assert.equal(parseParams('?gates=10,20,300', schema).warnings[0].reason, 'bad_list');
  assert.equal(parseParams('?gates=1,2,3,4,5,6,7', schema).warnings[0].reason, 'bad_list');
  assert.equal(parseParams('?gates=10,,20', schema).warnings[0].reason, 'bad_list');
});

test('empty list-enum is an empty list', () => {
  assert.deepEqual(parseParams('?traps=', schema).values.traps, []);
});

test('unknown params are ignored silently; lock=true works; lock=0 is off', () => {
  const p = parseParams('?fbclid=abc&utm_source=x&lock=true', schema);
  assert.deepEqual(p.warnings, []);
  assert.equal(p.lock, true);
  assert.equal(parseParams('?lock=0', schema).lock, false);
});
