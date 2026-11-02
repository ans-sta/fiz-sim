import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RANGES, K, TAU, createRotor, step, commutatorSign, emf, flux, torqueOf, loopCurrent, externalVoltage,
  steadyFrequency, createTrace, resetTrace, pushTrace, traceWindow, WINDOW, bulbStep, poseOf,
} from '../assets/emotor/model.js';

const motor = (o = {}) => ({ mode: 'motor', U: 3, polarity: 1, commutator: false, free: true, ...o });
const run = (r, s, secs, dt = 0.01) => { for (let t = 0; t < secs - 1e-9; t += dt) step(r, dt, s); };
const deg = (a) => (a * 180) / Math.PI;

test('ranges: motor 1–6 V, generator 0,5–3 Hz (Ansis: min 0,5 Hz)', () => {
  assert.deepEqual(RANGES.U, { min: 1, max: 6, step: 0.1 });
  assert.deepEqual(RANGES.f, { min: 0.5, max: 3, step: 0.1 });
  assert.equal(steadyFrequency(1), 0.5);
  assert.equal(steadyFrequency(6), 3);
});

test('physics signs: force down on side a for I > 0, torque −k·I·cos φ, ℰ = −dΦ/dt', () => {
  assert.ok(torqueOf(0, 1) < 0); // A, I > 0 → griež pulksteņrādītāja virzienā (φ samazinās)
  assert.ok(Math.abs(torqueOf(-Math.PI / 2, 1)) < 1e-12); // B — plecs 0
  const phi = 0.7;
  const w = 3;
  const h = 1e-6;
  const dPhi = (flux(phi + w * h) - flux(phi - w * h)) / (2 * h);
  assert.ok(Math.abs(emf(phi, w) + dPhi) < 1e-6);
  // no B (φ = −90°) ar ω > 0: Φ = Φm cos ωt, ℰ = ℰm sin ωt — kā mācību grāmatā
  assert.ok(Math.abs(flux(-Math.PI / 2) - K) < 1e-12);
  assert.ok(emf(-Math.PI / 2 + 0.1, w) > 0);
  // ģenerators bremzē (Lenca likums): τ · ω < 0
  const r = { phi: 0.3, omega: 4 };
  const I = loopCurrent(r, { mode: 'generator' });
  assert.ok(torqueOf(r.phi, I) * r.omega < 0);
});

test('commutator flips when the coil passes the across-field position', () => {
  assert.equal(commutatorSign(0, true), 1);
  assert.equal(commutatorSign(Math.PI, true), -1);
  assert.equal(commutatorSign(Math.PI * 0.49, true), 1);
  assert.equal(commutatorSign(Math.PI * 0.51, true), -1);
  assert.equal(commutatorSign(Math.PI, false), 1);
});

test('held coil: does not move, current and forces are there', () => {
  const r = createRotor(0);
  run(r, motor({ free: false }), 2);
  assert.equal(r.phi, 0);
  assert.equal(r.omega, 0);
  assert.equal(loopCurrent(r, motor({ free: false })), 3);
});

test('without commutator: from A the coil swings and stops within ±3° of B', () => {
  for (const U of [1, 3, 6]) {
    const r = createRotor(0);
    let past = false;
    let stoppedAt = null;
    for (let t = 0; t < 10; t += 0.01) {
      step(r, 0.01, motor({ U }));
      if (r.phi < -Math.PI / 2 - 0.1) past = true; // pārskrien B
      if (stoppedAt === null && r.stuck) stoppedAt = t;
    }
    assert.ok(past, `U=${U}: overshoots B`);
    assert.ok(stoppedAt !== null && stoppedAt < 8, `U=${U}: stops in time (${stoppedAt})`);
    assert.ok(Math.abs(deg(r.phi) + 90) <= 3, `U=${U}: stops near B (${deg(r.phi).toFixed(1)}°)`);
    assert.equal(poseOf(r.phi), 'across');
  }
});

test('with commutator: steady speed 0,5 Hz at 1 V and 3 Hz at 6 V (±3 %), reached in ~1–2 s', () => {
  for (const U of [1, 3, 6]) {
    const r = createRotor(0);
    const s = motor({ U, commutator: true });
    let reach = null;
    const target = TAU * steadyFrequency(U);
    for (let t = 0; t < 4; t += 0.01) { step(r, 0.01, s); if (reach === null && Math.abs(r.omega) > 0.9 * target) reach = t; }
    let sum = 0;
    let n = 0;
    for (let t = 0; t < 2; t += 0.01) { step(r, 0.01, s); sum += Math.abs(r.omega); n++; }
    const f = sum / n / TAU;
    assert.ok(Math.abs(f / steadyFrequency(U) - 1) < 0.03, `U=${U}: f=${f}`);
    assert.ok(reach !== null && reach < 2, `U=${U}: reach ${reach}`);
  }
});

