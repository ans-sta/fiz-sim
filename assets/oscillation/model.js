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
  v: { min: -100, max: 100, step: 5 }, // cm/s; zīme — virziens (negatīvs: vilnis pa kreisi, aplis pretēji); Ansis 04.10
};
export const VIEWS = ['circle', 'trans', 'long'];
export const VIEW_POSE = { circle: { kappa: 0, theta: 0 }, trans: { kappa: 1, theta: 0 }, long: { kappa: 1, theta: 1 } };
export const TURN_S = 1; // s — viena pagrieziena ilgums (kamera vai svītras)
export const TAU = 2 * Math.PI;
export const CREST = Math.PI / 2; // fāze, kurā punkts ir viļņa kalnā (w = +A)
export const COMPRESSION = 0; // fāze, ap kuru garenvilnī ir sablīvējums (−∂ξ/∂z maksimāls)
const BAND_CM = 2 * RANGES.A.max * 1.15; // augstums, kam jāietilpst starp paneļiem un pogām (A nemaina mērogu)

export function defaultSettings() {
  // T, λ, v ir saistīti (v = λ/T); `order` — no visagrāk mainītā uz jaunāko: mainot vienu, pieskaņojas vecākais (Ansis 04.10).
  return { A: 30, T: 4, lambda: 100, v: 25, lines: true, order: ['v', 'T', 'lambda'] };
}

function withRange(s, key, v) {
  if (!Number.isFinite(v)) return s;
  const r = RANGES[key];
  const next = roundTo(Math.min(r.max, Math.max(r.min, v)), r.step);
  return next === s[key] ? s : { ...s, [key]: next };
}
export const withA = (s, v) => withRange(s, 'A', v);
export const withT = (s, v) => setLinked(s, 'T', v);
export const withLambda = (s, v) => setLinked(s, 'lambda', v);
export const withV = (s, v) => setLinked(s, 'v', v);

const LINKED = ['T', 'lambda', 'v'];
const clampTo = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
// Saistītie lielumi v = λ/T: mainot vienu, pieskaņojas tas, kurš mainīts visagrāk (s.order[0], ja tas nav pats mainītais).
// Mainīto nogriež tā, lai pieskaņotais paliek savās robežās (kā K-01 h ≤ L·sin 15°). v = 0 — nekas nepieskaņojas, kustība stāv.
// Zīme paliek pie v (virziens); T un λ vienmēr pozitīvi.
function setLinked(s, key, raw) {
  if (!Number.isFinite(raw)) return s;
  const r = RANGES[key];
  let val = roundTo(clampTo(raw, r.min, r.max), r.step);
  const adapt = s.order.find((k) => k !== key);
  const dir = s.v < 0 ? -1 : 1;
  const speed = Math.abs(s.v);
  const next = { ...s };
  if (key === 'v') {
    const sgn = val < 0 ? -1 : 1;
    if (val !== 0 && adapt === 'T') {
      val = sgn * clampTo(Math.abs(val), s.lambda / RANGES.T.max, s.lambda / RANGES.T.min);
      next.T = s.lambda / Math.abs(val);
    } else if (val !== 0) {
      val = sgn * clampTo(Math.abs(val), RANGES.lambda.min / s.T, RANGES.lambda.max / s.T);
      next.lambda = Math.abs(val) * s.T;
    }
    next.v = val;
  } else if (key === 'lambda') {
    if (adapt === 'T' && speed) {
      val = clampTo(val, speed * RANGES.T.min, speed * RANGES.T.max);
      next.T = val / speed;
    } else if (adapt === 'v') {
      val = clampTo(val, r.min, RANGES.v.max * s.T);
      next.v = dir * val / s.T;
    }
    next.lambda = val;
  } else {
    if (adapt === 'v') {
      val = clampTo(val, s.lambda / RANGES.v.max, r.max);
      next.v = dir * s.lambda / val;
    } else if (speed) {
      val = clampTo(val, RANGES.lambda.min / speed, RANGES.lambda.max / speed);
      next.lambda = speed * val;
    }
    next.T = val;
  }
  next.order = [...s.order.filter((k) => k !== key), key];
  const sameValues = LINKED.every((k) => next[k] === s[k]);
  const sameOrder = next.order.join() === s.order.join();
  if (sameValues && sameOrder) return s;
  return sameValues ? { ...s, order: next.order } : next;
}
export const withLines = (s, on) => (Boolean(on) === s.lines ? s : { ...s, lines: Boolean(on) });

