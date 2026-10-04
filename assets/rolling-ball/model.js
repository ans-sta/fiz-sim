import { G } from '../physics/constants.js';
import { rollingAcceleration, effectiveRadius } from '../physics/rolling.js';
import { ballById, ballMass, ballBeta, ballMu, ballFits, GROOVE_W, DEFAULT_BALL } from './balls.js';
import { roundTo } from '../measure/format.js';

export const G_CM = G * 100; // cm/s²
export const L_MIN = 50;
export const L_MAX = 200;
export const ALPHA_MAX = 15; // ° — lodīte ripo bez slīdēšanas
export const FINISH_OFFSET = 10; // cm — finišs 10 cm pirms renītes gala („mūsu renīte": 80 → 70)
export const MIN_RUN = 5; // cm — mazākais attālums no starta līdz finišam
export const GATE_MIN = 2;
export const GATE_MAX = 6;
export const GATE_GAP = 1; // cm
export const DT_MIN = 0.1; // s — stroboskopa intervāls; garāks par ripošanas laiku — tikai starta zibsnis (kā dzīvē)
export const DT_MAX = 2;
export const STEP = { L: 1, h: 0.1, alpha: 0.1, x: 0.5, dt: 0.1 };

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

export const MAX_RUN_TIME = 60; // s — ilgāks brauciens nav lietojams laboratorijas mēģinājums, un fiziski statiskā berze tik tuvu slieksnim lodīti notur

// Lodīte „ripo", ja no x₀ ar v₀ = 0 līdz renītes galam tiek 60 s laikā.
function rollsWithin(a, L, x0) {
  return a > 0 && Math.sqrt((2 * (L - x0)) / a) <= MAX_RUN_TIME;
}

function accelerationAt(s, alphaRad) {
  const ball = ballById(s.ball);
  return rollingAcceleration({
    g: G_CM, alphaRad, mu: ballMu(ball), beta: ballBeta(ball), r: ball.d / 2, w: GROOVE_W, profile: s.profile,
  });
}

// Mazākais h (0,1 cm solī), pie kura lodīte ripo; null, ja nepietiek pat ar hMax.
function findHMin(s) {
  const top = hMax(s.L);
  for (let i = 0; i * 0.1 <= top + 1e-9; i++) {
    const h = roundTo(i * 0.1, STEP.h);
    if (h > top) break;
    if (rollsWithin(accelerationAt(s, Math.asin(h / s.L)), s.L, s.x0)) return h;
  }
  return null;
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
  return Number.isFinite(dt) ? { ...s, dt: roundTo(clamp(dt, DT_MIN, DT_MAX), STEP.dt) } : s;
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
  const rolls = rollsWithin(a, s.L, s.x0);
  const out = {
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
    rolls,
    xf: finishX(s.L),
  };
  if (!rolls) {
    out.hMin = findHMin(s);
    out.alphaMinDeg = out.hMin === null ? null : Math.ceil(toDeg(Math.asin(out.hMin / s.L)) * 10 - 1e-9) / 10;
  }
  return out;
}

const SAME = (a, b) => Math.abs(a - b) < 1e-9;
const sameList = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const FIELD_SAME = {
  L: (p, n) => p.L === n.L,
  h: (p, n) => SAME(p.h, n.h),
  alpha: (p, n) => SAME(p.alphaDeg, n.alphaDeg),
  ball: (p, n) => p.ball === n.ball,
  profile: (p, n) => p.profile === n.profile,
  x0: (p, n) => p.x0 === n.x0,
  level: (p, n) => p.level === n.level,
  timer: (p, n) => p.timer === n.timer,
  gates: (p, n) => sameList(p.gates, n.gates),
  dt: (p, n) => p.dt === n.dt,
  tape: (p, n) => p.tape === n.tape,
};

// Nofiksētie lielumi (saitē), kurus `next` atšķir no `prev`. `view` iestatījumi nemaina.
export function changedLocked(prev, next, locked) {
  return Object.keys(FIELD_SAME).filter((k) => locked.has(k) && !FIELD_SAME[k](prev, next));
}

const SLOPE_PART = 1; // keyParts indekss, kurā ir slīpums

function keyParts(s, { noise, traps }) {
  const parts = [
    `L${s.L}`, `h${s.h.toFixed(3)}`, s.ball, s.profile, `x${s.x0}`, `lv${s.level}`,
    `n${noise}`, `tr${[...traps].sort().join('+')}`,
  ];
  if (s.level === 2) parts.push(s.timer, `g${s.gates.join('/')}`);
  if (s.level === 3) parts.push(`dt${s.dt}`);
  return parts;
}

// Viss, kas ietekmē datus. Mērlente un palēninājums datus nemaina.
export function settingsKey(s, cfg) {
  return keyParts(s, cfg).join(';');
}

// Tabulas atslēga (spec. izkārtojums 5): 1. līmenī viena tabula krāj sēriju — katram slīpumam sava rinda,
// tāpēc slīpums atslēgā nav, bet ir tas, ar ko slīpumu iestata (h vai α — rindu galvene). 2. un 3. līmenī = settingsKey.
export function seriesKey(s, cfg) {
  if (s.level !== 1) return settingsKey(s, cfg);
  const parts = keyParts(s, cfg);
  parts[SLOPE_PART] = `by-${s.angleMode}`;
  return parts.join(';');
}
