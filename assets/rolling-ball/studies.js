import { derive, withAlpha, withAngleMode, withLevel, withTimer } from './model.js';
import { PARAM_SCHEMA } from './params.js';
import { roundTo, formatNumber } from '../measure/format.js';

// Pētījumi (spec. pētījumi 4, K-01): “mūsu renīte”, tērauda lodīte Ø 16 mm, renīte.
// Visos pētījumos maināmi α, h un L (Ansis 04.10), vēl — pētījuma lielums (vārti, Δt, mērlente).
const SLOPE = ['alpha', 'h', 'L'];
export const STUDIES = [
  {
    id: 'a', no: '01', measure: true, angleMode: 'alpha', editable: SLOPE, views: { table: true, strobe: false },
    preset: (s) => withAlpha(withLevel(s, 1), roundTo(derive(s).alphaDeg, 0.1)), // slīpumu iestata ar α
  },
  { id: 't', no: '02', measure: true, angleMode: 'h', editable: [...SLOPE, 'gates'], views: { table: true, strobe: false }, preset: (s) => withTimer(withLevel(s, 2), 'gate') },
  { id: 'x', no: '03', measure: true, angleMode: 'h', editable: [...SLOPE, 'dt'], views: { table: true, strobe: false }, preset: (s) => withLevel(s, 3) },
  { id: 'strobe', no: '04', measure: true, angleMode: 'h', editable: [...SLOPE, 'dt', 'tape'], views: { table: false, strobe: true }, preset: (s) => withLevel(s, 3) },
];

// Pētījumā slīpumu sākumā iestata ar pētījuma lielumu (t(α), t(h) — ar α), arī ja saitē ir h vai alpha;
// saitē nofiksētu slīpumu neaiztiek.
export function studyAngleMode(settings, study, urlLocked) {
  if (!study.angleMode || urlLocked.has('h') || urlLocked.has('alpha')) return settings;
  return withAngleMode(settings, study.angleMode);
}

export const SETTING_PARAMS = [...Object.keys(PARAM_SCHEMA), 'lock'];

// Bloks IESTATĪTS: nofiksētās vērtības tādā pašā pierakstā kā tabulas iestatījumu rindā.
export function fixedSummary(s, hidden, { t, lang }) {
  const d = derive(s);
  const f = (v, dec) => formatNumber(v, dec, lang);
  const parts = [];
  if (hidden.has('L')) parts.push(t('set.L', { v: f(s.L, 0) }));
  if (hidden.has('h') && hidden.has('alpha')) {
    parts.push(s.angleMode === 'h'
      ? t('set.hAlpha', { h: f(s.h, 1), a: f(d.alphaDeg, 1) })
      : t('set.alphaH', { a: f(d.alphaDeg, 1), h: f(d.h, 1) }));
  }
  if (hidden.has('ball')) parts.push(t('set.ball', { name: t(`mat.${d.ball.material}`), d: f(d.ball.d * 10, 0), m: f(d.mass, 1) }));
  if (hidden.has('profile')) parts.push(t(`set.profile.${s.profile}`));
  if (hidden.has('x0')) parts.push(t('set.x0', { v: f(s.x0, 1) }));
  if (s.level === 1) parts.push(t('set.finish', { v: f(d.xf, 1) }));
  if (hidden.has('dt') && s.level === 3) parts.push(t('set.dt', { v: f(s.dt, 1) }));
  return parts.join('; ');
}
