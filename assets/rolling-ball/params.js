import { parseParams } from '../measure/url-params.js';
import { BALLS, ballById, ballFits } from './balls.js';
import {
  defaultSettings, withL, withH, withAlpha, withX0, withLevel, withTimer, withDt, withTape,
  hMax, x0Max, finishX, spreadGates, L_MIN, L_MAX, ALPHA_MAX, DT_OPTIONS, GATE_MIN, GATE_MAX, GATE_GAP, STEP,
} from './model.js';
import { randomSeed } from '../measure/rng.js';
import { roundTo } from '../measure/format.js';

export const PARAM_SCHEMA = {
  L: { type: 'number', min: L_MIN, max: L_MAX },
  h: { type: 'number', min: 0, max: 60 },
  alpha: { type: 'number', min: 0, max: ALPHA_MAX },
  ball: { type: 'enum', values: BALLS.map((b) => b.id) },
  profile: { type: 'enum', values: ['groove', 'flat'] },
  x0: { type: 'number', min: 0, max: L_MAX },
  level: { type: 'enum', values: ['1', '2', '3'] },
  timer: { type: 'enum', values: ['gate', 'hand'] },
  gates: { type: 'list-number', min: 0, max: L_MAX, minLen: GATE_MIN, maxLen: GATE_MAX },
  dt: { type: 'number', values: DT_OPTIONS },
  view: { type: 'enum', values: ['table', 'strobe', 'both'] },
  tape: { type: 'bool' },
  noise: { type: 'enum', values: ['0', '1', '2'] },
  traps: { type: 'list-enum', values: ['push', 'late'] },
  seed: { type: 'int', min: 1, max: 2147483647 },
};

export const LOCKABLE = ['L', 'h', 'alpha', 'ball', 'profile', 'x0', 'level', 'timer', 'gates', 'dt', 'view', 'tape'];

export function settingsFromURL(search, { makeSeed = randomSeed, base = null } = {}) {
  const p = parseParams(search, PARAM_SCHEMA);
  const v = p.values;
  const warnings = new Map(); // param → warning (a later one replaces an earlier one)
  for (const w of p.warnings) warnings.set(w.param, { ...w });
  const warn = (w) => warnings.set(w.param, w);

  let s = base ? { ...base, gates: [...base.gates] } : defaultSettings();
  if ('L' in v) s = withL(s, v.L);
  if ('h' in v) {
    if ('alpha' in v) warn({ param: 'alpha', raw: String(v.alpha), reason: 'h_and_alpha' });
    if (v.h > hMax(s.L)) warn({ param: 'h', raw: new URLSearchParams(search).get('h'), reason: 'h_clamped', used: hMax(s.L), L: s.L });
    s = withH(s, v.h);
  } else if ('alpha' in v) {
    s = withAlpha(s, v.alpha);
  }
  if ('profile' in v) s = { ...s, profile: v.profile }; // the default ball fits both profiles
  if ('ball' in v) {
    if (ballFits(ballById(v.ball), s.profile)) s = { ...s, ball: v.ball };
    else warn({ param: 'ball', raw: v.ball, reason: 'ball_no_fit', used: s.ball });
  }
  if ('x0' in v) {
    if (v.x0 > x0Max(s.L)) warn({ param: 'x0', raw: String(v.x0), reason: 'x0_clamped', used: x0Max(s.L) });
    s = withX0(s, v.x0);
  }
  if ('level' in v) s = withLevel(s, Number(v.level));
  if ('timer' in v) s = withTimer(s, v.timer);
  if ('gates' in v) {
    const sorted = v.gates.map((x) => roundTo(x, STEP.x)).sort((a, b) => a - b);
    const ok = sorted.every((x, i) => x >= (i === 0 ? s.x0 : sorted[i - 1]) + GATE_GAP) && sorted[sorted.length - 1] <= s.L;
    if (ok) s = { ...s, gates: sorted };
    else {
      const spread = spreadGates(s.x0, finishX(s.L), sorted.length);
      warn({ param: 'gates', raw: new URLSearchParams(search).get('gates'), reason: 'gates_clamped', used: spread });
      s = { ...s, gates: spread };
    }
  }
  if ('dt' in v) s = withDt(s, v.dt);
  if ('tape' in v) s = withTape(s, v.tape);

  const locked = p.lock ? new Set(LOCKABLE.filter((n) => p.given.has(n))) : new Set();
  let views = { table: true, strobe: true };
  if (p.lock && 'view' in v) views = { table: v.view !== 'strobe', strobe: v.view !== 'table' };
  const noise = 'noise' in v ? Number(v.noise) : 1;
  const traps = v.traps ?? [];
  const seed = v.seed ?? makeSeed();

  // `used` for the generic warnings = the final value of that setting
  const finalValue = {
    L: s.L, h: s.h, alpha: roundTo(s.alphaDeg, 0.1), ball: s.ball, profile: s.profile, x0: s.x0,
    level: s.level, timer: s.timer, gates: s.gates, dt: s.dt, view: 'both', tape: s.tape ? '1' : '0',
    noise, traps: [], seed,
  };
  for (const w of warnings.values()) if (!('used' in w)) w.used = finalValue[w.param];
  if (warnings.has('alpha') && warnings.get('alpha').reason === 'h_and_alpha') warnings.get('alpha').used = s.h;

  return { settings: s, locked, views, noise, traps, seed, seedGiven: 'seed' in v, warnings: [...warnings.values()] };
}

export { warningText } from '../measure/url-params.js';
