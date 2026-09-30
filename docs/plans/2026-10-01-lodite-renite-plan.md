# Lodīte renītē (K-01), 1. kārta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `rolling-ball.html` (sheet K-01), phase 1 of the “Lodīte renītē” spec, as the first page of the technical-drawing design system on shared ES modules.

**Architecture:** No build step. The page loads `assets/rolling-ball/main.js` as an ES module. Pure logic (physics, noise, URL params, tables, export text, geometry) lives in small modules tested with `node --test`; DOM modules (panel, handles, overlays, strobe view) are verified in a real browser. Pieces the sibling simulation K-02 “Kritieni un sviedieni” will reuse live in `assets/sim-core.js`, `assets/sim-common.css`, `assets/translate.js`, `assets/physics/` and `assets/measure/`.

**Tech Stack:** vanilla JavaScript ES modules, Canvas 2D, CSS custom properties, Node 26 `node:test` (zero dependencies), Python `http.server` + Playwright MCP for browser checks.

**Spec:** `docs/plans/2026-09-30-lodite-renite.md` (business requirements; phase 1 scope = section 15, decisions = section 13). Visual system: `docs/plans/2026-07-15-rasejuma-dizains.md` and `design.html` (approved 2026-09-30).

## Global Constraints

- Work on branch `rolling-ball`. Commit after every task. Never push. Never modify `electric-field.html`, `electric-field-hockey.html`, `millikan.html`, `newtons-cannon.html`, `el-lauka-hokejs.html`, `design.html`. Only `index.html` and `README.md` get additions, in Task 14.
- No npm dependencies. `package.json` exists only for `"type": "module"` and `npm test`.
- Browser imports use relative paths with the `.js` extension. No bare specifiers, no top-level `await`, no build tools.
- Units in rolling-ball code: centimetres, seconds, grams; degrees in the UI, radians inside maths. g = 9.81 m/s², i.e. `G_CM = 981` cm/s².
- Student-facing output (screen tables, KOPĒT, CSV, PNG) contains only t and x plus a settings line. Never a, v, Δx, Δt columns, averages, fits or graphs. The panel shows only settings (L, h, α, x₀), never a or v.
- Every user-visible string comes from `assets/rolling-ball/i18n.js` (LV and EN). Latvian typography: quotes “…”, spaced em-dash —, en-dash for ranges without spaces (2–6), ellipsis …, apostrophe ’. Shared modules in `assets/measure/` never contain UI text; callers pass labels in.
- Numbers: LV decimal comma, EN decimal point; a value and its ± error have the same number of decimals. Data cells use ASCII `-` for negatives so Excel parses them.
- Visual (approved design): IBM Plex Mono 400/500/600 for all chrome; IBM Plex Sans 400 only for multi-sentence hints and notices; colours only through CSS tokens (both themes); 1 px hairlines; no shadows, no rounded corners, no glows; `--accent` only for the active/selected/focused state. Material colours for balls are physical colours (like charge colours in the design doc) and also come from tokens.
- `localStorage` keys: `physics-sims-lang` (shared with the old pages) and `fiz-sim-theme`. Every access in `try/catch`; the page must work when storage throws.
- Animation step is clamped to ≤ 0.05 s. Measurement data and strobe positions come from the analytic model (`run.xAt`, `run.timeTo`), never from animation frames.
- Every user-facing error names its own cause and what to do. No generic “something went wrong”.
- Every draggable handle is a focusable element with `role="slider"`, arrow-key control and a visible focus ring.
- Code comments are sparse and may be Latvian or English; identifiers are English.

## Review Focus

1. **Teacher link with bad or conflicting params** (`ball=steel12`, `h=2,5` with a decimal comma, `h` too large for `L`, `ball=steel10&profile=groove`, `fbclid=…` appended by Facebook) → the page opens, uses a sensible fallback, shows one precise notice per problem, silently ignores unknown params. Tests: Task 7.
2. **Student alternates settings** (h = 3 → h = 5 → back to h = 3) → each run lands in the table of its own settings, repeat numbering continues there, and the same seed + settings + repeat reproduces identical numbers. Tests: Tasks 6 and 8.
3. **Slope below the rolling-friction threshold** (h = 0 or h = 0,1 cm on 80 cm) → no run is recorded; a notice says the ball does not roll and gives the minimum h. Tests: Tasks 3 and 6; browser check Task 12.
4. **Tab hidden mid-run or a slow phone** → the ball does not jump; the numbers are identical to a run on a fast machine. Tests: Task 6 (data independent of frames); loop clamp in Task 9; browser check Task 12.
5. **Clipboard blocked (plain http, iOS) or PNG too large for the device** → precise notice with a workaround; nothing throws. Tests: Task 8 (`copyText` result shape); Task 13 (`exportSize` limits, null-blob path).

## File Structure

```
package.json                        NEW  {"type":"module"} + npm test
rolling-ball.html                   NEW  page skeleton (K-01)
assets/sim-common.css               NEW  tokens (both themes), frame, header, panel, handles, notices, overlays, responsive
assets/sim-core.js                  NEW  createI18n, createTheme, mountTitleBlock, setupCanvas, startLoop
assets/translate.js                 NEW  makeT(dict, getLang) — pure
assets/physics/constants.js         NEW  G
assets/physics/rolling.js           NEW  rolling acceleration — pure
assets/measure/rng.js               NEW  hash32, mulberry32, gaussian, rngFor, randomSeed — pure
assets/measure/format.js            NEW  decimalsOf, roundTo, formatNumber, parseDecimal — pure
assets/measure/url-params.js        NEW  parseParams(search, schema) — pure
assets/measure/table-export.js      NEW  toTSV, toCSV (pure) + copyText, downloadText, downloadBlob (DOM)
assets/measure/notices.js           NEW  createNotices (DOM)
assets/measure/overlay.js           NEW  openOverlay (DOM)
assets/measure/data-table-view.js   NEW  renderTable, openDataTable (DOM)
assets/measure/zoom-pan.js          NEW  fitTransform, zoomAt, panBy, toScreen (pure) + attachZoomPan (DOM)
assets/rolling-ball/balls.js        NEW  ball catalogue, GROOVE_W — pure
assets/rolling-ball/model.js        NEW  settings, constraints, derive, settingsKey — pure
assets/rolling-ball/i18n.js         NEW  STRINGS {lv, en}
assets/rolling-ball/experiment.js   NEW  simulateRun (noise, traps, levels) — pure
assets/rolling-ball/params.js       NEW  settingsFromURL, warningText — pure
assets/rolling-ball/results.js      NEW  createResults, tableModel — pure
assets/rolling-ball/scene.js        NEW  sceneLayout, handleAnchors, valueFromPointer (pure) + drawScene (canvas)
assets/rolling-ball/panel.js        NEW  control panel rendering (DOM)
assets/rolling-ball/handles.js      NEW  dimension-line handles over the canvas (DOM)
assets/rolling-ball/strobe.js       NEW  labelPositions, strobeWorldBox, exportSize (pure) + drawStrobe, renderStrobePNG, openStrobe
assets/rolling-ball/main.js         NEW  state and wiring
tests/*.test.js                     NEW  node:test suites for every pure module
index.html, README.md               MODIFY (Task 14 only)
```

## How to verify in a browser (Tasks 9–14)

ES modules do not load from `file://`. Serve the repo over http:

```bash
cd /Users/minim4/dev/sites/physics_sims && python3 -m http.server 8765 >/dev/null 2>&1 &
```

(The controller may already have started it; `curl -sI http://localhost:8765/rolling-ball.html` answers `200` if so.)

Use the Playwright MCP tools (load them with ToolSearch `select:mcp__plugin_playwright_playwright__browser_navigate,mcp__plugin_playwright_playwright__browser_take_screenshot,mcp__plugin_playwright_playwright__browser_console_messages,mcp__plugin_playwright_playwright__browser_evaluate,mcp__plugin_playwright_playwright__browser_resize,mcp__plugin_playwright_playwright__browser_click,mcp__plugin_playwright_playwright__browser_snapshot,mcp__plugin_playwright_playwright__browser_press_key,mcp__plugin_playwright_playwright__browser_drag`). Open `http://localhost:8765/rolling-ball.html`, check `browser_console_messages` for errors (there must be none), take screenshots into the session scratchpad directory, and look at them. Desktop size 1280×800; phone portrait 390×844; phone landscape 844×390. `main.js` exposes `window.__rb` (Task 10 onwards) so checks can read state and start runs through `browser_evaluate`.

---

### Task 1: Scaffolding, seeded random numbers, number formatting

**Files:**
- Create: `package.json`, `assets/measure/rng.js`, `assets/measure/format.js`
- Test: `tests/rng.test.js`, `tests/format.test.js`

**Interfaces:**
- Produces: `hash32(str) → uint32`, `mulberry32(seed) → () => number in [0,1)`, `gaussian(rand) → N(0,1) sample`, `rngFor(...parts) → rand`, `randomSeed() → int 100000–999999`; `decimalsOf(step) → int`, `roundTo(value, step) → number`, `formatNumber(value, decimals, lang) → string`, `parseDecimal(raw) → number | NaN`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "fiz-sim",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test \"tests/**/*.test.js\""
  }
}
```

- [ ] **Step 2: Write the failing tests**

`tests/rng.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hash32, mulberry32, gaussian, rngFor, randomSeed } from '../assets/measure/rng.js';

test('hash32 is FNV-1a 32-bit', () => {
  assert.equal(hash32(''), 2166136261);
  assert.equal(hash32('a'), 3826002220);
});

test('mulberry32 is deterministic and stays in [0, 1)', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  for (let i = 0; i < 1000; i++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
  }
});

test('different seeds give different sequences', () => {
  assert.notEqual(mulberry32(1)(), mulberry32(2)());
});

test('gaussian has mean ≈ 0 and sd ≈ 1', () => {
  const r = mulberry32(7);
  const n = 20000;
  let s = 0;
  let s2 = 0;
  for (let i = 0; i < n; i++) {
    const g = gaussian(r);
    s += g;
    s2 += g * g;
  }
  const mean = s / n;
  const sd = Math.sqrt(s2 / n - mean * mean);
  assert.ok(Math.abs(mean) < 0.03, `mean ${mean}`);
  assert.ok(Math.abs(sd - 1) < 0.03, `sd ${sd}`);
});

test('rngFor: same parts give the same stream, other parts another', () => {
  assert.equal(rngFor(5, 'k', 1)(), rngFor(5, 'k', 1)());
  assert.notEqual(rngFor(5, 'k', 1)(), rngFor(5, 'k', 2)());
});

test('randomSeed is a 6-digit integer', () => {
  for (let i = 0; i < 100; i++) {
    const s = randomSeed();
    assert.ok(Number.isInteger(s) && s >= 100000 && s <= 999999, String(s));
  }
});
```

`tests/format.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decimalsOf, roundTo, formatNumber, parseDecimal } from '../assets/measure/format.js';

test('decimalsOf', () => {
  assert.equal(decimalsOf(0.5), 1);
  assert.equal(decimalsOf(0.01), 2);
  assert.equal(decimalsOf(0.001), 3);
  assert.equal(decimalsOf(1), 0);
});

test('roundTo rounds to a step and removes float noise', () => {
  assert.equal(roundTo(12.26, 0.5), 12.5);
  assert.equal(roundTo(12.24, 0.5), 12);
  assert.equal(roundTo(2.7229, 0.01), 2.72);
  assert.equal(roundTo(0.30000000000000004, 0.1), 0.3);
  assert.equal(roundTo(3 * 0.2, 0.2), 0.6);
  assert.equal(roundTo(80.4, 1), 80);
});

test('formatNumber uses a decimal comma in LV and a point in EN', () => {
  assert.equal(formatNumber(2.7, 2, 'lv'), '2,70');
  assert.equal(formatNumber(2.7, 2, 'en'), '2.70');
  assert.equal(formatNumber(80, 0, 'lv'), '80');
  assert.equal(formatNumber(-1.5, 1, 'lv'), '-1,5');
});

test('formatNumber never prints negative zero and blanks missing values', () => {
  assert.equal(formatNumber(-0.001, 2, 'lv'), '0,00');
  assert.equal(formatNumber(null, 1, 'lv'), '');
  assert.equal(formatNumber(undefined, 1, 'lv'), '');
  assert.equal(formatNumber(NaN, 1, 'lv'), '');
});

test('parseDecimal accepts comma or point, rejects everything else', () => {
  assert.equal(parseDecimal('2,5'), 2.5);
  assert.equal(parseDecimal('2.5'), 2.5);
  assert.equal(parseDecimal(' 80 '), 80);
  assert.equal(parseDecimal('-3'), -3);
  assert.ok(Number.isNaN(parseDecimal('')));
  assert.ok(Number.isNaN(parseDecimal('abc')));
  assert.ok(Number.isNaN(parseDecimal('1e3')));
  assert.ok(Number.isNaN(parseDecimal('2,5,1')));
  assert.ok(Number.isNaN(parseDecimal(null)));
});
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '…/assets/measure/rng.js'`.

- [ ] **Step 4: Implement**

`assets/measure/rng.js`:

```js
// Gadījumskaitļi ar sēklu: tie paši iestatījumi + tā pati sēkla = tie paši dati.

export function hash32(str) {
  // FNV-1a, 32 biti
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let s = seed >>> 0;
  return function rand() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gaussian(rand) {
  // Box–Muller
  let u = 0;
  while (u === 0) u = rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function rngFor(...parts) {
  return mulberry32(hash32(parts.join('|')));
}

export function randomSeed() {
  return 100000 + Math.floor(Math.random() * 900000);
}
```

`assets/measure/format.js`:

```js
export function decimalsOf(step) {
  const s = String(step);
  const i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
}

export function roundTo(value, step) {
  return Number((Math.round(value / step) * step).toFixed(decimalsOf(step)));
}

export function formatNumber(value, decimals, lang) {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  let s = Number(value).toFixed(decimals);
  if (/^-0(\.0+)?$/.test(s)) s = s.slice(1);
  return lang === 'lv' ? s.replace('.', ',') : s;
}

export function parseDecimal(raw) {
  if (typeof raw !== 'string') return NaN;
  const s = raw.trim().replace(',', '.');
  if (!/^[-+]?(\d+(\.\d+)?|\.\d+)$/.test(s)) return NaN;
  return Number(s);
}
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add package.json assets/measure/rng.js assets/measure/format.js tests/rng.test.js tests/format.test.js
git commit -m "Add seeded RNG and number formatting for simulations"
```

---

### Task 2: Rolling physics and the ball catalogue

**Files:**
- Create: `assets/physics/constants.js`, `assets/physics/rolling.js`, `assets/rolling-ball/balls.js`
- Test: `tests/rolling.test.js`

**Interfaces:**
- Produces:
  - `constants.js`: `G = 9.81` (m/s²).
  - `rolling.js`: `BETA_SOLID = 2/5`, `BETA_HOLLOW = 2/3`, `fitsGroove(r, w) → bool`, `effectiveRadius(r, w, profile) → number` (`profile` is `'groove' | 'flat'`), `rollingAcceleration({ g, alphaRad, mu, beta, r, w, profile }) → number` (same unit as `g`; ≤ 0 means the ball does not roll).
  - `balls.js`: `GROOVE_W = 1.144` (cm), `MATERIALS`, `BALLS` (array of `{ id, material, d, hollow, mass? }`, `d` in cm), `DEFAULT_BALL = 'steel16'`, `ballById(id)`, `ballMass(ball) → g`, `ballBeta(ball)`, `ballMu(ball)`, `ballFits(ball, profile) → bool`.

- [ ] **Step 1: Write the failing test** `tests/rolling.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rollingAcceleration, effectiveRadius, fitsGroove, BETA_SOLID, BETA_HOLLOW } from '../assets/physics/rolling.js';
import { BALLS, GROOVE_W, ballById, ballMass, ballBeta, ballMu, ballFits } from '../assets/rolling-ball/balls.js';

const g = 981;
const rad = (d) => (d * Math.PI) / 180;
const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b}`);

test('flat, solid, mu = 0: a = 5/7 · g · sin α (spec 12.1)', () => {
  const a = rollingAcceleration({ g, alphaRad: rad(10), mu: 0, beta: BETA_SOLID, r: 0.8, w: GROOVE_W, profile: 'flat' });
  close(a / ((5 / 7) * g * Math.sin(rad(10))), 1, 0.005);
});

test('flat, hollow, mu = 0: a = 3/5 · g · sin α', () => {
  const a = rollingAcceleration({ g, alphaRad: rad(10), mu: 0, beta: BETA_HOLLOW, r: 2, w: GROOVE_W, profile: 'flat' });
  close(a / ((3 / 5) * g * Math.sin(rad(10))), 1, 0.005);
});

test('groove: a larger ball rolls faster; flat: diameter has no effect (spec 12.3)', () => {
  const base = { g, alphaRad: rad(5), mu: 0, beta: BETA_SOLID, w: GROOVE_W };
  assert.ok(rollingAcceleration({ ...base, r: 1.25, profile: 'groove' }) > rollingAcceleration({ ...base, r: 0.8, profile: 'groove' }));
  assert.equal(rollingAcceleration({ ...base, r: 1.25, profile: 'flat' }), rollingAcceleration({ ...base, r: 0.8, profile: 'flat' }));
});

test('mass does not enter: steel and glass of equal Ø roll alike when mu = 0 (spec 12.2)', () => {
  const steel = ballById('steel16');
  const glass = ballById('glass16');
  const common = { g, alphaRad: rad(3), mu: 0, r: 0.8, w: GROOVE_W, profile: 'groove' };
  assert.equal(
    rollingAcceleration({ ...common, beta: ballBeta(steel) }),
    rollingAcceleration({ ...common, beta: ballBeta(glass) }),
  );
});

test('a hollow ball rolls slower than a solid ball of the same Ø', () => {
  const pp = ballById('pingpong40');
  const wood = ballById('wood40');
  for (const profile of ['groove', 'flat']) {
    const common = { g, alphaRad: rad(5), mu: 0, r: 2, w: GROOVE_W, profile };
    assert.ok(rollingAcceleration({ ...common, beta: ballBeta(pp) }) < rollingAcceleration({ ...common, beta: ballBeta(wood) }), profile);
  }
});

test('calibration: “mūsu renīte” (L = 80 cm, h = 3,0 cm, steel Ø 16 mm) gives a ≈ 18.88 cm/s²', () => {
  const b = ballById('steel16');
  const a = rollingAcceleration({ g, alphaRad: Math.asin(3 / 80), mu: ballMu(b), beta: ballBeta(b), r: 0.8, w: GROOVE_W, profile: 'groove' });
  close(a, 18.883, 0.01);
});

test('rolling friction holds the ball on a tiny slope', () => {
  const b = ballById('steel16');
  const a = rollingAcceleration({ g, alphaRad: Math.asin(0.1 / 80), mu: ballMu(b), beta: ballBeta(b), r: 0.8, w: GROOVE_W, profile: 'groove' });
  assert.ok(a <= 0);
});

test('effective radius: flat = r, groove = sqrt(r² − (w/2)²)', () => {
  assert.equal(effectiveRadius(0.8, GROOVE_W, 'flat'), 0.8);
  close(effectiveRadius(0.8, GROOVE_W, 'groove'), Math.sqrt(0.64 - (GROOVE_W / 2) ** 2), 1e-12);
});

test('only balls wider than the groove gap fit the groove', () => {
  assert.equal(fitsGroove(0.5, GROOVE_W), false);
  assert.equal(ballFits(ballById('steel10'), 'groove'), false);
  assert.equal(ballFits(ballById('steel10'), 'flat'), true);
  for (const b of BALLS.filter((x) => x.id !== 'steel10')) assert.equal(ballFits(b, 'groove'), true, b.id);
});

test('ball masses follow m = ρV (hollow ball: catalogue mass)', () => {
  const expected = { steel10: 4.11, steel16: 16.84, steel25: 64.22, glass16: 5.36, glass25: 20.45, wood25: 5.73, wood40: 23.46, plastic25: 9.82, pingpong40: 2.7 };
  for (const [id, m] of Object.entries(expected)) close(ballMass(ballById(id)), m, 0.01, id);
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npm test`
Expected: FAIL — cannot find `assets/physics/rolling.js`.

- [ ] **Step 3: Implement**

`assets/physics/constants.js`:

```js
// Fizikālās konstantes SI mērvienībās.
export const G = 9.81; // m/s²
```

`assets/physics/rolling.js`:

```js
// Lodīte ripo bez slīdēšanas (spec. 7):
// a = g · (sin α − μ · cos α) / (1 + β · (r / r_ef)²)

export const BETA_SOLID = 2 / 5;
export const BETA_HOLLOW = 2 / 3;

export function fitsGroove(r, w) {
  return 2 * r > w;
}

export function effectiveRadius(r, w, profile) {
  if (profile === 'flat') return r;
  const half = w / 2;
  return Math.sqrt(r * r - half * half);
}

export function rollingAcceleration({ g, alphaRad, mu, beta, r, w, profile }) {
  const k = r / effectiveRadius(r, w, profile);
  const drive = Math.sin(alphaRad) - mu * Math.cos(alphaRad);
  return (g * drive) / (1 + beta * k * k);
}
```

`assets/rolling-ball/balls.js`:

```js
import { fitsGroove, BETA_SOLID, BETA_HOLLOW } from '../physics/rolling.js';

// Attālums starp renītes malām, cm. Kalibrēts tā, lai „mūsu renīte” (L = 80 cm,
// h = 3,0 cm, tērauds Ø 16 mm) dotu a ≈ 18,9 cm/s² (spec. 7). Ar klases datiem jāpārkalibrē.
export const GROOVE_W = 1.144;

// density g/cm³; mu — ripošanas berzes koeficients (jāpārkalibrē ar klases datiem)
export const MATERIALS = {
  steel: { density: 7.85, mu: 0.0025 },
  glass: { density: 2.5, mu: 0.003 },
  wood: { density: 0.7, mu: 0.006 },
  plastic: { density: 1.2, mu: 0.004 },
  celluloid: { density: null, mu: 0.005 },
};

// d — diametrs, cm
export const BALLS = [
  { id: 'steel10', material: 'steel', d: 1.0, hollow: false },
  { id: 'steel16', material: 'steel', d: 1.6, hollow: false },
  { id: 'steel25', material: 'steel', d: 2.5, hollow: false },
  { id: 'glass16', material: 'glass', d: 1.6, hollow: false },
  { id: 'glass25', material: 'glass', d: 2.5, hollow: false },
  { id: 'wood25', material: 'wood', d: 2.5, hollow: false },
  { id: 'wood40', material: 'wood', d: 4.0, hollow: false },
  { id: 'plastic25', material: 'plastic', d: 2.5, hollow: false },
  { id: 'pingpong40', material: 'celluloid', d: 4.0, hollow: true, mass: 2.7 },
];

export const DEFAULT_BALL = 'steel16';

export function ballById(id) {
  return BALLS.find((b) => b.id === id);
}

export function ballMass(ball) {
  if (ball.hollow) return ball.mass;
  const r = ball.d / 2;
  return MATERIALS[ball.material].density * (4 / 3) * Math.PI * r ** 3;
}

export function ballBeta(ball) {
  return ball.hollow ? BETA_HOLLOW : BETA_SOLID;
}

export function ballMu(ball) {
  return MATERIALS[ball.material].mu;
}

export function ballFits(ball, profile) {
  return profile === 'flat' || fitsGroove(ball.d / 2, GROOVE_W);
}
```

