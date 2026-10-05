// assets/sound/main.js — Skaņas laboratorija (S-02) jaunajā izkārtojumā: osciloskops pa visu laukumu, MAINĪGIE LIELUMI augšā pa kreisi,
// SAKARĪBAS augšā pa labi, klaviatūra un skatu pogas apakšā centrā, ⚙ apakšā pa kreisi. Skaņa — audio.js, zīmējums — scene.js.
import { createI18n, createTheme, mountHeaderTools, mountTitleCells, setupCanvas } from '../sim-core.js';
import { STRINGS } from './i18n.js';
import {
  N_KEYS, OCTAVES, isBlack, noteFreq, withView, withPos, withF, withWave, withAmp, withSourceOn, withPhi, withSplit, withOverlay, withVol,
  withOctave, withPreset, withHarmonic, barAt, ampFromY, VIEWS,
} from './model.js';
import { settingsFromURL, warningText } from './params.js';
import { quantityRows, relationsRows } from './hud-model.js';
import { drawScene } from './scene.js';
import { createAudio } from './audio.js';
import { createNotices } from '../measure/notices.js';
import { createQuantityList, createSettingsCorner, createFold } from '../measure/hud.js';
import { legendScale } from '../measure/ui-scale.js';
import { TOP_MARGIN, PANEL_GAP, EDGE_PX } from '../measure/hud-layout.js';

document.getElementById('bootMsg')?.remove();
const i18n = createI18n(STRINGS);
const theme = createTheme();
const t = (key, vars) => i18n.t(key, vars);
const setText = (el, s) => { if (el.textContent !== s) el.textContent = s; };
const setAttr = (el, name, v) => { const s = String(v); if (el.getAttribute(name) !== s) el.setAttribute(name, s); };

mountHeaderTools(document.getElementById('headTools'), { i18n, theme });
const titleSmall = document.getElementById('titleSmall');
mountTitleCells(titleSmall, { i18n, sheet: 'S-02', topicKey: 'tb.topicValue' });
i18n.apply();

const url = settingsFromURL(location.search);
const state = {
  settings: url.settings,
  playing: false,
  moment: false, // skan tikai, kamēr tur taustiņu
  held: [], // nospiestie klaviatūras pustoņi (pēdējais skan)
  drawScale: 1,
  active: null, // harmonika, ko aiztiek (hover vai velk)
  drag: null, // { n } — velk stabiņu
  hits: { bars: [], toHarm: null },
  leftH: 0,
  leftW: 0,
};
const painted = { settings: null, lang: null };
const audio = createAudio();

const drawing = document.getElementById('drawing');
const hudLeft = document.getElementById('hudLeft');
const hudRight = document.getElementById('hudRight');
const keysSlot = document.getElementById('keysSlot');
const viewSlot = document.getElementById('viewSlot');
const toHarmBtn = document.getElementById('toHarm');
const noticesEl = document.getElementById('notices');
const notices = createNotices(noticesEl, { closeLabel: () => t('notice.close') });
url.warnings.forEach((w, i) => notices.show(`url${i}`, () => warningText(w, { t: i18n.t, lang: i18n.lang() })));

function update(next) {
  if (next === state.settings) return;
  state.settings = next;
  render();
}

// ── MAINĪGIE LIELUMI ─────────────────────────────────────
const quantities = createQuantityList(hudLeft, {
  labels: () => ({
    title: t('hud.quantities'), fixed: '', more: t('hud.more'), less: t('hud.less'),
    decrease: (name) => t('dims.decrease', { name }), increase: (name) => t('dims.increase', { name }),
  }),
  onChange(key, v) {
    const s = state.settings;
    const next = {
      f: () => withPos(s, v), wave: () => withWave(s, v), vol: () => withVol(s, v),
      ampA: () => withAmp(s, 'a', v), ampB: () => withAmp(s, 'b', v), phi: () => withPhi(s, v),
      srcA: () => withSourceOn(s, 'a', v), srcB: () => withSourceOn(s, 'b', v), out: () => withSplit(s, v),
      preset: () => withPreset(s, v), instr: () => withPreset(s, v), overlay: () => withOverlay(s, v),
    }[key]?.() ?? s;
    update(next);
  },
});

