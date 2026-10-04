# K-02 in the new layout, without the table — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild K-02 “Kritieni un sviedieni” (`projectile-motion.html`) in the full-screen HUD layout already used by K-01, with a single metre scale (no table, no tower, only the height h), the background grid as the scale, and two strobe tapes (↑ / ↓) for the vertical throw.

**Architecture:** Vanilla ES modules, no build step, GitHub Pages. Pure logic (model, layout maths, HUD view-models) lives in `assets/projectile/*.js` and is unit-tested with `node:test`; DOM wiring reuses the shared K-01 HUD modules (`assets/measure/hud.js`, `ui-scale.js`, `sim-core.js` `mountHeaderTools` / `mountTitleCells`, `.layout-hud` CSS in `assets/sim-common.css`). K-02's side panel (`assets/projectile/panel.js`) is removed.

**Tech Stack:** JavaScript ES modules, Canvas 2D, `node --test` (`npm test`), Playwright MCP for browser checks.

**Spec:** `docs/plans/2026-10-04-sviedieni-izkartojums.md` (K-02 specifics, Latvian) and `docs/plans/2026-10-04-izkartojums.md` (common rules for all new-layout pages). Older K-02 spec: `docs/plans/2026-09-30-kritieni-un-sviedieni.md` (still valid except 8.4 scales and 8.2 vertical strobe shift).

## Global Constraints

- Repo `/Users/minim4/dev/sites/physics_sims`; work in the worktree given by the controller (branch `k02-hud`). Never push, never merge. Commit at the end of each task; message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `npm test` must be green at the end of every task (was 245 before this plan).
- UI text only from `assets/projectile/i18n.js`, LV **and** EN for every key; Latvian typography: “…” top quotes, spaced em dash —, en dash ranges without spaces (0,1–2), …, ’. No ASCII substitutes in user text.
- Every user-facing notice names its cause and what the person can do.
- K-01 (`rolling-ball.html`, `assets/rolling-ball/*`) must behave exactly as before. Only Task 2 touches it (moving shared constants), with K-01 tests unchanged and green.
- Old pages (`electric-field*.html`, `millikan.html`, `newtons-cannon.html`, `design.html`) are not touched. Untracked `el-lauka-hokejs.html` and `.claude/` are left alone.
- Units: metres only. h 0–50 m step 0,5; v₀ up to 30 m/s step 0,5 (vertical −30…+30, “+” = up); α 0–90° step 1; Δt 0,1–2 s step 0,1. Ball Ø 22 cm, drawn with a fixed radius `BALL_R_PX = 7` px (not to scale).
- The word “galds”/“table” (meaning the lab table) and “tornis”/“tower” must not remain in any K-02 UI text, card, README section or study after Task 6 (the data table “DATU TABULA” is a different word and stays).
- Pure functions get tests; DOM is checked in the browser.

## Review Focus

1. Vertical throw with v₀ > 0: each flash at n·Δt goes to the tape of the ball’s direction at that instant (rising → left tape x = 0, falling → right tape); the apex has no flash of its own; with v₀ ≤ 0 there is only one tape at x = 0. (Task 1 `rising`, Task 2 `displayX`, Task 3 `strobePoints` tests.)
2. Δt longer than the flight: exactly one sample (the start); tables, mini table, CSV and strobe view work with one row, no notice. (Task 1 experiment test, Task 4 measureVM test.)
3. h = 0 launches (oblique default, vertical up): a run works; the only refusal is “nothing moves” (h = 0 and no upward speed), with a precise text. (Task 1 tests.)
4. Old teacher links: `?scale=table&h=80` → notice that the table scale is gone + h clamped to 50 m with the h range notice; `?scale=tower&h=20` → only the scale notice, h = 20 m. (Task 1 params tests.)
5. Wide drawings on a phone (390×844, horizontal throw v₀ = 30 m/s, h = 50 m) and tall ones (vertical v₀ = 30 m/s): drawing centred, ground at 61,8 %, grid numbers never under LIELUMI, MĒRĪJUMI or the run button. (Task 2 layout tests; browser check in Task 5.)

---

### Task 1: One metre scale in the model (no table, no tower), Δt slider values, no “too short” refusal

**Files:**
- Modify: `assets/projectile/scales.js`, `model.js`, `params.js`, `experiment.js`, `advice.js`, `results.js`, `studies.js` (only `fixedSummary` and imports), `i18n.js`
- Keep the old page running with minimal edits: `assets/projectile/scene.js`, `strobe.js`, `main.js`, `panel.js` (replace `SCALES[s.scale]` / `sc` lookups by `SCALE`; delete the scale switch from the panel; `drawStructure` draws nothing — it is removed in Task 2)
- Test: `tests/projectile-model.test.js`, `projectile-params.test.js`, `projectile-experiment.test.js`, `projectile-advice.test.js`, `projectile-results.test.js`, `projectile-studies.test.js`, `projectile-i18n.test.js`

