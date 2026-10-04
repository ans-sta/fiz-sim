import { SCALE } from './scales.js';
import { formatNumber, decimalsOf, roundTo } from '../measure/format.js';

export { createResults } from '../measure/results-store.js';

const SUBS = '₀₁₂₃₄₅₆₇₈₉';
const sub = (n) => String(n).replace(/\d/g, (d) => SUBS[Number(d)]);

export function settingsLine(table, { t, lang }) {
  const s = table.settings;
  const sc = SCALE;
  const f = (v, dec) => formatNumber(v, dec, lang);
  const vu = `${sc.unit}/s`;
  const parts = [t(`set.mode.${s.mode}`), t('set.h', { v: f(s.h, sc.h.decimals), u: sc.unit })];
  if (s.mode !== 'vertical') parts.push(t('set.v0', { v: f(s.v0, sc.v0.decimals), u: vu }));
  else if (s.v0 === 0) parts.push(t('set.v0Zero'));
  else parts.push(t(s.v0 > 0 ? 'set.v0Up' : 'set.v0Down', { v: f(Math.abs(s.v0), sc.v0.decimals), u: vu }));
  if (s.mode === 'oblique') parts.push(t('set.alpha', { v: f(s.alphaDeg, 0) }));
  parts.push(t('set.dt', { v: f(s.dt, decimalsOf(s.dt)) }));
  parts.push(t('set.seed', { v: table.meta.seed }));
  return t('set.prefix') + parts.join('; ');
}

export function tableModel(table, { t, lang }) {
  const s = table.settings;
  const sc = SCALE;
  const vertical = s.mode === 'vertical';
  const err = t('col.err', { e: formatNumber(sc.read.resolution, sc.read.decimals, lang), u: sc.unit });
  const col = (key, k) => ({ label: `${t(key, { i: sub(k), u: sc.unit })} ${err}`, decimals: sc.read.decimals });
  const columns = [{ label: t('col.t'), decimals: decimalsOf(s.dt) }];
  table.runs.forEach((_, i) => {
    if (!vertical) columns.push(col('col.xN', i + 1));
    columns.push(col('col.yN', i + 1));
  });
  const longest = Math.max(...table.runs.map((r) => r.samples.length));
  const rows = [];
  for (let n = 0; n < longest; n++) {
    const row = [roundTo(n * s.dt, s.dt)];
    for (const r of table.runs) {
      const p = r.samples[n];
      if (!vertical) row.push(p ? p.x : null);
      row.push(p ? p.y : null);
    }
    rows.push(row);
  }
  return {
    title: t(vertical ? 'table.verticalTitle' : 'table.planeTitle', { n: table.index }),
    settingsLine: settingsLine(table, { t, lang }),
    columns,
    rows,
    filename: `sviedieni-tabula-${table.index}`,
  };
}
