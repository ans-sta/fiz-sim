import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STRINGS } from '../assets/oscillation/i18n.js';

test('LV and EN have exactly the same keys', () => {
  assert.deepEqual(Object.keys(STRINGS.lv).sort(), Object.keys(STRINGS.en).sort());
});

test('the keys the shared modules need are there', () => {
  for (const k of ['page.title', 'page.heading', 'page.back', 'tb.set', 'tb.sheet', 'tb.topic', 'tb.topicValue', 'tb.themeToggle', 'tb.fullscreen',
    'hud.quantities', 'hud.more', 'hud.less', 'dims.decrease', 'dims.increase', 'notice.close',
    'url.not_number', 'url.out_of_range', 'url.not_allowed', 'url.bad_list', 'url.none', 'url.listHint',
    'gear.open', 'gear.theme', 'gear.light', 'gear.dark', 'gear.lang', 'gear.text', 'gear.textDown', 'gear.textUp',
    'gear.draw', 'gear.drawDown', 'gear.drawUp', 'gear.screen', 'gear.fullscreen',
    'q.A', 'q.T', 'q.lambda', 'q.lines', 'q.lines.on', 'q.lines.off', 'rel.title', 'rel.f', 'rel.omega', 'rel.v', 'rel.phi',
    'view.circle', 'view.trans', 'view.long', 'run.pause', 'run.play', 'hint.rotate', 'scene.aria']) {
    assert.ok(k in STRINGS.lv, `missing ${k}`);
  }
  assert.equal(STRINGS.lv['view.circle'], 'APLIS');
  assert.equal(STRINGS.lv['view.trans'], 'ŠĶĒRSVILNIS');
  assert.equal(STRINGS.lv['view.long'], 'GARENVILNIS');
  assert.equal(STRINGS.en['page.heading'], 'OSCILLATIONS AND WAVES');
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
