// assets/spectrum/scene.js — S-03 kanva: spektrs un spektrogramma ar asīm un atzīmēm (spec. § 3.3–3.4).
// Teksts kanvā vienmēr tintes krāsā (≥ 4,5 : 1); spektra krāsas — no LUT (≥ 3 : 1 pret fonu, model.js buildLUT).
import { logPos, TICKS_MAJOR, TICKS_MINOR, tickLabel, majorTicksFor, DB_FLOOR } from './model.js';

const MINUS = '−';
const signed = (v) => (v < 0 ? `${MINUS}${Math.abs(v)}` : String(v));
const font = (px, weight = 400) => `${weight} ${px}px "IBM Plex Mono", ui-monospace, monospace`;

// Grafika laukums kanvā; s — ZĪMĒJUMS (uzraksti un līnijas aug līdzi). Kreisajā apakšas stūrī paliek vieta ⚙ pogai.
// Mazā kanvā (telefonā) uzraksti mazāki: 14 px no ~360 px, līdz 11 px pie ~180 px — grafikam paliek vieta.
export function plotRect(w, h, s) {
  const base = Math.max(11, Math.min(14, 8 + Math.min(w, h) / 60));
  const fs = Math.round(base * s);
  const left = Math.round(fs * 3.2 + 10);
  const bottom = Math.round(fs * 3 + 8);
  const top = Math.round(fs * 2.6);
  const right = Math.round(fs * 1.4);
  return { x: left, y: top, w: Math.max(60, w - left - right), h: Math.max(60, h - top - bottom), fs, s, W: w, H: h };
}

function spectrumGradient(ctx, x0, x1, css) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  const steps = 32;
  for (let i = 0; i <= steps; i++) g.addColorStop(i / steps, css[Math.min(css.length - 1, Math.floor((i / steps) * css.length))]);
  return g;
}

// Uzraksts rāmītī (lapas fonā, tintes mala), lai tas salasāms arī virs krāsainā laukuma
function tag(ctx, text, x, y, { c, fs, s, align = 'left', weight = 500 }) {
  ctx.font = font(fs, weight);
  const tw = ctx.measureText(text).width;
  const pad = 5 * s;
  const bw = tw + 2 * pad;
  const bh = fs + 2 * pad * 0.8;
  const bx = align === 'right' ? x - bw : align === 'center' ? x - bw / 2 : x;
  ctx.fillStyle = c.sheet;
  ctx.fillRect(bx, y, bw, bh);
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = 1;
  ctx.strokeRect(Math.round(bx) + 0.5, Math.round(y) + 0.5, Math.round(bw), Math.round(bh));
  ctx.fillStyle = c.ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + pad, y + bh / 2 + 0.5);
  return bw;
}

// Līnija ar lapas krāsas apmali — redzama virs jebkuras spektra krāsas
function haloLine(ctx, pts, { c, s, dash = [], width = 1.5 }) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.setLineDash([]);
  ctx.strokeStyle = c.sheet;
  ctx.lineWidth = (width + 2) * s;
  ctx.globalAlpha = 0.8;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.setLineDash(dash.map((v) => v * s));
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = width * s;
  ctx.stroke();
  ctx.restore();
}

function asterisk(ctx, x, y, r, { c, s }) {
  ctx.save();
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = 2.2 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const a = Math.PI / 2 + (k * Math.PI) / 3;
    ctx.moveTo(x + r * Math.cos(a), y - r * Math.sin(a));
    ctx.lineTo(x - r * Math.cos(a), y + r * Math.sin(a));
  }
  ctx.stroke();
  ctx.restore();
}

// PAUZE grafika augšējā kreisajā stūrī — virsotņu uzraksti (balss, instrumenti) tur reti, centrā tos aizsedza
function pausedStamp(ctx, lay, text, c) {
  const { x, y, fs, s } = lay;
  tag(ctx, text, x + 8 * s, y + 8 * s, { c, fs: Math.round(fs * 1.15), s, align: 'left', weight: 600 });
}
function stampBox(ctx, lay, text) {
  const { x, y, fs, s } = lay;
  const sfs = Math.round(fs * 1.15);
  ctx.font = font(sfs, 600);
  return { x0: x + 8 * s, x1: x + 8 * s + ctx.measureText(text).width + 10 * s, y0: y + 8 * s, y1: y + 8 * s + sfs + 8 * s };
}

