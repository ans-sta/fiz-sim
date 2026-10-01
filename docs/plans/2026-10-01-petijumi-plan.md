# Pētījumi (study cards) for K-01 and K-02 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Opening `projectile-motion.html` or `rolling-ball.html` without parameters shows study cards (PhET-style). A card opens a restricted simulation with only that study’s controls; a “PILNĀ KONTROLE” link under the cards opens today’s full page. Teacher links with parameters keep opening the full page directly.

**Architecture:** The page’s HTML loads a tiny `entry.js` instead of `main.js`. `entry.js` asks a shared pure router (`assets/measure/studies.js`) which view the URL wants: `cards` → dynamic `import('./picker.js')`, which renders the cards with the shared `assets/measure/study-picker.js`; `study` or `full` → dynamic `import('./main.js')`. In `main.js` a study becomes (a) a preset applied to the default settings before the URL parameters, (b) a set of “fixed by study” fields that is merged into `state.locked` (so every existing lock path — handles, keyboard, panel, indirect changes — already refuses them) and passed separately to the panel and handles as `hidden` (so they are not shown as controls, and get no FIKS. tag), (c) its own result views. Each page owns its study list (`studies.js`), card drawings (`study-art.js`) and texts.

**Tech Stack:** vanilla ES modules (dynamic `import()` is allowed; no top-level `await`), Canvas 2D, CSS custom properties, `node:test`.

**Spec:** `docs/plans/2026-10-01-petijumi.md` (business requirements; the study tables are section 4). Approved sketch: https://claude.ai/artifact/691ayNnK15CRCzp74Yw8gq (visual polish comes later — match the existing fiz-sim drawing style, do not invent a new look).

## Global Constraints

- Work in the worktree `/Users/minim4/dev/sites/physics_sims-k02` on branch `projectile-motion`. Commit after every task. Never push. Never touch `/Users/minim4/dev/sites/physics_sims`.
- **K-01’s full mode must behave exactly as before.** All 170 existing tests stay green; the K-01 browser check in Task 5 compares full mode with today’s behaviour. When `hidden` is empty (full mode) every panel block renders byte-for-byte as now.
- Do not modify `electric-field*.html`, `millikan.html`, `newtons-cannon.html`, `design.html`, `assets/sim-core.js`. `assets/sim-common.css` gets only the additions of Task 1.
- Every user-visible string comes from the page’s `i18n.js` (LV and EN), Latvian typography: quotes “…”, spaced em-dash —, en-dash ranges, ellipsis …. Shared modules in `assets/measure/` contain no UI text.
- Every user-facing error names its own cause and what to do.
- Old teacher links (README examples, any URL with a setting parameter) open the full page unchanged.
- Test command: `cd /Users/minim4/dev/sites/physics_sims-k02 && npm test` — whole suite, always green.
- Browser checks: serve the worktree on port 8766 (`curl -sI http://localhost:8766/index.html` answers 200 if it already runs; otherwise `cd /Users/minim4/dev/sites/physics_sims-k02 && (python3 -m http.server 8766 >/dev/null 2>&1 &)`), Playwright MCP tools, screenshots only under `/Users/minim4/dev/sites/fizika_v3/.playwright-mcp/` with names starting `pet_`. Only allowed console error: favicon 404.

## Review Focus

1. **Old teacher links** (`rolling-ball.html?L=80&h=2.0&ball=steel16&level=3&dt=0.5&view=strobe&lock=1`, `projectile-motion.html?mode=2&h=90&v0=180&dt=0.05&view=strobe&lock=1`, `?noise=0`, `?seed=5`, `?lock=1`) → full page, exactly as before, no cards. Tests: Task 1 (router).
2. **Unknown or mistyped study** (`?study=zz`, `?study=`) → cards with a precise notice naming the id. Tests: Task 1; browser Tasks 3 and 5.
3. **Indirect change of a study-fixed value** (K-01 study a(α): α changes h — allowed because h is coupled; study t(Δx): dragging a gate must not move x₀; K-02 study 01: switching to another mode or scale must be impossible) → refused or impossible, no FIKS. tag on study-fixed values. Tests: Tasks 2 and 4 (`studyFixed` + `changedLocked`); browser Tasks 3 and 5.
4. **Study + teacher params** (`?study=x&h=5&lock=1`) → the study opens with h = 5 cm, h shows FIKS. and cannot be changed. Tests: Tasks 2 and 4 (params `base`); browser Tasks 3 and 5.
5. **A study preset that gives no measurement** (lodīte does not roll, flight too short) → never; each preset produces a valid run. Tests: Tasks 2 and 4.

---

### Task 1: Shared router, fixed-field rule, card picker and CSS

**Files:**
- Create: `assets/measure/studies.js`, `assets/measure/study-picker.js`
- Modify: `assets/sim-common.css` (append one section)
- Test: `tests/studies.test.js`

**Interfaces:**
- Produces: `resolveRoute(search, { studies, settingParams }) → { kind: 'cards', unknownStudy?: string } | { kind: 'study', study } | { kind: 'full' }`; `studyFixed(study, lockable) → Set<string>`; `mountStudyPicker(root, { i18n, studies, sheet, art, unknownStudy })` (DOM; renders into `root`, re-renders on language change, leaves an empty `.titleblock` element at the bottom of `root` for the caller to mount the title block into).
- A study object (defined per page in Tasks 2 and 4): `{ id: string, no: '01', editable: string[], coupled?: string[], views: { table: boolean, strobe: boolean }, preset(settings) → settings }`. Its texts are i18n keys `study.<id>.title`, `study.<id>.q`, `study.<id>.changes`, optional `study.<id>.measure`.
- Page-level keys the picker uses: `studies.eyebrow`, `studies.lead`, `studies.changes`, `studies.full`, `studies.fullDesc`, `studies.unknown` (`{id}`).

- [ ] **Step 1: Write the failing tests**

`tests/studies.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRoute, studyFixed } from '../assets/measure/studies.js';

const studies = [{ id: 'a', editable: ['alpha'], coupled: ['h'] }, { id: 'x', editable: ['dt', 'h'] }];
const settingParams = ['L', 'h', 'alpha', 'view', 'lock', 'noise', 'seed', 'traps'];
const route = (q) => resolveRoute(q, { studies, settingParams });

test('no params (or only unknown ones) → cards', () => {
  assert.deepEqual(route(''), { kind: 'cards' });
  assert.deepEqual(route('?fbclid=IwAR0'), { kind: 'cards' });
});

test('study id → that study; unknown or empty id → cards with the id', () => {
  assert.equal(route('?study=a').study.id, 'a');
  assert.equal(route('?study=x&h=5&lock=1').kind, 'study');
  assert.deepEqual(route('?study=zz'), { kind: 'cards', unknownStudy: 'zz' });
  assert.deepEqual(route('?study='), { kind: 'cards', unknownStudy: '' });
});

test('full=1 or any setting parameter → full page (old teacher links, Review Focus 1)', () => {
  assert.deepEqual(route('?full=1'), { kind: 'full' });
  assert.deepEqual(route('?L=80&h=2.0&lock=1'), { kind: 'full' });
  assert.deepEqual(route('?noise=0'), { kind: 'full' });
  assert.deepEqual(route('?seed=5'), { kind: 'full' });
  assert.deepEqual(route('?lock=1'), { kind: 'full' });
});

test('studyFixed: everything lockable except the editable and coupled fields', () => {
  const lockable = ['L', 'h', 'alpha', 'ball', 'dt', 'view'];
  assert.deepEqual([...studyFixed(studies[0], lockable)], ['L', 'ball', 'dt', 'view']);
  assert.deepEqual([...studyFixed(studies[1], lockable)], ['L', 'alpha', 'ball', 'view']);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test 2>&1 | tail -6` — Expected: FAIL, cannot find `assets/measure/studies.js`.

