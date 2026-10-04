import { test } from 'node:test';
import assert from 'node:assert/strict';
import { strobePoints, strobeWorldBox, exportOptions } from '../assets/projectile/strobe.js';
import { simulateRun } from '../assets/projectile/experiment.js';
import { defaultSettings, withMode, withH, withV0, withAlpha, withSecond } from '../assets/projectile/model.js';
import { SCALE } from '../assets/projectile/scales.js';
import { exportSizeFor, EXPORT_MAX_AREA } from '../assets/measure/strobe-view.js';

const opts = { seed: 99, repeat: 1, noise: 0, traps: [] };

test('vertical mode: positions shifted to the right like a time axis', () => {
  const s = withMode(withV0(defaultSettings(), 0), 'vertical');
  const run = simulateRun(s, opts);
  const p = strobePoints(run, s);
  p.main.forEach((q, i) => {
    assert.equal(q.x, i * 0.6); // pagaidu nobīde līdz 3. uzdevumam
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
  const r = SCALE.ball.d / 2;
  for (const q of [...p.main, ...p.second]) {
    assert.ok(q.x - r >= b.x0 && q.x + r <= b.x1);
    assert.ok(q.y - r >= b.y0 && q.y + r <= b.y1);
  }
  assert.ok(b.y1 >= s.h);
  assert.ok(b.x0 < 0, 'room to the left of the launch point');
});

test('largest throw still exports (Review Focus 5)', () => {
  const s = withH(withAlpha(withV0(withMode(defaultSettings(), 'oblique'), 30), 45), 50);
  const p = strobePoints(simulateRun(s, opts), s);
  const size = exportSizeFor(strobeWorldBox(s, p), { ...exportOptions(SCALE), extraH: 400 }); // paraksts ≤ 400 px
  assert.ok(size);
  assert.ok(size.scale >= SCALE.exportPx.min);
  assert.ok(size.w * size.h <= EXPORT_MAX_AREA);
});
