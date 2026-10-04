import { SCALE } from './scales.js';
import { gridSteps, ticks } from '../measure/world-grid.js';
import { toScreen } from '../measure/zoom-pan.js';
import { openStrobeShell, exportSizeFor, canvasToPNG, EXPORT_MAX_AREA } from '../measure/strobe-view.js';
import { formatNumber, decimalsOf } from '../measure/format.js';
import { tableModel } from './results.js';
import { sceneBox, tapeGap, displayX } from './scene.js';

export const MARGIN_PX = 40;
export const EXPORT_MIN_W = 1600; // px — lai paraksts PNG attēlā ietilpst dažās rindās
const EXPORT_FS = 2.2;
const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const SANS = "'IBM Plex Sans', system-ui, sans-serif";

// Kur zīmēt katru zibsni. Vertikālajā sviedienā augšupejošie zibsņi iet uz ↑ lenti (x = 0), krītošie uz ↓ lenti;
// nobīde ir tikai attēlā, dati paliek x = 0.
export function strobePoints(run, settings) {
  const vertical = settings.mode === 'vertical';
  const box = sceneBox(settings);
  const gap = tapeGap(box);
  const tapes = !vertical ? null : settings.v0 > 0 ? { up: 0, down: gap } : { up: null, down: 0 };
  return {
    main: run.strobe.map((p) => ({ n: p.n, x: vertical ? displayX(settings, box, p) : p.x, y: p.y })),
    second: run.strobe2 ? run.strobe2.map((p) => ({ n: p.n, x: p.x, y: p.y })) : [],
    tapes,
  };
}

export function strobeWorldBox(settings, points) {
  const sc = SCALE;
  const all = [...points.main, ...points.second];
  if (points.tapes) for (const x of [points.tapes.up, points.tapes.down]) if (x !== null) all.push({ x, y: 0 });
  const pad = Math.max(2 * sc.ball.d, 0.05 * sc.minView.w);
  return {
    x0: Math.min(...all.map((p) => p.x)) - pad,
    x1: Math.max(...all.map((p) => p.x)) + pad,
    y0: -pad,
    y1: Math.max(settings.h, ...all.map((p) => p.y)) + pad,
  };
}

export function exportOptions(sc) {
  return { pref: sc.exportPx.pref, min: sc.exportPx.min, extraW: 2 * MARGIN_PX };
}

function wrapWords(ctx, textStr, maxW) {
  const words = textStr.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (line && ctx.measureText(next).width > maxW) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

// Paraksta rindas, aplauztas platumā width, un to augstums (arī virsraksta rinda tiek aplauzta).
export function captionLayout(ctx, lines, width, fs) {
  const pad = 8 * fs;
  const maxW = Math.max(200 * fs, width - 2 * pad);
  ctx.font = `600 ${12 * fs}px ${MONO}`;
  const head = wrapWords(ctx, lines[0], maxW);
  const headW = Math.max(...head.map((l) => ctx.measureText(l).width));
  ctx.font = `${11 * fs}px ${SANS}`;
  const rest = lines.slice(1).flatMap((ln) => wrapWords(ctx, ln, maxW));
  const restW = Math.max(0, ...rest.map((l) => ctx.measureText(l).width));
  const lineH = 16 * fs;
  return {
    head, rest, pad, lineH,
    width: Math.min(width, Math.max(headW, restW) + 2 * pad),
    height: pad + lineH * (head.length + rest.length) + pad / 2,
  };
}

function drawCaption(ctx, cap, c, fs) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = c.field;
  ctx.fillRect(0, 0, cap.width, cap.height);
  ctx.fillStyle = c.ink;
  ctx.font = `600 ${12 * fs}px ${MONO}`;
  cap.head.forEach((l, i) => ctx.fillText(l, cap.pad, cap.pad + cap.lineH * i));
  ctx.fillStyle = c.inkDim;
  ctx.font = `${11 * fs}px ${SANS}`;
  cap.rest.forEach((l, i) => ctx.fillText(l, cap.pad, cap.pad + cap.lineH * (cap.head.length + i)));
}

function labelBox(ctx, str, x, y, align, c, fs) {
  const w = ctx.measureText(str).width;
  const x0 = align === 'center' ? x - w / 2 : x;
  ctx.fillStyle = c.field;
  ctx.fillRect(x0 - 2 * fs, y - 10 * fs, w + 4 * fs, 13 * fs);
  ctx.fillStyle = c.inkDim;
  ctx.textAlign = align;
  ctx.fillText(str, x, y);
}