- [ ] **Step 4: Run to see it pass**

Run: `npm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add assets/physics assets/rolling-ball/balls.js tests/rolling.test.js
git commit -m "Add rolling-ball physics and ball catalogue"
```

---

### Task 3: Settings model (constraints and derived quantities)

**Files:**
- Create: `assets/rolling-ball/model.js`
- Test: `tests/model.test.js`

**Interfaces:**
- Consumes: Task 2 (`rollingAcceleration`, `effectiveRadius`, `G`, ball helpers), Task 1 (`roundTo`).
- Produces (all `with*` functions return a **new** settings object, never mutate; they return the *same* object when the change is refused):
  - Settings shape: `{ L, h, alphaDeg, angleMode: 'h'|'alpha', ball, profile: 'groove'|'flat', x0, level: 1|2|3, timer: 'gate'|'hand', gates: number[], dt: 0.1|0.2|0.5, tape: bool, slow: bool }`.
  - Constants: `G_CM`, `L_MIN = 40`, `L_MAX = 200`, `ALPHA_MAX = 15`, `FINISH_OFFSET = 10`, `MIN_RUN = 5`, `GATE_MIN = 2`, `GATE_MAX = 6`, `GATE_GAP = 1`, `DT_OPTIONS = [0.1, 0.2, 0.5]`, `STEP = { L: 1, h: 0.1, alpha: 0.1, x: 0.5 }`.
  - `finishX(L)`, `hMax(L)`, `x0Max(L)`, `spreadGates(x0, xf, n)`, `minRollingH(L, mu)`.
  - `defaultSettings()`, `withL`, `withH`, `withAlpha`, `withAngleMode`, `withX0`, `withGate(s, i, x)`, `withGateCount(s, n)`, `withBall`, `withProfile`, `withLevel`, `withTimer`, `withDt`, `withTape`, `withSlow`.
  - `derive(s) → { ball, r, rEff, mass, mu, beta, alphaRad, alphaDeg, h, a, rolls, xf, hMin }` (a in cm/s², true value without noise).
  - `settingsKey(s, { noise, traps }) → string`.

- [ ] **Step 1: Write the failing test** `tests/model.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultSettings, derive, withL, withH, withAlpha, withAngleMode, withX0, withGate, withGateCount,
  withBall, withProfile, withLevel, withTimer, withDt, withTape, withSlow,
  hMax, x0Max, finishX, spreadGates, minRollingH, settingsKey,
} from '../assets/rolling-ball/model.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b}`);
const cfg = { noise: 1, traps: [] };

test('defaults are “mūsu renīte”: a ≈ 18.88 cm/s², t(0 → 70 cm) ≈ 2.72 s (spec 12.4)', () => {
  const s = defaultSettings();
  assert.equal(s.L, 80);
  assert.equal(s.h, 3);
  assert.equal(s.angleMode, 'h');
  assert.equal(s.ball, 'steel16');
  assert.equal(s.profile, 'groove');
  assert.equal(s.x0, 0);
  assert.equal(s.level, 3);
  assert.deepEqual(s.gates, [14, 28, 42, 56, 70]);
  assert.equal(s.dt, 0.2);
  const d = derive(s);
  close(d.a, 18.883, 0.01);
  assert.equal(d.rolls, true);
  assert.equal(d.xf, 70);
  close(Math.sqrt((2 * 70) / d.a), 2.7229, 0.001);
  close(d.alphaDeg, 2.1491, 0.001);
});

test('limits', () => {
  assert.equal(hMax(80), 20.7);
  assert.equal(hMax(40), 10.3);
  assert.equal(finishX(80), 70);
  assert.equal(x0Max(80), 65);
  assert.deepEqual(spreadGates(0, 70, 5), [14, 28, 42, 56, 70]);
  assert.deepEqual(spreadGates(0, 50, 3), [16.5, 33.5, 50]);
  assert.equal(minRollingH(80, 0.0025), 0.2);
});

test('changing L keeps what the student sets: h in h-mode, α in α-mode (spec 12.9)', () => {
  const s = withL(defaultSettings(), 120);
  assert.equal(s.h, 3);
  close(s.alphaDeg, (Math.asin(3 / 120) * 180) / Math.PI, 1e-9);
  const a = withL(withAlpha(defaultSettings(), 5), 120);
  assert.equal(a.alphaDeg, 5);
  close(a.h, 120 * Math.sin((5 * Math.PI) / 180), 1e-9);
});

test('sin α = h / L always holds', () => {
  let s = defaultSettings();
  const ops = [
    (x) => withL(x, 150), (x) => withH(x, 12.3), (x) => withAlpha(x, 7.4), (x) => withL(x, 60),
    (x) => withAngleMode(x, 'h'), (x) => withH(x, 99), (x) => withL(x, 40), (x) => withAlpha(x, 0),
  ];
  for (const op of ops) {
    s = op(s);
    const d = derive(s);
    close(Math.sin(d.alphaRad), s.h / s.L, 1e-12);
  }
});

test('clamping: L 40–200, h ≤ L·sin 15°, α ≤ 15°, steps', () => {
  assert.equal(withL(defaultSettings(), 10).L, 40);
  assert.equal(withL(defaultSettings(), 500).L, 200);
  assert.equal(withL(defaultSettings(), 80.4).L, 80);
  assert.equal(withH(defaultSettings(), 30).h, 20.7);
  assert.equal(withH(defaultSettings(), 3.04).h, 3);
  assert.equal(withAlpha(defaultSettings(), 20).alphaDeg, 15);
  assert.equal(withL(withH(defaultSettings(), 20.7), 40).h, 10.3);
});

test('switching the angle mode changes nothing but the mode', () => {
  const s = withAngleMode(defaultSettings(), 'alpha');
  assert.equal(s.angleMode, 'alpha');
  assert.equal(s.h, 3);
  close(derive(s).a, derive(defaultSettings()).a, 1e-9);
});

test('x0 is clamped and gates are re-spread when they no longer fit', () => {
  assert.equal(withX0(defaultSettings(), 100).x0, 65);
  const s = withX0(defaultSettings(), 30);
  assert.deepEqual(s.gates, spreadGates(30, 70, 5));
  assert.deepEqual(s.gates, [38, 46, 54, 62, 70]);
  assert.deepEqual(withL(defaultSettings(), 40).gates, [6, 12, 18, 24, 30]);
});

test('a gate stays between its neighbours (at least 1 cm apart) and within the groove', () => {
  assert.equal(withGate(defaultSettings(), 1, 5).gates[1], 15);
  assert.equal(withGate(defaultSettings(), 1, 50).gates[1], 41);
  assert.equal(withGate(defaultSettings(), 4, 500).gates[4], 80);
  assert.equal(withGate(defaultSettings(), 0, -3).gates[0], 1);
  assert.equal(withGate(defaultSettings(), 2, 44.3).gates[2], 44.5);
});

test('gate count 2–6, gates re-spread evenly', () => {
  assert.deepEqual(withGateCount(defaultSettings(), 2).gates, [35, 70]);
  assert.equal(withGateCount(defaultSettings(), 9).gates.length, 6);
  assert.equal(withGateCount(defaultSettings(), 1).gates.length, 2);
});

test('ball and profile: a ball narrower than the groove gap is refused in the groove', () => {
  const s = defaultSettings();
  assert.equal(withBall(s, 'steel10'), s);
  assert.equal(withBall(s, 'nope'), s);
  const flat = withBall(withProfile(s, 'flat'), 'steel10');
  assert.equal(flat.ball, 'steel10');
  assert.equal(withProfile(flat, 'groove'), flat);
  assert.equal(withBall(s, 'glass25').ball, 'glass25');
});

test('level, timer, dt, tape, slow accept only valid values', () => {
  const s = defaultSettings();
  assert.equal(withLevel(s, 1).level, 1);
  assert.equal(withLevel(s, 4), s);
  assert.equal(withTimer(s, 'hand').timer, 'hand');
  assert.equal(withTimer(s, 'x'), s);
  assert.equal(withDt(s, 0.5).dt, 0.5);
  assert.equal(withDt(s, 0.3), s);
  assert.equal(withTape(s, false).tape, false);
  assert.equal(withSlow(s, true).slow, true);
});

test('below the rolling-friction threshold the ball does not roll', () => {
  assert.equal(derive(withH(defaultSettings(), 0.1)).rolls, false);
  assert.equal(derive(withH(defaultSettings(), 0)).rolls, false);
  assert.equal(derive(withH(defaultSettings(), 0.1)).hMin, 0.2);
});

test('settingsKey: same data-relevant settings → same key', () => {
  const s = defaultSettings();
  assert.equal(settingsKey(s, cfg), settingsKey(defaultSettings(), cfg));
  assert.notEqual(settingsKey(s, cfg), settingsKey(withH(s, 5), cfg));
  assert.equal(settingsKey(s, cfg), settingsKey(withTape(withSlow(s, true), false), cfg));
  assert.notEqual(settingsKey(s, cfg), settingsKey(s, { noise: 0, traps: [] }));
  assert.notEqual(settingsKey(s, cfg), settingsKey(withDt(s, 0.5), cfg));
  const l1 = withLevel(s, 1);
  assert.equal(settingsKey(l1, cfg), settingsKey(withDt(withGateCount(l1, 3), 0.5), cfg));
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npm test`
Expected: FAIL — cannot find `model.js`.

- [ ] **Step 3: Implement** `assets/rolling-ball/model.js`

```js
import { G } from '../physics/constants.js';
import { rollingAcceleration, effectiveRadius } from '../physics/rolling.js';
import { ballById, ballMass, ballBeta, ballMu, ballFits, GROOVE_W, DEFAULT_BALL } from './balls.js';
import { roundTo } from '../measure/format.js';

export const G_CM = G * 100; // cm/s²
export const L_MIN = 40;
export const L_MAX = 200;
export const ALPHA_MAX = 15; // ° — lodīte ripo bez slīdēšanas
export const FINISH_OFFSET = 10; // cm — finišs 10 cm pirms renītes gala („mūsu renīte”: 80 → 70)
export const MIN_RUN = 5; // cm — mazākais attālums no starta līdz finišam
export const GATE_MIN = 2;
export const GATE_MAX = 6;
export const GATE_GAP = 1; // cm
export const DT_OPTIONS = [0.1, 0.2, 0.5];
export const STEP = { L: 1, h: 0.1, alpha: 0.1, x: 0.5 };

const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function finishX(L) {
  return L - FINISH_OFFSET;
}

export function hMax(L) {
  return Math.floor(L * Math.sin(toRad(ALPHA_MAX)) * 10) / 10;
}

export function x0Max(L) {
  return finishX(L) - MIN_RUN;
}

export function spreadGates(x0, xf, n) {
  const out = [];
  for (let i = 1; i <= n; i++) out.push(roundTo(x0 + (i * (xf - x0)) / n, STEP.x));
  return out;
}

// Mazākais h (0,1 cm solī), pie kura lodīte ripo: tan α > μ.
export function minRollingH(L, mu) {
  return Math.ceil(L * Math.sin(Math.atan(mu)) * 10 + 1e-9) / 10;
}

export function defaultSettings() {
  return {
    L: 80,
    h: 3,
    alphaDeg: toDeg(Math.asin(3 / 80)),
    angleMode: 'h',
    ball: DEFAULT_BALL,
    profile: 'groove',
    x0: 0,
    level: 3,
    timer: 'gate',
    gates: spreadGates(0, finishX(80), 5),
    dt: 0.2,
    tape: true,
    slow: false,
  };
}

// Saglabā to, ko skolēns iestata (h vai α), otru aprēķina: sin α = h / L.
function syncAngle(s) {
  if (s.angleMode === 'h') {
    const h = clamp(s.h, 0, hMax(s.L));
    return { ...s, h, alphaDeg: toDeg(Math.asin(h / s.L)) };
  }
  const alphaDeg = clamp(s.alphaDeg, 0, ALPHA_MAX);
  return { ...s, alphaDeg, h: s.L * Math.sin(toRad(alphaDeg)) };
}

function gatesValid(gates, x0, L) {
  for (let i = 0; i < gates.length; i++) {
    const prev = i === 0 ? x0 : gates[i - 1];
    if (gates[i] < prev + GATE_GAP) return false;
  }
  return gates[gates.length - 1] <= L;
}

function fitPositions(s) {
  const x0 = clamp(s.x0, 0, x0Max(s.L));
  const gates = gatesValid(s.gates, x0, s.L) ? s.gates : spreadGates(x0, finishX(s.L), s.gates.length);
  return { ...s, x0, gates };
}

export function withL(s, L) {
  return fitPositions(syncAngle({ ...s, L: clamp(roundTo(L, STEP.L), L_MIN, L_MAX) }));
}

export function withH(s, h) {
  return syncAngle({ ...s, angleMode: 'h', h: roundTo(clamp(h, 0, hMax(s.L)), STEP.h) });
}

export function withAlpha(s, alphaDeg) {
  return syncAngle({ ...s, angleMode: 'alpha', alphaDeg: roundTo(clamp(alphaDeg, 0, ALPHA_MAX), STEP.alpha) });
}

export function withAngleMode(s, mode) {
  if (mode !== 'h' && mode !== 'alpha') return s;
  return { ...s, angleMode: mode };
}

export function withX0(s, x0) {
  return fitPositions({ ...s, x0: roundTo(clamp(x0, 0, x0Max(s.L)), STEP.x) });
}

export function withGate(s, i, x) {
  const lo = (i === 0 ? s.x0 : s.gates[i - 1]) + GATE_GAP;
  const hi = i === s.gates.length - 1 ? s.L : s.gates[i + 1] - GATE_GAP;
  const gates = s.gates.slice();
  gates[i] = clamp(roundTo(x, STEP.x), lo, hi);
  return { ...s, gates };
}

export function withGateCount(s, n) {
  return { ...s, gates: spreadGates(s.x0, finishX(s.L), clamp(Math.round(n), GATE_MIN, GATE_MAX)) };
}

export function withBall(s, id) {
  const b = ballById(id);
  if (!b || !ballFits(b, s.profile)) return s;
  return { ...s, ball: id };
}

export function withProfile(s, profile) {
  if (profile !== 'groove' && profile !== 'flat') return s;
  if (!ballFits(ballById(s.ball), profile)) return s;
  return { ...s, profile };
}

export function withLevel(s, level) {
  return [1, 2, 3].includes(level) ? { ...s, level } : s;
}

export function withTimer(s, timer) {
  return timer === 'gate' || timer === 'hand' ? { ...s, timer } : s;
}

export function withDt(s, dt) {
  return DT_OPTIONS.includes(dt) ? { ...s, dt } : s;
}

export function withTape(s, tape) {
  return { ...s, tape: Boolean(tape) };
}

export function withSlow(s, slow) {
  return { ...s, slow: Boolean(slow) };
}

export function derive(s) {
  const ball = ballById(s.ball);
  const r = ball.d / 2;
  const alphaRad = s.angleMode === 'h' ? Math.asin(s.h / s.L) : toRad(s.alphaDeg);
  const mu = ballMu(ball);
  const beta = ballBeta(ball);
  const a = rollingAcceleration({ g: G_CM, alphaRad, mu, beta, r, w: GROOVE_W, profile: s.profile });
  return {
    ball,
    r,
    rEff: effectiveRadius(r, GROOVE_W, s.profile),
    mass: ballMass(ball),
    mu,
    beta,
    alphaRad,
    alphaDeg: toDeg(alphaRad),
    h: s.L * Math.sin(alphaRad),
    a,
    rolls: a > 0,
    xf: finishX(s.L),
    hMin: minRollingH(s.L, mu),
  };
}

// Viss, kas ietekmē datus. Mērlente un palēninājums datus nemaina.
export function settingsKey(s, { noise, traps }) {
  const parts = [
    `L${s.L}`, `h${s.h.toFixed(3)}`, s.ball, s.profile, `x${s.x0}`, `lv${s.level}`,
    `n${noise}`, `tr${[...traps].sort().join('+')}`,
  ];
  if (s.level === 2) parts.push(s.timer, `g${s.gates.join('/')}`);
  if (s.level === 3) parts.push(`dt${s.dt}`);
  return parts.join(';');
}
```

- [ ] **Step 4: Run to see it pass**

Run: `npm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add assets/rolling-ball/model.js tests/model.test.js
git commit -m "Add rolling-ball settings model with h/α coupling and limits"
```

---

### Task 4: Translation helper and all UI strings

**Files:**
- Create: `assets/translate.js`, `assets/rolling-ball/i18n.js`
- Test: `tests/i18n.test.js`

**Interfaces:**
- Produces: `makeT(dict, getLang) → t(key, vars?) → string` (missing key → returns the key and warns once; `{name}` placeholders replaced from `vars`); `STRINGS = { lv: {...}, en: {...} }` with exactly the keys below. Later tasks use these key names verbatim.

- [ ] **Step 1: Write the failing test** `tests/i18n.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeT } from '../assets/translate.js';
import { STRINGS } from '../assets/rolling-ball/i18n.js';

test('makeT interpolates and falls back to the key', () => {
  let lang = 'lv';
  const t = makeT({ lv: { a: '{n}. tabula' }, en: { a: 'Table {n}' } }, () => lang);
  assert.equal(t('a', { n: 3 }), '3. tabula');
  lang = 'en';
  assert.equal(t('a', { n: 3 }), 'Table 3');
  assert.equal(t('a', {}), 'Table {n}');
  const warn = console.warn;
  console.warn = () => {};
  assert.equal(t('missing.key'), 'missing.key');
  console.warn = warn;
});

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
```

- [ ] **Step 2: Run to see it fail**

Run: `npm test`
Expected: FAIL — cannot find `translate.js`.

- [ ] **Step 3: Implement**

`assets/translate.js`:

```js
export function makeT(dict, getLang) {
  const warned = new Set();
  return function t(key, vars) {
    const lang = getLang();
    let s = dict[lang] ? dict[lang][key] : undefined;
    if (s === undefined) {
      if (!warned.has(`${lang}:${key}`)) {
        warned.add(`${lang}:${key}`);
        console.warn(`i18n: trūkst “${key}” (${lang})`);
      }
      return key;
    }
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
    return s;
  };
}
```

`assets/rolling-ball/i18n.js` — copy exactly:

```js
export const STRINGS = {
  lv: {
    'page.title': 'Lodīte renītē — FIZ-SIM',
    'page.heading': 'LODĪTE RENĪTĒ',
    'page.back': '← SARAKSTS',
    'tb.set': 'KOMPLEKTS',
    'tb.sheet': 'LAPA',
    'tb.topic': 'TĒMA',
    'tb.langTheme': 'VALODA / TĒMA',
    'tb.topicValue': 'KINEMĀTIKA',
    'tb.themeToggle': 'Pārslēgt gaišo un tumšo režīmu',

    'blk.level': 'DATU LĪMENIS',
    'level.1': '1 · LAIKS',
    'level.2': '2 · t(x)',
    'level.3': '3 · x(t)',
    'level.1.hint': 'Hronometrs: laiks, kurā lodīte noripo no starta līdz finišam.',
    'level.2.hint.gate': 'Fotovārti mēra laiku, kad lodīte tos šķērso. Vārtus var vilkt pa renīti.',
    'level.2.hint.hand': 'Pie katras atzīmes stāv skolēns ar hronometru: palaišanas brīdī to iedarbina, kad lodīte ir garām — aptur. Atzīmes var vilkt pa renīti.',
    'level.3.hint': 'Lodītes koordināta ik pēc Δt — kā video pa kadriem vai stroboskopā.',
    'timer.gate': 'FOTOVĀRTI',
    'timer.hand': 'HRONOMETRI',
    'gates.count': 'VĀRTU SKAITS',
    'gates.countHand': 'ATZĪMJU SKAITS',
    'gates.fewer': 'Mazāk',
    'gates.more': 'Vairāk',
    'dt.label': 'Δt',
    'slow': 'PALĒNINĀT ×0,25',

    'blk.ball': 'LODĪTE',
    'spec.pos': 'POZ.',
    'spec.name': 'NOSAUKUMS',
    'spec.d': 'Ø, mm',
    'spec.m': 'm, g',
    'mat.steel': 'tērauds',
    'mat.glass': 'stikls',
    'mat.wood': 'koks',
    'mat.plastic': 'plastmasa',
    'mat.celluloid': 'galda tenisa bumbiņa (doba)',
    'profile.groove': 'RENĪTE',
    'profile.flat': 'PLAKANA VIRSMA',
    'ball.noFit': 'Lodīte Ø {d} mm renītē neiederas: tā ir šaurāka par attālumu starp renītes malām ({w} mm). Izvēlies lielāku lodīti vai plakanu virsmu.',

    'blk.dims': 'IZMĒRI',
    'dims.setBy': 'SLĪPUMU IESTATA AR',
    'dims.hint': 'Velc rasējumā izmēru līnijas L un h (vai α), lodīti un vārtus. Precīzāk — ar bultiņu taustiņiem vai pogām − un +.',
    'dims.L': 'Renītes garums L',
    'dims.h': 'Pacēlums h',
    'dims.alpha': 'Slīpuma leņķis α',
    'dims.x0': 'Kustības sākumpunkts x₀',
    'dims.gate': '{i}. vārti',
    'dims.gateHand': '{i}. atzīme',
    'dims.fixed': 'FIKS.',
    'dims.fixedTitle': 'Šo lielumu skolotājs ir nofiksējis saitē.',
    'dims.decrease': 'Samazināt',
    'dims.increase': 'Palielināt',
    'tape': 'RĀDĪT MĒRLENTI',

    'run.start': '▶ PALAIST',
    'run.repeat': '↻ ATKĀRTOT',
    'run.running': 'LODĪTE RIPO…',

    'blk.results': 'REZULTĀTI',
    'results.none': 'Ar šiem iestatījumiem vēl nav mērījumu. Nospied PALAIST.',
    'results.option': '{n}. tabula · mērījumi: {m}',
    'results.other': 'Rādīta {n}. tabula — tās iestatījumi atšķiras no pašreizējiem.',
    'results.table': 'DATU TABULA',
    'results.strobe': 'STROBOSKOPS',

    'scene.start': 'STARTS',
    'scene.finish': 'FINIŠS',
    'scene.origin': 'x = 0',
    'scene.stopwatch': 'HRONOMETRS',
    'scene.aria': 'Sānskata rasējums: renīte uz balsta, lodīte un mērlente.',

    'table.l1Title': '{n}. tabula. Laiks t, kurā lodīte noripo no starta līdz finišam',
    'table.l2Title': '{n}. tabula. Laiks t, kad lodīte šķērso vārtus koordinātā x',
    'table.l3Title': '{n}. tabula. Lodītes koordināta x atkarībā no laika t',
    'col.t': 't, s',
    'col.tN': 't{i}, s',
    'col.x': 'x, cm',
    'col.xN': 'x{i}, cm',
    'col.err': '(±{e} {u})',
    'set.prefix': 'Iestatījumi: ',
    'set.L': 'L = {v} cm',
    'set.hAlpha': 'h = {h} cm (α = {a}°)',
    'set.alphaH': 'α = {a}° (h = {h} cm)',
    'set.ball': 'lodīte: {name}, Ø {d} mm, {m} g',
    'set.profile.groove': 'renīte',
    'set.profile.flat': 'plakana virsma',
    'set.x0': 'kustības sākumpunkts x₀ = {v} cm',
    'set.finish': 'finišs x = {v} cm',
    'set.timer.gate': 'fotovārti',
    'set.timer.hand': 'hronometri',
    'set.dt': 'Δt = {v} s',
    'set.seed': 'sēkla {v}',

    'data.copy': 'KOPĒT',
    'data.csv': 'LEJUPIELĀDĒT CSV',
    'data.close': 'AIZVĒRT ✕',
    'data.copied': 'Nokopēts. Ielīmē Excel vai Google Sheets.',
    'data.copyFailed': 'Pārlūks neļāva piekļūt starpliktuvei. Iezīmē tabulu ar peli un kopē ar Ctrl+C (Mac: ⌘+C).',

    'strobe.title': 'STROBOSKOPS',
    'strobe.caption': 'Stroboskops · Δt = {dt} s · {n}. tabula, {r}. mērījums',
    'strobe.run': 'MĒRĪJUMS',
    'strobe.zoomIn': 'Tuvināt',
    'strobe.zoomOut': 'Tālināt',
    'strobe.fit': 'VISS',
    'strobe.export': 'EKSPORTĒT ATTĒLU',
    'strobe.hint': 'Tuvini ar peles ritenīti vai diviem pirkstiem, pārvieto, velkot ar peli vai pirkstu.',
    'strobe.exportFailed': 'Attēlu neizdevās izveidot: šī ierīce neļauj tik lielu attēlu ({w} × {h} px). Mēģini datorā vai ar īsāku renīti L.',

    'notice.close': 'Aizvērt paziņojumu',
    'notice.noRoll': 'Lodīte neripo: slīpums ir par mazu, un ripošanas berze to notur. Palielini pacēlumu līdz h ≥ {h} cm.',
    'url.not_number': 'Saites parametrs {param}={raw} nav skaitlis. Izmantots {param} = {used}.',
    'url.out_of_range': 'Saites parametrs {param}={raw} ir ārpus robežām ({min}–{max}). Izmantots {param} = {used}.',
    'url.not_allowed': 'Saites parametra {param} vērtība “{raw}” nav atļauta. Atļautās vērtības: {allowed}. Izmantots {param} = {used}.',
    'url.bad_list': 'Saites parametrs {param}={raw} nav derīgs saraksts ({hint}). Izmantots {param} = {used}.',
    'url.h_and_alpha': 'Saitē ir gan h, gan alpha. Izmantots h = {used} cm, alpha netiek ņemts vērā.',
    'url.h_clamped': 'Saitē h = {raw} cm ir par lielu renītei L = {L} cm (α ≤ 15°). Izmantots h = {used} cm.',
    'url.x0_clamped': 'Saitē x0 = {raw} cm ir par tuvu finišam. Izmantots x₀ = {used} cm.',
    'url.gates_clamped': 'Saitē vārtu koordinātas {raw} neder šai renītei (jābūt starp x₀ + 1 cm un L, vismaz 1 cm vienai no otras). Vārti izvietoti vienmērīgi: {used}.',
    'url.ball_no_fit': 'Saitē lodīte {raw} renītē neiederas. Izmantota {used}.',
    'url.listHint': 'skaitļi, atdalīti ar komatu, 2–6 vērtības',
  },
  en: {
    'page.title': 'Ball in a groove — FIZ-SIM',
    'page.heading': 'BALL IN A GROOVE',
    'page.back': '← INDEX',
    'tb.set': 'SET',
    'tb.sheet': 'SHEET',
    'tb.topic': 'TOPIC',
    'tb.langTheme': 'LANGUAGE / THEME',
    'tb.topicValue': 'KINEMATICS',
    'tb.themeToggle': 'Toggle light and dark mode',

    'blk.level': 'DATA LEVEL',
    'level.1': '1 · TIME',
    'level.2': '2 · t(x)',
    'level.3': '3 · x(t)',
    'level.1.hint': 'Stopwatch: the time the ball takes to roll from start to finish.',
    'level.2.hint.gate': 'Photogates record the time when the ball passes them. Drag the gates along the groove.',
    'level.2.hint.hand': 'A student with a stopwatch stands at each mark: start at release, stop when the ball passes. Drag the marks along the groove.',
    'level.3.hint': 'Ball position every Δt — like frame-by-frame video or a strobe photo.',
    'timer.gate': 'PHOTOGATES',
    'timer.hand': 'STOPWATCHES',
    'gates.count': 'GATES',
    'gates.countHand': 'MARKS',
    'gates.fewer': 'Fewer',
    'gates.more': 'More',
    'dt.label': 'Δt',
    'slow': 'SLOW ×0.25',

    'blk.ball': 'BALL',
    'spec.pos': 'ITEM',
    'spec.name': 'NAME',
    'spec.d': 'Ø, mm',
    'spec.m': 'm, g',
    'mat.steel': 'steel',
    'mat.glass': 'glass',
    'mat.wood': 'wood',
    'mat.plastic': 'plastic',
    'mat.celluloid': 'table-tennis ball (hollow)',
    'profile.groove': 'GROOVE',
    'profile.flat': 'FLAT SURFACE',
    'ball.noFit': 'The Ø {d} mm ball does not fit the groove: it is narrower than the gap between the groove edges ({w} mm). Choose a bigger ball or the flat surface.',

    'blk.dims': 'DIMENSIONS',
    'dims.setBy': 'SLOPE SET BY',
    'dims.hint': 'Drag the dimension lines L and h (or α), the ball and the gates in the drawing. For precise steps use the arrow keys or the − and + buttons.',
    'dims.L': 'Groove length L',
    'dims.h': 'Height h',
    'dims.alpha': 'Slope angle α',
    'dims.x0': 'Release point x₀',
    'dims.gate': 'Gate {i}',
    'dims.gateHand': 'Mark {i}',
    'dims.fixed': 'FIXED',
    'dims.fixedTitle': 'The teacher has fixed this value in the link.',
    'dims.decrease': 'Decrease',
    'dims.increase': 'Increase',
    'tape': 'SHOW TAPE',

    'run.start': '▶ RUN',
    'run.repeat': '↻ REPEAT',
    'run.running': 'ROLLING…',

    'blk.results': 'RESULTS',
    'results.none': 'No measurements with these settings yet. Press RUN.',
    'results.option': 'Table {n} · runs: {m}',
    'results.other': 'Showing table {n} — its settings differ from the current ones.',
    'results.table': 'DATA TABLE',
    'results.strobe': 'STROBE',

    'scene.start': 'START',
    'scene.finish': 'FINISH',
    'scene.origin': 'x = 0',
    'scene.stopwatch': 'STOPWATCH',
    'scene.aria': 'Side-view drawing: a groove on a support, a ball and a measuring tape.',

    'table.l1Title': 'Table {n}. Time t for the ball to roll from start to finish',
    'table.l2Title': 'Table {n}. Time t when the ball passes the gate at position x',
    'table.l3Title': 'Table {n}. Ball position x versus time t',
    'col.t': 't, s',
    'col.tN': 't{i}, s',
    'col.x': 'x, cm',
    'col.xN': 'x{i}, cm',
    'col.err': '(±{e} {u})',
    'set.prefix': 'Settings: ',
    'set.L': 'L = {v} cm',
    'set.hAlpha': 'h = {h} cm (α = {a}°)',
    'set.alphaH': 'α = {a}° (h = {h} cm)',
    'set.ball': 'ball: {name}, Ø {d} mm, {m} g',
    'set.profile.groove': 'groove',
    'set.profile.flat': 'flat surface',
    'set.x0': 'release point x₀ = {v} cm',
    'set.finish': 'finish x = {v} cm',
    'set.timer.gate': 'photogates',
    'set.timer.hand': 'stopwatches',
    'set.dt': 'Δt = {v} s',
    'set.seed': 'seed {v}',

    'data.copy': 'COPY',
    'data.csv': 'DOWNLOAD CSV',
    'data.close': 'CLOSE ✕',
    'data.copied': 'Copied. Paste into Excel or Google Sheets.',
    'data.copyFailed': 'The browser blocked clipboard access. Select the table with the mouse and copy with Ctrl+C (Mac: ⌘+C).',

    'strobe.title': 'STROBE',
    'strobe.caption': 'Strobe · Δt = {dt} s · table {n}, run {r}',
    'strobe.run': 'RUN',
    'strobe.zoomIn': 'Zoom in',
    'strobe.zoomOut': 'Zoom out',
    'strobe.fit': 'FIT',
    'strobe.export': 'EXPORT IMAGE',
    'strobe.hint': 'Zoom with the mouse wheel or two fingers; drag with the mouse or a finger to move.',
    'strobe.exportFailed': 'Could not create the image: this device does not allow an image this large ({w} × {h} px). Try on a computer or with a shorter groove L.',

    'notice.close': 'Close notice',
    'notice.noRoll': 'The ball does not roll: the slope is too small and rolling friction holds it. Raise the height to h ≥ {h} cm.',
    'url.not_number': 'Link parameter {param}={raw} is not a number. Using {param} = {used}.',
    'url.out_of_range': 'Link parameter {param}={raw} is out of range ({min}–{max}). Using {param} = {used}.',
    'url.not_allowed': 'Link parameter {param} does not allow the value “{raw}”. Allowed values: {allowed}. Using {param} = {used}.',
    'url.bad_list': 'Link parameter {param}={raw} is not a valid list ({hint}). Using {param} = {used}.',
    'url.h_and_alpha': 'The link sets both h and alpha. Using h = {used} cm; alpha is ignored.',
    'url.h_clamped': 'In the link, h = {raw} cm is too large for the groove L = {L} cm (α ≤ 15°). Using h = {used} cm.',
    'url.x0_clamped': 'In the link, x0 = {raw} cm is too close to the finish. Using x₀ = {used} cm.',
    'url.gates_clamped': 'In the link, the gate positions {raw} do not fit this groove (they must lie between x₀ + 1 cm and L, at least 1 cm apart). Gates spread evenly: {used}.',
    'url.ball_no_fit': 'In the link, the ball {raw} does not fit the groove. Using {used}.',
    'url.listHint': 'numbers separated by commas, 2–6 values',
  },
};
```

- [ ] **Step 4: Run to see it pass**

Run: `npm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add assets/translate.js assets/rolling-ball/i18n.js tests/i18n.test.js
git commit -m "Add translation helper and LV/EN strings for K-01"
```

---

### Task 5: Generic URL parameter parser

**Files:**
- Create: `assets/measure/url-params.js`
- Test: `tests/url-params.test.js`

**Interfaces:**
- Consumes: `parseDecimal` (Task 1).
- Produces: `parseParams(search, schema) → { values, given: Set<string>, lock: bool, warnings: Array<{ param, raw, reason, min?, max?, allowed?, used? }> }`.
  - Schema entry types: `{ type: 'number', min, max, values? }`, `{ type: 'int', min, max }`, `{ type: 'enum', values: string[] }`, `{ type: 'bool' }`, `{ type: 'list-number', min, max, minLen, maxLen }`, `{ type: 'list-enum', values: string[] }`.
  - Reasons: `'not_number'`, `'out_of_range'` (value clamped and used; warning has `min`, `max`, `used`), `'not_allowed'` (warning has `allowed`), `'bad_list'`. A param that produced `not_number` / `not_allowed` / `bad_list` is **not** in `values`/`given`.
  - Unknown params (e.g. `fbclid`, `utm_source`) are ignored without warnings. `lock` is true for `lock=1` or `lock=true`.
  - Lists are comma-separated; decimals inside lists use a point. `list-enum` removes duplicates and accepts an empty string as an empty list.

- [ ] **Step 1: Write the failing test** `tests/url-params.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseParams } from '../assets/measure/url-params.js';

