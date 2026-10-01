// Viena palaišana: patiesā kustība + mērījuma troksnis (spec. 2; kā lodītes spec. 6, 3. līmenis).
// „±” vērtības ≈ 2σ. Nolasīšanas kļūdu nogriež pie read.max × intensitāte, tāpēc tabula un
// stroboskops sakrīt read.max + read.resolution/2 robežās pie intensitātes 1.
import { derive, launchVelocity, settingsKey } from './model.js';
import { SCALES } from './scales.js';
import { positionAt, landingTime } from '../physics/projectile.js';
import { rngFor, gaussian } from '../measure/rng.js';
import { roundTo } from '../measure/format.js';
import { trapRepeat } from '../measure/traps.js';

export const NOISE = {
  v0Rel: 0.01, // σ no v₀ starp palaišanām (relatīvi)
  alphaDeg: 0.3, // σ leņķim slīpajā sviedienā, grādi
  startFrames: 1, // sākuma kadra nobīde: vesels skaitlis −1…1 kadrs (× intensitāte)
  lateFrames: [2, 3], // slazds „late”: sākuma kadrs 2–3 kadrus par vēlu
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const MAX_SAMPLES = 10000;

function motionPath(g, h, vx, vy) {
  const motion = { g, h, vx, vy };
  const tLand = landingTime(motion);
  const at = (t) => {
    if (t <= 0) return { x: 0, y: h };
    if (t >= tLand) return { x: vx * tLand, y: 0 };
    return positionAt(motion, t);
  };
  return { tLand, at };
}

export function simulateRun(settings, { seed, repeat, noise, traps }) {
  const d = derive(settings);
  const key = settingsKey(settings, { noise, traps });
  if (d.flight !== 'ok') return { ok: false, reason: d.flight, key, repeat };

  const sc = SCALES[settings.scale];
  const k = noise;
  const rand = rngFor(seed, key, repeat);
  const v0Run = settings.v0 * (1 + k * NOISE.v0Rel * gaussian(rand));
  const alphaRun = settings.mode === 'oblique' ? clamp(settings.alphaDeg + k * NOISE.alphaDeg * gaussian(rand), 0, 90) : settings.alphaDeg;
  const { vx, vy } = launchVelocity({ ...settings, v0: v0Run, alphaDeg: alphaRun });
  const main = motionPath(sc.g, settings.h, vx, vy);
  const second = settings.mode === 'horizontal' && settings.second ? motionPath(sc.g, settings.h, 0, 0) : null;

  const late = traps.includes('late') && repeat === trapRepeat(seed, key, 'late');
  const shift = Math.floor(rand() * (2 * NOISE.startFrames + 1)) - NOISE.startFrames;
  const [lo, hi] = NOISE.lateFrames;
  const lateFrames = late ? lo + Math.floor(rand() * (hi - lo + 1)) : 0;
  const tauRaw = (Math.round(k * shift) + lateFrames) * sc.frame;
  const tau = tauRaw === 0 ? 0 : tauRaw;

  const maxErr = k * sc.read.max;
  const readErr = () => clamp(k * sc.read.sigma * gaussian(rand), -maxErr, maxErr);
  const vertical = settings.mode === 'vertical';
  const samples = [];
  const strobe = [];
  const strobe2 = second ? [] : null;
  for (let n = 0; n < MAX_SAMPLES; n++) {
    const tf = n * settings.dt;
    const tPhys = tf + tau;
    if (tPhys > main.tLand + 1e-12) break;
    const t = roundTo(tf, settings.dt);
    const p = main.at(tPhys);
    strobe.push({ n, t, x: p.x, y: p.y });
    if (second) strobe2.push({ n, t, ...second.at(tPhys) });
    const x = vertical ? 0 : roundTo(p.x + readErr(), sc.read.resolution);
    const y = roundTo(p.y + readErr(), sc.read.resolution);
    samples.push({ n, t, x, y });
  }

  return {
    ok: true,
    key,
    repeat,
    mode: settings.mode,
    scale: settings.scale,
    tEnd: second ? Math.max(main.tLand, second.tLand) : main.tLand,
    posAt: main.at,
    posAt2: second ? second.at : null,
    samples,
    strobe,
    strobe2,
    truth: { v0Run, alphaRun, tau, traps: late ? ['late'] : [] },
  };
}
