# Kritieni un sviedieni (K-02), 1. kārta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `projectile-motion.html` (sheet K-02 “Kritieni un sviedieni”), phase 1 of the falls-and-throws spec: three modes (fall/vertical throw, horizontal throw, oblique throw) on two scales (classroom table in cm, tower in m), with realistic measurement data (t, x, y every Δt), a full-screen data table, a strobe image and teacher links with `lock`.

**Architecture:** Same as K-01 “Lodīte renītē” (`rolling-ball.html`): no build step, the page loads `assets/projectile/main.js` as an ES module. Pure logic (physics, model, noise, URL params, table model, layout geometry, strobe geometry) lives in small modules tested with `node --test`; DOM modules (panel, canvas drawing, strobe overlay) are verified in a real browser. Generic pieces that K-01 already has and K-02 needs are first moved to shared modules in `assets/measure/` (K-01 files keep re-exporting them, so K-01 code and tests stay unchanged). New shared pieces K-03 will reuse: `assets/physics/projectile.js`, `assets/measure/world-grid.js`, `assets/measure/strobe-view.js`.

**Tech Stack:** vanilla JavaScript ES modules, Canvas 2D, CSS custom properties (existing `assets/sim-common.css`, no new CSS), Node `node:test` (zero dependencies), Python `http.server` + Playwright MCP for browser checks.

**Spec:** `docs/plans/2026-09-30-kritieni-un-sviedieni.md` (business requirements; decisions = section 8, phase 1 scope = section 9). The shared behaviour it refers to is specified in `docs/plans/2026-09-30-lodite-renite.md` (sections 2, 5, 6, 8.1, 11, 12). Visual system: `docs/plans/2026-07-15-rasejuma-dizains.md`. The finished K-01 page is the reference implementation for every pattern here — when in doubt, read the matching file in `assets/rolling-ball/`.

## Global Constraints

- Work in the worktree `/Users/minim4/dev/sites/physics_sims-k02` on branch `projectile-motion`. Every command below runs there. Commit after every task. Never push. Never touch `/Users/minim4/dev/sites/physics_sims` (the main checkout).
- Never modify `electric-field.html`, `electric-field-hockey.html`, `millikan.html`, `newtons-cannon.html`, `design.html`, `rolling-ball.html`, `assets/sim-common.css`, `assets/sim-core.js`. In `assets/rolling-ball/` only the shims of Task 1 are allowed. `index.html` and `README.md` get additions only in Task 13.
- No npm dependencies. Browser imports use relative paths with the `.js` extension. No bare specifiers, no top-level `await`, no build tools.
- Units: every length and speed is in the unit of the chosen scale — table: cm and cm/s, g = 981 cm/s²; tower: m and m/s, g = 9.81 m/s². Degrees in the UI, radians inside maths. Coordinates: origin on the ground under the launch point, y up; launch point (0; h). The coordinates x, y are the **ball centre**.
- Principle “the simulation only makes reading easier” (K-01 spec 2.1): the data table, KOPĒT, CSV and PNG contain only t, x and y (mode 1: t and y) plus a settings line. Never v, a, Δx, Δy, flight time, range, apex, averages, fits or graphs — not in the panel, not in the drawing, not in notices.
- Every user-visible string comes from `assets/projectile/i18n.js` (LV and EN). Latvian typography: quotes “…”, spaced em-dash —, en-dash for ranges without spaces (2–6), ellipsis …, apostrophe ’. Shared modules in `assets/measure/` never contain UI text; callers pass labels in.
- Numbers: LV decimal comma, EN decimal point (`formatNumber`); a value and its ± error have the same number of decimals. CSV is always LV format (`openDataTable` already does this).
- Visual (approved design): IBM Plex Mono 400/500/600 for all chrome; IBM Plex Sans 400 only for multi-sentence hints and notices; colours only through `theme.colors()` tokens (both themes); 1 px hairlines; no shadows, no rounded corners; `--accent` only for the active/selected/focused state. Ball colour = material token (`c.mat.steel`, `c.mat.plastic`).
- Animation step is clamped (`startLoop` already clamps to 0.05 s). Measurement data and strobe positions come from the analytic model (`run.posAt`), never from animation frames.
- Every user-facing error names its own cause and what to do. No generic “something went wrong”.
- Every draggable handle is the shared `createHandles` slider (`role="slider"`, arrow keys, visible focus ring).
- Code comments are sparse and may be Latvian or English; identifiers are English.
- Test command: `cd /Users/minim4/dev/sites/physics_sims-k02 && npm test` — always run the whole suite; it must stay green (105 existing tests + new ones).

## Review Focus

1. **Teacher link with bad or conflicting params** (`scale=tower&h=120`, `scale=tower&dt=0.02`, `mode=2&v0=-100`, `h=2,5` with a decimal comma, `traps=push`, `fbclid=…` appended by Facebook) → the page opens, clamps or falls back sensibly, shows one precise notice per problem (naming the allowed range in the scale’s unit), silently ignores unknown params. Tests: Task 6.
2. **No flight or a flight too short to measure** (h = 0 in mode 2; h = 0 and v₀ ≤ 0 in mode 1; h = 0 and α = 0 in mode 3; tower h = 1 m with Δt = 0,5 s) → nothing is recorded, a notice names the cause and the fix, and the notice never reveals a computed quantity (no flight time). Tests: Tasks 3 and 4; browser check Task 12.
3. **Student alternates settings** (table → tower → table, mode 2 → 3 → 2) → each run lands in the table of its own settings, repeat numbering continues there, and the same seed + settings + repeat reproduces identical numbers. Tests: Tasks 4 and 7.
4. **Tab hidden mid-run or a slow phone** → the ball does not jump; the numbers are identical to a run on a fast machine. Tests: Task 4 (`simulateRun` is pure and frame-free); loop clamp is the shared `startLoop`; browser check Task 12.
5. **Very large strobe export** (tower, mode 3, v₀ = 30 m/s, α = 45°, h = 50 m; table, mode 3, v₀ = 400 cm/s, α = 45°, h = 150 cm) → a PNG is still produced at a reduced but readable scale; only a truly impossible size gives the precise “too large for this device” notice. Tests: Tasks 8 and 10.

## File Structure

```
projectile-motion.html               NEW  page skeleton (K-02)
assets/physics/projectile.js         NEW  velocity, positionAt, landingTime, apexTime, apexHeight — pure
assets/measure/handles.js            MOVED from assets/rolling-ball/handles.js (unchanged code)
assets/measure/results-store.js      NEW  createResults({ tableFields }) — generic, moved from rolling-ball/results.js
assets/measure/traps.js              NEW  TRAP_REPEATS, trapRepeat — moved from rolling-ball/experiment.js
assets/measure/url-params.js         MODIFY + formatParamValue, warningText (moved from rolling-ball/params.js)
assets/measure/world-grid.js         NEW  niceStep, ticks, gridSteps — pure
assets/measure/strobe-view.js        NEW  exportSizeFor (pure), canvasToPNG, openStrobeShell (DOM)
assets/rolling-ball/handles.js       SHIM re-export
assets/rolling-ball/results.js       SHIM createResults = shared store with { level }
assets/rolling-ball/experiment.js    SHIM imports + re-exports trapRepeat, TRAP_REPEATS
assets/rolling-ball/params.js        SHIM re-exports warningText
assets/projectile/scales.js          NEW  SCALES, MODES, ALPHA, DT_ALL, TABLE_DRAW — pure
assets/projectile/model.js           NEW  settings, with*, derive, settingsKey, changedLocked — pure
assets/projectile/experiment.js      NEW  simulateRun — pure
assets/projectile/i18n.js            NEW  STRINGS { lv, en }
assets/projectile/params.js          NEW  PARAM_SCHEMA, LOCKABLE, settingsFromURL — pure
assets/projectile/results.js         NEW  createResults, settingsLine, tableModel — pure
assets/projectile/scene.js           NEW  sceneBox, sceneLayout, arrowGeometry, handleAnchors, valueFromPointer (pure) + drawScene (canvas)
assets/projectile/strobe.js          NEW  strobePoints, strobeWorldBox (pure) + drawStrobe, openProjectileStrobe
assets/projectile/panel.js           NEW  control panel (DOM)
assets/projectile/main.js            NEW  state and wiring
tests/shared-measure.test.js         NEW
tests/projectile-*.test.js           NEW  one per pure module
index.html, README.md                MODIFY (Task 13 only)
```

## How to verify in a browser (Tasks 1, 12, 13)

ES modules do not load from `file://`. Serve the worktree over http on port 8766 (8765 may be used by the main checkout):

```bash
cd /Users/minim4/dev/sites/physics_sims-k02 && (curl -sI http://localhost:8766/index.html | head -1 | grep -q 200 || (python3 -m http.server 8766 >/dev/null 2>&1 &))
```

Use the Playwright MCP tools (load them with ToolSearch `select:mcp__plugin_playwright_playwright__browser_navigate,mcp__plugin_playwright_playwright__browser_take_screenshot,mcp__plugin_playwright_playwright__browser_console_messages,mcp__plugin_playwright_playwright__browser_evaluate,mcp__plugin_playwright_playwright__browser_resize,mcp__plugin_playwright_playwright__browser_click,mcp__plugin_playwright_playwright__browser_snapshot,mcp__plugin_playwright_playwright__browser_press_key,mcp__plugin_playwright_playwright__browser_drag`). Screenshots may only be saved under `/Users/minim4/dev/sites/fizika_v3/.playwright-mcp/` (the tool refuses other paths) — use file names starting with `k02_`. Check `browser_console_messages` (level `error`): the only allowed error is the 404 for `favicon.ico`. Sizes: desktop 1280×800, phone portrait 390×844, phone landscape 844×390. From Task 12 on, `main.js` exposes `window.__pm` so checks can read state and change settings through `browser_evaluate`.

---

### Task 1: Move the generic K-01 pieces K-02 needs into shared modules

K-02 needs the dimension handles, the results store, the trap picker and the URL warning text from K-01. The spec requires shared modules instead of copies (K-01 spec 11, “Kopīgs dzinējs”). K-01 files keep exporting the same names, so K-01 code and its 105 tests stay unchanged.

**Files:**
- Move: `assets/rolling-ball/handles.js` → `assets/measure/handles.js` (content unchanged)
- Create: `assets/rolling-ball/handles.js` (shim), `assets/measure/results-store.js`, `assets/measure/traps.js`
- Modify: `assets/rolling-ball/results.js`, `assets/rolling-ball/experiment.js`, `assets/rolling-ball/params.js`, `assets/measure/url-params.js`
- Test: `tests/shared-measure.test.js`

**Interfaces:**
- Produces: `createHandles(layer, { onChange, onDragStart, onDragEnd, onSelect, labels })` from `assets/measure/handles.js` (same as before); `createResults({ tableFields? }) → { tables(), byKey(key), nextRepeat(key), add(settings, run, meta) }` from `assets/measure/results-store.js`; `TRAP_REPEATS = 3`, `trapRepeat(seed, key, name) → 1..3` from `assets/measure/traps.js`; `formatParamValue(value, lang, t) → string`, `warningText(w, { t, lang }) → string` from `assets/measure/url-params.js`.

- [ ] **Step 1: Write the failing tests**

`tests/shared-measure.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createResults } from '../assets/measure/results-store.js';
import { trapRepeat, TRAP_REPEATS } from '../assets/measure/traps.js';
import { warningText, formatParamValue } from '../assets/measure/url-params.js';
import { makeT } from '../assets/translate.js';

test('results store: one table per key, repeats continue, extra table fields', () => {
  const r = createResults({ tableFields: (s) => ({ level: s.level }) });
  const meta = { seed: 7, noise: 1, traps: ['late'] };
  r.add({ level: 3, a: [1] }, { key: 'A' }, meta);
  r.add({ level: 2 }, { key: 'B' }, meta);
  const a = r.add({ level: 3, a: [1] }, { key: 'A' }, meta);
  assert.equal(r.tables().length, 2);
  assert.equal(a.index, 1);
  assert.equal(a.level, 3);
  assert.equal(a.runs.length, 2);
  assert.equal(r.nextRepeat('A'), 3);
  assert.equal(r.nextRepeat('nav'), 1);
  assert.deepEqual(a.meta, { seed: 7, noise: 1, traps: ['late'] });
});

test('results store copies the settings and works without extra fields', () => {
  const r = createResults();
  const s = { list: [1, 2] };
  const t = r.add(s, { key: 'K' }, { seed: 1, noise: 0, traps: [] });
  s.list.push(3);
  assert.deepEqual(t.settings.list, [1, 2]);
  assert.equal('level' in t, false);
});

test('trapRepeat is 1..3 and deterministic', () => {
  assert.equal(TRAP_REPEATS, 3);
  for (let seed = 1; seed < 200; seed++) {
    const k = trapRepeat(seed, 'key', 'late');
    assert.ok(k >= 1 && k <= 3);
    assert.equal(trapRepeat(seed, 'key', 'late'), k);
  }
});

test('formatParamValue: numbers in the language, lists, empty list', () => {
  const t = makeT({ lv: { 'url.none': 'nav' }, en: { 'url.none': 'none' } }, () => 'lv');
  assert.equal(formatParamValue(2.5, 'lv', t), '2,5');
  assert.equal(formatParamValue(0.02, 'lv', t), '0,02');
  assert.equal(formatParamValue(50, 'en', t), '50');
  assert.equal(formatParamValue([0.1, 0.2], 'lv', t), '0,1; 0,2');
  assert.equal(formatParamValue([0.1, 0.2], 'en', t), '0.1, 0.2');
  assert.equal(formatParamValue([], 'lv', t), 'nav');
  assert.equal(formatParamValue('cm/s', 'lv', t), 'cm/s');
});

test('warningText passes every warning field, formatted, to url.<reason>', () => {
  const dict = {
    lv: { 'url.x': '{param}={raw}: {unit} {max} [{allowed}] → {used}', 'url.bad_list': '{hint}', 'url.listHint': 'H', 'url.none': 'nav' },
    en: { 'url.x': '{param}={raw}: {unit} {max} [{allowed}] → {used}', 'url.bad_list': '{hint}', 'url.listHint': 'H', 'url.none': 'none' },
  };
  const t = makeT(dict, () => 'lv');
  const w = { param: 'h', raw: '120', reason: 'x', unit: 'm', max: 2.5, allowed: [0.1, 0.2], used: [1, 2] };
  assert.equal(warningText(w, { t, lang: 'lv' }), 'h=120: m 2,5 [0,1; 0,2] → 1; 2');
  assert.equal(warningText({ param: 'g', raw: 'x', reason: 'bad_list', used: [] }, { t, lang: 'lv' }), 'H');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test 2>&1 | tail -20`
Expected: FAIL — `Cannot find module '…/assets/measure/results-store.js'`.

- [ ] **Step 3: Move the handles and add the shim**

```bash
git mv assets/rolling-ball/handles.js assets/measure/handles.js
```

Create `assets/rolling-ball/handles.js`:

```js
export { createHandles } from '../measure/handles.js';
```

- [ ] **Step 4: Create the shared results store**

`assets/measure/results-store.js` (this is the body of K-01’s `createResults`, with the K-01-only `level` field replaced by the `tableFields` hook):

```js
// Rezultātu tabulas: katrai iestatījumu atslēgai (run.key) sava tabula, kas krāj atkārtojumus.
// tableFields(settings) — lapas papildu lauki tabulai (piem. lodītes datu līmenis).
export function createResults({ tableFields = () => ({}) } = {}) {
  const tables = [];
  const byKeyMap = new Map();

  const byKey = (key) => byKeyMap.get(key);
  const nextRepeat = (key) => {
    const table = byKeyMap.get(key);
    return table ? table.runs.length + 1 : 1;
  };
  const add = (settings, run, meta) => {
    let table = byKeyMap.get(run.key);
    if (!table) {
      table = {
        index: tables.length + 1,
        key: run.key,
        ...tableFields(settings),
        settings: JSON.parse(JSON.stringify(settings)),
        meta: { seed: meta.seed, noise: meta.noise, traps: [...meta.traps] },
        runs: [],
      };
      tables.push(table);
      byKeyMap.set(run.key, table);
    }
    table.runs.push(run);
    return table;
  };
  return { tables: () => tables, byKey, nextRepeat, add };
}
```

In `assets/rolling-ball/results.js` delete the whole `export function createResults() { … }` block and put this right after the existing imports:

```js
import { createResults as createStore } from '../measure/results-store.js';

export const createResults = () => createStore({ tableFields: (s) => ({ level: s.level }) });
```

- [ ] **Step 5: Create the shared trap picker**

`assets/measure/traps.js`:

```js
import { hash32 } from './rng.js';

export const TRAP_REPEATS = 3;

// Slazds nostrādā tieši vienā no katras tabulas pirmajiem trim atkārtojumiem (kurā — nosaka sēkla).
export function trapRepeat(seed, key, name) {
  return 1 + (hash32(`${seed}|${key}|trap:${name}`) % TRAP_REPEATS);
}
```

In `assets/rolling-ball/experiment.js`:
- change `import { rngFor, gaussian, hash32 } from '../measure/rng.js';` to `import { rngFor, gaussian } from '../measure/rng.js';`
- add `import { TRAP_REPEATS, trapRepeat } from '../measure/traps.js';`
- delete the lines `export const TRAP_REPEATS = 3;` and the whole `export function trapRepeat(seed, key, name) { … }`
- add after the imports: `export { TRAP_REPEATS, trapRepeat };`

- [ ] **Step 6: Move the URL warning text**

Append to `assets/measure/url-params.js` and change its first line to `import { parseDecimal, formatNumber } from './format.js';`:

```js
export function formatParamValue(value, lang, t) {
  if (Array.isArray(value)) {
    return value.length ? value.map((x) => formatParamValue(x, lang, t)).join(lang === 'lv' ? '; ' : ', ') : t('url.none');
  }
  if (typeof value !== 'number') return String(value);
  const oneDecimal = Math.abs(value * 10 - Math.round(value * 10)) < 1e-9;
  const dec = Number.isInteger(value) ? 0 : oneDecimal ? 1 : 2;
  return formatNumber(value, dec, lang);
}

// Teksts `url.<reason>`: katrs brīdinājuma lauks ir mainīgais; skaitļi un saraksti — lapas valodas formātā.
export function warningText(w, { t, lang }) {
  const vars = {};
  for (const [k, v] of Object.entries(w)) {
    if (k === 'reason') continue;
    vars[k] = k === 'param' || k === 'raw' ? v : formatParamValue(v, lang, t);
  }
  if (w.reason === 'bad_list') vars.hint = t('url.listHint');
  return t(`url.${w.reason}`, vars);
}
```

Note: `allowed` is an array, so `formatParamValue` formats it exactly like K-01 did (`; ` in LV, `, ` in EN).

In `assets/rolling-ball/params.js`:
- change `import { formatNumber, roundTo } from '../measure/format.js';` to `import { roundTo } from '../measure/format.js';`
- delete the functions `fmt` and `warningText` at the end of the file
- add at the end: `export { warningText } from '../measure/url-params.js';`

- [ ] **Step 7: Run the whole suite**

Run: `npm test 2>&1 | tail -12`
Expected: PASS — all 105 old tests (they still import from `assets/rolling-ball/…`) plus the 5 new ones; `fail 0`.

- [ ] **Step 8: Browser check that K-01 is unchanged**

Start the server (see “How to verify”), open `http://localhost:8766/rolling-ball.html`. Check: no console errors except favicon; click `▶ PALAIST`; wait 4 s (`browser_wait_for` with time 4); the results block shows `1. tabula · mērījumi: 1`; press Tab until the `h` handle has focus (or `browser_evaluate` `document.querySelector('.handle').focus()`), press ArrowUp and see the h label change by 0,1 cm. Open `http://localhost:8766/rolling-ball.html?h=99&lock=1` — the notice about h being too large appears with the same text as before (`Saitē h = 99 cm ir par lielu renītei L = 80 cm (α ≤ 15°). Izmantots h = 20,7 cm.`).

- [ ] **Step 9: Commit**

```bash
git add -A assets/measure assets/rolling-ball tests/shared-measure.test.js
git commit -m "Move handles, results store, trap picker and URL warning text into shared modules

K-01 keeps re-exporting the same names, so its code and tests are unchanged.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Projectile physics and measuring-grid steps

**Files:**
- Create: `assets/physics/projectile.js`, `assets/measure/world-grid.js`
- Test: `tests/projectile-physics.test.js`, `tests/world-grid.test.js`

**Interfaces:**
- Produces: `velocity(v0, alphaRad) → { vx, vy }`; `positionAt({ g, h, vx, vy }, t) → { x, y }`; `landingTime({ g, h, vy }) → number ≥ 0`; `apexTime({ g, vy }) → number`; `apexHeight({ g, h, vy }) → number`. `niceStep(pxPerUnit, minPx) → number` (1, 2 or 5 × 10ⁿ); `ticks(lo, hi, step) → number[]`; `gridSteps(pxPerUnit, { labelPx = 40, minorPx = 6 }?) → { label, minor | null }`.

- [ ] **Step 1: Write the failing tests**

`tests/projectile-physics.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { velocity, positionAt, landingTime, apexTime, apexHeight } from '../assets/physics/projectile.js';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);

test('velocity components', () => {
  const v = velocity(10, 0);
  assert.equal(v.vx, 10);
  assert.equal(v.vy, 0);
  const w = velocity(10, Math.PI / 6);
  close(w.vx, 10 * Math.cos(Math.PI / 6));
  close(w.vy, 5);
});

