// assets/brownian/model.js
// Brauna kustība (M-01): tīrā fizika bez DOM. Trauks (pasaules vienības), N molekulas kā punkti ar masu m, viena liela daļiņa
// (puteklis) ar masu M un rādiusu R. Molekulas cita ar citu nesaduras (ideāla gāze), ar putekli — elastīgi; no sienām atlec.
// Temperatūra tikai mērogo molekulu ātrumus: v ∝ √T. Puteklis termalizējas pats caur sadursmēm.
import { roundTo } from '../measure/format.js';
import { mulberry32, gaussian } from '../measure/rng.js';

export const BOX_H = 250; // pasaules vienības; platums seko ekrāna proporcijai
export const BOX_W_DEFAULT = 400;
export const BOX_W_MIN = 100; // telefons stāvus: pasaule aizpilda visu laukumu arī šaurā ekrānā
export const BOX_W_MAX = 900;
export const DENSITY = 900 / (BOX_W_DEFAULT * BOX_H); // molekulas uz laukuma vienību (900 uz 400 × 250; 06.10 blīvāk, jo lēnāk)
export const DUST_R = 4; // 2× mazāks (Ansis 06.10)
export const DUST_M = 15; // molekulas masa = 1 (06.10: vieglāks, lai lēnie grūdieni ir redzami)
export const MOL_R = 1.2;
export const T_REF = 300; // K
export const V_REF = 25; // vienības/s — molekulu v_rms pie T_REF (Ansis 06.10: pie 300 K atsevišķai molekulai var izsekot ar aci, pie 50 K puteklis knapi kustas); 50 K ≈ 10, 1000 K ≈ 46
export const RANGES = { T: { min: 50, max: 1000, step: 25 } };
export const TRAIL_MAX = 2400; // punkti (~40 s pie 60 kadriem)
export const SUB_STEPS = 4;
export const MAX_DT = 0.05;

export function defaultSettings() {
  return { T: 300, trail: false, molecules: false }; // noklusēti tikai oranžs punkts (Ansis 06.10)
}
export function withT(s, v) {
  if (!Number.isFinite(v)) return s;
  const T = roundTo(Math.min(RANGES.T.max, Math.max(RANGES.T.min, v)), RANGES.T.step);
  return T === s.T ? s : { ...s, T };
}
export const withTrail = (s, on) => (Boolean(on) === s.trail ? s : { ...s, trail: Boolean(on) });
export const withMolecules = (s, on) => (Boolean(on) === s.molecules ? s : { ...s, molecules: Boolean(on) });

export const vRms = (T) => V_REF * Math.sqrt(T / T_REF);
export const moleculeCount = (w, h) => Math.max(50, Math.round(DENSITY * w * h));

// Jauna aina: molekulas vienmērīgi pa trauku, ātrumi pēc Maksvela (Gausa komponentes), puteklis centrā miera stāvoklī
export function createWorld(w, h, T, seed = 1) {
  const rand = mulberry32(seed);
  const n = moleculeCount(w, h);
  const sigma = vRms(T) / Math.SQRT2;
  const mol = [];
  for (let i = 0; i < n; i++) {
    const x = MOL_R + rand() * (w - 2 * MOL_R);
    const y = MOL_R + rand() * (h - 2 * MOL_R);
    // ne putekļa iekšienē
    if (Math.hypot(x - w / 2, y - h / 2) < DUST_R + MOL_R + 1) { i--; continue; }
    mol.push({ x, y, vx: gaussian(rand) * sigma, vy: gaussian(rand) * sigma });
  }
  return { w, h, T, mol, dust: { x: w / 2, y: h / 2, vx: 0, vy: 0 }, trail: [{ x: w / 2, y: h / 2 }], t: 0, hits: 0, rand };
}

// Temperatūras maiņa: visi molekulu ātrumi × √(T₂/T₁); puteklis paliek (termalizējas pats)
export function setTemperature(world, T) {
  if (T === world.T) return world;
  const k = Math.sqrt(T / world.T);
  for (const p of world.mol) { p.vx *= k; p.vy *= k; }
  world.T = T;
  return world;
}

