// Saite skolotājam (spec. § 5): view, sens; lock=1 aizslēdz saitē dotos iestatījumus (kā K-01/K-02).
// Nezināmos parametrus ignorē, ārpus robežām nogriež ar paziņojumu.
import { parseParams } from '../measure/url-params.js';

export const VIEWS = ['spectrum', 'spectrogram'];
export const SENS = { min: 1, max: 10 };
export const PARAM_SCHEMA = {
  view: { type: 'enum', values: VIEWS },
  sens: { type: 'int', min: SENS.min, max: SENS.max },
};

export function defaultSettings() {
  return { view: 'spectrum', sens: 5 };
}

export function settingsFromURL(search) {
  const p = parseParams(search, PARAM_SCHEMA);
  const settings = { ...defaultSettings(), ...p.values };
  const warnings = p.warnings.map((w) => ('used' in w ? w : { ...w, used: settings[w.param] }));
  return { settings, locked: p.lock ? new Set(p.given) : new Set(), warnings };
}

export { warningText } from '../measure/url-params.js';
