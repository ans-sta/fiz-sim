import { hash32 } from './rng.js';

export const TRAP_REPEATS = 3;

// Slazds nostrādā tieši vienā no katras tabulas pirmajiem trim atkārtojumiem (kurā — nosaka sēkla).
export function trapRepeat(seed, key, name) {
  return 1 + (hash32(`${seed}|${key}|trap:${name}`) % TRAP_REPEATS);
}
