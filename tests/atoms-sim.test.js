import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSim } from '../assets/atoms/sim.js';
import { mulberry32 } from '../assets/measure/rng.js';

const near = (v, want, tol, msg) => assert.ok(Math.abs(v - want) <= tol, `${msg}: ${v} ≠ ${want} ± ${tol}`);
// solis pa 0,05 s; atdod visus notikumus
function run(sim, seconds, dt = 0.05) {
  const ev = [];
  for (let t = 0; t < seconds - 1e-9; t += dt) ev.push(...sim.step(dt));
  return ev;
}
const sim0 = (o = {}) => createSim({ rng: mulberry32(1), ...o });

test('absorption: a matching photon is absorbed, leaves a stripe, and the electron comes back with a re-emitted photon', () => {
  const sim = sim0();
  assert.equal(sim.state.level, '2');
  sim.shoot(486.2);
  const ev = run(sim, 1.3);
  const a = ev.filter((e) => e.type === 'absorbed');
  assert.equal(a.length, 1);
  assert.deepEqual([a[0].from, a[0].to], ['2', '4']);
  assert.equal(sim.state.level, '4');
  assert.equal(sim.state.stripes.size, 1);
  near([...sim.state.stripes.values()][0], 486.2, 0.05, 'stripe');
  const back = run(sim, 1.1);
  assert.ok(back.some((e) => e.type === 'returned'));
  assert.equal(sim.state.level, '2');
  assert.equal(sim.state.photons.filter((p) => p.kind === 'reemit').length, 1);
  assert.deepEqual(sim.state.counts, { shot: 1, absorbed: 1 });
});

test('a photon that matches no step passes and leaves no stripe', () => {
  const sim = sim0();
  sim.shoot(500);
  const ev = run(sim, 1.3);
  assert.ok(ev.some((e) => e.type === 'passed'));
  assert.equal(sim.state.stripes.size, 0);
  run(sim, 1);
  assert.equal(sim.state.photons.length, 0);
});

test('while the electron is up, the next photon passes', () => {
  const sim = sim0();
  sim.shoot(486.2);
  run(sim, 0.1);
  sim.shoot(486.2);
  const ev = run(sim, 1.4);
  assert.equal(ev.filter((e) => e.type === 'absorbed').length, 1);
  assert.equal(ev.filter((e) => e.type === 'passed').length, 1);
});

test('a photon above the binding energy ionises and leaves a stripe; the electron is caught again', () => {
  const sim = sim0();
  sim.shoot(300);
  const ev = run(sim, 1.3);
  assert.ok(ev.some((e) => e.type === 'ionised'));
  assert.equal(sim.state.ionised, true);
  assert.equal(sim.state.stripes.size, 1);
  run(sim, 1.1);
  assert.equal(sim.state.ionised, false);
  assert.equal(sim.state.level, '2');
});

test('a chosen start level is where absorption starts from', () => {
  const sim = sim0();
  sim.setLevel('1');
  assert.equal(sim.state.start, '1');
  sim.shoot(121.6);
  run(sim, 1.3);
  assert.equal(sim.state.level, '2');
});

test('emission: excite to 7³S, fall to 6³P₂ — green 546,2 nm; the line appears when the photon arrives; the fall itself says 6³P₂ is metastable', () => {
  const sim = sim0({ atomId: 'Hg', mode: 'emit' });
  assert.equal(sim.state.level, '6¹S');
  assert.equal(sim.setLevel('7³S').type, 'excited');
  const e = sim.setLevel('6³P₂');
  assert.equal(e.type, 'emitted');
  near(e.λ, 546.2, 0.1, 'green');
  assert.equal(e.metastable, true);
  assert.equal(sim.state.lines.size, 0);
  const ev = run(sim, 1.3);
  assert.equal(sim.state.lines.size, 1);
  assert.equal(ev.filter((x) => x.type === 'metastable').length, 0, 'not announced twice');
});

test('emission: a forbidden fall is refused and the allowed targets are offered until the next action', () => {
  const sim = sim0({ atomId: 'Hg', mode: 'emit' });
  sim.setLevel('7³S');
  const e = sim.fall('6¹S');
  assert.equal(e.type, 'forbidden');
  assert.deepEqual([e.from, e.to], ['7³S', '6¹S']);
  assert.deepEqual([...e.allowed].sort(), ['6¹P', '6³P₀', '6³P₁', '6³P₂'].sort());
  assert.equal(sim.state.level, '7³S');
  assert.deepEqual([...sim.state.allowed].sort(), [...e.allowed].sort());
  sim.setLevel('6³P₁');
  assert.equal(sim.state.allowed, null);
});

