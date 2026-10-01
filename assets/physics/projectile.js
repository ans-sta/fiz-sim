// Ķermeņa kustība tikai smaguma spēka ietekmē, bez gaisa pretestības (spec. 5).
// Koordinātu sākumpunkts uz zemes zem izmešanas vietas, y ass uz augšu, izmešanas vieta (0; h).
// Visi lielumi vienās vienībās (cm un cm/s vai m un m/s).

export function velocity(v0, alphaRad) {
  return { vx: v0 * Math.cos(alphaRad), vy: v0 * Math.sin(alphaRad) };
}

export function positionAt({ g, h, vx, vy }, t) {
  return { x: vx * t, y: h + vy * t - (g * t * t) / 2 };
}

// Lielākā sakne vienādojumam h + vy·t − g·t²/2 = 0; 0, ja ķermenis jau ir uz zemes un nepaceļas.
export function landingTime({ g, h, vy }) {
  if (h <= 0 && vy <= 0) return 0;
  return (vy + Math.sqrt(vy * vy + 2 * g * h)) / g;
}

export function apexTime({ g, vy }) {
  return vy > 0 ? vy / g : 0;
}

export function apexHeight({ g, h, vy }) {
  return vy > 0 ? h + (vy * vy) / (2 * g) : h;
}
