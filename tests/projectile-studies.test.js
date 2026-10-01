import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STUDIES, SETTING_PARAMS, fixedSummary } from '../assets/projectile/studies.js';
import { STUDY_ART } from '../assets/projectile/study-art.js';
import { LOCKABLE, settingsFromURL } from '../assets/projectile/params.js';
import { defaultSettings, flightCheck, changedLocked, withMode, withScale, withH } from '../assets/projectile/model.js';
import { studyFixed, resolveRoute } from '../assets/measure/studies.js';
import { makeT } from '../assets/translate.js';
import { STRINGS } from '../assets/projectile/i18n.js';

const lv = { t: makeT(STRINGS, () => 'lv'), lang: 'lv' };

test('four studies in the spec order, each with texts and a drawing', () => {
  assert.deepEqual(STUDIES.map((s) => [s.id, s.no]), [['free', '01'], ['vertical', '02'], ['horizontal', '03'], ['oblique', '04']]);
  for (const s of STUDIES) {
    for (const k of ['title', 'q', 'changes']) {
      assert.ok(`study.${s.id}.${k}` in STRINGS.lv && `study.${s.id}.${k}` in STRINGS.en, `${s.id}.${k}`);
    }
    assert.match(STUDY_ART[s.id], /^<svg /);
    for (const f of s.editable) assert.ok(LOCKABLE.includes(f), `${s.id}: ${f}`);
  }
});

test('every preset gives a measurable flight on the table (Review Focus 5)', () => {
  for (const s of STUDIES) {
    const p = s.preset(defaultSettings());
    assert.equal(p.scale, 'table', s.id);
    assert.equal(flightCheck(p, { noise: 1, traps: [] }), 'ok', s.id);
  }
  const by = Object.fromEntries(STUDIES.map((s) => [s.id, s.preset(defaultSettings())]));
  assert.deepEqual([by.free.mode, by.free.v0], ['vertical', 0]);
  assert.deepEqual([by.vertical.mode, by.vertical.v0 > 0], ['vertical', true]);
  assert.equal(by.horizontal.mode, 'horizontal');
  assert.deepEqual([by.oblique.mode, by.oblique.h], ['oblique', 0]);
});

test('study-fixed values cannot be changed, also not indirectly (Review Focus 3)', () => {
  const free = STUDIES[0];
  const fixed = studyFixed(free, LOCKABLE);
  assert.deepEqual([...fixed].sort(), ['alpha', 'grid', 'mode', 'scale', 'second', 'v0', 'view']);
  const s = free.preset(defaultSettings());
  assert.deepEqual(changedLocked(s, withMode(s, 'horizontal'), fixed), ['mode']);
  // uz torni: mainās mērogs, un v₀ kļūst m/s — abi ir nofiksēti; h un Δt šajā pētījumā drīkst mainīties
  assert.deepEqual(changedLocked(s, withScale(s, 'tower'), fixed).sort(), ['scale', 'v0']);
  assert.deepEqual(changedLocked(s, withH(s, 120), fixed), []);
});

test('fixed summary lists only the study-fixed physical values', () => {
  const by = (id) => STUDIES.find((s) => s.id === id);
  const sum = (id) => fixedSummary(by(id).preset(defaultSettings()), studyFixed(by(id), LOCKABLE), lv);
  assert.equal(sum('free'), 'galds; v₀ = 0 (brīvā krišana)');
  assert.equal(sum('vertical'), 'galds');
  assert.equal(sum('oblique'), 'galds; h = 0 cm');
});

test('router: cards without params, study by id, old links full', () => {
  const r = (q) => resolveRoute(q, { studies: STUDIES, settingParams: SETTING_PARAMS });
  assert.equal(r('').kind, 'cards');
  assert.equal(r('?study=oblique').study.id, 'oblique');
  assert.equal(r('?mode=2&h=90&v0=180&dt=0.05&view=strobe&lock=1').kind, 'full');
});

test('study + teacher params: params on top of the preset, lock fixes them (Review Focus 4)', () => {
  const study = STUDIES[2];
  const p = settingsFromURL('?h=50&lock=1', { makeSeed: () => 1, base: study.preset(defaultSettings()) });
  assert.equal(p.settings.mode, 'horizontal');
  assert.equal(p.settings.h, 50);
  assert.deepEqual([...p.locked], ['h']);
});
