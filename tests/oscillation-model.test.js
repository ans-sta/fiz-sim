import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AXIS_CM, N_POINTS, RANGES, VIEWS, VIEW_POSE, TURN_S, TAU, CREST, COMPRESSION,
  defaultSettings, withA, withT, withV, withLambda, withLines, derived, advancePhase, pointZ, phaseAt, isMarked,
  point3D, project, viewCenterU, smooth, poseAngles, advancePose, settled,
  scenePoints, circleOutline, waveCurve, phaseZ, lambdaSpan, sceneLayout, toScreen, circleLayout, blendLayout, CIRCLE_CM, longAmplitude, lambdaSpans, crestAlpha, fadeDistance, FADE_S,
} from '../assets/oscillation/model.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);
const angles = (kappa, theta) => poseAngles({ kappa, theta });

test('constants and defaults from the spec', () => {
  assert.equal(AXIS_CM, 200);
  assert.equal(N_POINTS, 41);
  assert.deepEqual(VIEWS, ['circle', 'trans', 'long']);
  assert.deepEqual(defaultSettings(), { A: 30, T: 7, lambda: 70, v: 10, lines: true, order: ['v', 'T', 'lambda'] });
  assert.deepEqual(RANGES.T, { min: 1, max: 8, step: 0.5 });
  assert.deepEqual(RANGES.v, { min: -100, max: 100, step: 5 });
  assert.deepEqual(RANGES.A, { min: 5, max: 40, step: 1 });
    assert.deepEqual(RANGES.lambda, { min: 50, max: 200, step: 10 });
  assert.equal(TURN_S, 1);
});

test('with*: clamp, round to the step, keep the object when nothing changes', () => {
  const s = { ...defaultSettings(), T: 4, lambda: 100, v: 25 };
  assert.equal(withA(s, 100).A, 40);
  assert.equal(withA(s, 0).A, 5);
  assert.equal(withA(s, 12.3).A, 12);
  assert.equal(withA(s, 30), s);
  assert.equal(withA(s, NaN), s);
  assert.equal(withV(s, 27).v, 25);
  assert.equal(withV(s, 500).v, 100);
  assert.equal(withV(s, -500).v, -100);
  assert.equal(withLines(s, false).lines, false);
  assert.equal(withLines(s, true), s);
});

test('linked T, λ, v: the one changed earliest adapts; the changed one is clamped so the adapting one stays in range; v = 0 freezes', () => {
  let s = { ...defaultSettings(), T: 4, lambda: 100, v: 25 }; // order v, T, λ: v is the oldest
  s = withLambda(s, 200); // v adapts: 200 / 4
  assert.deepEqual([s.T, s.lambda, s.v, s.order], [4, 200, 50, ['v', 'T', 'lambda']]); // the adapted one stays the oldest
  s = withT(s, 2); // v is still older than λ → v adapts
  assert.deepEqual([s.T, s.lambda, s.v], [2, 200, 100]);
  s = withV(s, 20); // λ is now the oldest → λ = 20 · 2 = 40 → below 50 → v clamped to 25, λ = 50
  assert.deepEqual([s.T, s.lambda, s.v, s.order], [2, 50, 25, ['lambda', 'T', 'v']]);
  s = withLambda(s, 100); // T is the oldest → T = 100 / 25
  assert.deepEqual([s.T, s.lambda, s.v], [4, 100, 25]);
  s = withV(s, -10); // T adapts: |v| ≥ λ/8 = 12,5 → v = −12,5, T = 8; direction reversed
  assert.deepEqual([s.T, s.lambda, s.v], [8, 100, -12.5]);
  s = withV(s, 0); // nothing adapts, motion stops
  assert.deepEqual([s.T, s.lambda, s.v], [8, 100, 0]);
  s = withT(s, 1); // v is 0: λ would adapt but cannot (speed 0) → T just changes
  assert.deepEqual([s.T, s.lambda, s.v], [1, 100, 0]);
  assert.equal(withT(s, NaN), s);
  assert.equal(withLambda(s, 55).lambda, 60);
  assert.deepEqual([withLambda(s, 500).lambda, withLambda(s, 500).v], [100, 100]); // at T = 1 s, v ≤ 100 cm/s caps λ at 100
  assert.equal(withLines(s, false).lines, false);
  assert.equal(withLines(s, true), s);
});

test('derived: f = 1/T, ω = 2π/T from the stored T; v keeps its sign', () => {
  const d = derived({ A: 20, T: 4, lambda: 100, v: 25, lines: true });
  close(d.T, 4);
  close(d.f, 0.25);
  close(d.omega, Math.PI / 2);
  close(d.v, 25);
  const back = derived({ A: 20, T: 2, lambda: 100, v: -50, lines: true });
  close(back.T, 2);
  close(back.f, 0.5);
});

test('advancePhase: 2π per period T = λ/v, wrapped; negative v runs backwards; changing v only changes the rate', () => {
  const s = { v: 25, lambda: 100 };
  close(advancePhase(0, 1, s), Math.PI / 2);
  close(advancePhase(6, 1, s), (6 + Math.PI / 2) % TAU);
  close(advancePhase(1, 0.1, { v: -25, lambda: 100 }), 1 - TAU * 0.025);
  close(advancePhase(0, 0.1, { v: -25, lambda: 100 }), TAU - TAU * 0.025); // wraps upwards
  const p = advancePhase(1, 0.1, s);
  close(advancePhase(p, 0.1, { v: 10, lambda: 100 }), p + TAU * 0.01); // no jump when v changes
  close(advancePhase(1, 1, { v: 0, lambda: 100 }), 1); // v = 0: nothing moves
});

