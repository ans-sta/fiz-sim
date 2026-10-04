import { test } from 'node:test';
import assert from 'node:assert/strict';
import { strobePoints, strobeWorldBox, exportOptions } from '../assets/projectile/strobe.js';
import { simulateRun } from '../assets/projectile/experiment.js';
import { defaultSettings, withMode, withH, withV0, withAlpha, withSecond } from '../assets/projectile/model.js';
import { SCALE } from '../assets/projectile/scales.js';
import { sceneBox, tapeGap } from '../assets/projectile/scene.js';
import { exportSizeFor, EXPORT_MAX_AREA } from '../assets/measure/strobe-view.js';

const close = (a, b, e) => assert.ok(Math.abs(a - b) <= e, `${a} vs ${b}`);
const opts = { seed: 99, repeat: 1, noise: 0, traps: [] };

test('vertical strobe: rising flashes on the ↑ tape at x = 0, falling ones on the ↓ tape', () => {
  const s = { ...defaultSettings('vertical'), h: 20, v0: 10, dt: 0.3 };
  const run = simulateRun(s, { seed: 3, repeat: 1, noise: 0, traps: [] });
  const pts = strobePoints(run, s);
  const gap = tapeGap(sceneBox(s));
  run.strobe.forEach((p, i) => {
    close(pts.main[i].x, p.rising ? 0 : gap, 1e-12);
    assert.equal(pts.main[i].y, p.y);
  });
  assert.deepEqual(pts.tapes, { up: 0, down: gap });
  assert.deepEqual(pts.second, []);
});

test('free fall: one ↓ tape at x = 0', () => {
  const s = { ...defaultSettings('vertical'), h: 20, v0: 0, dt: 0.2 };
  const pts = strobePoints(simulateRun(s, { seed: 1, repeat: 1, noise: 0, traps: [] }), s);
  assert.ok(pts.main.every((p) => p.x === 0));
  assert.deepEqual(pts.tapes, { up: null, down: 0 });
});

test('horizontal and oblique: real x, no tapes', () => {
  const s = defaultSettings('horizontal');
  const run = simulateRun(s, { seed: 1, repeat: 1, noise: 0, traps: [] });
  const pts = strobePoints(run, s);
  assert.equal(pts.tapes, null);
  run.strobe.forEach((p, i) => assert.equal(pts.main[i].x, p.x));
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
