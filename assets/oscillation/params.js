// Saite skolotājam (spec. 6): view, A, T, lambda, lines — tikai sākuma vērtības; nezināmos ignorē, ārpus robežām — nogriež ar paziņojumu.
import { parseParams } from '../measure/url-params.js';
import { VIEWS, RANGES, defaultSettings, withA, withT, withLambda, withLines } from './model.js';

export const PARAM_SCHEMA = {
  view: { type: 'enum', values: VIEWS },
  A: { type: 'number', min: RANGES.A.min, max: RANGES.A.max },
  T: { type: 'number', min: RANGES.T.min, max: RANGES.T.max },
  lambda: { type: 'number', min: RANGES.lambda.min, max: RANGES.lambda.max },
  lines: { type: 'bool' },
};

export function settingsFromURL(search) {
  const p = parseParams(search, PARAM_SCHEMA);
  const v = p.values;
  let s = defaultSettings();
  if ('A' in v) s = withA(s, v.A);
  if ('T' in v) s = withT(s, v.T);
  if ('lambda' in v) s = withLambda(s, v.lambda);
  if ('lines' in v) s = withLines(s, v.lines);
  const view = v.view ?? 'circle';
  const finalValue = { view, A: s.A, T: s.T, lambda: s.lambda, lines: s.lines ? '1' : '0' };
  const warnings = p.warnings.map((w) => ('used' in w ? w : { ...w, used: finalValue[w.param] }));
  return { settings: s, view, warnings };
}

export { warningText } from '../measure/url-params.js';
