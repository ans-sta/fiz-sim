import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultSettings, withT, withTrail, withMolecules, createWorld, setTemperature, resizeWorld, resetDust, step, collide, kineticEnergy,
  vRms, moleculeCount, boxLayout, DUST_M, DUST_R, MOL_R, BOX_H, T_REF, V_REF,
} from '../assets/brownian/model.js';

test('settings: T clamped to 50…1000 in steps of 25; toggles', () => {
  const s = defaultSettings();
  assert.deepEqual(s, { T: 300, trail: true, molecules: true });
  assert.equal(withT(s, 2000).T, 1000);
  assert.equal(withT(s, 10).T, 50);
  assert.equal(withT(s, 312).T, 300);
  assert.equal(withT(s, 300), s);
  assert.equal(withTrail(s, false).trail, false);
  assert.equal(withMolecules(s, false).molecules, false);
});

test('speed scales with √T; molecule count follows the area', () => {
  assert.equal(vRms(T_REF), V_REF);
  assert.ok(Math.abs(vRms(4 * T_REF) - 2 * V_REF) < 1e-9);
  assert.equal(moleculeCount(400, 250), 600);
  assert.equal(moleculeCount(800, 250), 1200);
  assert.equal(moleculeCount(10, 10), 50);
});

test('createWorld: molecules inside the box, none inside the dust, dust at rest in the centre; rms speed near V_REF', () => {
  const w = createWorld(400, 250, 300, 7);
  assert.equal(w.mol.length, 600);
  for (const p of w.mol) {
    assert.ok(p.x >= MOL_R && p.x <= 400 - MOL_R && p.y >= MOL_R && p.y <= 250 - MOL_R);
    assert.ok(Math.hypot(p.x - 200, p.y - 125) >= DUST_R + MOL_R);
  }
  assert.deepEqual(w.dust, { x: 200, y: 125, vx: 0, vy: 0 });
  const rms = Math.sqrt(w.mol.reduce((a, p) => a + p.vx ** 2 + p.vy ** 2, 0) / w.mol.length);
  assert.ok(Math.abs(rms / V_REF - 1) < 0.1, `rms ${rms}`);
  assert.deepEqual(createWorld(400, 250, 300, 7).mol[3], w.mol[3]); // same seed, same world
});

test('setTemperature multiplies the molecule energy by T₂/T₁ and leaves the dust alone', () => {
  const w = createWorld(400, 250, 300, 3);
  w.dust.vx = 5;
  const e0 = kineticEnergy(w) - 0.5 * DUST_M * 25;
  setTemperature(w, 1200);
  const e1 = kineticEnergy(w) - 0.5 * DUST_M * 25;
  assert.ok(Math.abs(e1 / e0 - 4) < 1e-9);
  assert.equal(w.dust.vx, 5);
  assert.equal(w.T, 1200);
});

test('collide: elastic, conserves momentum and energy, only when approaching', () => {
  const dust = { x: 0, y: 0, vx: 0, vy: 0 };
  const p = { x: DUST_R + MOL_R - 0.5, y: 0, vx: -100, vy: 0 };
  const px0 = p.vx + DUST_M * dust.vx;
  const e0 = 0.5 * p.vx ** 2 + 0.5 * DUST_M * dust.vx ** 2;
  assert.equal(collide(p, dust), true);
  assert.ok(Math.abs((p.vx + DUST_M * dust.vx) - px0) < 1e-9);
  assert.ok(Math.abs((0.5 * p.vx ** 2 + 0.5 * DUST_M * dust.vx ** 2) - e0) < 1e-6);
  assert.ok(p.vx > 0 && dust.vx < 0); // molecule bounces back, dust gets a small kick
  assert.ok(Math.abs(dust.vx) < 10);
  assert.ok(p.x >= DUST_R + MOL_R - 1e-9); // pushed out
  const away = { x: DUST_R + MOL_R - 0.5, y: 0, vx: 50, vy: 0 };
  assert.equal(collide(away, { x: 0, y: 0, vx: 0, vy: 0 }), false);
});

test('step: everything stays in the box, the dust starts moving, trail grows, energy roughly conserved', () => {
  const w = createWorld(400, 250, 600, 11);
  const e0 = kineticEnergy(w);
  for (let i = 0; i < 120; i++) step(w, 1 / 60);
  for (const p of w.mol) assert.ok(p.x >= MOL_R - 1e-6 && p.x <= 400 - MOL_R + 1e-6 && p.y >= MOL_R - 1e-6 && p.y <= 250 - MOL_R + 1e-6);
  assert.ok(w.dust.x >= DUST_R && w.dust.x <= 400 - DUST_R);
  assert.ok(w.hits > 20, `hits ${w.hits}`);
  assert.ok(Math.hypot(w.dust.vx, w.dust.vy) > 0);
  assert.ok(w.trail.length > 10);
  assert.ok(Math.abs(w.t - 2) < 1e-9);
  assert.ok(Math.abs(kineticEnergy(w) / e0 - 1) < 0.02);
  resetDust(w);
  assert.deepEqual([w.dust.x, w.dust.y, w.trail.length, w.t], [200, 125, 1, 0]);
});

test('resizeWorld keeps proportions and density', () => {
  const w = createWorld(400, 250, 300, 5);
  w.dust.x = 100;
  resizeWorld(w, 800, 250);
  assert.deepEqual([w.w, w.h, w.dust.x, w.mol.length], [800, 250, 200, 1200]);
  resizeWorld(w, 200, 250);
  assert.deepEqual([w.dust.x, w.mol.length], [50, 300]);
});

test('boxLayout: height is BOX_H world units, width follows the aspect, clamped', () => {
  const l = boxLayout(1000, 500);
  assert.deepEqual([l.h, l.w, l.scale], [BOX_H, 500, 2]);
  const n = boxLayout(300, 600); // narrow phone → minimum width, scale limited by the width
  assert.deepEqual([n.w, n.scale, n.pxW, n.pxH], [150, 2, 300, 500]);
  const wide = boxLayout(4000, 500);
  assert.deepEqual([wide.w, wide.scale, wide.pxW], [900, 2, 1800]);
  assert.equal(boxLayout(1000, 500, { drawScale: 0.5 }).scale, 1);
});
