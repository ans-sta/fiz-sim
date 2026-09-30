import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateRun, trapRepeat, NOISE } from '../assets/rolling-ball/experiment.js';
import { defaultSettings, derive, settingsKey, withL, withH, withDt, withLevel, withTimer } from '../assets/rolling-ball/model.js';
import { roundTo } from '../assets/measure/format.js';

const strip = (run) => JSON.parse(JSON.stringify(run)); // drops xAt/timeTo
const base = defaultSettings(); // level 3, Δt 0,2 s
const opts = (o = {}) => ({ seed: 123456, repeat: 1, noise: 1, traps: [], ...o });

test('same seed, settings and repeat reproduce identical data (spec 12.7)', () => {
  for (const level of [1, 2, 3]) {
    const s = withLevel(base, level);
    assert.deepEqual(strip(simulateRun(s, opts())), strip(simulateRun(s, opts())));
  }
});

test('the next repeat gives different data (ATKĀRTOT)', () => {
  assert.notDeepEqual(strip(simulateRun(base, opts())).level3.samples, strip(simulateRun(base, opts({ repeat: 2 }))).level3.samples);
});

test('noise 0, level 3: strobe x = x0 + a t²/2 exactly; x(1):x(2):x(3) = 1:4:9 (spec 12.1, 12.5)', () => {
  const s = withDt(withH(withL(base, 200), 6), 0.5);
  const run = simulateRun(s, opts({ noise: 0 }));
  const a = derive(s).a;
  for (const p of run.level3.strobe) assert.ok(Math.abs(p.x - (s.x0 + (a * p.t * p.t) / 2)) < 1e-9);
  const at = (t) => run.level3.strobe.find((p) => Math.abs(p.t - t) < 1e-9).x - s.x0;
  assert.ok(Math.abs(at(2) / at(1) - 4) < 1e-9);
  assert.ok(Math.abs(at(3) / at(1) - 9) < 1e-9);
  for (let i = 0; i < run.level3.samples.length; i++) {
    assert.equal(run.level3.samples[i].x, roundTo(run.level3.strobe[i].x, 0.5));
  }
});

test('level 3 times are n·Δt and the series ends when the ball reaches the end', () => {
  const run = simulateRun(base, opts({ noise: 0 }));
  run.level3.samples.forEach((p, n) => {
    assert.equal(p.n, n);
    assert.equal(p.t, roundTo(n * 0.2, 0.2));
  });
  const last = run.level3.strobe[run.level3.strobe.length - 1];
  assert.ok(last.t <= run.tEnd && last.t + 0.2 > run.tEnd);
});

test('noise 0, level 1, “mūsu renīte”: t = 2,72 s (spec 12.4)', () => {
  assert.equal(simulateRun(withLevel(base, 1), opts({ noise: 0 })).level1.t, 2.72);
});

test('level 1, real noise: spread of t across repeats is ~0,1 s (spec 12.6)', () => {
  const s = withLevel(base, 1);
  const ts = [];
  for (let r = 1; r <= 400; r++) ts.push(simulateRun(s, opts({ repeat: r })).level1.t);
  const mean = ts.reduce((a, b) => a + b, 0) / ts.length;
  const sd = Math.sqrt(ts.reduce((a, b) => a + (b - mean) ** 2, 0) / ts.length);
  assert.ok(sd > 0.06 && sd < 0.12, `sd ${sd}`);
  assert.ok(Math.abs(mean - 2.72) < 0.12, `mean ${mean}`);
  for (const t of ts) assert.ok(Math.abs(t * 100 - Math.round(t * 100)) < 1e-9);
});

test('level 2 photogates, noise 0: equal segments take less and less time', () => {
  const s = withLevel(base, 2);
  const run = simulateRun(s, opts({ noise: 0 }));
  const a = derive(s).a;
  const ts = run.level2.gates.map((g) => g.t);
  run.level2.gates.forEach((g, i) => {
    assert.equal(g.x, s.gates[i]);
    assert.equal(g.t, roundTo(Math.sqrt((2 * g.x) / a), 0.001));
  });
  for (let i = 2; i < ts.length; i++) assert.ok(ts[i] - ts[i - 1] < ts[i - 1] - ts[i - 2]);
});

test('level 2 stopwatches round to 0,01 s', () => {
  const run = simulateRun(withTimer(withLevel(base, 2), 'hand'), opts());
  for (const g of run.level2.gates) assert.ok(Math.abs(g.t * 100 - Math.round(g.t * 100)) < 1e-9);
});

test('level 3, real noise: table x is a multiple of 0,5 and within ±0,5 cm of the strobe (spec 12.13)', () => {
  for (let r = 1; r <= 30; r++) {
    const run = simulateRun(base, opts({ repeat: r }));
    run.level3.samples.forEach((p, i) => {
      assert.ok(Number.isInteger(p.x * 2), `${p.x}`);
      assert.ok(Math.abs(p.x - run.level3.strobe[i].x) <= 0.5 + 1e-9);
    });
  }
});

test('push trap fires in exactly one of repeats 1–3 with v0 of 3–5 cm/s', () => {
  const o = { noise: 0, traps: ['push'] };
  const v0s = [1, 2, 3, 4, 5, 6].map((r) => simulateRun(base, opts({ ...o, repeat: r })).truth.v0);
  assert.equal(v0s.slice(0, 3).filter((v) => v >= 3 && v <= 5).length, 1);
  assert.equal(v0s.slice(0, 3).filter((v) => v === 0).length, 2);
  assert.deepEqual(v0s.slice(3), [0, 0, 0]);
  const key = settingsKey(base, { noise: 0, traps: ['push'] });
  assert.ok(simulateRun(base, opts({ ...o, repeat: trapRepeat(123456, key, 'push') })).truth.traps.includes('push'));
});

test('late-start trap shifts the start by 2–3 frames in exactly one of repeats 1–3 (level 3)', () => {
  const taus = [1, 2, 3].map((r) => simulateRun(base, opts({ noise: 0, traps: ['late'], repeat: r })).truth.tau);
  const late = taus.filter((t) => t > 0);
  assert.equal(late.length, 1);
  assert.ok(Math.abs(late[0] - 2 * NOISE.frame) < 1e-12 || Math.abs(late[0] - 3 * NOISE.frame) < 1e-12);
});

test('without traps v0 = 0; noise 0 → tau = 0', () => {
  const run = simulateRun(base, opts({ noise: 0 }));
  assert.equal(run.truth.v0, 0);
  assert.equal(run.truth.tau, 0);
});

test('a ball that does not roll gives no data but the minimum h', () => {
  const run = simulateRun(withH(base, 0.1), opts());
  assert.equal(run.rolls, false);
  assert.equal(run.hMin, 0.2);
});

test('xAt and timeTo are consistent and analytic', () => {
  const run = simulateRun(base, opts({ noise: 0 }));
  const a = derive(base).a;
  assert.ok(Math.abs(run.xAt(1) - a / 2) < 1e-12);
  assert.equal(run.xAt(-1), 0);
  assert.equal(run.xAt(99), 80);
  assert.ok(Math.abs(run.xAt(run.timeTo(40)) - 40) < 1e-9);
});
