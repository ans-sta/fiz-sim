import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settingsFromURL, warningText, LOCKABLE } from '../assets/projectile/params.js';
import { defaultSettings } from '../assets/projectile/model.js';
import { makeT } from '../assets/translate.js';
import { STRINGS } from '../assets/projectile/i18n.js';

const seed = () => 777;
const parse = (q) => settingsFromURL(q, { makeSeed: seed });
const lv = { t: makeT(STRINGS, () => 'lv'), lang: 'lv' };
const en = { t: makeT(STRINGS, () => 'en'), lang: 'en' };

test('no params → defaults, nothing locked, noise 1, generated seed', () => {
  const p = parse('');
  assert.deepEqual(p.settings, defaultSettings());
  assert.equal(p.locked.size, 0);
  assert.deepEqual(p.views, { table: true, strobe: true });
  assert.equal(p.noise, 1);
  assert.deepEqual(p.traps, []);
  assert.equal(p.seed, 777);
  assert.equal(p.seedGiven, false);
  assert.deepEqual(p.warnings, []);
});

test('mode sets its defaults; mode=1 without v0 is free fall', () => {
  const t = parse('').settings;
  assert.equal(t.h, 20);
  assert.equal(t.v0, 10);
  assert.equal(t.dt, 0.2);
  const v = parse('?mode=1').settings;
  assert.equal(v.mode, 'vertical');
  assert.equal(v.v0, 0);
  const o = parse('?mode=3&alpha=30&v0=20&h=0').settings;
  assert.deepEqual([o.mode, o.alphaDeg, o.v0, o.h], ['oblique', 30, 20, 0]);
  assert.equal(parse('?mode=1&v0=-5').settings.v0, -5);
});

test('bad and conflicting params → sensible values + one precise notice each (Review Focus 1)', () => {
  const a = parse('?h=120');
  assert.equal(a.settings.h, 50);
  assert.deepEqual(a.warnings, [{ param: 'h', raw: '120', reason: 'h_range', min: 0, max: 50, unit: 'm', used: 50 }]);
  assert.equal(warningText(a.warnings[0], lv), 'Saitē h = 120 m neder šim mērogam (atļauts no 0 līdz 50 m). Izmantots h = 50 m.');
  assert.equal(warningText(a.warnings[0], en), 'In the link, h = 120 m does not fit this scale (allowed from 0 to 50 m). Using h = 50 m.');
  const neg = parse('?h=-5');
  assert.equal(neg.settings.h, 0);
  assert.equal(warningText(neg.warnings[0], lv), 'Saitē h = -5 m neder šim mērogam (atļauts no 0 līdz 50 m). Izmantots h = 0 m.');
  const fast = parse('?v0=500');
  assert.equal(fast.settings.v0, 30);
  assert.equal(warningText(fast.warnings[0], lv), 'Saitē v₀ = 500 m/s neder šim režīmam un mērogam (atļauts no 0 līdz 30 m/s). Izmantots v₀ = 30 m/s.');
  assert.equal(warningText(parse('?dt=abc').warnings[0], lv), 'Saites parametrs dt=abc nav skaitlis. Izmantots dt = 0,2.');

  const c = parse('?mode=2&v0=-100');
  assert.equal(c.settings.v0, 0);
  assert.equal(warningText(c.warnings[0], lv), 'Saitē v₀ = -100 m/s neder šim režīmam un mērogam (atļauts no 0 līdz 30 m/s). Izmantots v₀ = 0 m/s.');

  const d = parse('?h=2,5');
  assert.equal(d.settings.h, 2.5);
  assert.deepEqual(d.warnings, []);
  const r = parse('?h=2,7&v0=12.3&alpha=44.6&mode=3');
  assert.deepEqual([r.settings.h, r.settings.v0, r.settings.alphaDeg], [2.5, 12.5, 45]);
  assert.deepEqual(r.warnings.map((w) => warningText(w, lv)), [
    'Saitē h = 2,7 m noapaļots līdz iestatāmajai vērtībai 2,5 m.',
    'Saitē v0 = 12.3 m/s noapaļots līdz iestatāmajai vērtībai 12,5 m/s.',
    'Saitē alpha = 44.6° noapaļots līdz iestatāmajai vērtībai 45°.',
  ]);
  assert.equal(warningText(r.warnings[0], en), 'In the link, h = 2,7 m was rounded to the nearest settable value 2.5 m.');

  const e = parse('?traps=push');
  assert.deepEqual(e.traps, []);
  assert.equal(warningText(e.warnings[0], lv), 'Saites parametra traps vērtība “push” nav atļauta. Atļautās vērtības: late. Izmantots traps = nav.');

  const f = parse('?h=abc');
  assert.equal(f.settings.h, 20);
  assert.equal(warningText(f.warnings[0], lv), 'Saites parametrs h=abc nav skaitlis. Izmantots h = 20.');

  assert.deepEqual(parse('?fbclid=IwAR0abc&h=30').warnings, []);
});

