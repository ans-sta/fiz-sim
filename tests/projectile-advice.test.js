import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flightNotice } from '../assets/projectile/advice.js';
import { STUDIES } from '../assets/projectile/studies.js';
import { LOCKABLE } from '../assets/projectile/params.js';
import { defaultSettings, withMode, withH, withV0, withDt } from '../assets/projectile/model.js';
import { studyFixed } from '../assets/measure/studies.js';
import { makeT } from '../assets/translate.js';
import { STRINGS } from '../assets/projectile/i18n.js';

const t = makeT(STRINGS, () => 'lv');
const none = new Set();
const base = (mode) => withMode(defaultSettings(), mode);
const SHORT = 'Lidojums ir par īsu: stroboskopā būtu mazāk nekā 3 pozīcijas';

test('full mode: every quantity is offered', () => {
  const v = withV0(withH(base('vertical'), 0), 0);
  assert.equal(flightNotice('none', v, none, t), 'Bumbiņa jau ir uz zemes (h = 0) un nepaceļas. Palielini h vai met uz augšu (v₀ > 0).');
  assert.equal(flightNotice('none', withH(base('horizontal'), 0), none, t), 'No zemes (h = 0) horizontāli mesta bumbiņa uzreiz ir uz zemes. Palielini h.');
  assert.equal(flightNotice('none', withH(base('oblique'), 0), none, t), 'Bumbiņa no zemes (h = 0) nepaceļas, jo v₀ = 0 vai α = 0. Palielini h, v₀ vai α.');
});

test('short flights: smaller Δt only when not already the smallest', () => {
  const v = withDt(base('vertical'), 0.05);
  assert.equal(flightNotice('short', v, none, t), `${SHORT}. Izvēlies mazāku Δt, palielini h vai met bumbiņu uz augšu.`);
  const h = withDt(base('horizontal'), 0.05);
  assert.equal(flightNotice('short', h, none, t), `${SHORT}. Izvēlies mazāku Δt vai palielini h.`);
  const hMin = withDt(base('horizontal'), 0.02);
  assert.equal(flightNotice('short', hMin, none, t), `${SHORT}, pat ar mazāko Δt. Palielini h.`);
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
  const h = withDt(base('horizontal'), 0.05);
  assert.equal(flightNotice('short', h, new Set(['h', 'dt']), t), `${SHORT}. Ar saitē nofiksētajiem lielumiem tas nav izmērāms — palūdz skolotājam citu saiti.`);
});

test('English', () => {
  const te = makeT(STRINGS, () => 'en');
  assert.equal(flightNotice('none', withH(base('oblique'), 0), none, te), 'The ball does not leave the ground (h = 0) because v₀ = 0 or α = 0. Increase h, v₀ or α.');
});