test('cascade in helium always ends at the ground or a metastable level, announced once', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const sim = createSim({ atomId: 'He', mode: 'emit', rng: mulberry32(seed) });
    const first = sim.cascade();
    const ev = run(sim, 30, 0.1);
    assert.ok(['1¹S', '2³S', '2¹S'].includes(sim.state.level), `seed ${seed}: ${sim.state.level}`);
    const falls = ev.filter((x) => x.type === 'emitted');
    const metas = ev.filter((x) => x.type === 'metastable');
    if (falls.length) {
      const last = falls[falls.length - 1];
      assert.ok(last.metastable === true || last.to === '1¹S', `seed ${seed}`);
      assert.equal(metas.length, 0, `seed ${seed}: metastable said again`);
    } else {
      assert.equal(metas.length, 1, `seed ${seed}: excited straight to a metastable level`);
      assert.equal(first.type, 'excited');
    }
    assert.equal(sim.state.cascading, false);
  }
});

test('Review Focus 1: a hundred shots in one frame keep at most 40 photons in flight', () => {
  const sim = sim0();
  for (let i = 0; i < 100; i++) sim.shoot(400 + i);
  assert.ok(sim.state.photons.length <= 40);
  run(sim, 3);
  assert.ok(sim.state.photons.length <= 40);
});

test('Review Focus 2: changing the atom mid-flight cancels everything — no stale events', () => {
  const sim = sim0();
  sim.shoot(486.2);
  run(sim, 0.5);
  sim.setAtom('Na');
  assert.equal(sim.state.level, '3s');
  assert.equal(sim.state.photons.length, 0);
  assert.deepEqual(run(sim, 3), []);
});

test('changing the mode keeps both columns but stops white light and flights', () => {
  const sim = sim0();
  sim.shoot(486.2);
  run(sim, 1.3);
  sim.setWhite(true);
  sim.setMode('emit');
  assert.equal(sim.state.white, false);
  assert.equal(sim.state.photons.length, 0);
  assert.equal(sim.state.stripes.size, 1);
  assert.equal(sim.state.level, '1');
});

test('Review Focus 4: ten minutes of white light at 20 photons per second stay bounded', () => {
  const sim = sim0();
  sim.setRate(20);
  sim.setWhite(true);
  run(sim, 600, 0.1);
  assert.ok(sim.state.stripes.size <= 2000);
  assert.ok(sim.state.photons.length <= 40);
  assert.ok(sim.state.counts.shot > 11000 && sim.state.counts.shot < 12100, `shot ${sim.state.counts.shot}`);
  assert.ok(sim.state.counts.absorbed > 0);
});

test('clear() empties the stripes, lines and counters', () => {
  const sim = sim0();
  sim.shoot(486.2);
  run(sim, 1.3);
  sim.clear();
  assert.equal(sim.state.stripes.size, 0);
  assert.equal(sim.state.lines.size, 0);
  assert.deepEqual(sim.state.counts, { shot: 0, absorbed: 0 });
});

test('a stripe is kept once per line, however far inside the tolerance the photon was', () => {
  const sim = sim0();
  for (const λ of [486.2, 487.6, 485.0]) { sim.shoot(λ); run(sim, 2.3); }
  assert.equal(sim.state.stripes.size, 1);
});

test('the electron comes back before a photon arriving in the same frame is judged', () => {
  const sim = sim0();
  sim.shoot(486.2);
  run(sim, 1.0);
  sim.shoot(486.2);
  const ev = run(sim, 2.4);
  assert.equal(ev.filter((e) => e.type === 'absorbed').length, 2);
});

test('a passing photon says whether only the busy electron let it through', () => {
  const sim = sim0();
  sim.shoot(486.2);
  run(sim, 0.1);
  sim.shoot(486.2); // would match, but the electron is up
  sim.shoot(500); // would never match
  const ev = run(sim, 1.4).filter((e) => e.type === 'passed');
  assert.deepEqual(ev.map((e) => [Math.round(e.λ), e.busy]), [[486, true], [500, false]]);
});

test('the return after ionisation is marked as such (no photon)', () => {
  const sim = sim0();
  sim.shoot(300);
  const ev = run(sim, 2.4);
  const r = ev.find((e) => e.type === 'returned');
  assert.equal(r.kind, 'ionise');
  assert.equal(sim.state.photons.filter((p) => p.kind === 'reemit').length, 0);
});

test('choosing a start level while the atom is busy takes effect at once', () => {
  const sim = sim0();
  sim.shoot(486.2);
  run(sim, 1.3);
  assert.equal(sim.state.level, '4');
  const e = sim.setLevel('1');
  assert.deepEqual(e, { type: 'start', level: '1' });
  assert.equal(sim.state.start, '1');
  assert.equal(sim.state.level, '1');
  assert.deepEqual(run(sim, 2).filter((x) => x.type === 'returned'), []);
});

test('the intensity setting only speeds up white light — emission keeps its own pace', () => {
  const sim = createSim({ atomId: 'Hg', mode: 'absorb', rng: mulberry32(2) });
  sim.setRate(20);
  sim.setMode('emit');
  sim.setLevel('6D');
  sim.cascade();
  const ev = run(sim, 0.9);
  assert.equal(ev.filter((e) => e.type === 'emitted').length, 0, 'no fall before 1 s');
});
