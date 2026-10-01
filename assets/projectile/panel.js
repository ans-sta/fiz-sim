import { SCALES, MODES } from './scales.js';
import { formatNumber, decimalsOf } from '../measure/format.js';
import { renderTable } from '../measure/data-table-view.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function createPanel(root, { t, onAction }) {
  const blocks = {
    mode: root.querySelector('#blockMode'),
    run: root.querySelector('#blockRun'),
    results: root.querySelector('#blockResults'),
    dims: root.querySelector('#blockDims'),
    fixed: root.querySelector('#blockFixed'),
  };
  const last = {};
  let hidden = new Set(); // pētījumā nofiksētie lielumi; render(vm) sākumā atjauno
  const compactHtml = new WeakMap(); // modelis → gatavs HTML (netiek būvēts katrā kadrā)

  function setBlock(name, html) {
    if (last[name] === html) return;
    last[name] = html;
    blocks[name].innerHTML = html;
    blocks[name].hidden = html === '';
  }

  const fixTag = (locked, key) => (locked.has(key) && !hidden.has(key) ? `<span class="fix" title="${esc(t('dims.fixedTitle'))}">${esc(t('dims.fixed'))}</span>` : '');

  const btn = (fid, label, { action, value, pressed, disabled, title }) =>
    `<button type="button" class="btn" data-fid="${fid}" data-a="${action}" data-v="${esc(value)}" aria-pressed="${pressed}"${disabled ? ' disabled' : ''}${title ? ` title="${esc(title)}" aria-label="${esc(title)}"` : ''}>${esc(label)}</button>`;

  const check = (fid, action, on, disabled, label, fix = '') =>
    `<label class="check"><input type="checkbox" data-fid="${fid}" data-a="${action}"${on ? ' checked' : ''}${disabled ? ' disabled' : ''}>${esc(label)}${fix}</label>`;

  function modeBlock(vm) {
    const { settings: s, locked, running, lang } = vm;
    let h = '';
    if (!hidden.has('mode')) {
      h += `<div class="block-title">${esc(t('blk.mode'))}${fixTag(locked, 'mode')}</div><div class="seg">`;
      for (const m of MODES) {
        const disabled = running || (locked.has('mode') && s.mode !== m);
        h += btn(`mode-${m}`, t(`mode.${m}`), { action: 'mode', value: m, pressed: s.mode === m, disabled, title: t(`mode.${m}.name`) });
      }
      h += '</div>';
      h += `<div class="hint">${esc(t(`mode.${s.mode}.hint`))}</div>`;
    }
    if (!hidden.has('dt')) {
      h += `<div class="row"><span class="row-label">${esc(t('dt.label'))}${fixTag(locked, 'dt')}</span><div class="seg" style="flex:1;max-width:200px">`;
      for (const v of SCALES[s.scale].dtOptions) {
        h += btn(`dt${v}`, `${formatNumber(v, decimalsOf(v), lang)} s`, { action: 'dt', value: v, pressed: s.dt === v, disabled: running || (locked.has('dt') && s.dt !== v) });
      }
      h += '</div></div>';
      h += check('slow', 'slow', s.slow, running, t('slow'));
    }
    if (s.mode === 'horizontal' && !hidden.has('second')) h += check('second', 'second', s.second, running || locked.has('second'), t('second'), fixTag(locked, 'second'));
    return h;
  }

  function dimsBlock(vm) {
    const { settings: s, locked, running, lang } = vm;
    const sc = SCALES[s.scale];
    const num = (v, dec) => formatNumber(v, dec, lang);
    const unit = (u) => ` <span class="unit">${esc(u)}</span>`;
    const ro = (key, k, html) => (hidden.has(key) ? '' : `<div class="readout"><span class="k">${k}${fixTag(locked, key)}</span><span class="v">${html}</span></div>`);
    let reads = ro('h', 'h', num(s.h, sc.h.decimals) + unit(sc.unit));
    let v0 = num(Math.abs(s.v0), sc.v0.decimals) + unit(`${sc.unit}/s`);
    if (s.mode === 'vertical' && s.v0 !== 0) v0 += unit(t(s.v0 > 0 ? 'dir.up' : 'dir.down'));
    reads += ro('v0', 'v₀', v0);
    if (s.mode === 'oblique') reads += ro('alpha', 'α', num(s.alphaDeg, 0) + unit('°'));
    const scaleRow = hidden.has('scale') ? '' : `<div class="row" style="margin-top:0"><span class="row-label">${esc(t('scale.label'))}${fixTag(locked, 'scale')}</span></div><div class="seg">${Object.keys(SCALES)
      .map((k) => btn(`scale-${k}`, t(`scale.${k}`), { action: 'scale', value: k, pressed: s.scale === k, disabled: running || (locked.has('scale') && s.scale !== k) }))
      .join('')}</div>`;
    const grid = hidden.has('grid') ? '' : check('grid', 'grid', s.grid, running || locked.has('grid'), t('grid'), fixTag(locked, 'grid'));
    if (!reads && !scaleRow && !grid) return '';
    let h = `<div class="block-title">${esc(t('blk.dims'))}</div>`;
    h += scaleRow;
    h += `<div style="margin-top:8px">${reads}</div>`;
    h += grid;
    h += `<div class="hint">${esc(t(hidden.size > 0 ? 'dims.hintStudy' : 'dims.hint'))}</div>`;
    return h;
  }

  function fixedBlock(vm) {
    if (!vm.fixedText) return '';
    return `<div class="block-title">${esc(t('blk.fixed'))}</div><div class="fixed-list">${esc(vm.fixedText)}</div>`;
  }

  function runBlock(vm) {
    const label = vm.running ? t('run.running') : vm.hasTableForSettings ? t('run.repeat') : t('run.start');
    return `<button type="button" class="btn primary" style="width:100%" data-fid="run" data-a="run"${vm.running ? ' disabled' : ''}>${esc(label)}</button>`;
  }

  function resultsBlock(vm) {
    const r = vm.results;
    let h = `<div class="block-title">${esc(t('blk.results'))}</div>`;
    if (!r.tables.length) return `${h}<div class="hint" style="margin-top:0">${esc(t('results.none'))}</div>`;
    if (!r.compactModel) h += `<div class="hint" style="margin-top:0">${esc(t('results.none'))}</div>`;
    h += '<select class="select" data-fid="resultsSelect" data-a="selectTable">';
    if (!r.compactModel) h += '<option value="" selected>—</option>';
    for (const o of r.tables) h += `<option value="${esc(o.key)}"${r.compactModel && o.key === r.shownKey ? ' selected' : ''}>${esc(o.label)}</option>`;
    h += '</select>';
    if (!r.compactModel) return h;
    if (r.shownIsOther) h += `<div class="hint">${esc(r.otherText)}</div>`;
    if (r.showCompact) {
      if (!compactHtml.has(r.compactModel)) compactHtml.set(r.compactModel, renderTable(r.compactModel, vm.lang, { compact: true }).outerHTML);
      h += `<div class="compact-wrap">${compactHtml.get(r.compactModel)}</div>`;
    }
    h += '<div class="btn-row" style="margin-top:8px">';
    if (r.canTable) h += `<button type="button" class="btn" data-fid="openTable" data-a="openTable">${esc(t('results.table'))}</button>`;
    if (r.canStrobe) h += `<button type="button" class="btn" data-fid="openStrobe" data-a="openStrobe">${esc(t('results.strobe'))}</button>`;
    h += '</div>';
    return h;
  }

  root.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-a]');
    if (!el || !root.contains(el) || el.disabled) return;
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT') return; // change-notikums
    const a = el.dataset.a;
    const raw = el.dataset.v;
    onAction(a, a === 'dt' ? Number(raw) : raw);
  });
  root.addEventListener('change', (ev) => {
    const sel = ev.target.closest('select[data-a]');
    if (sel) {
      onAction(sel.dataset.a, sel.value);
      return;
    }
    const el = ev.target.closest('input[data-a]');
    if (el) onAction(el.dataset.a, el.checked);
  });

  return {
    render(vm) {
      hidden = vm.hidden ?? new Set();
      const fid = document.activeElement?.dataset?.fid;
      setBlock('mode', modeBlock(vm));
      setBlock('run', runBlock(vm));
      setBlock('results', resultsBlock(vm));
      setBlock('dims', dimsBlock(vm));
      setBlock('fixed', fixedBlock(vm));
      if (fid && document.activeElement?.dataset?.fid !== fid) {
        const again = [...root.querySelectorAll('[data-fid]')].find((e) => e.dataset.fid === fid);
        again?.focus();
      }
    },
  };
}
