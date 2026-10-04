// Rasējuma paneļi jaunajā izkārtojumā (spec. izkārtojums 3, 4, 6): LIELUMI, MĒRĪJUMI, ⚙.
// UI tekstus dod izsaucējs (labels — objekts vai funkcija, kas to atdod); šeit to nav.
import { formatNumber } from './format.js';
import { TEXT_RANGE, DRAW_RANGE, clampScale, loadScales, saveScales, applyTextScale, trackFraction } from './ui-scale.js';
import { toggleFullscreen } from '../sim-core.js';

const MINI_ROWS = 6;
const MINI_COLS = 4;

// Mazā tabuliņa: ne vairāk kā maxRows rindas un maxCols kolonnas; pārējais tiek atzīmēts ar “…”.
export function miniCells(model, lang, { maxRows = MINI_ROWS, maxCols = MINI_COLS } = {}) {
  const cols = model.columns.slice(0, maxCols);
  return {
    rows: model.rows.slice(0, maxRows).map((r) => cols.map((c, i) => formatNumber(r[i], c.decimals, lang))),
    moreRows: model.rows.length > maxRows,
    moreCols: model.columns.length > maxCols,
  };
}

// − / +: viens solis no pašreizējās vērtības, robežās. Noapaļo lapa (ar savu with*).
export function stepValue(row, dir) {
  const v = Number((row.value + dir * row.step).toFixed(10));
  return Math.min(row.max, Math.max(row.min, v));
}

// Palaišanas poga zem zemes līnijas: atstarpe — puse no pogas augstuma (Ansis 04.10), lai poga neplūst ar zīmējumu.
export function runSlotTop(groundY, buttonH) {
  return Math.round(groundY) + Math.ceil(buttonH / 2);
}

const labelsOf = (labels) => (typeof labels === 'function' ? labels() : labels);

function node(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function button(cls, text) {
  const b = node('button', cls, text);
  b.type = 'button';
  return b;
}

function setText(e, s) {
  if (e.textContent !== s) e.textContent = s;
}

function setAttr(e, name, v) {
  const s = String(v);
  if (e.getAttribute(name) !== s) e.setAttribute(name, s);
}

// Klikšķis ārpus `root` vai Esc aizver (spec.: slīdnis un ⚙ logs).
function onOutsideOrEsc(root, isOpen, close) {
  document.addEventListener('pointerdown', (ev) => {
    if (isOpen() && !root.contains(ev.target)) close(false);
  }, true);
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && isOpen()) close(root.contains(document.activeElement));
  });
}

