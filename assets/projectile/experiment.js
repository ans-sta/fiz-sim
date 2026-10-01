// Viena palaišana: patiesā kustība + mērījuma troksnis (spec. 2; kā lodītes spec. 6, 3. līmenis).
// „±” vērtības ≈ 2σ. Nolasīšanas kļūdu nogriež pie read.max × intensitāte, tāpēc tabula un
// stroboskops sakrīt read.max + read.resolution/2 robežās pie intensitātes 1.
import { launchVelocity, settingsKey, flightCheck, MIN_POSITIONS } from './model.js';
import { SCALES, NOISE } from './scales.js';
import { positionAt, landingTime } from '../physics/projectile.js';
import { rngFor, gaussian } from '../measure/rng.js';
import { roundTo } from '../measure/format.js';
import { trapRepeat } from '../measure/traps.js';

export { NOISE };

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
  const key = settingsKey(settings, { noise, traps });
  const flight = flightCheck(settings, { noise, traps });
  if (flight !== 'ok') return { ok: false, reason: flight, key, repeat };

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
  // flightCheck pieļauj 4σ izkliedi; retā vēl lielākā novirze arī netiek ierakstīta
  if (samples.length < MIN_POSITIONS) return { ok: false, reason: 'short', key, repeat };

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
