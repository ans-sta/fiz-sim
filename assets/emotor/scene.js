// assets/emotor/scene.js — E-01 zīmējums izometrijā (spec. § 4) un ģeneratora grafiks (spec. § 6.2).
// Pasaules asis: x — lauka virziens (no N uz S), y — uz augšu, z — rāmīša ass (pret skatītāju).
// Izometrija: ekrānā x iet pa labi lejup 30°, z — pa kreisi lejup 30°, y — vertikāli. Skatītājs skatās no (+x, +y, +z):
// jo lielāks x + y + z, jo tuvāk — pēc tā kārto rāmīša malas.
import { commutatorSign, EMF_AXIS, WINDOW } from './model.js';

const MONO = '"IBM Plex Mono", ui-monospace, monospace';
const SANS = '"IBM Plex Sans", system-ui, sans-serif';
const C30 = Math.cos(Math.PI / 6);

// Zīmējuma krāsas. Kontrasts (WCAG relatīvais spilgtums) pret rasējuma lauku --field (tumšā #0c0e11 / gaišā #faf8f3):
//            tumšā    gaišā
//   B        8,84     6,20   lauka līnijas un burts B
//   I       12,82     5,71   strāvas bultas un burts I
//   F        7,43     5,54   spēka bultas un burts F (gaišajā tas pats akcents kā lapā, #a8470d)
//   vads    12,00    10,27   rāmītis un vadi
//   varš     6,90     5,82   kolektors / gredzeni
//   sukas    6,30     4,65
//   N        3,51     5,19   magnēta laukums; burts N balts uz N — 5,51
// Visi ≥ 4,5 : 1 — der arī tekstam; grafiskajiem elementiem vajag ≥ 3 : 1. S magnēts ir daļēji caurspīdīgs (lai rāmītis
// redzams) — to nošķir tintes kontūra (≥ 6 : 1), burts S tintē uz tā — 8,7 : 1.
export const PALETTE = {
  dark: { B: '#7fb8c9', I: '#e9d35a', F: '#ff7a29', wire: '#c9ccd1', copper: '#d08b52', copper2: '#a86a38', brush: '#8d949c', N: '#3d6aa6', S: '#a8473c', sAlpha: 0.55, glow: '255, 214, 94' },
  light: { B: '#2a6478', I: '#7a5f00', F: '#a8470d', wire: '#3a3d42', copper: '#8f5222', copper2: '#b9773f', brush: '#6b7178', N: '#3d6aa6', S: '#b5503f', sAlpha: 0.35, glow: '230, 160, 0' },
};

// Magnēta krāsas: N zils, S sarkans; poli var būt apmainīti (s.field = −1) — tad aizmugurē S, priekšā N.
// Burts uz aizmugurējā (necaurspīdīgā) magnēta balts: uz N 5,51 : 1, uz S tumšajā 5,78 : 1, gaišajā 5,02 : 1.
// Burts tintē uz priekšējā (caurspīdīgā) magnēta: uz S 8,74 / 8,82 : 1, uz N 8,32 / 8,78 : 1 (tumšajā / gaišajā).
// Pasaules izmēri (vienības)
export const WORLD = {
  R: 2.0,          // pusplatums: garās malas attālums no ass
  L: 1.8,          // puse garās malas
  magX0: 3.1, magX1: 4.4, magY: 1.6, magZ: 2.2,
  shaftBack: -3.0, shaftFront: 3.5,
  rc: 0.34,        // kontaktu rādiuss
  bw: 0.3,         // sukas (oglītes) garums — aizmugurējā redzama aiz rotora
  comm: [2.4, 3.1],                // kolektors (viens gredzens)
  rings: { b: [2.3, 2.62], a: [2.82, 3.14] }, // divi gredzeni (bez kolektora)
  floorY: -2.9, termX: 1.1, termZ: 2.75,
};
const EXT = { w: 12.0, h: 10.8, cy: 0.25 }; // projicētais aprises izmērs (s vienībās) un centra nobīde

export function sceneLayout(w, h, drawScale = 1) {
  const pad = 14;
  const sw = (w - 2 * pad) / EXT.w;
  const sh = (h - 2 * pad) / EXT.h;
  const s0 = Math.max(4, Math.min(sw, sh));
  const s = s0 * drawScale;
  return { w, h, s, cx: w / 2, cy: h / 2 - EXT.cy * s, fill: Math.min(1.5, Math.max(0.6, sw / s0)) };
}

