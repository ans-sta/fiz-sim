export const MARGIN = { left: 48, right: 48 }; // vieta h izmēru līnijai pa kreisi un renītes galam pa labi
export const GROUND = 0.618; // zemes (galda) līnija zelta griezumā no rasējuma augšas (spec. izkārtojums 2.1)
export const ABOVE_PX = 34; // virs L izmēru līnijas: DIM_GAP + rombiņš
export const PANEL_GAP = 12; // px starp paneli un konstrukciju
const BALL_ROOM = { left: 34, right: 12 }; // px aiz zīmētās lodītes: pa kreisi vēl h līnija ar etiķeti

// Vieta renītes galos: MARGIN vai, lielai zīmētai lodītei (rādiuss R px), R + BALL_ROOM.
function sideRoom(R) {
  return { left: Math.max(MARGIN.left, R + BALL_ROOM.left), right: Math.max(MARGIN.right, R + BALL_ROOM.right) };
}

// h izmēru līnija pa kreisi no renītes gala — tālāk par zīmēto lodīti, lai rokturis nav zem tās.
function hDimGap(lay, derived) {
  return Math.max(DIM_GAP, ballDraw(lay, derived).R + 10);
}
export const GROOVE_PX = 14; // renītes biezums zīmējumā
export const DIM_GAP = 26; // px starp objektu un izmēru līniju
export const ARC_R = 110; // px — α loka rādiuss
// vārtu rokturis tieši zem renītes: rombiņš paliek virs palaišanas pogas (tā ir 14 px zem zemes)
export const GATE_HANDLE = GROOVE_PX + 6;

// Cik cm virs renītes vajag konstrukcijai (vārtu galotnes, lodīte): ≥ 5 cm, lielai lodītei, kas zīmēta 2× lielāka, — vairāk.
export function headroomCm(derived) {
  return Math.max(5, 2 * (derived.rEff + derived.r) + 0.8);
}

// Renīte: zeme zelta griezumā; renīte ietilpst platumā un starp augšējiem paneļiem un zemi, centrēta; tad × ⚙ ZĪMĒJUMS.
// topReserve — konstrukcija zem šīs līnijas. panels — { left: { right, bottom }, right: { left, bottom } }:
// konstrukcija iet zem abiem paneļiem vai blakus vienam no tiem — kur zīmējums sanāk lielāks (zems ekrāns).
// fit — mērogs velkot nemainās.
export function sceneLayout(width, height, geo, fit = geo, { topReserve = 0, drawScale = 1, panels = null } = {}) {
  const tableY = Math.round(height * GROUND);
  const lowY = tableY - GROOVE_PX;
  const above = fit.above ?? 5;
  const lc = fit.L * Math.cos(fit.alphaRad);
  const a = fit.ballCm ?? 0; // zīmētās lodītes rādiuss, cm (2 r)
  const fitIn = (x0, x1, top) => {
    const w = Math.max(50 + MARGIN.left + MARGIN.right, x1 - x0);
    const availH = Math.max(40, lowY - top - ABOVE_PX);
    // platums: L·cos α·s + sideRoom(s) ≤ w (abi gali — lodīte un h izmēru līnija ar etiķeti)
    const sw = Math.min((w - MARGIN.left - MARGIN.right) / lc, (w - MARGIN.right - BALL_ROOM.left) / (lc + a), (w - BALL_ROOM.left - BALL_ROOM.right) / (lc + 2 * a));
    return { x0, w, s: Math.min(60, sw, availH / (fit.L * Math.sin(fit.alphaRad) + above)) };
  };
  let box = fitIn(0, width, topReserve);
  if (panels) {
    const { left: pl, right: pr } = panels;
    box = [
      fitIn(0, width, Math.max(pl.bottom, pr.bottom) + PANEL_GAP),
      fitIn(pl.right + PANEL_GAP, width, pr.bottom + PANEL_GAP),
      fitIn(0, pr.left - PANEL_GAP, pl.bottom + PANEL_GAP),
    ].reduce((a, b) => (b.s > a.s + 1e-9 ? b : a));
  }
  const s = box.s * drawScale;
  const cos = Math.cos(geo.alphaRad);
  const sin = Math.sin(geo.alphaRad);
  const room = sideRoom(a * s);
  const left = box.x0 + room.left + (box.w - room.left - room.right - lc * s) / 2;
  const low = { x: left + geo.L * cos * s, y: lowY };
  const high = { x: left, y: low.y - geo.L * sin * s };
  const dir = { x: cos, y: sin };
  const up = { x: sin, y: -cos };
  return {
    s, width, height, high, low, dir, up,
    tableY,
    at: (x) => ({ x: high.x + dir.x * x * s, y: high.y + dir.y * x * s }),
    along: (px, py) => ((px - high.x) * dir.x + (py - high.y) * dir.y) / s,
  };
}