**Interfaces:**
- Produces:
  - `scales.js`: `export const SCALE = { unit: 'm', g: 9.81, h: { min: 0, max: 50, step: 0.5, decimals: 1 }, v0: { max: 30, step: 0.5, decimals: 1 }, dt: { min: 0.1, max: 2, step: 0.1 }, defaults: { h: 20, dt: 0.2, slow: false, v0: { vertical: 0, horizontal: 10, oblique: 15 } }, ball: { d: 0.22, material: 'steel' }, minView: { w: 30, h: 15 }, read: { sigma: 0.03, max: 0.05, resolution: 0.1, decimals: 1 }, frame: 1 / 30, exportPx: { pref: 60, min: 20 } }`. `SCALES`, `TABLE_DRAW`, `structureW`, `strobeSpacing`, `dtOptions` no longer exist. `MODES`, `MODE_NUMBER`, `ALPHA`, `NOISE` unchanged.
  - `model.js`: `defaultSettings(mode = 'horizontal')` → `{ mode, h, v0, alphaDeg, dt, second, grid, slow }` (no `scale`); `v0Range(mode)`; `withDt(s, dt)` clamps to [0,1; 2] and rounds to 0,1 (`roundTo`), non-finite → `s` unchanged; `withScale` removed; `derive(s).flight` is `'none' | 'ok'`; `flightCheck(s)` → `'none' | 'ok'` (no noise analysis); `MIN_POSITIONS` removed; `settingsKey` and `FIELD_SAME` without `scale`.
  - `experiment.js`: `simulateRun` refuses only `reason: 'none'`; never `'short'`; each `strobe` point gets `rising: boolean` (true when the vertical velocity at that instant is > 0); the run gets `risingAt(t)` (same rule for the live ball); `run.scale` removed.
  - `params.js`: `PARAM_SCHEMA` without `scale`, `dt: { type: 'number', min: 0.1, max: 2 }`; `LOCKABLE` without `'scale'`; a link with `scale=…` gives warning `{ param: 'scale', raw, reason: 'scale_removed' }`; `dt` between steps → existing `rounded` warning.
  - `advice.js`: `flightNotice('none', s, locked, t)` only (no `dt` remedies).
  - `i18n.js` (LV/EN): remove `scale.table`, `scale.tower`, `set.scale.table`, `set.scale.tower`, `notice.short`, `notice.short.minDt`, `fix.dt` (and any key only they used); add `url.scale_removed`: LV `Saites parametrs scale={raw} vairs nedarbojas: galda mēroga vairs nav, visi lielumi ir metros.`, EN `Link parameter scale={raw} no longer works: there is no table scale any more, all quantities are in metres.`; `scene.aria` LV `Sānskata rasējums: izmešanas augstums h, bumbiņa, sākuma ātruma bulta un rūtiņas mērogā.`, EN `Side-view drawing: launch height h, the ball, the initial velocity arrow and a grid to scale.`; `studies.fullDesc` LV `Visi lielumi un skati, visi trīs režīmi.`, EN `Every quantity and view, all three modes.`

- [ ] **Step 1: Write failing tests** (adapt existing tests; add these)

```js
// tests/projectile-model.test.js
test('one metre scale: defaults per mode, no scale field', () => {
  const s = defaultSettings('horizontal');
  assert.deepEqual(s, { mode: 'horizontal', h: 20, v0: 10, alphaDeg: 45, dt: 0.2, second: false, grid: true, slow: false });
  assert.equal(defaultSettings('vertical').v0, 0);
  assert.equal(defaultSettings('oblique').v0, 15);
  assert.deepEqual(v0Range('vertical'), { min: -30, max: 30 });
  assert.deepEqual(v0Range('oblique'), { min: 0, max: 30 });
});
test('withDt: 0,1–2 s in steps of 0,1', () => {
  const s = defaultSettings();
  assert.equal(withDt(s, 0.3).dt, 0.3);
  assert.equal(withDt(s, 0.25).dt, roundTo(0.25, 0.1));
  assert.equal(withDt(s, 5).dt, 2);
  assert.equal(withDt(s, 0.04).dt, 0.1);
  assert.equal(withDt(s, NaN), s);
});
test('flight is none only when nothing moves', () => {
  assert.equal(derive({ ...defaultSettings('vertical'), h: 0, v0: 0 }).flight, 'none');
  assert.equal(derive({ ...defaultSettings('vertical'), h: 0, v0: 5 }).flight, 'ok');
  assert.equal(derive({ ...defaultSettings('horizontal'), h: 0 }).flight, 'none');
  assert.equal(derive({ ...defaultSettings('oblique'), h: 0, alphaDeg: 0 }).flight, 'none');
  assert.equal(derive({ ...defaultSettings('oblique'), h: 0 }).flight, 'ok');
  assert.equal(derive({ ...defaultSettings('vertical'), h: 0.5, v0: 0, dt: 2 }).flight, 'ok', 'a flight shorter than Δt is still a flight');
});

// tests/projectile-experiment.test.js
test('a flight shorter than Δt records only the start flash, no refusal', () => {
  const s = { ...defaultSettings('vertical'), h: 1, v0: 0, dt: 2 };
  const run = simulateRun(s, { seed: 1, repeat: 1, noise: 1, traps: [] });
  assert.equal(run.ok, true);
  assert.equal(run.samples.length, 1);
  assert.equal(run.samples[0].t, 0);
});
test('vertical throw up: rising flag per flash follows the velocity sign, no flash is forced at the apex', () => {
  const s = { ...defaultSettings('vertical'), h: 20, v0: 10, dt: 0.3 };
  const run = simulateRun(s, { seed: 3, repeat: 1, noise: 0, traps: [] });
  const tApex = 10 / 9.81; // ≈ 1,019 s
  for (const p of run.strobe) assert.equal(p.rising, p.t < tApex, `t = ${p.t}`);
  assert.ok(run.strobe.every((p) => Math.abs(p.t - tApex) > 1e-6));
  assert.equal(run.risingAt(0.5), true);
  assert.equal(run.risingAt(1.5), false);
});
test('only "none" is refused', () => {
  const run = simulateRun({ ...defaultSettings('horizontal'), h: 0 }, { seed: 1, repeat: 1, noise: 1, traps: [] });
  assert.deepEqual([run.ok, run.reason], [false, 'none']);
});

// tests/projectile-params.test.js
test('old links: scale is gone with a notice, values are metres', () => {
  const a = settingsFromURL('?scale=table&h=80', { makeSeed: () => 1 });
  assert.equal(a.settings.h, 50);
  assert.deepEqual(a.warnings.map((w) => w.reason).sort(), ['h_range', 'scale_removed']);
  const b = settingsFromURL('?scale=tower&h=20', { makeSeed: () => 1 });
  assert.equal(b.settings.h, 20);
  assert.deepEqual(b.warnings.map((w) => w.reason), ['scale_removed']);
  assert.equal(warningText(b.warnings[0], { t: lv, lang: 'lv' }),
    'Saites parametrs scale=tower vairs nedarbojas: galda mēroga vairs nav, visi lielumi ir metros.');
  assert.ok(!('scale' in a.settings));
  assert.ok(!LOCKABLE.includes('scale'));
});
test('dt link: 0,1–2 s, between steps rounded with a notice', () => {
  assert.equal(settingsFromURL('?dt=0.3', { makeSeed: () => 1 }).settings.dt, 0.3);
  const r = settingsFromURL('?dt=5', { makeSeed: () => 1 });
  assert.equal(r.settings.dt, 2);
  assert.equal(r.warnings[0].reason, 'out_of_range');
});
```
(`lv` is whatever translator helper the existing params test already builds from `STRINGS.lv`; reuse it.)

