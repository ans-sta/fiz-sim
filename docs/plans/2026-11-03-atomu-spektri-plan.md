# A-01 Atomu spektri — būves plāns

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One page, `atomic-spectra.html`, in the fiz-sim set. Four atoms (H, Na, Hg, He) and two modes, absorption and emission. Every photon can be followed from the column to the atom, through the level jump, to the line in the spectrum.

**Architecture:**
- Pure data lives in `atoms.js`: levels relative to ionisation, allowed lines with their NIST A values.
- Pure physics lives in `model.js`: λ ↔ ΔE, the absorption test, ionisation, the weighted cascade, the column axis, snapping and the white-light stream.
- A timeline lives in `sim.js`. It holds the photons in flight and the electron state, and returns events.
- Canvas layout and drawing live in `scene.js`.
- DOM wiring lives in `main.js`, following the E-01 pattern:
  - a bar under the header;
  - the ⚙ from `createSettingsCorner`;
  - the “i” dialog from `openOverlay`;
  - a `#live` status region;
  - `#sceneDesc`.
- Page-specific CSS goes in its own file, `assets/atoms/atoms.css`, because another session is editing `sim-common.css`.

**Tech Stack:** vanilla ES modules, canvas 2D, `node --test`, Playwright + axe for checks. No build step, GitHub Pages.

**Spec:** `docs/plans/2026-11-03-atomu-spektri.md`. Read it fully before starting. § numbers below refer to it.

## Global Constraints

- **Physical constants:** hc = 1239.84 eV·nm. λ is always shown as hc/ΔE (vacuum). Level E is relative to ionisation (negative). H: Eₙ = −13.6/n² eV.
- **Readout precision:** level E to 2 decimals, ΔE to 3 decimals, λ to 1 decimal (whole nm above 1000). Decimal comma in LV, point in EN, via `formatNumber`.
- **Tolerance:** ±2 nm for 380–750 nm, ±0.3 % of λ outside that. Snap on release within 8 px (mouse) or 12 px (touch).
- **Column axis:**
  - IR 750–10 000 nm (log) at p 0–0.15.
  - Visible 750→380 nm (linear) at p 0.15–0.85.
  - UV 380→uvMin (log) at p 0.85–1.
  - uvMin is H 90, Na 200, Hg 180, He 50 nm.
  - p = 0 is the bottom of the column. Violet is at the top.
- **Intensity steps:** 1 · 2 · 5 · 10 · 20 photons per second, starting at 5. Every 4th or 5th white-light photon (chosen at random) is aimed at something the atom can absorb.
- **Start levels:** H n=2, Na 3s, Hg 6³P₁, He 2³P. The first atom shown is H.
- **Text (LV and EN with identical keys):**
  - Typography: “ ” quotes, — with spaces, – in ranges, …. No straight quotes and no emojis.
  - Avoid the “ne šis, bet šis” construction.
  - The word “šķipsna” is never used.
- **Accessibility (WCAG 2.2 AA):**
  - Use native controls: buttons with `aria-pressed`, and a native `input type=range` for the vertical slider (APG Slider).
  - Text contrast ≥ 4.5:1; lines and ticks ≥ 3:1.
  - Respect `prefers-reduced-motion`: the slide is instant and photons fly faster.
  - Nothing flashes more than 3 times a second.
  - Everything is reachable by keyboard.
  - At 320 px wide: no horizontal scroll.
  - ⚙: `createSettingsCorner({ drawing })`, which brings zoom and the ⌘ keys.
- **Do not touch:** S-03 files or other sims. `sim-common.css` only if unavoidable, and then only additions.

## Review Focus

1. **Rapid repeated shots** (holding Enter, many releases) while photons are in flight. Expected: smooth, at most 40 photons in flight; the oldest pass-through photons are dropped first. → test in Task 3.
2. **Changing atom or mode in the middle of a flight or cascade.** Expected: in-flight photons and pending timers are cleared; no stale event (e.g. “emitted” for the old atom). → test in Task 3.
3. **Resize, phone rotation, or a BURTI/ZĪMĒJUMS change during the slide animation.** Expected: the slider, level buttons and canvas stay aligned. → manual check in Task 6, plus a layout test in Task 4 (layout is a pure function of w, h, slide).
4. **Minutes at 20 photons per second.** Expected: memory bounded. Stripes and lines are stored in λ bins, not per photon. → test in Task 3.
5. **A high start level** (H n=6, He 4¹P, Hg 6D), where visible light ionises. Expected: white light ionises instead of passing, the edge marker lies within the column, and hints show the continuum edge. → test in Task 2.

