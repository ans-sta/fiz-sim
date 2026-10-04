// assets/oscillation/scene.js
// Zīmē ainu: ass, riņķu kontūras (palīglīnijas), 41 punkts, oranžais pirmais; palīglīnijas pa stāvokļiem; izmēru līnijas A un λ.
// Visas koordinātas nāk no model.js projekcijas; šeit tikai pikseļi un krāsas. Caurspīdīgums pārejās: no pozas (0…1).
import { AXIS_CM, CREST, COMPRESSION, smooth, scenePoints, circleOutline, waveCurve, phaseZ, phaseAt, lambdaSpan, toScreen, project, point3D } from './model.js';

const MONO = 'ui-monospace, monospace';
const fontLabel = (k = 1) => `400 ${11 * k}px "IBM Plex Mono", ${MONO}`;
const R_POINT = 3.5; // px — parastie punkti
const R_FIRST = 6; // px — oranžais punkts
const ARC_PX = 16; // φ loka rādiuss
const DIM_GAP = 18; // px no viļņa līdz λ izmēru līnijai

function path(ctx, pts) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
}
function strokeStyle(ctx, color, alpha = 1, width = 1, dash = []) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
}
function text(ctx, str, x, y, { font, color, align = 'left', alpha = 1 }) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}
function dot(ctx, p, r, color, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
}
function tick45(ctx, p, len = 6) {
  const k = len / 2 / Math.SQRT2;
  ctx.beginPath();
  ctx.moveTo(p.x - k, p.y + k);
  ctx.lineTo(p.x + k, p.y - k);
  ctx.stroke();
}
// Izmēru līnija starp diviem ekrāna punktiem ar 45° atzīmēm galos un uzrakstu vidū (perpendikulāri nobīdītu par `off`).
function dimLine(ctx, a, b, label, off, m, alpha) {
  strokeStyle(ctx, m.colors.ink, alpha);
  path(ctx, [a, b]);
  ctx.stroke();
  tick45(ctx, a);
  tick45(ctx, b);
  const k = m.legend;
  const mx = (a.x + b.x) / 2 + off.x * (6 + 6 * k);
  const my = (a.y + b.y) / 2 + off.y * (6 + 6 * k) + (off.y > 0 ? 9 * k : off.y < 0 ? 0 : 4 * k);
  text(ctx, label, mx, my, { font: fontLabel(k), color: m.colors.ink, align: off.x > 0 ? 'left' : off.x < 0 ? 'right' : 'center', alpha });
}

