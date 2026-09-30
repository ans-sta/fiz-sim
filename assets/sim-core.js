import { makeT } from './translate.js';

export const LANG_KEY = 'physics-sims-lang'; // kopīgs ar vecajām lapām
export const THEME_KEY = 'fiz-sim-theme';
export const MAX_STEP = 0.05; // s — pēc atgriešanās no citas cilnes lodīte neaizlec

function load(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    // privātais režīms: izvēle derēs līdz lapas aizvēršanai
  }
}

export function createI18n(dict) {
  const saved = load(LANG_KEY);
  let lang = saved === 'lv' || saved === 'en' ? saved : (navigator.language || '').toLowerCase().startsWith('lv') ? 'lv' : 'en';
  const listeners = [];
  const t = makeT(dict, () => lang);
  function apply(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    root.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    root.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
    document.documentElement.lang = lang;
    document.title = t('page.title');
  }
  return {
    t,
    apply,
    lang: () => lang,
    set(next) {
      if ((next !== 'lv' && next !== 'en') || next === lang) return;
      lang = next;
      save(LANG_KEY, lang);
      apply();
      listeners.forEach((cb) => cb(lang));
    },
    onChange(cb) {
      listeners.push(cb);
    },
  };
}

export function createTheme() {
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: light)');
  const listeners = [];
  let override = load(THEME_KEY);
  const resolve = () => override || (media.matches ? 'light' : 'dark');
  function applyTheme() {
    root.dataset.theme = resolve();
    listeners.forEach((cb) => cb(root.dataset.theme));
  }
  media.addEventListener('change', () => { if (!override) applyTheme(); });
  root.dataset.theme = resolve();
  return {
    current: () => root.dataset.theme,
    toggle() {
      override = root.dataset.theme === 'dark' ? 'light' : 'dark';
      save(THEME_KEY, override);
      applyTheme();
    },
    onChange(cb) {
      listeners.push(cb);
    },
    colors() {
      const cs = getComputedStyle(root);
      const v = (name) => cs.getPropertyValue(name).trim();
      return {
        sheet: v('--sheet'), ink: v('--ink'), inkDim: v('--ink-dim'), hairline: v('--hairline'),
        accent: v('--accent'), field: v('--field'),
        mat: { steel: v('--mat-steel'), glass: v('--mat-glass'), wood: v('--mat-wood'), plastic: v('--mat-plastic'), celluloid: v('--mat-celluloid') },
      };
    },
  };
}

export function mountTitleBlock(el, { i18n, theme, sheet, topicKey }) {
  el.innerHTML = `
    <div class="cell"><span class="k" data-i18n="tb.set"></span><span class="v">FIZ-SIM</span></div>
    <div class="cell"><span class="k" data-i18n="tb.sheet"></span><span class="v">${sheet}</span></div>
    <div class="cell"><span class="k" data-i18n="tb.topic"></span><span class="v" data-i18n="${topicKey}"></span></div>
    <div class="cell"><span class="k" data-i18n="tb.langTheme"></span><span class="v">
      <button type="button" data-lang="lv">LV</button><button type="button" data-lang="en">EN</button>
      <button type="button" class="theme-toggle" data-i18n-aria="tb.themeToggle">◐</button>
    </span></div>`;
  const sync = () => {
    el.querySelectorAll('[data-lang]').forEach((b) => {
      const on = b.dataset.lang === i18n.lang();
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  };
  el.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => i18n.set(b.dataset.lang)));
  el.querySelector('.theme-toggle').addEventListener('click', () => theme.toggle());
  i18n.onChange(sync);
  sync();
  i18n.apply(el);
}

export function setupCanvas(canvas, onResize) {
  const ctx = canvas.getContext('2d');
  let w = 0;
  let h = 0;
  function resize() {
    const box = canvas.parentElement.getBoundingClientRect();
    w = Math.max(1, Math.round(box.width));
    h = Math.max(1, Math.round(box.height));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    onResize(w, h);
  }
  new ResizeObserver(resize).observe(canvas.parentElement);
  resize();
  return { ctx, size: () => ({ w, h }) };
}

export function startLoop(step) {
  let last = null;
  let id = 0;
  let stopped = false;
  function frame(now) {
    if (stopped) return;
    const dt = last === null ? 0 : Math.min((now - last) / 1000, MAX_STEP);
    last = now;
    step(dt);
    if (!stopped) id = requestAnimationFrame(frame);
  }
  id = requestAnimationFrame(frame);
  return () => {
    stopped = true;
    cancelAnimationFrame(id);
  };
}
