import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeT } from '../assets/translate.js';
import { STRINGS } from '../assets/rolling-ball/i18n.js';

test('makeT interpolates and falls back to the key', () => {
  let lang = 'lv';
  const t = makeT({ lv: { a: '{n}. tabula' }, en: { a: 'Table {n}' } }, () => lang);
  assert.equal(t('a', { n: 3 }), '3. tabula');
  lang = 'en';
  assert.equal(t('a', { n: 3 }), 'Table 3');
  assert.equal(t('a', {}), 'Table {n}');
  const warn = console.warn;
  console.warn = () => {};
  assert.equal(t('missing.key'), 'missing.key');
  console.warn = warn;
});

test('LV and EN have exactly the same keys', () => {
  assert.deepEqual(Object.keys(STRINGS.lv).sort(), Object.keys(STRINGS.en).sort());
});

test('typography: no straight quotes, no "...", no spaced hyphen', () => {
  for (const lang of ['lv', 'en']) {
    for (const [k, v] of Object.entries(STRINGS[lang])) {
      assert.ok(!v.includes('"'), `${lang}.${k} has a straight double quote`);
      assert.ok(!v.includes("'"), `${lang}.${k} has a straight apostrophe`);
      assert.ok(!v.includes('...'), `${lang}.${k} has three dots`);
      assert.ok(!/ - /.test(v), `${lang}.${k} has a spaced hyphen`);
    }
  }
});
