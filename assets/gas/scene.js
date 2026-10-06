// assets/gas/scene.js
// Cilindrs ar virzuli rasējuma stilā: sienas tintē, gāzes lauks, molekulas blāvas tintes punkti, virzulis — štrihots disks
// ar kātu un rokturi; tilpuma izmēru līnija pa kreisi. Koordinātas: pasaules vienības (BOX_W × H_MAX) → px caur lay.
import { BOX_W, H_MAX, MOL_R } from './model.js';

const MONO = '"IBM Plex Mono", ui-monospace, monospace';
const WALL = 3; // px — sienu biezums

export function drawScene(ctx, lay, m) {
  const { gas, colors: c, legend: k } = m;
  const W = ctx.canvas.clientWidth;
  const H = ctx.canvas.clientHeight;
  ctx.clearRect(0, 0, W, H);
  const X = (x) => lay.x0 + x * lay.scale;
  const Y = (y) => lay.y0 + (H_MAX - y) * lay.scale; // y uz augšu no dibena
  const left = X(0);
  const right = X(BOX_W);
  const bottom = Y(0);
  const top = Y(H_MAX);
  const pistonY = Y(gas.piston);
  const pistonH = Math.max(10, 0.035 * H_MAX * lay.scale);

  ctx.save();
  // gāzes lauks
  ctx.fillStyle = c.field;
  ctx.fillRect(left, pistonY, right - left, bottom - pistonY);
  // molekulas
  const r = Math.max(1.3, MOL_R * lay.scale);
  ctx.fillStyle = c.inkDim;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  for (const p of gas.mol) {
    ctx.moveTo(X(p.x) + r, Y(p.y));
    ctx.arc(X(p.x), Y(p.y), r, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.globalAlpha = 1;

  // cilindra sienas: kreisā, labā, dibens (tintē, biezas); augšā vaļā
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = WALL;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(left - WALL / 2, top - 8 * k);
  ctx.lineTo(left - WALL / 2, bottom + WALL / 2);
  ctx.lineTo(right + WALL / 2, bottom + WALL / 2);
  ctx.lineTo(right + WALL / 2, top - 8 * k);
  ctx.stroke();
  // sienu štrihs ārpusē (griezums)
  ctx.lineWidth = 1;
  ctx.strokeStyle = c.inkDim;
  ctx.beginPath();
  for (let y = top; y < bottom; y += 9) {
    ctx.moveTo(left - WALL - 7, y + 7);
    ctx.lineTo(left - WALL, y);
    ctx.moveTo(right + WALL, y + 7);
    ctx.lineTo(right + WALL + 7, y);
  }
  for (let x = left; x < right; x += 9) {
    ctx.moveTo(x, bottom + WALL + 7);
    ctx.lineTo(x + 7, bottom + WALL);
  }
  ctx.stroke();

  // virzulis: disks ar štrihu, kāts līdz augšai, rokturis
  ctx.fillStyle = c.sheet;
  ctx.fillRect(left, pistonY - pistonH, right - left, pistonH);
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, pistonY - pistonH, right - left, pistonH);
  ctx.clip();
  ctx.strokeStyle = c.inkDim;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = left - pistonH; x < right + pistonH; x += 6) {
    ctx.moveTo(x, pistonY);
    ctx.lineTo(x + pistonH, pistonY - pistonH);
  }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = 2;
  ctx.strokeRect(left + 1, pistonY - pistonH + 1, right - left - 2, pistonH - 2);
  const cx = (left + right) / 2;
  const rodW = Math.max(6, 0.06 * (right - left));
  ctx.fillStyle = c.sheet;
  ctx.fillRect(cx - rodW / 2, lay.rodTop, rodW, pistonY - pistonH - lay.rodTop);
  ctx.strokeRect(cx - rodW / 2, lay.rodTop, rodW, pistonY - pistonH - lay.rodTop);
  // rokturis — plats T augšā
  const grip = Math.max(30, 0.3 * (right - left));
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - grip / 2, lay.rodTop);
  ctx.lineTo(cx + grip / 2, lay.rodTop);
  ctx.stroke();

  // tilpuma izmēru līnija pa kreisi: no dibena līdz virzulim, uzraksts V
  const dx = left - WALL - 26 * k;
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = 1;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(dx, bottom);
  ctx.lineTo(dx, pistonY);
  ctx.moveTo(dx - 4, bottom + 4); ctx.lineTo(dx + 4, bottom - 4);
  ctx.moveTo(dx - 4, pistonY + 4); ctx.lineTo(dx + 4, pistonY - 4);
  ctx.stroke();
  ctx.font = `400 ${12 * k}px ${MONO}`;
  ctx.fillStyle = c.ink;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('V', dx - 6 * k, (bottom + pistonY) / 2);
  ctx.restore();

  return { piston: { x: left, y: pistonY - pistonH, w: right - left, h: pistonH }, rod: { x: cx - rodW / 2, y: lay.rodTop, w: rodW, h: pistonY - pistonH - lay.rodTop }, grip: { x: cx - grip / 2, y: lay.rodTop - 6, w: grip, h: 12 } };
}

// Izkārtojums: cilindrs ietilpst dotajā laukumā (px); virs cilindra vieta kātam un rokturim
export function cylinderLayout(avail, { drawScale = 1 } = {}) {
  const headroom = Math.max(70, 0.12 * avail.h); // px — brīva vieta virs cilindra (rokturis un gaiss; Ansis 06.10: tālāk no malām)
  const footroom = Math.max(50, 0.09 * avail.h);
  const k = Math.min(1, drawScale);
  const usableH = (avail.h - headroom - footroom) * k;
  const usableW = (avail.w - 60) * k;
  const scale = Math.min(usableH / H_MAX, usableW / BOX_W);
  const pxW = BOX_W * scale;
  const pxH = H_MAX * scale;
  const x0 = avail.x + (avail.w - pxW) / 2 + 12; // mazliet pa labi — izmēru līnijai vieta pa kreisi
  const y0 = avail.y + headroom + (avail.h - headroom - footroom - pxH) / 2;
  return { x0, y0, scale, pxW, pxH, rodTop: y0 - Math.min(headroom - 10, 0.2 * pxH + 30), fill: 1 };
}
