// Saite skolotājam: T, trail, molecules — tikai sākuma vērtības; nezināmos ignorē, ārpus robežām nogriež ar paziņojumu.
import { parseParams } from '../measure/url-params.js';
import { RANGES, defaultSettings, withT, withTrail, withMolecules } from './model.js';

export const PARAM_SCHEMA = {
  T: { type: 'number', min: RANGES.T.min, max: RANGES.T.max },
  trail: { type: 'bool' },
  molecules: { type: 'bool' },
};

export function settingsFromURL(search) {
  const p = parseParams(search, PARAM_SCHEMA);
  const q = p.values;
  let s = defaultSettings();
  if ('T' in q) s = withT(s, q.T);
  if ('trail' in q) s = withTrail(s, q.trail);
  if ('molecules' in q) s = withMolecules(s, q.molecules);
  const finalValue = { T: s.T, trail: s.trail ? '1' : '0', molecules: s.molecules ? '1' : '0' };
  const warnings = p.warnings.map((w) => ('used' in w ? w : { ...w, used: finalValue[w.param] }));
  return { settings: s, warnings };
}

export { warningText } from '../measure/url-params.js';
