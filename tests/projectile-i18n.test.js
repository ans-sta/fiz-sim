import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { STRINGS } from '../assets/projectile/i18n.js';
import { MODES, SCALES } from '../assets/projectile/scales.js';

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

test('dynamic key families exist', () => {
  const need = [];
  for (const m of MODES) need.push(`mode.${m}`, `mode.${m}.name`, `mode.${m}.hint`, `set.mode.${m}`, `notice.noFlight.${m}`, `notice.short.${m}`, `notice.short.${m}.minDt`);
  for (const k of Object.keys(SCALES)) need.push(`scale.${k}`, `set.scale.${k}`);
  for (const k of ['mode', 'scale', 'second', 'grid']) need.push(`lock.${k}`);
  for (const r of ['not_number', 'out_of_range', 'not_allowed', 'h_range', 'v0_clamped', 'dt_scale', 'rounded', 'none']) need.push(`url.${r}`);
  for (const key of need) assert.ok(key in STRINGS.lv, `missing ${key}`);
});

test('every literal t(…) key in assets/projectile/*.js exists', () => {
  const dir = new URL('../assets/projectile/', import.meta.url);
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.js') && x !== 'i18n.js')) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    for (const m of src.matchAll(/\bt\('([a-zA-Z0-9_.]+)'/g)) assert.ok(m[1] in STRINGS.lv, `${f}: missing ${m[1]}`);
  }
});
