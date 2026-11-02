import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STRINGS } from '../assets/emotor/i18n.js';

test('LV and EN have exactly the same keys', () => {
  assert.deepEqual(Object.keys(STRINGS.lv).sort(), Object.keys(STRINGS.en).sort());
});

test('every key the page uses exists', () => {
  const src = readFileSync(new URL('../assets/emotor/main.js', import.meta.url), 'utf8');
  const used = new Set([...src.matchAll(/(?<![\w.])t\(\s*'([a-zA-Z0-9.]+)'/g)].map((m) => m[1]));
  for (const k of ['show.current', 'show.field', 'show.force', 'show.flux', 'pose.along', 'pose.across', 'pose.between', 'info.forceH', 'info.comm', 'info.emf', 'info.lenz', 'info.numbers', 'live.motor', 'live.generator']) used.add(k);
  for (const k of used) assert.ok(k in STRINGS.lv, `missing ${k}`);
  const html = readFileSync(new URL('../motor-generator.html', import.meta.url), 'utf8');
  for (const m of html.matchAll(/data-i18n="([^"]+)"/g)) assert.ok(m[1] in STRINGS.lv, `html missing ${m[1]}`);
  assert.equal(STRINGS.lv['page.heading'], 'ĢENERATORS UN MOTORS');
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
