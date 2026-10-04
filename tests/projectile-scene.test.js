import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sceneBox, sceneLayout, tapeGap, displayX, arrowMaxPx, launchPoint, arrowGeometry, handleAnchors, valueFromPointer, arcRadius, ladderCeil, ARC_R, BALL_R_PX, DIM_GAP, H_LABEL_GAP, H_LABEL_PX } from '../assets/projectile/scene.js';
import { GROUND, EDGE_PX } from '../assets/measure/hud-layout.js';
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

const PADL = DIM_GAP + H_LABEL_GAP + H_LABEL_PX;
const extent = (lay) => ({ l: lay.toScreen(lay.box.x0, 0).x - PADL, r: lay.toScreen(lay.box.x1, 0).x + BALL_R_PX + 4 });

test('ground at 61,8 %, world y = 0 on it', () => {
  for (const [w, h] of [[390, 780], [844, 340], [1280, 760]]) {
    const lay = sceneLayout(w, h, sceneBox(defaultSettings()));
    assert.equal(lay.groundY, Math.round(h * GROUND));
    close(lay.toScreen(0, 0).y, lay.groundY, 1e-9);
    assert.equal(lay.arrow, arrowMaxPx(w, h));
  }
  assert.equal(arrowMaxPx(390, 300), 75);
  assert.equal(arrowMaxPx(2000, 2000), 120);
  assert.equal(arrowMaxPx(100, 100), 60);
});
test('the drawing is exactly centred for every mode and stays centred at ⚙ 60/100/150 %', () => {
  for (const s of [defaultSettings('horizontal'), withV0(defaultSettings('vertical'), 12), defaultSettings('oblique')]) {
    for (const k of [0.6, 1, 1.5]) {
      const lay = sceneLayout(844, 390, sceneBox(s), { drawScale: k });
      const e = extent(lay);
      close((e.l + e.r) / 2, 422, 1e-6, `${s.mode} ${k}`);
    }
  }
});
test('fill: at drawScale = fill the drawing exactly fills the width', () => {
  const box = sceneBox(defaultSettings('horizontal'));
  const lay = sceneLayout(1280, 760, box);
  const big = sceneLayout(1280, 760, box, { drawScale: lay.fill });
  const e = extent(big);
  close(e.r - e.l, 1280 - 2 * EDGE_PX, 1e-6);
});
test('the box does not depend on α and is rounded up', () => {
  const o = defaultSettings('oblique');
  assert.deepEqual(sceneBox(withAlpha(o, 20)), sceneBox(withAlpha(o, 70)));
  const b = sceneBox(withH(defaultSettings('horizontal'), 20));
  assert.ok(b.x1 >= 1.1 * 10 * Math.sqrt(2 * 20 / 9.81));
});
test('the box holds the whole trajectory for every α', () => {
  const o = defaultSettings('oblique');
  for (const a of [0, 15, 45, 80, 90]) {
    const q = withAlpha(o, a);
    const d = derive(q);
    const b = sceneBox(q);
    assert.ok(b.x1 >= d.xLand && b.y1 >= d.yMax, `α ${a}`);
  }
  const up = withV0(defaultSettings('vertical'), 30);
  assert.ok(sceneBox(up).y1 >= derive(up).yMax);
});
test('vertical tapes: rising at x = 0, falling one tape gap to the right; v₀ ≤ 0 — one tape at 0', () => {
  const up = withV0(defaultSettings('vertical'), 10);
  const box = sceneBox(up);
  assert.equal(displayX(up, box, { x: 0, rising: true }), 0);
  close(displayX(up, box, { x: 0, rising: false }), tapeGap(box), 1e-12);
  close(tapeGap(box), 0.12 * (box.y1 - box.y0), 1e-12);
  close(box.x1, 2 * tapeGap(box), 1e-12);
  const down = withV0(defaultSettings('vertical'), -5);
  assert.equal(displayX(down, sceneBox(down), { x: 0, rising: false }), 0);
  const hz = defaultSettings('horizontal');
  assert.equal(displayX(hz, sceneBox(hz), { x: 7.5, rising: false }), 7.5);
});
test('MĒRĪJUMI is avoided only when the drawing would reach it', () => {
  const box = sceneBox(defaultSettings('horizontal'));
  const GAP = 12; // PANEL_GAP
  // zīmējuma taisnstūris: kaste + malas + vieta bultai
  const rect = (lay) => ({
    r: lay.toScreen(lay.box.x1, 0).x + BALL_R_PX + 4,
    t: lay.groundY - (lay.box.y1 - lay.box.y0) * lay.tr.scale - lay.arrow,
  });
  const free = sceneLayout(390, 780, box);
  // far: the drawing does not reach the panel — identical layout
  const far = sceneLayout(390, 780, box, { avoid: { left: 380, bottom: 20 } });
  assert.deepEqual(far.tr, free.tr);
  // only “below” has real room (beside would be narrower than 50 px): smaller, entirely below the panel
  const below = sceneLayout(390, 780, box, { avoid: { left: 220, bottom: 100 } });
  assert.ok(below.tr.scale < free.tr.scale - 1e-9, 'below: smaller than without avoid');
  assert.ok(rect(below).t >= 100 + GAP - 1e-6, 'below: top of the drawing under the panel');
  // only “beside” has real room (below would leave no height): smaller, entirely left of the panel
  const beside = sceneLayout(390, 780, box, { avoid: { left: 300, bottom: 600 } });
  assert.ok(beside.tr.scale < free.tr.scale - 1e-9, 'beside: smaller than without avoid');
  assert.ok(rect(beside).r <= 300 - GAP + 1e-6, 'beside: right edge left of the panel');
  close((extent(beside).l + extent(beside).r) / 2, 195, 1e-6, 'beside: still centred');
});

test('arrow direction per mode and sign', () => {
  const lay = sceneLayout(800, 600, { x0: 0, x1: 100, y0: 0, y1: 100 });
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
    const lay = sceneLayout(900, 560, sceneBox(s));
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