// ── LIELUMI ──────────────────────────────────────────────
// Rinda: { key, symbol, name, valueText, state: 'editable'|'fixed'|'locked', kind: 'range'|'choice',
//          min, max, step, value, minText, maxText, choices: [{ value, label, unavailable }], group: 'main'|'more' }.
// Atvērtais slīdnis netiek veidots no jauna, kamēr to velk vai spiež − / + — vērtības mainās uz vietas.
export function createQuantityList(root, { labels, onChange }) {
  root.classList.add('hud', 'q-list');
  const title = node('div', 'hud-title');
  const body = node('div', 'q-body');
  const moreBtn = button('q-more');
  root.append(title, body, moreBtn);

  const rowEls = new Map(); // key → { btn, sym, tag, val }
  let rows = [];
  let openKey = null;
  let moreOpen = false;
  let disabled = false;
  let slide = null; // { key, kind, box, … }

  const rowOf = (key) => rows.find((r) => r.key === key);

  function makeRow(key) {
    const btn = button('q-row');
    const sym = node('span', 'q-sym');
    const tag = node('span', 'fix');
    const val = node('span', 'q-val');
    btn.append(sym, tag, val);
    btn.addEventListener('click', () => {
      if (rowOf(key)?.state !== 'editable') return;
      openKey = openKey === key ? null : key;
      paint();
    });
    return { btn, sym, tag, val };
  }

  function makeSlide(r) {
    const key = r.key;
    const box = node('div', `q-slide ${r.kind}`);
    if (r.kind === 'range') {
      const ctl = node('div', 'q-ctl');
      const minus = button('q-step', '−');
      const input = node('input', 'dim-range');
      input.type = 'range';
      const plus = button('q-step', '+');
      ctl.append(minus, input, plus);
      const ends = node('div', 'q-ends');
      const minEl = node('span');
      const maxEl = node('span');
      ends.append(minEl, maxEl);
      box.append(ctl, ends);
      input.addEventListener('input', () => onChange(key, Number(input.value)));
      minus.addEventListener('click', () => { const cur = rowOf(key); if (cur) onChange(key, stepValue(cur, -1)); });
      plus.addEventListener('click', () => { const cur = rowOf(key); if (cur) onChange(key, stepValue(cur, 1)); });
      return { key, kind: 'range', box, input, minus, plus, minEl, maxEl };
    }
    const wrap = node('div', 'q-choices');
    box.append(wrap);
    wrap.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-i]');
      const cur = rowOf(key);
      if (!b || b.disabled || !cur) return;
      onChange(key, cur.choices[Number(b.dataset.i)].value);
    });
    return { key, kind: 'choice', box, wrap, sig: '' };
  }

  function fillSlide(r, L) {
    const name = r.name ?? r.symbol;
    if (slide.kind === 'range') {
      const { input, minus, plus } = slide;
      setAttr(input, 'min', r.min);
      setAttr(input, 'max', r.max);
      setAttr(input, 'step', r.step);
      // velkot vērtību neaiztiek, ja tā sakrīt ar lapas noapaļoto (rokturis paliek zem pirksta)
      if (Math.abs(Number(input.value) - r.value) > r.step / 2) input.value = String(r.value);
      setAttr(input, 'aria-label', name);
      setAttr(input, 'aria-valuetext', r.valueText);
      setAttr(minus, 'aria-label', L.decrease ? L.decrease(name) : '−');
      setAttr(plus, 'aria-label', L.increase ? L.increase(name) : '+');
      input.disabled = disabled;
      minus.disabled = disabled || r.value <= r.min;
      plus.disabled = disabled || r.value >= r.max;
      setText(slide.minEl, r.minText ?? String(r.min));
      setText(slide.maxEl, r.maxText ?? String(r.max));
      return;
    }
    const sig = JSON.stringify(r.choices.map((c) => [c.label, Boolean(c.unavailable)]));
    if (slide.sig !== sig) {
      slide.sig = sig;
      slide.wrap.replaceChildren(...r.choices.map((c, i) => {
        const b = button(`btn${c.unavailable ? ' unavailable' : ''}`, c.label);
        b.dataset.i = String(i);
        if (c.unavailable) b.setAttribute('aria-disabled', 'true');
        return b;
      }));
    }
    setAttr(slide.wrap, 'aria-label', name);
    slide.wrap.setAttribute('role', 'group');
    [...slide.wrap.children].forEach((b, i) => {
      setAttr(b, 'aria-pressed', r.choices[i].value === r.value);
      b.disabled = disabled;
    });
  }

  function paintRow(e, r, L) {
    const editable = r.state === 'editable';
    const cls = `q-row ${r.state}${r.key === openKey ? ' open' : ''}`;
    if (e.btn.className !== cls) e.btn.className = cls;
    setText(e.sym, r.symbol);
    setText(e.val, r.valueText);
    setText(e.tag, r.state === 'locked' ? L.fixed : '');
    e.tag.hidden = r.state !== 'locked';
    if (L.fixedTitle) setAttr(e.tag, 'title', L.fixedTitle);
    e.btn.tabIndex = editable ? 0 : -1;
    setAttr(e.btn, 'aria-disabled', !editable);
    if (editable) setAttr(e.btn, 'aria-expanded', r.key === openKey);
    else e.btn.removeAttribute('aria-expanded');
    setAttr(e.btn, 'aria-label', `${r.name ?? r.symbol} ${r.valueText}${r.state === 'locked' ? ` ${L.fixed}` : ''}`);
  }

  function paint() {
    const L = labelsOf(labels);
    setText(title, L.title);
    const hasMore = rows.some((r) => r.group === 'more');
    if (!hasMore) moreOpen = false;
    const visible = rows.filter((r) => r.group !== 'more' || moreOpen);
    if (!visible.some((r) => r.key === openKey && r.state === 'editable')) openKey = null;
    root.classList.toggle('sliding', openKey !== null);

    const order = [];
    const seen = new Set();
    for (const r of visible) {
      seen.add(r.key);
      let e = rowEls.get(r.key);
      if (!e) {
        e = makeRow(r.key);
        rowEls.set(r.key, e);
      }
      paintRow(e, r, L);
      order.push(e.btn);
      if (r.key === openKey) {
        if (!slide || slide.key !== r.key || slide.kind !== r.kind) {
          slide?.box.remove();
          slide = makeSlide(r);
        }
        fillSlide(r, L);
        order.push(slide.box);
      }
    }
    if (!openKey && slide) {
      slide.box.remove();
      slide = null;
    }
    for (const [k, e] of rowEls) {
      if (seen.has(k)) continue;
      e.btn.remove();
      rowEls.delete(k);
    }
    // secība — pārvieto tikai to, kas nav savā vietā (atvērtais slīdnis netiek aiztikts)
    order.forEach((n, i) => {
      if (body.children[i] !== n) body.insertBefore(n, body.children[i] ?? null);
    });

    moreBtn.hidden = !hasMore;
    setText(moreBtn, moreOpen ? L.less : L.more);
    setAttr(moreBtn, 'aria-expanded', moreOpen);
  }

  moreBtn.addEventListener('click', () => {
    moreOpen = !moreOpen;
    paint();
  });

  onOutsideOrEsc(root, () => openKey !== null, (hadFocus) => {
    const key = openKey;
    openKey = null;
    paint();
    if (hadFocus) rowEls.get(key)?.btn.focus();
  });

  return {
    update(next, { disabled: off = false } = {}) {
      rows = next;
      disabled = off;
      paint();
    },
  };
}

