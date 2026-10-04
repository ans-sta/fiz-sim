import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sceneLayout, ballRadiusPx, ballDraw, ballDrawCenter, handleAnchors, valueFromPointer, tapeSpacing,
  MARGIN, GROUND, ABOVE_PX, GROOVE_PX, PANEL_GAP, TOP_MARGIN,
} from '../assets/rolling-ball/scene.js';
import { defaultSettings, derive, withAlpha, withLevel } from '../assets/rolling-ball/model.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b}`);
const R16 = GROOVE_PX / 2; // 16 mm lodīte — tikpat augsta kā renīte

test('the ground (table line) is at 61.8 % of the drawing height, the low end sits on it', () => {
  for (const [w, h] of [[800, 400], [390, 780], [1920, 1000]]) {
    const lay = sceneLayout(w, h, { L: 80, alphaRad: 0.04 });
    assert.equal(lay.tableY, Math.round(h * GROUND));
    assert.equal(lay.low.y, lay.tableY - GROOVE_PX);
  }
  assert.equal(GROUND, 0.618);
});

test('a flat groove fits the full width and is centred horizontally', () => {
  const s = defaultSettings();
  const d = derive(s);
  const lay = sceneLayout(800, 600, { L: s.L, alphaRad: d.alphaRad });
  close(lay.low.x - lay.high.x, 800 - MARGIN.left - MARGIN.right, 1e-6);
  close((lay.high.x + lay.low.x) / 2, 400, 1e-6);
  close(lay.low.y - lay.high.y, s.L * Math.sin(d.alphaRad) * lay.s, 1e-9);
});

