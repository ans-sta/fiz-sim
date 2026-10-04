// Saite skolotājam (spec. 6): view, A, T, lambda, v, lines — tikai sākuma vērtības; nezināmos ignorē, ārpus robežām — nogriež ar paziņojumu.
// T, lambda, v ir saistīti (v = λ/T): tos pielieto saites secībā, un pieskaņojas tas, kurš dots agrāk (kā lapā).
import { parseParams } from '../measure/url-params.js';
import { VIEWS, RANGES, defaultSettings, withA, withT, withLambda, withV, withLines } from './model.js';

export const PARAM_SCHEMA = {
  view: { type: 'enum', values: VIEWS },
  A: { type: 'number', min: RANGES.A.min, max: RANGES.A.max },
  T: { type: 'number', min: RANGES.T.min, max: RANGES.T.max },
  lambda: { type: 'number', min: RANGES.lambda.min, max: RANGES.lambda.max },
  v: { type: 'number', min: RANGES.v.min, max: RANGES.v.max },
  lines: { type: 'bool' },
};
const LINKED = { T: withT, lambda: withLambda, v: withV };

export function settingsFromURL(search) {
  const p = parseParams(search, PARAM_SCHEMA);
  const q = p.values;
  let s = defaultSettings();
  if ('A' in q) s = withA(s, q.A);
  for (const name of new URLSearchParams(search).keys()) if (name in LINKED && name in q) s = LINKED[name](s, q[name]);
  if ('lines' in q) s = withLines(s, q.lines);
  const view = q.view ?? 'circle';
  const finalValue = { view, A: s.A, T: s.T, lambda: s.lambda, v: s.v, lines: s.lines ? '1' : '0' };
  const warnings = p.warnings.map((w) => ('used' in w ? w : { ...w, used: finalValue[w.param] }));
  return { settings: s, view, warnings };
}

export { warningText } from '../measure/url-params.js';
