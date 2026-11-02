// assets/emotor/model.js — E-01 ģenerators un motors: viens taisnstūra rāmītis viendabīgā laukā (spec. § 7).
// φ — rāmīša leņķis ap asi (z, pret skatītāju); φ = 0 — stāvoklis A (plakne gar lauku, mala a pie S).
// Pozitīva strāva: malā a prom no skatītāja, malā b pret skatītāju. Tad spēks uz malu a ir uz leju (I > 0),
// griezes moments τ = −k·I·cos φ, plūsma Φ = −k·sin φ (normāle pēc labās rokas likuma pozitīvajai strāvai),
// inducētā EDS ℰ = −dΦ/dt = k·ω·cos φ. No stāvokļa B (φ = −90°) ar ω > 0: Φ = Φm cos ωt, ℰ = ℰm sin ωt — kā mācību grāmatā.
// Tas pats k abos režīmos — motors un ģenerators ir viena mašīna (ℰm pie 3 Hz = 1,8 V; motors pie 6 V griežas ~3 Hz).

export const RANGES = {
  U: { min: 1, max: 6, step: 0.1 },   // V — motora spriegums
  f: { min: 0.5, max: 3, step: 0.1 }, // Hz — ģeneratora griešanas ātrums (Ansis: min 0,5 Hz)
};
export const HZ_PER_VOLT = 0.5; // motora vienmērīgais ātrums ar kolektoru: f = 0,5 Hz/V · U
export const K = 0.6 / (2 * Math.PI); // V·s — k = BS; ℰm = k·ω = 0,6 V/Hz · f
export const R = 1; // Ω — rāmīša un avota pretestība (motorā)
export const R_LOAD = 1; // Ω — spuldzīte (ģeneratorā)
// Berze b izvēlēta tā, lai ar kolektoru vienmērīgais ātrums ir tieši Ω = 2π·0,5·U (vidējais moments pa apgriezienu = 0):
// (K/R)(2U/π − K·Ω/2) = b·Ω, Ω = π·U  ⇒  b = (K/R)(2/π − K·π/2)/π.
export const B_VISC = (K / R) * (2 / Math.PI - (K * Math.PI) / 2) / Math.PI;
export const J = 0.012; // kg·m² (modeļa) — ~1,3 s līdz 90 % no jaunā ātruma; bez kolektora rāmītis pie B apstājas ~5 s laikā
const STICK_OMEGA = 0.06; // rad/s — zem šī ātruma rāmītis var “pielipt” (miera berze)
const STICK_FRACTION = 0.05; // miera berze — 5 % no lielākā dzinējmomenta pie dotā U (apstājas ±3° no B)
const ASSIST = 0.35; // starta moments nāves punktā (daļa no lielākā dzinējmomenta) — Ansis: “Bez pagrūšanas”
const GEN_TAU = 0.35; // s — ģeneratora ātrums pieskaņojas slīdnim
const SUBSTEP = 0.002; // s

export const TAU = Math.PI * 2;
export const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// Kolektora zīme: ar kolektoru avots rāmītim pieslēgts ar zīmi sign(cos φ) — pārslēdzas, kad rāmītis iet caur B.
export function commutatorSign(phi, commutator) {
  if (!commutator) return 1;
  return Math.cos(phi) >= 0 ? 1 : -1;
}

export const emf = (phi, omega) => K * omega * Math.cos(phi);
export const flux = (phi) => -K * Math.sin(phi);
export const torqueOf = (phi, current) => -K * current * Math.cos(phi);

// Rāmīša strāva (pozitīvā norunā). Motorā avots (U ar polaritāti) caur kontaktiem + inducētā (pret)EDS; ģeneratorā tikai EDS.
export function loopCurrent(rotor, s) {
  const e = emf(rotor.phi, rotor.omega);
  if (s.mode === 'generator') return e / R_LOAD;
  return (commutatorSign(rotor.phi, s.commutator) * s.U * s.polarity + e) / R;
}

// Spriegums ārējā ķēdē (pie spuldzītes / avota spailēm): ar kolektoru — c·ℰ.
export function externalVoltage(rotor, s) {
  return commutatorSign(rotor.phi, s.commutator) * emf(rotor.phi, rotor.omega);
}

