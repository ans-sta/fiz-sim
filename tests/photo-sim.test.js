import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSim, FLIGHT } from '../assets/photo/sim.js';
import { travelTime, kineticMaxJ, SPEED_SPREAD, stoppingVoltage, reachFraction } from '../assets/photo/model.js';
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
    const vs = [];
    for (let i = 0; i < 600; i++) { sim.step(1 / 60); for (const e of sim.state.electrons) vs.push(e.v0); }
    return vs;
  };
  const vMax = 1 / travelTime(kineticMaxJ(450, 'Na'));
  for (const intensity of [5, 100]) {
    const vs = speeds(intensity);
    assert.ok(vs.length > 0);
    for (const v of vs) assert.ok(v <= vMax + 1e-12 && v >= vMax * (1 - SPEED_SPREAD) - 1e-12, `${intensity} %: v ${v}`);
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

test('reverse voltage at or above U_b: every electron stops and turns back, none reaches the anode', () => {
  for (const [lambda, metal] of [[450, 'Na'], [250, 'Zn'], [532, 'Na']]) {
    const Ub = stoppingVoltage(lambda, metal);
    for (const voltage of [Ub, Ub + 0.01, 3]) {
      if (voltage < Ub) continue;
      const sim = sim0({ lambda, metal, intensity: 100, voltage, reverse: true });
      run(sim, 25);
      assert.equal(sim.state.counts.arrived, 0, `${lambda} nm ${metal} U ${voltage}`);
      assert.ok(sim.state.counts.returned > 0, 'they did come out and turn back');
    }
  }
});

test('reverse voltage below U_b: the share reaching the anode matches the current formula', () => {
  const lambda = 250;
  const metal = 'Na';
  const Ub = stoppingVoltage(lambda, metal);
  for (const k of [0.5, 0.8, 0.9, 0.97]) {
    const voltage = Ub * k;
    const sim = sim0({ lambda, metal, intensity: 100, voltage, reverse: true });
    run(sim, 60);
    const done = sim.state.counts.arrived + sim.state.counts.returned;
    const share = sim.state.counts.arrived / done;
    const expect = reachFraction({ lambda, metal, voltage, reverse: true });
    assert.ok(Math.abs(share - expect) < 0.05, `k ${k}: share ${share.toFixed(3)} expected ${expect.toFixed(3)}`);
  }
});

test('electrons turning back stop where Wₖ = e·U·x (half way when e·U = 2·Wₖ)', () => {
  const lambda = 250;
  const metal = 'Na';
  const sim = sim0({ lambda, metal, intensity: 100, voltage: 2 * stoppingVoltage(lambda, metal), reverse: true });
  let far = 0;
  for (let i = 0; i < 600; i++) { sim.step(1 / 120); for (const e of sim.state.electrons) far = Math.max(far, e.x); }
  assert.ok(far > 0.45 && far <= 0.5 + 1e-9, `furthest ${far}`);
});

test('accelerating voltage: everyone arrives, sooner than without voltage', () => {
  const time = (voltage) => {
    const sim = sim0({ lambda: 450, metal: 'Na', intensity: 100, voltage });
    const t0 = sim.state.t;
    while (sim.state.counts.arrived === 0) sim.step(1 / 240);
    return sim.state.t - t0;
  };
  assert.ok(time(2) < time(0));
  const sim = sim0({ lambda: 450, metal: 'Na', intensity: 100, voltage: 6 });
  run(sim, 10);
  assert.equal(sim.state.counts.returned, 0);
});

test('steady-beam view: switching off, colour and intensity act on the plate at once (no photons still in flight)', () => {
  const sim = sim0({ lambda: 532, intensity: 100, metal: 'Na', waves: true });
  run(sim, 2);
  sim.setLambda(650); // sarkans — vairs neizsit
  const n = sim.state.counts.electrons;
  run(sim, 1);
  assert.equal(sim.state.counts.electrons, n, 'red right away');
  sim.setLambda(450);
  run(sim, 2);
  sim.setOn(false);
  const m = sim.state.counts.electrons;
  run(sim, 2);
  assert.equal(sim.state.counts.electrons, m, 'off right away');
  // intensitāte: jaunais ātrums uzreiz
  const s2 = sim0({ lambda: 450, intensity: 100, metal: 'Na', waves: true });
  run(s2, 2);
  s2.setIntensity(20);
  const a = s2.state.counts.electrons;
  run(s2, 10);
  const rate = (s2.state.counts.electrons - a) / 10;
  assert.ok(Math.abs(rate - 24 * 0.2) < 0.6, `rate ${rate}`);
});