// ── SAKARĪBAS ────────────────────────────────────────────
hudRight.classList.add('hud', 's02-rel');
const relTitle = document.createElement('div');
relTitle.className = 'hud-title';
const relBody = document.createElement('div');
const relNote = document.createElement('div');
relNote.className = 'r-note';
hudRight.append(relTitle, relBody, relNote);
const relRows = new Map();
function paintRelations() {
  setText(relTitle, t('rel.title'));
  const { rows, note } = relationsRows(state.settings, { lang: i18n.lang(), t: i18n.t });
  const seen = new Set();
  rows.forEach((r, i) => {
    seen.add(r.key);
    let el = relRows.get(r.key);
    if (!el) {
      el = document.createElement('div');
      el.innerHTML = '<span class="k"></span><span class="v"></span>';
      relRows.set(r.key, el);
    }
    el.className = `r-row${r.live ? ' live' : ''}`;
    setText(el.firstChild, r.k);
    setText(el.lastChild, r.v);
    if (relBody.children[i] !== el) relBody.insertBefore(el, relBody.children[i] ?? null);
  });
  for (const [key, el] of relRows) if (!seen.has(key)) { el.remove(); relRows.delete(key); }
  setText(relNote, note ?? '');
  relNote.hidden = !note;
}

const gear = createSettingsCorner(document.getElementById('gear'), {
  i18n,
  theme,
  labels: () => ({
    open: t('gear.open'), theme: t('gear.theme'), light: t('gear.light'), dark: t('gear.dark'), lang: t('gear.lang'),
    text: t('gear.text'), textDown: t('gear.textDown'), textUp: t('gear.textUp'),
    draw: t('gear.draw'), drawDown: t('gear.drawDown'), drawUp: t('gear.drawUp'),
    screen: t('gear.screen'), fullscreen: t('gear.fullscreen'),
  }),
  onDrawScale(v) { state.drawScale = v; render(); },
  onTextScale() { render(); },
});
state.drawScale = gear.drawScale();

const MOBILE = matchMedia('(max-width: 700px), (max-height: 480px)');
const foldLabels = () => ({ open: t('hud.unfold'), close: t('hud.fold') });
const foldOpts = () => ({ labels: foldLabels, folded: MOBILE.matches, active: () => MOBILE.matches });
const folds = [createFold(hudLeft, foldOpts()), createFold(hudRight, foldOpts())];
i18n.onChange(() => folds.forEach((f) => f.repaint()));

// ── Klaviatūra ───────────────────────────────────────────
const PCODES = ['KeyA', 'KeyW', 'KeyS', 'KeyE', 'KeyD', 'KeyF', 'KeyT', 'KeyG', 'KeyY', 'KeyH', 'KeyU', 'KeyJ', 'KeyK', 'KeyO', 'KeyL', 'KeyP', 'Semicolon'];
const PLET = 'AWSEDFTGYHUJKOLP;';
const SOL = [0, null, 2, null, 4, 5, null, 7, null, 9, null, 11]; // nošu indeksi baltajiem
const octDn = document.createElement('button');
octDn.type = 'button';
octDn.className = 'btn s02-oct';
octDn.textContent = '−';
const keys = document.createElement('div');
keys.className = 's02-keyboard';
keys.setAttribute('role', 'group');
const octUp = document.createElement('button');
octUp.type = 'button';
octUp.className = 'btn s02-oct';
octUp.textContent = '+';
const octName = document.createElement('div');
octName.className = 's02-octname';
const keyHint = document.createElement('div');
keyHint.className = 's02-keyhint';
const keyRow = document.createElement('div');
keyRow.className = 's02-keyrow';
keyRow.append(octDn, keys, octUp);
keysSlot.append(keyRow, octName, keyHint);
const keyEls = [];
{
  let whites = 0;
  for (let sm = 0; sm < N_KEYS; sm++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.tabIndex = -1;
    b.dataset.s = String(sm);
    if (isBlack(sm)) {
      b.className = 'pk b';
      b.style.left = `${whites * 10}%`;
      b.innerHTML = `<small>${PLET[sm]}</small>`;
    } else {
      whites++;
      b.className = 'pk w';
      b.innerHTML = `<span class="n"></span><small>${PLET[sm]}</small>`;
    }
    keys.appendChild(b);
    keyEls.push(b);
  }
}
const nf = (sm) => noteFreq(state.settings.oct, sm);
function noteOn(sm) {
  const i = state.held.indexOf(sm);
  if (i >= 0) state.held.splice(i, 1);
  state.held.push(sm);
  state.settings = withF(state.settings, nf(sm));
  if (!state.playing) { state.playing = true; state.moment = true; }
  render();
}
function noteOff(sm) {
  const i = state.held.indexOf(sm);
  if (i < 0) return;
  state.held.splice(i, 1);
  if (state.held.length) state.settings = withF(state.settings, nf(state.held[state.held.length - 1]));
  else if (state.moment) { state.playing = false; state.moment = false; }
  render();
}
const ptr = new Map();
function allOff() { [...state.held].forEach(noteOff); ptr.clear(); }
keys.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('.pk');
  if (!b) return;
  e.preventDefault();
  ptr.set(e.pointerId, Number(b.dataset.s));
  noteOn(Number(b.dataset.s));
});
const pUp = (e) => { if (ptr.has(e.pointerId)) { const sm = ptr.get(e.pointerId); ptr.delete(e.pointerId); noteOff(sm); } };
document.addEventListener('pointerup', pUp);
document.addEventListener('pointercancel', pUp);
window.addEventListener('blur', allOff);
function octave(dir) { update(withOctave(state.settings, dir)); }
octDn.addEventListener('click', () => octave(-1));
octUp.addEventListener('click', () => octave(1));

