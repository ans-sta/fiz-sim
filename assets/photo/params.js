// Saite skolotājam (spec. § 6): lambda, intensity, metal, light, fence, predict, ev; lock.
// lock=1 aizslēdz visus saitē dotos iestatījumus (kā K-01, S-03); lock=metal,lambda — tikai uzskaitītos.
// Nezināmos parametrus ignorē, ārpus robežām nogriež ar paziņojumu.
import { parseParams } from '../measure/url-params.js';
import { LAMBDA, METAL_IDS } from './model.js';

export const LOCKABLE = ['lambda', 'intensity', 'metal', 'light', 'fence', 'predict'];
export const PARAM_SCHEMA = {
  lambda: { type: 'number', min: LAMBDA.min, max: LAMBDA.max },
  intensity: { type: 'int', min: 0, max: 100 },
  metal: { type: 'enum', values: METAL_IDS },
  light: { type: 'bool' },
  fence: { type: 'bool' },
  predict: { type: 'bool' },
  ev: { type: 'bool' },
};

// Noklusējums — 7. sadaļas 1. solis: nātrijs, sarkans 650 nm, spožums 30 %, gaisma ieslēgta
export function defaultSettings() {
  return { lambda: 650, intensity: 30, metal: 'Na', light: true, fence: false, predict: false, ev: false };
}

export function settingsFromURL(search) {
  const p = parseParams(search, PARAM_SCHEMA);
  const settings = { ...defaultSettings(), ...p.values };
  settings.lambda = Math.round(settings.lambda); // slīdnis iet pa 1 nm
  const warnings = p.warnings.map((w) => ('used' in w ? w : { ...w, used: settings[w.param] }));
  const raw = new URLSearchParams(search).get('lock');
  let locked = new Set();
  if (p.lock) locked = new Set([...p.given].filter((k) => LOCKABLE.includes(k)));
  else if (raw && raw !== '0' && raw !== 'false') {
    const names = [...new Set(raw.split(',').map((x) => x.trim()).filter(Boolean))];
    const bad = names.filter((n) => !LOCKABLE.includes(n));
    locked = new Set(names.filter((n) => LOCKABLE.includes(n)));
    if (bad.length) warnings.push({ param: 'lock', raw, reason: 'not_allowed', allowed: ['1', ...LOCKABLE], used: [...locked] });
  }
  return { settings, locked, warnings };
}

export { warningText } from '../measure/url-params.js';