// ── Spektrs ───────────────────────────────────────────────
// d: { cols, thr, hasData, win:{top,bottom}, lut, colors, loud:{f,db,label}, f0:{f,label}, recLo, recHi, cursor:{u,label}, paused, labels }
export function drawSpectrum(ctx, lay, d) {
  const { x, y, w, h, fs, s } = lay;
  const c = d.colors;
  const x1 = x + w;
  const y1 = y + h;
  const { top, bottom } = d.win;
  const xOf = (f) => x + logPos(f) * w;
  const yOf = (v) => y + Math.max(0, Math.min(1, (top - v) / (top - bottom))) * h;
  ctx.clearRect(0, 0, lay.W, lay.H);

  // režģis: ik pa 10 dB un pie galvenajām frekvencēm
  ctx.lineWidth = 1;
  ctx.strokeStyle = c.hairline;
  ctx.beginPath();
  for (let v = Math.ceil(bottom / 10) * 10; v <= top; v += 10) { const yy = Math.round(yOf(v)) + 0.5; ctx.moveTo(x, yy); ctx.lineTo(x1, yy); }
  for (const f of TICKS_MAJOR) { const xx = Math.round(xOf(f)) + 0.5; ctx.moveTo(xx, y); ctx.lineTo(xx, y1); }
  ctx.stroke();

  // spektrs: krāsains laukums zem līknes un līkne tintē
  const n = d.cols ? d.cols.length : 0;
  let thrY = null;
  if (d.hasData && n) {
    const px = (i) => x + ((i + 0.5) / n) * w;
    ctx.beginPath();
    ctx.moveTo(x, y1);
    for (let i = 0; i < n; i++) ctx.lineTo(px(i), yOf(d.cols[i]));
    ctx.lineTo(x1, y1);
    ctx.closePath();
    ctx.fillStyle = spectrumGradient(ctx, x, x1, d.lut.css);
    ctx.fill();
    ctx.beginPath();
    for (let i = 0; i < n; i++) (i ? ctx.lineTo(px(i), yOf(d.cols[i])) : ctx.moveTo(px(i), yOf(d.cols[i])));
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 2 * s;
    ctx.lineJoin = 'round';
    ctx.stroke();
    // slieksnis
    if (d.thr) {
      const m = d.thr.length;
      const pts = [];
      for (let i = 0; i < m; i++) pts.push([x + ((i + 0.5) / m) * w, yOf(d.thr[i])]);
      haloLine(ctx, pts, { c, s, dash: [6, 5], width: 1.5 });
      thrY = pts[m - 1][1]; // uzrakstu liek pēc rekordu rāmīšiem, lai tie to neaizsedz
    }
  }

  // asis, iedaļas, uzraksti
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 0.5, y);
  ctx.lineTo(x + 0.5, y1 + 0.5);
  ctx.lineTo(x1, y1 + 0.5);
  for (const f of TICKS_MINOR) { const xx = Math.round(xOf(f)) + 0.5; ctx.moveTo(xx, y1); ctx.lineTo(xx, y1 + 4 * s); }
  for (const f of TICKS_MAJOR) { const xx = Math.round(xOf(f)) + 0.5; ctx.moveTo(xx, y1); ctx.lineTo(xx, y1 + 7 * s); }
  for (let v = Math.ceil(bottom / 20) * 20; v <= top; v += 20) { const yy = Math.round(yOf(v)) + 0.5; ctx.moveTo(x - 5 * s, yy); ctx.lineTo(x, yy); }
  ctx.stroke();
  ctx.fillStyle = c.ink;
  ctx.font = font(fs);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let v = Math.ceil(bottom / 20) * 20; v <= top; v += 20) ctx.fillText(signed(v), x - 8 * s, yOf(v));
  ctx.textBaseline = 'bottom';
  ctx.fillText('dB', x - 8 * s, y - 6 * s);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const f of majorTicksFor(w)) ctx.fillText(tickLabel(f), xOf(f), y1 + 9 * s);
  ctx.textAlign = 'right';
  ctx.fillText('Hz', x1, y1 + 11 * s + fs);

  // rekordi: raustīta vertikāle, uzraksts rāmītī grafika apakšā (ZEMĀKĀ pa kreisi, AUGSTĀKĀ pa labi no līnijas);
  // augša paliek virsotņu uzrakstiem
  const recBoxes = [];
  for (const [f, text, side] of [[d.recLo, d.labels.lo, -1], [d.recHi, d.labels.hi, 1]]) {
    if (!f) continue;
    const xx = Math.round(xOf(f)) + 0.5;
    haloLine(ctx, [[xx, y], [xx, y1]], { c, s, dash: [2, 4], width: 1.2 });
    ctx.font = font(fs, 500);
    const bw = ctx.measureText(text).width + 10 * s;
    let right = side > 0;
    if (!right && xx - 4 * s - bw < x) right = true;
    if (right && xx + 4 * s + bw > x1) right = false;
    const bx = right ? xx + 4 * s : xx - 4 * s - bw;
    tag(ctx, text, right ? xx + 4 * s : xx - 4 * s, y1 - fs - 14 * s, { c, fs, s, align: right ? 'left' : 'right' });
    recBoxes.push({ x0: bx, x1: bx + bw, y0: y1 - fs - 14 * s, y1: y1 - 6 * s });
  }
  // sliekšņa uzraksts labajā malā virs līnijas; ja tur ir rekorda rāmītis (slieksnis pie apakšas) — virs rāmīša
  if (thrY !== null) {
    const tfs = Math.round(fs * 0.9);
    ctx.font = font(tfs, 400);
    const tw = ctx.measureText(d.labels.threshold).width + 10 * s;
    const th = tfs + 8 * s;
    let ty = Math.max(y + 4 * s, thrY - tfs - 14 * s);
    for (const r of recBoxes) {
      if (r.x1 > x1 - 4 * s - tw - 4 * s && r.x0 < x1 && ty + th > r.y0 - 4 * s && ty < r.y1) ty = Math.max(y + 4 * s, r.y0 - th - 6 * s);
    }
    tag(ctx, d.labels.threshold, x1 - 4 * s, ty, { c, fs: tfs, s, align: 'right', weight: 400 });
  }

  // skaļākā virsotne ▲ (akcents) un pamattonis ✱ (tinte); ja sakrīt — abas zīmes vienā vietā, uzraksts vienreiz.
  // Uzraksts virs zīmes; ja augšā nav vietas (virsotne pie grafika augšas) — blakus zīmei.
  if (d.hasData && n) {
    const colAt = (f) => d.cols[Math.max(0, Math.min(n - 1, Math.floor(logPos(f) * n)))];
    const same = d.loud && d.f0 && Math.abs(d.loud.f / d.f0.f - 1) < 0.03;
    const placed = []; // aizņemtie taisnstūri { x0, x1, y0, y1 }
    if (d.paused) placed.push(stampBox(ctx, lay, d.labels.paused)); // PAUZE rāmītis — uzraksti to apiet
    const labelAt = (text, mx, my, weight) => { // my — zīmes augšējā mala
      ctx.font = font(fs, weight);
      ctx.fillStyle = c.ink;
      const tw = ctx.measureText(text).width;
      let lx = Math.max(x + tw / 2, Math.min(x1 - tw / 2, mx));
      let ly = my - 3 * s; // apakšējā mala
      const hit = () => placed.some((p) => lx - tw / 2 < p.x1 + 6 * s && lx + tw / 2 > p.x0 - 6 * s && ly - fs < p.y1 + 2 * s && ly > p.y0 - 2 * s);
      if (ly - fs < 2 || hit()) {
        const toRight = mx + 12 * s + tw <= x1;
        lx = toRight ? mx + 12 * s + tw / 2 : mx - 12 * s - tw / 2;
        ly = Math.max(fs + 2, my + 12 * s + fs / 2);
        if (hit()) ly += fs * 1.3;
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(text, lx, ly);
      placed.push({ x0: lx - tw / 2, x1: lx + tw / 2, y0: ly - fs, y1: ly });
    };
    if (d.loud) {
      const lx = xOf(d.loud.f);
      const ly = Math.max(y + 12 * s, yOf(Math.max(d.loud.db, colAt(d.loud.f))) - 3 * s);
      ctx.fillStyle = c.accent;
      ctx.beginPath();
      ctx.moveTo(lx - 6 * s, ly);
      ctx.lineTo(lx + 6 * s, ly);
      ctx.lineTo(lx, ly - 10 * s);
      ctx.closePath();
      ctx.fill();
      if (same) {
        asterisk(ctx, lx, ly - 19 * s, 6 * s, { c, s });
        labelAt(d.f0.label, lx, ly - 25 * s, 600);
      } else labelAt(d.loud.label, lx, ly - 10 * s, 400);
    }
    if (d.f0 && !same) {
      const fx = xOf(d.f0.f);
      // trūkstošs pamattonis (līkne pie apakšas) — zvaigznīte virs rekordu rāmīšu joslas
      const fy = Math.max(y + 8 * s, Math.min(yOf(colAt(d.f0.f)) - 12 * s, y1 - 2 * fs - 30 * s));
      asterisk(ctx, fx, fy, 6 * s, { c, s });
      labelAt(d.f0.label, fx, fy - 6 * s, 600);
    }
  }

  if (d.cursor) cursorV(ctx, lay, d.cursor, c);
  if (d.paused) pausedStamp(ctx, lay, d.labels.paused, c);
}