test('old links: scale is gone with a notice, values are metres', () => {
  const a = settingsFromURL('?scale=table&h=80', { makeSeed: () => 1 });
  assert.equal(a.settings.h, 50);
  assert.deepEqual(a.warnings.map((w) => w.reason).sort(), ['h_range', 'scale_removed']);
  const b = settingsFromURL('?scale=tower&h=20', { makeSeed: () => 1 });
  assert.equal(b.settings.h, 20);
  assert.deepEqual(b.warnings.map((w) => w.reason), ['scale_removed']);
  assert.equal(warningText(b.warnings[0], { t: lv.t, lang: 'lv' }),
    'Saites parametrs scale=tower vairs nedarbojas: mēroga izvēles vairs nav, visi lielumi ir metros.');
  assert.equal(warningText(b.warnings[0], en), 'Link parameter scale=tower no longer works: there is no scale choice any more, all quantities are in metres.');
  assert.ok(!('scale' in a.settings));
  assert.ok(!LOCKABLE.includes('scale'));
  assert.ok(!settingsFromURL('?scale=tower&lock=1', { makeSeed: () => 1 }).locked.has('scale'));
});

test('dt link: 0,1–2 s, between steps rounded with a notice', () => {
  assert.equal(settingsFromURL('?dt=0.3', { makeSeed: () => 1 }).settings.dt, 0.3);
  assert.deepEqual(settingsFromURL('?dt=0.3', { makeSeed: () => 1 }).warnings, []);
  const r = settingsFromURL('?dt=5', { makeSeed: () => 1 });
  assert.equal(r.settings.dt, 2);
  assert.equal(r.warnings[0].reason, 'out_of_range');
  assert.equal(warningText(r.warnings[0], lv), 'Saites parametrs dt=5 ir ārpus robežām (0,1–2). Izmantots dt = 2.');
  const m = settingsFromURL('?dt=0.25', { makeSeed: () => 1 });
  assert.equal(m.settings.dt, 0.3);
  assert.equal(warningText(m.warnings[0], lv), 'Saitē dt = 0.25 s noapaļots līdz iestatāmajai vērtībai 0,3 s.');
});

test('lock fixes only the given params; view takes effect with lock', () => {
  const p = parse('?h=50&v0=20&view=strobe&lock=1');
  assert.deepEqual([...p.locked].sort(), ['h', 'v0', 'view']);
  assert.deepEqual(p.views, { table: false, strobe: true });
  assert.deepEqual(parse('?view=table&lock=1').views, { table: true, strobe: false });
  assert.deepEqual(parse('?view=strobe').views, { table: true, strobe: true });
  assert.equal(parse('?h=50&lock=0').locked.size, 0);
});

test('teacher-only params', () => {
  const p = parse('?noise=0&traps=late&seed=42&second=1&grid=0&mode=2');
  assert.equal(p.noise, 0);
  assert.deepEqual(p.traps, ['late']);
  assert.equal(p.seed, 42);
  assert.equal(p.seedGiven, true);
  assert.equal(p.settings.second, true);
  assert.equal(p.settings.grid, false);
});

test('base: a study preset is the starting point; mode params apply on top', () => {
  const base = { ...defaultSettings('vertical'), v0: 0 };
  const a = settingsFromURL('', { makeSeed: () => 1, base });
  assert.deepEqual([a.settings.mode, a.settings.v0], ['vertical', 0]);
  const b = settingsFromURL('?mode=2', { makeSeed: () => 1, base });
  assert.deepEqual([b.settings.mode, b.settings.h], ['horizontal', 20]);
});
