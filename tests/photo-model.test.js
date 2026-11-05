import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  freqOf, photonJ, workJ, thresholdNm, ejects, kineticMaxJ, currentMicroA, formatSci, sci,
  lambdaToPos, posToLambda, bandOf, travelTime, T_MAX, METAL_IDS, LAMBDA,
} from '../assets/photo/model.js';

const near = (v, want, tol, msg) => assert.ok(Math.abs(v - want) <= tol, `${msg}: ${v} ≠ ${want} ± ${tol}`);

test('acceptance numbers (spec § 8): f and W in normal form with a decimal comma', () => {
  assert.equal(formatSci(freqOf(532), 'lv'), '5,64·10¹⁴');
  assert.equal(formatSci(photonJ(532), 'lv'), '3,74·10⁻¹⁹');
  assert.equal(formatSci(freqOf(650), 'lv'), '4,62·10¹⁴');
  assert.equal(formatSci(photonJ(650), 'lv'), '3,06·10⁻¹⁹');
  assert.equal(formatSci(freqOf(250), 'lv'), '1,20·10¹⁵');
  assert.equal(formatSci(photonJ(250), 'lv'), '7,96·10⁻¹⁹');
  assert.equal(formatSci(freqOf(532), 'en'), '5.64·10¹⁴');
});

test('normal form rounds up across a power of ten', () => {
  assert.deepEqual(sci(9.996e14), { mant: 1, exp: 15, dec: 2 });
  assert.equal(formatSci(9.996e14, 'lv'), '1,00·10¹⁵');
  assert.equal(formatSci(1e15, 'lv'), '1,00·10¹⁵');
  assert.equal(sci(0), null);
});

test('work functions and thresholds (HyperPhysics: Cs 2,1 · Na 2,28 · Zn 4,3 · Cu 4,7 eV)', () => {
  assert.equal(formatSci(workJ('Cs'), 'lv'), '3,36·10⁻¹⁹');
  assert.equal(formatSci(workJ('Na'), 'lv'), '3,65·10⁻¹⁹');
  assert.equal(formatSci(workJ('Zn'), 'lv'), '6,88·10⁻¹⁹');
  assert.equal(formatSci(workJ('Cu'), 'lv'), '7,52·10⁻¹⁹');
  near(thresholdNm('Cs'), 592, 1, 'Cs');
  near(thresholdNm('Na'), 545, 1, 'Na');
  near(thresholdNm('Zn'), 289, 1, 'Zn');
  near(thresholdNm('Cu'), 264, 1, 'Cu');
});

test('lesson scenario (spec § 7): red never, green just above sodium, zinc needs UV', () => {
  assert.equal(ejects(650, 'Na'), false);
  assert.equal(ejects(532, 'Na'), true);
  assert.ok(kineticMaxJ(532, 'Na') < 0.1e-19, 'green on sodium — slow electrons');
  assert.ok(kineticMaxJ(450, 'Na') > kineticMaxJ(532, 'Na'));
  assert.ok(kineticMaxJ(250, 'Na') > kineticMaxJ(450, 'Na'));
  for (let nm = 380; nm <= 750; nm += 1) assert.equal(ejects(nm, 'Zn'), false, `visible ${nm} nm on zinc`);
  assert.equal(ejects(250, 'Zn'), true);
  for (const m of METAL_IDS) assert.equal(ejects(LAMBDA.max, m), false, `${m} in IR`);
});

test('at the threshold itself (hf = A) nothing comes out; Wₖ = 0', () => {
  for (const m of METAL_IDS) {
    const t = thresholdNm(m);
    assert.equal(ejects(t * 1.000001, m), false);
    assert.equal(kineticMaxJ(t * 1.000001, m), 0);
    assert.equal(ejects(t * 0.999, m), true);
  }
});

test('current: exactly 0 below threshold at any brightness, proportional to brightness above', () => {
  for (const intensity of [0, 1, 5, 30, 100]) {
    assert.equal(currentMicroA({ lambda: 650, intensity, metal: 'Na', on: true }), 0);
  }
  assert.equal(currentMicroA({ lambda: 532, intensity: 100, metal: 'Na', on: false }), 0);
  const i20 = currentMicroA({ lambda: 532, intensity: 20, metal: 'Na', on: true });
  const i100 = currentMicroA({ lambda: 532, intensity: 100, metal: 'Na', on: true });
  near(i100 / i20, 5, 1e-12, 'ratio');
  // krāsa virs sliekšņa strāvu nemaina
  assert.equal(currentMicroA({ lambda: 250, intensity: 30, metal: 'Na', on: true }), currentMicroA({ lambda: 532, intensity: 30, metal: 'Na', on: true }));
});

test('slider axis: λ grows to the right, round trip, visible band in the middle', () => {
  assert.equal(lambdaToPos(150), 0);
  assert.equal(lambdaToPos(1200), 1);
  near(lambdaToPos(380), 0.22, 1e-12, '380');
  near(lambdaToPos(750), 0.8, 1e-12, '750');
  for (const nm of [150, 200, 379, 380, 532, 650, 750, 900, 1200]) near(posToLambda(lambdaToPos(nm)), nm, 1e-9, `${nm}`);
  assert.ok(lambdaToPos(450) < lambdaToPos(650));
});

test('bands', () => {
  assert.equal(bandOf(250), 'uv');
  assert.equal(bandOf(450), 'blue');
  assert.equal(bandOf(532), 'green');
  assert.equal(bandOf(650), 'red');
  assert.equal(bandOf(900), 'ir');
});

test('screen speed grows with Wₖ (√), is capped near the threshold', () => {
  assert.ok(travelTime(kineticMaxJ(250, 'Na')) < travelTime(kineticMaxJ(450, 'Na')));
  assert.ok(travelTime(kineticMaxJ(450, 'Na')) < travelTime(kineticMaxJ(532, 'Na')));
  near(travelTime(4e-19) / travelTime(1e-19), 0.5, 1e-12, '√');
  assert.equal(travelTime(0), T_MAX);
  assert.ok(travelTime(1e-24) <= T_MAX);
});
