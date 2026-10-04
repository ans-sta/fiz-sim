// LIELUMI rindas un SAKARĪBAS rindas — tīri dati bez DOM (spec. 4.1, 4.2).
import { RANGES, derived, TAU } from './model.js';
import { formatNumber } from '../measure/format.js';

export function quantityRows(s, { lang, t }) {
  const num = (v, dec) => formatNumber(v, dec, lang);
  const range = (key, symbol, name, valueText, unit) => ({
    key, symbol, name, valueText, state: 'editable', kind: 'range', group: 'main',
    min: RANGES[key].min, max: RANGES[key].max, step: RANGES[key].step, value: s[key],
    minText: `${num(RANGES[key].min, 0)} ${unit}`, maxText: `${num(RANGES[key].max, 0)} ${unit}`,
  });
  const on = t('q.lines.on');
  const off = t('q.lines.off');
  return [
    range('A', 'A', t('q.A'), `${num(s.A, 0)} cm`, 'cm'),
    range('T', 'T', t('q.T'), `${num(s.T, 1)} s`, 's'),
    range('lambda', 'λ', t('q.lambda'), `${num(s.lambda, 0)} cm`, 'cm'),
    {
      key: 'lines', symbol: t('q.lines'), name: t('q.lines'), valueText: s.lines ? on : off, state: 'editable', kind: 'choice', group: 'main',
      value: s.lines, choices: [{ value: true, label: on }, { value: false, label: off }],
    },
  ];
}

export function phaseDeg(phase) {
  return Math.round((((phase % TAU) + TAU) % TAU) / TAU * 360) % 360;
}

export function relationsRows(s, phase, { lang }) {
  const d = derived(s);
  const num = (v, dec) => formatNumber(v, dec, lang);
  return [
    { key: 'f', k: 'f = 1/T', v: `${num(d.f, 2)} Hz`, live: false },
    { key: 'omega', k: 'ω = 2π/T', v: `${num(d.omega, 2)} rad/s`, live: false },
    { key: 'v', k: 'v = λ/T', v: `${num(d.v, 0)} cm/s`, live: false },
    { key: 'phi', k: 'φ', v: `${phaseDeg(phase)}°`, live: true },
  ];
}