// Mērrežģis; skaitļi paliek redzami arī tuvinot: y — pie kreisās malas, x — zem zemes vai pie apakšas.
function drawGrid(ctx, o, fs) {
  const { tr, colors: c, width, height, settings: s } = o;
  const vertical = s.mode === 'vertical';
  const { label, minor } = gridSteps(tr.scale, { labelPx: 40 * fs, minorPx: 6 * fs });
  const xLo = (0 - tr.tx) / tr.scale;
  const xHi = (width - tr.tx) / tr.scale;
  const yHi = tr.ty / tr.scale;
  const yLo = Math.max(0, (tr.ty - height) / tr.scale);
  const gy = Math.min(height, tr.ty);
  ctx.strokeStyle = c.hairline;
  ctx.lineWidth = fs;
  const lines = (step) => {
    ctx.beginPath();
    if (!vertical) for (const x of ticks(xLo, xHi, step)) { const px = Math.round(tr.tx + x * tr.scale) + 0.5; ctx.moveTo(px, 0); ctx.lineTo(px, gy); }
    for (const y of ticks(yLo, yHi, step)) { const py = Math.round(tr.ty - y * tr.scale) + 0.5; ctx.moveTo(0, py); ctx.lineTo(width, py); }
    ctx.stroke();
  };
  if (minor) {
    ctx.globalAlpha = 0.4;
    lines(minor);
    ctx.globalAlpha = 1;
  }
  lines(label);
  const dec = decimalsOf(label);
  ctx.font = `${10 * fs}px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  for (const y of ticks(yLo, yHi, label)) {
    if (y <= 0) continue;
    labelBox(ctx, formatNumber(y, dec, o.lang), 4 * fs, tr.ty - y * tr.scale - 3 * fs, 'left', c, fs);
  }
  if (!vertical) {
    const ly = Math.min(Math.max(gy + 16 * fs, 14 * fs), height - 4 * fs);
    for (const x of ticks(xLo, xHi, label)) labelBox(ctx, formatNumber(x, dec, o.lang), tr.tx + x * tr.scale, ly, 'center', c, fs);
  }
  labelBox(ctx, o.unit, 4 * fs, height - 6 * fs, 'left', c, fs);
}

// Vertikālais sviediens: blāvas raustītas lentes no zemes līdz kastes augšai, ↑ / ↓ tai virs (kā rasējumā).
function drawTapes(ctx, o, fs) {
  const { tr, colors: c, points } = o;
  const list = [];
  if (points.tapes?.up != null) list.push({ x: points.tapes.up, ch: '↑' });
  if (points.tapes) list.push({ x: points.tapes.down, ch: '↓' });
  if (!list.length) return;
  const yTop = toScreen(tr, 0, o.box.y1).y;
  const yGround = toScreen(tr, 0, 0).y;
  ctx.strokeStyle = c.hairline;
  ctx.lineWidth = fs;
  ctx.globalAlpha = 0.6;
  ctx.setLineDash([3 * fs, 4 * fs]);
  for (const tp of list) {
    const x = Math.round(toScreen(tr, tp.x, 0).x) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, yGround);
    ctx.lineTo(x, yTop);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.font = `${14 * fs}px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.fillStyle = c.inkDim;
  for (const tp of list) ctx.fillText(tp.ch, toScreen(tr, tp.x, 0).x, yTop + 16 * fs);
}

