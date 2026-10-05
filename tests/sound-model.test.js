import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FMIN, FMAX, NH, posFromF, fFromPos, noteFreq, nearestNote, isBlack, defaultSettings, withF, withPos, withWave, withAmp, withSourceOn,
  withPhi, withVol, withOctave, withPreset, withHarmonic, withView, duoResult, piFrac, harmonicOf, harmonicTerms, sumSeries, peakOf,
  harmonicGains, duoGains, spectrumLayout, barAt, ampFromY, period, wavelength,
} from '../assets/sound/model.js';

test('frequency slider is logarithmic: 0 → 40 Hz, 1000 → 2000 Hz, round trip', () => {
  assert.equal(fFromPos(0), FMIN);
  assert.equal(fFromPos(1000), FMAX);
  assert.equal(posFromF(FMIN), 0);
  assert.equal(posFromF(FMAX), 1000);
  assert.ok(Math.abs(fFromPos(posFromF(220)) - 220) < 0.1);
  assert.ok(Math.abs(fFromPos(500) - Math.sqrt(FMIN * FMAX)) < 0.1); // middle of the slider — geometric middle
});

test('keyboard: la of the small octave is 220 Hz, 1st-octave la is 440 Hz; black keys', () => {
  assert.ok(Math.abs(noteFreq(3, 9) - 220) < 1e-9);
  assert.ok(Math.abs(noteFreq(4, 9) - 440) < 1e-9);
  assert.ok(Math.abs(noteFreq(3, 0) - 130.81) < 0.01); // do of the small octave
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 12, 13].map(isBlack), [false, true, false, true, false, false, true, false, true]);
});

test('nearest note: 440 → la, 1st octave, 0 cents; 445 → +20 cents; 220 → small octave', () => {
  assert.deepEqual(nearestNote(440), { index: 9, octave: 4, cents: 0 });
  assert.deepEqual(nearestNote(445), { index: 9, octave: 4, cents: 20 });
  assert.deepEqual(nearestNote(220), { index: 9, octave: 3, cents: 0 });
  assert.equal(nearestNote(261.63).index, 0);
});

test('defaults and clamped setters', () => {
  const s = defaultSettings();
  assert.deepEqual([s.view, s.f, s.oct, s.vol, s.wave, s.phi, s.split, s.overlay, s.preset], ['wave', 220, 3, 60, 'sine', 60, false, true, null]);
  assert.equal(s.H.length, NH);
  assert.deepEqual(s.H.slice(0, 4).map((h) => [h.on, h.amp]), [[true, 1], [true, 0.5], [true, 0.33], [false, 0.25]]);
  assert.equal(withF(s, 5000).f, FMAX);
  assert.equal(withF(s, 1).f, FMIN);
  assert.equal(withF(s, 220), s); // unchanged — same object
  assert.equal(withPos(s, 1000).f, FMAX);
  assert.equal(withWave(s, 'square').wave, 'square');
  assert.equal(withWave(s, 'noise'), s);
  assert.equal(withAmp(s, 'b', 0.33).b.amp, 0.35);
  assert.equal(withAmp(s, 'b', 2).b.amp, 1);
  assert.equal(withSourceOn(s, 'a', false).a.on, false);
  assert.equal(withPhi(s, 182).phi, 180);
  assert.equal(withPhi(s, 400).phi, 360);
  assert.equal(withVol(s, 101).vol, 100);
  assert.equal(withView(s, 'two').view, 'two');
  assert.equal(withView(s, 'x'), s);
});

test('octave shift moves the keyboard and the sounding frequency; stays within 2…5', () => {
  const s = defaultSettings();
  const up = withOctave(s, 1);
  assert.deepEqual([up.oct, up.f], [4, 440]);
  assert.deepEqual([withOctave(up, 1).oct, withOctave(withOctave(up, 1), 1).oct], [5, 5]); // 5 is the top
  const dn = withOctave(s, -1);
  assert.equal(withOctave(dn, -1), dn); // 2 is the bottom — same object
  assert.equal(withOctave(withF(s, 1500), 1).f, FMAX); // clamped
});

