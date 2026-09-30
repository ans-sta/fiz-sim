import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultSettings, derive, withL, withH, withAlpha, withAngleMode, withX0, withGate, withGateCount,
  withBall, withProfile, withLevel, withTimer, withDt, withTape, withSlow,
  hMax, x0Max, finishX, spreadGates, minRollingH, settingsKey,
} from '../assets/rolling-ball/model.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b}`);
const cfg = { noise: 1, traps: [] };

test('defaults are "mūsu renīte": a ≈ 18.88 cm/s², t(0 → 70 cm) ≈ 2.72 s (spec 12.4)', () => {
  const s = defaultSettings();
  assert.equal(s.L, 80);
  assert.equal(s.h, 3);
  assert.equal(s.angleMode, 'h');
  assert.equal(s.ball, 'steel16');
  assert.equal(s.profile, 'groove');
  assert.equal(s.x0, 0);
  assert.equal(s.level, 3);
  assert.deepEqual(s.gates, [14, 28, 42, 56, 70]);
  assert.equal(s.dt, 0.2);
  const d = derive(s);
  close(d.a, 18.883, 0.01);
  assert.equal(d.rolls, true);
  assert.equal(d.xf, 70);
  close(Math.sqrt((2 * 70) / d.a), 2.7229, 0.001);
  close(d.alphaDeg, 2.1491, 0.001);
});

test('limits', () => {
  assert.equal(hMax(80), 20.7);
  assert.equal(hMax(40), 10.3);
  assert.equal(finishX(80), 70);
  assert.equal(x0Max(80), 65);
  assert.deepEqual(spreadGates(0, 70, 5), [14, 28, 42, 56, 70]);
  assert.deepEqual(spreadGates(0, 50, 3), [16.5, 33.5, 50]);
  assert.equal(minRollingH(80, 0.0025), 0.2);
});

test('changing L keeps what the student sets: h in h-mode, α in α-mode (spec 12.9)', () => {
  const s = withL(defaultSettings(), 120);
  assert.equal(s.h, 3);
  close(s.alphaDeg, (Math.asin(3 / 120) * 180) / Math.PI, 1e-9);
  const a = withL(withAlpha(defaultSettings(), 5), 120);
  assert.equal(a.alphaDeg, 5);
  close(a.h, 120 * Math.sin((5 * Math.PI) / 180), 1e-9);
});

test('sin α = h / L always holds', () => {
  let s = defaultSettings();
  const ops = [
    (x) => withL(x, 150), (x) => withH(x, 12.3), (x) => withAlpha(x, 7.4), (x) => withL(x, 60),
    (x) => withAngleMode(x, 'h'), (x) => withH(x, 99), (x) => withL(x, 40), (x) => withAlpha(x, 0),
  ];
  for (const op of ops) {
    s = op(s);
    const d = derive(s);
    close(Math.sin(d.alphaRad), s.h / s.L, 1e-12);
  }
});

test('clamping: L 40–200, h ≤ L·sin 15°, α ≤ 15°, steps', () => {
  assert.equal(withL(defaultSettings(), 10).L, 40);
  assert.equal(withL(defaultSettings(), 500).L, 200);
  assert.equal(withL(defaultSettings(), 80.4).L, 80);
  assert.equal(withH(defaultSettings(), 30).h, 20.7);
  assert.equal(withH(defaultSettings(), 3.04).h, 3);
  assert.equal(withAlpha(defaultSettings(), 20).alphaDeg, 15);
  assert.equal(withL(withH(defaultSettings(), 20.7), 40).h, 10.3);
});

test('switching the angle mode changes nothing but the mode', () => {
  const s = withAngleMode(defaultSettings(), 'alpha');
  assert.equal(s.angleMode, 'alpha');
  assert.equal(s.h, 3);
  close(derive(s).a, derive(defaultSettings()).a, 1e-9);
});

test('x0 is clamped and gates are re-spread when they no longer fit', () => {
  assert.equal(withX0(defaultSettings(), 100).x0, 65);
  const s = withX0(defaultSettings(), 30);
  assert.deepEqual(s.gates, spreadGates(30, 70, 5));
  assert.deepEqual(s.gates, [38, 46, 54, 62, 70]);
  assert.deepEqual(withL(defaultSettings(), 40).gates, [6, 12, 18, 24, 30]);
});

test('a gate stays between its neighbours (at least 1 cm apart) and within the groove', () => {
  assert.equal(withGate(defaultSettings(), 1, 5).gates[1], 15);
  assert.equal(withGate(defaultSettings(), 1, 50).gates[1], 41);
  assert.equal(withGate(defaultSettings(), 4, 500).gates[4], 80);
  assert.equal(withGate(defaultSettings(), 0, -3).gates[0], 1);
  assert.equal(withGate(defaultSettings(), 2, 44.3).gates[2], 44.5);
});

test('gate count 2–6, gates re-spread evenly', () => {
  assert.deepEqual(withGateCount(defaultSettings(), 2).gates, [35, 70]);
  assert.equal(withGateCount(defaultSettings(), 9).gates.length, 6);
  assert.equal(withGateCount(defaultSettings(), 1).gates.length, 2);
});

test('ball and profile: a ball narrower than the groove gap is refused in the groove', () => {
  const s = defaultSettings();
  assert.equal(withBall(s, 'steel10'), s);
  assert.equal(withBall(s, 'nope'), s);
  const flat = withBall(withProfile(s, 'flat'), 'steel10');
  assert.equal(flat.ball, 'steel10');
  assert.equal(withProfile(flat, 'groove'), flat);
  assert.equal(withBall(s, 'glass25').ball, 'glass25');
});

test('level, timer, dt, tape, slow accept only valid values', () => {
  const s = defaultSettings();
  assert.equal(withLevel(s, 1).level, 1);
  assert.equal(withLevel(s, 4), s);
  assert.equal(withTimer(s, 'hand').timer, 'hand');
  assert.equal(withTimer(s, 'x'), s);
  assert.equal(withDt(s, 0.5).dt, 0.5);
  assert.equal(withDt(s, 0.3), s);
  assert.equal(withTape(s, false).tape, false);
  assert.equal(withSlow(s, true).slow, true);
});

test('below the rolling-friction threshold the ball does not roll', () => {
  assert.equal(derive(withH(defaultSettings(), 0.1)).rolls, false);
  assert.equal(derive(withH(defaultSettings(), 0)).rolls, false);
  assert.equal(derive(withH(defaultSettings(), 0.1)).hMin, 0.2);
});

test('settingsKey: same data-relevant settings → same key', () => {
  const s = defaultSettings();
  assert.equal(settingsKey(s, cfg), settingsKey(defaultSettings(), cfg));
  assert.notEqual(settingsKey(s, cfg), settingsKey(withH(s, 5), cfg));
  assert.equal(settingsKey(s, cfg), settingsKey(withTape(withSlow(s, true), false), cfg));
  assert.notEqual(settingsKey(s, cfg), settingsKey(s, { noise: 0, traps: [] }));
  assert.notEqual(settingsKey(s, cfg), settingsKey(withDt(s, 0.5), cfg));
  const l1 = withLevel(s, 1);
  assert.equal(settingsKey(l1, cfg), settingsKey(withDt(withGateCount(l1, 3), 0.5), cfg));
});