- [ ] **Step 3: Implement `assets/measure/studies.js`**

```js
// Pētījumi (spec. pētījumi 2): kuru skatu URL prasa un kas pētījumā ir nofiksēts.

// cards — lapa bez parametriem; study — ?study=<id>; full — ?full=1 vai jebkurš iestatījuma parametrs
// (vecās skolotāju saites atveras pilnajā kontrolē tāpat kā līdz šim).
export function resolveRoute(search, { studies, settingParams }) {
  const sp = new URLSearchParams(search);
  if (sp.has('study')) {
    const id = sp.get('study');
    const study = studies.find((s) => s.id === id);
    return study ? { kind: 'study', study } : { kind: 'cards', unknownStudy: id };
  }
  if (sp.has('full') || settingParams.some((p) => sp.has(p))) return { kind: 'full' };
  return { kind: 'cards' };
}

// Pētījumā nofiksētie lielumi: visi, ko var fiksēt, izņemot maināmos un tiem piesaistītos
// (piem. lodītei α un h maina viens otru, tāpēc α pētījumā h nav nofiksēts).
export function studyFixed(study, lockable) {
  const free = new Set([...study.editable, ...(study.coupled ?? [])]);
  return new Set(lockable.filter((k) => !free.has(k)));
}
```

- [ ] **Step 4: Implement `assets/measure/study-picker.js`**

```js
// Pētījumu kartītes. Teksti nāk no lapas i18n (atslēgas studies.* un study.<id>.*); zīmējumus dod lapa (art[id] → SVG).
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function mountStudyPicker(root, { i18n, studies, sheet, art, unknownStudy }) {
  function render() {
    const t = i18n.t;
    const notice = unknownStudy === undefined ? '' : `<div class="notice picker-notice" role="status"><span>${esc(t('studies.unknown', { id: unknownStudy }))}</span></div>`;
    const cards = studies.map((s) => {
      const measure = s.measure ? ` · ${esc(t(`study.${s.id}.measure`))}` : ''; // K-01: ar ko mēra
      return `<a class="study-card" href="?study=${encodeURIComponent(s.id)}">
        <span class="study-art">${art[s.id] ?? ''}</span>
        <span class="study-body">
          <span class="study-num">${esc(sheet)} · ${esc(s.no)}${measure}</span>
          <span class="study-title">${esc(t(`study.${s.id}.title`))}</span>
          <span class="study-q">${esc(t(`study.${s.id}.q`))}</span>
          <span class="study-chg">${esc(t('studies.changes'))}: <b>${esc(t(`study.${s.id}.changes`))}</b></span>
        </span>
      </a>`;
    }).join('');
    const keep = root.querySelector('.titleblock'); // rakstlaukums paliek savā vietā (valodas pogu fokuss)
    root.innerHTML = `<div class="picker-body">
        <div class="picker-eyebrow">${esc(t('studies.eyebrow'))}</div>
        <p class="picker-lead">${esc(t('studies.lead'))}</p>
        ${notice}
        <div class="study-cards">${cards}</div>
        <a class="study-full" href="?full=1"><span class="t">${esc(t('studies.full'))}</span><span class="d">${esc(t('studies.fullDesc'))}</span><span class="arrow" aria-hidden="true">→</span></a>
      </div>`;
    root.appendChild(keep ?? Object.assign(document.createElement('div'), { className: 'titleblock picker-tb' }));
  }
  render();
  i18n.onChange(render);
}
```

Studies that show a measure line on the card have `measure: true` (K-01 only, Task 4).

- [ ] **Step 5: Append the CSS to `assets/sim-common.css`**

```css
/* ── Pētījumu kartītes ────────────────────────────────── */
[hidden] { display: none !important; }
.picker { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; }
.picker-body { padding: 20px; display: grid; gap: 16px; align-content: start; flex: 1; }
.picker-eyebrow { font-size: 10px; letter-spacing: 0.16em; color: var(--ink-dim); }
.picker-lead { font-family: 'IBM Plex Sans', sans-serif; font-size: 14px; line-height: 1.5; color: var(--ink-dim); max-width: 62ch; }
.picker-notice { position: static; }
.study-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 14px; }
.study-card { display: grid; grid-template-rows: auto 1fr; background: var(--field); border: 1px solid var(--hairline); color: var(--ink); text-decoration: none; }
.study-card:hover, .study-card:focus-visible { border-color: var(--accent); outline: none; }
.study-card:hover .study-title, .study-card:focus-visible .study-title { color: var(--accent); }
.study-art svg { display: block; width: 100%; height: auto; border-bottom: 1px solid var(--hairline); }
.study-body { display: grid; gap: 8px; align-content: start; padding: 12px 14px 14px; }
.study-num { font-size: 10px; letter-spacing: 0.14em; color: var(--ink-dim); }
.study-title { font-size: 13px; font-weight: 600; letter-spacing: 0.1em; }
.study-q { font-family: 'IBM Plex Sans', sans-serif; font-size: 13.5px; line-height: 1.4; }
.study-chg { font-size: 11px; color: var(--ink-dim); letter-spacing: 0.04em; border-top: 1px dashed var(--hairline); padding-top: 8px; }
.study-chg b { color: var(--ink); font-weight: 500; }
.study-full { display: flex; flex-wrap: wrap; gap: 6px 16px; align-items: baseline; border: 1px solid var(--hairline); padding: 12px 14px; color: var(--ink); text-decoration: none; }
.study-full:hover, .study-full:focus-visible { border-color: var(--accent); outline: none; }
.study-full .t { font-weight: 600; letter-spacing: 0.12em; }
.study-full .d { font-family: 'IBM Plex Sans', sans-serif; font-size: 13px; color: var(--ink-dim); }
.study-full .arrow { margin-left: auto; color: var(--accent); }
.picker-tb { margin-top: 0; }
.art-ink { stroke: var(--ink); fill: none; }
.art-dim { stroke: var(--ink-dim); fill: none; }
.art-hair { stroke: var(--hairline); fill: none; }
.art-sheet { fill: var(--sheet); stroke: var(--ink); }
.art-ball { fill: var(--ink-dim); stroke: var(--ink); }
.art-ghost { fill: none; stroke: var(--ink); }
.art-text { fill: var(--ink); font-family: 'IBM Plex Mono', monospace; font-size: 11px; }
.art-label { fill: var(--ink-dim); font-family: 'IBM Plex Mono', monospace; font-size: 10px; }
.study-name { color: var(--ink-dim); font-weight: 400; }
.fixed-list { font-family: 'IBM Plex Sans', sans-serif; font-size: 12px; line-height: 1.5; color: var(--ink-dim); }
```

