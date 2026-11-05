import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settingsFromURL, defaultSettings } from '../assets/photo/params.js';

test('no parameters — the lesson start: sodium, 650 nm, 30 %, light on', () => {
  const { settings, locked, warnings } = settingsFromURL('');
  assert.deepEqual(settings, defaultSettings());
  assert.deepEqual(settings, { lambda: 650, intensity: 30, metal: 'Na', light: true, voltage: 0, reverse: false, fence: false, ev: false });
  assert.equal(locked.size, 0);
  assert.equal(warnings.length, 0);
});

test('spec example: zinc with red light, metal locked', () => {
  const { settings, locked, warnings } = settingsFromURL('?metal=Zn&lambda=650&intensity=100&lock=metal');
  assert.equal(settings.metal, 'Zn');
  assert.equal(settings.lambda, 650);
  assert.equal(settings.intensity, 100);
  assert.deepEqual([...locked], ['metal']);
  assert.equal(warnings.length, 0);
});

test('lock=1 locks every setting given in the link (as on other pages); ev is not a control', () => {
  const { locked } = settingsFromURL('?metal=Cs&fence=1&ev=1&lock=1');
  assert.deepEqual([...locked].sort(), ['fence', 'metal']);
});

test('a list lock with an unknown name keeps the known ones and warns', () => {
  const { locked, warnings } = settingsFromURL('?lock=metal,colour');
  assert.deepEqual([...locked], ['metal']);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].param, 'lock');
});

test('out of range λ is clamped with a notice; decimal comma accepted and rounded to whole nm', () => {
  const a = settingsFromURL('?lambda=100');
  assert.equal(a.settings.lambda, 150);
  assert.equal(a.warnings[0].reason, 'out_of_range');
  assert.equal(settingsFromURL('?lambda=532,4').settings.lambda, 532);
});

test('bad metal falls back to sodium with a notice; flags parse', () => {
  const { settings, warnings } = settingsFromURL('?metal=Fe&reverse=1&light=0&ev=1&fbclid=x');
  assert.equal(settings.metal, 'Na');
  assert.equal(warnings[0].reason, 'not_allowed');
  assert.equal(warnings[0].used, 'Na');
  assert.equal(settings.reverse, true);
  assert.equal(settings.light, false);
  assert.equal(settings.ev, true);
});

test('voltage: 0–6 V in 0,01 V steps, clamped with a notice; lockable with reverse', () => {
  assert.equal(settingsFromURL('?voltage=0,486').settings.voltage, 0.49);
  const a = settingsFromURL('?voltage=9');
  assert.equal(a.settings.voltage, 6);
  assert.equal(a.warnings[0].reason, 'out_of_range');
  const { locked } = settingsFromURL('?voltage=1.2&reverse=1&lock=1');
  assert.deepEqual([...locked].sort(), ['reverse', 'voltage']);
});
