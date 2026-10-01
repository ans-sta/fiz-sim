// Divi mērogi (spec. 8.4): galds klasē (cm) un tornis (m). Visi lielumi mēroga vienībās.
export const SCALES = {
  table: {
    unit: 'cm',
    g: 981, // cm/s²
    h: { min: 0, max: 150, step: 1, decimals: 0 },
    v0: { max: 400, step: 5, decimals: 0 },
    dtOptions: [0.02, 0.05, 0.1], // galda kritiens ilgst ~0,4 s, tāpēc Δt mazāks nekā tornim
    defaults: { h: 80, dt: 0.05, slow: true, v0: { vertical: 0, horizontal: 150, oblique: 250 } },
    ball: { d: 1.0, material: 'steel' }, // tērauda lodīte Ø 10 mm; x, y — tās centrs
    structureW: 60, // galda virsmas garums zīmējumā
    minView: { w: 100, h: 100 }, // mazākais redzamais laukums rasējumā
    read: { sigma: 0.15, max: 0.25, resolution: 0.5, decimals: 1 }, // x, y nolasīšana tabulā
    frame: 1 / 60, // s, viens video kadrs
    exportPx: { pref: 30, min: 10 }, // PNG px uz cm
    strobeSpacing: 3, // cm — vertikālajā sviedienā pozīcijas nobīda pa labi (spec. 8.2)
  },
  tower: {
    unit: 'm',
    g: 9.81,
    h: { min: 0, max: 50, step: 0.5, decimals: 1 },
    v0: { max: 30, step: 0.5, decimals: 1 },
    dtOptions: [0.1, 0.2, 0.5],
    defaults: { h: 20, dt: 0.2, slow: false, v0: { vertical: 0, horizontal: 10, oblique: 15 } },
    ball: { d: 0.22, material: 'plastic' }, // bumba Ø 22 cm
    structureW: 5,
    minView: { w: 30, h: 30 },
    read: { sigma: 0.03, max: 0.05, resolution: 0.1, decimals: 1 },
    frame: 1 / 30,
    exportPx: { pref: 60, min: 20 }, // PNG px uz m
    strobeSpacing: 0.6,
  },
};

export const MODES = ['vertical', 'horizontal', 'oblique'];
export const MODE_NUMBER = { vertical: 1, horizontal: 2, oblique: 3 };
export const ALPHA = { min: 0, max: 90, step: 1, default: 45 };
export const DT_ALL = [0.02, 0.05, 0.1, 0.2, 0.5];
export const TABLE_DRAW = { slab: 3, leg: 3 }; // cm: galda virsmas biezums un kāju platums zīmējumā