// ── MĒRĪJUMI ─────────────────────────────────────────────
// vm: { symbol, valueText, unit, live, note, rows: [{ a, b }] | null, mini: TableModel | null,
//       canOpen, strobe, tableChoices: [{ key, label }] | null, shownKey }
export function createMeasureBox(root, { labels, lang, onOpen, onSelect, onStrobe }) {
  root.classList.add('hud', 'm-box');
  const title = node('div', 'hud-title');
  const select = node('select', 'm-select');
  const big = node('div', 'm-big');
  const sym = node('span', 'm-sym');
  const num = node('span', 'm-num');
  const val = node('span', 'm-val');
  const unit = node('span', 'm-unit');
  num.append(val, unit);
  big.append(sym, num);
  const note = node('div', 'm-note');
  const rowsEl = node('div', 'm-rows');
  const mini = node('table', 'm-mini');
  const links = node('div', 'm-links');
  const openBtn = button('m-link');
  const strobeBtn = button('m-link');
  links.append(openBtn, strobeBtn);
  root.append(title, select, big, note, rowsEl, mini, links);

  let vm = null;
  let miniFor = null; // { model, lang }
  let selectSig = '';

  root.addEventListener('click', (ev) => {
    if (!vm || ev.target.closest('select') || strobeBtn.contains(ev.target)) return;
    if (vm.canOpen) onOpen();
  });
  strobeBtn.addEventListener('click', () => onStrobe?.());
  select.addEventListener('change', () => onSelect?.(select.value));

  function paintMini(model) {
    const lg = lang();
    if (miniFor && miniFor.model === model && miniFor.lang === lg) return;
    miniFor = { model, lang: lg };
    if (!model) {
      mini.replaceChildren();
      return;
    }
    const m = miniCells(model, lg);
    const trs = m.rows.map((cells) => {
      const tr = node('tr');
      cells.forEach((c) => tr.appendChild(node('td', '', c)));
      if (m.moreCols) tr.appendChild(node('td', 'more', '…'));
      return tr;
    });
    if (m.moreRows) {
      const tr = node('tr', 'more');
      tr.appendChild(node('td', 'more', '…'));
      trs.push(tr);
    }
    const tb = node('tbody');
    tb.append(...trs);
    mini.replaceChildren(tb);
  }

  function paintRows(list) {
    rowsEl.hidden = !list || list.length === 0;
    const items = list ?? [];
    while (rowsEl.children.length > items.length) rowsEl.lastChild.remove();
    while (rowsEl.children.length < items.length) {
      const r = node('div', 'm-row');
      r.append(node('span', 'a'), node('span', 'arr', '→'), node('span', 'b'));
      rowsEl.appendChild(r);
    }
    items.forEach((it, i) => {
      const r = rowsEl.children[i];
      setText(r.children[0], it.a);
      setText(r.children[2], it.b);
    });
  }

  return {
    update(next) {
      vm = next;
      const L = labelsOf(labels);
      setText(title, L.title);
      root.classList.toggle('can-open', vm.canOpen);
      big.hidden = Boolean(vm.note);
      big.classList.toggle('live', vm.live);
      setText(sym, `${vm.symbol} =`);
      setText(val, vm.valueText);
      setText(unit, vm.unit);
      note.hidden = !vm.note;
      setText(note, vm.note ?? '');
      paintRows(vm.rows);
      mini.hidden = !vm.mini;
      paintMini(vm.mini);
      openBtn.hidden = !vm.canOpen;
      setText(openBtn, L.open);
      strobeBtn.hidden = !vm.strobe;
      setText(strobeBtn, L.strobe);
      links.hidden = !vm.canOpen && !vm.strobe;
      const choices = vm.tableChoices;
      select.hidden = !choices;
      if (choices) {
        const sig = JSON.stringify(choices);
        if (sig !== selectSig) {
          selectSig = sig;
          select.replaceChildren(...choices.map((c) => Object.assign(node('option', '', c.label), { value: c.key })));
        }
        if (select.value !== vm.shownKey) select.value = vm.shownKey;
        setAttr(select, 'aria-label', L.select);
      }
    },
  };
}

