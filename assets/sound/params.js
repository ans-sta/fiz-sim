// Saite skolotājam: view, f, wave, phi — tikai sākuma vērtības; nezināmos ignorē, ārpus robežām — nogriež ar paziņojumu.
import { parseParams } from '../measure/url-params.js';
import { VIEWS, WAVES, FMIN, FMAX, RANGES, defaultSettings, withView, withF, withWave, withPhi } from './model.js';

export const PARAM_SCHEMA = {
  view: { type: 'enum', values: VIEWS },
  f: { type: 'number', min: FMIN, max: FMAX },
  wave: { type: 'enum', values: WAVES },
  phi: { type: 'number', min: RANGES.phi.min, max: RANGES.phi.max },
};

export function settingsFromURL(search) {
  const p = parseParams(search, PARAM_SCHEMA);
  const q = p.values;
  let s = defaultSettings();
  if ('view' in q) s = withView(s, q.view);
  if ('f' in q) s = withF(s, q.f);
  if ('wave' in q) s = withWave(s, q.wave);
  if ('phi' in q) s = withPhi(s, q.phi);
  const finalValue = { view: s.view, f: s.f, wave: s.wave, phi: s.phi };
  const warnings = p.warnings.map((w) => ('used' in w ? w : { ...w, used: finalValue[w.param] }));
  return { settings: s, warnings };
}

export { warningText } from '../measure/url-params.js';
