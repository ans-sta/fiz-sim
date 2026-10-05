// assets/sound/audio.js
// Web Audio: viens dzinējs trim skatiem. VIĻŅA FORMA — viens oscilators; DIVI AVOTI — B = b·sin(ωt+φ) = b·cosφ·sin(ωt) + b·sinφ·cos(ωt)
// (divi sinhroni oscilatori, precīza fāze); HARMONIKAS — 12 sinusi. Klusums — 30 ms izbalējums, lai neklikšķ.
import { harmonicGains, duoGains, NH } from './model.js';

export function createAudio() {
  let ctx = null;
  let master = null;
  let nodes = null;

  function ensureCtx(s) {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = (s.vol / 100) ** 2;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  }
  function stopNodes() {
    if (!nodes) return;
    const n = nodes;
    const t = ctx.currentTime;
    nodes = null;
    n.bus.gain.cancelScheduledValues(t);
    n.bus.gain.setValueAtTime(n.bus.gain.value, t);
    n.bus.gain.linearRampToValueAtTime(0, t + 0.03);
    n.oscs.forEach((o) => { try { o.stop(t + 0.06); } catch (e) { /* jau apturēts */ } });
    setTimeout(() => { try { n.bus.disconnect(); } catch (e) { /* jau atvienots */ } }, 200);
  }
  function build(s) {
    stopNodes();
    const t = ctx.currentTime;
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0, t);
    bus.gain.linearRampToValueAtTime(1, t + 0.04);
    bus.connect(master);
    const N = { view: s.view, bus, oscs: [] };
    const osc = (f, wave) => {
      const o = ctx.createOscillator();
      if (wave) o.setPeriodicWave(wave);
      o.frequency.value = f;
      N.oscs.push(o);
      return o;
    };
    const gain = (v) => { const g = ctx.createGain(); g.gain.value = v; return g; };
    if (s.view === 'wave') {
      const o = osc(s.f);
      o.type = s.wave;
      N.wave = s.wave;
      o.connect(gain(0.35)).connect(bus);
    } else if (s.view === 'two') {
      const sinW = ctx.createPeriodicWave(new Float32Array([0, 0]), new Float32Array([0, 1]), { disableNormalization: true });
      const cosW = ctx.createPeriodicWave(new Float32Array([0, 1]), new Float32Array([0, 0]), { disableNormalization: true });
      const os = osc(s.f, sinW);
      const oc = osc(s.f, cosW);
      const g = duoGains(s);
      N.gA = gain(g.a);
      N.gBs = gain(g.bs);
      N.gBc = gain(g.bc);
      const pan = (v) => { if (!ctx.createStereoPanner) return null; const p = ctx.createStereoPanner(); p.pan.value = v; return p; };
      N.pA = pan(s.split ? -1 : 0);
      N.pB = pan(s.split ? 1 : 0);
      os.connect(N.gA);
      os.connect(N.gBs);
      oc.connect(N.gBc);
      if (N.pA) {
        N.gA.connect(N.pA).connect(bus);
        N.gBs.connect(N.pB);
        N.gBc.connect(N.pB);
        N.pB.connect(bus);
      } else {
        N.gA.connect(bus);
        N.gBs.connect(bus);
        N.gBc.connect(bus);
      }
    } else {
      const g = harmonicGains(s);
      N.hg = s.H.map((h, i) => {
        const o = osc(Math.min(s.f * (i + 1), 20000));
        o.type = 'sine';
        const gn = gain(g[i]);
        o.connect(gn).connect(bus);
        return gn;
      });
    }
    N.oscs.forEach((o) => o.start(t + 0.01));
    nodes = N;
  }

  return {
    // Saskaņo skaņu ar stāvokli: playing — vai skan; pārējais no s. Drīkst saukt bieži — maina tikai parametrus.
    sync(s, playing) {
      if (!playing) {
        if (ctx) stopNodes();
        return;
      }
      ensureCtx(s);
      if (!nodes || nodes.view !== s.view) build(s);
      const t = ctx.currentTime;
      const set = (p, v) => p.setTargetAtTime(v, t, 0.012);
      const N = nodes;
      set(master.gain, (s.vol / 100) ** 2);
      if (N.view === 'wave') {
        if (N.wave !== s.wave) { N.oscs[0].type = s.wave; N.wave = s.wave; }
        set(N.oscs[0].frequency, s.f);
      } else if (N.view === 'two') {
        N.oscs.forEach((o) => set(o.frequency, s.f));
        const g = duoGains(s);
        set(N.gA.gain, g.a);
        set(N.gBs.gain, g.bs);
        set(N.gBc.gain, g.bc);
        if (N.pA) { set(N.pA.pan, s.split ? -1 : 0); set(N.pB.pan, s.split ? 1 : 0); }
      } else {
        const g = harmonicGains(s);
        N.oscs.forEach((o, i) => set(o.frequency, Math.min(s.f * (i + 1), 20000)));
        N.hg.forEach((gn, i) => set(gn.gain, g[i]));
      }
    },
    stop() { if (ctx) stopNodes(); },
    count: () => NH,
  };
}
