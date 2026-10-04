import { ERRORS, DECIMALS } from './experiment.js';
import { derive, STEP } from './model.js';
import { formatNumber, roundTo, decimalsOf } from '../measure/format.js';
import { createResults as createStore } from '../measure/results-store.js';

export const createResults = () => createStore({ tableFields: (s) => ({ level: s.level }) });

const SUBS = '₀₁₂₃₄₅₆₇₈₉';
const sub = (n) => String(n).replace(/\d/g, (d) => SUBS[Number(d)]);


function settingsLine(table, { t, lang }) {
  const s = table.settings;
  const d = derive(s);
  const f = (v, dec) => formatNumber(v, dec, lang);
  const parts = [t('set.L', { v: f(s.L, 0) })];
  if (table.level !== 1) { // 1. līmenī slīpums ir rindās (sērija)
    parts.push(
      s.angleMode === 'h'
        ? t('set.hAlpha', { h: f(s.h, 1), a: f(d.alphaDeg, 1) })
        : t('set.alphaH', { a: f(d.alphaDeg, 1), h: f(d.h, 1) }),
    );
  }
  parts.push(t('set.ball', { name: t(`mat.${d.ball.material}`), d: f(d.ball.d * 10, 0), m: f(d.mass, 1) }));
  parts.push(t(`set.profile.${s.profile}`));
  parts.push(t('set.x0', { v: f(s.x0, 1) }));
  if (s.level === 1) parts.push(t('set.finish', { v: f(d.xf, 1) }));
  else if (s.level === 2) parts.push(t(`set.timer.${s.timer}`));
  else parts.push(t('set.dt', { v: f(s.dt, 1) }));
  parts.push(t('set.seed', { v: table.meta.seed }));
  return t('set.prefix') + parts.join('; ');
}

export function tableModel(table, { t, lang }) {
  const s = table.settings;
  const n = table.runs.length;
  const err = (e, dec, u) => t('col.err', { e: formatNumber(e, dec, lang), u });
  const tCol = (k, e, dec) => ({ label: `${t('col.tN', { i: sub(k) })} ${err(e, dec, 's')}`, decimals: dec });
  const xCol = (k) => ({ label: `${t('col.xN', { i: sub(k) })} ${err(ERRORS.x, DECIMALS.x, 'cm')}`, decimals: DECIMALS.x });
  const range = (count) => Array.from({ length: count }, (_, i) => i + 1);

  let columns;
  let rows;
  let title;
  if (table.level === 1) {
    // Sērija (spec. izkārtojums 5): katram slīpumam sava rinda pirmās lietošanas secībā, katram atkārtojumam sava kolonna.
    title = t('table.l1Title', { n: table.index });
    const byAlpha = s.angleMode === 'alpha';
    const series = [];
    table.runs.forEach((r, i) => {
      let row = series.find((x) => x.key === r.key);
      if (!row) {
        const rs = table.runSettings[i];
        row = { key: r.key, slope: byAlpha ? rs.alphaDeg : rs.h, times: [] };
        series.push(row);
      }
      row.times.push(r.level1.t);
    });
    const most = Math.max(...series.map((x) => x.times.length));
    columns = [
      { label: t(byAlpha ? 'col.alpha' : 'col.h'), decimals: 1 },
      ...range(most).map((k) => tCol(k, ERRORS.hand, DECIMALS.hand)),
    ];
    rows = series.map((x) => [x.slope, ...range(most).map((k) => x.times[k - 1] ?? null)]);
  } else if (table.level === 2) {
    title = t('table.l2Title', { n: table.index });
    const gate = s.timer === 'gate';
    const [e, dec] = gate ? [ERRORS.gateT, DECIMALS.gateT] : [ERRORS.hand, DECIMALS.hand];
    columns = [
      { label: `${t('col.x')} ${err(ERRORS.gateX, DECIMALS.gateX, 'cm')}`, decimals: DECIMALS.gateX },
      ...range(n).map((k) => tCol(k, e, dec)),
    ];
    rows = table.runs[0].level2.gates.map((g, i) => [g.x, ...table.runs.map((r) => r.level2.gates[i].t)]);
  } else {
    title = t('table.l3Title', { n: table.index });
    columns = [{ label: t('col.t'), decimals: decimalsOf(STEP.dt) }, ...range(n).map(xCol)];
    const longest = Math.max(...table.runs.map((r) => r.level3.samples.length));
    rows = [];
    for (let i = 0; i < longest; i++) {
      rows.push([roundTo(i * s.dt, s.dt), ...table.runs.map((r) => (i < r.level3.samples.length ? r.level3.samples[i].x : null))]);
    }
  }
  return { title, settingsLine: settingsLine(table, { t, lang }), columns, rows, filename: `lodite-tabula-${table.index}` };
}
