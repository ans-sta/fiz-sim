import { fitsGroove, BETA_SOLID, BETA_HOLLOW } from '../physics/rolling.js';

// Attālums starp renītes malām, cm. Kalibrēts tā, lai „mūsu renīte" (L = 80 cm,
// h = 3,0 cm, tērauds Ø 16 mm) dotu a ≈ 18,9 cm/s² (spec. 7). Ar klases datiem jāpārkalibrē.
export const GROOVE_W = 1.144;

// density g/cm³; mu — ripošanas berzes koeficients (jāpārkalibrē ar klases datiem)
export const MATERIALS = {
  steel: { density: 7.85, mu: 0.0025 },
  glass: { density: 2.5, mu: 0.003 },
  wood: { density: 0.7, mu: 0.006 },
  plastic: { density: 1.2, mu: 0.004 },
  celluloid: { density: null, mu: 0.005 },
};

// d — diametrs, cm
export const BALLS = [
  { id: 'steel10', material: 'steel', d: 1.0, hollow: false },
  { id: 'steel16', material: 'steel', d: 1.6, hollow: false },
  { id: 'steel25', material: 'steel', d: 2.5, hollow: false },
  { id: 'glass16', material: 'glass', d: 1.6, hollow: false },
  { id: 'glass25', material: 'glass', d: 2.5, hollow: false },
  { id: 'wood25', material: 'wood', d: 2.5, hollow: false },
  { id: 'wood40', material: 'wood', d: 4.0, hollow: false },
  { id: 'plastic25', material: 'plastic', d: 2.5, hollow: false },
  { id: 'pingpong40', material: 'celluloid', d: 4.0, hollow: true, mass: 2.7 },
];

export const DEFAULT_BALL = 'steel16';

export function ballById(id) {
  return BALLS.find((b) => b.id === id);
}

export function ballMass(ball) {
  if (ball.hollow) return ball.mass;
  const r = ball.d / 2;
  return MATERIALS[ball.material].density * (4 / 3) * Math.PI * r ** 3;
}

export function ballBeta(ball) {
  return ball.hollow ? BETA_HOLLOW : BETA_SOLID;
}

export function ballMu(ball) {
  return MATERIALS[ball.material].mu;
}

export function ballFits(ball, profile) {
  return profile === 'flat' || fitsGroove(ball.d / 2, GROOVE_W);
}
