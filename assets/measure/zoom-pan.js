// Tuvināšana un bīdīšana. Pasaules y ir uz augšu, ekrāna — uz leju.
export function toScreen(tr, x, y) {
  return { x: tr.tx + x * tr.scale, y: tr.ty - y * tr.scale };
}

export function fitTransform(box, viewW, viewH, margin = 24) {
  const w = box.x1 - box.x0;
  const h = box.y1 - box.y0;
  const scale = Math.min((viewW - 2 * margin) / w, (viewH - 2 * margin) / h);
  return { scale, tx: (viewW - w * scale) / 2 - box.x0 * scale, ty: (viewH + h * scale) / 2 + box.y0 * scale };
}

export function zoomAt(tr, factor, px, py, min = 0.5, max = 4000) {
  const scale = Math.min(max, Math.max(min, tr.scale * factor));
  const f = scale / tr.scale;
  return { scale, tx: px - (px - tr.tx) * f, ty: py - (py - tr.ty) * f };
}

export function panBy(tr, dx, dy) {
  return { ...tr, tx: tr.tx + dx, ty: tr.ty + dy };
}

// Ritenis, viens pirksts (bīdīt), divi pirksti (tuvināt un bīdīt).
export function attachZoomPan(el, { get, set, min = 0.5, max = 4000 }) {
  const pointers = new Map();
  const local = (e) => {
    const r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const pair = () => {
    const [a, b] = [...pointers.values()];
    return { mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) };
  };

  function onWheel(e) {
    e.preventDefault();
    const p = local(e);
    set(zoomAt(get(), Math.exp(-e.deltaY * 0.0015), p.x, p.y, min, max));
  }
  function onDown(e) {
    pointers.set(e.pointerId, local(e));
    try {
      el.setPointerCapture(e.pointerId);
    } catch (err) {
      // sintētiskiem notikumiem tveršana var nebūt pieejama
    }
  }
  function onMove(e) {
    if (!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId);
    const cur = local(e);
    if (pointers.size === 1) {
      pointers.set(e.pointerId, cur);
      set(panBy(get(), cur.x - prev.x, cur.y - prev.y));
    } else if (pointers.size === 2) {
      const before = pair();
      pointers.set(e.pointerId, cur);
      const after = pair();
      let tr = get();
      if (before.d > 0 && after.d > 0) tr = zoomAt(tr, after.d / before.d, before.mx, before.my, min, max);
      set(panBy(tr, after.mx - before.mx, after.my - before.my));
    }
  }
  function onUp(e) {
    pointers.delete(e.pointerId);
  }

  el.addEventListener('wheel', onWheel, { passive: false });
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  return () => {
    el.removeEventListener('wheel', onWheel);
    el.removeEventListener('pointerdown', onDown);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', onUp);
    el.removeEventListener('pointercancel', onUp);
  };
}
