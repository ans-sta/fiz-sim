import { SCALES, TABLE_DRAW } from './scales.js';
import { gridSteps, ticks } from '../measure/world-grid.js';
import { formatNumber, decimalsOf } from '../measure/format.js';

export const MARGIN = { left: 130, right: 56, top: 40, bottom: 56 };
export const DIM_GAP = 30; // px: h izmēru līnija pa kreisi no galda vai torņa
export const ARC_R = 56; // px: α loks ap kustības sākumpunktu

export function arrowMaxPx(width, height) {
  return Math.max(60, Math.min(120, 0.25 * Math.min(width, height)));
}

// Pasaules laukums: konstrukcija, kustības sākumpunkts, visa trajektorija un mazākais skats.
export function sceneBox(s, d) {
  const sc = d.sc;
  const x0 = -sc.structureW;
  const x1 = Math.max(x0 + sc.minView.w, d.xLand + 2 * sc.ball.d, 4 * sc.ball.d);
  const y1 = Math.max(sc.minView.h, d.yMax + 2 * sc.ball.d, s.h + 2 * sc.ball.d);
  return { x0, x1, y0: 0, y1 };
}

// Zeme apakšā, konstrukcija pa kreisi; virs laukuma vieta bultai v₀.
export function sceneLayout(width, height, box) {
  const arrow = arrowMaxPx(width, height);
  const top = MARGIN.top + arrow;
  const availW = Math.max(50, width - MARGIN.left - MARGIN.right);
  const availH = Math.max(50, height - top - MARGIN.bottom);
  const scale = Math.min(availW / (box.x1 - box.x0), availH / (box.y1 - box.y0));
  const tr = { scale, tx: MARGIN.left - box.x0 * scale, ty: height - MARGIN.bottom + box.y0 * scale };
  return {
    width,
    height,
    box,
    tr,
    arrow,
    toScreen: (x, y) => ({ x: tr.tx + x * scale, y: tr.ty - y * scale }),
    toWorld: (px, py) => ({ x: (px - tr.tx) / scale, y: (tr.ty - py) / scale }),
  };
}

export function launchPoint(lay, s) {
  return lay.toScreen(0, s.h);
}

export function arrowGeometry(lay, s) {
  const len = (Math.abs(s.v0) / SCALES[s.scale].v0.max) * lay.arrow;
  if (s.mode === 'vertical') return { len, dir: { x: 0, y: s.v0 < 0 ? 1 : -1 } };
  if (s.mode === 'horizontal') return { len, dir: { x: 1, y: 0 } };
  const a = (s.alphaDeg * Math.PI) / 180;
  return { len, dir: { x: Math.cos(a), y: -Math.sin(a) } };
}

export function handleAnchors(lay, s) {
  const p = launchPoint(lay, s);
  const { len, dir } = arrowGeometry(lay, s);
  const left = lay.toScreen(-SCALES[s.scale].structureW, 0).x;
  const a = (s.alphaDeg * Math.PI) / 180;
  return {
    h: { x: left - DIM_GAP, y: p.y },
    v0: { x: p.x + dir.x * len, y: p.y + dir.y * len },
    alpha: { x: p.x + ARC_R * Math.cos(a), y: p.y - ARC_R * Math.sin(a) },
  };
}

export function valueFromPointer(kind, lay, s, ptr) {
  const p = launchPoint(lay, s);
  const perPx = SCALES[s.scale].v0.max / lay.arrow; // v₀ vienības uz pikseli
  switch (kind) {
    case 'h':
      return lay.toWorld(ptr.x, ptr.y).y;
    case 'v0':
      if (s.mode === 'vertical') return (p.y - ptr.y) * perPx;
      if (s.mode === 'horizontal') return (ptr.x - p.x) * perPx;
      return Math.hypot(ptr.x - p.x, ptr.y - p.y) * perPx;
    case 'alpha':
      return (Math.atan2(p.y - ptr.y, ptr.x - p.x) * 180) / Math.PI;
    default:
      return NaN;
  }
}

// ── Zīmēšana ─────────────────────────────────────────────

const MONO = 'ui-monospace, monospace';
const FONT_LABEL = `400 10px "IBM Plex Mono", ${MONO}`;
const FONT_TICK = `400 9px "IBM Plex Mono", ${MONO}`;

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function stroke(ctx, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
}