// Sakarības no mainīgajiem λ un v: T = λ/|v| (v = 0 → ∞, kustība stāv), f = |v|/λ, ω = 2π|v|/λ.
export function derived(s) {
  return { T: s.T, f: 1 / s.T, omega: TAU / s.T, v: s.v };
}

// Laiku glabā kā fāzi: mainot v vai λ, mainās tikai ātrums, punkti nelec; v < 0 — fāze iet atpakaļ.
export function advancePhase(phase, dt, { v, lambda }) {
  return (((phase + TAU * v * dt / lambda) % TAU) + TAU) % TAU;
}

export const pointZ = (i) => i * SPACING_CM;
// Punkti ar tādu pašu fāzi kā pirmajam (z = λ, 2λ …) — arī oranži: aplī sakrīt, viļņos stāv tieši λ attālumā (Ansis 04.10).
export const isMarked = (i, lambda) => {
  const k = pointZ(i) / lambda;
  return Math.abs(k - Math.round(k)) < 1e-9;
};
export const phaseAt = (phase0, z, lambda) => phase0 - TAU * z / lambda;

// Garenvilnī (θ → 90°) nobīde gar asi nedrīkst pārsniegt λ/2π — citādi punkti apdzītu cits citu, kas vidē nav iespējams (Ansis 04.10).
// Tāpēc ass virziena amplitūda Az = min(A, LONG_K·λ/2π): kaimiņu attālums nekad nesarūk vairāk par LONG_K daļu.
export const LONG_K = 0.8;
export const longAmplitude = (s) => Math.min(s.A, LONG_K * s.lambda / TAU);
export function point3D(phi, z, A, thetaRad, Az = A) {
  const sn = Math.sin(phi);
  return { x: A * Math.cos(phi), y: A * sn * Math.cos(thetaRad), z: z + Az * sn * Math.sin(thetaRad) };
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
  const Az = longAmplitude(s);
  for (let i = 0; i < N_POINTS; i++) {
    const z = pointZ(i);
    const phi = phaseAt(phase0, z, s.lambda);
    const { u, w } = project(point3D(phi, z, s.A, thetaRad, Az), kappaRad);
    out.push({ i, z, phi, u, w });
  }
  return out;
}

export function circleOutline(z, A, { kappaRad, thetaRad }, n = 48, Az = A) {
  const out = [];
  for (let k = 0; k <= n; k++) out.push(project(point3D(TAU * k / n, z, A, thetaRad, Az), kappaRad));
  return out;
}

export function waveCurve(s, phase0, { kappaRad, thetaRad }, stepCm = 1) {
  const out = [];
  const Az = longAmplitude(s);
  for (let z = 0; z <= AXIS_CM + 1e-9; z += stepCm) out.push(project(point3D(phaseAt(phase0, z, s.lambda), z, s.A, thetaRad, Az), kappaRad));
  return out;
}

// Pirmais z ∈ [0, λ), kurā fāze ≡ target (mod 2π).
export function phaseZ(phase0, lambda, target) {
  const frac = ((phase0 - target) / TAU) % 1;
  return lambda * ((frac + 1) % 1);
}
// λ un A mēri slīd līdzi vilnim un pārlec uz viļņa sākumu; lēciena vietā — krusteniska izbālēšana FADE_S laikā (Ansis 04.10).
export const FADE_S = 1.5; // s
export const fadeDistance = (v, lambda) => Math.min(lambda / 4, Math.max(5, Math.abs(v) * FADE_S)); // cm, ko vilnis noskrien FADE_S laikā
// Kalnu (vai sablīvējumu) mērs {z1, z1+λ} izbāl, kad tā gals tuvojas ass galam; rezerves mērs {0, λ} tikmēr iebāl.
export function lambdaSpans(phase0, lambda, target, v) {
  const z1 = phaseZ(phase0, lambda, target);
  const d = z1 + lambda - AXIS_CM; // > 0: kalnu mērs vairs neietilpst
  const a = Math.min(1, Math.max(0, -d / fadeDistance(v, lambda)));
  const out = [];
  if (a > 0.01) out.push({ z1, z2: z1 + lambda, alpha: a });
  if (1 - a > 0.01) out.push({ z1: 0, z2: lambda, alpha: 1 - a });
  return out;
}
// A mērs pie pirmā kalna: iebāl, kalnam ienākot pie z = 0, un izbāl, kad tas tuvojas z = λ (tad “pirmais” kļūst nākamais).
export function crestAlpha(zc, lambda, v) {
  return Math.min(1, Math.max(0, Math.min(zc, lambda - zc) / fadeDistance(v, lambda)));
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
