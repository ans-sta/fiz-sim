export function decimalsOf(step) {
  const s = String(step);
  const i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
}

export function roundTo(value, step) {
  return Number((Math.round(value / step) * step).toFixed(decimalsOf(step)));
}

export function formatNumber(value, decimals, lang) {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  let s = Number(value).toFixed(decimals);
  if (/^-0(\.0+)?$/.test(s)) s = s.slice(1);
  return lang === 'lv' ? s.replace('.', ',') : s;
}

export function parseDecimal(raw) {
  if (typeof raw !== 'string') return NaN;
  const s = raw.trim().replace(',', '.');
  if (!/^[-+]?(\d+(\.\d+)?|\.\d+)$/.test(s)) return NaN;
  return Number(s);
}
