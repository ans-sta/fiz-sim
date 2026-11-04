import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ATOMS } from '../assets/atoms/atoms.js';
import { sceneLayout, levelYs, spreadLabels, columnY, levelGeometry, seriesSlots, nucleusLayout, absorbBand } from '../assets/atoms/scene.js';

const right = (r) => r.x + r.w;
const finite = (r) => ['x', 'y', 'w', 'h'].every((k) => Number.isFinite(r[k]));

test('absorption: column, then atom, then diagram from left to right', () => {
  const L = sceneLayout(1280, 700, { slide: 0 });
  assert.ok(right(L.column) <= L.atom.x, 'column left of atom');
  assert.ok(right(L.atom) <= L.diagram.x + 1, 'atom left of diagram');
  assert.ok(L.column.x >= 0);
  assert.equal(L.column, L.absCol);
});

test('emission: the column is right of the diagram', () => {
  const L = sceneLayout(1280, 700, { slide: 1 });
  assert.ok(right(L.diagram) <= L.column.x, 'diagram left of column');
  assert.ok(right(L.column) <= 1280);
  assert.equal(L.column, L.emCol);
});

test('half-way through the slide both columns are partly off-screen and every rect is finite', () => {
  const L = sceneLayout(1280, 700, { slide: 0.5 });
  assert.ok(L.absCol.x < 0, 'absorption column leaving left');
  assert.ok(right(L.emCol) > 1280, 'emission column entering right');
  for (const k of ['absCol', 'emCol', 'atom', 'diagram']) assert.ok(finite(L[k]), k);
});

test('portrait phone: a narrow column strip at the edge and the atom above the diagram', () => {
  const L = sceneLayout(375, 700, { slide: 0 });
  assert.ok(L.column.w <= 56);
  assert.ok(L.atom.y + L.atom.h <= L.diagram.y + 1, 'atom above diagram');
  assert.equal(L.portrait, true);
});

test('tiny screens still give non-negative sizes', () => {
  for (const slide of [0, 0.5, 1]) {
    const L = sceneLayout(320, 480, { slide });
    for (const k of ['absCol', 'emCol', 'atom', 'diagram']) assert.ok(L[k].w >= 0 && L[k].h >= 0, `${k} ${slide}`);
  }
});

test('levels: energy to scale above the axis break, higher energy higher on screen', () => {
  const rect = { x: 0, y: 0, w: 300, h: 600 };
  const y = levelYs(ATOMS.H, rect);
  assert.ok(y.get('2') < y.get('1') && y.get('3') < y.get('2'));
  const k = (y.get('2') - y.get('3')) / (y.get('2') - y.get('6'));
  const want = (13.6 / 9 - 3.4) / (13.6 / 36 - 3.4);
  assert.ok(Math.abs(k - want) < 1e-9, 'n = 2…6 to scale');
});

test('hydrogen and mercury: the long gap above the ground level is broken (Ansis 04.11.), so the upper levels get most of the height', () => {
  const rect = { x: 0, y: 100, w: 300, h: 500 };
  for (const [id, ground, low] of [['H', '1', '2'], ['Hg', '6¹S', '6³P₀']]) {
    const y = levelYs(ATOMS[id], rect);
    assert.ok(y.get(ground) > 100 + 0.85 * 500, `${id} ground near the bottom`);
    assert.ok(y.get(low) > 100 + 0.6 * 500 && y.get(low) < 100 + 0.88 * 500, `${id} ${low} low in the upper part`);
  }
  assert.ok(ATOMS.H.axisBreak && ATOMS.Hg.axisBreak && !ATOMS.Na.axisBreak);
});

test('helium: the ground sits near the bottom and the excited levels use most of the height (broken axis)', () => {
  const rect = { x: 0, y: 100, w: 300, h: 500 };
  const y = levelYs(ATOMS.He, rect);
  assert.ok(y.get('1¹S') > 100 + 0.85 * 500);
  const ex = [...y.entries()].filter(([id]) => id !== '1¹S').map(([, v]) => v);
  assert.ok(Math.max(...ex) - Math.min(...ex) >= 0.7 * 500 * ((4.77 - 0.85) / 4.77) * 0.9);
});

test('spreadLabels keeps order and a minimum gap', () => {
  const out = spreadLabels([{ y: 100 }, { y: 101 }, { y: 103 }, { y: 200 }], 14);
  for (let i = 1; i < out.length; i++) assert.ok(out[i].labelY - out[i - 1].labelY >= 14 - 1e-9);
  assert.equal(out[3].labelY, 200);
});

