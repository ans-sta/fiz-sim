// assets/photo/scene.js — A-02 kanva: prožektors, vakuuma caurule ar plāksni un anodu, ķēdē ampērmetrs un baterija,
// fotoni, elektroni un enerģijas žogs (spec. § 2). Izkārtojums ir tīra funkcija no (w, h, fence, avoid).
import { hexRGB, ensureContrast } from '../spectrum/model.js';
import { photonRGB, packet } from '../atoms/scene.js';
import { VIS, photonJ, workJ, I_SCALE } from './model.js';
import { FLIGHT, HEAT, FENCE_PERIOD } from './sim.js';

const M = 16; // px — mala
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const rgbCss = ([r, g, b], a = 1) => (a >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`);
const invisible = (λ) => λ < VIS.min || λ > VIS.max;
export const E_MAX = 9e-19; // J — žoga skalas augša (der varam un 250 nm; īsākiem viļņiem stabiņš ar pārrāvumu)

// Plāksnes krāsa pēc metāla (dekoratīva; kontūru zīmē tinte)
const METAL_RGB = {
  dark: { Cs: [205, 182, 110], Na: [190, 196, 204], Zn: [150, 166, 182], Cu: [200, 124, 78] },
  light: { Cs: [196, 168, 84], Na: [176, 182, 190], Zn: [140, 156, 172], Cu: [190, 110, 62] },
};

// ── izkārtojums ───────────────────────────────────────────
// avoid — ⚙ poga kreisajā apakšas stūrī (kanvas koordinātās); žogs zem caurules sākas pa labi no tās
export function sceneLayout(w, h, { fence = false, avoid = null } = {}) {
  let tubeR;
  let fenceR = null;
  const side = fence && w >= 640 && w >= h * 1.15;
  if (fence && side) {
    const fw = Math.round(clamp(w * 0.36, 260, w * 0.46));
    tubeR = { x: M, y: M, w: w - fw - 3 * M, h: h - 2 * M };
    fenceR = { x: w - M - fw, y: M, w: fw, h: h - 2 * M };
  } else if (fence) {
    const fh = Math.round(clamp(h * 0.42, 120, h * 0.5));
    tubeR = { x: M, y: M, w: w - 2 * M, h: h - fh - 2.5 * M };
    const fx = avoid && avoid.y < h && avoid.x + avoid.w > 0 ? Math.max(M, Math.round(avoid.x + avoid.w + 8)) : M;
    fenceR = { x: fx, y: h - M - fh, w: w - M - fx, h: fh };
  } else {
    tubeR = { x: M, y: M, w: w - 2 * M, h: h - 2 * M };
  }
  return { w, h, side, tubeR, fenceR, ...tubeGeometry(tubeR) };
}

function tubeGeometry(R) {
  const lampH = clamp(R.h * 0.27, 36, 170);
  const meterR = Math.round(clamp(Math.min(R.w * 0.075, R.h * 0.12), 16, 64));
  const below = 2 * meterR + 20; // ampērmetrs zem caurules
  let th = Math.max(40, R.h - lampH - below);
  let tw = R.w * 0.94;
  th = Math.min(th, tw * 0.5);
  tw = Math.min(tw, th * 4.2);
  const tx = R.x + (R.w - tw) / 2;
  const ty = R.y + lampH + Math.max(0, (R.h - lampH - below - th) * 0.35);
  const tube = { x: tx, y: ty, w: tw, h: th };
  const pw = clamp(tw * 0.03, 10, 22);
  const plate = { x: tx + tw * 0.1, y: ty + th * 0.16, w: pw, h: th * 0.68 };
  const cw = clamp(tw * 0.018, 6, 12);
  const coll = { x: tx + tw * 0.9 - cw, y: plate.y, w: cw, h: plate.h };
  const face = plate.x + plate.w;
  const meter = { x: tx + tw / 2, y: ty + th + 10 + meterR, r: meterR };
  const proj = projector({ x: face + (coll.x - face) * 0.34, y: ty - lampH * 0.5 }, clamp(Math.min(lampH * 0.24, tw * 0.045), 9, 36), { x: face, y: plate.y + plate.h / 2 });
  return { tube, plate, coll, face, proj, meter };
}

// Prožektors: korpuss vērsts uz plāksnes vidu, priekšā lēca un divas atlokāmas klapes, kas ierobežo staru.
// Lokālās koordinātās u — pa asi uz plāksni, w — šķērsām; r — mērogs.
function projector(P, r, aim) {
  const ang = Math.atan2(aim.y - P.y, aim.x - P.x);
  const d = { x: Math.cos(ang), y: Math.sin(ang) };
  const n = { x: -d.y, y: d.x };
  const at = (u, w) => ({ x: P.x + d.x * u * r + n.x * w * r, y: P.y + d.y * u * r + n.y * w * r });
  const body = [at(-1.0, -0.62), at(0.75, -0.8), at(0.75, 0.8), at(-1.0, 0.62)];
  const back = [at(-1.25, -0.5), at(-1.0, -0.62), at(-1.0, 0.62), at(-1.25, 0.5)];
  const rim = [at(0.75, -0.9), at(0.98, -0.9), at(0.98, 0.9), at(0.75, 0.9)];
  const lens = [at(0.98, -0.8), at(0.98, 0.8)];
  const F = at(0.98, 0); // lēcas centrs — no šejienes izlido fotoni
  const pts = [...body, ...back, ...rim];
  const box = {
    x0: Math.min(...pts.map((q) => q.x)), x1: Math.max(...pts.map((q) => q.x)),
    y0: Math.min(...pts.map((q) => q.y)), y1: Math.max(...pts.map((q) => q.y)),
  };
  return { P, r, ang, d, n, at, body, back, rim, lens, F, box };
}

// Fotona ceļš: no prožektora lēcas centra līdz plāksnes priekšai (y 0…1)
export function photonPath(lay, p) {
  const { proj, plate, face } = lay;
  const S = proj.F;
  const E = { x: face + 1, y: plate.y + plate.h * p.y };
  return { S, E };
}

// ── zīmēšana ──────────────────────────────────────────────
// v: { st (sim.state), ev, needle, legend, theme, colors, labels, fmt }
export function drawScene(ctx, lay, v) {
  const c = v.colors;
  const dark = v.theme === 'dark';
  const field = hexRGB(c.field);
  const L = v.legend;
  const font = (px, weight = 400) => `${weight} ${Math.round(px * L)}px 'IBM Plex Mono', ui-monospace, monospace`;
  const k = { c, dark, field, L, font };
  ctx.clearRect(0, 0, lay.w, lay.h);
  ctx.fillStyle = c.field;
  ctx.fillRect(0, 0, lay.w, lay.h);

  drawBeam(ctx, lay, v, k);
  drawTube(ctx, lay, v, k);
  drawHeats(ctx, lay, v, k);
  drawPhotons(ctx, lay, v, k);
  drawElectrons(ctx, lay, v, k);
  drawProjector(ctx, lay, v, k);
  drawMeter(ctx, lay, v, k);
  if (lay.fenceR) drawFence(ctx, lay.fenceR, v, k);
}

function beamRGB(λ, k) {
  return photonRGB(λ, k.field, k.dark);
}

// Stara malas: no lēcas malām līdz plāksnes augšai un apakšai (a1 → b1 un a2 → b2 nekrustojas)
function beamEdges(lay) {
  const { proj, plate, face } = lay;
  const b1 = { x: face, y: plate.y + plate.h * 0.08 };
  const b2 = { x: face, y: plate.y + plate.h * 0.92 };
  let [a1, a2] = proj.lens;
  if (Math.hypot(a1.x - b1.x, a1.y - b1.y) > Math.hypot(a2.x - b1.x, a2.y - b1.y)) [a1, a2] = [a2, a1];
  return { a1, a2, b1, b2 };
}

function drawBeam(ctx, lay, v, k) {
  const st = v.st;
  if (!st.on || st.intensity <= 0) return;
  const { a1, a2, b1, b2 } = beamEdges(lay);
  ctx.beginPath();
  ctx.moveTo(a1.x, a1.y);
  ctx.lineTo(a2.x, a2.y);
  ctx.lineTo(b2.x, b2.y);
  ctx.lineTo(b1.x, b1.y);
  ctx.closePath();
  if (invisible(st.lambda)) {
    // acs neredz: tikai raustīta kontūra
    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = rgbCss(beamRGB(st.lambda, k), 0.7);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    ctx.fillStyle = rgbCss(beamRGB(st.lambda, k), 0.05 + 0.13 * (st.intensity / 100));
    ctx.fill();
  }
}

function drawTube(ctx, lay, v, k) {
  const { c, font, L, dark } = k;
  const { tube, plate, coll, meter } = lay;
  const st = v.st;
  // vadi: plāksne → ampērmetrs → baterija → anods
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const px = plate.x + plate.w / 2;
  const cx = coll.x + coll.w / 2;
  const bat = batteryGeometry(lay);
  ctx.moveTo(px, plate.y + plate.h);
  ctx.lineTo(px, meter.y);
  ctx.lineTo(meter.x - meter.r, meter.y);
  ctx.moveTo(meter.x + meter.r, meter.y);
  ctx.lineTo(bat.x - bat.gap / 2, meter.y);
  ctx.moveTo(bat.x + bat.gap / 2, meter.y);
  ctx.lineTo(cx, meter.y);
  ctx.lineTo(cx, coll.y + coll.h);
  ctx.stroke();
  drawBattery(ctx, lay, v, k, bat);
  // stikla caurule — dubulta kontūra
  const rr = Math.min(tube.h / 2, 36);
  ctx.strokeStyle = c.inkDim;
  ctx.lineWidth = 1;
  roundRect(ctx, tube.x, tube.y, tube.w, tube.h, rr);
  ctx.stroke();
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = 1.5;
  roundRect(ctx, tube.x - 3, tube.y - 3, tube.w + 6, tube.h + 6, rr + 3);
  ctx.stroke();
  // plāksne
  ctx.fillStyle = rgbCss(METAL_RGB[dark ? 'dark' : 'light'][st.metal]);
  ctx.fillRect(plate.x, plate.y, plate.w, plate.h);
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(plate.x, plate.y, plate.w, plate.h);
  // anods
  ctx.fillStyle = c.inkDim;
  ctx.fillRect(coll.x, coll.y, coll.w, coll.h);
  ctx.strokeRect(coll.x, coll.y, coll.w, coll.h);
  // uzraksti: plāksne (metāls) augšā pa kreisi, anods augšā pa labi, vakuums caurulē
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'left';
  ctx.fillStyle = c.inkDim;
  ctx.font = font(10);
  const ly = tube.y - 10;
  const room = lay.proj.box.x0 - 8 - tube.x; // līdz prožektoram
  ctx.fillText(v.labels.plate, tube.x, ly - 15 * L);
  ctx.fillStyle = c.ink;
  ctx.font = font(13, 600);
  const title = `${v.labels.metalTitle} · ${st.metal}`;
  shrinkToFit(ctx, ctx.measureText(title).width <= room ? title : v.labels.metalTitle, room);
  ctx.fillText(ctx.measureText(title).width <= room ? title : v.labels.metalTitle, tube.x, ly);
  ctx.textAlign = 'right';
  ctx.fillStyle = c.inkDim;
  ctx.font = font(10);
  ctx.fillText(v.labels.collector, coll.x + coll.w, ly);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(v.labels.vacuum, (lay.face + coll.x) / 2 + (coll.x - lay.face) * 0.12, tube.y + 6);
}

// Baterija ķēdē starp ampērmetru un anodu: garā tievā plāksnīte — “+”, īsā resnā — “−”.
// Anods + (paātrina): “+” anoda pusē; anods − (bremzē): otrādi.
function batteryGeometry(lay) {
  const { meter, coll } = lay;
  const cx = coll.x + coll.w / 2;
  const s = clamp(meter.r * 0.42, 7, 18);
  return { x: (meter.x + meter.r + cx) / 2, y: meter.y, s, gap: Math.max(6, s * 0.75) };
}

function drawBattery(ctx, lay, v, k, b) {
  const { c, font } = k;
  const plus = v.st.reverse ? -1 : 1; // +1: “+” plāksnīte pa labi (anoda pusē)
  const xl = b.x - b.gap / 2;
  const xr = b.x + b.gap / 2;
  const xPlus = plus > 0 ? xr : xl;
  const xMinus = plus > 0 ? xl : xr;
  ctx.strokeStyle = c.ink;
  ctx.lineCap = 'butt';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(xPlus, b.y - b.s * 1.1);
  ctx.lineTo(xPlus, b.y + b.s * 1.1);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(xMinus, b.y - b.s * 0.55);
  ctx.lineTo(xMinus, b.y + b.s * 0.55);
  ctx.stroke();
  ctx.fillStyle = c.ink;
  ctx.font = font(12, 600);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('+', xPlus + plus * 7, b.y - b.s * 1.1 - 2);
  ctx.fillText('−', xMinus - plus * 7, b.y - b.s * 1.1 - 2);
  ctx.textBaseline = 'top';
  ctx.font = font(11, 600);
  ctx.fillText(v.labels.voltage, b.x, b.y + b.s * 1.1 + 4);
}

function drawProjector(ctx, lay, v, k) {
  const { c, font } = k;
  const { proj } = lay;
  const st = v.st;
  const lit = st.on && st.intensity > 0;
  const poly = (pts) => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (const q of pts.slice(1)) ctx.lineTo(q.x, q.y);
    ctx.closePath();
  };
  ctx.strokeStyle = c.ink;
  // klapes: no lēcas malām pa stara malām (tās nosaka, kur stars krīt)
  const { a1, a2, b1, b2 } = beamEdges(lay);
  const flap = 0.9 * proj.r;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  for (const [a, b] of [[a1, b1], [a2, b2]]) {
    const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const e = { x: a.x + ((b.x - a.x) / L) * flap, y: a.y + ((b.y - a.y) / L) * flap };
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(e.x, e.y);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  // korpuss, aizmugure, priekšējais gredzens
  ctx.lineWidth = 1.5;
  ctx.fillStyle = c.sheet;
  for (const part of [proj.back, proj.body, proj.rim]) {
    poly(part);
    ctx.fill();
    ctx.stroke();
  }
  // dzesēšanas ribas
  ctx.lineWidth = 1;
  ctx.strokeStyle = c.inkDim;
  for (const u of [-0.7, -0.45, -0.2]) {
    const p1 = proj.at(u, -0.62 - (u + 1) * 0.1);
    const p2 = proj.at(u, 0.62 + (u + 1) * 0.1);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
  // lēca
  const [l1, l2] = proj.lens;
  ctx.lineCap = 'round';
  if (lit) {
    const col = beamRGB(st.lambda, k);
    if (invisible(st.lambda)) {
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = rgbCss(col);
    } else {
      ctx.strokeStyle = rgbCss(col, 0.45 + 0.55 * (st.intensity / 100));
    }
    ctx.lineWidth = 5;
  } else {
    ctx.strokeStyle = c.inkDim;
    ctx.lineWidth = 2;
  }
  ctx.beginPath();
  ctx.moveTo(l1.x, l1.y);
  ctx.lineTo(l2.x, l2.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineCap = 'butt';
  // šarnīrs
  ctx.fillStyle = c.sheet;
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(proj.P.x, proj.P.y, Math.max(2.5, proj.r * 0.16), 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // uzraksts pa labi: UV / IS — acs neredz; izslēgts
  let note = null;
  if (!st.on) note = v.labels.lampOff;
  else if (st.intensity <= 0) note = v.labels.dark;
  else if (invisible(st.lambda)) note = v.labels.invisible;
  if (note) {
    // teksts ≥ 4,5 : 1 pret lauku (fotona krāsa — tikai ≥ 3 : 1)
    ctx.fillStyle = invisible(st.lambda) && st.on && st.intensity > 0 ? rgbCss(ensureContrast(beamRGB(st.lambda, k), [k.field], 4.5, k.dark)) : c.inkDim;
    ctx.font = font(11, 600);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    // ja sadurtos ar “ANODS” (zema caurule), uzraksts augstāk — virs prožektora
    const x = proj.box.x1 + 10;
    const y = proj.P.y;
    const clash = y + 8 * k.L > lay.tube.y - 10 - 12 * k.L && x + ctx.measureText(note).width > lay.coll.x - 90 * k.L;
    ctx.fillText(note, clash ? proj.P.x + 8 : x, clash ? Math.max(lay.tubeR.y + 6 * k.L, proj.box.y0 - 10 * k.L) : y);
  }
}

function drawPhotons(ctx, lay, v, k) {
  const st = v.st;
  for (const p of st.photons) {
    const f = clamp((st.t - p.t0) / FLIGHT, 0, 1);
    const { S, E } = photonPath(lay, p);
    const x = S.x + (E.x - S.x) * f;
    const y = S.y + (E.y - S.y) * f;
    const ang = Math.atan2(E.y - S.y, E.x - S.x);
    packet(ctx, x, y, ang, p.λ, rgbCss(beamRGB(p.λ, k)), 1, 2);
  }
}

function drawHeats(ctx, lay, v, k) {
  const st = v.st;
  const col = k.dark ? [255, 106, 61] : [200, 60, 20];
  for (const h of st.heats) {
    const f = clamp((st.t - h.t0) / HEAT, 0, 1);
    const y = lay.plate.y + lay.plate.h * h.y;
    const g = ctx.createRadialGradient(lay.face, y, 0, lay.face, y, 8);
    g.addColorStop(0, rgbCss(col, 0.9 * (1 - f)));
    g.addColorStop(1, rgbCss(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(lay.face, y, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

export const electronRadius = (lay) => clamp(lay.tube.h * 0.032, 4.5, 8);

function electronDot(ctx, x, y, r, c) {
  ctx.fillStyle = c.accent;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = c.field;
  ctx.lineWidth = Math.max(1.2, r * 0.3);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.5, y);
  ctx.lineTo(x + r * 0.5, y);
  ctx.stroke();
}

function drawElectrons(ctx, lay, v, k) {
  const st = v.st;
  const r = electronRadius(lay);
  const x0 = lay.face + r;
  const x1 = lay.coll.x - r;
  for (const e of st.electrons) {
    electronDot(ctx, x0 + (x1 - x0) * clamp(e.x, 0, 1), lay.plate.y + lay.plate.h * e.y, r, k.c);
  }
}

// Ampērmetrs: skala augšējā lokā, rādītājs, cipari lieli (lasāmi no klases aizmugures)
function drawMeter(ctx, lay, v, k) {
  const { c, font } = k;
  const { meter } = lay;
  const { x, y, r } = meter;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = c.sheet;
  ctx.fill();
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const a0 = Math.PI * (200 / 180);
  const a1 = Math.PI * (340 / 180);
  const ang = (I) => a0 + (a1 - a0) * clamp(I / I_SCALE, 0, 1);
  const cy = y + r * 0.12;
  const rs = r * 0.78;
  ctx.strokeStyle = c.inkDim;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, cy, rs, a0, a1);
  ctx.stroke();
  for (let i = 0; i <= I_SCALE * 2 + 1e-9; i++) {
    const a = ang(i / 2);
    const len = i % 2 === 0 ? 6 : 3.5;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * rs, cy + Math.sin(a) * rs);
    ctx.lineTo(x + Math.cos(a) * (rs - len), cy + Math.sin(a) * (rs - len));
    ctx.stroke();
  }
  // rādītājs
  const a = ang(v.needle);
  ctx.strokeStyle = c.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, cy);
  ctx.lineTo(x + Math.cos(a) * (rs - 4), cy + Math.sin(a) * (rs - 4));
  ctx.stroke();
  ctx.fillStyle = c.ink;
  ctx.beginPath();
  ctx.arc(x, cy, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // cipari
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 ${Math.round(r * 0.36)}px 'IBM Plex Mono', ui-monospace, monospace`;
  ctx.fillText(v.labels.current, x, y + r * 0.55);
  ctx.fillStyle = c.inkDim;
  ctx.font = font(9);
  ctx.textBaseline = 'top';
  ctx.fillText('µA', x, y + r * 0.6);
}

