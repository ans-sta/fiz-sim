// assets/atoms/text.js — A-01 notikumu teksts rādījumam un ekrāna lasītājam (tīra funkcija, lai to var pārbaudīt).
import { levelOf } from './model.js';

// ctx: { atom, t(key, vars), fmt(value, decimals) }
export function eventText(e, { atom, t, fmt }) {
  if (!e) return '';
  const lam = (λ) => (λ >= 1000 ? fmt(λ, 0) : fmt(λ, 1));
  const name = (id) => (id ? levelOf(atom, id)?.label ?? id : '—');
  const dE = (lo, up) => fmt(levelOf(atom, up).E - levelOf(atom, lo).E, 3);
  switch (e.type) {
    case 'absorbed': return t('ro.absorbed', { from: name(e.from), to: name(e.to), dE: dE(e.from, e.to), lam: lam(e.λ) });
    case 'passed': return t(e.busy ? 'ro.passedBusy' : 'ro.passed', { lam: lam(e.λ) });
    case 'ionised': return t('ro.ionised', { lam: lam(e.λ) });
    case 'returned': return t(e.kind === 'ionise' ? 'ro.recaptured' : 'ro.returned', { level: name(e.level) });
    case 'start': return t('ro.start', { level: name(e.level) });
    case 'excited': return t('ro.excited', { from: name(e.from), to: name(e.to) });
    case 'emitted': {
      const s = t('ro.emitted', { from: name(e.from), to: name(e.to), dE: dE(e.to, e.from), lam: lam(e.λ) });
      return e.metastable ? `${s} · ${t('ro.metastable', { level: name(e.to) })}` : s;
    }
    case 'forbidden': {
      const s = t('ro.forbidden', { from: name(e.from), to: name(e.to) });
      return e.allowed?.length ? s + t('ro.allowed', { list: e.allowed.map(name).join(', ') }) : s;
    }
    case 'metastable': return t('ro.metastable', { level: name(e.level) });
    default: return '';
  }
}