---

### Task 1: Atom data

**Files:**
- Create: `assets/atoms/atoms.js`
- Test: `tests/atoms-data.test.js`

**Interfaces:**
- Produces:
  - `HC = 1239.84`.
  - `ATOM_IDS = ['H','Na','Hg','He']`.
  - `ATOMS[id]` is an object with these fields:
    - `{ id, ion, uvMin, start, columns, levels, lines, axisBreak, inner }`
    - `ion`: ionisation energy from the ground state, in eV.
    - `columns`: `[{ id, label }]`. H has a single column; Na has `s p d`; Hg has `1S 1P 1D 3S 3P 3D`; He has `1S 1P 1D 3S 3P 3D`, grouped para | ortho.
    - `levels`: `[{ id, label, E, col, metastable? }]`.
      - `E` is in eV relative to ionisation.
      - `label` is display text, for example `'n = 2'`, `'3p'`, `'6³P₁'`, `'2¹P'`.
      - Hg `'6D'` has `col: '1D+3D'`.
      - H also has a level `{ id: 'inf', label: '∞', E: 0 }`. It is shown as a label only; no line goes to it.
    - `lines`: `[{ up, lo, A }]`, the allowed transitions. `A` is in s⁻¹.
    - `axisBreak`: `{ from: -24, to: -5 }` for He, otherwise `null`.
    - `inner`: for the drawing (§ 5.2):
      - H: `{ rest: 0 }`
      - He: `{ rest: 1 }` (the static 1s electron)
      - Na: `{ shells: [2, 8] }`
      - Hg: `{ core: 78, rest: 1 }`

- [ ] **Step 1: Fetch the NIST A values.**
  - Use the NIST ASD lines form, which returns tab-separated data with Aki for H I, Na I, Hg I and He I, for the transitions listed in spec § 4.2–4.5.
  - Merged levels (Na 3p, 4p, 5p; Hg 6D; He triplet P and D): take E as the (2J+1)-weighted mean of the sublevels, from the NIST level files in the scratchpad (`scratchpad/nist/*.tsv`).
  - For the A of a merged line, use the sum over upper sublevels of g_k·A_ki, divided by the total g of the upper level.
  - Write the numbers into `atoms.js` with a comment naming the source and the date.

- [ ] **Step 2: Write the failing test.** `tests/atoms-data.test.js`:
  - `ATOM_IDS` order is `['H','Na','Hg','He']`.
  - **H:** level E = −13.6/n² for n=1…6.
  - **H:** there are 15 lines.
  - **H:** λ(3→2) ≈ 656.4 ± 0.1. λ(4→2) ≈ 486.2. λ(5→2) ≈ 434.1. λ(6→2) ≈ 410.2. λ(6→5) ≈ 7459.1 ± 1.
  - **Na:** λ(3p→3s) ≈ 589.4 ± 0.1, λ(5p→3s) ≈ 285.4, λ(4d→3p) ≈ 568.8. 21 lines.
  - **Hg:** λ(7³S→6³P₀/₁/₂) ≈ 404.8 / 436.0 / 546.2 ± 0.1. λ(6D→6¹P) ≈ 577.9. λ(6³P₁→6¹S) ≈ 253.7.
  - **Hg:** 6³P₀ and 6³P₂ are metastable, and neither has a line to 6¹S.
  - **He:** λ(3³D→2³P) ≈ 587.7, λ(2¹P→1¹S) ≈ 58.4.
  - **He:** no line joins a para level with an ortho level.
  - **He:** 2³S and 2¹S are metastable.
  - **He:** exactly 6 lines have λ > 10 000 nm.
  - **For every atom:**
    - each line's `up` and `lo` exist;
    - E(up) > E(lo);
    - A > 0;
    - `start` is a level id;
    - every level that is neither the ground nor metastable has at least one downward line;
    - every λ (except He > 10 µm and Na 5p↔4d) lies in [uvMin, 10 000].
  - **Branching sanity:**
    - He 2¹P → 1¹S gets > 99 % of the A sum.
    - Hg 7³S → 6³P₀ / ₁ / ₂ gets 16 / 44 / 39 % (±3).

