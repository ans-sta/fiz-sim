const ANCHOR = { center: '-50%, -50%', left: '0, -50%', right: '-100%, -50%' };

export function createHandles(layer, { onChange, onDragStart, onDragEnd, labels }) {
  const els = new Map(); // id → { handle, label, txt, item }
  let selectedId = null;

  function paintSelected() {
    for (const [id, e] of els) {
      const on = id === selectedId && !e.item.labelClass;
      e.label.classList.toggle('selected', on);
    }
  }

  function setSelected(id) {
    selectedId = id;
    paintSelected();
  }

  function pointerOf(ev) {
    const r = layer.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }

  function makeHandle(id) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'slider');
    b.addEventListener('pointerdown', (ev) => {
      b.setPointerCapture(ev.pointerId);
      b.classList.add('dragging');
      onDragStart?.(id);
      setSelected(id);
      ev.preventDefault();
    });
    b.addEventListener('pointermove', (ev) => {
      if (b.hasPointerCapture(ev.pointerId)) onChange(id, { pointer: pointerOf(ev) });
    });
    const end = (ev) => {
      if (!b.classList.contains('dragging')) return;
      b.classList.remove('dragging');
      if (b.hasPointerCapture(ev.pointerId)) b.releasePointerCapture(ev.pointerId);
      onDragEnd?.(id);
    };
    b.addEventListener('pointerup', end);
    b.addEventListener('pointercancel', end);
    b.addEventListener('focus', () => setSelected(id));
    b.addEventListener('keydown', (ev) => {
      const it = els.get(id).item;
      let change = null;
      switch (ev.key) {
        case 'ArrowRight': case 'ArrowUp': change = { delta: it.step }; break;
        case 'ArrowLeft': case 'ArrowDown': change = { delta: -it.step }; break;
        case 'PageUp': change = { delta: 10 * it.step }; break;
        case 'PageDown': change = { delta: -10 * it.step }; break;
        case 'Home': change = { set: it.min }; break;
        case 'End': change = { set: it.max }; break;
        default: return;
      }
      ev.preventDefault();
      onChange(id, change);
    });
    return b;
  }

  function makeLabel(id) {
    const label = document.createElement('span');
    label.className = 'handle-label';
    const minus = document.createElement('button');
    minus.type = 'button';
    minus.className = 'mini';
    minus.textContent = '−';
    const txt = document.createElement('span');
    txt.className = 'txt';
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.className = 'mini';
    plus.textContent = '+';
    label.append(minus, txt, plus);
    minus.addEventListener('click', () => onChange(id, { delta: -els.get(id).item.step }));
    plus.addEventListener('click', () => onChange(id, { delta: els.get(id).item.step }));
    label.addEventListener('pointerdown', () => setSelected(id));
    return { label, txt, minus, plus };
  }

  function update(items) {
    const seen = new Set();
    for (const it of items) {
      seen.add(it.id);
      let e = els.get(it.id);
      if (!e) {
        e = { handle: null, ...makeLabel(it.id), item: it };
        els.set(it.id, e);
        layer.appendChild(e.label);
      }
      e.item = it;
      const wantHandle = it.kind !== 'none';
      if (wantHandle && !e.handle) {
        e.handle = makeHandle(it.id);
        layer.appendChild(e.handle);
      } else if (!wantHandle && e.handle) {
        e.handle.remove();
        e.handle = null;
      }
      if (e.handle) {
        const h = e.handle;
        h.className = `handle${it.kind === 'ball' ? ' ball' : ''}${h.classList.contains('dragging') ? ' dragging' : ''}`;
        h.style.transform = `translate(${it.x}px, ${it.y}px)`;
        h.setAttribute('aria-label', it.ariaLabel);
        h.setAttribute('aria-valuemin', it.min);
        h.setAttribute('aria-valuemax', it.max);
        h.setAttribute('aria-valuenow', it.value);
        h.setAttribute('aria-valuetext', it.valueText);
      }
      e.label.className = `handle-label${it.labelClass ? ` ${it.labelClass}` : ''}`;
      e.label.style.transform = `translate(${it.labelX}px, ${it.labelY}px) translate(${ANCHOR[it.labelAnchor]})`;
      e.txt.textContent = it.labelText;
      e.minus.setAttribute('aria-label', labels.decrease());
      e.plus.setAttribute('aria-label', labels.increase());
      const minis = !it.labelClass;
      e.minus.hidden = !minis;
      e.plus.hidden = !minis;
    }
    for (const [id, e] of els) {
      if (seen.has(id)) continue;
      e.handle?.remove();
      e.label.remove();
      els.delete(id);
    }
    paintSelected();
  }

  return { update, setSelected };
}
