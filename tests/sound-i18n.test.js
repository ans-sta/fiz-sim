import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STRINGS } from '../assets/sound/i18n.js';

test('LV and EN have exactly the same keys', () => {
  assert.deepEqual(Object.keys(STRINGS.lv).sort(), Object.keys(STRINGS.en).sort());
});

test('the keys the shared modules and the page need are there', () => {
  for (const k of ['page.title', 'page.heading', 'page.back', 'tb.set', 'tb.sheet', 'tb.topic', 'tb.topicValue', 'tb.themeToggle', 'tb.fullscreen',
    'hud.quantities', 'hud.more', 'hud.less', 'hud.fold', 'hud.unfold', 'dims.decrease', 'dims.increase', 'notice.close',
    'url.not_number', 'url.out_of_range', 'url.not_allowed', 'url.bad_list', 'url.none', 'url.listHint',
    'gear.open', 'gear.theme', 'gear.light', 'gear.dark', 'gear.lang', 'gear.text', 'gear.textDown', 'gear.textUp',
    'gear.draw', 'gear.drawDown', 'gear.drawUp', 'gear.screen', 'gear.fullscreen',
    'q.f', 'q.wave', 'q.vol', 'q.ampA', 'q.ampB', 'q.phi', 'q.srcA', 'q.srcB', 'q.out', 'q.preset', 'q.instr', 'q.overlay',
    'rel.title', 'rel.T', 'rel.lambda', 'rel.note', 'rel.phi', 'rel.dt', 'rel.R', 'rel.count',
    'view.wave', 'view.two', 'view.harmonics', 'run.play', 'run.stop', 'keys.hint', 'scene.aria', 'scene.toHarm']) {
    assert.ok(k in STRINGS.lv, `missing ${k}`);
  }
  for (let i = 0; i < 12; i++) assert.ok(`note.${i}` in STRINGS.lv);
  for (let i = 0; i < 8; i++) assert.ok(`oct.${i}` in STRINGS.lv && `octShort.${i}` in STRINGS.lv);
  for (const w of ['sine', 'triangle', 'sawtooth', 'square']) assert.ok(`wave.${w}` in STRINGS.lv && `preset.${w}` in STRINGS.lv);
  for (const p of ['flute', 'clarinet', 'violin', 'trumpet']) assert.ok(`instr.${p}` in STRINGS.lv && `instr.note.${p}` in STRINGS.lv);
  assert.equal(STRINGS.lv['view.wave'], 'VIĻŅA FORMA');
  assert.equal(STRINGS.en['page.heading'], 'SOUND LAB');
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