- [ ] **Step 3: Run and verify it fails.** Run `node --test tests/atoms-data.test.js`. Expected: FAIL (module missing).

- [ ] **Step 4: Implement `atoms.js`** with the data from Step 1. H levels are computed from the formula, not typed in.

- [ ] **Step 5: Run and verify it passes.** Run `node --test tests/atoms-data.test.js`. Expected: PASS.

- [ ] **Step 6: Commit** (locally, files of this task only).

### Task 2: Physics model

**Files:**
- Create: `assets/atoms/model.js`
- Test: `tests/atoms-model.test.js`

**Interfaces:**
- Consumes: `ATOMS`, `HC`.
- Produces:
  - `lambdaOf(atom, line) → nm`
  - `levelOf(atom, id)`
  - `linesUp(atom, levelId) → [{ line, to, λ }]`
  - `linesDown(atom, levelId) → [{ line, to, λ }]`
  - `toleranceNm(λ)`
  - `edgeNm(atom, levelId) → HC/|E|` (`Infinity` if E = 0)
  - `absorb(atom, levelId, λ) → { kind: 'line', line, to, λ } | { kind: 'ionise' } | { kind: 'pass' }`
    - The nearest line within tolerance wins.
    - Otherwise, if HC/λ > |E|, the result is `'ionise'`.
    - Otherwise `'pass'`.
  - `cascadeStep(atom, levelId, rng) → { line, to, λ } | null`
    - The choice is weighted by A.
    - The result is `null` at the ground level or a metastable level.
  - `isGround(atom, id)`, `isMetastable(atom, id)`
  - `columnAxis(atom) → { uvMin }`
  - `lambdaToPos(axis, λ) → p ∈ [0,1]`; `posToLambda(axis, p)`.
    - Zones as in Global Constraints.
    - λ > 10 000 is clamped to p = 0 and reported as off-scale by `offScale(λ)`.
  - `hintTargets(atom, levelId) → [{ λ, kind: 'line' | 'edge' }]`: the absorbable lines plus the ionisation edge, if it lies in [uvMin, 10 000].
  - `snap(axis, λ, targets, maxDp) → λ'`: the nearest target within maxDp in p-units, otherwise λ unchanged.
  - `INTENSITIES = [1,2,5,10,20]`, `DEFAULT_INTENSITY = 5`.
  - `timing(rate, reducedMotion) → { flight, hold, pass }` in seconds.
    - Base values: flight 1.2, hold 1.0, pass 0.8.
    - Multiplied by `Math.min(1, 5 / rate)`.
    - With reduced motion, multiplied again by 0.5.
  - `createWhiteLight(rng) → { next(atom, levelId) → λ }`. It aims every 4th or 5th photon at random:
    - at a visible line from `hintTargets`;
    - or, if the edge is in the visible band, at a λ in [380, edge];
    - otherwise it is uniform over 380–750.

- [ ] **Step 1: Write the failing tests.** Use a seeded rng helper (mulberry32), which already exists in `assets/measure/rng.js`; grep for it first.
  - **Absorption:**
    - `absorb(H,'2',486.2)` gives the line to `'4'`.
    - `absorb(H,'2',488.1)` → `'line'` (inside ±2 nm).
    - `absorb(H,'2',489.3)` → `'pass'`.
    - `absorb(H,'1',486.2)` → `'pass'`.
    - `absorb(H,'1',121.6)` → line to `'2'`.
    - `absorb(H,'2',300)` → `'ionise'` (edge 364.7).
    - `absorb(H,'6',500)` → `'ionise'`.
    - `absorb(Na,'3s',589.4)` → line to `'3p'`.
  - **Edge:** `edgeNm(H,'2')` ≈ 364.7. `edgeNm(Na,'3s')` ≈ 241.3.
  - **Cascade:** `cascadeStep` from Hg 7³S over 10 000 runs gives 16 / 44 / 39 % ± 3. From He 2³S → null. From H n=1 → null.
  - **Axis:**
    - `lambdaToPos` is monotone decreasing in λ;
    - p(750) = 0.15, p(380) = 0.85, p(uvMin) = 1, p(10 000) = 0;
    - `posToLambda` inverts it within 1e-6.
  - **Snap:** `snap` to 656.4 from 650 with a maxDp that covers it; no snap when outside.
  - **White light:**
    - in 1000 photons for H n=2, 18–27 % are within ±0.1 nm of a Balmer line;
    - for H n=1, all photons are uniform over 380–750, and none is absorbed by `absorb`;
    - for H n=3 (edge 820.5 nm), aimed photons fall in [380, 750] and `absorb` gives `'ionise'`.
  - **Timing:** `timing(20)`'s flight equals 0.25 × `timing(5)`'s flight.

