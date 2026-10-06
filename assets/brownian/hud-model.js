// MAINĪGIE LIELUMI rindas — tīri dati bez DOM: T slīdnis; zem līnijas rūtiņas trajektorija un molekulas (nav mainīgie lielumi).
import { RANGES } from './model.js';
import { formatNumber } from '../measure/format.js';

export function quantityRows(s, { lang, t }) {
  const num = (v) => formatNumber(v, 0, lang);
  return [
    {
      key: 'T', symbol: 'T', name: t('q.T'), valueText: `${num(s.T)} K`, state: 'editable', kind: 'range', group: 'main',
      min: RANGES.T.min, max: RANGES.T.max, step: RANGES.T.step, value: s.T, minText: `${num(RANGES.T.min)} K`, maxText: `${num(RANGES.T.max)} K`,
    },
    { key: 'trail', symbol: t('q.trail'), name: t('q.trail'), valueText: s.trail ? t('q.on') : t('q.off'), state: 'editable', kind: 'check', group: 'aside', value: s.trail },
    { key: 'molecules', symbol: t('q.molecules'), name: t('q.molecules'), valueText: s.molecules ? t('q.on') : t('q.off'), state: 'editable', kind: 'check', group: 'aside', value: s.molecules },
  ];
}
