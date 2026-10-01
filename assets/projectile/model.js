import { SCALES, MODES, ALPHA, NOISE } from './scales.js';
import { roundTo } from '../measure/format.js';
import { velocity, landingTime, apexTime, apexHeight } from '../physics/projectile.js';

export const SLOW_FACTOR = 0.25;
export const MIN_POSITIONS = 3; // stroboskopā vismaz pozīcijas 0, 1, 2

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const toRad = (deg) => (deg * Math.PI) / 180;

export function v0Range(scale, mode) {
  const max = SCALES[scale].v0.max;
  return { min: mode === 'vertical' ? -max : 0, max };
}

export function defaultSettings(scale = 'table', mode = 'horizontal') {
  const sc = SCALES[scale];
  return {
    mode,
    scale,
    h: sc.defaults.h,
    v0: sc.defaults.v0[mode],
    alphaDeg: ALPHA.default,
    dt: sc.defaults.dt,
    second: false,
    grid: true,
    slow: sc.defaults.slow,
  };
}

export function withMode(s, mode) {
  if (!MODES.includes(mode)) return s;
  const r = v0Range(s.scale, mode);
  const v0 = clamp(mode === 'vertical' ? s.v0 : Math.abs(s.v0), r.min, r.max);
  return { ...s, mode, v0 };
}

// cm un m nav salīdzināmi, tāpēc h, v₀, Δt un palēninājums kļūst par jaunā mēroga noklusējumiem.
export function withScale(s, scale) {
  if (!(scale in SCALES) || scale === s.scale) return s;
  const d = defaultSettings(scale, s.mode);
  return { ...s, scale, h: d.h, v0: d.v0, dt: d.dt, slow: d.slow };
}

export function withH(s, h) {
  const r = SCALES[s.scale].h;
  return { ...s, h: clamp(roundTo(h, r.step), r.min, r.max) };
}

export function withV0(s, v0) {
  const r = v0Range(s.scale, s.mode);
  return { ...s, v0: clamp(roundTo(v0, SCALES[s.scale].v0.step), r.min, r.max) };
}

export function withAlpha(s, alphaDeg) {
  return { ...s, alphaDeg: clamp(roundTo(alphaDeg, ALPHA.step), ALPHA.min, ALPHA.max) };
}

export function withDt(s, dt) {
  return SCALES[s.scale].dtOptions.includes(dt) ? { ...s, dt } : s;
}

export const withSecond = (s, on) => ({ ...s, second: Boolean(on) });
export const withGrid = (s, on) => ({ ...s, grid: Boolean(on) });
export const withSlow = (s, on) => ({ ...s, slow: Boolean(on) });

export function launchVelocity(s) {
  if (s.mode === 'vertical') return { vx: 0, vy: s.v0 };
  if (s.mode === 'horizontal') return { vx: s.v0, vy: 0 };
  return velocity(s.v0, toRad(s.alphaDeg));
}

// Patiesās vērtības bez trokšņa: tikai rasējuma izkārtojumam un pārbaudēm — skolēnam tās nerāda.
export function derive(s) {
  const sc = SCALES[s.scale];
  const { vx, vy } = launchVelocity(s);
  const motion = { g: sc.g, h: s.h, vx, vy };
  const tLand = landingTime(motion);
  const positions = tLand > 0 ? Math.floor(tLand / s.dt + 1e-9) + 1 : 0;
  let flight = 'ok';
  if (tLand === 0) flight = 'none';
  else if (positions < MIN_POSITIONS) flight = 'short';
  return {
    sc,
    motion,
    vx,
    vy,
    tLand,
    xLand: vx * tLand,
    tApex: apexTime(motion),
    yMax: apexHeight(motion),
    positions,
    flight,
  };
}

const NOISE_SIGMAS = 4;

// Vai palaišana dos vismaz MIN_POSITIONS zibšņus arī sliktākajā gadījumā: sākuma kadrs par vēlu
// (troksnis un slazds „late”) un v₀, α novirze līdz 4σ (lidojuma laiks var būt atkarīgs no tiem).
export function flightCheck(s, { noise, traps }) {
  const d = derive(s);
  if (d.flight === 'none') return 'none';
  const sc = SCALES[s.scale];
  const tauMax = (noise * NOISE.startFrames + (traps.includes('late') ? NOISE.lateFrames[1] : 0)) * sc.frame;
  const f = NOISE_SIGMAS * noise;
  let tMin = Infinity;
  for (const kv of [-1, 1]) {
    for (const ka of [-1, 1]) {
      const v0 = s.v0 * (1 + kv * f * NOISE.v0Rel);
      const alphaDeg = s.mode === 'oblique' ? clamp(s.alphaDeg + ka * f * NOISE.alphaDeg, 0, 90) : s.alphaDeg;
      tMin = Math.min(tMin, landingTime({ g: sc.g, h: s.h, vy: launchVelocity({ ...s, v0, alphaDeg }).vy }));
    }
  }
  return tMin - tauMax >= (MIN_POSITIONS - 1) * s.dt - 1e-12 ? 'ok' : 'short';
}

const SAME = (a, b) => Math.abs(a - b) < 1e-9;
const FIELD_SAME = {
  mode: (p, n) => p.mode === n.mode,
  scale: (p, n) => p.scale === n.scale,
  h: (p, n) => p.scale === n.scale && SAME(p.h, n.h), // 20 cm un 20 m nav viens un tas pats
  v0: (p, n) => p.scale === n.scale && SAME(p.v0, n.v0),
  alpha: (p, n) => SAME(p.alphaDeg, n.alphaDeg),
  dt: (p, n) => p.dt === n.dt,
  second: (p, n) => p.second === n.second,
  grid: (p, n) => p.grid === n.grid,
};

// Nofiksētie lielumi (saitē), kurus `next` atšķir no `prev`.
export function changedLocked(prev, next, locked) {
  return Object.keys(FIELD_SAME).filter((k) => locked.has(k) && !FIELD_SAME[k](prev, next));
}

// Viss, kas ietekmē datus. Mērrežģis, otrā bumbiņa un palēninājums datus nemaina.
export function settingsKey(s, { noise, traps }) {
  const parts = [s.scale, s.mode, `h${s.h}`, `v${s.v0}`];
  if (s.mode === 'oblique') parts.push(`a${s.alphaDeg}`);
  parts.push(`dt${s.dt}`, `n${noise}`, `tr${[...traps].sort().join('+')}`);
  return parts.join(';');
}