- [ ] **Step 2: Run** `npm test` — the new tests fail (no `SCALE`, `scale` still present).
- [ ] **Step 3: Implement** the interfaces above. In `results.js` and `studies.js` `fixedSummary` use `SCALE` and drop the `scale` part. In `advice.js` keep only the `'none'` reason (increase h; vertical: throw up; oblique: increase v₀ or α — only keys not in `locked`). Keep the old page working with the mechanical replacements listed under **Files** (the scale switch disappears from the panel; the table/tower drawing disappears; the strobe vertical shift may temporarily use `n * 0.6` m).
- [ ] **Step 4: Run** `npm test` — all green. `grep -rn "SCALES\|structureW\|TABLE_DRAW\|dtOptions\|strobeSpacing\|withScale\|'short'" assets/projectile tests` → no matches.
- [ ] **Step 5: Commit** — `K-02: one metre scale (no table, no tower), Δt 0,1–2 s, a flight shorter than Δt is a flight`.

---

### Task 2: Drawing — HUD layout, no structure, grid as the scale, vertical tapes

**Files:**
- Create: `assets/measure/hud-layout.js`
- Modify: `assets/rolling-ball/scene.js` (import the shared constants, re-export them — no behaviour change), `assets/projectile/scene.js`
- Test: `tests/projectile-scene.test.js` (rewrite), `tests/scene.test.js` (must pass unchanged)

**Interfaces:**
- Consumes: Task 1 `SCALE`, `derive`, run `risingAt`, strobe `rising`.
- Produces:
  - `assets/measure/hud-layout.js`: `export const GROUND = 0.618; export const EDGE_PX = 16; export const TOP_MARGIN = 12; export const PANEL_GAP = 12;` — K-01 `scene.js` deletes its own four definitions, imports these and keeps `export { GROUND, EDGE_PX, TOP_MARGIN, PANEL_GAP }`.
  - `assets/projectile/scene.js`:
    - `BALL_R_PX = 7`, `DIM_GAP = 30`, `H_LABEL_GAP = 10`, `H_LABEL_PX = 12`, `ARC_R`, `arrowMaxPx(width, height)` (unchanged).
    - `sceneBox(s)` → `{ x0: 0, x1, y0: 0, y1 }` in metres: independent of α and rounded up with `ladderCeil` (the edge must not reveal the range or apex, K-02 spec 2.1). Non-vertical: `x1 = max(minView.w, ladderCeil(1.1 · reach + 2 · ball.d))` with reach = the largest range over all α for the given |v₀| and h (as today). Vertical: `y1` as today; `x1 = 2 · tapeGap({ y0: 0, y1 })`.
    - `tapeGap(box)` = `0.12 · (box.y1 − box.y0)` (metres; distance between the ↑ and ↓ tapes).
    - `displayX(s, box, p)` → vertical: `p.rising || s.v0 <= 0 ? 0 : tapeGap(box)`; otherwise `p.x`. `p` is `{ x, rising }`.
    - `sceneLayout(width, height, box, { drawScale = 1, avoid = null, topReserve = TOP_MARGIN } = {})` → `{ width, height, box, tr: { scale, tx, ty }, arrow, groundY, fill, toScreen, toWorld }`:
      - `groundY = Math.round(height · GROUND)`; `ty = groundY` (world y = 0 on the ground line).
      - pads in px: `left = DIM_GAP + H_LABEL_GAP + H_LABEL_PX`, `right = BALL_R_PX + 4`, top room = `arrow = arrowMaxPx(width, height)`.
      - base scale = min(`(width − 2·EDGE_PX − left − right) / (x1 − x0)`, `(groundY − topReserve − arrow) / (y1 − y0)`), each available size at least 50 / 40 px.
      - `avoid` (MĒRĪJUMI `{ left, bottom }` in drawing px): only if the drawing rectangle (box + pads + arrow room) at the base scale intersects it, choose the better of “below it” (topReserve = `avoid.bottom + PANEL_GAP`) and “centred and narrow enough to stay left of it” (width limit `2 · (avoid.left − PANEL_GAP) − width`), preferring the option that has real room (not only the minimum), else the larger scale — the same rule as K-01 `sceneLayout`.
      - `scale = base · drawScale`; `tx` places the drawing extent `[x0·scale − left, x1·scale + right]` exactly centred on `width / 2` (so ⚙ ZĪMĒJUMS grows it equally to both sides; the ground stays).
      - `fill` = the drawScale at which the extent exactly fills `width − 2·EDGE_PX`.
    - `launchPoint`, `arrowGeometry` (uses `SCALE.v0.max`), `arcRadius`, `handleAnchors(lay, s)` (h anchor at `launch.x − DIM_GAP`), `valueFromPointer` — same meaning as today.
    - `drawScene(ctx, lay, m)` with `m = { settings, derived, colors, t, lang, ball: { x, y, rising }, ball2, avoidRects }`: always the world grid (no paper grid, no `showGrid`), ground with hatching, no structure, h dimension line at `launch.x − DIM_GAP`, origin arrows x/y and the launch label as today (without the table slab offset), velocity arrow and α arc, balls with radius `BALL_R_PX` (second ball hollow, dashed, same radius), and in the vertical mode faint dashed tape lines from the ground to the top of the box with “↑” above the left tape and “↓” above the right one (only “↓” at x = 0 when `v0 <= 0`). Ball screen x uses `displayX`.
    - Grid: `gridSteps(scale)` (already 1-2-5 steps with ≥ 40 px between labelled lines and faint minor lines, `assets/measure/world-grid.js`); labelled lines carry numbers: x under the ground, y at the right edge; units `x, m` and `y, m`. A number is not drawn when its text box intersects any rect in `m.avoidRects` (`[{ l, t, r, b }]`, drawing px) or leaves the canvas.

