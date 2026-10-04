// K-01 LIELUMI un MĒRĪJUMI (spec. izkārtojums 3–4): ko rāda saraksts un mērījumu lodziņš. Tīra loģika, bez DOM.
import { derive, hMax, x0Max, L_MIN, L_MAX, ALPHA_MAX, STEP, GATE_MIN, GATE_MAX, DT_OPTIONS } from './model.js';
import { BALLS, ballById, ballFits } from './balls.js';
import { formatNumber, decimalsOf } from '../measure/format.js';

export const LIVE_ROWS = 4; // 3. līmenī lodziņā — pēdējie (t, x) pāri
const LOCK_KEY = { gateCount: 'gates', gate: 'gates' }; // rindas / roktura atslēga → saites lieluma atslēga
const PARTNER = { h: 'alpha', alpha: 'h' }; // viens maina otru (sin α = h / L)

// editable — maināms; fixed — pelēks (pētījumā iestatīts vai to mainītu nofiksēts pāra lielums); locked — FIKS. (saitē).
export function quantityState(key, { locked, hidden, study }) {
  const k = LOCK_KEY[key] ?? key;
  if (study && !study.editable.includes(k)) return 'fixed';
  if (locked.has(k) && !hidden.has(k)) return 'locked';
  if (PARTNER[k] && locked.has(PARTNER[k]) && !hidden.has(PARTNER[k])) return 'fixed';
  return 'editable';
}

export function quantityRows(s, { locked, hidden, study, lang, t }) {
  const d = derive(s);
  const f = (v, dec) => formatNumber(v, dec, lang);
  const edge = (v, dec, unit) => `${f(v, Number.isInteger(v) ? 0 : dec)}${unit}`; // slīdņa galos: “0°”, “20,7 cm”
  const state = (key) => quantityState(key, { locked, hidden, study });
  const range = (key, symbol, name, { min, max, step, value, dec, unit }, group) => ({
    key, symbol, name, state: state(key), kind: 'range', min, max, step, value, group,
    valueText: `${f(value, dec)}${unit}`, minText: edge(min, dec, unit), maxText: edge(max, dec, unit),
  });
  const choice = (key, symbol, name, value, choices, group) => ({
    key, symbol, name, state: state(key), kind: 'choice', value, choices, group,
    valueText: choices.find((c) => c.value === value)?.label ?? '',
  });
  const ballLabel = (b) => t('hud.ballLabel', { name: t(`matShort.${b.material}`), d: f(b.d * 10, 0) });

  const main = [
    range('alpha', 'α', t('dims.alpha'), { min: 0, max: ALPHA_MAX, step: STEP.alpha, value: d.alphaDeg, dec: 1, unit: '°' }, 'main'),
    range('h', 'h', t('dims.h'), { min: 0, max: hMax(s.L), step: STEP.h, value: d.h, dec: 1, unit: ' cm' }, 'main'),
    range('L', 'L', t('dims.L'), { min: L_MIN, max: L_MAX, step: STEP.L, value: s.L, dec: 0, unit: ' cm' }, 'main'),
  ];
  if (s.level === 2) {
    const gate = s.timer === 'gate';
    main.push(range('gateCount', t(gate ? 'hud.gates' : 'hud.marks'), t(gate ? 'gates.count' : 'gates.countHand'),
      { min: GATE_MIN, max: GATE_MAX, step: 1, value: s.gates.length, dec: 0, unit: '' }, 'main'));
  }
  if (s.level === 3) {
    main.push(choice('dt', 'Δt', t('dt.label'), s.dt, DT_OPTIONS.map((v) => ({ value: v, label: `${f(v, 1)} s` })), 'main'));
  }

  const more = [
    range('x0', 'x₀', t('dims.x0'), { min: 0, max: x0Max(s.L), step: STEP.x, value: s.x0, dec: 1, unit: ' cm' }, 'more'),
    choice('ball', t('hud.ball'), t('blk.ball'), s.ball,
      BALLS.map((b) => ({ value: b.id, label: ballLabel(b), unavailable: !ballFits(b, s.profile) })), 'more'),
    choice('profile', t('hud.profile'), t('hud.profile'), s.profile, [
      { value: 'groove', label: t('hud.profile.groove'), unavailable: !ballFits(ballById(s.ball), 'groove') },
      { value: 'flat', label: t('hud.profile.flat'), unavailable: false },
    ], 'more'),
    choice('level', t('hud.level'), t('blk.level'), s.level, [1, 2, 3].map((n) => ({ value: n, label: t(`hud.level.${n}`) })), 'more'),
  ];
  if (s.level === 2) {
    more.push(choice('timer', t('hud.timer'), t('hud.timer'), s.timer,
      ['gate', 'hand'].map((v) => ({ value: v, label: t(`hud.timer.${v}`) })), 'more'));
  }
  more.push(choice('tape', t('hud.tape'), t('tape'), s.tape,
    [{ value: true, label: t('hud.tape.on') }, { value: false, label: t('hud.tape.off') }], 'more'));
  if (s.level === 3) {
    more.push(choice('slow', t('hud.slow'), t('slow'), s.slow,
      [{ value: false, label: t('hud.slow.off') }, { value: true, label: t('hud.slow.on') }], 'more'));
  }

  if (!study) return [...main, ...more];
  // Pētījumā “citi…” nav; pētījumā maināmais lielums no tās grupas (STROBOSKOPS: mērlente) ir galvenajā sarakstā.
  return [...main, ...more.filter((r) => r.state !== 'fixed').map((r) => ({ ...r, group: 'main' }))];
}

