import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitLabel } from '../assets/measure/data-table-view.js';

test('splitLabel: error in brackets goes to the second line', () => {
  assert.deepEqual(splitLabel('t₁, s (±0,10 s)'), { main: 't₁, s', err: '(±0,10 s)' });
  assert.deepEqual(splitLabel('x₂, cm (±0,5 cm)'), { main: 'x₂, cm', err: '(±0,5 cm)' });
  assert.deepEqual(splitLabel('x₂, cm (±0.5 cm)'), { main: 'x₂, cm', err: '(±0.5 cm)' });
});

test('splitLabel: a label without an error part stays on one line', () => {
  assert.deepEqual(splitLabel('t, s'), { main: 't, s', err: '' });
  assert.deepEqual(splitLabel('y, m'), { main: 'y, m', err: '' });
});

test('splitLabel: brackets that are not at the end are not split', () => {
  assert.deepEqual(splitLabel('(a) t, s'), { main: '(a) t, s', err: '' });
});