test('isMarked: the first point and every point a whole number of wavelengths away', () => {
  assert.deepEqual([0, 10, 20, 40].map((i) => isMarked(i, 100)), [true, false, true, true]);
  assert.deepEqual([0, 14, 28, 15].map((i) => isMarked(i, 70)), [true, true, true, false]);
  assert.deepEqual([0, 20, 40].map((i) => isMarked(i, 200)), [true, false, true]);
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
  const b = toScreen(lay, { u: 100, w: 0 }); // bez nobīdes: u = 0 paliek centrā arī sānskatā
  close(b.x, 500 + 100 * lay.scale);
});

test('circleLayout: the A_max circle fills the band between the panels or, when that is narrower, the band below them', () => {
  // desktop: between the panels (full height 900 − 12 − 90 = 798 vs clear width 1036 → 798)
  const d = circleLayout(1600, 900, { topFree: 12, topBelow: 180, bottom: 90, clearW: 1036 });
  close(d.scale, 798 / CIRCLE_CM);
  close(d.cy, 12 + 798 / 2);
  // portrait phone: panels span the width (clearW < 0) → below them, width-limited
  const p = circleLayout(390, 844, { topFree: 12, topBelow: 60, bottom: 110, clearW: -4 });
  close(p.scale, (390 - 32) / CIRCLE_CM);
  close(p.cy, 60 + (844 - 60 - 110) / 2);
  close(circleLayout(1600, 900, { topFree: 12, topBelow: 180, bottom: 90, clearW: 1036, drawScale: 0.5 }).scale, d.scale / 2);
});

test('blendLayout: κ = 0 gives the circle layout, κ = 1 the side layout, in between a smooth mix', () => {
  const a = { scale: 10, cx: 800, cy: 400 };
  const b = { scale: 5, cx: 800, cy: 460, fill: 1.2 };
  assert.deepEqual(blendLayout(a, b, 0), { scale: 10, cx: 800, cy: 400, fill: 1.2 });
  assert.deepEqual(blendLayout(a, b, 1), { scale: 5, cx: 800, cy: 460, fill: 1.2 });
  const m = blendLayout(a, b, 0.5);
  close(m.scale, 7.5);
  close(m.cy, 430);
  assert.deepEqual(blendLayout(a, b, 2), blendLayout(a, b, 1));
});

test('longAmplitude: the axial amplitude never exceeds 0,8·λ/2π, so neighbours never overtake each other', () => {
  close(longAmplitude({ A: 30, lambda: 100 }), 0.8 * 100 / TAU);
  close(longAmplitude({ A: 5, lambda: 100 }), 5);
  const s = { A: 40, lambda: 50, v: 25, lines: true };
  for (const phase0 of [0, 1, 2, 3]) {
    const pts = scenePoints(s, phase0, angles(1, 1));
    for (let i = 1; i < pts.length; i++) assert.ok(pts[i].u > pts[i - 1].u, `order kept at phase ${phase0}, i = ${i}`);
  }
  // the transverse view and the circle keep the full A
  const side = scenePoints(s, 0.3, angles(1, 0));
  close(Math.max(...side.map((p) => Math.abs(p.w))), 40, 0.05);
  const circle = scenePoints(s, 0.3, angles(0, 0));
  for (const p of circle) close(Math.hypot(p.u, p.w), 40);
});

test('lambdaSpans: the sliding λ measure fades out as its end nears the axis end while the fallback {0, λ} fades in; no jump', () => {
  assert.equal(FADE_S, 1.5);
  close(fadeDistance(25, 100), 25); // λ/4 caps 37,5 → 25
  close(fadeDistance(0, 100), 5);
  const v = 10; // Δ = 15 cm
  // crest at z = 60 with λ = 100: end at 160, far from 200 → only the sliding measure, full alpha
  let sp = lambdaSpans(CREST + TAU * 60 / 100, 100, CREST, v);
  assert.equal(sp.length, 1);
  close(sp[0].z1, 60); close(sp[0].z2, 160); close(sp[0].alpha, 1);
  // crest at z = 92,5: end at 192,5 → 7,5 cm before the end → half-way through the fade: both measures, alphas 0,5
  sp = lambdaSpans(CREST + TAU * 92.5 / 100, 100, CREST, v);
  assert.equal(sp.length, 2);
  close(sp[0].z1, 92.5); close(sp[0].alpha, 0.5);
  assert.deepEqual([sp[1].z1, sp[1].z2], [0, 100]); close(sp[1].alpha, 0.5);
  // crest at z = 5 with λ = 100 → end 105 fits → sliding measure only (continuous with the fallback {0, 100} it replaces)
  sp = lambdaSpans(CREST + TAU * 5 / 100, 100, CREST, v);
  assert.equal(sp.length, 1); close(sp[0].z1, 5); close(sp[0].alpha, 1);
  // λ = 200: never fits → fallback only
  sp = lambdaSpans(1, 200, CREST, v);
  assert.equal(sp.length, 1); assert.deepEqual([sp[0].z1, sp[0].z2, sp[0].alpha], [0, 200, 1]);
});

test('crestAlpha: the A measure fades in after a crest enters at z = 0 and fades out before the first crest reaches z = λ', () => {
  const v = 10; // Δ = 15 cm at λ = 100
  close(crestAlpha(0, 100, v), 0);
  close(crestAlpha(7.5, 100, v), 0.5);
  close(crestAlpha(50, 100, v), 1);
  close(crestAlpha(92.5, 100, v), 0.5);
  close(crestAlpha(100, 100, v), 0);
});
