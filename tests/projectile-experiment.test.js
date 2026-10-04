import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateRun, NOISE } from '../assets/projectile/experiment.js';
import { defaultSettings, derive, withMode, withH, withV0, withAlpha, withDt, withSecond, settingsKey } from '../assets/projectile/model.js';
import { SCALE } from '../assets/projectile/scales.js';
import { roundTo } from '../assets/measure/format.js';
import { trapRepeat } from '../assets/measure/traps.js';

const close = (a, b, tol = 1e-9, msg = '') => assert.ok(Math.abs(a - b) <= tol, `${msg} ${a} vs ${b}`);
const opts = (o = {}) => ({ seed: 482913, repeat: 1, noise: 1, traps: [], ...o });

test('criterion 1 — noise 0: y = h + v₀t − gt²/2 exactly, x linear, table = rounded truth', () => {
  const s = defaultSettings();
  const run = simulateRun(s, opts({ noise: 0 }));
  assert.equal(run.ok, true);
  assert.equal(run.truth.tau, 0);
  assert.equal(run.strobe.length, derive(s).positions);
  run.strobe.forEach((p, i) => {
    close(p.t, i * 0.2, 1e-12);
    close(p.x, 10 * p.t);
    close(p.y, 20 - (9.81 * p.t * p.t) / 2);
    assert.equal(run.samples[i].x, roundTo(p.x, 0.1));
    assert.equal(run.samples[i].y, roundTo(p.y, 0.1));
  });
  close(run.tEnd, derive(s).tLand);
});

test('criterion 2 — free fall: Δy in equal intervals is 1 : 3 : 5 : 7', () => {
  const s = withH(withMode(withV0(defaultSettings(), 0), 'vertical'), 50);
  const p = simulateRun(s, opts({ noise: 0 })).strobe;
  const d = [1, 2, 3, 4].map((i) => p[i - 1].y - p[i].y);
  close(d[1] / d[0], 3);
  close(d[2] / d[0], 5);
  close(d[3] / d[0], 7);
  assert.ok(p.every((q) => q.x === 0));
});

test('criterion 2 — upward throw: time to the top is v₀/g', () => {
  const s = withV0(withMode(defaultSettings(), 'vertical'), 20);
  close(derive(s).tApex, 20 / 9.81);
  const slow = withV0(withMode(defaultSettings(), 'vertical'), 9.5);
  close(derive(slow).tApex, 9.5 / 9.81);
});

test('criterion 3 — horizontal throw: flight time √(2h/g) does not depend on v₀', () => {
  const s = defaultSettings();
  for (const v of [5, 15, 30]) close(derive(withV0(s, v)).tLand, Math.sqrt((2 * 20) / 9.81));
});

test('criterion 4 — oblique throw from the ground: longest range at 45°, 30° and 60° equal', () => {
  const base = withH(withV0(withMode(defaultSettings(), 'oblique'), 20), 0);
  const range = (a) => derive(withAlpha(base, a)).xLand;
  assert.ok(range(45) > range(44));
  assert.ok(range(45) > range(46));
  close(range(30), range(60), 1e-9);
});

test('same seed + settings + repeat → identical data; another repeat → other data (Review Focus 3)', () => {
  const s = defaultSettings();
  const a = simulateRun(s, opts());
  const b = simulateRun(s, opts());
  assert.deepEqual(a.samples, b.samples);
  assert.deepEqual(a.truth, b.truth);
  const c = simulateRun(s, opts({ repeat: 2 }));
  assert.notDeepEqual(a.samples, c.samples);
});

test('data do not depend on animation frames (Review Focus 4)', () => {
  const s = defaultSettings();
  const run = simulateRun(s, opts());
  const again = simulateRun(s, opts());
  for (const t of [0, 0.013, 0.2, run.tEnd]) assert.deepEqual(run.posAt(t), again.posAt(t));
  assert.deepEqual(run.posAt(-1), { x: 0, y: 20 });
  close(run.posAt(run.tEnd + 5).y, 0);
});

test('v₀ varies about 1 % between runs; α only in the oblique mode', () => {
  const s = withMode(defaultSettings(), 'oblique');
  const rel = [];
  for (let r = 1; r <= 400; r++) {
    const run = simulateRun(s, opts({ repeat: r }));
    rel.push(run.truth.v0Run / s.v0 - 1);
  }
  const mean = rel.reduce((a, b) => a + b, 0) / rel.length;
  const sd = Math.sqrt(rel.reduce((a, b) => a + (b - mean) ** 2, 0) / rel.length);
  assert.ok(sd > 0.007 && sd < 0.013, `sd ${sd}`);
  assert.equal(NOISE.v0Rel, 0.01);
  const h = simulateRun(defaultSettings(), opts());
  assert.equal(h.truth.alphaRun, defaultSettings().alphaDeg);
});

