import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toScreen, fitTransform, zoomAt, panBy } from '../assets/measure/zoom-pan.js';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);

test('fitTransform centres the box and keeps the aspect ratio', () => {
  const box = { x0: -3, x1: 83, y0: -3, y1: 5 };
  const tr = fitTransform(box, 1000, 400, 20);
  const a = toScreen(tr, box.x0, box.y1);
  const b = toScreen(tr, box.x1, box.y0);
  close(a.x, 1000 - b.x);
  close(a.y, 400 - b.y);
  close(tr.scale, Math.min(960 / 86, 360 / 8));
});

test('zoomAt keeps the world point under the cursor', () => {
  const tr = { scale: 10, tx: 50, ty: 300 };
  const before = { x: (400 - tr.tx) / tr.scale, y: (tr.ty - 120) / tr.scale };
  const z = zoomAt(tr, 2.5, 400, 120);
  const p = toScreen(z, before.x, before.y);
  close(p.x, 400);
  close(p.y, 120);
  close(z.scale, 25);
});

test('zoomAt clamps the scale', () => {
  assert.equal(zoomAt({ scale: 10, tx: 0, ty: 0 }, 1e6, 0, 0, 0.5, 4000).scale, 4000);
  assert.equal(zoomAt({ scale: 10, tx: 0, ty: 0 }, 1e-6, 0, 0, 0.5, 4000).scale, 0.5);
});

test('panBy moves the view', () => {
  assert.deepEqual(panBy({ scale: 3, tx: 1, ty: 2 }, 10, -5), { scale: 3, tx: 11, ty: -3 });
});
