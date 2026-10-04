import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flightNotice } from '../assets/projectile/advice.js';
import { STUDIES } from '../assets/projectile/studies.js';
import { LOCKABLE } from '../assets/projectile/params.js';
import { defaultSettings, withMode, withH, withV0 } from '../assets/projectile/model.js';
import { studyFixed } from '../assets/measure/studies.js';
import { makeT } from '../assets/translate.js';
import { STRINGS } from '../assets/projectile/i18n.js';

const t = makeT(STRINGS, () => 'lv');
const none = new Set();
const base = (mode) => withMode(defaultSettings(), mode);

test('full mode: every quantity is offered', () => {
  const v = withV0(withH(base('vertical'), 0), 0);
  assert.equal(flightNotice('none', v, none, t), 'Bumbiņa jau ir uz zemes (h = 0) un nepaceļas. Palielini h vai met uz augšu (v₀ > 0).');
  assert.equal(flightNotice('none', withH(base('horizontal'), 0), none, t), 'No zemes (h = 0) horizontāli mesta bumbiņa uzreiz ir uz zemes. Palielini h.');
  assert.equal(flightNotice('none', withH(base('oblique'), 0), none, t), 'Bumbiņa no zemes (h = 0) nepaceļas, jo v₀ = 0 vai α = 0. Palielini h, v₀ vai α.');
});

test('studies: only quantities the student may change are advised', () => {
  const free = STUDIES.find((s) => s.id === 'free');
  const sf = withH(free.preset(defaultSettings()), 0);
  assert.equal(flightNotice('none', sf, studyFixed(free, LOCKABLE), t), 'Bumbiņa jau ir uz zemes (h = 0) un nepaceļas. Palielini h.');
  const ob = STUDIES.find((s) => s.id === 'oblique');
  const so = ob.preset(defaultSettings());
  assert.equal(flightNotice('none', so, studyFixed(ob, LOCKABLE), t), 'Bumbiņa no zemes (h = 0) nepaceļas, jo v₀ = 0 vai α = 0. Palielini v₀ vai α.');
});

test('nothing changeable: tell the student to ask the teacher', () => {
  const h = withH(base('horizontal'), 0);
  assert.equal(flightNotice('none', h, new Set(['h', 'dt']), t), 'No zemes (h = 0) horizontāli mesta bumbiņa uzreiz ir uz zemes. Ar saitē nofiksētajiem lielumiem tas nav izmērāms — palūdz skolotājam citu saiti.');
});

test('English', () => {
  const te = makeT(STRINGS, () => 'en');
  assert.equal(flightNotice('none', withH(base('oblique'), 0), none, te), 'The ball does not leave the ground (h = 0) because v₀ = 0 or α = 0. Increase h, v₀ or α.');
});
