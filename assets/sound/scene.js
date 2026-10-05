// assets/sound/scene.js
// Zīmē osciloskopu rasējuma stilā: tīkls matu līnijās, nulles līnija, līknes tintē (A — nepārtraukta, B — raustīta, summa — biezāka),
// spektrs kā stabiņi (aktīvais — akcenta krāsā), vektoru diagramma. Krāsas — no tēmas; akcents tikai tam, ko pašlaik aiztiek.
import { WAVE_FN, TAU, NH, WAVE_WINDOW_S, MIN_PX_PERIOD, waveDrawLimit, harmonicOf, harmonicTerms, sumSeries, peakOf, spectrumLayout } from './model.js';

const MONO = '"IBM Plex Mono", ui-monospace, monospace';
const font = (px, k = 1, w = 400) => `${w} ${px * k}px ${MONO}`;
const PAD_L = 40; // px — vieta y uzrakstiem
const PAD_R = 12;
const PAD_T = 22; // virsraksta rinda
const PAD_B = 22; // x uzrakstu rinda
const GAP = 18; // px starp laukumiem

function text(ctx, str, x, y, { f, color, align = 'left', base = 'alphabetic', alpha = 1, spacing = 0 }) {
  ctx.font = f;
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.textAlign = align;
  ctx.textBaseline = base;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`;
  ctx.fillText(str, x, y);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.globalAlpha = 1;
}
function line(ctx, x1, y1, x2, y2, color, width = 1, dash = []) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
}
// Laukuma virsraksts rasējuma stilā (kā paneļu virsraksti): mazi lielburti ar atstatumu
function heading(ctx, str, x, y, c, k, align = 'left') {
  text(ctx, str, x, y, { f: font(9.5, k, 500), color: c.inkDim, align, spacing: 1.3 * k });
}

// Osciloskopa laukums. o: { yMax, yt: [...], xt: [{ x: 0…1, l }], traces: [{ fn(x 0…1), color, w, dash, alpha }], title, legend }
function scope(ctx, box, o, c, k) {
  const pl = box.x + PAD_L * k;
  const pt = box.y + PAD_T * k;
  const w = box.x + box.w - PAD_R - pl;
  const h = box.y + box.h - PAD_B * k - pt;
  if (w < 20 || h < 20) return;
  const y0 = pt + h / 2;
  const ym = o.yMax || 1.25;
  const Y = (v) => y0 - (v / ym) * (h / 2);
  if (o.title) heading(ctx, o.title, pl, box.y + 11 * k, c, k);
  if (o.legend) heading(ctx, o.legend, pl + w, box.y + 11 * k, c, k, 'right');
  // tīkls
  (o.yt || [-1, 0, 1]).forEach((v) => {
    const y = Math.round(Y(v)) + 0.5;
    line(ctx, pl, y, pl + w, y, c.hairline);
    text(ctx, `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}`, pl - 7, y, { f: font(10, k), color: c.inkDim, align: 'right', base: 'middle' });
  });
  (o.xt || []).forEach((tk, i, arr) => {
    const x = Math.round(pl + tk.x * w) + 0.5;
    line(ctx, x, pt, x, pt + h, c.hairline);
    text(ctx, tk.l, x, pt + h + 7 * k, { f: font(10, k), color: c.inkDim, align: i === 0 ? 'left' : i === arr.length - 1 ? 'right' : 'center', base: 'top' });
  });
  line(ctx, pl, Math.round(y0) + 0.5, pl + w, Math.round(y0) + 0.5, c.inkDim);
  // līknes
  ctx.save();
  ctx.beginPath();
  ctx.rect(pl, pt - 1, w, h + 2);
  ctx.clip();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const N = Math.max(240, Math.ceil(w * 1.5));
  o.traces.forEach((tr) => {
    ctx.beginPath();
    ctx.strokeStyle = tr.color;
    ctx.lineWidth = tr.w || 1.5;
    ctx.setLineDash(tr.dash || []);
    ctx.globalAlpha = tr.alpha == null ? 1 : tr.alpha;
    for (let i = 0; i <= N; i++) {
      const x = i / N;
      const y = Y(tr.fn(x));
      if (i) ctx.lineTo(pl + x * w, y); else ctx.moveTo(pl + x * w, y);
    }
    ctx.stroke();
  });
  ctx.restore();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  // pārklājums: līkne šajā frekvencē nav zīmējama — pelēks lauks ar robežu (Ansis 05.10)
  if (o.overlay) {
    ctx.fillStyle = c.sheet;
    ctx.globalAlpha = 0.72;
    ctx.fillRect(pl, pt, w, h);
    ctx.globalAlpha = 1;
    const lines = o.overlay.split('\n');
    ctx.font = `400 ${12.5 * k}px "IBM Plex Sans", system-ui, sans-serif`;
    lines.forEach((ln, i) => text(ctx, ln, pl + w / 2, y0 + (i - (lines.length - 1) / 2) * 18 * k, { f: ctx.font, color: c.ink, align: 'center', base: 'middle' }));
  }
}
const XT2 = [{ x: 0, l: '0' }, { x: 0.25, l: '½T' }, { x: 0.5, l: 'T' }, { x: 0.75, l: '1½T' }, { x: 1, l: '2T' }];

// Spektrs: 12 stabiņi. amps[i] — 0…1 (|amp|), on[i] — ieslēgts. active — n, kuru aiztiek (akcents). Atdod stabiņu ģeometriju.
function spectrum(ctx, box, { amps, on, active, title, note, interactive, f, lang }, c, k) {
  const pl = box.x + PAD_L * k;
  const inner = { x: pl, y: box.y + PAD_T * k, w: box.x + box.w - PAD_R - pl, h: box.h - PAD_T * k };
  if (inner.w < 20 || inner.h < 20) return [];
  if (title) heading(ctx, title, pl, box.y + 11 * k, c, k);
  const bars = spectrumLayout(inner, { labelH: 16 * k, top: 6 * k });
  const base = Math.round(bars[0].baseline) + 0.5;
  line(ctx, inner.x, base, inner.x + inner.w, base, c.inkDim);
  text(ctx, '1', pl - 7, bars[0].baseline - bars[0].height, { f: font(10, k), color: c.inkDim, align: 'right', base: 'middle' });
  text(ctx, '0', pl - 7, bars[0].baseline, { f: font(10, k), color: c.inkDim, align: 'right', base: 'middle' });
  line(ctx, inner.x, Math.round(bars[0].baseline - bars[0].height) + 0.5, inner.x + inner.w, Math.round(bars[0].baseline - bars[0].height) + 0.5, c.hairline);
  bars.forEach((b, i) => {
    const isOn = on[i];
    const hot = active === b.n;
    const hgt = Math.max(0, amps[i]) * b.height;
    const color = hot ? c.accent : isOn ? c.ink : c.inkDim;
    if (hgt > 0.5) {
      if (isOn) {
        ctx.fillStyle = color;
        ctx.globalAlpha = 1;
        ctx.fillRect(Math.round(b.x), Math.round(b.baseline - hgt), Math.round(b.w), Math.round(hgt));
      } else {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(Math.round(b.x) + 0.5, Math.round(b.baseline - hgt) + 0.5, Math.round(b.w) - 1, Math.round(hgt) - 1);
        ctx.setLineDash([]);
      }
    } else if (!interactive) {
      ctx.fillStyle = c.inkDim; // nulle: tikai īsa atzīme uz pamatnes
      ctx.fillRect(Math.round(b.x), Math.round(b.baseline) - 2, Math.round(b.w), 2);
    }
    text(ctx, String(b.n), b.x + b.w / 2, b.baseline + 4 * k, { f: font(10, k, hot ? 500 : 400), color: hot ? c.accent : isOn ? c.ink : c.inkDim, align: 'center', base: 'top' });
  });
  if (note) heading(ctx, note, inner.x + inner.w, box.y + 11 * k, c, k, 'right');
  return bars;
}

// Vektoru diagramma divu avotu summai: A nepārtraukts, B raustīts no A gala, A + B biezs no sākuma
function phasor(ctx, box, { a, b, phi }, c, k, t) {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const u = Math.min(box.w, box.h) / 2 / 2.3;
  ctx.lineWidth = 1;
  [1, 2].forEach((r) => {
    ctx.strokeStyle = c.hairline;
    ctx.beginPath();
    ctx.arc(cx, cy, r * u, 0, TAU);
    ctx.stroke();
  });
  line(ctx, cx - 2.15 * u, cy, cx + 2.15 * u, cy, c.hairline);
  line(ctx, cx, cy - 2.15 * u, cx, cy + 2.15 * u, c.hairline);
  const arrow = (x1, y1, x2, y2, col, lw, dash) => {
    const L = Math.hypot(x2 - x1, y2 - y1);
    if (L < 1.5) return;
    const an = Math.atan2(y2 - y1, x2 - x1);
    const hd = Math.min(8, L * 0.6);
    line(ctx, x1, y1, x2 - Math.cos(an) * hd * 0.7, y2 - Math.sin(an) * hd * 0.7, col, lw, dash);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - hd * Math.cos(an - 0.45), y2 - hd * Math.sin(an - 0.45));
    ctx.lineTo(x2 - hd * Math.cos(an + 0.45), y2 - hd * Math.sin(an + 0.45));
    ctx.closePath();
    ctx.fill();
  };
  const ax = cx + a * u;
  const ay = cy;
  const bx = ax + b * u * Math.cos(phi);
  const by = ay - b * u * Math.sin(phi);
  arrow(cx, cy, bx, by, c.ink, 2.5);
  arrow(cx, cy, ax, ay, c.ink, 1.25);
  arrow(ax, ay, bx, by, c.ink, 1.25, [4, 3]);
  const f = font(10, k, 500);
  if (a > 0.05) text(ctx, 'A', (cx + ax) / 2, ay + 12 * k, { f, color: c.inkDim, align: 'center' });
  if (b > 0.05) text(ctx, 'B', (ax + bx) / 2 + 8 * k, (ay + by) / 2, { f, color: c.inkDim, align: 'left', base: 'middle' });
  if (Math.hypot(bx - cx, by - cy) > 4) text(ctx, t('rel.R'), bx + 6 * k, by - 6 * k, { f, color: c.ink, align: 'left' });
}

// Galvenā funkcija. lay: { box } (px). m: { settings, colors, legend (k), lang, t, active (harmonikas n vai null) }.
// Atdod kontaktzonas: { bars, toHarm } — bars velkami (HARMONIKAS), toHarm — spektra laukums VIĻŅA FORMĀ (poga virs tā ir DOM).
export function drawScene(ctx, lay, m) {
  const { settings: s, colors: c, legend: k, t } = m;
  const { box } = lay;
  ctx.clearRect(0, 0, lay.w, lay.h);
  if (box.w < 60 || box.h < 60) return { bars: [], toHarm: null };
  const res = { bars: [], toHarm: null };

  if (s.view === 'wave') {
    const specH = Math.max(90 * k, Math.min(150 * k, box.h * 0.32));
    const top = { x: box.x, y: box.y, w: box.w, h: box.h - specH - GAP };
    const bottom = { x: box.x, y: box.y + box.h - specH, w: box.w, h: specH };
    const fn = WAVE_FN[s.wave];
    const plotW = top.w - PAD_L * k - PAD_R;
    const limit = waveDrawLimit(plotW);
    const drawable = s.f <= limit;
    const fmt = (v) => (m.lang === 'lv' ? String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f') : String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ','));
    scope(ctx, top, {
      title: t('scene.window'), legend: t(`wave.${s.wave}`), yMax: 1.3,
      xt: [0, 5, 10, 15, 20].map((ms) => ({ x: ms / 20, l: `${ms} ms` })),
      traces: drawable ? [{ fn: (x) => fn(x * WAVE_WINDOW_S * s.f), color: c.ink, w: 2 }] : [],
      overlay: drawable ? null : t('scene.limit', { f: fmt(limit), px: MIN_PX_PERIOD }),
    }, c, k);
    res.limit = limit;
    const amps = Array.from({ length: NH }, (_, i) => Math.abs(harmonicOf(s.wave, i + 1)));
    spectrum(ctx, bottom, { amps, on: amps.map((a) => a > 0), active: null, title: t('scene.spectrum'), interactive: false }, c, k);
    res.toHarm = bottom;
    return res;
  }

  if (s.view === 'two') {
    const ph = (s.phi * Math.PI) / 180;
    const a = s.a.on ? s.a.amp : 0;
    const b = s.b.on ? s.b.amp : 0;
    const fa = (x) => a * Math.sin(TAU * 2 * x);
    const fb = (x) => b * Math.sin(TAU * 2 * x + ph);
    const phW = box.w >= 520 ? Math.min(box.w * 0.28, box.h * 0.5, 220 * k) : 0;
    const left = { x: box.x, y: box.y, w: box.w - (phW ? phW + GAP : 0), h: box.h };
    const h1 = (left.h - GAP) * 0.45;
    const opt = { yMax: 2.3, yt: [-2, -1, 0, 1, 2], xt: XT2 };
    const tr = [];
    if (s.a.on) tr.push({ fn: fa, color: c.ink, w: 1.75 });
    if (s.b.on) tr.push({ fn: fb, color: c.ink, w: 1.75, dash: [6, 4] });
    scope(ctx, { x: left.x, y: left.y, w: left.w, h: h1 }, { ...opt, title: t('scene.sources'), legend: `${t('scene.legendA')}   ${t('scene.legendB')}`, traces: tr }, c, k);
    scope(ctx, { x: left.x, y: left.y + h1 + GAP, w: left.w, h: left.h - h1 - GAP }, { ...opt, title: t('scene.sum'), traces: [{ fn: (x) => fa(x) + fb(x), color: c.ink, w: 2.75 }] }, c, k);
    if (phW) phasor(ctx, { x: box.x + box.w - phW, y: box.y + (box.h - phW) / 2, w: phW, h: phW }, { a, b, phi: ph }, c, k, t);
    return res;
  }

  // HARMONIKAS: summa augšā, velkams spektrs apakšā
  const specH = Math.max(120 * k, Math.min(220 * k, box.h * 0.42));
  const top = { x: box.x, y: box.y, w: box.w, h: box.h - specH - GAP };
  const bottom = { x: box.x, y: box.y + box.h - specH, w: box.w, h: specH };
  const terms = harmonicTerms(s.H);
  const sum = sumSeries(terms);
  const peak = peakOf(sum);
  const ym = Math.max(1.3, peak * 1.12);
  const step = ym < 2.6 ? 1 : ym < 5.2 ? 2 : ym < 10 ? 4 : 6;
  const yt = [0];
  for (let v = step; v < ym; v += step) yt.push(v, -v);
  const tr = [];
  if (s.overlay) {
    terms.forEach((h) => tr.push({ fn: (x) => h.v * Math.sin(TAU * 2 * h.n * x), color: h.n === m.active ? c.accent : c.inkDim, w: h.n === m.active ? 1.75 : 1, alpha: h.n === m.active ? 1 : 0.75 }));
  }
  tr.push({ fn: sum, color: c.ink, w: 2.75 });
  scope(ctx, top, { title: t('scene.harmSum'), yMax: ym, yt, xt: XT2, traces: tr }, c, k);
  let note = '';
  if (m.active) {
    const h = s.H[m.active - 1];
    const fn = s.f * m.active;
    const fTxt = fn >= 1000 ? `${(fn / 1000).toFixed(2).replace('.', m.lang === 'lv' ? ',' : '.')} kHz` : `${Math.round(fn)} Hz`;
    note = `${m.active === 1 ? t('scene.fund') : t('scene.harmN', { n: m.active })} · ${fTxt} · ${h.amp.toFixed(2).replace('.', m.lang === 'lv' ? ',' : '.')}`;
  }
  res.bars = spectrum(ctx, bottom, { amps: s.H.map((h) => h.amp), on: s.H.map((h) => h.on), active: m.active, title: t('scene.spectrum'), note, interactive: true }, c, k);
  return res;
}
