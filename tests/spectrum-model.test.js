import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, gaussian } from '../assets/measure/rng.js';
import * as M from '../assets/spectrum/model.js';

// ── Sintētisks spektrs tā, kā to dod Web Audio AnalyserNode: pēdējie N paraugi × Blackman, FFT, |X|/N, dB ──
const SR = 48000;
const LOW = 32768;
const HIGH = 8192;

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

function analyser(samples, N) {
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  const off = samples.length - N;
  for (let n = 0; n < N; n++) {
    const w = 0.42 - 0.5 * Math.cos((2 * Math.PI * n) / N) + 0.08 * Math.cos((4 * Math.PI * n) / N);
    re[n] = samples[off + n] * w;
  }
  fft(re, im);
  const out = new Float32Array(N / 2);
  for (let k = 0; k < N / 2; k++) out[k] = 20 * Math.log10(Math.max(Math.hypot(re[k], im[k]) / N, 1e-12));
  return out;
}

// parts: [[f, amplitude], …]; noise — baltā trokšņa standartnovirze
function frame(parts, { noise = 1e-4, seed = 1, t0 = 0 } = {}) {
  const rand = mulberry32(seed);
  const s = new Float64Array(LOW);
  for (let i = 0; i < LOW; i++) {
    const t = t0 + i / SR;
    let v = noise * gaussian(rand);
    for (const [f, a, ph = 0.3] of parts) v += a * Math.sin(2 * Math.PI * f * t + ph);
    s[i] = v;
  }
  return { low: analyser(s, LOW), high: analyser(s, HIGH) };
}

// Viens kadrs pēc tam, kad fons iestājies: fons no trokšņa kadra, tad kadrs ar toņiem
function analyse(parts, opts = {}) {
  const an = M.createAnalysis(SR);
  const quiet = frame([], { ...opts, seed: 99 });
  for (let i = 0; i < 3; i++) an.update(quiet.low, quiet.high, 0.5);
  const fr = frame(parts, opts);
  return an.update(fr.low, fr.high, 1 / 60);
}

// ── 1. Ass, krāsas, formāts ────────────────────────────────
test('log axis: 20 Hz → 0, 20 kHz → 1, 632 Hz in the middle; ticks and labels', () => {
  assert.equal(M.logPos(20), 0);
  assert.equal(M.logPos(20000), 1);
  assert.ok(Math.abs(M.logPos(Math.sqrt(20 * 20000)) - 0.5) < 1e-12);
  assert.ok(Math.abs(M.freqAt(M.logPos(440)) - 440) < 1e-9);
  assert.deepEqual(M.TICKS_MAJOR, [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]);
  assert.equal(M.tickLabel(50), '50');
  assert.equal(M.tickLabel(2000), '2k');
  assert.equal(M.tickLabel(20000), '20k');
  assert.deepEqual(M.majorTicksFor(1000), M.TICKS_MAJOR);
  assert.deepEqual(M.majorTicksFor(300), [100, 1000, 10000]);
});

test('colour mapping: 440 Hz → 544 nm green; band edges as in the spec table', () => {
  assert.ok(Math.abs(M.wavelengthNm(440) - 544) < 1, String(M.wavelengthNm(440)));
  assert.ok(Math.abs(M.wavelengthNm(20) - 697) < 1);
  assert.ok(Math.abs(M.wavelengthNm(20000) - 400) < 1);
  assert.equal(M.colorBand(440), 'green');
  assert.equal(M.colorBand(100), 'orange');
  assert.equal(M.colorBand(2000), 'blue');
  const edges = [[86, 'red', 'orange'], [159, 'orange', 'yellow'], [244, 'yellow', 'green'], [1400, 'green', 'blue'], [4600, 'blue', 'violet']];
  for (const [f, below, above] of edges) {
    assert.equal(M.colorBand(f * 0.98), below, `${f}·0.98`);
    assert.equal(M.colorBand(f * 1.02), above, `${f}·1.02`);
  }
  assert.equal(M.colorBand(25), 'red');
  assert.equal(M.colorBand(15000), 'violet');
});

