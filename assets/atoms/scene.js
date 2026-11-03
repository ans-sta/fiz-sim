// assets/atoms/scene.js — A-01 kanva: spektra stabi, atoms, līmeņu shēma, fotoni (spec. § 5).
// Izkārtojums ir tīra funkcija no (w, h, slide) — lapa pēc tās novieto arī slīdni un līmeņu pogas.
import { spectralRGB, hexRGB, ensureContrast } from '../spectrum/model.js';
import { VIS, lambdaToPos, offScale, levelOf } from './model.js';

const M = 16; // px — mala
const GAP = 22; // px — atstarpe starp stabu un atomu
const COL_PAD = 46; // px — vieta stabam blakus: mājieni iekšpusē, nm skala ārpusē

// ── izkārtojums ───────────────────────────────────────────
// topPad — rādījuma augstums virs zīmējuma (lapa to izmēra), lai teksts neuzkrīt atomam
export function sceneLayout(w, h, { slide = 0, drawScale = 1, topPad = 0 } = {}) {
  const portrait = w < h && w < 600;
  const s = Math.min(1, Math.max(0, slide));
  if (portrait) {
    const cw = Math.max(28, Math.min(44, Math.round(w * 0.1)));
    const LX = 44; // vieta nm skalai un slīdņa skaitlim pa kreisi
    const top = Math.max(M + 10, topPad + 6);
    const bw = Math.max(24, cw); // baltās gaismas poga virs staba — kvadrāts staba platumā (Ansis 04.11.)
    const ct = top + bw + 8;
    const colH = Math.max(0, h - ct - 58); // apakšā vieta ⚙
    const absCol = { x: LX - s * (cw + LX + 40), y: ct, w: cw, h: colH };
    const emCol = { x: w - 30 - cw + (1 - s) * (cw + LX + 40), y: ct, w: cw, h: colH };
    const whiteBtn = { x: absCol.x, y: top, w: bw, h: bw };
    const off = s * (LX + cw + 22 - M);
    const gx = LX + cw + 22 - off;
    const gw = Math.max(0, w - (LX + cw + 22) - M);
    const atomH = Math.round((h - top) * 0.36);
    const atom = { x: gx, y: top, w: gw, h: atomH };
    const diagram = { x: gx, y: top + atomH + 8, w: gw, h: Math.max(0, h - top - atomH - 8 - M) };
    return { portrait, absCol, emCol, whiteBtn, column: s < 0.5 ? absCol : emCol, atom, diagram, offX: -off };
  }
  const cw = Math.round(Math.max(30, Math.min(52, w * 0.035)) * Math.min(1.4, Math.max(0.8, drawScale)));
  const total = cw + COL_PAD;
  const top = Math.max(M + 16, topPad + 10);
  const bw = Math.max(24, cw); // baltās gaismas poga virs staba — kvadrāts staba platumā, kā punkts uz i (Ansis 04.11.)
  const ct = top + bw + 8;
  const colH = Math.max(0, h - ct - M - 18);
  const groupH = Math.max(0, h - top - M - 18);
  const absCol = { x: M + 30 - s * (total + M + 30), y: ct, w: cw, h: colH };
  const emCol = { x: w - M - 30 - cw + (1 - s) * (total + M + 30), y: ct, w: cw, h: colH };
  const whiteBtn = { x: absCol.x, y: top, w: bw, h: bw };
  const off = s * (total + GAP);
  const gx = M + 30 + total + GAP - off;
  const groupW = Math.max(0, w - 2 * M - 30 - total - GAP);
  const atomW = Math.round(groupW * 0.42);
  const atom = { x: gx, y: top, w: atomW, h: groupH };
  const diagram = { x: gx + atomW, y: top, w: Math.max(0, groupW - atomW), h: groupH };
  return { portrait, absCol, emCol, whiteBtn, column: s < 0.5 ? absCol : emCol, atom, diagram, offX: -off };
}

export const columnY = (rect, p) => rect.y + rect.h * (1 - p);

// ── līmeņu shēma ──────────────────────────────────────────
// Enerģija vertikāli mērogā, 0 (jonizācija) augšā; hēlijam ass pārtraukta (pamatstāvoklis apakšā, ierosinātie — augšējos 85 %)
export function levelYs(atom, rect) {
  const pad = 12;
  const top = rect.y + pad;
  const bot = rect.y + rect.h - pad;
  const Emin = Math.min(...atom.levels.map((l) => l.E));
  const map = (E) => {
    if (!atom.axisBreak) return top + ((0 - E) / (0 - Emin)) * (bot - top);
    const { from, to } = atom.axisBreak;
    const H = bot - top;
    if (E >= to) return top + ((0 - E) / (0 - to)) * H * 0.85;
    if (E <= from) return bot - ((E - Emin) / (from - Emin || 1)) * H * 0.04;
    return top + H * 0.85 + ((to - E) / (to - from)) * H * 0.11;
  };
  return new Map(atom.levels.map((l) => [l.id, map(l.E)]));
}

