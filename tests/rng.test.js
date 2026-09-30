import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hash32, mulberry32, gaussian, rngFor, randomSeed } from '../assets/measure/rng.js';

test('hash32 is FNV-1a 32-bit', () => {
  assert.equal(hash32(''), 2166136261);
  assert.equal(hash32('a'), 3826002220);
});

test('mulberry32 is deterministic and stays in [0, 1)', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  for (let i = 0; i < 1000; i++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
  }
});

test('different seeds give different sequences', () => {
  assert.notEqual(mulberry32(1)(), mulberry32(2)());
});

test('gaussian has mean ≈ 0 and sd ≈ 1', () => {
  const r = mulberry32(7);
  const n = 20000;
  let s = 0;
  let s2 = 0;
  for (let i = 0; i < n; i++) {
    const g = gaussian(r);
    s += g;
    s2 += g * g;
  }
  const mean = s / n;
  const sd = Math.sqrt(s2 / n - mean * mean);
  assert.ok(Math.abs(mean) < 0.03, `mean ${mean}`);
  assert.ok(Math.abs(sd - 1) < 0.03, `sd ${sd}`);
});

test('rngFor: same parts give the same stream, other parts another', () => {
  assert.equal(rngFor(5, 'k', 1)(), rngFor(5, 'k', 1)());
  assert.notEqual(rngFor(5, 'k', 1)(), rngFor(5, 'k', 2)());
});

test('randomSeed is a 6-digit integer', () => {
  for (let i = 0; i < 100; i++) {
    const s = randomSeed();
    assert.ok(Number.isInteger(s) && s >= 100000 && s <= 999999, String(s));
  }
});
