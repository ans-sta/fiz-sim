import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sceneLayout, ballCenter, ballDraw, handleAnchors, valueFromPointer, headroomCm, MARGIN, GROUND, ABOVE_PX, GROOVE_PX } from '../assets/rolling-ball/scene.js';
import { defaultSettings, derive, withAlpha, withLevel } from '../assets/rolling-ball/model.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b}`);

test('the ground (table line) is at 61.8 % of the drawing height, the low end sits on it', () => {
  for (const [w, h] of [[800, 400], [390, 780], [1920, 1000]]) {
    const lay = sceneLayout(w, h, { L: 80, alphaRad: 0.04 });
    assert.equal(lay.tableY, Math.round(h * GROUND));
    assert.equal(lay.low.y, lay.tableY - GROOVE_PX);
  }
  assert.equal(GROUND, 0.618);
});

test('a flat groove fits the width and is centred horizontally', () => {
  const s = defaultSettings();
  const d = derive(s);
  const lay = sceneLayout(800, 600, { L: s.L, alphaRad: d.alphaRad });
  close(lay.low.x - lay.high.x, 800 - MARGIN.left - MARGIN.right, 1e-6);
  close((lay.high.x + lay.low.x) / 2, 400, 1e-6);
  close(lay.low.y - lay.high.y, s.L * Math.sin(d.alphaRad) * lay.s, 1e-9);
});

test('a steep groove fits between the top reserve and the ground, with room above for the dimension line', () => {
  const geo = { L: 80, alphaRad: (15 * Math.PI) / 180, above: 5 };
  for (const top of [60, 100]) {
    const lay = sceneLayout(844, 340, geo, geo, { topReserve: top });
    close(lay.high.y - geo.above * lay.s - ABOVE_PX, top, 1e-6, `top ${top}`);
    close((lay.high.x + lay.low.x) / 2, 422, 1e-6);
  }
  assert.ok(sceneLayout(844, 340, geo, geo, { topReserve: 100 }).s < sceneLayout(844, 340, geo, geo, { topReserve: 60 }).s);
  // paneļi gandrīz līdz zemei: renīte tik un tā dabū vismaz 40 px augstuma
  const squeezed = sceneLayout(844, 340, geo, geo, { topReserve: 190 });
  close(squeezed.s * (80 * Math.sin(geo.alphaRad) + 5), 40, 1e-6);
});

test('the drawing scale multiplies the fitted scale; the ground does not move', () => {
  const geo = { L: 80, alphaRad: 0.1 };
  const a = sceneLayout(900, 600, geo, geo, { topReserve: 100 });
  const b = sceneLayout(900, 600, geo, geo, { topReserve: 100, drawScale: 0.6 });
  const c = sceneLayout(900, 600, geo, geo, { topReserve: 100, drawScale: 1.5 });
  close(b.s, a.s * 0.6, 1e-9);
  close(c.s, a.s * 1.5, 1e-9);
  assert.equal(b.tableY, a.tableY);
  close((c.high.x + c.low.x) / 2, 450, 1e-6);
});

test('headroom above the groove: 5 cm, or more for a big ball drawn twice its size', () => {
  const d16 = derive(defaultSettings());
  assert.equal(headroomCm(d16), 5);
  const d40 = derive({ ...defaultSettings(), ball: 'wood40' });
  assert.ok(headroomCm(d40) > 5);
  close(headroomCm(d40), 2 * (d40.rEff + d40.r) + 0.8, 1e-9);
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
  assert.equal(drag.low.y, lay80.low.y);
});

