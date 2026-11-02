import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settingsFromURL, warningText, defaultSettings, PARAM_SCHEMA } from '../assets/emotor/params.js';
import { makeT } from '../assets/translate.js';
import { STRINGS } from '../assets/emotor/i18n.js';

const lv = makeT(STRINGS, () => 'lv');

test('no params: motor', () => {
  assert.deepEqual(settingsFromURL('').settings, defaultSettings());
  assert.deepEqual(defaultSettings(), { mode: 'motor' });
  assert.deepEqual(Object.keys(PARAM_SCHEMA), ['mode']);
});

test('mode=generator opens the generator; unknown params ignored; wrong value → motor with a notice', () => {
  assert.equal(settingsFromURL('?mode=generator&fbclid=x').settings.mode, 'generator');
  const r = settingsFromURL('?mode=dynamo');
  assert.equal(r.settings.mode, 'motor');
  assert.equal(warningText(r.warnings[0], { t: lv, lang: 'lv' }), 'Saites parametra mode vērtība “dynamo” nav atļauta. Atļautās vērtības: motor; generator. Izmantots mode = motor.');
});
