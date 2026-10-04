import { test } from 'node:test';
import assert from 'node:assert/strict';
import { miniCells, stepValue, runSlotTop } from '../assets/measure/hud.js';

const model = (rows, cols) => ({
  columns: Array.from({ length: cols }, (_, i) => ({ label: `c${i}`, decimals: i === 0 ? 1 : 2 })),
  rows: Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => (c === 0 ? r : r + c / 100))),
});

test('miniCells: the whole small table, numbers in the language', () => {
  const m = miniCells(model(2, 3), 'lv');
  assert.deepEqual(m.rows, [['0,0', '0,01', '0,02'], ['1,0', '1,01', '1,02']]);
  assert.equal(m.moreRows, false);
  assert.equal(m.moreCols, false);
  assert.deepEqual(miniCells(model(1, 2), 'en').rows, [['0.0', '0.01']]);
});

test('miniCells: at most 6 rows and 4 columns, the rest is marked', () => {
  const m = miniCells(model(9, 7), 'lv');
  assert.equal(m.rows.length, 6);
  assert.equal(m.rows[0].length, 4);
  assert.equal(m.moreRows, true);
  assert.equal(m.moreCols, true);
});

test('miniCells: a missing value is an empty cell', () => {
  const m = miniCells({ columns: [{ decimals: 1 }, { decimals: 2 }], rows: [[3, null]] }, 'lv');
  assert.deepEqual(m.rows, [['3,0', '']]);
});

test('stepValue: one step from the current value, within the range', () => {
  const r = { min: 0, max: 15, step: 0.1, value: 2.1491 };
  assert.equal(stepValue(r, 1), 2.2491);
  assert.equal(stepValue({ ...r, value: 14.95 }, 1), 15);
  assert.equal(stepValue({ ...r, value: 0.05 }, -1), 0);
});

test('runSlotTop: the run button sits half its own height below the ground line', () => {
  assert.equal(runSlotTop(400, 32), 416);
  assert.equal(runSlotTop(400, 33), 417);
  assert.equal(runSlotTop(400.4, 64), 432);
});