test('a frequency named ORANGE is drawn orange, YELLOW yellow (Ansis 03.11: 146 Hz looked yellow)', () => {
  for (const f of [136, 146, 113, 101]) {
    assert.equal(M.colorBand(f), 'orange', String(f));
    const [r, g, b] = M.spectralRGB(M.wavelengthNm(f));
    assert.ok(r === 255 && g <= 180 && b === 0, `${f} Hz → ${r},${g},${b}`);
  }
  for (const f of [170, 188]) {
    assert.equal(M.colorBand(f), 'yellow', String(f));
    const [, g] = M.spectralRGB(M.wavelengthNm(f));
    assert.ok(g >= 210, `${f} Hz → g ${g}`); // 170 Hz (587 nm) — 255,217,0 zeltaini dzeltens
  }
});

test('spectrum colours are ≥ 3:1 against the sheet and the field in both themes', () => {
  const themes = [
    { sheet: '#15171b', field: '#0c0e11', dark: true },
    { sheet: '#f2efe9', field: '#faf8f3', dark: false },
  ];
  for (const th of themes) {
    const lut = M.buildLUT(th);
    assert.equal(lut.rgb.length, 256);
    for (const c of lut.rgb) {
      assert.ok(M.contrastRatio(c, M.hexRGB(th.sheet)) >= 3, `${th.dark ? 'dark' : 'light'} ${c} vs sheet`);
      assert.ok(M.contrastRatio(c, M.hexRGB(th.field)) >= 3, `${th.dark ? 'dark' : 'light'} ${c} vs field`);
    }
    assert.match(lut.css[0], /^rgb\(\d+, \d+, \d+\)$/);
  }
});

test('frequency format: one decimal under 100 Hz, thousands with a no-break space, LV comma', () => {
  assert.equal(M.formatFreq(82.43, 'lv'), '82,4');
  assert.equal(M.formatFreq(82.43, 'en'), '82.4');
  assert.equal(M.formatFreq(440.4, 'lv'), '440');
  assert.equal(M.formatFreq(3520, 'lv'), '3 520');
  assert.equal(M.formatFreq(19999.6, 'en'), '20 000');
  assert.equal(M.formatFreq(99.97, 'lv'), '100');
  assert.equal(M.octaves(110, 440), 2);
});

// ── 2. Spektra analīze ────────────────────────────────────
test('pure tone: 440 Hz reads 440 ± 0.5 Hz; also 50 Hz and 15 kHz', () => {
  for (const [f, tol] of [[440, 0.5], [50, 0.5], [15000, 3]]) {
    const r = analyse([[f, 0.05]]);
    assert.ok(r.pitch, `no pitch for ${f}`);
    assert.ok(Math.abs(r.pitch.f0 - f) <= tol, `${f}: ${r.pitch.f0}`);
    assert.ok(Math.abs(r.pitch.loud.f - f) <= tol);
  }
});

test('tones on both sides of the 400 Hz seam: one tone each, ± 0.5 Hz', () => {
  for (const f of [398, 402, 437.2]) {
    const r = analyse([[f, 0.05]]);
    assert.equal(r.tones.length, 1, `${f}: ${r.tones.map((x) => x.f.toFixed(1)).join(', ')}`);
    assert.ok(Math.abs(r.pitch.f0 - f) <= 0.5, `${f}: ${r.pitch.f0}`);
  }
});

test('50 Hz and 60 Hz together are two separate tones', () => {
  const r = analyse([[50, 0.05], [60, 0.05]]);
  const fs = r.tones.map((x) => x.f).sort((a, b) => a - b);
  assert.equal(fs.length, 2, fs.join(', '));
  assert.ok(Math.abs(fs[0] - 50) < 0.5 && Math.abs(fs[1] - 60) < 0.5);
});

test('fundamental: voice-like series 220 Hz with falling harmonics → 220', () => {
  const parts = [1, 2, 3, 4, 5, 6, 7, 8].map((m) => [220 * m, 0.05 / m, m]);
  const r = analyse(parts);
  assert.ok(Math.abs(r.pitch.f0 - 220) <= 1, String(r.pitch.f0));
});