function cursorV(ctx, lay, cur, c) {
  const { x, y, w, h, fs, s } = lay;
  const xx = Math.round(x + cur.u * w) + 0.5;
  haloLine(ctx, [[xx, y], [xx, y + h]], { c, s, width: 1.2 });
  ctx.font = font(fs, 500);
  const tw = ctx.measureText(cur.label).width + 10 * s;
  const right = xx + 6 * s + tw <= x + w;
  tag(ctx, cur.label, right ? xx + 6 * s : xx - 6 * s, y + 8 * s + fs * 2.2, { c, fs, s, align: right ? 'left' : 'right' });
}

// ── Spektrogramma ─────────────────────────────────────────
// Vēsture: rows rindas (log frekvence, 0 = 20 Hz), RATE kolonnas sekundē. Glabā dB, krāso zīmējot (JUTĪBA un tēma uzreiz).
// ĀTRUMS (5–60 s ekrānā): četri gredzeni pa cols kolonnām — katrs k-tais pēc kārtas (k = 1, 2, 3, 6) glabā k kolonnu maksimumu,
// tātad 10, 20, 30 un 60 s; 5 s — pirmā pēdējā puse. Pārslēdzot ātrumu, ierakstītais uzreiz redzams, zīmējums vienmēr ≤ cols × rows.
export const GRAM_RATE = 60;
const FACTORS = [1, 2, 3, 6];
export function createHistory(cols = 600, rows = 320) {
  const rings = FACTORS.map((k) => ({ k, data: new Float32Array(cols * rows).fill(DB_FLOOR), head: 0, acc: new Float32Array(rows).fill(DB_FLOOR), n: 0 }));
  let ver = 0;
  let canvas = null;
  let img = null;
  let key = '';
  let lastLut = null;
  const pick = (seconds) => {
    const k = Math.max(1, Math.round(seconds / 10));
    const ring = rings.find((r) => r.k === k) || rings[0];
    return { ring, n: Math.max(1, Math.min(cols, Math.round((seconds * GRAM_RATE) / ring.k))) };
  };
  return {
    cols,
    rows,
    rate: GRAM_RATE,
    push(col) {
      for (const r of rings) {
        if (r.k === 1) {
          r.data.set(col, r.head * rows);
          r.head = (r.head + 1) % cols;
          continue;
        }
        const a = r.acc;
        for (let i = 0; i < rows; i++) if (col[i] > a[i]) a[i] = col[i];
        if (++r.n >= r.k) {
          r.data.set(a, r.head * rows);
          r.head = (r.head + 1) % cols;
          a.fill(DB_FLOOR);
          r.n = 0;
        }
      }
      ver++;
    },
    clear() {
      for (const r of rings) { r.data.fill(DB_FLOOR); r.acc.fill(DB_FLOOR); r.n = 0; }
      ver++;
    },
    // xx-tā redzamā kolonna (0 — vecākā) — testiem
    column(seconds, xx) {
      const { ring, n } = pick(seconds);
      const col = (ring.head - n + xx + cols) % cols;
      return ring.data.subarray(col * rows, (col + 1) * rows);
    },
    visible(seconds) { return pick(seconds).n; },
    image(lutRGB, win, fieldRGB, seconds = 10) {
      const { ring, n } = pick(seconds);
      if (!canvas || canvas.width !== n) {
        canvas = canvas || document.createElement('canvas');
        canvas.width = n;
        canvas.height = rows;
        img = canvas.getContext('2d').createImageData(n, rows);
        key = '';
      }
      const k = `${ver}|${seconds}|${win.top}|${fieldRGB.join(',')}`;
      if (k === key && lastLut === lutRGB) return canvas;
      key = k;
      lastLut = lutRGB;
      const data = ring.data;
      const first = ring.head - n + cols;
      const px = img.data;
      const nL = lutRGB.length;
      const span = win.top - win.bottom;
      const [fr, fg, fb] = fieldRGB;
      for (let yy = 0; yy < rows; yy++) {
        const r = rows - 1 - yy;
        const [cr, cg, cb] = lutRGB[Math.min(nL - 1, Math.floor(((r + 0.5) / rows) * nL))];
        let o = yy * n * 4;
        for (let xx = 0; xx < n; xx++) {
          const col = (first + xx) % cols;
          let b = (data[col * rows + r] - win.bottom) / span;
          b = b < 0 ? 0 : b > 1 ? 1 : b;
          px[o] = fr + (cr - fr) * b;
          px[o + 1] = fg + (cg - fg) * b;
          px[o + 2] = fb + (cb - fb) * b;
          px[o + 3] = 255;
          o += 4;
        }
      }
      canvas.getContext('2d').putImageData(img, 0, 0);
      return canvas;
    },
  };
}

