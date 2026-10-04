import { ALPHA } from './scales.js';

const SYM = { h: 'h', v0: 'v₀', alpha: 'α' };

// Ko skolēns drīkst darīt, lai lidojums būtu izmērāms: tikai nenofiksēti lielumi, kas tiešām palīdz.
export function flightRemedies(s, locked) {
  const free = (k) => !locked.has(k);
  const increase = [];
  if (free('h')) increase.push('h');
  if (s.mode === 'oblique' && free('v0')) increase.push('v0');
  if (s.mode === 'oblique' && free('alpha') && s.alphaDeg < ALPHA.max) increase.push('alpha');
  return {
    increase,
    up: s.mode === 'vertical' && free('v0'),
  };
}

function joinOr(items, t) {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} ${t('fix.or')} ${items[items.length - 1]}`;
}

// Vienīgais iemesls, kāpēc palaišana netiek ierakstīta: bumbiņa nekustas (reason 'none').
export function flightNotice(reason, s, locked, t) {
  const r = flightRemedies(s, locked);
  const cause = t(`notice.noFlight.${s.mode}`);
  const parts = [];
  if (r.increase.length) parts.push(t('fix.increase', { list: joinOr(r.increase.map((k) => SYM[k]), t) }));
  if (r.up) parts.push(t('fix.upNone'));
  if (!parts.length) return `${cause} ${t('fix.none')}`;
  const sentence = joinOr(parts, t);
  return `${cause} ${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}
