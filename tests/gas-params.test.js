import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settingsFromURL, warningText, PARAM_SCHEMA } from '../assets/gas/params.js';
import { defaultSettings, NR } from '../assets/gas/model.js';
import { makeT } from '../assets/translate.js';
import { STRINGS } from '../assets/gas/i18n.js';

const lv = makeT(STRINGS, () => 'lv');

test('no params: defaults; unknown ignored', () => {
  assert.deepEqual(settingsFromURL('?fbclid=x').settings, defaultSettings());
  assert.deepEqual(Object.keys(PARAM_SCHEMA).sort(), ['T', 'V', 'p']);
});

test('params apply in link order, the one given earliest adapts: V then T → p adapts twice; T then p → V adapts', () => {
  const a = settingsFromURL('?V=1&T=600').settings;
  assert.deepEqual([a.V, a.T, a.p], [1, 600, 400]);
  const b = settingsFromURL('?T=600&p=100').settings; // T first (p adapts → 200), then p = 100: V adapts (oldest) → V = NR·600/100 = 4
  assert.deepEqual([b.T, b.p, b.V], [600, 100, 4]);
});

test('out of range is clamped with a notice naming the used value', () => {
  const r = settingsFromURL('?T=5000');
  assert.equal(r.settings.T, 600);
  assert.equal(warningText(r.warnings[0], { t: lv, lang: 'lv' }), 'Saites parametrs T=5000 ir ārpus robežām (100–600). Izmantots T = 600.');
});
