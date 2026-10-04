import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultTextScale, clampScale, loadScales, saveScales, legendScale, trackFraction, TEXT_KEY, DRAW_KEY, TEXT_RANGE, DRAW_RANGE,
} from '../assets/measure/ui-scale.js';

function fakeStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m };
}
const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };

test('ranges and keys (spec izkārtojums 6)', () => {
  assert.equal(TEXT_KEY, 'fiz-sim-text');
  assert.equal(DRAW_KEY, 'fiz-sim-draw');
  assert.deepEqual(TEXT_RANGE, { min: 0.8, max: 2, step: 0.05 });
  assert.deepEqual(DRAW_RANGE, { min: 0.6, max: 1.5, step: 0.05 });
});

test('default text scale: 100 % up to 1280 × 800, then proportional up to 200 %, in 5 % steps', () => {
  assert.equal(defaultTextScale(1280, 800), 1);
  assert.equal(defaultTextScale(390, 844), 1);
  assert.equal(defaultTextScale(844, 390), 1);
  assert.equal(defaultTextScale(1920, 1080), 1.35);
  assert.equal(defaultTextScale(1600, 800), 1, 'the smaller ratio decides');
  assert.equal(defaultTextScale(1300, 900), 1);
  assert.equal(defaultTextScale(2560, 1440), 1.8);
  assert.equal(defaultTextScale(3840, 2160), 2);
});

test('clampScale snaps to the step and keeps the range; not a number → null', () => {
  assert.equal(clampScale(1.234, TEXT_RANGE), 1.25);
  assert.equal(clampScale(0.1, TEXT_RANGE), 0.8);
  assert.equal(clampScale(7, TEXT_RANGE), 2);
  assert.equal(clampScale(1.6, DRAW_RANGE), 1.5);
  assert.equal(clampScale(0.5, DRAW_RANGE), 0.6);
  assert.equal(clampScale(1.1 + 0.05, DRAW_RANGE), 1.15);
  assert.equal(clampScale(NaN, TEXT_RANGE), null);
});

test('loadScales: missing → text for the screen, drawing 100 %; saved values are read and clamped', () => {
  assert.deepEqual(loadScales({ storage: fakeStorage(), w: 1920, h: 1080 }), { text: 1.35, draw: 1 });
  assert.deepEqual(loadScales({ storage: fakeStorage({ [TEXT_KEY]: '1.5', [DRAW_KEY]: '0.75' }), w: 390, h: 844 }), { text: 1.5, draw: 0.75 });
  assert.deepEqual(loadScales({ storage: fakeStorage({ [TEXT_KEY]: '9', [DRAW_KEY]: '0.1' }), w: 390, h: 844 }), { text: 2, draw: 0.6 });
  assert.deepEqual(loadScales({ storage: fakeStorage({ [TEXT_KEY]: 'abc', [DRAW_KEY]: '' }), w: 390, h: 844 }), { text: 1, draw: 1 });
});

test('loadScales and saveScales survive a storage that throws (private mode)', () => {
  assert.deepEqual(loadScales({ storage: broken, w: 1280, h: 800 }), { text: 1, draw: 1 });
  assert.doesNotThrow(() => saveScales({ text: 1.2, draw: 1 }, { storage: broken }));
});

test('saveScales writes only the given values', () => {
  const st = fakeStorage();
  saveScales({ text: 1.25 }, { storage: st });
  assert.equal(st.map.get(TEXT_KEY), '1.25');
  assert.equal(st.map.has(DRAW_KEY), false);
  saveScales({ draw: 0.6 }, { storage: st });
  assert.equal(st.map.get(DRAW_KEY), '0.6');
});

test('legend in the drawing grows half as much as the text: ×2 → ×1,5, ×0,8 → ×0,9', () => {
  assert.equal(legendScale(1), 1);
  assert.equal(legendScale(2), 1.5);
  assert.equal(legendScale(0.8), 0.9);
  assert.equal(legendScale(1.35), 1.175);
});

test('trackFraction: where a value sits on a slider track, 0…1', () => {
  assert.equal(trackFraction(0.6, DRAW_RANGE), 0);
  assert.equal(trackFraction(1.5, DRAW_RANGE), 1);
  assert.equal(trackFraction(1.05, DRAW_RANGE), 0.5);
  assert.equal(trackFraction(0.3, DRAW_RANGE), 0, 'even 60 % does not fit: all grey');
  assert.equal(trackFraction(3, DRAW_RANGE), 1, '150 % still fits: nothing grey');
});