- [ ] **Step 1: Write the failing tests** (`tests/projectile-scene.test.js`, replace the old layout tests; keep `ladderCeil` tests)

```js
import { sceneBox, sceneLayout, tapeGap, displayX, handleAnchors, valueFromPointer, BALL_R_PX, DIM_GAP, H_LABEL_GAP, H_LABEL_PX } from '../assets/projectile/scene.js';
import { GROUND, EDGE_PX } from '../assets/measure/hud-layout.js';
import { defaultSettings, withMode, withV0, withH, withAlpha } from '../assets/projectile/model.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b}`);
const PADL = DIM_GAP + H_LABEL_GAP + H_LABEL_PX;
const extent = (lay) => ({ l: lay.toScreen(lay.box.x0, 0).x - PADL, r: lay.toScreen(lay.box.x1, 0).x + BALL_R_PX + 4 });

test('ground at 61,8 %, world y = 0 on it', () => {
  for (const [w, h] of [[390, 780], [844, 340], [1280, 760]]) {
    const lay = sceneLayout(w, h, sceneBox(defaultSettings()));
    assert.equal(lay.groundY, Math.round(h * GROUND));
    close(lay.toScreen(0, 0).y, lay.groundY, 1e-9);
  }
});
test('the drawing is exactly centred for every mode and stays centred at ⚙ 60/100/150 %', () => {
  for (const s of [defaultSettings('horizontal'), withV0(defaultSettings('vertical'), 12), defaultSettings('oblique')]) {
    for (const k of [0.6, 1, 1.5]) {
      const lay = sceneLayout(844, 390, sceneBox(s), { drawScale: k });
      const e = extent(lay);
      close((e.l + e.r) / 2, 422, 1e-6, `${s.mode} ${k}`);
    }
  }
});
test('fill: at drawScale = fill the drawing exactly fills the width', () => {
  const box = sceneBox(defaultSettings('horizontal'));
  const lay = sceneLayout(1280, 760, box);
  const big = sceneLayout(1280, 760, box, { drawScale: lay.fill });
  const e = extent(big);
  close(e.r - e.l, 1280 - 2 * EDGE_PX, 1e-6);
});
test('the box does not depend on α and is rounded up', () => {
  const o = defaultSettings('oblique');
  assert.deepEqual(sceneBox(withAlpha(o, 20)), sceneBox(withAlpha(o, 70)));
  const b = sceneBox(withH(defaultSettings('horizontal'), 20));
  assert.ok(b.x1 >= 1.1 * 10 * Math.sqrt(2 * 20 / 9.81));
});
test('vertical tapes: rising at x = 0, falling one tape gap to the right; v₀ ≤ 0 — one tape at 0', () => {
  const up = withV0(defaultSettings('vertical'), 10);
  const box = sceneBox(up);
  assert.equal(displayX(up, box, { x: 0, rising: true }), 0);
  close(displayX(up, box, { x: 0, rising: false }), tapeGap(box), 1e-12);
  close(tapeGap(box), 0.12 * (box.y1 - box.y0), 1e-12);
  const down = withV0(defaultSettings('vertical'), -5);
  assert.equal(displayX(down, sceneBox(down), { x: 0, rising: false }), 0);
  const hz = defaultSettings('horizontal');
  assert.equal(displayX(hz, sceneBox(hz), { x: 7.5, rising: false }), 7.5);
});
test('MĒRĪJUMI is avoided only when the drawing would reach it', () => {
  const box = sceneBox(defaultSettings('horizontal'));
  const free = sceneLayout(390, 780, box);
  const far = sceneLayout(390, 780, box, { avoid: { left: 380, bottom: 20 } });
  assert.equal(far.tr.scale, free.tr.scale);
  const tall = sceneLayout(390, 780, box, { avoid: { left: 220, bottom: 400 } });
  assert.ok(tall.tr.scale <= free.tr.scale);
});
test('pointer at each handle gives back the value', () => {
  const s = defaultSettings('oblique');
  const lay = sceneLayout(1000, 600, sceneBox(s));
  const a = handleAnchors(lay, withH(s, 10));
  close(valueFromPointer('h', lay, withH(s, 10), a.h), 10, 1e-9);
  close(valueFromPointer('alpha', lay, s, handleAnchors(lay, s).alpha), 45, 1e-9);
});
```

- [ ] **Step 2: Run** `npm test` — the new tests fail.
- [ ] **Step 3: Implement** `hud-layout.js`, the K-01 import/re-export, and the K-02 `scene.js` interfaces above. Delete `drawPaper`, `drawStructure`, `MARGIN`, and the `showGrid` branch.
- [ ] **Step 4: Run** `npm test` — all green, including the unchanged `tests/scene.test.js`.
- [ ] **Step 5: Commit** — `K-02 drawing: ground on the golden section, exactly centred, no structure, grid as the scale, ↑/↓ tapes for the vertical throw`.

---

### Task 3: Strobe view — no structure, two tapes for the vertical throw

**Files:**
- Modify: `assets/projectile/strobe.js`, `assets/projectile/i18n.js` (`strobe.verticalNote`)
- Test: `tests/projectile-strobe.test.js`

**Interfaces:**
- Consumes: Task 2 `sceneBox`, `tapeGap`, `displayX`; Task 1 strobe points `{ n, t, x, y, rising }`.
- Produces: `strobePoints(run, settings)` → `{ main: [{ n, x, y }], second: [{ n, x, y }], tapes: null | { up: number | null, down: number } }` where for the vertical mode `x = displayX(settings, sceneBox(settings), p)` and `tapes` = `{ up: 0, down: tapeGap(box) }` (v₀ > 0) or `{ up: null, down: 0 }` (v₀ ≤ 0); other modes: `x = p.x`, `tapes: null`. `strobeWorldBox(settings, points)` without any structure (left edge = min point x − pad). The view draws, for `tapes`, a faint dashed vertical line per tape and “↑” / “↓” above it (also in the PNG export). No table/tower drawing anywhere in the file.
- `strobe.verticalNote` LV: `Vertikālais sviediens: augšupejošā lente ↑ pa kreisi, lejupejošā ↓ pa labi. Lentes nobīde ir tikai attēlā — x netiek mērīts.` EN: `Vertical throw: the rising tape ↑ on the left, the falling tape ↓ on the right. The tapes are side by side only in the picture — x is not measured.`

- [ ] **Step 1: Write the failing tests**

```js
test('vertical strobe: rising flashes on the ↑ tape at x = 0, falling ones on the ↓ tape', () => {
  const s = { ...defaultSettings('vertical'), h: 20, v0: 10, dt: 0.3 };
  const run = simulateRun(s, { seed: 3, repeat: 1, noise: 0, traps: [] });
  const pts = strobePoints(run, s);
  const gap = tapeGap(sceneBox(s));
  run.strobe.forEach((p, i) => close(pts.main[i].x, p.rising ? 0 : gap, 1e-12));
  assert.deepEqual(pts.tapes, { up: 0, down: gap });
});
test('free fall: one ↓ tape at x = 0', () => {
  const s = { ...defaultSettings('vertical'), h: 20, v0: 0, dt: 0.2 };
  const pts = strobePoints(simulateRun(s, { seed: 1, repeat: 1, noise: 0, traps: [] }), s);
  assert.ok(pts.main.every((p) => p.x === 0));
  assert.deepEqual(pts.tapes, { up: null, down: 0 });
});
test('horizontal and oblique: real x, no tapes', () => {
  const s = defaultSettings('horizontal');
  const run = simulateRun(s, { seed: 1, repeat: 1, noise: 0, traps: [] });
  const pts = strobePoints(run, s);
  assert.equal(pts.tapes, null);
  run.strobe.forEach((p, i) => assert.equal(pts.main[i].x, p.x));
});
```

- [ ] **Step 2: Run** `npm test` — fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` — green.
- [ ] **Step 5: Commit** — `K-02 strobe: two tapes ↑/↓ for the vertical throw, no structure`.

