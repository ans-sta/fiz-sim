# S-01 “Svārstības un viļņi” — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new demonstration page `harmonic-motion.html` (sheet S-01): 41 points in 3D, each moving uniformly on its own circle around a horizontal axis, shown in one of three states — CIRCLE (camera along the axis), TRANSVERSE WAVE (camera from the side, circles edge-on as vertical rods) and LONGITUDINAL WAVE (the rods turned 90° in the screen plane, lying along the axis) — with ~1 s 3D turns between states, sliders A, T, λ, helper lines, a RELATIONS box (f, ω, v, φ) and teacher links.

**Architecture:** Vanilla ES modules, no build step, GitHub Pages. All geometry is one formula: point i at phase φᵢ sits at pᵢ = (A·cos φᵢ, A·sin φᵢ·cos θ, zᵢ + A·sin φᵢ·sin θ) and is projected orthographically to the screen as u = x·cos κ + z·sin κ (horizontal), w = y (vertical). κ is the camera angle (0 = along the axis, 90° = from the side), θ is the circle-plane angle (0 = perpendicular to the axis, 90° = containing the axis). The three states are (κ, θ) = (0, 0), (90°, 0), (90°, 90°); the turns animate κ or θ. Pure logic (`assets/oscillation/model.js`, `hud-model.js`, `params.js`) is unit-tested with `node:test`; the page module `main.js` reuses the shared K-01 HUD modules (`assets/measure/hud.js` `createQuantityList` / `createSettingsCorner`, `ui-scale.js`, `hud-layout.js`, `notices.js`, `url-params.js`, `sim-core.js`) and the `.layout-hud` CSS; drawing is Canvas 2D in `scene.js`.

**Tech Stack:** JavaScript ES modules, Canvas 2D, `node --test` (`npm test`), Playwright MCP for browser checks.

**Spec:** `docs/plans/2026-10-04-svarstibas.md` (S-01, Latvian — the source of every requirement below) and `docs/plans/2026-10-04-izkartojums.md` (layout rules shared by all new-layout pages). Design system: `docs/plans/2026-07-15-rasejuma-dizains.md`.

## Global Constraints

- Repo `/Users/minim4/dev/sites/physics_sims`; work in the worktree given by the controller (branch `s01`). Never push, never merge. Commit at the end of each task; the message ends with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- `npm test` must be green at the end of every task (275 tests before this plan). New tests only in new files `tests/oscillation-*.test.js`.
- **Do not modify** `assets/rolling-ball/*`, `assets/projectile/*`, `assets/measure/*`, `assets/sim-core.js`, `rolling-ball.html`, `projectile-motion.html`, the old pages, or any existing test. `assets/sim-common.css` may only be **appended to** (a new section at the end, every rule prefixed `.layout-hud .s01-…` or scoped to the new class names given in Task 3). `index.html` and `README.md` are edited only in Task 4, only where stated.
- Units: cm and s. A 5–40 cm step 1 (default 20); T 1–8 s step 0,5 (default 4); λ 50–200 cm step 10 (default 100). Axis 200 cm, 41 points every 5 cm, point 0 at z = 0 (left end) is the highlighted orange point. Turn duration 1 s per movement. Nothing else is adjustable (no point count, spacing, φ₀, slow motion, axis length, v slider).
- UI text only from `assets/oscillation/i18n.js`, LV **and** EN for every key; Latvian typography: “…” top quotes, spaced em dash —, en dash in ranges without spaces (5–40), …, ’. Decimal comma in LV numbers (`formatNumber(v, dec, lang)` from `assets/measure/format.js`). No ASCII substitutes in user text. No emojis.
- Every user-facing notice names its cause and what the person can do (the generic `url.*` texts below already do).
- Colours only via `theme.colors()` (`--accent` orange for the highlighted point, `--ink`, `--ink-dim`, `--hairline`, `--field`). Fonts: IBM Plex Mono for labels on the canvas, like K-01 `scene.js`.
- Pure functions get tests; DOM and canvas are checked in the browser (Playwright MCP, page served with `python3 -m http.server <port>` from the worktree root; ES modules do not load from `file://`).

## Review Focus

1. Interrupted turns: pressing LONGITUDINAL in the middle of CIRCLE → TRANSVERSE, or CIRCLE in the middle of TRANSVERSE → LONGITUDINAL, must continue smoothly along the allowed path (θ may be non-zero only while κ = 1) and never jump. (Task 1 `advancePose` tests.)
2. Changing T while running must not make the points jump: time is kept as a phase, and the new T only changes the rate. (Task 1 `advancePhase` test; Task 3 uses the phase, never t·ω.)
3. λ = 200 cm: the λ dimension line must still fit (crest + λ would be off the axis) — it falls back to z = 0 … 200. λ = 50 cm with A = 40 cm: A and λ dimension lines and labels must not overlap the points unreadably. (Task 1 `lambdaSpan` test; browser check in Task 4.)
4. Teacher links with bad values: `?A=100` → A = 40 with a notice; `?T=abc` → default with a “not a number” notice; `?view=side` → CIRCLE with an allowed-values notice; `?A=12.3` → rounded to 12 silently. (Task 2 tests.)
5. Small landscape phone (844 × 390): the 200 cm axis fits the width, 2 × 40 cm fits between the panels and the buttons, the orange point at z = 0 is not under LIELUMI, nothing overlaps the buttons; portrait phone shows the “turn the phone” hint. (Task 1 `sceneLayout` tests; browser check in Task 4.)

---

### Task 1: Pure model — settings, phases, 3D points and projection, poses and turns, dimension helpers, layout

**Files:**
- Create: `assets/oscillation/model.js`
- Test: `tests/oscillation-model.test.js`

**Interfaces:**
- Consumes: `roundTo` from `assets/measure/format.js`; `EDGE_PX` from `assets/measure/hud-layout.js`; `DRAW_RANGE` from `assets/measure/ui-scale.js`.
- Produces (all exported from `assets/oscillation/model.js`):
  - Constants: `AXIS_CM = 200`, `SPACING_CM = 5`, `N_POINTS = 41`, `RANGES = { A: { min: 5, max: 40, step: 1 }, T: { min: 1, max: 8, step: 0.5 }, lambda: { min: 50, max: 200, step: 10 } }`, `VIEWS = ['circle', 'trans', 'long']`, `VIEW_POSE = { circle: { kappa: 0, theta: 0 }, trans: { kappa: 1, theta: 0 }, long: { kappa: 1, theta: 1 } }`, `TURN_S = 1`, `TAU = 2π`, `CREST = π/2`, `COMPRESSION = 0`.
  - `defaultSettings()` → `{ A: 20, T: 4, lambda: 100, lines: true }`.
  - `withA(s, v)`, `withT(s, v)`, `withLambda(s, v)` — clamp to the range, round to the step (`roundTo`), non-finite → `s` unchanged (same object); unchanged value → same object. `withLines(s, on)` — boolean.
  - `derived(s)` → `{ f, omega, v }` (1/T, 2π/T, λ/T).
  - `advancePhase(phase, dt, T)` → phase + 2π·dt/T wrapped into [0, 2π).
  - `pointZ(i)` → i·5. `phaseAt(phase0, z, lambda)` → phase0 − 2π·z/λ.
  - `point3D(phi, z, A, thetaRad)` → `{ x, y, z }`; `project(p, kappaRad)` → `{ u, w }`; `viewCenterU(kappaRad)` → 100·sin κ (the u that must sit at the screen centre).
  - `smooth(x)` → x²(3 − 2x); `poseAngles(pose)` → `{ kappaRad, thetaRad }` (= smooth(pose.·)·π/2).
  - `advancePose(pose, view, dt)` → new `{ kappa, theta }` (each in 0…1), one coordinate moves per call at rate 1/`TURN_S`; order rule: θ may be non-zero only when κ = 1 — so to open θ, κ goes to 1 first; otherwise θ moves first, then κ. `settled(pose, view)` → boolean.
  - `scenePoints(s, phase0, angles)` → array of 41 `{ i, z, phi, u, w }` (angles = `{ kappaRad, thetaRad }`).
  - `circleOutline(z, A, angles, n = 48)` → n + 1 `{ u, w }` along the projected circle of the point at z (closed polyline).
  - `waveCurve(s, phase0, angles, stepCm = 1)` → `{ u, w }` for z = 0, 1, …, 200 (continuous wave through the points).
  - `phaseZ(phase0, lambda, target)` → the first z in [0, λ) whose phase ≡ target (mod 2π): z = λ·frac((phase0 − target)/2π).
  - `lambdaSpan(phase0, lambda, target)` → `{ z1, z2 }` = `[phaseZ, phaseZ + λ]` when z2 ≤ 200, else `[0, λ]`.
  - `sceneLayout(w, h, { top = 0, bottom = 0, drawScale = 1, edge = EDGE_PX } = {})` → `{ scale, cx, cy, fill }`: `fitW = (w − 2·edge)/200`, `band = max(1, h − top − bottom)`, `fitH = band/(2·40·1.15)`, `base = min(fitW, fitH)`, `scale = base·drawScale` (px per cm), `cx = w/2`, `cy = top + band/2`, `fill = min(DRAW_RANGE.max, fitW/base)` (the ZĪMĒJUMS value from which the axis no longer fits the width).
  - `toScreen(lay, pt, kappaRad)` → `{ x: lay.cx + (pt.u − viewCenterU(κ))·lay.scale, y: lay.cy − pt.w·lay.scale }`.

