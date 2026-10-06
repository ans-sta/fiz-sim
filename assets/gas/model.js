// assets/gas/model.js
// Gāzes likums pV/T = const (M-02): tīrā fizika bez DOM. Cilindrs ar virzuli: gāzes tilpums V (L) ↔ gāzes slāņa augstums
// pasaules vienībās; molekulas lido taisni, atlec no sienām un virzuļa, cita ar citu nesaduras (ideāla gāze); v ∝ √T.
// p, V, T saistīti ar pV = nRT: mainot vienu, pieskaņojas tas, kurš mainīts visagrāk (kā S-01). Mainīto nogriež, lai pieskaņotais paliek robežās.
import { roundTo } from '../measure/format.js';
import { mulberry32, gaussian } from '../measure/rng.js';

export const RANGES = {
  V: { min: 1, max: 5, step: 0.1 }, // L
  T: { min: 100, max: 600, step: 10 }, // K
  p: { min: 20, max: 500, step: 10 }, // kPa
};
export const NR = 100 * 2 / 300; // kPa·L/K — pV/T pie p = 100 kPa, V = 2 L, T = 300 K (gāzes daudzums nemainās)
export const BOX_W = 100; // pasaules vienības — cilindra platums
export const H_MAX = 250; // pasaules vienības — gāzes augstums pie V = RANGES.V.max
export const N_MOL = 300;
export const MOL_R = 1.2;
export const T_REF = 300;
export const V_REF = 25; // vienības/s — molekulu v_rms pie T_REF (kā Brauna kustībā)
export const SUB_STEPS = 2;
export const MAX_DT = 0.05;
export const PISTON_TAU = 0.25; // s — virzulis uz jauno tilpumu slīd maigi

export const heightOf = (V) => (V / RANGES.V.max) * H_MAX;
export const volumeOf = (h) => (h / H_MAX) * RANGES.V.max;
export const vRms = (T) => V_REF * Math.sqrt(T / T_REF);
export const constOf = (s) => (s.p * s.V) / s.T;

export const KEYS = ['p', 'V', 'T'];
export function defaultSettings() {
  return { V: 2, T: 300, p: 100, order: ['p', 'V', 'T'], lock: null }; // order — no visagrāk mainītā uz jaunāko; lock — aizslēgtais lielums (nemainās) vai null
}

// Atslēdziņa: aizslēgt var vienu; aizslēdzot otru, pirmais atslēdzas; vēlreiz uz aizslēgtā — atslēdz (Ansis 06.10)
export function withLock(s, key) {
  if (!(key in RANGES)) return s;
  const lock = s.lock === key ? null : key;
  return lock === s.lock ? s : { ...s, lock };
}

const clampTo = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const snap = (key, v) => roundTo(clampTo(v, RANGES[key].min, RANGES[key].max), RANGES[key].step);

// pV = NR·T: pieskaņo `adapt` pēc pārējiem diviem; `changed` nogriež tā, lai `adapt` paliek robežās
function solve(s, key, raw, adapt) {
  const r = RANGES[adapt];
  let val = snap(key, raw);
  const next = { ...s };
  const other = ['p', 'V', 'T'].find((k) => k !== key && k !== adapt);
  const fixed = s[other];
  // adapt = f(val, fixed)
  const f = (v) => {
    if (adapt === 'p') return key === 'V' ? (NR * fixed) / v : (NR * v) / fixed; // p = NR·T/V
    if (adapt === 'V') return key === 'p' ? (NR * fixed) / v : (NR * v) / fixed; // V = NR·T/p
    return key === 'p' ? (v * fixed) / NR : (fixed * v) / NR; // T = pV/NR
  };
  // robežas mainītajam, lai f(val) ∈ [r.min, r.max]; f ir monotona (vai nu aug, vai dilst ar val)
  const lo = f(RANGES[key].min);
  const hi = f(RANGES[key].max);
  const inv = (target) => {
    // apgrieztā: atrod val, kuram f(val) = target (visas formulas ir k·v vai k/v)
    if (adapt === 'p') return key === 'V' ? (NR * fixed) / target : (target * fixed) / NR;
    if (adapt === 'V') return key === 'p' ? (NR * fixed) / target : (target * fixed) / NR;
    return key === 'p' ? (target * NR) / fixed : (target * NR) / fixed;
  };
  const increasing = hi > lo;
  const tooLow = f(val) < r.min;
  const tooHigh = f(val) > r.max;
  if (tooLow) val = inv(r.min);
  else if (tooHigh) val = inv(r.max);
  val = clampTo(val, RANGES[key].min, RANGES[key].max);
  if (!increasing && (tooLow || tooHigh)) val = clampTo(val, RANGES[key].min, RANGES[key].max);
  next[key] = val;
  next[adapt] = clampTo(f(val), r.min, r.max);
  next.order = [...s.order.filter((k) => k !== key), key];
  return next;
}

