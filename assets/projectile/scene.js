import { SCALE } from './scales.js';
import { gridSteps, ticks } from '../measure/world-grid.js';
import { formatNumber, decimalsOf } from '../measure/format.js';
import { GROUND, EDGE_PX, TOP_MARGIN, PANEL_GAP } from '../measure/hud-layout.js';

export const BALL_R_PX = 7; // zīmētās bumbiņas rādiuss (neatkarīgs no mēroga)
export const DIM_GAP = 30; // px: h izmēru līnija pa kreisi no sākumpunkta
export const H_LABEL_GAP = 10; // px no h roktura līdz burta “h” labajai malai
export const H_LABEL_PX = 12; // burta “h” platums
export const ARC_R = 56; // px: α loks ap kustības sākumpunktu

export function arrowMaxPx(width, height) {
  return Math.max(60, Math.min(120, 0.25 * Math.min(width, height)));
}

const LADDER = [1, 1.5, 2, 3, 4, 5, 6, 8, 10];

// Mazākais „kāpņu” skaitlis (1; 1,5; 2; 3; 4; 5; 6; 8 × 10ⁿ), kas nav mazāks par v.
export function ladderCeil(v) {
  if (v <= 0) return 0;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of LADDER) if (m * p >= v * (1 - 1e-12)) return Number((m * p).toPrecision(12));
  return 10 * p;
}

// Pasaules laukums: kustības sākumpunkts un visa trajektorija. Tas nav atkarīgs no α (lielākais tālums
// un augstums pa visiem α) un ir noapaļots uz augšu pa kāpnēm, lai rasējuma mala neatklātu tālumu vai
// augstāko punktu, ko skolēns nosaka pats (spec. 2.1). Vertikālajā metienā platums ir divas lentes.
export function sceneBox(s) {
  const sc = SCALE;
  const g = sc.g;
  const v = Math.abs(s.v0);
  const top = s.h + (s.mode === 'horizontal' ? 0 : (v * v) / (2 * g));
  const y1 = Math.max(sc.minView.h, ladderCeil(1.1 * top + 2 * sc.ball.d));
  if (s.mode === 'vertical') return { x0: 0, x1: 2 * tapeGap({ y0: 0, y1 }), y0: 0, y1 };
  const reach = (v / g) * Math.sqrt(v * v + 2 * g * s.h);
  const x1 = Math.max(sc.minView.w, ladderCeil(1.1 * reach + 2 * sc.ball.d));
  return { x0: 0, x1, y0: 0, y1 };
}

// Vertikālajā metienā attālums (m) starp ↑ un ↓ lenti.
export function tapeGap(box) {
  return 0.12 * (box.y1 - box.y0);
}

// Kur bumbiņu zīmē: vertikālajā metienā augšupejošo pa kreisi (x = 0), krītošo pa labi; dati paliek x = 0.
export function displayX(s, box, p) {
  if (s.mode !== 'vertical') return p.x;
  return p.rising || s.v0 <= 0 ? 0 : tapeGap(box);
}

// Zeme zelta griezumā, zīmējums (h uzraksts pa kreisi līdz kastes labajai malai + bumbiņa) precīzi ekrāna vidū;
// ⚙ ZĪMĒJUMS (drawScale) aug uz abām pusēm vienādi, zeme stāv. avoid — MĒRĪJUMI { left, bottom }: tikai ja
// zīmējums to sasniegtu, zīmējums iet zem tā vai sarūk, līdz ir pa kreisi no tā, — kur sanāk lielāks.
export function sceneLayout(width, height, box, { drawScale = 1, avoid = null, topReserve = TOP_MARGIN } = {}) {
  const arrow = arrowMaxPx(width, height);
  const groundY = Math.round(height * GROUND);
  const padL = DIM_GAP + H_LABEL_GAP + H_LABEL_PX;
  const padR = BALL_R_PX + 4;
  const bw = box.x1 - box.x0;
  const bh = box.y1 - box.y0;
  // w — zīmējuma platums; top — zīmējums zem šīs līnijas
  const fitIn = (w, top) => {
    const aw = w - padL - padR;
    const ah = groundY - top - arrow;
    return { ok: aw >= 50 && ah >= 40, s: Math.min(Math.max(50, aw) / bw, Math.max(40, ah) / bh) };
  };
  const better = (a, b) => (b.ok !== a.ok ? (b.ok ? b : a) : b.s > a.s + 1e-9 ? b : a);
  const centred = (sc) => {
    const l = width / 2 - (bw * sc + padL + padR) / 2;
    return { l, r: l + bw * sc + padL + padR };
  };
  let base = fitIn(width - 2 * EDGE_PX, topReserve).s;
  if (avoid) {
    const e = centred(base);
    const top = groundY - bh * base - arrow;
    if (e.r > avoid.left - PANEL_GAP && top < avoid.bottom + PANEL_GAP) {
      const below = fitIn(width - 2 * EDGE_PX, Math.max(topReserve, avoid.bottom + PANEL_GAP));
      const beside = fitIn(2 * (avoid.left - PANEL_GAP) - width, topReserve);
      base = better(below, beside).s;
    }
  }
  const scale = base * drawScale;
  const tx = width / 2 - (box.x0 + box.x1) * scale / 2 - (padR - padL) / 2;
  const tr = { scale, tx, ty: groundY + box.y0 * scale };
  return {
    width,
    height,
    box,
    tr,
    arrow,
    groundY,
    fill: (width - 2 * EDGE_PX - padL - padR) / (bw * base),
    toScreen: (x, y) => ({ x: tr.tx + x * scale, y: tr.ty - y * scale }),
    toWorld: (px, py) => ({ x: (px - tr.tx) / scale, y: (tr.ty - py) / scale }),
  };
}

