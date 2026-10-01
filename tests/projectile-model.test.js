import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCALES, MODES, ALPHA } from '../assets/projectile/scales.js';
import {
  defaultSettings, v0Range, withMode, withScale, withH, withV0, withAlpha, withDt, withSecond, withGrid, withSlow,
  launchVelocity, derive, changedLocked, settingsKey, flightCheck, MIN_POSITIONS,
} from '../assets/projectile/model.js';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);
const cfg = { noise: 1, traps: [] };

test('defaults: table, horizontal throw, h = 80 cm, v₀ = 150 cm/s, Δt = 0,05 s, slow on', () => {
  assert.deepEqual(defaultSettings(), {
    mode: 'horizontal', scale: 'table', h: 80, v0: 150, alphaDeg: 45, dt: 0.05, second: false, grid: true, slow: true,
  });
  assert.equal(defaultSettings('table', 'vertical').v0, 0);
  assert.equal(defaultSettings('tower', 'oblique').v0, 15);
  assert.deepEqual(MODES, ['vertical', 'horizontal', 'oblique']);
  assert.equal(ALPHA.default, 45);
});

test('scale switch resets h, v₀, Δt and slow to that scale; keeps mode, α, grid, second', () => {
  const s = withSecond(withAlpha(defaultSettings(), 30), true);
  const t = withScale(s, 'tower');
  assert.equal(t.scale, 'tower');
  assert.equal(t.h, 20);
  assert.equal(t.v0, 10);
  assert.equal(t.dt, 0.2);
  assert.equal(t.slow, false);
  assert.equal(t.mode, 'horizontal');
  assert.equal(t.alphaDeg, 30);
  assert.equal(t.second, true);
  assert.equal(withScale(t, 'tower'), t);
  assert.equal(withScale(t, 'moon'), t);
});

test('mode switch keeps |v₀|; vertical keeps the sign', () => {
  const up = withMode(defaultSettings(), 'vertical');
  assert.equal(up.v0, 150);
  const down = withV0(up, -100);
  assert.equal(down.v0, -100);
  assert.equal(withMode(down, 'horizontal').v0, 100);
  assert.equal(withMode(down, 'banana'), down);
  assert.deepEqual(v0Range('table', 'vertical'), { min: -400, max: 400 });
  assert.deepEqual(v0Range('tower', 'oblique'), { min: 0, max: 30 });
});

test('setters round to the step and clamp to the range', () => {
  const s = defaultSettings();
  assert.equal(withH(s, 200).h, 150);
  assert.equal(withH(s, -5).h, 0);
  assert.equal(withH(s, 80.4).h, 80);
  assert.equal(withH(withScale(s, 'tower'), 12.3).h, 12.5);
  assert.equal(withV0(s, -50).v0, 0);
  assert.equal(withV0(s, 152).v0, 150);
  assert.equal(withV0(s, 401).v0, 400);
  assert.equal(withV0(withMode(s, 'vertical'), -401).v0, -400);
  assert.equal(withAlpha(s, 91).alphaDeg, 90);
  assert.equal(withAlpha(s, 44.6).alphaDeg, 45);
  assert.equal(withDt(s, 0.2), s, 'Δt 0,2 s is not a table option');
  assert.equal(withDt(s, 0.02).dt, 0.02);
  assert.equal(withGrid(s, 0).grid, false);
  assert.equal(withSlow(s, false).slow, false);
});

test('launch velocity per mode', () => {
  assert.deepEqual(launchVelocity(withV0(withMode(defaultSettings(), 'vertical'), -100)), { vx: 0, vy: -100 });
  assert.deepEqual(launchVelocity(defaultSettings()), { vx: 150, vy: 0 });
  const o = launchVelocity(withAlpha(withMode(defaultSettings(), 'oblique'), 30));
  close(o.vx, 150 * Math.cos(Math.PI / 6));
  close(o.vy, 75);
});