Check the existing `.notice` rule in `sim-common.css` first: notices are absolutely positioned inside `.drawing`; `.picker-notice { position: static; }` keeps the picker’s notice in the flow. If `.notice` has other positioning properties (`top`, `left`, `right`), reset them in `.picker-notice` too.

- [ ] **Step 6: Run the suite and commit**

```bash
npm test 2>&1 | grep -E "^ℹ (pass|fail)"
git add assets/measure/studies.js assets/measure/study-picker.js assets/sim-common.css tests/studies.test.js
git commit -m "Add the shared study router, fixed-field rule and study card picker

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: K-02 studies — definitions, texts, card drawings, params base

**Files:**
- Create: `assets/projectile/studies.js`, `assets/projectile/study-art.js`
- Modify: `assets/projectile/i18n.js` (new keys, LV and EN), `assets/projectile/params.js` (`base` option)
- Test: `tests/projectile-studies.test.js`; extend `tests/projectile-params.test.js`

**Interfaces:**
- Consumes: `defaultSettings`, `withMode`, `withScale`, `withV0`, `withH`, `flightCheck`, `changedLocked` (model.js); `LOCKABLE`, `PARAM_SCHEMA`, `settingsFromURL` (params.js); `studyFixed` (Task 1); `SCALES`; `formatNumber`, `decimalsOf`.
- Produces: `STUDIES` (array of 4 study objects, ids `free`, `vertical`, `horizontal`, `oblique`); `SETTING_PARAMS = Object.keys(PARAM_SCHEMA).concat('lock')`; `fixedSummary(settings, hidden: Set, { t, lang }) → string` (`''` when nothing to list); `STUDY_ART` (`{ [id]: svgString }`); `settingsFromURL(search, { makeSeed, base })` — when `base` is given, start from `base` instead of `defaultSettings(scale, mode)`, and apply `scale`/`mode` params on top of it with `withScale`/`withMode`.

- [ ] **Step 1: Write the failing tests**

`tests/projectile-studies.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STUDIES, SETTING_PARAMS, fixedSummary } from '../assets/projectile/studies.js';
import { STUDY_ART } from '../assets/projectile/study-art.js';
import { LOCKABLE, settingsFromURL } from '../assets/projectile/params.js';
import { defaultSettings, flightCheck, changedLocked, withMode, withScale, withH } from '../assets/projectile/model.js';
import { studyFixed, resolveRoute } from '../assets/measure/studies.js';
import { makeT } from '../assets/translate.js';
import { STRINGS } from '../assets/projectile/i18n.js';

const lv = { t: makeT(STRINGS, () => 'lv'), lang: 'lv' };

test('four studies in the spec order, each with texts and a drawing', () => {
  assert.deepEqual(STUDIES.map((s) => [s.id, s.no]), [['free', '01'], ['vertical', '02'], ['horizontal', '03'], ['oblique', '04']]);
  for (const s of STUDIES) {
    for (const k of ['title', 'q', 'changes']) {
      assert.ok(`study.${s.id}.${k}` in STRINGS.lv && `study.${s.id}.${k}` in STRINGS.en, `${s.id}.${k}`);
    }
    assert.match(STUDY_ART[s.id], /^<svg /);
    for (const f of s.editable) assert.ok(LOCKABLE.includes(f), `${s.id}: ${f}`);
  }
});

test('every preset gives a measurable flight on the table (Review Focus 5)', () => {
  for (const s of STUDIES) {
    const p = s.preset(defaultSettings());
    assert.equal(p.scale, 'table', s.id);
    assert.equal(flightCheck(p, { noise: 1, traps: [] }), 'ok', s.id);
  }
  const by = Object.fromEntries(STUDIES.map((s) => [s.id, s.preset(defaultSettings())]));
  assert.deepEqual([by.free.mode, by.free.v0], ['vertical', 0]);
  assert.deepEqual([by.vertical.mode, by.vertical.v0 > 0], ['vertical', true]);
  assert.equal(by.horizontal.mode, 'horizontal');
  assert.deepEqual([by.oblique.mode, by.oblique.h], ['oblique', 0]);
});

test('study-fixed values cannot be changed, also not indirectly (Review Focus 3)', () => {
  const free = STUDIES[0];
  const fixed = studyFixed(free, LOCKABLE);
  assert.deepEqual([...fixed].sort(), ['alpha', 'grid', 'mode', 'scale', 'second', 'v0', 'view']);
  const s = free.preset(defaultSettings());
  assert.deepEqual(changedLocked(s, withMode(s, 'horizontal'), fixed), ['mode']);
  // uz torni: mainās mērogs, un v₀ kļūst m/s — abi ir nofiksēti; h un Δt šajā pētījumā drīkst mainīties
  assert.deepEqual(changedLocked(s, withScale(s, 'tower'), fixed).sort(), ['scale', 'v0']);
  assert.deepEqual(changedLocked(s, withH(s, 120), fixed), []);
});

test('fixed summary lists only the study-fixed physical values', () => {
  const by = (id) => STUDIES.find((s) => s.id === id);
  const sum = (id) => fixedSummary(by(id).preset(defaultSettings()), studyFixed(by(id), LOCKABLE), lv);
  assert.equal(sum('free'), 'galds; v₀ = 0 (brīvā krišana)');
  assert.equal(sum('vertical'), 'galds');
  assert.equal(sum('oblique'), 'galds; h = 0 cm');
});

test('router: cards without params, study by id, old links full', () => {
  const r = (q) => resolveRoute(q, { studies: STUDIES, settingParams: SETTING_PARAMS });
  assert.equal(r('').kind, 'cards');
  assert.equal(r('?study=oblique').study.id, 'oblique');
  assert.equal(r('?mode=2&h=90&v0=180&dt=0.05&view=strobe&lock=1').kind, 'full');
});

test('study + teacher params: params on top of the preset, lock fixes them (Review Focus 4)', () => {
  const study = STUDIES[2];
  const p = settingsFromURL('?h=50&lock=1', { makeSeed: () => 1, base: study.preset(defaultSettings()) });
  assert.equal(p.settings.mode, 'horizontal');
  assert.equal(p.settings.h, 50);
  assert.deepEqual([...p.locked], ['h']);
});
```

In `tests/projectile-params.test.js` add:

```js
test('base: a study preset is the starting point; scale and mode params apply on top', () => {
  const base = { ...defaultSettings('table', 'vertical'), v0: 0 };
  const a = settingsFromURL('', { makeSeed: () => 1, base });
  assert.deepEqual([a.settings.mode, a.settings.v0], ['vertical', 0]);
  const b = settingsFromURL('?scale=tower', { makeSeed: () => 1, base });
  assert.equal(b.settings.scale, 'tower');
  assert.equal(b.settings.h, 20);
});
```

- [ ] **Step 2: Run to verify they fail** — `npm test 2>&1 | tail -6`: cannot find `assets/projectile/studies.js`.

- [ ] **Step 3: `params.js` — the `base` option**

Change the signature to `export function settingsFromURL(search, { makeSeed = randomSeed, base = null } = {})` and replace

```js
  let s = defaultSettings(scale, mode);
