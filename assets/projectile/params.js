import { parseParams } from '../measure/url-params.js';
import { SCALE, ALPHA, MODE_NUMBER } from './scales.js';
import { defaultSettings, withH, withV0, withAlpha, withDt, withSecond, withGrid, v0Range, withMode } from './model.js';
import { randomSeed } from '../measure/rng.js';

export { warningText } from '../measure/url-params.js';

const MODE_BY_NUMBER = { 1: 'vertical', 2: 'horizontal', 3: 'oblique' };

export const PARAM_SCHEMA = {
  mode: { type: 'enum', values: ['1', '2', '3'] },
  h: { type: 'number' }, // robežas — sk. settingsFromURL
  v0: { type: 'number' },
  alpha: { type: 'number', min: ALPHA.min, max: ALPHA.max },
  dt: { type: 'number', min: SCALE.dt.min, max: SCALE.dt.max },
  second: { type: 'bool' },
  grid: { type: 'bool' },
  view: { type: 'enum', values: ['table', 'strobe', 'both'] },
  noise: { type: 'enum', values: ['0', '1', '2'] },
  traps: { type: 'list-enum', values: ['late'] },
  seed: { type: 'int', min: 1, max: 2147483647 },
};

export const LOCKABLE = ['mode', 'h', 'v0', 'alpha', 'dt', 'second', 'grid', 'view'];

export function settingsFromURL(search, { makeSeed = randomSeed, base = null } = {}) {
  const p = parseParams(search, PARAM_SCHEMA);
  const v = p.values;
  const raw = new URLSearchParams(search);
  const warnings = new Map(); // param → warning (a later one replaces an earlier one)
  for (const w of p.warnings) warnings.set(w.param, { ...w });
  const warn = (w) => warnings.set(w.param, w);

  const mode = 'mode' in v ? MODE_BY_NUMBER[v.mode] : 'horizontal';
  // pētījumā sāk no tā iestatījumiem; režīms no saites — virsū
  let s = base ? { ...base } : defaultSettings(mode);
  if (base && 'mode' in v) s = withMode(s, mode);
  const sc = SCALE;
  // vecās saites ar mēroga parametru: mēroga vairs nav, lielumi ir metros
  if (raw.has('scale')) warn({ param: 'scale', raw: raw.get('scale'), reason: 'scale_removed' });
  // vērtība starp iestatāmajiem soļiem tiek noapaļota — par to arī paziņo (unit ar atstarpi priekšā vai °)
  const rounded = (param, given, used, unit) => {
    if (!warnings.has(param) && Math.abs(given - used) > 1e-9) warn({ param, raw: raw.get(param), reason: 'rounded', used, unit });
  };
  if ('h' in v) {
    if (v.h < sc.h.min || v.h > sc.h.max) {
      warn({ param: 'h', raw: raw.get('h'), reason: 'h_range', min: sc.h.min, max: sc.h.max, unit: sc.unit });
    }
    s = withH(s, v.h);
    rounded('h', v.h, s.h, ` ${sc.unit}`);
  }
  if ('v0' in v) {
    const r = v0Range(s.mode);
    if (v.v0 < r.min || v.v0 > r.max) {
      warn({ param: 'v0', raw: raw.get('v0'), reason: 'v0_clamped', min: r.min, max: r.max, unit: `${sc.unit}/s` });
    }
    s = withV0(s, v.v0);
    rounded('v0', v.v0, s.v0, ` ${sc.unit}/s`);
  }
  if ('alpha' in v) {
    s = withAlpha(s, v.alpha);
    rounded('alpha', v.alpha, s.alphaDeg, '°');
  }
  if ('dt' in v) {
    s = withDt(s, v.dt);
    rounded('dt', v.dt, s.dt, ' s');
  }
  if ('second' in v) s = withSecond(s, v.second);
  if ('grid' in v) s = withGrid(s, v.grid);

  const locked = p.lock ? new Set(LOCKABLE.filter((n) => p.given.has(n))) : new Set();
  let views = { table: true, strobe: true };
  if (p.lock && 'view' in v) views = { table: v.view !== 'strobe', strobe: v.view !== 'table' };
  const noise = 'noise' in v ? Number(v.noise) : 1;
  const traps = v.traps ?? [];
  const seed = v.seed ?? makeSeed();

  // `used` for every warning = the final value of that setting
  const finalValue = {
    mode: String(MODE_NUMBER[s.mode]), scale: '', h: s.h, v0: s.v0, alpha: s.alphaDeg, dt: s.dt,
    second: s.second ? '1' : '0', grid: s.grid ? '1' : '0', view: 'both', noise, traps: [], seed,
  };
  for (const w of warnings.values()) if (!('used' in w)) w.used = finalValue[w.param];

  return { settings: s, locked, views, noise, traps, seed, seedGiven: 'seed' in v, warnings: [...warnings.values()] };
}