export function ballCenter(lay, x, rEff) {
  const p = lay.at(x);
  return { x: p.x + lay.up.x * rEff * lay.s, y: p.y + lay.up.y * rEff * lay.s };
}

// Zīmētā lodīte (spec. izkārtojums 2.3): 2× lielāka nekā mērogā (vismaz 6 px), guļ renītē tāpat kā īstā.
// Dati attiecas uz tās centru — tas ir tajā pašā x.
export function ballDraw(lay, derived) {
  const R = Math.max(6, 2 * derived.r * lay.s);
  return { R, lift: derived.rEff * lay.s * (R / (derived.r * lay.s)) };
}

export function ballDrawCenter(lay, x, derived) {
  const p = lay.at(x);
  const { lift } = ballDraw(lay, derived);
  return { x: p.x + lay.up.x * lift, y: p.y + lay.up.y * lift };
}

// Zīmētās lodītes augša virs renītes līnijas, px.
function ballTop(lay, derived) {
  const b = ballDraw(lay, derived);
  return b.lift + b.R;
}

// Izmēru līnija L ir paralēla renītei, virs augstākās vārtu galotnes un zīmētās lodītes.
function dimOffsetL(lay, derived) {
  return Math.max(5 * lay.s, ballTop(lay, derived) + 0.8 * lay.s) + DIM_GAP;
}

export function handleAnchors(lay, settings, derived) {
  const off = dimOffsetL(lay, derived);
  const endL = lay.at(settings.L);
  const arcAngle = Math.PI + derived.alphaRad;
  return {
    L: { x: endL.x + lay.up.x * off, y: endL.y + lay.up.y * off },
    h: { x: lay.high.x - hDimGap(lay, derived), y: lay.high.y },
    alpha: { x: lay.low.x + ARC_R * Math.cos(arcAngle), y: lay.low.y + ARC_R * Math.sin(arcAngle) },
    x0: ballDrawCenter(lay, settings.x0, derived),
    gates: settings.gates.map((x) => {
      const p = lay.at(x);
      return { x: p.x - lay.up.x * GATE_HANDLE, y: p.y - lay.up.y * GATE_HANDLE };
    }),
  };
}

export function valueFromPointer(kind, lay, p) {
  switch (kind) {
    case 'h':
      return (lay.low.y - p.y) / lay.s;
    case 'alpha':
      return (Math.atan2(lay.low.y - p.y, lay.low.x - p.x) * 180) / Math.PI;
    default: // 'L', 'x0', 'gate' — projekcija uz renītes līniju
      return lay.along(p.x, p.y);
  }
}

// ── Zīmēšana ─────────────────────────────────────────────

const MONO = 'ui-monospace, monospace';
const FONT_LABEL = `400 10px "IBM Plex Mono", ${MONO}`;
const FONT_TAPE = `400 9px "IBM Plex Mono", ${MONO}`;
const TAPE_TEXT_Y = 13; // numuru pamatlīnija zem renītes augšējās malas

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

