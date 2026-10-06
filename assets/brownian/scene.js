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
// molekulas tikai, ja MOLEKULAS ieslēgtas (viena poga, neatkarīgi no lupas; Ansis 06.10), puteklis novirzās no centra ar katru grūdienu.
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

  drawLensShadow(ctx, cx, cy, R, c);
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

  if (s.molecules) {
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
  }

  const d = world.dust;
  ctx.fillStyle = c.accent;
  ctx.beginPath();
  ctx.arc(LX(d.x), LY(d.y), Rd * mag, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawLensFrame(ctx, cx, cy, R, c);
}

// Lupas ķermenis rasējuma manierē (Ansis 06.10): štrihota ēna uz papīra, ietvars ar mainīgu līnijas resnumu (gaisma no augšas
// kreisās puses), radiāls štrihs uz slīpuma, apaļš rokturis ar garenisku štrihu kā cilindrs, uzmava pie ietvara, stikla atspīdums.
const TAU = Math.PI * 2;
const LIGHT = -3 * Math.PI / 4; // gaismas virziens (uz augšu pa kreisi) — ēna un biezākās līnijas pretējā pusē
function hatch(ctx, x, y, w, h, spacing, angle) {
  // paralēlas līnijas leņķī `angle` taisnstūrī (x, y, w, h); saucējs jau ir uzlicis clip
  const d = Math.hypot(w, h);
  const cx = x + w / 2;
  const cy = y + h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.beginPath();
  for (let o = -d / 2; o <= d / 2; o += spacing) {
    ctx.moveTo(-d / 2, o);
    ctx.lineTo(d / 2, o);
  }
  ctx.stroke();
  ctx.restore();
}
const HANDLE_ANG = Math.PI / 4;
const handleW = (R) => 0.11 * R; // puse no roktura platuma
const handleLen = (R) => 0.62 * R;
function handlePath(ctx, R) {
  // roktura kontūra lokālajās koordinātās (sākums pie ietvara, +x gar rokturi)
  const w = handleW(R);
  const len = handleLen(R);
  ctx.beginPath();
  ctx.moveTo(0, -w);
  ctx.lineTo(len, -w);
  ctx.arc(len, 0, w, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(0, w);
  ctx.closePath();
}
function drawLensShadow(ctx, cx, cy, R, c) {
  const dx = 0.07 * R;
  const dy = 0.09 * R;
  ctx.save();
  ctx.strokeStyle = c.inkDim;
  ctx.lineWidth = 0.8;
  ctx.globalAlpha = 0.6;
  // lupas ēna — tikai ārpus lupas
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx + dx, cy + dy, R + 2, 0, TAU);
  ctx.arc(cx, cy, R + 1, 0, TAU, true);
  ctx.clip('evenodd');
  hatch(ctx, cx - R - 20, cy - R - 20, 2 * R + 40, 2 * R + 40, 5, Math.PI / 4);
  ctx.restore();
  // roktura ēna — nobīdīts rokturis; pats rokturis vēlāk to pārklāj ar necaurspīdīgu ķermeni
  ctx.save();
  ctx.translate(cx + dx + Math.cos(HANDLE_ANG) * (R + 1), cy + dy + Math.sin(HANDLE_ANG) * (R + 1));
  ctx.rotate(HANDLE_ANG);
  handlePath(ctx, R);
  ctx.clip();
  hatch(ctx, -10, -R, handleLen(R) + R, 2 * R, 5, 0); // štrihs lokāli horizontāls = 45° ekrānā
  ctx.restore();
  ctx.restore();
}
function drawLensFrame(ctx, cx, cy, R, c) {
  ctx.save();
  ctx.strokeStyle = c.inkDim;
  ctx.fillStyle = c.inkDim;
  ctx.lineCap = 'round';
  // ietvars: 72 loka posmi, resnums pēc leņķa pret gaismu — plāns gaismas pusē, biezs ēnas pusē
  const n = 72;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU;
    const a1 = ((i + 1.15) / n) * TAU;
    const shade = (1 - Math.cos((a0 + a1) / 2 - LIGHT)) / 2; // 0 — pret gaismu, 1 — ēnā
    ctx.lineWidth = 2 + 4.5 * shade;
    ctx.beginPath();
    ctx.arc(cx, cy, R, a0, a1);
    ctx.stroke();
  }
  // slīpuma štrihs: īsas radiālas svītras ietvara iekšpusē ēnas pusē, biežāk tur, kur ēna dziļāka
  ctx.lineWidth = 0.9;
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * TAU;
    const shade = (1 - Math.cos(a - LIGHT)) / 2;
    if (shade < 0.45) continue;
    if (shade < 0.75 && i % 2) continue;
    const len = 5 + 7 * shade;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (R - 4), cy + Math.sin(a) * (R - 4));
    ctx.lineTo(cx + Math.cos(a) * (R - 4 - len), cy + Math.sin(a) * (R - 4 - len));
    ctx.stroke();
  }
  // rokturis — cilindrs 45° leņķī: necaurspīdīgs ķermenis, kontūra, apaļš gals, garenisks štrihs, kas sabiezē uz ēnas malu; uzmava
  const w = handleW(R);
  const len = handleLen(R);
  ctx.save();
  ctx.translate(cx + Math.cos(HANDLE_ANG) * (R + 1), cy + Math.sin(HANDLE_ANG) * (R + 1));
  ctx.rotate(HANDLE_ANG);
  handlePath(ctx, R);
  ctx.fillStyle = c.field;
  ctx.fill();
  ctx.fillStyle = c.inkDim;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // uzmava
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(0, -w * 1.35, w * 0.9, w * 2.7);
  ctx.fillStyle = c.field;
  ctx.fill();
  ctx.stroke();
  // garenisks štrihs: pret gaismu reti un plāni, ēnas pusē (apakšā, +y) biezi un blīvi
  const lines = [[-0.55, 0.7], [0.05, 0.9], [0.4, 1.2], [0.62, 1.4], [0.8, 1.5]];
  for (const [f, lw] of lines) {
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(w * 1.1, f * w);
    ctx.lineTo(len + Math.sqrt(Math.max(0, 1 - f * f)) * w * 0.85, f * w);
    ctx.stroke();
  }
  ctx.restore();
  // stikla atspīdums gaismas pusē: īss loks un trīs īsas svītras
  ctx.strokeStyle = c.ink;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.8, LIGHT - 0.5, LIGHT + 0.25);
  ctx.stroke();
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const a = LIGHT - 0.32 + i * 0.14;
    const r0 = R * (0.68 - i * 0.04);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * (r0 - 0.1 * R), cy + Math.sin(a) * (r0 - 0.1 * R));
    ctx.stroke();
  }
  ctx.restore();
}