export function launchPoint(lay, s) {
  return lay.toScreen(0, s.h);
}

export function arrowGeometry(lay, s) {
  const len = (Math.abs(s.v0) / SCALE.v0.max) * lay.arrow;
  if (s.mode === 'vertical') return { len, dir: { x: 0, y: s.v0 < 0 ? 1 : -1 } };
  if (s.mode === 'horizontal') return { len, dir: { x: 1, y: 0 } };
  const a = (s.alphaDeg * Math.PI) / 180;
  return { len, dir: { x: Math.cos(a), y: -Math.sin(a) } };
}

// α loks vismaz 30 px aiz bultas gala, lai α rokturis neaizsegtu v₀ rokturi.
export function arcRadius(len) {
  return Math.max(ARC_R, len + 30);
}

export function handleAnchors(lay, s) {
  const p = launchPoint(lay, s);
  const { len, dir } = arrowGeometry(lay, s);
  const left = lay.toScreen(0, 0).x;
  const a = (s.alphaDeg * Math.PI) / 180;
  const R = arcRadius(len);
  return {
    h: { x: left - DIM_GAP, y: p.y },
    v0: { x: p.x + dir.x * len, y: p.y + dir.y * len },
    alpha: { x: p.x + R * Math.cos(a), y: p.y - R * Math.sin(a) },
  };
}