- [ ] **Step 2: Run and verify they fail.**

- [ ] **Step 3: Implement `model.js`.** Pure functions, no DOM.

- [ ] **Step 4: Run and verify they pass.** Then run the full `npm test`.

- [ ] **Step 5: Commit.**

### Task 3: Timeline (photons and electron)

**Files:**
- Create: `assets/atoms/sim.js`
- Test: `tests/atoms-sim.test.js`

**Interfaces:**
- Consumes: Task 2.
- Produces: `createSim({ atomId = 'H', mode = 'absorb', rng, reducedMotion = false })` returning `sim` with:
  - `sim.state`: `{ atomId, mode, start, level, ionised, white, rate, photons, stripes, lines, counts: { shot, absorbed }, arrow }`
    - `photons`: `[{ id, λ, kind: 'in' | 'pass' | 'reemit' | 'emit' | 'free', t, dur, dirY }]`
    - `stripes`: `Map<binKey, λ>` (absorption column)
    - `lines`: `Map<binKey, λ>` (emission column), with bins of 0.5 nm or 0.1 % of λ
    - `arrow`: `{ from, to, λ, up } | null`
  - `sim.setAtom(id)` and `sim.setMode(m)`: these clear photons, timers, stripes and lines, and reset the level to `start` (absorb) or the ground (emit).
  - `sim.setLevel(id)`:
    - in absorb mode it sets the start level, but only while idle;
    - in emit mode it either excites to a higher level (no photon, dashed arrow) or falls to a lower one, which calls `fall`.
  - `sim.shoot(λ)`: adds an `'in'` photon. If 40 photons are already in flight, it first drops the oldest `'pass'` photon.
  - `sim.fall(toId) → event`
  - `sim.cascade()`
  - `sim.setWhite(on)`, `sim.setRate(r)`, `sim.clear()`
  - `sim.step(dt) → events[]`. Each event is one of:
    - `{ type: 'absorbed', from, to, λ }`
    - `{ type: 'passed', λ }`
    - `{ type: 'ionised', λ }`
    - `{ type: 'returned' }`
    - `{ type: 'emitted', from, to, λ }`
    - `{ type: 'forbidden', from, to }`
    - `{ type: 'metastable', level }`
- Behaviour follows spec § 6 and § 7:
  - The outcome is decided when the photon arrives at the atom.
  - While the electron is not at the start level, or is ionised, incoming photons pass.
  - After `hold`, the electron returns to the start level and a `'reemit'` photon (same λ, `dirY` ±1) flies off.
  - In emit mode, a photon reaches the column after `flight` and then adds a line.
  - A cascade steps once per `hold` until `cascadeStep` returns null. At a metastable level, the next action resets the electron to the ground without a photon.

- [ ] **Step 1: Write the failing tests.** All of them use a seeded rng and fixed `dt` steps.
  - **H absorb, start 2:**
    - `shoot(486.2)`; step 1.3 s → one `'absorbed'` event (2→4), and a stripe near 486.2.
    - Step 1.1 s more → `'returned'` and one `'reemit'` photon.
  - **Pass:** `shoot(500)` → `'passed'`, and stripes stay empty.
  - **Busy:** `shoot(486.2)` twice, 0.1 s apart. The second photon passes, because the electron is busy.
  - **Ionise:** `shoot(300)` → `'ionised'` and a stripe.
  - **Emit, Hg:** `setLevel('7³S')` and then `setLevel('6³P₂')` → `'emitted'` with λ ≈ 546.2, and a line in `lines` after `flight`.
  - **Emit, forbidden:** `setLevel('6¹S')` from `7³S` → `'forbidden'`.
  - **Cascade:** He `cascade()` from the ground always ends at `1¹S`, `2³S` or `2¹S` within 30 s, and the last event is `'metastable'` or a final `'emitted'` to `1¹S`.
  - **Review Focus 1:** 100 `shoot` calls in one frame → `photons.length` ≤ 40, and no throw.
  - **Review Focus 2:** after `shoot`, call `setAtom('Na')` mid-flight → stepping 3 s yields no events, and the photons are empty.
  - **Review Focus 4:** white light at 20 f/s for a simulated 600 s → `stripes.size` ≤ 2000, and `photons.length` ≤ 40.
  - **Counts:** `counts.shot` and `counts.absorbed` increase correctly. `clear()` resets the stripes, lines and counts.

