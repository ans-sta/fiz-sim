import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { STRINGS } from '../assets/projectile/i18n.js';
import { MODES } from '../assets/projectile/scales.js';

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
  for (const m of MODES) need.push(`mode.${m}`, `set.mode.${m}`);
  need.push('notice.noFlight.vertical', 'notice.noFlight.horizontal', 'notice.noFlight.oblique.v0', 'notice.noFlight.oblique.alpha', 'notice.noFlight.oblique.both', 'fix.increaseBoth');
  need.push('fix.increase', 'fix.upNone', 'fix.or', 'fix.none');
  for (const k of ['mode', 'second', 'grid']) need.push(`lock.${k}`);
  for (const r of ['not_number', 'out_of_range', 'not_allowed', 'h_range', 'v0_clamped', 'scale_removed', 'rounded', 'none']) need.push(`url.${r}`);
  for (const key of need) assert.ok(key in STRINGS.lv, `missing ${key}`);
});

test('removed keys are gone', () => {
  for (const k of ['scale.table', 'scale.tower', 'set.scale.table', 'set.scale.tower', 'notice.short', 'notice.short.minDt', 'fix.dt', 'mode.vertical.name', 'mode.horizontal.name', 'mode.oblique.name', 'mode.vertical.hint', 'mode.horizontal.hint', 'mode.oblique.hint', 'slow', 'second', 'notice.noFlight.oblique']) {
    assert.ok(!(k in STRINGS.lv) && !(k in STRINGS.en), k);
  }
});

test('every literal t(…) key in assets/projectile/*.js exists', () => {
  const dir = new URL('../assets/projectile/', import.meta.url);
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.js') && x !== 'i18n.js')) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    for (const m of src.matchAll(/\bt\('([a-zA-Z0-9_.]+)'/g)) assert.ok(m[1] in STRINGS.lv, `${f}: missing ${m[1]}`);
  }
});

test('link notices never mention the removed scale, except url.scale_removed', () => {
  for (const [lang, word] of [['lv', /mērog/i], ['en', /scale/i]]) {
    for (const [k, v] of Object.entries(STRINGS[lang])) {
      if (!k.startsWith('url.') || k === 'url.scale_removed') continue;
      assert.ok(!word.test(v), `${lang}.${k}: ${v}`);
    }
  }
});
