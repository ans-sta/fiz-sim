// Saite skolotājam (spec. § 8.5): mode=motor|generator. Nezināmos parametrus ignorē, nederīgu vērtību aizstāj ar paziņojumu.
import { parseParams } from '../measure/url-params.js';

export const MODES = ['motor', 'generator'];
export const PARAM_SCHEMA = {
  mode: { type: 'enum', values: MODES },
};

export function defaultSettings() {
  return { mode: 'motor' };
}

export function settingsFromURL(search) {
  const p = parseParams(search, PARAM_SCHEMA);
  const settings = { ...defaultSettings(), ...p.values };
  const warnings = p.warnings.map((w) => ('used' in w ? w : { ...w, used: settings[w.param] }));
  return { settings, warnings };
}

export { warningText } from '../measure/url-params.js';