test('position follows y = h + vy·t − g·t²/2 and x = vx·t', () => {
  const m = { g: 9.81, h: 20, vx: 3, vy: 4 };
  const p = positionAt(m, 1.5);
  close(p.x, 4.5);
  close(p.y, 20 + 6 - (9.81 * 2.25) / 2);
});

test('landing time is the positive root; 0 when already on the ground and not rising', () => {
  close(landingTime({ g: 9.81, h: 20, vy: 0 }), Math.sqrt(40 / 9.81));
  close(landingTime({ g: 981, h: 0, vy: 100 }), 200 / 981);
  assert.equal(landingTime({ g: 9.81, h: 0, vy: 0 }), 0);
  assert.equal(landingTime({ g: 9.81, h: 0, vy: -3 }), 0);
  const m = { g: 9.81, h: 12, vx: 0, vy: -5 };
  close(positionAt(m, landingTime(m)).y, 0, 1e-9);
});

test('apex', () => {
  close(apexTime({ g: 9.81, vy: 9.81 }), 1);
  assert.equal(apexTime({ g: 9.81, vy: -2 }), 0);
  close(apexHeight({ g: 9.81, h: 10, vy: 9.81 }), 10 + 9.81 / 2);
  assert.equal(apexHeight({ g: 9.81, h: 10, vy: 0 }), 10);
});
```

`tests/world-grid.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { niceStep, ticks, gridSteps } from '../assets/measure/world-grid.js';

test('niceStep picks the smallest 1/2/5 × 10ⁿ step that is at least minPx on screen', () => {
  assert.equal(niceStep(10, 40), 5);
  assert.equal(niceStep(4, 40), 10);
  assert.equal(niceStep(3, 40), 20);
  assert.equal(niceStep(100, 40), 0.5);
  assert.equal(niceStep(0.5, 40), 100);
});

test('ticks include both ends when they fall on the step and avoid float noise', () => {
  assert.deepEqual(ticks(0, 30, 10), [0, 10, 20, 30]);
  assert.deepEqual(ticks(-3, 12, 5), [0, 5, 10]);
  assert.deepEqual(ticks(0.1, 0.35, 0.1), [0.1, 0.2, 0.3]);
  assert.deepEqual(ticks(5, 4, 1), []);
});

