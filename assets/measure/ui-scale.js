// BURTI un ZĪMĒJUMS (spec. izkārtojums 6): ierīce izvēli atceras; BURTI sākumā pielāgojas ekrānam.
import { roundTo } from './format.js';

export const TEXT_KEY = 'fiz-sim-text';
export const DRAW_KEY = 'fiz-sim-draw';
export const TEXT_RANGE = { min: 0.8, max: 2, step: 0.05 };
export const DRAW_RANGE = { min: 0.6, max: 1.5, step: 0.05 };
const DEFAULT_RANGE = { min: 1, max: 2, step: 0.05 }; // līdz 1280 × 800 — 100 %, lielākā ekrānā proporcionāli

export function clampScale(v, { min, max, step }) {
  if (!Number.isFinite(v)) return null;
  return roundTo(Math.min(max, Math.max(min, v)), step);
}

export function defaultTextScale(w, h) {
  return clampScale(Math.min(w / 1280, h / 800), DEFAULT_RANGE);
}

function storageOf(storage) {
  return storage ?? globalThis.localStorage; // piekļuve pati var mest kļūdu (bloķēti dati)
}

export function loadScales({ storage, w = globalThis.innerWidth ?? 1280, h = globalThis.innerHeight ?? 800 } = {}) {
  const read = (key, range) => {
    try {
      const raw = storageOf(storage)?.getItem(key);
      return raw === null || raw === undefined || raw.trim() === '' ? null : clampScale(Number(raw), range);
    } catch (e) {
      return null;
    }
  };
  return {
    text: read(TEXT_KEY, TEXT_RANGE) ?? defaultTextScale(w, h),
    draw: read(DRAW_KEY, DRAW_RANGE) ?? 1,
  };
}

export function saveScales({ text, draw }, { storage } = {}) {
  const write = (key, v) => {
    if (v === undefined) return;
    try {
      storageOf(storage)?.setItem(key, String(v));
    } catch (e) {
      // privātais režīms: izvēle derēs līdz lapas aizvēršanai
    }
  };
  write(TEXT_KEY, text);
  write(DRAW_KEY, draw);
}

export function applyTextScale(text, root = document.documentElement) {
  root.style.setProperty('--ui', String(text));
}