- [ ] **Step 1: Write the failing tests**

```js
// tests/oscillation-model.test.js
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/oscillation-model.test.js`
Expected: FAIL — `Cannot find module '…/assets/oscillation/model.js'`.

- [ ] **Step 3: Write the model**

```js
// assets/oscillation/model.js
// Svārstības un viļņi (S-01): tīrā ģeometrija, bez DOM. Garumi cm, laiks s, leņķi radiānos; pozas 0…1 = ceturtdaļpagriezieni.
// Viena formula visiem skatiem: p = (A cos φ, A sin φ cos θ, z + A sin φ sin θ); ekrānā u = x cos κ + z sin κ, w = y.
import { roundTo } from '../measure/format.js';
import { EDGE_PX } from '../measure/hud-layout.js';
import { DRAW_RANGE } from '../measure/ui-scale.js';

export const AXIS_CM = 200;
export const SPACING_CM = 5;
export const N_POINTS = AXIS_CM / SPACING_CM + 1; // 41
export const RANGES = {
  A: { min: 5, max: 40, step: 1 },
  T: { min: 1, max: 8, step: 0.5 },
  lambda: { min: 50, max: 200, step: 10 },
};
export const VIEWS = ['circle', 'trans', 'long'];
export const VIEW_POSE = { circle: { kappa: 0, theta: 0 }, trans: { kappa: 1, theta: 0 }, long: { kappa: 1, theta: 1 } };
export const TURN_S = 1; // s — viena pagrieziena ilgums (kamera vai svītras)
export const TAU = 2 * Math.PI;
export const CREST = Math.PI / 2; // fāze, kurā punkts ir viļņa kalnā (w = +A)
export const COMPRESSION = 0; // fāze, ap kuru garenvilnī ir sablīvējums (−∂ξ/∂z maksimāls)
const BAND_CM = 2 * RANGES.A.max * 1.15; // augstums, kam jāietilpst starp paneļiem un pogām (A nemaina mērogu)

export function defaultSettings() {
  return { A: 20, T: 4, lambda: 100, lines: true };
}

function withRange(s, key, v) {
  if (!Number.isFinite(v)) return s;
  const r = RANGES[key];
  const next = roundTo(Math.min(r.max, Math.max(r.min, v)), r.step);
  return next === s[key] ? s : { ...s, [key]: next };
}
export const withA = (s, v) => withRange(s, 'A', v);
export const withT = (s, v) => withRange(s, 'T', v);
export const withLambda = (s, v) => withRange(s, 'lambda', v);
export const withLines = (s, on) => (Boolean(on) === s.lines ? s : { ...s, lines: Boolean(on) });

export function derived(s) {
  return { f: 1 / s.T, omega: TAU / s.T, v: s.lambda / s.T };
}

// Laiku glabā kā fāzi: mainot T, mainās tikai ātrums, punkti nelec.
export function advancePhase(phase, dt, T) {
  return (((phase + TAU * dt / T) % TAU) + TAU) % TAU;
}

export const pointZ = (i) => i * SPACING_CM;
export const phaseAt = (phase0, z, lambda) => phase0 - TAU * z / lambda;

export function point3D(phi, z, A, thetaRad) {
  const sn = Math.sin(phi);
  return { x: A * Math.cos(phi), y: A * sn * Math.cos(thetaRad), z: z + A * sn * Math.sin(thetaRad) };
}
export function project(p, kappaRad) {
  return { u: p.x * Math.cos(kappaRad) + p.z * Math.sin(kappaRad), w: p.y };
}
export const viewCenterU = (kappaRad) => (AXIS_CM / 2) * Math.sin(kappaRad);

export const smooth = (x) => x * x * (3 - 2 * x);
export function poseAngles(pose) {
  return { kappaRad: smooth(pose.kappa) * Math.PI / 2, thetaRad: smooth(pose.theta) * Math.PI / 2 };
}

// Pagriezienu secība: θ drīkst būt ≠ 0 tikai, kad κ = 1 (svītras griežas tikai sānskatā). Vienā solī kustas viena koordināta.
export function advancePose(pose, view, dt) {
  const target = VIEW_POSE[view];
  const step = dt / TURN_S;
  const toward = (a, b) => (a < b ? Math.min(b, a + step) : Math.max(b, a - step));
  let { kappa, theta } = pose;
  if (target.theta > theta) {
    if (kappa < 1) kappa = toward(kappa, 1);
    else theta = toward(theta, target.theta);
  } else if (theta !== target.theta) theta = toward(theta, target.theta);
  else kappa = toward(kappa, target.kappa);
  return { kappa, theta };
}
export const settled = (pose, view) => pose.kappa === VIEW_POSE[view].kappa && pose.theta === VIEW_POSE[view].theta;

export function scenePoints(s, phase0, { kappaRad, thetaRad }) {
  const out = [];
  for (let i = 0; i < N_POINTS; i++) {
    const z = pointZ(i);
    const phi = phaseAt(phase0, z, s.lambda);
    const { u, w } = project(point3D(phi, z, s.A, thetaRad), kappaRad);
    out.push({ i, z, phi, u, w });
  }
  return out;
}

export function circleOutline(z, A, { kappaRad, thetaRad }, n = 48) {
  const out = [];
  for (let k = 0; k <= n; k++) out.push(project(point3D(TAU * k / n, z, A, thetaRad), kappaRad));
  return out;
}

export function waveCurve(s, phase0, { kappaRad, thetaRad }, stepCm = 1) {
  const out = [];
  for (let z = 0; z <= AXIS_CM + 1e-9; z += stepCm) out.push(project(point3D(phaseAt(phase0, z, s.lambda), z, s.A, thetaRad), kappaRad));
  return out;
}

// Pirmais z ∈ [0, λ), kurā fāze ≡ target (mod 2π).
export function phaseZ(phase0, lambda, target) {
  const frac = ((phase0 - target) / TAU) % 1;
  return lambda * ((frac + 1) % 1);
}
export function lambdaSpan(phase0, lambda, target) {
  const z1 = phaseZ(phase0, lambda, target);
  return z1 + lambda <= AXIS_CM ? { z1, z2: z1 + lambda } : { z1: 0, z2: lambda };
}

export function sceneLayout(w, h, { top = 0, bottom = 0, drawScale = 1, edge = EDGE_PX } = {}) {
  const fitW = (w - 2 * edge) / AXIS_CM;
  const band = Math.max(1, h - top - bottom);
  const fitH = band / BAND_CM;
  const base = Math.min(fitW, fitH);
  return { scale: base * drawScale, cx: w / 2, cy: top + band / 2, fill: Math.min(DRAW_RANGE.max, fitW / base) };
}
export function toScreen(lay, pt, kappaRad) {
  return { x: lay.cx + (pt.u - viewCenterU(kappaRad)) * lay.scale, y: lay.cy - pt.w * lay.scale };
}
```

- [ ] **Step 4: Run the tests**

Run: `node --test tests/oscillation-model.test.js` → all PASS. Then `npm test` → 275 + 10 green.

- [ ] **Step 5: Commit**