// Uzraksti pēc kārtas ne tuvāk par minGap; apakšējais paliek savā vietā (bīda uz augšu)
// items — augšā pirmie (y augošā secībā); top — augstāk par to uzrakstu nebīda.
// Vispirms bīda uz augšu (apakšējais cieši sakārtotā grupā paliek pie savas līnijas, pārējie virs tā), tikai tad,
// ja neietilpst līdz top, — uz leju (Ansis 04.11. pamanīja: “n = 4” stāvēja pie n = 3 līnijas)
export function spreadLabels(items, minGap, top = -Infinity) {
  const out = items.map((it) => ({ ...it, labelY: it.y }));
  for (let i = out.length - 2; i >= 0; i--) out[i].labelY = Math.min(out[i].labelY, out[i + 1].labelY - minGap);
  for (let i = 0; i < out.length; i++) {
    const lo = i ? out[i - 1].labelY + minGap : top;
    if (out[i].labelY < lo) out[i].labelY = lo;
  }
  return out;
}

// Katram līmenim: līnija (x0–x1, y) kolonnā un uzraksta vieta (labelX, labelY), izvirzīta, ja līmeņi cieši
export function levelGeometry(atom, rect, legend = 1) {
  const ys = levelYs(atom, rect);
  const cols = atom.columns; // kāpnes: H, Na, Hg — viena; He — para | orto
  const single = cols.length === 1;
  const compact = rect.w < 300; // šaura shēma (telefons): ass tuvāk, enerģija tikai pie elektrona līmeņa
  const axisW = compact ? 40 : 52;
  const inner = { x: rect.x + axisW, w: Math.max(0, rect.w - axisW) };
  const split = single ? 0 : 14;
  const colW = (inner.w - split * (cols.length - 1)) / cols.length;
  const colX = (i) => inner.x + i * (colW + split);
  const gap = Math.max(24, 14 * legend); // līmeņu pogas (uzrakstu vietās) ≥ 24 px viena no otras (WCAG 2.5.8)
  const out = [];
  cols.forEach((c, i) => {
    const lv = atom.levels.filter((l) => l.col === c.id && l.kind !== 'limit').sort((a, b) => ys.get(a.id) - ys.get(b.id));
    const x0 = colX(i) + colW * (compact && single ? 0.04 : 0.06);
    const x1 = single
      ? x0 + Math.max(40, Math.min(colW * 0.7, colW - (x0 - colX(i)) - (compact ? 50 : 130) * legend))
      : colX(i) + colW * 0.66;
    // gandrīz sakrītoši līmeņi (He n ≥ 3) — blakus, katrs savā augstumā; ja par šauru, — pilnā platumā ar izvirzītiem uzrakstiem
    const subW = (x1 - x0 - 8) / 3;
    const splitSub = atom.splitSub && subW >= 26;
    const items = lv.map((l) => {
      if (splitSub && l.n >= 3) {
        const sx0 = x0 + 'SPD'.indexOf(l.sub) * (subW + 4);
        return { id: l.id, x0: sx0, x1: sx0 + subW, y: ys.get(l.id), group: `${c.id}:${l.n}`, n: l.n };
      }
      return { id: l.id, x0, x1, y: ys.get(l.id) };
    });
    const labels = [];
    const byGroup = new Map();
    for (const it of items) {
      if (!it.group) { labels.push({ y: it.y, ids: [it.id] }); continue; }
      if (!byGroup.has(it.group)) { const g = { y: it.y, ids: [] }; byGroup.set(it.group, g); labels.push(g); }
      const g = byGroup.get(it.group);
      g.ids.push(it.id);
      g.y = Math.min(g.y, it.y);
    }
    labels.sort((a, b) => a.y - b.y);
    const spread = spreadLabels(labels, gap, rect.y + 4);
    const labelOf = new Map();
    for (const sp of spread) for (const id of sp.ids) labelOf.set(id, sp);
    const narrow = !single && colW < 70; // šaurā shēmā uzraksts virs līnijas, nevis blakus
    for (const it of items) {
      const sp = labelOf.get(it.id);
      out.push({
        id: it.id, col: c.id, x0: it.x0, x1: it.x1, y: it.y, single, narrow, colW, compact,
        labelX: x1 + 10, labelY: sp.labelY, lineEnd: x1,
        groupLabel: it.group ? `n = ${it.n}` : null, labelLead: sp.ids[0] === it.id, groupIds: sp.ids,
      });
    }
  });
  for (const l of atom.levels.filter((x) => x.kind === 'limit')) {
    out.push({ id: l.id, col: l.col, x0: inner.x, x1: inner.x + inner.w, y: ys.get(l.id), labelX: inner.x + inner.w * 0.6, labelY: ys.get(l.id), single: true, limit: true });
  }
  return out;
}

