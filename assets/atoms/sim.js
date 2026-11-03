// assets/atoms/sim.js — A-01 laika gaita: fotoni lidojumā, elektrona stāvoklis, notikumi (spec. § 6 absorbcija, § 7 starošana).
// Lapa zīmē no sim.state; darbības un step(dt) atdod notikumus ekrāna lasītājam un rādījumam.
import { ATOMS } from './atoms.js';
import { absorb, cascadeStep, createWhiteLight, isGround, isMetastable, levelOf, linesDown, timing, DEFAULT_INTENSITY, VIS } from './model.js';

export const MAX_PHOTONS = 40;
const EPS = 1e-9;

// Svītras un līnijas krājas pa λ grupām (redzamajā 0,5 nm, citur 0,1 % no λ) — ilgi spīdot, atmiņa neaug
export const binKey = (λ) => (λ >= VIS.min && λ <= VIS.max ? `v${Math.round(λ * 2)}` : `l${Math.round(Math.log(λ) * 1000)}`);

export function createSim({ atomId = 'H', mode = 'absorb', rng = Math.random, reducedMotion = false } = {}) {
  const white = createWhiteLight(rng);
  const ground = (atom) => atom.levels.reduce((m, l) => (l.E < m.E ? l : m)).id;
  const state = {
    atomId, mode, start: ATOMS[atomId].start, level: null, ionised: false,
    white: false, rate: DEFAULT_INTENSITY, photons: [], stripes: new Map(), lines: new Map(),
    counts: { shot: 0, absorbed: 0 }, arrow: null, cascading: false, t: 0,
    allowed: null, // pēc aizliegtas krišanas — līmeņi, uz kuriem var krist (spec. § 7.3)
  };
  let pending = [];
  let busy = null; // { until, kind: 'line' | 'ionise', λ, from }
  let nextFall = Infinity;
  let whiteAcc = 0;
  let nextId = 1;
  let cascadeFalls = 0;
  const atom = () => ATOMS[state.atomId];
  const tm = () => timing(state.white && state.mode === 'absorb' ? state.rate : DEFAULT_INTENSITY, reducedMotion);

  function settle() {
    state.photons = [];
    pending = [];
    busy = null;
    state.ionised = false;
    state.cascading = false;
    nextFall = Infinity;
    whiteAcc = 0;
    state.arrow = null;
    state.allowed = null;
    state.level = state.mode === 'absorb' ? state.start : ground(atom());
  }
  settle();

  function addPhoton(p) {
    if (state.photons.length >= MAX_PHOTONS) {
      const drop = state.photons.findIndex((x) => x.kind !== 'in' && x.kind !== 'emit');
      state.photons.splice(drop >= 0 ? drop : 0, 1);
    }
    state.photons.push({ id: nextId++, t: state.t, dirY: 0, ...p });
  }

  // ── absorbcija ──
  function shoot(λ) {
    if (state.mode !== 'absorb') return;
    state.counts.shot += 1;
    addPhoton({ λ, kind: 'in', dur: tm().flight });
  }
  function arrive(p, ev) {
    const idle = !busy && !state.ionised && state.level === state.start;
    const would = absorb(atom(), state.start, p.λ);
    const r = idle ? would : { kind: 'pass' };
    if (r.kind === 'pass') {
      ev.push({ type: 'passed', λ: p.λ, busy: !idle && would.kind !== 'pass' }); // busy — izlaida tikai tāpēc, ka elektrons vēl augšā
      return { ...p, kind: 'pass', t: state.t, dur: tm().pass };
    }
    state.counts.absorbed += 1;
    const λs = r.kind === 'line' ? r.λ : p.λ;
    state.stripes.set(binKey(λs), λs);
    if (r.kind === 'line') {
      state.level = r.to;
      state.arrow = { from: state.start, to: r.to, λ: r.λ, up: true };
      busy = { until: state.t + tm().hold, kind: 'line', λ: r.λ, from: r.to };
      ev.push({ type: 'absorbed', from: state.start, to: r.to, λ: r.λ });
      return null;
    }
    state.ionised = true;
    state.level = null;
    state.arrow = null;
    busy = { until: state.t + tm().hold, kind: 'ionise', λ: p.λ };
    ev.push({ type: 'ionised', λ: p.λ });
    return { ...p, kind: 'free', t: state.t, dur: tm().hold };
  }
  function comeBack(ev) {
    const b = busy;
    busy = null;
    state.ionised = false;
    state.level = state.start;
    if (b.kind === 'line') {
      state.arrow = { from: b.from, to: state.start, λ: b.λ, up: false };
      addPhoton({ λ: b.λ, kind: 'reemit', dur: tm().pass, dirY: rng() < 0.5 ? -1 : 1 });
    }
    ev.push({ type: 'returned', kind: b.kind, level: state.start });
  }

  // ── starošana ──
  function toGroundSilently() {
    state.level = ground(atom());
    state.arrow = null;
  }
  function excite(id) {
    const from = state.level;
    state.level = id;
    state.arrow = { from, to: id, λ: null, up: true, excite: true };
    return { type: 'excited', from, to: id };
  }
  function fall(to) {
    const from = state.level;
    const downs = linesDown(atom(), from);
    const d = downs.find((x) => x.to === to);
    if (!d) {
      state.allowed = downs.map((x) => x.to);
      return { type: 'forbidden', from, to, allowed: state.allowed };
    }
    state.allowed = null;
    state.level = to;
    state.arrow = { from, to, λ: d.λ, up: false };
    addPhoton({ λ: d.λ, kind: 'emit', dur: tm().flight });
    return { type: 'emitted', from, to, λ: d.λ, metastable: isMetastable(atom(), to) };
  }
  function setLevel(id) {
    const a = atom();
    const lv = levelOf(a, id);
    if (!lv || lv.kind === 'limit') return null;
    if (state.mode === 'absorb') {
      busy = null; // izvēle stājas spēkā uzreiz (atgriešanos atceļ)
      state.ionised = false;
      state.start = id;
      state.level = id;
      state.arrow = null;
      return { type: 'start', level: id };
    }
    state.cascading = false;
    nextFall = Infinity;
    state.allowed = null;
    if (isMetastable(a, state.level)) toGroundSilently(); // nākamā darbība nogāž metastabilo bez fotona (spec. § 7.5)
    const cur = levelOf(a, state.level);
    if (lv.E > cur.E) return excite(id);
    if (lv.E < cur.E) return fall(id);
    return null;
  }
  function cascade() {
    if (state.mode !== 'emit') return null;
    const a = atom();
    let e = null;
    if (isMetastable(a, state.level)) toGroundSilently();
    if (isGround(a, state.level)) {
      const ups = a.levels.filter((l) => l.kind !== 'limit' && !isGround(a, l.id));
      e = excite(ups[Math.floor(rng() * ups.length)].id);
    }
    state.allowed = null;
    state.cascading = true;
    cascadeFalls = 0;
    nextFall = state.t + tm().hold;
    return e;
  }

  function step(dt) {
    state.t += dt;
    const ev = pending;
    pending = [];
    if (state.white && state.mode === 'absorb') {
      whiteAcc += dt;
      const gap = 1 / state.rate;
      while (whiteAcc >= gap - EPS) {
        whiteAcc -= gap;
        shoot(white.next(atom(), state.start));
      }
    }
    if (busy && state.t >= busy.until - EPS) comeBack(ev);
    const keep = [];
    for (const p of state.photons) {
      if (state.t < p.t + p.dur - EPS) { keep.push(p); continue; }
      if (p.kind === 'in') {
        const next = arrive(p, ev);
        if (next) keep.push(next);
      } else if (p.kind === 'emit') {
        state.lines.set(binKey(p.λ), p.λ);
      }
    }
    state.photons = keep;
    if (state.cascading && state.t >= nextFall - EPS) {
      const d = cascadeStep(atom(), state.level, rng);
      if (!d) {
        state.cascading = false;
        nextFall = Infinity;
        if (!cascadeFalls && isMetastable(atom(), state.level)) ev.push({ type: 'metastable', level: state.level });
      } else {
        ev.push(fall(d.to));
        cascadeFalls += 1;
        const end = isGround(atom(), d.to) || isMetastable(atom(), d.to);
        state.cascading = !end;
        nextFall = end ? Infinity : state.t + tm().hold;
      }
    }
    return ev;
  }

  return {
    state,
    shoot,
    fall: (to) => (state.mode === 'emit' ? fall(to) : null),
    setLevel,
    cascade,
    step,
    setAtom(id) {
      if (!ATOMS[id]) return;
      state.atomId = id;
      state.start = ATOMS[id].start;
      state.stripes.clear();
      state.lines.clear();
      state.counts = { shot: 0, absorbed: 0 };
      settle();
    },
    setMode(m) {
      if (m !== 'absorb' && m !== 'emit') return;
      state.mode = m;
      if (m !== 'absorb') state.white = false;
      settle();
    },
    setWhite(on) { state.white = Boolean(on) && state.mode === 'absorb'; whiteAcc = 0; },
    setRate(r) { state.rate = r; },
    clear() {
      state.stripes.clear();
      state.lines.clear();
      state.counts = { shot: 0, absorbed: 0 };
    },
  };
}
