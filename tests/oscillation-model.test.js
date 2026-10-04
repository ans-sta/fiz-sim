import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AXIS_CM, N_POINTS, RANGES, VIEWS, VIEW_POSE, TURN_S, TAU, CREST, COMPRESSION,
  defaultSettings, withA, withT, withLambda, withLines, derived, advancePhase, pointZ, phaseAt,
  point3D, project, viewCenterU, smooth, poseAngles, advancePose, settled,
  scenePoints, circleOutline, waveCurve, phaseZ, lambdaSpan, sceneLayout, toScreen,
} from '../assets/oscillation/model.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);
const angles = (kappa, theta) => poseAngles({ kappa, theta });

test('constants and defaults from the spec', () => {
  assert.equal(AXIS_CM, 200);
  assert.equal(N_POINTS, 41);
  assert.deepEqual(VIEWS, ['circle', 'trans', 'long']);
  assert.deepEqual(defaultSettings(), { A: 20, T: 4, lambda: 100, lines: true });
  assert.deepEqual(RANGES.A, { min: 5, max: 40, step: 1 });
  assert.deepEqual(RANGES.T, { min: 1, max: 8, step: 0.5 });
  assert.deepEqual(RANGES.lambda, { min: 50, max: 200, step: 10 });
  assert.equal(TURN_S, 1);
});

test('with*: clamp, round to the step, keep the object when nothing changes', () => {
  const s = defaultSettings();
  assert.equal(withA(s, 100).A, 40);
  assert.equal(withA(s, 0).A, 5);
  assert.equal(withA(s, 12.3).A, 12);
  assert.equal(withA(s, 20), s);
  assert.equal(withA(s, NaN), s);
  assert.equal(withT(s, 2.26).T, 2.5);
  assert.equal(withT(s, 0.2).T, 1);
  assert.equal(withLambda(s, 55).lambda, 60);
  assert.equal(withLambda(s, 500).lambda, 200);
  assert.equal(withLines(s, false).lines, false);
  assert.equal(withLines(s, true), s);
});

test('derived: f = 1/T, ω = 2π/T, v = λ/T', () => {
  const d = derived({ A: 20, T: 4, lambda: 100, lines: true });
  close(d.f, 0.25);
  close(d.omega, Math.PI / 2);
  close(d.v, 25);
});

test('advancePhase: 2π per period, wrapped, and changing T only changes the rate', () => {
  close(advancePhase(0, 1, 4), Math.PI / 2);
  close(advancePhase(6, 1, 4), (6 + Math.PI / 2) % TAU);
  const p = advancePhase(1, 0.1, 4);
  close(advancePhase(p, 0.1, 8), p + TAU * 0.1 / 8); // no jump when T changes
});

test('geometry: circle view is a circle, side view a transverse sine, turned rods a longitudinal wave', () => {
  const A = 20;
  // κ = 0, θ = 0 → (u, w) = (A cos φ, A sin φ)
  const c = project(point3D(0.7, 150, A, 0), 0);
  close(c.u, A * Math.cos(0.7));
  close(c.w, A * Math.sin(0.7));
  // κ = 90°, θ = 0 → u = z, w = A sin φ
  const t = project(point3D(0.7, 150, A, 0), Math.PI / 2);
  close(t.u, 150);
  close(t.w, A * Math.sin(0.7));
  // κ = 90°, θ = 90° → u = z + A sin φ, w = 0
  const l = project(point3D(0.7, 150, A, Math.PI / 2), Math.PI / 2);
  close(l.u, 150 + A * Math.sin(0.7));
  close(l.w, 0);
  close(viewCenterU(0), 0);
  close(viewCenterU(Math.PI / 2), 100);
});

test('phases: point i lags by 2π·z/λ; 41 points; λ = 200 spreads them over exactly one turn', () => {
  assert.equal(pointZ(3), 15);
  close(phaseAt(1, 50, 100), 1 - Math.PI);
  const pts = scenePoints({ A: 20, T: 4, lambda: 200, lines: true }, 0, angles(0, 0));
  assert.equal(pts.length, 41);
  assert.equal(pts[0].i, 0);
  close(pts[0].phi, 0);
  close(pts[40].phi, -TAU);
  close(pts[40].u, pts[0].u);
  close(pts[40].w, pts[0].w);
  for (const p of pts) close(Math.hypot(p.u, p.w), 20);
});