- [ ] **Step 2: Run and verify they fail.**

- [ ] **Step 3: Implement `sim.js`.**

- [ ] **Step 4: Run and verify they pass.** Then run the full `npm test`.

- [ ] **Step 5: Commit.**

### Task 4: Scene layout and drawing

**Files:**
- Create: `assets/atoms/scene.js`
- Test: `tests/atoms-scene.test.js` (layout only)

**Interfaces:**
- Consumes: Tasks 1–3, plus `spectralRGB`, `hexRGB` and `ensureContrast` from `assets/spectrum/model.js`. Reuse these; do not copy them.
- Produces:
  - `sceneLayout(w, h, { slide, drawScale, portrait }) → { column, atom, diagram, offX }`. Each rect is `{ x, y, w, h }`.
    - `slide` runs from 0 (absorption) to 1 (emission). As it goes, the absorption column moves out to the left and the emission column comes in from the right, and atom + diagram shift by `offX`.
    - `portrait` means w < h and w < 600. In that case the column is a 44–56 px strip at the edge, and the atom sits above the diagram.
  - `levelYs(atom, rect) → Map<id, y>`. Energy is to scale; He uses the axis break.
  - `spreadLabels(items, minGap) → items` with `labelY`, keeping the order.
  - `columnY(rect, p)` = `rect.y + rect.h·(1 − p)`.
  - `drawScene(ctx, lay, view, pal)`, where `view` is `{ atom, sim.state, axis, hints, showHints, edge, mode }`. It draws:
    - both columns: the rainbow with stripes, and the black one with lines;
    - the UV and IR zone labels, and off-scale markers;
    - the atom, following § 5.2;
    - the diagram, following § 5.3, with columns, labels and the arrow;
    - the photons as wave packets, following § 5.1;
    - the edge as a dashed tick.
  - `pal` is read from CSS tokens (`--field`, `--sheet`, `--ink`, `--ink-dim`, `--hairline`, `--accent`), the same as in E-01.
  - Line and tick colours pass `ensureContrast` at ≥ 3:1 against their background.

- [ ] **Step 1: Write the failing tests.**
  - `sceneLayout(1280, 700, { slide: 0 })`: the column is left of the atom, and the atom is left of the diagram.
  - `slide: 1`: the column is right of the diagram.
  - `slide: 0.5`: both columns are partly off-screen. Every rect has finite numbers.
  - Portrait (375 × 700): the column w ≤ 56, and the atom is above the diagram.
  - `levelYs(H)`: E increases upward (smaller y). The y of n=2 lies between n=1 and n=3, in proportion to E.
  - `levelYs(He)`: the ground is near the bottom; the excited levels use ≥ 70 % of the height.
  - `spreadLabels`: a gap ≥ minGap; order is preserved.
  - Every layout has width ≥ 0 at 320 × 480.

- [ ] **Step 2: Run and verify they fail.**

- [ ] **Step 3: Implement `scene.js`.**

- [ ] **Step 4: Run and verify they pass.**

- [ ] **Step 5: Commit.**

### Task 5: Page, texts and wiring

**Files:**
- Create: `atomic-spectra.html`, `assets/atoms/i18n.js`, `assets/atoms/main.js`, `assets/atoms/atoms.css`
- Test: `tests/atoms-i18n.test.js`, modelled on `tests/emotor-i18n.test.js`. It checks that LV and EN keys are equal, that every used key exists (in `main.js` and the html `data-i18n`), and typography.

