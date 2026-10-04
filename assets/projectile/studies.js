import { withMode, withV0, withH } from './model.js';
import { PARAM_SCHEMA } from './params.js';
import { SCALE } from './scales.js';
import { formatNumber, decimalsOf } from '../measure/format.js';

const BOTH = { table: true, strobe: true };

// Pētījumi (spec. pētījumi 4, K-02). Galīgie sākuma iestatījumi — 6. uzdevumā.
export const STUDIES = [
  { id: 'free', no: '01', editable: ['h', 'dt'], views: BOTH, preset: (s) => withV0(withMode(s, 'vertical'), 0) },
  { id: 'vertical', no: '02', editable: ['v0', 'h', 'dt'], views: BOTH, preset: (s) => withV0(withMode(s, 'vertical'), 150) },
  { id: 'horizontal', no: '03', editable: ['v0', 'h', 'dt', 'second'], views: BOTH, preset: (s) => withMode(s, 'horizontal') },
  { id: 'oblique', no: '04', editable: ['v0', 'alpha', 'dt'], views: BOTH, preset: (s) => withH(withV0(withMode(s, 'oblique'), 250), 0) },
];

export const SETTING_PARAMS = [...Object.keys(PARAM_SCHEMA), 'lock'];

// Bloks IESTATĪTS: nofiksētās fizikālās vērtības (režīmu, mērrežģi un skatus nerāda).
export function fixedSummary(s, hidden, { t, lang }) {
  const sc = SCALE;
  const f = (v, dec) => formatNumber(v, dec, lang);
  const vu = `${sc.unit}/s`;
  const parts = [];
  if (hidden.has('h')) parts.push(t('set.h', { v: f(s.h, sc.h.decimals), u: sc.unit }));
  if (hidden.has('v0')) {
    if (s.mode !== 'vertical') parts.push(t('set.v0', { v: f(s.v0, sc.v0.decimals), u: vu }));
    else if (s.v0 === 0) parts.push(t('set.v0Zero'));
    else parts.push(t(s.v0 > 0 ? 'set.v0Up' : 'set.v0Down', { v: f(Math.abs(s.v0), sc.v0.decimals), u: vu }));
  }
  if (hidden.has('alpha') && s.mode === 'oblique') parts.push(t('set.alpha', { v: f(s.alphaDeg, 0) }));
  if (hidden.has('dt')) parts.push(t('set.dt', { v: f(s.dt, decimalsOf(s.dt)) }));
  return parts.join('; ');
}
