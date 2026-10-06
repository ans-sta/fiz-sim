import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STRINGS } from '../assets/brownian/i18n.js';

test('LV and EN have exactly the same keys', () => {
  assert.deepEqual(Object.keys(STRINGS.lv).sort(), Object.keys(STRINGS.en).sort());
});

test('the keys the shared modules and the page need are there', () => {
  for (const k of ['page.title', 'page.heading', 'page.back', 'tb.set', 'tb.sheet', 'tb.topic', 'tb.topicValue', 'tb.themeToggle', 'tb.fullscreen',
    'bar.T', 'bar.Tname', 'bar.show', 'bar.trail', 'bar.molecules', 'bar.lens', 'bar.lensAria', 'bar.run', 'dims.decrease', 'dims.increase', 'notice.close',
    'url.not_number', 'url.out_of_range', 'url.not_allowed', 'url.bad_list', 'url.none', 'url.listHint',
    'gear.open', 'gear.theme', 'gear.light', 'gear.dark', 'gear.lang', 'gear.text', 'gear.textDown', 'gear.textUp',
    'gear.draw', 'gear.drawDown', 'gear.drawUp', 'gear.screen', 'gear.fullscreen',
    'run.pause', 'run.play', 'run.reset', 'run.resetAria', 'scene.aria']) {
    assert.ok(k in STRINGS.lv, `missing ${k}`);
  }
  assert.equal(STRINGS.lv['page.heading'], 'BRAUNA KUSTĪBA');
  assert.equal(STRINGS.en['page.heading'], 'BROWNIAN MOTION');
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
