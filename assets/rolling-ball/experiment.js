// Viena palaišana: patiesā kustība + mērījuma troksnis (spec. 6).
// Spec. „±” vērtības šeit ir ≈ 2σ. Nolasīšanas kļūdu 3. līmenī nogriež pie ±0,25 cm × intensitāte,
// lai tabula un stroboskops sakristu ±0,5 cm robežās pie trokšņa intensitātes 1 (spec. 12.13);
// pie intensitātes 2 starpība var sasniegt 0,75 cm.
// Slazds nostrādā tieši vienā no pirmajiem trim katras tabulas atkārtojumiem (kurā — nosaka sēkla).
import { derive, settingsKey } from './model.js';
import { rngFor, gaussian, hash32 } from '../measure/rng.js';
import { roundTo } from '../measure/format.js';

export const NOISE = {
  aRel: 0.01, // σ no a starp palaišanām (relatīvi)
  reaction: 0.06, // s, σ vienam hronometra spiedienam
  bias: 0.03, // s, σ mērītāja sistemātiskajai nobīdei (nemainīga vienai sēklai)
  gateX: 0.1, // cm, σ fotovārtu novietojumam
  gateT: 0.0005, // s, σ fotovārtu laikam
  frame: 1 / 30, // s, viens video kadrs
  startFrames: 2, // sākuma kadra nobīde: vesels skaitlis −2…2 kadri (× intensitāte)
  readX: 0.15, // cm, σ x nolasīšanai
  readXMax: 0.25, // cm, nolasīšanas kļūdas robeža (× intensitāte)
};
export const RESOLUTION = { hand: 0.01, gate: 0.001, x: 0.5 };
export const ERRORS = { hand: 0.1, gateT: 0.001, gateX: 0.2, x: 0.5 };
export const DECIMALS = { hand: 2, gateT: 3, gateX: 1, x: 1 };
export const TRAP_REPEATS = 3;

export function trapRepeat(seed, key, name) {
  return 1 + (hash32(`${seed}|${key}|trap:${name}`) % TRAP_REPEATS);
}

export function simulateRun(settings, { seed, repeat, noise, traps }) {
  const d = derive(settings);
  const key = settingsKey(settings, { noise, traps });
  if (!d.rolls) return { rolls: false, key, repeat, hMin: d.hMin, alphaMinDeg: d.alphaMinDeg };

  const k = noise;
  const rand = rngFor(seed, key, repeat);
  const aRun = d.a * Math.max(0.5, 1 + k * NOISE.aRel * gaussian(rand));
  const push = traps.includes('push') && repeat === trapRepeat(seed, key, 'push');
  const late = traps.includes('late') && settings.level === 3 && repeat === trapRepeat(seed, key, 'late');
  const v0 = push ? 3 + 2 * rand() : 0;
  const { x0, L } = settings;

  const xAt = (t) => (t <= 0 ? x0 : Math.min(L, x0 + v0 * t + (aRun * t * t) / 2));
  const timeTo = (x) => {
    const s = Math.max(0, x - x0);
    return (-v0 + Math.sqrt(v0 * v0 + 2 * aRun * s)) / aRun;
  };

  const run = {
    rolls: true,
    key,
    repeat,
    level: settings.level,
    x0,
    L,
    xf: d.xf,
    tEnd: timeTo(L),
    xAt,
    timeTo,
    truth: { a: d.a, aRun, v0, tau: 0, traps: [...(push ? ['push'] : []), ...(late ? ['late'] : [])] },
  };

  if (settings.level === 1) {
    const bias = k * NOISE.bias * gaussian(rngFor(seed, 'bias', 0));
    const t = timeTo(d.xf) + bias + k * NOISE.reaction * (gaussian(rand) - gaussian(rand));
    run.level1 = { t: roundTo(Math.max(0, t), RESOLUTION.hand) };
  } else if (settings.level === 2) {
    run.level2 = {
      gates: settings.gates.map((x, i) => {
        if (settings.timer === 'gate') {
          const xReal = Math.min(L, Math.max(x0, x + k * NOISE.gateX * gaussian(rand)));
          const t = timeTo(xReal) + k * NOISE.gateT * gaussian(rand);
          return { x, t: roundTo(Math.max(0, t), RESOLUTION.gate) };
        }
        const bias = k * NOISE.bias * gaussian(rngFor(seed, 'bias', i + 1));
        const t = timeTo(x) + bias + k * NOISE.reaction * (gaussian(rand) - gaussian(rand));
        return { x, t: roundTo(Math.max(0, t), RESOLUTION.hand) };
      }),
    };
  } else {
    const shift = Math.floor(rand() * (2 * NOISE.startFrames + 1)) - NOISE.startFrames;
    const lateFrames = late ? 2 + Math.floor(rand() * 2) : 0;
    const tau = (Math.round(k * shift) + lateFrames) * NOISE.frame;
    run.truth.tau = tau === 0 ? 0 : tau;
    const maxErr = k * NOISE.readXMax;
    const samples = [];
    const strobe = [];
    for (let n = 0; ; n++) {
      const tf = n * settings.dt;
      const tPhys = tf + tau;
      if (tPhys > run.tEnd) break;
      const x = xAt(tPhys);
      const t = roundTo(tf, settings.dt);
      strobe.push({ n, t, x });
      const err = Math.max(-maxErr, Math.min(maxErr, k * NOISE.readX * gaussian(rand)));
      samples.push({ n, t, x: roundTo(x + err, RESOLUTION.x) });
    }
    run.level3 = { samples, strobe };
  }
  return run;
}