test('derive: horizontal throw from the table', () => {
  const d = derive(defaultSettings());
  close(d.tLand, Math.sqrt(160 / 981));
  close(d.xLand, 150 * Math.sqrt(160 / 981));
  assert.equal(d.positions, 9);
  assert.equal(d.flight, 'ok');
  assert.equal(d.sc, SCALES.table);
  assert.equal(d.yMax, 80);
});

test('derive: no flight and too short a flight (Review Focus 2)', () => {
  const s = defaultSettings();
  assert.equal(derive(withH(s, 0)).flight, 'none');
  const v = withMode(s, 'vertical');
  assert.equal(derive(withV0(withH(v, 0), 0)).flight, 'none');
  assert.equal(derive(withV0(withH(v, 0), -50)).flight, 'none');
  assert.equal(derive(withV0(withH(v, 0), 100)).flight, 'ok');
  const o = withMode(s, 'oblique');
  assert.equal(derive(withAlpha(withH(o, 0), 0)).flight, 'none');
  assert.equal(derive(withV0(withH(o, 0), 0)).flight, 'none');
  const tower = withDt(withH(withScale(s, 'tower'), 1), 0.5);
  assert.equal(derive(tower).positions, 1);
  assert.equal(derive(tower).flight, 'short');
  assert.equal(MIN_POSITIONS, 3);
});

test('derive: apex of an upward throw', () => {
  const d = derive(withV0(withMode(defaultSettings(), 'vertical'), 200));
  close(d.tApex, 200 / 981);
  close(d.yMax, 80 + (200 * 200) / (2 * 981));
});

test('settingsKey: only what changes the data', () => {
  const s = defaultSettings();
  const k = settingsKey(s, cfg);
  assert.equal(settingsKey(withGrid(s, false), cfg), k);
  assert.equal(settingsKey(withSecond(s, true), cfg), k);
  assert.equal(settingsKey(withSlow(s, false), cfg), k);
  assert.equal(settingsKey(withAlpha(s, 10), cfg), k, 'α does not matter outside the oblique mode');
  assert.notEqual(settingsKey(withH(s, 81), cfg), k);
  assert.notEqual(settingsKey(withScale(s, 'tower'), cfg), k);
  assert.notEqual(settingsKey(s, { noise: 0, traps: [] }), k);
  assert.notEqual(settingsKey(s, { noise: 1, traps: ['late'] }), k);
  const o = withMode(s, 'oblique');
  assert.notEqual(settingsKey(withAlpha(o, 30), cfg), settingsKey(o, cfg));
});

test('changedLocked lists locked values a change would alter (also indirectly)', () => {
  const s = defaultSettings();
  const locked = new Set(['h', 'dt']);
  assert.deepEqual(changedLocked(s, withScale(s, 'tower'), locked), ['h', 'dt']);
  assert.deepEqual(changedLocked(s, withV0(s, 200), locked), []);
  assert.deepEqual(changedLocked(s, withGrid(s, false), new Set(['grid'])), ['grid']);
});

test('a locked number in another unit is another value: 20 cm is not 20 m', () => {
  const s = withH(defaultSettings(), 20);
  assert.deepEqual(changedLocked(s, withScale(s, 'tower'), new Set(['h'])), ['h']);
  const v = withV0(defaultSettings(), 10);
  assert.deepEqual(changedLocked(v, withScale(v, 'tower'), new Set(['v0'])), ['v0']);
});

test('flightCheck allows for the worst start frame, the late trap and the v₀/α spread', () => {
  const s = defaultSettings();
  assert.equal(flightCheck(s, { noise: 1, traps: [] }), 'ok');
  assert.equal(flightCheck(withH(s, 0), { noise: 1, traps: [] }), 'none');
  const low = withDt(withH(s, 1), 0.02);
  assert.equal(derive(low).flight, 'ok', 'noise-free it would just fit');
  assert.equal(flightCheck(low, { noise: 1, traps: ['late'] }), 'short');
  assert.equal(flightCheck(low, { noise: 0, traps: [] }), 'ok');
});
