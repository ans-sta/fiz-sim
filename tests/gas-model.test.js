import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RANGES, NR, defaultSettings, withV, withT, withP, constOf, heightOf, volumeOf, vRms, createGas, setGasTemperature, setPistonTarget, stepGas, BOX_W, MOL_R, N_MOL, V_REF, T_REF } from '../assets/gas/model.js';

const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

test('defaults obey pV = NR·T; the constant is 2/3 kPa·L/K', () => {
  const s = defaultSettings();
  assert.deepEqual([s.V, s.T, s.p], [2, 300, 100]);
  assert.ok(close(constOf(s), NR));
  assert.ok(close(NR, 2 / 3));
});

test('changing V or T adapts p first (p is the oldest); changing p adapts V', () => {
  const s = defaultSettings();
  const a = withV(s, 1); // isothermal compression: p doubles
  assert.deepEqual([a.V, a.T, a.p], [1, 300, 200]);
  assert.deepEqual(a.order, ['p', 'T', 'V']);
  const b = withT(s, 600); // isochoric heating: p doubles
  assert.deepEqual([b.V, b.T, b.p], [2, 600, 200]);
  const c = withP(s, 200); // V adapts (V is older than T)
  assert.deepEqual([c.V, c.T, c.p], [1, 300, 200]);
  assert.deepEqual(c.order, ['V', 'T', 'p']);
  const d = withT(c, 600); // now V adapts: isobaric heating lifts the piston
  assert.deepEqual([d.V, d.T, d.p], [2, 600, 200]);
});

test('the changed value is clamped so the adapting one stays in range', () => {
  const s = defaultSettings();
  const a = withV(s, 0.1); // below the V range → V = 1, p = 200 (in range)
  assert.deepEqual([a.V, a.p], [1, 200]);
  const hi = withP(s, 500); // V would be 0.4 < 1 → p clamped so that V = 1: p = 200
  assert.ok(close(hi.V, 1) && close(hi.p, 200));
  const b = withT(s, 100); // p = 33.3 — in range
  assert.ok(close(b.p, NR * 100 / 2));
  const c = withV(withT(s, 100), 5); // p = 13.3 < 20 → V clamped to NR·100/20 = 3.33
  assert.ok(close(c.p, 20) && close(c.V, NR * 100 / 20));
  assert.equal(withV(s, 2), s); // unchanged — same object
  assert.equal(withV(s, Number.NaN), s);
  const e = withV(s, 2.04); // between steps → rounded to 2
  assert.equal(e, s);
});

test('geometry and speeds', () => {
  assert.equal(heightOf(RANGES.V.max), 250);
  assert.ok(close(volumeOf(heightOf(2)), 2));
  assert.equal(vRms(T_REF), V_REF);
  assert.ok(close(vRms(4 * T_REF), 2 * V_REF));
});

test('gas: molecules stay inside the cylinder under the piston; compression pushes them down; T scales energy', () => {
  const g = createGas(2, 300, 5);
  assert.equal(g.mol.length, N_MOL);
  for (const p of g.mol) assert.ok(p.x >= MOL_R && p.x <= BOX_W - MOL_R && p.y >= MOL_R && p.y <= heightOf(2) - MOL_R);
  const e0 = g.mol.reduce((a, p) => a + p.vx ** 2 + p.vy ** 2, 0);
  setPistonTarget(g, 1);
  for (let i = 0; i < 180; i++) stepGas(g, 1 / 60);
  assert.ok(close(g.piston, heightOf(1), 0.1));
  for (const p of g.mol) assert.ok(p.y <= g.piston - MOL_R + 1e-6 && p.y >= MOL_R - 1e-6 && p.x >= MOL_R - 1e-6 && p.x <= BOX_W - MOL_R + 1e-6);
  const e1 = g.mol.reduce((a, p) => a + p.vx ** 2 + p.vy ** 2, 0);
  assert.ok(close(e1 / e0, 1, 1e-9)); // walls do not change speeds
  setGasTemperature(g, 1200);
  const e2 = g.mol.reduce((a, p) => a + p.vx ** 2 + p.vy ** 2, 0);
  assert.ok(close(e2 / e1, 4, 1e-9));
});
