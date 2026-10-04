// K-02 LIELUMI un MĒRĪJUMI: ko rāda saraksts un mērījumu lodziņš. Tīra loģika, bez DOM (kā K-01 hud-model.js).
import { SCALE, ALPHA, MODES } from './scales.js';
import { v0Range } from './model.js';
import { formatNumber, decimalsOf } from '../measure/format.js';

export const LIVE_ROWS = 4; // palaišanas laikā lodziņā — pēdējie (t, x, y) ieraksti

// editable — maināms; fixed — pelēks (pētījumā iestatīts); locked — FIKS. (saitē).
// slow saitē nav fiksējams (nav LOCKABLE), pētījumā tam der parastais noteikums.
export function quantityState(key, { locked, hidden, study }) {
  if (study && !study.editable.includes(key)) return 'fixed';
  if (locked.has(key) && !hidden.has(key)) return 'locked';
  return 'editable';
}

export function quantityRows(s, { locked, hidden, study, lang, t }) {
  const f = (v, dec) => formatNumber(v, dec, lang);
  const vertical = s.mode === 'vertical';
  const state = (key) => quantityState(key, { locked, hidden, study });
  const range = (key, symbol, name, { min, max, step, value, dec, unit, text, minText, maxText }) => ({
    key, symbol, name, state: state(key), kind: 'range', min, max, step, value, group: 'main',
    valueText: text ?? `${f(value, dec)}${unit}`,
    minText: minText ?? `${f(min, Number.isInteger(min) ? 0 : dec)}${unit}`,
    maxText: maxText ?? `${f(max, Number.isInteger(max) ? 0 : dec)}${unit}`,
  });
  const choice = (key, symbol, name, value, choices) => ({
    key, symbol, name, state: state(key), kind: 'choice', value, choices, group: 'more',
    valueText: choices.find((c) => c.value === value)?.label ?? '',
  });

  const main = [range('h', 'h', t('dims.h'), { min: SCALE.h.min, max: SCALE.h.max, step: SCALE.h.step, value: s.h, dec: SCALE.h.decimals, unit: ` ${SCALE.unit}` })];
  const r = v0Range(s.mode);
  const vu = ` ${SCALE.unit}/s`;
  const v0 = { min: r.min, max: r.max, step: SCALE.v0.step, value: s.v0, dec: SCALE.v0.decimals, unit: vu };
  if (vertical) {
    const arrow = s.v0 > 0 ? ' ↑' : s.v0 < 0 ? ' ↓' : '';
    Object.assign(v0, {
      text: `${f(Math.abs(s.v0), v0.dec)}${vu}${arrow}`,
      minText: `${f(Math.abs(r.min), 0)}${vu} ↓`,
      maxText: `${f(r.max, 0)}${vu} ↑`,
    });
  }
  main.push(range('v0', 'v₀', t('dims.v0'), v0));
  if (s.mode === 'oblique') {
    main.push(range('alpha', 'α', t('dims.alpha'), { min: ALPHA.min, max: ALPHA.max, step: ALPHA.step, value: s.alphaDeg, dec: 0, unit: '°' }));
  }
  main.push(range('dt', 'Δt', t('dt.label'), { min: SCALE.dt.min, max: SCALE.dt.max, step: SCALE.dt.step, value: s.dt, dec: decimalsOf(SCALE.dt.step), unit: ' s' }));

  const more = [choice('mode', t('hud.mode'), t('blk.mode'), s.mode, MODES.map((m) => ({ value: m, label: t(`mode.${m}`) })))];
  if (s.mode === 'horizontal') {
    more.push(choice('second', t('hud.second'), t('hud.second'), s.second,
      [{ value: true, label: t('hud.second.on') }, { value: false, label: t('hud.second.off') }]));
  }
  more.push(choice('slow', t('hud.slow'), t('hud.slow'), s.slow,
    [{ value: false, label: t('hud.slow.off') }, { value: true, label: t('hud.slow.on') }]));

  if (!study) return [...main, ...more];
  // Pētījumā “citi…” nav; maināmais lielums no tās grupas (otra bumbiņa) ir galvenajā sarakstā.
  return [...main, ...more.filter((x) => x.state !== 'fixed').map((x) => ({ ...x, group: 'main' }))];
}

// Mērījumu lodziņš: viens liels cipars (x vai y no pēdējā redzētā zibsnī), dzīvie ieraksti un, no 2. mērījuma, tabuliņa.
export function measureVM({ settings: s, running, lastRun, shown, shownModel, tables, shownKey, views, lang, t }) {
  const f = (v, dec) => formatNumber(v, dec, lang);
  const run = running ? running.run : lastRun;
  const simT = running ? running.simT : Infinity;
  const vertical = s.mode === 'vertical';
  const vm = {
    symbol: vertical ? 'y' : 'x', valueText: '—', unit: SCALE.unit, live: Boolean(running), rows: null, note: null,
    mini: !running && views.table && shown && shown.runs.length >= 2 ? shownModel : null,
    canOpen: Boolean(views.table && shown),
    strobe: Boolean(views.strobe && shown),
    tableChoices: null,
    shownKey: tables.some((tb) => tb.key === shownKey) ? shownKey : '',
  };
  const choices = tables.map((tb) => ({ key: tb.key, label: t('results.option', { n: tb.index, m: tb.runs.length }) }));
  if (!vm.shownKey) choices.unshift({ key: '', label: '—' });
  if (choices.length > 1) vm.tableChoices = choices;

  if (!views.table) { // view=strobe&lock=1: skaitli skolēns nolasa tikai attēlā
    vm.valueText = '';
    vm.note = t('hud.readStrobe', { q: vm.symbol });
    return vm;
  }
  const seen = run ? run.samples.filter((p) => p.t + run.truth.tau <= simT + 1e-9) : [];
  const dec = decimalsOf(SCALE.dt.step);
  const d1 = SCALE.read.decimals;
  const pos = (p) => (vertical ? `y = ${f(p.y, d1)} ${SCALE.unit}` : t('hud.pair', { x: f(p.x, d1), y: f(p.y, d1), u: SCALE.unit }));
  vm.rows = seen.slice(-LIVE_ROWS).map((p) => ({ a: `t = ${f(p.t, dec)} s`, b: pos(p) }));
  if (seen.length) {
    const last = seen[seen.length - 1];
    vm.valueText = f(vertical ? last.y : last.x, d1);
  }
  if (vm.mini) vm.rows = null;
  return vm;
}