const schema = {
  L: { type: 'number', min: 40, max: 200 },
  dt: { type: 'number', values: [0.1, 0.2, 0.5] },
  seed: { type: 'int', min: 1, max: 2147483647 },
  ball: { type: 'enum', values: ['steel16', 'glass16'] },
  tape: { type: 'bool' },
  gates: { type: 'list-number', min: 0, max: 200, minLen: 2, maxLen: 6 },
  traps: { type: 'list-enum', values: ['push', 'late'] },
};

test('empty search gives nothing', () => {
  const p = parseParams('', schema);
  assert.deepEqual(p.values, {});
  assert.equal(p.given.size, 0);
  assert.equal(p.lock, false);
  assert.deepEqual(p.warnings, []);
});

test('valid values of every type', () => {
  const p = parseParams('?L=80&dt=0,5&seed=42&ball=glass16&tape=0&gates=10,20.5,30&traps=late,push,late&lock=1', schema);
  assert.deepEqual(p.values, { L: 80, dt: 0.5, seed: 42, ball: 'glass16', tape: false, gates: [10, 20.5, 30], traps: ['late', 'push'] });
  assert.deepEqual([...p.given].sort(), ['L', 'ball', 'dt', 'gates', 'seed', 'tape', 'traps']);
  assert.equal(p.lock, true);
  assert.deepEqual(p.warnings, []);
});

test('decimal comma is accepted for numbers', () => {
  assert.equal(parseParams('?L=80,5', schema).values.L, 80.5);
});

test('out of range is clamped and reported', () => {
  const p = parseParams('?L=500', schema);
  assert.equal(p.values.L, 200);
  assert.deepEqual(p.warnings, [{ param: 'L', raw: '500', reason: 'out_of_range', min: 40, max: 200, used: 200 }]);
});

test('not a number / not allowed / bad list are reported and dropped', () => {
  const p = parseParams('?L=abc&dt=0.3&ball=steel12&tape=maybe&gates=10&traps=push,foo&seed=1.5', schema);
  assert.deepEqual(p.values, {});
  const byParam = Object.fromEntries(p.warnings.map((w) => [w.param, w]));
  assert.equal(byParam.L.reason, 'not_number');
  assert.equal(byParam.dt.reason, 'not_allowed');
  assert.deepEqual(byParam.dt.allowed, [0.1, 0.2, 0.5]);
  assert.equal(byParam.ball.reason, 'not_allowed');
  assert.deepEqual(byParam.ball.allowed, ['steel16', 'glass16']);
  assert.equal(byParam.tape.reason, 'not_allowed');
  assert.equal(byParam.gates.reason, 'bad_list');
  assert.equal(byParam.traps.reason, 'not_allowed');
  assert.equal(byParam.seed.reason, 'not_number');
});

test('list with an item out of range or wrong length is a bad list', () => {
  assert.equal(parseParams('?gates=10,20,300', schema).warnings[0].reason, 'bad_list');
  assert.equal(parseParams('?gates=1,2,3,4,5,6,7', schema).warnings[0].reason, 'bad_list');
  assert.equal(parseParams('?gates=10,,20', schema).warnings[0].reason, 'bad_list');
});

test('empty list-enum is an empty list', () => {
  assert.deepEqual(parseParams('?traps=', schema).values.traps, []);
});

test('unknown params are ignored silently; lock=true works; lock=0 is off', () => {
  const p = parseParams('?fbclid=abc&utm_source=x&lock=true', schema);
  assert.deepEqual(p.warnings, []);
  assert.equal(p.lock, true);
  assert.equal(parseParams('?lock=0', schema).lock, false);
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npm test`
Expected: FAIL — cannot find `url-params.js`.

- [ ] **Step 3: Implement** `assets/measure/url-params.js`

```js
import { parseDecimal } from './format.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function parseNumber(raw, spec, int) {
  const n = parseDecimal(raw);
  if (Number.isNaN(n) || (int && !Number.isInteger(n))) return { ok: false, warning: { reason: 'not_number' } };
  if (spec.values) {
    return spec.values.includes(n)
      ? { ok: true, value: n }
      : { ok: false, warning: { reason: 'not_allowed', allowed: spec.values } };
  }
  const lo = spec.min ?? -Infinity;
  const hi = spec.max ?? Infinity;
  if (n < lo || n > hi) {
    const used = clamp(n, lo, hi);
    return { ok: true, value: used, warning: { reason: 'out_of_range', min: lo, max: hi, used } };
  }
  return { ok: true, value: n };
}

function parseOne(raw, spec) {
  switch (spec.type) {
    case 'number':
      return parseNumber(raw, spec, false);
    case 'int':
      return parseNumber(raw, spec, true);
    case 'enum':
      return spec.values.includes(raw)
        ? { ok: true, value: raw }
        : { ok: false, warning: { reason: 'not_allowed', allowed: spec.values } };
    case 'bool':
      if (['1', 'true', 'yes'].includes(raw)) return { ok: true, value: true };
      if (['0', 'false', 'no'].includes(raw)) return { ok: true, value: false };
      return { ok: false, warning: { reason: 'not_allowed', allowed: ['1', '0'] } };
    case 'list-number': {
      const items = raw.split(',').map((x) => parseDecimal(x));
      const bad =
        items.some((n) => Number.isNaN(n) || n < spec.min || n > spec.max) ||
        items.length < spec.minLen ||
        items.length > spec.maxLen;
      return bad ? { ok: false, warning: { reason: 'bad_list' } } : { ok: true, value: items };
    }
    case 'list-enum': {
      if (raw.trim() === '') return { ok: true, value: [] };
      const items = [...new Set(raw.split(',').map((x) => x.trim()))];
      return items.every((x) => spec.values.includes(x))
        ? { ok: true, value: items }
        : { ok: false, warning: { reason: 'not_allowed', allowed: spec.values } };
    }
    default:
      throw new Error(`url-params: nezināms tips ${spec.type}`);
  }
}

// Nezināmos parametrus (piem. fbclid, ko pieliek Facebook) klusi ignorē.
export function parseParams(search, schema) {
  const sp = new URLSearchParams(search);
  const values = {};
  const given = new Set();
  const warnings = [];
  for (const [name, spec] of Object.entries(schema)) {
    if (!sp.has(name)) continue;
    const raw = sp.get(name);
    const res = parseOne(raw, spec);
    if (res.ok) {
      values[name] = res.value;
      given.add(name);
    }
    if (res.warning) warnings.push({ param: name, raw, ...res.warning });
  }
  const lockRaw = sp.get('lock');
  return { values, given, lock: lockRaw === '1' || lockRaw === 'true', warnings };
}
```

- [ ] **Step 4: Run to see it pass**

Run: `npm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add assets/measure/url-params.js tests/url-params.test.js
git commit -m "Add generic URL parameter parser with precise warnings"
```

---

### Task 6: Experiment — one run with realistic noise, traps and three data levels

**Files:**
- Create: `assets/rolling-ball/experiment.js`
- Test: `tests/experiment.test.js`

**Interfaces:**
- Consumes: `derive`, `settingsKey` (Task 3); `rngFor`, `gaussian`, `hash32` (Task 1); `roundTo` (Task 1).
- Produces:
  - `NOISE`, `RESOLUTION`, `ERRORS`, `TRAP_REPEATS = 3`, `trapRepeat(seed, key, name) → 1…3`.
  - `simulateRun(settings, { seed, repeat, noise, traps }) →`
    - when the ball does not roll: `{ rolls: false, key, repeat, hMin }`;
    - otherwise `{ rolls: true, key, repeat, level, x0, L, xf, tEnd, xAt(t), timeTo(x), truth: { a, aRun, v0, tau, traps: string[] }, level1?: { t }, level2?: { gates: [{ x, t }] }, level3?: { samples: [{ n, t, x }], strobe: [{ n, t, x }] } }`.
    - `t` in `xAt(t)` / `timeTo(x)` is physical time since release (s). `level3.samples[].x` is the table value (reading noise, rounded to 0,5 cm); `level3.strobe[].x` is the exact position shown in the strobe image. Both share `n` and `t = n·Δt`.
  - `ERRORS = { hand: 0.10, gateT: 0.001, gateX: 0.2, x: 0.5 }` and `DECIMALS = { hand: 2, gateT: 3, gateX: 1, x: 1 }` are the ± values and decimals printed in table headers (Task 8).

**Noise model decisions (write them into the file header as a comment):** the spec’s “±” values are treated as ≈ 2σ; reading error at level 3 is truncated at ±0,25 cm × intensity so that the table and the strobe image always agree within ±0,5 cm (spec 12.13); a trap fires in exactly one of the first three repeats of each table (which one is fixed by seed and settings).

- [ ] **Step 1: Write the failing test** `tests/experiment.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateRun, trapRepeat, NOISE } from '../assets/rolling-ball/experiment.js';
import { defaultSettings, derive, settingsKey, withL, withH, withDt, withLevel, withTimer } from '../assets/rolling-ball/model.js';
import { roundTo } from '../assets/measure/format.js';

const strip = (run) => JSON.parse(JSON.stringify(run)); // drops xAt/timeTo
const base = defaultSettings(); // level 3, Δt 0,2 s
const opts = (o = {}) => ({ seed: 123456, repeat: 1, noise: 1, traps: [], ...o });

test('same seed, settings and repeat reproduce identical data (spec 12.7)', () => {
  for (const level of [1, 2, 3]) {
    const s = withLevel(base, level);
    assert.deepEqual(strip(simulateRun(s, opts())), strip(simulateRun(s, opts())));
  }
});

test('the next repeat gives different data (ATKĀRTOT)', () => {
  assert.notDeepEqual(strip(simulateRun(base, opts())).level3.samples, strip(simulateRun(base, opts({ repeat: 2 }))).level3.samples);
});

test('noise 0, level 3: strobe x = x0 + a t²/2 exactly; x(1):x(2):x(3) = 1:4:9 (spec 12.1, 12.5)', () => {
  const s = withDt(withH(withL(base, 200), 6), 0.5);
  const run = simulateRun(s, opts({ noise: 0 }));
  const a = derive(s).a;
  for (const p of run.level3.strobe) assert.ok(Math.abs(p.x - (s.x0 + (a * p.t * p.t) / 2)) < 1e-9);
  const at = (t) => run.level3.strobe.find((p) => Math.abs(p.t - t) < 1e-9).x - s.x0;
  assert.ok(Math.abs(at(2) / at(1) - 4) < 1e-9);
  assert.ok(Math.abs(at(3) / at(1) - 9) < 1e-9);
  for (let i = 0; i < run.level3.samples.length; i++) {
    assert.equal(run.level3.samples[i].x, roundTo(run.level3.strobe[i].x, 0.5));
  }
});

