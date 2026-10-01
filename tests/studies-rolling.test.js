import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STUDIES, SETTING_PARAMS, fixedSummary } from '../assets/rolling-ball/studies.js';
import { STUDY_ART } from '../assets/rolling-ball/study-art.js';
import { LOCKABLE, settingsFromURL } from '../assets/rolling-ball/params.js';
import { defaultSettings, derive, changedLocked, withAlpha, withGate, withX0, withH } from '../assets/rolling-ball/model.js';
import { simulateRun } from '../assets/rolling-ball/experiment.js';
import { studyFixed, resolveRoute } from '../assets/measure/studies.js';
import { makeT } from '../assets/translate.js';
import { STRINGS } from '../assets/rolling-ball/i18n.js';

const lv = { t: makeT(STRINGS, () => 'lv'), lang: 'lv' };
const by = (id) => STUDIES.find((s) => s.id === id);

test('four studies in the spec order with texts, measure line and a drawing', () => {
  assert.deepEqual(STUDIES.map((s) => [s.id, s.no]), [['a', '01'], ['t', '02'], ['x', '03'], ['strobe', '04']]);
  for (const s of STUDIES) {
    for (const k of ['title', 'q', 'changes', 'measure']) assert.ok(`study.${s.id}.${k}` in STRINGS.lv && `study.${s.id}.${k}` in STRINGS.en, `${s.id}.${k}`);
    assert.equal(s.measure, true);
    assert.match(STUDY_ART[s.id], /^<svg /);
    for (const f of [...s.editable, ...(s.coupled ?? [])]) assert.ok(LOCKABLE.includes(f), `${s.id}: ${f}`);
  }
});

test('presets: levels, slope set by α in a(α), views; every preset rolls (Review Focus 5)', () => {
  const p = Object.fromEntries(STUDIES.map((s) => [s.id, s.preset(defaultSettings())]));
  assert.deepEqual([p.a.level, p.a.angleMode], [1, 'alpha']);
  assert.deepEqual([p.t.level, p.t.timer], [2, 'gate']);
  assert.equal(p.x.level, 3);
  assert.equal(p.strobe.level, 3);
  assert.deepEqual(by('x').views, { table: true, strobe: false });
  assert.deepEqual(by('strobe').views, { table: false, strobe: true });
  for (const s of STUDIES) {
    const set = s.preset(defaultSettings());
    assert.ok(derive(set).rolls, s.id);
    assert.equal(simulateRun(set, { seed: 1, repeat: 1, noise: 1, traps: [] }).rolls, true, s.id);
  }
});

test('fixed sets; coupled h/α stay changeable together (Review Focus 3)', () => {
  const fa = studyFixed(by('a'), LOCKABLE);
  assert.ok(!fa.has('h') && !fa.has('alpha'));
  const a = by('a').preset(defaultSettings());
  assert.deepEqual(changedLocked(a, withAlpha(a, 5), fa), []);
  const ft = studyFixed(by('t'), LOCKABLE);
  const t = by('t').preset(defaultSettings());
  assert.deepEqual(changedLocked(t, withGate(t, 0, t.gates[0] + 3), ft), []);
  assert.deepEqual(changedLocked(t, withX0(t, 5), ft), ['x0']);
  assert.ok(changedLocked(t, withH(t, 5), ft).includes('h'));
  const fx = studyFixed(by('x'), LOCKABLE);
  assert.ok(!fx.has('h') && !fx.has('alpha') && !fx.has('dt') && fx.has('ball') && fx.has('tape'));
  assert.ok(!studyFixed(by('strobe'), LOCKABLE).has('tape'));
});

test('fixed summary', () => {
  const sum = (id) => fixedSummary(by(id).preset(defaultSettings()), studyFixed(by(id), LOCKABLE), lv);
  assert.equal(sum('a'), 'L = 80 cm; lodīte: tērauds, Ø 16 mm, 16,8 g; renīte; kustības sākumpunkts x₀ = 0,0 cm; finišs x = 70,0 cm');
  assert.equal(sum('t'), 'L = 80 cm; h = 3,0 cm (α = 2,1°); lodīte: tērauds, Ø 16 mm, 16,8 g; renīte; kustības sākumpunkts x₀ = 0,0 cm');
  assert.equal(sum('x'), 'L = 80 cm; lodīte: tērauds, Ø 16 mm, 16,8 g; renīte; kustības sākumpunkts x₀ = 0,0 cm');
});

test('router and teacher params on top of a study (Review Focus 1, 4)', () => {
  const r = (q) => resolveRoute(q, { studies: STUDIES, settingParams: SETTING_PARAMS });
  assert.equal(r('').kind, 'cards');
  assert.equal(r('?L=80&h=2.0&ball=steel16&level=3&dt=0.5&view=strobe&lock=1').kind, 'full');
  assert.equal(r('?study=t').study.id, 't');
  const p = settingsFromURL('?h=5&lock=1', { makeSeed: () => 1, base: by('x').preset(defaultSettings()) });
  assert.equal(p.settings.level, 3);
  assert.equal(p.settings.h, 5);
  assert.deepEqual([...p.locked], ['h']);
});
