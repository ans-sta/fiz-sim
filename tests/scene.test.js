import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sceneLayout, ballCenter, handleAnchors, valueFromPointer, MARGIN } from '../assets/rolling-ball/scene.js';
import { defaultSettings, derive, withAlpha, withLevel } from '../assets/rolling-ball/model.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b}`);

test('layout fits the groove into the width and anchors the low end on the right', () => {
  const s = defaultSettings();
  const d = derive(s);
  const lay = sceneLayout(800, 400, { L: s.L, alphaRad: d.alphaRad });
  close(lay.high.x, MARGIN.left, 1e-9);
  close(lay.low.x, 800 - MARGIN.right, 1e-6);
  close(lay.low.y, Math.min(400 - MARGIN.bottom, MARGIN.top + (400 - MARGIN.top - MARGIN.bottom + s.L * Math.sin(d.alphaRad) * lay.s) / 2), 1e-9);
  close(lay.low.y - lay.high.y, s.L * Math.sin(d.alphaRad) * lay.s, 1e-9);
});

test('at() and along() are inverse along the groove', () => {
  const d = derive(withAlpha(defaultSettings(), 12));
  const lay = sceneLayout(900, 500, { L: 80, alphaRad: d.alphaRad });
  for (const x of [0, 13.5, 40, 80]) {
    const p = lay.at(x);
    close(lay.along(p.x, p.y), x, 1e-9);
    const off = { x: p.x + lay.up.x * 30, y: p.y + lay.up.y * 30 };
    close(lay.along(off.x, off.y), x, 1e-9, 'normal offset is ignored');
  }
});

test('the scale is frozen by `fit` while dragging', () => {
  const lay80 = sceneLayout(800, 400, { L: 80, alphaRad: 0.04 });
  const drag = sceneLayout(800, 400, { L: 120, alphaRad: 0.04 }, { L: 80, alphaRad: 0.04 });
  assert.equal(drag.s, lay80.s);
  assert.equal(drag.low.y, lay80.low.y);
});

test('scale is capped at 60 px/cm', () => {
  assert.equal(sceneLayout(4000, 3000, { L: 40, alphaRad: 0.05 }).s, 60);
});

test('pointer at each anchor gives back the current value', () => {
  const s = withLevel(withAlpha(defaultSettings(), 6), 2);
  const d = derive(s);
  const lay = sceneLayout(1000, 600, { L: s.L, alphaRad: d.alphaRad });
  const a = handleAnchors(lay, s, d);
  close(valueFromPointer('L', lay, a.L), s.L, 1e-6);
  close(valueFromPointer('h', lay, a.h), d.h, 1e-6);
  close(valueFromPointer('alpha', lay, a.alpha), d.alphaDeg, 1e-6);
  close(valueFromPointer('x0', lay, a.x0), s.x0, 1e-6);
  a.gates.forEach((p, i) => close(valueFromPointer('gate', lay, p), s.gates[i], 1e-6));
});

test('ball centre sits r_eff above the groove line', () => {
  const s = defaultSettings();
  const d = derive(s);
  const lay = sceneLayout(800, 400, { L: s.L, alphaRad: d.alphaRad });
  const c = ballCenter(lay, 10, d.rEff);
  const p = lay.at(10);
  close(Math.hypot(c.x - p.x, c.y - p.y), d.rEff * lay.s, 1e-9);
  assert.ok(c.y < p.y);
});