function drawBall(ctx, ctr, rPx, o, fs, hollow) {
  const c = o.colors;
  const mat = c.mat[SCALE.ball.material];
  const arm = Math.max(3 * fs, 0.6 * rPx);
  ctx.lineWidth = fs;
  ctx.beginPath();
  ctx.arc(ctr.x, ctr.y, rPx, 0, Math.PI * 2);
  if (hollow) {
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 1.5 * fs;
    ctx.setLineDash([3 * fs, 2 * fs]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = fs;
  } else {
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = mat;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = c.ink;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(ctr.x - arm, ctr.y);
  ctx.lineTo(ctr.x + arm, ctr.y);
  ctx.moveTo(ctr.x, ctr.y - arm);
  ctx.lineTo(ctr.x, ctr.y + arm);
  ctx.stroke();
}

export function drawStrobe(ctx, o) {
  const { tr, colors: c, width, height, points } = o;
  const fs = o.fontScale ?? 1;
  const sc = SCALE;
  ctx.save();
  ctx.fillStyle = c.field;
  ctx.fillRect(0, 0, width, height);
  if (o.showGrid) drawGrid(ctx, o, fs);

  // zeme
  const gy = Math.round(toScreen(tr, 0, 0).y) + 0.5;
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = fs;
  ctx.beginPath();
  ctx.moveTo(0, gy);
  ctx.lineTo(width, gy);
  ctx.stroke();
  ctx.strokeStyle = c.hairline;
  ctx.beginPath();
  for (let x = 4 * fs; x < width; x += 8 * fs) {
    ctx.moveTo(x, gy + 8 * fs);
    ctx.lineTo(x + 8 * fs, gy);
  }
  ctx.stroke();
  drawTapes(ctx, o, fs);

  // bumbiņas un numuri 0, 1, 2 …
  const rPx = Math.max(4 * fs, (sc.ball.d / 2) * tr.scale); // sīka bumbiņa tomēr redzama
  for (const p of points.second) drawBall(ctx, toScreen(tr, p.x, p.y), rPx, o, fs, true);
  ctx.font = `${11 * fs}px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  for (const p of points.main) {
    const ctr = toScreen(tr, p.x, p.y);
    drawBall(ctx, ctr, rPx, o, fs, false);
    const str = String(p.n);
    const tx = ctr.x + rPx + 3 * fs;
    const ty = ctr.y - rPx - 3 * fs;
    const w = ctx.measureText(str).width;
    ctx.fillStyle = c.field;
    ctx.fillRect(tx - fs, ty - 10 * fs, w + 2 * fs, 12 * fs);
    ctx.fillStyle = c.ink;
    ctx.textAlign = 'left';
    ctx.fillText(str, tx, ty);
  }

  // paraksts (ekrāna telpā)
  const lines = o.captionLines ?? [];
  if (lines.length) drawCaption(ctx, captionLayout(ctx, lines, width, fs), c, fs);
  ctx.restore();
}

export function openProjectileStrobe(o) {
  const { table, t, lang, colors } = o;
  const s = table.settings;
  const sc = SCALE;
  const perRun = table.runs.map((run) => strobePoints(run, s));
  const box = strobeWorldBox(s, { main: perRun.flatMap((p) => p.main), second: perRun.flatMap((p) => p.second), tapes: perRun[0].tapes });
  const settingsLine = tableModel(table, { t, lang }).settingsLine;
  const eo = exportOptions(sc);
  const probe = document.createElement('canvas').getContext('2d'); // teksta mērīšanai
  let failedSize = { w: 0, h: 0 };

  // PNG: paraksts izmērīts iepriekš un novietots virs zīmējuma; attēls vismaz EXPORT_MIN_W plats.
  function exportPlan(lines) {
    const capH = Math.ceil(captionLayout(probe, lines, EXPORT_MIN_W, EXPORT_FS).height);
    const opts = { ...eo, extraH: capH + 2 * MARGIN_PX };
    const size = exportSizeFor(box, opts);
    const w = size ? Math.max(size.w, EXPORT_MIN_W) : 0;
    if (!size || w * size.h > EXPORT_MAX_AREA) {
      failedSize = {
        w: Math.max(EXPORT_MIN_W, Math.ceil((box.x1 - box.x0) * eo.min + eo.extraW)),
        h: Math.ceil((box.y1 - box.y0) * eo.min + opts.extraH),
      };
      return null;
    }
    const tx = (w - (box.x1 - box.x0) * size.scale) / 2 - box.x0 * size.scale;
    return { w, h: size.h, tr: { scale: size.scale, tx, ty: capH + MARGIN_PX + box.y1 * size.scale } };
  }

  const captionLines = (i) => {
    const lines = [t('strobe.caption', { dt: formatNumber(s.dt, decimalsOf(s.dt), lang), n: table.index, r: i + 1 }), settingsLine];
    if (s.mode === 'vertical') lines.push(t('strobe.verticalNote'));
    if (perRun[i].second.length) lines.push(t('strobe.secondNote'));
    return lines;
  };
  const base = (i, checked) => ({ settings: s, points: perRun[i], box, colors, showGrid: checked, lang, unit: sc.unit, captionLines: captionLines(i) });

  return openStrobeShell({
    labels: {
      title: t('strobe.title'), close: t('data.close'), zoomIn: t('strobe.zoomIn'), zoomOut: t('strobe.zoomOut'),
      fit: t('strobe.fit'), run: t('strobe.run'), export: t('strobe.export'), hint: t('strobe.hint'), check: t('grid'),
    },
    runCount: table.runs.length,
    runIndex: o.runIndex,
    check: { checked: o.grid, disabled: !!o.gridLocked },
    box,
    fitTop: (w) => Math.ceil(captionLayout(probe, captionLines(o.runIndex), w, 1).height) + 8,
    draw(ctx, v) {
      drawStrobe(ctx, { ...base(v.runIndex, v.checked), tr: v.tr, width: v.width, height: v.height, fontScale: 1 });
    },
    exportPNG({ runIndex, checked }) {
      const plan = exportPlan(captionLines(runIndex));
      if (!plan) return Promise.resolve(null);
      failedSize = { w: plan.w, h: plan.h }; // ja ierīce šo izmēru tomēr neizveido (toBlob → null)
      return canvasToPNG(plan.w, plan.h, (ctx) => drawStrobe(ctx, { ...base(runIndex, checked), tr: plan.tr, width: plan.w, height: plan.h, fontScale: EXPORT_FS }));
    },
    exportFilename: (i) => `sviedieni-stroboskops-${table.index}-${i + 1}.png`,
    exportFailedText: () => t('strobe.exportFailed', failedSize),
    onExportFailed: () => o.onExportFailed?.(failedSize),
    onCheckChange: (on) => o.onGridChange?.(on),
    onClose: o.onClose,
  });
}
