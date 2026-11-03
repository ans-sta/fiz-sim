// assets/spectrum/model.js — S-03 skaņas spektra analizators: tīrā loģika (bez DOM un Web Audio), lai to var pārbaudīt node testos.
// Spec. docs/plans/2026-11-01-skanas-spektrs.md (§ 4 fizika un mērīšana, § 4.7 krāsas, § 9.1 — pamattonis).
import { formatNumber } from '../measure/format.js';

export const F_MIN = 20;
export const F_MAX = 20000;
export const REC_MIN = 25; // pamattoni un toņus meklē no 25 Hz (zemāk telpas dūkoņa un mikrofona troksnis)
// Rekordos skaitās tikai 40–5 000 Hz — balss, svilpiens, instrumenti (Ansis 03.11: telefonā un datorā rekordos bija
// ~16–17 kHz elektronikas pīkstiens un ~26–29 Hz dūkoņa); grafiks un lielais skaitlis rāda visu
export const REC_RANGE = { lo: 40, hi: 5000 };
// Rekordā nots skaitās, ja turas ≥ 0,5 s (lielais skaitlis — jau pēc 0,25 s): nots sākums, kad balss vēl kāpj, rekordu nepazemina
// (Ansis 03.11: do-mi-sol-do — ZEMĀKĀ 124 Hz zem “do” ~130 Hz)
export const REC_HOLD = 0.5;
// Vibrato sānjoslas: garajā FFT (0,68 s) nots ar vibrato ~5,5 Hz ir virsotņu ķemme ±5,5 Hz, ±11 Hz …; augstai notij sānjoslas
// ir tikpat stipras kā vidējā, un rādījums lēkātu pa tām. Virsotnes ±5 % ap stiprāko apvieno vienā tonī ar jaudas vidējo frekvenci.
const VIB_MERGE = 0.05;
export const SEAM = 400; // zem šīs frekvences garais FFT (32 768), virs — īsais (8 192)
export const DB_FLOOR = -160;
const DECADES = 3; // 20 Hz–20 kHz

// ── Frekvenču ass (logaritmiska) ───────────────────────────
export const logPos = (f) => Math.log10(f / F_MIN) / DECADES;
export const freqAt = (u) => F_MIN * Math.pow(10, u * DECADES);
export const TICKS_MAJOR = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
export const TICKS_MINOR = [30, 40, 60, 70, 80, 90, 300, 400, 600, 700, 800, 900, 3000, 4000, 6000, 7000, 8000, 9000];
export const tickLabel = (f) => (f >= 1000 ? `${f / 1000}k` : String(f));
// Šaurā grafikā paliek 100, 1k, 10k (spec. § 3.3)
export const majorTicksFor = (widthPx) => (widthPx >= 480 ? TICKS_MAJOR : [100, 1000, 10000]);

// JUTĪBA 1–10 pārbīda 70 dB augstu logu: 1 → −10…−80 dB, 10 → −55…−125 dB (spec. § 4.4)
export function dbWindow(sens) {
  const top = -10 - 5 * (sens - 1);
  return { top, bottom: top - 70 };
}

// ── Krāsas: skaņas log vieta → gaismas frekvence 430–750 THz (arī log) → viļņa garums → spektra krāsa (spec. § 4.7) ──
export function wavelengthNm(f) {
  return 299792.458 / (430 * Math.pow(750 / 430, logPos(f)));
}

export function colorBand(f) {
  const nm = wavelengthNm(f);
  if (nm > 620) return 'red';
  if (nm > 590) return 'orange';
  if (nm > 570) return 'yellow';
  if (nm > 495) return 'green';
  if (nm > 450) return 'blue';
  return 'violet';
}

