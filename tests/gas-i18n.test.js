import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STRINGS } from '../assets/gas/i18n.js';

test('LV and EN have exactly the same keys', () => {
  assert.deepEqual(Object.keys(STRINGS.lv).sort(), Object.keys(STRINGS.en).sort());
});

test('the keys the shared modules and the page need are there', () => {
  for (const k of ['page.title', 'page.heading', 'page.back', 'tb.set', 'tb.sheet', 'tb.topic', 'tb.topicValue', 'tb.themeToggle', 'tb.fullscreen',
    'panel.title', 'q.V', 'q.T', 'q.p', 'panel.const', 'panel.hint', 'dims.decrease', 'dims.increase', 'scene.aria', 'notice.close',
    'url.not_number', 'url.out_of_range', 'url.not_allowed', 'url.bad_list', 'url.none', 'url.listHint',
    'gear.open', 'gear.theme', 'gear.light', 'gear.dark', 'gear.lang', 'gear.text', 'gear.textDown', 'gear.textUp',
    'gear.draw', 'gear.drawDown', 'gear.drawUp', 'gear.screen', 'gear.fullscreen']) {
    assert.ok(k in STRINGS.lv, `missing ${k}`);
  }
  assert.equal(STRINGS.lv['page.heading'], 'GĀZES LIKUMS');
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