```

with

```js
  // pētījumā sāk no tā iestatījumiem; mērogs un režīms no saites — virsū
  let s = base ? { ...base } : defaultSettings(scale, mode);
  if (base && 'scale' in v) s = withScale(s, scale);
  if (base && 'mode' in v) s = withMode(s, mode);
```

`withScale` and `withMode` must be imported from `./model.js`. Note that later code in `settingsFromURL` uses `sc = SCALES[scale]` and `v0Range(scale, mode)` — with `base` these must use the final `s.scale` and `s.mode`: set `const sc = SCALES[s.scale];` after the lines above (move it), and use `v0Range(s.scale, s.mode)`.

- [ ] **Step 4: `assets/projectile/studies.js`**

```js
import { withMode, withScale, withV0, withH } from './model.js';
import { PARAM_SCHEMA } from './params.js';
import { SCALES } from './scales.js';
import { formatNumber, decimalsOf } from '../measure/format.js';

const BOTH = { table: true, strobe: true };
const onTable = (s) => withScale(s, 'table');

// Pētījumi (spec. pētījumi 4, K-02): visi uz galda.
export const STUDIES = [
  { id: 'free', no: '01', editable: ['h', 'dt'], views: BOTH, preset: (s) => withV0(withMode(onTable(s), 'vertical'), 0) },
  { id: 'vertical', no: '02', editable: ['v0', 'h', 'dt'], views: BOTH, preset: (s) => withV0(withMode(onTable(s), 'vertical'), 150) },
  { id: 'horizontal', no: '03', editable: ['v0', 'h', 'dt', 'second'], views: BOTH, preset: (s) => withMode(onTable(s), 'horizontal') },
  { id: 'oblique', no: '04', editable: ['v0', 'alpha', 'dt'], views: BOTH, preset: (s) => withH(withV0(withMode(onTable(s), 'oblique'), 250), 0) },
];

export const SETTING_PARAMS = [...Object.keys(PARAM_SCHEMA), 'lock'];

// Bloks IESTATĪTS: nofiksētās fizikālās vērtības (režīmu, mērrežģi un skatus nerāda).
export function fixedSummary(s, hidden, { t, lang }) {
  const sc = SCALES[s.scale];
  const f = (v, dec) => formatNumber(v, dec, lang);
  const vu = `${sc.unit}/s`;
  const parts = [];
  if (hidden.has('scale')) parts.push(t(`set.scale.${s.scale}`));
  if (hidden.has('h')) parts.push(t('set.h', { v: f(s.h, sc.h.decimals), u: sc.unit }));
  if (hidden.has('v0')) {
    if (s.mode !== 'vertical') parts.push(t('set.v0', { v: f(s.v0, sc.v0.decimals), u: vu }));
    else if (s.v0 === 0) parts.push(t('set.v0Zero'));
    else parts.push(t(s.v0 > 0 ? 'set.v0Up' : 'set.v0Down', { v: f(Math.abs(s.v0), sc.v0.decimals), u: vu }));
  }
  if (hidden.has('alpha') && s.mode === 'oblique') parts.push(t('set.alpha', { v: f(s.alphaDeg, 0) }));
  if (hidden.has('dt')) parts.push(t('set.dt', { v: f(s.dt, decimalsOf(s.dt)) }));
  return parts.join('; ');
}
```

Check `fixedSummary` output against the test: for `free` the hidden set contains `scale`, `v0`, … but not `h`/`dt`, so the result is “galds; v₀ = 0 (brīvā krišana)”; for `oblique` `h` is hidden → “galds; h = 0 cm”.

Circular import check: `studies.js` imports `params.js`, which imports `model.js`; nothing imports `studies.js` except `main.js`, `entry.js` and `picker.js` — no cycle.

- [ ] **Step 5: `assets/projectile/study-art.js`**

Static SVG strings (viewBox `0 0 260 120`) in the fiz-sim drawing style, built from the CSS classes of Task 1 (`art-ink`, `art-dim`, `art-hair`, `art-sheet`, `art-ball`, `art-ghost`, `art-text`, `art-label`). Port them from the approved sketch (`https://claude.ai/artifact/691ayNnK15CRCzp74Yw8gq`, function `art(kind)` for `free`, `vert`, `horiz`, `obl`) — the same drawings, with `class="ink"` → `art-ink` etc.:

```js
const W = 260;
const H = 120;
const G = H - 18; // zeme
const grid = Array.from({ length: 11 }, (_, i) => `<line class="art-hair" x1="${i * 26}" y1="0" x2="${i * 26}" y2="${H}" opacity=".5"/>`).join('')
  + Array.from({ length: 5 }, (_, i) => `<line class="art-hair" x1="0" y1="${i * 26}" x2="${W}" y2="${i * 26}" opacity=".5"/>`).join('');
const ground = `<line class="art-ink" x1="0" y1="${G}" x2="${W}" y2="${G}"/>`;
const table = (top) => `<rect class="art-sheet" x="18" y="${top}" width="62" height="5"/><line class="art-ink" x1="24" y1="${top + 5}" x2="24" y2="${G}"/><line class="art-ink" x1="74" y1="${top + 5}" x2="74" y2="${G}"/>`;
const dot = (x, y, last) => `<circle cx="${x}" cy="${y}" r="4" class="${last ? 'art-ball' : 'art-ghost'}"/>`;
const svg = (body) => `<svg viewBox="0 0 ${W} ${H}" role="img" aria-hidden="true">${grid}${ground}${body}</svg>`;

export const STUDY_ART = {
  free: svg(table(30) + [0, 1, 2, 3, 4, 5].map((n) => dot(84 + n * 18, 26 + n * n * 2.1, n === 5)).join('')),
  vertical: svg(table(54) + '<path class="art-ink" d="M84 50 L84 18 M84 18 l-3 6 M84 18 l3 6" stroke-width="1.4"/>'
    + [0, 1, 2, 3, 4, 5, 6, 7].map((n) => { const k = n - 3; return dot(110 + n * 16, 22 + k * k * 3.2, n === 7); }).join('')),
  horizontal: svg(table(30) + [0, 1, 2, 3, 4, 5].map((n) => dot(84 + n * 24, 26 + n * n * 2.1, n === 5)).join('')
    + [1, 2, 3, 4, 5].map((n) => `<circle cx="84" cy="${26 + n * n * 2.1}" r="4" class="art-dim" stroke-dasharray="2 2"/>`).join('')),
  oblique: svg(`<path class="art-ink" d="M24 ${G - 4} l30 -30 m0 0 l-7 1 m7 -1 l-1 7" stroke-width="1.4"/><path class="art-ink" d="M48 ${G - 4} A24 24 0 0 0 41 ${G - 21}"/>`
    + [0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => { const k = n / 8; return dot(24 + k * 210, G - 4 - 4 * 64 * k * (1 - k), n === 8); }).join('')),
};
```

- [ ] **Step 6: New i18n keys** (add to both `lv` and `en` in `assets/projectile/i18n.js`; the existing key-parity and typography tests then check them)

LV:

