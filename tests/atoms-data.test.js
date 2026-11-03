import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ATOMS, ATOM_IDS, HC } from '../assets/atoms/atoms.js';

const lev = (a, id) => a.levels.find((l) => l.id === id);
const lam = (a, up, lo) => HC / (lev(a, up).E - lev(a, lo).E);
const line = (a, up, lo) => a.lines.find((l) => l.up === up && l.lo === lo);
const near = (v, want, tol, msg) => assert.ok(Math.abs(v - want) <= tol, `${msg}: ${v} ≠ ${want} ± ${tol}`);

test('four atoms in the order H, Na, Hg, He; hc = 1239,84 eV·nm', () => {
  assert.deepEqual(ATOM_IDS, ['H', 'Na', 'Hg', 'He']);
  assert.equal(HC, 1239.84);
  for (const id of ATOM_IDS) assert.equal(ATOMS[id].id, id);
});

test('hydrogen: Bohr levels, 15 lines, the October table', () => {
  const H = ATOMS.H;
  for (let n = 1; n <= 6; n++) near(lev(H, String(n)).E, -13.6 / n ** 2, 1e-12, `E${n}`);
  assert.equal(lev(H, 'inf').E, 0);
  assert.equal(H.lines.length, 15);
  near(lam(H, '3', '2'), 656.4, 0.1, 'Hα');
  near(lam(H, '4', '2'), 486.2, 0.1, 'Hβ');
  near(lam(H, '5', '2'), 434.1, 0.1, 'Hγ');
  near(lam(H, '6', '2'), 410.2, 0.1, 'Hδ');
  near(lam(H, '6', '5'), 7459.1, 1, 'Pfund');
  near(lam(H, '2', '1'), 121.6, 0.1, 'Lyα');
});

test('sodium: D line, second principal line, 21 lines', () => {
  const Na = ATOMS.Na;
  near(lam(Na, '3p', '3s'), 589.4, 0.1, 'D');
  near(lam(Na, '5p', '3s'), 285.4, 0.1, '5p');
  near(lam(Na, '4d', '3p'), 568.8, 0.1, '4d');
  assert.equal(Na.lines.length, 21);
});

test('mercury: one upper level gives violet, blue and green; metastable 6³P₀ and 6³P₂', () => {
  const Hg = ATOMS.Hg;
  near(lam(Hg, '7³S', '6³P₀'), 404.8, 0.1, '405');
  near(lam(Hg, '7³S', '6³P₁'), 436.0, 0.1, '436');
  near(lam(Hg, '7³S', '6³P₂'), 546.2, 0.1, '546');
  near(lam(Hg, '6D', '6¹P'), 577.5, 0.1, 'yellow (577,1 and 579,2 merged)');
  near(lam(Hg, '6³P₁', '6¹S'), 253.7, 0.1, '254');
  for (const id of ['6³P₀', '6³P₂']) {
    assert.equal(lev(Hg, id).metastable, true, id);
    assert.equal(line(Hg, id, '6¹S'), undefined, `${id} → 6¹S`);
  }
});

test('helium: D3 and the resonance line; no para–ortho lines; metastable 2³S and 2¹S; six lines beyond 10 µm', () => {
  const He = ATOMS.He;
  near(lam(He, '3³D', '2³P'), 587.7, 0.1, 'D3');
  near(lam(He, '2¹P', '1¹S'), 58.4, 0.1, '58,4');
  const spin = (id) => id[1];
  for (const l of He.lines) assert.equal(spin(l.up), spin(l.lo), `${l.up} → ${l.lo}`);
  assert.equal(lev(He, '2³S').metastable, true);
  assert.equal(lev(He, '2¹S').metastable, true);
  assert.equal(He.lines.filter((l) => lam(He, l.up, l.lo) > 10000).length, 6);
  assert.deepEqual(He.axisBreak, { from: -24, to: -5 });
});

test('every atom: lines join existing levels downward, A > 0, start exists, no dead ends', () => {
  for (const id of ATOM_IDS) {
    const a = ATOMS[id];
    assert.ok(lev(a, a.start), `${id} start`);
    for (const l of a.lines) {
      assert.ok(lev(a, l.up) && lev(a, l.lo), `${id} ${l.up}→${l.lo} levels`);
      assert.ok(lev(a, l.up).E > lev(a, l.lo).E, `${id} ${l.up}→${l.lo} downward`);
      assert.ok(l.A > 0, `${id} ${l.up}→${l.lo} A`);
      const λ = lam(a, l.up, l.lo);
      const offScaleOk = (id === 'He' || (id === 'Na' && l.up === '5p' && l.lo === '4d'));
      if (!offScaleOk) assert.ok(λ >= a.uvMin && λ <= 10000, `${id} ${l.up}→${l.lo} λ ${λ} on the column`);
    }
    const ground = a.levels.reduce((m, l) => (l.E < m.E ? l : m));
    for (const l of a.levels) {
      if (l === ground || l.metastable || l.kind === 'limit') continue;
      assert.ok(a.lines.some((x) => x.up === l.id), `${id} ${l.id} has a way down`);
    }
  }
});

test('branching ratios follow NIST A', () => {
  const share = (a, up) => {
    const ls = a.lines.filter((l) => l.up === up);
    const sum = ls.reduce((s, l) => s + l.A, 0);
    return Object.fromEntries(ls.map((l) => [l.lo, (100 * l.A) / sum]));
  };
  assert.ok(share(ATOMS.He, '2¹P')['1¹S'] > 99);
  const hg = share(ATOMS.Hg, '7³S');
  near(hg['6³P₀'], 16, 3, '405 share');
  near(hg['6³P₁'], 44, 3, '436 share');
  near(hg['6³P₂'], 39, 3, '546 share');
});

test('nuclei: protons and neutrons to draw (Ansis 04.11.: “nav obligāti pilns komplekts, bet vienkārši daudz”)', () => {
  assert.deepEqual(ATOMS.H.nucleus, { p: 1, n: 0 });
  assert.deepEqual(ATOMS.He.nucleus, { p: 2, n: 2 });
  assert.deepEqual(ATOMS.Na.nucleus, { p: 11, n: 12 });
  assert.deepEqual(ATOMS.Hg.nucleus, { p: 80, n: 122, draw: { p: 16, n: 24 } }, '²⁰²Hg — the most common isotope; the drawing shows “many”');
  for (const id of ['H', 'He', 'Na']) assert.equal(ATOMS[id].nucleus.draw, undefined, `${id}: all drawn`);
});

test('ladders: one for hydrogen, sodium and mercury; para | ortho for helium', () => {
  for (const id of ['H', 'Na', 'Hg']) assert.equal(ATOMS[id].columns.length, 1, id);
  assert.deepEqual(ATOMS.He.columns.map((c) => c.id), ['para', 'ortho']);
  for (const l of ATOMS.He.levels) {
    assert.equal(l.col, l.id[1] === '¹' ? 'para' : 'ortho', l.id);
    assert.equal(l.n, Number(l.id[0]));
    assert.equal(l.sub, l.id[2]);
  }
});
