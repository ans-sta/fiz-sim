import { openOverlay } from '../measure/overlay.js';
import { downloadBlob } from '../measure/table-export.js';
import { formatNumber } from '../measure/format.js';
import { setupCanvas } from '../sim-core.js';
import { toScreen, fitTransform, attachZoomPan, zoomAt } from '../measure/zoom-pan.js';
import { derive } from './model.js';
import { tableModel } from './results.js';

export const EXPORT_PX_PER_CM = 60; // 6 px uz mm (spec. 5.2: ≥ 5 px/mm)
export const EXPORT_MIN_PX_PER_CM = 50;
export const EXPORT_MAX_SIDE = 16000;
export const EXPORT_MAX_AREA = 16000000; // iOS Safari kanvas robeža ≈ 16,7 Mpx

const CAPTION_PX = 120;
const MARGIN_PX = 40;
const LABEL_ROW_PX = 60;
const GROOVE_DEPTH = 1.8;
const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const SANS = "'IBM Plex Sans', system-ui, sans-serif";

export function strobeWorldBox(settings, derived) {
  return { x0: -3, x1: settings.L + 3, y0: -3, y1: 2 * derived.r + 2 };
}

// Numuru etiķetes vienā rindā: katra pēc iespējas virs savas lodītes, bet ne pa kreisi no tās
// un ne virsū iepriekšējai. Ja nobīdīta — zīmē tievu vadlīniju līdz lodītei.
export function labelPositions(xs, labelW, gap = 4) {
  const out = [];
  let right = -Infinity;
  for (const x of xs) {
    const cx = Math.max(x, right + gap + labelW / 2);
    out.push(cx);
    right = cx + labelW / 2;
  }
  return out;
}

