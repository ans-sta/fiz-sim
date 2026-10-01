import { SCALES, TABLE_DRAW } from './scales.js';
import { gridSteps, ticks } from '../measure/world-grid.js';
import { toScreen } from '../measure/zoom-pan.js';
import { openStrobeShell, exportSizeFor, canvasToPNG } from '../measure/strobe-view.js';
import { formatNumber, decimalsOf } from '../measure/format.js';
import { tableModel } from './results.js';

export const CAPTION_PX = 140;
export const MARGIN_PX = 40;
const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const SANS = "'IBM Plex Sans', system-ui, sans-serif";

// Kur zīmēt katru zibsni. Vertikālajā sviedienā pozīcijas nobīda pa labi kā laika asi (spec. 8.2).
export function strobePoints(run, settings) {
  const sc = SCALES[settings.scale];
  const shift = settings.mode === 'vertical';
  return {
    main: run.strobe.map((p) => ({ n: p.n, x: shift ? p.n * sc.strobeSpacing : p.x, y: p.y })),
    second: run.strobe2 ? run.strobe2.map((p) => ({ n: p.n, x: p.x, y: p.y })) : [],
  };
}

export function strobeWorldBox(settings, points) {
  const sc = SCALES[settings.scale];
  const all = [...points.main, ...points.second];
  const pad = Math.max(2 * sc.ball.d, 0.05 * sc.minView.w);
  return {
    x0: Math.min(-0.5 * sc.structureW, ...all.map((p) => p.x)) - pad,
    x1: Math.max(...all.map((p) => p.x)) + pad,
    y0: -pad,
    y1: Math.max(settings.h, ...all.map((p) => p.y)) + pad,
  };
}

export function exportOptions(sc) {
  return { pref: sc.exportPx.pref, min: sc.exportPx.min, extraW: 2 * MARGIN_PX, extraH: CAPTION_PX + 2 * MARGIN_PX };
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

function drawStructure(ctx, o, fs) {
  const { tr, colors: c, settings: s, box } = o;
  const sc = SCALES[s.scale];
  const top = s.h - sc.ball.d / 2;
  if (top <= 0) return;
  const a = toScreen(tr, box.x0, top);
  const right = toScreen(tr, 0, 0).x;
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = fs;
  if (s.scale === 'tower') {
    const h = toScreen(tr, 0, 0).y - a.y;
    ctx.save();
    ctx.beginPath();
    ctx.rect(a.x, a.y, right - a.x, h);
    ctx.clip();
    ctx.strokeStyle = c.hairline;
    ctx.beginPath();
    for (let k = -h; k < right - a.x; k += 8 * fs) {
      ctx.moveTo(a.x + k, a.y + h);
      ctx.lineTo(a.x + k + h, a.y);
    }
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = c.ink;
    ctx.strokeRect(a.x, a.y, right - a.x, h);
    return;
  }
  const slab = Math.min(TABLE_DRAW.slab, top) * tr.scale;
  ctx.fillStyle = c.sheet;
  ctx.fillRect(a.x, a.y, right - a.x, slab);
  ctx.strokeRect(a.x, a.y, right - a.x, slab);
}

function drawBall(ctx, ctr, rPx, o, fs, hollow) {
  const c = o.colors;
  const mat = c.mat[SCALES[o.settings.scale].ball.material];
  const arm = Math.max(3 * fs, 0.6 * rPx);
  ctx.lineWidth = fs;
  ctx.beginPath();
  ctx.arc(ctr.x, ctr.y, rPx, 0, Math.PI * 2);
  if (hollow) {
    ctx.strokeStyle = c.inkDim;
    ctx.setLineDash([3 * fs, 2 * fs]);
    ctx.stroke();
    ctx.setLineDash([]);
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
  const sc = SCALES[o.settings.scale];
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
  drawStructure(ctx, o, fs);

  // bumbiņas un numuri 0, 1, 2 …
  const rPx = Math.max(2 * fs, (sc.ball.d / 2) * tr.scale);
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
  if (lines.length) {
    const pad = 8 * fs;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `600 ${12 * fs}px ${MONO}`;
    const head = lines[0];
    const headW = ctx.measureText(head).width;
    ctx.font = `${11 * fs}px ${SANS}`;
    const rest = lines.slice(1).flatMap((ln) => wrapWords(ctx, ln, Math.max(200, width - 2 * pad)));
    const restW = Math.max(0, ...rest.map((ln) => ctx.measureText(ln).width));
    const lineH = 16 * fs;
    ctx.fillStyle = c.field;
    ctx.fillRect(0, 0, Math.min(width, Math.max(headW, restW) + 2 * pad), pad + lineH * (1 + rest.length) + pad / 2);
    ctx.fillStyle = c.ink;
    ctx.font = `600 ${12 * fs}px ${MONO}`;
    ctx.fillText(head, pad, pad);
    ctx.fillStyle = c.inkDim;
    ctx.font = `${11 * fs}px ${SANS}`;
    rest.forEach((ln, i) => ctx.fillText(ln, pad, pad + lineH * (i + 1)));
  }
  ctx.restore();
}

export function openProjectileStrobe(o) {
  const { table, t, lang, colors } = o;
  const s = table.settings;
  const sc = SCALES[s.scale];
  const perRun = table.runs.map((run) => strobePoints(run, s));
  const box = strobeWorldBox(s, { main: perRun.flatMap((p) => p.main), second: perRun.flatMap((p) => p.second) });
  const settingsLine = tableModel(table, { t, lang }).settingsLine;
  const eo = exportOptions(sc);
  const minSize = { w: Math.ceil((box.x1 - box.x0) * eo.min + eo.extraW), h: Math.ceil((box.y1 - box.y0) * eo.min + eo.extraH) };

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
    draw(ctx, v) {
      drawStrobe(ctx, { ...base(v.runIndex, v.checked), tr: v.tr, width: v.width, height: v.height, fontScale: 1 });
    },
    exportPNG({ runIndex, checked }) {
      const size = exportSizeFor(box, eo);
      if (!size) return Promise.resolve(null);
      const tr = { scale: size.scale, tx: MARGIN_PX - box.x0 * size.scale, ty: CAPTION_PX + MARGIN_PX + box.y1 * size.scale };
      return canvasToPNG(size.w, size.h, (ctx) => drawStrobe(ctx, { ...base(runIndex, checked), tr, width: size.w, height: size.h, fontScale: 2.2 }));
    },
    exportFilename: (i) => `sviedieni-stroboskops-${table.index}-${i + 1}.png`,
    exportFailedText: () => t('strobe.exportFailed', minSize),
    onExportFailed: () => o.onExportFailed?.(minSize),
    onCheckChange: (on) => o.onGridChange?.(on),
    onClose: o.onClose,
  });
}