// Mērījumu lodziņš: viens liels cipars, dinamiskie mērījumi (vārti, x(t)) un, no 2. mērījuma, maza tabuliņa.
export function measureVM({ settings: s, running, lastRun, shown, shownModel, tables, shownKey, views, lang, t }) {
  const f = (v, dec) => formatNumber(v, dec, lang);
  const run = running ? running.run : lastRun;
  const simT = running ? running.simT : Infinity;
  const vm = {
    symbol: 't', valueText: '—', unit: 's', live: Boolean(running), rows: null, note: null,
    // palaišanas laikā — dinamiskie mērījumi; citādi, no 2. mērījuma, — tabuliņa (lodziņš neaug palaišanas laikā)
    mini: !running && views.table && shown && shown.runs.length >= 2 ? shownModel : null,
    canOpen: Boolean(views.table && shown),
    strobe: Boolean(views.strobe && shown && shown.level === 3),
    tableChoices: null,
    shownKey: tables.some((tb) => tb.key === shownKey) ? shownKey : '',
  };
  const choices = tables.map((tb) => ({ key: tb.key, label: t('results.option', { n: tb.index, m: tb.runs.length }) }));
  if (!vm.shownKey) choices.unshift({ key: '', label: '—' });
  if (choices.length > 1) vm.tableChoices = choices;

  if (s.level === 1) {
    if (run) vm.valueText = f(simT < run.timeTo(run.xf) ? simT : run.level1.t, 2);
  } else if (s.level === 2) {
    const dec = s.timer === 'gate' ? 3 : 2;
    const passed = (i) => run && simT >= run.timeTo(s.gates[i]);
    vm.rows = s.gates.map((x, i) => ({
      a: `x = ${f(x, 1)} cm`,
      b: passed(i) ? `t = ${f(run.level2.gates[i].t, dec)} s` : 't = —',
    }));
    const last = s.gates.map((_, i) => i).filter(passed).pop();
    if (last !== undefined) vm.valueText = f(run.level2.gates[last].t, dec);
  } else {
    vm.symbol = 'x';
    vm.unit = 'cm';
    if (!views.table) { // view=strobe&lock=1: x skolēns nolasa tikai attēlā
      vm.valueText = '';
      vm.note = t('hud.readStrobe');
      return vm;
    }
    const seen = run ? run.level3.samples.filter((p) => p.t + run.truth.tau <= simT + 1e-9) : [];
    const dec = decimalsOf(s.dt);
    vm.rows = seen.slice(-LIVE_ROWS).map((p) => ({ a: `t = ${f(p.t, dec)} s`, b: `x = ${f(p.x, 1)} cm` }));
    if (seen.length) vm.valueText = f(seen[seen.length - 1].x, 1);
  }
  if (vm.mini) vm.rows = null;
  return vm;
}
