import { test } from 'node:test';
import assert from 'node:assert/strict';
import { strobePoints, strobeWorldBox, exportOptions, placeNumbers } from '../assets/projectile/strobe.js';
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

const tapeXs = (pts) => [pts.tapes.up, pts.tapes.down].filter((x) => x !== null);
const boxHoldsTapes = (s, pts) => {
  const b = strobeWorldBox(s, pts);
  for (const x of tapeXs(pts)) assert.ok(x >= b.x0 && x <= b.x1, `tape x ${x} in [${b.x0}, ${b.x1}]`);
};

test('world box holds both tapes: short flight, every flash rising', () => {
  const s = { ...defaultSettings('vertical'), h: 0, v0: 5, dt: 2 };
  const run = simulateRun(s, opts);
  const pts = strobePoints(run, s);
  assert.ok(pts.main.every((p) => p.x === 0));
  boxHoldsTapes(s, pts);
});

test('world box holds both tapes: v0 > 0 but every flash falling', () => {
  const s = { ...defaultSettings('vertical'), h: 20, v0: 1, dt: 2 };
  const run = simulateRun(s, opts);
  const pts = strobePoints(run, s);
  const gap = pts.tapes.down;
  assert.ok(pts.main.slice(1).every((p) => p.x === gap));
  boxHoldsTapes(s, pts);
});

const boxOf = (spot, w, fs = 1) => ({ x0: spot.x - fs, x1: spot.x + w + fs, y0: spot.y - 10 * fs, y1: spot.y + 2 * fs });
const hit = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

test('placeNumbers: dense column of flashes — no number overlaps another number or any ball', () => {
  const r = 4;
  const ctrs = [0, 3, 6, 9, 12].map((d) => ({ x: 100, y: 200 + d }));
  const widths = [6, 6, 6, 6, 12];
  const spots = placeNumbers(ctrs, widths, r);
  const boxes = spots.map((p, i) => boxOf(p, widths[i]));
  boxes.forEach((a, i) => {
    boxes.forEach((b, j) => { if (i < j) assert.ok(!hit(a, b), `numbers ${i} and ${j} overlap`); });
    ctrs.forEach((c, j) => assert.ok(!hit(a, { x0: c.x - r, x1: c.x + r, y0: c.y - r, y1: c.y + r }), `number ${i} hides ball ${j}`));
  });
});

test('placeNumbers: sparse flashes keep the right-above place', () => {
  const r = 4;
  const ctrs = [{ x: 50, y: 300 }, { x: 150, y: 250 }, { x: 250, y: 300 }];
  const spots = placeNumbers(ctrs, [6, 6, 12], r);
  spots.forEach((p, i) => { assert.equal(p.x, ctrs[i].x + r + 3); assert.equal(p.y, ctrs[i].y - r - 3); });
});
