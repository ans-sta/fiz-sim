// assets/sound/model.js
// Skaņas laboratorija (S-02): tīrā loģika bez DOM — frekvence un nošu klaviatūra, viļņu formas un to harmonikas,
// divi avoti ar fāzu nobīdi, harmoniku rinda. Frekvences Hz, laiks s, leņķi grādos (φ) — kā lapā.
import { roundTo } from '../measure/format.js';

export const FMIN = 40;
export const FMAX = 20000; // līdz dzirdes robežai (Ansis 05.10) — audio skan; VIĻŅA FORMAS 20 ms logs zīmējams tikai līdz waveDrawLimit()
export const NH = 12; // harmoniku skaits
export const C_AIR = 343; // m/s — skaņas ātrums gaisā
export const TAU = 2 * Math.PI;
export const POS_MAX = 1000; // frekvences slīdnis ir logaritmisks: stāvoklis 0…1000 ↔ 40…20 000 Hz
export const VIEWS = ['wave', 'two', 'harmonics'];
export const WAVES = ['sine', 'triangle', 'sawtooth', 'square'];
export const PRESETS = ['sine', 'sawtooth', 'square', 'triangle', 'all'];
export const INSTRUMENTS = ['flute', 'clarinet', 'violin', 'trumpet'];
export const OCTAVES = { min: 2, max: 5 }; // lielā … 2. oktāva (tastatūra: 17 taustiņi no do)
export const N_KEYS = 17;
export const RANGES = {
  pos: { min: 0, max: POS_MAX, step: 2 }, // ≈ 1,25 % frekvences solis (piektdaļa pustoņa)
  amp: { min: 0, max: 1, step: 0.05 },
  phi: { min: 0, max: 360, step: 5 },
  vol: { min: 0, max: 100, step: 5 },
  harm: { min: 0, max: 1, step: 0.01 },
};

// Viļņa forma: fn(p) — vērtība fāzē p (0…1 = viens periods); harmonic(n) — n-tās harmonikas amplitūda ar zīmi
const triangleFn = (p) => (2 / Math.PI) * Math.asin(Math.sin(TAU * p));
const sawFn = (p) => 2 * ((((p + 0.5) % 1) + 1) % 1) - 1;
const squareFn = (p) => ((((p % 1) + 1) % 1) < 0.5 ? 1 : -1);
export const WAVE_FN = { sine: (p) => Math.sin(TAU * p), triangle: triangleFn, sawtooth: sawFn, square: squareFn };
export function harmonicOf(wave, n) {
  switch (wave) {
    case 'sine': return n === 1 ? 1 : 0;
    case 'triangle': return n % 2 ? (((n - 1) / 2) % 2 ? -1 : 1) / (n * n) : 0;
    case 'sawtooth': return (n % 2 ? 1 : -1) / n;
    case 'square': return n % 2 ? 1 / n : 0;
    default: return 0;
  }
}

// Aptuveni līdzsvara spektri — tipiska forma vidējam reģistram, ne viena konkrēta instrumenta mērījums
export const INSTRUMENT_SPECTRA = {
  flute: [1, 0.4, 0.15, 0.07, 0.03, 0.015, 0, 0, 0, 0, 0, 0],
  clarinet: [1, 0.04, 0.75, 0.06, 0.5, 0.07, 0.3, 0.1, 0.2, 0.08, 0.12, 0.05],
  violin: [1, 0.6, 0.45, 0.5, 0.25, 0.3, 0.15, 0.18, 0.1, 0.08, 0.06, 0.05],
  trumpet: [0.6, 0.9, 1, 0.9, 0.75, 0.6, 0.45, 0.35, 0.25, 0.18, 0.12, 0.08],
};

// ── Frekvence ───────────────────────────────────────────
const clampF = (f) => Math.min(FMAX, Math.max(FMIN, f));
export function posFromF(f) {
  return (POS_MAX * Math.log(clampF(f) / FMIN)) / Math.log(FMAX / FMIN);
}
export function fFromPos(pos) {
  const p = Math.min(POS_MAX, Math.max(0, pos));
  return roundTo(FMIN * Math.pow(FMAX / FMIN, p / POS_MAX), 0.1);
}
export const WAVE_WINDOW_S = 0.02; // VIĻŅA FORMAS logs — 20 ms
export const MIN_PX_PERIOD = 8; // zem tik pikseļiem uz periodu līkne vairs nav lasāma — pārklājums ar robežu
// Līdz kādai frekvencei 20 ms logs plotW pikseļu platumā ir zīmējams (noapaļots uz leju līdz 100 Hz)
export function waveDrawLimit(plotW) {
  return Math.max(FMIN, Math.floor(plotW / (WAVE_WINDOW_S * MIN_PX_PERIOD) / 100) * 100);
}
// Tastatūra: oktāva oct (2 — lielā, 3 — mazā, 4 — pirmā, 5 — otrā), pustonis s no do (0…16)
export function noteFreq(oct, s) {
  return 440 * Math.pow(2, (12 * (oct + 1) + s - 69) / 12);
}
export const isBlack = (s) => [1, 3, 6, 8, 10].includes(s % 12);
// Tuvākā nots: index 0…11 (do … si), octave 0…7 (subkontroktāva … 4. oktāva), cents −50…50
export function nearestNote(f) {
  const m = 69 + 12 * Math.log2(f / 440);
  const r = Math.round(m);
  return { index: ((r % 12) + 12) % 12, octave: Math.floor(r / 12) - 1, cents: Math.round((m - r) * 100) };
}