function text(ctx, str, x, y, { font = FONT_LABEL, color, align = 'left', spacing = '0px', bg } = {}) {
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  if ('letterSpacing' in ctx) ctx.letterSpacing = spacing;
  if (bg) {
    const w = ctx.measureText(str).width;
    const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    ctx.fillStyle = bg;
    ctx.fillRect(x0 - 2, y - 10, w + 4, 13);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
}

function arrow(ctx, x1, y1, x2, y2, head) {
  line(ctx, x1, y1, x2, y2);
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(a - 0.4), y2 - head * Math.sin(a - 0.4));
  ctx.lineTo(x2 - head * Math.cos(a + 0.4), y2 - head * Math.sin(a + 0.4));
  ctx.closePath();
  ctx.fill();
}

function hatchRect(ctx, x, y, w, h, color, step = 8) {
  if (w <= 0 || h <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  stroke(ctx, color);
  ctx.beginPath();
  for (let k = -h; k < w; k += step) {
    ctx.moveTo(x + k, y + h);
    ctx.lineTo(x + k + h, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawPaper(ctx, lay, c) {
  ctx.fillStyle = c.field;
  ctx.fillRect(0, 0, lay.width, lay.height);
  stroke(ctx, c.hairline);
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  for (let x = 0.5; x < lay.width; x += 24) { ctx.moveTo(x, 0); ctx.lineTo(x, lay.height); }
  for (let y = 0.5; y < lay.height; y += 24) { ctx.moveTo(0, y); ctx.lineTo(lay.width, y); }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// Mērrežģis pasaules vienībās; x skaitļi zem zemes, y skaitļi pie labās malas.
function drawWorldGrid(ctx, lay, m, c) {
  ctx.fillStyle = c.field;
  ctx.fillRect(0, 0, lay.width, lay.height);
  const { label, minor } = gridSteps(lay.tr.scale);
  const tl = lay.toWorld(0, 0);
  const br = lay.toWorld(lay.width, lay.height);
  const gy = lay.toScreen(0, 0).y;
  const vLines = (xs) => xs.forEach((x) => { const px = Math.round(lay.toScreen(x, 0).x) + 0.5; ctx.moveTo(px, 0); ctx.lineTo(px, gy); });
  const hLines = (ys) => ys.forEach((y) => { const py = Math.round(lay.toScreen(0, y).y) + 0.5; ctx.moveTo(0, py); ctx.lineTo(lay.width, py); });
  stroke(ctx, c.hairline);
  if (minor) {
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    vLines(ticks(tl.x, br.x, minor));
    hLines(ticks(0, tl.y, minor));
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  const xs = ticks(tl.x, br.x, label);
  const ys = ticks(0, tl.y, label);
  ctx.beginPath();
  vLines(xs);
  hLines(ys);
  ctx.stroke();
  const dec = decimalsOf(label);
  const u = m.derived.sc.unit;
  for (const x of xs) text(ctx, formatNumber(x, dec, m.lang), lay.toScreen(x, 0).x, gy + 30, { font: FONT_TICK, color: c.inkDim, align: 'center' });
  for (const y of ys) if (y > 0) text(ctx, formatNumber(y, dec, m.lang), lay.width - 6, lay.toScreen(0, y).y - 3, { font: FONT_TICK, color: c.inkDim, align: 'right' });
  text(ctx, `x, ${u}`, lay.width - 6, gy + 44, { font: FONT_TICK, color: c.inkDim, align: 'right' });
  text(ctx, `y, ${u}`, lay.width - 6, 14, { font: FONT_TICK, color: c.inkDim, align: 'right' });
}

function drawGround(ctx, lay, c) {
  const y = Math.round(lay.toScreen(0, 0).y) + 0.5;
  stroke(ctx, c.ink);
  line(ctx, 0, y, lay.width, y);
  stroke(ctx, c.hairline);
  ctx.beginPath();
  for (let x = 4; x < lay.width; x += 8) {
    ctx.moveTo(x, y + 8);
    ctx.lineTo(x + 8, y);
  }
  ctx.stroke();
}

// Galds vai tornis; augšējā virsma — zem bumbiņas (x, y ir bumbiņas centrs).
function drawStructure(ctx, lay, m, c) {
  const s = m.settings;
  const sc = m.derived.sc;
  const top = s.h - sc.ball.d / 2;
  if (top <= 0) return;
  const rect = (x0, y0, x1, y1) => {
    const a = lay.toScreen(x0, y1);
    const b = lay.toScreen(x1, y0);
    return { x: Math.round(a.x) + 0.5, y: Math.round(a.y) + 0.5, w: Math.round(b.x - a.x), h: Math.round(b.y - a.y) };
  };
  if (s.scale === 'tower') {
    const r = rect(-sc.structureW, 0, 0, top);
    hatchRect(ctx, r.x, r.y, r.w, r.h, c.hairline);
    stroke(ctx, c.ink);
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    return;
  }
  const slab = Math.min(TABLE_DRAW.slab, top);
  const parts = [
    rect(-sc.structureW, top - slab, 0, top),
    rect(-sc.structureW + TABLE_DRAW.leg, 0, -sc.structureW + 2 * TABLE_DRAW.leg, top - slab),
    rect(-2 * TABLE_DRAW.leg, 0, -TABLE_DRAW.leg, top - slab),
  ];
  for (const r of parts) {
    if (r.w <= 0 || r.h <= 0) continue;
    ctx.fillStyle = c.sheet;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    stroke(ctx, c.ink);
    ctx.strokeRect(r.x, r.y, r.w, r.h);
  }
}

function drawDimH(ctx, lay, m, c) {
  const s = m.settings;
  const left = lay.toScreen(-m.derived.sc.structureW, 0).x;
  const x = Math.round(left - DIM_GAP) + 0.5;
  const yTop = Math.round(lay.toScreen(0, s.h).y) + 0.5;
  const yLow = Math.round(lay.toScreen(0, 0).y) + 0.5;
  stroke(ctx, c.ink);
  line(ctx, x, yLow, x, yTop);
  line(ctx, x - 3, yLow + 3, x + 3, yLow - 3);
  line(ctx, x - 3, yTop + 3, x + 3, yTop - 3);
  stroke(ctx, c.hairline);
  ctx.setLineDash([4, 4]);
  line(ctx, x - 4, yTop, launchPoint(lay, s).x, yTop);
  ctx.setLineDash([]);
}

function drawOrigin(ctx, lay, m, c) {
  const o = lay.toScreen(0, 0);
  stroke(ctx, c.inkDim);
  arrow(ctx, o.x, o.y, o.x + 36, o.y, 6);
  arrow(ctx, o.x, o.y, o.x, o.y - 36, 6);
  text(ctx, 'x', o.x + 40, o.y - 4, { color: c.inkDim });
  text(ctx, 'y', o.x + 5, o.y - 40, { color: c.inkDim });
  const key = m.settings.h === 0 ? 'scene.originLaunch' : 'scene.origin';
  text(ctx, m.t(key), o.x + 4, o.y + 16, { color: c.inkDim, bg: c.field });
}

function drawLaunchLabel(ctx, lay, m, c) {
  if (m.settings.h === 0) return;
  const p = launchPoint(lay, m.settings);
  text(ctx, m.t('scene.launch'), p.x - 8, p.y + 28, { color: c.inkDim, align: 'right', spacing: '1px', bg: c.field }); // zem galda virsmas
}

function drawVelocity(ctx, lay, m, c) {
  const s = m.settings;
  const p = launchPoint(lay, s);
  if (s.mode === 'oblique') {
    stroke(ctx, c.hairline);
    ctx.setLineDash([4, 4]);
    line(ctx, p.x, p.y, p.x + ARC_R + 10, p.y);
    ctx.setLineDash([]);
    stroke(ctx, c.ink);
    ctx.beginPath();
    ctx.arc(p.x, p.y, ARC_R, (-s.alphaDeg * Math.PI) / 180, 0);
    ctx.stroke();
  }
  const { len, dir } = arrowGeometry(lay, s);
  if (len < 1) return;
  stroke(ctx, c.ink);
  ctx.lineWidth = 1.5;
  arrow(ctx, p.x, p.y, p.x + dir.x * len, p.y + dir.y * len, 9);
  ctx.lineWidth = 1;
}

function drawBall(ctx, lay, m, c, pos, hollow) {
  const sc = m.derived.sc;
  const ctr = lay.toScreen(pos.x, pos.y);
  const R = Math.max(3, (sc.ball.d / 2) * lay.tr.scale);
  ctx.beginPath();
  ctx.arc(ctr.x, ctr.y, R, 0, Math.PI * 2);
  if (hollow) {
    ctx.fillStyle = c.field;
    ctx.fill();
    stroke(ctx, c.inkDim);
    ctx.setLineDash([3, 2]);
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }
  ctx.fillStyle = c.mat[sc.ball.material];
  ctx.fill();
  stroke(ctx, c.ink);
  ctx.stroke();
}

export function drawScene(ctx, lay, m) {
  const c = m.colors;
  if (m.showGrid) drawWorldGrid(ctx, lay, m, c);
  else drawPaper(ctx, lay, c);
  drawGround(ctx, lay, c);
  drawStructure(ctx, lay, m, c);
  drawDimH(ctx, lay, m, c);
  drawOrigin(ctx, lay, m, c);
  drawLaunchLabel(ctx, lay, m, c);
  drawVelocity(ctx, lay, m, c);
  if (m.ball2) drawBall(ctx, lay, m, c, m.ball2, true);
  drawBall(ctx, lay, m, c, m.ball, false);
}