export function drawScene(ctx, lay, m) {
  const { settings: s, phase, pose, angles, colors: c } = m;
  const κ = angles.kappaRad;
  const S = (pt) => toScreen(lay, pt, κ);
  const side = smooth(pose.kappa); // 0 — no gala, 1 — no sāna
  const turned = smooth(pose.theta); // 0 — šķērs, 1 — garen
  const circleA = 1 - side;
  const transA = side * (1 - turned);
  const longA = side * turned;
  const dimTrans = Math.max(0, (transA - 0.5) * 2); // izmēru līnijas — tikai galastāvokļa otrajā pusē
  const dimLong = Math.max(0, (longA - 0.5) * 2);
  const W = ctx.canvas.clientWidth || lay.cx * 2;
  const H = ctx.canvas.clientHeight || lay.cy * 2;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.lineCap = 'round';

  const pts = scenePoints(s, phase, angles);
  const origin = S({ u: 0, w: 0 });
  // izmēru līniju enkuri caur to pašu projekciju kā punkti — pārejās tie seko kamerai un svītrām
  const Z = (z) => S(project({ x: 0, y: 0, z }, κ)); // punkts uz ass
  const tip = (z) => S(project(point3D(CREST, z, s.A, angles.thetaRad), κ)); // svītras gals (kalns / galējais stāvoklis)
  const onWave = (z) => S(project(point3D(phaseAt(phase, z, s.lambda), z, s.A, angles.thetaRad), κ)); // viļņa punkts pie z

  // ass (sānskatā; no gala tā ir punkts)
  if (side > 0) {
    strokeStyle(ctx, c.hairline, side);
    path(ctx, [S(project({ x: 0, y: 0, z: 0 }, κ)), S(project({ x: 0, y: 0, z: AXIS_CM }, κ))]);
    ctx.stroke();
  }

  if (s.lines) {
    // riņķu kontūras: no gala — viens aplis; no sāna — svītras (vertikālas → gar asi)
    for (const p of pts) {
      strokeStyle(ctx, c.hairline, p.i === 0 ? 0.9 : 0.45);
      path(ctx, circleOutline(p.z, s.A, angles).map(S));
      ctx.stroke();
    }
    // sinusoīda caur punktiem — tikai šķērsviļņa stāvoklī (iebāl/izbāl)
    if (transA > 0.01) {
      strokeStyle(ctx, c.inkDim, transA, 1);
      path(ctx, waveCurve(s, phase, angles).map(S));
      ctx.stroke();
    }
    // APLIS: rādiuss, abi diametri (horizontālais — φ atskaites līnija), projekcija, φ loks
    if (circleA > 0.01) {
      const first = S(pts[0]);
      strokeStyle(ctx, c.hairline, circleA);
      path(ctx, [S({ u: 0, w: s.A }), S({ u: 0, w: -s.A })]);
      ctx.stroke();
      path(ctx, [S(project({ x: -s.A, y: 0, z: 0 }, κ)), S(project({ x: s.A, y: 0, z: 0 }, κ))]);
      ctx.stroke();
      strokeStyle(ctx, c.ink, circleA);
      path(ctx, [origin, first]);
      ctx.stroke();
      strokeStyle(ctx, c.accent, circleA, 1, [4, 4]);
      path(ctx, [first, { x: origin.x, y: first.y }]);
      ctx.stroke();
      dot(ctx, { x: origin.x, y: first.y }, 3, c.accent, circleA);
      const phi = ((pts[0].phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      strokeStyle(ctx, c.ink, circleA, 1);
      ctx.beginPath();
      ctx.arc(origin.x, origin.y, ARC_PX, 0, -phi, true); // ekrāna y uz leju → pretēji pulksteņa rādītājam
      ctx.stroke();
      const mid = -phi / 2;
      text(ctx, 'φ', origin.x + Math.cos(mid) * (ARC_PX + 8 * m.legend), origin.y + Math.sin(mid) * (ARC_PX + 8 * m.legend) + 4 * m.legend,
        { font: fontLabel(m.legend), color: c.ink, align: 'center', alpha: circleA });
    }
    // ŠĶĒRSVILNIS: A līdz kalnam, λ starp kalniem
    if (dimTrans > 0.01) {
      const zc = phaseZ(phase, s.lambda, CREST);
      dimLine(ctx, Z(zc), tip(zc), 'A', { x: 1, y: 0 }, m, dimTrans);
      const { z1, z2 } = lambdaSpan(phase, s.lambda, CREST);
      const yDim = S({ u: 0, w: s.A }).y - DIM_GAP;
      strokeStyle(ctx, c.hairline, dimTrans, 1, [3, 3]);
      const c1 = onWave(z1);
      const c2 = onWave(z2);
      path(ctx, [c1, { x: c1.x, y: yDim }]);
      ctx.stroke();
      path(ctx, [c2, { x: c2.x, y: yDim }]);
      ctx.stroke();
      dimLine(ctx, { x: c1.x, y: yDim }, { x: c2.x, y: yDim }, 'λ', { x: 0, y: -1 }, m, dimTrans);
    }
    // GARENVILNIS: A no pirmā punkta centra līdz tā galējam stāvoklim, λ starp sablīvējumiem
    if (dimLong > 0.01) {
      const yA = lay.cy + 14 + 6 * m.legend;
      strokeStyle(ctx, c.hairline, dimLong, 1, [3, 3]);
      path(ctx, [origin, { x: origin.x, y: yA }]);
      ctx.stroke();
      const xA = tip(0).x;
      path(ctx, [{ x: xA, y: origin.y }, { x: xA, y: yA }]);
      ctx.stroke();
      dimLine(ctx, { x: origin.x, y: yA }, { x: xA, y: yA }, 'A', { x: 0, y: 1 }, m, dimLong);
      const { z1, z2 } = lambdaSpan(phase, s.lambda, COMPRESSION);
      const yL = lay.cy - 14 - 6 * m.legend;
      strokeStyle(ctx, c.hairline, dimLong, 1, [3, 3]);
      const k1 = Z(z1);
      const k2 = Z(z2);
      path(ctx, [k1, { x: k1.x, y: yL }]);
      ctx.stroke();
      path(ctx, [k2, { x: k2.x, y: yL }]);
      ctx.stroke();
      dimLine(ctx, { x: k1.x, y: yL }, { x: k2.x, y: yL }, 'λ', { x: 0, y: -1 }, m, dimLong);
    }
  }

  // punkti: vispirms pārējie, oranžais pēdējais (virsū)
  for (let i = pts.length - 1; i >= 1; i--) dot(ctx, S(pts[i]), R_POINT, c.ink, 0.9);
  dot(ctx, S(pts[0]), R_FIRST, c.accent, 1);
  ctx.restore();
}
