// Viens mērogs: metri (spec. 8.4). Visi lielumi m, m/s, s.
export const SCALE = {
  unit: 'm',
  g: 9.81,
  h: { min: 0, max: 50, step: 0.5, decimals: 1 },
  v0: { max: 30, step: 0.5, decimals: 1 },
  dt: { min: 0.1, max: 2, step: 0.1 },
  defaults: { h: 20, dt: 0.2, slow: false, v0: { vertical: 0, horizontal: 10, oblique: 15 } },
  ball: { d: 0.22, material: 'steel' }, // bumba Ø 22 cm
  minView: { w: 30, h: 15 },
  read: { sigma: 0.03, max: 0.05, resolution: 0.1, decimals: 1 },
  frame: 1 / 30,
  exportPx: { pref: 60, min: 20 }, // PNG px uz m
};

export const MODES = ['vertical', 'horizontal', 'oblique'];
export const MODE_NUMBER = { vertical: 1, horizontal: 2, oblique: 3 };
export const ALPHA = { min: 0, max: 90, step: 1, default: 45 };
// Mērījuma troksnis (spec. 2; kā lodītes spec. 6). „±” vērtības ≈ 2σ.
export const NOISE = {
  v0Rel: 0.01, // σ no v₀ starp palaišanām (relatīvi)
  alphaDeg: 0.3, // σ leņķim slīpajā sviedienā, grādi
  startFrames: 1, // sākuma kadra nobīde: vesels skaitlis −1…1 kadrs (× intensitāte)
  lateFrames: [2, 3], // slazds „late”: sākuma kadrs 2–3 kadrus par vēlu
};
