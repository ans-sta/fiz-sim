import { test } from 'node:test';
import assert from 'node:assert/strict';
import { strobePoints, strobeWorldBox, exportOptions } from '../assets/projectile/strobe.js';
import { simulateRun } from '../assets/projectile/experiment.js';
import { defaultSettings, withMode, withScale, withH, withV0, withAlpha, withSecond } from '../assets/projectile/model.js';
import { SCALES } from '../assets/projectile/scales.js';
import { exportSizeFor, EXPORT_MAX_AREA } from '../assets/measure/strobe-view.js';

const opts = { seed: 99, repeat: 1, noise: 0, traps: [] };

test('vertical mode: positions shifted to the right like a time axis', () => {
  const s = withMode(withV0(defaultSettings(), 0), 'vertical');
  const run = simulateRun(s, opts);
  const p = strobePoints(run, s);
  p.main.forEach((q, i) => {
    assert.equal(q.x, i * SCALES.table.strobeSpacing);
    assert.equal(q.y, run.strobe[i].y);
  });
  assert.deepEqual(p.second, []);
});

test('other modes: true positions; second ball included', () => {
  const s = withSecond(defaultSettings(), true);
  const run = simulateRun(s, opts);
  const p = strobePoints(run, s);
  p.main.forEach((q, i) => assert.equal(q.x, run.strobe[i].x));
  assert.equal(p.second.length, run.strobe2.length);
});

test('the box holds every ball and the launch height', () => {
  const s = withSecond(defaultSettings(), true);
  const p = strobePoints(simulateRun(s, opts), s);
  const b = strobeWorldBox(s, p);
  const r = SCALES.table.ball.d / 2;
  for (const q of [...p.main, ...p.second]) {
    assert.ok(q.x - r >= b.x0 && q.x + r <= b.x1);
    assert.ok(q.y - r >= b.y0 && q.y + r <= b.y1);
  }
  assert.ok(b.y1 >= s.h);
  assert.ok(b.x0 < 0, 'part of the table is visible');
});

test('largest throws still export (Review Focus 5)', () => {
  const tower = withH(withAlpha(withV0(withMode(withScale(defaultSettings(), 'tower'), 'oblique'), 30), 45), 50);
  const table = withH(withAlpha(withV0(withMode(defaultSettings(), 'oblique'), 400), 45), 150);
  for (const s of [tower, table]) {
    const p = strobePoints(simulateRun(s, opts), s);
    const size = exportSizeFor(strobeWorldBox(s, p), exportOptions(SCALES[s.scale]));
    assert.ok(size, s.scale);
    assert.ok(size.scale >= SCALES[s.scale].exportPx.min);
    assert.ok(size.w * size.h <= EXPORT_MAX_AREA);
  }
});
