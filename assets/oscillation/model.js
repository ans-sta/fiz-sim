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
  return { A: 30, T: 4, lambda: 100, lines: true }; // A 30 (bija 20): sākuma aplis lielāks (Ansis 04.10)
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
// APĻA skats (Ansis 04.10: aplis par mazu): aplis ar A_max aizpilda vai nu joslu starp paneļiem (visā augstumā no topFree,
// platumā clearW), vai joslu zem paneļiem (no topBelow, visā platumā) — ņem to, kas dod lielāku mērogu.
export const CIRCLE_CM = 2 * RANGES.A.max * 1.1;
export function circleLayout(w, h, { topFree = 0, topBelow = 0, bottom = 0, clearW = 0, drawScale = 1, edge = EDGE_PX } = {}) {
  const fullBand = Math.max(1, h - topFree - bottom);
  const between = Math.min(fullBand, clearW);
  const belowBand = Math.max(1, h - topBelow - bottom);
  const below = Math.min(belowBand, w - 2 * edge);
  const useBetween = between >= below;
  const fit = Math.max(1, useBetween ? between : below) / CIRCLE_CM;
  return { scale: fit * drawScale, cx: w / 2, cy: useBetween ? topFree + fullBand / 2 : topBelow + belowBand / 2 };
}
// Kamerai griežoties (t = κ 0…1) tuvplāns pāriet uz visas ass mērogu — mīksti, nekas nelec.
export function blendLayout(a, b, t) {
  const k = smooth(Math.min(1, Math.max(0, t)));
  return { scale: a.scale + (b.scale - a.scale) * k, cx: a.cx + (b.cx - a.cx) * k, cy: a.cy + (b.cy - a.cy) * k, fill: b.fill ?? a.fill };
}
export function toScreen(lay, pt, kappaRad) {
  return { x: lay.cx + (pt.u - viewCenterU(kappaRad)) * lay.scale, y: lay.cy - pt.w * lay.scale };
}
