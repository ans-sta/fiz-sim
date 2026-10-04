import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settingsFromURL, warningText } from '../assets/rolling-ball/params.js';
import { defaultSettings } from '../assets/rolling-ball/model.js';
import { makeT } from '../assets/translate.js';
import { STRINGS } from '../assets/rolling-ball/i18n.js';

const url = (q) => settingsFromURL(q, { makeSeed: () => 111111 });
const one = (r) => {
  assert.equal(r.warnings.length, 1, JSON.stringify(r.warnings));
  return r.warnings[0];
};

test('no params: defaults, nothing locked, both views, noise 1, random seed', () => {
  const r = url('');
  assert.deepEqual(r.settings, defaultSettings());
  assert.equal(r.locked.size, 0);
  assert.deepEqual(r.views, { table: true, strobe: true });
  assert.equal(r.noise, 1);
  assert.deepEqual(r.traps, []);
  assert.equal(r.seed, 111111);
  assert.equal(r.seedGiven, false);
  assert.deepEqual(r.warnings, []);
});

test('spec example with lock (spec 12.11)', () => {
  const r = url('?L=80&h=2.0&ball=steel16&level=3&dt=0.5&view=strobe&lock=1');
  assert.equal(r.settings.h, 2);
  assert.equal(r.settings.dt, 0.5);
  assert.deepEqual([...r.locked].sort(), ['L', 'ball', 'dt', 'h', 'level', 'view']);
  assert.deepEqual(r.views, { table: false, strobe: true });
  assert.deepEqual(r.warnings, []);
});

test('same link without lock: nothing locked, view ignored', () => {
  const r = url('?L=80&h=2.0&view=strobe');
  assert.equal(r.locked.size, 0);
  assert.deepEqual(r.views, { table: true, strobe: true });
});

test('decimal comma in h', () => {
  assert.equal(url('?h=2,5').settings.h, 2.5);
});

test('unknown ball id → default ball + warning', () => {
  const w = one(url('?ball=steel12'));
  assert.deepEqual([w.param, w.reason, w.used], ['ball', 'not_allowed', 'steel16']);
});

test('ball that does not fit the groove → warning; on the flat surface it is fine', () => {
  const w = one(url('?ball=steel10'));
  assert.deepEqual([w.param, w.reason, w.used], ['ball', 'ball_no_fit', 'steel16']);
  const r = url('?ball=steel10&profile=flat');
  assert.equal(r.settings.ball, 'steel10');
  assert.deepEqual(r.warnings, []);
});

test('L out of range is clamped', () => {
  const r = url('?L=500');
  assert.equal(r.settings.L, 200);
  assert.deepEqual([one(r).reason, one(r).used], ['out_of_range', 200]);
});

test('L below 50 cm is clamped to 50 with the range in the warning', () => {
  const r = url('?L=45');
  assert.equal(r.settings.L, 50);
  assert.deepEqual([one(r).reason, one(r).min, one(r).max, one(r).used], ['out_of_range', 50, 200, 50]);
});

test('h too large for L is clamped with its own reason', () => {
  const r = url('?L=80&h=30');
  assert.equal(r.settings.h, 20.7);
  const w = one(r);
  assert.deepEqual([w.param, w.reason, w.used, w.L], ['h', 'h_clamped', 20.7, 80]);
});

test('h not a number → default h', () => {
  const w = one(url('?h=abc'));
  assert.deepEqual([w.reason, w.used], ['not_number', 3]);
});

test('h and alpha both → h wins', () => {
  const r = url('?h=3&alpha=5');
  assert.equal(r.settings.angleMode, 'h');
  assert.deepEqual([one(r).param, one(r).reason], ['alpha', 'h_and_alpha']);
});

test('alpha alone switches to α-mode', () => {
  const r = url('?alpha=5');
  assert.equal(r.settings.angleMode, 'alpha');
  assert.equal(r.settings.alphaDeg, 5);
});

test('x0 too close to the finish', () => {
  const r = url('?x0=100');
  assert.equal(r.settings.x0, 65);
  assert.deepEqual([one(r).reason, one(r).used], ['x0_clamped', 65]);
});