// ── Skatu pogas un skaņa ─────────────────────────────────
const viewBtns = new Map();
for (const v of VIEWS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn';
  b.addEventListener('click', () => setView(v));
  viewSlot.appendChild(b);
  viewBtns.set(v, b);
}
const playBtn = document.createElement('button');
playBtn.type = 'button';
playBtn.className = 'btn play';
playBtn.addEventListener('click', togglePlay);
viewSlot.appendChild(playBtn);
function togglePlay() { state.playing = !state.playing; state.moment = false; render(); }
function setView(v) { state.active = null; state.drag = null; update(withView(state.settings, v)); }
toHarmBtn.addEventListener('click', () => { state.settings = withPreset(state.settings, state.settings.wave); setView('harmonics'); });

document.addEventListener('keydown', (ev) => {
  if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
  const tag = ev.target?.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  if (ev.code === 'Space' && tag !== 'BUTTON') { ev.preventDefault(); if (!ev.repeat) togglePlay(); return; }
  if (ev.key === '1') return setView('wave');
  if (ev.key === '2') return setView('two');
  if (ev.key === '3') return setView('harmonics');
  if (ev.code === 'KeyZ') return octave(-1);
  if (ev.code === 'KeyX') return octave(1);
  const sm = PCODES.indexOf(ev.code);
  if (sm >= 0) { ev.preventDefault(); if (!ev.repeat) noteOn(sm); }
});
document.addEventListener('keyup', (ev) => { const sm = PCODES.indexOf(ev.code); if (sm >= 0) noteOff(sm); });

// ── Kanva: spektra stabiņi velkami (HARMONIKAS) ──────────
const canvas = document.getElementById('scene');
let view = null;
view = setupCanvas(canvas, () => render());
// Nav animācijas cikla: paneļu, klaviatūras un pogu augstums (salocīšana, slīdnis, pogu rindas pārlūšana) pārzīmē ainu pats
const panelsRO = new ResizeObserver(() => render());
[hudLeft, hudRight, keysSlot, viewSlot].forEach((el) => panelsRO.observe(el));
const canvasPos = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
canvas.addEventListener('pointerdown', (e) => {
  if (state.settings.view !== 'harmonics') return;
  const p = canvasPos(e);
  const hit = barAt(state.hits.bars, p.x, p.y);
  if (!hit) return;
  e.preventDefault();
  const n = hit.bar.n;
  if (hit.zone === 'label') { update(withHarmonic(state.settings, n, { on: !state.settings.H[n - 1].on })); return; }
  canvas.setPointerCapture(e.pointerId);
  state.drag = { n };
  state.active = n;
  update(withHarmonic(state.settings, n, { on: true, amp: ampFromY(hit.bar, p.y) }));
});
canvas.addEventListener('pointermove', (e) => {
  if (state.settings.view !== 'harmonics') return;
  const p = canvasPos(e);
  if (state.drag) {
    const bar = state.hits.bars[state.drag.n - 1];
    if (bar) update(withHarmonic(state.settings, state.drag.n, { amp: ampFromY(bar, p.y) }));
    return;
  }
  const hit = barAt(state.hits.bars, p.x, p.y);
  const n = hit ? hit.bar.n : null;
  if (n !== state.active) { state.active = n; render(); }
});
const endDrag = () => { if (state.drag) { state.drag = null; render(); } };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('pointerleave', () => { if (!state.drag && state.active !== null) { state.active = null; render(); } });

