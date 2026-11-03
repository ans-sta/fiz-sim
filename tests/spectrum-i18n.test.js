import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STRINGS } from '../assets/spectrum/i18n.js';

test('LV and EN have exactly the same keys', () => {
  assert.deepEqual(Object.keys(STRINGS.lv).sort(), Object.keys(STRINGS.en).sort());
});

test('the keys the shared modules and the page need are there', () => {
  const need = ['page.title', 'page.heading', 'page.back', 'page.skip', 'tb.set', 'tb.sheet', 'tb.topic', 'tb.topicValue', 'tb.themeToggle', 'tb.fullscreen',
    'bar.mic', 'bar.view', 'bar.sens', 'bar.sensName', 'bar.fixed', 'dims.decrease', 'dims.increase',
    'run.start', 'run.starting', 'run.pause', 'run.resume', 'run.startAria', 'run.pauseAria', 'run.resumeAria',
    'view.spectrum', 'view.spectrogram', 'info.btnAria', 'info.title', 'info.close',
    'msg.intro', 'msg.starting', 'msg.startBtn', 'msg.retryBtn', 'msg.detail',
    'err.insecure', 'err.unsupported', 'err.deniedChrome', 'err.deniedSafari', 'err.deniedOther', 'err.systemMac', 'err.systemOther',
    'err.notFound', 'err.busy', 'err.other', 'err.ended',
    'read.title', 'read.silence', 'read.off', 'read.note', 'read.foot', 'read.colorAria',
    'color.red', 'color.orange', 'color.yellow', 'color.green', 'color.blue', 'color.violet',
    'rec.lo', 'rec.hi', 'rec.span', 'rec.reset', 'rec.resetAria', 'rec.newLo', 'rec.newHi', 'rec.first', 'rec.cleared',
    'live.paused', 'live.resumed', 'live.started', 'scene.aria', 'scene.ariaGram',
    'plot.paused', 'plot.threshold', 'plot.lo', 'plot.hi', 'cursor.aria', 'cursor.value',
    'notice.close', 'url.not_number', 'url.out_of_range', 'url.not_allowed', 'url.bad_list', 'url.none', 'url.listHint',
    'gear.open', 'gear.theme', 'gear.light', 'gear.dark', 'gear.lang', 'gear.text', 'gear.textDown', 'gear.textUp',
    'gear.draw', 'gear.drawDown', 'gear.drawUp', 'gear.screen', 'gear.fullscreen', 'note.0', 'note.11', 'oct.0', 'oct.10'];
  for (const k of need) assert.ok(k in STRINGS.lv, `missing ${k}`);
  assert.equal(STRINGS.lv['page.heading'], 'SKAŅAS SPEKTRA ANALIZATORS');
  assert.equal(STRINGS.lv['note.9'], 'la');
  assert.equal(STRINGS.lv['oct.4'], '1. oktāva');
});

test('error texts follow the spec wording', () => {
  assert.equal(STRINGS.lv['err.insecure'], 'Mikrofons darbojas tikai drošā adresē (https). Atver lapu ans-sta.github.io/fiz-sim/sound-spectrum.html.');
  assert.equal(STRINGS.lv['err.notFound'], 'Datoram nav pievienots mikrofons (vai tas ir izslēgts). Pievieno mikrofonu un spied ● SĀKT vēlreiz.');
  assert.match(STRINGS.lv['err.other'], /\{msg\}/);
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