test('scale is capped at 60 px/cm', () => {
  assert.equal(sceneLayout(4000, 3000, { L: 50, alphaRad: 0.05 }).s, 60);
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

test('the ball is drawn twice its scaled radius (at least 6 px) and rests on the groove', () => {
  const s = defaultSettings();
  const d = derive(s);
  const lay = sceneLayout(800, 600, { L: s.L, alphaRad: d.alphaRad });
  const b = ballDraw(lay, d);
  close(b.R, 2 * d.r * lay.s, 1e-9);
  close(b.lift, 2 * d.rEff * lay.s, 1e-9);
  const tiny = { ...lay, s: 2 };
  const bt = ballDraw(tiny, d);
  assert.equal(bt.R, 6);
  close(bt.lift, d.rEff * 2 * (6 / (d.r * 2)), 1e-9);
});

test('the x₀ handle sits on the drawn ball and still gives back x₀', () => {
  const s = { ...defaultSettings(), x0: 12 };
  const d = derive(s);
  const lay = sceneLayout(1000, 600, { L: s.L, alphaRad: d.alphaRad });
  const a = handleAnchors(lay, s, d);
  const p = lay.at(12);
  close(Math.hypot(a.x0.x - p.x, a.x0.y - p.y), ballDraw(lay, d).lift, 1e-9);
  close(valueFromPointer('x0', lay, a.x0), 12, 1e-6);
});

test('panels: the groove avoids each panel from below or from the side, whichever gives the larger drawing', () => {
  const geo = { L: 80, alphaRad: 0.0375, above: 5 };
  // telefons ainavā, pilnā kontrole: LIELUMI garš, MĒRĪJUMI īss → renīte pa labi no LIELUMI
  const panels = { left: { right: 190, bottom: 150 }, right: { left: 720, bottom: 58 } };
  const lay = sceneLayout(830, 347, geo, geo, { panels });
  const below = sceneLayout(830, 347, geo, geo, { topReserve: 162 });
  assert.ok(lay.s > below.s);
  assert.ok(lay.high.x - MARGIN.left >= 190 + 12 - 1e-6, 'right of LIELUMI');
  assert.ok(lay.high.y - geo.above * lay.s - ABOVE_PX >= 58 + 12 - 1e-6, 'below MĒRĪJUMI');
  // plats ekrāns: zem abiem paneļiem ir vairāk vietas → kā ar topReserve
  const wide = sceneLayout(1258, 739, geo, geo, { panels: { left: { right: 186, bottom: 94 }, right: { left: 1140, bottom: 57 } } });
  const ref = sceneLayout(1258, 739, geo, geo, { topReserve: 106 });
  assert.equal(wide.s, ref.s);
  assert.equal(wide.high.x, ref.high.x);
  // MĒRĪJUMI garš (3. līmenis ar tabuliņu) → renīte pa kreisi no tā
  const tall = sceneLayout(830, 347, geo, geo, { panels: { left: { right: 190, bottom: 60 }, right: { left: 600, bottom: 190 } } });
  assert.ok(tall.low.x + MARGIN.right <= 600 - 12 + 1e-6, 'left of MĒRĪJUMI');
});

test('a big drawn ball gets room at both ends; the h dimension line clears it', () => {
  const d = derive({ ...defaultSettings(), ball: 'wood40' });
  const geo = { L: 80, alphaRad: d.alphaRad, above: headroomCm(d), ballCm: 2 * d.r };
  const lay = sceneLayout(1898, 1006, geo, geo, { topReserve: 140 });
  const R = ballDraw(lay, d).R;
  assert.ok(lay.high.x - R - 34 >= -1e-6, 'ball, h line and its label inside on the left');
  assert.ok(lay.low.x + R + 12 <= 1898 + 1e-6, 'ball at the end inside on the right');
  const a = handleAnchors(lay, defaultSettings(), d);
  assert.ok(lay.high.x - a.h.x >= R + 10 - 1e-9, 'h handle is not under the ball');
  // mazai lodītei malas paliek MARGIN
  const small = derive(defaultSettings());
  const g2 = { L: 80, alphaRad: small.alphaRad, ballCm: 2 * small.r };
  const l2 = sceneLayout(600, 600, g2);
  close(l2.high.x, MARGIN.left, 1e-6);
});
