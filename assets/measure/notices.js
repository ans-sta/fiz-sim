export function createNotices(el, { closeLabel }) {
  const items = new Map(); // id → { node, textFn }
  function paint(id) {
    const it = items.get(id);
    it.node.querySelector('span').textContent = it.textFn();
    it.node.querySelector('button').setAttribute('aria-label', closeLabel());
  }
  return {
    show(id, textFn) {
      if (!items.has(id)) {
        const node = document.createElement('div');
        node.className = 'notice';
        node.innerHTML = '<span></span><button type="button">✕</button>';
        node.querySelector('button').addEventListener('click', () => this.clear(id));
        el.appendChild(node);
        items.set(id, { node, textFn });
      }
      items.get(id).textFn = textFn;
      paint(id);
    },
    clear(id) {
      const it = items.get(id);
      if (it) {
        it.node.remove();
        items.delete(id);
      }
    },
    refresh() {
      for (const id of items.keys()) paint(id);
    },
  };
}
