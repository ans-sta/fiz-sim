// assets/brownian/scene.js
// Zīmē pasauli pa visu laukumu bez rāmja: molekulas (blāvas tintes punkti), putekli (akcenta disks),
// trajektoriju (tinte, izbāl uz vēsturi). Bez bultiņas un sākuma zīmes (Ansis 06.10). Koordinātas pasaules vienībās → px caur lay.
import { DUST_R, MOL_R } from './model.js';

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
}