function layout() {
  const { w, h } = view.size();
  if (!hudLeft.classList.contains('sliding')) {
    state.leftH = hudLeft.offsetHeight;
    state.leftW = hudLeft.offsetWidth;
  }
  const top = TOP_MARGIN + Math.max(state.leftH, hudRight.offsetHeight) + PANEL_GAP;
  const bottom = keysSlot.offsetTop - PANEL_GAP;
  const avail = { x: EDGE_PX, y: top, w: w - 2 * EDGE_PX, h: Math.max(0, bottom - top) };
  // ZĪMĒJUMS līdz 100 % sarauj osciloskopu (centrēts); vairāk par 100 % tam nav vietas — sliede pelēka
  const k = Math.min(1, state.drawScale);
  const box = { w: avail.w * k, h: avail.h * k };
  box.x = avail.x + (avail.w - box.w) / 2;
  box.y = avail.y + (avail.h - box.h) / 2;
  return { w, h, box, fill: 1 };
}

function render() {
  if (!view) return;
  const s = state.settings;
  if (s !== painted.settings || i18n.lang() !== painted.lang) {
    painted.settings = s;
    painted.lang = i18n.lang();
    quantities.update(quantityRows(s, { lang: painted.lang, t: i18n.t }));
  }
  paintRelations();
  for (const [v, b] of viewBtns) { setText(b, t(`view.${v}`)); setAttr(b, 'aria-pressed', v === s.view); }
  setAttr(viewSlot, 'aria-label', t('view.group'));
  setText(playBtn, state.playing ? t('run.stop') : t('run.play'));
  setAttr(playBtn, 'aria-pressed', state.playing);
  setAttr(playBtn, 'aria-label', state.playing ? t('run.stopAria') : t('run.playAria'));
  // klaviatūra
  keyEls.forEach((b, sm) => {
    const n = b.querySelector('.n');
    if (n) setText(n, t(`note.${SOL[sm % 12]}`));
    setAttr(b, 'aria-pressed', Math.abs(s.f - nf(sm)) < 0.06);
    b.classList.toggle('down', state.held.includes(sm));
    setAttr(b, 'aria-label', `${t(`note.${sm % 12}`)} ${Math.round(nf(sm))} Hz`);
  });
  setText(octName, t(`oct.${s.oct}`));
  octDn.disabled = s.oct <= OCTAVES.min;
  octUp.disabled = s.oct >= OCTAVES.max;
  setAttr(octDn, 'aria-label', t('keys.octDown'));
  setAttr(octUp, 'aria-label', t('keys.octUp'));
  setAttr(keys, 'aria-label', t('keys.group'));
  setText(keyHint, t('keys.hint'));
  // klaviatūra tieši virs skatu pogām
  const { w, h } = view.size();
  const keysBottom = `${h - viewSlot.offsetTop + PANEL_GAP}px`;
  if (keysSlot.style.bottom !== keysBottom) keysSlot.style.bottom = keysBottom;
  const lay = layout();
  // virs 8 kHz — vienreiz par lapas atvēršanu brīdinājums par skaļumu (dzirdes robežu pārbaudei; Ansis 05.10)
  if (s.f >= 8000 && !state.loudWarned) { state.loudWarned = true; notices.show('loud', () => t('notice.loud')); }
  canvas.classList.toggle('grab', s.view === 'harmonics');
  state.hits = drawScene(view.ctx, lay, { settings: s, colors: theme.colors(), legend: legendScale(gear.textScale()), lang: i18n.lang(), t: i18n.t, active: state.active });
  // VIĻŅA FORMĀ virs spektra — DOM poga “SALIKT NO HARMONIKĀM →” (pieejama arī ar tastatūru)
  const th = state.hits.toHarm;
  toHarmBtn.hidden = !th;
  if (th) {
    setText(toHarmBtn, t('scene.toHarm'));
    const style = `left:auto;right:${Math.round(w - th.x - th.w + 12)}px;top:${Math.round(th.y)}px`;
    if (toHarmBtn.getAttribute('style') !== style) toHarmBtn.setAttribute('style', style);
  }
  gear.setDrawFit(lay.fill);
  const noticesBottom = `${h - keysSlot.offsetTop + PANEL_GAP}px`;
  if (noticesEl.style.bottom !== noticesBottom) noticesEl.style.bottom = noticesBottom;
  const big = w >= 900 && h >= 560;
  if (titleSmall.hidden === big) titleSmall.hidden = !big;
  drawing.classList.toggle('has-title', big);
  audio.sync(s, state.playing);
}

theme.onChange(render);
i18n.onChange(() => { notices.refresh(); render(); });
document.fonts.ready.then(render);
window.addEventListener('pagehide', () => audio.stop());

// Testu āķis pārlūka pārbaudēm (Playwright)
window.__sl = {
  get state() { return state; },
  setView,
  setSettings(next) { state.settings = next; render(); },
  layout,
};
render();