---

### Task 4: HUD view-models — LIELUMI rows and MĒRĪJUMI

**Files:**
- Create: `assets/projectile/hud-model.js`
- Modify: `assets/projectile/i18n.js` (new keys below)
- Test: create `tests/projectile-hud-model.test.js`

**Interfaces:**
- Consumes: Task 1 `SCALE`, `v0Range`, `ALPHA`, `MODES`; `formatNumber`, `decimalsOf` from `assets/measure/format.js`. Row and vm shapes are the ones `createQuantityList` / `createMeasureBox` in `assets/measure/hud.js` already render (read the comments at the top of each function there and `assets/rolling-ball/hud-model.js` — this file mirrors it).
- Produces:
  - `quantityState(key, { locked, hidden, study })` → `'editable' | 'fixed' | 'locked'`: in a study a key not in `study.editable` is `'fixed'`; else a `locked` key that is not `hidden` is `'locked'`; else `'editable'`. `slow` is never fixed or locked.
  - `quantityRows(s, { locked, hidden, study, lang, t })` → rows. Main group: `h` (range 0–50 step 0,5, unit ` m`, 1 decimal), `v0` (range `v0Range(mode)`, step 0,5, unit ` m/s`; in the vertical mode valueText `10,0 m/s ↑` / `5,0 m/s ↓` / `0,0 m/s`, minText `30 m/s ↓`, maxText `30 m/s ↑`), `alpha` (oblique only, range 0–90 step 1, unit `°`, 0 decimals), `dt` (range 0,1–2 step 0,1, unit ` s`, 1 decimal). More group (full control only): `mode` (choices 1 ↕ / 2 → / 3 ↗ from `mode.*` keys), `second` (horizontal only, choices ir / nav), `slow` (choices ×1 / ×0,25). In a study there is no more group; a more-group row the study lets the student change (`second` in HORIZONTĀLAIS SVIEDIENS) moves to the main group — same rule as K-01 `quantityRows`.
  - `LIVE_ROWS = 4`; `measureVM({ settings, running, lastRun, shown, shownModel, tables, shownKey, views, lang, t })` → `{ symbol, valueText, unit: 'm', live, rows, note, mini, canOpen, strobe, tableChoices, shownKey }`: symbol `y` (vertical) or `x`; value = the latest flash already seen (`sample.t + run.truth.tau <= simT`; after the run, the last sample), `—` before any run; while running `rows` = the last `LIVE_ROWS` seen samples as `{ a: 't = 0,4 s', b: 'x = 3,9 m; y = 18,2 m' }` (vertical: `b: 'y = 18,2 m'`); when idle and the shown table has ≥ 2 runs, `mini = shownModel` and `rows = null`; `views.table === false` → `valueText: ''`, `note: t('hud.readStrobe')`; `canOpen = views.table && !!shown`; `strobe = views.strobe && !!shown`; `tableChoices` exactly as K-01 (`results.option` labels, `—` first when the current settings have no table yet; `null` when there is only the shown one).
  - i18n (LV / EN), copy wording and typography from `assets/rolling-ball/i18n.js` where the key exists there: `hud.title` (LIELUMI / QUANTITIES), `hud.more` (citi… / more…), `hud.less`, `hud.measures` (MĒRĪJUMI / MEASUREMENTS), `hud.allTable`, `hud.strobe`, `hud.readStrobe`, `hud.second`, `hud.second.on` / `.off`, `hud.slow`, `hud.slow.on` / `.off`, `hud.mode`, and every `gear.*` key K-01 uses.

