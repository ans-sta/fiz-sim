import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rollingAcceleration, effectiveRadius, fitsGroove, BETA_SOLID, BETA_HOLLOW } from '../assets/physics/rolling.js';
import { BALLS, GROOVE_W, ballById, ballMass, ballBeta, ballMu, ballFits } from '../assets/rolling-ball/balls.js';

const g = 981;
const rad = (d) => (d * Math.PI) / 180;
const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b}`);

test('flat, solid, mu = 0: a = 5/7 · g · sin α (spec 12.1)', () => {
  const a = rollingAcceleration({ g, alphaRad: rad(10), mu: 0, beta: BETA_SOLID, r: 0.8, w: GROOVE_W, profile: 'flat' });
  close(a / ((5 / 7) * g * Math.sin(rad(10))), 1, 0.005);
});

test('flat, hollow, mu = 0: a = 3/5 · g · sin α', () => {
  const a = rollingAcceleration({ g, alphaRad: rad(10), mu: 0, beta: BETA_HOLLOW, r: 2, w: GROOVE_W, profile: 'flat' });
  close(a / ((3 / 5) * g * Math.sin(rad(10))), 1, 0.005);
});

test('groove: a larger ball rolls faster; flat: diameter has no effect (spec 12.3)', () => {
  const base = { g, alphaRad: rad(5), mu: 0, beta: BETA_SOLID, w: GROOVE_W };
  assert.ok(rollingAcceleration({ ...base, r: 1.25, profile: 'groove' }) > rollingAcceleration({ ...base, r: 0.8, profile: 'groove' }));
  assert.equal(rollingAcceleration({ ...base, r: 1.25, profile: 'flat' }), rollingAcceleration({ ...base, r: 0.8, profile: 'flat' }));
});

test('mass does not enter: steel and glass of equal Ø roll alike when mu = 0 (spec 12.2)', () => {
  const steel = ballById('steel16');
  const glass = ballById('glass16');
  const common = { g, alphaRad: rad(3), mu: 0, r: 0.8, w: GROOVE_W, profile: 'groove' };
  assert.equal(
    rollingAcceleration({ ...common, beta: ballBeta(steel) }),
    rollingAcceleration({ ...common, beta: ballBeta(glass) }),
  );
});

test('a hollow ball rolls slower than a solid ball of the same Ø', () => {
  const pp = ballById('pingpong40');
  const wood = ballById('wood40');
  for (const profile of ['groove', 'flat']) {
    const common = { g, alphaRad: rad(5), mu: 0, r: 2, w: GROOVE_W, profile };
    assert.ok(rollingAcceleration({ ...common, beta: ballBeta(pp) }) < rollingAcceleration({ ...common, beta: ballBeta(wood) }), profile);
  }
});

test('calibration: "mūsu renīte" (L = 80 cm, h = 3,0 cm, steel Ø 16 mm) gives a ≈ 18.88 cm/s²', () => {
  const b = ballById('steel16');
  const a = rollingAcceleration({ g, alphaRad: Math.asin(3 / 80), mu: ballMu(b), beta: ballBeta(b), r: 0.8, w: GROOVE_W, profile: 'groove' });
  close(a, 18.883, 0.01);
});

test('rolling friction holds the ball on a tiny slope', () => {
  const b = ballById('steel16');
  const a = rollingAcceleration({ g, alphaRad: Math.asin(0.1 / 80), mu: ballMu(b), beta: ballBeta(b), r: 0.8, w: GROOVE_W, profile: 'groove' });
  assert.ok(a <= 0);
});

test('effective radius: flat = r, groove = sqrt(r² − (w/2)²)', () => {
  assert.equal(effectiveRadius(0.8, GROOVE_W, 'flat'), 0.8);
  close(effectiveRadius(0.8, GROOVE_W, 'groove'), Math.sqrt(0.64 - (GROOVE_W / 2) ** 2), 1e-12);
});

test('only balls wider than the groove gap fit the groove', () => {
  assert.equal(fitsGroove(0.5, GROOVE_W), false);
  assert.equal(ballFits(ballById('steel10'), 'groove'), false);
  assert.equal(ballFits(ballById('steel10'), 'flat'), true);
  for (const b of BALLS.filter((x) => x.id !== 'steel10')) assert.equal(ballFits(b, 'groove'), true, b.id);
});

test('ball masses follow m = ρV (hollow ball: catalogue mass)', () => {
  const expected = { steel10: 4.11, steel16: 16.84, steel25: 64.22, glass16: 5.36, glass25: 20.45, wood25: 5.73, wood40: 23.46, plastic25: 9.82, pingpong40: 2.7 };
  for (const [id, m] of Object.entries(expected)) close(ballMass(ballById(id)), m, 0.01, id);
});