test('a steep groove fits between a small top margin and the ground, with room above for the dimension line', () => {
  const geo = { L: 80, alphaRad: (15 * Math.PI) / 180, ballR: R16 };
  const above = (l) => Math.max(5 * l.s, 2 * R16 + 0.8 * l.s) + ABOVE_PX; // L izmēru līnija virs vārtiem un lodītes
  const lay = sceneLayout(844, 340, geo);
  close(lay.high.y - above(lay), TOP_MARGIN, 1e-6, 'default top margin');
  for (const top of [60, 100]) {
    const l = sceneLayout(844, 340, geo, geo, { topReserve: top });
    close(l.high.y - above(l), top, 1e-6, `top ${top}`);
    close((l.high.x + l.low.x) / 2, 422, 1e-6);
  }
  // gandrīz līdz zemei: renīte tik un tā dabū vismaz 40 px augstuma
  const squeezed = sceneLayout(844, 340, geo, geo, { topReserve: 190 });
  const ls = 80 * Math.sin(geo.alphaRad);
  close(squeezed.s, Math.min(40 / (ls + 5), (40 - 2 * R16) / (ls + 0.8)), 1e-9);
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

test('fill: the drawing scale at which the construction exactly fills the width', () => {
  const flat = { L: 80, alphaRad: 0.04, ballR: R16 };
  close(sceneLayout(800, 600, flat).fill, 1, 1e-9, 'a flat groove already fills the width at 100 %');
  const steep = { L: 80, alphaRad: (15 * Math.PI) / 180, ballR: R16 };
  const lay = sceneLayout(1258, 500, steep);
  assert.ok(lay.fill > 1, 'a steep groove on a low screen is height-limited: there is room to grow');
  const big = sceneLayout(1258, 500, steep, steep, { drawScale: lay.fill });
  close(big.low.x + MARGIN.right - (big.high.x - MARGIN.left), 1258, 1e-6);
});

test('the drawn ball does not depend on the drawing scale: 16 mm = groove thickness, others in proportion, ≥ 4 px', () => {
  const d16 = derive(defaultSettings());
  assert.equal(ballRadiusPx(d16), R16);
  close(ballRadiusPx(derive({ ...defaultSettings(), ball: 'wood40' })), R16 * 4 / 1.6, 1e-9);
  close(ballRadiusPx(derive({ ...defaultSettings(), ball: 'steel25' })), R16 * 2.5 / 1.6, 1e-9);
  assert.equal(ballRadiusPx({ ball: { d: 0.5 } }), 4);
  assert.equal(ballDraw(d16).R, R16);
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

test('the drawn ball rests on the top edge of the groove (never over the ruler), at the start, midway and at the end', () => {
  for (const ball of ['steel16', 'wood40', 'steel25']) {
    const s = { ...defaultSettings(), ball };
    const d = derive(s);
    for (const [w, h] of [[376, 780], [1258, 739]]) {
      const lay = sceneLayout(w, h, { L: s.L, alphaRad: d.alphaRad, ballR: ballRadiusPx(d) });
      for (const x of [0, 35, s.L]) {
        const c = ballDrawCenter(lay, x, d);
        const p = lay.at(x);
        close(Math.hypot(c.x - p.x, c.y - p.y), ballRadiusPx(d), 1e-9, `${ball} ${w} x ${x}`);
        assert.ok(c.y < p.y, 'above the top edge');
        close(lay.along(c.x, c.y), x, 1e-9, 'the centre is at the data x');
      }
    }
  }
});

test('the x₀ handle sits on the drawn ball and still gives back x₀', () => {
  const s = { ...defaultSettings(), x0: 12 };
  const d = derive(s);
  const lay = sceneLayout(1000, 600, { L: s.L, alphaRad: d.alphaRad });
  const a = handleAnchors(lay, s, d);
  const p = lay.at(12);
  close(Math.hypot(a.x0.x - p.x, a.x0.y - p.y), ballRadiusPx(d), 1e-9);
  close(valueFromPointer('x0', lay, a.x0), 12, 1e-6);
});

test('a big ball gets room at both ends in px; the h dimension line clears it', () => {
  const d = derive({ ...defaultSettings(), ball: 'wood40' });
  const R = ballRadiusPx(d);
  for (const [w, h] of [[376, 780], [1898, 1006]]) {
    const lay = sceneLayout(w, h, { L: 80, alphaRad: d.alphaRad, ballR: R });
    assert.ok(lay.high.x - R - 34 >= -1e-6, `${w}: ball, h line and its label inside on the left`);
    assert.ok(lay.low.x + R + 12 <= w + 1e-6, `${w}: ball at the end inside on the right`);
    const a = handleAnchors(lay, defaultSettings(), d);
    assert.ok(lay.high.x - a.h.x >= R + 10 - 1e-9, 'h handle is not under the ball');
  }
});

// MĒRĪJUMI (labajā augšējā stūrī) jāapiet tikai tad, ja tas tiešām pārklātu renītes zemo galu; LIELUMI drīkst pārklāt.
test('MĒRĪJUMI is avoided only when it would cover the construction; LIELUMI is not avoided', () => {
  const geo = { L: 80, alphaRad: 0.0375, ballR: R16 };
  const free = sceneLayout(830, 347, geo);
  const far = sceneLayout(830, 347, geo, geo, { avoid: { left: 720, bottom: 58 } });
  assert.equal(far.s, free.s, 'a short box does not touch the groove: the full-width fit stays');
  assert.equal(far.high.x, free.high.x);
  const tall = { left: 600, bottom: 190 };
  const lay = sceneLayout(830, 347, geo, geo, { avoid: tall });
  const right = lay.low.x + MARGIN.right;
  const top = lay.high.y - 5 * lay.s - ABOVE_PX;
  assert.ok(right <= tall.left - PANEL_GAP + 1e-6 || top >= tall.bottom + PANEL_GAP - 1e-6, 'left of it or below it');
  assert.ok(lay.s < free.s);
});

test('tape numbers: spacing grows with the scale and with the legend size', () => {
  assert.equal(tapeSpacing(14, 1), 5);
  assert.equal(tapeSpacing(3.5, 1), 10);
  assert.equal(tapeSpacing(3.5, 1.5), 20);
  assert.equal(tapeSpacing(1, 1), 50);
  assert.equal(tapeSpacing(0.3, 1), 50);
});
