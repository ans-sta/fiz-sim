// Stroboskopa slānis: tuvināšana, mērījuma izvēle, viena izvēles rūtiņa, PNG eksports.
// Zīmējumu dod lapa (o.draw); teksti nāk no izsaucēja.
import { openOverlay } from './overlay.js';
import { downloadBlob } from './table-export.js';
import { setupCanvas } from '../sim-core.js';
import { fitTransform, attachZoomPan, zoomAt } from './zoom-pan.js';

export const EXPORT_MAX_SIDE = 16000;
export const EXPORT_MAX_AREA = 16000000; // iOS Safari kanvas robeža ≈ 16,7 Mpx

const SIZE_STEPS = 20;

export function exportSizeFor(box, { pref, min, extraW = 0, extraH = 0, maxSide = EXPORT_MAX_SIDE, maxArea = EXPORT_MAX_AREA }) {
  const wU = box.x1 - box.x0;
  const hU = box.y1 - box.y0;
  for (let i = 0; i <= SIZE_STEPS; i++) {
    const scale = pref - ((pref - min) * i) / SIZE_STEPS;
    const w = Math.ceil(wU * scale + extraW);
    const h = Math.ceil(hU * scale + extraH);
    if (w <= maxSide && h <= maxSide && w * h <= maxArea) return { scale, w, h };
  }
  return null;
}

export function canvasToPNG(w, h, paint) {
  return new Promise((resolve) => {
    try {
      const cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      const ctx = cv.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      paint(ctx);
      cv.toBlob((b) => resolve(b || null), 'image/png');
    } catch (err) {
      resolve(null);
    }
  });
}

export function openStrobeShell(o) {
  const L = o.labels;
  let runIndex = o.runIndex;
  let checked = o.check.checked;
  let tr = { scale: 1, tx: 0, ty: 0 };
  let size = { w: 0, h: 0 };
  let limits = { min: 0.01, max: 1e6 };
  let closed = false;
  let detach = () => {};
  let view = null;

  function draw() {
    if (closed || !view || !size.w) return;
    o.draw(view.ctx, { tr, width: size.w, height: size.h, runIndex, checked });
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
  const zoomBy = (factor) => setTr(zoomAt(tr, factor, size.w / 2, size.h / 2, limits.min, limits.max));
  // o.fitTop(width) — pikseļi augšā, ko aizņem lapas paraksts; zīmējums tiek ietilpināts zem tā
  const fitted = () => {
    const top = o.fitTop ? o.fitTop(size.w) : 0;
    const f = fitTransform(o.box, size.w, Math.max(50, size.h - top));
    return { ...f, ty: f.ty + top };
  };
  const extraHead = [
    mkBtn('−', () => zoomBy(1 / 1.5), L.zoomOut),
    mkBtn('+', () => zoomBy(1.5), L.zoomIn),
    mkBtn(L.fit, () => setTr(fitted())),
  ];

  const runBtns = Array.from({ length: o.runCount }, (_, i) => mkBtn(`${L.run} ${i + 1}`, () => {
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
  cb.checked = checked;
  cb.disabled = !!o.check.disabled;
  const cbText = document.createElement('span');
  cbText.textContent = L.check;
  check.append(cb, cbText);
  cb.addEventListener('change', () => {
    checked = cb.checked;
    o.onCheckChange?.(checked);
    draw();
  });
  extraHead.push(check);

  let overlay = null;
  overlay = openOverlay({
    title: L.title,
    closeLabel: L.close,
    extraHead,
    buttons: [{
      label: L.export,
      async onClick() {
        const blob = await o.exportPNG({ runIndex, checked });
        if (closed) return;
        if (!blob) {
          overlay.status(o.exportFailedText());
          o.onExportFailed?.();
          return;
        }
        downloadBlob(o.exportFilename(runIndex), blob);
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
  overlay.status(L.hint);

  view = setupCanvas(cv, (w, h) => {
    if (closed) return;
    const first = !size.w;
    size = { w, h };
    if (first) {
      tr = fitted();
      limits = { min: tr.scale / 4, max: tr.scale * 200 };
      detach = attachZoomPan(cv, { get: () => tr, set: setTr, min: limits.min, max: limits.max });
    }
    draw();
  });
  draw();

  return { close: overlay.close, runIndex: () => runIndex };
}