test('fundamental: loudest peak is the 3rd harmonic → still the fundamental', () => {
  const amps = { 1: 0.01, 2: 0.03, 3: 0.06, 4: 0.02, 5: 0.015 };
  const parts = Object.entries(amps).map(([m, a]) => [130.8 * m, a, Number(m)]);
  const r = analyse(parts);
  assert.ok(Math.abs(r.pitch.loud.f - 392.4) < 1, `loudest ${r.pitch.loud.f}`);
  assert.ok(Math.abs(r.pitch.f0 - 130.8) <= 1, String(r.pitch.f0));
});

test('fundamental: missing fundamental 98 Hz (harmonics 2–6, across the seam) → 98 ± 1', () => {
  const parts = [2, 3, 4, 5, 6].map((m) => [98 * m, 0.03, m]);
  const r = analyse(parts);
  assert.ok(Math.abs(r.pitch.f0 - 98) <= 1, String(r.pitch.f0));
});

test('two unrelated tones, a note change and a chord: the pitch is one of the real notes, never an invented low one', () => {
  const near = (f, list) => list.some((x) => Math.abs(f / x - 1) < 0.01);
  const cases = [
    [[440, 512], [[440, 0.05], [512, 0.05]]], // divas toņdakšas
    [[220, 277.2], [[220, 0.05], [277.2, 0.05]]], // divi skolēni terču attālumā
    [[200, 300], [[200, 0.05], [300, 0.05]]], // nots maiņa: garais logs vēl tur iepriekšējo
    [[261.6, 329.6, 392], [[261.6, 0.04], [329.6, 0.04], [392, 0.04]]], // do–mi–sol
  ];
  for (const [notes, parts] of cases) {
    const r = analyse(parts);
    assert.ok(r.pitch && near(r.pitch.f0, notes), `${notes.join('+')}: ${r.pitch && r.pitch.f0}`);
  }
});

test('white noise: over 0.4 s no stable pitch, no record', () => {
  const an = M.createAnalysis(SR);
  const st = M.createStability();
  let rec = { lo: null, hi: null };
  for (let i = 0; i < 24; i++) {
    const fr = frame([], { noise: 0.02, seed: 1000 + i });
    const r = an.update(fr.low, fr.high, 1 / 60);
    const s = st.push(i / 60, r.pitch ? r.pitch.f0 : null);
    if (s !== null) rec = M.addRecord(rec, s).rec;
  }
  assert.equal(rec.lo, null);
});

test('heard: room noise alone is not heard (“klusums”); a tone or a loud noise burst is heard, even with no pitch', () => {
  assert.equal(analyse([]).heard, false);
  assert.equal(analyse([[440, 0.05]]).heard, true);
  const an = M.createAnalysis(SR);
  const quiet = frame([], { seed: 99 });
  for (let i = 0; i < 3; i++) an.update(quiet.low, quiet.high, 0.5);
  const st = M.createStability();
  for (let i = 0; i < 24; i++) {
    const loud = frame([], { noise: 0.02, seed: 700 + i });
    const r = an.update(loud.low, loud.high, 1 / 60);
    assert.equal(r.heard, true);
    assert.equal(st.push(i / 60, r.pitch ? r.pitch.f0 : null), null); // skan, bet stabila toņa nav
  }
});

test('display columns: a tone shows its peak in the right column; columns span 20 Hz–20 kHz', () => {
  const fr = frame([[1000, 0.05]]);
  const out = new Float32Array(800);
  M.columnsFrom(fr.low, fr.high, SR, out);
  let best = 0;
  for (let i = 1; i < out.length; i++) if (out[i] > out[best]) best = i;
  const fAt = M.freqAt((best + 0.5) / out.length);
  assert.ok(Math.abs(fAt / 1000 - 1) < 0.01, String(fAt));
  assert.ok(out[best] > -42 && out[best] < -38, String(out[best])); // amplitūda 0,05 · ½ · vidējais Blackman 0,42 → −39,6 dB
});

