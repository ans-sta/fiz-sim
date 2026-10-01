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

test('scale and mode set their defaults; mode=1 without v0 is free fall', () => {
  const t = parse('?scale=tower').settings;
  assert.equal(t.h, 20);
  assert.equal(t.v0, 10);
  assert.equal(t.dt, 0.2);
  const v = parse('?mode=1').settings;
  assert.equal(v.mode, 'vertical');
  assert.equal(v.v0, 0);
  const o = parse('?mode=3&alpha=30&v0=200&h=0').settings;
  assert.deepEqual([o.mode, o.alphaDeg, o.v0, o.h], ['oblique', 30, 200, 0]);
  assert.equal(parse('?mode=1&v0=-50').settings.v0, -50);
});

test('bad and conflicting params → sensible values + one precise notice each (Review Focus 1)', () => {
  const a = parse('?scale=tower&h=120');
  assert.equal(a.settings.h, 50);
  assert.deepEqual(a.warnings, [{ param: 'h', raw: '120', reason: 'h_range', min: 0, max: 50, unit: 'm', used: 50 }]);
  assert.equal(warningText(a.warnings[0], lv), 'Saitē h = 120 m neder šim mērogam (atļauts no 0 līdz 50 m). Izmantots h = 50 m.');
  assert.equal(warningText(a.warnings[0], en), 'In the link, h = 120 m does not fit this scale (allowed from 0 to 50 m). Using h = 50 m.');
  const neg = parse('?scale=tower&h=-5');
  assert.equal(neg.settings.h, 0);
  assert.equal(warningText(neg.warnings[0], lv), 'Saitē h = -5 m neder šim mērogam (atļauts no 0 līdz 50 m). Izmantots h = 0 m.');
  const fast = parse('?v0=500');
  assert.equal(fast.settings.v0, 400);
  assert.equal(warningText(fast.warnings[0], lv), 'Saitē v₀ = 500 cm/s neder šim režīmam un mērogam (atļauts no 0 līdz 400 cm/s). Izmantots v₀ = 400 cm/s.');
  const dt3 = parse('?scale=tower&dt=0.3');
  assert.equal(warningText(dt3.warnings[0], lv), 'Saitē Δt = 0.3 s neder šim mērogam. Atļautās vērtības: 0,1; 0,2; 0,5 s. Izmantots Δt = 0,2 s.');
  assert.equal(warningText(parse('?dt=abc').warnings[0], lv), 'Saites parametrs dt=abc nav skaitlis. Izmantots dt = 0,05.');

  const b = parse('?scale=tower&dt=0.02');
  assert.equal(b.settings.dt, 0.2);
  assert.equal(warningText(b.warnings[0], lv), 'Saitē Δt = 0.02 s neder šim mērogam. Atļautās vērtības: 0,1; 0,2; 0,5 s. Izmantots Δt = 0,2 s.');
  assert.equal(warningText(b.warnings[0], en), 'In the link, Δt = 0.02 s does not fit this scale. Allowed values: 0.1, 0.2, 0.5 s. Using Δt = 0.2 s.');

  const c = parse('?mode=2&v0=-100');
  assert.equal(c.settings.v0, 0);
  assert.equal(warningText(c.warnings[0], lv), 'Saitē v₀ = -100 cm/s neder šim režīmam un mērogam (atļauts no 0 līdz 400 cm/s). Izmantots v₀ = 0 cm/s.');

  const d = parse('?scale=tower&h=2,5');
  assert.equal(d.settings.h, 2.5);
  assert.deepEqual(d.warnings, []);
  const r = parse('?h=2,5&v0=152&alpha=44.6&mode=3');
  assert.deepEqual([r.settings.h, r.settings.v0, r.settings.alphaDeg], [3, 150, 45]);
  assert.deepEqual(r.warnings.map((w) => warningText(w, lv)), [
    'Saitē h = 2,5 cm noapaļots līdz iestatāmajai vērtībai 3 cm.',
    'Saitē v0 = 152 cm/s noapaļots līdz iestatāmajai vērtībai 150 cm/s.',
    'Saitē alpha = 44.6° noapaļots līdz iestatāmajai vērtībai 45°.',
  ]);
  assert.equal(warningText(r.warnings[0], en), 'In the link, h = 2,5 cm was rounded to the nearest settable value 3 cm.');

  const e = parse('?traps=push');
  assert.deepEqual(e.traps, []);
  assert.equal(warningText(e.warnings[0], lv), 'Saites parametra traps vērtība “push” nav atļauta. Atļautās vērtības: late. Izmantots traps = nav.');

  const f = parse('?h=abc');
  assert.equal(f.settings.h, 80);
  assert.equal(warningText(f.warnings[0], lv), 'Saites parametrs h=abc nav skaitlis. Izmantots h = 80.');

  assert.deepEqual(parse('?fbclid=IwAR0abc&h=60').warnings, []);
});

test('lock fixes only the given params; view takes effect with lock', () => {
  const p = parse('?h=50&v0=100&view=strobe&lock=1');
  assert.deepEqual([...p.locked].sort(), ['h', 'v0', 'view']);
  assert.deepEqual(p.views, { table: false, strobe: true });
  assert.deepEqual(parse('?view=table&lock=1').views, { table: true, strobe: false });
  assert.deepEqual(parse('?view=strobe').views, { table: true, strobe: true });
  assert.equal(parse('?h=50&lock=0').locked.size, 0);
  assert.ok(LOCKABLE.includes('scale'));
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

test('base: a study preset is the starting point; scale and mode params apply on top', () => {
  const base = { ...defaultSettings('table', 'vertical'), v0: 0 };
  const a = settingsFromURL('', { makeSeed: () => 1, base });
  assert.deepEqual([a.settings.mode, a.settings.v0], ['vertical', 0]);
  const b = settingsFromURL('?scale=tower', { makeSeed: () => 1, base });
  assert.equal(b.settings.scale, 'tower');
  assert.equal(b.settings.h, 20);
});
