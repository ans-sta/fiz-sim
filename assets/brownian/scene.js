// assets/brownian/scene.js
// Zīmē trauku (matu līnija), molekulas (blāvas tintes punkti), putekli (akcenta disks), trajektoriju (tinte, izbāl uz vēsturi)
// un bultiņu putekļa kustības virzienā. Visas koordinātas pasaules vienībās → px caur lay.
import { DUST_R, MOL_R } from './model.js';

export function drawScene(ctx, lay, m) {
  const { world, settings: s, colors: c } = m;
  const W = ctx.canvas.clientWidth;
  const H = ctx.canvas.clientHeight;
  ctx.clearRect(0, 0, W, H);
  const X = (x) => lay.x0 + x * lay.scale;
  const Y = (y) => lay.y0 + y * lay.scale;
  ctx.save();

  // trauks
  ctx.fillStyle = c.field;
  ctx.fillRect(X(0), Y(0), world.w * lay.scale, world.h * lay.scale);
  ctx.strokeStyle = c.hairline;
  ctx.lineWidth = 1;
  ctx.strokeRect(Math.round(X(0)) + 0.5, Math.round(Y(0)) + 0.5, Math.round(world.w * lay.scale), Math.round(world.h * lay.scale));

  ctx.beginPath();
  ctx.rect(X(0), Y(0), world.w * lay.scale, world.h * lay.scale);
  ctx.clip();

  // molekulas — punkti; ja nerāda, tās tāpat kustas (modelis), tikai nav zīmētas
  if (s.molecules) {
    const r = Math.max(1.2, MOL_R * lay.scale);
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

  // trajektorija — pa posmiem, jaunākais spilgts, vecākais izbāl
  if (s.trail && world.trail.length > 1) {
    const tr = world.trail;
    const n = tr.length;
    const seg = 24; // posmu skaits ar savu caurspīdīgumu
    ctx.lineWidth = 1.25;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = c.ink;
    for (let k = 0; k < seg; k++) {
      const a = Math.floor((k / seg) * (n - 1));
      const b = Math.floor(((k + 1) / seg) * (n - 1));
      if (b <= a) continue;
      ctx.globalAlpha = 0.15 + 0.75 * ((k + 1) / seg);
      ctx.beginPath();
      ctx.moveTo(X(tr[a].x), Y(tr[a].y));
      for (let i = a + 1; i <= b; i++) ctx.lineTo(X(tr[i].x), Y(tr[i].y));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // sākuma punkts — mazs krustiņš
    const s0 = tr[0];
    ctx.strokeStyle = c.inkDim;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(X(s0.x) - 4, Y(s0.y));
    ctx.lineTo(X(s0.x) + 4, Y(s0.y));
    ctx.moveTo(X(s0.x), Y(s0.y) - 4);
    ctx.lineTo(X(s0.x), Y(s0.y) + 4);
    ctx.stroke();
  }

  // puteklis
  const d = world.dust;
  const R = DUST_R * lay.scale;
  ctx.fillStyle = c.accent;
  ctx.beginPath();
  ctx.arc(X(d.x), Y(d.y), R, 0, Math.PI * 2);
  ctx.fill();

  // bultiņa kustības virzienā (garums pēc ātruma, robežās), tintē
  const v = Math.hypot(d.vx, d.vy);
  if (s.trail && v > 1) {
    const len = Math.min(R * 4, R + (v / 60) * R * 3);
    const ux = d.vx / v;
    const uy = d.vy / v;
    const x1 = X(d.x) + ux * R;
    const y1 = Y(d.y) + uy * R;
    const x2 = X(d.x) + ux * (R + len);
    const y2 = Y(d.y) + uy * (R + len);
    ctx.strokeStyle = c.ink;
    ctx.fillStyle = c.ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const hd = 6;
    const an = Math.atan2(uy, ux);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - hd * Math.cos(an - 0.5), y2 - hd * Math.sin(an - 0.5));
    ctx.lineTo(x2 - hd * Math.cos(an + 0.5), y2 - hd * Math.sin(an + 0.5));
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