- [ ] **Step 1: Write the failing tests** (`tests/projectile-hud-model.test.js`)

```js
test('full control, horizontal: h, v₀, Δt; more: mode, second ball, slow motion', () => {
  const rows = quantityRows(defaultSettings('horizontal'), { locked: new Set(), hidden: new Set(), study: null, lang: 'lv', t: lv });
  assert.deepEqual(rows.map((r) => [r.key, r.group, r.state]), [
    ['h', 'main', 'editable'], ['v0', 'main', 'editable'], ['dt', 'main', 'editable'],
    ['mode', 'more', 'editable'], ['second', 'more', 'editable'], ['slow', 'more', 'editable'],
  ]);
  const dt = rows.find((r) => r.key === 'dt');
  assert.deepEqual([dt.kind, dt.min, dt.max, dt.step, dt.valueText], ['range', 0.1, 2, 0.1, '0,2 s']);
  assert.equal(rows.find((r) => r.key === 'h').valueText, '20,0 m');
});
test('oblique has α; vertical v₀ is signed with ↑/↓', () => {
  const ob = quantityRows(defaultSettings('oblique'), { locked: new Set(), hidden: new Set(), study: null, lang: 'lv', t: lv });
  assert.ok(ob.some((r) => r.key === 'alpha' && r.valueText === '45°'));
  const up = quantityRows({ ...defaultSettings('vertical'), v0: 10 }, { locked: new Set(), hidden: new Set(), study: null, lang: 'lv', t: lv });
  const v = up.find((r) => r.key === 'v0');
  assert.deepEqual([v.min, v.max, v.valueText], [-30, 30, '10,0 m/s ↑']);
  const dn = quantityRows({ ...defaultSettings('vertical'), v0: -5 }, { locked: new Set(), hidden: new Set(), study: null, lang: 'lv', t: lv });
  assert.equal(dn.find((r) => r.key === 'v0').valueText, '5,0 m/s ↓');
});
test('studies: free fall h and Δt; horizontal has the second ball in the main group; no more group', () => {
  const free = STUDIES.find((x) => x.id === 'free');
  const rows = quantityRows(free.preset(defaultSettings()), { locked: new Set(), hidden: studyFixed(free, LOCKABLE), study: free, lang: 'lv', t: lv });
  assert.deepEqual(rows.map((r) => [r.key, r.state]), [['h', 'editable'], ['v0', 'fixed'], ['dt', 'editable']]);
  const hz = STUDIES.find((x) => x.id === 'horizontal');
  const hr = quantityRows(hz.preset(defaultSettings()), { locked: new Set(), hidden: studyFixed(hz, LOCKABLE), study: hz, lang: 'lv', t: lv });
  assert.ok(hr.every((r) => r.group === 'main'));
  assert.ok(hr.some((r) => r.key === 'second' && r.state === 'editable'));
});
test('a link lock shows locked (FIKS.)', () => {
  const rows = quantityRows(defaultSettings(), { locked: new Set(['h']), hidden: new Set(), study: null, lang: 'lv', t: lv });
  assert.equal(rows.find((r) => r.key === 'h').state, 'locked');
});
test('MĒRĪJUMI: x of the latest flash while running, t | x; y rows; one-sample run works', () => {
  const s = defaultSettings('horizontal');
  const run = simulateRun(s, { seed: 2, repeat: 1, noise: 0, traps: [] });
  const vm = measureVM({ settings: s, running: { run, simT: 0.45 }, lastRun: null, shown: null, shownModel: null, tables: [], shownKey: '', views: { table: true, strobe: true }, lang: 'lv', t: lv });
  assert.equal(vm.symbol, 'x');
  assert.equal(vm.live, true);
  assert.equal(vm.rows.length, Math.min(LIVE_ROWS, 3)); // flashes at 0; 0,2; 0,4 s
  assert.match(vm.rows[0].b, /^x = \d+,\d m; y = \d+,\d m$/);
  const one = { ...defaultSettings('vertical'), h: 1, v0: 0, dt: 2 };
  const r1 = simulateRun(one, { seed: 1, repeat: 1, noise: 0, traps: [] });
  const v1 = measureVM({ settings: one, running: null, lastRun: r1, shown: null, shownModel: null, tables: [], shownKey: '', views: { table: true, strobe: true }, lang: 'lv', t: lv });
  assert.equal(v1.symbol, 'y');
  assert.equal(v1.valueText, '1,0');
});
test('view=strobe&lock=1: no number, a note to read the strobe image', () => {
  const s = defaultSettings();
  const vm = measureVM({ settings: s, running: null, lastRun: null, shown: null, shownModel: null, tables: [], shownKey: '', views: { table: false, strobe: true }, lang: 'lv', t: lv });
  assert.equal(vm.valueText, '');
  assert.equal(vm.note, lv('hud.readStrobe'));
});
```
(`lv` = translator from `STRINGS.lv`, as in `tests/hud-model.test.js` for K-01. The free-fall study test assumes Task 6 has not changed `free.editable` — it already is `['h', 'dt']`.)