test('poses: smoothstep angles; the order rule θ ≠ 0 only when κ = 1', () => {
  close(smooth(0), 0); close(smooth(1), 1); close(smooth(0.5), 0.5);
  close(angles(1, 0).kappaRad, Math.PI / 2);
  // circle → trans: only κ moves, 1 s long
  let p = VIEW_POSE.circle;
  p = advancePose(p, 'trans', 0.25);
  assert.deepEqual(p, { kappa: 0.25, theta: 0 });
  p = advancePose(p, 'trans', 2);
  assert.deepEqual(p, { kappa: 1, theta: 0 });
  assert.equal(settled(p, 'trans'), true);
  // trans → long: θ moves
  p = advancePose(p, 'long', 0.5);
  assert.deepEqual(p, { kappa: 1, theta: 0.5 });
  // interrupted: back to circle from the middle — θ closes first, κ untouched
  p = advancePose(p, 'circle', 0.25);
  assert.deepEqual(p, { kappa: 1, theta: 0.25 });
  p = advancePose(p, 'circle', 0.25);
  assert.deepEqual(p, { kappa: 1, theta: 0 });
  p = advancePose(p, 'circle', 0.5);
  assert.deepEqual(p, { kappa: 0.5, theta: 0 });
  // interrupted: to long from a half-turned camera — κ finishes first, then θ opens
  p = advancePose(p, 'long', 0.5);
  assert.deepEqual(p, { kappa: 1, theta: 0 });
  p = advancePose(p, 'long', 0.5);
  assert.deepEqual(p, { kappa: 1, theta: 0.5 });
  assert.equal(settled(p, 'long'), false);
  // never overshoots
  assert.deepEqual(advancePose({ kappa: 0.9, theta: 0 }, 'trans', 5), { kappa: 1, theta: 0 });
  assert.deepEqual(advancePose(VIEW_POSE.long, 'long', 1), VIEW_POSE.long);
});

test('outlines and the wave curve follow the same projection', () => {
  const o = circleOutline(50, 20, angles(0, 0), 4);
  assert.equal(o.length, 5);
  for (const q of o) close(Math.hypot(q.u, q.w), 20);
  const side = circleOutline(50, 20, angles(1, 0), 8);
  for (const q of side) close(q.u, 50); // edge-on: a vertical rod at z = 50
  const flat = circleOutline(50, 20, angles(1, 1), 8);
  for (const q of flat) close(q.w, 0); // turned: a rod along the axis
  const curve = waveCurve({ A: 20, T: 4, lambda: 100, lines: true }, 0, angles(1, 0), 1);
  assert.equal(curve.length, 201);
  close(curve[0].u, 0);
  close(curve[200].u, 200);
  close(curve[25].w, 20 * Math.sin(-Math.PI / 2)); // z = 25: φ = −π/2 → trough
});

test('phaseZ and lambdaSpan: crest and compression positions, λ = 200 falls back to the whole axis', () => {
  close(phaseZ(CREST, 100, CREST), 0);
  close(phaseZ(CREST + Math.PI, 100, CREST), 50);
  close(phaseZ(0, 100, COMPRESSION), 0);
  assert.deepEqual(lambdaSpan(CREST, 100, CREST), { z1: 0, z2: 100 });
  const s = lambdaSpan(CREST + 1, 200, CREST); // crest at z ≈ 31,8 → 231,8 does not fit
  assert.deepEqual(s, { z1: 0, z2: 200 });
  const ok = lambdaSpan(CREST - 1, 50, CREST); // crest at z = 50·(1 − 1/2π) ≈ 42 → 92 fits
  close(ok.z2 - ok.z1, 50);
  assert.ok(ok.z1 >= 0 && ok.z2 <= AXIS_CM);
});

test('sceneLayout: the axis fits the width, 2 × 40 cm fits the band, centre in the band, fill marks the width limit', () => {
  const wide = sceneLayout(1600, 800, { top: 120, bottom: 60 });
  close(wide.scale, (800 - 180) / 92); // height-limited: band 620 / (2·40·1,15)
  close(wide.cx, 800);
  close(wide.cy, 120 + 310);
  assert.ok(wide.fill > 1 && wide.fill <= 1.5);
  const phone = sceneLayout(844, 390, { top: 130, bottom: 60 });
  close(phone.scale, Math.min((844 - 32) / 200, 200 / 92));
  const narrow = sceneLayout(390, 700, { top: 100, bottom: 80 });
  close(narrow.scale, (390 - 32) / 200); // width-limited
  close(narrow.fill, 1);
  const half = sceneLayout(1600, 800, { top: 0, bottom: 0, drawScale: 0.5 });
  close(half.scale, sceneLayout(1600, 800).scale / 2);
  // toScreen: circle view centred on u = 0, side view on u = 100
  const lay = sceneLayout(1000, 500);
  const a = toScreen(lay, { u: 0, w: 10 }, 0);
  close(a.x, 500);
  close(a.y, lay.cy - 10 * lay.scale);
  const b = toScreen(lay, { u: 100, w: 0 }, Math.PI / 2);
  close(b.x, 500);
});
