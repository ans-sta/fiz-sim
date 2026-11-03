// Tālummaiņa ar diviem pirkstiem (pinch) un ⌘ / Ctrl taustiņi ⚙ izvēlēm BURTI un ZĪMĒJUMS (Ansis 03.11.: “Vai būtu iespējams zūmot ar
// pinchu uz datora tochpad vai tel ekrāna?” → “Jā, lūdzu.” — virs zīmējuma ZĪMĒJUMS, virs virsraksta un pogām BURTI;
// “burtu izmērs cmd+ un cmd-, … cmd bultiņa uz sāniem/augšu lielina, cmd bulitiņa atpakaļ/leju mazina? Uz PC — … cntrl”).
// Šajās lapās divu pirkstu kustība un ⌘ + / ⌘ − vairs nepalielina visu lapu (pārlūka lupa); telefona sistēmas tālummaiņa paliek.
//
// Kā pārlūki ziņo divu pirkstu tālummaiņu: Chrome / Edge / Firefox — ritenis ar ctrlKey (skārienpaliktnis); Safari (Mac, iPhone, iPad) —
// gesturestart / gesturechange ar e.scale; Android — divi skāriena rādītāji (pointer events).

export const KEY_STEP = 0.1; // tas pats solis kā A− / A+ un − / + ⚙ logā
const WHEEL_K = 0.01; // mērogs × e^(−0,01·Δy)
const WHEEL_MAX = 15; // px vienā notikumā — peles riteņa klikšķis ar Ctrl maina ne vairāk par ~16 %
const WHEEL_GAP = 400; // ms — tik ilga pauze sāk jaunu tālummaiņu
const LINE_PX = 16;

// Elementi zīmējuma iekšpusē, kas ir teksts vai pogas (tālummaiņa virs tiem maina BURTI).
const UI_SELECTOR = '.hud, .gear-corner, #gearCorner, .run-slot, .notices, .title-small, .picker, .s03-msg, dialog, [role="dialog"]';
// Kur divi pirksti ir paša rīka darbība (klavieru akords), tālummaiņa nestrādā.
const NO_PINCH_SELECTOR = '.s02-keyboard, [data-no-pinch]';

export function isMacLike(nav = globalThis.navigator) {
  const p = nav?.userAgentData?.platform || nav?.platform || '';
  return /mac|iphone|ipad|ipod/i.test(p);
}

// Taustiņa nosaukums ⚙ logā: Mac — ⌘, citur — Ctrl.
export function modLabel(nav) {
  return isMacLike(nav) ? '⌘' : 'Ctrl ';
}

export function isEditable(el) {
  if (!el || typeof el !== 'object') return false;
  if (el.isContentEditable) return true;
  const tag = String(el.tagName || '').toUpperCase();
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag !== 'INPUT') return false;
  const type = String(el.type || 'text').toLowerCase();
  return !['range', 'checkbox', 'radio', 'button', 'submit', 'reset', 'color', 'file', 'image'].includes(type);
}

// Ko taustiņš dara: { kind: 'text' | 'draw', dir: ±1 } vai null.
// ⌘ / Ctrl + “+” (arī “=” — tas pats taustiņš bez Shift) lielina burtus, “−” mazina;
// ⌘ / Ctrl + → vai ↑ lielina zīmējumu, ← vai ↓ mazina. Teksta laukā bultiņas paliek kursoram.
export function zoomKeyAction(e, editable = false) {
  if (!e || !(e.metaKey || e.ctrlKey) || e.altKey) return null;
  const k = e.key;
  const c = e.code;
  if (k === '+' || k === '=') return { kind: 'text', dir: 1 };
  if (k === '-' || k === '_' || k === '−') return { kind: 'text', dir: -1 };
  if (c === 'Equal' || c === 'NumpadAdd') return { kind: 'text', dir: 1 };
  if (c === 'Minus' || c === 'NumpadSubtract') return { kind: 'text', dir: -1 };
  if (e.shiftKey || editable) return null;
  if (k === 'ArrowRight' || k === 'ArrowUp') return { kind: 'draw', dir: 1 };
  if (k === 'ArrowLeft' || k === 'ArrowDown') return { kind: 'draw', dir: -1 };
  return null;
}

// Mēroga reizinātājs vienam ctrl + riteņa notikumam (Δy < 0 — pirksti attālinās, lielāks).
export function wheelFactor(deltaY, deltaMode = 0) {
  const px = deltaMode === 1 ? deltaY * LINE_PX : deltaMode === 2 ? deltaY * 400 : deltaY;
  const d = Math.max(-WHEEL_MAX, Math.min(WHEEL_MAX, px));
  return Math.exp(-WHEEL_K * d);
}

const clampTo = (v, { min, max }) => Math.min(max, Math.max(min, v));

