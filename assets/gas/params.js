// Saite skolotājam: V, T, p — sākuma vērtības, pielieto saites secībā (pieskaņojas tas, kurš dots agrāk, kā lapā); nezināmos ignorē.
import { parseParams } from '../measure/url-params.js';
import { RANGES, KEYS, defaultSettings, withQuantity, withLock } from './model.js';

export const PARAM_SCHEMA = {
  V: { type: 'number', min: RANGES.V.min, max: RANGES.V.max },
  T: { type: 'number', min: RANGES.T.min, max: RANGES.T.max },
  p: { type: 'number', min: RANGES.p.min, max: RANGES.p.max },
  lock: { type: 'enum', values: KEYS },
};

export function settingsFromURL(search) {
  const parsed = parseParams(search, PARAM_SCHEMA);
  const q = parsed.values;
  let s = defaultSettings();
  for (const name of new URLSearchParams(search).keys()) if (name in RANGES && name in q) s = withQuantity(s, name, q[name]);
  if ('lock' in q) s = withLock(s, q.lock);
  const warnings = parsed.warnings.map((w) => ('used' in w ? w : { ...w, used: w.param === 'lock' ? (s.lock ?? '—') : s[w.param] }));
  return { settings: s, warnings };
}

export { warningText } from '../measure/url-params.js';
