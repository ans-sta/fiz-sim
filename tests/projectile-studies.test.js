import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STUDIES, SETTING_PARAMS, fixedSummary } from '../assets/projectile/studies.js';
import { STUDY_ART } from '../assets/projectile/study-art.js';
import { LOCKABLE, settingsFromURL } from '../assets/projectile/params.js';
import { defaultSettings, flightCheck, changedLocked, withMode, withH, withDt, withV0 } from '../assets/projectile/model.js';
import { studyFixed, resolveRoute, filterStudyParams } from '../assets/measure/studies.js';
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

test('every preset gives a measurable flight (Review Focus 5)', () => {
  for (const s of STUDIES) {
    const p = s.preset(defaultSettings());
    assert.ok(!('scale' in p), s.id);
    assert.equal(flightCheck(p), 'ok', s.id);
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
  assert.deepEqual([...fixed].sort(), ['alpha', 'grid', 'mode', 'second', 'v0', 'view']);
  const s = free.preset(defaultSettings());
  assert.deepEqual(changedLocked(s, withMode(s, 'horizontal'), fixed), ['mode']);
  assert.deepEqual(changedLocked(s, withV0(s, 5), fixed), ['v0']);
  // h un Δt šajā pētījumā drīkst mainīties
  assert.deepEqual(changedLocked(s, withDt(withH(s, 30), 0.5), fixed), []);
});

test('fixed summary lists only the study-fixed physical values', () => {
  const by = (id) => STUDIES.find((s) => s.id === id);
  const sum = (id) => fixedSummary(by(id).preset(defaultSettings()), studyFixed(by(id), LOCKABLE), lv);
  assert.equal(sum('free'), 'v₀ = 0 (brīvā krišana)');
  assert.equal(sum('vertical'), '');
  assert.equal(sum('oblique'), '');
});

test('router: cards without params, study by id, old links full', () => {
  const r = (q) => resolveRoute(q, { studies: STUDIES, settingParams: SETTING_PARAMS });
  assert.equal(r('').kind, 'cards');
  assert.equal(r('?study=oblique').study.id, 'oblique');
  assert.equal(r('?mode=2&h=30&v0=18&dt=0.5&view=strobe&lock=1').kind, 'full');
});

test('study + teacher params: params on top of the preset, lock fixes them (Review Focus 4)', () => {
  const study = STUDIES[2];
  const p = settingsFromURL('?h=50&lock=1', { makeSeed: () => 1, base: study.preset(defaultSettings()) });
  assert.equal(p.settings.mode, 'horizontal');
  assert.equal(p.settings.h, 50);
  assert.deepEqual([...p.locked], ['h']);
});

// kā main.js: pētījumā saites parametri nofiksētajiem lielumiem tiek izmesti pirms settingsFromURL
function studyFromLink(search) {
  const route = resolveRoute(search, { studies: STUDIES, settingParams: SETTING_PARAMS });
  const study = route.study;
  const f = filterStudyParams(search, studyFixed(study, LOCKABLE));
  const url = settingsFromURL(f.search, { makeSeed: () => 1, base: study.preset(defaultSettings()) });
  return { url, ignored: f.ignored };
}

test('study keeps its own preset: link params for study-fixed fields are ignored (I1)', () => {
  let r = studyFromLink('?study=free&v0=5');
  assert.equal(r.url.settings.v0, 0);
  assert.deepEqual(r.ignored, [{ param: 'v0', raw: '5' }]);
  r = studyFromLink('?study=horizontal&mode=1');
  assert.equal(r.url.settings.mode, 'horizontal');
  assert.deepEqual(r.ignored, [{ param: 'mode', raw: '1' }]);
  r = studyFromLink('?study=free&mode=3');
  assert.deepEqual([r.url.settings.mode, r.url.settings.v0], ['vertical', 0]);
  r = studyFromLink('?study=horizontal&h=50&lock=1');
  assert.equal(r.url.settings.h, 50);
  assert.ok(r.url.locked.has('h'));
  assert.deepEqual(r.ignored, []);
});

test('studies are in metres with the spec presets', () => {
  const p = (id) => STUDIES.find((x) => x.id === id).preset(defaultSettings());
  assert.deepEqual([p('free').mode, p('free').h, p('free').v0], ['vertical', 20, 0]);
  assert.deepEqual([p('vertical').h, p('vertical').v0], [20, 10]);
  assert.deepEqual([p('horizontal').mode, p('horizontal').h, p('horizontal').v0], ['horizontal', 20, 10]);
  assert.deepEqual([p('oblique').mode, p('oblique').h, p('oblique').v0, p('oblique').alphaDeg], ['oblique', 0, 15, 45]);
  assert.deepEqual(STUDIES.find((x) => x.id === 'oblique').editable, ['v0', 'alpha', 'h', 'dt']);
});

test('no K-02 text mentions the table or the tower', () => {
  for (const lang of ['lv', 'en']) {
    for (const [k, v] of Object.entries(STRINGS[lang])) {
      assert.ok(!/gald|torn|\btower\b|\bon the table\b|lab table/i.test(v), `${lang} ${k}: ${v}`);
    }
  }
});

test('old link scale=table opens full control (the notice is shown there)', () => {
  const r = resolveRoute('?scale=table', { studies: STUDIES, settingParams: SETTING_PARAMS });
  assert.equal(r.kind, 'full');
});

test('strobe notes: one for two tapes, one for the single falling tape, LV and EN', () => {
  for (const lang of ['lv', 'en']) {
    assert.ok(STRINGS[lang]['strobe.verticalNote'] && STRINGS[lang]['strobe.verticalNoteDown'], lang);
    assert.ok(!/↑/.test(STRINGS[lang]['strobe.verticalNoteDown']), lang);
  }
});

test('side-panel-only i18n keys are gone from K-02 strings', () => {
  for (const lang of ['lv', 'en']) {
    for (const k of ['blk.dims', 'blk.results', 'blk.fixed', 'dims.hint', 'dims.hintStudy', 'results.none', 'results.other', 'results.strobe', 'dir.up', 'dir.down']) {
      assert.ok(!(k in STRINGS[lang]), `${lang} ${k}`);
    }
  }
});
