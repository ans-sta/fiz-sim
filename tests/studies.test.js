import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRoute, studyFixed, filterStudyParams } from '../assets/measure/studies.js';

const studies = [{ id: 'a', editable: ['alpha'], coupled: ['h'] }, { id: 'x', editable: ['dt', 'h'] }];
const settingParams = ['L', 'h', 'alpha', 'view', 'lock', 'noise', 'seed', 'traps'];
const route = (q) => resolveRoute(q, { studies, settingParams });

test('no params (or only unknown ones) → cards', () => {
  assert.deepEqual(route(''), { kind: 'cards' });
  assert.deepEqual(route('?fbclid=IwAR0'), { kind: 'cards' });
});

test('study id → that study; unknown or empty id → cards with the id', () => {
  assert.equal(route('?study=a').study.id, 'a');
  assert.equal(route('?study=x&h=5&lock=1').kind, 'study');
  assert.deepEqual(route('?study=zz'), { kind: 'cards', unknownStudy: 'zz' });
  assert.deepEqual(route('?study='), { kind: 'cards', unknownStudy: '' });
});

test('full=1 or any setting parameter → full page (old teacher links, Review Focus 1)', () => {
  assert.deepEqual(route('?full=1'), { kind: 'full' });
  assert.deepEqual(route('?L=80&h=2.0&lock=1'), { kind: 'full' });
  assert.deepEqual(route('?noise=0'), { kind: 'full' });
  assert.deepEqual(route('?seed=5'), { kind: 'full' });
  assert.deepEqual(route('?lock=1'), { kind: 'full' });
});

test('studyFixed: everything lockable except the editable and coupled fields', () => {
  const lockable = ['L', 'h', 'alpha', 'ball', 'dt', 'view'];
  assert.deepEqual([...studyFixed(studies[0], lockable)], ['L', 'ball', 'dt', 'view']);
  assert.deepEqual([...studyFixed(studies[1], lockable)], ['L', 'alpha', 'ball', 'view']);
});

test('filterStudyParams drops study-fixed params (except keep), reports them, keeps the rest', () => {
  const fixed = new Set(['scale', 'view', 'mode']);
  assert.deepEqual(filterStudyParams('?scale=tower&h=5&lock=1&view=strobe', fixed), {
    search: '?h=5&lock=1&view=strobe',
    ignored: [{ param: 'scale', raw: 'tower' }],
  });
  assert.deepEqual(filterStudyParams('?h=5&lock=1', new Set()), { search: '?h=5&lock=1', ignored: [] });
  assert.deepEqual(filterStudyParams('', fixed), { search: '', ignored: [] });
});
