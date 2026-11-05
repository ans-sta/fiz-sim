// Saite skolotājam (spec. § 6): lambda, intensity, metal, light, voltage, reverse, fence, ev; lock.
// lock=1 aizslēdz visus saitē dotos iestatījumus (kā K-01, S-03); lock=metal,lambda — tikai uzskaitītos.
// Nezināmos parametrus ignorē, ārpus robežām nogriež ar paziņojumu.
import { parseParams } from '../measure/url-params.js';
import { LAMBDA, METAL_IDS, U_MAX } from './model.js';

export const LOCKABLE = ['lambda', 'intensity', 'metal', 'light', 'photons', 'voltage', 'reverse', 'fence'];
export const PARAM_SCHEMA = {
  lambda: { type: 'number', min: LAMBDA.min, max: LAMBDA.max },
  intensity: { type: 'int', min: 0, max: 100 },
  metal: { type: 'enum', values: METAL_IDS },
  light: { type: 'bool' },
  photons: { type: 'bool' }, // gaismu rādīt kā atsevišķus fotonus (citādi — vienmērīgs kūlis)
  voltage: { type: 'number', min: 0, max: U_MAX },
  reverse: { type: 'bool' }, // anods − (bremzē)
  fence: { type: 'bool' },
  ev: { type: 'bool' },
};

// Noklusējums — 7. sadaļas 1. solis: nātrijs, sarkans 650 nm, intensitāte 30 %, gaisma ieslēgta; spriegums 0 V, anods +
export function defaultSettings() {
  return { lambda: 650, intensity: 30, metal: 'Na', light: true, photons: false, voltage: 0, reverse: false, fence: false, ev: false };
}

export function settingsFromURL(search) {
  const p = parseParams(search, PARAM_SCHEMA);
  const settings = { ...defaultSettings(), ...p.values };
  settings.lambda = Math.round(settings.lambda); // slīdnis iet pa 1 nm
  settings.voltage = Math.round(settings.voltage * 100) / 100; // un pa 0,01 V
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
