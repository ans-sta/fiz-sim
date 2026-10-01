import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportSizeFor, EXPORT_MAX_SIDE, EXPORT_MAX_AREA } from '../assets/measure/strobe-view.js';

test('small picture: preferred scale', () => {
  const s = exportSizeFor({ x0: 0, x1: 100, y0: 0, y1: 50 }, { pref: 30, min: 10, extraW: 80, extraH: 220 });
  assert.deepEqual(s, { scale: 30, w: 3080, h: 1720 });
});

test('large picture: scale goes down until it fits; never below min (Review Focus 5)', () => {
  const s = exportSizeFor({ x0: -35, x1: 263, y0: -5, y1: 196 }, { pref: 30, min: 10, extraW: 80, extraH: 220 });
  assert.ok(s);
  assert.ok(s.scale < 30 && s.scale >= 10);
  assert.ok(s.w <= EXPORT_MAX_SIDE && s.h <= EXPORT_MAX_SIDE && s.w * s.h <= EXPORT_MAX_AREA);
});

test('impossible picture → null', () => {
  assert.equal(exportSizeFor({ x0: 0, x1: 100000, y0: 0, y1: 100000 }, { pref: 30, min: 10 }), null);
});