test('level geometry: every level of every atom has a line and a label inside the diagram', () => {
  const rect = { x: 500, y: 60, w: 520, h: 560 };
  for (const a of Object.values(ATOMS)) {
    const g = levelGeometry(a, rect, 1);
    assert.equal(g.length, a.levels.length);
    for (const l of g) {
      assert.ok(l.x0 >= rect.x - 1 && l.x1 <= rect.x + rect.w + 1, `${a.id} ${l.id} x`);
      assert.ok(l.labelY >= rect.y - 20 && l.labelY <= rect.y + rect.h + 20, `${a.id} ${l.id} label`);
    }
  }
  assert.equal(columnY({ y: 10, h: 100 }, 1), 10);
  assert.equal(columnY({ y: 10, h: 100 }, 0), 110);
});

test('room for the white-light button above the absorption column, square and column-wide (Ansis 04.11.: “kā punkts uz i”)', () => {
  for (const [w, h] of [[1280, 800], [375, 700], [844, 390]]) {
    const L = sceneLayout(w, h, { slide: 0 });
    assert.ok(L.whiteBtn, `${w}×${h} has whiteBtn`);
    assert.equal(L.whiteBtn.w, L.whiteBtn.h, 'square');
    assert.equal(L.whiteBtn.x, L.absCol.x);
    assert.equal(L.whiteBtn.w, Math.max(24, L.absCol.w));
    assert.ok(L.whiteBtn.y >= 0, 'on screen');
    assert.ok(L.whiteBtn.y + L.whiteBtn.h + 4 <= L.absCol.y, 'above the column with a gap');
  }
});

test('hydrogen arrows sit in fixed series slots like the textbook: IR series left, Balmer middle, Lyman right', () => {
  const rect = { x: 500, y: 60, w: 600, h: 600 };
  const slots = seriesSlots(ATOMS.H, levelGeometry(ATOMS.H, rect, 1));
  assert.equal(slots.size, 15);
  const x = (up, lo) => slots.get(`${up}|${lo}`).x;
  assert.ok(x(4, 3) < x(3, 2) && x(6, 2) < x(2, 1), 'groups left to right: →3, →2, →1');
  assert.ok(x(3, 2) < x(4, 2) && x(4, 2) < x(5, 2) && x(5, 2) < x(6, 2), 'a, b, c, d inside Balmer');
  assert.ok(x(6, 5) < x(5, 4), 'Pfund and Brackett further left');
  for (const s of slots.values()) assert.ok(s.x > rect.x && s.x < rect.x + rect.w);
  assert.equal(seriesSlots(ATOMS.He, levelGeometry(ATOMS.He, rect, 1)), null, 'helium has two ladders');
  assert.equal(seriesSlots(ATOMS.Na, levelGeometry(ATOMS.Na, rect, 1)).size, 21, 'sodium: one ladder, a slot per line');
  assert.equal(seriesSlots(ATOMS.Hg, levelGeometry(ATOMS.Hg, rect, 1)).size, 12, 'mercury: one ladder');
});

test('helium: two ladders; near-coincident n = 3 and n = 4 levels are short segments side by side, each clickable (physics review 04.11.)', () => {
  const wide = levelGeometry(ATOMS.He, { x: 500, y: 60, w: 600, h: 600 }, 1);
  const g = (id) => wide.find((x) => x.id === id);
  assert.ok(g('3¹P').x0 >= g('3¹D').x1 || g('3¹D').x0 >= g('3¹P').x1, '3¹P and 3¹D do not overlap');
  assert.ok(Math.abs(g('3¹P').y - g('3¹D').y) < 3, 'same height');
  assert.equal(g('3¹P').groupLabel, 'n = 3');
  assert.ok(g('2³P').x1 - g('2³P').x0 > 2 * (g('3³P').x1 - g('3³P').x0), 'n = 2 lines are full width');
  assert.ok(g('2¹S').x1 < g('2³S').x0, 'para ladder left of ortho');
  const narrow = levelGeometry(ATOMS.He, { x: 0, y: 60, w: 250, h: 500 }, 1);
  const n = (id) => narrow.find((x) => x.id === id);
  assert.equal(n('3¹P').x0, n('3¹D').x0, 'too narrow to split — full width with spread labels');
});

