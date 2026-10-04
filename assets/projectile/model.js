import { SCALE, MODES, ALPHA } from './scales.js';
import { roundTo } from '../measure/format.js';
import { velocity, landingTime, apexTime, apexHeight } from '../physics/projectile.js';

export const SLOW_FACTOR = 0.25;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const toRad = (deg) => (deg * Math.PI) / 180;

export function v0Range(mode) {
  const max = SCALE.v0.max;
  return { min: mode === 'vertical' ? -max : 0, max };
}

export function defaultSettings(mode = 'horizontal') {
  return {
    mode,
    h: SCALE.defaults.h,
    v0: SCALE.defaults.v0[mode],
    alphaDeg: ALPHA.default,
    dt: SCALE.defaults.dt,
    second: false,
    grid: true,
    slow: SCALE.defaults.slow,
  };
}

export function withMode(s, mode) {
  if (!MODES.includes(mode)) return s;
  const r = v0Range(mode);
  const v0 = clamp(mode === 'vertical' ? s.v0 : Math.abs(s.v0), r.min, r.max);
  return { ...s, mode, v0 };
}

export function withH(s, h) {
  const r = SCALE.h;
  return { ...s, h: clamp(roundTo(h, r.step), r.min, r.max) };
}

export function withV0(s, v0) {
  const r = v0Range(s.mode);
  return { ...s, v0: clamp(roundTo(v0, SCALE.v0.step), r.min, r.max) };
}

export function withAlpha(s, alphaDeg) {
  return { ...s, alphaDeg: clamp(roundTo(alphaDeg, ALPHA.step), ALPHA.min, ALPHA.max) };
}

export function withDt(s, dt) {
  if (!Number.isFinite(dt)) return s;
  return { ...s, dt: clamp(roundTo(dt, SCALE.dt.step), SCALE.dt.min, SCALE.dt.max) };
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
  const { vx, vy } = launchVelocity(s);
  const motion = { g: SCALE.g, h: s.h, vx, vy };
  const tLand = landingTime(motion);
  const positions = tLand > 0 ? Math.floor(tLand / s.dt + 1e-9) + 1 : 0;
  const flight = tLand === 0 ? 'none' : 'ok';
  return {
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

// Lidojums ir, ja bumbiņa kustas; arī lidojums, kas īsāks par Δt, ir lidojums (ieraksta tikai sākuma zibsni).
export function flightCheck(s) {
  return derive(s).flight;
}

const SAME = (a, b) => Math.abs(a - b) < 1e-9;
const FIELD_SAME = {
  mode: (p, n) => p.mode === n.mode,
  h: (p, n) => SAME(p.h, n.h),
  v0: (p, n) => SAME(p.v0, n.v0),
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
  const parts = [s.mode, `h${s.h}`, `v${s.v0}`];
  if (s.mode === 'oblique') parts.push(`a${s.alphaDeg}`);
  parts.push(`dt${s.dt}`, `n${noise}`, `tr${[...traps].sort().join('+')}`);
  return parts.join(';');
}
