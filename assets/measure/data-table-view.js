import { openOverlay } from './overlay.js';
import { toTSV, toCSV, copyText, downloadText } from './table-export.js';
import { formatNumber } from './format.js';

export function renderTable(model, lang, { compact = false } = {}) {
  const table = document.createElement('table');
  table.className = `data${compact ? ' compact' : ''}`;
  const thead = table.createTHead();
  const hr = thead.insertRow();
  for (const c of model.columns) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = c.label;
    hr.appendChild(th);
  }
  const tbody = table.createTBody();
  for (const row of model.rows) {
    const tr = tbody.insertRow();
    row.forEach((v, i) => {
      const td = tr.insertCell();
      td.textContent = formatNumber(v, model.columns[i].decimals, lang);
    });
  }
  return table;
}

export function openDataTable(model, { lang, labels, onClose }) {
  let overlay = null;
  overlay = openOverlay({
    title: labels.heading,
    closeLabel: labels.close,
    onClose,
    buttons: [
      {
        label: labels.copy,
        async onClick() {
          const res = await copyText(toTSV(model, lang));
          overlay.status(res.ok ? labels.copied : labels.copyFailed);
        },
      },
      {
        label: labels.csv,
        primary: true,
        onClick() {
          // CSV vienmēr latviskā formātā (;, decimālkomats, BOM): spec. 5.1, latviešu Excel un stabils Fv3 imports
          downloadText(`${model.filename}.csv`, toCSV(model, 'lv'), 'text/csv;charset=utf-8', { bom: true });
        },
      },
    ],
  });
  const title = document.createElement('div');
  title.className = 'data-title';
  title.textContent = model.title;
  const settings = document.createElement('div');
  settings.className = 'data-settings';
  settings.textContent = model.settingsLine;
  overlay.body.append(title, settings, renderTable(model, lang));
  return { close: overlay.close };
}