// ── enerģijas žogs ────────────────────────────────────────
export function fenceGeometry(F, L = 1) {
  const titleH = 26 * L;
  const bottomH = 40 * L;
  const axisW = 30 * L;
  const P = { x: F.x + axisW + 10, y: F.y + titleH + 12, w: Math.max(40, F.w - axisW - 34), h: Math.max(40, F.h - titleH - bottomH - 18) };
  const fenceX = P.x + P.w * 0.5;
  const fenceW = clamp(P.w * 0.05, 10, 18);
  const barW = clamp(P.w * 0.07, 12, 24);
  const barX = P.x + P.w * 0.22 - barW / 2;
  return { P, fenceX, fenceW, barX, barW, yE: (E) => P.y + P.h * (1 - clamp(E, 0, E_MAX) / E_MAX) };
}

// Simbols ar apakšindeksu (Wₖ), kreisā mala x
function sym(ctx, base, sub, x, y, px, weight = 600) {
  ctx.font = `${weight} ${Math.round(px)}px 'IBM Plex Mono', ui-monospace, monospace`;
  ctx.fillText(base, x, y);
  if (!sub) return ctx.measureText(base).width;
  const bw = ctx.measureText(base).width;
  ctx.font = `${weight} ${Math.round(px * 0.7)}px 'IBM Plex Mono', ui-monospace, monospace`;
  ctx.fillText(sub, x + bw, y + px * 0.28);
  return bw + ctx.measureText(sub).width;
}