// Trauka izmēra maiņa: pozīcijas proporcionāli, molekulu skaits pēc blīvuma (pieliek vai noņem), ātrumi paliek
export function resizeWorld(world, w, h) {
  if (w === world.w && h === world.h) return world;
  const kx = w / world.w;
  const ky = h / world.h;
  for (const p of world.mol) { p.x *= kx; p.y *= ky; }
  world.dust.x *= kx;
  world.dust.y *= ky;
  for (const p of world.trail) { p.x *= kx; p.y *= ky; }
  world.w = w;
  world.h = h;
  const want = moleculeCount(w, h);
  const sigma = vRms(world.T) / Math.SQRT2;
  while (world.mol.length > want) world.mol.pop();
  while (world.mol.length < want) {
    world.mol.push({ x: MOL_R + world.rand() * (w - 2 * MOL_R), y: MOL_R + world.rand() * (h - 2 * MOL_R), vx: gaussian(world.rand) * sigma, vy: gaussian(world.rand) * sigma });
  }
  return world;
}

export function resetDust(world) {
  world.dust = { x: world.w / 2, y: world.h / 2, vx: 0, vy: 0 };
  world.trail = [{ x: world.dust.x, y: world.dust.y }];
  world.t = 0;
  world.hits = 0;
  return world;
}
export function clearTrail(world) {
  world.trail = [{ x: world.dust.x, y: world.dust.y }];
  return world;
}

function reflect(p, r, w, h) {
  if (p.x < r) { p.x = 2 * r - p.x; p.vx = Math.abs(p.vx); }
  else if (p.x > w - r) { p.x = 2 * (w - r) - p.x; p.vx = -Math.abs(p.vx); }
  if (p.y < r) { p.y = 2 * r - p.y; p.vy = Math.abs(p.vy); }
  else if (p.y > h - r) { p.y = 2 * (h - r) - p.y; p.vy = -Math.abs(p.vy); }
}

// Elastīga sadursme starp molekulu (masa 1) un putekli (masa M) pa normāli; atdod true, ja notika
export function collide(p, dust, M = DUST_M, R = DUST_R, r = MOL_R) {
  const dx = p.x - dust.x;
  const dy = p.y - dust.y;
  const d2 = dx * dx + dy * dy;
  const minD = R + r;
  if (d2 >= minD * minD || d2 === 0) return false;
  const d = Math.sqrt(d2);
  const nx = dx / d;
  const ny = dy / d;
  const rel = (p.vx - dust.vx) * nx + (p.vy - dust.vy) * ny; // relatīvais ātrums pa normāli (negatīvs — tuvojas)
  // izstumj molekulu no putekļa
  const push = minD - d;
  p.x += nx * push;
  p.y += ny * push;
  if (rel >= 0) return false;
  const j = (2 * rel) / (1 + M); // impulss uz masas vienību
  p.vx -= j * M * nx;
  p.vy -= j * M * ny;
  dust.vx += j * nx;
  dust.vy += j * ny;
  return true;
}

export function step(world, dt) {
  const h = Math.min(dt, MAX_DT) / SUB_STEPS;
  const { w, h: H, dust } = world;
  for (let s = 0; s < SUB_STEPS; s++) {
    for (const p of world.mol) {
      p.x += p.vx * h;
      p.y += p.vy * h;
      reflect(p, MOL_R, w, H);
      if (collide(p, dust)) world.hits++;
    }
    dust.x += dust.vx * h;
    dust.y += dust.vy * h;
    reflect(dust, DUST_R, w, H);
  }
  world.t += Math.min(dt, MAX_DT);
  const last = world.trail[world.trail.length - 1];
  if (!last || Math.hypot(dust.x - last.x, dust.y - last.y) > 0.3) {
    world.trail.push({ x: dust.x, y: dust.y });
    if (world.trail.length > TRAIL_MAX) world.trail.shift();
  }
  return world;
}

export function kineticEnergy(world) {
  let e = 0;
  for (const p of world.mol) e += 0.5 * (p.vx * p.vx + p.vy * p.vy);
  e += 0.5 * DUST_M * (world.dust.vx ** 2 + world.dust.vy ** 2);
  return e;
}

// Izkārtojums: pasaule ir viss laukums zem vadības (bez rāmja, Ansis 06.10): augstums BOX_H vienības, platums pēc proporcijas.
// Ja platums nogriezts līdz robežai (ļoti šaurs vai plats ekrāns), mērogs seko platumam un pasaule ir centrēta.
export function boxLayout(availW, availH) {
  const w = Math.min(BOX_W_MAX, Math.max(BOX_W_MIN, Math.round((BOX_H * availW) / Math.max(1, availH))));
  const scale = Math.min(availH / BOX_H, availW / w);
  return { w, h: BOX_H, scale, pxW: w * scale, pxH: BOX_H * scale, fill: 1 };
}
