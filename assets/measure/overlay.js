// Slānis pa visu ekrānu. Teksti nāk no izsaucēja (šeit UI tekstu nav).
export function openOverlay({ title, closeLabel, buttons = [], extraHead = [], onClose }) {
  const previous = document.activeElement;
  const root = document.createElement('div');
  root.className = 'overlay';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', title);

  const frame = document.createElement('div');
  frame.className = 'frame';
  const head = document.createElement('div');
  head.className = 'overlay-head';
  const h2 = document.createElement('h2');
  h2.textContent = title;
  head.appendChild(h2);
  extraHead.forEach((el) => head.appendChild(el));
  for (const b of buttons) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `btn${b.primary ? ' primary' : ''}`;
    el.textContent = b.label;
    el.addEventListener('click', b.onClick);
    head.appendChild(el);
  }
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'btn';
  closeBtn.textContent = closeLabel;
  head.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'overlay-body';
  const statusEl = document.createElement('div');
  statusEl.className = 'overlay-status';
  statusEl.setAttribute('role', 'status');
  statusEl.setAttribute('aria-live', 'polite');
  frame.append(head, body, statusEl);
  root.appendChild(frame);
  document.body.appendChild(root);

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey, true);
    root.remove();
    if (previous && previous.isConnected && typeof previous.focus === 'function') previous.focus();
    onClose?.();
  }
  function onKey(ev) {
    if (ev.key === 'Escape') {
      ev.preventDefault();
      ev.stopPropagation();
      close();
      return;
    }
    if (ev.key !== 'Tab') return;
    const items = [...root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((e) => !e.disabled);
    if (!items.length) return;
    const first = items[0];
    const lastEl = items[items.length - 1];
    if (!root.contains(document.activeElement)) {
      ev.preventDefault();
      first.focus();
    } else if (ev.shiftKey && document.activeElement === first) {
      ev.preventDefault();
      lastEl.focus();
    } else if (!ev.shiftKey && document.activeElement === lastEl) {
      ev.preventDefault();
      first.focus();
    }
  }
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', onKey, true);
  closeBtn.focus();

  return { root, body, status(text) { statusEl.textContent = text; }, close };
}