- [ ] **Step 2: Run** `npm test` — fail.
- [ ] **Step 3: Implement** `hud-model.js` and the i18n keys.
- [ ] **Step 4: Run** `npm test` — green (the i18n parity test must pass for the new keys).
- [ ] **Step 5: Commit** — `K-02 HUD models: LIELUMI rows and MĒRĪJUMI`.

---

### Task 5: The page on the HUD (remove the side panel)

**Files:**
- Modify: `projectile-motion.html`, `assets/projectile/main.js`
- Delete: `assets/projectile/panel.js` (and any test only for it)
- Modify if needed: `assets/projectile/i18n.js` (keys the wiring needs that Task 4 did not add)

**Interfaces:**
- Consumes: Task 2 `sceneBox`, `sceneLayout`, `drawScene`, `displayX`, `handleAnchors`, `valueFromPointer`; Task 4 `quantityRows`, `quantityState`, `measureVM`; shared `createQuantityList`, `createMeasureBox`, `createSettingsCorner`, `runSlotTop` (`assets/measure/hud.js`), `mountHeaderTools`, `mountTitleCells` (`assets/sim-core.js`), `legendScale` if K-01 uses it.
- Produces: the working page. `window.__pm` keeps `state`, `study`, `setSettings(next)` and adds `layout()`.

Build it by mirroring `rolling-ball.html` and `assets/rolling-ball/main.js` (read both fully first; K-01 is the reference for every HUD behaviour):
- `projectile-motion.html`: same structure as `rolling-ball.html` — `<body class="layout-hud">`, `viewport-fit=cover`, header with `#headTools`, `.drawing` with `#scene`, `#handles`, `#hudLeft`, `#hudRight`, `#runSlot`, `#notices`, `#titleSmall`, `#gear`; no `<aside class="controls">`. Keep `#picker` and `#bootMsg`. K-02 heading texts stay (KRITIENI UN SVIEDIENI, K-02).
- `main.js`: header (back to cards, study name and number) as today; `mountHeaderTools`, `mountTitleCells` in `#titleSmall` (shown only when the drawing is ≥ 900 × 560 px); `createQuantityList(hudLeft, …)` with `onQuantity(key, v)` → `withH`, `withV0`, `withAlpha`, `withDt`, `withSecond`, `withMode`, `withSlow`, all through `applySettings` (lock conflicts as today); `createMeasureBox(hudRight, …)` with open table / select table / open strobe; `createSettingsCorner(#gear, …)` with `onDrawScale` and `onTextScale` re-render and `gear.setDrawFit(lay.fill)`; run button in `#runSlot` (first label `START_KEY`, then `run.repeatN`), placed with `runSlotTop(lay.groundY, runSlot.offsetHeight)`, notices under it (`--notices-top`); `layout()` = `sceneLayout(w, h, drag ? drag.box : sceneBox(s), { drawScale, avoid: drag ? drag.avoid : measuresBox() })` where `measuresBox()` reads `#hudRight` like K-01; `drawScene` gets `avoidRects` for `#hudLeft`, `#hudRight` and `#runSlot` (drawing px); handles show only symbols (`h`, `v₀`, `α`) with `labelClass: 'sym'` / `'sym locked'` like K-01 and no values; the live ball position is `{ ...run.posAt(t), rising: run.risingAt(t) }` (before a run: `{ x: 0, y: h, rising: v0 > 0 }`); MĒRĪJUMI tiny table hidden when it would reach below 45 % of the drawing (K-01 `mini-off`).
- The strobe overlay keeps its mērrežģis checkbox (`grid` setting); the drawing grid is always on.
- `flightNotice` only for `'none'`.

