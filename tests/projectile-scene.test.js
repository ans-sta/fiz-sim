import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sceneBox, sceneLayout, arrowMaxPx, launchPoint, arrowGeometry, handleAnchors, valueFromPointer, arcRadius, ladderCeil, MARGIN, ARC_R } from '../assets/projectile/scene.js';
import { SCALE } from '../assets/projectile/scales.js';
import { defaultSettings, derive, withMode, withV0, withAlpha, withH } from '../assets/projectile/model.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b}`);

test('ladderCeil: 1; 1,5; 2; 3; 4; 5; 6; 8 × 10ⁿ', () => {
  assert.equal(ladderCeil(73.3), 80);
  assert.equal(ladderCeil(90), 100);
  assert.equal(ladderCeil(1.2), 1.5);
  assert.equal(ladderCeil(300), 300);
  assert.equal(ladderCeil(0), 0);
});

test('sceneBox holds the whole trajectory but does not reveal the range or the apex', () => {
  const s = defaultSettings();
  const d = derive(s);
  const b = sceneBox(s, d);
  assert.equal(b.x0, 0);
  assert.equal(b.y0, 0);
  assert.ok(b.x1 >= d.xLand && b.y1 >= s.h && b.y1 >= SCALE.minView.h);
  const o = withMode(s, 'oblique');
  const boxes = [15, 30, 45, 60, 80].map((a) => {
    const q = withAlpha(o, a);
    const dq = derive(q);
    const bq = sceneBox(q, dq);
    assert.ok(bq.x1 >= dq.xLand && bq.y1 >= dq.yMax, `α ${a}`);
    return bq;
  });
  for (const bq of boxes) assert.deepEqual(bq, boxes[0], 'the drawing does not change with α');
  const up = withV0(withMode(s, 'vertical'), 30);
  const bu = sceneBox(up, derive(up));
  assert.ok(bu.y1 >= derive(up).yMax);
  assert.ok(bu.x1 - bu.x0 >= SCALE.minView.w);
});

test('layout: ground at the bottom margin, structure at the left margin; toWorld inverts toScreen', () => {
  const box = { x0: -60, x1: 100, y0: 0, y1: 100 };
  const lay = sceneLayout(800, 600, box);
  close(lay.toScreen(-60, 0).x, MARGIN.left, 1e-9);
  close(lay.toScreen(0, 0).y, 600 - MARGIN.bottom, 1e-9);
  assert.equal(lay.arrow, arrowMaxPx(800, 600));
  assert.ok(lay.toScreen(0, 100).y >= MARGIN.top + lay.arrow - 1e-9, 'room above for the v₀ arrow');
  for (const p of [{ x: 0, y: 0 }, { x: 37.5, y: 12 }, { x: -60, y: 100 }]) {
    const q = lay.toWorld(lay.toScreen(p.x, p.y).x, lay.toScreen(p.x, p.y).y);
    close(q.x, p.x, 1e-9);
    close(q.y, p.y, 1e-9);
  }
  assert.equal(arrowMaxPx(390, 300), 75);
  assert.equal(arrowMaxPx(2000, 2000), 120);
  assert.equal(arrowMaxPx(100, 100), 60);
});

test('arrow direction per mode and sign', () => {
  const lay = sceneLayout(800, 600, { x0: -60, x1: 100, y0: 0, y1: 100 });
  const h = arrowGeometry(lay, defaultSettings());
  assert.deepEqual(h.dir, { x: 1, y: 0 });
  close(h.len, (10 / SCALE.v0.max) * lay.arrow, 1e-9);
  assert.deepEqual(arrowGeometry(lay, withV0(withMode(defaultSettings(), 'vertical'), -10)).dir, { x: 0, y: 1 });
  assert.deepEqual(arrowGeometry(lay, withV0(withMode(defaultSettings(), 'vertical'), 10)).dir, { x: 0, y: -1 });
  const o = arrowGeometry(lay, withAlpha(withMode(defaultSettings(), 'oblique'), 30));
  close(o.dir.x, Math.cos(Math.PI / 6), 1e-12);
  close(o.dir.y, -0.5, 1e-12);
});

test('arc radius stays at least 30 px beyond the arrow tip', () => {
  for (const len of [0, 10, 26, 45, 56, 82, 120]) assert.ok(arcRadius(len) - len >= 26 && arcRadius(len) >= ARC_R);
});

test('pointer at each anchor gives back the current value (all modes)', () => {
  const cases = [
    defaultSettings(),
    withV0(withMode(defaultSettings(), 'vertical'), -10),
    withV0(withMode(defaultSettings(), 'vertical'), 25),
    withAlpha(withV0(withMode(defaultSettings(), 'oblique'), 20), 30),
    withH(withV0(defaultSettings(), 12.5), 17.5),
  ];
  for (const s of cases) {
    const lay = sceneLayout(900, 560, sceneBox(s, derive(s)));
    const a = handleAnchors(lay, s);
    close(valueFromPointer('h', lay, s, a.h), s.h, 1e-9, 'h');
    close(valueFromPointer('v0', lay, s, a.v0), s.v0, 1e-9, `v0 ${s.mode}`);
    if (s.mode === 'oblique') {
      close(valueFromPointer('alpha', lay, s, a.alpha), s.alphaDeg, 1e-9, 'alpha');
      close(valueFromPointer('alpha', lay, s, a.v0), s.alphaDeg, 1e-9, 'alpha from the arrow tip');
      const p = launchPoint(lay, s);
      const len = arrowGeometry(lay, s).len;
      close(Math.hypot(a.alpha.x - p.x, a.alpha.y - p.y), arcRadius(len), 1e-9);
      assert.ok(Math.hypot(a.alpha.x - a.v0.x, a.alpha.y - a.v0.y) >= 30 - 1e-9, 'the α handle never covers the v₀ handle');
    }
  }
});
