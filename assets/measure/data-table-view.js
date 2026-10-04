import { openOverlay } from './overlay.js';
import { toTSV, toCSV, copyText, downloadText } from './table-export.js';
import { formatNumber } from './format.js';

// “t₁, s (±0,10 s)” → galvene “t₁, s” un otrā rindā “(±0,10 s)”; bez kļūdas daļas viena rinda.
export function splitLabel(label) {
  const m = /^(.*\S) (\(.*\))$/.exec(label);
  return m ? { main: m[1], err: m[2] } : { main: label, err: '' };
}

const MIN_FONT_PX = 14;
const BLOCK_MIN_PX = 480; // virsrakstam un iestatījumu rindai lasāms platums

// Tabula, kas ietilpst, ir centrēta blokā tās platumā (≥ BLOCK_MIN_PX); ritināma tabula (telefons) — pa visu platumu (null).
export function tableBlockWidth(tableW, availW, minW = BLOCK_MIN_PX) {
  if (tableW > availW) return null;
  return Math.min(availW, Math.max(tableW, minW));
}

// Tabula vispirms mazinās (līdz MIN_FONT_PX), tad ritinās ar izbalējumu pie malas, kur ir paslēptas kolonnas.
function fitTable(wrap, table) {
  table.style.fontSize = '';
  let size = parseFloat(getComputedStyle(table).fontSize);
  while (table.offsetWidth > wrap.clientWidth && size > MIN_FONT_PX) {
    size = Math.max(MIN_FONT_PX, size - 1);
    table.style.fontSize = `${size}px`;
  }
  updateFades(wrap);
}

function updateFades(wrap) {
  const max = wrap.scrollWidth - wrap.clientWidth;
  wrap.classList.toggle('more-left', wrap.scrollLeft > 1);
  wrap.classList.toggle('more-right', wrap.scrollLeft < max - 1);
}

export function renderTable(model, lang, { compact = false } = {}) {
  const table = document.createElement('table');
  table.className = `data${compact ? ' compact' : ''}`;
  const thead = table.createTHead();
  const hr = thead.insertRow();
  for (const c of model.columns) {
    const th = document.createElement('th');
    th.scope = 'col';
    const { main, err } = splitLabel(c.label);
    const mainEl = document.createElement('span');
    mainEl.className = 'col-main';
    mainEl.textContent = main;
    th.appendChild(mainEl);
    if (err) {
      const errEl = document.createElement('span');
      errEl.className = 'col-err';
      errEl.textContent = err;
      th.appendChild(errEl);
    }
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
  let ro = null;
  overlay = openOverlay({
    title: labels.heading,
    closeLabel: labels.close,
    onClose() {
      ro?.disconnect(); // arī aizverot ar AIZVĒRT vai Esc
      onClose?.();
    },
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
  const table = renderTable(model, lang);
  const wrap = document.createElement('div');
  wrap.className = 'data-scroll';
  wrap.appendChild(table);
  const block = document.createElement('div');
  block.className = 'data-block';
  block.append(title, settings, wrap);
  overlay.root.classList.add('overlay-data');
  overlay.body.append(block);
  // vispirms pa visu platumu (mazina burtus / ritina kā līdz šim), tad, ja tabula ietilpst, — centrēts bloks
  const refit = () => {
    block.style.width = '';
    fitTable(wrap, table);
    const w = tableBlockWidth(table.offsetWidth, wrap.clientWidth);
    if (w !== null) {
      block.style.width = `${w}px`;
      updateFades(wrap);
    }
  };
  wrap.addEventListener('scroll', () => updateFades(wrap), { passive: true });
  ro = new ResizeObserver(refit);
  ro.observe(overlay.body); // ne bloku: tā platumu maina pati refit
  refit();
  return { close: overlay.close };
}
