// assets/photo/model.js — A-02 fotoefekts: konstantes, metāli, f = c/λ, W = hf, slieksnis, Wₖ, spriegums, strāva,
// slīdņa ass, elektronu ātrums ekrānā, normālforma (spec. docs/plans/2026-11-05-fotoefekts.md § 5, § 10). Bez DOM.
import { formatNumber } from '../measure/format.js';

// Skolas konstantes (spec. § 5)
export const H = 6.63e-34; // J·s
export const C = 3.0e8; // m/s
export const EV = 1.6e-19; // J

export const LAMBDA = { min: 150, max: 1200 }; // nm — slīdņa robežas
export const VIS = { min: 380, max: 750 }; // nm — redzamā josla (kā A-01)

// Izejas darbi, eV — HyperPhysics (C. R. Nave, Georgia State University), “Work Functions for Photoelectric Effect”
export const METAL_IDS = ['Cs', 'Na', 'Zn', 'Cu'];
export const METALS = {
  Cs: { eV: 2.1 },
  Na: { eV: 2.28 },
  Zn: { eV: 4.3 },
  Cu: { eV: 4.7 },
};

export const freqOf = (nm) => C / (nm * 1e-9); // Hz
export const photonJ = (nm) => H * freqOf(nm); // J
export const workJ = (metal) => METALS[metal].eV * EV; // J
export const thresholdNm = (metal) => ((H * C) / workJ(metal)) * 1e9;
// Izsit tikai, ja hf > A (pie hf = A — vēl nē)
export const ejects = (nm, metal) => photonJ(nm) > workJ(metal);
export const kineticMaxJ = (nm, metal) => Math.max(0, photonJ(nm) - workJ(metal));
// Elektronu ātrumi nedaudz dažādi: 85–100 % no lielākā (Wₖ 72–100 % no hf − A); lielākais atbilst hf − A
export const SPEED_SPREAD = 0.15;

// Spriegums starp plāksni un anodu (baterija ķēdē): 0–6 V; “pretēja” polaritāte (anods −) elektronus bremzē.
// Bremzējošais spriegums U_b: e·U_b = Wₖ (lielākā) — no U_b anodu nesasniedz neviens elektrons.
export const U_MAX = 6; // V
export const stoppingVoltage = (nm, metal) => kineticMaxJ(nm, metal) / EV; // V

// Daļa izsisto elektronu, kas sasniedz anodu. Ātrumi 85–100 % no lielākā (vienmērīgi), Wₖ = u²·Wₖ(lielākā);
// bremzējot sasniedz tie, kuriem Wₖ > e·U. Paātrinot (vai U = 0) — visi.
export function reachFraction({ lambda, metal, voltage = 0, reverse = false }) {
  const wk = kineticMaxJ(lambda, metal);
  if (wk <= 0) return 0;
  if (!reverse || voltage <= 0) return 1;
  const r = (voltage * EV) / wk;
  if (r >= 1 - 1e-12) return 0; // U ≥ U_b — tieši 0
  const uMin = Math.sqrt(r);
  const lo = 1 - SPEED_SPREAD;
  return uMin <= lo ? 1 : (1 - uMin) / SPEED_SPREAD;
}

// Strāva: 100 % intensitātē 2,00 µA (ilustratīvi); zem sliekšņa, bez gaismas vai U ≥ U_b (bremzējot) — tieši 0
export const I_FULL = 2.0; // µA
export const I_SCALE = 2.5; // µA — ampērmetra skala
export function currentMicroA({ lambda, intensity, metal, on, voltage = 0, reverse = false }) {
  if (!(on && intensity > 0 && ejects(lambda, metal))) return 0;
  const f = reachFraction({ lambda, metal, voltage, reverse });
  return f > 0 ? (I_FULL * intensity * f) / 100 : 0;
}

export function bandOf(nm) {
  if (nm < VIS.min) return 'uv';
  if (nm > VIS.max) return 'ir';
  if (nm < 450) return 'violet';
  if (nm < 485) return 'blue';
  if (nm < 500) return 'cyan';
  if (nm < 565) return 'green';
  if (nm < 590) return 'yellow';
  if (nm < 625) return 'orange';
  return 'red';
}

// ── Slīdņa ass: λ aug pa labi; redzamajai joslai ~58 % garuma, UV 22 %, IS 20 % ──
const KNOTS = [[LAMBDA.min, 0], [VIS.min, 0.22], [VIS.max, 0.8], [LAMBDA.max, 1]];
export function lambdaToPos(nm) {
  const x = Math.min(LAMBDA.max, Math.max(LAMBDA.min, nm));
  for (let i = 1; i < KNOTS.length; i++) {
    const [l0, p0] = KNOTS[i - 1];
    const [l1, p1] = KNOTS[i];
    if (x <= l1) return p0 + ((x - l0) / (l1 - l0)) * (p1 - p0);
  }
  return 1;
}
export function posToLambda(p) {
  const q = Math.min(1, Math.max(0, p));
  for (let i = 1; i < KNOTS.length; i++) {
    const [l0, p0] = KNOTS[i - 1];
    const [l1, p1] = KNOTS[i];
    if (q <= p1) return l0 + ((q - p0) / (p1 - p0)) * (l1 - l0);
  }
  return LAMBDA.max;
}

// ── Elektronu ātrums ekrānā ∝ √Wₖ (spec. § 2) ──
// Ceļa laiks no plāksnes līdz anodam bez sprieguma: T = 1 / (K·√(Wₖ / 10⁻¹⁹ J)) s; ne ilgāk par T_MAX (tieši pie sliekšņa Wₖ → 0)
export const SPEED_K = 0.6;
export const T_MAX = 10;
export function travelTime(wkJ) {
  const s = Math.sqrt(Math.max(0, wkJ) / 1e-19);
  return s > 0 ? Math.min(T_MAX, 1 / (SPEED_K * s)) : T_MAX;
}

// ── Normālforma: a·10ⁿ, 1 ≤ a < 10, 3 zīmīgie cipari ──
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
export const sup = (n) => [...String(n)].map((ch) => SUP[ch]).join('');

export function sci(v, sig = 3) {
  if (!(v > 0) || !Number.isFinite(v)) return null;
  const d = sig - 1;
  let exp = Math.floor(Math.log10(v));
  let mant = Number((v / 10 ** exp).toFixed(d));
  if (mant >= 10) { exp += 1; mant = Number((v / 10 ** exp).toFixed(d)); }
  if (mant < 1) { exp -= 1; mant = Number((v / 10 ** exp).toFixed(d)); }
  return { mant, exp, dec: d };
}

// “5,64·10¹⁴” (LV) / “5.64·10¹⁴” (EN)
export function formatSci(v, lang, sig = 3) {
  const s = sci(v, sig);
  if (!s) return '';
  return `${formatNumber(s.mant, s.dec, lang)}·10${sup(s.exp)}`;
}
