// Mērrežģis pasaules vienībās (cm vai m): „apaļi” soļi 1, 2, 5 × 10ⁿ.
const clean = (v) => Number(v.toPrecision(12)) + 0; // + 0: −0 kļūst par 0

export function niceStep(pxPerUnit, minPx) {
  const raw = minPx / pxPerUnit;
  const p = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 5, 10]) if (m * p >= raw * (1 - 1e-12)) return clean(m * p);
  return clean(10 * p);
}

export function ticks(lo, hi, step) {
  const out = [];
  const start = Math.ceil(lo / step - 1e-9);
  const end = Math.floor(hi / step + 1e-9);
  for (let i = start; i <= end; i++) out.push(clean(i * step));
  return out;
}

// Etiķešu solis (≥ labelPx ekrānā) un smalkais solis (≥ minorPx), kas dala etiķešu soli; citādi null.
export function gridSteps(pxPerUnit, { labelPx = 40, minorPx = 6 } = {}) {
  const label = niceStep(pxPerUnit, labelPx);
  const minor = niceStep(pxPerUnit, minorPx);
  const ratio = label / minor;
  const ok = minor < label && Math.abs(ratio - Math.round(ratio)) < 1e-9;
  return { label, minor: ok ? minor : null };
}