```bash
git add assets/oscillation/model.js tests/oscillation-model.test.js
git commit -m "S-01 model: settings, phases, 3D points and projection, poses and turns, dimension helpers, layout

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Texts (LV/EN), URL parameters, HUD view-models

**Files:**
- Create: `assets/oscillation/i18n.js`, `assets/oscillation/params.js`, `assets/oscillation/hud-model.js`
- Test: `tests/oscillation-params.test.js`, `tests/oscillation-i18n.test.js`, `tests/oscillation-hud-model.test.js`

**Interfaces:**
- Consumes: Task 1 (`VIEWS`, `RANGES`, `defaultSettings`, `withA`, `withT`, `withLambda`, `withLines`, `derived`); `parseParams`, `warningText` from `assets/measure/url-params.js`; `formatNumber` from `assets/measure/format.js`; `makeT` from `assets/translate.js`.
- Produces:
  - `i18n.js`: `export const STRINGS = { lv: {…}, en: {…} }` with exactly the keys listed in Step 3 (same keys in both languages).
  - `params.js`: `export const PARAM_SCHEMA`; `export function settingsFromURL(search)` → `{ settings, view, warnings }` (`view` ∈ `VIEWS`, default `'circle'`; every warning has `param`, `raw`, `reason`, `used`); `export { warningText } from '../measure/url-params.js'`.
  - `hud-model.js`: `export function quantityRows(s, { lang, t })` → the 4 rows for `createQuantityList` (keys `A`, `T`, `lambda`, `lines`); `export function relationsRows(s, phase, { lang })` → `[{ key, k, v, live }]` for f, ω, v, φ; `export function phaseDeg(phase)` → 0…359 integer.

- [ ] **Step 1: Write the failing tests**

```js
// tests/oscillation-i18n.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STRINGS } from '../assets/oscillation/i18n.js';

test('LV and EN have exactly the same keys', () => {
  assert.deepEqual(Object.keys(STRINGS.lv).sort(), Object.keys(STRINGS.en).sort());
});

test('the keys the shared modules need are there', () => {
  for (const k of ['page.title', 'page.heading', 'page.back', 'tb.set', 'tb.sheet', 'tb.topic', 'tb.topicValue', 'tb.themeToggle', 'tb.fullscreen',
    'hud.quantities', 'hud.more', 'hud.less', 'dims.decrease', 'dims.increase', 'notice.close',
    'url.not_number', 'url.out_of_range', 'url.not_allowed', 'url.bad_list', 'url.none', 'url.listHint',
    'gear.open', 'gear.theme', 'gear.light', 'gear.dark', 'gear.lang', 'gear.text', 'gear.textDown', 'gear.textUp',
    'gear.draw', 'gear.drawDown', 'gear.drawUp', 'gear.screen', 'gear.fullscreen',
    'q.A', 'q.T', 'q.lambda', 'q.lines', 'q.lines.on', 'q.lines.off', 'rel.title', 'rel.f', 'rel.omega', 'rel.v', 'rel.phi',
    'view.circle', 'view.trans', 'view.long', 'run.pause', 'run.play', 'hint.rotate', 'scene.aria']) {
    assert.ok(k in STRINGS.lv, `missing ${k}`);
  }
  assert.equal(STRINGS.lv['view.circle'], 'APLIS');
  assert.equal(STRINGS.lv['view.trans'], 'ŠĶĒRSVILNIS');
  assert.equal(STRINGS.lv['view.long'], 'GARENVILNIS');
  assert.equal(STRINGS.en['page.heading'], 'OSCILLATIONS AND WAVES');
});

test('typography: no straight quotes, no "...", no spaced hyphen', () => {
  for (const lang of ['lv', 'en']) {
    for (const [k, v] of Object.entries(STRINGS[lang])) {
      assert.ok(!v.includes('"'), `${lang}.${k} has a straight double quote`);
      assert.ok(!v.includes("'"), `${lang}.${k} has a straight apostrophe`);
      assert.ok(!v.includes('...'), `${lang}.${k} has three dots`);
      assert.ok(!/ - /.test(v), `${lang}.${k} has a spaced hyphen`);
    }
  }
});
```

```js
// tests/oscillation-params.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settingsFromURL, warningText, PARAM_SCHEMA } from '../assets/oscillation/params.js';
import { defaultSettings } from '../assets/oscillation/model.js';
import { makeT } from '../assets/translate.js';
import { STRINGS } from '../assets/oscillation/i18n.js';

const lv = makeT(STRINGS, () => 'lv');

test('no params: defaults, circle view, no warnings', () => {
  const r = settingsFromURL('');
  assert.deepEqual(r.settings, defaultSettings());
  assert.equal(r.view, 'circle');
  assert.deepEqual(r.warnings, []);
});

test('all params given', () => {
  const r = settingsFromURL('?view=long&A=30&T=2,5&lambda=150&lines=0');
  assert.deepEqual(r.settings, { A: 30, T: 2.5, lambda: 150, lines: false });
  assert.equal(r.view, 'long');
  assert.deepEqual(r.warnings, []);
  assert.deepEqual(Object.keys(PARAM_SCHEMA).sort(), ['A', 'T', 'lambda', 'lines', 'view']);
});

test('out of range is clamped with a notice that names the used value', () => {
  const r = settingsFromURL('?A=100');
  assert.equal(r.settings.A, 40);
  assert.equal(r.warnings.length, 1);
  assert.deepEqual([r.warnings[0].param, r.warnings[0].reason, r.warnings[0].used], ['A', 'out_of_range', 40]);
  assert.equal(warningText(r.warnings[0], { t: lv, lang: 'lv' }),
    'Saites parametrs A=100 ir ārpus robežām (5–40). Izmantots A = 40.');
});

test('between steps is rounded silently; not a number and unknown view give notices with the used value', () => {
  assert.equal(settingsFromURL('?A=12.3').settings.A, 12);
  assert.deepEqual(settingsFromURL('?A=12.3').warnings, []);
  const t = settingsFromURL('?T=abc');
  assert.equal(t.settings.T, 4);
  assert.deepEqual([t.warnings[0].reason, t.warnings[0].used], ['not_number', 4]);
  const v = settingsFromURL('?view=side');
  assert.equal(v.view, 'circle');
  assert.deepEqual([v.warnings[0].reason, v.warnings[0].used], ['not_allowed', 'circle']);
  assert.match(warningText(v.warnings[0], { t: lv, lang: 'lv' }), /circle; trans; long/);
});

test('unknown parameters are ignored', () => {
  const r = settingsFromURL('?fbclid=xyz&A=10');
  assert.equal(r.settings.A, 10);
  assert.deepEqual(r.warnings, []);
});
```

```js
// tests/oscillation-hud-model.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quantityRows, relationsRows, phaseDeg } from '../assets/oscillation/hud-model.js';
import { defaultSettings } from '../assets/oscillation/model.js';
import { makeT } from '../assets/translate.js';
import { STRINGS } from '../assets/oscillation/i18n.js';

const lv = makeT(STRINGS, () => 'lv');
const en = makeT(STRINGS, () => 'en');

test('quantityRows: A, T, λ sliders and the helper-lines choice, Latvian numbers', () => {
  const rows = quantityRows(defaultSettings(), { lang: 'lv', t: lv });
  assert.deepEqual(rows.map((r) => r.key), ['A', 'T', 'lambda', 'lines']);
  const [A, T, L, lines] = rows;
  assert.deepEqual([A.symbol, A.valueText, A.kind, A.state, A.min, A.max, A.step, A.value], ['A', '20 cm', 'range', 'editable', 5, 40, 1, 20]);
  assert.deepEqual([T.symbol, T.valueText, T.minText, T.maxText], ['T', '4,0 s', '1 s', '8 s']);
  assert.deepEqual([L.symbol, L.valueText], ['λ', '100 cm']);
  assert.deepEqual([lines.kind, lines.value, lines.valueText], ['choice', true, 'rāda']);
  assert.deepEqual(lines.choices.map((c) => [c.value, c.label]), [[true, 'rāda'], [false, 'nerāda']]);
  assert.equal(quantityRows({ ...defaultSettings(), T: 2.5 }, { lang: 'en', t: en })[1].valueText, '2.5 s');
});