function text(ctx, str, x, y, { font = FONT_LABEL, color, align = 'left', spacing = '0px' } = {}) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  if ('letterSpacing' in ctx) ctx.letterSpacing = spacing;
  ctx.fillText(str, x, y);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
}

// 45° svītrojums taisnstūrī (griezuma / zemes simbols)
function hatchRect(ctx, x, y, w, h, color, step = 6) {
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

function tick45(ctx, p, lay, len) {
  const k = len / 2 / Math.SQRT2;
  const tx = lay.dir.x + lay.up.x;
  const ty = lay.dir.y + lay.up.y;
  line(ctx, p.x - tx * k, p.y - ty * k, p.x + tx * k, p.y + ty * k);
}

function drawGrid(ctx, lay, c) {
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

function drawTable(ctx, lay, c) {
  const y = Math.round(lay.tableY) + 0.5;
  const x1 = lay.high.x - 40;
  const x2 = lay.width - 12;
  stroke(ctx, c.ink);
  line(ctx, x1, y, x2, y);
  stroke(ctx, c.hairline);
  ctx.beginPath();
  for (let x = x1 + 4; x < x2; x += 8) {
    ctx.moveTo(x, y + 8);
    ctx.lineTo(x + 8, y);
  }
  ctx.stroke();
}

function drawSupport(ctx, lay, c) {
  const top = lay.high.y + GROOVE_PX;
  const h = lay.tableY - top;
  if (h < 2) return;
  const x = Math.round(lay.high.x);
  hatchRect(ctx, x, top, 18, h, c.hairline);
  stroke(ctx, c.ink);
  ctx.strokeRect(x + 0.5, Math.round(top) + 0.5, 18, h);
}

function drawGroove(ctx, lay, m, c) {
  const { up } = lay;
  const L = m.settings.L;
  const p0 = lay.at(0);
  const p1 = lay.at(L);
  const g = GROOVE_PX;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.lineTo(p1.x - up.x * g, p1.y - up.y * g);
  ctx.lineTo(p0.x - up.x * g, p0.y - up.y * g);
  ctx.closePath();
  ctx.fillStyle = c.sheet;
  ctx.fill();
  stroke(ctx, c.ink);
  ctx.stroke();
  // gala atbalsts: 3 px × (lodītes Ø + 4 px)
  const hgt = 2 * m.derived.r * lay.s + 4;
  const a = { x: p1.x - lay.dir.x * 3, y: p1.y - lay.dir.y * 3 };
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(a.x, a.y);
  ctx.lineTo(a.x + up.x * hgt, a.y + up.y * hgt);
  ctx.lineTo(p1.x + up.x * hgt, p1.y + up.y * hgt);
  ctx.closePath();
  ctx.fillStyle = c.sheet;
  ctx.fill();
  stroke(ctx, c.ink);
  ctx.stroke();
}

function labelAt(ctx, lay, x, offsetPx, str, opts, bg) {
  const p = lay.at(x);
  const o = GROOVE_PX + offsetPx;
  ctx.save();
  ctx.translate(p.x - lay.up.x * o, p.y - lay.up.y * o);
  ctx.rotate(Math.atan2(lay.dir.y, lay.dir.x));
  if (bg) {
    ctx.font = opts.font ?? FONT_LABEL;
    if ('letterSpacing' in ctx) ctx.letterSpacing = opts.spacing ?? '0px';
    const w = ctx.measureText(str).width;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    const x0 = opts.align === 'center' ? -w / 2 : 0;
    ctx.fillStyle = bg;
    ctx.fillRect(x0 - 2, -10, w + 4, 13);
  }
  text(ctx, str, 0, 0, opts);
  ctx.restore();
}

function drawTape(ctx, lay, m, c) {
  if (!m.showTape) return;
  const L = m.settings.L;
  const s = lay.s;
  stroke(ctx, c.ink);
  ctx.beginPath();
  const tickAt = (x, len) => {
    const p = lay.at(x);
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - lay.up.x * len, p.y - lay.up.y * len);
  };
  if (s >= 30) {
    for (let i = 0; i <= L * 10; i++) if (i % 10) tickAt(i / 10, 1.5);
  }
  for (let cm = 0; cm <= L; cm++) {
    tickAt(cm, cm % 10 === 0 ? 7 : cm % 5 === 0 ? 5 : 3);
  }
  ctx.stroke();
  const spacing = [5, 10, 20, 50].find((sp) => sp * s >= 32) ?? 50;
  const opts = { font: FONT_TAPE, color: c.inkDim, align: 'center' };
  for (let x = spacing; x <= L; x += spacing) {
    labelAt(ctx, lay, x, TAPE_TEXT_Y - GROOVE_PX, String(x), opts);
  }
  labelAt(ctx, lay, 2 / s, TAPE_TEXT_Y - GROOVE_PX, '0', { ...opts, align: 'left' });
  // "x = 0" zem galda līnijas, zemes svītrojuma laukā
  const ox = Math.round(lay.high.x);
  const oy = Math.round(lay.tableY) + 16;
  ctx.font = FONT_LABEL;
  const w = ctx.measureText(m.t('scene.origin')).width;
  ctx.fillStyle = c.field;
  ctx.fillRect(ox - 2, oy - 10, w + 4, 13);
  text(ctx, m.t('scene.origin'), ox, oy, { color: c.inkDim });
}

function drawDimL(ctx, lay, m, c) {
  const L = m.settings.L;
  const off = dimOffsetL(lay, m.derived);
  const { up } = lay;
  const a = lay.at(0);
  const b = lay.at(L);
  const pa = { x: a.x + up.x * off, y: a.y + up.y * off };
  const pb = { x: b.x + up.x * off, y: b.y + up.y * off };
  stroke(ctx, c.ink);
  line(ctx, pa.x, pa.y, pb.x, pb.y);
  line(ctx, a.x, a.y, a.x + up.x * (off + 4), a.y + up.y * (off + 4));
  line(ctx, b.x, b.y, b.x + up.x * (off + 4), b.y + up.y * (off + 4));
  tick45(ctx, pa, lay, 6);
  tick45(ctx, pb, lay, 6);
}

function drawDimH(ctx, lay, m, c) {
  const x = Math.round(lay.high.x - hDimGap(lay, m.derived)) + 0.5;
  const yTop = lay.high.y;
  const yLow = Math.round(lay.low.y) + 0.5;
  stroke(ctx, m.settings.angleMode === 'alpha' ? c.inkDim : c.ink);
  line(ctx, x, yLow, x, yTop);
  line(ctx, lay.high.x, Math.round(yTop) + 0.5, x - 4, Math.round(yTop) + 0.5);
  line(ctx, x - 3, yLow + 3, x + 3, yLow - 3);
  line(ctx, x - 3, yTop + 3, x + 3, yTop - 3);
  ctx.setLineDash([4, 4]);
  stroke(ctx, c.hairline);
  ctx.setLineDash([4, 4]);
  line(ctx, x - 4, yLow, lay.low.x, yLow);
  ctx.setLineDash([]);
}

function drawAngle(ctx, lay, m, c) {
  stroke(ctx, m.settings.angleMode === 'h' ? c.inkDim : c.ink);
  const y = Math.round(lay.low.y) + 0.5;
  line(ctx, lay.low.x - ARC_R - 8, y, lay.low.x, y);
  ctx.beginPath();
  ctx.arc(lay.low.x, lay.low.y, ARC_R, Math.PI, Math.PI + m.derived.alphaRad);
  ctx.stroke();
}

function drawLevel1(ctx, lay, m, c) {
  const { settings: s, derived: d } = m;
  const flagH = Math.min(ballTop(lay, d) + 28, dimOffsetL(lay, d) - 14);
  [[s.x0, 'scene.start'], [d.xf, 'scene.finish']].forEach(([x, key]) => {
    const p = lay.at(x);
    const tx = p.x + lay.up.x * flagH;
    const ty = p.y + lay.up.y * flagH;
    stroke(ctx, c.ink);
    line(ctx, p.x, p.y, tx, ty);
    const str = m.t(key);
    ctx.font = FONT_LABEL;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '1px';
    const w = ctx.measureText(str).width;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.fillStyle = c.field;
    ctx.fillRect(tx + 3, ty - 2, w + 4, 13);
    text(ctx, str, tx + 5, ty + 8, { color: c.inkDim, spacing: '1px' });
  });
  // hronometra laiks ir MĒRĪJUMOS (spec. izkārtojums 4)
}

function drawLevel2(ctx, lay, m, c) {
  const { settings: s, derived: d } = m;
  const { up } = lay;
  // vārtu laiki ir MĒRĪJUMOS (spec. izkārtojums 4); rasējumā — vārti un to numuri
  s.gates.forEach((x, i) => {
    const p = lay.at(x);
    const gate = s.timer === 'gate';
    const top = gate ? ballTop(lay, d) + 0.8 * lay.s : 16;
    stroke(ctx, c.ink);
    const tx = p.x + up.x * top;
    const ty = p.y + up.y * top;
    line(ctx, p.x - up.x * GATE_HANDLE, p.y - up.y * GATE_HANDLE, tx, ty);
    if (gate) {
      ctx.strokeRect(Math.round(tx) - 2.5, Math.round(ty) - 2.5, 6, 6);
    } else {
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + lay.dir.x * 7 + up.x * -3, ty + lay.dir.y * 7 + up.y * -3);
      ctx.lineTo(tx + lay.dir.x * 0 + up.x * -6, ty + lay.dir.y * 0 + up.y * -6);
      ctx.closePath();
      ctx.fill();
    }
    const nx = tx + up.x * 12;
    const ny = ty + up.y * 12;
    text(ctx, String(i + 1), nx, ny + 3, { color: c.inkDim, align: 'center' });
  });
}

