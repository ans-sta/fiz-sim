import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flightNotice } from '../assets/projectile/advice.js';
import { STUDIES } from '../assets/projectile/studies.js';
import { LOCKABLE } from '../assets/projectile/params.js';
import { defaultSettings, withMode, withH, withV0, withAlpha } from '../assets/projectile/model.js';
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
  assert.equal(flightNotice('none', withAlpha(withH(base('oblique'), 0), 0), none, t), 'Bumbiņa no zemes (h = 0) nepaceļas: leņķis α = 0, tāpēc tā tiek mesta pa zemi. Palielini h vai α.');
});

test('studies: only quantities the student may change are advised', () => {
  const free = STUDIES.find((s) => s.id === 'free');
  const sf = withH(free.preset(defaultSettings()), 0);
  assert.equal(flightNotice('none', sf, studyFixed(free, LOCKABLE), t), 'Bumbiņa jau ir uz zemes (h = 0) un nepaceļas. Palielini h.');
  const ob = STUDIES.find((s) => s.id === 'oblique');
  const so = withAlpha(ob.preset(defaultSettings()), 0);
  assert.equal(flightNotice('none', so, studyFixed(ob, LOCKABLE), t), 'Bumbiņa no zemes (h = 0) nepaceļas: leņķis α = 0, tāpēc tā tiek mesta pa zemi. Palielini h vai α.');
});

test('nothing changeable: tell the student to ask the teacher', () => {
  const h = withH(base('horizontal'), 0);
  assert.equal(flightNotice('none', h, new Set(['h', 'dt']), t), 'No zemes (h = 0) horizontāli mesta bumbiņa uzreiz ir uz zemes. Ar saitē nofiksētajiem lielumiem tas nav izmērāms — palūdz skolotājam citu saiti.');
});

test('English', () => {
  const te = makeT(STRINGS, () => 'en');
  assert.equal(flightNotice('none', withAlpha(withH(base('oblique'), 0), 0), none, te), 'The ball does not leave the ground (h = 0): the angle α = 0, so it is thrown along the ground. Increase h or α.');
  assert.equal(flightNotice('none', withV0(withH(base('oblique'), 0), 0), none, te), 'The ball does not leave the ground (h = 0): the initial speed v₀ = 0. Increase h or v₀.');
  assert.equal(flightNotice('none', withAlpha(withV0(withH(base('oblique'), 0), 0), 0), none, te), 'The ball does not leave the ground (h = 0): both v₀ = 0 and α = 0. Increase h or increase both v₀ and α (both are needed).');
});

test('oblique: the cause is named exactly and only the quantity that is zero is advised', () => {
  const h0 = withH(base('oblique'), 0);
  const alpha0 = withAlpha(withV0(h0, 15), 0);
  assert.equal(alpha0.v0, 15);
  const a = flightNotice('none', alpha0, none, t);
  assert.ok(a.includes('α = 0') && !a.includes('v₀'), a);
  const v0only = flightNotice('none', withV0(h0, 0), none, t);
  assert.equal(v0only, 'Bumbiņa no zemes (h = 0) nepaceļas: sākuma ātrums v₀ = 0. Palielini h vai v₀.');
  assert.ok(!v0only.includes('α'));
  const both = flightNotice('none', withAlpha(withV0(h0, 0), 0), none, t);
  assert.equal(both, 'Bumbiņa no zemes (h = 0) nepaceļas: gan v₀ = 0, gan α = 0. Palielini h vai palielini gan v₀, gan α (vajag abus).');
});

test('oblique: locked quantities are not advised', () => {
  const h0 = withH(base('oblique'), 0);
  const alpha0 = withAlpha(h0, 0);
  assert.equal(flightNotice('none', alpha0, new Set(['alpha']), t), 'Bumbiņa no zemes (h = 0) nepaceļas: leņķis α = 0, tāpēc tā tiek mesta pa zemi. Palielini h.');
  assert.equal(flightNotice('none', alpha0, new Set(['alpha', 'h']), t), 'Bumbiņa no zemes (h = 0) nepaceļas: leņķis α = 0, tāpēc tā tiek mesta pa zemi. Ar saitē nofiksētajiem lielumiem tas nav izmērāms — palūdz skolotājam citu saiti.');
  const both = withAlpha(withV0(h0, 0), 0);
  assert.equal(flightNotice('none', both, new Set(['v0']), t), 'Bumbiņa no zemes (h = 0) nepaceļas: gan v₀ = 0, gan α = 0. Palielini h.');
});