test('a matching square AUTO button sits above the emission column', () => {
  const L = sceneLayout(1280, 800, { slide: 1 });
  assert.equal(L.autoBtn.x, L.emCol.x);
  assert.equal(L.autoBtn.w, L.autoBtn.h);
  assert.ok(L.autoBtn.y + L.autoBtn.h + 4 <= L.emCol.y);
});

test('nucleus: protons and neutrons touch and overlap like a ball, no gaps (Ansis 04.11.)', () => {
  for (const id of ['He', 'Na', 'Hg']) {
    const nuc = ATOMS[id].nucleus;
    const want = nuc.draw ?? nuc;
    const R = 30;
    const { b, balls } = nucleusLayout(nuc, R);
    assert.equal(balls.length, want.p + want.n, `${id} count`);
    assert.equal(balls.filter((q) => q.proton).length, want.p, `${id} protons`);
    for (const q of balls) {
      const near = Math.min(...balls.filter((o) => o !== q).map((o) => Math.hypot(o.x - q.x, o.y - q.y)));
      assert.ok(near < 2 * b, `${id}: every ball touches a neighbour (${near.toFixed(2)} < ${(2 * b).toFixed(2)})`);
      assert.ok(Math.hypot(q.x, q.y) + b <= R + 1e-9, `${id}: inside R`);
    }
    const d = balls.map((q) => Math.hypot(q.x, q.y));
    assert.ok(d.every((x, i) => i === 0 || x <= d[i - 1] + 1e-9), `${id}: drawn from the outside in, so the centre is on top`);
  }
  const h = nucleusLayout(ATOMS.H.nucleus, 30);
  assert.equal(h.balls.length, 1);
  assert.deepEqual([h.balls[0].x, h.balls[0].y, h.balls[0].proton], [0, 0, true]);
});

test('absorption photons live between the column and the atom: born at the column edge, never over it or over the diagram (Ansis 04.11.)', () => {
  for (const slide of [0, 0.4]) {
    const L = sceneLayout(1280, 800, { slide });
    const band = absorbBand(L);
    assert.equal(band.x0, right(L.absCol));
    assert.equal(band.x1, right(L.atom));
  }
});

test('helium nucleus is symmetric (Ansis 04.11.): protons left and right, neutrons above and below, mirror-symmetric both ways, protons on top', () => {
  const R = 30;
  const { b, balls } = nucleusLayout(ATOMS.He.nucleus, R);
  const key = (q) => `${Math.round(q.x * 1e6)},${Math.round(q.y * 1e6)},${q.proton}`;
  const set = new Set(balls.map(key));
  for (const q of balls) {
    assert.ok(set.has(key({ ...q, x: -q.x })), 'mirror left–right');
    assert.ok(set.has(key({ ...q, y: -q.y })), 'mirror up–down');
  }
  const pr = balls.filter((q) => q.proton);
  assert.ok(pr.every((q) => Math.abs(q.y) < 1e-9 && Math.abs(q.x) > b), 'protons on the horizontal axis');
  assert.ok(balls.filter((q) => !q.proton).every((q) => Math.abs(q.x) < 1e-9), 'neutrons on the vertical axis');
  assert.deepEqual(balls.map((q) => q.proton), [false, false, true, true], 'neutrons drawn first, so both protons lie on top alike');
});

test('nucleus: protons are mixed through the ball, not bunched on one side', () => {
  for (const id of ['He', 'Na', 'Hg']) {
    const R = 30;
    const pr = nucleusLayout(ATOMS[id].nucleus, R).balls.filter((q) => q.proton);
    const cx = pr.reduce((s, q) => s + q.x, 0) / pr.length;
    const cy = pr.reduce((s, q) => s + q.y, 0) / pr.length;
    assert.ok(Math.hypot(cx, cy) < 0.3 * R, `${id}: proton centroid ${Math.hypot(cx, cy).toFixed(1)} from the centre`);
    if (id === 'He') continue; // četras daļiņas — rādiusu salīdzināt nav jēgas
    const balls = nucleusLayout(ATOMS[id].nucleus, R).balls;
    const meanR = (xs) => xs.reduce((s, q) => s + Math.hypot(q.x, q.y), 0) / xs.length;
    const k = meanR(balls.filter((q) => q.proton)) / meanR(balls.filter((q) => !q.proton));
    assert.ok(k > 0.8 && k < 1.25, `${id}: protons both inside and at the rim (mean radius ratio ${k.toFixed(2)})`);
  }
});