// ── Iestatījumi ─────────────────────────────────────────
const harmonic = (on, amp, sign = 1) => ({ on, amp, sign });
export function defaultSettings() {
  return {
    view: 'wave',
    f: 220,
    oct: 3, // mazā oktāva
    vol: 60,
    wave: 'sine',
    a: { on: true, amp: 1 },
    b: { on: true, amp: 1 },
    phi: 60,
    split: false,
    overlay: true,
    preset: null, // pēdējā izvēlētā gatavā forma vai instruments; velkot stabiņu — null
    H: Array.from({ length: NH }, (_, i) => harmonic(i < 3, roundTo(1 / (i + 1), 0.01))),
  };
}
const clampStep = (v, r) => roundTo(Math.min(r.max, Math.max(r.min, v)), r.step);

export const withView = (s, view) => (VIEWS.includes(view) && view !== s.view ? { ...s, view } : s);
export function withF(s, f) {
  if (!Number.isFinite(f)) return s;
  const next = roundTo(clampF(f), 0.01);
  return next === s.f ? s : { ...s, f: next };
}
export const withPos = (s, pos) => (Number.isFinite(pos) ? withF(s, fFromPos(pos)) : s);
export const withWave = (s, wave) => (WAVES.includes(wave) && wave !== s.wave ? { ...s, wave } : s);
export function withAmp(s, src, v) {
  if (!Number.isFinite(v) || !(src in { a: 1, b: 1 })) return s;
  const amp = clampStep(v, RANGES.amp);
  return amp === s[src].amp ? s : { ...s, [src]: { ...s[src], amp } };
}
export function withSourceOn(s, src, on) {
  if (!(src in { a: 1, b: 1 }) || Boolean(on) === s[src].on) return s;
  return { ...s, [src]: { ...s[src], on: Boolean(on) } };
}
export function withPhi(s, v) {
  if (!Number.isFinite(v)) return s;
  const phi = clampStep(v, RANGES.phi);
  return phi === s.phi ? s : { ...s, phi };
}
export const withSplit = (s, split) => (Boolean(split) === s.split ? s : { ...s, split: Boolean(split) });
export const withOverlay = (s, overlay) => (Boolean(overlay) === s.overlay ? s : { ...s, overlay: Boolean(overlay) });
export function withVol(s, v) {
  if (!Number.isFinite(v)) return s;
  const vol = clampStep(v, RANGES.vol);
  return vol === s.vol ? s : { ...s, vol };
}
// Oktāva pa vienu uz leju (−1) vai augšu (+1): tastatūra pārceļas, skanošā frekvence — līdzi (robežās 40–2000 Hz)
export function withOctave(s, dir) {
  const oct = s.oct + dir;
  if (oct < OCTAVES.min || oct > OCTAVES.max) return s;
  return { ...withF(s, s.f * Math.pow(2, dir)), oct };
}
export function withPreset(s, name) {
  if (INSTRUMENTS.includes(name)) {
    const a = INSTRUMENT_SPECTRA[name];
    return { ...s, preset: name, H: a.map((v) => harmonic(v > 0, v > 0 ? v : 0.05)) };
  }
  if (!PRESETS.includes(name)) return s;
  const H = Array.from({ length: NH }, (_, i) => {
    const n = i + 1;
    if (name === 'all') return harmonic(true, 1);
    const v = harmonicOf(name, n);
    return harmonic(v !== 0, v !== 0 ? roundTo(Math.abs(v), 0.01) : roundTo(1 / n, 0.01), v < 0 ? -1 : 1);
  });
  return { ...s, preset: name, H };
}
// Viena harmonika ar roku (stabiņš): amplitūda 0…1 un/vai ieslēgšana; gatavā forma vairs nav spēkā
export function withHarmonic(s, n, { on, amp } = {}) {
  const i = n - 1;
  if (!s.H[i]) return s;
  const h = { ...s.H[i] };
  if (on !== undefined) h.on = Boolean(on);
  if (Number.isFinite(amp)) h.amp = clampStep(amp, RANGES.harm);
  if (h.on === s.H[i].on && h.amp === s.H[i].amp) return s;
  const H = s.H.slice();
  H[i] = h;
  return { ...s, preset: null, H };
}