test('level 3 times are n·Δt and the series ends when the ball reaches the end', () => {
  const run = simulateRun(base, opts({ noise: 0 }));
  run.level3.samples.forEach((p, n) => {
    assert.equal(p.n, n);
    assert.equal(p.t, roundTo(n * 0.2, 0.2));
  });
  const last = run.level3.strobe[run.level3.strobe.length - 1];
  assert.ok(last.t <= run.tEnd && last.t + 0.2 > run.tEnd);
});

test('noise 0, level 1, “mūsu renīte”: t = 2,72 s (spec 12.4)', () => {
  assert.equal(simulateRun(withLevel(base, 1), opts({ noise: 0 })).level1.t, 2.72);
});

test('level 1, real noise: spread of t across repeats is ~0,1 s (spec 12.6)', () => {
  const s = withLevel(base, 1);
  const ts = [];
  for (let r = 1; r <= 400; r++) ts.push(simulateRun(s, opts({ repeat: r })).level1.t);
  const mean = ts.reduce((a, b) => a + b, 0) / ts.length;
  const sd = Math.sqrt(ts.reduce((a, b) => a + (b - mean) ** 2, 0) / ts.length);
  assert.ok(sd > 0.06 && sd < 0.12, `sd ${sd}`);
  assert.ok(Math.abs(mean - 2.72) < 0.12, `mean ${mean}`);
  for (const t of ts) assert.ok(Math.abs(t * 100 - Math.round(t * 100)) < 1e-9);
});

test('level 2 photogates, noise 0: equal segments take less and less time', () => {
  const s = withLevel(base, 2);
  const run = simulateRun(s, opts({ noise: 0 }));
  const a = derive(s).a;
  const ts = run.level2.gates.map((g) => g.t);
  run.level2.gates.forEach((g, i) => {
    assert.equal(g.x, s.gates[i]);
    assert.equal(g.t, roundTo(Math.sqrt((2 * g.x) / a), 0.001));
  });
  for (let i = 2; i < ts.length; i++) assert.ok(ts[i] - ts[i - 1] < ts[i - 1] - ts[i - 2]);
});

test('level 2 stopwatches round to 0,01 s', () => {
  const run = simulateRun(withTimer(withLevel(base, 2), 'hand'), opts());
  for (const g of run.level2.gates) assert.ok(Math.abs(g.t * 100 - Math.round(g.t * 100)) < 1e-9);
});

test('level 3, real noise: table x is a multiple of 0,5 and within ±0,5 cm of the strobe (spec 12.13)', () => {
  for (let r = 1; r <= 30; r++) {
    const run = simulateRun(base, opts({ repeat: r }));
    run.level3.samples.forEach((p, i) => {
      assert.ok(Number.isInteger(p.x * 2), `${p.x}`);
      assert.ok(Math.abs(p.x - run.level3.strobe[i].x) <= 0.5 + 1e-9);
    });
  }
});

test('push trap fires in exactly one of repeats 1–3 with v0 of 3–5 cm/s', () => {
  const o = { noise: 0, traps: ['push'] };
  const v0s = [1, 2, 3, 4, 5, 6].map((r) => simulateRun(base, opts({ ...o, repeat: r })).truth.v0);
  assert.equal(v0s.slice(0, 3).filter((v) => v >= 3 && v <= 5).length, 1);
  assert.equal(v0s.slice(0, 3).filter((v) => v === 0).length, 2);
  assert.deepEqual(v0s.slice(3), [0, 0, 0]);
  const key = settingsKey(base, { noise: 0, traps: ['push'] });
  assert.ok(simulateRun(base, opts({ ...o, repeat: trapRepeat(123456, key, 'push') })).truth.traps.includes('push'));
});

test('late-start trap shifts the start by 2–3 frames in exactly one of repeats 1–3 (level 3)', () => {
  const taus = [1, 2, 3].map((r) => simulateRun(base, opts({ noise: 0, traps: ['late'], repeat: r })).truth.tau);
  const late = taus.filter((t) => t > 0);
  assert.equal(late.length, 1);
  assert.ok(Math.abs(late[0] - 2 * NOISE.frame) < 1e-12 || Math.abs(late[0] - 3 * NOISE.frame) < 1e-12);
});

test('without traps v0 = 0; noise 0 → tau = 0', () => {
  const run = simulateRun(base, opts({ noise: 0 }));
  assert.equal(run.truth.v0, 0);
  assert.equal(run.truth.tau, 0);
});

test('a ball that does not roll gives no data but the minimum h', () => {
  const run = simulateRun(withH(base, 0.1), opts());
  assert.equal(run.rolls, false);
  assert.equal(run.hMin, 0.2);
});

