import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settingsFromURL, warningText, PARAM_SCHEMA } from '../assets/sound/params.js';
import { defaultSettings } from '../assets/sound/model.js';
import { makeT } from '../assets/translate.js';
import { STRINGS } from '../assets/sound/i18n.js';

const lv = makeT(STRINGS, () => 'lv');

test('no params: defaults, no warnings', () => {
  const r = settingsFromURL('');
  assert.deepEqual(r.settings, defaultSettings());
  assert.deepEqual(r.warnings, []);
  assert.deepEqual(Object.keys(PARAM_SCHEMA).sort(), ['f', 'phi', 'view', 'wave']);
});

test('all params given', () => {
  const r = settingsFromURL('?view=two&f=440&wave=square&phi=180');
  assert.deepEqual([r.settings.view, r.settings.f, r.settings.wave, r.settings.phi], ['two', 440, 'square', 180]);
  assert.deepEqual(r.warnings, []);
});

test('out of range is clamped with a notice; unknown view or wave gives a notice with the used value', () => {
  const r = settingsFromURL('?f=5000');
  assert.equal(r.settings.f, 2000);
  assert.equal(warningText(r.warnings[0], { t: lv, lang: 'lv' }), 'Saites parametrs f=5000 ir ārpus robežām (40–2000). Izmantots f = 2000.');
  const v = settingsFromURL('?view=sound&wave=noise');
  assert.deepEqual([v.settings.view, v.settings.wave], ['wave', 'sine']);
  assert.deepEqual(v.warnings.map((w) => [w.param, w.reason, w.used]), [['view', 'not_allowed', 'wave'], ['wave', 'not_allowed', 'sine']]);
  assert.equal(settingsFromURL('?fbclid=x&phi=47').settings.phi, 45); // between steps — rounded silently
});
