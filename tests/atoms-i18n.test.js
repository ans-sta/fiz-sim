import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STRINGS } from '../assets/atoms/i18n.js';

test('LV and EN have exactly the same keys', () => {
  assert.deepEqual(Object.keys(STRINGS.lv).sort(), Object.keys(STRINGS.en).sort());
});

test('every key the page uses exists', () => {
  const src = readFileSync(new URL('../assets/atoms/main.js', import.meta.url), 'utf8');
  const used = new Set([...src.matchAll(/(?<![\w.])t\(\s*'([a-zA-Z0-9.]+)'/g)].map((m) => m[1]));
  for (const id of ['H', 'Na', 'Hg', 'He']) { used.add(`name.${id}`); used.add(`title.${id}`); }
  for (const b of ['uv', 'violet', 'blue', 'cyan', 'green', 'yellow', 'orange', 'red', 'ir']) used.add(`band.${b}`);
  for (const k of ['absorbed', 'passed', 'passedBusy', 'ionised', 'returned', 'start', 'excited', 'emitted', 'forbidden', 'metastable']) used.add(`ro.${k}`);
  for (const k of ['abs', 'emit', 'ion', 'simp']) { used.add(`info.${k}`); used.add(`info.${k}H`); }
  for (const k of used) assert.ok(k in STRINGS.lv, `missing ${k}`);
  const html = readFileSync(new URL('../atomic-spectra.html', import.meta.url), 'utf8');
  for (const m of html.matchAll(/data-i18n="([^"]+)"/g)) assert.ok(m[1] in STRINGS.lv, `html missing ${m[1]}`);
  assert.equal(STRINGS.lv['page.heading'], 'ATOMU SPEKTRI');
});

test('typography: no straight quotes, no "...", no spaced hyphen, no “šķipsna”', () => {
  for (const lang of ['lv', 'en']) {
    for (const [k, v] of Object.entries(STRINGS[lang])) {
      assert.ok(!v.includes('"'), `${lang}.${k} has a straight double quote`);
      assert.ok(!v.includes("'"), `${lang}.${k} has a straight apostrophe`);
      assert.ok(!v.includes('...'), `${lang}.${k} has three dots`);
      assert.ok(!/ - /.test(v), `${lang}.${k} has a spaced hyphen`);
      assert.ok(!/šķipsn/i.test(v), `${lang}.${k} uses “šķipsna”`);
    }
  }
});
