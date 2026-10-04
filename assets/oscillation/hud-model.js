// MAINĪGIE LIELUMI rindas un SAKARĪBAS rindas — tīri dati bez DOM (spec. 4.1, 4.2).
// Mainīgie: A, T, λ, v (v = λ/T saistīti — mainot vienu, pieskaņojas visagrāk mainītais; v ar zīmi — virziens; Ansis 04.10).
import { RANGES, derived, TAU } from './model.js';
import { formatNumber } from '../measure/format.js';

const signed = (s) => s.replace('-', '−'); // mīnuss tipogrāfiski
const dec = (x, max) => (Number.isInteger(x) ? 0 : Math.min(max, 1)); // pieskaņotās vērtības var būt starp soļiem

export function quantityRows(s, { lang, t }) {
  const num = (v, d) => signed(formatNumber(v, d, lang));
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
    range('lambda', 'λ', t('q.lambda'), `${num(s.lambda, dec(s.lambda, 1))} cm`, 'cm'),
    range('v', 'v', t('q.v'), `${num(s.v, dec(s.v, 1))} cm/s`, 'cm/s'),
    // nav mainīgais lielums: čekbokss zem horizontālas līnijas, viens klikšķis (Ansis 04.10)
    { key: 'lines', symbol: t('q.lines'), name: t('q.lines'), valueText: s.lines ? on : off, state: 'editable', kind: 'check', group: 'aside', value: s.lines },
  ];
}

export function phaseDeg(phase) {
  return Math.round((((phase % TAU) + TAU) % TAU) / TAU * 360) % 360;
}

export function relationsRows(s, phase, { lang, t }) {
  const d = derived(s);
  const num = (v, d2) => signed(formatNumber(v, d2, lang));
  return [
    { key: 'f', k: t('rel.f'), v: `${num(d.f, 2)} Hz`, live: false },
    { key: 'omega', k: t('rel.omega'), v: `${num(d.omega, 2)} rad/s`, live: false },
    { key: 'phi', k: t('rel.phi'), v: `${phaseDeg(phase)}°`, live: true },
  ];
}