// Redzamās gaismas viļņa garums → sRGB (D. Bruton tuvinājums), 0–255
export function spectralRGB(nm) {
  let r = 0;
  let g = 0;
  let b = 0;
  if (nm < 440) { r = (440 - nm) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = (510 - nm) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  // dzeltenā → oranžā → sarkanā: Bruton lineārais g = (645 − λ)/65 590–600 nm zīmēja zeltaini dzeltenu, lai gan tā ir oranžā josla
  // (Ansis 03.11, 146 Hz); tagad zaļais krīt straujāk līdz 597 nm, robežas (§ 4.7) tās pašas
  else if (nm < 597) { r = 1; g = 1 - (0.45 * (nm - 580)) / 17; }
  else if (nm < 620) { r = 1; g = 0.55 - (0.25 * (nm - 597)) / 23; }
  else if (nm < 645) { r = 1; g = (0.3 * (645 - nm)) / 25; }
  else r = 1;
  const k = nm < 420 ? 0.3 + (0.7 * (nm - 380)) / 40 : nm > 700 ? 0.3 + (0.7 * (780 - nm)) / 80 : 1;
  const c = (v) => Math.round(255 * Math.pow(Math.max(0, Math.min(1, v * k)), 0.8));
  return [c(r), c(g), c(b)];
}

export function hexRGB(s) {
  const t = String(s).trim();
  const m = /^#([0-9a-f]{6})$/i.exec(t);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  const r = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(t);
  return r ? [Number(r[1]), Number(r[2]), Number(r[3])] : [0, 0, 0];
}

function luminance([r, g, b]) {
  const lin = (v) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Pietuvina krāsu baltajai (tumšā tēma) vai melnajai (gaišā), līdz tā ir ≥ ratio pret visiem foniem
export function ensureContrast(rgb, backgrounds, ratio, towardWhite) {
  const target = towardWhite ? [255, 255, 255] : [0, 0, 0];
  for (let t = 0; t <= 1.0001; t += 0.02) {
    const c = rgb.map((v, i) => Math.round(v + (target[i] - v) * t));
    if (backgrounds.every((bg) => contrastRatio(c, bg) >= ratio)) return c;
  }
  return target;
}

// Krāsu tabula pa log asi (indekss = logPos · n): katrai tēmai ≥ 3 : 1 pret --sheet un --field (piekļūstamība)
export function buildLUT({ sheet, field, dark }, n = 256) {
  const bgs = [hexRGB(sheet), hexRGB(field)];
  const rgb = [];
  for (let i = 0; i < n; i++) rgb.push(ensureContrast(spectralRGB(wavelengthNm(freqAt((i + 0.5) / n))), bgs, 3, dark));
  return { rgb, css: rgb.map(([r, g, b]) => `rgb(${r}, ${g}, ${b})`) };
}

export const lutIndex = (f, n) => Math.max(0, Math.min(n - 1, Math.floor(logPos(f) * n)));

// ── Skaitļu formāts ───────────────────────────────────────
// Zem 100 Hz ar vienu decimāli (82,4), citādi vesels; tūkstoši ar nedalāmo atstarpi (3 520) — spec. § 3.5
export function formatFreq(f, lang) {
  const r1 = Math.round(f * 10) / 10;
  if (r1 < 100) return formatNumber(r1, 1, lang);
  return String(Math.round(f)).replace(/\B(?=(\d{3})+$)/g, ' ');
}

export const octaves = (lo, hi) => Math.log2(hi / lo);

// ── Divi spektri vienā sarakstā ───────────────────────────
// Zem SEAM garā FFT joslas (1,46 Hz pie 48 kHz), no SEAM — īsā FFT joslas (5,86 Hz); frekvences augošā secībā.
export function mergedBins(sampleRate, { lowSize = 32768, highSize = 8192, seam = SEAM } = {}) {
  const binHz = [sampleRate / lowSize, sampleRate / highSize];
  const src = [];
  const idx = [];
  const f = [];
  for (let k = Math.ceil(F_MIN / binHz[0]); k * binHz[0] < seam; k++) { src.push(0); idx.push(k); f.push(k * binHz[0]); }
  for (let k = Math.ceil(seam / binHz[1]); k * binHz[1] <= F_MAX && k < highSize / 2; k++) { src.push(1); idx.push(k); f.push(k * binHz[1]); }
  return { binHz, src: Uint8Array.from(src), idx: Int32Array.from(idx), f: Float64Array.from(f), n: f.length };
}

const clampDb = (v) => (v > DB_FLOOR ? v : DB_FLOOR); // arī −Infinity un NaN

export function fillMerged(map, low, high, out) {
  const raw = [low, high];
  for (let i = 0; i < map.n; i++) out[i] = clampDb(raw[map.src[i]][map.idx[i]]);
}

// ── Fona sekotājs (spec. § 4.5): lēni ceļas (0,3 dB/s — ģeneratora tonis paliek redzams minūtēm), ātri krīt;
// pirmajā sekundē ar skaņu ceļas ātri, lai iesūc to, kas skan jau pie SĀKT (projektors, dūkoņa).
// Kamēr analizatorā vēl nav skaņas (viss −∞), nesāk — citādi fons sāktu no −160 dB un nepaspētu pacelties.
export function createFloor(n, { rise = 0.3, fastRise = 120, settle = 1, fall = 0.15 } = {}) {
  const level = new Float32Array(n).fill(DB_FLOOR);
  let age = -1;
  return {
    level,
    update(x, dt) {
      if (age < 0) {
        let any = false;
        for (let i = 0; i < n && !any; i++) any = x[i] > DB_FLOOR + 1;
        if (!any) return;
        for (let i = 0; i < n; i++) level[i] = clampDb(x[i]);
        age = 0;
        return;
      }
      age += dt;
      const up = (age < settle ? fastRise : rise) * dt;
      const a = 1 - Math.exp(-dt / fall);
      for (let i = 0; i < n; i++) {
        const v = clampDb(x[i]);
        const l = level[i];
        level[i] = v > l ? Math.min(v, l + up) : l + (v - l) * a;
      }
    },
    get settled() { return age >= settle; }, // fons iepazīts (pirmā sekunde ar skaņu pagājusi)
    reset() { age = -1; },
  };
}

// k-tais mazākais (quickselect) masīva a pirmajos len elementos; a tiek pārkārtots
function quickSelect(a, len, k) {
  let lo = 0;
  let hi = len - 1;
  while (lo < hi) {
    const p = a[(lo + hi) >> 1];
    let i = lo;
    let j = hi;
    while (i <= j) {
      while (a[i] < p) i++;
      while (a[j] > p) j--;
      if (i <= j) { const t = a[i]; a[i] = a[j]; a[j] = t; i++; j--; }
    }
    if (k <= j) hi = j;
    else if (k >= i) lo = i;
    else break;
  }
  return a[k];
}

function lowerIndex(f, x) { // pirmais indekss ar f[i] ≥ x
  let lo = 0;
  let hi = f.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (f[m] < x) lo = m + 1; else hi = m; }
  return lo;
}

// Joslas pa 1/12 oktāvas, katra ±1/6 oktāvas plata (vismaz 7 joslas no spektra), mediāna — fona līmenis bez toņiem
function makeBands(map) {
  const lo = [];
  const hi = [];
  for (let j = 0; F_MIN * Math.pow(2, j / 12) <= F_MAX * 1.03; j++) {
    const fc = F_MIN * Math.pow(2, j / 12);
    let a = lowerIndex(map.f, fc * Math.pow(2, -1 / 6));
    let b = lowerIndex(map.f, fc * Math.pow(2, 1 / 6));
    while (b - a < 7) { if (a > 0) a--; if (b < map.n) b++; }
    lo.push(a);
    hi.push(b);
  }
  const count = lo.length;
  const j0 = new Int32Array(map.n);
  const frac = new Float32Array(map.n);
  for (let i = 0; i < map.n; i++) {
    const p = Math.max(0, Math.min(count - 1.0001, 12 * Math.log2(map.f[i] / F_MIN)));
    j0[i] = Math.floor(p);
    frac[i] = p - j0[i];
  }
  return { lo: Int32Array.from(lo), hi: Int32Array.from(hi), count, j0, frac };
}

export function parabolic(a, b, c) {
  const d = a - 2 * b + c;
  if (!(d < 0)) return { offset: 0, peak: b };
  const offset = Math.max(-1, Math.min(1, (0.5 * (a - c)) / d));
  return { offset, peak: b - 0.25 * (a - c) * offset };
}

// Apkārtnes mediāna ±1/3 oktāvas, bez pašas virsotnes galvenās daivas (±4 joslas)
function surroundMedian(map, db, i, f, scratch) {
  const a = lowerIndex(map.f, f * Math.pow(2, -1 / 3));
  const b = lowerIndex(map.f, f * Math.pow(2, 1 / 3));
  let m = 0;
  for (let j = a; j < b; j++) if (Math.abs(j - i) > 4) scratch[m++] = db[j];
  return m ? quickSelect(scratch, m, m >> 1) : DB_FLOOR;
}

// Toņi: lokāls maksimums virs sliekšņa, šaurs (≥ prom dB virs apkārtnes), frekvence precizēta ar parabolu savā spektrā
export function findTones(map, db, thr, raw, { prom = 10, maxTones = 20, maxChecks = 60, fmin = REC_MIN, scratch = new Float32Array(map.n) } = {}) {
  const cand = [];
  for (let i = 1; i < map.n - 1; i++) {
    const v = db[i];
    if (v > thr[i] && v > db[i - 1] && v >= db[i + 1] && map.f[i] >= fmin * 0.97) cand.push(i);
  }
  cand.sort((x, y) => db[y] - db[x]);
  const tones = [];
  let checks = 0;
  for (const i of cand) {
    if (tones.length >= maxTones || checks >= maxChecks) break; // skaļā troksnī (aplausi, “sss”) simtiem kandidātu — kadrs paliek ātrs
    if (tones.length && db[i] < tones[0].db - 50) break; // Blackman loga sānu daivas ir ≥ 58 dB zem virsotnes — tie nav toņi
    const s = map.src[i];
    const k = map.idx[i];
    const arr = raw[s];
    const bin = map.binHz[s];
    let off = 0;
    if (k > 0 && k < arr.length - 1) off = parabolic(clampDb(arr[k - 1]), clampDb(arr[k]), clampDb(arr[k + 1])).offset;
    const f = (k + off) * bin;
    if (f < fmin) continue;
    if (tones.some((t) => Math.abs(t.f - f) < 3.5 * Math.max(bin, t.bin))) continue; // tās pašas virsotnes daiva (arī pie šuves)
    const v = db[i];
    checks++;
    if (v - surroundMedian(map, db, i, f, scratch) < prom) continue;
    const p = Math.pow(10, v / 10);
    const near = tones.find((t) => Math.abs(f / t.head - 1) <= VIB_MERGE);
    if (near) { near.pw += p; near.pf += p * f; continue; } // vibrato sānjosla — pie stiprākā toņa
    tones.push({ f, head: f, db: v, w: Math.min(v - thr[i], 60), bin, pw: p, pf: p * f });
  }
  for (const t of tones) t.f = t.pf / t.pw;
  // otrā kārta: kopas, kuru vidējās frekvences ir ±5 % robežās, apvieno (stiprākā sānjosla nav vidū — citādi vidējā nobīdītos)
  for (let merged = true; merged; ) {
    merged = false;
    for (let a = 0; a < tones.length && !merged; a++) {
      for (let b = a + 1; b < tones.length; b++) {
        if (Math.abs(tones[b].f / tones[a].f - 1) > VIB_MERGE) continue;
        tones[a].pw += tones[b].pw;
        tones[a].pf += tones[b].pf;
        tones[a].f = tones[a].pf / tones[a].pw;
        tones.splice(b, 1);
        merged = true;
        break;
      }
    }
  }
  return tones;
}

// Pamattonis (spec. § 9.1 B): harmoniku rindas pamats. Kandidāti — stiprāko toņu f/n; uzvar augstākais kandidāts,
// kas izskaidro ≥ 90 % no labākā (tā f/2, f/3 … neuzvar, jo izskaidro tikpat, bet ir zemāki). Harmonikas līdz 12.
// Kandidāts bez savas virsotnes (trūkstošs pamattonis) derīgs tikai, ja to apstiprina ≥ 3 toņi, zemākais ne augstāk par 3. harmoniku —
// citādi divi nesaistīti toņi (divi skolēni, nots maiņas brīdis, akords) izdomātu zemu noti, kas nonāktu rekordos.
export function fundamental(tones, { fmin = REC_MIN, maxN = 6, top = 5, tol = 0.1, maxM = 12, keep = 0.9 } = {}) {
  if (!tones.length) return null;
  const scored = [];
  let best = 0;
  for (const p of tones.slice(0, top)) {
    for (let n = 1; n <= maxN; n++) {
      let f0 = p.f / n;
      if (f0 < fmin) break;
      let score = 0;
      let count = 0;
      let minM = Infinity;
      for (let pass = 0; pass < 3; pass++) {
        let swm2 = 0;
        let swmp = 0;
        score = 0;
        count = 0;
        minM = Infinity;
        for (const t of tones) {
          const m = Math.round(t.f / f0);
          if (m < 1 || m > maxM || Math.abs(t.f / f0 - m) > tol) continue;
          score += t.w;
          count++;
          if (m < minM) minM = m;
          swm2 += t.w * m * m;
          swmp += t.w * m * t.f;
        }
        if (pass < 2 && swm2 > 0) f0 = swmp / swm2;
      }
      if (minM !== 1 && (count < 3 || minM > 3)) continue;
      scored.push({ f0, score });
      if (score > best) best = score;
    }
  }
  let pick = null;
  for (const c of scored) if (c.score >= keep * best && (!pick || c.f0 > pick.f0)) pick = c;
  if (!pick) return null;
  const at = tones.find((t) => Math.abs(t.f / pick.f0 - 1) <= 0.03);
  return { f0: at ? centroidNear(tones, at.f) : pick.f0, loud: tones[0] };
}

// Pamattoņa precīzā vērtība: visu toņu ±8 % ap to jaudas vidējā frekvence (3 kārtas) — vibrato sānjoslu ķemmes vidus,
// arī ja stiprākā sānjosla nav vidū. Citi toņi tik tuvu (pustonis ir 6 %) dziedot reti; terca (19 %) un tālāk netiek klāt.
function centroidNear(tones, f, r = 0.08) {
  let c = f;
  for (let it = 0; it < 3; it++) {
    let pw = 0;
    let pf = 0;
    for (const t of tones) if (Math.abs(t.f / c - 1) <= r) { pw += t.pw; pf += t.pw * t.f; }
    if (!pw) break;
    c = pf / pw;
  }
  return c;
}

// Viss viena kadra apstrādes cikls: apvienotais spektrs, fons (pa joslām un pa frekvencēm), slieksnis, toņi, pamattonis
export function createAnalysis(sampleRate, { thresh = 15, prom = 10, maxTones = 20, fmin = REC_MIN } = {}) {
  const map = mergedBins(sampleRate);
  const n = map.n;
  const db = new Float32Array(n);
  const thr = new Float32Array(n);
  const scratch = new Float32Array(n);
  const bands = makeBands(map);
  const bandVal = new Float32Array(bands.count);
  const binFloor = createFloor(n);
  const bandFloor = createFloor(bands.count);
  return {
    map,
    db,
    thr,
    update(low, high, dt) {
      fillMerged(map, low, high, db);
      for (let b = 0; b < bands.count; b++) {
        let m = 0;
        for (let j = bands.lo[b]; j < bands.hi[b]; j++) scratch[m++] = db[j];
        bandVal[b] = quickSelect(scratch, m, m >> 1);
      }
      bandFloor.update(bandVal, dt);
      binFloor.update(db, dt);
      const bl = bandFloor.level;
      for (let i = 0; i < n; i++) {
        const j = bands.j0[i];
        const band = bl[j] + (bl[j + 1] - bl[j]) * bands.frac[i];
        thr[i] = Math.max(band, binFloor.level[i]) + thresh;
      }
      const tones = findTones(map, db, thr, [low, high], { prom, maxTones, fmin, scratch });
      // “Skan” — vismaz 3 joslas virs sliekšņa (runa, šņākoņa, slīdoša nots), arī ja stabila augstuma nav; tad rādījums nav “klusums”.
      // Viena josla pie paša sliekšņa ir trokšņa svārstība; pirmajā sekundē fons vēl mācās (analizatora buferis pildās).
      let above = 0;
      if (binFloor.settled) for (let i = 0; i < n && above < 3; i++) if (db[i] > thr[i] && map.f[i] >= fmin) above++;
      return { tones, pitch: fundamental(tones, { fmin }), heard: above >= 3 };
    },
    reset() {
      binFloor.reset();
      bandFloor.reset();
    },
  };
}

// ── Zīmējuma kolonnas ─────────────────────────────────────
// Katrai no n kolonnām (log ass fLo–fHi) — dB: ja kolonnā ir joslas, to maksimums (virsotnes nepazūd), citādi
// lineāra interpolācija; starp 300 un 500 Hz garā un īsā FFT spektrs pāriet viens otrā.
function sampleBins(arr, bin, fa, fb) {
  if (fa / bin > arr.length - 1) return DB_FLOOR; // virs Nyquist frekvences (piem. 16 kHz austiņas) spektra nav
  const ka = Math.ceil(fa / bin);
  const kb = Math.min(arr.length - 1, Math.floor(fb / bin));
  if (kb >= ka) {
    let v = DB_FLOOR;
    for (let k = ka; k <= kb; k++) if (arr[k] > v) v = arr[k];
    return v;
  }
  const x = Math.sqrt(fa * fb) / bin;
  const k = Math.min(arr.length - 2, Math.floor(x));
  return clampDb(arr[k]) + (clampDb(arr[k + 1]) - clampDb(arr[k])) * (x - k);
}

export function columnsFrom(low, high, sampleRate, out, { fLo = F_MIN, fHi = F_MAX } = {}) {
  const binLo = sampleRate / (2 * low.length);
  const binHi = sampleRate / (2 * high.length);
  const n = out.length;
  const lr = Math.log(fHi / fLo);
  const span = Math.log(500 / 300);
  for (let c = 0; c < n; c++) {
    const fa = fLo * Math.exp((lr * c) / n);
    const fb = fLo * Math.exp((lr * (c + 1)) / n);
    const fm = Math.sqrt(fa * fb);
    let v;
    if (fm <= 300) v = sampleBins(low, binLo, fa, fb);
    else if (fm >= 500) v = sampleBins(high, binHi, fa, fb);
    else {
      const t = Math.log(fm / 300) / span;
      v = sampleBins(low, binLo, fa, fb) * (1 - t) + sampleBins(high, binHi, fa, fb) * t;
    }
    out[c] = v;
  }
  return out;
}

// Tas pats apvienotajam sarakstam (sliekšņa līnijai)
export function columnsFromMerged(map, values, out, { fLo = F_MIN, fHi = F_MAX } = {}) {
  const n = out.length;
  const lr = Math.log(fHi / fLo);
  for (let c = 0; c < n; c++) {
    const fa = fLo * Math.exp((lr * c) / n);
    const fb = fLo * Math.exp((lr * (c + 1)) / n);
    const a = lowerIndex(map.f, fa);
    const b = lowerIndex(map.f, fb);
    if (b > a) {
      let v = DB_FLOOR;
      for (let j = a; j < b; j++) if (values[j] > v) v = values[j];
      out[c] = v;
    } else {
      const j = Math.max(1, Math.min(map.n - 1, a));
      const fm = Math.sqrt(fa * fb);
      const t = (fm - map.f[j - 1]) / (map.f[j] - map.f[j - 1]);
      out[c] = values[j - 1] + (values[j] - values[j - 1]) * Math.max(0, Math.min(1, t));
    }
  }
  return out;
}

// ── Stabilitāte, rādījums, rekordi ─────────────────────────
// Tonis skaitās, ja turas ≥ hold s un frekvence nemainās vairāk par ±tol (spec. § 3.6, § 4.5); īsi pārtraukumi ≤ gap s piedodami
export function createStability({ hold = 0.25, tol = 0.03, gap = 0.06 } = {}) {
  let buf = [];
  let runStart = null;
  let lastT = null;
  const median = () => {
    const s = buf.map((x) => x.f).sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  return {
    push(t, f) {
      if (f === null || f === undefined || !Number.isFinite(f)) {
        if (lastT !== null && t - lastT > gap) { buf = []; runStart = null; lastT = null; }
        return null;
      }
      if (buf.length && Math.abs(f / median() - 1) > tol) { buf = []; runStart = null; }
      if (runStart === null) runStart = t;
      buf.push({ t, f });
      lastT = t;
      while (buf.length > 1 && buf[0].t < t - hold) buf.shift();
      return t - runStart >= hold - 1e-9 ? median() : null;
    },
    reset() { buf = []; runStart = null; lastT = null; },
  };
}

// Vibrato vidū: pamattoņa mediāna pēdējās win s (≈ viens vibrato periods pie 5,5 Hz) — rādījums un stabilitāte seko notij,
// nevis tās šūpošanās ±5 %; mediāna neņem vērā atsevišķus oktāvas lēcienus. Ja pusē kadru toņa nav — null.
export function createPitchSmoother({ win = 0.2 } = {}) {
  let buf = [];
  return {
    push(t, f) {
      buf.push({ t, f: f === null || f === undefined || !Number.isFinite(f) ? null : f });
      while (buf.length > 1 && buf[0].t < t - win) buf.shift();
      const v = buf.filter((x) => x.f !== null).map((x) => x.f).sort((a, b) => a - b);
      if (buf[buf.length - 1].f === null || v.length * 2 < buf.length) return null;
      const m = v.length >> 1;
      return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
    },
    reset() { buf = []; },
  };
}

// Lielais skaitlis: ne biežāk kā 5 reizes sekundē; “—”, ja tonis nav bijis silence s
export function createReadout({ every = 0.2, silence = 0.5 } = {}) {
  let shown = null;
  let shownT = -Infinity;
  let seenT = -Infinity;
  return {
    update(t, f) {
      if (f !== null && f !== undefined) {
        seenT = t;
        if (shown === null || t - shownT >= every - 1e-9) { shown = f; shownT = t; }
      } else if (shown !== null && t - seenT > silence) shown = null;
      return shown;
    },
    reset() { shown = null; shownT = -Infinity; seenT = -Infinity; },
  };
}

// Rekords mainās, ja jaunais tonis ir zemāks/augstāks vairāk par margin (citādi turētas nots trīce mainītu rekordu katrā kadrā)
export function addRecord(rec, f, margin = 0.003, { lo = REC_RANGE.lo, hi = REC_RANGE.hi } = {}) {
  if (!(f >= lo && f <= hi)) return { rec, changed: null };
  if (rec.lo === null) return { rec: { lo: f, hi: f }, changed: 'first' };
  if (f < rec.lo * (1 - margin)) return { rec: { lo: f, hi: rec.hi }, changed: 'lo' };
  if (f > rec.hi * (1 + margin)) return { rec: { lo: rec.lo, hi: f }, changed: 'hi' };
  return { rec, changed: null };
}

// ── Mikrofona kļūdas (spec. § 3.9): katram cēlonim sava teksta atslēga ──
export function browserOf(ua) {
  const s = String(ua);
  if (/Firefox|FxiOS/.test(s)) return 'other';
  if (/Chrome|Chromium|CriOS|Edg\//.test(s)) return 'chrome';
  if (/Safari/.test(s) && /Version\//.test(s)) return 'safari';
  return 'other';
}

export function classifyMicError(err, { secure, hasMedia, hasAudio, browser, mac }) {
  if (!secure) return { key: 'err.insecure', detail: '' };
  if (!hasMedia || !hasAudio) return { key: 'err.unsupported', detail: '' };
  if (!err) return { key: 'err.other', detail: '' };
  const name = err.name || 'Error';
  const message = err.message || '';
  const detail = message ? `${name}: ${message}` : name;
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    if (/system/i.test(message)) return { key: mac ? 'err.systemMac' : 'err.systemOther', detail };
    return { key: browser === 'chrome' ? 'err.deniedChrome' : browser === 'safari' ? 'err.deniedSafari' : 'err.deniedOther', detail };
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return { key: 'err.notFound', detail };
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') return { key: 'err.busy', detail };
  return { key: 'err.other', detail };
}
