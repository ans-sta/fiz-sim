import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decimalsOf, roundTo, formatNumber, parseDecimal } from '../assets/measure/format.js';

test('decimalsOf', () => {
  assert.equal(decimalsOf(0.5), 1);
  assert.equal(decimalsOf(0.01), 2);
  assert.equal(decimalsOf(0.001), 3);
  assert.equal(decimalsOf(1), 0);
});

test('roundTo rounds to a step and removes float noise', () => {
  assert.equal(roundTo(12.26, 0.5), 12.5);
  assert.equal(roundTo(12.24, 0.5), 12);
  assert.equal(roundTo(2.7229, 0.01), 2.72);
  assert.equal(roundTo(0.30000000000000004, 0.1), 0.3);
  assert.equal(roundTo(3 * 0.2, 0.2), 0.6);
  assert.equal(roundTo(80.4, 1), 80);
});

test('formatNumber uses a decimal comma in LV and a point in EN', () => {
  assert.equal(formatNumber(2.7, 2, 'lv'), '2,70');
  assert.equal(formatNumber(2.7, 2, 'en'), '2.70');
  assert.equal(formatNumber(80, 0, 'lv'), '80');
  assert.equal(formatNumber(-1.5, 1, 'lv'), '-1,5');
});

test('formatNumber never prints negative zero and blanks missing values', () => {
  assert.equal(formatNumber(-0.001, 2, 'lv'), '0,00');
  assert.equal(formatNumber(null, 1, 'lv'), '');
  assert.equal(formatNumber(undefined, 1, 'lv'), '');
  assert.equal(formatNumber(NaN, 1, 'lv'), '');
});

test('parseDecimal accepts comma or point, rejects everything else', () => {
  assert.equal(parseDecimal('2,5'), 2.5);
  assert.equal(parseDecimal('2.5'), 2.5);
  assert.equal(parseDecimal(' 80 '), 80);
  assert.equal(parseDecimal('-3'), -3);
  assert.ok(Number.isNaN(parseDecimal('')));
  assert.ok(Number.isNaN(parseDecimal('abc')));
  assert.ok(Number.isNaN(parseDecimal('1e3')));
  assert.ok(Number.isNaN(parseDecimal('2,5,1')));
  assert.ok(Number.isNaN(parseDecimal(null)));
});
