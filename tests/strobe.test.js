import { test } from 'node:test';
import assert from 'node:assert/strict';
import { labelPositions, strobeWorldBox, exportSize, EXPORT_PX_PER_CM, EXPORT_MAX_SIDE, EXPORT_MAX_AREA } from '../assets/rolling-ball/strobe.js';
import { defaultSettings, derive, withL } from '../assets/rolling-ball/model.js';

test('labels never overlap, never sit left of their ball, and stay put when there is room', () => {
  const xs = [100, 101, 103, 107, 113, 121, 131, 300, 400];
  const out = labelPositions(xs, 20, 4);
  out.forEach((x, i) => {
    assert.ok(x >= xs[i]);
    if (i > 0) assert.ok(x - out[i - 1] >= 24 - 1e-9);
  });
  assert.equal(out[7], 300);
  assert.equal(out[8], 400);
});

test('world box covers the groove, the tape and the largest ball', () => {
  const s = defaultSettings();
  const box = strobeWorldBox(s, derive(s));
  assert.deepEqual(box, { x0: -3, x1: 83, y0: -3, y1: 1.6 + 2 });
});

test('export resolution is ≥ 5 px per mm and within device limits (spec 12.13)', () => {
  for (const L of [40, 80, 200]) {
    const s = withL(defaultSettings(), L);
    const size = exportSize(strobeWorldBox(s, derive(s)));
    assert.ok(size.scale >= 50, `L ${L}: ${size.scale}`);
    assert.ok(size.w <= EXPORT_MAX_SIDE && size.w * size.h <= EXPORT_MAX_AREA, `L ${L}`);
  }
  const s = defaultSettings();
  assert.equal(exportSize(strobeWorldBox(s, derive(s))).scale, EXPORT_PX_PER_CM);
});

test('a box that cannot be exported at ≥ 5 px/mm returns null', () => {
  assert.equal(exportSize({ x0: 0, x1: 400, y0: 0, y1: 10 }), null);
});
