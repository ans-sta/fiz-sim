// assets/atoms/model.js — A-01 fizika: λ ↔ ΔE, absorbcija ar pielaidi, jonizācija, kaskāde pēc A, stabu ass,
// pielipšana pie mājiena, baltās gaismas plūsma (spec. docs/plans/2026-11-03-atomu-spektri.md § 4–§ 7). Bez DOM.
import { HC } from './atoms.js';

export const VIS = { min: 380, max: 750 }; // nm — redzamā josla
export const IR_MAX = 10000; // nm — staba apakšējā mala
const P_IR = 0.15; // stabā: IS 0–0,15, redzamā 0,15–0,85, UV 0,85–1 (Ansis 03.11. apstiprināja ~70 % redzamajai)
const P_UV = 0.85;

export const INTENSITIES = [1, 2, 5, 10, 20]; // fotoni sekundē (Ansis 03.11.)
export const DEFAULT_INTENSITY = 5;

export const levelOf = (atom, id) => atom.levels.find((l) => l.id === id);
export const lambdaOf = (atom, line) => HC / (levelOf(atom, line.up).E - levelOf(atom, line.lo).E);

const byE = (atom) => (a, b) => levelOf(atom, a.to).E - levelOf(atom, b.to).E;
export function linesUp(atom, id) {
  return atom.lines.filter((l) => l.lo === id).map((line) => ({ line, to: line.up, λ: lambdaOf(atom, line) })).sort(byE(atom));
}
export function linesDown(atom, id) {
  return atom.lines.filter((l) => l.up === id).map((line) => ({ line, to: line.lo, λ: lambdaOf(atom, line) })).sort(byE(atom));
}

export const isGround = (atom, id) => atom.levels.every((l) => l.E >= levelOf(atom, id).E);
export const isMetastable = (atom, id) => levelOf(atom, id)?.metastable === true;

// Pielaide: redzamajā gaismā ±2 nm, ārpus tās ±0,3 % no λ (spec. § 6.4)
export function toleranceNm(λ) {
  return λ >= VIS.min && λ <= VIS.max ? 2 : 0.003 * λ;
}

// Jonizācijas robeža: fotons ar λ < HC/|E| atbrīvo elektronu
export function edgeNm(atom, id) {
  const E = levelOf(atom, id).E;
  return E < 0 ? HC / -E : Infinity;
}

// Ko fotons dara ar atomu, kura elektrons ir līmenī id. Tuvākā līnija pielaidē uzvar; tad jonizācija; citādi iet cauri.
export function absorb(atom, id, λ) {
  let best = null;
  for (const c of linesUp(atom, id)) {
    const d = Math.abs(c.λ - λ);
    if (d <= toleranceNm(c.λ) && (!best || d < best.d)) best = { ...c, d };
  }
  if (best) return { kind: 'line', line: best.line, to: best.to, λ: best.λ };
  const E = levelOf(atom, id).E;
  if (E < 0 && HC / λ >= -E * (1 - 1e-9)) return { kind: 'ionise' }; // arī tieši pie robežas
  return { kind: 'pass' };
}

// Viens kaskādes solis: ceļu izvēlas ar svariem A. null — pamatstāvoklis vai metastabils līmenis.
export function cascadeStep(atom, id, rng) {
  if (isGround(atom, id) || isMetastable(atom, id)) return null;
  const downs = linesDown(atom, id);
  if (!downs.length) return null;
  const sum = downs.reduce((s, d) => s + d.line.A, 0);
  let r = rng() * sum;
  for (const d of downs) {
    r -= d.line.A;
    if (r < 0) return d;
  }
  return downs[downs.length - 1];
}

// ── Stabs: p = 0 apakšā (IS gals), 1 augšā (UV robeža atomam) ──
export const columnAxis = (atom) => ({ uvMin: atom.uvMin });
export const offScale = (λ) => λ > IR_MAX;

export function lambdaToPos(ax, λ) {
  if (λ >= IR_MAX) return 0;
  if (λ > VIS.max) return (P_IR * Math.log(IR_MAX / λ)) / Math.log(IR_MAX / VIS.max);
  if (λ >= VIS.min) return P_IR + ((P_UV - P_IR) * (VIS.max - λ)) / (VIS.max - VIS.min);
  if (λ <= ax.uvMin) return 1;
  return P_UV + ((1 - P_UV) * Math.log(VIS.min / λ)) / Math.log(VIS.min / ax.uvMin);
}

export function posToLambda(ax, p) {
  const q = Math.min(1, Math.max(0, p));
  if (q <= P_IR) return IR_MAX * Math.pow(VIS.max / IR_MAX, q / P_IR);
  if (q <= P_UV) return VIS.max - ((q - P_IR) * (VIS.max - VIS.min)) / (P_UV - P_IR);
  return VIS.min * Math.pow(ax.uvMin / VIS.min, (q - P_UV) / (1 - P_UV));
}

// Mājieni: līnijas, ko atoms no līmeņa var absorbēt, un jonizācijas robeža, ja tās ir uz staba
export function hintTargets(atom, id) {
  const onColumn = (λ) => λ >= atom.uvMin && λ <= IR_MAX;
  const out = linesUp(atom, id).filter((c) => onColumn(c.λ)).map((c) => ({ λ: c.λ, kind: 'line', to: c.to }));
  const e = edgeNm(atom, id);
  if (onColumn(e)) out.push({ λ: e, kind: 'edge' });
  return out;
}

// Pielipšana: tuvākais mājiens, ja tas ir ne tālāk par maxDp staba vienībās
export function snap(ax, λ, targets, maxDp) {
  const p = lambdaToPos(ax, λ);
  let best = null;
  for (const t of targets) {
    const d = Math.abs(lambdaToPos(ax, t.λ) - p);
    if (d <= maxDp && (!best || d < best.d)) best = { λ: t.λ, d };
  }
  return best ? best.λ : λ;
}

// Animāciju ilgumi: līdz 5 f/s — pilni, ātrāk — proporcionāli īsāki; samazinātai kustībai — uz pusi
// inFlight — absorbcijas fotons no staba līdz atomam (Ansis 04.11.: “mazliet lēnāku”); flight — starošanā no atoma līdz stabam
export function timing(rate, reducedMotion = false) {
  const k = Math.min(1, 5 / rate) * (reducedMotion ? 0.5 : 1);
  return { flight: 1.2 * k, inFlight: 1.5 * k, hold: 1 * k, pass: 0.8 * k };
}

// Baltā gaisma: nejauša λ redzamajā joslā; katrs 4. vai 5. fotons mērķēts (Ansis 03.11.: “mazliet negodīga”)
export function createWhiteLight(rng) {
  const gap = () => (rng() < 0.5 ? 4 : 5);
  let left = gap();
  const uniform = (a, b) => a + rng() * (b - a);
  return {
    next(atom, id) {
      left -= 1;
      if (left > 0) return uniform(VIS.min, VIS.max);
      left = gap();
      const lines = hintTargets(atom, id).filter((t) => t.kind === 'line' && t.λ >= VIS.min && t.λ <= VIS.max);
      if (lines.length) return lines[Math.floor(rng() * lines.length)].λ;
      const e = edgeNm(atom, id);
      if (e > VIS.min) return uniform(VIS.min, Math.min(VIS.max, e));
      return uniform(VIS.min, VIS.max);
    },
  };
}
