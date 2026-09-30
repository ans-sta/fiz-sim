import { BALLS, ballFits, ballById, ballMass, GROOVE_W } from './balls.js';
import { DT_OPTIONS, GATE_MIN, GATE_MAX } from './model.js';
import { formatNumber } from '../measure/format.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function createPanel(root, { t, onAction }) {
  const blocks = {
    level: root.querySelector('#blockLevel'),
    ball: root.querySelector('#blockBall'),
    dims: root.querySelector('#blockDims'),
    run: root.querySelector('#blockRun'),
    results: root.querySelector('#blockResults'),
  };
  const last = {};

  function setBlock(name, html) {
    if (last[name] === html) return;
    last[name] = html;
    blocks[name].innerHTML = html;
  }

  const fixTag = (locked, key) => (locked.has(key) ? `<span class="fix" title="${esc(t('dims.fixedTitle'))}">${esc(t('dims.fixed'))}</span>` : '');

  const btn = (fid, label, { action, value, pressed, disabled }) =>
    `<button type="button" class="btn" data-fid="${fid}" data-a="${action}" data-v="${esc(value)}" aria-pressed="${pressed}"${disabled ? ' disabled' : ''}>${esc(label)}</button>`;

  function levelBlock(vm) {
    const { settings: s, locked, running, lang } = vm;
    let h = `<div class="block-title">${esc(t('blk.level'))}${fixTag(locked, 'level')}</div><div class="seg">`;
    for (const n of [1, 2, 3]) {
      const disabled = running || (locked.has('level') && s.level !== n);
      h += btn(`level${n}`, t(`level.${n}`), { action: 'level', value: n, pressed: s.level === n, disabled });
    }
    h += '</div>';
    const hint = s.level === 2 ? t(`level.2.hint.${s.timer}`) : t(`level.${s.level}.hint`);
    h += `<div class="hint">${esc(hint)}</div>`;
    if (s.level === 2) {
      const tl = running || locked.has('timer');
      h += '<div class="row"><div class="seg" style="flex:1">';
      for (const tm of ['gate', 'hand']) {
        h += btn(`timer-${tm}`, t(`timer.${tm}`), { action: 'timer', value: tm, pressed: s.timer === tm, disabled: tl && s.timer !== tm });
      }
      h += `</div>${fixTag(locked, 'timer')}</div>`;
      const n = s.gates.length;
      const gl = running || locked.has('gates');
      h += `<div class="row"><span class="row-label">${esc(t(s.timer === 'gate' ? 'gates.count' : 'gates.countHand'))}${fixTag(locked, 'gates')}</span>`;
      h += `<span class="stepper"><button type="button" data-fid="gates-dec" data-a="gateCount" data-v="-1" aria-label="${esc(t('gates.fewer'))}"${gl || n <= GATE_MIN ? ' disabled' : ''}>−</button>`;
      h += `<output>${n}</output>`;
      h += `<button type="button" data-fid="gates-inc" data-a="gateCount" data-v="1" aria-label="${esc(t('gates.more'))}"${gl || n >= GATE_MAX ? ' disabled' : ''}>+</button></span></div>`;
    }
    if (s.level === 3) {
      h += `<div class="row"><span class="row-label">${esc(t('dt.label'))}${fixTag(locked, 'dt')}</span><div class="seg" style="flex:1;max-width:190px">`;
      for (const v of DT_OPTIONS) {
        h += btn(`dt${v}`, `${formatNumber(v, 1, lang)} s`, { action: 'dt', value: v, pressed: s.dt === v, disabled: running || (locked.has('dt') && s.dt !== v) });
      }
      h += '</div></div>';
      h += `<label class="check"><input type="checkbox" data-fid="slow" data-a="slow"${s.slow ? ' checked' : ''}${running ? ' disabled' : ''}>${esc(t('slow'))}</label>`;
    }
    return h;
  }

  function ballBlock(vm) {
    const { settings: s, locked, running, lang } = vm;
    let h = `<div class="block-title">${esc(t('blk.ball'))}${fixTag(locked, 'ball')}</div>`;
    h += `<table class="spec"><thead><tr><th>${esc(t('spec.pos'))}</th><th>${esc(t('spec.name'))}</th><th class="num">${esc(t('spec.d'))}</th><th class="num">${esc(t('spec.m'))}</th></tr></thead>`;
    h += '<tbody role="radiogroup">';
    BALLS.forEach((b, i) => {
      const fits = ballFits(b, s.profile);
      const blocked = running || locked.has('ball');
      const dmm = formatNumber(b.d * 10, 0, lang);
      const title = fits ? '' : ` title="${esc(t('ball.noFit', { d: dmm, w: formatNumber(GROOVE_W * 10, 1, lang) }))}"`;
      h += `<tr role="radio" tabindex="0" data-fid="ball-${b.id}" data-a="ball" data-v="${b.id}" aria-checked="${s.ball === b.id}"${!fits || blocked ? ' aria-disabled="true"' : ''}${blocked ? ' data-blocked="1"' : ''}${title}>`;
      h += `<td>${i + 1}</td><td>${esc(t(`mat.${b.material}`))}</td><td class="num">${dmm}</td><td class="num">${formatNumber(ballMass(b), 1, lang)}</td></tr>`;
    });
    h += '</tbody></table>';
    const curFitsGroove = ballFits(ballById(s.ball), 'groove');
    h += `<div class="row"><div class="seg" style="flex:1">`;
    h += btn('profile-groove', t('profile.groove'), { action: 'profile', value: 'groove', pressed: s.profile === 'groove', disabled: running || !curFitsGroove || (locked.has('profile') && s.profile !== 'groove') });
    h += btn('profile-flat', t('profile.flat'), { action: 'profile', value: 'flat', pressed: s.profile === 'flat', disabled: running || (locked.has('profile') && s.profile !== 'flat') });
    h += `</div>${fixTag(locked, 'profile')}</div>`;
    return h;
  }

  function dimsBlock(vm) {
    const { settings: s, derived: d, locked, running, lang } = vm;
    const modeLocked = running || locked.has('h') || locked.has('alpha');
    let h = `<div class="block-title">${esc(t('blk.dims'))}</div>`;
    h += `<div class="row" style="margin-top:0"><span class="row-label">${esc(t('dims.setBy'))}</span><div class="seg" style="width:90px">`;
    h += btn('mode-h', 'h', { action: 'angleMode', value: 'h', pressed: s.angleMode === 'h', disabled: modeLocked });
    h += btn('mode-alpha', 'α', { action: 'angleMode', value: 'alpha', pressed: s.angleMode === 'alpha', disabled: modeLocked });
    h += '</div></div>';
    const ro = (key, k, v, dec, unit, dim) =>
      `<div class="readout"><span class="k">${k}${fixTag(locked, key)}</span><span class="v"${dim ? ' style="color: var(--ink-dim)"' : ''}>${formatNumber(v, dec, lang)} <span class="unit">${unit}</span></span></div>`;
    h += '<div style="margin-top:8px">';
    h += ro('L', 'L', s.L, 0, 'cm', false);
    h += ro('h', 'h', d.h, 1, 'cm', s.angleMode === 'alpha');
    h += ro('alpha', 'α', d.alphaDeg, 1, '°', s.angleMode === 'h');
    h += ro('x0', 'x₀', s.x0, 1, 'cm', false);
    h += '</div>';
    h += `<label class="check"><input type="checkbox" data-fid="tape" data-a="tape"${s.tape ? ' checked' : ''}${running || locked.has('tape') ? ' disabled' : ''}>${esc(t('tape'))}${fixTag(locked, 'tape')}</label>`;
    h += `<div class="hint">${esc(t('dims.hint'))}</div>`;
    return h;
  }

  function runBlock(vm) {
    const label = vm.running ? t('run.running') : vm.hasTableForSettings ? t('run.repeat') : t('run.start');
    return `<button type="button" class="btn primary" style="width:100%" data-fid="run" data-a="run"${vm.running ? ' disabled' : ''}>${esc(label)}</button>`;
  }

  function resultsBlock() {
    return `<div class="block-title">${esc(t('blk.results'))}</div><div class="hint" style="margin-top:0">${esc(t('results.none'))}</div>`;
  }

  root.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-a]');
    if (!el || !root.contains(el) || el.disabled || el.dataset.blocked) return;
    if (el.tagName === 'INPUT') return; // checkbox: change-notikums
    dispatch(el);
  });
  root.addEventListener('change', (ev) => {
    const el = ev.target.closest('input[data-a]');
    if (el) onAction(el.dataset.a, el.checked);
  });
  root.addEventListener('keydown', (ev) => {
    const el = ev.target.closest('tr[data-a]');
    if (!el || (ev.key !== 'Enter' && ev.key !== ' ')) return;
    ev.preventDefault();
    if (!el.dataset.blocked) dispatch(el);
  });

  function dispatch(el) {
    const a = el.dataset.a;
    const raw = el.dataset.v;
    const numeric = ['level', 'gateCount', 'dt'];
    onAction(a, numeric.includes(a) ? Number(raw) : raw);
  }

  return {
    render(vm) {
      const fid = document.activeElement?.dataset?.fid;
      setBlock('level', levelBlock(vm));
      setBlock('ball', ballBlock(vm));
      setBlock('dims', dimsBlock(vm));
      setBlock('run', runBlock(vm));
      setBlock('results', resultsBlock());
      if (fid && document.activeElement?.dataset?.fid !== fid) {
        const again = [...root.querySelectorAll('[data-fid]')].find((e) => e.dataset.fid === fid);
        again?.focus();
      }
    },
  };
}