function drawBall(ctx, lay, m, c) {
  const { derived: d } = m;
  const ctr = ballDrawCenter(lay, m.ballX, d);
  const { R } = ballDraw(lay, d);
  ctx.beginPath();
  ctx.arc(ctr.x, ctr.y, R, 0, Math.PI * 2);
  ctx.fillStyle = d.ball.hollow ? c.field : c.mat[d.ball.material];
  ctx.fill();
  stroke(ctx, c.ink);
  ctx.stroke();
  if (d.ball.hollow) {
    stroke(ctx, c.mat.celluloid);
    ctx.beginPath();
    ctx.arc(ctr.x, ctr.y, R * 0.85, 0, Math.PI * 2);
    ctx.stroke();
  }
  stroke(ctx, c.ink);
  line(ctx, ctr.x, ctr.y, ctr.x + Math.cos(m.ballAngle) * R * 0.8, ctr.y + Math.sin(m.ballAngle) * R * 0.8);
}

export function drawScene(ctx, lay, m) {
  const c = m.colors;
  drawGrid(ctx, lay, c);
  drawTable(ctx, lay, c);
  drawSupport(ctx, lay, c);
  drawGroove(ctx, lay, m, c);
  drawTape(ctx, lay, m, c);
  drawDimL(ctx, lay, m, c);
  drawDimH(ctx, lay, m, c);
  drawAngle(ctx, lay, m, c);
  if (m.settings.level === 1) drawLevel1(ctx, lay, m, c);
  if (m.settings.level === 2) drawLevel2(ctx, lay, m, c);
  drawBall(ctx, lay, m, c);
}
