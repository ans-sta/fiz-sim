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