export function valueFromPointer(kind, lay, s, ptr) {
  const p = launchPoint(lay, s);
  const perPx = SCALE.v0.max / lay.arrow; // v₀ vienības uz pikseli
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

function hits(r, q) {
  return r.l < q.r && r.r > q.l && r.t < q.b && r.b > q.t;
}

// Mērrežģis pasaules vienībās = mērogs; x skaitļi zem zemes, y skaitļi pie labās malas. Skaitli nezīmē,
// ja tā rāmis krustojas ar kādu m.avoidRects taisnstūri vai iziet no audekla.
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
  const u = SCALE.unit;
  const avoid = m.avoidRects ?? [];
  const free = (r) => r.l >= 2 && r.r <= lay.width - 2 && r.t >= 0 && r.b <= lay.height && !avoid.some((q) => hits(r, q));
  ctx.font = FONT_TICK;
  for (const x of xs) {
    const str = formatNumber(x, dec, m.lang);
    const px = lay.toScreen(x, 0).x;
    const half = ctx.measureText(str).width / 2;
    const y = gy + 30;
    if (free({ l: px - half, r: px + half, t: y - 9, b: y + 2 })) text(ctx, str, px, y, { font: FONT_TICK, color: c.inkDim, align: 'center' });
  }
  let topY = null; // augstākā un zemākā redzamā y skaitļa līnija — „y, m” virs augstākā, citādi zem zemākā
  let lowY = null;
  for (const y of ys) {
    if (y <= 0) continue;
    const str = formatNumber(y, dec, m.lang);
    const py = lay.toScreen(0, y).y - 3;
    const w = ctx.measureText(str).width;
    if (py > 26 && free({ l: lay.width - 6 - w, r: lay.width - 6, t: py - 9, b: py + 2 })) {
      text(ctx, str, lay.width - 6, py, { font: FONT_TICK, color: c.inkDim, align: 'right' });
      if (topY === null || py < topY) topY = py;
      if (lowY === null || py > lowY) lowY = py;
    }
  }
  // Mērvienību uzraksti pakļauti tam pašam noteikumam kā skaitļi: nezīmē zem paneļa vai pogas.
  let drawnUnit = false;
  const unit = (str, y, xs0) => {
    drawnUnit = false;
    const w = ctx.measureText(str).width;
    for (const xr of xs0) {
      if (free({ l: xr - w, r: xr, t: y - 9, b: y + 2 })) {
        text(ctx, str, xr, y, { font: FONT_TICK, color: c.inkDim, align: 'right' });
        drawnUnit = true;
        return;
      }
    }
  };
  const rights = [];
  for (let xr = lay.width - 6; xr > 80; xr -= 12) rights.push(xr); // pa kreisi, līdz ir brīva vieta
  unit(`x, ${u}`, gy + 44, rights);
  if (topY !== null) {
    unit(`y, ${u}`, topY - 12, [lay.width - 6]);
    if (!drawnUnit) unit(`y, ${u}`, lowY + 13, [lay.width - 6]);
  }
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

// Vertikālais metiens: blāvas raustītas lentes no zemes līdz kastes augšai; ↑ virs kreisās, ↓ virs labās
// (ja v₀ ≤ 0 — tikai ↓ pie x = 0).
function drawTapes(ctx, lay, m, c) {
  const s = m.settings;
  if (s.mode !== 'vertical') return;
  const up = s.v0 > 0;
  const tapes = up ? [{ x: 0, ch: '↑' }, { x: tapeGap(lay.box), ch: '↓' }] : [{ x: 0, ch: '↓' }];
  const yTop = lay.toScreen(0, lay.box.y1).y;
  const yGround = lay.toScreen(0, 0).y;
  ctx.globalAlpha = 0.6;
  for (const tp of tapes) {
    const x = Math.round(lay.toScreen(tp.x, 0).x) + 0.5;
    stroke(ctx, c.hairline);
    ctx.setLineDash([3, 4]);
    line(ctx, x, yGround, x, yTop);
    ctx.setLineDash([]);
  }
  ctx.globalAlpha = 1;
  for (const tp of tapes) text(ctx, tp.ch, lay.toScreen(tp.x, 0).x, yTop - 4, { color: c.inkDim, align: 'center' });
}

function drawDimH(ctx, lay, m, c) {
  const s = m.settings;
  const left = lay.toScreen(0, 0).x;
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
  const str = m.t(key);
  ctx.font = FONT_LABEL;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '1px';
  const w = ctx.measureText(str).width;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  text(ctx, str, Math.max(4, Math.min(o.x + 4, lay.width - 4 - w)), o.y + 16, { color: c.inkDim, spacing: '1px', bg: c.field });
}

// Katrs vārds savā rindā: pa kreisi no sākumpunkta (zem galda virsmas) vai, ja tur līdz h izmēru
// līnijai nav vietas, pa labi no tā; ja līdz zemei nav vietas — virs sākumpunkta.
function drawLaunchLabel(ctx, lay, m, c) {
  const s = m.settings;
  if (s.h === 0) return;
  const p = launchPoint(lay, s);
  const words = m.t('scene.launch').split(' ');
  ctx.font = FONT_LABEL;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '1px';
  const wMax = Math.max(...words.map((w) => ctx.measureText(w).width));
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  const dimX = lay.toScreen(0, 0).x - DIM_GAP;
  const left = wMax + 4 <= p.x - 8 - (dimX + 8);
  const below = p.y + 14;
  const fits = below + 12 * (words.length - 1) <= lay.toScreen(0, 0).y - 4;
  const y0 = fits ? below : p.y - 10 - 12 * (words.length - 1);
  const x = left ? p.x - 8 : p.x + 8;
  words.forEach((w, i) => text(ctx, w, x, y0 + 12 * i, { color: c.inkDim, align: left ? 'right' : 'left', spacing: '1px', bg: c.field }));
}

function drawVelocity(ctx, lay, m, c) {
  const s = m.settings;
  const p = launchPoint(lay, s);
  const { len, dir } = arrowGeometry(lay, s);
  if (s.mode === 'oblique') {
    const R = arcRadius(len);
    stroke(ctx, c.hairline);
    ctx.setLineDash([4, 4]);
    line(ctx, p.x, p.y, p.x + R + 10, p.y);
    ctx.setLineDash([]);
    stroke(ctx, c.ink);
    ctx.beginPath();
    ctx.arc(p.x, p.y, R, (-s.alphaDeg * Math.PI) / 180, 0);
    ctx.stroke();
  }
  if (len < 1) return;
  stroke(ctx, c.ink);
  ctx.lineWidth = 1.5;
  arrow(ctx, p.x, p.y, p.x + dir.x * len, p.y + dir.y * len, 9);
  ctx.lineWidth = 1;
}

function drawBall(ctx, lay, m, c, pos, hollow) {
  const sc = SCALE;
  const ctr = lay.toScreen(displayX(m.settings, lay.box, pos), pos.y);
  const R = BALL_R_PX;
  ctx.beginPath();
  ctx.arc(ctr.x, ctr.y, R, 0, Math.PI * 2);
  if (hollow) {
    ctx.fillStyle = c.field;
    ctx.fill();
    stroke(ctx, c.ink);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 2]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
    return;
  }
  ctx.fillStyle = c.mat[sc.ball.material];
  ctx.fill();
  stroke(ctx, c.ink);
  ctx.stroke();
}

export function drawScene(ctx, lay, m) {
  const c = m.colors;
  drawWorldGrid(ctx, lay, m, c);
  drawGround(ctx, lay, c);
  drawTapes(ctx, lay, m, c);
  drawDimH(ctx, lay, m, c);
  drawOrigin(ctx, lay, m, c);
  drawLaunchLabel(ctx, lay, m, c);
  drawVelocity(ctx, lay, m, c);
  if (m.ball2) drawBall(ctx, lay, m, c, m.ball2, true);
  drawBall(ctx, lay, m, c, m.ball, false);
}
