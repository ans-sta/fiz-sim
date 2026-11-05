import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STRINGS } from '../assets/photo/i18n.js';

test('LV and EN have exactly the same keys', () => {
  assert.deepEqual(Object.keys(STRINGS.lv).sort(), Object.keys(STRINGS.en).sort());
});

test('every key the page uses exists', () => {
  const src = readFileSync(new URL('../assets/photo/main.js', import.meta.url), 'utf8');
  const used = new Set([...src.matchAll(/(?<![\w.])t\(\s*'([a-zA-Z0-9.]+)'/g)].map((m) => m[1]));
  for (const id of ['Cs', 'Na', 'Zn', 'Cu']) { used.add(`name.${id}`); used.add(`title.${id}`); used.add(`gen.${id}`); }
  for (const b of ['uv', 'violet', 'blue', 'cyan', 'green', 'yellow', 'orange', 'red', 'ir']) used.add(`band.${b}`);
  for (const p of ['red', 'green', 'blue', 'uv']) used.add(`preset.${p}`);
  for (const k of ['what', 'photon', 'fence', 'bright', 'metals', 'simp']) { used.add(`info.${k}H`); if (k !== 'metals') used.add(`info.${k}`); }
  for (const k of ['lambda', 'f', 'W', 'A', 'Wk', 'I']) used.add(`data.${k}`);
  for (const r of ['not_number', 'out_of_range', 'not_allowed', 'bad_list', 'none', 'listHint']) used.add(`url.${r}`);
  for (const k of used) assert.ok(k in STRINGS.lv, `missing ${k}`);
  const html = readFileSync(new URL('../photoelectric-effect.html', import.meta.url), 'utf8');
  for (const m of html.matchAll(/data-i18n="([^"]+)"/g)) assert.ok(m[1] in STRINGS.lv, `html missing ${m[1]}`);
  assert.equal(STRINGS.lv['page.heading'], 'FOTOEFEKTS');
});

test('typography: no straight quotes, no "...", no spaced hyphen, no „low quotes”', () => {
  for (const lang of ['lv', 'en']) {
    for (const [k, v] of Object.entries(STRINGS[lang])) {
      assert.ok(!v.includes('"'), `${lang}.${k} has a straight double quote`);
      assert.ok(!v.includes("'"), `${lang}.${k} has a straight apostrophe`);
      assert.ok(!v.includes('...'), `${lang}.${k} has three dots`);
      assert.ok(!/ - /.test(v), `${lang}.${k} has a spaced hyphen`);
      assert.ok(!v.includes('„'), `${lang}.${k} has a low opening quote`);
    }
  }
});

test('energies are in joules; eV appears only in the eV-mode line', () => {
  for (const [k, v] of Object.entries(STRINGS.lv)) if (k !== 'info.metalItem') assert.ok(!/\beV\b/.test(v), `lv.${k} mentions eV`);
});
