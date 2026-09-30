import { formatNumber } from './format.js';

function cells(model, lang) {
  return model.rows.map((row) => row.map((v, i) => formatNumber(v, model.columns[i].decimals, lang)));
}

export function toTSV(model, lang) {
  const lines = [
    model.title,
    model.settingsLine,
    model.columns.map((c) => c.label).join('\t'),
    ...cells(model, lang).map((r) => r.join('\t')),
  ];
  return lines.join('\n') + '\n';
}

export function toCSV(model, lang) {
  const sep = lang === 'lv' ? ';' : ',';
  const needsQuote = new RegExp(`["\\n${sep}]`);
  const q = (s) => (needsQuote.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const lines = [[model.title], [model.settingsLine], model.columns.map((c) => c.label), ...cells(model, lang)];
  return lines.map((r) => r.map(q).join(sep)).join('\r\n') + '\r\n';
}

export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return { ok: true };
    }
  } catch (e) {
    // mēģina rezerves ceļu zemāk
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok ? { ok: true } : { ok: false, reason: 'clipboard_blocked' };
  } catch (e) {
    return { ok: false, reason: 'clipboard_blocked' };
  }
}

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// bom: Excel atpazīst UTF-8 (ā, ē, ₁) tikai ar BOM
export function downloadText(filename, text, mime, { bom = false } = {}) {
  downloadBlob(filename, new Blob([(bom ? '﻿' : '') + text], { type: mime }));
}