test('display columns above the Nyquist frequency stay at the floor (16 kHz context)', () => {
  const low = new Float32Array(LOW / 2).fill(-90);
  const high = new Float32Array(HIGH / 2).fill(-90);
  const out = new Float32Array(400);
  M.columnsFrom(low, high, 16000, out);
  const at = (f) => out[Math.floor(M.logPos(f) * out.length)];
  assert.ok(Math.abs(at(5000) + 90) < 1e-6, String(at(5000)));
  assert.equal(at(12000), M.DB_FLOOR);
  for (const v of out) assert.ok(v <= -89.999, String(v));
});

test('loud broadband sound stays fast: one frame of analysis well under 3 ms on average', () => {
  const an = M.createAnalysis(SR);
  const frames = [0, 1, 2, 3].map((i) => frame([], { noise: 0.3, seed: 500 + i }));
  frames.forEach((f) => an.update(f.low, f.high, 0.5));
  const t0 = performance.now();
  for (let i = 0; i < 40; i++) { const f = frames[i % 4]; an.update(f.low, f.high, 1 / 60); }
  const per = (performance.now() - t0) / 40;
  assert.ok(per < 3, `${per.toFixed(2)} ms`);
});

// ── 3. Fons, stabilitāte, rādījums, rekordi ──────────────────
test('floor: before any sound it sits at the bottom, not at 0 dB', () => {
  const floor = M.createFloor(3);
  for (const v of floor.level) assert.equal(v, M.DB_FLOOR);
});
test('floor: hum present from the start is absorbed — never above threshold after 1 s', () => {
  const n = 200;
  const an = { floor: M.createFloor(n) };
  const rand = mulberry32(5);
  const x = new Float32Array(n);
  let above = 0;
  for (let i = 0; i < 300; i++) {
    for (let k = 0; k < n; k++) x[k] = -100 + 4 * gaussian(rand);
    x[50] = -60; // dūkoņa
    an.floor.update(x, 1 / 60);
    if (i > 60 && x[50] > an.floor.level[50] + 15) above++;
  }
  assert.equal(above, 0);
});

test('floor: a tone held 10 s, 30 dB over the noise, stays above the threshold', () => {
  const n = 200;
  const floor = M.createFloor(n);
  const x = new Float32Array(n).fill(-100);
  for (let i = 0; i < 120; i++) floor.update(x, 1 / 60); // 2 s klusums
  x[80] = -70;
  for (let i = 0; i < 600; i++) floor.update(x, 1 / 60); // 10 s tonis
  assert.ok(x[80] > floor.level[80] + 15, String(floor.level[80]));
});

test('floor: analyser empty at first (−Infinity), then loud noise from the start → floor catches up within 1.5 s', () => {
  const floor = M.createFloor(4);
  const empty = new Float32Array(4).fill(-Infinity);
  for (let i = 0; i < 10; i++) floor.update(empty, 1 / 60);
  const quietStart = new Float32Array(4).fill(-110); // garais logs vēl tikai daļēji pilns
  floor.update(quietStart, 1 / 60);
  const noise = new Float32Array(4).fill(-65);
  for (let i = 0; i < 90; i++) floor.update(noise, 1 / 60);
  for (const v of floor.level) assert.ok(v > -66, String(v));
});

test('floor: silence in the analyser (−Infinity) does not break it', () => {
  const floor = M.createFloor(3);
  floor.update(new Float32Array([-Infinity, -Infinity, -Infinity]), 1 / 60);
  floor.update(new Float32Array([-90, -90, -90]), 1 / 60);
  for (const v of floor.level) assert.ok(Number.isFinite(v));
});