// Laika ass: [uzrakstu solis platā grafikā, īso iedaļu solis] sekundēs; šaurā grafikā uzraksti −T, −T/2, 0
const TIME_AXIS = { 5: [1, 0.5], 10: [2, 1], 20: [5, 1], 30: [5, 1], 60: [10, 5] };

export function drawSpectrogram(ctx, lay, d) {
  const { x, y, w, h, fs, s } = lay;
  const c = d.colors;
  const x1 = x + w;
  const y1 = y + h;
  const yOf = (f) => y1 - logPos(f) * h;
  ctx.clearRect(0, 0, lay.W, lay.H);
  if (d.hasData && d.image) {
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(d.image, x, y, w, h);
  }
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 0.5, y);
  ctx.lineTo(x + 0.5, y1 + 0.5);
  ctx.lineTo(x1, y1 + 0.5);
  for (const f of TICKS_MINOR) { const yy = Math.round(yOf(f)) + 0.5; ctx.moveTo(x - 4 * s, yy); ctx.lineTo(x, yy); }
  for (const f of TICKS_MAJOR) { const yy = Math.round(yOf(f)) + 0.5; ctx.moveTo(x - 7 * s, yy); ctx.lineTo(x, yy); }
  const T = d.seconds || 10;
  const [lStep, mStep] = TIME_AXIS[T] || [T / 5, T / 10];
  const wide = w >= 420;
  const labelAt = wide ? (t) => Math.abs(t / lStep - Math.round(t / lStep)) < 1e-6 : (t) => t === -T || t === 0 || t === -T / 2;
  const nTicks = Math.round(T / mStep);
  for (let i = 0; i <= nTicks; i++) {
    const t = -T + i * mStep;
    const xx = Math.round(x1 + (t / T) * w) + 0.5;
    ctx.moveTo(xx, y1);
    ctx.lineTo(xx, y1 + (labelAt(t) ? 7 : 4) * s);
  }
  ctx.stroke();
  ctx.fillStyle = c.ink;
  ctx.font = font(fs);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const fTicks = majorTicksFor(h * 1.6).filter((f) => f < 20000);
  for (const f of fTicks) ctx.fillText(tickLabel(f), x - 9 * s, yOf(f));
  ctx.textBaseline = 'bottom';
  ctx.fillText('Hz', x - 8 * s, y - 6 * s);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const tLabels = [];
  for (let i = 0; i <= nTicks; i++) { const t = -T + i * mStep; if (labelAt(t)) tLabels.push(t); }
  const num = d.formatTime || ((t) => signed(t));
  for (const t of tLabels) {
    const xx = x1 + (t / T) * w;
    ctx.textAlign = t === 0 ? 'right' : t === -T ? 'left' : 'center';
    ctx.fillText(`${num(t)} s`, t === 0 ? xx + 2 : xx, y1 + 9 * s);
  }
  // rekordi: ZEMĀKĀ rāmītis zem savas līnijas, AUGSTĀKĀ — virs (nepārklājas arī tad, ja abi vienādi)
  for (const [f, text, below] of [[d.recLo, d.labels.lo, true], [d.recHi, d.labels.hi, false]]) {
    if (!f) continue;
    const yy = Math.round(yOf(f)) + 0.5;
    haloLine(ctx, [[x, yy], [x1, yy]], { c, s, dash: [2, 4], width: 1.2 });
    tag(ctx, text, x1 - 4 * s, below ? yy + 4 * s : yy - fs - 12 * s, { c, fs, s, align: 'right' });
  }
  if (d.cursor) {
    const yy = Math.round(y1 - d.cursor.u * h) + 0.5;
    haloLine(ctx, [[x, yy], [x1, yy]], { c, s, width: 1.2 });
    const above = yy - fs - 14 * s > y;
    tag(ctx, d.cursor.label, x + 6 * s, above ? yy - fs - 12 * s : yy + 6 * s, { c, fs, s });
  }
  if (d.paused) pausedStamp(ctx, lay, d.labels.paused, c);
}

// Slīdošais vidējais (sliekšņa līnijai, lai tā nav robaina)
export function smooth(src, out, half) {
  const n = src.length;
  for (let i = 0; i < n; i++) {
    let sum = 0;
    let k = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(n - 1, i + half); j++) { sum += src[j]; k++; }
    out[i] = sum / k;
  }
  return out;
}