test('reversed polarity turns the other way; reversing while running brakes and reverses', () => {
  const a = createRotor(0);
  run(a, motor({ commutator: true }), 3);
  const b = createRotor(0);
  run(b, motor({ commutator: true, polarity: -1 }), 3);
  assert.ok(a.omega < 0 && b.omega > 0);
  run(a, motor({ commutator: true, polarity: -1 }), 3);
  assert.ok(a.omega > 0);
});

test('dead point: commutator switched on with the coil at rest exactly at B — it starts by itself (Ansis: bez pagrūšanas)', () => {
  for (const [phi, pol] of [[-Math.PI / 2, 1], [Math.PI / 2, 1], [-Math.PI / 2, -1]]) {
    const r = createRotor(phi);
    run(r, motor({ U: 1, commutator: true, polarity: pol }), 3);
    assert.ok(Math.abs(r.omega) / TAU > 0.3, `phi=${phi} pol=${pol}: f=${Math.abs(r.omega) / TAU}`);
  }
});

test('generator: speed follows the slider; ℰm = k·ω; commutator makes the outer voltage one-signed', () => {
  const r = createRotor(-Math.PI / 2);
  r.omega = TAU * 1;
  const s = { mode: 'generator', f: 1, dir: 1, commutator: false };
  let neg = false;
  let pos = false;
  for (let t = 0; t < 2; t += 0.005) { step(r, 0.005, s); const u = externalVoltage(r, s); if (u < -0.1) neg = true; if (u > 0.1) pos = true; }
  assert.ok(neg && pos, 'AC without commutator');
  const sc = { ...s, commutator: true };
  let minU = Infinity;
  for (let t = 0; t < 2; t += 0.005) { step(r, 0.005, sc); minU = Math.min(minU, externalVoltage(r, sc)); }
  assert.ok(minU > -1e-9, 'pulsating DC with commutator');
  run(r, { ...s, f: 3 }, 3);
  assert.ok(Math.abs(r.omega - TAU * 3) < 0.02);
  assert.ok(Math.abs(K * r.omega - 1.8) < 0.01); // ℰm pie 3 Hz = 1,8 V
  run(r, { ...s, f: 3, dir: -1 }, 4);
  assert.ok(Math.abs(r.omega + TAU * 3) < 0.02);
});

test('trace: draws from the left for 4 s, then slides; old points dropped', () => {
  const tr = createTrace();
  resetTrace(tr, 10);
  for (let t = 10; t < 17; t += 0.01) pushTrace(tr, t, Math.sin(t), 0);
  assert.equal(WINDOW, 4);
  assert.deepEqual(traceWindow(tr, 12), { from: 0, to: 4 });
  const w = traceWindow(tr, 17);
  assert.ok(Math.abs(w.from - 3) < 1e-9 && Math.abs(w.to - 7) < 1e-9);
  assert.ok(tr.pts[0].t >= 7 - WINDOW - 0.3);
});

test('bulb: brightness follows power with inertia; flicker above 3 Hz stays small (WCAG 2.3.1)', () => {
  // 1,5 Hz griešanās → jauda svārstās 3 Hz; pēc iestāšanās spožuma svārstības ≤ 25 % no vidējā
  let lv = 0;
  const vals = [];
  for (let t = 0; t < 6; t += 0.002) {
    const p = Math.cos(TAU * 1.5 * t) ** 2;
    lv = bulbStep(lv, p, 1, 0.002);
    if (t > 4) vals.push(lv);
  }
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const swing = (Math.max(...vals) - Math.min(...vals)) / 2;
  assert.ok(swing / mean <= 0.25, `swing ${(swing / mean).toFixed(2)}`);
});

test('resting at B without commutator, reversing polarity makes the coil turn over to the other side', () => {
  for (const U of [1, 3, 6]) {
    const r = createRotor(0);
    run(r, motor({ U }), 8);
    assert.ok(r.stuck && Math.abs(deg(r.phi) + 90) <= 3, `U=${U}: rests at B`);
    run(r, motor({ U, polarity: -1 }), 10);
    assert.ok(Math.abs(deg(r.phi) - 90) <= 3, `U=${U}: turned over to +90° (${deg(r.phi).toFixed(1)}°)`);
  }
});
