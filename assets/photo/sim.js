// assets/photo/sim.js — A-02 notikumi laikā: prožektors sūta fotonus uz plāksni, katrs fotons ar hf > A izsit vienu elektronu,
// pārējie plāksni tikai silda (spec. § 2, § 5, § 10). Elektroni lido uz anodu; spriegums tos paātrina vai bremzē
// (vienmērīgs lauks: paātrinājums nemainīgs, pagrieziena vieta x = Wₖ / (e·U)). Bez DOM; laiks — sekundēs, vietas — daļās (0…1).
import { ejects, kineticMaxJ, travelTime, SPEED_SPREAD, EV } from './model.js';
import { mulberry32 } from '../measure/rng.js';

export const RATE_MAX = 24; // fotoni sekundē ekrānā pie 100 % (5 % — viens ik ~0,8 s)
export const FLIGHT = 1.4; // s — fotons no prožektora līdz plāksnei (Ansis 05.11.: 2× lēnāk)
export const EVERY = 1; // katrs fotons ar hf > A izsit elektronu (kvantu iznākums konstants; sk. § 10)
export const HEAT = 0.4; // s — sasilšanas zīme pie plāksnes
export const FENCE_PERIOD = 2.2; // s — “žoga” viena fotona cikls

export function createSim({
  lambda = 650, intensity = 30, metal = 'Na', on = true, voltage = 0, reverse = false, waves = false, rng = mulberry32(20261106),
} = {}) {
  const state = {
    // waves — ekrānā vienmērīgs kūlis: maiņas (izslēgt, krāsa, intensitāte) pie plāksnes ir uzreiz, ne pēc fotonu lidojuma
    t: 0, lambda, intensity, metal, on: false, voltage, reverse, waves,
    photons: [], // { λ, t0, y } — y: vieta uz plāksnes 0…1
    // { λ, t0, y, x, v, v0, kap } — x: vieta starp plāksni (0) un anodu (1), v: ātrums (daļas sekundē),
    // kap = v0² / Wₖ — ekrāna “masa”: paātrinājums a = ∓kap·e·U / 2, tātad ekrānā enerģija mainās tāpat kā īstajam
    electrons: [],
    heats: [], // { t0, y }
    acc: 0, k: 0, fenceT0: 0,
    counts: { photons: 0, electrons: 0, arrived: 0, returned: 0 },
  };
  const rate = () => (state.on ? (RATE_MAX * state.intensity) / 100 : 0);
  // bremzējot (anods −) a < 0, paātrinot a > 0
  const accel = (e) => (state.reverse ? -1 : 1) * e.kap * state.voltage * EV * 0.5;

  function spawn(age) {
    state.photons.push({ λ: state.lambda, t0: state.t - age, y: 0.08 + 0.84 * rng() });
  }

  function move(e, dt) {
    const a = accel(e);
    e.x += e.v * dt + 0.5 * a * dt * dt;
    e.v += a * dt;
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
        const wk = u * u * kineticMaxJ(p.λ, state.metal);
        const v0 = u / travelTime(kineticMaxJ(p.λ, state.metal));
        const e = { λ: p.λ, t0: tHit, y: p.y, x: 0, v: v0, v0, kap: (v0 * v0) / wk };
        move(e, state.t - tHit);
        state.electrons.push(e);
        state.counts.electrons++;
      } else {
        state.heats.push({ t0: tHit, y: p.y });
      }
    }
    state.photons = keep;
  }

  // Elektroni, kas sasnieguši anodu vai atgriezušies uz plāksni, pazūd
  function sweep() {
    state.electrons = state.electrons.filter((e) => {
      if (e.x >= 1) { state.counts.arrived++; return false; }
      if (e.x <= 0 && e.v < 0) { state.counts.returned++; return false; }
      return true;
    });
  }

  // Gaisma tikko ieslēgta (vai intensitāte no 0): stars jau pilns, pirmais fotons tieši pie plāksnes — elektrons šajā pašā kadrā
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

  // Vienmērīga plūsma ar pašreizējo ātrumu: pēdējais izlaistais fotons ir acc / r vecs, pārējie ik 1 / r (bez ierašanās)
  function refill() {
    const r = rate();
    state.photons = [];
    if (r <= 0) return;
    for (let a = state.acc / r; a < FLIGHT - 1e-9; a += 1 / r) spawn(a);
  }

  function step(dt) {
    if (!(dt > 0)) return;
    state.t += dt;
    for (const e of state.electrons) move(e, dt);
    const r = rate();
    if (r > 0) {
      state.acc += r * dt;
      while (state.acc >= 1) { state.acc -= 1; spawn(state.acc / r); }
    }
    arrivals();
    sweep();
    const t = state.t;
    state.heats = state.heats.filter((h) => t - h.t0 < HEAT);
  }

  function setOn(v) {
    const was = rate() > 0;
    state.on = Boolean(v);
    if (!state.on) state.acc = 0;
    if (!state.on && state.waves) state.photons = [];
    if (!was && rate() > 0) lightUp();
  }
  function setIntensity(v) {
    const was = rate() > 0;
    state.intensity = Math.min(100, Math.max(0, Math.round(v)));
    if (!was && rate() > 0) lightUp();
    else if (state.waves) refill();
  }
  const setLambda = (nm) => {
    state.lambda = nm;
    if (state.waves) for (const p of state.photons) p.λ = nm;
  };
  // Pārejot uz kūli, lidojošie fotoni atbilst pašreizējai gaismai (krāsa, intensitāte, izslēgta)
  const setWaves = (b) => {
    state.waves = Boolean(b);
    if (state.waves) refill();
  };
  const setMetal = (m) => { state.metal = m; };
  const setVoltage = (u) => { state.voltage = Math.max(0, u); };
  const setReverse = (b) => { state.reverse = Boolean(b); };

  setOn(on);
  return { state, step, setOn, setIntensity, setLambda, setMetal, setVoltage, setReverse, setWaves, rate };
}
