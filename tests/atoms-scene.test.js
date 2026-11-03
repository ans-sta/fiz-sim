import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ATOMS } from '../assets/atoms/atoms.js';
import { sceneLayout, levelYs, spreadLabels, columnY, levelGeometry, seriesSlots } from '../assets/atoms/scene.js';

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

test('levels: energy to scale, higher energy higher on screen', () => {
  const rect = { x: 0, y: 0, w: 300, h: 600 };
  const y = levelYs(ATOMS.H, rect);
  assert.ok(y.get('2') < y.get('1') && y.get('3') < y.get('2'));
  const k = (y.get('1') - y.get('2')) / (y.get('1') - y.get('3'));
  const want = (13.6 - 3.4) / (13.6 - 13.6 / 9);
  assert.ok(Math.abs(k - want) < 1e-9, 'n = 2 sits in proportion to E');
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
  assert.equal(seriesSlots(ATOMS.Hg, levelGeometry(ATOMS.Hg, rect, 1)), null, 'only for the single-column (Bohr) diagram');
});
