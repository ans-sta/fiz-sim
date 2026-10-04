import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settingsFromURL, warningText, PARAM_SCHEMA } from '../assets/oscillation/params.js';
import { defaultSettings } from '../assets/oscillation/model.js';
import { makeT } from '../assets/translate.js';
import { STRINGS } from '../assets/oscillation/i18n.js';

const lv = makeT(STRINGS, () => 'lv');

test('no params: defaults, circle view, no warnings', () => {
  const r = settingsFromURL('');
  assert.deepEqual(r.settings, defaultSettings());
  assert.equal(r.view, 'circle');
  assert.deepEqual(r.warnings, []);
});

test('all params given', () => {
  const r = settingsFromURL('?view=long&A=30&T=2,5&lambda=150&lines=0');
  assert.deepEqual(r.settings, { A: 30, T: 2.5, lambda: 150, lines: false });
  assert.equal(r.view, 'long');
  assert.deepEqual(r.warnings, []);
  assert.deepEqual(Object.keys(PARAM_SCHEMA).sort(), ['A', 'T', 'lambda', 'lines', 'view']);
});

test('out of range is clamped with a notice that names the used value', () => {
  const r = settingsFromURL('?A=100');
  assert.equal(r.settings.A, 40);
  assert.equal(r.warnings.length, 1);
  assert.deepEqual([r.warnings[0].param, r.warnings[0].reason, r.warnings[0].used], ['A', 'out_of_range', 40]);
  assert.equal(warningText(r.warnings[0], { t: lv, lang: 'lv' }),
    'Saites parametrs A=100 ir ārpus robežām (5–40). Izmantots A = 40.');
});

test('between steps is rounded silently; not a number and unknown view give notices with the used value', () => {
  assert.equal(settingsFromURL('?A=12.3').settings.A, 12);
  assert.deepEqual(settingsFromURL('?A=12.3').warnings, []);
  const t = settingsFromURL('?T=abc');
  assert.equal(t.settings.T, 4);
  assert.deepEqual([t.warnings[0].reason, t.warnings[0].used], ['not_number', 4]);
  const v = settingsFromURL('?view=side');
  assert.equal(v.view, 'circle');
  assert.deepEqual([v.warnings[0].reason, v.warnings[0].used], ['not_allowed', 'circle']);
  assert.match(warningText(v.warnings[0], { t: lv, lang: 'lv' }), /circle; trans; long/);
});

test('unknown parameters are ignored', () => {
  const r = settingsFromURL('?fbclid=xyz&A=10');
  assert.equal(r.settings.A, 10);
  assert.deepEqual(r.warnings, []);
});