test('table and strobe agree within the reading resolution at noise 1', () => {
  for (const s of [defaultSettings(), withMode(defaultSettings(), 'oblique')]) {
    const sc = SCALE;
    for (let r = 1; r <= 20; r++) {
      const run = simulateRun(s, opts({ repeat: r }));
      run.samples.forEach((q, i) => {
        const p = run.strobe[i];
        assert.ok(Math.abs(q.y - p.y) <= sc.read.max + sc.read.resolution / 2 + 1e-9);
        assert.ok(Math.abs(q.x - p.x) <= sc.read.max + sc.read.resolution / 2 + 1e-9);
      });
    }
  }
});

test('a flight shorter than Δt records only the start flash, no refusal', () => {
  const s = { ...defaultSettings('vertical'), h: 1, v0: 0, dt: 2 };
  const run = simulateRun(s, { seed: 1, repeat: 1, noise: 1, traps: [] });
  assert.equal(run.ok, true);
  assert.equal(run.samples.length, 1);
  assert.equal(run.samples[0].t, 0);
});

test('a recorded run always has its start flash, also with noise and the late trap on very short flights', () => {
  for (const h of [0.5, 1, 2]) {
    for (const dt of [0.1, 0.5, 2]) {
      for (let repeat = 1; repeat <= 12; repeat++) {
        const s = { ...defaultSettings('vertical'), h, v0: 0, dt };
        const run = simulateRun(s, { seed: 3, repeat, noise: 2, traps: ['late'] });
        assert.equal(run.ok, true);
        assert.ok(run.samples.length >= 1 && run.samples[0].t === 0, `${settingsKey(s, { noise: 2, traps: ['late'] })} r${repeat}`);
      }
    }
  }
});

test('vertical throw up: rising flag per flash follows the velocity sign, no flash is forced at the apex', () => {
  const s = { ...defaultSettings('vertical'), h: 20, v0: 10, dt: 0.3 };
  const run = simulateRun(s, { seed: 3, repeat: 1, noise: 0, traps: [] });
  const tApex = 10 / 9.81; // ≈ 1,019 s
  for (const p of run.strobe) assert.equal(p.rising, p.t < tApex, `t = ${p.t}`);
  assert.ok(run.strobe.every((p) => Math.abs(p.t - tApex) > 1e-6));
  assert.equal(run.risingAt(0.5), true);
  assert.equal(run.risingAt(1.5), false);
});

test('only "none" is refused', () => {
  const run = simulateRun({ ...defaultSettings('horizontal'), h: 0 }, { seed: 1, repeat: 1, noise: 1, traps: [] });
  assert.deepEqual([run.ok, run.reason], [false, 'none']);
  assert.equal('samples' in run, false);
});

test('trap “late”: exactly one of the first three repeats starts 2–3 frames late', () => {
  const s = defaultSettings();
  const key = settingsKey(s, { noise: 0, traps: ['late'] });
  const frame = SCALE.frame;
  const taus = [1, 2, 3].map((r) => simulateRun(s, opts({ noise: 0, traps: ['late'], repeat: r })).truth.tau);
  assert.equal(taus.filter((x) => x > 0).length, 1);
  const k = trapRepeat(482913, key, 'late');
  const tau = taus[k - 1];
  assert.ok(Math.abs(tau - 2 * frame) < 1e-12 || Math.abs(tau - 3 * frame) < 1e-12, `tau ${tau}`);
  assert.deepEqual(simulateRun(s, opts({ noise: 0, traps: ['late'], repeat: k })).truth.traps, ['late']);
});

test('second ball (horizontal): drops from the launch point and lands at the same time', () => {
  const s = withSecond(defaultSettings(), true);
  const run = simulateRun(s, opts({ noise: 0 }));
  assert.equal(run.strobe2.length, run.strobe.length);
  run.strobe2.forEach((p, i) => {
    assert.equal(p.x, 0);
    close(p.y, run.strobe[i].y);
  });
  assert.equal(simulateRun(withMode(s, 'oblique'), opts()).strobe2, null);
  assert.equal(simulateRun(defaultSettings(), opts()).posAt2, null);
});