export function exportSize(box, captionPx = CAPTION_PX, marginPx = MARGIN_PX) {
  const wCm = box.x1 - box.x0;
  const hCm = box.y1 - box.y0;
  for (let scale = EXPORT_PX_PER_CM; scale >= EXPORT_MIN_PX_PER_CM; scale -= 2) {
    const w = Math.ceil(wCm * scale + 2 * marginPx);
    const h = Math.ceil(hCm * scale + captionPx + 2 * marginPx + LABEL_ROW_PX);
    if (w <= EXPORT_MAX_SIDE && w * h <= EXPORT_MAX_AREA) return { scale, w, h };
  }
  return null;
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

function drawTape(ctx, o, fs) {
  const { settings: s, tr, colors: c } = o;
  const sc = tr.scale;
  ctx.strokeStyle = c.ink;
  ctx.fillStyle = c.inkDim;
  ctx.lineWidth = fs;
  const y0 = toScreen(tr, 0, 0).y;
  const xMin = Math.max(0, Math.floor((0 - tr.tx) / sc));
  const xMax = Math.min(s.L, Math.ceil((o.width - tr.tx) / sc));
  const showMm = sc >= 30;
  const step = showMm ? 1 : 5; // mm
  ctx.beginPath();
  for (let mm = Math.floor(xMin * 10); mm <= Math.ceil(xMax * 10); mm += step) {
    const x = mm / 10;
    if (x < 0 || x > s.L) continue;
    let len = 0.25;
    if (mm % 500 === 0) len = 0.9;
    else if (mm % 10 === 0) len = 0.6;
    else if (mm % 5 === 0) len = 0.4;
    const px = Math.round(tr.tx + x * sc) + 0.5 * fs;
    ctx.moveTo(px, y0);
    ctx.lineTo(px, y0 + len * sc);
  }
  ctx.stroke();
  const every = sc >= 25 ? 1 : sc >= 6 ? 5 : 10;
  ctx.font = `${11 * fs}px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const ty = toScreen(tr, 0, -1.35).y;
  for (let cm = Math.ceil(xMin / every) * every; cm <= xMax; cm += every) {
    if (cm < 0 || cm > s.L) continue;
    ctx.fillText(String(cm), tr.tx + cm * sc, ty);
  }
}

export function drawStrobe(ctx, o) {
  const { run, settings: s, derived: d, tr, colors: c, width, height } = o;
  const fs = o.fontScale ?? 1;
  const L = s.L;
  ctx.save();
  ctx.fillStyle = c.field;
  ctx.fillRect(0, 0, width, height);

  // renītes sānu skats
  const a = toScreen(tr, 0, 0);
  ctx.fillStyle = c.sheet;
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = fs;
  ctx.fillRect(a.x, a.y, L * tr.scale, GROOVE_DEPTH * tr.scale);
  ctx.strokeRect(a.x, a.y, L * tr.scale, GROOVE_DEPTH * tr.scale);
  const stopTop = toScreen(tr, L, 2 * d.r + 0.2);
  ctx.fillStyle = c.ink;
  ctx.fillRect(stopTop.x, stopTop.y, 0.3 * tr.scale, a.y - stopTop.y);

  if (o.showTape) drawTape(ctx, o, fs);

  // lodītes
  const strobe = run.level3.strobe;
  const rPx = d.r * tr.scale;
  const arm = Math.max(3 * fs, 0.12 * tr.scale);
  ctx.lineWidth = fs;
  for (const p of strobe) {
    const ctr = toScreen(tr, p.x, d.rEff);
    ctx.beginPath();
    ctx.arc(ctr.x, ctr.y, rPx, 0, Math.PI * 2);
    if (d.ball.hollow) {
      ctx.strokeStyle = c.mat[d.ball.material];
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ctr.x, ctr.y, Math.max(0, rPx - 3 * fs), 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = c.mat[d.ball.material];
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = c.ink;
    ctx.beginPath();
    ctx.arc(ctr.x, ctr.y, rPx, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ctr.x - arm, ctr.y);
    ctx.lineTo(ctr.x + arm, ctr.y);
    ctx.moveTo(ctr.x, ctr.y - arm);
    ctx.lineTo(ctr.x, ctr.y + arm);
    ctx.stroke();
  }

  // numuri
  ctx.font = `${11 * fs}px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const labelW = ctx.measureText('00').width + 6 * fs;
  const xs = strobe.map((p) => toScreen(tr, p.x, 0).x);
  const lx = labelPositions(xs, labelW, 4 * fs);
  const ballTop = toScreen(tr, 0, d.rEff).y - rPx;
  const baseY = ballTop - 8 * fs;
  ctx.fillStyle = c.ink;
  ctx.strokeStyle = c.inkDim;
  ctx.lineWidth = fs;
  strobe.forEach((p, i) => {
    if (lx[i] + labelW / 2 < 0 || lx[i] - labelW / 2 > width) return;
    ctx.fillText(String(p.n), lx[i], baseY);
    if (Math.abs(lx[i] - xs[i]) > 1) {
      ctx.beginPath();
      ctx.moveTo(lx[i], baseY + 2 * fs);
      ctx.lineTo(xs[i], ballTop);
      ctx.stroke();
    }
  });

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

export function renderStrobePNG(o) {
  const box = strobeWorldBox(o.settings, o.derived);
  const size = exportSize(box);
  if (!size) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const cv = document.createElement('canvas');
      cv.width = size.w;
      cv.height = size.h;
      const ctx = cv.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      const tr = { scale: size.scale, tx: MARGIN_PX - box.x0 * size.scale, ty: CAPTION_PX + LABEL_ROW_PX + MARGIN_PX + box.y1 * size.scale };
      drawStrobe(ctx, { ...o, tr, width: size.w, height: size.h, fontScale: 2.2 });
      cv.toBlob((b) => resolve(b || null), 'image/png');
    } catch (err) {
      resolve(null);
    }
  });
}

