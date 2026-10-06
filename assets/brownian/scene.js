// assets/brownian/scene.js
// Zīmē pasauli pa visu laukumu bez rāmja: molekulas (blāvas tintes punkti), putekli (akcenta disks),
// trajektoriju (tinte, izbāl uz vēsturi). Bez bultiņas un sākuma zīmes (Ansis 06.10). Koordinātas pasaules vienībās → px caur lay.
import { DUST_R, MOL_R, LENS_MAG, LENS_R_FACTOR } from './model.js';

export function drawScene(ctx, lay, m) {
  const { world, settings: s, colors: c } = m;
  const W = ctx.canvas.clientWidth;
  const H = ctx.canvas.clientHeight;
  ctx.clearRect(0, 0, W, H);
  const X = (x) => lay.x0 + x * lay.scale;
  const Y = (y) => lay.y0 + y * lay.scale;
  const k = lay.drawScale ?? 1; // ⚙ ZĪMĒJUMS — daļiņu izmērs, ne pasaule
  ctx.save();

  if (s.molecules) {
    const r = Math.max(1.2, MOL_R * lay.scale * k);
    ctx.fillStyle = c.inkDim;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (const p of world.mol) {
      ctx.moveTo(X(p.x) + r, Y(p.y));
      ctx.arc(X(p.x), Y(p.y), r, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (s.trail && world.trail.length > 1) {
    const tr = world.trail;
    const n = tr.length;
    const seg = 24;
    ctx.lineWidth = 1.25;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = c.ink;
    for (let i = 0; i < seg; i++) {
      const a = Math.floor((i / seg) * (n - 1));
      const b = Math.floor(((i + 1) / seg) * (n - 1));
      if (b <= a) continue;
      ctx.globalAlpha = 0.15 + 0.75 * ((i + 1) / seg);
      ctx.beginPath();
      ctx.moveTo(X(tr[a].x), Y(tr[a].y));
      for (let j = a + 1; j <= b; j++) ctx.lineTo(X(tr[j].x), Y(tr[j].y));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  const d = world.dust;
  ctx.fillStyle = c.accent;
  ctx.beginPath();
  ctx.arc(X(d.x), Y(d.y), DUST_R * lay.scale * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (s.lens && m.lens) drawLens(ctx, lay, m, k);
}

// Lupa: aplis ap m.lens (pasaules koordinātas, seko puteklim maigi); iekšā tas pats laukums LENS_MAG reizes lielāks —
// molekulas vienmēr redzamas (arī tad, ja vispārējais rādījums izslēgts), puteklis novirzās no centra ar katru grūdienu.
function drawLens(ctx, lay, m, k) {
  const { world, settings: s, colors: c } = m;
  const mag = LENS_MAG;
  const Rd = DUST_R * lay.scale * k; // putekļa rādiuss ekrānā (bez lupas)
  const R = LENS_R_FACTOR * Rd * mag; // lupas rādiuss = 5 × palielinātais puteklis
  const cx = lay.x0 + m.lens.x * lay.scale;
  const cy = lay.y0 + m.lens.y * lay.scale;
  const LX = (x) => cx + (x - m.lens.x) * lay.scale * mag;
  const LY = (y) => cy + (y - m.lens.y) * lay.scale * mag;
  const reach = R / (lay.scale * mag) + MOL_R; // pasaules vienības no lupas centra, kas ietilpst lupā

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = c.field;
  ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);

  if (s.trail && world.trail.length > 1) {
    const tr = world.trail;
    ctx.strokeStyle = c.ink;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.25;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(LX(tr[0].x), LY(tr[0].y));
    for (let i = 1; i < tr.length; i++) ctx.lineTo(LX(tr[i].x), LY(tr[i].y));
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  const r = Math.max(1.5, MOL_R * lay.scale * k) * mag;
  ctx.fillStyle = c.inkDim;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  for (const p of world.mol) {
    if (Math.abs(p.x - m.lens.x) > reach || Math.abs(p.y - m.lens.y) > reach) continue;
    ctx.moveTo(LX(p.x) + r, LY(p.y));
    ctx.arc(LX(p.x), LY(p.y), r, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.globalAlpha = 1;

  const d = world.dust;
  ctx.fillStyle = c.accent;
  ctx.beginPath();
  ctx.arc(LX(d.x), LY(d.y), Rd * mag, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ietvars un rokturis
  ctx.save();
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  const a = Math.PI / 4;
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(a) * (R + 2), cy + Math.sin(a) * (R + 2));
  ctx.lineTo(cx + Math.cos(a) * (R + 0.45 * R), cy + Math.sin(a) * (R + 0.45 * R));
  ctx.stroke();
  ctx.restore();
}
