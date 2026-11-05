import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSim, FLIGHT } from '../assets/photo/sim.js';
import { travelTime, kineticMaxJ, SPEED_SPREAD } from '../assets/photo/model.js';
import { mulberry32 } from '../assets/measure/rng.js';

function run(sim, seconds, dt = 1 / 60) {
  for (let t = 0; t < seconds - 1e-9; t += dt) sim.step(dt);
}
const sim0 = (o = {}) => createSim({ rng: mulberry32(7), ...o });

test('below the threshold no electron ever leaves, at any brightness (red on sodium, 100 %)', () => {
  for (const intensity of [5, 30, 100]) {
    const sim = sim0({ lambda: 650, intensity, metal: 'Na' });
    run(sim, 20);
    assert.equal(sim.state.counts.electrons, 0, `${intensity} %`);
    assert.ok(sim.state.counts.photons > 0, 'photons did hit the plate');
  }
  const zn = sim0({ lambda: 400, intensity: 100, metal: 'Zn' });
  run(zn, 10);
  assert.equal(zn.state.counts.electrons, 0, 'violet on zinc');
});

test('above the threshold the first electron is there in the same frame the light is switched on — even at 5 %', () => {
  const sim = sim0({ lambda: 532, intensity: 5, metal: 'Na', on: false });
  run(sim, 3);
  assert.equal(sim.state.electrons.length, 0);
  sim.setOn(true);
  assert.equal(sim.state.electrons.length, 1, 'electron right after switching on');
  // tas pats, ja spožums no 0
  const s2 = sim0({ lambda: 450, intensity: 0, metal: 'Na' });
  run(s2, 2);
  assert.equal(s2.state.electrons.length, 0);
  s2.setIntensity(5);
  assert.equal(s2.state.electrons.length, 1);
  // un lapai atveroties ar ieslēgtu gaismu
  assert.equal(sim0({ lambda: 250, intensity: 5, metal: 'Zn' }).state.electrons.length, 1);
});

test('switching on fills the beam: photons already on their way, spaced by the rate', () => {
  const sim = sim0({ lambda: 650, intensity: 100, metal: 'Na' });
  assert.ok(sim.state.photons.length >= 7, `in flight: ${sim.state.photons.length}`);
  for (const p of sim.state.photons) assert.ok(sim.state.t - p.t0 >= 0 && sim.state.t - p.t0 < FLIGHT);
});

test('brightness does not change electron speed (same Wₖ, same spread)', () => {
  const speeds = (intensity) => {
    const sim = sim0({ lambda: 450, intensity, metal: 'Na' });
    const Ts = [];
    for (let i = 0; i < 600; i++) { sim.step(1 / 60); for (const e of sim.state.electrons) Ts.push(e.T); }
    return Ts;
  };
  const T0 = travelTime(kineticMaxJ(450, 'Na'));
  for (const intensity of [5, 100]) {
    const Ts = speeds(intensity);
    assert.ok(Ts.length > 0);
    for (const T of Ts) assert.ok(T >= T0 - 1e-12 && T <= T0 / (1 - SPEED_SPREAD) + 1e-12, `${intensity} %: T ${T}`);
  }
});

test('colour above the threshold does not change how many electrons leave per second', () => {
  const count = (lambda) => {
    const sim = sim0({ lambda, intensity: 30, metal: 'Na' });
    run(sim, 20);
    return sim.state.counts.electrons;
  };
  const n532 = count(532);
  for (const nm of [450, 250, 150]) assert.ok(Math.abs(count(nm) - n532) <= 1, `${nm} nm`);
});

test('electrons per second are proportional to brightness', () => {
  const count = (intensity) => {
    const sim = sim0({ lambda: 450, intensity, metal: 'Na' });
    run(sim, 20);
    return sim.state.counts.electrons;
  };
  const r = count(100) / count(20);
  assert.ok(Math.abs(r - 5) < 0.1, `ratio ${r}`);
});

test('one photon — one electron: never more electrons than photons that hit', () => {
  const sim = sim0({ lambda: 250, intensity: 60, metal: 'Cu' });
  run(sim, 10);
  assert.ok(sim.state.counts.electrons <= sim.state.counts.photons);
  assert.ok(sim.state.counts.electrons > 0);
});

test('the metal under the photon decides: switching to zinc stops green electrons at once', () => {
  const sim = sim0({ lambda: 532, intensity: 100, metal: 'Na' });
  run(sim, 1);
  const before = sim.state.counts.electrons;
  sim.setMetal('Zn');
  run(sim, 5);
  assert.equal(sim.state.counts.electrons, before);
});

test('switching off stops new photons; those in flight still land', () => {
  const sim = sim0({ lambda: 532, intensity: 100, metal: 'Na' });
  run(sim, 1);
  sim.setOn(false);
  run(sim, FLIGHT + 0.05);
  assert.equal(sim.state.photons.length, 0);
  const n = sim.state.counts.photons;
  run(sim, 2);
  assert.equal(sim.state.counts.photons, n);
});
