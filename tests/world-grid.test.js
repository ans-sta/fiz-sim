import { test } from 'node:test';
import assert from 'node:assert/strict';
import { niceStep, ticks, gridSteps } from '../assets/measure/world-grid.js';

test('niceStep picks the smallest 1/2/5 × 10ⁿ step that is at least minPx on screen', () => {
  assert.equal(niceStep(10, 40), 5);
  assert.equal(niceStep(4, 40), 10);
  assert.equal(niceStep(3, 40), 20);
  assert.equal(niceStep(100, 40), 0.5);
  assert.equal(niceStep(0.5, 40), 100);
});

test('ticks include both ends when they fall on the step and avoid float noise', () => {
  assert.deepEqual(ticks(0, 30, 10), [0, 10, 20, 30]);
  assert.deepEqual(ticks(-3, 12, 5), [0, 5, 10]);
  assert.deepEqual(ticks(0.1, 0.35, 0.1), [0.1, 0.2, 0.3]);
  assert.deepEqual(ticks(5, 4, 1), []);
});

test('gridSteps: minor divides label, or null', () => {
  assert.deepEqual(gridSteps(10), { label: 5, minor: 1 });
  assert.deepEqual(gridSteps(4), { label: 10, minor: 2 });
  assert.deepEqual(gridSteps(25), { label: 2, minor: 0.5 });
  assert.deepEqual(gridSteps(12), { label: 5, minor: 0.5 });
  const big = gridSteps(4, { labelPx: 88, minorPx: 13.2 });
  assert.equal(big.label, 50);
  assert.ok(big.minor === null || Number.isInteger(big.label / big.minor));
});