// ── ⚙ ───────────────────────────────────────────────────
// Tēma, valoda, BURTI, ZĪMĒJUMS, PILNEKRĀNS. Logs neaug līdzi burtiem; aizveras ar klikšķi ārpusē vai Esc.
// Izmaiņas notiek uzreiz un tiek saglabātas ierīcē.
export function createSettingsCorner(root, { i18n, theme, labels, onDrawScale, onTextScale }) {
  root.classList.add('gear-corner');
  const scales = loadScales();
  applyTextScale(scales.text);

  const gearBtn = button('gear-btn', '⚙');
  gearBtn.setAttribute('aria-haspopup', 'dialog');
  const pop = node('div', 'gear-pop');
  pop.setAttribute('role', 'dialog');
  pop.hidden = true;
  root.append(pop, gearBtn);

  const seg = (items) => {
    const s = node('div', 'seg');
    const btns = items.map(([v]) => {
      const b = button('btn');
      b.dataset.v = v;
      return b;
    });
    s.append(...btns);
    return { el: s, btns };
  };
  const group = (cls, kEl, ctlEl) => {
    const g = node('div', `gr ${cls}`);
    g.append(kEl, ctlEl);
    pop.appendChild(g);
  };

  const themeK = node('span', 'k');
  const themeSeg = seg([['light'], ['dark']]);
  group('', themeK, themeSeg.el);
  const langK = node('span', 'k');
  const langSeg = seg([['lv'], ['en']]);
  group('', langK, langSeg.el);

  const sizeRow = (range) => {
    const k = node('span', 'k');
    const name = node('span');
    const pct = node('b');
    k.append(name, pct);
    const ctl = node('div', 'ctl');
    const minus = button('gear-step');
    const input = node('input', 'dim-range');
    input.type = 'range';
    input.min = String(range.min);
    input.max = String(range.max);
    input.step = String(range.step);
    const plus = button('gear-step');
    ctl.append(minus, input, plus);
    group('col', k, ctl);
    return { name, pct, minus, input, plus };
  };
  const text = sizeRow(TEXT_RANGE);
  const draw = sizeRow(DRAW_RANGE);
  draw.input.classList.add('fit-track');

  let fsBtn = null;
  let screenK = null;
  if (document.fullscreenEnabled) {
    screenK = node('span', 'k');
    const s = node('div', 'seg');
    fsBtn = button('btn');
    s.appendChild(fsBtn);
    group('', screenK, s);
    fsBtn.addEventListener('click', () => toggleFullscreen());
    document.addEventListener('fullscreenchange', () => paint());
  }

  const pct = (v) => `${Math.round(v * 100)} %`;

  function paint() {
    const L = labelsOf(labels);
    setAttr(gearBtn, 'aria-label', L.open);
    setAttr(gearBtn, 'aria-expanded', !pop.hidden);
    setAttr(pop, 'aria-label', L.open);
    setText(themeK, L.theme);
    setText(themeSeg.btns[0], L.light);
    setText(themeSeg.btns[1], L.dark);
    themeSeg.btns.forEach((b) => setAttr(b, 'aria-pressed', b.dataset.v === theme.current()));
    setText(langK, L.lang);
    setText(langSeg.btns[0], 'LV');
    setText(langSeg.btns[1], 'EN');
    langSeg.btns.forEach((b) => setAttr(b, 'aria-pressed', b.dataset.v === i18n.lang()));
    setText(text.name, L.text);
    setText(text.pct, pct(scales.text));
    setText(text.minus, 'A−');
    setText(text.plus, 'A+');
    setAttr(text.minus, 'aria-label', L.textDown);
    setAttr(text.plus, 'aria-label', L.textUp);
    setAttr(text.input, 'aria-label', L.text);
    setAttr(text.input, 'aria-valuetext', pct(scales.text));
    text.input.value = String(scales.text);
    setText(draw.name, L.draw);
    setText(draw.pct, pct(scales.draw));
    setText(draw.minus, '−');
    setText(draw.plus, '+');
    setAttr(draw.minus, 'aria-label', L.drawDown);
    setAttr(draw.plus, 'aria-label', L.drawUp);
    setAttr(draw.input, 'aria-label', L.draw);
    setAttr(draw.input, 'aria-valuetext', pct(scales.draw));
    draw.input.value = String(scales.draw);
    if (fsBtn) {
      setText(screenK, L.screen);
      setText(fsBtn, L.fullscreen);
      setAttr(fsBtn, 'aria-pressed', Boolean(document.fullscreenElement));
    }
  }

  function setTextScale(v) {
    const next = clampScale(v, TEXT_RANGE);
    if (next === null || next === scales.text) return;
    scales.text = next;
    applyTextScale(next);
    saveScales({ text: next });
    paint();
    onTextScale?.(next);
  }
  function setDraw(v) {
    const next = clampScale(v, DRAW_RANGE);
    if (next === null || next === scales.draw) return;
    scales.draw = next;
    saveScales({ draw: next });
    paint();
    onDrawScale?.(next);
  }

  text.input.addEventListener('input', () => setTextScale(Number(text.input.value)));
  text.minus.addEventListener('click', () => setTextScale(scales.text - 0.1));
  text.plus.addEventListener('click', () => setTextScale(scales.text + 0.1));
  draw.input.addEventListener('input', () => setDraw(Number(draw.input.value)));
  draw.minus.addEventListener('click', () => setDraw(scales.draw - 0.1));
  draw.plus.addEventListener('click', () => setDraw(scales.draw + 0.1));
  themeSeg.btns.forEach((b) => b.addEventListener('click', () => { if (theme.current() !== b.dataset.v) theme.toggle(); paint(); }));
  langSeg.btns.forEach((b) => b.addEventListener('click', () => i18n.set(b.dataset.v)));

  gearBtn.addEventListener('click', () => {
    pop.hidden = !pop.hidden;
    paint();
  });
  onOutsideOrEsc(root, () => !pop.hidden, (hadFocus) => {
    pop.hidden = true;
    paint();
    if (hadFocus) gearBtn.focus();
  });
  i18n.onChange(paint);
  theme.onChange(paint);
  paint();

  return {
    drawScale: () => scales.draw,
    textScale: () => scales.text,
    // ZĪMĒJUMS, no kura zīmējums vairs neietilpst ekrāna platumā: sliede no tā līdz 150 % ir pelēka (Ansis 04.10).
    setDrawFit(fill) {
      const f = String(trackFraction(fill, DRAW_RANGE));
      if (draw.input.style.getPropertyValue('--fit') !== f) draw.input.style.setProperty('--fit', f);
    },
  };
}
