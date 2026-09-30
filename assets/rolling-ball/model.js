import { G } from '../physics/constants.js';
import { rollingAcceleration, effectiveRadius } from '../physics/rolling.js';
import { ballById, ballMass, ballBeta, ballMu, ballFits, GROOVE_W, DEFAULT_BALL } from './balls.js';
import { roundTo } from '../measure/format.js';

export const G_CM = G * 100; // cm/s²
export const L_MIN = 40;
export const L_MAX = 200;
export const ALPHA_MAX = 15; // ° — lodīte ripo bez slīdēšanas
export const FINISH_OFFSET = 10; // cm — finišs 10 cm pirms renītes gala („mūsu renīte": 80 → 70)
export const MIN_RUN = 5; // cm — mazākais attālums no starta līdz finišam
export const GATE_MIN = 2;
export const GATE_MAX = 6;
export const GATE_GAP = 1; // cm
export const DT_OPTIONS = [0.1, 0.2, 0.5];
export const STEP = { L: 1, h: 0.1, alpha: 0.1, x: 0.5 };

const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function finishX(L) {
  return L - FINISH_OFFSET;
}

export function hMax(L) {
  return Math.floor(L * Math.sin(toRad(ALPHA_MAX)) * 10) / 10;
}

export function x0Max(L) {
  return finishX(L) - MIN_RUN;
}

export function spreadGates(x0, xf, n) {
  const out = [];
  for (let i = 1; i <= n; i++) out.push(roundTo(x0 + (i * (xf - x0)) / n, STEP.x));
  return out;
}

// Mazākais h (0,1 cm solī), pie kura lodīte ripo: tan α > μ.
export function minRollingH(L, mu) {
  return Math.ceil(L * Math.sin(Math.atan(mu)) * 10 + 1e-9) / 10;
}

export function defaultSettings() {
  return {
    L: 80,
    h: 3,
    alphaDeg: toDeg(Math.asin(3 / 80)),
    angleMode: 'h',
    ball: DEFAULT_BALL,
    profile: 'groove',
    x0: 0,
    level: 3,
    timer: 'gate',
    gates: spreadGates(0, finishX(80), 5),
    dt: 0.2,
    tape: true,
    slow: false,
  };
}

// Saglabā to, ko skolēns iestata (h vai α), otru aprēķina: sin α = h / L.
function syncAngle(s) {
  if (s.angleMode === 'h') {
    const h = clamp(s.h, 0, hMax(s.L));
    return { ...s, h, alphaDeg: toDeg(Math.asin(h / s.L)) };
  }
  const alphaDeg = clamp(s.alphaDeg, 0, ALPHA_MAX);
  return { ...s, alphaDeg, h: s.L * Math.sin(toRad(alphaDeg)) };
}

function gatesValid(gates, x0, L) {
  for (let i = 0; i < gates.length; i++) {
    const prev = i === 0 ? x0 : gates[i - 1];
    if (gates[i] < prev + GATE_GAP) return false;
  }
  return gates[gates.length - 1] <= L;
}

function fitPositions(s) {
  const x0 = clamp(s.x0, 0, x0Max(s.L));
  const gates = gatesValid(s.gates, x0, s.L) ? s.gates : spreadGates(x0, finishX(s.L), s.gates.length);
  return { ...s, x0, gates };
}

export function withL(s, L) {
  return fitPositions(syncAngle({ ...s, L: clamp(roundTo(L, STEP.L), L_MIN, L_MAX) }));
}

export function withH(s, h) {
  return syncAngle({ ...s, angleMode: 'h', h: roundTo(clamp(h, 0, hMax(s.L)), STEP.h) });
}

export function withAlpha(s, alphaDeg) {
  return syncAngle({ ...s, angleMode: 'alpha', alphaDeg: roundTo(clamp(alphaDeg, 0, ALPHA_MAX), STEP.alpha) });
}

export function withAngleMode(s, mode) {
  if (mode !== 'h' && mode !== 'alpha') return s;
  return { ...s, angleMode: mode };
}

export function withX0(s, x0) {
  return fitPositions({ ...s, x0: roundTo(clamp(x0, 0, x0Max(s.L)), STEP.x) });
}

export function withGate(s, i, x) {
  const lo = (i === 0 ? s.x0 : s.gates[i - 1]) + GATE_GAP;
  const hi = i === s.gates.length - 1 ? s.L : s.gates[i + 1] - GATE_GAP;
  const gates = s.gates.slice();
  gates[i] = clamp(roundTo(x, STEP.x), lo, hi);
  return { ...s, gates };
}

export function withGateCount(s, n) {
  return { ...s, gates: spreadGates(s.x0, finishX(s.L), clamp(Math.round(n), GATE_MIN, GATE_MAX)) };
}

export function withBall(s, id) {
  const b = ballById(id);
  if (!b || !ballFits(b, s.profile)) return s;
  return { ...s, ball: id };
}

export function withProfile(s, profile) {
  if (profile !== 'groove' && profile !== 'flat') return s;
  if (!ballFits(ballById(s.ball), profile)) return s;
  return { ...s, profile };
}

export function withLevel(s, level) {
  return [1, 2, 3].includes(level) ? { ...s, level } : s;
}

export function withTimer(s, timer) {
  return timer === 'gate' || timer === 'hand' ? { ...s, timer } : s;
}

export function withDt(s, dt) {
  return DT_OPTIONS.includes(dt) ? { ...s, dt } : s;
}

export function withTape(s, tape) {
  return { ...s, tape: Boolean(tape) };
}

export function withSlow(s, slow) {
  return { ...s, slow: Boolean(slow) };
}

export function derive(s) {
  const ball = ballById(s.ball);
  const r = ball.d / 2;
  const alphaRad = s.angleMode === 'h' ? Math.asin(s.h / s.L) : toRad(s.alphaDeg);
  const mu = ballMu(ball);
  const beta = ballBeta(ball);
  const a = rollingAcceleration({ g: G_CM, alphaRad, mu, beta, r, w: GROOVE_W, profile: s.profile });
  return {
    ball,
    r,
    rEff: effectiveRadius(r, GROOVE_W, s.profile),
    mass: ballMass(ball),
    mu,
    beta,
    alphaRad,
    alphaDeg: toDeg(alphaRad),
    h: s.L * Math.sin(alphaRad),
    a,
    rolls: a > 0,
    xf: finishX(s.L),
    hMin: minRollingH(s.L, mu),
  };
}

// Viss, kas ietekmē datus. Mērlente un palēninājums datus nemaina.
export function settingsKey(s, { noise, traps }) {
  const parts = [
    `L${s.L}`, `h${s.h.toFixed(3)}`, s.ball, s.profile, `x${s.x0}`, `lv${s.level}`,
    `n${noise}`, `tr${[...traps].sort().join('+')}`,
  ];
  if (s.level === 2) parts.push(s.timer, `g${s.gates.join('/')}`);
  if (s.level === 3) parts.push(`dt${s.dt}`);
  return parts.join(';');
}