// text, draw: { get(), set(v), min, max } — set pats noapaļo, saglabā un pārzīmē (tas pats, ko dara ⚙).
// drawing: elements vai elementu saraksts — zīmējuma laukums.
export function attachZoomGestures({ drawing, text, draw, win = globalThis.window, doc = globalThis.document }) {
  if (!win || !doc) return;
  const roots = [].concat(drawing).filter(Boolean);
  const ops = { text, draw };

  const kindAt = (el) => {
    if (!el || typeof el.closest !== 'function') return 'text';
    if (el.closest(NO_PINCH_SELECTOR)) return null;
    if (roots.some((r) => r.contains(el)) && !el.closest(UI_SELECTOR)) return 'draw';
    return 'text';
  };

  // pārlūka paša divu pirkstu tālummaiņa nav vajadzīga — to dara šis modulis; ritināšana ar pirkstu paliek
  doc.documentElement.style.touchAction = 'pan-x pan-y';

  // ── tastatūra ──
  win.addEventListener('keydown', (e) => {
    const a = zoomKeyAction(e, isEditable(e.target));
    if (!a) return;
    e.preventDefault();
    e.stopImmediatePropagation(); // lapas pašas bultiņas (piem. Milikena spriegums) ar ⌘ nereaģē
    const op = ops[a.kind];
    op.set(op.get() + a.dir * KEY_STEP);
  }, true);

  // ── Safari: gesture* ──
  const hasGesture = 'ongesturechange' in win;
  let gesture = null;
  if (hasGesture) {
    const opts = { passive: false };
    doc.addEventListener('gesturestart', (e) => {
      e.preventDefault();
      const kind = kindAt(e.target);
      gesture = { kind, v0: kind ? ops[kind].get() : 0 };
    }, opts);
    doc.addEventListener('gesturechange', (e) => {
      e.preventDefault();
      if (gesture?.kind && Number.isFinite(e.scale) && e.scale > 0) ops[gesture.kind].set(gesture.v0 * e.scale);
    }, opts);
    doc.addEventListener('gestureend', (e) => {
      e.preventDefault();
      gesture = null;
    }, opts);
  }

  // ── Chrome / Edge / Firefox skārienpaliktnis un Ctrl + peles ritenis ──
  let run = null; // { kind, v, t } — nenoapaļotā vērtība, lai sīki soļi summējas
  win.addEventListener('wheel', (e) => {
    if (!e.ctrlKey || gesture) return; // parasts ritenis ritina kā līdz šim
    const kind = kindAt(e.target);
    if (!kind) return;
    e.preventDefault();
    const op = ops[kind];
    if (!run || run.kind !== kind || e.timeStamp - run.t > WHEEL_GAP) run = { kind, v: op.get() };
    run.v = clampTo(run.v * wheelFactor(e.deltaY, e.deltaMode), op);
    run.t = e.timeStamp;
    op.set(run.v);
  }, { passive: false });

  // ── skāriens: divi pirksti ──
  // Otro pirkstu un kustības tālummaiņas laikā lapa neredz — lādiņš vai virzulis zem pirmā pirksta paliek uz vietas.
  // Tālummaiņas aprēķins pēc pirkstu attāluma — tikai pārlūkos bez gesture* (Safari to dara augšā).
  const touches = new Map(); // pointerId → { x, y }
  const hidden = new Set(); // rādītāji, kuru pointerdown lapa neredzēja
  let pinch = null; // { kind, d0, v0 }
  const dist = () => {
    const [a, b] = [...touches.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  win.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size < 2) return;
    const [a, b] = [...touches.values()];
    const kind = kindAt(doc.elementFromPoint((a.x + b.x) / 2, (a.y + b.y) / 2) ?? e.target);
    if (!kind) {
      touches.delete(e.pointerId); // klavieres: otrais pirksts spēlē
      return;
    }
    hidden.add(e.pointerId);
    e.stopImmediatePropagation();
    if (touches.size === 2 && !hasGesture) {
      const d0 = dist();
      pinch = d0 > 8 ? { kind, d0, v0: ops[kind].get() } : null;
    }
  }, true);
  win.addEventListener('pointermove', (e) => {
    if (!touches.has(e.pointerId)) return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size < 2) return;
    e.stopImmediatePropagation();
    if (pinch && touches.size === 2) ops[pinch.kind].set(pinch.v0 * (dist() / pinch.d0));
  }, true);
  const lift = (e) => {
    if (!touches.has(e.pointerId)) return;
    touches.delete(e.pointerId);
    if (touches.size < 2) pinch = null;
    if (hidden.delete(e.pointerId)) e.stopImmediatePropagation();
  };
  win.addEventListener('pointerup', lift, true);
  win.addEventListener('pointercancel', lift, true);
  // lapas ar touch* notikumiem (lauks, hokejs, Milikens): divu pirkstu kustība līdzi nevelk
  const twoFingers = (e) => {
    if (e.touches && e.touches.length >= 2 && kindAt(e.target)) e.stopImmediatePropagation();
  };
  win.addEventListener('touchstart', twoFingers, { capture: true, passive: true });
  win.addEventListener('touchmove', twoFingers, { capture: true, passive: true });
}
