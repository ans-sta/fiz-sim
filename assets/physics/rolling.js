// Lodīte ripo bez slīdēšanas (spec. 7):
// a = g · (sin α − μ · cos α) / (1 + β · (r / r_ef)²)

export const BETA_SOLID = 2 / 5;
export const BETA_HOLLOW = 2 / 3;

export function fitsGroove(r, w) {
  return 2 * r > w;
}

export function effectiveRadius(r, w, profile) {
  if (profile === 'flat') return r;
  const half = w / 2;
  return Math.sqrt(r * r - half * half);
}

export function rollingAcceleration({ g, alphaRad, mu, beta, r, w, profile }) {
  const k = r / effectiveRadius(r, w, profile);
  const drive = Math.sin(alphaRad) - mu * Math.cos(alphaRad);
  return (g * drive) / (1 + beta * k * k);
}