test('gridSteps: minor divides label, or null', () => {
  assert.deepEqual(gridSteps(10), { label: 5, minor: 1 });
  assert.deepEqual(gridSteps(4), { label: 10, minor: 2 });
  assert.deepEqual(gridSteps(25), { label: 2, minor: 0.5 });
  assert.deepEqual(gridSteps(12), { label: 5, minor: 0.5 });
  const big = gridSteps(4, { labelPx: 88, minorPx: 13.2 });
  assert.equal(big.label, 50);
  assert.ok(big.minor === null || Number.isInteger(big.label / big.minor));
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test 2>&1 | tail -8`
Expected: FAIL — cannot find `assets/physics/projectile.js`.

- [ ] **Step 3: Implement**

`assets/physics/projectile.js`:

```js
// Ķermeņa kustība tikai smaguma spēka ietekmē, bez gaisa pretestības (spec. 5).
// Koordinātu sākumpunkts uz zemes zem izmešanas vietas, y ass uz augšu, izmešanas vieta (0; h).
// Visi lielumi vienās vienībās (cm un cm/s vai m un m/s).

export function velocity(v0, alphaRad) {
  return { vx: v0 * Math.cos(alphaRad), vy: v0 * Math.sin(alphaRad) };
}

export function positionAt({ g, h, vx, vy }, t) {
  return { x: vx * t, y: h + vy * t - (g * t * t) / 2 };
}

// Lielākā sakne vienādojumam h + vy·t − g·t²/2 = 0; 0, ja ķermenis jau ir uz zemes un nepaceļas.
export function landingTime({ g, h, vy }) {
  if (h <= 0 && vy <= 0) return 0;
  return (vy + Math.sqrt(vy * vy + 2 * g * h)) / g;
}

export function apexTime({ g, vy }) {
  return vy > 0 ? vy / g : 0;
}

export function apexHeight({ g, h, vy }) {
  return vy > 0 ? h + (vy * vy) / (2 * g) : h;
}
```

`assets/measure/world-grid.js`:

```js
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
```

- [ ] **Step 4: Run the suite**

Run: `npm test 2>&1 | tail -8`
Expected: PASS, `fail 0`.

- [ ] **Step 5: Commit**

```bash
git add assets/physics/projectile.js assets/measure/world-grid.js tests/projectile-physics.test.js tests/world-grid.test.js
git commit -m "Add projectile motion physics and measuring-grid steps (shared modules)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Scales and the settings model

**Files:**
- Create: `assets/projectile/scales.js`, `assets/projectile/model.js`
- Test: `tests/projectile-model.test.js`

**Interfaces:**
- Consumes: `velocity`, `landingTime`, `apexTime`, `apexHeight` (Task 2); `roundTo` from `assets/measure/format.js`.
- Produces (`scales.js`): `SCALES` (object keyed `table`, `tower`, fields below), `MODES = ['vertical','horizontal','oblique']`, `MODE_NUMBER = { vertical: 1, horizontal: 2, oblique: 3 }`, `ALPHA = { min: 0, max: 90, step: 1, default: 45 }`, `DT_ALL = [0.02, 0.05, 0.1, 0.2, 0.5]`, `TABLE_DRAW = { slab: 3, leg: 3 }`.
- Produces (`model.js`): `SLOW_FACTOR = 0.25`, `MIN_POSITIONS = 3`; `v0Range(scale, mode) → { min, max }`; `defaultSettings(scale = 'table', mode = 'horizontal') → Settings`; `withMode`, `withScale`, `withH`, `withV0`, `withAlpha`, `withDt`, `withSecond`, `withGrid`, `withSlow` (all `(s, value) → Settings`); `launchVelocity(s) → { vx, vy }`; `derive(s) → { sc, motion, vx, vy, tLand, xLand, tApex, yMax, positions, flight: 'ok' | 'none' | 'short' }`; `changedLocked(prev, next, locked: Set) → string[]`; `settingsKey(s, { noise, traps }) → string`.
- `Settings = { mode, scale, h, v0, alphaDeg, dt, second, grid, slow }` — h in the scale’s length unit, v0 in its unit per second (signed in mode `vertical`: + up), alphaDeg 0–90 (used only in `oblique`).

- [ ] **Step 1: Write the failing tests**

`tests/projectile-model.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCALES, MODES, ALPHA } from '../assets/projectile/scales.js';
import {
  defaultSettings, v0Range, withMode, withScale, withH, withV0, withAlpha, withDt, withSecond, withGrid, withSlow,
  launchVelocity, derive, changedLocked, settingsKey, MIN_POSITIONS,
} from '../assets/projectile/model.js';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);
const cfg = { noise: 1, traps: [] };

test('defaults: table, horizontal throw, h = 80 cm, v₀ = 150 cm/s, Δt = 0,05 s, slow on', () => {
  assert.deepEqual(defaultSettings(), {
    mode: 'horizontal', scale: 'table', h: 80, v0: 150, alphaDeg: 45, dt: 0.05, second: false, grid: true, slow: true,
  });
  assert.equal(defaultSettings('table', 'vertical').v0, 0);
  assert.equal(defaultSettings('tower', 'oblique').v0, 15);
  assert.deepEqual(MODES, ['vertical', 'horizontal', 'oblique']);
  assert.equal(ALPHA.default, 45);
});

test('scale switch resets h, v₀, Δt and slow to that scale; keeps mode, α, grid, second', () => {
  const s = withSecond(withAlpha(defaultSettings(), 30), true);
  const t = withScale(s, 'tower');
  assert.equal(t.scale, 'tower');
  assert.equal(t.h, 20);
  assert.equal(t.v0, 10);
  assert.equal(t.dt, 0.2);
  assert.equal(t.slow, false);
  assert.equal(t.mode, 'horizontal');
  assert.equal(t.alphaDeg, 30);
  assert.equal(t.second, true);
  assert.equal(withScale(t, 'tower'), t);
  assert.equal(withScale(t, 'moon'), t);
});

test('mode switch keeps |v₀|; vertical keeps the sign', () => {
  const up = withMode(defaultSettings(), 'vertical');
  assert.equal(up.v0, 150);
  const down = withV0(up, -100);
  assert.equal(down.v0, -100);
  assert.equal(withMode(down, 'horizontal').v0, 100);
  assert.equal(withMode(down, 'banana'), down);
  assert.deepEqual(v0Range('table', 'vertical'), { min: -400, max: 400 });
  assert.deepEqual(v0Range('tower', 'oblique'), { min: 0, max: 30 });
});

test('setters round to the step and clamp to the range', () => {
  const s = defaultSettings();
  assert.equal(withH(s, 200).h, 150);
  assert.equal(withH(s, -5).h, 0);
  assert.equal(withH(s, 80.4).h, 80);
  assert.equal(withH(withScale(s, 'tower'), 12.3).h, 12.5);
  assert.equal(withV0(s, -50).v0, 0);
  assert.equal(withV0(s, 152).v0, 150);
  assert.equal(withV0(s, 401).v0, 400);
  assert.equal(withV0(withMode(s, 'vertical'), -401).v0, -400);
  assert.equal(withAlpha(s, 91).alphaDeg, 90);
  assert.equal(withAlpha(s, 44.6).alphaDeg, 45);
  assert.equal(withDt(s, 0.2), s, 'Δt 0,2 s is not a table option');
  assert.equal(withDt(s, 0.02).dt, 0.02);
  assert.equal(withGrid(s, 0).grid, false);
  assert.equal(withSlow(s, false).slow, false);
});

test('launch velocity per mode', () => {
  assert.deepEqual(launchVelocity(withV0(withMode(defaultSettings(), 'vertical'), -100)), { vx: 0, vy: -100 });
  assert.deepEqual(launchVelocity(defaultSettings()), { vx: 150, vy: 0 });
  const o = launchVelocity(withAlpha(withMode(defaultSettings(), 'oblique'), 30));
  close(o.vx, 150 * Math.cos(Math.PI / 6));
  close(o.vy, 75);
});

test('derive: horizontal throw from the table', () => {
  const d = derive(defaultSettings());
  close(d.tLand, Math.sqrt(160 / 981));
  close(d.xLand, 150 * Math.sqrt(160 / 981));
  assert.equal(d.positions, 9);
  assert.equal(d.flight, 'ok');
  assert.equal(d.sc, SCALES.table);
  assert.equal(d.yMax, 80);
});

test('derive: no flight and too short a flight (Review Focus 2)', () => {
  const s = defaultSettings();
  assert.equal(derive(withH(s, 0)).flight, 'none');
  const v = withMode(s, 'vertical');
  assert.equal(derive(withV0(withH(v, 0), 0)).flight, 'none');
  assert.equal(derive(withV0(withH(v, 0), -50)).flight, 'none');
  assert.equal(derive(withV0(withH(v, 0), 100)).flight, 'ok');
  const o = withMode(s, 'oblique');
  assert.equal(derive(withAlpha(withH(o, 0), 0)).flight, 'none');
  assert.equal(derive(withV0(withH(o, 0), 0)).flight, 'none');
  const tower = withDt(withH(withScale(s, 'tower'), 1), 0.5);
  assert.equal(derive(tower).positions, 1);
  assert.equal(derive(tower).flight, 'short');
  assert.equal(MIN_POSITIONS, 3);
});

test('derive: apex of an upward throw', () => {
  const d = derive(withV0(withMode(defaultSettings(), 'vertical'), 200));
  close(d.tApex, 200 / 981);
  close(d.yMax, 80 + (200 * 200) / (2 * 981));
});

test('settingsKey: only what changes the data', () => {
  const s = defaultSettings();
  const k = settingsKey(s, cfg);
  assert.equal(settingsKey(withGrid(s, false), cfg), k);
  assert.equal(settingsKey(withSecond(s, true), cfg), k);
  assert.equal(settingsKey(withSlow(s, false), cfg), k);
  assert.equal(settingsKey(withAlpha(s, 10), cfg), k, 'α does not matter outside the oblique mode');
  assert.notEqual(settingsKey(withH(s, 81), cfg), k);
  assert.notEqual(settingsKey(withScale(s, 'tower'), cfg), k);
  assert.notEqual(settingsKey(s, { noise: 0, traps: [] }), k);
  assert.notEqual(settingsKey(s, { noise: 1, traps: ['late'] }), k);
  const o = withMode(s, 'oblique');
  assert.notEqual(settingsKey(withAlpha(o, 30), cfg), settingsKey(o, cfg));
});

test('changedLocked lists locked values a change would alter (also indirectly)', () => {
  const s = defaultSettings();
  const locked = new Set(['h', 'dt']);
  assert.deepEqual(changedLocked(s, withScale(s, 'tower'), locked), ['h', 'dt']);
  assert.deepEqual(changedLocked(s, withV0(s, 200), locked), []);
  assert.deepEqual(changedLocked(s, withGrid(s, false), new Set(['grid'])), ['grid']);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test 2>&1 | tail -8`
Expected: FAIL — cannot find `assets/projectile/scales.js`.

- [ ] **Step 3: Implement `assets/projectile/scales.js`**

```js
// Divi mērogi (spec. 8.4): galds klasē (cm) un tornis (m). Visi lielumi mēroga vienībās.
export const SCALES = {
  table: {
    unit: 'cm',
    g: 981, // cm/s²
    h: { min: 0, max: 150, step: 1, decimals: 0 },
    v0: { max: 400, step: 5, decimals: 0 },
    dtOptions: [0.02, 0.05, 0.1], // galda kritiens ilgst ~0,4 s, tāpēc Δt mazāks nekā tornim
    defaults: { h: 80, dt: 0.05, slow: true, v0: { vertical: 0, horizontal: 150, oblique: 250 } },
    ball: { d: 1.0, material: 'steel' }, // tērauda lodīte Ø 10 mm; x, y — tās centrs
    structureW: 60, // galda virsmas garums zīmējumā
    minView: { w: 100, h: 100 }, // mazākais redzamais laukums rasējumā
    read: { sigma: 0.15, max: 0.25, resolution: 0.5, decimals: 1 }, // x, y nolasīšana tabulā
    frame: 1 / 60, // s, viens video kadrs
    exportPx: { pref: 30, min: 10 }, // PNG px uz cm
    strobeSpacing: 3, // cm — vertikālajā sviedienā pozīcijas nobīda pa labi (spec. 8.2)
  },
  tower: {
    unit: 'm',
    g: 9.81,
    h: { min: 0, max: 50, step: 0.5, decimals: 1 },
    v0: { max: 30, step: 0.5, decimals: 1 },
    dtOptions: [0.1, 0.2, 0.5],
    defaults: { h: 20, dt: 0.2, slow: false, v0: { vertical: 0, horizontal: 10, oblique: 15 } },
    ball: { d: 0.22, material: 'plastic' }, // bumba Ø 22 cm
    structureW: 5,
    minView: { w: 30, h: 30 },
    read: { sigma: 0.03, max: 0.05, resolution: 0.1, decimals: 1 },
    frame: 1 / 30,
    exportPx: { pref: 60, min: 20 }, // PNG px uz m
    strobeSpacing: 0.6,
  },
};

export const MODES = ['vertical', 'horizontal', 'oblique'];
export const MODE_NUMBER = { vertical: 1, horizontal: 2, oblique: 3 };
export const ALPHA = { min: 0, max: 90, step: 1, default: 45 };
export const DT_ALL = [0.02, 0.05, 0.1, 0.2, 0.5];
export const TABLE_DRAW = { slab: 3, leg: 3 }; // cm: galda virsmas biezums un kāju platums zīmējumā
```

- [ ] **Step 4: Implement `assets/projectile/model.js`**

```js
import { SCALES, MODES, ALPHA } from './scales.js';
import { roundTo } from '../measure/format.js';
import { velocity, landingTime, apexTime, apexHeight } from '../physics/projectile.js';

export const SLOW_FACTOR = 0.25;
export const MIN_POSITIONS = 3; // stroboskopā vismaz pozīcijas 0, 1, 2

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const toRad = (deg) => (deg * Math.PI) / 180;

export function v0Range(scale, mode) {
  const max = SCALES[scale].v0.max;
  return { min: mode === 'vertical' ? -max : 0, max };
}

export function defaultSettings(scale = 'table', mode = 'horizontal') {
  const sc = SCALES[scale];
  return {
    mode,
    scale,
    h: sc.defaults.h,
    v0: sc.defaults.v0[mode],
    alphaDeg: ALPHA.default,
    dt: sc.defaults.dt,
    second: false,
    grid: true,
    slow: sc.defaults.slow,
  };
}

export function withMode(s, mode) {
  if (!MODES.includes(mode)) return s;
  const r = v0Range(s.scale, mode);
  const v0 = clamp(mode === 'vertical' ? s.v0 : Math.abs(s.v0), r.min, r.max);
  return { ...s, mode, v0 };
}

// cm un m nav salīdzināmi, tāpēc h, v₀, Δt un palēninājums kļūst par jaunā mēroga noklusējumiem.
export function withScale(s, scale) {
  if (!(scale in SCALES) || scale === s.scale) return s;
  const d = defaultSettings(scale, s.mode);
  return { ...s, scale, h: d.h, v0: d.v0, dt: d.dt, slow: d.slow };
}

export function withH(s, h) {
  const r = SCALES[s.scale].h;
  return { ...s, h: clamp(roundTo(h, r.step), r.min, r.max) };
}

export function withV0(s, v0) {
  const r = v0Range(s.scale, s.mode);
  return { ...s, v0: clamp(roundTo(v0, SCALES[s.scale].v0.step), r.min, r.max) };
}

export function withAlpha(s, alphaDeg) {
  return { ...s, alphaDeg: clamp(roundTo(alphaDeg, ALPHA.step), ALPHA.min, ALPHA.max) };
}

export function withDt(s, dt) {
  return SCALES[s.scale].dtOptions.includes(dt) ? { ...s, dt } : s;
}

export const withSecond = (s, on) => ({ ...s, second: Boolean(on) });
export const withGrid = (s, on) => ({ ...s, grid: Boolean(on) });
export const withSlow = (s, on) => ({ ...s, slow: Boolean(on) });

export function launchVelocity(s) {
  if (s.mode === 'vertical') return { vx: 0, vy: s.v0 };
  if (s.mode === 'horizontal') return { vx: s.v0, vy: 0 };
  return velocity(s.v0, toRad(s.alphaDeg));
}

// Patiesās vērtības bez trokšņa: tikai rasējuma izkārtojumam un pārbaudēm — skolēnam tās nerāda.
export function derive(s) {
  const sc = SCALES[s.scale];
  const { vx, vy } = launchVelocity(s);
  const motion = { g: sc.g, h: s.h, vx, vy };
  const tLand = landingTime(motion);
  const positions = tLand > 0 ? Math.floor(tLand / s.dt + 1e-9) + 1 : 0;
  let flight = 'ok';
  if (tLand === 0) flight = 'none';
  else if (positions < MIN_POSITIONS) flight = 'short';
  return {
    sc,
    motion,
    vx,
    vy,
    tLand,
    xLand: vx * tLand,
    tApex: apexTime(motion),
    yMax: apexHeight(motion),
    positions,
    flight,
  };
}

const SAME = (a, b) => Math.abs(a - b) < 1e-9;
const FIELD_SAME = {
  mode: (p, n) => p.mode === n.mode,
  scale: (p, n) => p.scale === n.scale,
  h: (p, n) => SAME(p.h, n.h),
  v0: (p, n) => SAME(p.v0, n.v0),
  alpha: (p, n) => SAME(p.alphaDeg, n.alphaDeg),
  dt: (p, n) => p.dt === n.dt,
  second: (p, n) => p.second === n.second,
  grid: (p, n) => p.grid === n.grid,
};

// Nofiksētie lielumi (saitē), kurus `next` atšķir no `prev`.
export function changedLocked(prev, next, locked) {
  return Object.keys(FIELD_SAME).filter((k) => locked.has(k) && !FIELD_SAME[k](prev, next));
}

// Viss, kas ietekmē datus. Mērrežģis, otrā bumbiņa un palēninājums datus nemaina.
export function settingsKey(s, { noise, traps }) {
  const parts = [s.scale, s.mode, `h${s.h}`, `v${s.v0}`];
  if (s.mode === 'oblique') parts.push(`a${s.alphaDeg}`);
  parts.push(`dt${s.dt}`, `n${noise}`, `tr${[...traps].sort().join('+')}`);
  return parts.join(';');
}
```

- [ ] **Step 5: Run the suite**

Run: `npm test 2>&1 | tail -8`
Expected: PASS, `fail 0`.

- [ ] **Step 6: Commit**

```bash
git add assets/projectile/scales.js assets/projectile/model.js tests/projectile-model.test.js
git commit -m "Add K-02 scales (table, tower) and the settings model

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: One run — true motion plus measurement noise

**Files:**
- Create: `assets/projectile/experiment.js`
- Test: `tests/projectile-experiment.test.js`

**Interfaces:**
- Consumes: `derive`, `launchVelocity`, `settingsKey` (Task 3); `SCALES` (Task 3); `positionAt`, `landingTime` (Task 2); `rngFor`, `gaussian` from `assets/measure/rng.js`; `roundTo`; `trapRepeat` (Task 1).
- Produces: `NOISE`; `simulateRun(settings, { seed, repeat, noise, traps }) → Run`.
- `Run` when the flight is not measurable: `{ ok: false, reason: 'none' | 'short', key, repeat }`.
- `Run` otherwise: `{ ok: true, key, repeat, mode, scale, tEnd, posAt(t) → {x, y}, posAt2: ((t) → {x, y}) | null, samples: [{ n, t, x, y }], strobe: [{ n, t, x, y }], strobe2: [{ n, t, x, y }] | null, truth: { v0Run, alphaRun, tau, traps: string[] } }`. `samples` are the rounded readings for the table (mode `vertical`: `x` is always 0 and is not shown); `strobe` are the true positions at the flash times (no reading noise); `strobe2`/`posAt2` exist only in mode `horizontal` with `second: true` (a ball dropped from the launch point at the same moment). `posAt(t)` for t ≤ 0 is the launch point, for t ≥ landing the landing point with y = 0.

- [ ] **Step 1: Write the failing tests**

`tests/projectile-experiment.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateRun, NOISE } from '../assets/projectile/experiment.js';
import { defaultSettings, derive, withMode, withScale, withH, withV0, withAlpha, withDt, withSecond, settingsKey } from '../assets/projectile/model.js';
import { SCALES } from '../assets/projectile/scales.js';
import { roundTo } from '../assets/measure/format.js';
import { trapRepeat } from '../assets/measure/traps.js';

const close = (a, b, tol = 1e-9, msg = '') => assert.ok(Math.abs(a - b) <= tol, `${msg} ${a} vs ${b}`);
const opts = (o = {}) => ({ seed: 482913, repeat: 1, noise: 1, traps: [], ...o });

test('criterion 1 — noise 0: y = h + v₀t − gt²/2 exactly, x linear, table = rounded truth', () => {
  const s = defaultSettings();
  const run = simulateRun(s, opts({ noise: 0 }));
  assert.equal(run.ok, true);
  assert.equal(run.truth.tau, 0);
  assert.equal(run.strobe.length, derive(s).positions);
  run.strobe.forEach((p, i) => {
    close(p.t, i * 0.05, 1e-12);
    close(p.x, 150 * p.t);
    close(p.y, 80 - (981 * p.t * p.t) / 2);
    assert.equal(run.samples[i].x, roundTo(p.x, 0.5));
    assert.equal(run.samples[i].y, roundTo(p.y, 0.5));
  });
  close(run.tEnd, derive(s).tLand);
});

test('criterion 2 — free fall: Δy in equal intervals is 1 : 3 : 5 : 7', () => {
  const s = withH(withMode(withV0(defaultSettings(), 0), 'vertical'), 150);
  const p = simulateRun(s, opts({ noise: 0 })).strobe;
  const d = [1, 2, 3, 4].map((i) => p[i - 1].y - p[i].y);
  close(d[1] / d[0], 3);
  close(d[2] / d[0], 5);
  close(d[3] / d[0], 7);
  assert.ok(p.every((q) => q.x === 0));
});

test('criterion 2 — upward throw: time to the top is v₀/g', () => {
  const s = withV0(withMode(defaultSettings(), 'vertical'), 200);
  close(derive(s).tApex, 200 / 981);
  const tower = withV0(withMode(withScale(defaultSettings(), 'tower'), 'vertical'), 9.5);
  close(derive(tower).tApex, 9.5 / 9.81);
});

test('criterion 3 — horizontal throw: flight time √(2h/g) does not depend on v₀', () => {
  const s = defaultSettings();
  for (const v of [50, 150, 300]) close(derive(withV0(s, v)).tLand, Math.sqrt((2 * 80) / 981));
});

test('criterion 4 — oblique throw from the ground: longest range at 45°, 30° and 60° equal', () => {
  const base = withH(withV0(withMode(withScale(defaultSettings(), 'tower'), 'oblique'), 20), 0);
  const range = (a) => derive(withAlpha(base, a)).xLand;
  assert.ok(range(45) > range(44));
  assert.ok(range(45) > range(46));
  close(range(30), range(60), 1e-9);
});

test('same seed + settings + repeat → identical data; another repeat → other data (Review Focus 3)', () => {
  const s = defaultSettings();
  const a = simulateRun(s, opts());
  const b = simulateRun(s, opts());
  assert.deepEqual(a.samples, b.samples);
  assert.deepEqual(a.truth, b.truth);
  const c = simulateRun(s, opts({ repeat: 2 }));
  assert.notDeepEqual(a.samples, c.samples);
});

test('data do not depend on animation frames (Review Focus 4)', () => {
  const s = defaultSettings();
  const run = simulateRun(s, opts());
  const again = simulateRun(s, opts());
  for (const t of [0, 0.013, 0.2, run.tEnd]) assert.deepEqual(run.posAt(t), again.posAt(t));
  assert.deepEqual(run.posAt(-1), { x: 0, y: 80 });
  close(run.posAt(run.tEnd + 5).y, 0);
});

test('v₀ varies about 1 % between runs; α only in the oblique mode', () => {
  const s = withMode(defaultSettings(), 'oblique');
  const rel = [];
  for (let r = 1; r <= 400; r++) {
    const run = simulateRun(s, opts({ repeat: r }));
    rel.push(run.truth.v0Run / s.v0 - 1);
  }
  const mean = rel.reduce((a, b) => a + b, 0) / rel.length;
  const sd = Math.sqrt(rel.reduce((a, b) => a + (b - mean) ** 2, 0) / rel.length);
  assert.ok(sd > 0.007 && sd < 0.013, `sd ${sd}`);
  assert.equal(NOISE.v0Rel, 0.01);
  const h = simulateRun(defaultSettings(), opts());
  assert.equal(h.truth.alphaRun, defaultSettings().alphaDeg);
});

test('table and strobe agree within the reading resolution at noise 1', () => {
  for (const s of [defaultSettings(), withScale(withMode(defaultSettings(), 'oblique'), 'tower')]) {
    const sc = SCALES[s.scale];
    for (let r = 1; r <= 20; r++) {
      const run = simulateRun(s, opts({ repeat: r }));
      run.samples.forEach((q, i) => {
        const p = run.strobe[i];
        assert.ok(Math.abs(q.y - p.y) <= sc.read.max + sc.read.resolution / 2 + 1e-9);
        assert.ok(Math.abs(q.x - p.x) <= sc.read.max + sc.read.resolution / 2 + 1e-9);
      });
    }
  }
});

test('no flight / too short → ok: false with the reason, nothing else (Review Focus 2)', () => {
  const none = simulateRun(withH(defaultSettings(), 0), opts());
  assert.equal(none.ok, false);
  assert.equal(none.reason, 'none');
  const short = simulateRun(withDt(withH(withScale(defaultSettings(), 'tower'), 1), 0.5), opts());
  assert.equal(short.ok, false);
  assert.equal(short.reason, 'short');
  assert.equal('samples' in short, false);
});

test('trap “late”: exactly one of the first three repeats starts 2–3 frames late', () => {
  const s = defaultSettings();
  const key = settingsKey(s, { noise: 0, traps: ['late'] });
  const frame = SCALES.table.frame;
  const taus = [1, 2, 3].map((r) => simulateRun(s, opts({ noise: 0, traps: ['late'], repeat: r })).truth.tau);
  assert.equal(taus.filter((x) => x > 0).length, 1);
  const k = trapRepeat(482913, key, 'late');
  const tau = taus[k - 1];
  assert.ok(Math.abs(tau - 2 * frame) < 1e-12 || Math.abs(tau - 3 * frame) < 1e-12, `tau ${tau}`);
  assert.deepEqual(simulateRun(s, opts({ noise: 0, traps: ['late'], repeat: k })).truth.traps, ['late']);
});

test('second ball (horizontal): drops from the launch point and lands at the same time', () => {
  const s = withSecond(defaultSettings(), true);
  const run = simulateRun(s, opts({ noise: 0 }));
  assert.equal(run.strobe2.length, run.strobe.length);
  run.strobe2.forEach((p, i) => {
    assert.equal(p.x, 0);
    close(p.y, run.strobe[i].y);
  });
  assert.equal(simulateRun(withMode(s, 'oblique'), opts()).strobe2, null);
  assert.equal(simulateRun(defaultSettings(), opts()).posAt2, null);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test 2>&1 | tail -8`
Expected: FAIL — cannot find `assets/projectile/experiment.js`.

- [ ] **Step 3: Implement `assets/projectile/experiment.js`**

```js
// Viena palaišana: patiesā kustība + mērījuma troksnis (spec. 2; kā lodītes spec. 6, 3. līmenis).
// „±” vērtības ≈ 2σ. Nolasīšanas kļūdu nogriež pie read.max × intensitāte, tāpēc tabula un
// stroboskops sakrīt read.max + read.resolution/2 robežās pie intensitātes 1.
import { derive, launchVelocity, settingsKey } from './model.js';
import { SCALES } from './scales.js';
import { positionAt, landingTime } from '../physics/projectile.js';
import { rngFor, gaussian } from '../measure/rng.js';
import { roundTo } from '../measure/format.js';
import { trapRepeat } from '../measure/traps.js';

export const NOISE = {
  v0Rel: 0.01, // σ no v₀ starp palaišanām (relatīvi)
  alphaDeg: 0.3, // σ leņķim slīpajā sviedienā, grādi
  startFrames: 1, // sākuma kadra nobīde: vesels skaitlis −1…1 kadrs (× intensitāte)
  lateFrames: [2, 3], // slazds „late”: sākuma kadrs 2–3 kadrus par vēlu
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const MAX_SAMPLES = 10000;

function motionPath(g, h, vx, vy) {
  const motion = { g, h, vx, vy };
  const tLand = landingTime(motion);
  const at = (t) => {
    if (t <= 0) return { x: 0, y: h };
    if (t >= tLand) return { x: vx * tLand, y: 0 };
    return positionAt(motion, t);
  };
  return { tLand, at };
}

export function simulateRun(settings, { seed, repeat, noise, traps }) {
  const d = derive(settings);
  const key = settingsKey(settings, { noise, traps });
  if (d.flight !== 'ok') return { ok: false, reason: d.flight, key, repeat };

  const sc = SCALES[settings.scale];
  const k = noise;
  const rand = rngFor(seed, key, repeat);
  const v0Run = settings.v0 * (1 + k * NOISE.v0Rel * gaussian(rand));
  const alphaRun = settings.mode === 'oblique' ? clamp(settings.alphaDeg + k * NOISE.alphaDeg * gaussian(rand), 0, 90) : settings.alphaDeg;
  const { vx, vy } = launchVelocity({ ...settings, v0: v0Run, alphaDeg: alphaRun });
  const main = motionPath(sc.g, settings.h, vx, vy);
  const second = settings.mode === 'horizontal' && settings.second ? motionPath(sc.g, settings.h, 0, 0) : null;

  const late = traps.includes('late') && repeat === trapRepeat(seed, key, 'late');
  const shift = Math.floor(rand() * (2 * NOISE.startFrames + 1)) - NOISE.startFrames;
  const [lo, hi] = NOISE.lateFrames;
  const lateFrames = late ? lo + Math.floor(rand() * (hi - lo + 1)) : 0;
  const tauRaw = (Math.round(k * shift) + lateFrames) * sc.frame;
  const tau = tauRaw === 0 ? 0 : tauRaw;

  const maxErr = k * sc.read.max;
  const readErr = () => clamp(k * sc.read.sigma * gaussian(rand), -maxErr, maxErr);
  const vertical = settings.mode === 'vertical';
  const samples = [];
  const strobe = [];
  const strobe2 = second ? [] : null;
  for (let n = 0; n < MAX_SAMPLES; n++) {
    const tf = n * settings.dt;
    const tPhys = tf + tau;
    if (tPhys > main.tLand + 1e-12) break;
    const t = roundTo(tf, settings.dt);
    const p = main.at(tPhys);
    strobe.push({ n, t, x: p.x, y: p.y });
    if (second) strobe2.push({ n, t, ...second.at(tPhys) });
    const x = vertical ? 0 : roundTo(p.x + readErr(), sc.read.resolution);
    const y = roundTo(p.y + readErr(), sc.read.resolution);
    samples.push({ n, t, x, y });
  }

  return {
    ok: true,
    key,
    repeat,
    mode: settings.mode,
    scale: settings.scale,
    tEnd: second ? Math.max(main.tLand, second.tLand) : main.tLand,
    posAt: main.at,
    posAt2: second ? second.at : null,
    samples,
    strobe,
    strobe2,
    truth: { v0Run, alphaRun, tau, traps: late ? ['late'] : [] },
  };
}
```

- [ ] **Step 4: Run the suite**

Run: `npm test 2>&1 | tail -8`
Expected: PASS, `fail 0`. If the 1 : 3 : 5 : 7 test fails, check that mode `vertical` uses `{ vx: 0, vy: v0 }` (not `velocity(v0, 90°)`).

- [ ] **Step 5: Commit**

```bash
git add assets/projectile/experiment.js tests/projectile-experiment.test.js
git commit -m "Add K-02 runs: analytic motion, v₀/α spread, start-frame offset, reading noise, late trap, second ball

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Texts (LV and EN)

**Files:**
- Create: `assets/projectile/i18n.js`
- Test: `tests/projectile-i18n.test.js`

**Interfaces:**
- Produces: `STRINGS = { lv: {…}, en: {…} }` with exactly the keys below. Later tasks use these keys; the dynamic families are `mode.<m>`, `mode.<m>.name`, `mode.<m>.hint`, `scale.<k>`, `set.mode.<m>`, `set.scale.<k>`, `notice.noFlight.<m>`, `lock.<k>` for `<m>` ∈ MODES, `<k>` ∈ table/tower and lock keys mode/scale/second/grid.

- [ ] **Step 1: Write the failing test**

`tests/projectile-i18n.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { STRINGS } from '../assets/projectile/i18n.js';
import { MODES, SCALES } from '../assets/projectile/scales.js';

test('LV and EN have exactly the same keys', () => {
  assert.deepEqual(Object.keys(STRINGS.lv).sort(), Object.keys(STRINGS.en).sort());
});

test('typography: no straight quotes, no "...", no spaced hyphen', () => {
  for (const lang of ['lv', 'en']) {
    for (const [k, v] of Object.entries(STRINGS[lang])) {
      assert.ok(!v.includes('"'), `${lang}.${k} has a straight double quote`);
      assert.ok(!v.includes("'"), `${lang}.${k} has a straight apostrophe`);
      assert.ok(!v.includes('...'), `${lang}.${k} has three dots`);
      assert.ok(!/ - /.test(v), `${lang}.${k} has a spaced hyphen`);
    }
  }
});

test('dynamic key families exist', () => {
  const need = [];
  for (const m of MODES) need.push(`mode.${m}`, `mode.${m}.name`, `mode.${m}.hint`, `set.mode.${m}`, `notice.noFlight.${m}`);
  for (const k of Object.keys(SCALES)) need.push(`scale.${k}`, `set.scale.${k}`);
  for (const k of ['mode', 'scale', 'second', 'grid']) need.push(`lock.${k}`);
  for (const r of ['not_number', 'out_of_range', 'not_allowed', 'h_clamped', 'v0_clamped', 'dt_scale', 'none']) need.push(`url.${r}`);
  for (const key of need) assert.ok(key in STRINGS.lv, `missing ${key}`);
});

test('every literal t(…) key in assets/projectile/*.js exists', () => {
  const dir = new URL('../assets/projectile/', import.meta.url);
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.js') && x !== 'i18n.js')) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    for (const m of src.matchAll(/\bt\('([a-zA-Z0-9_.]+)'/g)) assert.ok(m[1] in STRINGS.lv, `${f}: missing ${m[1]}`);
  }
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test 2>&1 | tail -8`
Expected: FAIL — cannot find `assets/projectile/i18n.js`.

- [ ] **Step 3: Implement `assets/projectile/i18n.js`**

```js
export const STRINGS = {
  lv: {
    'page.title': 'Kritieni un sviedieni — FIZ-SIM',
    'page.heading': 'KRITIENI UN SVIEDIENI',
    'page.back': '← SARAKSTS',
    'tb.set': 'KOMPLEKTS',
    'tb.sheet': 'LAPA',
    'tb.topic': 'TĒMA',
    'tb.langTheme': 'VALODA / TĒMA',
    'tb.topicValue': 'KINEMĀTIKA',
    'tb.themeToggle': 'Pārslēgt gaišo un tumšo režīmu',

    'blk.mode': 'REŽĪMS',
    'mode.vertical': '1 · ↕',
    'mode.horizontal': '2 · →',
    'mode.oblique': '3 · ↗',
    'mode.vertical.name': 'Kritiens un vertikālais sviediens',
    'mode.horizontal.name': 'Horizontālais sviediens',
    'mode.oblique.name': 'Slīpais sviediens',
    'mode.vertical.hint': 'Kritiens un vertikālais sviediens. Bultu v₀ velc uz augšu vai uz leju; ja v₀ = 0, bumbiņa krīt brīvi.',
    'mode.horizontal.hint': 'Horizontālais sviediens: bumbiņa sāk kustību horizontāli ar ātrumu v₀.',
    'mode.oblique.hint': 'Slīpais sviediens: bumbiņu met ar ātrumu v₀ leņķī α pret horizontu.',
    'dt.label': 'Δt',
    'slow': 'PALĒNINĀT ×0,25',
    'second': 'OTRA BUMBIŅA KRĪT VIENLAIKUS',

    'blk.dims': 'IZMĒRI',
    'scale.label': 'MĒROGS',
    'scale.table': 'GALDS · cm',
    'scale.tower': 'TORNIS · m',
    'dims.hint': 'Velc rasējumā izmēru līniju h un bultas galu v₀ (slīpajā sviedienā arī α uz loka). Precīzāk — ar bultiņu taustiņiem vai pogām − un +.',
    'dims.h': 'Izmešanas augstums h',
    'dims.v0': 'Sākuma ātrums v₀',
    'dims.alpha': 'Izmešanas leņķis α',
    'dims.fixed': 'FIKS.',
    'dims.fixedTitle': 'Šo lielumu skolotājs ir nofiksējis saitē.',
    'dims.decrease': 'Samazināt: {name}',
    'dims.increase': 'Palielināt: {name}',
    'dir.up': 'uz augšu',
    'dir.down': 'uz leju',
    'grid': 'RĀDĪT MĒRREŽĢI',

    'run.start': '▶ PALAIST',
    'run.repeat': '↻ ATKĀRTOT',
    'run.running': 'BUMBIŅA LIDO…',

    'blk.results': 'REZULTĀTI',
    'results.none': 'Ar šiem iestatījumiem vēl nav mērījumu. Nospied PALAIST.',
    'results.option': '{n}. tabula · mērījumi: {m}',
    'results.other': 'Rādīta {n}. tabula — tās iestatījumi atšķiras no pašreizējiem.',
    'results.table': 'DATU TABULA',
    'results.strobe': 'STROBOSKOPS',

    'scene.origin': 'x = 0; y = 0',
    'scene.launch': 'KUSTĪBAS SĀKUMPUNKTS',
    'scene.originLaunch': 'x = 0; y = 0 — KUSTĪBAS SĀKUMPUNKTS',
    'scene.aria': 'Sānskata rasējums: galds vai tornis, bumbiņa, sākuma ātruma bulta un mērrežģis.',

    'table.verticalTitle': '{n}. tabula. Bumbiņas koordināta y atkarībā no laika t',
    'table.planeTitle': '{n}. tabula. Bumbiņas koordinātas x un y atkarībā no laika t',
    'col.t': 't, s',
    'col.xN': 'x{i}, {u}',
    'col.yN': 'y{i}, {u}',
    'col.err': '(±{e} {u})',
    'set.prefix': 'Iestatījumi: ',
    'set.mode.vertical': 'kritiens vai vertikālais sviediens',
    'set.mode.horizontal': 'horizontālais sviediens',
    'set.mode.oblique': 'slīpais sviediens',
    'set.scale.table': 'galds',
    'set.scale.tower': 'tornis',
    'set.h': 'h = {v} {u}',
    'set.v0': 'v₀ = {v} {u}',
    'set.v0Up': 'v₀ = {v} {u} uz augšu',
    'set.v0Down': 'v₀ = {v} {u} uz leju',
    'set.v0Zero': 'v₀ = 0 (brīvā krišana)',
    'set.alpha': 'α = {v}°',
    'set.dt': 'Δt = {v} s',
    'set.seed': 'sēkla {v}',

    'data.copy': 'KOPĒT',
    'data.csv': 'LEJUPIELĀDĒT CSV',
    'data.close': 'AIZVĒRT ✕',
    'data.copied': 'Nokopēts. Ielīmē Excel vai Google Sheets.',
    'data.copyFailed': 'Pārlūks neļāva piekļūt starpliktuvei. Datorā iezīmē tabulu ar peli un kopē ar Ctrl+C (Mac: ⌘+C); telefonā izmanto LEJUPIELĀDĒT CSV.',

    'strobe.title': 'STROBOSKOPS',
    'strobe.caption': 'Stroboskops · Δt = {dt} s · {n}. tabula, {r}. mērījums',
    'strobe.run': 'MĒRĪJUMS',
    'strobe.zoomIn': 'Tuvināt',
    'strobe.zoomOut': 'Tālināt',
    'strobe.fit': 'VISS',
    'strobe.export': 'EKSPORTĒT ATTĒLU',
    'strobe.hint': 'Tuvini ar peles ritenīti vai diviem pirkstiem, pārvieto, velkot ar peli vai pirkstu.',
    'strobe.verticalNote': 'Pozīcijas nobīdītas pa labi pēc kārtas, kā uz laika ass. Bumbiņa kustas tikai vertikāli.',
    'strobe.secondNote': 'Tukšie apļi — otra bumbiņa, kas tajā pašā brīdī sāk krist no tā paša augstuma.',
    'strobe.exportFailed': 'Attēlu neizdevās izveidot: šī ierīce neļauj tik lielu attēlu ({w} × {h} px). Mēģini datorā vai ar mazāku h vai v₀.',

    'notice.close': 'Aizvērt paziņojumu',
    'notice.noFlight.vertical': 'Bumbiņa jau ir uz zemes (h = 0) un nepaceļas. Palielini h vai met uz augšu (v₀ > 0).',
    'notice.noFlight.horizontal': 'No zemes (h = 0) horizontāli mesta bumbiņa uzreiz ir uz zemes. Palielini h.',
    'notice.noFlight.oblique': 'Bumbiņa no zemes (h = 0) nepaceļas, jo v₀ = 0 vai α = 0. Palielini v₀, α vai h.',
    'notice.short': 'Lidojums ir par īsu: stroboskopā būtu mazāk nekā 3 pozīcijas. Izvēlies mazāku Δt vai palielini h vai v₀.',
    'lockConflict': 'Šādi mainīt nevar: tas izmainītu saitē nofiksēto lielumu ({names}).',
    'lock.mode': 'režīms',
    'lock.scale': 'mērogs',
    'lock.second': 'otra bumbiņa',
    'lock.grid': 'mērrežģis',
    'url.not_number': 'Saites parametrs {param}={raw} nav skaitlis. Izmantots {param} = {used}.',
    'url.out_of_range': 'Saites parametrs {param}={raw} ir ārpus robežām ({min}–{max}). Izmantots {param} = {used}.',
    'url.not_allowed': 'Saites parametra {param} vērtība “{raw}” nav atļauta. Atļautās vērtības: {allowed}. Izmantots {param} = {used}.',
    'url.h_clamped': 'Saitē h = {raw} {unit} ir par lielu šim mērogam (h ≤ {max} {unit}). Izmantots h = {used} {unit}.',
    'url.v0_clamped': 'Saitē v₀ = {raw} {unit} neder šim režīmam un mērogam (atļauts no {min} līdz {max} {unit}). Izmantots v₀ = {used} {unit}.',
    'url.dt_scale': 'Saitē Δt = {raw} s neder šim mērogam. Atļautās vērtības: {allowed} s. Izmantots Δt = {used} s.',
    'url.none': 'nav',
  },
  en: {
    'page.title': 'Falls and throws — FIZ-SIM',
    'page.heading': 'FALLS AND THROWS',
    'page.back': '← INDEX',
    'tb.set': 'SET',
    'tb.sheet': 'SHEET',
    'tb.topic': 'TOPIC',
    'tb.langTheme': 'LANGUAGE / THEME',
    'tb.topicValue': 'KINEMATICS',
    'tb.themeToggle': 'Toggle light and dark mode',

    'blk.mode': 'MODE',
    'mode.vertical': '1 · ↕',
    'mode.horizontal': '2 · →',
    'mode.oblique': '3 · ↗',
    'mode.vertical.name': 'Fall and vertical throw',
    'mode.horizontal.name': 'Horizontal throw',
    'mode.oblique.name': 'Oblique throw',
    'mode.vertical.hint': 'Fall and vertical throw. Drag the v₀ arrow up or down; with v₀ = 0 the ball falls freely.',
    'mode.horizontal.hint': 'Horizontal throw: the ball starts moving horizontally with speed v₀.',
    'mode.oblique.hint': 'Oblique throw: the ball is thrown with speed v₀ at angle α to the horizontal.',
    'dt.label': 'Δt',
    'slow': 'SLOW ×0.25',
    'second': 'SECOND BALL DROPS AT THE SAME TIME',

    'blk.dims': 'DIMENSIONS',
    'scale.label': 'SCALE',
    'scale.table': 'TABLE · cm',
    'scale.tower': 'TOWER · m',
    'dims.hint': 'Drag the dimension line h and the tip of the v₀ arrow in the drawing (in the oblique throw also α on the arc). For precise steps use the arrow keys or the − and + buttons.',
    'dims.h': 'Launch height h',
    'dims.v0': 'Initial speed v₀',
    'dims.alpha': 'Launch angle α',
    'dims.fixed': 'FIXED',
    'dims.fixedTitle': 'The teacher has fixed this value in the link.',
    'dims.decrease': 'Decrease: {name}',
    'dims.increase': 'Increase: {name}',
    'dir.up': 'upwards',
    'dir.down': 'downwards',
    'grid': 'SHOW GRID',

    'run.start': '▶ RUN',
    'run.repeat': '↻ REPEAT',
    'run.running': 'BALL IN FLIGHT…',

    'blk.results': 'RESULTS',
    'results.none': 'No measurements with these settings yet. Press RUN.',
    'results.option': 'Table {n} · runs: {m}',
    'results.other': 'Showing table {n} — its settings differ from the current ones.',
    'results.table': 'DATA TABLE',
    'results.strobe': 'STROBE',

    'scene.origin': 'x = 0; y = 0',
    'scene.launch': 'LAUNCH POINT',
    'scene.originLaunch': 'x = 0; y = 0 — LAUNCH POINT',
    'scene.aria': 'Side-view drawing: a table or a tower, the ball, the initial velocity arrow and a measuring grid.',

    'table.verticalTitle': 'Table {n}. Ball position y versus time t',
    'table.planeTitle': 'Table {n}. Ball positions x and y versus time t',
    'col.t': 't, s',
    'col.xN': 'x{i}, {u}',
    'col.yN': 'y{i}, {u}',
    'col.err': '(±{e} {u})',
    'set.prefix': 'Settings: ',
    'set.mode.vertical': 'fall or vertical throw',
    'set.mode.horizontal': 'horizontal throw',
    'set.mode.oblique': 'oblique throw',
    'set.scale.table': 'table',
    'set.scale.tower': 'tower',
    'set.h': 'h = {v} {u}',
    'set.v0': 'v₀ = {v} {u}',
    'set.v0Up': 'v₀ = {v} {u} upwards',
    'set.v0Down': 'v₀ = {v} {u} downwards',
    'set.v0Zero': 'v₀ = 0 (free fall)',
    'set.alpha': 'α = {v}°',
    'set.dt': 'Δt = {v} s',
    'set.seed': 'seed {v}',

    'data.copy': 'COPY',
    'data.csv': 'DOWNLOAD CSV',
    'data.close': 'CLOSE ✕',
    'data.copied': 'Copied. Paste into Excel or Google Sheets.',
    'data.copyFailed': 'The browser blocked clipboard access. On a computer, select the table with the mouse and copy with Ctrl+C (Mac: ⌘+C); on a phone, use DOWNLOAD CSV.',

    'strobe.title': 'STROBE',
    'strobe.caption': 'Strobe · Δt = {dt} s · table {n}, run {r}',
    'strobe.run': 'RUN',
    'strobe.zoomIn': 'Zoom in',
    'strobe.zoomOut': 'Zoom out',
    'strobe.fit': 'FIT',
    'strobe.export': 'EXPORT IMAGE',
    'strobe.hint': 'Zoom with the mouse wheel or two fingers; drag with the mouse or a finger to move.',
    'strobe.verticalNote': 'Positions are shifted to the right one after another, as on a time axis. The ball moves only vertically.',
    'strobe.secondNote': 'Hollow circles: the second ball, which starts falling from the same height at the same moment.',
    'strobe.exportFailed': 'Could not create the image: this device does not allow an image this large ({w} × {h} px). Try on a computer or with a smaller h or v₀.',

    'notice.close': 'Close notice',
    'notice.noFlight.vertical': 'The ball is already on the ground (h = 0) and does not rise. Increase h or throw upwards (v₀ > 0).',
    'notice.noFlight.horizontal': 'Thrown horizontally from the ground (h = 0), the ball is on the ground at once. Increase h.',
    'notice.noFlight.oblique': 'The ball does not leave the ground (h = 0) because v₀ = 0 or α = 0. Increase v₀, α or h.',
    'notice.short': 'The flight is too short: the strobe would show fewer than 3 positions. Choose a smaller Δt or increase h or v₀.',
    'lockConflict': 'This change is not possible: it would alter a value fixed by the link ({names}).',
    'lock.mode': 'mode',
    'lock.scale': 'scale',
    'lock.second': 'second ball',
    'lock.grid': 'grid',
    'url.not_number': 'Link parameter {param}={raw} is not a number. Using {param} = {used}.',
    'url.out_of_range': 'Link parameter {param}={raw} is out of range ({min}–{max}). Using {param} = {used}.',
    'url.not_allowed': 'Link parameter {param} does not allow the value “{raw}”. Allowed values: {allowed}. Using {param} = {used}.',
    'url.h_clamped': 'In the link, h = {raw} {unit} is too large for this scale (h ≤ {max} {unit}). Using h = {used} {unit}.',
    'url.v0_clamped': 'In the link, v₀ = {raw} {unit} does not fit this mode and scale (allowed from {min} to {max} {unit}). Using v₀ = {used} {unit}.',
    'url.dt_scale': 'In the link, Δt = {raw} s does not fit this scale. Allowed values: {allowed} s. Using Δt = {used} s.',
    'url.none': 'none',
  },
};
```

- [ ] **Step 4: Run the suite**

Run: `npm test 2>&1 | tail -8`
Expected: PASS, `fail 0`. (The “every literal t(…) key” test re-checks every later task automatically — keep it green.)

- [ ] **Step 5: Commit**

```bash
git add assets/projectile/i18n.js tests/projectile-i18n.test.js
git commit -m "Add K-02 texts in Latvian and English

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Teacher links (URL parameters)

**Files:**
- Create: `assets/projectile/params.js`
- Test: `tests/projectile-params.test.js`

**Interfaces:**
- Consumes: `parseParams`, `warningText` (Task 1); `SCALES`, `ALPHA`, `DT_ALL`, `MODE_NUMBER` (Task 3); `defaultSettings`, `withH`, `withV0`, `withAlpha`, `withDt`, `withSecond`, `withGrid`, `v0Range` (Task 3); `randomSeed`.
- Produces: `PARAM_SCHEMA`, `LOCKABLE = ['mode','scale','h','v0','alpha','dt','second','grid','view']`, `settingsFromURL(search, { makeSeed }?) → { settings, locked: Set, views: { table, strobe }, noise, traps, seed, seedGiven, warnings: Warning[] }`, re-exported `warningText`.
- Order of application: `scale` → `mode` (with that mode’s default v₀ when `v0` is absent) → `h` → `v0` → `alpha` → `dt` → `second` → `grid`.

- [ ] **Step 1: Write the failing tests**

`tests/projectile-params.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settingsFromURL, warningText, LOCKABLE } from '../assets/projectile/params.js';
import { defaultSettings } from '../assets/projectile/model.js';
import { makeT } from '../assets/translate.js';
import { STRINGS } from '../assets/projectile/i18n.js';

const seed = () => 777;
const parse = (q) => settingsFromURL(q, { makeSeed: seed });
const lv = { t: makeT(STRINGS, () => 'lv'), lang: 'lv' };
const en = { t: makeT(STRINGS, () => 'en'), lang: 'en' };

test('no params → defaults, nothing locked, noise 1, generated seed', () => {
  const p = parse('');
  assert.deepEqual(p.settings, defaultSettings());
  assert.equal(p.locked.size, 0);
  assert.deepEqual(p.views, { table: true, strobe: true });
  assert.equal(p.noise, 1);
  assert.deepEqual(p.traps, []);
  assert.equal(p.seed, 777);
  assert.equal(p.seedGiven, false);
  assert.deepEqual(p.warnings, []);
});

test('scale and mode set their defaults; mode=1 without v0 is free fall', () => {
  const t = parse('?scale=tower').settings;
  assert.equal(t.h, 20);
  assert.equal(t.v0, 10);
  assert.equal(t.dt, 0.2);
  const v = parse('?mode=1').settings;
  assert.equal(v.mode, 'vertical');
  assert.equal(v.v0, 0);
  const o = parse('?mode=3&alpha=30&v0=200&h=0').settings;
  assert.deepEqual([o.mode, o.alphaDeg, o.v0, o.h], ['oblique', 30, 200, 0]);
  assert.equal(parse('?mode=1&v0=-50').settings.v0, -50);
});

test('bad and conflicting params → sensible values + one precise notice each (Review Focus 1)', () => {
  const a = parse('?scale=tower&h=120');
  assert.equal(a.settings.h, 50);
  assert.deepEqual(a.warnings, [{ param: 'h', raw: '120', reason: 'h_clamped', max: 50, unit: 'm', used: 50 }]);
  assert.equal(warningText(a.warnings[0], lv), 'Saitē h = 120 m ir par lielu šim mērogam (h ≤ 50 m). Izmantots h = 50 m.');
  assert.equal(warningText(a.warnings[0], en), 'In the link, h = 120 m is too large for this scale (h ≤ 50 m). Using h = 50 m.');

  const b = parse('?scale=tower&dt=0.02');
  assert.equal(b.settings.dt, 0.2);
  assert.equal(warningText(b.warnings[0], lv), 'Saitē Δt = 0.02 s neder šim mērogam. Atļautās vērtības: 0,1; 0,2; 0,5 s. Izmantots Δt = 0,2 s.');
  assert.equal(warningText(b.warnings[0], en), 'In the link, Δt = 0.02 s does not fit this scale. Allowed values: 0.1, 0.2, 0.5 s. Using Δt = 0.2 s.');

  const c = parse('?mode=2&v0=-100');
  assert.equal(c.settings.v0, 0);
  assert.equal(warningText(c.warnings[0], lv), 'Saitē v₀ = -100 cm/s neder šim režīmam un mērogam (atļauts no 0 līdz 400 cm/s). Izmantots v₀ = 0 cm/s.');

  const d = parse('?scale=tower&h=2,5');
  assert.equal(d.settings.h, 2.5);
  assert.deepEqual(d.warnings, []);

  const e = parse('?traps=push');
  assert.deepEqual(e.traps, []);
  assert.equal(warningText(e.warnings[0], lv), 'Saites parametra traps vērtība “push” nav atļauta. Atļautās vērtības: late. Izmantots traps = nav.');

  const f = parse('?h=abc');
  assert.equal(f.settings.h, 80);
  assert.equal(warningText(f.warnings[0], lv), 'Saites parametrs h=abc nav skaitlis. Izmantots h = 80.');

  assert.deepEqual(parse('?fbclid=IwAR0abc&h=60').warnings, []);
});

test('lock fixes only the given params; view takes effect with lock', () => {
  const p = parse('?h=50&v0=100&view=strobe&lock=1');
  assert.deepEqual([...p.locked].sort(), ['h', 'v0', 'view']);
  assert.deepEqual(p.views, { table: false, strobe: true });
  assert.deepEqual(parse('?view=table&lock=1').views, { table: true, strobe: false });
  assert.deepEqual(parse('?view=strobe').views, { table: true, strobe: true });
  assert.equal(parse('?h=50&lock=0').locked.size, 0);
  assert.ok(LOCKABLE.includes('scale'));
});

test('teacher-only params', () => {
  const p = parse('?noise=0&traps=late&seed=42&second=1&grid=0&mode=2');
  assert.equal(p.noise, 0);
  assert.deepEqual(p.traps, ['late']);
  assert.equal(p.seed, 42);
  assert.equal(p.seedGiven, true);
  assert.equal(p.settings.second, true);
  assert.equal(p.settings.grid, false);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test 2>&1 | tail -8`
Expected: FAIL — cannot find `assets/projectile/params.js`.

- [ ] **Step 3: Implement `assets/projectile/params.js`**

```js
import { parseParams } from '../measure/url-params.js';
import { SCALES, ALPHA, DT_ALL, MODE_NUMBER } from './scales.js';
import { defaultSettings, withH, withV0, withAlpha, withDt, withSecond, withGrid, v0Range } from './model.js';
import { randomSeed } from '../measure/rng.js';

export { warningText } from '../measure/url-params.js';

const MODE_BY_NUMBER = { 1: 'vertical', 2: 'horizontal', 3: 'oblique' };
const H_LIMIT = Math.max(...Object.values(SCALES).map((s) => s.h.max));
const V0_LIMIT = Math.max(...Object.values(SCALES).map((s) => s.v0.max));

export const PARAM_SCHEMA = {
  mode: { type: 'enum', values: ['1', '2', '3'] },
  scale: { type: 'enum', values: Object.keys(SCALES) },
  h: { type: 'number', min: 0, max: H_LIMIT },
  v0: { type: 'number', min: -V0_LIMIT, max: V0_LIMIT },
  alpha: { type: 'number', min: ALPHA.min, max: ALPHA.max },
  dt: { type: 'number', values: DT_ALL },
  second: { type: 'bool' },
  grid: { type: 'bool' },
  view: { type: 'enum', values: ['table', 'strobe', 'both'] },
  noise: { type: 'enum', values: ['0', '1', '2'] },
  traps: { type: 'list-enum', values: ['late'] },
  seed: { type: 'int', min: 1, max: 2147483647 },
};

export const LOCKABLE = ['mode', 'scale', 'h', 'v0', 'alpha', 'dt', 'second', 'grid', 'view'];

export function settingsFromURL(search, { makeSeed = randomSeed } = {}) {
  const p = parseParams(search, PARAM_SCHEMA);
  const v = p.values;
  const raw = new URLSearchParams(search);
  const warnings = new Map(); // param → warning (a later one replaces an earlier one)
  for (const w of p.warnings) warnings.set(w.param, { ...w });
  const warn = (w) => warnings.set(w.param, w);

  const scale = v.scale ?? 'table';
  const mode = 'mode' in v ? MODE_BY_NUMBER[v.mode] : 'horizontal';
  const sc = SCALES[scale];
  let s = defaultSettings(scale, mode);
  if ('h' in v) {
    if (v.h > sc.h.max) warn({ param: 'h', raw: raw.get('h'), reason: 'h_clamped', max: sc.h.max, unit: sc.unit });
    s = withH(s, v.h);
  }
  if ('v0' in v) {
    const r = v0Range(scale, mode);
    if (v.v0 < r.min || v.v0 > r.max) {
      warn({ param: 'v0', raw: raw.get('v0'), reason: 'v0_clamped', min: r.min, max: r.max, unit: `${sc.unit}/s` });
    }
    s = withV0(s, v.v0);
  }
  if ('alpha' in v) s = withAlpha(s, v.alpha);
  if ('dt' in v) {
    if (sc.dtOptions.includes(v.dt)) s = withDt(s, v.dt);
    else warn({ param: 'dt', raw: raw.get('dt'), reason: 'dt_scale', allowed: sc.dtOptions });
  }
  if ('second' in v) s = withSecond(s, v.second);
  if ('grid' in v) s = withGrid(s, v.grid);

  const locked = p.lock ? new Set(LOCKABLE.filter((n) => p.given.has(n))) : new Set();
  let views = { table: true, strobe: true };
  if (p.lock && 'view' in v) views = { table: v.view !== 'strobe', strobe: v.view !== 'table' };
  const noise = 'noise' in v ? Number(v.noise) : 1;
  const traps = v.traps ?? [];
  const seed = v.seed ?? makeSeed();

  // `used` for every warning = the final value of that setting
  const finalValue = {
    mode: String(MODE_NUMBER[s.mode]), scale: s.scale, h: s.h, v0: s.v0, alpha: s.alphaDeg, dt: s.dt,
    second: s.second ? '1' : '0', grid: s.grid ? '1' : '0', view: 'both', noise, traps: [], seed,
  };
  for (const w of warnings.values()) if (!('used' in w)) w.used = finalValue[w.param];

  return { settings: s, locked, views, noise, traps, seed, seedGiven: 'seed' in v, warnings: [...warnings.values()] };
}
```

- [ ] **Step 4: Run the suite**

Run: `npm test 2>&1 | tail -8`
Expected: PASS, `fail 0`.

- [ ] **Step 5: Commit**

```bash
git add assets/projectile/params.js tests/projectile-params.test.js
git commit -m "Add K-02 teacher links: URL parameters, lock, precise notices per scale

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Results tables (t, x, y only)

**Files:**
- Create: `assets/projectile/results.js`
- Test: `tests/projectile-results.test.js`

**Interfaces:**
- Consumes: `createResults` (Task 1, shared); `SCALES` (Task 3); `formatNumber`, `decimalsOf`, `roundTo`; the `Run` shape (Task 4).
- Produces: `createResults()` (re-export of the shared store without extra fields); `settingsLine(table, { t, lang }) → string`; `tableModel(table, { t, lang }) → { title, settingsLine, columns: [{ label, decimals }], rows: (number | null)[][], filename }` — the model shape `openDataTable`, `toTSV` and `toCSV` already consume.
- Columns: mode `vertical` → `t, s`, then `y₁, cm (±0,5 cm)`, `y₂ …`; other modes → `t, s`, then per run `xₖ`, `yₖ` pairs.

- [ ] **Step 1: Write the failing tests**

`tests/projectile-results.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createResults, tableModel, settingsLine } from '../assets/projectile/results.js';
import { simulateRun } from '../assets/projectile/experiment.js';
import { defaultSettings, withMode, withScale, withV0, withH, settingsKey } from '../assets/projectile/model.js';
import { makeT } from '../assets/translate.js';
import { STRINGS } from '../assets/projectile/i18n.js';
import { toTSV } from '../assets/measure/table-export.js';

const cfg = { seed: 123456, noise: 1, traps: [] };
const lv = { t: makeT(STRINGS, () => 'lv'), lang: 'lv' };
const en = { t: makeT(STRINGS, () => 'en'), lang: 'en' };

function runInto(results, s, n = 1) {
  const key = settingsKey(s, cfg);
  for (let i = 0; i < n; i++) results.add(s, simulateRun(s, { ...cfg, repeat: results.nextRepeat(key) }), cfg);
  return results.byKey(key);
}

test('alternating settings: each run in its own table, numbering continues (Review Focus 3)', () => {
  const r = createResults();
  const a = defaultSettings();
  const b = withScale(a, 'tower');
  runInto(r, a, 2);
  runInto(r, b, 1);
  const t = runInto(r, a, 1);
  assert.equal(r.tables().length, 2);
  assert.equal(t.index, 1);
  assert.deepEqual(t.runs.map((x) => x.repeat), [1, 2, 3]);
  assert.equal('level' in t, false);
});

test('horizontal: t, then an x and a y column per run, blanks for shorter runs', () => {
  const r = createResults();
  const t = runInto(r, defaultSettings(), 2);
  const m = tableModel(t, lv);
  assert.equal(m.title, '1. tabula. Bumbiņas koordinātas x un y atkarībā no laika t');
  assert.deepEqual(m.columns.map((c) => c.label), ['t, s', 'x₁, cm (±0,5 cm)', 'y₁, cm (±0,5 cm)', 'x₂, cm (±0,5 cm)', 'y₂, cm (±0,5 cm)']);
  assert.deepEqual(m.columns.map((c) => c.decimals), [2, 1, 1, 1, 1]);
  const longest = Math.max(...t.runs.map((x) => x.samples.length));
  assert.equal(m.rows.length, longest);
  assert.equal(m.rows[1][0], 0.05);
  for (const row of m.rows) assert.equal(row.length, 5);
  assert.equal(m.rows[0][1], t.runs[0].samples[0].x);
  assert.equal(m.rows[0][2], t.runs[0].samples[0].y);
  assert.equal(m.filename, 'sviedieni-tabula-1');
});

test('vertical: only t and y columns; tower units and Δt decimals', () => {
  const r = createResults();
  const s = withV0(withMode(withScale(defaultSettings(), 'tower'), 'vertical'), -5);
  const m = tableModel(runInto(r, s, 2), lv);
  assert.equal(m.title, '1. tabula. Bumbiņas koordināta y atkarībā no laika t');
  assert.deepEqual(m.columns.map((c) => c.label), ['t, s', 'y₁, m (±0,1 m)', 'y₂, m (±0,1 m)']);
  assert.deepEqual(m.columns.map((c) => c.decimals), [1, 1, 1]);
});

test('only directly readable quantities: every column is t, x or y', () => {
  const r = createResults();
  for (const s of [defaultSettings(), withMode(defaultSettings(), 'oblique'), withMode(defaultSettings(), 'vertical')]) {
    const m = tableModel(runInto(r, withH(s, 120), 3), en);
    for (const c of m.columns) assert.match(c.label, /^(t|x|y)/);
  }
});

test('settings line LV and EN', () => {
  const r = createResults();
  const t = runInto(r, defaultSettings(), 1);
  assert.equal(settingsLine(t, lv), 'Iestatījumi: horizontālais sviediens; galds; h = 80 cm; v₀ = 150 cm/s; Δt = 0,05 s; sēkla 123456');
  assert.equal(settingsLine(t, en), 'Settings: horizontal throw; table; h = 80 cm; v₀ = 150 cm/s; Δt = 0.05 s; seed 123456');
  const down = runInto(r, withV0(withMode(withScale(defaultSettings(), 'tower'), 'vertical'), -5), 1);
  assert.equal(settingsLine(down, lv), 'Iestatījumi: kritiens vai vertikālais sviediens; tornis; h = 20,0 m; v₀ = 5,0 m/s uz leju; Δt = 0,2 s; sēkla 123456');
  const free = runInto(r, withMode(defaultSettings(), 'vertical'), 1);
  assert.ok(settingsLine(free, lv).includes('v₀ = 150 cm/s uz augšu'));
  const zero = runInto(r, withV0(withMode(defaultSettings(), 'vertical'), 0), 1);
  assert.ok(settingsLine(zero, lv).includes('v₀ = 0 (brīvā krišana)'));
  const obl = runInto(r, withMode(defaultSettings(), 'oblique'), 1);
  assert.ok(settingsLine(obl, lv).includes('slīpais sviediens; galds; h = 80 cm; v₀ = 150 cm/s; α = 45°'));
});

test('TSV export has the title, the settings line and the header', () => {
  const r = createResults();
  const m = tableModel(runInto(r, defaultSettings(), 1), lv);
  const lines = toTSV(m, 'lv').split('\n');
  assert.equal(lines[0], m.title);
  assert.equal(lines[1], m.settingsLine);
  assert.equal(lines[2], 't, s\tx₁, cm (±0,5 cm)\ty₁, cm (±0,5 cm)');
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test 2>&1 | tail -8`
Expected: FAIL — cannot find `assets/projectile/results.js`.

- [ ] **Step 3: Implement `assets/projectile/results.js`**

```js
import { SCALES } from './scales.js';
import { formatNumber, decimalsOf, roundTo } from '../measure/format.js';

export { createResults } from '../measure/results-store.js';

const SUBS = '₀₁₂₃₄₅₆₇₈₉';
const sub = (n) => String(n).replace(/\d/g, (d) => SUBS[Number(d)]);

export function settingsLine(table, { t, lang }) {
  const s = table.settings;
  const sc = SCALES[s.scale];
  const f = (v, dec) => formatNumber(v, dec, lang);
  const vu = `${sc.unit}/s`;
  const parts = [t(`set.mode.${s.mode}`), t(`set.scale.${s.scale}`), t('set.h', { v: f(s.h, sc.h.decimals), u: sc.unit })];
  if (s.mode !== 'vertical') parts.push(t('set.v0', { v: f(s.v0, sc.v0.decimals), u: vu }));
  else if (s.v0 === 0) parts.push(t('set.v0Zero'));
  else parts.push(t(s.v0 > 0 ? 'set.v0Up' : 'set.v0Down', { v: f(Math.abs(s.v0), sc.v0.decimals), u: vu }));
  if (s.mode === 'oblique') parts.push(t('set.alpha', { v: f(s.alphaDeg, 0) }));
  parts.push(t('set.dt', { v: f(s.dt, decimalsOf(s.dt)) }));
  parts.push(t('set.seed', { v: table.meta.seed }));
  return t('set.prefix') + parts.join('; ');
}

export function tableModel(table, { t, lang }) {
  const s = table.settings;
  const sc = SCALES[s.scale];
  const vertical = s.mode === 'vertical';
  const err = t('col.err', { e: formatNumber(sc.read.resolution, sc.read.decimals, lang), u: sc.unit });
  const col = (key, k) => ({ label: `${t(key, { i: sub(k), u: sc.unit })} ${err}`, decimals: sc.read.decimals });
  const columns = [{ label: t('col.t'), decimals: decimalsOf(s.dt) }];
  table.runs.forEach((_, i) => {
    if (!vertical) columns.push(col('col.xN', i + 1));
    columns.push(col('col.yN', i + 1));
  });
  const longest = Math.max(...table.runs.map((r) => r.samples.length));
  const rows = [];
  for (let n = 0; n < longest; n++) {
    const row = [roundTo(n * s.dt, s.dt)];
    for (const r of table.runs) {
      const p = r.samples[n];
      if (!vertical) row.push(p ? p.x : null);
      row.push(p ? p.y : null);
    }
    rows.push(row);
  }
  return {
    title: t(vertical ? 'table.verticalTitle' : 'table.planeTitle', { n: table.index }),
    settingsLine: settingsLine(table, { t, lang }),
    columns,
    rows,
    filename: `sviedieni-tabula-${table.index}`,
  };
}
```

- [ ] **Step 4: Run the suite**

Run: `npm test 2>&1 | tail -8`
Expected: PASS, `fail 0`.

- [ ] **Step 5: Commit**

```bash
git add assets/projectile/results.js tests/projectile-results.test.js
git commit -m "Add K-02 result tables with only t, x and y columns

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Shared strobe overlay shell and export sizing

K-01 has its strobe overlay inline in `assets/rolling-ball/strobe.js` (`openStrobe`). K-02 and later K-03 need the same frame (zoom −/+/fit, run selector, one checkbox, PNG export, close) around their own drawing. This task builds that frame once in `assets/measure/`. K-01’s `openStrobe` is **not** changed.

**Files:**
- Create: `assets/measure/strobe-view.js`
- Test: `tests/strobe-view.test.js`

**Interfaces:**
- Consumes: `openOverlay`, `downloadBlob`, `setupCanvas`, `fitTransform`, `attachZoomPan`, `zoomAt` (existing).
- Produces: `EXPORT_MAX_SIDE = 16000`, `EXPORT_MAX_AREA = 16000000`; `exportSizeFor(box, { pref, min, extraW = 0, extraH = 0, maxSide?, maxArea? }) → { scale, w, h } | null` (largest px-per-unit from `pref` down to `min` in 20 equal steps that fits the device limits); `canvasToPNG(w, h, paint(ctx)) → Promise<Blob | null>`; `openStrobeShell(o) → { close(), runIndex() }` where `o = { labels: { title, close, zoomIn, zoomOut, fit, run, export, hint, check }, runCount, runIndex, check: { checked, disabled }, box: { x0, x1, y0, y1 }, draw(ctx, { tr, width, height, runIndex, checked }), exportPNG({ runIndex, checked }) → Promise<Blob | null>, exportFilename(runIndex) → string, exportFailedText() → string, onExportFailed?(), onCheckChange?(checked), onClose?() }`.

- [ ] **Step 1: Write the failing test**

`tests/strobe-view.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportSizeFor, EXPORT_MAX_SIDE, EXPORT_MAX_AREA } from '../assets/measure/strobe-view.js';

test('small picture: preferred scale', () => {
  const s = exportSizeFor({ x0: 0, x1: 100, y0: 0, y1: 50 }, { pref: 30, min: 10, extraW: 80, extraH: 220 });
  assert.deepEqual(s, { scale: 30, w: 3080, h: 1720 });
});

test('large picture: scale goes down until it fits; never below min (Review Focus 5)', () => {
  const s = exportSizeFor({ x0: -35, x1: 263, y0: -5, y1: 196 }, { pref: 30, min: 10, extraW: 80, extraH: 220 });
  assert.ok(s);
  assert.ok(s.scale < 30 && s.scale >= 10);
  assert.ok(s.w <= EXPORT_MAX_SIDE && s.h <= EXPORT_MAX_SIDE && s.w * s.h <= EXPORT_MAX_AREA);
});

test('impossible picture → null', () => {
  assert.equal(exportSizeFor({ x0: 0, x1: 100000, y0: 0, y1: 100000 }, { pref: 30, min: 10 }), null);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test 2>&1 | tail -8`
Expected: FAIL — cannot find `assets/measure/strobe-view.js`.

- [ ] **Step 3: Implement `assets/measure/strobe-view.js`**

```js
// Stroboskopa slānis: tuvināšana, mērījuma izvēle, viena izvēles rūtiņa, PNG eksports.
// Zīmējumu dod lapa (o.draw); teksti nāk no izsaucēja.
import { openOverlay } from './overlay.js';
import { downloadBlob } from './table-export.js';
import { setupCanvas } from '../sim-core.js';
import { fitTransform, attachZoomPan, zoomAt } from './zoom-pan.js';

export const EXPORT_MAX_SIDE = 16000;
export const EXPORT_MAX_AREA = 16000000; // iOS Safari kanvas robeža ≈ 16,7 Mpx

const SIZE_STEPS = 20;

export function exportSizeFor(box, { pref, min, extraW = 0, extraH = 0, maxSide = EXPORT_MAX_SIDE, maxArea = EXPORT_MAX_AREA }) {
  const wU = box.x1 - box.x0;
  const hU = box.y1 - box.y0;
  for (let i = 0; i <= SIZE_STEPS; i++) {
    const scale = pref - ((pref - min) * i) / SIZE_STEPS;
    const w = Math.ceil(wU * scale + extraW);
    const h = Math.ceil(hU * scale + extraH);
    if (w <= maxSide && h <= maxSide && w * h <= maxArea) return { scale, w, h };
  }
  return null;
}

export function canvasToPNG(w, h, paint) {
  return new Promise((resolve) => {
    try {
      const cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      const ctx = cv.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      paint(ctx);
      cv.toBlob((b) => resolve(b || null), 'image/png');
    } catch (err) {
      resolve(null);
    }
  });
}

export function openStrobeShell(o) {
  const L = o.labels;
  let runIndex = o.runIndex;
  let checked = o.check.checked;
  let tr = { scale: 1, tx: 0, ty: 0 };
  let size = { w: 0, h: 0 };
  let limits = { min: 0.01, max: 1e6 };
  let closed = false;
  let detach = () => {};
  let view = null;

  function draw() {
    if (closed || !view || !size.w) return;
    o.draw(view.ctx, { tr, width: size.w, height: size.h, runIndex, checked });
  }
  function setTr(next) {
    tr = next;
    draw();
  }

  const mkBtn = (label, onClick, aria) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.textContent = label;
    if (aria) b.setAttribute('aria-label', aria);
    b.addEventListener('click', onClick);
    return b;
  };
  const zoomBy = (factor) => setTr(zoomAt(tr, factor, size.w / 2, size.h / 2, limits.min, limits.max));
  const extraHead = [
    mkBtn('−', () => zoomBy(1 / 1.5), L.zoomOut),
    mkBtn('+', () => zoomBy(1.5), L.zoomIn),
    mkBtn(L.fit, () => setTr(fitTransform(o.box, size.w, size.h))),
  ];

  const runBtns = Array.from({ length: o.runCount }, (_, i) => mkBtn(`${L.run} ${i + 1}`, () => {
    runIndex = i;
    syncRunBtns();
    draw();
  }));
  const seg = document.createElement('div');
  seg.className = 'seg';
  runBtns.forEach((b) => seg.appendChild(b));
  function syncRunBtns() {
    runBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === runIndex)));
  }
  syncRunBtns();
  extraHead.push(seg);

  const check = document.createElement('label');
  check.className = 'check';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = checked;
  cb.disabled = !!o.check.disabled;
  const cbText = document.createElement('span');
  cbText.textContent = L.check;
  check.append(cb, cbText);
  cb.addEventListener('change', () => {
    checked = cb.checked;
    o.onCheckChange?.(checked);
    draw();
  });
  extraHead.push(check);

  let overlay = null;
  overlay = openOverlay({
    title: L.title,
    closeLabel: L.close,
    extraHead,
    buttons: [{
      label: L.export,
      async onClick() {
        const blob = await o.exportPNG({ runIndex, checked });
        if (closed) return;
        if (!blob) {
          overlay.status(o.exportFailedText());
          o.onExportFailed?.();
          return;
        }
        downloadBlob(o.exportFilename(runIndex), blob);
      },
    }],
    onClose() {
      closed = true;
      detach();
      o.onClose?.();
    },
  });

  const wrap = document.createElement('div');
  wrap.className = 'strobe-view';
  const cv = document.createElement('canvas');
  wrap.appendChild(cv);
  overlay.body.appendChild(wrap);
  overlay.status(L.hint);

  view = setupCanvas(cv, (w, h) => {
    if (closed) return;
    const first = !size.w;
    size = { w, h };
    if (first) {
      tr = fitTransform(o.box, w, h);
      limits = { min: tr.scale / 4, max: tr.scale * 200 };
      detach = attachZoomPan(cv, { get: () => tr, set: setTr, min: limits.min, max: limits.max });
    }
    draw();
  });
  draw();

  return { close: overlay.close, runIndex: () => runIndex };
}
```

- [ ] **Step 4: Run the suite**

Run: `npm test 2>&1 | tail -8`
Expected: PASS, `fail 0`. (The shell itself is checked in the browser in Task 12.)

- [ ] **Step 5: Commit**

```bash
git add assets/measure/strobe-view.js tests/strobe-view.test.js
git commit -m "Add a shared strobe overlay shell and PNG export sizing

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: The drawing — layout geometry and canvas

**Files:**
- Create: `assets/projectile/scene.js`
- Test: `tests/projectile-scene.test.js`

**Interfaces:**
- Consumes: `SCALES`, `TABLE_DRAW` (Task 3); `gridSteps`, `ticks` (Task 2); `formatNumber`, `decimalsOf`; `derive` output shape (Task 3).
- Produces (pure): `MARGIN = { left: 130, right: 56, top: 40, bottom: 56 }`, `DIM_GAP = 30`, `ARC_R = 56`; `arrowMaxPx(width, height) → px`; `sceneBox(s, d) → { x0, x1, y0, y1 }` (world units); `sceneLayout(width, height, box) → { width, height, box, tr: { scale, tx, ty }, arrow, toScreen(x, y) → {x, y}, toWorld(px, py) → {x, y} }`; `launchPoint(lay, s) → {x, y}` (screen); `arrowGeometry(lay, s) → { len, dir: {x, y} }` (screen px, unit vector); `handleAnchors(lay, s) → { h: {x, y}, v0: {x, y}, alpha: {x, y} }`; `valueFromPointer(kind, lay, s, ptr) → number` for kind `h`, `v0`, `alpha`.
- Produces (canvas): `drawScene(ctx, lay, m)` with `m = { settings, derived, colors, t, lang, ball: {x, y}, ball2: {x, y} | null, showGrid }` — `ball`/`ball2` in world units (ball centre).
- Drawing rules: ground y = 0 pinned to `height − MARGIN.bottom`, the structure’s left edge (x = −structureW) pinned to `MARGIN.left`; the arrow length is `|v₀| / v0.max × lay.arrow` px; in mode `vertical` the arrow points up for v₀ > 0 and down for v₀ < 0.

- [ ] **Step 1: Write the failing tests**

`tests/projectile-scene.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sceneBox, sceneLayout, arrowMaxPx, launchPoint, arrowGeometry, handleAnchors, valueFromPointer, MARGIN, ARC_R } from '../assets/projectile/scene.js';
import { defaultSettings, derive, withMode, withV0, withAlpha, withScale, withH } from '../assets/projectile/model.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b}`);

test('sceneBox holds the structure, the launch point, the whole trajectory and a minimum view', () => {
  const s = defaultSettings();
  const d = derive(s);
  const b = sceneBox(s, d);
  assert.equal(b.x0, -60);
  assert.equal(b.y0, 0);
  assert.ok(b.x1 >= d.xLand);
  assert.ok(b.y1 >= 100 && b.y1 >= s.h);
  const up = withV0(withMode(withScale(s, 'tower'), 'vertical'), 30);
  const bu = sceneBox(up, derive(up));
  assert.ok(bu.y1 >= derive(up).yMax);
  assert.ok(bu.x1 - bu.x0 >= 30);
});

test('layout: ground at the bottom margin, structure at the left margin; toWorld inverts toScreen', () => {
  const box = { x0: -60, x1: 100, y0: 0, y1: 100 };
  const lay = sceneLayout(800, 600, box);
  close(lay.toScreen(-60, 0).x, MARGIN.left, 1e-9);
  close(lay.toScreen(0, 0).y, 600 - MARGIN.bottom, 1e-9);
  assert.equal(lay.arrow, arrowMaxPx(800, 600));
  assert.ok(lay.toScreen(0, 100).y >= MARGIN.top + lay.arrow - 1e-9, 'room above for the v₀ arrow');
  for (const p of [{ x: 0, y: 0 }, { x: 37.5, y: 12 }, { x: -60, y: 100 }]) {
    const q = lay.toWorld(lay.toScreen(p.x, p.y).x, lay.toScreen(p.x, p.y).y);
    close(q.x, p.x, 1e-9);
    close(q.y, p.y, 1e-9);
  }
  assert.equal(arrowMaxPx(390, 300), 75);
  assert.equal(arrowMaxPx(2000, 2000), 120);
  assert.equal(arrowMaxPx(100, 100), 60);
});

test('arrow direction per mode and sign', () => {
  const lay = sceneLayout(800, 600, { x0: -60, x1: 100, y0: 0, y1: 100 });
  const h = arrowGeometry(lay, defaultSettings());
  assert.deepEqual(h.dir, { x: 1, y: 0 });
  close(h.len, (150 / 400) * lay.arrow, 1e-9);
  assert.deepEqual(arrowGeometry(lay, withV0(withMode(defaultSettings(), 'vertical'), -100)).dir, { x: 0, y: 1 });
  assert.deepEqual(arrowGeometry(lay, withV0(withMode(defaultSettings(), 'vertical'), 100)).dir, { x: 0, y: -1 });
  const o = arrowGeometry(lay, withAlpha(withMode(defaultSettings(), 'oblique'), 30));
  close(o.dir.x, Math.cos(Math.PI / 6), 1e-12);
  close(o.dir.y, -0.5, 1e-12);
});

test('pointer at each anchor gives back the current value (all modes)', () => {
  const cases = [
    defaultSettings(),
    withV0(withMode(defaultSettings(), 'vertical'), -100),
    withV0(withMode(defaultSettings(), 'vertical'), 250),
    withAlpha(withV0(withMode(defaultSettings(), 'oblique'), 200), 30),
    withH(withV0(withScale(defaultSettings(), 'tower'), 12.5), 17.5),
  ];
  for (const s of cases) {
    const lay = sceneLayout(900, 560, sceneBox(s, derive(s)));
    const a = handleAnchors(lay, s);
    close(valueFromPointer('h', lay, s, a.h), s.h, 1e-9, 'h');
    close(valueFromPointer('v0', lay, s, a.v0), s.v0, 1e-9, `v0 ${s.mode}`);
    if (s.mode === 'oblique') {
      close(valueFromPointer('alpha', lay, s, a.alpha), s.alphaDeg, 1e-9, 'alpha');
      close(valueFromPointer('alpha', lay, s, a.v0), s.alphaDeg, 1e-9, 'alpha from the arrow tip');
      const p = launchPoint(lay, s);
      close(Math.hypot(a.alpha.x - p.x, a.alpha.y - p.y), ARC_R, 1e-9);
    }
  }
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test 2>&1 | tail -8`
Expected: FAIL — cannot find `assets/projectile/scene.js`.

- [ ] **Step 3: Implement `assets/projectile/scene.js`**

```js
import { SCALES, TABLE_DRAW } from './scales.js';
import { gridSteps, ticks } from '../measure/world-grid.js';
import { formatNumber, decimalsOf } from '../measure/format.js';

export const MARGIN = { left: 130, right: 56, top: 40, bottom: 56 };
export const DIM_GAP = 30; // px: h izmēru līnija pa kreisi no galda vai torņa
export const ARC_R = 56; // px: α loks ap kustības sākumpunktu

export function arrowMaxPx(width, height) {
  return Math.max(60, Math.min(120, 0.25 * Math.min(width, height)));
}

// Pasaules laukums: konstrukcija, kustības sākumpunkts, visa trajektorija un mazākais skats.
export function sceneBox(s, d) {
  const sc = d.sc;
  const x0 = -sc.structureW;
  const x1 = Math.max(x0 + sc.minView.w, d.xLand + 2 * sc.ball.d, 4 * sc.ball.d);
  const y1 = Math.max(sc.minView.h, d.yMax + 2 * sc.ball.d, s.h + 2 * sc.ball.d);
  return { x0, x1, y0: 0, y1 };
}

// Zeme apakšā, konstrukcija pa kreisi; virs laukuma vieta bultai v₀.
export function sceneLayout(width, height, box) {
  const arrow = arrowMaxPx(width, height);
  const top = MARGIN.top + arrow;
  const availW = Math.max(50, width - MARGIN.left - MARGIN.right);
  const availH = Math.max(50, height - top - MARGIN.bottom);
  const scale = Math.min(availW / (box.x1 - box.x0), availH / (box.y1 - box.y0));
  const tr = { scale, tx: MARGIN.left - box.x0 * scale, ty: height - MARGIN.bottom + box.y0 * scale };
  return {
    width,
    height,
    box,
    tr,
    arrow,
    toScreen: (x, y) => ({ x: tr.tx + x * scale, y: tr.ty - y * scale }),
    toWorld: (px, py) => ({ x: (px - tr.tx) / scale, y: (tr.ty - py) / scale }),
  };
}

export function launchPoint(lay, s) {
  return lay.toScreen(0, s.h);
}

export function arrowGeometry(lay, s) {
  const len = (Math.abs(s.v0) / SCALES[s.scale].v0.max) * lay.arrow;
  if (s.mode === 'vertical') return { len, dir: { x: 0, y: s.v0 < 0 ? 1 : -1 } };
  if (s.mode === 'horizontal') return { len, dir: { x: 1, y: 0 } };
  const a = (s.alphaDeg * Math.PI) / 180;
  return { len, dir: { x: Math.cos(a), y: -Math.sin(a) } };
}

export function handleAnchors(lay, s) {
  const p = launchPoint(lay, s);
  const { len, dir } = arrowGeometry(lay, s);
  const left = lay.toScreen(-SCALES[s.scale].structureW, 0).x;
  const a = (s.alphaDeg * Math.PI) / 180;
  return {
    h: { x: left - DIM_GAP, y: p.y },
    v0: { x: p.x + dir.x * len, y: p.y + dir.y * len },
    alpha: { x: p.x + ARC_R * Math.cos(a), y: p.y - ARC_R * Math.sin(a) },
  };
}

export function valueFromPointer(kind, lay, s, ptr) {
  const p = launchPoint(lay, s);
  const perPx = SCALES[s.scale].v0.max / lay.arrow; // v₀ vienības uz pikseli
  switch (kind) {
    case 'h':
      return lay.toWorld(ptr.x, ptr.y).y;
    case 'v0':
      if (s.mode === 'vertical') return (p.y - ptr.y) * perPx;
      if (s.mode === 'horizontal') return (ptr.x - p.x) * perPx;
      return Math.hypot(ptr.x - p.x, ptr.y - p.y) * perPx;
    case 'alpha':
      return (Math.atan2(p.y - ptr.y, ptr.x - p.x) * 180) / Math.PI;
    default:
      return NaN;
  }
}

// ── Zīmēšana ─────────────────────────────────────────────

const MONO = 'ui-monospace, monospace';
const FONT_LABEL = `400 10px "IBM Plex Mono", ${MONO}`;
const FONT_TICK = `400 9px "IBM Plex Mono", ${MONO}`;

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function stroke(ctx, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
}

function text(ctx, str, x, y, { font = FONT_LABEL, color, align = 'left', spacing = '0px', bg } = {}) {
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  if ('letterSpacing' in ctx) ctx.letterSpacing = spacing;
  if (bg) {
    const w = ctx.measureText(str).width;
    const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    ctx.fillStyle = bg;
    ctx.fillRect(x0 - 2, y - 10, w + 4, 13);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
}

function arrow(ctx, x1, y1, x2, y2, head) {
  line(ctx, x1, y1, x2, y2);
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(a - 0.4), y2 - head * Math.sin(a - 0.4));
  ctx.lineTo(x2 - head * Math.cos(a + 0.4), y2 - head * Math.sin(a + 0.4));
  ctx.closePath();
  ctx.fill();
}

function hatchRect(ctx, x, y, w, h, color, step = 8) {
  if (w <= 0 || h <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  stroke(ctx, color);
  ctx.beginPath();
  for (let k = -h; k < w; k += step) {
    ctx.moveTo(x + k, y + h);
    ctx.lineTo(x + k + h, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawPaper(ctx, lay, c) {
  ctx.fillStyle = c.field;
  ctx.fillRect(0, 0, lay.width, lay.height);
  stroke(ctx, c.hairline);
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  for (let x = 0.5; x < lay.width; x += 24) { ctx.moveTo(x, 0); ctx.lineTo(x, lay.height); }
  for (let y = 0.5; y < lay.height; y += 24) { ctx.moveTo(0, y); ctx.lineTo(lay.width, y); }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// Mērrežģis pasaules vienībās; x skaitļi zem zemes, y skaitļi pie labās malas.
function drawWorldGrid(ctx, lay, m, c) {
  ctx.fillStyle = c.field;
  ctx.fillRect(0, 0, lay.width, lay.height);
  const { label, minor } = gridSteps(lay.tr.scale);
  const tl = lay.toWorld(0, 0);
  const br = lay.toWorld(lay.width, lay.height);
  const gy = lay.toScreen(0, 0).y;
  const vLines = (xs) => xs.forEach((x) => { const px = Math.round(lay.toScreen(x, 0).x) + 0.5; ctx.moveTo(px, 0); ctx.lineTo(px, gy); });
  const hLines = (ys) => ys.forEach((y) => { const py = Math.round(lay.toScreen(0, y).y) + 0.5; ctx.moveTo(0, py); ctx.lineTo(lay.width, py); });
  stroke(ctx, c.hairline);
  if (minor) {
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    vLines(ticks(tl.x, br.x, minor));
    hLines(ticks(0, tl.y, minor));
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  const xs = ticks(tl.x, br.x, label);
  const ys = ticks(0, tl.y, label);
  ctx.beginPath();
  vLines(xs);
  hLines(ys);
  ctx.stroke();
  const dec = decimalsOf(label);
  const u = m.derived.sc.unit;
  for (const x of xs) text(ctx, formatNumber(x, dec, m.lang), lay.toScreen(x, 0).x, gy + 30, { font: FONT_TICK, color: c.inkDim, align: 'center' });
  for (const y of ys) if (y > 0) text(ctx, formatNumber(y, dec, m.lang), lay.width - 6, lay.toScreen(0, y).y - 3, { font: FONT_TICK, color: c.inkDim, align: 'right' });
  text(ctx, `x, ${u}`, lay.width - 6, gy + 44, { font: FONT_TICK, color: c.inkDim, align: 'right' });
  text(ctx, `y, ${u}`, lay.width - 6, 14, { font: FONT_TICK, color: c.inkDim, align: 'right' });
}

function drawGround(ctx, lay, c) {
  const y = Math.round(lay.toScreen(0, 0).y) + 0.5;
  stroke(ctx, c.ink);
  line(ctx, 0, y, lay.width, y);
  stroke(ctx, c.hairline);
  ctx.beginPath();
  for (let x = 4; x < lay.width; x += 8) {
    ctx.moveTo(x, y + 8);
    ctx.lineTo(x + 8, y);
  }
  ctx.stroke();
}

// Galds vai tornis; augšējā virsma — zem bumbiņas (x, y ir bumbiņas centrs).
function drawStructure(ctx, lay, m, c) {
  const s = m.settings;
  const sc = m.derived.sc;
  const top = s.h - sc.ball.d / 2;
  if (top <= 0) return;
  const rect = (x0, y0, x1, y1) => {
    const a = lay.toScreen(x0, y1);
    const b = lay.toScreen(x1, y0);
    return { x: Math.round(a.x) + 0.5, y: Math.round(a.y) + 0.5, w: Math.round(b.x - a.x), h: Math.round(b.y - a.y) };
  };
  if (s.scale === 'tower') {
    const r = rect(-sc.structureW, 0, 0, top);
    hatchRect(ctx, r.x, r.y, r.w, r.h, c.hairline);
    stroke(ctx, c.ink);
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    return;
  }
  const slab = Math.min(TABLE_DRAW.slab, top);
  const parts = [
    rect(-sc.structureW, top - slab, 0, top),
    rect(-sc.structureW + TABLE_DRAW.leg, 0, -sc.structureW + 2 * TABLE_DRAW.leg, top - slab),
    rect(-2 * TABLE_DRAW.leg, 0, -TABLE_DRAW.leg, top - slab),
  ];
  for (const r of parts) {
    if (r.w <= 0 || r.h <= 0) continue;
    ctx.fillStyle = c.sheet;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    stroke(ctx, c.ink);
    ctx.strokeRect(r.x, r.y, r.w, r.h);
  }
}

function drawDimH(ctx, lay, m, c) {
  const s = m.settings;
  const left = lay.toScreen(-m.derived.sc.structureW, 0).x;
  const x = Math.round(left - DIM_GAP) + 0.5;
  const yTop = Math.round(lay.toScreen(0, s.h).y) + 0.5;
  const yLow = Math.round(lay.toScreen(0, 0).y) + 0.5;
  stroke(ctx, c.ink);
  line(ctx, x, yLow, x, yTop);
  line(ctx, x - 3, yLow + 3, x + 3, yLow - 3);
  line(ctx, x - 3, yTop + 3, x + 3, yTop - 3);
  stroke(ctx, c.hairline);
  ctx.setLineDash([4, 4]);
  line(ctx, x - 4, yTop, launchPoint(lay, s).x, yTop);
  ctx.setLineDash([]);
}

function drawOrigin(ctx, lay, m, c) {
  const o = lay.toScreen(0, 0);
  stroke(ctx, c.inkDim);
  arrow(ctx, o.x, o.y, o.x + 36, o.y, 6);
  arrow(ctx, o.x, o.y, o.x, o.y - 36, 6);
  text(ctx, 'x', o.x + 40, o.y - 4, { color: c.inkDim });
  text(ctx, 'y', o.x + 5, o.y - 40, { color: c.inkDim });
  const key = m.settings.h === 0 ? 'scene.originLaunch' : 'scene.origin';
  text(ctx, m.t(key), o.x + 4, o.y + 16, { color: c.inkDim, bg: c.field });
}

function drawLaunchLabel(ctx, lay, m, c) {
  if (m.settings.h === 0) return;
  const p = launchPoint(lay, m.settings);
  text(ctx, m.t('scene.launch'), p.x - 8, p.y + 28, { color: c.inkDim, align: 'right', spacing: '1px', bg: c.field }); // zem galda virsmas
}

function drawVelocity(ctx, lay, m, c) {
  const s = m.settings;
  const p = launchPoint(lay, s);
  if (s.mode === 'oblique') {
    stroke(ctx, c.hairline);
    ctx.setLineDash([4, 4]);
    line(ctx, p.x, p.y, p.x + ARC_R + 10, p.y);
    ctx.setLineDash([]);
    stroke(ctx, c.ink);
    ctx.beginPath();
    ctx.arc(p.x, p.y, ARC_R, (-s.alphaDeg * Math.PI) / 180, 0);
    ctx.stroke();
  }
  const { len, dir } = arrowGeometry(lay, s);
  if (len < 1) return;
  stroke(ctx, c.ink);
  ctx.lineWidth = 1.5;
  arrow(ctx, p.x, p.y, p.x + dir.x * len, p.y + dir.y * len, 9);
  ctx.lineWidth = 1;
}

function drawBall(ctx, lay, m, c, pos, hollow) {
  const sc = m.derived.sc;
  const ctr = lay.toScreen(pos.x, pos.y);
  const R = Math.max(3, (sc.ball.d / 2) * lay.tr.scale);
  ctx.beginPath();
  ctx.arc(ctr.x, ctr.y, R, 0, Math.PI * 2);
  if (hollow) {
    ctx.fillStyle = c.field;
    ctx.fill();
    stroke(ctx, c.inkDim);
    ctx.setLineDash([3, 2]);
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }
  ctx.fillStyle = c.mat[sc.ball.material];
  ctx.fill();
  stroke(ctx, c.ink);
  ctx.stroke();
}

export function drawScene(ctx, lay, m) {
  const c = m.colors;
  if (m.showGrid) drawWorldGrid(ctx, lay, m, c);
  else drawPaper(ctx, lay, c);
  drawGround(ctx, lay, c);
  drawStructure(ctx, lay, m, c);
  drawDimH(ctx, lay, m, c);
  drawOrigin(ctx, lay, m, c);
  drawLaunchLabel(ctx, lay, m, c);
  drawVelocity(ctx, lay, m, c);
  if (m.ball2) drawBall(ctx, lay, m, c, m.ball2, true);
  drawBall(ctx, lay, m, c, m.ball, false);
}
```

- [ ] **Step 4: Run the suite**

Run: `npm test 2>&1 | tail -8`
Expected: PASS, `fail 0`. (`drawScene` is checked in the browser in Task 12.)

- [ ] **Step 5: Commit**

```bash
git add assets/projectile/scene.js tests/projectile-scene.test.js
git commit -m "Add the K-02 drawing: layout geometry, handles’ anchors and canvas drawing

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: The strobe image

**Files:**
- Create: `assets/projectile/strobe.js`
- Test: `tests/projectile-strobe.test.js`

**Interfaces:**
- Consumes: `SCALES`, `TABLE_DRAW` (Task 3); `gridSteps`, `ticks` (Task 2); `toScreen` from `assets/measure/zoom-pan.js`; `openStrobeShell`, `exportSizeFor`, `canvasToPNG` (Task 8); `tableModel` (Task 7); the `Run` and table shapes (Tasks 4, 7).
- Produces (pure): `CAPTION_PX = 140`, `MARGIN_PX = 40`; `strobePoints(run, settings) → { main: [{ n, x, y }], second: [{ n, x, y }] }` — mode `vertical` places position n at x = n × `strobeSpacing` (spec 8.2: shifted like a time axis); `strobeWorldBox(settings, points) → { x0, x1, y0, y1 }`; `exportOptions(sc) → { pref, min, extraW, extraH }`.
- Produces (DOM): `drawStrobe(ctx, o)`; `openProjectileStrobe({ table, runIndex, t, lang, colors, grid, gridLocked, onGridChange, onExportFailed({ w, h }), onClose }) → { close, runIndex() }`.

- [ ] **Step 1: Write the failing tests**

`tests/projectile-strobe.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { strobePoints, strobeWorldBox, exportOptions } from '../assets/projectile/strobe.js';
import { simulateRun } from '../assets/projectile/experiment.js';
import { defaultSettings, withMode, withScale, withH, withV0, withAlpha, withSecond } from '../assets/projectile/model.js';
import { SCALES } from '../assets/projectile/scales.js';
import { exportSizeFor, EXPORT_MAX_AREA } from '../assets/measure/strobe-view.js';

const opts = { seed: 99, repeat: 1, noise: 0, traps: [] };

test('vertical mode: positions shifted to the right like a time axis', () => {
  const s = withMode(withV0(defaultSettings(), 0), 'vertical');
  const run = simulateRun(s, opts);
  const p = strobePoints(run, s);
  p.main.forEach((q, i) => {
    assert.equal(q.x, i * SCALES.table.strobeSpacing);
    assert.equal(q.y, run.strobe[i].y);
  });
  assert.deepEqual(p.second, []);
});

test('other modes: true positions; second ball included', () => {
  const s = withSecond(defaultSettings(), true);
  const run = simulateRun(s, opts);
  const p = strobePoints(run, s);
  p.main.forEach((q, i) => assert.equal(q.x, run.strobe[i].x));
  assert.equal(p.second.length, run.strobe2.length);
});

test('the box holds every ball and the launch height', () => {
  const s = withSecond(defaultSettings(), true);
  const p = strobePoints(simulateRun(s, opts), s);
  const b = strobeWorldBox(s, p);
  const r = SCALES.table.ball.d / 2;
  for (const q of [...p.main, ...p.second]) {
    assert.ok(q.x - r >= b.x0 && q.x + r <= b.x1);
    assert.ok(q.y - r >= b.y0 && q.y + r <= b.y1);
  }
  assert.ok(b.y1 >= s.h);
  assert.ok(b.x0 < 0, 'part of the table is visible');
});

test('largest throws still export (Review Focus 5)', () => {
  const tower = withH(withAlpha(withV0(withMode(withScale(defaultSettings(), 'tower'), 'oblique'), 30), 45), 50);
  const table = withH(withAlpha(withV0(withMode(defaultSettings(), 'oblique'), 400), 45), 150);
  for (const s of [tower, table]) {
    const p = strobePoints(simulateRun(s, opts), s);
    const size = exportSizeFor(strobeWorldBox(s, p), exportOptions(SCALES[s.scale]));
    assert.ok(size, s.scale);
    assert.ok(size.scale >= SCALES[s.scale].exportPx.min);
    assert.ok(size.w * size.h <= EXPORT_MAX_AREA);
  }
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test 2>&1 | tail -8`
Expected: FAIL — cannot find `assets/projectile/strobe.js`.

- [ ] **Step 3: Implement `assets/projectile/strobe.js`**

```js
import { SCALES, TABLE_DRAW } from './scales.js';
import { gridSteps, ticks } from '../measure/world-grid.js';
import { toScreen } from '../measure/zoom-pan.js';
import { openStrobeShell, exportSizeFor, canvasToPNG } from '../measure/strobe-view.js';
import { formatNumber, decimalsOf } from '../measure/format.js';
import { tableModel } from './results.js';

export const CAPTION_PX = 140;
export const MARGIN_PX = 40;
const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const SANS = "'IBM Plex Sans', system-ui, sans-serif";

// Kur zīmēt katru zibsni. Vertikālajā sviedienā pozīcijas nobīda pa labi kā laika asi (spec. 8.2).
export function strobePoints(run, settings) {
  const sc = SCALES[settings.scale];
  const shift = settings.mode === 'vertical';
  return {
    main: run.strobe.map((p) => ({ n: p.n, x: shift ? p.n * sc.strobeSpacing : p.x, y: p.y })),
    second: run.strobe2 ? run.strobe2.map((p) => ({ n: p.n, x: p.x, y: p.y })) : [],
  };
}

export function strobeWorldBox(settings, points) {
  const sc = SCALES[settings.scale];
  const all = [...points.main, ...points.second];
  const pad = Math.max(2 * sc.ball.d, 0.05 * sc.minView.w);
  return {
    x0: Math.min(-0.5 * sc.structureW, ...all.map((p) => p.x)) - pad,
    x1: Math.max(...all.map((p) => p.x)) + pad,
    y0: -pad,
    y1: Math.max(settings.h, ...all.map((p) => p.y)) + pad,
  };
}

export function exportOptions(sc) {
  return { pref: sc.exportPx.pref, min: sc.exportPx.min, extraW: 2 * MARGIN_PX, extraH: CAPTION_PX + 2 * MARGIN_PX };
}

function wrapWords(ctx, textStr, maxW) {
  const words = textStr.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (line && ctx.measureText(next).width > maxW) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function labelBox(ctx, str, x, y, align, c, fs) {
  const w = ctx.measureText(str).width;
  const x0 = align === 'center' ? x - w / 2 : x;
  ctx.fillStyle = c.field;
  ctx.fillRect(x0 - 2 * fs, y - 10 * fs, w + 4 * fs, 13 * fs);
  ctx.fillStyle = c.inkDim;
  ctx.textAlign = align;
  ctx.fillText(str, x, y);
}

// Mērrežģis; skaitļi paliek redzami arī tuvinot: y — pie kreisās malas, x — zem zemes vai pie apakšas.
function drawGrid(ctx, o, fs) {
  const { tr, colors: c, width, height, settings: s } = o;
  const vertical = s.mode === 'vertical';
  const { label, minor } = gridSteps(tr.scale, { labelPx: 40 * fs, minorPx: 6 * fs });
  const xLo = (0 - tr.tx) / tr.scale;
  const xHi = (width - tr.tx) / tr.scale;
  const yHi = tr.ty / tr.scale;
  const yLo = Math.max(0, (tr.ty - height) / tr.scale);
  const gy = Math.min(height, tr.ty);
  ctx.strokeStyle = c.hairline;
  ctx.lineWidth = fs;
  const lines = (step) => {
    ctx.beginPath();
    if (!vertical) for (const x of ticks(xLo, xHi, step)) { const px = Math.round(tr.tx + x * tr.scale) + 0.5; ctx.moveTo(px, 0); ctx.lineTo(px, gy); }
    for (const y of ticks(yLo, yHi, step)) { const py = Math.round(tr.ty - y * tr.scale) + 0.5; ctx.moveTo(0, py); ctx.lineTo(width, py); }
    ctx.stroke();
  };
  if (minor) {
    ctx.globalAlpha = 0.4;
    lines(minor);
    ctx.globalAlpha = 1;
  }
  lines(label);
  const dec = decimalsOf(label);
  ctx.font = `${10 * fs}px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  for (const y of ticks(yLo, yHi, label)) {
    if (y <= 0) continue;
    labelBox(ctx, formatNumber(y, dec, o.lang), 4 * fs, tr.ty - y * tr.scale - 3 * fs, 'left', c, fs);
  }
  if (!vertical) {
    const ly = Math.min(Math.max(gy + 16 * fs, 14 * fs), height - 4 * fs);
    for (const x of ticks(xLo, xHi, label)) labelBox(ctx, formatNumber(x, dec, o.lang), tr.tx + x * tr.scale, ly, 'center', c, fs);
  }
  labelBox(ctx, o.unit, 4 * fs, height - 6 * fs, 'left', c, fs);
}

function drawStructure(ctx, o, fs) {
  const { tr, colors: c, settings: s, box } = o;
  const sc = SCALES[s.scale];
  const top = s.h - sc.ball.d / 2;
  if (top <= 0) return;
  const a = toScreen(tr, box.x0, top);
  const right = toScreen(tr, 0, 0).x;
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = fs;
  if (s.scale === 'tower') {
    const h = toScreen(tr, 0, 0).y - a.y;
    ctx.save();
    ctx.beginPath();
    ctx.rect(a.x, a.y, right - a.x, h);
    ctx.clip();
    ctx.strokeStyle = c.hairline;
    ctx.beginPath();
    for (let k = -h; k < right - a.x; k += 8 * fs) {
      ctx.moveTo(a.x + k, a.y + h);
      ctx.lineTo(a.x + k + h, a.y);
    }
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = c.ink;
    ctx.strokeRect(a.x, a.y, right - a.x, h);
    return;
  }
  const slab = Math.min(TABLE_DRAW.slab, top) * tr.scale;
  ctx.fillStyle = c.sheet;
  ctx.fillRect(a.x, a.y, right - a.x, slab);
  ctx.strokeRect(a.x, a.y, right - a.x, slab);
}

function drawBall(ctx, ctr, rPx, o, fs, hollow) {
  const c = o.colors;
  const mat = c.mat[SCALES[o.settings.scale].ball.material];
  const arm = Math.max(3 * fs, 0.6 * rPx);
  ctx.lineWidth = fs;
  ctx.beginPath();
  ctx.arc(ctr.x, ctr.y, rPx, 0, Math.PI * 2);
  if (hollow) {
    ctx.strokeStyle = c.inkDim;
    ctx.setLineDash([3 * fs, 2 * fs]);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = mat;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = c.ink;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(ctr.x - arm, ctr.y);
  ctx.lineTo(ctr.x + arm, ctr.y);
  ctx.moveTo(ctr.x, ctr.y - arm);
  ctx.lineTo(ctr.x, ctr.y + arm);
  ctx.stroke();
}

export function drawStrobe(ctx, o) {
  const { tr, colors: c, width, height, points } = o;
  const fs = o.fontScale ?? 1;
  const sc = SCALES[o.settings.scale];
  ctx.save();
  ctx.fillStyle = c.field;
  ctx.fillRect(0, 0, width, height);
  if (o.showGrid) drawGrid(ctx, o, fs);

  // zeme
  const gy = Math.round(toScreen(tr, 0, 0).y) + 0.5;
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = fs;
  ctx.beginPath();
  ctx.moveTo(0, gy);
  ctx.lineTo(width, gy);
  ctx.stroke();
  ctx.strokeStyle = c.hairline;
  ctx.beginPath();
  for (let x = 4 * fs; x < width; x += 8 * fs) {
    ctx.moveTo(x, gy + 8 * fs);
    ctx.lineTo(x + 8 * fs, gy);
  }
  ctx.stroke();
  drawStructure(ctx, o, fs);

  // bumbiņas un numuri 0, 1, 2 …
  const rPx = Math.max(2 * fs, (sc.ball.d / 2) * tr.scale);
  for (const p of points.second) drawBall(ctx, toScreen(tr, p.x, p.y), rPx, o, fs, true);
  ctx.font = `${11 * fs}px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  for (const p of points.main) {
    const ctr = toScreen(tr, p.x, p.y);
    drawBall(ctx, ctr, rPx, o, fs, false);
    const str = String(p.n);
    const tx = ctr.x + rPx + 3 * fs;
    const ty = ctr.y - rPx - 3 * fs;
    const w = ctx.measureText(str).width;
    ctx.fillStyle = c.field;
    ctx.fillRect(tx - fs, ty - 10 * fs, w + 2 * fs, 12 * fs);
    ctx.fillStyle = c.ink;
    ctx.textAlign = 'left';
    ctx.fillText(str, tx, ty);
  }

  // paraksts (ekrāna telpā)
  const lines = o.captionLines ?? [];
  if (lines.length) {
    const pad = 8 * fs;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `600 ${12 * fs}px ${MONO}`;
    const head = lines[0];
    const headW = ctx.measureText(head).width;
    ctx.font = `${11 * fs}px ${SANS}`;
    const rest = lines.slice(1).flatMap((ln) => wrapWords(ctx, ln, Math.max(200, width - 2 * pad)));
    const restW = Math.max(0, ...rest.map((ln) => ctx.measureText(ln).width));
    const lineH = 16 * fs;
    ctx.fillStyle = c.field;
    ctx.fillRect(0, 0, Math.min(width, Math.max(headW, restW) + 2 * pad), pad + lineH * (1 + rest.length) + pad / 2);
    ctx.fillStyle = c.ink;
    ctx.font = `600 ${12 * fs}px ${MONO}`;
    ctx.fillText(head, pad, pad);
    ctx.fillStyle = c.inkDim;
    ctx.font = `${11 * fs}px ${SANS}`;
    rest.forEach((ln, i) => ctx.fillText(ln, pad, pad + lineH * (i + 1)));
  }
  ctx.restore();
}

export function openProjectileStrobe(o) {
  const { table, t, lang, colors } = o;
  const s = table.settings;
  const sc = SCALES[s.scale];
  const perRun = table.runs.map((run) => strobePoints(run, s));
  const box = strobeWorldBox(s, { main: perRun.flatMap((p) => p.main), second: perRun.flatMap((p) => p.second) });
  const settingsLine = tableModel(table, { t, lang }).settingsLine;
  const eo = exportOptions(sc);
  const minSize = { w: Math.ceil((box.x1 - box.x0) * eo.min + eo.extraW), h: Math.ceil((box.y1 - box.y0) * eo.min + eo.extraH) };

  const captionLines = (i) => {
    const lines = [t('strobe.caption', { dt: formatNumber(s.dt, decimalsOf(s.dt), lang), n: table.index, r: i + 1 }), settingsLine];
    if (s.mode === 'vertical') lines.push(t('strobe.verticalNote'));
    if (perRun[i].second.length) lines.push(t('strobe.secondNote'));
    return lines;
  };
  const base = (i, checked) => ({ settings: s, points: perRun[i], box, colors, showGrid: checked, lang, unit: sc.unit, captionLines: captionLines(i) });

  return openStrobeShell({
    labels: {
      title: t('strobe.title'), close: t('data.close'), zoomIn: t('strobe.zoomIn'), zoomOut: t('strobe.zoomOut'),
      fit: t('strobe.fit'), run: t('strobe.run'), export: t('strobe.export'), hint: t('strobe.hint'), check: t('grid'),
    },
    runCount: table.runs.length,
    runIndex: o.runIndex,
    check: { checked: o.grid, disabled: !!o.gridLocked },
    box,
    draw(ctx, v) {
      drawStrobe(ctx, { ...base(v.runIndex, v.checked), tr: v.tr, width: v.width, height: v.height, fontScale: 1 });
    },
    exportPNG({ runIndex, checked }) {
      const size = exportSizeFor(box, eo);
      if (!size) return Promise.resolve(null);
      const tr = { scale: size.scale, tx: MARGIN_PX - box.x0 * size.scale, ty: CAPTION_PX + MARGIN_PX + box.y1 * size.scale };
      return canvasToPNG(size.w, size.h, (ctx) => drawStrobe(ctx, { ...base(runIndex, checked), tr, width: size.w, height: size.h, fontScale: 2.2 }));
    },
    exportFilename: (i) => `sviedieni-stroboskops-${table.index}-${i + 1}.png`,
    exportFailedText: () => t('strobe.exportFailed', minSize),
    onExportFailed: () => o.onExportFailed?.(minSize),
    onCheckChange: (on) => o.onGridChange?.(on),
    onClose: o.onClose,
  });
}
```

- [ ] **Step 4: Run the suite**

Run: `npm test 2>&1 | tail -8`
Expected: PASS, `fail 0`.

- [ ] **Step 5: Commit**

```bash
git add assets/projectile/strobe.js tests/projectile-strobe.test.js
git commit -m "Add the K-02 strobe image: shifted positions for vertical throws, second ball, grid, PNG export

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: The control panel

**Files:**
- Create: `assets/projectile/panel.js`

**Interfaces:**
- Consumes: `SCALES`, `MODES` (Task 3); `formatNumber`, `decimalsOf`; `renderTable` from `assets/measure/data-table-view.js`.
- Produces: `createPanel(root, { t, onAction }) → { render(vm) }` where `vm = { settings, locked: Set, running, lang, hasTableForSettings, results: { tables: [{ key, label }], shownKey, shownIsOther, otherText, showCompact, compactModel, canTable, canStrobe } }`. Calls `onAction(type, value)` with types `mode` (string), `dt` (number), `slow` (bool), `second` (bool), `scale` (string), `grid` (bool), `run`, `selectTable` (key string), `openTable`, `openStrobe`. Blocks go into `#blockMode`, `#blockRun`, `#blockResults`, `#blockDims` (order on the page: mode, run, results, dims — so PALAIST is visible without scrolling, as in K-01).

- [ ] **Step 1: Implement `assets/projectile/panel.js`**

(Pattern and helpers as in `assets/rolling-ball/panel.js`; read it first.)

```js
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
  };
  const last = {};
  const compactHtml = new WeakMap(); // modelis → gatavs HTML (netiek būvēts katrā kadrā)

  function setBlock(name, html) {
    if (last[name] === html) return;
    last[name] = html;
    blocks[name].innerHTML = html;
  }

  const fixTag = (locked, key) => (locked.has(key) ? `<span class="fix" title="${esc(t('dims.fixedTitle'))}">${esc(t('dims.fixed'))}</span>` : '');

  const btn = (fid, label, { action, value, pressed, disabled, title }) =>
    `<button type="button" class="btn" data-fid="${fid}" data-a="${action}" data-v="${esc(value)}" aria-pressed="${pressed}"${disabled ? ' disabled' : ''}${title ? ` title="${esc(title)}" aria-label="${esc(title)}"` : ''}>${esc(label)}</button>`;

  const check = (fid, action, on, disabled, label, fix = '') =>
    `<label class="check"><input type="checkbox" data-fid="${fid}" data-a="${action}"${on ? ' checked' : ''}${disabled ? ' disabled' : ''}>${esc(label)}${fix}</label>`;

  function modeBlock(vm) {
    const { settings: s, locked, running, lang } = vm;
    let h = `<div class="block-title">${esc(t('blk.mode'))}${fixTag(locked, 'mode')}</div><div class="seg">`;
    for (const m of MODES) {
      const disabled = running || (locked.has('mode') && s.mode !== m);
      h += btn(`mode-${m}`, t(`mode.${m}`), { action: 'mode', value: m, pressed: s.mode === m, disabled, title: t(`mode.${m}.name`) });
    }
    h += '</div>';
    h += `<div class="hint">${esc(t(`mode.${s.mode}.hint`))}</div>`;
    h += `<div class="row"><span class="row-label">${esc(t('dt.label'))}${fixTag(locked, 'dt')}</span><div class="seg" style="flex:1;max-width:200px">`;
    for (const v of SCALES[s.scale].dtOptions) {
      h += btn(`dt${v}`, `${formatNumber(v, decimalsOf(v), lang)} s`, { action: 'dt', value: v, pressed: s.dt === v, disabled: running || (locked.has('dt') && s.dt !== v) });
    }
    h += '</div></div>';
    h += check('slow', 'slow', s.slow, running, t('slow'));
    if (s.mode === 'horizontal') h += check('second', 'second', s.second, running || locked.has('second'), t('second'), fixTag(locked, 'second'));
    return h;
  }

  function dimsBlock(vm) {
    const { settings: s, locked, running, lang } = vm;
    const sc = SCALES[s.scale];
    let h = `<div class="block-title">${esc(t('blk.dims'))}</div>`;
    h += `<div class="row" style="margin-top:0"><span class="row-label">${esc(t('scale.label'))}${fixTag(locked, 'scale')}</span><div class="seg" style="flex:1">`;
    for (const k of Object.keys(SCALES)) {
      h += btn(`scale-${k}`, t(`scale.${k}`), { action: 'scale', value: k, pressed: s.scale === k, disabled: running || (locked.has('scale') && s.scale !== k) });
    }
    h += '</div></div>';
    const num = (v, dec) => formatNumber(v, dec, lang);
    const unit = (u) => ` <span class="unit">${esc(u)}</span>`;
    const ro = (key, k, html) => `<div class="readout"><span class="k">${k}${fixTag(locked, key)}</span><span class="v">${html}</span></div>`;
    h += '<div style="margin-top:8px">';
    h += ro('h', 'h', num(s.h, sc.h.decimals) + unit(sc.unit));
    let v0 = num(Math.abs(s.v0), sc.v0.decimals) + unit(`${sc.unit}/s`);
    if (s.mode === 'vertical' && s.v0 !== 0) v0 += unit(t(s.v0 > 0 ? 'dir.up' : 'dir.down'));
    h += ro('v0', 'v₀', v0);
    if (s.mode === 'oblique') h += ro('alpha', 'α', num(s.alphaDeg, 0) + unit('°'));
    h += '</div>';
    h += check('grid', 'grid', s.grid, running || locked.has('grid'), t('grid'), fixTag(locked, 'grid'));
    h += `<div class="hint">${esc(t('dims.hint'))}</div>`;
    return h;
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
      const fid = document.activeElement?.dataset?.fid;
      setBlock('mode', modeBlock(vm));
      setBlock('run', runBlock(vm));
      setBlock('results', resultsBlock(vm));
      setBlock('dims', dimsBlock(vm));
      if (fid && document.activeElement?.dataset?.fid !== fid) {
        const again = [...root.querySelectorAll('[data-fid]')].find((e) => e.dataset.fid === fid);
        again?.focus();
      }
    },
  };
}
```

- [ ] **Step 2: Run the suite** (the i18n key scan covers this file)

Run: `npm test 2>&1 | tail -8`
Expected: PASS, `fail 0`.

- [ ] **Step 3: Commit**

```bash
git add assets/projectile/panel.js
git commit -m "Add the K-02 control panel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: The page and its wiring, verified in the browser

**Files:**
- Create: `projectile-motion.html`, `assets/projectile/main.js`

**Interfaces:**
- Consumes: everything above. `createHandles` from `assets/measure/handles.js`; `createNotices`; `openDataTable`; `createI18n`, `createTheme`, `mountTitleBlock`, `setupCanvas`, `startLoop` from `assets/sim-core.js`.
- Produces: the working page; `window.__pm = { state, setSettings(next) }` for browser checks.

- [ ] **Step 1: Create `projectile-motion.html`**

```html
<!DOCTYPE html>
<html lang="lv" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kritieni un sviedieni — FIZ-SIM</title>
<script>
  // Tēma pirms pirmā zīmējuma, lai nemirgo; tā pati loģika kā sim-core.js createTheme().
  try {
    var saved = localStorage.getItem('fiz-sim-theme');
    document.documentElement.dataset.theme = saved || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  } catch (e) {}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/sim-common.css">
<script type="module" src="assets/projectile/main.js"></script>
</head>
<body>
<div class="frame">
  <header>
    <a class="back" href="index.html" data-i18n="page.back">← SARAKSTS</a>
    <h1><span data-i18n="page.heading">KRITIENI UN SVIEDIENI</span> <span class="sheet-no">K-02</span></h1>
  </header>
  <div class="work">
    <div class="drawing" id="drawing">
      <p class="boot-msg" id="bootMsg">Lapa neielādējās. Atver to caur tīmekļa serveri (piem. ans-sta.github.io/fiz-sim), nevis kā failu no datora. · The page did not load. Open it through a web server, not as a local file.</p>
      <canvas id="scene" role="img" data-i18n-aria="scene.aria"></canvas>
      <div class="handles" id="handles"></div>
      <div class="notices" id="notices" role="status" aria-live="polite"></div>
    </div>
    <aside class="controls" id="controls">
      <section class="block" id="blockMode"></section>
      <section class="block" id="blockRun"></section>
      <section class="block" id="blockResults"></section>
      <section class="block" id="blockDims"></section>
      <div class="titleblock" id="titleblock"></div>
    </aside>
  </div>
</div>
</body>
</html>
```

Compare it once with `rolling-ball.html` (`diff rolling-ball.html projectile-motion.html`): the only differences must be the title, heading, sheet number, script path and the panel blocks.

- [ ] **Step 2: Create `assets/projectile/main.js`**

```js
import { createI18n, createTheme, mountTitleBlock, setupCanvas, startLoop } from '../sim-core.js';
import { STRINGS } from './i18n.js';
import { SCALES, ALPHA } from './scales.js';
import {
  derive, settingsKey, withMode, withScale, withH, withV0, withAlpha, withDt, withSecond, withGrid, withSlow,
  changedLocked, v0Range, SLOW_FACTOR,
} from './model.js';
import { settingsFromURL, warningText } from './params.js';
import { sceneBox, sceneLayout, drawScene, handleAnchors, valueFromPointer, launchPoint, arrowGeometry, ARC_R } from './scene.js';
import { createPanel } from './panel.js';
import { createHandles } from '../measure/handles.js';
import { createNotices } from '../measure/notices.js';
import { formatNumber } from '../measure/format.js';
import { simulateRun } from './experiment.js';
import { createResults, tableModel } from './results.js';
import { openDataTable } from '../measure/data-table-view.js';
import { openProjectileStrobe } from './strobe.js';

document.getElementById('bootMsg')?.remove();
const i18n = createI18n(STRINGS);
const theme = createTheme();
mountTitleBlock(document.getElementById('titleblock'), { i18n, theme, sheet: 'K-02', topicKey: 'tb.topicValue' });
i18n.apply();

const url = settingsFromURL(location.search);
const state = {
  settings: url.settings,
  locked: url.locked,
  views: url.views,
  noise: url.noise,
  traps: url.traps,
  seed: url.seed,
  running: null, // { run, simT }
  results: createResults(),
  lastRun: null,
  shownKey: null,
  overlay: null, // { kind, key, close, runIndex? }
  selected: null,
  drag: null, // { id, box } — rasējuma mērogs velkot nemainās
};

const notices = createNotices(document.getElementById('notices'), { closeLabel: () => i18n.t('notice.close') });
url.warnings.forEach((w, i) => {
  notices.show(`url${i}`, () => warningText(w, { t: i18n.t, lang: i18n.lang() }));
});

const panel = createPanel(document.getElementById('controls'), { t: i18n.t, onAction });
const handles = createHandles(document.getElementById('handles'), {
  onChange: onHandleChange,
  onDragStart(id) {
    if (state.running) return false;
    state.drag = { id, box: currentBox() };
  },
  onSelect(id) {
    if (state.selected === id) return;
    state.selected = id;
    render();
  },
  onDragEnd() {
    state.drag = null;
    render();
  },
  labels: {
    decrease: (name) => i18n.t('dims.decrease', { name }),
    increase: (name) => i18n.t('dims.increase', { name }),
  },
});

const canvas = document.getElementById('scene');
let view = null; // setupCanvas izsauc render jau pirms atgriešanās
view = setupCanvas(canvas, () => render());

function currentBox() {
  return sceneBox(state.settings, derive(state.settings));
}

function layout() {
  if (!view) return null;
  const { w, h } = view.size();
  return sceneLayout(w, h, state.drag ? state.drag.box : currentBox());
}

function handleItems(lay, s, lang) {
  const t = i18n.t;
  const sc = SCALES[s.scale];
  const a = handleAnchors(lay, s);
  const num = (v, dec) => formatNumber(v, dec, lang);
  const items = [];
  const add = (key, o) => {
    const base = { labelAnchor: 'center', labelClass: '', ...o };
    if (base.labelAnchor === 'center') base.labelX = Math.min(Math.max(base.labelX, 70), lay.width - 70);
    if (state.locked.has(key)) {
      base.kind = 'none';
      base.labelClass = 'locked';
      base.labelText = `${o.labelText} ${t('dims.fixed')}`;
    }
    items.push(base);
  };

  const hText = `h = ${num(s.h, sc.h.decimals)} ${sc.unit}`;
  add('h', {
    id: 'h', kind: 'diamond', x: a.h.x, y: a.h.y,
    labelText: hText, labelX: a.h.x - 10, labelY: (a.h.y + lay.toScreen(0, 0).y) / 2, labelAnchor: 'right',
    ariaLabel: t('dims.h'), min: sc.h.min, max: sc.h.max, step: sc.h.step, value: s.h, valueText: hText,
  });

  const r = v0Range(s.scale, s.mode);
  const dirWord = s.mode === 'vertical' && s.v0 !== 0 ? ` ${t(s.v0 > 0 ? 'dir.up' : 'dir.down')}` : '';
  const vText = `v₀ = ${num(Math.abs(s.v0), sc.v0.decimals)} ${sc.unit}/s${dirWord}`;
  const { dir } = arrowGeometry(lay, s);
  const vertical = s.mode === 'vertical';
  add('v0', {
    id: 'v0', kind: 'diamond', x: a.v0.x, y: a.v0.y,
    labelText: vText,
    labelX: vertical ? a.v0.x + 16 : a.v0.x + dir.x * 18,
    labelY: vertical ? a.v0.y : a.v0.y + dir.y * 18 - 16,
    labelAnchor: vertical ? 'left' : 'center',
    ariaLabel: t('dims.v0'), min: r.min, max: r.max, step: sc.v0.step, value: s.v0, valueText: vText,
  });

  if (s.mode === 'oblique') {
    const p = launchPoint(lay, s);
    const aText = `α = ${num(s.alphaDeg, 0)}°`;
    add('alpha', {
      id: 'alpha', kind: 'diamond', x: a.alpha.x, y: a.alpha.y,
      labelText: aText, labelX: p.x + ARC_R + 14, labelY: p.y + 14, labelAnchor: 'left',
      ariaLabel: t('dims.alpha'), min: ALPHA.min, max: ALPHA.max, step: ALPHA.step, value: s.alphaDeg, valueText: aText,
    });
  }
  return items;
}

const SETTERS = { h: withH, v0: withV0, alpha: withAlpha };
const currentValue = (id, s) => ({ h: s.h, v0: s.v0, alpha: s.alphaDeg })[id];

function onHandleChange(id, change) {
  if (state.running || state.locked.has(id)) return;
  const lay = layout();
  if (!lay) return;
  const s = state.settings;
  let next;
  if (change.pointer) {
    const v = valueFromPointer(id, lay, s, change.pointer);
    next = SETTERS[id](s, v);
    // slīpajā sviedienā bultas galu velkot mainās arī α
    if (id === 'v0' && s.mode === 'oblique' && !state.locked.has('alpha')) next = withAlpha(next, valueFromPointer('alpha', lay, s, change.pointer));
  } else if ('delta' in change) next = SETTERS[id](s, currentValue(id, s) + change.delta);
  else next = SETTERS[id](s, change.set);
  if (JSON.stringify(next) === JSON.stringify(s)) return;
  applySettings(next);
}

const LOCK_SYMBOLS = { h: 'h', v0: 'v₀', alpha: 'α', dt: 'Δt' };
function lockName(k) {
  return LOCK_SYMBOLS[k] ?? i18n.t(`lock.${k}`);
}

// Iestatījumu maiņa, kas izmainītu saitē nofiksētu lielumu, tiek noraidīta.
function applySettings(next) {
  const bad = changedLocked(state.settings, next, state.locked);
  if (bad.length) {
    notices.show('lockConflict', () => i18n.t('lockConflict', { names: bad.map(lockName).join(', ') }));
    return false;
  }
  notices.clear('lockConflict');
  state.settings = next;
  resetAfterChange();
  render();
  return true;
}

function resetAfterChange() {
  state.lastRun = null;
  state.shownKey = null;
  notices.clear('flight');
}

function currentKey() {
  return settingsKey(state.settings, { noise: state.noise, traps: state.traps });
}

let stopLoop = () => {};

function startRun() {
  if (state.running) return;
  const key = currentKey();
  const run = simulateRun(state.settings, { seed: state.seed, repeat: state.results.nextRepeat(key), noise: state.noise, traps: state.traps });
  if (!run.ok) {
    const mode = state.settings.mode;
    notices.show('flight', () => i18n.t(run.reason === 'none' ? `notice.noFlight.${mode}` : 'notice.short'));
    return;
  }
  notices.clear('flight');
  state.running = { run, simT: 0 };
  state.lastRun = null;
  state.shownKey = null;
  stopLoop = startLoop(step);
  render();
}

function step(dt) {
  const r = state.running;
  if (!r) return;
  r.simT = Math.min(r.run.tEnd, r.simT + dt * (state.settings.slow ? SLOW_FACTOR : 1));
  if (r.simT >= r.run.tEnd) finishRun();
  render();
}

function finishRun() {
  stopLoop();
  state.results.add(state.settings, state.running.run, { seed: state.seed, noise: state.noise, traps: state.traps });
  state.lastRun = state.running.run;
  state.running = null;
}

function ballPositions() {
  const s = state.settings;
  const r = state.running;
  const run = r ? r.run : state.lastRun;
  if (!run) {
    const start = { x: 0, y: s.h };
    return { ball: start, ball2: s.mode === 'horizontal' && s.second ? start : null };
  }
  const tNow = r ? r.simT : run.tEnd;
  return { ball: run.posAt(tNow), ball2: run.posAt2 ? run.posAt2(tNow) : null };
}

function shownTable() {
  return state.results.byKey(state.shownKey ?? currentKey());
}

function openTable(key) {
  const table = state.results.byKey(key);
  state.overlay?.close();
  state.overlay = null;
  if (!table) return;
  const t = i18n.t;
  const lang = i18n.lang();
  const handle = openDataTable(tableModel(table, { t, lang }), {
    lang,
    labels: {
      heading: t('results.table'), copy: t('data.copy'), csv: t('data.csv'), close: t('data.close'),
      copied: t('data.copied'), copyFailed: t('data.copyFailed'),
    },
    onClose() {
      if (state.overlay && state.overlay.close === handle.close) state.overlay = null;
    },
  });
  state.overlay = { kind: 'table', key, close: handle.close };
}

function openStrobeView(key, runIndex) {
  const table = state.results.byKey(key);
  state.overlay?.close();
  state.overlay = null;
  if (!table) return;
  const handle = openProjectileStrobe({
    table,
    runIndex: runIndex ?? table.runs.length - 1,
    t: i18n.t,
    lang: i18n.lang(),
    colors: theme.colors(),
    grid: state.settings.grid,
    gridLocked: state.locked.has('grid'),
    onGridChange(on) {
      state.settings = withGrid(state.settings, on);
      render();
    },
    onExportFailed({ w, h }) {
      notices.show('export', () => i18n.t('strobe.exportFailed', { w, h }));
    },
    onClose() {
      if (state.overlay && state.overlay.close === handle.close) state.overlay = null;
    },
  });
  state.overlay = { kind: 'strobe', key, close: handle.close, runIndex: handle.runIndex };
}

function reopenOverlay() {
  const ov = state.overlay;
  if (!ov) return;
  if (ov.kind === 'strobe') openStrobeView(ov.key, ov.runIndex());
  else openTable(ov.key);
}

function onAction(type, value) {
  if (type === 'selectTable') {
    state.shownKey = value || null;
    render();
    return;
  }
  if (type === 'openTable') {
    const tb = shownTable();
    if (tb && state.views.table) openTable(tb.key);
    return;
  }
  if (type === 'openStrobe') {
    const tb = shownTable();
    if (tb && state.views.strobe) openStrobeView(tb.key);
    return;
  }
  if (state.running) return;
  if (type === 'run') {
    startRun();
    return;
  }
  const s = state.settings;
  const lk = (k) => state.locked.has(k);
  let next = s;
  switch (type) {
    case 'mode': if (!lk('mode')) next = withMode(s, value); break;
    case 'scale': if (!lk('scale')) next = withScale(s, value); break;
    case 'dt': if (!lk('dt')) next = withDt(s, value); break;
    case 'slow': next = withSlow(s, value); break;
    case 'second': if (!lk('second')) next = withSecond(s, value); break;
    case 'grid': if (!lk('grid')) next = withGrid(s, value); break;
    default: return;
  }
  if (next === s) return;
  applySettings(next);
}

let compactCache = { id: null, model: null };
function compactModelFor(shown, lang) {
  const id = `${shown.key}|${shown.runs.length}|${lang}`;
  if (compactCache.id !== id) compactCache = { id, model: tableModel(shown, { t: i18n.t, lang }) };
  return compactCache.model;
}

function resultsVM(lang) {
  const t = i18n.t;
  const tables = state.results.tables();
  const cur = currentKey();
  const shown = shownTable();
  const shownKey = state.shownKey ?? cur;
  return {
    tables: tables.map((tb) => ({ key: tb.key, label: t('results.option', { n: tb.index, m: tb.runs.length }) })),
    shownKey,
    shownIsOther: !!shown && shownKey !== cur,
    otherText: shown ? t('results.other', { n: shown.index }) : '',
    showCompact: state.views.table, // view=strobe&lock=1: x, y skolēns nolasa tikai no attēla
    compactModel: shown ? compactModelFor(shown, lang) : null,
    canTable: state.views.table && !!shown,
    canStrobe: state.views.strobe && !!shown,
  };
}

function render() {
  if (!view) return;
  document.getElementById('drawing').classList.toggle('running', !!state.running);
  const s = state.settings;
  const lang = i18n.lang();
  const lay = layout();
  const pos = ballPositions();
  drawScene(view.ctx, lay, {
    settings: s, derived: derive(s), colors: theme.colors(), t: i18n.t, lang, ball: pos.ball, ball2: pos.ball2, showGrid: s.grid,
  });
  panel.render({
    settings: s, locked: state.locked, running: state.running, lang,
    hasTableForSettings: !!state.results.byKey(currentKey()),
    results: resultsVM(lang),
  });
  const items = handleItems(lay, s, lang);
  handles.update(items);
  if (state.selected && !items.some((it) => it.id === state.selected)) {
    state.selected = null;
    handles.setSelected(null);
  }
}

theme.onChange(() => {
  render();
  if (state.overlay?.kind === 'strobe') reopenOverlay();
});
i18n.onChange(() => {
  notices.refresh();
  render();
  reopenOverlay();
});
document.fonts.ready.then(render);

// Testu āķis pārlūka pārbaudēm (Playwright): nolasīt stāvokli un mainīt iestatījumus.
window.__pm = {
  get state() {
    return state;
  },
  setSettings(next) {
    state.settings = next;
    resetAfterChange();
    render();
  },
};
render();
```

- [ ] **Step 3: Run the suite**

Run: `npm test 2>&1 | tail -8`
Expected: PASS, `fail 0`.

- [ ] **Step 4: Browser check — desktop (1280×800)**

Start the server (see “How to verify”). Open `http://localhost:8766/projectile-motion.html`. Check and screenshot each (`k02_<n>.png`):

1. No console errors except favicon. The drawing shows the table on the left, the ball on its edge, the v₀ arrow pointing right, the h dimension line with `h = 80 cm`, the label `v₀ = 150 cm/s`, the measuring grid with numbers, `x = 0; y = 0` at the origin and `KUSTĪBAS SĀKUMPUNKTS`.
2. Click `▶ PALAIST`. The ball flies in slow motion and lands; the results block shows `1. tabula · mērījumi: 1` and a compact table with columns `t, s`, `x₁…`, `y₁…`. Click `DATU TABULA` — full-screen table, 9 rows (0,00 … 0,40 s); close. Click `STROBOSKOPS` — positions 0…8 on a parabola with numbers, grid, the table edge; `VISS`, `+`, `−` work; untick `RĀDĪT MĒRREŽĢI` — the grid disappears. Click `EKSPORTĒT ATTĒLU` — no error in the console. Close.
3. Click `↻ ATKĀRTOT` twice: the table has 3 runs (`x₃`, `y₃` columns).
4. Mode 1 (`1 · ↕`): v₀ = 150 cm/s stays, the label reads `uz augšu` and the arrow points up. Drag the v₀ handle down past the ball: the label shows `uz leju` and the arrow points down. Set v₀ = 0 (`browser_evaluate` `__pm.setSettings({ ...__pm.state.settings, v0: 0 })`), run, open the strobe: the positions are shifted to the right one after another (0, 1, 2 …) and the caption says so; the data table has only `t` and `y` columns.
5. Mode 3 (`3 · ↗`): the α arc and the α handle appear (`α = 45°`). Drag the arrow tip — both v₀ and α change. Run; the strobe shows the arc of positions.
6. Mode 2, tick `OTRA BUMBIŅA KRĪT VIENLAIKUS`, run: two balls fall, they land together; the strobe shows hollow circles straight below the table edge at the same heights as the thrown ball, with the second-ball note in the caption.
7. Scale `TORNIS · m`: h = 20,0 m, v₀ = 10,0 m/s, Δt buttons 0,1 / 0,2 / 0,5 s, a hatched tower. Run — real time, about 2 s.
8. Review Focus 2: in mode 2 drag h to 0 and press PALAIST → the notice `No zemes (h = 0) horizontāli mesta bumbiņa uzreiz ir uz zemes. Palielini h.`, no new table. On the tower, set h = 1 m (`__pm.setSettings`) and Δt = 0,5 s, PALAIST → `Lidojums ir par īsu…`.
9. Switch the language to EN and the theme to light (title block): all texts English, drawing readable in light colours; screenshot.

- [ ] **Step 5: Browser check — teacher links**

10. `?scale=tower&h=120&dt=0.02` → two notices (h clamped to 50 m, Δt not for this scale) with the exact texts from Task 6.
11. `?scale=tower&mode=3&h=30&alpha=40&lock=1` → h and α labels show `FIKS.` and have no handle, the scale and mode buttons other than the chosen ones are disabled, `FIKS.` tags in the panel; the v₀ handle still works.
12. `?view=strobe&lock=1` → after a run only `STROBOSKOPS` is offered and no compact table is shown.

- [ ] **Step 6: Browser check — phone sizes**

13. 390×844 portrait: the drawing on top, the panel below, no horizontal scroll (`browser_evaluate` `document.documentElement.scrollWidth <= innerWidth`), PALAIST reachable, the drawing shows table, ball and arrow inside the canvas. Screenshot.
14. 844×390 landscape: same checks. Screenshot.
15. Keyboard: Tab to the h handle, ArrowUp → h grows by 1 cm (table); the focus ring is visible.

Fix anything that fails before committing (in the module that owns it; re-run `npm test`).

- [ ] **Step 7: Commit**

```bash
git add projectile-motion.html assets/projectile/main.js
git commit -m "Add the K-02 page “Kritieni un sviedieni” and wire it together

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Index card and teacher-link documentation

**Files:**
- Modify: `index.html` (one new card after CARD 5, two translation keys in each language), `README.md` (new section after “Teacher links (K-01)”)

- [ ] **Step 1: Add the card to `index.html`**

Insert right after the closing `</a>` of `<!-- ══════ CARD 5: Ball in a groove ══════ -->`:

```html

    <!-- ══════ CARD 6: Falls and throws ══════ -->
    <a href="projectile-motion.html" class="card">
      <div class="card-visual">
        <svg width="200" height="140" viewBox="0 0 200 140">
          <!-- Ground -->
          <line x1="15" y1="118" x2="190" y2="118" stroke="#5a6d88" stroke-width="1.2"/>
          <!-- Table -->
          <rect x="18" y="48" width="44" height="4" fill="none" stroke="#5a6d88" stroke-width="1"/>
          <line x1="22" y1="52" x2="22" y2="118" stroke="#5a6d88" stroke-width="1"/>
          <line x1="58" y1="52" x2="58" y2="118" stroke="#5a6d88" stroke-width="1"/>
          <!-- Velocity arrow -->
          <path d="M 66 44 L 92 44 M 92 44 l -6 -3 M 92 44 l -6 3" stroke="#c8d6e8" stroke-width="1.2" fill="none"/>
          <!-- Strobe positions on a parabola -->
          <circle cx="66" cy="44" r="4" fill="none" stroke="#ffd70088" stroke-width="1"/>
          <circle cx="86" cy="47" r="4" fill="none" stroke="#ffd70099" stroke-width="1"/>
          <circle cx="106" cy="56" r="4" fill="none" stroke="#ffd700aa" stroke-width="1"/>
          <circle cx="126" cy="71" r="4" fill="none" stroke="#ffd700bb" stroke-width="1"/>
          <circle cx="146" cy="92" r="4" fill="none" stroke="#ffd700cc" stroke-width="1"/>
          <circle cx="164" cy="114" r="4" fill="#ffd70066" stroke="#ffd700" stroke-width="1.2"/>
        </svg>
      </div>
      <div class="card-body">
        <div class="card-tag tag-mechanics" data-i18n="tagMechanics">Mechanics</div>
        <div class="card-title" data-i18n="fallsTitle">Falls and Throws</div>
        <p class="card-desc" data-i18n="fallsDesc">Drop or throw a ball from a table or a tower and collect realistic measurement data: positions x and y every Δt and a strobe image.</p>
        <div class="card-status status-live">
          <div class="status-dot"></div>
          <span data-i18n="statusLive">Live</span>
        </div>
      </div>
    </a>
```

In the `TRANSLATIONS` object, add after `rollingDesc` in `en`:

```js
    fallsTitle: "Falls and Throws",
    fallsDesc: "Drop or throw a ball from a table or a tower and collect realistic measurement data: positions x and y every Δt and a strobe image.",
```

and after `rollingDesc` in `lv`:

```js
    fallsTitle: "Kritieni un sviedieni",
    fallsDesc: "Palaid bumbiņu krist vai met to no galda vai torņa un iegūsti ticamus mērījumu datus: koordinātas x un y ik pēc Δt un stroboskopa attēlu.",
```

- [ ] **Step 2: Add the README section**

Insert after the K-01 example block (the line `    rolling-ball.html?L=80&h=2.0&ball=steel16&level=3&dt=0.5&view=strobe&lock=1`):

```markdown

## Teacher links (K-02)

Parameters of `projectile-motion.html`, given in the URL. Without `lock=1` they are only starting values. Unknown parameters are ignored. Lengths and speeds are in the unit of the scale: cm and cm/s on the table, m and m/s on the tower.

| Parameter | Meaning |
| --------- | ------- |
| `mode=1\|2\|3` | 1 — fall and vertical throw, 2 — horizontal throw, 3 — oblique throw. Without `v0`, mode 1 starts as a free fall (v₀ = 0) |
| `scale=table\|tower` | Classroom table (cm, h 0–150, v₀ up to 400 cm/s) or tower (m, h 0–50, v₀ up to 30 m/s) |
| `h=<number>` | Launch height (ball centre above the ground); larger values are clamped with a notice |
| `v0=<number>` | Initial speed. In mode 1 the sign is the direction (+ up, − down); in modes 2 and 3 it must be ≥ 0 |
| `alpha=<number>` | Launch angle in mode 3, degrees (0–90) |
| `dt=<number>` | Strobe interval Δt, s: `0.02`, `0.05`, `0.1` on the table; `0.1`, `0.2`, `0.5` on the tower |
| `second=0\|1` | Mode 2: a second ball drops from the same point at the same moment |
| `grid=0\|1` | Measuring grid in the drawing and in the strobe view |
| `view=table\|strobe\|both` | Which result view is shown (takes effect with `lock`) |
| `lock=1` (or `lock=true`) | Locks every setting that is given in the link |
| `noise=0\|1\|2` | Teacher only: measurement noise strength (0 none, 1 default, 2 double) |
| `traps=late` | Teacher only: in one of the first three repeats of a table the clock starts 2–3 frames late |
| `seed=<number>` | Teacher only: integer 1–2147483647; the same seed gives the same noise in every tab |

Example (individual data for a horizontal throw from the table, read from the strobe image only):

    projectile-motion.html?mode=2&h=90&v0=180&dt=0.05&view=strobe&lock=1
```

Also in the README’s local-run line `# open http://localhost:8765/rolling-ball.html`, add a second line `# or http://localhost:8765/projectile-motion.html`.

- [ ] **Step 3: Browser check**

Open `http://localhost:8766/index.html`: the new card is shown after “Lodīte renītē” in LV and EN, the click opens `projectile-motion.html`. Open the README example link: horizontal throw, h = 90 cm, v₀ = 180 cm/s, Δt 0,05 s, all fixed.

- [ ] **Step 4: Run the suite and commit**

```bash
npm test 2>&1 | tail -4
git add index.html README.md
git commit -m "Add the K-02 card to the index and document its teacher links

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