```js
    'page.backStudies': '← PĒTĪJUMI',
    'studies.eyebrow': 'PĒTĪJUMI',
    'studies.lead': 'Izvēlies pētījumu. Katrā ir tikai tie lielumi, kas tam vajadzīgi; pārējais jau ir iestatīts.',
    'studies.changes': 'MAINA',
    'studies.full': 'PILNĀ KONTROLE',
    'studies.fullDesc': 'Visi lielumi un skati, galds un tornis, visi trīs režīmi.',
    'studies.unknown': 'Pētījums “{id}” nav atrasts. Izvēlies kādu no kartītēm.',
    'blk.fixed': 'IESTATĪTS',
    'dims.hintStudy': 'Velc rasējumā izmēru līnijas, ko var mainīt. Precīzāk — ar bultiņu taustiņiem vai pogām − un +.',
    'study.free.title': 'BRĪVĀ KRIŠANA',
    'study.free.q': 'Kā krīt bumbiņa? Ko var uzzināt no Δy vienādos laika sprīžos?',
    'study.free.changes': 'h, Δt',
    'study.vertical.title': 'VERTIKĀLAIS SVIEDIENS',
    'study.vertical.q': 'Cik ilgi bumbiņa kāpj un kad tā atgriežas?',
    'study.vertical.changes': 'v₀ (uz augšu vai uz leju), h, Δt',
    'study.horizontal.title': 'HORIZONTĀLAIS SVIEDIENS',
    'study.horizontal.q': 'Vai ātrāk mesta bumbiņa lido ilgāk?',
    'study.horizontal.changes': 'v₀, h, Δt, otrā bumbiņa',
    'study.oblique.title': 'SLĪPAIS SVIEDIENS',
    'study.oblique.q': 'Pie kāda leņķa bumbiņa aizlido vistālāk?',
    'study.oblique.changes': 'v₀, α, Δt',
```

EN:

```js
    'page.backStudies': '← STUDIES',
    'studies.eyebrow': 'STUDIES',
    'studies.lead': 'Choose a study. Each one has only the quantities it needs; everything else is already set.',
    'studies.changes': 'YOU CHANGE',
    'studies.full': 'FULL CONTROL',
    'studies.fullDesc': 'Every quantity and view, table and tower, all three modes.',
    'studies.unknown': 'Study “{id}” was not found. Choose one of the cards.',
    'blk.fixed': 'SET',
    'dims.hintStudy': 'Drag the dimension lines you can change in the drawing. For precise steps use the arrow keys or the − and + buttons.',
    'study.free.title': 'FREE FALL',
    'study.free.q': 'How does the ball fall? What do Δy in equal time intervals tell you?',
    'study.free.changes': 'h, Δt',
    'study.vertical.title': 'VERTICAL THROW',
    'study.vertical.q': 'How long does the ball rise and when does it come back?',
    'study.vertical.changes': 'v₀ (up or down), h, Δt',
    'study.horizontal.title': 'HORIZONTAL THROW',
    'study.horizontal.q': 'Does a ball thrown faster stay in the air longer?',
    'study.horizontal.changes': 'v₀, h, Δt, second ball',
    'study.oblique.title': 'OBLIQUE THROW',
    'study.oblique.q': 'At which angle does the ball fly farthest?',
    'study.oblique.changes': 'v₀, α, Δt',
```

- [ ] **Step 7: Run the suite and commit**

```bash
npm test 2>&1 | grep -E "^ℹ (pass|fail)"
git add assets/projectile tests/projectile-studies.test.js tests/projectile-params.test.js
git commit -m "Add the four K-02 studies, their texts and card drawings; settingsFromURL takes a study base

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: K-02 wiring — entry, picker page, study mode in main and panel

**Files:**
- Create: `assets/projectile/entry.js`, `assets/projectile/picker.js`
- Modify: `projectile-motion.html`, `assets/projectile/main.js`, `assets/projectile/panel.js`

**Interfaces:**
- Consumes: Tasks 1 and 2.
- Produces: the working K-02 page in three views.

- [ ] **Step 1: `projectile-motion.html`**

- `<script type="module" src="assets/projectile/main.js">` → `src="assets/projectile/entry.js"`.
- After the closing `</div>` of `.work` (still inside `.frame`) add `<div class="picker" id="picker" hidden></div>`.
- In the aside, after `<section class="block" id="blockDims"></section>` add `<section class="block" id="blockFixed" hidden></section>`.

- [ ] **Step 2: `assets/projectile/entry.js`**

```js
// Kuru skatu atvērt: pētījumu kartītes vai simulāciju (pētījums vai pilnā kontrole), spec. pētījumi 2.
import { resolveRoute } from '../measure/studies.js';
import { STUDIES, SETTING_PARAMS } from './studies.js';

const route = resolveRoute(location.search, { studies: STUDIES, settingParams: SETTING_PARAMS });
if (route.kind === 'cards') import('./picker.js').then((m) => m.start(route));
else import('./main.js');
```

- [ ] **Step 3: `assets/projectile/picker.js`**

```js
import { createI18n, createTheme, mountTitleBlock } from '../sim-core.js';
import { STRINGS } from './i18n.js';
import { STUDIES } from './studies.js';
import { STUDY_ART } from './study-art.js';
import { mountStudyPicker } from '../measure/study-picker.js';

export function start(route) {
  document.getElementById('bootMsg')?.remove();
  const i18n = createI18n(STRINGS);
  const theme = createTheme();
  document.querySelector('.work').hidden = true;
  const root = document.getElementById('picker');
  root.hidden = false;
  mountStudyPicker(root, { i18n, studies: STUDIES, sheet: 'K-02', art: STUDY_ART, unknownStudy: route.unknownStudy });
  mountTitleBlock(root.querySelector('.titleblock'), { i18n, theme, sheet: 'K-02', topicKey: 'tb.topicValue' });
  i18n.apply();
}
```

- [ ] **Step 4: `assets/projectile/main.js` — study mode**

At the top, add imports: `resolveRoute`, `studyFixed` from `../measure/studies.js`; `STUDIES`, `SETTING_PARAMS`, `fixedSummary` from `./studies.js`; `LOCKABLE` from `./params.js`; `defaultSettings` from `./model.js`.

Replace

```js
const url = settingsFromURL(location.search);
```

with

```js
const route = resolveRoute(location.search, { studies: STUDIES, settingParams: SETTING_PARAMS });
const study = route.kind === 'study' ? route.study : null;
const url = settingsFromURL(location.search, study ? { base: study.preset(defaultSettings()) } : {});
// Pētījumā nofiksētie lielumi: tiek atteikti tāpat kā `lock`, bet netiek rādīti kā vadība un bez FIKS.
const hidden = study ? studyFixed(study, LOCKABLE) : new Set();
```

and in `state`: `locked: new Set([...url.locked, ...hidden])`, `hidden`, and `views: url.locked.has('view') || !study ? url.views : study.views`.

Before `mountTitleBlock(...)` (move that call below the `route` lines if needed) compute `const sheet = study ? \`K-02 · ${study.no}\` : 'K-02';` and pass `sheet`. Then set up the header:

```js
// Galvene: atpakaļ uz kartītēm; pētījuma nosaukums un numurs (spec. pētījumi 3)
{
  const back = document.querySelector('header .back');
  back.href = location.pathname.split('/').pop() || 'projectile-motion.html';
  back.dataset.i18n = 'page.backStudies';
  const h1 = document.querySelector('header h1');
  h1.querySelector('.sheet-no').textContent = sheet;
  if (study) {
    const name = document.createElement('span');
    name.className = 'study-name';
    name.dataset.i18n = `study.${study.id}.title`;
    h1.querySelector('[data-i18n="page.heading"]').after(document.createTextNode(' · '), name);
  }
}
```

(`i18n.apply()` already fills `data-i18n` elements; keep one `i18n.apply()` after this block.)

In `handleItems`, the locked branch becomes:

```js
    if (state.locked.has(key)) {
      base.kind = 'none';
      base.labelClass = 'locked';
      base.labelText = state.hidden.has(key) ? o.labelText : `${o.labelText} ${t('dims.fixed')}`; // pētījumā bez FIKS.
    }
```

In `render()`, pass `hidden: state.hidden` and `fixedText: study ? fixedSummary(s, state.hidden, { t: i18n.t, lang }) : ''` in the panel view-model.

In `openStrobeView`, `gridLocked: state.locked.has('grid')` already covers the study (grid is fixed in every K-02 study) — no change.

In `window.__pm` add `get study() { return study; }`.

- [ ] **Step 5: `assets/projectile/panel.js` — hide study-fixed controls**

The view-model gains `hidden: Set` (empty in full mode) and `fixedText: string`. Rules (in full mode nothing changes):

- `blocks.fixed = root.querySelector('#blockFixed')`; `fixedBlock(vm)` returns `''` when `vm.fixedText` is empty, else `<div class="block-title">IESTATĪTS</div><div class="fixed-list">…</div>` (texts `blk.fixed`, escaped `vm.fixedText`).
- In `setBlock`, after writing, set `blocks[name].hidden = html === ''` so an empty block takes no space.
- `modeBlock`: the mode buttons and the mode hint only when `!hidden.has('mode')`; the Δt row only when `!hidden.has('dt')`; the slow checkbox whenever the Δt row is shown; the second-ball checkbox only in mode `horizontal` and when `!hidden.has('second')`; the block title `blk.mode` only when the mode buttons are shown (otherwise no title). If the block would contain nothing, return `''`.
- `dimsBlock`: the scale row only when `!hidden.has('scale')`; each readout (`h`, `v₀`, `α`) only when its key is not hidden; the grid checkbox only when `!hidden.has('grid')`; the hint is `dims.hintStudy` when `hidden.size > 0`, else `dims.hint`. If no readout and no row is left, return `''`.
- `fixTag(locked, key)` must not print FIKS. for keys in `hidden` (they are not shown anyway, but keep it safe): `locked.has(key) && !hidden.has(key)` — pass `hidden` in or read it from a closure variable set at the top of `render(vm)`.
- `render(vm)` also calls `setBlock('fixed', fixedBlock(vm))`.

- [ ] **Step 6: Run the suite**

`npm test 2>&1 | grep -E "^ℹ (pass|fail)"` — PASS (the i18n literal-key scan covers the new `t('…')` calls).

- [ ] **Step 7: Browser check (desktop 1280×800, then 390×844)**

1. `http://localhost:8766/projectile-motion.html` → cards: eyebrow, lead, 4 cards with drawings, numbers `K-02 · 01…04`, “MAINA: …”, and PILNĀ KONTROLE under them; the title block (language/theme) at the bottom works (switch to EN: all card texts change). No horizontal scroll on the phone; cards in one column.
2. Click card 01 → `?study=free`: header “← PĒTĪJUMI”, “KRITIENI UN SVIEDIENI · BRĪVĀ KRIŠANA”, “K-02 · 01”. Panel: Δt row + slow checkbox, PALAIST, results, a dims block with only `h` and the study hint, IESTATĪTS “galds; v₀ = 0 (brīvā krišana)”. No mode buttons, no scale, no grid checkbox, no v₀ handle in the drawing (the v₀ label shows without FIKS.). PALAIST works; the strobe opens.
3. Card 03 → second-ball checkbox present; card 04 → v₀ and α handles, h = 0, no h handle.
4. `?study=zz` → cards + notice “Pētījums “zz” nav atrasts. Izvēlies kādu no kartītēm.”
5. `?study=horizontal&h=50&lock=1` → h = 50 cm with FIKS. and no h handle.
6. `?full=1` and the README example `?mode=2&h=90&v0=180&dt=0.05&view=strobe&lock=1` → the full page exactly as before (all blocks, all buttons), back link “← PĒTĪJUMI” goes to the cards.
7. Index page card “Kritieni un sviedieni” opens the cards.

- [ ] **Step 8: Commit**