**Interfaces:**
- Consumes: Tasks 1–4, `sim-core.js` (`createI18n`, `createTheme`, `mountHeaderTools`, `mountTitleCells`, `setupCanvas`, `startLoop`), `createSettingsCorner`, `openOverlay`, `createNotices`, `formatNumber`.
- Page structure follows `motor-generator.html`:
  - skip link, header (← SARAKSTS, ATOMU SPEKTRI, A-01), `main#main`, bar `.m01-bar`;
  - `#drawing` holding the `canvas#scene` (`aria-describedby="sceneDesc"`);
  - the vertical `input#lam` type=range, min 0, max 1000;
  - `#levels`, a div of level buttons positioned over the diagram;
  - `#readout`, `#gear`, `#sceneDesc`, `#live` (`role="status"`).
- Bar groups, in order (spec § 8):
  1. ATOMS: H · Na · Hg · He (`aria-pressed`).
  2. ABSORBCIJA · STAROŠANA.
  3. ☼ BALTĀ GAISMA (toggle) and INTENSITĀTE − n f/s + (absorption only); or ↯ NEJAUŠA KASKĀDE (emission only).
  4. NOTĪRĪT, ATZĪMES (toggle), i.
- **Slider:**
  - It is native and vertical: `writing-mode: vertical-lr; direction: rtl`, placed along the column rect.
  - `pointerup` snaps and shoots.
  - Arrow keys step 1 nm in the visible and 0.1 % λ in UV/IR. PageUp/PageDown jump to the next hint, or 10 nm if hints are off. Enter or Space shoots.
  - `aria-valuetext` is “486,2 nm, zili zaļa”.
- **Level buttons:**
  - Each has its label, its energy and an `aria-label` that names the level and says whether the electron is there.
  - Clicking calls `sim.setLevel`.
- **Mode switch:** animates `slide` over 0.5 s, or instantly with reduced motion.
- **Live messages:** each sim event → `say(…)`. During white light, messages are throttled to one every 2 s, with a summary such as “absorbēti 3 no 20”.
- **Readout** text, following spec § 8.
- **“i” dialog:** sections for absorption, emission, ionisation and simplifications (spec § 8 list).
- **Strings:** LV and EN, with `page.heading` ‘ATOMU SPEKTRI’ / ‘ATOMIC SPECTRA’ and topic ‘ATOMS UN VISUMS’ / ‘ATOM AND UNIVERSE’.

- [ ] **Step 1: Write the failing i18n test.**
- [ ] **Step 2: Run and verify it fails.**
- [ ] **Step 3: Implement the html, i18n, main and css.**
- [ ] **Step 4: Run and verify.**
  - `npm test` passes.
  - Serve on localhost.
  - Playwright: page loads without errors.
  - H n=2: shooting 486.2 gives a stripe.
  - Emission Hg: 7³S → 6³P₂ gives a green line.
  - Mode switch slides.
  - Screenshots at 1280 × 800 dark and light, 375 × 700, 844 × 390. Look at them and fix the drawing.
- [ ] **Step 5: Commit.**

### Task 6: Landing card, README, verification

**Files:**
- Modify: `index.html` (a card after E-01 with an inline SVG icon in the card palette, LV/EN strings in `TRANSLATIONS`), `README.md` (a row with 🟡 Review, plus a teacher line)
- Modify: `docs/plans/2026-11-03-atomu-spektri.md` (status line and § 11)

- [ ] **Step 1: Add the card and README row.** `npm test` passes.
- [ ] **Step 2: Run axe.** Tags wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa. Expected: 0 violations, on the page and on index.html, in these states:
  - dark and light themes;
  - absorption and emission;
  - each of the 4 atoms;
  - the “i” dialog open and the ⚙ open;
  - 320, 375, 568 × 320 and 1920;
  - EN.
- [ ] **Step 3: Check the keyboard.** The Tab order follows the bar, then the slider, then the levels. Enter shoots. Space toggles white light when focus is on its button. Esc closes the dialogs. The focus ring is visible.
- [ ] **Step 4: Check the layout.** At 320 px, with BURTI 200 %, and at zoom 200 % (640 × 400): no horizontal scroll and no clipped controls. With reduced motion, the slide is instant.
- [ ] **Step 5: Check Review Focus 3.** Resize during the slide → the slider and buttons stay aligned (compare their rects with the layout).
- [ ] **Step 6: Update the status file.** Commit locally. Push only after Ansis says so.