test('gates: valid list, bad list, list that does not fit L', () => {
  assert.deepEqual(url('?gates=30,10,20').settings.gates, [10, 20, 30]);
  const bad = url('?gates=10,20,300');
  assert.deepEqual(bad.settings.gates, defaultSettings().gates);
  assert.equal(one(bad).reason, 'bad_list');
  assert.deepEqual(url('?L=60&gates=10,20,55').settings.gates, [10, 20, 55]);
  const clamped = url('?L=60&gates=10,20,70');
  assert.deepEqual(clamped.settings.gates, [16.5, 33.5, 50]);
  assert.deepEqual([one(clamped).reason, one(clamped).used], ['gates_clamped', [16.5, 33.5, 50]]);
});

test('teacher-only settings: noise, traps, seed', () => {
  const r = url('?noise=0&traps=push,late&seed=42');
  assert.equal(r.noise, 0);
  assert.deepEqual(r.traps, ['push', 'late']);
  assert.equal(r.seed, 42);
  assert.equal(r.seedGiven, true);
  assert.equal(one(url('?traps=push,foo')).reason, 'not_allowed');
});

test('level, timer, tape, dt', () => {
  const r = url('?level=2&timer=hand&tape=0&lock=1');
  assert.equal(r.settings.level, 2);
  assert.equal(r.settings.timer, 'hand');
  assert.equal(r.settings.tape, false);
  assert.deepEqual([...r.locked].sort(), ['level', 'tape', 'timer']);
  const ok = url('?dt=0.3');
  assert.deepEqual(ok.warnings, []);
  assert.equal(ok.settings.dt, 0.3);
  const bad = one(url('?dt=5'));
  assert.equal(bad.reason, 'out_of_range');
  assert.equal(url('?dt=5').settings.dt, 2);
});

test('Facebook and tracking params are ignored silently', () => {
  assert.deepEqual(url('?fbclid=abc&utm_source=x').warnings, []);
});

test('warningText gives precise LV and EN messages', () => {
  const w = one(url('?L=80&h=30'));
  const tl = makeT(STRINGS, () => 'lv');
  const te = makeT(STRINGS, () => 'en');
  assert.equal(warningText(w, { t: tl, lang: 'lv' }), 'Saitē h = 30 cm ir par lielu renītei L = 80 cm (α ≤ 15°). Izmantots h = 20,7 cm.');
  assert.equal(warningText(w, { t: te, lang: 'en' }), 'In the link, h = 30 cm is too large for the groove L = 80 cm (α ≤ 15°). Using h = 20.7 cm.');
  const g = one(url('?L=60&gates=10,20,70'));
  assert.ok(warningText(g, { t: tl, lang: 'lv' }).endsWith('Vārti izvietoti vienmērīgi: 16,5; 33,5; 50.'));
  const b = one(url('?ball=steel12'));
  assert.ok(warningText(b, { t: tl, lang: 'lv' }).includes('Atļautās vērtības: steel10; steel16')); // was ', ' — now '; ' so decimals do not collide
  assert.ok(warningText(b, { t: te, lang: 'en' }).includes('Allowed values: steel10, steel16'));
  const d = one(url('?dt=5'));
  assert.equal(warningText(d, { t: tl, lang: 'lv' }), 'Saites parametrs dt=5 ir ārpus robežām (0,1–2). Izmantots dt = 2.');
  assert.equal(warningText(d, { t: te, lang: 'en' }), 'Link parameter dt=5 is out of range (0.1–2). Using dt = 2.');
});

test('warningText: empty list renders as nav / none; ball_no_fit tells what to do', () => {
  const tl = makeT(STRINGS, () => 'lv');
  const te = makeT(STRINGS, () => 'en');
  const w = { param: 'gates', raw: 'x', reason: 'bad_list', used: [] };
  assert.ok(warningText(w, { t: tl, lang: 'lv' }).endsWith('Izmantots gates = nav.'));
  assert.ok(warningText(w, { t: te, lang: 'en' }).endsWith('Using gates = none.'));
  const b = one(url('?ball=steel10'));
  assert.equal(warningText(b, { t: tl, lang: 'lv' }), 'Saitē lodīte steel10 renītē neiederas. Izmantota steel16. Šai lodītei saitē jāpievieno profile=flat.');
  assert.equal(warningText(b, { t: te, lang: 'en' }), 'In the link, the ball steel10 does not fit the groove. Using steel16. For this ball add profile=flat to the link.');
});
