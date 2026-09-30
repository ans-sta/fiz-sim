// Gadījumskaitļi ar sēklu: tie paši iestatījumi + tā pati sēkla = tie paši dati.

export function hash32(str) {
  // FNV-1a, 32 biti
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let s = seed >>> 0;
  return function rand() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gaussian(rand) {
  // Box–Muller
  let u = 0;
  while (u === 0) u = rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function rngFor(...parts) {
  return mulberry32(hash32(parts.join('|')));
}

export function randomSeed() {
  return 100000 + Math.floor(Math.random() * 900000);
}
