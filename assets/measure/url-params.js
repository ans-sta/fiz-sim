import { parseDecimal } from './format.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function parseNumber(raw, spec, int) {
  const n = parseDecimal(raw);
  if (Number.isNaN(n) || (int && !Number.isInteger(n))) return { ok: false, warning: { reason: 'not_number' } };
  if (spec.values) {
    return spec.values.includes(n)
      ? { ok: true, value: n }
      : { ok: false, warning: { reason: 'not_allowed', allowed: spec.values } };
  }
  const lo = spec.min ?? -Infinity;
  const hi = spec.max ?? Infinity;
  if (n < lo || n > hi) {
    const used = clamp(n, lo, hi);
    return { ok: true, value: used, warning: { reason: 'out_of_range', min: lo, max: hi, used } };
  }
  return { ok: true, value: n };
}

function parseOne(raw, spec) {
  switch (spec.type) {
    case 'number':
      return parseNumber(raw, spec, false);
    case 'int':
      return parseNumber(raw, spec, true);
    case 'enum':
      return spec.values.includes(raw)
        ? { ok: true, value: raw }
        : { ok: false, warning: { reason: 'not_allowed', allowed: spec.values } };
    case 'bool':
      if (['1', 'true', 'yes'].includes(raw)) return { ok: true, value: true };
      if (['0', 'false', 'no'].includes(raw)) return { ok: true, value: false };
      return { ok: false, warning: { reason: 'not_allowed', allowed: ['1', '0'] } };
    case 'list-number': {
      const items = raw.split(',').map((x) => parseDecimal(x));
      const bad =
        items.some((n) => Number.isNaN(n) || n < spec.min || n > spec.max) ||
        items.length < spec.minLen ||
        items.length > spec.maxLen;
      return bad ? { ok: false, warning: { reason: 'bad_list' } } : { ok: true, value: items };
    }
    case 'list-enum': {
      if (raw.trim() === '') return { ok: true, value: [] };
      const items = [...new Set(raw.split(',').map((x) => x.trim()))];
      return items.every((x) => spec.values.includes(x))
        ? { ok: true, value: items }
        : { ok: false, warning: { reason: 'not_allowed', allowed: spec.values } };
    }
    default:
      throw new Error(`url-params: nezināms tips ${spec.type}`);
  }
}

// Nezināmos parametrus (piem. fbclid, ko pieliek Facebook) klusi ignorē.
export function parseParams(search, schema) {
  const sp = new URLSearchParams(search);
  const values = {};
  const given = new Set();
  const warnings = [];
  for (const [name, spec] of Object.entries(schema)) {
    if (!sp.has(name)) continue;
    const raw = sp.get(name);
    const res = parseOne(raw, spec);
    if (res.ok) {
      values[name] = res.value;
      given.add(name);
    }
    if (res.warning) warnings.push({ param: name, raw, ...res.warning });
  }
  const lockRaw = sp.get('lock');
  return { values, given, lock: lockRaw === '1' || lockRaw === 'true', warnings };
}
