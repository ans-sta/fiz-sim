// assets/photo/sim.js — A-02 notikumi laikā: lampa sūta fotonus uz plāksni, katrs fotons ar hf > A izsit vienu elektronu,
// pārējie plāksni tikai silda (spec. § 2, § 5, § 10). Bez DOM; laiks — sekundēs, ekrāna vietas — daļās (0…1).
import { ejects, kineticMaxJ, travelTime, SPEED_SPREAD } from './model.js';
import { mulberry32 } from '../measure/rng.js';

export const RATE_MAX = 24; // fotoni sekundē ekrānā pie 100 % (5 % — viens ik ~0,8 s)
export const FLIGHT = 0.35; // s — fotons no lampas līdz plāksnei
export const EVERY = 1; // katrs fotons ar hf > A izsit elektronu (kvantu iznākums konstants; sk. § 10)
export const HEAT = 0.4; // s — sasilšanas zīme pie plāksnes
export const FENCE_PERIOD = 2.2; // s — “žoga” viena fotona cikls

export function createSim({ lambda = 650, intensity = 30, metal = 'Na', on = true, rng = mulberry32(20261106) } = {}) {
  const state = {
    t: 0, lambda, intensity, metal, on: false,
    photons: [], // { λ, t0, y, x } — y: vieta uz plāksnes 0…1, x: vieta lampas lodziņā 0…1
    electrons: [], // { λ, t0, y, T } — T: ceļa laiks līdz savācējam
    heats: [], // { t0, y }
    acc: 0, k: 0, fenceT0: 0,
    counts: { photons: 0, electrons: 0, arrived: 0 },
  };
  const rate = () => (state.on ? (RATE_MAX * state.intensity) / 100 : 0);

  function spawn(age) {
    state.photons.push({ λ: state.lambda, t0: state.t - age, y: 0.08 + 0.84 * rng(), x: rng() });
  }

  // Fotoni, kas sasnieguši plāksni: izsit elektronu vai silda
  function arrivals() {
    const keep = [];
    for (const p of state.photons) {
      if (state.t - p.t0 < FLIGHT - 1e-9) { keep.push(p); continue; }
      const k = state.k++;
      state.counts.photons++;
      const tHit = p.t0 + FLIGHT;
      if (k % EVERY === 0 && ejects(p.λ, state.metal)) {
        const u = 1 - SPEED_SPREAD * rng(); // ātrums 85–100 % no lielākā
        state.electrons.push({ λ: p.λ, t0: tHit, y: p.y, T: travelTime(kineticMaxJ(p.λ, state.metal)) / u });
        state.counts.electrons++;
      } else {
        state.heats.push({ t0: tHit, y: p.y });
      }
    }
    state.photons = keep;
  }

  // Gaisma tikko ieslēgta (vai spožums no 0): stars jau pilns, pirmais fotons tieši pie plāksnes — elektrons šajā pašā kadrā
  function lightUp() {
    const r = rate();
    if (r <= 0) return;
    state.k = 0;
    state.fenceT0 = state.t;
    let age = FLIGHT;
    let last = age;
    while (age >= 0) { spawn(age); last = age; age -= 1 / r; }
    state.acc = last * r;
    arrivals();
  }

  function step(dt) {
    if (!(dt > 0)) return;
    state.t += dt;
    const r = rate();
    if (r > 0) {
      state.acc += r * dt;
      while (state.acc >= 1) { state.acc -= 1; spawn(state.acc / r); }
    }
    arrivals();
    const t = state.t;
    state.electrons = state.electrons.filter((e) => {
      if (t - e.t0 < e.T) return true;
      state.counts.arrived++;
      return false;
    });
    state.heats = state.heats.filter((h) => t - h.t0 < HEAT);
  }

  function setOn(v) {
    const was = rate() > 0;
    state.on = Boolean(v);
    if (!state.on) state.acc = 0;
    if (!was && rate() > 0) lightUp();
  }
  function setIntensity(v) {
    const was = rate() > 0;
    state.intensity = Math.min(100, Math.max(0, Math.round(v)));
    if (!was && rate() > 0) lightUp();
  }
  const setLambda = (nm) => { state.lambda = nm; };
  const setMetal = (m) => { state.metal = m; };

  setOn(on);
  return { state, step, setOn, setIntensity, setLambda, setMetal, rate };
}