// ── Aprēķini ────────────────────────────────────────────
export const period = (f) => 1 / f; // s
export const wavelength = (f) => C_AIR / f; // m
// Divu avotu summa: R = √(a² + b² + 2ab cos φ); stāvoklis — ko tas nozīmē skaņai
export function duoResult(s) {
  const a = s.a.on ? s.a.amp : 0;
  const b = s.b.on ? s.b.amp : 0;
  const cs = Math.cos((s.phi * Math.PI) / 180);
  const R = Math.sqrt(Math.max(0, a * a + b * b + 2 * a * b * cs));
  const state = !(a && b) ? 'one' : cs > 0.85 ? 'add' : cs < -0.85 ? 'cancel' : 'partial';
  return { a, b, R, state, shiftT: s.phi / 360, shiftMs: (s.phi / 360) * (1000 / s.f) };
}
// Fāze kā π daļa: 90 → π/2, 60 → π/3, 0 → 0; cits — decimāldaļa ar punktu (lapa to formatē)
export function piFrac(deg) {
  if (deg === 0) return '0';
  if (deg % 15 === 0) {
    let n = deg / 15;
    let m = 12;
    const g = (a, b) => (b ? g(b, a % b) : a);
    const k = g(n, m);
    n /= k;
    m /= k;
    return `${n === 1 ? '' : n}π${m === 1 ? '' : `/${m}`}`;
  }
  return `${(deg / 180).toFixed(2)}π`;
}
// Harmoniku summa divu periodu logā: x 0…1 = 2T
export function harmonicTerms(H) {
  return H.map((h, i) => ({ n: i + 1, v: h.on ? h.sign * h.amp : 0 })).filter((h) => h.v !== 0);
}
export function sumSeries(terms) {
  return (x) => terms.reduce((acc, h) => acc + h.v * Math.sin(TAU * 2 * h.n * x), 0);
}
export function peakOf(fn, n = 800) {
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(fn(i / n)));
  return peak;
}
export const activeCount = (H) => H.filter((h) => h.on).length;

// Audio pastiprinājumi (skaļruņa līmeņi): harmoniku summa normēta, lai nepārslogotu; virs 20 kHz — klusums
export function harmonicGains(s) {
  const sum = s.H.reduce((acc, h) => acc + (h.on ? h.amp : 0), 0);
  const k = 0.6 / Math.max(3, sum);
  return s.H.map((h, i) => (h.on && (i + 1) * s.f < 20000 ? h.sign * h.amp * k : 0));
}
export function duoGains(s) {
  const k = 0.4;
  const ph = (s.phi * Math.PI) / 180;
  const b = s.b.on ? s.b.amp * k : 0;
  return { a: s.a.on ? s.a.amp * k : 0, bs: b * Math.cos(ph), bc: b * Math.sin(ph) };
}

// ── Spektra stabiņi (zīmējuma ģeometrija, px) ───────────
// box: { x, y, w, h }; baseline — stabiņu pamatne; labelH — vieta numuriem zem pamatnes
export function spectrumLayout(box, { labelH = 16, gapFrac = 0.35, top = 0 } = {}) {
  const colW = box.w / NH;
  const barW = colW * (1 - gapFrac);
  const baseline = box.y + box.h - labelH;
  const height = baseline - (box.y + top);
  return Array.from({ length: NH }, (_, i) => ({
    n: i + 1,
    x: box.x + colW * i + (colW - barW) / 2,
    w: barW,
    colX: box.x + colW * i,
    colW,
    baseline,
    height,
    labelBottom: box.y + box.h,
  }));
}
// Kurā stabiņa kolonnā ir punkts: { bar, zone: 'bar' | 'label' } vai null
export function barAt(bars, x, y) {
  for (const bar of bars) {
    if (x < bar.colX || x > bar.colX + bar.colW) continue;
    if (y >= bar.baseline && y <= bar.labelBottom) return { bar, zone: 'label' };
    if (y >= bar.baseline - bar.height && y < bar.baseline) return { bar, zone: 'bar' };
  }
  return null;
}
export function ampFromY(bar, y) {
  return Math.min(1, Math.max(0, (bar.baseline - y) / bar.height));
}
