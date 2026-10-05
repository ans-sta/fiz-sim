// MAINĪGIE LIELUMI rindas un SAKARĪBAS rindas pa skatiem — tīri dati bez DOM.
// Frekvences slīdnis ir logaritmisks: rindas vērtība ir slīdņa stāvoklis (0…1000), uzraksts — Hz.
import { RANGES, WAVES, PRESETS, INSTRUMENTS, NH, posFromF, nearestNote, period, wavelength, duoResult, piFrac, activeCount } from './model.js';
import { formatNumber } from '../measure/format.js';

const signed = (s) => s.replace('-', '−');

export function noteText(f, { lang, t }) {
  const n = nearestNote(f);
  const cents = n.cents ? ` ${n.cents > 0 ? '+' : '−'}${Math.abs(n.cents)} ${t('cents')}` : '';
  return `${t(`note.${n.index}`)}, ${t(`octShort.${n.octave}`) ?? ''}${cents}`;
}

export function quantityRows(s, { lang, t }) {
  const num = (v, d) => signed(formatNumber(v, d, lang));
  const range = (key, symbol, name, valueText, r, value, minText, maxText, group = 'main') => ({
    key, symbol, name, valueText, state: 'editable', kind: 'range', group,
    min: r.min, max: r.max, step: r.step, value, minText, maxText,
  });
  const choice = (key, symbol, name, value, choices, group = 'main') => ({
    key, symbol, name, state: 'editable', kind: 'choice', value, choices, group,
    valueText: choices.find((c) => c.value === value)?.label ?? t('q.preset.none'),
  });
  const check = (key, symbol, value, on, off) => ({ key, symbol, name: symbol, valueText: value ? on : off, state: 'editable', kind: 'check', group: 'aside', value });

  const f = range('f', 'f', t('q.f'), `${num(s.f, s.f >= 1000 ? 0 : 1)} Hz`, RANGES.pos, posFromF(s.f), '40 Hz', '20 kHz');
  const vol = range('vol', t('q.vol'), t('q.vol.name'), `${num(s.vol, 0)} %`, RANGES.vol, s.vol, '0', '100 %', 'aside');
  if (s.view === 'wave') {
    return [
      f,
      choice('wave', t('q.wave'), t('q.wave.name'), s.wave, WAVES.map((w) => ({ value: w, label: t(`wave.${w}`) }))),
      vol,
    ];
  }
  if (s.view === 'two') {
    const amp = (src, key, name) => range(key, `${src.toUpperCase()}`, name, num(s[src].amp, 2), RANGES.amp, s[src].amp, '0', '1');
    return [
      f,
      amp('a', 'ampA', t('q.ampA')),
      amp('b', 'ampB', t('q.ampB')),
      range('phi', 'φ', t('q.phi'), `${s.phi}°`, RANGES.phi, s.phi, '0°', '360°'),
      check('srcA', t('q.srcA'), s.a.on, t('q.src.on'), t('q.src.off')),
      check('srcB', t('q.srcB'), s.b.on, t('q.src.on'), t('q.src.off')),
      choice('out', t('q.out'), t('q.out.name'), s.split, [{ value: false, label: t('q.out.both') }, { value: true, label: t('q.out.split') }], 'aside'),
      vol,
    ];
  }
  return [
    f,
    choice('preset', t('q.preset'), t('q.preset.name'), s.preset, PRESETS.map((p) => ({ value: p, label: t(`preset.${p}`) }))),
    choice('instr', t('q.instr'), t('q.instr.name'), s.preset, INSTRUMENTS.map((p) => ({ value: p, label: t(`instr.${p}`) }))),
    check('overlay', t('q.overlay'), s.overlay, t('q.overlay.on'), t('q.overlay.off')),
    vol,
  ];
}

export function relationsRows(s, { lang, t }) {
  const num = (v, d) => signed(formatNumber(v, d, lang));
  const ms = (sec) => `${num(sec * 1000, 2)} ms`;
  const lam = wavelength(s.f);
  const rows = [
    { key: 'T', k: t('rel.T'), v: ms(period(s.f)), live: false },
    { key: 'lambda', k: t('rel.lambda'), v: lam >= 1 ? `${num(lam, 2)} m` : `${num(lam * 100, 1)} cm`, live: false },
    { key: 'note', k: t('rel.note'), v: noteText(s.f, { lang, t }), live: false },
  ];
  let note = null;
  if (s.view === 'two') {
    const r = duoResult(s);
    rows.splice(1, 1); // λ šeit nav vajadzīgs — vieta fāzei un summai
    rows.push(
      { key: 'phi', k: t('rel.phi'), v: `${piFrac(s.phi).replace('.', lang === 'lv' ? ',' : '.')} rad`, live: false },
      { key: 'dt', k: t('rel.dt'), v: ms(r.shiftMs / 1000), live: false },
      { key: 'R', k: t('rel.R'), v: num(r.R, 2), live: true },
    );
    note = `${t(`state.${r.state}`)} ${t(s.split ? 'out.split' : 'out.both')}`;
  } else if (s.view === 'harmonics') {
    rows.push({ key: 'count', k: t('rel.count'), v: t('rel.countValue', { n: activeCount(s.H), m: NH }), live: true });
    note = INSTRUMENTS.includes(s.preset) ? `${t(`instr.note.${s.preset}`)} ${t('instr.hint')}` : t('harm.about');
  } else {
    note = t('wave.about');
  }
  return { rows, note };
}