```bash
git add projectile-motion.html assets/projectile
git commit -m "K-02 opens with study cards; studies show only their own controls; full control under the cards

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: K-01 studies — definitions, texts, card drawings, params base

**Files:**
- Create: `assets/rolling-ball/studies.js`, `assets/rolling-ball/study-art.js`
- Modify: `assets/rolling-ball/i18n.js`, `assets/rolling-ball/params.js` (`base` option)
- Test: `tests/studies-rolling.test.js`

**Interfaces:**
- Consumes: `defaultSettings`, `derive`, `withAlpha`, `withLevel`, `withTimer`, `changedLocked`, `withGate`, `withX0`, `withH` (model.js); `LOCKABLE`, `PARAM_SCHEMA`, `settingsFromURL` (params.js); `simulateRun` (experiment.js); `studyFixed` (Task 1); `ballById`, `ballMass`; `formatNumber`, `roundTo`.
- Produces: `STUDIES` (ids `a`, `t`, `x`, `strobe`, `measure: true` on all four), `SETTING_PARAMS`, `fixedSummary(settings, hidden, { t, lang })`, `STUDY_ART`, `settingsFromURL(search, { makeSeed, base })` (when `base` is given, start from it instead of `defaultSettings()`).

- [ ] **Step 1: Write the failing tests** (`tests/studies-rolling.test.js`)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STUDIES, SETTING_PARAMS, fixedSummary } from '../assets/rolling-ball/studies.js';
import { STUDY_ART } from '../assets/rolling-ball/study-art.js';
import { LOCKABLE, settingsFromURL } from '../assets/rolling-ball/params.js';
import { defaultSettings, derive, changedLocked, withAlpha, withGate, withX0, withH } from '../assets/rolling-ball/model.js';
import { simulateRun } from '../assets/rolling-ball/experiment.js';
import { studyFixed, resolveRoute } from '../assets/measure/studies.js';
import { makeT } from '../assets/translate.js';
import { STRINGS } from '../assets/rolling-ball/i18n.js';

const lv = { t: makeT(STRINGS, () => 'lv'), lang: 'lv' };
const by = (id) => STUDIES.find((s) => s.id === id);

test('four studies in the spec order with texts, measure line and a drawing', () => {
  assert.deepEqual(STUDIES.map((s) => [s.id, s.no]), [['a', '01'], ['t', '02'], ['x', '03'], ['strobe', '04']]);
  for (const s of STUDIES) {
    for (const k of ['title', 'q', 'changes', 'measure']) assert.ok(`study.${s.id}.${k}` in STRINGS.lv && `study.${s.id}.${k}` in STRINGS.en, `${s.id}.${k}`);
    assert.equal(s.measure, true);
    assert.match(STUDY_ART[s.id], /^<svg /);
    for (const f of [...s.editable, ...(s.coupled ?? [])]) assert.ok(LOCKABLE.includes(f), `${s.id}: ${f}`);
  }
});

test('presets: levels, slope set by α in a(α), views; every preset rolls (Review Focus 5)', () => {
  const p = Object.fromEntries(STUDIES.map((s) => [s.id, s.preset(defaultSettings())]));
  assert.deepEqual([p.a.level, p.a.angleMode], [1, 'alpha']);
  assert.deepEqual([p.t.level, p.t.timer], [2, 'gate']);
  assert.equal(p.x.level, 3);
  assert.equal(p.strobe.level, 3);
  assert.deepEqual(by('x').views, { table: true, strobe: false });
  assert.deepEqual(by('strobe').views, { table: false, strobe: true });
  for (const s of STUDIES) {
    const set = s.preset(defaultSettings());
    assert.ok(derive(set).rolls, s.id);
    assert.equal(simulateRun(set, { seed: 1, repeat: 1, noise: 1, traps: [] }).rolls, true, s.id);
  }
});

test('fixed sets; coupled h/α stay changeable together (Review Focus 3)', () => {
  const fa = studyFixed(by('a'), LOCKABLE);
  assert.ok(!fa.has('h') && !fa.has('alpha'));
  const a = by('a').preset(defaultSettings());
  assert.deepEqual(changedLocked(a, withAlpha(a, 5), fa), []);
  const ft = studyFixed(by('t'), LOCKABLE);
  const t = by('t').preset(defaultSettings());
  assert.deepEqual(changedLocked(t, withGate(t, 0, t.gates[0] + 3), ft), []);
  assert.deepEqual(changedLocked(t, withX0(t, 5), ft), ['x0']);
  assert.ok(changedLocked(t, withH(t, 5), ft).includes('h'));
  const fx = studyFixed(by('x'), LOCKABLE);
  assert.ok(!fx.has('h') && !fx.has('alpha') && !fx.has('dt') && fx.has('ball') && fx.has('tape'));
  assert.ok(!studyFixed(by('strobe'), LOCKABLE).has('tape'));
});

test('fixed summary', () => {
  const sum = (id) => fixedSummary(by(id).preset(defaultSettings()), studyFixed(by(id), LOCKABLE), lv);
  assert.equal(sum('a'), 'L = 80 cm; lodīte: tērauds, Ø 16 mm, 16,8 g; renīte; kustības sākumpunkts x₀ = 0,0 cm; finišs x = 70,0 cm');
  assert.equal(sum('t'), 'L = 80 cm; h = 3,0 cm (α = 2,1°); lodīte: tērauds, Ø 16 mm, 16,8 g; renīte; kustības sākumpunkts x₀ = 0,0 cm');
  assert.equal(sum('x'), 'L = 80 cm; lodīte: tērauds, Ø 16 mm, 16,8 g; renīte; kustības sākumpunkts x₀ = 0,0 cm');
});

test('router and teacher params on top of a study (Review Focus 1, 4)', () => {
  const r = (q) => resolveRoute(q, { studies: STUDIES, settingParams: SETTING_PARAMS });
  assert.equal(r('').kind, 'cards');
  assert.equal(r('?L=80&h=2.0&ball=steel16&level=3&dt=0.5&view=strobe&lock=1').kind, 'full');
  assert.equal(r('?study=t').study.id, 't');
  const p = settingsFromURL('?h=5&lock=1', { makeSeed: () => 1, base: by('x').preset(defaultSettings()) });
  assert.equal(p.settings.level, 3);
  assert.equal(p.settings.h, 5);
  assert.deepEqual([...p.locked], ['h']);
});
```

The expected summary strings come from the existing `set.*` texts in `assets/rolling-ball/i18n.js` (`set.L`, `set.hAlpha`, `set.ball`, `set.profile.groove`, `set.x0`, `set.finish`); if the 16,8 g mass or the α decimals differ, read `defaultSettings()`/`derive()` and correct the expectation, not the code.

- [ ] **Step 2: Run to verify they fail.**

- [ ] **Step 3: `params.js` — `base` option**

`export function settingsFromURL(search, { makeSeed = randomSeed, base = null } = {})` and `let s = base ? { ...base, gates: [...base.gates] } : defaultSettings();`.

- [ ] **Step 4: `assets/rolling-ball/studies.js`**

```js
import { derive, withAlpha, withLevel, withTimer } from './model.js';
import { PARAM_SCHEMA } from './params.js';
import { roundTo, formatNumber } from '../measure/format.js';

// Pētījumi (spec. pētījumi 4, K-01): “mūsu renīte”, tērauda lodīte Ø 16 mm, renīte.
export const STUDIES = [
  {
    id: 'a', no: '01', measure: true, editable: ['alpha'], coupled: ['h'], views: { table: true, strobe: false },
    preset: (s) => withAlpha(withLevel(s, 1), roundTo(derive(s).alphaDeg, 0.1)), // slīpumu iestata ar α
  },
  { id: 't', no: '02', measure: true, editable: ['gates'], views: { table: true, strobe: false }, preset: (s) => withTimer(withLevel(s, 2), 'gate') },
  { id: 'x', no: '03', measure: true, editable: ['dt', 'h'], coupled: ['alpha'], views: { table: true, strobe: false }, preset: (s) => withLevel(s, 3) },
  { id: 'strobe', no: '04', measure: true, editable: ['dt', 'h', 'tape'], coupled: ['alpha'], views: { table: false, strobe: true }, preset: (s) => withLevel(s, 3) },
];

export const SETTING_PARAMS = [...Object.keys(PARAM_SCHEMA), 'lock'];

// Bloks IESTATĪTS: nofiksētās vērtības tādā pašā pierakstā kā tabulas iestatījumu rindā.
export function fixedSummary(s, hidden, { t, lang }) {
  const d = derive(s);
  const f = (v, dec) => formatNumber(v, dec, lang);
  const parts = [];
  if (hidden.has('L')) parts.push(t('set.L', { v: f(s.L, 0) }));
  if (hidden.has('h') && hidden.has('alpha')) {
    parts.push(s.angleMode === 'h'
      ? t('set.hAlpha', { h: f(s.h, 1), a: f(d.alphaDeg, 1) })
      : t('set.alphaH', { a: f(d.alphaDeg, 1), h: f(d.h, 1) }));
  }
  if (hidden.has('ball')) parts.push(t('set.ball', { name: t(`mat.${d.ball.material}`), d: f(d.ball.d * 10, 0), m: f(d.mass, 1) }));
  if (hidden.has('profile')) parts.push(t(`set.profile.${s.profile}`));
  if (hidden.has('x0')) parts.push(t('set.x0', { v: f(s.x0, 1) }));
  if (s.level === 1) parts.push(t('set.finish', { v: f(d.xf, 1) }));
  if (hidden.has('dt') && s.level === 3) parts.push(t('set.dt', { v: f(s.dt, 1) }));
  return parts.join('; ');
}
```