export function withQuantity(s, key, raw) {
  if (!Number.isFinite(raw) || !(key in RANGES) || key === s.lock) return s;
  // aizslēgts lielums nemainās: pieskaņojas trešais; bez atslēgas — tas, kurš mainīts visagrāk
  const adapt = s.lock ? KEYS.find((k) => k !== key && k !== s.lock) : s.order.find((k) => k !== key);
  const next = solve(s, key, raw, adapt);
  if (next.p === s.p && next.V === s.V && next.T === s.T) return s;
  return next;
}
export const withV = (s, v) => withQuantity(s, 'V', v);
export const withT = (s, v) => withQuantity(s, 'T', v);
export const withP = (s, v) => withQuantity(s, 'p', v);

// ── molekulas ───────────────────────────────────────────
export function createGas(V, T, seed = 1) {
  const rand = mulberry32(seed);
  const h = heightOf(V);
  const sigma = vRms(T) / Math.SQRT2;
  const mol = [];
  for (let i = 0; i < N_MOL; i++) {
    mol.push({ x: MOL_R + rand() * (BOX_W - 2 * MOL_R), y: MOL_R + rand() * (h - 2 * MOL_R), vx: gaussian(rand) * sigma, vy: gaussian(rand) * sigma });
  }
  return { mol, T, piston: h, target: h, t: 0 }; // piston — gāzes slāņa augstums (virzuļa apakša), y no cilindra dibena
}
export function setGasTemperature(gas, T) {
  if (T === gas.T) return gas;
  const k = Math.sqrt(T / gas.T);
  for (const p of gas.mol) { p.vx *= k; p.vy *= k; }
  gas.T = T;
  return gas;
}
export const setPistonTarget = (gas, V) => { gas.target = heightOf(V); return gas; };

export function stepGas(gas, dt) {
  const d = Math.min(dt, MAX_DT);
  // virzulis slīd uz mērķi maigi
  gas.piston += (gas.target - gas.piston) * (1 - Math.exp(-d / PISTON_TAU));
  if (Math.abs(gas.target - gas.piston) < 0.05) gas.piston = gas.target;
  const h = d / SUB_STEPS;
  const top = gas.piston;
  for (let s = 0; s < SUB_STEPS; s++) {
    for (const p of gas.mol) {
      p.x += p.vx * h;
      p.y += p.vy * h;
      if (p.x < MOL_R) { p.x = 2 * MOL_R - p.x; p.vx = Math.abs(p.vx); }
      else if (p.x > BOX_W - MOL_R) { p.x = 2 * (BOX_W - MOL_R) - p.x; p.vx = -Math.abs(p.vx); }
      if (p.y < MOL_R) { p.y = 2 * MOL_R - p.y; p.vy = Math.abs(p.vy); }
      else if (p.y > top - MOL_R) { p.y = Math.max(MOL_R, 2 * (top - MOL_R) - p.y); p.vy = -Math.abs(p.vy); }
    }
  }
  gas.t += d;
  return gas;
}
