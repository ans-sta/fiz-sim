import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ATOMS } from '../assets/atoms/atoms.js';
import { STRINGS } from '../assets/atoms/i18n.js';
import { eventText } from '../assets/atoms/text.js';

const t = (k, vars = {}) => STRINGS.lv[k].replace(/\{(\w+)\}/g, (_, v) => String(vars[v]));
const fmt = (v, d) => v.toFixed(d).replace('.', ',').replace(/^-/, '−');
const ctx = (atomId) => ({ atom: ATOMS[atomId], t, fmt });

test('a fall onto a metastable level shows its line and says it is metastable — one text', () => {
  const s = eventText({ type: 'emitted', from: '7³S', to: '6³P₂', λ: 546.23, metastable: true }, ctx('Hg'));
  assert.match(s, /7³S → 6³P₂ · ΔE 2,270 eV · λ 546,2 nm · izstarots/);
  assert.match(s, /6³P₂ — metastabils/);
});

test('a passing photon names the busy electron only when that is the reason', () => {
  assert.match(eventText({ type: 'passed', λ: 486.2, busy: true }, ctx('H')), /elektrons vēl nav atgriezies/);
  assert.match(eventText({ type: 'passed', λ: 500, busy: false }, ctx('H')), /nav atbilstoša pakāpiena/);
});

test('the return after ionisation does not claim a photon flew off', () => {
  const s = eventText({ type: 'returned', kind: 'ionise', level: '2' }, ctx('H'));
  assert.doesNotMatch(s, /fotons/);
  assert.match(s, /n = 2/);
  assert.match(eventText({ type: 'returned', kind: 'line', level: '2' }, ctx('H')), /fotons aizlidoja/);
});

test('a forbidden fall lists where the electron can fall', () => {
  const s = eventText({ type: 'forbidden', from: '7³S', to: '6¹S', allowed: ['6³P₀', '6³P₁', '6³P₂', '6¹P'] }, ctx('Hg'));
  assert.match(s, /aizliegta vai ļoti vāja/);
  assert.match(s, /6³P₀, 6³P₁, 6³P₂, 6¹P/);
});
