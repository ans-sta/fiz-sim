import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toTSV, toCSV } from '../assets/measure/table-export.js';

const model = {
  title: '1. tabula. Lodītes koordināta x atkarībā no laika t',
  settingsLine: 'Iestatījumi: L = 80 cm; sēkla 1',
  columns: [{ label: 't, s', decimals: 1 }, { label: 'x₁, cm (±0,5 cm)', decimals: 1 }, { label: 'x₂, cm (±0,5 cm)', decimals: 1 }],
  rows: [[0, 0, 0], [0.2, 0.5, 0.5], [0.4, 1.5, null]],
  filename: 'lodite-tabula-1',
};

test('TSV: title, settings, header, rows with decimal comma', () => {
  assert.equal(
    toTSV(model, 'lv'),
    '1. tabula. Lodītes koordināta x atkarībā no laika t\nIestatījumi: L = 80 cm; sēkla 1\nt, s\tx₁, cm (±0,5 cm)\tx₂, cm (±0,5 cm)\n0,0\t0,0\t0,0\n0,2\t0,5\t0,5\n0,4\t1,5\t\n',
  );
});

test('CSV LV: semicolon separator, decimal comma, fields with ; are quoted', () => {
  const csv = toCSV(model, 'lv');
  const lines = csv.split('\r\n');
  assert.equal(lines[0], '1. tabula. Lodītes koordināta x atkarībā no laika t');
  assert.equal(lines[1], '"Iestatījumi: L = 80 cm; sēkla 1"');
  assert.equal(lines[2], 't, s;x₁, cm (±0,5 cm);x₂, cm (±0,5 cm)');
  assert.equal(lines[3], '0,0;0,0;0,0');
  assert.equal(lines[5], '0,4;1,5;');
});

test('CSV EN: comma separator, decimal point, labels with commas quoted', () => {
  const lines = toCSV(model, 'en').split('\r\n');
  assert.equal(lines[2], '"t, s","x₁, cm (±0,5 cm)","x₂, cm (±0,5 cm)"');
  assert.equal(lines[4], '0.2,0.5,0.5');
});
