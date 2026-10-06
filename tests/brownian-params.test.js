import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settingsFromURL, warningText, PARAM_SCHEMA } from '../assets/brownian/params.js';
import { quantityRows } from '../assets/brownian/hud-model.js';
import { defaultSettings } from '../assets/brownian/model.js';
import { makeT } from '../assets/translate.js';
import { STRINGS } from '../assets/brownian/i18n.js';

const lv = makeT(STRINGS, () => 'lv');

test('no params: defaults; all params; clamping with a notice; unknown ignored', () => {
  assert.deepEqual(settingsFromURL('').settings, defaultSettings());
  assert.deepEqual(Object.keys(PARAM_SCHEMA).sort(), ['T', 'molecules', 'trail']);
  const r = settingsFromURL('?T=600&trail=0&molecules=0&fbclid=x');
  assert.deepEqual(r.settings, { T: 600, trail: false, molecules: false });
  assert.deepEqual(r.warnings, []);
  const c = settingsFromURL('?T=5000');
  assert.equal(c.settings.T, 1000);
  assert.equal(warningText(c.warnings[0], { t: lv, lang: 'lv' }), 'Saites parametrs T=5000 ir ārpus robežām (50–1000). Izmantots T = 1000.');
});

test('quantityRows: T slider in kelvins, trail and molecules as check rows under the separator', () => {
  const rows = quantityRows(defaultSettings(), { lang: 'lv', t: lv });
  assert.deepEqual(rows.map((r) => [r.key, r.kind, r.group, r.valueText]), [['T', 'range', 'main', '300 K'], ['trail', 'check', 'aside', 'rāda'], ['molecules', 'check', 'aside', 'rāda']]);
  assert.deepEqual([rows[0].min, rows[0].max, rows[0].step, rows[0].minText, rows[0].maxText], [50, 1000, 25, '50 K', '1000 K']);
});
