import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settingsFromURL, warningText, PARAM_SCHEMA } from '../assets/brownian/params.js';
import { defaultSettings } from '../assets/brownian/model.js';
import { makeT } from '../assets/translate.js';
import { STRINGS } from '../assets/brownian/i18n.js';

const lv = makeT(STRINGS, () => 'lv');

test('no params: defaults; all params; clamping with a notice; unknown ignored', () => {
  assert.deepEqual(settingsFromURL('').settings, defaultSettings());
  assert.deepEqual(Object.keys(PARAM_SCHEMA).sort(), ['T', 'lens', 'molecules', 'trail']);
  const r = settingsFromURL('?T=600&trail=1&molecules=1&lens=1&fbclid=x');
  assert.deepEqual(r.settings, { T: 600, trail: true, molecules: true, lens: true });
  assert.deepEqual(r.warnings, []);
  const c = settingsFromURL('?T=5000');
  assert.equal(c.settings.T, 1000);
  assert.equal(warningText(c.warnings[0], { t: lv, lang: 'lv' }), 'Saites parametrs T=5000 ir ārpus robežām (50–1000). Izmantots T = 1000.');
});