export function createRotor(phi = 0) {
  return { phi, omega: 0, t: 0, stuck: false };
}

export function steadyFrequency(U) {
  return HZ_PER_VOLT * U;
}

// Motora solis. s: { U, polarity (±1), commutator, free }.
function motorSub(r, h, s) {
  if (!s.free) {
    r.omega = 0;
    r.stuck = false;
    return;
  }
  const I = loopCurrent(r, s);
  let tau = torqueOf(r.phi, I) - B_VISC * r.omega;
  const tauMax = (K * s.U) / R;
  const drive = -Math.sign(s.U * s.polarity); // griešanās virziens, kurā kolektors dzen
  if (s.commutator && Math.abs(r.omega) < 0.5 && Math.abs(Math.cos(r.phi)) < 0.12) tau += ASSIST * tauMax * drive;
  // miera berze notur tikai stabilā līdzsvarā (bez kolektora, I·sin φ < 0) — apgriežot polaritāti, rāmītis pie B
  // vairs nav līdzsvarā un apgriežas uz otru pusi; ar kolektoru nelīp nekad (starta moments, spec. § 7)
  const stable = !s.commutator && I * Math.sin(r.phi) < 0;
  if (stable && Math.abs(r.omega) < STICK_OMEGA && Math.abs(tau) < STICK_FRACTION * tauMax) {
    r.omega = 0;
    r.stuck = true;
    return;
  }
  r.stuck = false;
  r.omega += (tau / J) * h;
  r.phi = wrapAngle(r.phi + r.omega * h);
}

// Ģeneratora solis. s: { f, dir (±1), commutator }. Ātrumu uzdod “kloķis”.
function generatorSub(r, h, s) {
  const target = s.dir * TAU * s.f;
  r.omega += (target - r.omega) * (1 - Math.exp(-h / GEN_TAU));
  r.phi = wrapAngle(r.phi + r.omega * h);
  r.stuck = false;
}

export function step(r, dt, s) {
  let left = dt;
  while (left > 1e-9) {
    const h = Math.min(SUBSTEP, left);
    if (s.mode === 'generator') generatorSub(r, h, s);
    else motorSub(r, h, s);
    r.t += h;
    left -= h;
  }
}

// ── Grafika buferis (ģeneratorā): pēdējās WINDOW sekundes ─────────
export const WINDOW = 4; // s
export function createTrace() {
  return { t0: 0, pts: [] }; // pts: { t, u, phi } — t no grafika sākuma
}
export function resetTrace(trace, t) {
  trace.t0 = t;
  trace.pts.length = 0;
}
export function pushTrace(trace, t, u, fluxRel) {
  const rel = t - trace.t0;
  const last = trace.pts[trace.pts.length - 1];
  if (last && rel - last.t < 1 / 240) return;
  trace.pts.push({ t: rel, u, phi: fluxRel });
  const cut = rel - WINDOW - 0.25;
  let i = 0;
  while (i < trace.pts.length && trace.pts[i].t < cut) i++;
  if (i > 0) trace.pts.splice(0, i);
}
// Redzamais logs: līdz WINDOW sekundēm zīmējas no kreisās, pēc tam slīd.
export function traceWindow(trace, now) {
  const rel = now - trace.t0;
  return rel <= WINDOW ? { from: 0, to: WINDOW } : { from: rel - WINDOW, to: rel };
}
export const EMF_AXIS = K * TAU * RANGES.f.max * 1.15; // V — grafika vertikālā ass (nemainīga)

// ── Spuldzīte: spožums seko jaudai ar kvēldiega inerci (spec. § 6.3) ──
export const BULB_TAU = 0.25; // s — virs 3 Hz spožuma svārstības ≤ ~20 % (WCAG 2.3.1)
export function bulbStep(level, power, pMax, dt) {
  const target = Math.min(1, power / pMax);
  return level + (target - level) * (1 - Math.exp(-dt / BULB_TAU));
}

// Stāvoklis vārdos (ekrāna lasītājam un paziņojumiem).
export function poseOf(phi) {
  const c = Math.abs(Math.cos(phi));
  if (c > 0.97) return 'along';  // plakne gar lauku (A)
  if (c < 0.06) return 'across'; // plakne šķērsām laukam (B)
  return 'between';
}