test('presets: square has odd harmonics 1/n, triangle alternates sign, instruments copy their spectra, hand edit clears the preset', () => {
  const s = defaultSettings();
  const sq = withPreset(s, 'square');
  assert.equal(sq.preset, 'square');
  assert.deepEqual(sq.H.slice(0, 4).map((h) => [h.on, h.amp, h.sign]), [[true, 1, 1], [false, 0.5, 1], [true, 0.33, 1], [false, 0.25, 1]]);
  const tr = withPreset(s, 'triangle');
  assert.deepEqual(tr.H.slice(0, 5).map((h) => [h.on, h.amp, h.sign]), [[true, 1, 1], [false, 0.5, 1], [true, 0.11, -1], [false, 0.25, 1], [true, 0.04, 1]]);
  assert.ok(withPreset(s, 'all').H.every((h) => h.on && h.amp === 1));
  const fl = withPreset(s, 'flute');
  assert.deepEqual([fl.preset, fl.H[0].amp, fl.H[6].on, fl.H[6].amp], ['flute', 1, false, 0.05]);
  assert.equal(withPreset(s, 'piano'), s);
  const edited = withHarmonic(fl, 7, { on: true, amp: 0.5 });
  assert.deepEqual([edited.preset, edited.H[6].on, edited.H[6].amp, edited.H[0].amp], [null, true, 0.5, 1]);
  assert.equal(withHarmonic(fl, 1, { amp: 1 }), fl); // no change — same object
  assert.equal(withHarmonic(fl, 1, { amp: 1.7 }).H[0].amp, 1);
  assert.equal(harmonicOf('sawtooth', 2), -0.5);
});

test('two sources: R = √(a² + b² + 2ab cos φ) and the state words', () => {
  const s = defaultSettings();
  const r = duoResult(s); // 1, 1, 60°
  assert.ok(Math.abs(r.R - Math.sqrt(3)) < 1e-9);
  assert.equal(r.state, 'partial');
  assert.equal(duoResult(withPhi(s, 0)).state, 'add');
  assert.equal(duoResult(withPhi(s, 180)).state, 'cancel');
  assert.ok(duoResult(withPhi(s, 180)).R < 1e-9);
  assert.equal(duoResult(withSourceOn(s, 'b', false)).state, 'one');
  assert.ok(Math.abs(r.shiftMs - (60 / 360) * (1000 / 220)) < 1e-9);
  assert.deepEqual([piFrac(0), piFrac(90), piFrac(60), piFrac(180), piFrac(270), piFrac(45), piFrac(7)], ['0', 'π/2', 'π/3', 'π', '3π/2', 'π/4', '0.04π']);
});

test('harmonic sum, peak and audio gains', () => {
  const s = withPreset(defaultSettings(), 'square');
  const terms = harmonicTerms(s.H);
  assert.deepEqual(terms.map((h) => h.n), [1, 3, 5, 7, 9, 11]);
  const sum = sumSeries(terms);
  assert.ok(Math.abs(sum(0)) < 1e-9);
  assert.ok(peakOf(sum) > 0.85 && peakOf(sum) < 1); // six odd terms of a square: ≈ 0,92
  const g = harmonicGains(s);
  assert.equal(g[1], 0);
  assert.ok(g[0] > 0 && g[0] <= 0.2);
  const hi = harmonicGains(withF(s, 2000)); // 11 · 2000 Hz = 22 kHz — silent
  assert.equal(hi[10], 0);
  const d = duoGains(withPhi(defaultSettings(), 90));
  assert.ok(Math.abs(d.a - 0.4) < 1e-9 && Math.abs(d.bs) < 1e-9 && Math.abs(d.bc - 0.4) < 1e-9);
  assert.ok(Math.abs(period(200) - 0.005) < 1e-12);
  assert.ok(Math.abs(wavelength(343) - 1) < 1e-12);
});

test('spectrum bars: 12 columns, hit test by bar or label, amplitude from height', () => {
  const bars = spectrumLayout({ x: 0, y: 0, w: 120, h: 116 }, { labelH: 16 });
  assert.equal(bars.length, 12);
  assert.deepEqual([bars[0].colX, bars[0].colW, bars[0].baseline, bars[0].height], [0, 10, 100, 100]);
  assert.deepEqual(barAt(bars, 15, 50).bar.n, 2);
  assert.equal(barAt(bars, 15, 50).zone, 'bar');
  assert.equal(barAt(bars, 15, 108).zone, 'label');
  assert.equal(barAt(bars, 15, 120), null);
  assert.equal(barAt(bars, 200, 50), null);
  assert.equal(ampFromY(bars[0], 0), 1);
  assert.equal(ampFromY(bars[0], 100), 0);
  assert.equal(ampFromY(bars[0], 75), 0.25);
});