// ── krāsas ────────────────────────────────────────────────
const BLACK = [0, 0, 0];
const rgbCss = ([r, g, b], a = 1) => (a >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`);
const UV_BASE = [175, 150, 235];
const IR_BASE = [190, 100, 100];

// Avota staba krāsa: spilgta, lai melnā svītra ir ≥ 3 : 1 (arī violetajā un sarkanajā galā)
function sourceRGB(λ) {
  if (λ < VIS.min) return ensureContrast(UV_BASE, [BLACK], 3.2, true);
  if (λ > VIS.max) return ensureContrast(IR_BASE, [BLACK], 3.2, true);
  return ensureContrast(spectralRGB(λ), [BLACK], 3.2, true);
}
// Fotona vai līnijas krāsa pret fonu (≥ 3 : 1)
export function photonRGB(λ, bg, dark) {
  const base = λ < VIS.min ? [220, 205, 255] : λ > VIS.max ? [150, 60, 60] : spectralRGB(λ);
  return ensureContrast(base, [bg], 3, dark);
}
const invisible = (λ) => λ < VIS.min || λ > VIS.max;

// ── zīmēšana ──────────────────────────────────────────────
// view: { atom, st (sim.state), axis, hints, showHints, edge, mode, slide, legend, labels, fmt, theme, colors, jump, now }
export function drawScene(ctx, lay, v) {
  const c = v.colors;
  const dark = v.theme === 'dark';
  const field = hexRGB(c.field);
  const L = v.legend;
  const font = (px, weight = 400) => `${weight} ${Math.round(px * L)}px 'IBM Plex Mono', ui-monospace, monospace`;
  const W = ctx.canvas.width / (window.devicePixelRatio || 1);
  const Hh = ctx.canvas.height / (window.devicePixelRatio || 1);
  ctx.clearRect(0, 0, W, Hh);
  ctx.fillStyle = c.field;
  ctx.fillRect(0, 0, W, Hh);

  const geo = levelGeometry(v.atom, lay.diagram, L);
  const byId = new Map(geo.map((g) => [g.id, g]));
  const atomC = { x: lay.atom.x + lay.atom.w / 2, y: lay.atom.y + 30 * L + (lay.atom.h - 30 * L - 22) / 2 };
  const rMax = Math.max(20, Math.min(lay.atom.w * 0.92, lay.atom.h - 30 * L - 22) / 2);

  drawSourceColumn(ctx, lay.absCol, v, { font, c });
  drawEmissionColumn(ctx, lay.emCol, v, { font, c });
  const rings = drawAtom(ctx, atomC, rMax, v, { font, c, dark });
  drawDiagram(ctx, lay.diagram, geo, byId, v, { font, c, dark, field });
  drawPhotons(ctx, lay, atomC, rMax, rings, v, { field, dark, c, W });
}

function zoneTicks(axis) {
  const t = [];
  for (const nm of [100, 200, 300]) if (nm > axis.uvMin + 5) t.push(nm);
  t.push(400, 500, 600, 700, 1000, 2000, 5000);
  return t;
}

function drawColumnFrame(ctx, r, v, { font, c }, outerLeft) {
  // zonu uzraksti un nm skala ārpusē
  ctx.fillStyle = c.inkDim;
  ctx.font = font(10);
  ctx.textBaseline = 'middle';
  ctx.textAlign = outerLeft ? 'right' : 'left';
  const xo = outerLeft ? r.x - 6 : r.x + r.w + 6;
  for (const nm of zoneTicks(v.axis)) {
    const y = columnY(r, lambdaToPos(v.axis, nm));
    ctx.fillText(nm >= 1000 ? `${nm / 1000} µm` : String(nm), xo, y);
    ctx.fillRect(outerLeft ? r.x - 4 : r.x + r.w, y - 0.5, 4, 1);
  }
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = 1;
  ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  ctx.textAlign = outerLeft ? 'right' : 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = c.inkDim;
  ctx.font = font(10);
  ctx.fillText('nm', xo, r.y - 5);
}

function drawSourceColumn(ctx, r, v, ctxs) {
  if (r.x + r.w < -60 || r.w <= 0) return;
  const { c, font } = ctxs;
  for (let y = 0; y < r.h; y += 1) {
    const λ = v.posToLambda(1 - (y + 0.5) / r.h);
    ctx.fillStyle = rgbCss(sourceRGB(λ));
    ctx.fillRect(r.x, r.y + y, r.w, 1.2);
  }
  // melnās svītras — kur atoms absorbēja
  ctx.fillStyle = '#000';
  if (v.mode === 'absorb' || v.slide < 1) {
    for (const λ of v.st.stripes.values()) {
      const y = columnY(r, lambdaToPos(v.axis, λ));
      ctx.fillRect(r.x, y - 1.25, r.w, 2.5);
    }
  }
  // mājieni iekšpusē (pret atomu): līnijas — īsa iezīme, jonizācijas robeža — raustīta
  if (v.showHints) {
    ctx.strokeStyle = c.inkDim;
    ctx.lineWidth = 2;
    for (const t of v.hints) {
      const y = columnY(r, lambdaToPos(v.axis, t.λ));
      ctx.setLineDash(t.kind === 'edge' ? [3, 3] : []);
      ctx.beginPath();
      ctx.moveTo(r.x + r.w + 3, y);
      ctx.lineTo(r.x + r.w + (t.kind === 'edge' ? 18 : 11), y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  // jonizācijas robeža uz staba
  if (Number.isFinite(v.edge) && v.edge >= v.axis.uvMin && v.edge <= 10000) {
    const y = columnY(r, lambdaToPos(v.axis, v.edge));
    ctx.strokeStyle = '#000';
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(r.x, y);
    ctx.lineTo(r.x + r.w, y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // UV un IS uzraksti blakus stabam atoma pusē (Ansis 04.11.: “nav UZ spektra, bet blakus … atoma pusē”)
  ctx.fillStyle = c.ink;
  ctx.font = font(11, 600);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('UV', r.x + r.w + 22, columnY(r, 0.925));
  ctx.fillText(v.labels.ir, r.x + r.w + 22, columnY(r, 0.075));
  drawColumnFrame(ctx, r, v, ctxs, true);
  // slīdņa vieta: skaitlis melnā lodziņā skalas pusē (aizsedz skalas ciparus), stabs paliek brīvs — svītras redzamas
  if (v.aim) {
    const y = columnY(r, lambdaToPos(v.axis, v.aim));
    ctx.font = font(11, 600);
    const tw = ctx.measureText(v.labels.aim).width;
    const bw = tw + 8;
    const bh = 16 * v.legend;
    ctx.fillStyle = '#000';
    ctx.fillRect(r.x - bw - 1, y - bh / 2, bw, bh);
    ctx.beginPath();
    ctx.moveTo(r.x - 1, y - 4);
    ctx.lineTo(r.x + 3, y);
    ctx.lineTo(r.x - 1, y + 4);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(v.labels.aim, r.x - 5, y + 0.5);
    // otrā pusē mazs rādītājs pret stabu
    ctx.fillStyle = '#000';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(r.x + r.w + 1, y);
    ctx.lineTo(r.x + r.w + 8, y - 5);
    ctx.lineTo(r.x + r.w + 8, y + 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function drawEmissionColumn(ctx, r, v, ctxs) {
  if (r.x > ctx.canvas.width || r.w <= 0) return;
  const { c, font } = ctxs;
  ctx.fillStyle = '#000';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  // zonu robežas
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  for (const p of [0.15, 0.85]) {
    const y = columnY(r, p);
    ctx.beginPath();
    ctx.moveTo(r.x, y);
    ctx.lineTo(r.x + r.w, y);
    ctx.stroke();
  }
  const off = [];
  for (const λ of v.st.lines.values()) {
    if (offScale(λ)) { off.push(λ); continue; }
    const y = columnY(r, lambdaToPos(v.axis, λ));
    ctx.strokeStyle = rgbCss(photonRGB(λ, BLACK, true));
    ctx.lineWidth = 2.5;
    ctx.setLineDash(invisible(λ) ? [4, 3] : []);
    ctx.beginPath();
    ctx.moveTo(r.x + 1, y);
    ctx.lineTo(r.x + r.w - 1, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.fillStyle = c.ink;
  ctx.font = font(11, 600);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('UV', r.x - 8, columnY(r, 0.925));
  ctx.fillText(v.labels.ir, r.x - 8, columnY(r, 0.075));
  // aiz skalas (> 10 µm)
  if (off.length) {
    ctx.fillStyle = c.ink;
    ctx.font = font(10);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`↓ ${off.map((λ) => v.fmtMicron(λ)).join(' · ')} µm`, r.x + r.w, r.y + r.h + 4);
  }
  drawColumnFrame(ctx, r, v, ctxs, false);
}

function drawAtom(ctx, C, rMax, v, { font, c, dark }) {
  const a = v.atom;
  const lv = a.levels.filter((l) => l.kind !== 'limit').slice().sort((x, y) => x.E - y.E);
  const r0 = rMax * (a.inner.shells ? 0.34 : a.inner.core ? 0.3 : 0.16);
  const rings = new Map(lv.map((l, i) => [l.id, r0 + ((rMax - r0) * i) / Math.max(1, lv.length - 1)]));
  // kodols un iekšējie elektroni
  ctx.fillStyle = c.inkDim;
  if (a.inner.core) {
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(C.x, C.y, r0 * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = c.ink;
    ctx.font = font(10);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(v.labels.core, C.x, C.y + r0 * 0.72 + 4); // zem pelēkā diska — kodols ar protoniem un neitroniem paliek redzams
  }
  drawNucleus(ctx, C, rMax, a.nucleus, { c, dark });
  if (a.inner.shells) {
    a.inner.shells.forEach((n, i) => {
      const r = r0 * (0.38 + 0.32 * i);
      ctx.strokeStyle = c.hairline;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(C.x, C.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = c.inkDim;
      for (let k = 0; k < n; k++) {
        const ang = (k / n) * Math.PI * 2 + 0.3;
        ctx.beginPath();
        ctx.arc(C.x + r * Math.cos(ang), C.y + r * Math.sin(ang), 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
  // riņķi pa līmeņiem (nav mērogā)
  const cur = v.st.level;
  for (const [id, r] of rings) {
    const on = id === cur;
    ctx.strokeStyle = on ? c.ink : c.hairline;
    ctx.lineWidth = on ? 1.5 : 1;
    ctx.beginPath();
    ctx.arc(C.x, C.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  const ANG = -Math.PI / 4;
  // stāvošais elektrons (He 1s, Hg otrs 6s) — uz pamatstāvokļa riņķa
  if (a.inner.rest) {
    const r = rings.get(lv[0].id);
    ctx.fillStyle = c.inkDim;
    ctx.beginPath();
    ctx.arc(C.x + r * Math.cos(ANG + Math.PI), C.y + r * Math.sin(ANG + Math.PI), 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // aktīvais elektrons
  if (cur && rings.has(cur)) {
    let r = rings.get(cur);
    if (v.jump && v.jump.k < 1 && rings.has(v.jump.from)) {
      const k = 1 - Math.pow(1 - v.jump.k, 3);
      r = rings.get(v.jump.from) + (r - rings.get(v.jump.from)) * k;
    }
    ctx.fillStyle = c.accent;
    ctx.beginPath();
    ctx.arc(C.x + r * Math.cos(ANG), C.y + r * Math.sin(ANG), 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = c.inkDim;
  ctx.font = font(10);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(v.labels.notToScale, C.x, C.y + rMax + 10);
  ctx.font = font(18, 600);
  ctx.fillStyle = c.ink;
  ctx.textBaseline = 'bottom';
  ctx.fillText(v.labels.atomName, C.x, C.y - rMax - 8);
  void dark;
  return { rings, ANG };
}

// Kodols: protoni (sarkani, ar “+”, ja vieta) un neitroni (pelēki) saulespuķes rakstā — “daudz”, ne obligāti visi (Ansis 04.11.)
function drawNucleus(ctx, C, rMax, nucleus, { c, dark }) {
  const N = nucleus.p + nucleus.n;
  const b = N === 1 ? Math.max(4, rMax * 0.04) : Math.max(2.2, rMax * (N > 20 ? 0.017 : 0.03));
  const pCol = dark ? '#ff6b6b' : '#c0262d';
  for (let i = 0; i < N; i++) {
    const r = N === 1 ? 0 : b * 1.05 * Math.sqrt(i + 0.5) * 1.75;
    const th = i * 2.39996;
    const x = C.x + r * Math.cos(th);
    const y = C.y + r * Math.sin(th);
    const proton = Math.floor(((i + 1) * nucleus.p) / N) > Math.floor((i * nucleus.p) / N); // protoni vienmērīgi starp neitroniem
    ctx.fillStyle = proton ? pCol : c.inkDim;
    ctx.strokeStyle = c.field;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(x, y, b, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (proton && b >= 3.5) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - b * 0.5, y); ctx.lineTo(x + b * 0.5, y);
      ctx.moveTo(x, y - b * 0.5); ctx.lineTo(x, y + b * 0.5);
      ctx.stroke();
    }
  }
}

function drawDiagram(ctx, r, geo, byId, v, { font, c, dark, field }) {
  if (r.w <= 0) return;
  const a = v.atom;
  const ys = levelYs(a, r);
  // enerģijas ass pa kreisi
  const ax = r.x + (r.w < 300 ? 28 : 40);
  ctx.strokeStyle = c.inkDim;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ax, r.y + 4);
  ctx.lineTo(ax, r.y + r.h - 4);
  ctx.stroke();
  ctx.fillStyle = c.inkDim;
  ctx.font = font(10);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const Emin = Math.min(...a.levels.map((l) => l.E));
  const step = a.id === 'H' ? 2 : 1;
  const yOf = (E) => levelYs({ ...a, levels: [{ id: '_', E }, { id: '_min', E: Emin }] }, r).get('_');
  for (let E = 0; E >= Emin; E -= step) {
    if (a.axisBreak && E < a.axisBreak.to) continue; // zem pārtraukuma — tikai pamatstāvokļa vērtība
    const y = yOf(E);
    ctx.fillRect(ax - 4, y - 0.5, 4, 1);
    ctx.fillText(v.fmt(E, 0), ax - 6, y);
  }
  if (a.axisBreak) {
    const y = r.y + 12 + (r.h - 24) * 0.92;
    ctx.fillStyle = c.field;
    ctx.fillRect(ax - 6, y - 5, 12, 10);
    ctx.strokeStyle = c.inkDim;
    ctx.beginPath();
    ctx.moveTo(ax - 6, y - 1); ctx.lineTo(ax + 6, y - 5);
    ctx.moveTo(ax - 6, y + 5); ctx.lineTo(ax + 6, y + 1);
    ctx.stroke();
    const yg = ys.get(a.levels.reduce((m, l) => (l.E < m.E ? l : m)).id);
    ctx.fillStyle = c.inkDim;
    ctx.fillText(v.fmt(Emin, 1), ax - 6, yg);
  }
  ctx.save();
  ctx.translate(r.x + 6, r.y + r.h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(v.labels.energyAxis, 0, 0);
  ctx.restore();
  // jonizācija (0 eV)
  const y0 = yOf(0);
  ctx.strokeStyle = c.inkDim;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(ax, y0);
  ctx.lineTo(r.x + r.w, y0);
  ctx.stroke();
  ctx.setLineDash([]);
  // jonizācijas uzraksts pa kreisi (labajā pusē ir līmeņu uzraksti); ūdeņradim kopā ar n = ∞
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(a.levels.some((l) => l.kind === 'limit') ? `n = ∞ · ${v.labels.ionisation}` : v.labels.ionisation, ax + 8, y0 - 3);
  // kolonnu virsraksti
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const colsSeen = new Map();
  for (const g of geo) if (!g.limit && !g.groupLabel && !colsSeen.has(g.col)) colsSeen.set(g.col, (g.x0 + g.x1) / 2);
  for (const col of a.columns) {
    if (!col.label || !colsSeen.has(col.id)) continue;
    ctx.fillText(col.label, colsSeen.get(col.id), r.y + r.h - 2);
  }
  if (a.columns.length === 2) {
    ctx.fillStyle = c.ink;
    ctx.fillText(v.labels.para, colsSeen.get('para'), r.y + 2 + 0.88 * r.h);
    ctx.fillText(v.labels.ortho, colsSeen.get('ortho'), r.y + 2 + 0.88 * r.h);
  }
  // līmeņi
  const cur = v.st.level;
  const arrow = v.st.arrow;
  const showE = new Set([cur, arrow?.from, arrow?.to].filter(Boolean));
  for (const g of geo) {
    if (g.limit) {
      ctx.fillStyle = c.inkDim;
      ctx.font = font(11);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      continue; // “n = ∞” — pie jonizācijas līnijas uzraksta
    }
    const on = g.id === cur;
    const lvl = levelOf(a, g.id);
    ctx.strokeStyle = on ? c.accent : c.ink;
    ctx.lineWidth = on ? 3 : 1.6;
    ctx.beginPath();
    ctx.moveTo(g.x0, g.y);
    ctx.lineTo(g.x1, g.y);
    ctx.stroke();
    // uz šo līmeni no elektrona līmeņa pāriet nevar — sarkans × (Ansis 04.11.)
    if (v.forbidden?.has(g.id)) {
      const xx = g.x1 - 9;
      ctx.strokeStyle = dark ? '#ff6b6b' : '#c0262d';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(xx - 5, g.y - 5); ctx.lineTo(xx + 5, g.y + 5);
      ctx.moveTo(xx + 5, g.y - 5); ctx.lineTo(xx - 5, g.y + 5);
      ctx.stroke();
    }
    // uzraksts (izvirzīts ar norādi, ja pabīdīts); gandrīz sakrītošo līmeņu grupai — viens “n = 3”
    if (g.groupLabel && !g.labelLead) continue;
    const lx = g.single || g.groupLabel ? g.labelX : g.x1 + 4;
    const lineEnd = g.groupLabel ? g.lineEnd : g.x1;
    if (Math.abs(g.labelY - g.y) > 1) {
      ctx.strokeStyle = c.hairline;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lineEnd, g.y);
      ctx.lineTo(lx - 2, g.labelY);
      ctx.stroke();
    }
    ctx.fillStyle = on ? c.ink : c.inkDim;
    ctx.font = font(11, on ? 600 : 400);
    ctx.textBaseline = 'middle';
    const inGroup = g.groupLabel ? g.groupIds.find((id) => showE.has(id)) : null;
    const energy = g.groupLabel
      ? (inGroup ? `  ${levelOf(a, inGroup).label} ${v.fmt(levelOf(a, inGroup).E, 2)} eV` : '')
      : (g.single && !g.compact) || showE.has(g.id) ? `  ${v.fmt(lvl.E, 2)} eV` : '';
    const text = g.groupLabel ? `${g.groupLabel}${energy}` : `${lvl.label}${lvl.metastable ? ' *' : ''}${energy}`;
    const tw = ctx.measureText(text).width;
    if (g.narrow) {
      ctx.font = font(9.5, on ? 600 : 400);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(on || showE.has(g.id) ? text.replace('  ', ' ') : `${lvl.label}${lvl.metastable ? '*' : ''}`, (g.x0 + g.x1) / 2, g.labelY - 2);
    } else if (lx + tw > r.x + r.w - 2) {
      ctx.textAlign = 'right';
      ctx.fillText(text, g.x0 - 4, g.labelY);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(text, lx, g.labelY);
    }
  }
  // bultas: katra pāreja paliek shēmā (pēda), pēdējā — biezāka (Ansis 04.11.: “bultiņas paliek … līdz ir sakrājies pilns zīmējums”)
  const slots = seriesSlots(a, geo);
  const colOf = (λ) => rgbCss(photonRGB(λ, field, dark));
  const draw = (up, lo, λ, w, head, towardUp) => {
    const U = byId.get(up);
    const D = byId.get(lo);
    if (!U || !D) return;
    let xu = (U.x0 + U.x1) / 2;
    let xd = (D.x0 + D.x1) / 2;
    if (slots) xu = xd = slots.get(`${up}|${lo}`).x;
    else if (xu > D.x0 + 3 && xu < D.x1 - 3) {
      // taisni uz leju; vairākas bultas no tā paša līmeņa — blakus
      const k = (v.atom.lines.filter((l) => l.up === up).findIndex((l) => l.lo === lo));
      xu = xd = Math.min(D.x1 - 3, Math.max(D.x0 + 3, xu + (k - 1) * 6));
    }
    const [xa, ya, xb, yb] = towardUp ? [xd, D.y, xu, U.y] : [xu, U.y, xd, D.y];
    arrowLine(ctx, xa, ya, xb, yb, λ ? colOf(λ) : c.inkDim, w, head);
  };
  const trail = v.trail ? [...v.trail.values()] : [];
  const towardUp = v.mode === 'absorb';
  for (const tr of trail) draw(tr.up, tr.lo, tr.λ, 2.2, 7, towardUp);
  // sēriju nosaukumi (ūdeņradis)
  if (slots && trail.length) {
    ctx.fillStyle = c.inkDim;
    ctx.font = font(10);
    ctx.textBaseline = 'top';
    for (const lo of new Set(trail.map((x) => x.lo))) {
      const xs = [...slots.values()].filter((q) => q.lo === lo).map((q) => q.x);
      const yLo = byId.get(lo).y;
      const name = Number(lo) <= 3 ? v.labels.series?.[lo] : null; // kā grāmatā — trīs galvenās sērijas
      if (!name) continue;
      if (lo === '1') {
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(name, Math.min(...xs) - 6, yLo - 4);
        ctx.textBaseline = 'top';
      } else {
        ctx.textAlign = 'center';
        ctx.fillText(name, (Math.min(...xs) + Math.max(...xs)) / 2, yLo + 4);
      }
    }
  }
  if (arrow && byId.has(arrow.from) && byId.has(arrow.to)) {
    if (arrow.excite) {
      // ierosināšana (izlāde, bez fotona): plāna pelēka bulta līmeņu kreisajā malā
      const A = byId.get(arrow.from);
      const B = byId.get(arrow.to);
      const x = slots ? A.x0 - 10 : (A.x0 + A.x1) / 2 - 6;
      const xb = slots ? x : (B.x0 + B.x1) / 2 - 6;
      arrowLine(ctx, x, A.y, xb, B.y, c.inkDim, 1.5, 7);
    } else {
      const up = arrow.up ? arrow.to : arrow.from;
      const lo = arrow.up ? arrow.from : arrow.to;
      draw(up, lo, arrow.λ, 4.5, 11, arrow.up);
    }
  }
}

// Ūdeņraža bultu vietas kā mācību grāmatā: sērijas no kreisās uz labo — →5, →4, →3 (IS), →2 (Balmera), →1 (Laimana, UV);
// sērijā augšējais līmenis aug no kreisās uz labo (a, b, c, d). Vietas fiksētas — bultas nelec, kad pieliek jaunu.
export function seriesSlots(atom, geo) {
  if (atom.columns.length !== 1) return null;
  const lv = geo.filter((g) => !g.limit);
  if (!lv.length) return null;
  const E = (id) => levelOf(atom, id).E;
  const x0 = Math.min(...lv.map((g) => g.x0)) + 8;
  const x1 = Math.max(...lv.map((g) => g.x1)) - 8;
  const groups = [...new Set(atom.lines.map((l) => l.lo))].sort((p, q) => E(q) - E(p)); // apakšējie līmeņi: augstākie pa kreisi
  const n = atom.lines.length;
  const GAP = 1.6;
  const unit = (x1 - x0) / Math.max(1, n - 1 + GAP * (groups.length - 1));
  const out = new Map();
  let x = x0;
  groups.forEach((lo, gi) => {
    if (gi) x += unit * GAP;
    const ups = atom.lines.filter((l) => l.lo === lo).map((l) => l.up).sort((p, q) => E(p) - E(q));
    ups.forEach((up, k) => {
      out.set(`${up}|${lo}`, { x, up, lo });
      if (k < ups.length - 1) x += unit;
    });
  });
  return out;
}

function arrowLine(ctx, xa, ya, xb, yb, color, w, head) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(xa, ya);
  ctx.lineTo(xb, yb);
  ctx.stroke();
  const ang = Math.atan2(yb - ya, xb - xa);
  ctx.beginPath();
  ctx.moveTo(xb, yb);
  ctx.lineTo(xb - head * Math.cos(ang - 0.42), yb - head * Math.sin(ang - 0.42));
  ctx.lineTo(xb - head * Math.cos(ang + 0.42), yb - head * Math.sin(ang + 0.42));
  ctx.closePath();
  ctx.fill();
}

// Viļņa pakete: vijuma garums ekrānā aug ar λ (sarkanam garāki nekā violetam)
function packet(ctx, x, y, ang, λ, color, alpha, cycles = 3) {
  const lw = invisible(λ) ? (λ < VIS.min ? 5 : 20) : 6 + (10 * (λ - VIS.min)) / (VIS.max - VIS.min);
  const len = lw * cycles;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.setLineDash(invisible(λ) ? [4, 3] : []);
  ctx.beginPath();
  for (let s = -len; s <= 0; s += 1) {
    const env = Math.sin((Math.PI * (s + len)) / len);
    const yy = 6 * env * Math.sin((2 * Math.PI * s) / lw);
    if (s === -len) ctx.moveTo(s, yy);
    else ctx.lineTo(s, yy);
  }
  ctx.stroke();
  ctx.restore();
}

const LONG = 9; // absorbcijas fotona vijumi (3× garāks nekā starošanā; Ansis 04.11.)
function drawPhotons(ctx, lay, C, rMax, rings, v, { field, dark, c, W }) {
  const now = v.st.t;
  for (const p of v.st.photons) {
    const k = Math.min(1, Math.max(0, (now - p.t) / p.dur));
    const color = rgbCss(photonRGB(p.λ, field, dark));
    if (p.kind === 'in' || p.kind === 'pass' || p.kind === 'sink' || p.kind === 'reemit') {
      const r = lay.absCol;
      const S = { x: r.x + r.w + 4, y: columnY(r, lambdaToPos(v.axis, p.λ)) };
      const D = Math.hypot(C.x - S.x, C.y - S.y) || 1;
      const ux = (C.x - S.x) / D;
      const uy = (C.y - S.y) / D;
      const s = (D / (p.flight || 1)) * Math.max(0, now - p.t); // px — tas pats ātrums visā ceļā
      const ang = Math.atan2(uy, ux);
      if (p.kind === 'in') {
        packet(ctx, S.x + ux * Math.min(D, s), S.y + uy * Math.min(D, s), ang, p.λ, color, 1, LONG);
      } else if (p.kind === 'pass') {
        packet(ctx, C.x + ux * s, C.y + uy * s, ang, p.λ, color, 1, LONG);
      } else if (p.kind === 'sink') {
        // aste turpina kustību, bet viss aiz atoma centra paslēpts — fotons “ieiet” atomā
        ctx.save();
        ctx.translate(C.x, C.y);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.rect(-4000, -4000, 4000, 8000);
        ctx.rotate(-ang);
        ctx.translate(-C.x, -C.y);
        ctx.clip();
        packet(ctx, C.x + ux * s, C.y + uy * s, ang, p.λ, color, 1, LONG);
        ctx.restore();
      } else {
        const a2 = p.dirY < 0 ? -Math.PI / 2 - 0.35 : Math.PI / 2 + 0.35;
        packet(ctx, C.x + Math.cos(a2) * s, C.y + Math.sin(a2) * s, a2, p.λ, color, 1, LONG);
      }
    } else if (p.kind === 'emit') {
      const r = lay.emCol;
      const x1 = r.x - 4;
      const y1 = columnY(r, lambdaToPos(v.axis, Math.min(p.λ, 10000)));
      packet(ctx, C.x + (x1 - C.x) * k, C.y + (y1 - C.y) * k, Math.atan2(y1 - C.y, x1 - C.x), p.λ, color, 1);
    } else if (p.kind === 'free') {
      const r = rMax * (1 + 0.8 * k);
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = c.accent;
      ctx.beginPath();
      ctx.arc(C.x + r * Math.cos(rings.ANG), C.y + r * Math.sin(rings.ANG), 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}
