import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCALE, MODES, ALPHA } from '../assets/projectile/scales.js';
import {
  defaultSettings, v0Range, withMode, withH, withV0, withAlpha, withDt, withSecond, withGrid, withSlow,
  launchVelocity, derive, changedLocked, settingsKey, flightCheck,
} from '../assets/projectile/model.js';
import { roundTo } from '../assets/measure/format.js';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);
const cfg = { noise: 1, traps: [] };

test('one metre scale: defaults per mode, no scale field', () => {
  const s = defaultSettings('horizontal');
  assert.deepEqual(s, { mode: 'horizontal', h: 20, v0: 10, alphaDeg: 45, dt: 0.2, second: false, grid: true, slow: false });
  assert.equal(defaultSettings('vertical').v0, 0);
  assert.equal(defaultSettings('oblique').v0, 15);
  assert.deepEqual(v0Range('vertical'), { min: -30, max: 30 });
  assert.deepEqual(v0Range('oblique'), { min: 0, max: 30 });
  assert.deepEqual(MODES, ['vertical', 'horizontal', 'oblique']);
  assert.equal(ALPHA.default, 45);
  assert.equal(SCALE.unit, 'm');
});

test('withDt: 0,1–2 s in steps of 0,1', () => {
  const s = defaultSettings();
  assert.equal(withDt(s, 0.3).dt, 0.3);
  assert.equal(withDt(s, 0.25).dt, roundTo(0.25, 0.1));
  assert.equal(withDt(s, 5).dt, 2);
  assert.equal(withDt(s, 0.04).dt, 0.1);
  assert.equal(withDt(s, NaN), s);
});

test('mode switch keeps |v₀|; vertical keeps the sign', () => {
  const up = withMode(defaultSettings(), 'vertical');
  assert.equal(up.v0, 10);
  const down = withV0(up, -20);
  assert.equal(down.v0, -20);
  assert.equal(withMode(down, 'horizontal').v0, 20);
  assert.equal(withMode(down, 'banana'), down);
});

test('setters round to the step and clamp to the range', () => {
  const s = defaultSettings();
  assert.equal(withH(s, 200).h, 50);
  assert.equal(withH(s, -5).h, 0);
  assert.equal(withH(s, 12.3).h, 12.5);
  assert.equal(withH(s, 12.2).h, 12);
  assert.equal(withV0(s, -5).v0, 0);
  assert.equal(withV0(s, 12.3).v0, 12.5);
  assert.equal(withV0(s, 31).v0, 30);
  assert.equal(withV0(withMode(s, 'vertical'), -31).v0, -30);
  assert.equal(withAlpha(s, 91).alphaDeg, 90);
  assert.equal(withAlpha(s, 44.6).alphaDeg, 45);
  assert.equal(withGrid(s, 0).grid, false);
  assert.equal(withSlow(s, false).slow, false);
});

test('launch velocity per mode', () => {
  assert.deepEqual(launchVelocity(withV0(withMode(defaultSettings(), 'vertical'), -10)), { vx: 0, vy: -10 });
  assert.deepEqual(launchVelocity(defaultSettings()), { vx: 10, vy: 0 });
  const o = launchVelocity(withAlpha(withMode(defaultSettings(), 'oblique'), 30));
  close(o.vx, 10 * Math.cos(Math.PI / 6));
  close(o.vy, 5);
});

test('derive: horizontal throw from 20 m', () => {
  const d = derive(defaultSettings());
  close(d.tLand, Math.sqrt(40 / 9.81));
  close(d.xLand, 10 * Math.sqrt(40 / 9.81));
  assert.equal(d.positions, 11);
  assert.equal(d.flight, 'ok');
  assert.equal(d.yMax, 20);
});

test('flight is none only when nothing moves', () => {
  assert.equal(derive({ ...defaultSettings('vertical'), h: 0, v0: 0 }).flight, 'none');
  assert.equal(derive({ ...defaultSettings('vertical'), h: 0, v0: 5 }).flight, 'ok');
  assert.equal(derive({ ...defaultSettings('vertical'), h: 0, v0: -5 }).flight, 'none');
  assert.equal(derive({ ...defaultSettings('horizontal'), h: 0 }).flight, 'none');
  assert.equal(derive({ ...defaultSettings('oblique'), h: 0, alphaDeg: 0 }).flight, 'none');
  assert.equal(derive({ ...defaultSettings('oblique'), h: 0, v0: 0 }).flight, 'none');
  assert.equal(derive({ ...defaultSettings('oblique'), h: 0 }).flight, 'ok');
  assert.equal(derive({ ...defaultSettings('vertical'), h: 0.5, v0: 0, dt: 2 }).flight, 'ok', 'a flight shorter than Δt is still a flight');
  assert.equal(derive({ ...defaultSettings('vertical'), h: 0.5, v0: 0, dt: 2 }).positions, 1);
});

test('derive: apex of an upward throw', () => {
  const d = derive(withV0(withMode(defaultSettings(), 'vertical'), 20));
  close(d.tApex, 20 / 9.81);
  close(d.yMax, 20 + (20 * 20) / (2 * 9.81));
});

test('settingsKey: only what changes the data', () => {
  const s = defaultSettings();
  const k = settingsKey(s, cfg);
  assert.equal(settingsKey(withGrid(s, false), cfg), k);
  assert.equal(settingsKey(withSecond(s, true), cfg), k);
  assert.equal(settingsKey(withSlow(s, false), cfg), k);
  assert.equal(settingsKey(withAlpha(s, 10), cfg), k, 'α does not matter outside the oblique mode');
  assert.notEqual(settingsKey(withH(s, 21), cfg), k);
  assert.notEqual(settingsKey(withDt(s, 0.3), cfg), k);
  assert.notEqual(settingsKey(s, { noise: 0, traps: [] }), k);
  assert.notEqual(settingsKey(s, { noise: 1, traps: ['late'] }), k);
  const o = withMode(s, 'oblique');
  assert.notEqual(settingsKey(withAlpha(o, 30), cfg), settingsKey(o, cfg));
});

test('changedLocked lists locked values a change would alter (also indirectly)', () => {
  const s = defaultSettings();
  const locked = new Set(['h', 'dt']);
  assert.deepEqual(changedLocked(s, withH(withDt(s, 0.3), 25), locked), ['h', 'dt']);
  assert.deepEqual(changedLocked(s, withV0(s, 20), locked), []);
  assert.deepEqual(changedLocked(s, withGrid(s, false), new Set(['grid'])), ['grid']);
});

test('flightCheck: only a motionless ball is refused', () => {
  const s = defaultSettings();
  assert.equal(flightCheck(s), 'ok');
  assert.equal(flightCheck(withH(s, 0)), 'none');
  assert.equal(flightCheck(withDt(withH(s, 0.5), 2)), 'ok');
});