- [ ] **Step 1: Implement** the page and `main.js`; delete `panel.js`.
- [ ] **Step 2: Run** `npm test` — green.
- [ ] **Step 3: Browser checks** (Playwright MCP: ToolSearch `select:mcp__plugin_playwright_playwright__browser_navigate,mcp__plugin_playwright_playwright__browser_resize,mcp__plugin_playwright_playwright__browser_evaluate,mcp__plugin_playwright_playwright__browser_take_screenshot,mcp__plugin_playwright_playwright__browser_click,mcp__plugin_playwright_playwright__browser_console_messages`; serve the worktree with `python3 -m http.server <fresh port>` from the worktree root — use a port nobody used before in this session (e.g. 8801+), because the browser caches modules; screenshots only under `/Users/minim4/dev/sites/fizika_v3/.playwright-mcp/` named `k02_*`, and look at each with Read):
  1. 390×844, 844×390, 1280×800, 1920×1080 — `?full=1` in all three modes and `?study=free|vertical|horizontal|oblique`: ground at 61,8 %, drawing centred (measure from `__pm.layout()`), LIELUMI, MĒRĪJUMI, run button, notices never overlap each other; no horizontal page scroll; grid numbers not under panels or the button.
  2. Open h, drag and press − / + 20 times: the slider node is the same and does not move; the drawing and the grid step follow h.
  3. ⚙ ZĪMĒJUMS 60 / 100 / 150 %: centred, grid lines split or merge (labelled step changes), numbers readable.
  4. Vertical v₀ = +12 m/s from h = 20 m: the ball rises on the left tape, moves to the right tape at the apex, falls there; strobe view shows ↑ and ↓ tapes; v₀ = 0 → one ↓ tape.
  5. Δt = 2 s with h = 1 m: one flash, no notice; table and strobe open.
  6. Horizontal with the second ball; oblique from h = 0; `?scale=table&h=80` shows the two precise notices.
  7. Run 2× → MĒRĪJUMI mini table; open the data table (KOPĒT / CSV) and the strobe view (PNG export works).
  8. Consoles clean (favicon 404 allowed). K-01 `rolling-ball.html?study=a` still looks and works as before.
- [ ] **Step 4: Commit** — `K-02 page on the HUD: LIELUMI, MĒRĪJUMI, ⚙, centred drawing; side panel removed`.

---

### Task 6: Studies, cards and texts without the table

**Files:**
- Modify: `assets/projectile/studies.js`, `assets/projectile/study-art.js`, `assets/projectile/i18n.js`, `index.html` (K-02 card picture only), `README.md` (K-02 link parameters)
- Test: `tests/projectile-studies.test.js`

**Interfaces / content:**
- `STUDIES` (metres, spec 5): `free` — `withV0(withMode(s, 'vertical'), 0)`, h 20, editable `['h', 'dt']`; `vertical` — v₀ 10, h 20, editable `['v0', 'h', 'dt']`; `horizontal` — v₀ 10, h 20, editable `['v0', 'h', 'dt', 'second']`; `oblique` — h 0, v₀ 15, α 45, editable `['v0', 'alpha', 'h', 'dt']`. No `onTable`/`withScale`. Comment: “Pētījumi (spec. sviedieni-izkartojums 5): visi metros.”
- i18n: `study.oblique.changes` LV `v₀, α, h, Δt`, EN `v₀, α, h, Δt`; check every K-02 string for “gald”, “table” (meaning lab table), “torn”, “tower”, “cm” and fix them (e.g. hints that mention the table edge); `studies.lead` must stay true.
- `study-art.js`: no `table(...)`; each card shows a launch point at height h (small mark) with an h dimension line on the left (like the K-01 card 01 h line), the ground, and the ball positions; the vertical card shows two tapes with ↑ and ↓ above them; the oblique card starts on the ground.
- `index.html`: in the K-02 card SVG replace the table (`<!-- Table -->` rect and two legs) by an h dimension line (vertical line with two short 45° ticks) from the ground to the launch height; keep colours and size.
- `README.md` K-02 parameter table: remove `scale`; `h` 0–50 m (step 0,5), `v0` up to 30 m/s (vertical −30…30), `dt` 0,1–2 s step 0,1; note that `scale` no longer works and shows a notice; fix the example links that used `scale` or cm values.

- [ ] **Step 1: Write the failing tests** (`tests/projectile-studies.test.js`, adapt existing)

```js
test('studies are in metres with the spec presets', () => {
  const p = (id) => STUDIES.find((x) => x.id === id).preset(defaultSettings());
  assert.deepEqual([p('free').mode, p('free').h, p('free').v0], ['vertical', 20, 0]);
  assert.deepEqual([p('vertical').h, p('vertical').v0], [20, 10]);
  assert.deepEqual([p('horizontal').mode, p('horizontal').h, p('horizontal').v0], ['horizontal', 20, 10]);
  assert.deepEqual([p('oblique').mode, p('oblique').h, p('oblique').v0, p('oblique').alphaDeg], ['oblique', 0, 15, 45]);
  assert.deepEqual(STUDIES.find((x) => x.id === 'oblique').editable, ['v0', 'alpha', 'h', 'dt']);
});
test('no K-02 text mentions the table or the tower', () => {
  for (const lang of ['lv', 'en']) {
    for (const [k, v] of Object.entries(STRINGS[lang])) {
      assert.ok(!/gald|torn|\btower\b|\bon the table\b|lab table/i.test(v), `${lang} ${k}: ${v}`);
    }
  }
});
```
(If a legitimate key such as `results.table` = “DATU TABULA” / “DATA TABLE” trips the EN pattern, keep the pattern as written — it only matches “tower”, “on the table” and “lab table” in English.)

- [ ] **Step 2: Run** `npm test` — fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` — green; open `projectile-motion.html` (cards) and `index.html` in the browser at 390×844 and 1280×800 and look at the cards (screenshots `k02_cards_*`).
- [ ] **Step 5: Commit** — `K-02 studies in metres; cards, index card and README without the table`.

---

## Self-review notes (controller)

- Spec 1 (one metre scale, link notice) → Task 1; spec 2.1–2.6 (drawing, tapes, centring, grid) → Tasks 2–3, wiring in Task 5; spec 3 (LIELUMI) → Task 4 + 5; spec 4 (MĒRĪJUMI) → Task 4 + 5; spec 5 (studies, cards) → Task 6; spec 6 (notices) → Task 1 + 5.
- Spec 2.3 says the width runs “to the farthest landing point”; the K-02 spec 2.1 rule that the drawing edge must not reveal the range stays in force, so the box is the rounded-up, α-independent reach (Task 2). Ruling recorded here.
