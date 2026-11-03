import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ATOMS } from '../assets/atoms/atoms.js';
import {
  absorb, edgeNm, cascadeStep, columnAxis, lambdaToPos, posToLambda, offScale, snap, hintTargets,
  createWhiteLight, timing, toleranceNm, linesUp, linesDown, isGround, isMetastable, INTENSITIES, DEFAULT_INTENSITY,
} from '../assets/atoms/model.js';
import { mulberry32 } from '../assets/measure/rng.js';

const { H, Na, Hg, He } = ATOMS;
const near = (v, want, tol, msg) => assert.ok(Math.abs(v - want) <= tol, `${msg}: ${v} ≠ ${want} ± ${tol}`);

test('tolerance: ±2 nm in the visible band, ±0,3 % outside it', () => {
  assert.equal(toleranceNm(500), 2);
  near(toleranceNm(121.6), 0.3648, 1e-9, 'UV');
  near(toleranceNm(1875.4), 5.6262, 1e-9, 'IR');
});

test('absorption: a matching photon lifts the electron, a near miss passes, n = 1 ignores visible light', () => {
  assert.deepEqual(pick(absorb(H, '2', 486.2)), { kind: 'line', to: '4' });
  assert.equal(absorb(H, '2', 488.1).kind, 'line');
  assert.equal(absorb(H, '2', 489.3).kind, 'pass');
  assert.equal(absorb(H, '1', 486.2).kind, 'pass');
  assert.deepEqual(pick(absorb(H, '1', 121.6)), { kind: 'line', to: '2' });
  assert.deepEqual(pick(absorb(Na, '3s', 589.4)), { kind: 'line', to: '3p' });
  near(absorb(H, '2', 487).λ, 486.2, 0.05, 'the line keeps its own λ');
});
const pick = (r) => (r.kind === 'line' ? { kind: r.kind, to: r.to } : { kind: r.kind });

test('ionisation: any photon above the binding energy frees the electron', () => {
  near(edgeNm(H, '2'), 364.7, 0.05, 'Balmer limit');
  near(edgeNm(Na, '3s'), 241.3, 0.05, 'Na 3s');
  assert.equal(absorb(H, '2', 300).kind, 'ionise');
  assert.equal(absorb(H, '6', 500).kind, 'ionise');
  assert.equal(absorb(H, '1', 80).kind, 'ionise');
  assert.equal(edgeNm(H, 'inf'), Infinity);
});

test('lines from a level: up for absorption, down for emission', () => {
  assert.deepEqual(linesUp(H, '2').map((x) => x.to), ['3', '4', '5', '6']);
  assert.deepEqual(linesDown(Hg, '7³S').map((x) => x.to).sort(), ['6¹P', '6³P₀', '6³P₁', '6³P₂'].sort());
  assert.equal(isGround(Hg, '6¹S'), true);
  assert.equal(isMetastable(Hg, '6³P₂'), true);
  assert.equal(isMetastable(Hg, '6³P₁'), false);
});

test('cascade: weighted by A; stops at the ground and at metastable levels', () => {
  const rng = mulberry32(7);
  const n = { '6³P₀': 0, '6³P₁': 0, '6³P₂': 0, '6¹P': 0 };
  for (let i = 0; i < 10000; i++) n[cascadeStep(Hg, '7³S', rng).to]++;
  near(n['6³P₀'] / 100, 16, 3, '405');
  near(n['6³P₁'] / 100, 44, 3, '436');
  near(n['6³P₂'] / 100, 39, 3, '546');
  assert.equal(cascadeStep(He, '2³S', rng), null);
  assert.equal(cascadeStep(H, '1', rng), null);
});

test('column axis: IR at the bottom, violet and UV at the top, invertible', () => {
  for (const a of [H, Na, Hg, He]) {
    const ax = columnAxis(a);
    assert.equal(ax.uvMin, a.uvMin);
    near(lambdaToPos(ax, 10000), 0, 1e-12, 'IR end');
    near(lambdaToPos(ax, 750), 0.15, 1e-12, '750');
    near(lambdaToPos(ax, 380), 0.85, 1e-12, '380');
    near(lambdaToPos(ax, a.uvMin), 1, 1e-12, 'uvMin');
    let prev = Infinity;
    for (let p = 0; p <= 1.0000001; p += 0.01) {
      const λ = posToLambda(ax, p);
      assert.ok(λ < prev, 'monotone');
      prev = λ;
      near(lambdaToPos(ax, λ), p, 1e-6, 'round trip');
    }
  }
  assert.equal(lambdaToPos(columnAxis(He), 18623), 0);
  assert.equal(offScale(18623), true);
  assert.equal(offScale(7459), false);
});

test('snap: a release close to a hint lands on it, a far one stays', () => {
  const ax = columnAxis(H);
  const targets = hintTargets(H, '2');
  const dp = lambdaToPos(ax, 650) - lambdaToPos(ax, 656.4);
  near(snap(ax, 650, targets, Math.abs(dp) + 1e-6), 656.4, 0.05, 'snapped');
  assert.equal(snap(ax, 650, targets, Math.abs(dp) / 2), 650);
});

test('hints: absorbable lines plus the ionisation edge when it is on the column', () => {
  const h = hintTargets(H, '2');
  assert.deepEqual(h.filter((x) => x.kind === 'line').map((x) => Math.round(x.λ)), [656, 486, 434, 410]);
  const e = h.find((x) => x.kind === 'edge');
  near(e.λ, 364.7, 0.05, 'edge hint');
  // Review Focus 5: from H n = 6 visible light ionises; the edge lies in IR and is still on the column
  const h6 = hintTargets(H, '6');
  assert.equal(h6.filter((x) => x.kind === 'line').length, 0);
  near(h6.find((x) => x.kind === 'edge').λ, 3281.9, 1, 'edge of n = 6 (13,6 / 36 eV)');
});

test('white light: every 4th or 5th photon is aimed at something absorbable', () => {
  const wl = createWhiteLight(mulberry32(3));
  const balmer = [656.4, 486.2, 434.1, 410.2];
  let aimed = 0;
  for (let i = 0; i < 1000; i++) {
    const λ = wl.next(H, '2');
    assert.ok(λ >= 380 && λ <= 750);
    if (balmer.some((b) => Math.abs(b - λ) < 0.1)) aimed++;
  }
  assert.ok(aimed >= 180 && aimed <= 270, `aimed ${aimed}`);

  const wl1 = createWhiteLight(mulberry32(4));
  for (let i = 0; i < 500; i++) assert.equal(absorb(H, '1', wl1.next(H, '1')).kind, 'pass');

  // Review Focus 5: H n = 3 — edge 820,5 nm, so all of the visible band ionises
  const wl3 = createWhiteLight(mulberry32(5));
  for (let i = 0; i < 200; i++) {
    const λ = wl3.next(H, '3');
    assert.ok(λ >= 380 && λ <= 750);
    assert.equal(absorb(H, '3', λ).kind, 'ionise');
  }
});

test('intensity steps and timing', () => {
  assert.deepEqual(INTENSITIES, [1, 2, 5, 10, 20]);
  assert.equal(DEFAULT_INTENSITY, 5);
  near(timing(20).flight, 0.25 * timing(5).flight, 1e-12, 'flight at 20 f/s');
  assert.deepEqual(timing(5), { flight: 1.2, hold: 1, pass: 0.8 });
  assert.deepEqual(timing(1), timing(5));
  near(timing(5, true).flight, 0.6, 1e-12, 'reduced motion');
});