test('stability: steady 0.3 s → stable after 0.25 s; ±5 % jitter → never; 0.05 s click → never', () => {
  let st = M.createStability();
  let firstStable = null;
  for (let i = 0; i <= 18; i++) {
    const s = st.push(i / 60, 440 + (i % 2 ? 0.3 : -0.3));
    if (s !== null && firstStable === null) firstStable = i / 60;
  }
  assert.ok(firstStable >= 0.25 && firstStable < 0.3, String(firstStable));
  st = M.createStability();
  for (let i = 0; i < 60; i++) assert.equal(st.push(i / 60, i % 2 ? 440 * 1.05 : 440 / 1.05), null);
  st = M.createStability();
  for (let i = 0; i < 60; i++) assert.equal(st.push(i / 60, i < 3 ? 1000 : null), null);
});

test('readout: updates at most 5 times a second, “—” after 0.5 s without a tone', () => {
  const r = M.createReadout();
  assert.equal(r.update(0, 440), 440);
  assert.equal(r.update(0.1, 441), 440);
  assert.equal(r.update(0.21, 442), 442);
  assert.equal(r.update(0.5, null), 442);
  assert.equal(r.update(0.75, null), null);
});

test('records: first, lower, higher', () => {
  let r = M.addRecord({ lo: null, hi: null }, 440);
  assert.deepEqual(r, { rec: { lo: 440, hi: 440 }, changed: 'first' });
  r = M.addRecord(r.rec, 220);
  assert.equal(r.changed, 'lo');
  r = M.addRecord(r.rec, 300);
  assert.equal(r.changed, null);
  r = M.addRecord(r.rec, 880);
  assert.deepEqual(r, { rec: { lo: 220, hi: 880 }, changed: 'hi' });
});

test('records count only 40–5 000 Hz (voice, whistle, instruments): electronics whine and rumble stay out', () => {
  const empty = { lo: null, hi: null };
  for (const f of [16111, 17179, 5100, 28.7, 26.5, 39]) assert.equal(M.addRecord(empty, f).changed, null, String(f));
  assert.equal(M.addRecord(empty, 40).changed, 'first');
  assert.equal(M.addRecord(empty, 5000).changed, 'first');
  const r = M.addRecord({ lo: 98, hi: 440 }, 16111);
  assert.deepEqual(r, { rec: { lo: 98, hi: 440 }, changed: null });
});

test('microphone errors: each cause has its own text key', () => {
  const env = { secure: true, hasMedia: true, hasAudio: true, browser: 'chrome', mac: true };
  const err = (name, message = '') => Object.assign(new Error(message), { name });
  assert.equal(M.classifyMicError(null, { ...env, secure: false }).key, 'err.insecure');
  assert.equal(M.classifyMicError(null, { ...env, hasAudio: false }).key, 'err.unsupported');
  assert.equal(M.classifyMicError(err('NotAllowedError', 'Permission denied'), env).key, 'err.deniedChrome');
  assert.equal(M.classifyMicError(err('NotAllowedError', 'The request is not allowed'), { ...env, browser: 'safari' }).key, 'err.deniedSafari');
  assert.equal(M.classifyMicError(err('NotAllowedError', 'Permission denied'), { ...env, browser: 'other' }).key, 'err.deniedOther');
  assert.equal(M.classifyMicError(err('NotAllowedError', 'Permission denied by system'), env).key, 'err.systemMac');
  assert.equal(M.classifyMicError(err('NotAllowedError', 'Permission denied by system'), { ...env, mac: false }).key, 'err.systemOther');
  assert.equal(M.classifyMicError(err('NotFoundError', 'Requested device not found'), env).key, 'err.notFound');
  assert.equal(M.classifyMicError(err('NotReadableError', 'Could not start audio source'), env).key, 'err.busy');
  const other = M.classifyMicError(err('TypeError', 'boom'), env);
  assert.equal(other.key, 'err.other');
  assert.equal(other.detail, 'TypeError: boom');
  assert.equal(M.browserOf('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'), 'chrome');
  assert.equal(M.browserOf('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'), 'safari');
  assert.equal(M.browserOf('Mozilla/5.0 (Macintosh; Intel Mac OS X 14.0; rv:131.0) Gecko/20100101 Firefox/131.0'), 'other');
});
