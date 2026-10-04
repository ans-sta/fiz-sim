import { ALPHA } from './scales.js';

const SYM = { h: 'h', v0: 'v₀', alpha: 'α' };

// Ko skolēns drīkst darīt, lai lidojums būtu izmērāms: tikai nenofiksēti lielumi, kas tiešām palīdz.
export function flightRemedies(s, locked) {
  const free = (k) => !locked.has(k);
  const increase = [];
  if (free('h')) increase.push('h');
  let both = false;
  if (s.mode === 'oblique') {
    const noV0 = s.v0 === 0;
    const noAlpha = s.alphaDeg === ALPHA.min;
    if (noV0 && noAlpha) both = free('v0') && free('alpha'); // vajag abus reizē
    else {
      if (noV0 && free('v0')) increase.push('v0');
      if (noAlpha && free('alpha')) increase.push('alpha');
    }
  }
  return {
    increase,
    both,
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
  let causeKey = `notice.noFlight.${s.mode}`;
  if (s.mode === 'oblique') {
    const noV0 = s.v0 === 0;
    const noAlpha = s.alphaDeg === ALPHA.min;
    causeKey += noV0 && noAlpha ? '.both' : noAlpha ? '.alpha' : '.v0';
  }
  const cause = t(causeKey);
  const parts = [];
  if (r.increase.length) parts.push(t('fix.increase', { list: joinOr(r.increase.map((k) => SYM[k]), t) }));
  if (r.both) parts.push(t('fix.increaseBoth'));
  if (r.up) parts.push(t('fix.upNone'));
  if (!parts.length) return `${cause} ${t('fix.none')}`;
  const sentence = joinOr(parts, t);
  return `${cause} ${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}