function projector(lay) {
  const { cx, cy, s } = lay;
  return (x, y, z) => [cx + s * (x - z) * C30, cy + s * (-y + 0.5 * (x + z))];
}

// ── zīmēšanas palīgi ──────────────────────────────────────
function path(ctx, pts, close = false) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}
function line(ctx, a, b, color, width, dash) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  if (dash) ctx.setLineDash(dash);
  path(ctx, [a, b]);
  ctx.stroke();
  ctx.restore();
}
function head(ctx, tip, dir, size, color, halo, half = 0.5) {
  const L = Math.hypot(dir[0], dir[1]) || 1;
  const ux = dir[0] / L;
  const uy = dir[1] / L;
  const bx = tip[0] - ux * size;
  const by = tip[1] - uy * size;
  const pts = [tip, [bx - uy * size * half, by + ux * size * half], [bx + uy * size * half, by - ux * size * half]];
  ctx.save();
  if (halo) {
    ctx.strokeStyle = halo;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    path(ctx, pts, true);
    ctx.stroke();
  }
  ctx.fillStyle = color;
  path(ctx, pts, true);
  ctx.fill();
  ctx.restore();
}
// bulta no a līdz b (ekrāna punkti); halo — tumša/gaiša apmale, lai bulta atdalās no vada
function arrow(ctx, a, b, color, width, sizeMax, halo) {
  const dir = [b[0] - a[0], b[1] - a[1]];
  const L = Math.hypot(dir[0], dir[1]);
  if (L < 1) return;
  const size = Math.min(sizeMax, 0.55 * L); // īsai bultai galviņa nav garāka par pašu bultu
  const end = [b[0] - (dir[0] / L) * size * 0.7, b[1] - (dir[1] / L) * size * 0.7];
  if (halo) line(ctx, a, end, halo, width + 3);
  line(ctx, a, end, color, width);
  head(ctx, b, dir, size, color, halo);
}
// strāvas bulta BLAKUS vadam (Ansis 03.11.): nogrieznis pa → pb (strāvas virzienā), pārbīdīts perpendikulāri uz to pusi,
// kur rāda out (ekrāna vektors “uz āru”). Kad vads redzams no gala (out gandrīz gar vadu), bulta pārslīd vienmērīgi.
function sideArrow(ctx, pa, pb, out, { color, halo, gap, width, head }) {
  const dx = pb[0] - pa[0];
  const dy = pb[1] - pa[1];
  const L = Math.hypot(dx, dy);
  if (L < 4) return null;
  const ux = dx / L;
  const uy = dy / L;
  const nx = -uy;
  const ny = ux;
  const ol = Math.hypot(out[0], out[1]) || 1;
  const w = Math.max(-1, Math.min(1, (nx * out[0] + ny * out[1]) / (0.35 * ol)));
  const ox = nx * gap * w;
  const oy = ny * gap * w;
  arrow(ctx, [pa[0] + ox, pa[1] + oy], [pb[0] + ox, pb[1] + oy], color, width, head, halo);
  return { mid: [(pa[0] + pb[0]) / 2 + ox, (pa[1] + pb[1]) / 2 + oy], n: [nx * (w < 0 ? -1 : 1), ny * (w < 0 ? -1 : 1)] };
}
// Vai punkts q ir aiz kastes b, skatoties no skatītāja puses (izometrijā skatiena virziens ir (1, 1, 1))?
function behindBox(q, b) {
  const lo = Math.max(0, b.x0 - q[0], b.y0 - q[1], b.z0 - q[2]);
  const hi = Math.min(b.x1 - q[0], b.y1 - q[1], b.z1 - q[2]);
  return lo < hi;
}
// nogriežņa a → b posmi: redzamie un aizsegtie (aiz kastes b) — [{ t0, t1, hidden }], t ∈ [0, 1]
function hiddenRuns(a, b, box, n = 80) {
  const at = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const runs = [];
  let cur = null;
  for (let i = 0; i < n; i++) {
    const hid = behindBox(at((i + 0.5) / n), box);
    if (cur && cur.hidden === hid) cur.t1 = (i + 1) / n;
    else { cur = { t0: i / n, t1: (i + 1) / n, hidden: hid }; runs.push(cur); }
  }
  return runs.map((r) => ({ ...r, a: at(r.t0), b: at(r.t1) }));
}
function label(ctx, text, x, y, { color, size, align = 'center', base = 'middle', weight = 600, font = MONO, halo }) {
  ctx.save();
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = base;
  if (halo) {
    ctx.strokeStyle = halo;
    ctx.lineWidth = Math.max(3, size / 4);
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}
function box(ctx, P, [x0, x1], [y0, y1], [z0, z1], { fill, alpha = 1, stroke, width = 1 }) {
  const top = [P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)];
  const right = [P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)];
  const front = [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)];
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  for (const [face, shade] of [[right, 0.78], [front, 0.62], [top, 1]]) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    path(ctx, face, true);
    ctx.fill();
    ctx.globalAlpha = alpha * (1 - shade); // ēnojums: tumšāka puse
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.globalAlpha = 1;
    if (stroke) ctx.stroke();
  }
  ctx.restore();
  return top;
}
// izliektā čaula (monotonā ķēde) — cilindra aprisei
function hull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  const upper = [];
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
const ring = (P, r, z, from = 0, to = Math.PI * 2, n = 40) => {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = from + ((to - from) * i) / n;
    out.push(P(r * Math.cos(t), r * Math.sin(t), z));
  }
  return out;
};
function cylinder(ctx, P, r, z0, z1, side, edge) {
  ctx.save();
  ctx.fillStyle = side;
  path(ctx, hull(ring(P, r, z0, 0, Math.PI * 2, 32).concat(ring(P, r, z1, 0, Math.PI * 2, 32))), true);
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

// ── zīmējums ──────────────────────────────────────────────
// m: { rotor, settings, I (rāmīša strāva), Iref, colors (tēmas marķieri), theme, legend, bulb (0…1), show }
// Secība: aizmugure → rāmītis → kontakti, vadi, ierīce → S magnēts (priekšā, caurspīdīgs) → anotācijas (bultas, uzraksti)
// pašā virspusē, lai S magnēts tās neaizsedz (kā fizikas zīmējumos — vektori virs priekšmetiem).
export function drawScene(ctx, lay, m) {
  const { w, h, s } = lay;
  const P = projector(lay);
  const c = m.colors;
  const pal = PALETTE[m.theme === 'light' ? 'light' : 'dark'];
  const k = m.legend;
  const st = m.settings;
  const W = WORLD;
  const phi = m.rotor.phi;
  const gen = st.mode === 'generator';
  const halo = c.field;
  const tiny = 0.02 * m.Iref;
  const I = m.I;
  const showI = m.show.current && Math.abs(I) > tiny;
  const wireW = Math.max(2.5, 0.11 * s);
  const thin = Math.max(1.5, 0.05 * s);
  const arrowSize = Math.max(9, 0.32 * s) * Math.min(1.4, k);
  const letter = Math.max(13, 0.42 * s) * k;
  const notes = []; // anotācijas — zīmē beigās
  const fs = st.field ?? 1; // 1 — N aizmugurē pa kreisi; −1 — poli apmainīti
  const backN = fs > 0;
  const poleSize = Math.max(16, 0.62 * s) * Math.min(1.5, k);
  const frontBox = { x0: W.magX0, x1: W.magX1, y0: -W.magY, y1: W.magY, z0: -W.magZ, z1: W.magZ };
  const iArrow = { color: pal.I, halo, gap: Math.max(9, 0.3 * s), width: Math.max(2.5, 0.085 * s), head: arrowSize };
  ctx.clearRect(0, 0, w, h);

  // aizmugurējais magnēts (pa kreisi): N vai S
  box(ctx, P, [-W.magX1, -W.magX0], [-W.magY, W.magY], [-W.magZ, W.magZ], { fill: backN ? pal.N : pal.S, stroke: c.inkDim });
  const nC = P(-(W.magX0 + W.magX1) / 2, W.magY, 0);
  label(ctx, backN ? 'N' : 'S', nC[0], nC[1], { color: '#ffffff', size: poleSize });

  // kloķis ģeneratorā (ass aizmugurējā galā, griežas līdzi)
  const zb = W.shaftBack;
  if (gen) {
    const arm = 0.95;
    const ang = phi + Math.PI / 2;
    const e = [arm * Math.cos(ang), arm * Math.sin(ang)];
    line(ctx, P(0, 0, zb), P(e[0], e[1], zb), c.inkDim, Math.max(3, 0.13 * s));
    line(ctx, P(e[0], e[1], zb), P(e[0], e[1], zb - 0.65), c.ink, Math.max(4, 0.17 * s));
  }
  // ass aizmugure un daļa rāmīša iekšpusē
  line(ctx, P(0, 0, zb), P(0, 0, -W.L), c.inkDim, Math.max(3, 0.12 * s));
  line(ctx, P(0, 0, -W.L), P(0, 0, W.L), c.inkDim, 1.2, [4, 4]);

  // lauka līnijas (bultas — anotācijās); posmi aiz priekšējā magnēta — raustīti (Ansis 03.11.)
  if (m.show.field) {
    const lw = Math.max(1.2, 0.045 * s);
    const dash = [Math.max(5, 0.17 * s), Math.max(4, 0.13 * s)];
    let first = true;
    for (const y of [1.05, -1.05]) {
      for (const z of [-1.45, 0, 1.45]) {
        const a3 = [-W.magX0, y, z];
        const b3 = [W.magX0, y, z];
        for (const run of hiddenRuns(a3, b3, frontBox)) line(ctx, P(...run.a), P(...run.b), pal.B, lw, run.hidden ? dash : null);
        const a = P(...a3);
        const b = P(...b3);
        const dir = backN ? [b[0] - a[0], b[1] - a[1]] : [a[0] - b[0], a[1] - b[1]]; // lauks no N uz S
        // apakšējām līnijām pirmā bulta tālāk pa kreisi — neuzkāpj uz kontaktiem un sukas
        const heads = [[y < 0 ? -2.2 : -1.0, Math.max(7, 0.2 * s)], [2.35, Math.max(8, 0.26 * s)]].filter(([hx]) => !behindBox([hx, y, z], frontBox));
        notes.push(() => { for (const [hx, size] of heads) head(ctx, P(hx, y, z), dir, size, pal.B); });
        if (first) {
          const tp = P(-2.55, y + 0.34, z);
          notes.push(() => label(ctx, 'B', tp[0], tp[1], { color: pal.B, size: letter, halo, font: SANS }));
          first = false;
        }
      }
    }
  }

  // rāmītis: mala a pie φ, mala b pretī; priekšējā mala pārtraukta pie ass (vadi gar asi uz kontaktiem)
  const ax = W.R * Math.cos(phi);
  const ay = W.R * Math.sin(phi);
  const g = 0.11;
  const ga = [ax * g, ay * g];
  const gb = [-ax * g, -ay * g];
  const L = W.L;
  const comm = st.commutator;
  const zLeadB = comm ? W.comm[0] : W.rings.b[0];
  const zLeadA = comm ? W.comm[0] : W.rings.a[0];
  // malas strāvas virzienā pie I > 0: a — prom (−z), aizmugurē a → b, b — pret skatītāju (+z), priekšā b → a
  const edges = [
    { a: [ax, ay, L], b: [ax, ay, -L], side: 'a' },
    { a: [ax, ay, -L], b: [-ax, -ay, -L] },
    { a: [-ax, -ay, -L], b: [-ax, -ay, L], side: 'b' },
    { a: [-ax, -ay, L], b: [gb[0], gb[1], L] },
    { a: [ga[0], ga[1], L], b: [ax, ay, L] },
    { a: [gb[0], gb[1], L], b: [gb[0], gb[1], zLeadB], lead: true },
    { a: [ga[0], ga[1], zLeadA], b: [ga[0], ga[1], L], lead: true },
  ].map((e) => ({ ...e, d: e.a[0] + e.b[0] + e.a[1] + e.b[1] + e.a[2] + e.b[2] }))
    .sort((u, v) => u.d - v.d);
  for (const e of edges) line(ctx, P(...e.a), P(...e.b), pal.wire, e.lead ? Math.max(1.5, wireW * 0.45) : wireW);
  // strāvas bultas blakus garajām malām (aizmugurējā pusē, lai nekrustojas ar spēku bultām) un aizmugurējai malai;
  // virziens pie I > 0: mala a — prom (−z), aizmugurē no a uz b, mala b — pret skatītāju (+z)
  if (showI) {
    const cph = Math.cos(phi);
    const sph = Math.sin(phi);
    const hl = 0.62; // bultas puse garuma (vienības)
    const specs = [
      { c: [ax, ay, -0.5 * L], d: [0, 0, -1], out: [cph, sph, 0] },
      { c: [-ax, -ay, -0.5 * L], d: [0, 0, 1], out: [-cph, -sph, 0] },
      { c: [-0.5 * ax, -0.5 * ay, -L], d: [-cph, -sph, 0], out: [0, 0, -1], label: true }, // burts I — pie aizmugurējās malas, prom no F
    ];
    for (const sp of specs) {
      const sg = I > 0 ? 1 : -1;
      const pa = P(sp.c[0] - sp.d[0] * hl * sg, sp.c[1] - sp.d[1] * hl * sg, sp.c[2] - sp.d[2] * hl * sg);
      const pb = P(sp.c[0] + sp.d[0] * hl * sg, sp.c[1] + sp.d[1] * hl * sg, sp.c[2] + sp.d[2] * hl * sg);
      const pc = P(...sp.c);
      const po = P(sp.c[0] + sp.out[0], sp.c[1] + sp.out[1], sp.c[2] + sp.out[2]);
      notes.push(() => {
        const r = sideArrow(ctx, pa, pb, [po[0] - pc[0], po[1] - pc[1]], iArrow);
        if (r && sp.label) {
          const off = iArrow.gap * 0.6 + letter * 0.7;
          label(ctx, 'I', r.mid[0] + r.n[0] * off, r.mid[1] + r.n[1] * off, { color: pal.I, size: letter, halo, font: SANS });
        }
      });
    }
  }

  // spēki: vienmēr vertikāli; mala a — uz leju pie I > 0, mala b — uz augšu. Plecs — raustīta līnija no ass.
  if (m.show.force && Math.abs(I) > tiny) {
    // F = BIL — garums ∝ |I|; ļoti mazam spēkam īsākā bulta 0,35 (citādi tā saraujas punktiņā)
    const len = Math.max(0.35, 2.2 * Math.min(1, Math.abs(I) / m.Iref));
    const sgn = Math.sign(I);
    for (const [sx, sy, dir] of [[ax, ay, -sgn * fs], [-ax, -ay, sgn * fs]]) {
      const o = P(0, 0, 0);
      const ov = P(0, sy, 0);
      const os = P(sx, sy, 0);
      const from = os;
      const to = P(sx, sy + dir * len, 0);
      const tl = P(sx, sy + dir * (len + 0.4), 0);
      notes.push(() => {
        if (Math.abs(sx) > 0.06) {
          line(ctx, o, ov, c.inkDim, 1, [2, 3]);
          line(ctx, ov, os, pal.F, Math.max(1.5, 0.05 * s), [5, 4]);
        }
        arrow(ctx, from, to, pal.F, Math.max(3, 0.12 * s), Math.max(11, 0.4 * s) * Math.min(1.4, k), halo);
        label(ctx, 'F', tl[0] - 0.3 * s, tl[1], { color: pal.F, size: letter, halo, font: SANS }); // pa kreisi — strāvas bultas ir pa labi
      });
    }
  }

  // ass priekša
  line(ctx, P(0, 0, L), P(0, 0, W.shaftFront), c.inkDim, Math.max(3, 0.12 * s));

  // kontakti: kolektors (viens pārgriezts gredzens) vai divi gredzeni; sukas sānos — kreisā (−x) un labā (+x).
  // Kreisā suka un tās vads ir aiz rotora — tos zīmē pirms kontaktiem (Ansis 03.11.: oglīte aiz rotora, nevis virs tā).
  const bw = W.bw;
  const zL = comm ? (W.comm[0] + W.comm[1]) / 2 : (W.rings.b[0] + W.rings.b[1]) / 2; // gredzens b — kreisā suka
  const zR = comm ? (W.comm[0] + W.comm[1]) / 2 : (W.rings.a[0] + W.rings.a[1]) / 2; // gredzens a — labā suka
  // vadi: no sukām uz sāniem (x), uz leju (y), pa “grīdu” (z, x) līdz ierīcei — tikai pa asīm (Ansis 03.11.)
  const fy = W.floorY;
  const tz = W.termZ;
  const tx = W.termX;
  const ex = tx + 0.35; // vada līkums ārpus ierīces
  const Iext = commutatorSign(phi, comm) * I; // > 0: no kreisās sukas caur ierīci uz labo
  const brushAndWire = (isLeft) => {
    const sx = isLeft ? -1 : 1;
    const z = isLeft ? zL : zR;
    box(ctx, P, isLeft ? [-W.rc - bw, -W.rc] : [W.rc, W.rc + bw], [-0.13, 0.13], [z - 0.14, z + 0.14], { fill: pal.brush, stroke: c.inkDim });
    const wire = [[sx * (W.rc + bw), 0, z], [sx * ex, 0, z], [sx * ex, fy, z], [sx * ex, fy, tz], [sx * tx, fy, tz]];
    ctx.save();
    ctx.strokeStyle = pal.wire;
    ctx.lineWidth = thin;
    ctx.lineJoin = 'round';
    path(ctx, wire.map((p) => P(...p)));
    ctx.stroke();
    ctx.restore();
    if (m.show.current && Math.abs(Iext) > tiny) {
      const down = (Iext > 0) === isLeft; // kreisajā vadā strāva iet uz leju (uz ierīci), labajā — uz augšu
      const yc = fy / 2;
      const hl = 0.62;
      const pa = P(sx * ex, yc + (down ? hl : -hl), z);
      const pb = P(sx * ex, yc + (down ? -hl : hl), z);
      const pc = P(sx * ex, yc, z);
      const po = P(sx * (ex + 1), yc, z);
      notes.push(() => sideArrow(ctx, pa, pb, [po[0] - pc[0], po[1] - pc[1]], iArrow));
    }
  };
  brushAndWire(true);
  if (comm) {
    const [z0, z1] = W.comm;
    cylinder(ctx, P, W.rc, z0, z1, pal.copper2, c.inkDim);
    // priekšējā virsma: puse a (centrā φ) un puse b (centrā φ + π), sprauga starp tām
    for (const [mid, col] of [[phi, pal.copper], [phi + Math.PI, pal.copper2]]) {
      ctx.save();
      ctx.fillStyle = col;
      path(ctx, [P(0, 0, z1), ...ring(P, W.rc, z1, mid - Math.PI / 2 + 0.12, mid + Math.PI / 2 - 0.12, 20)], true);
      ctx.fill();
      ctx.restore();
    }
    for (const gap of [phi + Math.PI / 2, phi - Math.PI / 2]) {
      const gx = W.rc * Math.cos(gap);
      const gy = W.rc * Math.sin(gap);
      line(ctx, P(0, 0, z1), P(gx, gy, z1), c.field, 2);
      line(ctx, P(gx, gy, z0), P(gx, gy, z1), c.field, 2);
    }
  } else {
    const { a: za, b: zbb } = W.rings;
    for (const [z0, z1] of [zbb, za]) {
      cylinder(ctx, P, W.rc, z0, z1, pal.copper2, c.inkDim);
      ctx.save();
      ctx.fillStyle = pal.copper;
      path(ctx, ring(P, W.rc, z1, 0, Math.PI * 2, 32), true);
      ctx.fill();
      ctx.fillStyle = c.inkDim;
      path(ctx, ring(P, 0.09, z1, 0, Math.PI * 2, 12), true);
      ctx.fill();
      ctx.restore();
    }
  }
  brushAndWire(false);

  // ierīce uz “grīdas” starp spailēm: baterija (motors) vai spuldzīte (ģenerators)
  if (gen) {
    box(ctx, P, [-0.45, 0.45], [fy - 0.25, fy + 0.05], [tz - 0.3, tz + 0.3], { fill: pal.brush, stroke: c.inkDim });
    line(ctx, P(-tx, fy, tz), P(-0.45, fy, tz), pal.wire, thin);
    line(ctx, P(0.45, fy, tz), P(tx, fy, tz), pal.wire, thin);
    const bc = P(0, fy + 0.62, tz);
    const r = 0.5 * s;
    if (m.bulb > 0.01) {
      const glow = ctx.createRadialGradient(bc[0], bc[1], r * 0.2, bc[0], bc[1], r * 2.6);
      glow.addColorStop(0, `rgba(${pal.glow}, ${Math.min(0.95, m.bulb * 1.3)})`);
      glow.addColorStop(1, `rgba(${pal.glow}, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(bc[0], bc[1], r * 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    ctx.fillStyle = c.field;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(bc[0], bc[1], r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = thin;
    ctx.stroke();
    // kvēldiegs
    const q = r * 0.55;
    line(ctx, [bc[0] - q, bc[1] + r * 0.9], [bc[0] - q * 0.5, bc[1]], c.ink, thin);
    line(ctx, [bc[0] + q, bc[1] + r * 0.9], [bc[0] + q * 0.5, bc[1]], c.ink, thin);
    ctx.save();
    ctx.strokeStyle = m.bulb > 0.15 ? `rgb(${pal.glow})` : c.ink;
    ctx.lineWidth = thin;
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const x = bc[0] - q * 0.5 + (q * i) / 8;
      const y = bc[1] + (i % 2 ? -0.12 : 0.12) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    ctx.restore();
  } else {
    // baterija: kastīte; polaritāte — kurā galā + (pozitīva: kreisajā galā −, labajā +)
    const bx = 0.75;
    box(ctx, P, [-bx, bx], [fy - 0.32, fy + 0.32], [tz - 0.32, tz + 0.32], { fill: pal.brush, stroke: c.inkDim });
    line(ctx, P(-tx, fy, tz), P(-bx, fy, tz), pal.wire, thin);
    line(ctx, P(bx, fy, tz), P(tx, fy, tz), pal.wire, thin);
    const plusRight = st.polarity > 0;
    const pPlus = P(plusRight ? bx * 0.55 : -bx * 0.55, fy + 0.32, tz);
    const pMinus = P(plusRight ? -bx * 0.55 : bx * 0.55, fy + 0.32, tz);
    const sz = Math.max(15, 0.55 * s) * Math.min(1.4, k);
    label(ctx, '+', pPlus[0], pPlus[1], { color: c.ink, size: sz, halo });
    label(ctx, '−', pMinus[0], pMinus[1], { color: c.ink, size: sz, halo });
  }

  // priekšējais magnēts (pa labi, daļēji caurspīdīgs): S vai N
  box(ctx, P, [W.magX0, W.magX1], [-W.magY, W.magY], [-W.magZ, W.magZ], { fill: backN ? pal.S : pal.N, alpha: pal.sAlpha, stroke: c.inkDim, width: 1.2 });
  const sC = P((W.magX0 + W.magX1) / 2, W.magY, 0);
  label(ctx, backN ? 'S' : 'N', sC[0], sC[1], { color: c.ink, size: poleSize });

  for (const f of notes) f();
}

// ── grafiks ℰ(t) ──────────────────────────────────────────
// m: { trace, now, settings, colors, theme, legend, lang, emfAmp, fmt }
export function graphLayout(w, h, legend) {
  const k = legend;
  const left = 58; // ⚙ stūris (līdz ~50 px) paliek brīvs
  const right = 18 + 18 * k;
  const compact = h < 150; // zems grafiks: bez virsraksta rindas, mazākas atstarpes
  const top = compact ? 10 : 26 * k + 10;
  const bottom = compact ? 16 * Math.min(k, 1.2) + 4 : 24 * k + 8;
  return { w, h, compact, x0: left, x1: Math.max(left + 40, w - right), y0: top, y1: Math.max(top + 20, h - bottom) };
}

export function drawGraph(ctx, g, m) {
  const c = m.colors;
  const pal = PALETTE[m.theme === 'light' ? 'light' : 'dark'];
  const k = m.legend;
  const { w, h, x0, x1, y0, y1 } = g;
  ctx.clearRect(0, 0, w, h);
  const win = m.window;
  const X = (t) => x0 + ((t - win.from) / (win.to - win.from)) * (x1 - x0);
  const ym = (y0 + y1) / 2;
  const Y = (u) => ym - (u / EMF_AXIS) * ((y1 - y0) / 2);
  const small = Math.max(10, 11 * k);

  // rāmis un iedaļas
  ctx.save();
  ctx.strokeStyle = c.hairline;
  ctx.lineWidth = 1;
  for (const u of [-2, -1, 1, 2]) {
    if (Math.abs(u) > EMF_AXIS) continue;
    path(ctx, [[x0, Y(u)], [x1, Y(u)]]);
    ctx.stroke();
  }
  for (let t = Math.ceil(win.from); t <= win.to + 1e-6; t++) {
    path(ctx, [[X(t), y0], [X(t), y1]]);
    ctx.stroke();
  }
  ctx.restore();
  line(ctx, [x0, ym], [x1, ym], c.inkDim, 1.2);
  line(ctx, [x0, y0 - 6], [x0, y1], c.inkDim, 1.2);
  head(ctx, [x1 + 10, ym], [1, 0], 7, c.inkDim);
  line(ctx, [x1, ym], [x1 + 4, ym], c.inkDim, 1.2);
  head(ctx, [x0, y0 - 10], [0, -1], 7, c.inkDim);
  // vērtības pie ass (ass labajā pusē, lai ⚙ stūris paliek brīvs); zemā grafikā — tikai −2, 0, 2
  const pxPerVolt = (y1 - y0) / (2 * EMF_AXIS);
  const every = pxPerVolt >= small * 1.5 ? 1 : pxPerVolt >= small * 0.8 ? 2 : 3; // 3 — tikai 0
  for (const u of [-2, -1, 0, 1, 2]) {
    if (Math.abs(u) > EMF_AXIS || (every === 3 ? u !== 0 : u % every !== 0)) continue;
    label(ctx, u === 0 ? '0' : u > 0 ? `${u}` : `−${-u}`, x0 + 5, Y(u) - 2, { color: c.inkDim, size: small, align: 'left', base: 'bottom', weight: 400 });
  }
  for (let t = Math.ceil(win.from); t <= win.to + 1e-6; t++) {
    label(ctx, `${t}`, X(t), y1 + 4, { color: c.inkDim, size: small, base: 'top', weight: 400 });
  }
  const axisLabel = Math.max(12, 13 * k);
  if (!g.compact) label(ctx, 'ℰ, V', x0 + 34, y0 - 12, { color: c.ink, size: axisLabel, align: 'left', base: 'middle', font: SANS });
  label(ctx, 't, s', x1 + 12, ym + 6, { color: c.ink, size: Math.max(11, 12 * k), align: 'right', base: 'top', font: SANS, weight: 400 });

  // līknes
  const pts = m.trace.pts.filter((p) => p.t >= win.from - 0.02 && p.t <= win.to + 0.02);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0 - 4, x1 - x0, y1 - y0 + 8);
  ctx.clip();
  if (m.settings.showFlux && pts.length > 1) {
    ctx.save();
    ctx.strokeStyle = pal.B;
    ctx.lineWidth = Math.max(1.5, 1.8 * Math.min(1.5, k));
    ctx.setLineDash([7, 5]);
    path(ctx, pts.map((p) => [X(p.t), Y(p.phi * EMF_AXIS * 0.8)]));
    ctx.stroke();
    ctx.restore();
  }
  if (pts.length > 1) {
    ctx.save();
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = Math.max(2, 2.4 * Math.min(1.5, k));
    ctx.lineJoin = 'round';
    path(ctx, pts.map((p) => [X(p.t), Y(p.u)]));
    ctx.stroke();
    ctx.restore();
    const last = pts[pts.length - 1];
    ctx.fillStyle = c.accent;
    ctx.beginPath();
    ctx.arc(X(last.t), Y(last.u), Math.max(4, 4.5 * Math.min(1.5, k)), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (m.settings.showFlux) label(ctx, 'Φ', x1 + 4, Y(EMF_AXIS * 0.8), { color: pal.B, size: Math.max(12, 13 * k), align: 'left', font: SANS });

  // formula un ℰm augšā pa labi; ar kolektoru zīme no līknes (apgriežot virzienu, līdzstrāva maina polaritāti)
  if (g.compact) return;
  // maiņstrāva no B: ℰ = k·ω·cos(−π/2 + ωt) = ℰm sin ωt neatkarīgi no virziena; apmainīti magnēta poli — mīnuss
  let formula = (m.settings.field ?? 1) < 0 ? 'ℰ = −ℰm sin ωt' : 'ℰ = ℰm sin ωt';
  if (m.settings.commutator) {
    const recent = pts.slice(-60);
    const mean = recent.reduce((a, p) => a + p.u, 0) / Math.max(1, recent.length);
    formula = mean < 0 ? 'ℰ = −|ℰm sin ωt|' : 'ℰ = |ℰm sin ωt|';
  }
  const fsize = Math.max(11, 12.5 * k);
  const amp = `ℰm = ${m.fmt(m.emfAmp, 2)} V`;
  ctx.save();
  ctx.font = `600 ${axisLabel}px ${SANS}`;
  const leftEnd = x0 + 34 + ctx.measureText('ℰ, V').width + 16; // neuzkāpt uz “ℰ, V”
  ctx.font = `400 ${fsize}px ${SANS}`;
  const full = `${formula}    ${amp}`;
  const text = x1 - ctx.measureText(full).width >= leftEnd ? full : x1 - ctx.measureText(amp).width >= leftEnd ? amp : '';
  ctx.restore();
  if (text) label(ctx, text, x1, y0 - 12, { color: c.ink, size: fsize, align: 'right', font: SANS, weight: 400, halo: c.field });
}