test('relationsRows: f, ω, v with formulas and units; φ live in degrees', () => {
  const rows = relationsRows(defaultSettings(), Math.PI / 2, { lang: 'lv' });
  assert.deepEqual(rows.map((r) => [r.key, r.k, r.v, r.live]), [
    ['f', 'f = 1/T', '0,25 Hz', false],
    ['omega', 'ω = 2π/T', '1,57 rad/s', false],
    ['v', 'v = λ/T', '25 cm/s', false],
    ['phi', 'φ', '90°', true],
  ]);
  assert.equal(relationsRows(defaultSettings(), 0, { lang: 'en' })[0].v, '0.25 Hz');
  assert.equal(phaseDeg(0), 0);
  assert.equal(phaseDeg(2 * Math.PI - 1e-9), 0);
  assert.equal(phaseDeg(Math.PI), 180);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test tests/oscillation-i18n.test.js tests/oscillation-params.test.js tests/oscillation-hud-model.test.js`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the three modules**

```js
// assets/oscillation/i18n.js
export const STRINGS = {
  lv: {
    'page.title': 'Svārstības un viļņi — FIZ-SIM',
    'page.heading': 'SVĀRSTĪBAS UN VIĻŅI',
    'page.back': '← SARAKSTS',
    'tb.set': 'KOMPLEKTS',
    'tb.sheet': 'LAPA',
    'tb.topic': 'TĒMA',
    'tb.topicValue': 'SVĀRSTĪBAS UN VIĻŅI',
    'tb.themeToggle': 'Pārslēgt gaišo un tumšo režīmu',
    'tb.fullscreen': 'Pilnekrāns',

    'hud.quantities': 'LIELUMI',
    'hud.more': 'citi…',
    'hud.less': 'mazāk ▴',
    'dims.decrease': 'Samazināt: {name}',
    'dims.increase': 'Palielināt: {name}',
    'q.A': 'Amplitūda A',
    'q.T': 'Periods T',
    'q.lambda': 'Viļņa garums λ',
    'q.lines': 'palīglīnijas',
    'q.lines.on': 'rāda',
    'q.lines.off': 'nerāda',

    'rel.title': 'SAKARĪBAS',
    'rel.f': 'f = 1/T',
    'rel.omega': 'ω = 2π/T',
    'rel.v': 'v = λ/T',
    'rel.phi': 'φ',

    'view.circle': 'APLIS',
    'view.trans': 'ŠĶĒRSVILNIS',
    'view.long': 'GARENVILNIS',
    'view.group': 'Skats',
    'run.pause': 'Apturēt',
    'run.play': 'Palaist',
    'hint.rotate': 'Pagriez telefonu guļus — tad vilnis ir garāks un punkti lielāki.',
    'scene.aria': 'Punkti telpā: viens aplis no gala, šķērsvilnis vai garenvilnis no sāna; oranžais punkts ir pirmais.',

    'notice.close': 'Aizvērt paziņojumu',
    'url.not_number': 'Saites parametrs {param}={raw} nav skaitlis. Izmantots {param} = {used}.',
    'url.out_of_range': 'Saites parametrs {param}={raw} ir ārpus robežām ({min}–{max}). Izmantots {param} = {used}.',
    'url.not_allowed': 'Saites parametra {param} vērtība “{raw}” nav atļauta. Atļautās vērtības: {allowed}. Izmantots {param} = {used}.',
    'url.bad_list': 'Saites parametrs {param}={raw} nav derīgs saraksts ({hint}). Izmantots {param} = {used}.',
    'url.none': 'nav',
    'url.listHint': 'skaitļi, atdalīti ar komatu',

    'gear.open': 'Iestatījumi: tēma, valoda, burtu un zīmējuma izmērs',
    'gear.theme': 'TĒMA',
    'gear.light': '☀ GAIŠA',
    'gear.dark': '◐ TUMŠA',
    'gear.lang': 'VALODA',
    'gear.text': 'BURTI',
    'gear.textDown': 'Mazāki burti',
    'gear.textUp': 'Lielāki burti',
    'gear.draw': 'ZĪMĒJUMS',
    'gear.drawDown': 'Mazāks zīmējums',
    'gear.drawUp': 'Lielāks zīmējums',
    'gear.screen': 'EKRĀNS',
    'gear.fullscreen': '⛶ PILNEKRĀNS',
  },
  en: {
    'page.title': 'Oscillations and Waves — FIZ-SIM',
    'page.heading': 'OSCILLATIONS AND WAVES',
    'page.back': '← LIST',
    'tb.set': 'SET',
    'tb.sheet': 'SHEET',
    'tb.topic': 'TOPIC',
    'tb.topicValue': 'OSCILLATIONS AND WAVES',
    'tb.themeToggle': 'Toggle light and dark mode',
    'tb.fullscreen': 'Full screen',

    'hud.quantities': 'QUANTITIES',
    'hud.more': 'more…',
    'hud.less': 'less ▴',
    'dims.decrease': 'Decrease: {name}',
    'dims.increase': 'Increase: {name}',
    'q.A': 'Amplitude A',
    'q.T': 'Period T',
    'q.lambda': 'Wavelength λ',
    'q.lines': 'helper lines',
    'q.lines.on': 'shown',
    'q.lines.off': 'hidden',

    'rel.title': 'RELATIONS',
    'rel.f': 'f = 1/T',
    'rel.omega': 'ω = 2π/T',
    'rel.v': 'v = λ/T',
    'rel.phi': 'φ',

    'view.circle': 'CIRCLE',
    'view.trans': 'TRANSVERSE WAVE',
    'view.long': 'LONGITUDINAL WAVE',
    'view.group': 'View',
    'run.pause': 'Pause',
    'run.play': 'Play',
    'hint.rotate': 'Turn the phone sideways — the wave gets longer and the points bigger.',
    'scene.aria': 'Points in space: one circle from the end, a transverse or a longitudinal wave from the side; the orange point is the first one.',

    'notice.close': 'Close the notice',
    'url.not_number': 'Link parameter {param}={raw} is not a number. Using {param} = {used}.',
    'url.out_of_range': 'Link parameter {param}={raw} is out of range ({min}–{max}). Using {param} = {used}.',
    'url.not_allowed': 'Link parameter {param} value “{raw}” is not allowed. Allowed values: {allowed}. Using {param} = {used}.',
    'url.bad_list': 'Link parameter {param}={raw} is not a valid list ({hint}). Using {param} = {used}.',
    'url.none': 'none',
    'url.listHint': 'numbers separated by commas',

    'gear.open': 'Settings: theme, language, text and drawing size',
    'gear.theme': 'THEME',
    'gear.light': '☀ LIGHT',
    'gear.dark': '◐ DARK',
    'gear.lang': 'LANGUAGE',
    'gear.text': 'TEXT',
    'gear.textDown': 'Smaller text',
    'gear.textUp': 'Larger text',
    'gear.draw': 'DRAWING',
    'gear.drawDown': 'Smaller drawing',
    'gear.drawUp': 'Larger drawing',
    'gear.screen': 'SCREEN',
    'gear.fullscreen': '⛶ FULL SCREEN',
  },
};
```

Before writing the `gear.*` and `url.*` EN texts, copy them from `assets/rolling-ball/i18n.js` (EN block) so the wording is identical across pages; the LV ones above are already identical to K-01.

```js
// assets/oscillation/params.js
// Saite skolotājam (spec. 6): view, A, T, lambda, lines — tikai sākuma vērtības; nezināmos ignorē, ārpus robežām — nogriež ar paziņojumu.
import { parseParams } from '../measure/url-params.js';
import { VIEWS, RANGES, defaultSettings, withA, withT, withLambda, withLines } from './model.js';

export const PARAM_SCHEMA = {
  view: { type: 'enum', values: VIEWS },
  A: { type: 'number', min: RANGES.A.min, max: RANGES.A.max },
  T: { type: 'number', min: RANGES.T.min, max: RANGES.T.max },
  lambda: { type: 'number', min: RANGES.lambda.min, max: RANGES.lambda.max },
  lines: { type: 'bool' },
};

export function settingsFromURL(search) {
  const p = parseParams(search, PARAM_SCHEMA);
  const v = p.values;
  let s = defaultSettings();
  if ('A' in v) s = withA(s, v.A);
  if ('T' in v) s = withT(s, v.T);
  if ('lambda' in v) s = withLambda(s, v.lambda);
  if ('lines' in v) s = withLines(s, v.lines);
  const view = v.view ?? 'circle';
  const finalValue = { view, A: s.A, T: s.T, lambda: s.lambda, lines: s.lines ? '1' : '0' };
  const warnings = p.warnings.map((w) => ('used' in w ? w : { ...w, used: finalValue[w.param] }));
  return { settings: s, view, warnings };
}

export { warningText } from '../measure/url-params.js';
```

Note: `parseParams` returns `used` already for `out_of_range`; the mapping above fills it for `not_number` and `not_allowed`.

```js
// assets/oscillation/hud-model.js
// LIELUMI rindas un SAKARĪBAS rindas — tīri dati bez DOM (spec. 4.1, 4.2).
import { RANGES, derived, TAU } from './model.js';
import { formatNumber } from '../measure/format.js';

export function quantityRows(s, { lang, t }) {
  const num = (v, dec) => formatNumber(v, dec, lang);
  const range = (key, symbol, name, valueText, unit, dec) => ({
    key, symbol, name, valueText, state: 'editable', kind: 'range', group: 'main',
    min: RANGES[key].min, max: RANGES[key].max, step: RANGES[key].step, value: s[key],
    minText: `${num(RANGES[key].min, 0)} ${unit}`, maxText: `${num(RANGES[key].max, 0)} ${unit}`,
  });
  const on = t('q.lines.on');
  const off = t('q.lines.off');
  return [
    range('A', 'A', t('q.A'), `${num(s.A, 0)} cm`, 'cm'),
    range('T', 'T', t('q.T'), `${num(s.T, 1)} s`, 's'),
    range('lambda', 'λ', t('q.lambda'), `${num(s.lambda, 0)} cm`, 'cm'),
    {
      key: 'lines', symbol: t('q.lines'), name: t('q.lines'), valueText: s.lines ? on : off, state: 'editable', kind: 'choice', group: 'main',
      value: s.lines, choices: [{ value: true, label: on }, { value: false, label: off }],
    },
  ];
}

export function phaseDeg(phase) {
  return Math.round((((phase % TAU) + TAU) % TAU) / TAU * 360) % 360;
}

export function relationsRows(s, phase, { lang }) {
  const d = derived(s);
  const num = (v, dec) => formatNumber(v, dec, lang);
  return [
    { key: 'f', k: 'f = 1/T', v: `${num(d.f, 2)} Hz`, live: false },
    { key: 'omega', k: 'ω = 2π/T', v: `${num(d.omega, 2)} rad/s`, live: false },
    { key: 'v', k: 'v = λ/T', v: `${num(d.v, 0)} cm/s`, live: false },
    { key: 'phi', k: 'φ', v: `${phaseDeg(phase)}°`, live: true },
  ];
}
```

The `k` texts of the relations are formulas, identical in both languages, so they are literals here; the i18n keys `rel.*` exist for aria labels and future use — `main.js` uses `t('rel.title')` for the box title.

- [ ] **Step 4: Run the tests**

Run: `node --test tests/oscillation-*.test.js` → PASS; `npm test` → green.

- [ ] **Step 5: Commit**

```bash
git add assets/oscillation/i18n.js assets/oscillation/params.js assets/oscillation/hud-model.js tests/oscillation-i18n.test.js tests/oscillation-params.test.js tests/oscillation-hud-model.test.js
git commit -m "S-01 texts LV/EN, teacher-link parameters, HUD view-models

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: The page — canvas scene, HUD wiring, view buttons, CSS

**Files:**
- Create: `harmonic-motion.html`, `assets/oscillation/scene.js`, `assets/oscillation/main.js`
- Modify: `assets/sim-common.css` — **append** one section at the end (nothing else)

**Interfaces:**
- Consumes: Task 1 (`VIEW_POSE`, `VIEWS`, `TAU`, `CREST`, `COMPRESSION`, `defaultSettings`, `withA`, `withT`, `withLambda`, `withLines`, `advancePhase`, `advancePose`, `settled`, `poseAngles`, `smooth`, `scenePoints`, `circleOutline`, `waveCurve`, `phaseZ`, `lambdaSpan`, `sceneLayout`, `toScreen`, `pointZ`, `phaseAt`, `point3D`, `project`, `AXIS_CM`); Task 2 (`STRINGS`, `settingsFromURL`, `warningText`, `quantityRows`, `relationsRows`); shared: `createI18n`, `createTheme`, `mountHeaderTools`, `mountTitleCells`, `setupCanvas`, `startLoop` from `assets/sim-core.js`; `createQuantityList`, `createSettingsCorner` from `assets/measure/hud.js`; `legendScale` from `assets/measure/ui-scale.js`; `TOP_MARGIN`, `PANEL_GAP` from `assets/measure/hud-layout.js`; `createNotices` from `assets/measure/notices.js`.
- Produces: `scene.js` `export function drawScene(ctx, lay, m)` with `m = { settings, phase, pose, angles, colors, legend, t }`; `main.js` sets `window.__hm = { get state(), setView(view), setSettings(next) }` for browser checks.

- [ ] **Step 1: The page shell**

```html
<!-- harmonic-motion.html -->
<!DOCTYPE html>
<html lang="lv" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>Svārstības un viļņi — FIZ-SIM</title>
<script>
  // Tēma pirms pirmā zīmējuma, lai nemirgo; tā pati loģika kā sim-core.js createTheme().
  try {
    var saved = localStorage.getItem('fiz-sim-theme');
    document.documentElement.dataset.theme = saved || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  } catch (e) {}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/sim-common.css">
<script type="module" src="assets/oscillation/main.js"></script>
</head>
<body class="layout-hud">
<div class="frame">
  <header>
    <a class="back" href="index.html" data-i18n="page.back">← SARAKSTS</a>
    <h1><span data-i18n="page.heading">SVĀRSTĪBAS UN VIĻŅI</span> <span class="sheet-no">S-01</span></h1>
    <div class="head-tools" id="headTools"></div>
  </header>
  <div class="work">
    <div class="drawing" id="drawing">
      <p class="boot-msg" id="bootMsg">Lapa neielādējās. Atver to caur tīmekļa serveri (piem. ans-sta.github.io/fiz-sim), nevis kā failu no datora. · The page did not load. Open it through a web server, not as a local file.</p>
      <canvas id="scene" role="img" data-i18n-aria="scene.aria"></canvas>
      <div id="hudLeft"></div>
      <div id="hudRight"></div>
      <div class="s01-views" id="viewSlot" role="group"></div>
      <p class="s01-hint" id="turnHint" data-i18n="hint.rotate"></p>
      <div class="notices" id="notices" role="status" aria-live="polite"></div>
      <div class="title-small" id="titleSmall" hidden></div>
      <div id="gear"></div>
    </div>
  </div>
</div>
</body>
</html>
```

- [ ] **Step 2: CSS — append to `assets/sim-common.css`**

```css

/* ══ S-01 Svārstības un viļņi: SAKARĪBAS lauciņš, skatu pogas, telefona padoms ══ */
.layout-hud .s01-rel { right: 8px; text-align: right; padding-bottom: calc(6px * var(--hud)); min-width: min(calc(150px * var(--hud)), calc(50% - 12px)); }
.layout-hud .s01-rel .r-row { display: flex; justify-content: flex-end; gap: 0.6em; padding: 0 calc(10px * var(--hud)); font-size: calc(11px * var(--hud)); line-height: 1.5; font-variant-numeric: tabular-nums; color: var(--ink-dim); }
.layout-hud .s01-rel .r-row .v { color: var(--ink); font-weight: 500; min-width: 5.5em; text-align: right; }
.layout-hud .s01-rel .r-row.live .v { color: var(--accent); }
.layout-hud .s01-views { position: absolute; left: 50%; bottom: 18px; transform: translateX(-50%); z-index: 3; display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; max-width: calc(100% - 120px); }
.layout-hud .s01-views .btn { background: var(--sheet); font-size: calc(10.5px * var(--hud)); padding: calc(7px * var(--hud)) calc(12px * var(--hud)); letter-spacing: 0.08em; font-weight: 600; }
.layout-hud .s01-views .btn.pause { min-width: calc(34px * var(--hud)); padding-left: 0; padding-right: 0; }
.layout-hud .s01-hint { display: none; position: absolute; left: 12px; right: 12px; bottom: 2px; z-index: 3; margin: 0; text-align: center; font-family: 'IBM Plex Sans', system-ui, sans-serif; font-size: calc(11px * var(--hud)); color: var(--ink-dim); }
@media (orientation: portrait) and (max-width: 700px) {
  .layout-hud .s01-hint { display: block; }
  .layout-hud .s01-views { bottom: 26px; }
}
@media (max-width: 520px) { .layout-hud .s01-views { max-width: calc(100% - 64px); } }
```

- [ ] **Step 3: The scene (canvas)**

```js
// assets/oscillation/scene.js
// Zīmē ainu: ass, riņķu kontūras (palīglīnijas), 41 punkts, oranžais pirmais; palīglīnijas pa stāvokļiem; izmēru līnijas A un λ.
// Visas koordinātas nāk no model.js projekcijas; šeit tikai pikseļi un krāsas. Caurspīdīgums pārejās: no pozas (0…1).
import { AXIS_CM, CREST, COMPRESSION, smooth, scenePoints, circleOutline, waveCurve, phaseZ, lambdaSpan, toScreen, project } from './model.js';

const MONO = 'ui-monospace, monospace';
const fontLabel = (k = 1) => `400 ${11 * k}px "IBM Plex Mono", ${MONO}`;
const R_POINT = 3.5; // px — parastie punkti
const R_FIRST = 6; // px — oranžais punkts
const ARC_PX = 16; // φ loka rādiuss
const DIM_GAP = 18; // px no viļņa līdz λ izmēru līnijai

function path(ctx, pts) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
}
function strokeStyle(ctx, color, alpha = 1, width = 1, dash = []) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
}
function text(ctx, str, x, y, { font, color, align = 'left', alpha = 1 }) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}
function dot(ctx, p, r, color, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
}
function tick45(ctx, p, len = 6) {
  const k = len / 2 / Math.SQRT2;
  ctx.beginPath();
  ctx.moveTo(p.x - k, p.y + k);
  ctx.lineTo(p.x + k, p.y - k);
  ctx.stroke();
}
// Izmēru līnija starp diviem ekrāna punktiem ar 45° atzīmēm galos un uzrakstu vidū (perpendikulāri nobīdītu par `off`).
function dimLine(ctx, a, b, label, off, m, alpha) {
  strokeStyle(ctx, m.colors.ink, alpha);
  path(ctx, [a, b]);
  ctx.stroke();
  tick45(ctx, a);
  tick45(ctx, b);
  const k = m.legend;
  const mx = (a.x + b.x) / 2 + off.x * (6 + 6 * k);
  const my = (a.y + b.y) / 2 + off.y * (6 + 6 * k) + (off.y > 0 ? 9 * k : off.y < 0 ? 0 : 4 * k);
  text(ctx, label, mx, my, { font: fontLabel(k), color: m.colors.ink, align: off.x > 0 ? 'left' : off.x < 0 ? 'right' : 'center', alpha });
}

export function drawScene(ctx, lay, m) {
  const { settings: s, phase, pose, angles, colors: c } = m;
  const κ = angles.kappaRad;
  const S = (pt) => toScreen(lay, pt, κ);
  const side = smooth(pose.kappa); // 0 — no gala, 1 — no sāna
  const turned = smooth(pose.theta); // 0 — šķērs, 1 — garen
  const circleA = 1 - side;
  const transA = side * (1 - turned);
  const longA = side * turned;
  const W = ctx.canvas.clientWidth || lay.cx * 2;
  const H = ctx.canvas.clientHeight || lay.cy * 2;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.lineCap = 'round';

  const pts = scenePoints(s, phase, angles);
  const origin = S({ u: 0, w: 0 });

  // ass (sānskatā; no gala tā ir punkts)
  if (side > 0) {
    strokeStyle(ctx, c.hairline, side);
    path(ctx, [S(project({ x: 0, y: 0, z: 0 }, κ)), S(project({ x: 0, y: 0, z: AXIS_CM }, κ))]);
    ctx.stroke();
  }

  if (s.lines) {
    // riņķu kontūras: no gala — viens aplis; no sāna — svītras (vertikālas → gar asi)
    for (const p of pts) {
      strokeStyle(ctx, c.hairline, p.i === 0 ? 0.9 : 0.45);
      path(ctx, circleOutline(p.z, s.A, angles).map(S));
      ctx.stroke();
    }
    // sinusoīda caur punktiem — tikai šķērsviļņa stāvoklī (iebāl/izbāl)
    if (transA > 0.01) {
      strokeStyle(ctx, c.inkDim, transA, 1);
      path(ctx, waveCurve(s, phase, angles).map(S));
      ctx.stroke();
    }
    // APLIS: rādiuss, vertikālais diametrs, projekcija, φ loks
    if (circleA > 0.01) {
      const first = S(pts[0]);
      strokeStyle(ctx, c.hairline, circleA);
      path(ctx, [S({ u: 0, w: s.A }), S({ u: 0, w: -s.A })]);
      ctx.stroke();
      strokeStyle(ctx, c.ink, circleA);
      path(ctx, [origin, first]);
      ctx.stroke();
      strokeStyle(ctx, c.accent, circleA, 1, [4, 4]);
      path(ctx, [first, { x: origin.x, y: first.y }]);
      ctx.stroke();
      dot(ctx, { x: origin.x, y: first.y }, 3, c.accent, circleA);
      const phi = ((pts[0].phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      strokeStyle(ctx, c.ink, circleA, 1);
      ctx.beginPath();
      ctx.arc(origin.x, origin.y, ARC_PX, 0, -phi, true); // ekrāna y uz leju → pretēji pulksteņa rādītājam
      ctx.stroke();
      const mid = -phi / 2;
      text(ctx, 'φ', origin.x + Math.cos(mid) * (ARC_PX + 8 * m.legend), origin.y + Math.sin(mid) * (ARC_PX + 8 * m.legend) + 4 * m.legend,
        { font: fontLabel(m.legend), color: c.ink, align: 'center', alpha: circleA });
    }
    // ŠĶĒRSVILNIS: A līdz kalnam, λ starp kalniem
    if (transA > 0.01 && settledEnough(pose, 1, 0)) {
      const zc = phaseZ(phase, s.lambda, CREST);
      dimLine(ctx, S({ u: zc, w: 0 }), S({ u: zc, w: s.A }), 'A', { x: 1, y: 0 }, m, transA);
      const { z1, z2 } = lambdaSpan(phase, s.lambda, CREST);
      const yDim = lay.cy - s.A * lay.scale - DIM_GAP;
      strokeStyle(ctx, c.hairline, transA, 1, [3, 3]);
      path(ctx, [S({ u: z1, w: s.A }), { x: S({ u: z1, w: 0 }).x, y: yDim }]);
      ctx.stroke();
      path(ctx, [S({ u: z2, w: s.A }), { x: S({ u: z2, w: 0 }).x, y: yDim }]);
      ctx.stroke();
      dimLine(ctx, { x: S({ u: z1, w: 0 }).x, y: yDim }, { x: S({ u: z2, w: 0 }).x, y: yDim }, 'λ', { x: 0, y: -1 }, m, transA);
    }
    // GARENVILNIS: A no pirmā punkta centra līdz tā galējam stāvoklim, λ starp sablīvējumiem
    if (longA > 0.01 && settledEnough(pose, 1, 1)) {
      const yA = lay.cy + 14 + 6 * m.legend;
      strokeStyle(ctx, c.hairline, longA, 1, [3, 3]);
      path(ctx, [origin, { x: origin.x, y: yA }]);
      ctx.stroke();
      path(ctx, [S({ u: s.A, w: 0 }), { x: S({ u: s.A, w: 0 }).x, y: yA }]);
      ctx.stroke();
      dimLine(ctx, { x: origin.x, y: yA }, { x: S({ u: s.A, w: 0 }).x, y: yA }, 'A', { x: 0, y: 1 }, m, longA);
      const { z1, z2 } = lambdaSpan(phase, s.lambda, COMPRESSION);
      const yL = lay.cy - 14 - 6 * m.legend;
      strokeStyle(ctx, c.hairline, longA, 1, [3, 3]);
      path(ctx, [S({ u: z1, w: 0 }), { x: S({ u: z1, w: 0 }).x, y: yL }]);
      ctx.stroke();
      path(ctx, [S({ u: z2, w: 0 }), { x: S({ u: z2, w: 0 }).x, y: yL }]);
      ctx.stroke();
      dimLine(ctx, { x: S({ u: z1, w: 0 }).x, y: yL }, { x: S({ u: z2, w: 0 }).x, y: yL }, 'λ', { x: 0, y: -1 }, m, longA);
    }
  }

  // punkti: vispirms pārējie, oranžais pēdējais (virsū)
  for (let i = pts.length - 1; i >= 1; i--) dot(ctx, S(pts[i]), R_POINT, c.ink, 0.9);
  dot(ctx, S(pts[0]), R_FIRST, c.accent, 1);
  ctx.restore();
}

// Izmēru līnijas rāda tikai, kad poza ir (gandrīz) galastāvoklī — pārejā tās izbāl kopā ar transA/longA.
function settledEnough(pose, kappa, theta) {
  return Math.abs(pose.kappa - kappa) < 0.999 + 1e-9 && Math.abs(pose.theta - theta) < 0.999 + 1e-9;
}
```

`settledEnough` must return true in the end state and false before the turn has started; the alpha factors (`transA`, `longA`) do the fading.

- [ ] **Step 4: The page module**

```js
// assets/oscillation/main.js
import { createI18n, createTheme, mountHeaderTools, mountTitleCells, setupCanvas, startLoop } from '../sim-core.js';
import { STRINGS } from './i18n.js';
import {
  VIEWS, VIEW_POSE, defaultSettings, withA, withT, withLambda, withLines, advancePhase, advancePose, poseAngles, sceneLayout,
} from './model.js';
import { settingsFromURL, warningText } from './params.js';
import { quantityRows, relationsRows } from './hud-model.js';
import { drawScene } from './scene.js';
import { createNotices } from '../measure/notices.js';
import { createQuantityList, createSettingsCorner } from '../measure/hud.js';
import { legendScale } from '../measure/ui-scale.js';
import { TOP_MARGIN, PANEL_GAP } from '../measure/hud-layout.js';

document.getElementById('bootMsg')?.remove();
const i18n = createI18n(STRINGS);
const theme = createTheme();
const t = (key, vars) => i18n.t(key, vars);

mountHeaderTools(document.getElementById('headTools'), { i18n, theme });
const titleSmall = document.getElementById('titleSmall');
mountTitleCells(titleSmall, { i18n, sheet: 'S-01', topicKey: 'tb.topicValue' });
i18n.apply();

const url = settingsFromURL(location.search);
const state = {
  settings: url.settings,
  view: url.view, // mērķa stāvoklis (poga)
  pose: { ...VIEW_POSE[url.view] }, // saites skats atveras uzreiz, bez pagrieziena
  phase: 0,
  paused: false,
  drawScale: 1,
  leftH: 0, // LIELUMI augstums aizvērtā stāvoklī (atvērts slīdnis zīmējumu nebīda)
};

const drawing = document.getElementById('drawing');
const hudLeft = document.getElementById('hudLeft');
const hudRight = document.getElementById('hudRight');
const viewSlot = document.getElementById('viewSlot');

const notices = createNotices(document.getElementById('notices'), { closeLabel: () => t('notice.close') });
url.warnings.forEach((w, i) => notices.show(`url${i}`, () => warningText(w, { t: i18n.t, lang: i18n.lang() })));

const quantities = createQuantityList(hudLeft, {
  labels: () => ({
    title: t('hud.quantities'), fixed: '', more: t('hud.more'), less: t('hud.less'),
    decrease: (name) => t('dims.decrease', { name }), increase: (name) => t('dims.increase', { name }),
  }),
  onChange(key, v) {
    const s = state.settings;
    const next = { A: () => withA(s, v), T: () => withT(s, v), lambda: () => withLambda(s, v), lines: () => withLines(s, v) }[key]?.() ?? s;
    state.settings = next;
    render();
  },
});

// SAKARĪBAS — mazs lauciņš pie labās malas: f, ω, v (pelēki) un dzīvā φ
hudRight.classList.add('hud', 's01-rel');
const relTitle = document.createElement('div');
relTitle.className = 'hud-title';
hudRight.appendChild(relTitle);
const relRows = new Map();
function paintRelations() {
  relTitle.textContent = t('rel.title');
  for (const r of relationsRows(state.settings, state.phase, { lang: i18n.lang() })) {
    let el = relRows.get(r.key);
    if (!el) {
      el = document.createElement('div');
      el.className = `r-row${r.live ? ' live' : ''}`;
      el.innerHTML = '<span class="k"></span><span class="v"></span>';
      hudRight.appendChild(el);
      relRows.set(r.key, el);
    }
    if (el.firstChild.textContent !== r.k) el.firstChild.textContent = r.k;
    if (el.lastChild.textContent !== r.v) el.lastChild.textContent = r.v;
  }
}

const gear = createSettingsCorner(document.getElementById('gear'), {
  i18n,
  theme,
  labels: () => ({
    open: t('gear.open'), theme: t('gear.theme'), light: t('gear.light'), dark: t('gear.dark'), lang: t('gear.lang'),
    text: t('gear.text'), textDown: t('gear.textDown'), textUp: t('gear.textUp'),
    draw: t('gear.draw'), drawDown: t('gear.drawDown'), drawUp: t('gear.drawUp'),
    screen: t('gear.screen'), fullscreen: t('gear.fullscreen'),
  }),
  onDrawScale(v) { state.drawScale = v; render(); },
  onTextScale() { render(); },
});
state.drawScale = gear.drawScale();

// Skatu pogas: APLIS · ŠĶĒRSVILNIS · GARENVILNIS un ⏸/▶ (spec. 4.3)
const viewBtns = new Map();
for (const v of VIEWS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn';
  b.addEventListener('click', () => setView(v));
  viewSlot.appendChild(b);
  viewBtns.set(v, b);
}
const pauseBtn = document.createElement('button');
pauseBtn.type = 'button';
pauseBtn.className = 'btn pause';
pauseBtn.addEventListener('click', () => { state.paused = !state.paused; render(); });
viewSlot.appendChild(pauseBtn);

function setView(v) {
  if (!VIEWS.includes(v) || v === state.view) return;
  state.view = v;
  render();
}

document.addEventListener('keydown', (ev) => {
  const tag = ev.target?.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  if (ev.key === '1') setView('circle');
  else if (ev.key === '2') setView('trans');
  else if (ev.key === '3') setView('long');
  else if (ev.key === ' ' && tag !== 'BUTTON') { ev.preventDefault(); state.paused = !state.paused; render(); }
});

const canvas = document.getElementById('scene');
let view = null;
view = setupCanvas(canvas, () => render());
new ResizeObserver(() => render()).observe(hudRight);

function layout() {
  const { w, h } = view.size();
  if (!hudLeft.classList.contains('sliding')) state.leftH = hudLeft.offsetHeight; // atvērts slīdnis zīmējumu nebīda
  const top = TOP_MARGIN + Math.max(state.leftH, hudRight.offsetHeight) + PANEL_GAP;
  const hint = document.getElementById('turnHint');
  const hintH = hint.offsetParent ? hint.offsetHeight : 0;
  const bottom = h - viewSlot.offsetTop + PANEL_GAP + hintH;
  return sceneLayout(w, h, { top, bottom, drawScale: state.drawScale });
}

function step(dt) {
  if (!state.paused) state.phase = advancePhase(state.phase, dt, state.settings.T);
  state.pose = advancePose(state.pose, state.view, dt);
  render();
}
startLoop(step);

function render() {
  if (!view) return;
  quantities.update(quantityRows(state.settings, { lang: i18n.lang(), t: i18n.t }));
  paintRelations();
  for (const [v, b] of viewBtns) {
    const label = t(`view.${v}`);
    if (b.textContent !== label) b.textContent = label;
    b.setAttribute('aria-pressed', String(v === state.view));
  }
  viewSlot.setAttribute('aria-label', t('view.group'));
  pauseBtn.textContent = state.paused ? '▶' : '⏸';
  pauseBtn.setAttribute('aria-label', state.paused ? t('run.play') : t('run.pause'));
  pauseBtn.setAttribute('aria-pressed', String(state.paused));

  const lay = layout();
  drawScene(view.ctx, lay, {
    settings: state.settings,
    phase: state.phase,
    pose: state.pose,
    angles: poseAngles(state.pose),
    colors: theme.colors(),
    legend: legendScale(gear.textScale()),
    t: i18n.t,
  });
  gear.setDrawFit(lay.fill);
  const { w, h } = view.size();
  const big = w >= 900 && h >= 560;
  titleSmall.hidden = !big;
  drawing.classList.toggle('has-title', big);
}

theme.onChange(render);
i18n.onChange(() => { notices.refresh(); render(); });
document.fonts.ready.then(render);

// Testu āķis pārlūka pārbaudēm (Playwright)
window.__hm = {
  get state() { return state; },
  setView,
  setSettings(next) { state.settings = next; render(); },
  layout,
};
render();
```

Notes for the implementer:
- `createQuantityList` reads `labels.fixed` for locked rows only; this page has none, so `fixed: ''` is enough.
- `viewSlot.offsetTop` is the top of the absolutely positioned button row inside `#drawing` (`bottom: 18px`), so `bottom = h − offsetTop + PANEL_GAP (+ hint)` reserves the button row and a gap.
- Keep the `render()` per frame cheap: `quantities.update` and `paintRelations` only touch the DOM when text changes (they already compare).
- Pointer events: the canvas needs none; nothing is draggable on this page.

- [ ] **Step 5: Browser check (Playwright MCP)**

Serve the worktree: `python3 -m http.server 8771` (background) and open `http://localhost:8771/harmonic-motion.html`. Check and screenshot (`.playwright-mcp/s01-*.png`):
1. Loads in CIRCLE: one circle, points on it, orange point, LIELUMI with A/T/λ/palīglīnijas, SAKARĪBAS with four rows, buttons APLIS (pressed) · ŠĶĒRSVILNIS · GARENVILNIS · ⏸.
2. `window.__hm.setView('trans')` → after 1,2 s a sine wave across the width, vertical rods, A and λ dimension lines; `setView('long')` → rods along the axis, compressions; `setView('circle')` → back to the circle (two movements).
3. Mid-turn interrupt: `setView('trans')`, wait 0,4 s, `setView('long')` — no jump (take two screenshots 0,2 s apart and eyeball continuity; also `__hm.state.pose` θ stays 0 until κ = 1).
4. Sliders: open A (click the row), press + — the circle grows, SAKARĪBAS unchanged; open T, press + — φ rate changes, no jump; λ = 200 → the λ line spans the whole axis in TRANSVERSE.
5. ⏸ stops the points; ⚙ opens; LV/EN toggles texts; theme toggle recolours the canvas.
6. Viewports: 1600 × 900, 844 × 390 (landscape phone: the orange point at z = 0 is visible, not under LIELUMI; buttons not covered), 390 × 844 (portrait: hint visible under the buttons).
7. Console: no errors, no `i18n: trūkst` warnings.

Fix what the check shows before committing.

- [ ] **Step 6: Run `npm test`** → green (no new tests in this task).

- [ ] **Step 7: Commit**

```bash
git add harmonic-motion.html assets/oscillation/scene.js assets/oscillation/main.js assets/sim-common.css
git commit -m "S-01 page: canvas scene with three states and 3D turns, LIELUMI, SAKARĪBAS, view buttons, ⚙

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Index card, README, final browser pass

**Files:**
- Modify: `index.html` (one new card after the “Falls and throws” card; one new `.tag-waves` CSS rule after `.tag-mechanics`; 3 new keys in both `TRANSLATIONS.en` and `TRANSLATIONS.lv`), `README.md` (one table row in “Simulations”, one line in “Structure”, a new section “Teacher links (S-01)”).

**Interfaces:**
- Consumes: the page from Task 3; `index.html` card markup conventions (see the K-01/K-02 cards: `<a href class="card">`, `.card-visual` with a 200 × 140 SVG, `.card-body` with `.card-tag`, `.card-title`, `.card-desc`, `.card-status.status-live`).

- [ ] **Step 1: The card**

Insert after the K-02 card (before `</div>\n</main>`):

```html
    <!-- ══════ CARD 7: Oscillations and waves ══════ -->
    <a href="harmonic-motion.html" class="card">
      <div class="card-visual">
        <svg width="200" height="140" viewBox="0 0 200 140">
          <!-- Circle (end view) -->
          <circle cx="42" cy="70" r="30" fill="none" stroke="#5a6d88" stroke-width="1.2"/>
          <line x1="42" y1="70" x2="63" y2="49" stroke="#c8d6e8" stroke-width="1"/>
          <circle cx="63" cy="49" r="4.5" fill="#ff7a29"/>
          <!-- Projection to the wave -->
          <line x1="63" y1="49" x2="86" y2="49" stroke="#ff7a2988" stroke-width="1" stroke-dasharray="3 3"/>
          <!-- Transverse wave (side view) -->
          <line x1="86" y1="70" x2="190" y2="70" stroke="#5a6d88" stroke-width="0.8"/>
          <path d="M 86 49 C 96 49 101 91 112 91 S 128 49 138 49 S 154 91 164 91 S 180 49 190 49" fill="none" stroke="#c8d6e8" stroke-width="1.2"/>
          <circle cx="86" cy="49" r="4.5" fill="#ff7a29"/>
          <circle cx="99" cy="63" r="2.5" fill="#c8d6e8"/><circle cx="112" cy="91" r="2.5" fill="#c8d6e8"/><circle cx="125" cy="77" r="2.5" fill="#c8d6e8"/>
          <circle cx="138" cy="49" r="2.5" fill="#c8d6e8"/><circle cx="151" cy="63" r="2.5" fill="#c8d6e8"/><circle cx="164" cy="91" r="2.5" fill="#c8d6e8"/><circle cx="177" cy="77" r="2.5" fill="#c8d6e8"/>
          <!-- Longitudinal hint: ticks of varying density -->
          <path d="M 90 120 v 8 M 95 120 v 8 M 99 120 v 8 M 102 120 v 8 M 104 120 v 8 M 110 120 v 8 M 118 120 v 8 M 128 120 v 8 M 138 120 v 8 M 146 120 v 8 M 151 120 v 8 M 154 120 v 8 M 156 120 v 8 M 162 120 v 8 M 170 120 v 8 M 180 120 v 8" stroke="#5a6d88" stroke-width="1"/>
        </svg>
      </div>
      <div class="card-body">
        <div class="card-tag tag-waves" data-i18n="tagWaves">Oscillations &amp; waves</div>
        <div class="card-title" data-i18n="shmTitle">Oscillations and Waves</div>
        <p class="card-desc" data-i18n="shmDesc">One motion seen three ways: points circling from the end, a transverse wave from the side, and the same rods turned into a longitudinal wave.</p>
        <div class="card-status status-live">
          <div class="status-dot"></div>
          <span data-i18n="statusLive">Live</span>
        </div>
      </div>
    </a>
```

CSS after `.tag-mechanics { … }`:

```css
  .tag-waves {
    color: #ff7a29;
    background: #ff7a2922;
    border: 1px solid #ff7a2933;
  }
```

Translations — add to `en`: `tagWaves: "Oscillations & waves", shmTitle: "Oscillations and Waves", shmDesc: "One motion seen three ways: points circling from the end, a transverse wave from the side, and the same rods turned into a longitudinal wave."`; to `lv`: `tagWaves: "Svārstības un viļņi", shmTitle: "Svārstības un viļņi", shmDesc: "Viena kustība no trim pusēm: punkti riņķo, skatoties no gala; šķērsvilnis no sāna; tās pašas svītras pagrieztas — garenvilnis."`. If the card stagger animation lists `.card:nth-child(1…4)` only, leave it (later cards appear without delay, as the K-01/K-02 cards already do).

- [ ] **Step 2: README**

- “Simulations” table: add `| 〜 Oscillations and Waves (S-01) | Oscillations / transverse and longitudinal waves | ✅ Live |` (use a plain `○` instead of an emoji if the table style of the other rows uses emoji — match the existing rows; no new emoji kinds).
- “Structure” block: add `├── harmonic-motion.html            ← Oscillations and Waves (S-01)` after the `projectile-motion.html` line if present, else after `rolling-ball.html`; add `oscillation/` to the `assets/` comment list.
- New section after “Teacher links (K-02)”:

```markdown
## Teacher links (S-01)

Parameters of `harmonic-motion.html`, given in the URL. They are starting values only — the student can change everything; there is no `lock` on this page. Unknown parameters are ignored; values outside the range are clamped with a notice.

| Parameter | Meaning |
| --------- | ------- |
| `view=circle\|trans\|long` | Starting state: circle (end view), transverse wave, longitudinal wave. Default `circle` |
| `A=<number>` | Amplitude, cm, 5–40 (step 1) |
| `T=<number>` | Period, s, 1–8 (step 0.5) |
| `lambda=<number>` | Wavelength, cm, 50–200 (step 10) |
| `lines=0` | Helper lines hidden at start |

Example (longitudinal wave, long period):

    harmonic-motion.html?view=long&T=6&lambda=80
```

- [ ] **Step 3: Browser pass on the index and the page**

Open `http://localhost:8771/index.html`: the new card renders in both languages (toggle LV/EN on the page), link opens the page. Then re-run the Task 3 checks 1, 2 and 6 once more on the final build and keep the screenshots.

- [ ] **Step 4: `npm test`** → green.

- [ ] **Step 5: Commit**

```bash
git add index.html README.md
git commit -m "index and README: S-01 Oscillations and Waves card and teacher links

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Self-review notes (controller)

- Spec coverage: 3.1 geometry → Task 1 (`point3D`, `project`, 41 points, orange first); 3.2 states and turns → Task 1 `advancePose` + Task 3 buttons/loop; 3.3 helper lines → Task 3 `scene.js` (circle: circle, radius, φ arc, vertical diameter, projection; trans: rods, sine, A, λ; long: rods along the axis, A, λ between compressions; all fade with the pose); 4.1 LIELUMI → Task 2 `quantityRows` + Task 3; T without phase jump → `advancePhase` (phase kept, Task 1 test); 4.2 SAKARĪBAS → Task 2 `relationsRows` + Task 3 DOM; 4.3 buttons, ⏸, keys 1/2/3/space → Task 3; 4.4 ⚙ → shared module; 5 layout (axis horizontal, band between panels and buttons, A does not change the scale, portrait hint) → Task 1 `sceneLayout` + Task 3 CSS; 6 links → Task 2; 7 two languages → Task 2 i18n; 9 files → as planned (no `entry.js`, no cards); 10 acceptance → Task 3 Step 5 and Task 4 Step 3 browser checks; index/README → Task 4.
- Deviation from the spec, deliberate: in GARENVILNIS the A dimension line goes from the first point’s centre to its extreme position (fixed length A, centre marked) instead of following the live displacement — a dimension line whose length changes would not read as “A”. Noted for the spec’s change log after the build.
- Type consistency: `angles = { kappaRad, thetaRad }` everywhere; `pose = { kappa, theta }` in 0…1; `lay = { scale, cx, cy, fill }`; `relationsRows` rows `{ key, k, v, live }`; `quantityRows` rows follow the `createQuantityList` row shape documented in `assets/measure/hud.js`.
- Review Focus coverage: 1 → Task 1 pose tests; 2 → Task 1 `advancePhase` test; 3 → Task 1 `lambdaSpan` test + Task 3/4 browser checks; 4 → Task 2 params tests; 5 → Task 1 `sceneLayout` tests + browser viewports.