export function openStrobe(o) {
  const { table, t, lang, colors } = o;
  let runIndex = o.runIndex;
  let showTape = o.tape;
  let tr = { scale: 1, tx: 0, ty: 0 };
  let size = { w: 0, h: 0 };
  let closed = false;
  let detach = () => {};
  let view = null;

  const derived = derive(table.settings);
  const box = strobeWorldBox(table.settings, derived);
  const settingsLine = tableModel(table, { t, lang }).settingsLine;
  const f = (v, dec) => formatNumber(v, dec, lang);

  const captionLines = () => [t('strobe.caption', { dt: f(table.settings.dt, 1), n: table.index, r: runIndex + 1 }), settingsLine];
  const drawOpts = () => ({
    run: table.runs[runIndex], settings: table.settings, derived, colors, showTape,
  });

  function draw() {
    if (closed || !view || !size.w) return;
    drawStrobe(view.ctx, { ...drawOpts(), tr, width: size.w, height: size.h, captionLines: captionLines(), fontScale: 1 });
  }
  function setTr(next) {
    tr = next;
    draw();
  }

  const mkBtn = (label, onClick, aria) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.textContent = label;
    if (aria) b.setAttribute('aria-label', aria);
    b.addEventListener('click', onClick);
    return b;
  };
  const zoomBy = (factor) => setTr(zoomAt(tr, factor, size.w / 2, size.h / 2, 0.5, 4000));
  const fit = () => setTr(fitTransform(box, size.w, size.h));

  const extraHead = [
    mkBtn('−', () => zoomBy(1 / 1.5), t('strobe.zoomOut')),
    mkBtn('+', () => zoomBy(1.5), t('strobe.zoomIn')),
    mkBtn(t('strobe.fit'), fit),
  ];

  const runBtns = table.runs.map((_, i) => mkBtn(`${t('strobe.run')} ${i + 1}`, () => {
    runIndex = i;
    syncRunBtns();
    draw();
  }));
  const seg = document.createElement('div');
  seg.className = 'seg';
  runBtns.forEach((b) => seg.appendChild(b));
  function syncRunBtns() {
    runBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === runIndex)));
  }
  syncRunBtns();
  extraHead.push(seg);

  const check = document.createElement('label');
  check.className = 'check';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = showTape;
  cb.disabled = !!o.tapeLocked;
  const cbText = document.createElement('span');
  cbText.textContent = t('tape');
  check.append(cb, cbText);
  cb.addEventListener('change', () => {
    showTape = cb.checked;
    o.onTapeChange?.(showTape);
    draw();
  });
  extraHead.push(check);

  let overlay = null;
  overlay = openOverlay({
    title: t('strobe.title'),
    closeLabel: t('data.close'),
    extraHead,
    buttons: [{
      label: t('strobe.export'),
      async onClick() {
        const blob = await renderStrobePNG({ ...drawOpts(), captionLines: captionLines() });
        if (closed) return;
        if (!blob) {
          const w = Math.ceil((box.x1 - box.x0) * EXPORT_PX_PER_CM + 2 * MARGIN_PX);
          const h = Math.ceil((box.y1 - box.y0) * EXPORT_PX_PER_CM + CAPTION_PX + 2 * MARGIN_PX + LABEL_ROW_PX);
          o.onExportFailed?.({ w, h });
          overlay.status(t('strobe.exportFailed', { w, h }));
          return;
        }
        downloadBlob(`lodite-stroboskops-${table.index}-${runIndex + 1}.png`, blob);
      },
    }],
    onClose() {
      closed = true;
      detach();
      o.onClose?.();
    },
  });

  const wrap = document.createElement('div');
  wrap.className = 'strobe-view';
  const cv = document.createElement('canvas');
  wrap.appendChild(cv);
  overlay.body.appendChild(wrap);
  overlay.status(t('strobe.hint'));

  detach = attachZoomPan(cv, { get: () => tr, set: setTr, min: 0.5, max: 4000 });
  view = setupCanvas(cv, (w, h) => {
    if (closed) return;
    const first = !size.w;
    size = { w, h };
    if (first) tr = fitTransform(box, w, h);
    draw();
  });

  return { close: overlay.close, runIndex: () => runIndex };
}