function arrowHead(ctx, x, y, dir, s = 5) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - s * 0.6, y - dir * s);
  ctx.lineTo(x + s * 0.6, y - dir * s);
  ctx.closePath();
  ctx.fill();
}

// Vertikāla izmēra līnija ar bultām no ya līdz yb (rasējuma stilā)
function dimLine(ctx, x, ya, yb, color) {
  const top = Math.min(ya, yb);
  const bot = Math.max(ya, yb);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x, bot);
  ctx.stroke();
  if (bot - top >= 12) {
    arrowHead(ctx, x, top, -1);
    arrowHead(ctx, x, bot, 1);
  }
  for (const yy of [top, bot]) {
    ctx.beginPath();
    ctx.moveTo(x - 5, yy);
    ctx.lineTo(x + 5, yy);
    ctx.stroke();
  }
}

const easeOut = (u) => 1 - Math.pow(1 - u, 3);
const easeIn = (u) => u * u;

function drawFence(ctx, F, v, k) {
  const { c, font, L } = k;
  const st = v.st;
  ctx.strokeStyle = c.hairline;
  ctx.lineWidth = 1;
  ctx.strokeRect(F.x + 0.5, F.y + 0.5, F.w - 1, F.h - 1);
  ctx.fillStyle = c.inkDim;
  ctx.font = font(10, 600);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(v.labels.fenceTitle, F.x + 10, F.y + 8);
  const G = fenceGeometry(F, L);
  const { P, fenceX, fenceW, barX, barW, yE } = G;
  if (v.ev) {
    ctx.fillStyle = c.ink;
    ctx.font = font(11, 600);
    ctx.textAlign = 'right';
    ctx.fillText(v.labels.formula, F.x + F.w - 10, F.y + 8);
  }
  const W = photonJ(st.lambda);
  const A = workJ(st.metal);
  const out = W > A;
  const yA = yE(A);
  const yW = yE(W);
  const y0 = yE(0);
  // ass: 0, 1, 2 … 9 (·10⁻¹⁹ J)
  ctx.strokeStyle = c.inkDim;
  ctx.fillStyle = c.inkDim;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(P.x, P.y);
  ctx.lineTo(P.x, y0);
  ctx.stroke();
  const stepE = P.h < 160 ? 3 : P.h < 260 ? 2 : 1;
  ctx.font = font(9);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let e = 0; e <= E_MAX / 1e-19 + 1e-9; e += stepE) {
    const y = yE(e * 1e-19);
    ctx.beginPath();
    ctx.moveTo(P.x - 4, y);
    ctx.lineTo(P.x, y);
    ctx.stroke();
    ctx.fillText(v.fmt(e, 0), P.x - 6, y);
  }
  // “10⁻¹⁹ J” virs ass: kāpinātājs mazāks un pacelts (fontā augšraksta cipari izklīst)
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  {
    const x0 = P.x - 22 * L;
    const yb = P.y - 6;
    ctx.font = font(9);
    ctx.fillText('10', x0, yb);
    const w10 = ctx.measureText('10').width;
    ctx.font = font(7);
    ctx.fillText('−19', x0 + w10, yb - 4 * L);
    const wE = ctx.measureText('−19').width;
    ctx.font = font(9);
    ctx.fillText(' J', x0 + w10 + wE, yb);
  }
  // A līmenis virs metāla (raustīts) — virs tā fotona stabiņa daļa kļūst par Wₖ
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(P.x, yA);
  ctx.lineTo(fenceX, yA);
  ctx.stroke();
  ctx.setLineDash([]);
  // grīda metālā
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(P.x, y0);
  ctx.lineTo(fenceX, y0);
  ctx.stroke();
  ctx.lineWidth = 1;
  for (let x = P.x + 4; x < fenceX; x += 7) {
    ctx.beginPath();
    ctx.moveTo(x, y0 + 1);
    ctx.lineTo(x - 5, y0 + 6);
    ctx.stroke();
  }
  // vakuuma pusē “zeme” A augstumā: miera stāvoklī izkļuvušam elektronam enerģija ir A, tāpēc Wₖ mēra no A (bedre, ne tikai žogs)
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(fenceX + fenceW, yA);
  ctx.lineTo(P.x + P.w, yA);
  ctx.stroke();
  ctx.lineWidth = 1;
  for (let x = fenceX + fenceW + 6; x < P.x + P.w; x += 7) {
    ctx.beginPath();
    ctx.moveTo(x, yA + 1);
    ctx.lineTo(x - 5, yA + 6);
    ctx.stroke();
  }
  // žogs — svītrots stabs no 0 līdz A
  ctx.fillStyle = c.sheet;
  ctx.fillRect(fenceX, yA, fenceW, y0 - yA);
  ctx.save();
  ctx.beginPath();
  ctx.rect(fenceX, yA, fenceW, y0 - yA);
  ctx.clip();
  ctx.strokeStyle = c.inkDim;
  for (let yy = yA - fenceW; yy < y0 + fenceW; yy += 5) {
    ctx.beginPath();
    ctx.moveTo(fenceX, yy + fenceW);
    ctx.lineTo(fenceX + fenceW, yy);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(fenceX, yA, fenceW, y0 - yA);
  // A — izmēra līnija pa kreisi no žoga
  const dimA = fenceX - 12;
  dimLine(ctx, dimA, y0, yA, c.ink);
  ctx.fillStyle = c.ink;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  sym(ctx, 'A', '', dimA - 8 - ctx.measureText('A').width, (y0 + yA) / 2, 15 * L);
  // fotona stabiņš W
  const col = beamRGB(st.lambda, k);
  ctx.textAlign = 'left';
  if (invisible(st.lambda)) {
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = rgbCss(col);
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, yW, barW, y0 - yW);
    ctx.setLineDash([]);
  } else {
    ctx.fillStyle = rgbCss(col, 0.85);
    ctx.fillRect(barX, yW, barW, y0 - yW);
  }
  if (W > E_MAX) {
    // stabiņš garāks par skalu: pārrāvums (lauka krāsas zigzags) tuvu augšai
    const yb = P.y + 10;
    ctx.strokeStyle = c.field;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(barX - 2, yb + 3);
    ctx.lineTo(barX + barW * 0.33, yb - 3);
    ctx.lineTo(barX + barW * 0.66, yb + 3);
    ctx.lineTo(barX + barW + 2, yb - 3);
    ctx.stroke();
  }
  ctx.fillStyle = c.ink;
  ctx.textBaseline = 'bottom';
  ctx.font = `600 ${Math.round(15 * L)}px 'IBM Plex Mono', ui-monospace, monospace`;
  const wW = ctx.measureText('W').width;
  sym(ctx, 'W', '', barX + barW / 2 - wW / 2, yW - 4, 15 * L);
  // Wₖ — izmēra līnija pa labi no žoga (tikai, ja W > A)
  const dimK = fenceX + fenceW + 16;
  if (out) {
    dimLine(ctx, dimK, yA, yW, c.accent);
    if (W > E_MAX) {
      // Wₖ garāka par skalu — tāds pats pārrāvums kā stabiņam
      const yb = P.y + 10;
      ctx.strokeStyle = c.field;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(dimK - 6, yb + 3);
      ctx.lineTo(dimK - 2, yb - 3);
      ctx.lineTo(dimK + 2, yb + 3);
      ctx.lineTo(dimK + 6, yb - 3);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    ctx.fillStyle = c.accent;
    ctx.textBaseline = 'middle';
    sym(ctx, 'W', 'k', dimK + 9, (yA + yW) / 2 - 3, 15 * L);
  }
  // apakšā: “metālā” | “vakuumā” un salīdzinājums
  ctx.fillStyle = c.inkDim;
  ctx.font = font(10);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(v.labels.fenceMetal, (P.x + fenceX) / 2, y0 + 9);
  ctx.fillText(v.labels.fenceVacuum, (fenceX + fenceW + P.x + P.w) / 2 + 10, yA + 9);
  ctx.fillStyle = out ? c.accent : c.ink;
  ctx.font = font(11, 600);
  fitText(ctx, out ? v.labels.fenceAbove : v.labels.fenceBelow, F.x + F.w / 2, y0 + 9 + 17 * L, F.w - 16);

  // elektrons: viena fotona cikls (tikai, ja gaisma deg)
  const r = clamp(6 * L, 5, 9);
  const ex0 = barX + barW / 2;
  const lit = st.on && st.intensity > 0;
  if (!lit) { electronDot(ctx, ex0, y0 - r - 1, r, c); return; }
  const u = (((st.t - st.fenceT0) % FENCE_PERIOD) + FENCE_PERIOD) % FENCE_PERIOD / FENCE_PERIOD;
  const yTop = yW - r - 1 < P.y ? P.y : yW;
  const floorY = y0 - r - 1;
  if (u < 0.2) {
    // fotons lido pie elektrona
    const f = u / 0.2;
    const S = { x: P.x + 8, y: P.y + 6 };
    const E = { x: ex0 - r, y: floorY };
    packet(ctx, S.x + (E.x - S.x) * f, S.y + (E.y - S.y) * f, Math.atan2(E.y - S.y, E.x - S.x), st.lambda, rgbCss(col), 1, 2);
    electronDot(ctx, ex0, floorY, r, c);
    return;
  }
  if (u < 0.42) {
    electronDot(ctx, ex0, floorY + (yTop - floorY) * easeOut((u - 0.2) / 0.22), r, c);
    return;
  }
  if (!out) {
    if (u < 0.5) electronDot(ctx, ex0, yTop, r, c);
    else if (u < 0.68) electronDot(ctx, ex0, yTop + (floorY - yTop) * easeIn((u - 0.5) / 0.18), r, c);
    else electronDot(ctx, ex0, floorY, r, c);
    return;
  }
  // pārlec pāri žogam un lido prom ar ātrumu ∝ √Wₖ
  const xOver = fenceX + fenceW + 8 + r;
  let ex;
  if (u < 0.56) ex = ex0 + (xOver - ex0) * easeOut((u - 0.42) / 0.14);
  else ex = xOver + P.w * 0.45 * Math.sqrt((W - A) / 1e-19) * (u - 0.56) * FENCE_PERIOD;
  if (ex < P.x + P.w - r) electronDot(ctx, ex, yTop, r, c);
  if (u > 0.6) {
    ctx.globalAlpha = Math.min(1, (u - 0.6) / 0.15);
    electronDot(ctx, ex0, floorY, r, c); // nākamais elektrons metālā
    ctx.globalAlpha = 1;
  }
}

// Ja teksts par platu — mazāks burts (ne mazāk par 8 px)
function shrinkToFit(ctx, s, maxW) {
  const w = ctx.measureText(s).width;
  if (w <= maxW || maxW <= 0) return;
  const m = /(\d+)px/.exec(ctx.font);
  if (m) ctx.font = ctx.font.replace(/\d+px/, `${Math.max(8, Math.floor((Number(m[1]) * maxW) / w))}px`);
}

// Teksts centrēts; ja par platu — mazāks burts
function fitText(ctx, s, x, y, maxW) {
  let w = ctx.measureText(s).width;
  if (w > maxW) {
    const m = /(\d+)px/.exec(ctx.font);
    if (m) ctx.font = ctx.font.replace(/\d+px/, `${Math.max(8, Math.floor((Number(m[1]) * maxW) / w))}px`);
    w = ctx.measureText(s).width;
  }
  ctx.fillText(s, x, y);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
  ctx.lineTo(x + w, y + h - r);
  ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  ctx.lineTo(x + r, y + h);
  ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  ctx.lineTo(x, y + r);
  ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  ctx.closePath();
}