- [ ] **Step 5: `assets/rolling-ball/study-art.js`**

Port the four groove drawings (`a`, `t`, `x`, `s` in the sketch’s `art(kind)`; here keyed `a`, `t`, `x`, `strobe`) with the `art-*` classes, viewBox `0 0 260 120`, the same way as Task 2 Step 5. The groove: support at the left, line from (22, 40) to (238, 86), table line at y = 94; `a`: angle arc at the low end with “α” and a stopwatch box “2,71 s”; `t`: four photogates (vertical line + small square) along the groove; `x`: a small table box with “t, s   x, cm” and two rows; `strobe`: nine strobe positions with 1 : 4 : 9 spacing and tape ticks along the groove.

- [ ] **Step 6: i18n keys** (both languages; `dims.hintStudy`, `blk.fixed`, `page.backStudies` and the `studies.*` keys as in Task 2 Step 6, with `studies.lead` LV “Izvēlies pētījumu. Visos ir “mūsu renīte” (L = 80 cm) un tērauda lodīte Ø 16 mm.” / EN “Choose a study. All use “our groove” (L = 80 cm) and a steel ball Ø 16 mm.” and `studies.fullDesc` LV “Visi lielumi un skati: renītes garums, lodītes, virsma, trīs datu līmeņi.” / EN “Every quantity and view: groove length, balls, surface, three data levels.”), plus:

LV:

```js
    'study.a.title': 'a(α)',
    'study.a.q': 'Kā lodītes paātrinājums atkarīgs no slīpuma leņķa?',
    'study.a.changes': 'α',
    'study.a.measure': 'HRONOMETRS',
    'study.t.title': 't(Δx)',
    'study.t.q': 'Cik ilgā laikā lodīte veic katru posmu?',
    'study.t.changes': 'vārtu vietas un skaits',
    'study.t.measure': 'FOTOVĀRTI',
    'study.x.title': 'x(Δt)',
    'study.x.q': 'Kur lodīte ir ik pēc Δt?',
    'study.x.changes': 'Δt, h',
    'study.x.measure': 'DATU TABULA',
    'study.strobe.title': 'STROBOSKOPS',
    'study.strobe.q': 'Nolasi lodītes koordinātas pats no stroboskopa attēla.',
    'study.strobe.changes': 'Δt, h, mērlente',
    'study.strobe.measure': 'STROBOSKOPA ATTĒLS',
```

EN:

```js
    'study.a.title': 'a(α)',
    'study.a.q': 'How does the ball’s acceleration depend on the slope angle?',
    'study.a.changes': 'α',
    'study.a.measure': 'STOPWATCH',
    'study.t.title': 't(Δx)',
    'study.t.q': 'How long does the ball take for each stretch?',
    'study.t.changes': 'gate positions and count',
    'study.t.measure': 'PHOTOGATES',
    'study.x.title': 'x(Δt)',
    'study.x.q': 'Where is the ball every Δt?',
    'study.x.changes': 'Δt, h',
    'study.x.measure': 'DATA TABLE',
    'study.strobe.title': 'STROBE',
    'study.strobe.q': 'Read the ball’s positions yourself from the strobe image.',
    'study.strobe.changes': 'Δt, h, tape',
    'study.strobe.measure': 'STROBE IMAGE',
```

- [ ] **Step 7: Run the suite and commit**

```bash
npm test 2>&1 | grep -E "^ℹ (pass|fail)"
git add assets/rolling-ball tests/studies-rolling.test.js
git commit -m "Add the four K-01 studies, their texts and card drawings; settingsFromURL takes a study base

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: K-01 wiring — entry, picker page, study mode in main and panel

**Files:**
- Create: `assets/rolling-ball/entry.js`, `assets/rolling-ball/picker.js`
- Modify: `rolling-ball.html`, `assets/rolling-ball/main.js`, `assets/rolling-ball/panel.js`

Same structure as Task 3 (read the finished K-02 files first and mirror them): `entry.js` and `picker.js` with sheet `K-01`; the HTML gets `entry.js`, `#picker`, `#blockFixed` (after `#blockBall`); `main.js` gets `route`, `study`, `hidden`, `state.locked` union, `state.hidden`, `state.views` rule, the header block (back href `rolling-ball.html`), the title-block sheet `K-01 · NN`, `window.__rb.study`, and in `handleItems` the FIKS. rule (`state.hidden.has(lockKey)` — note K-01 `isLocked(kind)` maps `gate` → `gates`; use the same mapping for `hidden`).

`panel.js` rules (full mode unchanged byte-for-byte):

- `levelBlock`: the level buttons only when `!hidden.has('level')`; the hint always; in level 2 the timer buttons only when `!hidden.has('timer')`, the gate-count row only when `!hidden.has('gates')`; in level 3 the Δt row only when `!hidden.has('dt')`, the slow checkbox whenever the Δt row is shown.
- `ballBlock`: the ball table only when `!hidden.has('ball')`, the profile buttons only when `!hidden.has('profile')`; `''` when both are hidden.
- `dimsBlock`: the “SLĪPUMU IESTATA AR” row only in full mode (`hidden.size === 0`); readouts only for keys not in `hidden` (in study a(α) that leaves α and the derived h; in t(Δx) none — then show no readouts); the tape checkbox only when `!hidden.has('tape')`; hint `dims.hintStudy` in a study. Return `''` if nothing but the title would be left — except in t(Δx) keep the hint, because the gates are dragged in the drawing.
- `fixTag` never prints FIKS. for hidden keys; `fixedBlock` and `setBlock(...).hidden` as in Task 3.

Browser check (desktop 1280×800, then 390×844): the same 7 points as Task 3 Step 7 for `rolling-ball.html` (cards `K-01 · 01…04` with the measure line; `?study=a`: only α, hronometrs, no ball table, no level buttons, IESTATĪTS line; `?study=t`: gates draggable and the gate stepper, the ball (x₀) not draggable; `?study=x`: Δt + h, only DATU TABULA after a run; `?study=strobe`: only STROBOSKOPS, tape checkbox; `?study=zz`; `?study=x&h=5&lock=1`), plus **K-01 full-mode regression**: `?full=1` and the README example `?L=80&h=2.0&ball=steel16&level=3&dt=0.5&view=strobe&lock=1` look and behave exactly as on the published page https://ans-sta.github.io/fiz-sim/rolling-ball.html (compare screenshots side by side; only the back link text differs).

Commit:

```bash
git add rolling-ball.html assets/rolling-ball
git commit -m "K-01 opens with study cards; studies show only their own controls; full control under the cards

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Documentation

**Files:** `README.md`

- In both “Teacher links” sections add two rows at the top of the table:
  - `study=<id>` — “Opens one study (K-02: `free`, `vertical`, `horizontal`, `oblique`; K-01: `a`, `t`, `x`, `strobe`). Other parameters apply on top of the study; with `lock=1` they are fixed.”
  - `full=1` — “Opens the full page with every control. Any other setting parameter also opens the full page.”
- Add one sentence above the K-01 table: “Without parameters a page opens its study cards.”
- Commit `docs: study cards and study links in the README`.
