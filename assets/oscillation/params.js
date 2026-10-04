// Saite skolotājam (spec. 6): view, A, lambda, v, lines — tikai sākuma vērtības; nezināmos ignorē, ārpus robežām — nogriež ar paziņojumu.
import { parseParams } from '../measure/url-params.js';
import { VIEWS, RANGES, defaultSettings, withA, withLambda, withV, withLines } from './model.js';

export const PARAM_SCHEMA = {
  view: { type: 'enum', values: VIEWS },
  A: { type: 'number', min: RANGES.A.min, max: RANGES.A.max },
  lambda: { type: 'number', min: RANGES.lambda.min, max: RANGES.lambda.max },
  v: { type: 'number', min: RANGES.v.min, max: RANGES.v.max },
  lines: { type: 'bool' },
};

export function settingsFromURL(search) {
  const p = parseParams(search, PARAM_SCHEMA);
  const q = p.values;
  let s = defaultSettings();
  if ('A' in q) s = withA(s, q.A);
  if ('lambda' in q) s = withLambda(s, q.lambda);
  if ('v' in q) s = withV(s, q.v);
  if ('lines' in q) s = withLines(s, q.lines);
  const view = q.view ?? 'circle';
  const finalValue = { view, A: s.A, lambda: s.lambda, v: s.v, lines: s.lines ? '1' : '0' };
  const warnings = p.warnings.map((w) => ('used' in w ? w : { ...w, used: finalValue[w.param] }));
  return { settings: s, view, warnings };
}

export { warningText } from '../measure/url-params.js';