test('xAt and timeTo are consistent and analytic', () => {
  const run = simulateRun(base, opts({ noise: 0 }));
  const a = derive(base).a;
  assert.ok(Math.abs(run.xAt(1) - a / 2) < 1e-12);
  assert.equal(run.xAt(-1), 0);
  assert.equal(run.xAt(99), 80);
  assert.ok(Math.abs(run.xAt(run.timeTo(40)) - 40) < 1e-9);
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npm test`
Expected: FAIL — cannot find `experiment.js`.

- [ ] **Step 3: Implement** `assets/rolling-ball/experiment.js`

```js
// Viena palaišana: patiesā kustība + mērījuma troksnis (spec. 6).
// Spec. „±” vērtības šeit ir ≈ 2σ. Nolasīšanas kļūdu 3. līmenī nogriež pie ±0,25 cm × intensitāte,
// lai tabula un stroboskops vienmēr sakristu ±0,5 cm robežās (spec. 12.13).
// Slazds nostrādā tieši vienā no pirmajiem trim katras tabulas atkārtojumiem (kurā — nosaka sēkla).
import { derive, settingsKey } from './model.js';
import { rngFor, gaussian, hash32 } from '../measure/rng.js';
import { roundTo } from '../measure/format.js';

export const NOISE = {
  aRel: 0.01, // σ no a starp palaišanām (relatīvi)
  reaction: 0.06, // s, σ vienam hronometra spiedienam
  bias: 0.03, // s, σ mērītāja sistemātiskajai nobīdei (nemainīga vienai sēklai)
  gateX: 0.1, // cm, σ fotovārtu novietojumam
  gateT: 0.0005, // s, σ fotovārtu laikam
  frame: 1 / 30, // s, viens video kadrs
  startFrames: 2, // sākuma kadra nobīde: vesels skaitlis −2…2 kadri (× intensitāte)
  readX: 0.15, // cm, σ x nolasīšanai
  readXMax: 0.25, // cm, nolasīšanas kļūdas robeža (× intensitāte)
};
export const RESOLUTION = { hand: 0.01, gate: 0.001, x: 0.5 };
export const ERRORS = { hand: 0.1, gateT: 0.001, gateX: 0.2, x: 0.5 };
export const DECIMALS = { hand: 2, gateT: 3, gateX: 1, x: 1 };
export const TRAP_REPEATS = 3;

export function trapRepeat(seed, key, name) {
  return 1 + (hash32(`${seed}|${key}|trap:${name}`) % TRAP_REPEATS);
}

export function simulateRun(settings, { seed, repeat, noise, traps }) {
  const d = derive(settings);
  const key = settingsKey(settings, { noise, traps });
  if (!d.rolls) return { rolls: false, key, repeat, hMin: d.hMin };

  const k = noise;
  const rand = rngFor(seed, key, repeat);
  const aRun = d.a * Math.max(0.5, 1 + k * NOISE.aRel * gaussian(rand));
  const push = traps.includes('push') && repeat === trapRepeat(seed, key, 'push');
  const late = traps.includes('late') && settings.level === 3 && repeat === trapRepeat(seed, key, 'late');
  const v0 = push ? 3 + 2 * rand() : 0;
  const { x0, L } = settings;

  const xAt = (t) => (t <= 0 ? x0 : Math.min(L, x0 + v0 * t + (aRun * t * t) / 2));
  const timeTo = (x) => {
    const s = Math.max(0, x - x0);
    return (-v0 + Math.sqrt(v0 * v0 + 2 * aRun * s)) / aRun;
  };

  const run = {
    rolls: true,
    key,
    repeat,
    level: settings.level,
    x0,
    L,
    xf: d.xf,
    tEnd: timeTo(L),
    xAt,
    timeTo,
    truth: { a: d.a, aRun, v0, tau: 0, traps: [...(push ? ['push'] : []), ...(late ? ['late'] : [])] },
  };

  if (settings.level === 1) {
    const bias = k * NOISE.bias * gaussian(rngFor(seed, 'bias', 0));
    const t = timeTo(d.xf) + bias + k * NOISE.reaction * (gaussian(rand) - gaussian(rand));
    run.level1 = { t: roundTo(Math.max(0, t), RESOLUTION.hand) };
  } else if (settings.level === 2) {
    run.level2 = {
      gates: settings.gates.map((x, i) => {
        if (settings.timer === 'gate') {
          const xReal = Math.min(L, Math.max(x0, x + k * NOISE.gateX * gaussian(rand)));
          const t = timeTo(xReal) + k * NOISE.gateT * gaussian(rand);
          return { x, t: roundTo(Math.max(0, t), RESOLUTION.gate) };
        }
        const bias = k * NOISE.bias * gaussian(rngFor(seed, 'bias', i + 1));
        const t = timeTo(x) + bias + k * NOISE.reaction * (gaussian(rand) - gaussian(rand));
        return { x, t: roundTo(Math.max(0, t), RESOLUTION.hand) };
      }),
    };
  } else {
    const shift = Math.floor(rand() * (2 * NOISE.startFrames + 1)) - NOISE.startFrames;
    const lateFrames = late ? 2 + Math.floor(rand() * 2) : 0;
    const tau = (Math.round(k * shift) + lateFrames) * NOISE.frame;
    run.truth.tau = tau === 0 ? 0 : tau;
    const maxErr = k * NOISE.readXMax;
    const samples = [];
    const strobe = [];
    for (let n = 0; ; n++) {
      const tf = n * settings.dt;
      const tPhys = tf + tau;
      if (tPhys > run.tEnd) break;
      const x = xAt(tPhys);
      const t = roundTo(tf, settings.dt);
      strobe.push({ n, t, x });
      const err = Math.max(-maxErr, Math.min(maxErr, k * NOISE.readX * gaussian(rand)));
      samples.push({ n, t, x: roundTo(x + err, RESOLUTION.x) });
    }
    run.level3 = { samples, strobe };
  }
  return run;
}
```

- [ ] **Step 4: Run to see it pass**

Run: `npm test`
Expected: all pass. If the level-1 spread test fails, do not loosen the assertion; check that both reaction terms draw from `rand` and that the bias uses its own `rngFor(seed, 'bias', 0)` stream.

- [ ] **Step 5: Commit**

```bash
git add assets/rolling-ball/experiment.js tests/experiment.test.js
git commit -m "Add rolling-ball experiment: seeded noise, traps, three data levels"
```

---

### Task 7: Page URL parameters with `lock`, and warning texts

**Files:**
- Create: `assets/rolling-ball/params.js`
- Test: `tests/params.test.js`

**Interfaces:**
- Consumes: `parseParams` (Task 5); model functions and constants (Task 3); `BALLS`, `ballById`, `ballFits` (Task 2); `randomSeed` (Task 1); `formatNumber`, `roundTo` (Task 1).
- Produces:
  - `PARAM_SCHEMA`, `LOCKABLE = ['L','h','alpha','ball','profile','x0','level','timer','gates','dt','view','tape']`.
  - `settingsFromURL(search, { makeSeed = randomSeed } = {}) → { settings, locked: Set<string>, views: { table: bool, strobe: bool }, noise: 0|1|2, traps: string[], seed: number, seedGiven: bool, warnings: Warning[] }`.
  - `warningText(w, { t, lang }) → string` (uses `url.*` strings from Task 4).
- Rules:
  - Apply in this order: `L`, then `h` (or `alpha` if no `h`), `profile`, `ball`, `x0`, `level`, `timer`, `gates`, `dt`, `tape`.
  - `h` and `alpha` both given → use `h`, add `{ param: 'alpha', reason: 'h_and_alpha', used: h }`.
  - `h > hMax(L)` → `{ param: 'h', reason: 'h_clamped', raw, used: hMax(L), L }` (replaces any `out_of_range` warning for `h`).
  - `ball` that does not fit the (possibly URL-given) profile → keep the current ball, `{ param: 'ball', reason: 'ball_no_fit', used: <current ball id> }`.
  - `x0 > x0Max(L)` → `{ param: 'x0', reason: 'x0_clamped', used: x0Max(L) }`.
  - `gates`: sort ascending, round to 0,5; if the first is below `x0 + 1`, any gap is below 1 cm or the last is above `L` → spread evenly (`spreadGates(x0, finishX(L), count)`) and warn `{ param: 'gates', reason: 'gates_clamped', used: <array> }`.
  - At most one warning per param: a later warning for the same param replaces the earlier one.
  - Every generic warning (`not_number`, `not_allowed`, `bad_list`, `out_of_range`) gets `used` = the final value of that setting (`alpha` → `alphaDeg` rounded to 0,1; `level`/`noise` numbers; `view` → `'both'` unless locked; `traps` → `[]`; `seed` → final seed; `tape` → `'1'`/`'0'`).
  - `lock` locks exactly the given params that are in `LOCKABLE`. Without `lock` nothing is locked and `view` is ignored (both views available). With `lock` and `view=table` → `{ table: true, strobe: false }`; `view=strobe` → `{ table: false, strobe: true }`.
  - `noise` default 1, `traps` default `[]`, `seed` default `makeSeed()`.
  - `warningText` formats numbers with `formatNumber` (0 decimals for integers, otherwise 1, otherwise 2), arrays joined with `'; '` in LV and `', '` in EN, `allowed` joined with `', '`, and passes `hint: t('url.listHint')`.

- [ ] **Step 1: Write the failing test** `tests/params.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settingsFromURL, warningText } from '../assets/rolling-ball/params.js';
import { defaultSettings } from '../assets/rolling-ball/model.js';
import { makeT } from '../assets/translate.js';
import { STRINGS } from '../assets/rolling-ball/i18n.js';

const url = (q) => settingsFromURL(q, { makeSeed: () => 111111 });
const one = (r) => {
  assert.equal(r.warnings.length, 1, JSON.stringify(r.warnings));
  return r.warnings[0];
};

test('no params: defaults, nothing locked, both views, noise 1, random seed', () => {
  const r = url('');
  assert.deepEqual(r.settings, defaultSettings());
  assert.equal(r.locked.size, 0);
  assert.deepEqual(r.views, { table: true, strobe: true });
  assert.equal(r.noise, 1);
  assert.deepEqual(r.traps, []);
  assert.equal(r.seed, 111111);
  assert.equal(r.seedGiven, false);
  assert.deepEqual(r.warnings, []);
});

test('spec example with lock (spec 12.11)', () => {
  const r = url('?L=80&h=2.0&ball=steel16&level=3&dt=0.5&view=strobe&lock=1');
  assert.equal(r.settings.h, 2);
  assert.equal(r.settings.dt, 0.5);
  assert.deepEqual([...r.locked].sort(), ['L', 'ball', 'dt', 'h', 'level', 'view']);
  assert.deepEqual(r.views, { table: false, strobe: true });
  assert.deepEqual(r.warnings, []);
});

test('same link without lock: nothing locked, view ignored', () => {
  const r = url('?L=80&h=2.0&view=strobe');
  assert.equal(r.locked.size, 0);
  assert.deepEqual(r.views, { table: true, strobe: true });
});

test('decimal comma in h', () => {
  assert.equal(url('?h=2,5').settings.h, 2.5);
});

test('unknown ball id → default ball + warning', () => {
  const w = one(url('?ball=steel12'));
  assert.deepEqual([w.param, w.reason, w.used], ['ball', 'not_allowed', 'steel16']);
});

test('ball that does not fit the groove → warning; on the flat surface it is fine', () => {
  const w = one(url('?ball=steel10'));
  assert.deepEqual([w.param, w.reason, w.used], ['ball', 'ball_no_fit', 'steel16']);
  const r = url('?ball=steel10&profile=flat');
  assert.equal(r.settings.ball, 'steel10');
  assert.deepEqual(r.warnings, []);
});

test('L out of range is clamped', () => {
  const r = url('?L=500');
  assert.equal(r.settings.L, 200);
  assert.deepEqual([one(r).reason, one(r).used], ['out_of_range', 200]);
});

test('h too large for L is clamped with its own reason', () => {
  const r = url('?L=80&h=30');
  assert.equal(r.settings.h, 20.7);
  const w = one(r);
  assert.deepEqual([w.param, w.reason, w.used, w.L], ['h', 'h_clamped', 20.7, 80]);
});

test('h not a number → default h', () => {
  const w = one(url('?h=abc'));
  assert.deepEqual([w.reason, w.used], ['not_number', 3]);
});

test('h and alpha both → h wins', () => {
  const r = url('?h=3&alpha=5');
  assert.equal(r.settings.angleMode, 'h');
  assert.deepEqual([one(r).param, one(r).reason], ['alpha', 'h_and_alpha']);
});

test('alpha alone switches to α-mode', () => {
  const r = url('?alpha=5');
  assert.equal(r.settings.angleMode, 'alpha');
  assert.equal(r.settings.alphaDeg, 5);
});

test('x0 too close to the finish', () => {
  const r = url('?x0=100');
  assert.equal(r.settings.x0, 65);
  assert.deepEqual([one(r).reason, one(r).used], ['x0_clamped', 65]);
});

test('gates: valid list, bad list, list that does not fit L', () => {
  assert.deepEqual(url('?gates=30,10,20').settings.gates, [10, 20, 30]);
  const bad = url('?gates=10,20,300');
  assert.deepEqual(bad.settings.gates, defaultSettings().gates);
  assert.equal(one(bad).reason, 'bad_list');
  assert.deepEqual(url('?L=60&gates=10,20,55').settings.gates, [10, 20, 55]);
  const clamped = url('?L=60&gates=10,20,70');
  assert.deepEqual(clamped.settings.gates, [16.5, 33.5, 50]);
  assert.deepEqual([one(clamped).reason, one(clamped).used], ['gates_clamped', [16.5, 33.5, 50]]);
});

test('teacher-only settings: noise, traps, seed', () => {
  const r = url('?noise=0&traps=push,late&seed=42');
  assert.equal(r.noise, 0);
  assert.deepEqual(r.traps, ['push', 'late']);
  assert.equal(r.seed, 42);
  assert.equal(r.seedGiven, true);
  assert.equal(one(url('?traps=push,foo')).reason, 'not_allowed');
});

test('level, timer, tape, dt', () => {
  const r = url('?level=2&timer=hand&tape=0&lock=1');
  assert.equal(r.settings.level, 2);
  assert.equal(r.settings.timer, 'hand');
  assert.equal(r.settings.tape, false);
  assert.deepEqual([...r.locked].sort(), ['level', 'tape', 'timer']);
  assert.equal(one(url('?dt=0.3')).reason, 'not_allowed');
  assert.equal(url('?dt=0.3').settings.dt, 0.2);
});

test('Facebook and tracking params are ignored silently', () => {
  assert.deepEqual(url('?fbclid=abc&utm_source=x').warnings, []);
});

test('warningText gives precise LV and EN messages', () => {
  const w = one(url('?L=80&h=30'));
  const tl = makeT(STRINGS, () => 'lv');
  const te = makeT(STRINGS, () => 'en');
  assert.equal(warningText(w, { t: tl, lang: 'lv' }), 'Saitē h = 30 cm ir par lielu renītei L = 80 cm (α ≤ 15°). Izmantots h = 20,7 cm.');
  assert.equal(warningText(w, { t: te, lang: 'en' }), 'In the link, h = 30 cm is too large for the groove L = 80 cm (α ≤ 15°). Using h = 20.7 cm.');
  const g = one(url('?L=60&gates=10,20,70'));
  assert.ok(warningText(g, { t: tl, lang: 'lv' }).endsWith('Vārti izvietoti vienmērīgi: 16,5; 33,5; 50.'));
  const b = one(url('?ball=steel12'));
  assert.ok(warningText(b, { t: tl, lang: 'lv' }).includes('Atļautās vērtības: steel10, steel16'));
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npm test`
Expected: FAIL — cannot find `params.js`.

- [ ] **Step 3: Implement** `assets/rolling-ball/params.js` following the rules above. Skeleton with the non-obvious parts filled in:

```js
import { parseParams } from '../measure/url-params.js';
import { BALLS, ballById, ballFits } from './balls.js';
import {
  defaultSettings, withL, withH, withAlpha, withX0, withLevel, withTimer, withDt, withTape,
  hMax, x0Max, finishX, spreadGates, L_MIN, L_MAX, ALPHA_MAX, DT_OPTIONS, GATE_MIN, GATE_MAX, GATE_GAP, STEP,
} from './model.js';
import { randomSeed } from '../measure/rng.js';
import { formatNumber, roundTo } from '../measure/format.js';

export const PARAM_SCHEMA = {
  L: { type: 'number', min: L_MIN, max: L_MAX },
  h: { type: 'number', min: 0, max: 60 },
  alpha: { type: 'number', min: 0, max: ALPHA_MAX },
  ball: { type: 'enum', values: BALLS.map((b) => b.id) },
  profile: { type: 'enum', values: ['groove', 'flat'] },
  x0: { type: 'number', min: 0, max: L_MAX },
  level: { type: 'enum', values: ['1', '2', '3'] },
  timer: { type: 'enum', values: ['gate', 'hand'] },
  gates: { type: 'list-number', min: 0, max: L_MAX, minLen: GATE_MIN, maxLen: GATE_MAX },
  dt: { type: 'number', values: DT_OPTIONS },
  view: { type: 'enum', values: ['table', 'strobe', 'both'] },
  tape: { type: 'bool' },
  noise: { type: 'enum', values: ['0', '1', '2'] },
  traps: { type: 'list-enum', values: ['push', 'late'] },
  seed: { type: 'int', min: 1, max: 2147483647 },
};

export const LOCKABLE = ['L', 'h', 'alpha', 'ball', 'profile', 'x0', 'level', 'timer', 'gates', 'dt', 'view', 'tape'];

export function settingsFromURL(search, { makeSeed = randomSeed } = {}) {
  const p = parseParams(search, PARAM_SCHEMA);
  const v = p.values;
  const warnings = new Map(); // param → warning (a later one replaces an earlier one)
  for (const w of p.warnings) warnings.set(w.param, { ...w });
  const warn = (w) => warnings.set(w.param, w);

  let s = defaultSettings();
  if ('L' in v) s = withL(s, v.L);
  if ('h' in v) {
    if ('alpha' in v) warn({ param: 'alpha', raw: String(v.alpha), reason: 'h_and_alpha' });
    if (v.h > hMax(s.L)) warn({ param: 'h', raw: new URLSearchParams(search).get('h'), reason: 'h_clamped', used: hMax(s.L), L: s.L });
    s = withH(s, v.h);
  } else if ('alpha' in v) {
    s = withAlpha(s, v.alpha);
  }
  if ('profile' in v) s = { ...s, profile: v.profile }; // the default ball fits both profiles
  if ('ball' in v) {
    if (ballFits(ballById(v.ball), s.profile)) s = { ...s, ball: v.ball };
    else warn({ param: 'ball', raw: v.ball, reason: 'ball_no_fit', used: s.ball });
  }
  if ('x0' in v) {
    if (v.x0 > x0Max(s.L)) warn({ param: 'x0', raw: String(v.x0), reason: 'x0_clamped', used: x0Max(s.L) });
    s = withX0(s, v.x0);
  }
  if ('level' in v) s = withLevel(s, Number(v.level));
  if ('timer' in v) s = withTimer(s, v.timer);
  if ('gates' in v) {
    const sorted = v.gates.map((x) => roundTo(x, STEP.x)).sort((a, b) => a - b);
    const ok = sorted.every((x, i) => x >= (i === 0 ? s.x0 : sorted[i - 1]) + GATE_GAP) && sorted[sorted.length - 1] <= s.L;
    if (ok) s = { ...s, gates: sorted };
    else {
      const spread = spreadGates(s.x0, finishX(s.L), sorted.length);
      warn({ param: 'gates', raw: new URLSearchParams(search).get('gates'), reason: 'gates_clamped', used: spread });
      s = { ...s, gates: spread };
    }
  }
  if ('dt' in v) s = withDt(s, v.dt);
  if ('tape' in v) s = withTape(s, v.tape);

  const locked = p.lock ? new Set(LOCKABLE.filter((n) => p.given.has(n))) : new Set();
  let views = { table: true, strobe: true };
  if (p.lock && 'view' in v) views = { table: v.view !== 'strobe', strobe: v.view !== 'table' };
  const noise = 'noise' in v ? Number(v.noise) : 1;
  const traps = v.traps ?? [];
  const seed = v.seed ?? makeSeed();

  // `used` for the generic warnings = the final value of that setting
  const finalValue = {
    L: s.L, h: s.h, alpha: roundTo(s.alphaDeg, 0.1), ball: s.ball, profile: s.profile, x0: s.x0,
    level: s.level, timer: s.timer, gates: s.gates, dt: s.dt, view: 'both', tape: s.tape ? '1' : '0',
    noise, traps: [], seed,
  };
  for (const w of warnings.values()) if (!('used' in w)) w.used = finalValue[w.param];
  if (warnings.has('alpha') && warnings.get('alpha').reason === 'h_and_alpha') warnings.get('alpha').used = s.h;

  return { settings: s, locked, views, noise, traps, seed, seedGiven: 'seed' in v, warnings: [...warnings.values()] };
}
```

Implement `warningText(w, { t, lang })` exactly as the Interfaces rules say. Reference implementation:

```js
function fmt(value, lang) {
  if (Array.isArray(value)) return value.map((x) => fmt(x, lang)).join(lang === 'lv' ? '; ' : ', ');
  if (typeof value !== 'number') return String(value);
  const oneDecimal = Math.abs(value * 10 - Math.round(value * 10)) < 1e-9;
  const dec = Number.isInteger(value) ? 0 : oneDecimal ? 1 : 2;
  return formatNumber(value, dec, lang);
}

export function warningText(w, { t, lang }) {
  return t(`url.${w.reason}`, {
    param: w.param,
    raw: w.raw,
    used: fmt(w.used, lang),
    min: w.min === undefined ? '' : fmt(w.min, lang),
    max: w.max === undefined ? '' : fmt(w.max, lang),
    allowed: (w.allowed ?? []).map((x) => fmt(x, lang)).join(', '),
    L: w.L === undefined ? '' : fmt(w.L, lang),
    hint: t('url.listHint'),
  });
}
```

Note: `raw` for `h_clamped` must be the text from the link (`'30'`), which is why it is read back from `URLSearchParams`; for `out_of_range` the parser already stores `raw`.

- [ ] **Step 4: Run to see it pass**

Run: `npm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add assets/rolling-ball/params.js tests/params.test.js
git commit -m "Add URL parameters with lock and precise warnings for K-01"
```

---

### Task 8: Results tables and export text

**Files:**
- Create: `assets/rolling-ball/results.js`, `assets/measure/table-export.js`
- Test: `tests/results.test.js`, `tests/table-export.test.js`

**Interfaces:**
- Consumes: `simulateRun`, `ERRORS`, `DECIMALS` (Task 6); `derive` (Task 3); `formatNumber`, `roundTo` (Task 1); strings (Task 4).
- Produces:
  - `createResults() → { tables(), byKey(key), nextRepeat(key), add(settings, run, meta) → table }`. A table is `{ index (1-based), key, level, settings (deep copy), meta: { seed, noise, traps }, runs: Run[] }`. `add` puts the run into the table with `run.key`, creating it if needed.
  - `tableModel(table, { t, lang }) → { title, settingsLine, columns: [{ label, decimals }], rows: Array<Array<number|null>>, filename }`.
    - Level 1: one row; columns `t₁, s (±0,10 s)`, `t₂, s (±0,10 s)`, … one per run.
    - Level 2: rows per gate; first column `x, cm (±0,2 cm)` (1 decimal), then `tᵢ, s (±0,001 s)` (3 decimals) for photogates or `tᵢ, s (±0,10 s)` (2 decimals) for stopwatches.
    - Level 3: rows n = 0…max; first column `t, s` (decimals of Δt), then `xᵢ, cm (±0,5 cm)` (1 decimal); a shorter run leaves `null`.
    - Subscripts: digits → `₀₁₂₃₄₅₆₇₈₉`.
    - `settingsLine`: `t('set.prefix')` + parts joined with `'; '`: `set.L`, slope (`set.hAlpha` in h-mode, `set.alphaH` in α-mode; h 1 decimal, α 1 decimal), `set.ball` (material name from `mat.*`, Ø in mm 0 decimals, mass 1 decimal), `set.profile.*`, `set.x0` (1 decimal), then level-specific `set.finish` (level 1), `set.timer.*` (level 2), `set.dt` (level 3, 1 decimal), then `set.seed`.
    - `filename`: `lodite-tabula-${index}`.
  - `toTSV(model, lang) → string`, `toCSV(model, lang) → string` (pure); `copyText(text) → Promise<{ ok: true } | { ok: false, reason: 'clipboard_blocked' }>`, `downloadText(filename, text, mime, { bom })`, `downloadBlob(filename, blob)` (DOM).

- [ ] **Step 1: Write the failing tests**

`tests/table-export.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toTSV, toCSV } from '../assets/measure/table-export.js';

const model = {
  title: '1. tabula. Lodītes koordināta x atkarībā no laika t',
  settingsLine: 'Iestatījumi: L = 80 cm; sēkla 1',
  columns: [{ label: 't, s', decimals: 1 }, { label: 'x₁, cm (±0,5 cm)', decimals: 1 }, { label: 'x₂, cm (±0,5 cm)', decimals: 1 }],
  rows: [[0, 0, 0], [0.2, 0.5, 0.5], [0.4, 1.5, null]],
  filename: 'lodite-tabula-1',
};

test('TSV: title, settings, header, rows with decimal comma', () => {
  assert.equal(
    toTSV(model, 'lv'),
    '1. tabula. Lodītes koordināta x atkarībā no laika t\nIestatījumi: L = 80 cm; sēkla 1\nt, s\tx₁, cm (±0,5 cm)\tx₂, cm (±0,5 cm)\n0,0\t0,0\t0,0\n0,2\t0,5\t0,5\n0,4\t1,5\t\n',
  );
});

test('CSV LV: semicolon separator, decimal comma, fields with ; are quoted', () => {
  const csv = toCSV(model, 'lv');
  const lines = csv.split('\r\n');
  assert.equal(lines[0], '1. tabula. Lodītes koordināta x atkarībā no laika t');
  assert.equal(lines[1], '"Iestatījumi: L = 80 cm; sēkla 1"');
  assert.equal(lines[2], 't, s;x₁, cm (±0,5 cm);x₂, cm (±0,5 cm)');
  assert.equal(lines[3], '0,0;0,0;0,0');
  assert.equal(lines[5], '0,4;1,5;');
});

test('CSV EN: comma separator, decimal point, labels with commas quoted', () => {
  const lines = toCSV(model, 'en').split('\r\n');
  assert.equal(lines[2], '"t, s","x₁, cm (±0,5 cm)","x₂, cm (±0,5 cm)"');
  assert.equal(lines[4], '0.2,0.5,0.5');
});
```

`tests/results.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createResults, tableModel } from '../assets/rolling-ball/results.js';
import { simulateRun } from '../assets/rolling-ball/experiment.js';
import { defaultSettings, withH, withLevel, withTimer, withAlpha, settingsKey } from '../assets/rolling-ball/model.js';
import { makeT } from '../assets/translate.js';
import { STRINGS } from '../assets/rolling-ball/i18n.js';

const cfg = { seed: 482913, noise: 1, traps: [] };
const lv = { t: makeT(STRINGS, () => 'lv'), lang: 'lv' };
const en = { t: makeT(STRINGS, () => 'en'), lang: 'en' };

function runInto(results, s, n = 1) {
  const key = settingsKey(s, cfg);
  for (let i = 0; i < n; i++) {
    const run = simulateRun(s, { ...cfg, repeat: results.nextRepeat(key) });
    results.add(s, run, cfg);
  }
  return results.byKey(key);
}

test('runs land in the table of their own settings; returning continues that table (Review Focus 2)', () => {
  const r = createResults();
  const a = defaultSettings();
  const b = withH(a, 5);
  runInto(r, a, 2);
  runInto(r, b, 1);
  const t = runInto(r, a, 1);
  assert.equal(r.tables().length, 2);
  assert.equal(t.index, 1);
  assert.deepEqual(t.runs.map((x) => x.repeat), [1, 2, 3]);
  assert.equal(r.byKey(settingsKey(b, cfg)).index, 2);
  assert.equal(r.nextRepeat(settingsKey(a, cfg)), 4);
  assert.equal(r.nextRepeat('nav-tadas'), 1);
});

test('table keeps a copy of the settings', () => {
  const r = createResults();
  const s = defaultSettings();
  const t = runInto(r, s, 1);
  s.gates.push(99);
  assert.equal(t.settings.gates.length, 5);
});

test('level 3 model: t column, one x column per run, blanks for shorter runs', () => {
  const r = createResults();
  const t = runInto(r, defaultSettings(), 3);
  const m = tableModel(t, lv);
  assert.equal(m.title, '1. tabula. Lodītes koordināta x atkarībā no laika t');
  assert.deepEqual(m.columns.map((c) => c.label), ['t, s', 'x₁, cm (±0,5 cm)', 'x₂, cm (±0,5 cm)', 'x₃, cm (±0,5 cm)']);
  assert.deepEqual(m.columns.map((c) => c.decimals), [1, 1, 1, 1]);
  const longest = Math.max(...t.runs.map((x) => x.level3.samples.length));
  assert.equal(m.rows.length, longest);
  assert.equal(m.rows[1][0], 0.2);
  for (const row of m.rows) assert.equal(row.length, 4);
  assert.equal(m.filename, 'lodite-tabula-1');
});

test('level 3 settings line (LV and EN)', () => {
  const r = createResults();
  const t = runInto(r, defaultSettings(), 1);
  assert.equal(
    tableModel(t, lv).settingsLine,
    'Iestatījumi: L = 80 cm; h = 3,0 cm (α = 2,1°); lodīte: tērauds, Ø 16 mm, 16,8 g; renīte; kustības sākumpunkts x₀ = 0,0 cm; Δt = 0,2 s; sēkla 482913',
  );
  assert.equal(
    tableModel(t, en).settingsLine,
    'Settings: L = 80 cm; h = 3.0 cm (α = 2.1°); ball: steel, Ø 16 mm, 16.8 g; groove; release point x₀ = 0.0 cm; Δt = 0.2 s; seed 482913',
  );
});

test('α-mode puts α first in the settings line', () => {
  const r = createResults();
  const t = runInto(r, withAlpha(defaultSettings(), 3), 1);
  assert.ok(tableModel(t, lv).settingsLine.includes('α = 3,0° (h = 4,2 cm)'));
});

test('level 1 model: one row, t₁ t₂ columns with ±0,10 s', () => {
  const r = createResults();
  const t = runInto(r, withLevel(defaultSettings(), 1), 2);
  const m = tableModel(t, lv);
  assert.equal(m.title, '1. tabula. Laiks t, kurā lodīte noripo no starta līdz finišam');
  assert.deepEqual(m.columns.map((c) => c.label), ['t₁, s (±0,10 s)', 't₂, s (±0,10 s)']);
  assert.deepEqual(m.columns.map((c) => c.decimals), [2, 2]);
  assert.equal(m.rows.length, 1);
  assert.ok(m.settingsLine.includes('finišs x = 70,0 cm'));
});

test('level 2 model: x column then t columns; photogates 3 decimals, stopwatches 2', () => {
  const r = createResults();
  const g = tableModel(runInto(r, withLevel(defaultSettings(), 2), 2), lv);
  assert.deepEqual(g.columns.map((c) => c.label), ['x, cm (±0,2 cm)', 't₁, s (±0,001 s)', 't₂, s (±0,001 s)']);
  assert.deepEqual(g.columns.map((c) => c.decimals), [1, 3, 3]);
  assert.deepEqual(g.rows.map((row) => row[0]), [14, 28, 42, 56, 70]);
  assert.ok(g.settingsLine.includes('fotovārti'));
  const h = tableModel(runInto(r, withTimer(withLevel(defaultSettings(), 2), 'hand'), 1), lv);
  assert.deepEqual(h.columns.map((c) => c.label), ['x, cm (±0,2 cm)', 't₁, s (±0,10 s)']);
  assert.equal(h.title.startsWith('2. tabula.'), true);
});

test('student output has only t and x columns (spec 12.10)', () => {
  const r = createResults();
  for (const level of [1, 2, 3]) {
    const m = tableModel(runInto(r, withLevel(defaultSettings(), level), 2), lv);
    for (const c of m.columns) assert.ok(/^(t|x)[₀-₉]*, (s|cm)/.test(c.label), c.label);
  }
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npm test`
Expected: FAIL — cannot find `table-export.js` / `results.js`.

- [ ] **Step 3: Implement**

`assets/measure/table-export.js`:

```js
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
```

`assets/rolling-ball/results.js` — implement `createResults` with closures (no `this`) and `tableModel` per the Interfaces block. Header errors come from `ERRORS`/`DECIMALS` (Task 6): level 1 `ERRORS.hand`/`DECIMALS.hand`; level 2 photogates `ERRORS.gateT`/`DECIMALS.gateT`, stopwatches `ERRORS.hand`/`DECIMALS.hand`, x column `ERRORS.gateX`/`DECIMALS.gateX`; level 3 x columns `ERRORS.x`/`DECIMALS.x`; the level-3 t column has no error and `decimalsOf(dt)` decimals. Labels are built as `` `${t('col.tN', { i: sub(k) })} ${t('col.err', { e: formatNumber(err, dec, lang), u: 's' })}` ``; the unit for x columns is `'cm'`. The t column of level 3 uses `roundTo(n * dt, dt)`.

- [ ] **Step 4: Run to see them pass**

Run: `npm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add assets/rolling-ball/results.js assets/measure/table-export.js tests/results.test.js tests/table-export.test.js
git commit -m "Add results tables and TSV/CSV export"
```

---

### Task 9: Shared page frame — CSS, sim-core, page skeleton

**Files:**
- Create: `assets/sim-common.css`, `assets/sim-core.js`, `rolling-ball.html`, `assets/rolling-ball/main.js` (first version)

**Interfaces:**
- Consumes: `makeT` (Task 4), `STRINGS` (Task 4).
- Produces (`assets/sim-core.js`):
  - `LANG_KEY = 'physics-sims-lang'`, `THEME_KEY = 'fiz-sim-theme'`, `MAX_STEP = 0.05`.
  - `createI18n(dict) → { t, lang(), set(lang), onChange(cb), apply(root = document) }`. `apply` fills `[data-i18n]` textContent, `[data-i18n-aria]` aria-label, `[data-i18n-title]` title, sets `<html lang>` and `document.title = t('page.title')`.
  - `createTheme() → { current(), toggle(), onChange(cb), colors() }`. `colors()` returns `{ sheet, ink, inkDim, hairline, accent, field, mat: { steel, glass, wood, plastic, celluloid } }` read from CSS tokens.
  - `mountTitleBlock(el, { i18n, theme, sheet, topicKey })`.
  - `setupCanvas(canvas, onResize) → { ctx, size() → { w, h } }` (ResizeObserver on the parent, DPR-aware, calls `onResize(w, h)`).
  - `startLoop(step) → stop()` — rAF loop, `step(dt)` with `dt ≤ MAX_STEP`, first frame dt = 0.
- Produces (DOM ids other tasks rely on): `#drawing`, `#scene` (canvas), `#handles`, `#notices`, `#controls`, `#blockLevel`, `#blockBall`, `#blockDims`, `#blockRun`, `#blockResults`, `#titleblock`.

- [ ] **Step 1: Write `assets/sim-core.js`**

```js
import { makeT } from './translate.js';

export const LANG_KEY = 'physics-sims-lang'; // kopīgs ar vecajām lapām
export const THEME_KEY = 'fiz-sim-theme';
export const MAX_STEP = 0.05; // s — pēc atgriešanās no citas cilnes lodīte neaizlec

function load(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    // privātais režīms: izvēle derēs līdz lapas aizvēršanai
  }
}

export function createI18n(dict) {
  const saved = load(LANG_KEY);
  let lang = saved === 'lv' || saved === 'en' ? saved : (navigator.language || '').toLowerCase().startsWith('lv') ? 'lv' : 'en';
  const listeners = [];
  const t = makeT(dict, () => lang);
  function apply(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    root.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    root.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
    document.documentElement.lang = lang;
    document.title = t('page.title');
  }
  return {
    t,
    apply,
    lang: () => lang,
    set(next) {
      if ((next !== 'lv' && next !== 'en') || next === lang) return;
      lang = next;
      save(LANG_KEY, lang);
      apply();
      listeners.forEach((cb) => cb(lang));
    },
    onChange(cb) {
      listeners.push(cb);
    },
  };
}

export function createTheme() {
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: light)');
  const listeners = [];
  let override = load(THEME_KEY);
  const resolve = () => override || (media.matches ? 'light' : 'dark');
  function applyTheme() {
    root.dataset.theme = resolve();
    listeners.forEach((cb) => cb(root.dataset.theme));
  }
  media.addEventListener('change', () => { if (!override) applyTheme(); });
  root.dataset.theme = resolve();
  return {
    current: () => root.dataset.theme,
    toggle() {
      override = root.dataset.theme === 'dark' ? 'light' : 'dark';
      save(THEME_KEY, override);
      applyTheme();
    },
    onChange(cb) {
      listeners.push(cb);
    },
    colors() {
      const cs = getComputedStyle(root);
      const v = (name) => cs.getPropertyValue(name).trim();
      return {
        sheet: v('--sheet'), ink: v('--ink'), inkDim: v('--ink-dim'), hairline: v('--hairline'),
        accent: v('--accent'), field: v('--field'),
        mat: { steel: v('--mat-steel'), glass: v('--mat-glass'), wood: v('--mat-wood'), plastic: v('--mat-plastic'), celluloid: v('--mat-celluloid') },
      };
    },
  };
}

export function mountTitleBlock(el, { i18n, theme, sheet, topicKey }) {
  el.innerHTML = `
    <div class="cell"><span class="k" data-i18n="tb.set"></span><span class="v">FIZ-SIM</span></div>
    <div class="cell"><span class="k" data-i18n="tb.sheet"></span><span class="v">${sheet}</span></div>
    <div class="cell"><span class="k" data-i18n="tb.topic"></span><span class="v" data-i18n="${topicKey}"></span></div>
    <div class="cell"><span class="k" data-i18n="tb.langTheme"></span><span class="v">
      <button type="button" data-lang="lv">LV</button><button type="button" data-lang="en">EN</button>
      <button type="button" class="theme-toggle" data-i18n-aria="tb.themeToggle">◐</button>
    </span></div>`;
  const sync = () => {
    el.querySelectorAll('[data-lang]').forEach((b) => {
      const on = b.dataset.lang === i18n.lang();
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  };
  el.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => i18n.set(b.dataset.lang)));
  el.querySelector('.theme-toggle').addEventListener('click', () => theme.toggle());
  i18n.onChange(sync);
  sync();
  i18n.apply(el);
}

export function setupCanvas(canvas, onResize) {
  const ctx = canvas.getContext('2d');
  let w = 0;
  let h = 0;
  function resize() {
    const box = canvas.parentElement.getBoundingClientRect();
    w = Math.max(1, Math.round(box.width));
    h = Math.max(1, Math.round(box.height));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    onResize(w, h);
  }
  new ResizeObserver(resize).observe(canvas.parentElement);
  resize();
  return { ctx, size: () => ({ w, h }) };
}

export function startLoop(step) {
  let last = null;
  let id = 0;
  let stopped = false;
  function frame(now) {
    if (stopped) return;
    const dt = last === null ? 0 : Math.min((now - last) / 1000, MAX_STEP);
    last = now;
    step(dt);
    if (!stopped) id = requestAnimationFrame(frame);
  }
  id = requestAnimationFrame(frame);
  return () => {
    stopped = true;
    cancelAnimationFrame(id);
  };
}
```

- [ ] **Step 2: Write `assets/sim-common.css`**

Start from the `<style>` block of `design.html` (lines 11–267): copy the token blocks, base rules, frame, header, `.work`, `.drawing`, `canvas`, `.controls`, `.block`, `.block-title`, `.readout`, `.btn*`, `.titleblock`, `.cell*` and both media queries **verbatim**, with these changes:

1. Token blocks become `:root, :root[data-theme="dark"] { … }` and `:root[data-theme="light"] { … }`, drop `--charge-pos/--charge-neg`, and add the material tokens:

```css
  /* dark */
  --mat-steel: #8d949c;
  --mat-glass: #7fb8c9;
  --mat-wood: #b08553;
  --mat-plastic: #d9c24a;
  --mat-celluloid: #efece4;
  /* light */
  --mat-steel: #6b7178;
  --mat-glass: #4d8ea3;
  --mat-wood: #8a5f2e;
  --mat-plastic: #b39a1c;
  --mat-celluloid: #ffffff;
```

2. `button, input` → `button, input, select`. Add `font-size: inherit;`.
3. Drop the `input[type="range"]`, `.dim-row`, `.dim-head`, `.dim-line` rules (this page uses handles in the drawing instead).
4. Add `.theme-toggle { float: right; }` and `.drawing { overflow: hidden; }`.

Then append the new component styles exactly:

```css
/* ── Papildu vadības elementi ─────────────────────────── */
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn:disabled:hover { background: none; color: inherit; border-color: var(--hairline); }
.btn[aria-pressed="true"] { border-color: var(--accent); color: var(--accent); }
.seg { display: flex; }
.seg .btn { flex: 1; }
.seg .btn + .btn { margin-left: -1px; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 10px; }
.row-label { font-size: 10px; letter-spacing: 0.1em; color: var(--ink-dim); }
.hint { font-family: 'IBM Plex Sans', system-ui, sans-serif; font-size: 12px; line-height: 1.45; color: var(--ink-dim); margin-top: 8px; }
.fix { font-size: 9px; letter-spacing: 0.12em; color: var(--ink-dim); border: 1px solid var(--hairline); padding: 0 4px; margin-left: 6px; }
.stepper { display: inline-flex; align-items: center; }
.stepper button { width: 28px; height: 28px; background: none; border: 1px solid var(--hairline); cursor: pointer; }
.stepper button:hover { background: var(--ink); color: var(--sheet); }
.stepper button:disabled { opacity: 0.4; cursor: not-allowed; background: none; color: inherit; }
.stepper output { min-width: 3ch; text-align: center; font-variant-numeric: tabular-nums; }
.check { display: flex; align-items: center; gap: 8px; margin-top: 10px; font-size: 11px; letter-spacing: 0.1em; cursor: pointer; }
.check input { appearance: none; -webkit-appearance: none; width: 13px; height: 13px; border: 1px solid var(--ink); background: none; display: grid; place-content: center; cursor: pointer; }
.check input:checked::after { content: ""; width: 7px; height: 7px; background: var(--accent); }
.check input:disabled { opacity: 0.4; cursor: not-allowed; }
select.select { width: 100%; background: var(--sheet); border: 1px solid var(--hairline); padding: 5px 6px; font-size: 11px; }

/* ── Specifikācijas tabula (lodītes) ──────────────────── */
.spec { width: 100%; border-collapse: collapse; font-size: 11px; font-variant-numeric: tabular-nums; }
.spec th { font-size: 9px; letter-spacing: 0.1em; color: var(--ink-dim); font-weight: 400; text-align: left; padding: 3px 4px; border-bottom: 1px solid var(--hairline); }
.spec td { padding: 4px; border-bottom: 1px solid var(--hairline); }
.spec .num { text-align: right; }
.spec tbody tr { cursor: pointer; }
.spec tbody tr:hover td { background: var(--ink); color: var(--sheet); }
.spec tbody tr[aria-checked="true"] td { color: var(--accent); }
.spec tbody tr[aria-disabled="true"] td { color: var(--ink-dim); opacity: 0.5; }
.spec tbody tr[aria-disabled="true"] { cursor: not-allowed; }
.spec tbody tr[aria-disabled="true"]:hover td { background: none; color: var(--ink-dim); }

/* ── Izmēru līniju rokturi virs kanvas ────────────────── */
.handles { position: absolute; inset: 0; pointer-events: none; }
.handle { position: absolute; left: 0; top: 0; width: 28px; height: 28px; margin: -14px 0 0 -14px; background: none; border: none; pointer-events: auto; touch-action: none; cursor: grab; display: grid; place-content: center; }
.handle::before { content: ""; width: 11px; height: 11px; background: var(--sheet); border: 1px solid var(--ink); transform: rotate(45deg); }
.handle:hover::before, .handle.dragging::before, .handle:focus-visible::before { background: var(--accent); border-color: var(--accent); }
.handle:focus-visible { outline: none; }
.handle.dragging { cursor: grabbing; }
.handle.ball { width: 36px; height: 36px; margin: -18px 0 0 -18px; }
.handle.ball::before { display: none; }
.handle.ball:focus-visible, .handle.ball.dragging { outline: 1px dashed var(--accent); outline-offset: -4px; }
.handle-label { position: absolute; left: 0; top: 0; white-space: nowrap; font-size: 12px; font-weight: 500; font-variant-numeric: tabular-nums; padding: 1px 4px; background: var(--field); pointer-events: auto; display: inline-flex; align-items: center; gap: 4px; }
.handle-label.derived { color: var(--ink-dim); font-weight: 400; }
.handle-label.locked { color: var(--ink-dim); }
.handle-label .mini { display: none; width: 22px; height: 22px; background: var(--sheet); border: 1px solid var(--hairline); cursor: pointer; }
.handle-label.selected .mini { display: inline-block; }
.handle-label .mini:hover { background: var(--ink); color: var(--sheet); }
.drawing.running .handle, .drawing.running .handle-label .mini { visibility: hidden; }

/* ── Paziņojumi ────────────────────────────────────────── */
.notices { position: absolute; left: 12px; right: 12px; top: 12px; display: flex; flex-direction: column; gap: 6px; pointer-events: none; z-index: 2; }
.notice { pointer-events: auto; display: flex; gap: 10px; align-items: flex-start; background: var(--sheet); border: 1px solid var(--ink); padding: 8px 10px; font-family: 'IBM Plex Sans', system-ui, sans-serif; font-size: 12.5px; line-height: 1.4; max-width: 640px; }
.notice button { margin-left: auto; background: none; border: none; cursor: pointer; font-family: 'IBM Plex Mono', monospace; color: var(--ink-dim); padding: 0 2px; }
.notice button:hover { color: var(--ink); }

/* ── Slānis pa visu ekrānu (datu tabula, stroboskops) ─── */
.overlay { position: fixed; inset: 0; z-index: 10; background: var(--sheet); padding: 10px; display: flex; }
.overlay > .frame { flex: 1; min-width: 0; }
.overlay-head { display: flex; flex-wrap: wrap; align-items: stretch; border-bottom: 1px solid var(--hairline); flex: none; }
.overlay-head h2 { flex: 1; display: flex; align-items: center; padding: 10px 16px; font-size: 14px; font-weight: 600; letter-spacing: 0.14em; }
.overlay-head .btn { flex: none; border-width: 0 0 0 1px; padding: 10px 14px; }
.overlay-head .check { margin: 0; padding: 0 14px; border-left: 1px solid var(--hairline); }
.overlay-body { flex: 1; min-height: 0; overflow: auto; padding: 20px 24px; display: flex; flex-direction: column; }
.overlay-status { flex: none; padding: 6px 16px; min-height: 2.2em; border-top: 1px solid var(--hairline); font-family: 'IBM Plex Sans', system-ui, sans-serif; font-size: 12.5px; }

/* ── Datu tabula ───────────────────────────────────────── */
.data-title { font-size: clamp(14px, 1.6vw, 22px); font-weight: 600; margin-bottom: 6px; }
.data-settings { font-family: 'IBM Plex Sans', system-ui, sans-serif; font-size: clamp(12px, 1.1vw, 16px); color: var(--ink-dim); margin-bottom: 18px; }
table.data { border-collapse: collapse; font-variant-numeric: tabular-nums; font-size: clamp(18px, 2.4vw, 36px); }
table.data th { font-size: 0.5em; font-weight: 500; letter-spacing: 0.04em; text-align: right; padding: 0.4em 0.9em; border-bottom: 1px solid var(--ink); white-space: nowrap; }
table.data td { text-align: right; padding: 0.15em 0.9em; border-bottom: 1px solid var(--hairline); }
table.data.compact { font-size: 12px; }
table.data.compact th { font-size: 10px; padding: 3px 6px; }
table.data.compact td { padding: 2px 6px; }
.compact-wrap { max-height: 220px; overflow: auto; margin-top: 8px; }

/* ── Stroboskops ──────────────────────────────────────── */
.strobe-view { position: relative; flex: 1; min-height: 0; background: var(--field); touch-action: none; margin: -20px -24px; }
.strobe-view canvas { position: absolute; inset: 0; width: 100%; height: 100%; cursor: grab; }
.strobe-view canvas:active { cursor: grabbing; }
```

- [ ] **Step 3: Write `rolling-ball.html`**

```html
<!DOCTYPE html>
<html lang="lv" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Lodīte renītē — FIZ-SIM</title>
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
<script type="module" src="assets/rolling-ball/main.js"></script>
</head>
<body>
<div class="frame">
  <header>
    <a class="back" href="index.html" data-i18n="page.back">← SARAKSTS</a>
    <h1><span data-i18n="page.heading">LODĪTE RENĪTĒ</span> <span class="sheet-no">K-01</span></h1>
  </header>
  <div class="work">
    <div class="drawing" id="drawing">
      <canvas id="scene" role="img" data-i18n-aria="scene.aria"></canvas>
      <div class="handles" id="handles"></div>
      <div class="notices" id="notices" role="status" aria-live="polite"></div>
    </div>
    <aside class="controls" id="controls">
      <section class="block" id="blockLevel"></section>
      <section class="block" id="blockBall"></section>
      <section class="block" id="blockDims"></section>
      <section class="block" id="blockRun"></section>
      <section class="block" id="blockResults"></section>
      <div class="titleblock" id="titleblock"></div>
    </aside>
  </div>
</div>
</body>
</html>
```

- [ ] **Step 4: Write the first `assets/rolling-ball/main.js`**

```js
import { createI18n, createTheme, mountTitleBlock, setupCanvas } from '../sim-core.js';
import { STRINGS } from './i18n.js';

const i18n = createI18n(STRINGS);
const theme = createTheme();
mountTitleBlock(document.getElementById('titleblock'), { i18n, theme, sheet: 'K-01', topicKey: 'tb.topicValue' });
i18n.apply();

const canvas = document.getElementById('scene');
const view = setupCanvas(canvas, () => redraw());

function redraw() {
  const { w, h } = view.size();
  view.ctx.fillStyle = theme.colors().field;
  view.ctx.fillRect(0, 0, w, h);
}

theme.onChange(redraw);
redraw();
```

- [ ] **Step 5: Verify in the browser**

Serve the repo (see “How to verify in a browser”). Open `http://localhost:8765/rolling-ball.html` at 1280×800:
- no console errors;
- frame with scale ticks, header “← SARAKSTS | LODĪTE RENĪTĒ … K-01”, empty drawing area with the `--field` colour, right panel with the title block at the bottom (KOMPLEKTS FIZ-SIM, LAPA K-01, TĒMA KINEMĀTIKA, VALODA / TĒMA);
- clicking EN switches the header to “BALL IN A GROOVE”, “← INDEX”, the title block labels, and `document.title`; LV switches back; reloading keeps the choice;
- ◐ switches light/dark; the drawing area repaints in the other `--field` colour; reload keeps it;
- in DevTools-less check: `browser_evaluate` `() => { localStorage.clear(); return 1 }`, reload, still no errors.
- 390×844: drawing on top, panel below, title block as one row of four cells.

Screenshots: `k01-task9-desktop-dark.png`, `k01-task9-desktop-light.png`, `k01-task9-phone.png`. Look at them; compare with `design.html` opened at the same size — the frame, header and title block must look the same.

- [ ] **Step 6: Run the unit tests and commit**

Run: `npm test` (all still pass)

```bash
git add assets/sim-core.js assets/sim-common.css rolling-ball.html assets/rolling-ball/main.js
git commit -m "Add shared drawing-sheet frame (sim-core, sim-common.css) and K-01 skeleton"
```

---

### Task 10: The drawing — scene layout and rendering

**Files:**
- Create: `assets/rolling-ball/scene.js`
- Modify: `assets/rolling-ball/main.js`
- Test: `tests/scene.test.js`

**Interfaces:**
- Consumes: `derive`, settings (Task 3); `formatNumber` (Task 1); `theme.colors()`, `i18n.t` (Task 9).
- Produces:
  - `MARGIN = { left: 70, right: 40, top: 96, bottom: 70 }`, `GROOVE_PX = 6`, `DIM_GAP = 26`, `ARC_R = 110` (px).
  - `sceneLayout(width, height, geo, fit = geo) → lay` where `geo`/`fit` are `{ L, alphaRad }`. `fit` sets the scale (it is frozen while the student drags). `lay = { s, width, height, tableY, high, low, dir, up, at(x), along(px, py) }`:
    - `s` = px per cm = `min(60, (width − left − right) / (fit.L · cos fit.α), (height − top − bottom) / max(fit.L · sin fit.α, 1))`;
    - `low = { x: MARGIN.left + geo.L·cos α·s, y: height − MARGIN.bottom }` (the groove’s top line at the lower end), `high = { x: MARGIN.left, y: low.y − geo.L·sin α·s }`; `tableY = low.y + GROOVE_PX` where `GROOVE_PX = 6` is the drawn groove thickness;
    - `dir = { x: cos α, y: sin α }` (downhill, screen coordinates, y down); `up = { x: sin α, y: −cos α }` (unit normal away from the groove surface);
    - `at(x)` → screen point of tape coordinate x (cm from the upper end); `along(px, py)` → tape coordinate of the projection of a screen point onto the groove line.
  - `ballCenter(lay, x, rEff) → { x, y }` = `at(x) + up · rEff · s`.
  - `handleAnchors(lay, settings, derived) → { L, h, alpha, x0, gates: [] }` (screen points; see Step 3).
  - `valueFromPointer(kind, lay, p) → number` for kind `'L' | 'h' | 'alpha' | 'x0' | 'gate'` (cm or degrees, unclamped — the model clamps).
  - `drawScene(ctx, lay, m)` where `m = { settings, derived, colors, t, lang, ballX, ballAngle, stopwatchText, gateTexts, showTape }`.

- [ ] **Step 1: Write the failing test** `tests/scene.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sceneLayout, ballCenter, handleAnchors, valueFromPointer, MARGIN } from '../assets/rolling-ball/scene.js';
import { defaultSettings, derive, withAlpha, withLevel } from '../assets/rolling-ball/model.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b}`);

test('layout fits the groove into the width and anchors the low end on the right', () => {
  const s = defaultSettings();
  const d = derive(s);
  const lay = sceneLayout(800, 400, { L: s.L, alphaRad: d.alphaRad });
  close(lay.high.x, MARGIN.left, 1e-9);
  close(lay.low.x, 800 - MARGIN.right, 1e-6);
  close(lay.low.y, 400 - MARGIN.bottom, 1e-9);
  close(lay.low.y - lay.high.y, s.L * Math.sin(d.alphaRad) * lay.s, 1e-9);
});

test('at() and along() are inverse along the groove', () => {
  const d = derive(withAlpha(defaultSettings(), 12));
  const lay = sceneLayout(900, 500, { L: 80, alphaRad: d.alphaRad });
  for (const x of [0, 13.5, 40, 80]) {
    const p = lay.at(x);
    close(lay.along(p.x, p.y), x, 1e-9);
    const off = { x: p.x + lay.up.x * 30, y: p.y + lay.up.y * 30 };
    close(lay.along(off.x, off.y), x, 1e-9, 'normal offset is ignored');
  }
});

test('the scale is frozen by `fit` while dragging', () => {
  const lay80 = sceneLayout(800, 400, { L: 80, alphaRad: 0.04 });
  const drag = sceneLayout(800, 400, { L: 120, alphaRad: 0.04 }, { L: 80, alphaRad: 0.04 });
  assert.equal(drag.s, lay80.s);
});

test('scale is capped at 60 px/cm', () => {
  assert.equal(sceneLayout(4000, 3000, { L: 40, alphaRad: 0.05 }).s, 60);
});

test('pointer at each anchor gives back the current value', () => {
  const s = withLevel(withAlpha(defaultSettings(), 6), 2);
  const d = derive(s);
  const lay = sceneLayout(1000, 600, { L: s.L, alphaRad: d.alphaRad });
  const a = handleAnchors(lay, s, d);
  close(valueFromPointer('L', lay, a.L), s.L, 1e-6);
  close(valueFromPointer('h', lay, a.h), d.h, 1e-6);
  close(valueFromPointer('alpha', lay, a.alpha), d.alphaDeg, 1e-6);
  close(valueFromPointer('x0', lay, a.x0), s.x0, 1e-6);
  a.gates.forEach((p, i) => close(valueFromPointer('gate', lay, p), s.gates[i], 1e-6));
});

test('ball centre sits r_eff above the groove line', () => {
  const s = defaultSettings();
  const d = derive(s);
  const lay = sceneLayout(800, 400, { L: s.L, alphaRad: d.alphaRad });
  const c = ballCenter(lay, 10, d.rEff);
  const p = lay.at(10);
  close(Math.hypot(c.x - p.x, c.y - p.y), d.rEff * lay.s, 1e-9);
  assert.ok(c.y < p.y);
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npm test`
Expected: FAIL — cannot find `scene.js`.

- [ ] **Step 3: Implement the pure part of `assets/rolling-ball/scene.js`**

```js
import { formatNumber } from '../measure/format.js';

export const MARGIN = { left: 70, right: 40, top: 96, bottom: 70 };
export const GROOVE_PX = 6; // renītes biezums zīmējumā
export const DIM_GAP = 26; // px starp objektu un izmēru līniju
export const ARC_R = 110; // px — α loka rādiuss

export function sceneLayout(width, height, geo, fit = geo) {
  const availW = Math.max(50, width - MARGIN.left - MARGIN.right);
  const availH = Math.max(50, height - MARGIN.top - MARGIN.bottom);
  const s = Math.min(60, availW / (fit.L * Math.cos(fit.alphaRad)), availH / Math.max(fit.L * Math.sin(fit.alphaRad), 1));
  const cos = Math.cos(geo.alphaRad);
  const sin = Math.sin(geo.alphaRad);
  const low = { x: MARGIN.left + geo.L * cos * s, y: height - MARGIN.bottom };
  const high = { x: MARGIN.left, y: low.y - geo.L * sin * s };
  const dir = { x: cos, y: sin };
  const up = { x: sin, y: -cos };
  return {
    s, width, height, high, low, dir, up,
    tableY: low.y + GROOVE_PX,
    at: (x) => ({ x: high.x + dir.x * x * s, y: high.y + dir.y * x * s }),
    along: (px, py) => ((px - high.x) * dir.x + (py - high.y) * dir.y) / s,
  };
}

export function ballCenter(lay, x, rEff) {
  const p = lay.at(x);
  return { x: p.x + lay.up.x * rEff * lay.s, y: p.y + lay.up.y * rEff * lay.s };
}

// Izmēru līnija L ir paralēla renītei, virs lielākās lodītes (Ø 4 cm) augstuma.
function dimOffsetL(lay) {
  return 4 * lay.s + DIM_GAP;
}

export function handleAnchors(lay, settings, derived) {
  const off = dimOffsetL(lay);
  const endL = lay.at(settings.L);
  const arcAngle = Math.PI + derived.alphaRad;
  return {
    L: { x: endL.x + lay.up.x * off, y: endL.y + lay.up.y * off },
    h: { x: lay.high.x - DIM_GAP, y: lay.high.y },
    alpha: { x: lay.low.x + ARC_R * Math.cos(arcAngle), y: lay.low.y + ARC_R * Math.sin(arcAngle) },
    x0: ballCenter(lay, settings.x0, derived.rEff),
    gates: settings.gates.map((x) => {
      const p = lay.at(x);
      return { x: p.x - lay.up.x * 30, y: p.y - lay.up.y * 30 };
    }),
  };
}

export function valueFromPointer(kind, lay, p) {
  switch (kind) {
    case 'h':
      return (lay.low.y - p.y) / lay.s;
    case 'alpha':
      return (Math.atan2(lay.low.y - p.y, lay.low.x - p.x) * 180) / Math.PI;
    default: // 'L', 'x0', 'gate' — projekcija uz renītes līniju
      return lay.along(p.x, p.y);
  }
}
```

Note for `L`: the anchor is offset along `up`, and `along()` ignores the normal component, so the projection returns L.

- [ ] **Step 4: Run to see it pass**

Run: `npm test`
Expected: all pass.

- [ ] **Step 5: Implement `drawScene(ctx, lay, m)`** in `scene.js`

Drawing rules (all colours from `m.colors`; 1 px lines; fonts `'500 12px "IBM Plex Mono", ui-monospace, monospace'` for values, `'400 10px "IBM Plex Mono", ui-monospace, monospace'` with letter-spaced capitals for labels; canvas text uses `m.t(...)` strings):

1. Fill the whole canvas with `colors.field`. Draw a faint 24 px grid (`colors.hairline`, `globalAlpha 0.35`) as in `design.html` `drawScene`.
2. **Table:** horizontal line at `lay.tableY` from `MARGIN.left − 40` to `width − 12` in `colors.ink`; below it short 45° hatch strokes every 8 px, 8 px long, in `colors.hairline` (ground symbol).
3. **Support:** rectangle under the high end, from `tableY` up to the groove bottom at the high end (`lay.high.y + GROOVE_PX`), 18 px wide centred on `lay.high.x + 9`; outline `colors.ink`, filled with 45° hatching in `colors.hairline` (section hatch). If its height is < 2 px draw nothing.
4. **Groove:** the quadrilateral from `lay.at(0)` to `lay.at(L)` and `GROOVE_PX` below it (offset by `−up · GROOVE_PX`), fill `colors.sheet`, outline `colors.ink`. At the lower end a small end stop: a 3 px × (ball Ø + 4 px) rectangle standing on the groove at `x = L`.
5. **Tape** (only if `m.showTape`): ticks on the groove’s side face starting at the top line and going down (along `−up`): every cm 3 px, every 5 cm 5 px, every 10 cm `GROOVE_PX` px; mm ticks (1.5 px) only when `lay.s ≥ 30`. Numbers under the groove, rotated by α (`ctx.rotate(alphaRad)` around the label point), at the smallest spacing from `[5, 10, 20, 50]` cm whose screen length is ≥ 32 px; colour `colors.inkDim`, 10 px font. Always write `t('scene.origin')` (“x = 0”) under the tape at x = 0.
6. **Dimension line L:** parallel to the groove at distance `dimOffsetL(lay)` on the `up` side, from `x = 0` to `x = L`; thin extension lines from each groove end to 4 px past the dimension line; 45° tick marks (6 px) at both ends (architectural ticks, like the design’s dimension lines). Colour `colors.ink`. The value label is **not** drawn on canvas (the DOM handle label does it).
7. **Dimension line h:** vertical at `x = high.x − DIM_GAP` from `y = low.y` to `y = high.y`; extension line from the high end to 4 px past the dimension line; a dashed (`[4, 4]`) hairline at `y = low.y` from `high.x − DIM_GAP − 4` to `low.x` (the reference level of the lower end); ticks at both ends. When `settings.angleMode === 'alpha'` draw it in `colors.inkDim` (derived).
8. **Angle α:** arc centred at `lay.low`, radius `ARC_R`, from angle π to π + α (`ctx.arc(low.x, low.y, ARC_R, Math.PI, Math.PI + alphaRad)`), plus a short horizontal reference line from `low.x − ARC_R − 8` to `low.x`. `colors.inkDim` when `angleMode === 'h'`, else `colors.ink`.
9. **Level 1:** a short flag at `x0` and at `xf`: a 22 px line along `up` from the groove top, with the label `t('scene.start')` / `t('scene.finish')` written below the tape (10 px, `colors.inkDim`). Stopwatch box in the top-right corner of the drawing: 1 px `colors.ink` rectangle 150×56 px at `(width − 170, 20)`, caption `t('scene.stopwatch')` (10 px, `inkDim`) and `m.stopwatchText` (26 px, weight 500, tabular) — `m.stopwatchText` is always a string on level 1 (`'0,00 s'` before any run).
10. **Level 2:** at each gate x: photogate (`timer === 'gate'`) = a line along `up` from `−GROOVE_PX` to `(2r + 0.8 cm)·s` above the groove top with a 6×6 px square at its top; stopwatch mark (`'hand'`) = a 16 px line along `up` with a small triangular flag. Gate number (1…n) next to the top in `colors.inkDim`. If `m.gateTexts[i]` is a string, write it above the gate (12 px, weight 500).
11. **Ball:** at `ballCenter(lay, m.ballX, derived.rEff)`, radius `max(3, r · s)`. Solid ball: fill `colors.mat[ball.material]`, stroke `colors.ink`. Hollow ball: fill `colors.field`, stroke `colors.ink`, plus an inner circle at 0.85 r in `colors.mat.celluloid` stroke. Rolling mark: a line from the centre to 0.8 r at angle `m.ballAngle` in `colors.ink` (so the ball visibly rolls).

Keep `drawScene` split into small helper functions (`drawTable`, `drawSupport`, `drawGroove`, `drawTape`, `drawDimL`, `drawDimH`, `drawAngle`, `drawLevel1`, `drawLevel2`, `drawBall`) inside `scene.js`.

- [ ] **Step 6: Update `assets/rolling-ball/main.js`** to hold state and draw the scene

Replace the file with:

```js
import { createI18n, createTheme, mountTitleBlock, setupCanvas } from '../sim-core.js';
import { STRINGS } from './i18n.js';
import { defaultSettings, derive } from './model.js';
import { sceneLayout, drawScene } from './scene.js';
import { formatNumber } from '../measure/format.js';

const i18n = createI18n(STRINGS);
const theme = createTheme();
mountTitleBlock(document.getElementById('titleblock'), { i18n, theme, sheet: 'K-01', topicKey: 'tb.topicValue' });
i18n.apply();

const state = {
  settings: defaultSettings(),
  drag: null, // { id, fit: { L, alphaRad } } — mērogs velkot nemainās
  ball: { x: null, angle: 0 }, // null → lodīte stāv kustības sākumpunktā
};

const canvas = document.getElementById('scene');
const view = setupCanvas(canvas, () => render());

function layout() {
  const { w, h } = view.size();
  const d = derive(state.settings);
  const geo = { L: state.settings.L, alphaRad: d.alphaRad };
  return sceneLayout(w, h, geo, state.drag ? state.drag.fit : geo);
}

function render() {
  const s = state.settings;
  const d = derive(s);
  const lang = i18n.lang();
  drawScene(view.ctx, layout(), {
    settings: s,
    derived: d,
    colors: theme.colors(),
    t: i18n.t,
    lang,
    ballX: state.ball.x ?? s.x0,
    ballAngle: state.ball.angle,
    stopwatchText: `${formatNumber(0, 2, lang)} s`,
    gateTexts: s.gates.map(() => null),
    showTape: s.tape,
  });
}

theme.onChange(render);
i18n.onChange(render);
document.fonts.ready.then(render);

// Testu āķis pārlūka pārbaudēm (Playwright): nolasīt stāvokli un mainīt iestatījumus.
window.__rb = {
  get state() {
    return state;
  },
  setSettings(next) {
    state.settings = next;
    render();
  },
};
render();
```

- [ ] **Step 7: Verify in the browser**

Open the page at 1280×800. Check: no console errors; table with hatching, hatched support at the left under the raised end, groove, tape ticks with numbers 0…80 every 10 cm (or 5), “x = 0”, L dimension line above the groove, h dimension at the left with the dashed reference line, α arc at the lower end (dim), the steel ball at x = 0 sitting on the groove.

Then, with `browser_evaluate`, import the model and set other states, taking a screenshot of each (the dynamic import works because the page is served over http):

```js
async () => {
  const m = await import('/assets/rolling-ball/model.js');
  const s = m.withLevel(m.withAlpha(m.withL(m.defaultSettings(), 150), 12), 2);
  window.__rb.setSettings(m.withBall(m.withProfile(s, 'flat'), 'pingpong40'));
  return 'ok';
}
```

Screenshots: default (level 3), level 1 (`withLevel(defaultSettings(), 1)` — flags and the stopwatch box), level 2 with L = 150 and α = 12° (gates visible), light theme, phone portrait 390×844. Look at each: nothing drawn outside the canvas, labels not overlapping the groove, the ball on the line.

- [ ] **Step 8: Commit**

```bash
git add assets/rolling-ball/scene.js assets/rolling-ball/main.js tests/scene.test.js
git commit -m "Add K-01 side-view drawing: groove, support, tape, dimension lines"
```

---

### Task 11: Controls — panel, draggable dimension lines, URL settings, notices

**Files:**
- Create: `assets/rolling-ball/panel.js`, `assets/rolling-ball/handles.js`, `assets/measure/notices.js`
- Modify: `assets/rolling-ball/main.js`

**Interfaces:**
- Consumes: model `with*` functions, `derive`, `DT_OPTIONS`, `GATE_MIN`, `GATE_MAX`, `STEP`, `L_MIN`, `L_MAX`, `ALPHA_MAX`, `hMax`, `x0Max` (Task 3); `BALLS`, `ballFits`, `ballMass`, `GROOVE_W` (Task 2); `settingsFromURL`, `warningText` (Task 7); `sceneLayout`, `handleAnchors`, `valueFromPointer` (Task 10).
- Produces:
  - `createNotices(el, { closeLabel }) → { show(id, textFn), clear(id), refresh() }` — `textFn` is a function returning the current text (so notices follow language changes); `show` with an existing id replaces its text; each notice has a close button with `aria-label = closeLabel()`.
  - `createHandles(layer, { onChange, onDragStart, onDragEnd, labels }) → { update(items), setSelected(id) }` where `items` are `{ id, kind: 'diamond'|'ball'|'none', x, y, labelText, labelX, labelY, labelAnchor: 'center'|'left'|'right', labelClass: ''|'derived'|'locked', ariaLabel, min, max, step, value, valueText }`. Elements are **reused by id** across updates (pointer capture must survive re-renders). `onChange(id, change)` where `change` is `{ pointer: { x, y } }` (canvas-local px), `{ delta: number }` or `{ set: number }`. `labels = { decrease: () => string, increase: () => string }` for the mini ± buttons.
  - `createPanel(root, { t, onAction }) → { render(vm) }` — renders `#blockLevel`, `#blockBall`, `#blockDims`, `#blockRun`, `#blockResults` (`#blockResults` gets its full content in Task 12; here it shows the title and `results.none`). Actions (`onAction(type, value)`): `'level'` 1|2|3, `'timer'` 'gate'|'hand', `'gateCount'` ±1, `'dt'` number, `'slow'` bool, `'ball'` id, `'profile'` 'groove'|'flat', `'angleMode'` 'h'|'alpha', `'tape'` bool, `'run'`.

- [ ] **Step 1: Implement `assets/measure/notices.js`**

```js
export function createNotices(el, { closeLabel }) {
  const items = new Map(); // id → { node, textFn }
  function paint(id) {
    const it = items.get(id);
    it.node.querySelector('span').textContent = it.textFn();
    it.node.querySelector('button').setAttribute('aria-label', closeLabel());
  }
  return {
    show(id, textFn) {
      if (!items.has(id)) {
        const node = document.createElement('div');
        node.className = 'notice';
        node.innerHTML = '<span></span><button type="button">✕</button>';
        node.querySelector('button').addEventListener('click', () => this.clear(id));
        el.appendChild(node);
        items.set(id, { node, textFn });
      }
      items.get(id).textFn = textFn;
      paint(id);
    },
    clear(id) {
      const it = items.get(id);
      if (it) {
        it.node.remove();
        items.delete(id);
      }
    },
    refresh() {
      for (const id of items.keys()) paint(id);
    },
  };
}
```

- [ ] **Step 2: Implement `assets/rolling-ball/handles.js`**

Requirements (write the code to satisfy all of them):

1. For each item `kind !== 'none'` there is one `<button type="button" class="handle">` (`class="handle ball"` for `'ball'`) with `role="slider"`, `aria-label`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`, positioned with `style.transform = translate(${x}px, ${y}px)`. For every item there is one `<span class="handle-label">` positioned at `(labelX, labelY)`: `labelAnchor 'center'` → `translate(-50%, -50%)`, `'left'` → `translate(0, -50%)`, `'right'` → `translate(-100%, -50%)` appended after the position translate. The label contains a `−` mini button, a `<span class="txt">`, and a `+` mini button (both `class="mini"`, `aria-label` from `labels.decrease()` / `labels.increase()`; hidden unless the label has class `selected`). Items with `labelClass` `'derived'` or `'locked'` have no mini buttons.
2. `update(items)` creates missing elements, updates existing ones (position, texts, aria, classes), and removes elements whose id disappeared. Never recreate an element that still exists.
3. Pointer: `pointerdown` on a handle → `setPointerCapture`, add class `dragging`, call `onDragStart(id)`, `setSelected(id)`; `pointermove` while captured → `onChange(id, { pointer: { x, y } })` with coordinates relative to `layer.getBoundingClientRect()`; `pointerup`/`pointercancel` → remove `dragging`, `onDragEnd(id)`.
4. Keyboard on a handle: ArrowRight/ArrowUp → `{ delta: +step }`, ArrowLeft/ArrowDown → `{ delta: −step }`, PageUp/PageDown → `{ delta: ±10·step }`, Home → `{ set: min }`, End → `{ set: max }`; `preventDefault()` for these keys. Focus on a handle → `setSelected(id)`.
5. Mini buttons → `onChange(id, { delta: ∓step })`.
6. `setSelected(id)` puts class `selected` on that item’s label only.

- [ ] **Step 3: Implement `assets/rolling-ball/panel.js`**

`createPanel(root, { t, onAction })` returns `render(vm)` where

```js
vm = {
  settings, derived, locked /* Set */, running /* bool */, lang,
  hasTableForSettings /* bool */,
}
```

`render` rebuilds the inner HTML of the five blocks (it is cheap) and then restores focus: before rebuilding, remember `document.activeElement?.dataset.fid`; after rebuilding, focus the element with the same `data-fid`. Every interactive element gets a stable `data-fid`. Build the markup with `document.createElement` or template strings; always escape nothing user-supplied (all text comes from `t`). Contents:

- `#blockLevel`: `<div class="block-title">` `t('blk.level')` (+ `<span class="fix" title=t('dims.fixedTitle')>t('dims.fixed')</span>` if `locked.has('level')`); `.seg` with three `.btn` for levels (`aria-pressed`, `disabled` when level is locked and not current, or while running); `.hint` with `level.1.hint` / `level.2.hint.gate|hand` / `level.3.hint`.
  - Level 2: `.row` with `.row-label` `timer` seg (`timer.gate`, `timer.hand`; locked by `'timer'`), and a `.row` with `.row-label` `gates.count` (or `gates.countHand`) and a `.stepper` (− count +, disabled at `GATE_MIN`/`GATE_MAX`, when `'gates'` is locked, or while running) → `onAction('gateCount', ±1)`.
  - Level 3: `.row` with `.row-label` `dt.label` and a seg of `DT_OPTIONS` formatted `formatNumber(v, 1, lang) + ' s'` (locked by `'dt'`), and a `.check` “`slow`” checkbox → `onAction('slow', checked)`.
- `#blockBall`: title `blk.ball` (+FIKS. if `'ball'` locked); `<table class="spec">` with header `spec.pos`, `spec.name`, `spec.d` (class `num`), `spec.m` (class `num`); one row per `BALLS` entry: position number `i + 1`, `t('mat.' + material)`, `formatNumber(d · 10, 0)`, `formatNumber(ballMass, 1)`. `tbody` has `role="radiogroup"`, rows `role="radio"`, `tabindex="0"`, `aria-checked` for the current ball; a row whose ball does not fit the current profile gets `aria-disabled="true"` and `title = t('ball.noFit', { d, w: formatNumber(GROOVE_W · 10, 1) })`; rows are disabled too when `'ball'` is locked or running. Click / Enter / Space → `onAction('ball', id)` (also for disabled-by-fit rows, so main.js can explain why — see Step 4). Below: `.row` with a seg `profile.groove` / `profile.flat` (locked by `'profile'`); the groove button is disabled when the current ball does not fit the groove.
- `#blockDims`: title `blk.dims`; `.row` with `.row-label` `dims.setBy` and seg `h` / `α` (disabled if `'h'` or `'alpha'` is locked, or running) → `onAction('angleMode', …)`; readouts (`.readout`, keys in `.k`, values in `.v`, units in `.unit`) for L (0 decimals), h (1), α (1), x₀ (1) — the derived one of h/α gets `style="color: var(--ink-dim)"`, and every locked one gets a `.fix` tag; `.check` `tape` (locked by `'tape'`) → `onAction('tape', checked)`; `.hint` `dims.hint`.
- `#blockRun`: one `.btn.primary` full width: `run.running` while running (disabled), else `run.repeat` if `hasTableForSettings`, else `run.start` → `onAction('run')`.
- `#blockResults`: title `blk.results` and `.hint` `results.none` (Task 12 replaces this block’s content).

- [ ] **Step 4: Wire everything in `main.js`**

Add to `main.js` (keep Task 10 code; `render()` now also renders the panel and the handles):

1. Initial state from the link: `const url = settingsFromURL(location.search);` → `state.settings = url.settings`, and keep `locked`, `views`, `noise`, `traps`, `seed` in `state`. Show each `url.warnings[i]` with `notices.show('url' + i, () => warningText(w, { t: i18n.t, lang: i18n.lang() }))`.
2. `notices = createNotices(document.getElementById('notices'), { closeLabel: () => i18n.t('notice.close') })`; on `i18n.onChange` call `notices.refresh()` and `render()`.
3. `isLocked(kind)`: `'L'` → `locked.has('L')`; `'h'` → `locked.has('h')`; `'alpha'` → `locked.has('alpha')`; `'x0'` → `locked.has('x0')`; `'gate'` → `locked.has('gates')`.
4. Handle items built in `render()` from `handleAnchors(layout(), s, d)`:
   - `L`: diamond at `anchors.L`, label `L = 80 cm` centred 16 px further along `up`, min `L_MIN`, max `L_MAX`, step `STEP.L`.
   - `h`: if `angleMode === 'h'`: diamond at `anchors.h`, label `h = 3,0 cm` right-anchored 10 px left of the dimension line at its middle height; else `kind 'none'` with `labelClass 'derived'`. min 0, max `hMax(L)`, step `STEP.h`.
   - `alpha`: if `angleMode === 'alpha'`: diamond at `anchors.alpha`, else `kind 'none'` + `'derived'`; label `α = 2,1°` right-anchored at `(low.x − ARC_R − 14, low.y − 12)`; min 0, max `ALPHA_MAX`, step `STEP.alpha`.
   - `x0`: `kind 'ball'` at `anchors.x0`, label `x₀ = 0,0 cm` centred above the ball (`ballCenter − up·(r·s + 16)`); min 0, max `x0Max(L)`, step `STEP.x`.
   - Level 2 only: `gate0…gateN` diamonds at `anchors.gates[i]`, label `x = 14,0 cm` centred 18 px below the handle, `ariaLabel` from `dims.gate`/`dims.gateHand`.
   - A locked quantity gets `kind 'none'`, `labelClass 'locked'` and `labelText + ' ' + t('dims.fixed')`.
   - While `state.running` (Task 12), the `.drawing` element has class `running`.
5. `onChange(id, change)`: ignore when running or locked. Compute the new value: `pointer` → `valueFromPointer(kind, layout(), change.pointer)`; `delta` → current value + delta; `set` → value. Apply `withL`, `withH`, `withAlpha`, `withX0` or `withGate(s, i, v)`. If the result differs from the current settings, set it, reset `state.ball = { x: null, angle: 0 }`, call `render()`.
6. `onDragStart(id)`: `state.drag = { id, fit: { L: s.L, alphaRad: derive(s).alphaRad } }`. `onDragEnd`: `state.drag = null; render()`.
7. `onAction(type, value)`: map to `withLevel`, `withTimer`, `withGateCount(s, s.gates.length + value)`, `withDt`, `withSlow`, `withAngleMode`, `withTape`, `withProfile`, `withBall`; ignore when running or when the corresponding setting is locked (`level`, `timer`, `gates`, `dt`, `profile`, `ball`, `tape`; `angleMode` is blocked if `h` or `alpha` is locked). For `'ball'`: if `ballFits` is false for the current profile, show `notices.show('ballNoFit', () => t('ball.noFit', { d: formatNumber(ball.d * 10, 0, lang), w: formatNumber(GROOVE_W * 10, 1, lang) }))` and change nothing; otherwise clear `'ballNoFit'` and apply. `'run'` is wired in Task 12 (for now it does nothing).
8. `render()` = draw scene + `panel.render(vm)` + `handles.update(items)`.

- [ ] **Step 5: Verify in the browser**

At 1280×800, no console errors after each action. Check and screenshot:

1. Drag the L handle with `browser_drag` (or with `browser_evaluate` dispatching pointer events) — L changes in steps of 1 cm, the h value stays 3,0 cm, the α readout follows; the scale does not change during the drag and re-fits after release.
2. Focus the h handle (Tab) and press ArrowUp 5 times → h = 3,5 cm; the − and + mini buttons appear next to the label and work.
3. Switch SLĪPUMU IESTATA AR to α → the α handle appears on the arc, the h label turns dim; drag α.
4. Drag the ball → x₀ changes in 0,5 cm steps and stops at L − 15 cm.
5. Level 2: five gates, drag one past its neighbour → it stops 1 cm before it; + / − gate count re-spreads them.
6. Choose “tērauds Ø 10 mm” in the groove → the precise notice about the 11,4 mm gap appears, the ball does not change; switch to PLAKANA VIRSMA, then choose it → works; RENĪTE is now disabled.
7. Open `rolling-ball.html?L=80&h=30&ball=steel12&fbclid=x` → two notices (h and ball), none about fbclid; switch to EN → the notices are in English.
8. Open `rolling-ball.html?L=100&h=4&level=1&lock=1` → L, h and level show FIKS., their handles are gone, the level buttons 2 and 3 are disabled, h/α mode switch is disabled; x₀ is still draggable.
9. Phone portrait 390×844: handles are reachable and not clipped; the panel scrolls.

- [ ] **Step 6: Run the unit tests and commit**

Run: `npm test` (all pass)

```bash
git add assets/rolling-ball/panel.js assets/rolling-ball/handles.js assets/measure/notices.js assets/rolling-ball/main.js
git commit -m "Add K-01 controls: draggable dimension lines, panel, URL lock, notices"
```

---

### Task 12: Running the experiment, results block, full-screen data table

**Files:**
- Create: `assets/measure/overlay.js`, `assets/measure/data-table-view.js`
- Modify: `assets/rolling-ball/main.js`, `assets/rolling-ball/panel.js`

**Interfaces:**
- Consumes: `simulateRun` (Task 6); `createResults`, `tableModel` (Task 8); `toTSV`, `toCSV`, `copyText`, `downloadText` (Task 8); `startLoop` (Task 9); `settingsKey` (Task 3).
- Produces:
  - `openOverlay({ title, closeLabel, buttons: [{ label, onClick, primary? }], extraHead?: HTMLElement[], onClose }) → { root, body, status(text), close() }` — full-screen `role="dialog" aria-modal="true"` layer inside a `.frame`; Esc and the close button close it; focus goes to the close button on open and back to the previously focused element on close.
  - `renderTable(model, lang, { compact = false } = {}) → HTMLTableElement`.
  - `openDataTable(model, { lang, labels: { heading, copy, csv, close, copied, copyFailed }, onClose }) → { close() }`.
  - `panel.render(vm)` gains `vm.results = { tables: [{ key, label }], shownKey, shownIsOther: bool, otherText, compactModel|null, canTable: bool, canStrobe: bool }` and actions `'selectTable'` key, `'openTable'`, `'openStrobe'`.

- [ ] **Step 1: Implement `overlay.js` and `data-table-view.js`** per the Interfaces. The data table body contains `<div class="data-title">` (model.title), `<div class="data-settings">` (model.settingsLine) and `renderTable(model, lang)`. Buttons: COPY → `copyText(toTSV(model, lang))` → `status(labels.copied)` or `status(labels.copyFailed)`; CSV → `downloadText(model.filename + '.csv', toCSV(model, lang), 'text/csv;charset=utf-8', { bom: true })`. `renderTable` formats each cell with `formatNumber(v, column.decimals, lang)`, puts labels in `<th scope="col">`, and adds class `compact` when asked.

- [ ] **Step 2: Run flow in `main.js`**

```js
function currentKey() {
  return settingsKey(state.settings, { noise: state.noise, traps: state.traps });
}

function startRun() {
  if (state.running) return;
  const key = currentKey();
  const run = simulateRun(state.settings, { seed: state.seed, repeat: state.results.nextRepeat(key), noise: state.noise, traps: state.traps });
  if (!run.rolls) {
    notices.show('noRoll', () => i18n.t('notice.noRoll', { h: formatNumber(run.hMin, 1, i18n.lang()) }));
    return;
  }
  notices.clear('noRoll');
  state.running = { run, simT: 0 };
  state.shownKey = null;
  stopLoop = startLoop(step);
  render();
}

function step(dt) {
  const r = state.running;
  const slow = state.settings.slow && state.settings.level === 3 ? 0.25 : 1;
  r.simT = Math.min(r.run.tEnd, r.simT + dt * slow);
  state.ball = { x: r.run.xAt(r.simT), angle: (r.run.xAt(r.simT) - r.run.x0) / derive(state.settings).r };
  if (r.simT >= r.run.tEnd) finishRun();
  render();
}

function finishRun() {
  stopLoop();
  state.results.add(state.settings, state.running.run, { seed: state.seed, noise: state.noise, traps: state.traps });
  state.lastRun = state.running.run;
  state.running = null;
}
```

Add `results: createResults()`, `running: null`, `lastRun: null`, `shownKey: null` to `state`; `'run'` action → `startRun()`. Any settings change (handles or panel) sets `state.lastRun = null`, `state.shownKey = null` and puts the ball back at x₀.

Displays passed to `drawScene`:
- `stopwatchText` (level 1): running → `simT < timeTo(xf)` ? `simT` : `run.level1.t`; after a run of the current settings (`state.lastRun`) → `lastRun.level1.t`; otherwise 0. Format `formatNumber(v, 2, lang) + ' s'`.
- `gateTexts[i]` (level 2): the measured `t` of gate i (3 decimals for photogates, 2 for stopwatches, + `' s'`) once `simT ≥ run.timeTo(gate x)` during a run, or from `state.lastRun` after it; otherwise `null`.

- [ ] **Step 3: Results block**

In `render()` build `vm.results`: the shown table is `state.shownKey ?? currentKey()`; list all tables as options `t('results.option', { n: index, m: runs.length })`; `shownIsOther` when the shown key ≠ current key (`otherText = t('results.other', { n })`); `compactModel = tableModel(shownTable, { t, lang })` or `null`; `canTable = views.table && shownTable exists`; `canStrobe = views.strobe && shownTable exists && shownTable.level === 3`. `panel.js` renders: title; if no table → `.hint` `results.none`; else a `<select class="select">` (only when there is more than one table) → `'selectTable'`, the `.hint` with `otherText` when applicable, `.compact-wrap` with `renderTable(compactModel, lang, { compact: true })`, and a `.btn-row` with DATU TABULA (`results.table`, only if `canTable`) and STROBOSKOPS (`results.strobe`, only if `canStrobe`; wired in Task 13).

`'openTable'` → `openDataTable(tableModel(shown, …), { lang, labels: { heading: t('results.table'), copy: t('data.copy'), csv: t('data.csv'), close: t('data.close'), copied: t('data.copied'), copyFailed: t('data.copyFailed') } })`. Keep the handle of the open overlay in `state.overlay = { kind: 'table', key, close }`; on language change close and reopen it.

- [ ] **Step 4: Verify in the browser**

1. Default (level 3): PALAIST → the ball rolls ~2,9 s and stops at the end; the panel shows “1. tabula · mērījumi: 1” and a compact table t / x₁; the button now says ↻ ATKĀRTOT; two more repeats → columns x₁ x₂ x₃ with slightly different numbers.
2. DATU TABULA → full-screen table with large digits, title, settings line with the seed, columns `t, s | x₁, cm (±0,5 cm) …`. KOPĒT → status “Nokopēts…” (on http://localhost the clipboard API may be blocked → the precise fallback text must appear instead; both are acceptable, a thrown error is not). LEJUPIELĀDĒT CSV → a download named `lodite-tabula-1.csv` (check with `browser_network_requests` or the download event; open the file text: first bytes are the BOM, separator `;`, decimal comma). Esc closes.
3. Change h to 5,0 cm, run once → table 2; change back to 3,0 cm → the panel shows table 1 again with 3 runs; run → x₄ appears (Review Focus 2).
4. Level 1: the stopwatch counts during the roll and then shows the measured time; the table has t₁ t₂ … columns. Level 2: gate times appear as the ball passes each gate.
5. h = 0,1 cm → PALAIST shows “Lodīte neripo … h ≥ 0,2 cm” and no table is created (Review Focus 3).
6. Level 3 with PALĒNINĀT ×0,25 → the ball rolls four times slower; the data are the same as without slow motion for the same repeat (compare with `browser_evaluate` on `window.__rb.state.results`).
7. During a run, hide the tab for 3 s (`browser_evaluate(() => new Promise(r => setTimeout(r, 3000)))` while on another tab via `browser_tabs`) and return → the ball continues from where it was, no jump (Review Focus 4).
8. `?view=strobe&lock=1` → after a run there is no DATU TABULA button.

- [ ] **Step 5: Run the unit tests and commit**

Run: `npm test` (all pass)

```bash
git add assets/measure/overlay.js assets/measure/data-table-view.js assets/rolling-ball/main.js assets/rolling-ball/panel.js
git commit -m "Run the K-01 experiment and show results in a full-screen data table"
```

---

### Task 13: Strobe view — zoom, pan, numbered positions, PNG export

**Files:**
- Create: `assets/measure/zoom-pan.js`, `assets/rolling-ball/strobe.js`
- Modify: `assets/rolling-ball/main.js`
- Test: `tests/zoom-pan.test.js`, `tests/strobe.test.js`

**Interfaces:**
- Consumes: `openOverlay` (Task 12), `downloadBlob` (Task 8), `derive` (Task 3), `tableModel` (Task 8) for the settings line, `theme.colors()`.
- Produces:
  - `zoom-pan.js`: `toScreen(tr, x, y) → { x, y }` with `X = tx + x·scale`, `Y = ty − y·scale` (world y up); `fitTransform(box, viewW, viewH, margin = 24) → tr`; `zoomAt(tr, factor, px, py, min = 0.5, max = 4000) → tr` (the world point under (px, py) stays put); `panBy(tr, dx, dy) → tr`; `attachZoomPan(el, { get, set, min, max }) → detach` (wheel with `passive: false`, one-pointer pan, two-pointer pinch).
  - `strobe.js`: `EXPORT_PX_PER_CM = 60`, `EXPORT_MIN_PX_PER_CM = 50`, `EXPORT_MAX_SIDE = 16000`, `EXPORT_MAX_AREA = 16000000`; `strobeWorldBox(settings, derived) → { x0, x1, y0, y1 }` in cm (`x0 = −3`, `x1 = L + 3`, `y0 = −3` (tape band), `y1 = 2r + 2`); `labelPositions(xs, labelW, gap = 4) → number[]`; `exportSize(box, captionPx = 120, marginPx = 40) → { scale, w, h } | null`; `drawStrobe(ctx, { run, settings, derived, tr, width, height, colors, showTape, captionLines, fontScale })`; `renderStrobePNG(opts) → Promise<Blob | null>`; `openStrobe({ table, runIndex, t, lang, colors, tape, tapeLocked, onTapeChange, onExportFailed, onClose }) → { close() }`.

- [ ] **Step 1: Write the failing tests**

`tests/zoom-pan.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toScreen, fitTransform, zoomAt, panBy } from '../assets/measure/zoom-pan.js';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);

test('fitTransform centres the box and keeps the aspect ratio', () => {
  const box = { x0: -3, x1: 83, y0: -3, y1: 5 };
  const tr = fitTransform(box, 1000, 400, 20);
  const a = toScreen(tr, box.x0, box.y1);
  const b = toScreen(tr, box.x1, box.y0);
  close(a.x, 1000 - b.x);
  close(a.y, 400 - b.y);
  close(tr.scale, Math.min(960 / 86, 360 / 8));
});

test('zoomAt keeps the world point under the cursor', () => {
  const tr = { scale: 10, tx: 50, ty: 300 };
  const before = { x: (400 - tr.tx) / tr.scale, y: (tr.ty - 120) / tr.scale };
  const z = zoomAt(tr, 2.5, 400, 120);
  const p = toScreen(z, before.x, before.y);
  close(p.x, 400);
  close(p.y, 120);
  close(z.scale, 25);
});

test('zoomAt clamps the scale', () => {
  assert.equal(zoomAt({ scale: 10, tx: 0, ty: 0 }, 1e6, 0, 0, 0.5, 4000).scale, 4000);
  assert.equal(zoomAt({ scale: 10, tx: 0, ty: 0 }, 1e-6, 0, 0, 0.5, 4000).scale, 0.5);
});

test('panBy moves the view', () => {
  assert.deepEqual(panBy({ scale: 3, tx: 1, ty: 2 }, 10, -5), { scale: 3, tx: 11, ty: -3 });
});
```

`tests/strobe.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { labelPositions, strobeWorldBox, exportSize, EXPORT_PX_PER_CM, EXPORT_MAX_SIDE, EXPORT_MAX_AREA } from '../assets/rolling-ball/strobe.js';
import { defaultSettings, derive, withL } from '../assets/rolling-ball/model.js';

test('labels never overlap, never sit left of their ball, and stay put when there is room', () => {
  const xs = [100, 101, 103, 107, 113, 121, 131, 300, 400];
  const out = labelPositions(xs, 20, 4);
  out.forEach((x, i) => {
    assert.ok(x >= xs[i]);
    if (i > 0) assert.ok(x - out[i - 1] >= 24 - 1e-9);
  });
  assert.equal(out[7], 300);
  assert.equal(out[8], 400);
});

test('world box covers the groove, the tape and the largest ball', () => {
  const s = defaultSettings();
  const box = strobeWorldBox(s, derive(s));
  assert.deepEqual(box, { x0: -3, x1: 83, y0: -3, y1: 1.6 + 2 });
});

test('export resolution is ≥ 5 px per mm and within device limits (spec 12.13)', () => {
  for (const L of [40, 80, 200]) {
    const s = withL(defaultSettings(), L);
    const size = exportSize(strobeWorldBox(s, derive(s)));
    assert.ok(size.scale >= 50, `L ${L}: ${size.scale}`);
    assert.ok(size.w <= EXPORT_MAX_SIDE && size.w * size.h <= EXPORT_MAX_AREA, `L ${L}`);
  }
  const s = defaultSettings();
  assert.equal(exportSize(strobeWorldBox(s, derive(s))).scale, EXPORT_PX_PER_CM);
});

test('a box that cannot be exported at ≥ 5 px/mm returns null', () => {
  assert.equal(exportSize({ x0: 0, x1: 400, y0: 0, y1: 10 }), null);
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npm test`
Expected: FAIL — cannot find `zoom-pan.js` / `strobe.js`.

- [ ] **Step 3: Implement the pure functions**

```js
// zoom-pan.js (pure part)
export function toScreen(tr, x, y) {
  return { x: tr.tx + x * tr.scale, y: tr.ty - y * tr.scale };
}

export function fitTransform(box, viewW, viewH, margin = 24) {
  const w = box.x1 - box.x0;
  const h = box.y1 - box.y0;
  const scale = Math.min((viewW - 2 * margin) / w, (viewH - 2 * margin) / h);
  return { scale, tx: (viewW - w * scale) / 2 - box.x0 * scale, ty: (viewH + h * scale) / 2 + box.y0 * scale };
}

export function zoomAt(tr, factor, px, py, min = 0.5, max = 4000) {
  const scale = Math.min(max, Math.max(min, tr.scale * factor));
  const f = scale / tr.scale;
  return { scale, tx: px - (px - tr.tx) * f, ty: py - (py - tr.ty) * f };
}

export function panBy(tr, dx, dy) {
  return { ...tr, tx: tr.tx + dx, ty: tr.ty + dy };
}
```

```js
// strobe.js (pure part)
export const EXPORT_PX_PER_CM = 60; // 6 px uz mm (spec. 5.2: ≥ 5 px/mm)
export const EXPORT_MIN_PX_PER_CM = 50;
export const EXPORT_MAX_SIDE = 16000;
export const EXPORT_MAX_AREA = 16000000; // iOS Safari kanvas robeža ≈ 16,7 Mpx

export function strobeWorldBox(settings, derived) {
  return { x0: -3, x1: settings.L + 3, y0: -3, y1: 2 * derived.r + 2 };
}

// Numuru etiķetes vienā rindā: katra pēc iespējas virs savas lodītes, bet ne pa kreisi no tās
// un ne virsū iepriekšējai. Ja nobīdīta — zīmē tievu vadlīniju līdz lodītei.
export function labelPositions(xs, labelW, gap = 4) {
  const out = [];
  let right = -Infinity;
  for (const x of xs) {
    const cx = Math.max(x, right + gap + labelW / 2);
    out.push(cx);
    right = cx + labelW / 2;
  }
  return out;
}

export function exportSize(box, captionPx = 120, marginPx = 40) {
  const wCm = box.x1 - box.x0;
  const hCm = box.y1 - box.y0;
  for (let scale = EXPORT_PX_PER_CM; scale >= EXPORT_MIN_PX_PER_CM; scale -= 2) {
    const w = Math.ceil(wCm * scale + 2 * marginPx);
    const h = Math.ceil(hCm * scale + captionPx + 2 * marginPx + 60);
    if (w <= EXPORT_MAX_SIDE && w * h <= EXPORT_MAX_AREA) return { scale, w, h };
  }
  return null;
}
```

The `+ 60` px reserves the number-label row above the balls in the export.

Run `npm test` → all pass.

- [ ] **Step 4: Implement `drawStrobe`, `renderStrobePNG`, `openStrobe`, `attachZoomPan`**

`drawStrobe(ctx, o)` — world coordinates in cm, x along the tape (horizontal), y up; the groove top surface is y = 0:
1. Fill `o.width × o.height` with `colors.field`.
2. Groove side face: rectangle x ∈ [0, L], y ∈ [−1.8, 0], fill `colors.sheet`, stroke `colors.ink`; end stop at x = L (0.3 cm wide, up to y = 2r + 0.2).
3. Tape (if `showTape`) on the side face: ticks from y = 0 downward — every mm 0.25 cm long (only when `tr.scale ≥ 30`), every 5 mm 0.4 cm, every cm 0.6 cm, every 5 cm 0.9 cm; numbers every cm when `tr.scale ≥ 25`, else every 5 cm when `tr.scale ≥ 6`, else every 10 cm; numbers centred under their tick at y = −1.35 cm, font `${11 · fontScale}px` IBM Plex Mono, `colors.inkDim`. Lines 1 px (`ctx.lineWidth = 1 · fontScale / tr-independent`).
4. Balls: for each `run.level3.strobe` position p: centre (p.x, rEff), radius r (world); stroke `colors.ink` 1 px, fill `colors.mat[material]` at `globalAlpha 0.25` (hollow: no fill, plus inner ring); centre cross with arms `max(3 px, 0.12 cm)`.
5. Numbers: screen x of each centre → `labelPositions(xs, labelW = ctx.measureText('00').width + 6)`; draw `n` at y = top of the balls − 8 px (screen); when the label was shifted by more than 1 px, draw a hairline from the label bottom to the ball top.
6. Caption (screen space, not zoomed): `captionLines[0]` (12 px × fontScale, weight 600) and `captionLines[1]` (11 px × fontScale, IBM Plex Sans, `inkDim`) at the top-left, with a `colors.field` background so the drawing does not show through.

`renderStrobePNG(o)`: `const size = exportSize(box)`; `null` → resolve `null`. Create an offscreen `<canvas>` of `size.w × size.h`, transform `{ scale: size.scale, tx: 40 − box.x0·scale, ty: 120 + 60 + 40 + box.y1·scale }`, `fontScale = 2.2`, draw, `canvas.toBlob(resolve, 'image/png')` (resolves `null` on failure).

`openStrobe(o)`: `openOverlay` with title `t('strobe.title')`; head buttons `−` (`aria-label` `strobe.zoomOut`), `+` (`strobe.zoomIn`), `t('strobe.fit')`, run selector (seg of `.btn` 1…n labelled `t('strobe.run')` + number, current `aria-pressed`), `.check` `t('tape')` (disabled when `tapeLocked`, calls `onTapeChange`), `t('strobe.export')`; body = `<div class="strobe-view"><canvas></canvas></div>`; status line shows `t('strobe.hint')`. On open and on FIT: `fitTransform(box, w, h)`. `attachZoomPan` on the canvas. Redraw on every transform change (use `setupCanvas` from sim-core for DPR handling). Caption lines: `t('strobe.caption', { dt: formatNumber(dt, 1, lang), n: table.index, r: runIndex + 1 })` and `tableModel(table, …).settingsLine`. Export: `renderStrobePNG` → blob → `downloadBlob(`lodite-stroboskops-${table.index}-${runIndex + 1}.png`, blob)`; `null` → `onExportFailed({ w, h })` where w, h are the sizes at 60 px/cm (so the notice can name them) and status line shows `t('strobe.exportFailed', { w, h })`.

`attachZoomPan(el, { get, set, min, max })`: wheel → `set(zoomAt(get(), Math.exp(−e.deltaY · 0.0015), e.offsetX, e.offsetY, min, max))` with `preventDefault`; pointers tracked in a `Map`; one pointer → `panBy` by the movement; two pointers → zoom by the ratio of distances around their midpoint plus pan by the midpoint movement; `setPointerCapture` on pointerdown. Returns a function that removes all listeners.

- [ ] **Step 5: Wire it in `main.js`**

`'openStrobe'` → `openStrobe({ table: shown, runIndex: shown.runs.length − 1, t, lang, colors: theme.colors(), tape: state.settings.tape, tapeLocked: state.locked.has('tape'), onTapeChange: (on) => { state.settings = withTape(state.settings, on); render(); }, onExportFailed: ({ w, h }) => notices.show('export', () => i18n.t('strobe.exportFailed', { w, h })) })`. Close and reopen on language or theme change (keep `state.overlay`).

- [ ] **Step 6: Verify in the browser**

1. Level 3, three runs, STROBOSKOPS → the groove drawn horizontally with the tape; balls numbered 0, 1, 2 … — early numbers pushed right with thin leader lines, later ones straight above their balls; the caption shows Δt, table and run number and the settings line.
2. Wheel over a ball zooms around the cursor; drag pans; at high zoom mm ticks and a centre cross are clearly visible; VISS fits again.
3. Run selector 1/2/3 switches positions; they differ slightly between runs.
4. For run 1: with `browser_evaluate`, compare `results.tables()[0].runs[0].level3.strobe[i].x` with the compact table x values → every difference ≤ 0,5 cm.
5. Untick RĀDĪT MĒRLENTI → tape disappears (also in the main drawing after closing).
6. EKSPORTĒT ATTĒLU → a PNG download named `lodite-stroboskops-1-3.png`; save it to the scratchpad and open it with the Read tool: mm ticks and ball centres are readable when zoomed; the caption is on top.
7. `?L=200&level=3` → export still works (≈ 12 400 px wide).
8. Phone portrait: pinch zoom works in the Playwright mobile emulation (or at least one-finger pan); the header buttons wrap without overflowing.

- [ ] **Step 7: Run the unit tests and commit**

Run: `npm test` (all pass)

```bash
git add assets/measure/zoom-pan.js assets/rolling-ball/strobe.js assets/rolling-ball/main.js tests/zoom-pan.test.js tests/strobe.test.js
git commit -m "Add K-01 strobe view with zoom, numbered positions and PNG export"
```

---

### Task 14: Listing on the index page, README, full acceptance pass

**Files:**
- Modify: `index.html` (add one card and its translations), `README.md`

**Interfaces:**
- Consumes: the finished page.

- [ ] **Step 1: Add a card to `index.html`**

After the “CARD 4: Newton’s Cannon” `</a>` and before `</div>\n</main>`, insert a fifth card in the same markup pattern:

```html
    <!-- ══════ CARD 5: Ball in a groove ══════ -->
    <a href="rolling-ball.html" class="card">
      <div class="card-visual">
        <svg width="200" height="140" viewBox="0 0 200 140">
          <!-- Table -->
          <line x1="20" y1="112" x2="185" y2="112" stroke="#5a6d88" stroke-width="1.2"/>
          <!-- Support -->
          <rect x="26" y="70" width="10" height="42" fill="none" stroke="#5a6d88" stroke-width="1"/>
          <!-- Groove -->
          <line x1="28" y1="68" x2="178" y2="108" stroke="#c8d6e8" stroke-width="2"/>
          <!-- Strobe positions -->
          <circle cx="36" cy="63" r="4.5" fill="none" stroke="#ffd70088" stroke-width="1"/>
          <circle cx="44" cy="65" r="4.5" fill="none" stroke="#ffd70099" stroke-width="1"/>
          <circle cx="62" cy="70" r="4.5" fill="none" stroke="#ffd700aa" stroke-width="1"/>
          <circle cx="92" cy="78" r="4.5" fill="none" stroke="#ffd700cc" stroke-width="1"/>
          <circle cx="134" cy="89" r="4.5" fill="#ffd70066" stroke="#ffd700" stroke-width="1.2"/>
          <!-- Tape ticks -->
          <path d="M 40 76 l 1 -3 M 60 81 l 1 -3 M 80 87 l 1 -3 M 100 92 l 1 -3 M 120 97 l 1 -3 M 140 103 l 1 -3" stroke="#5a6d88" stroke-width="0.8"/>
        </svg>
      </div>
      <div class="card-body">
        <div class="card-tag tag-mechanics" data-i18n="tagMechanics">Mechanics</div>
        <div class="card-title" data-i18n="rollingTitle">Ball in a Groove</div>
        <p class="card-desc" data-i18n="rollingDesc">Roll a ball down an inclined groove and collect realistic measurement data: time, gates or strobe positions.</p>
        <div class="card-status status-live">
          <div class="status-dot"></div>
          <span data-i18n="statusLive">Live</span>
        </div>
      </div>
    </a>
```

Add to `TRANSLATIONS.en`:

```js
    rollingTitle: "Ball in a Groove",
    rollingDesc: "Roll a ball down an inclined groove and collect realistic measurement data: time, gates or strobe positions.",
```

and to `TRANSLATIONS.lv`:

```js
    rollingTitle: "Lodīte renītē",
    rollingDesc: "Palaid lodīti pa slīpu renīti un iegūsti ticamus mērījumu datus: laiku, vārtu laikus vai stroboskopa attēlu.",
```

Change nothing else in `index.html`.

- [ ] **Step 2: Update `README.md`**

Add a row to the Simulations table: `| 🟠 Ball in a Groove (K-01) | Kinematics / rolling on an incline | ✅ Live |`. In “Structure” add `rolling-ball.html`, `assets/` (shared modules: `sim-core.js`, `sim-common.css`, `physics/`, `measure/`, `rolling-ball/`), `tests/`, `package.json`. Replace the “Tech” paragraph with:

```markdown
## Tech

The older simulations are single-file HTML5 pages with vanilla JavaScript and Canvas. New pages (from K-01 “Ball in a Groove”) use the technical-drawing design system: shared ES modules in `assets/`, loaded by the browser directly — still no build step and no dependencies.

ES modules do not load from `file://`. To try pages locally, serve the folder:

    python3 -m http.server 8765
    # open http://localhost:8765/rolling-ball.html

Unit tests for the pure modules (physics, noise, URL parameters, tables): `npm test` (Node 20+).
```

Add a short “Teacher links (K-01)” section listing the URL parameters from `assets/rolling-ball/params.js` with one example: `rolling-ball.html?L=80&h=2.0&ball=steel16&level=3&dt=0.5&view=strobe&lock=1`, and the teacher-only ones: `noise=0|1|2`, `traps=push,late`, `seed=<number>`.

- [ ] **Step 3: Full acceptance pass (spec section 12, phase 1)**

Run `npm test` — all pass. Then in the browser go through the list and screenshot each item into the scratchpad (`k01-accept-<n>.png`):

1. Default link: a ≈ 19 cm/s² behaviour — level 1, noise 0 (`?level=1&noise=0`) shows 2,72 s.
2. `?noise=0&L=200&h=6&dt=0.5` level 3: the table x at t = 1, 2, 3 s relate as 1 : 4 : 9 within rounding.
3. Level 1, five repeats: t spread ~0,1 s.
4. Same link with `&seed=42` in two different tabs: identical numbers for runs 1, 2, 3.
5. Lock: `?L=80&h=2.0&ball=steel16&level=3&dt=0.5&view=strobe&lock=1` — FIKS. on L, h, ball, level, Δt; only STROBOSKOPS after a run.
6. Data table: full screen, large digits, COPY (or the precise fallback), CSV with BOM, `;`, decimal comma.
7. Strobe: numbered positions, tape toggle, zoom, PNG export with readable mm ticks.
8. All of the above in EN, in the light theme, on phone portrait (390×844) and phone landscape (844×390) — nothing clipped, no horizontal page scroll, handles reachable.
9. The index page shows the new card in LV and EN and it opens the simulation.

Fix any defect found (with a unit test when the defect is in a pure module), re-run `npm test`, and re-check the affected item.

- [ ] **Step 4: Commit**

```bash
git add index.html README.md
git commit -m "List Ball in a Groove (K-01) on the index page and document it"
```

(Commit any fixes from Step 3 separately with a message that names the defect.)
