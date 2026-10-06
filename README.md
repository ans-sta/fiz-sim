# fiz-sim

Fizikas simulācijas / Physics Simulations

Interactive HTML5 physics simulations for Waldorf education (grades 10–12).

🌐 **Live site:** [https://ans-sta.github.io/fiz-sim/](https://ans-sta.github.io/fiz-sim/)
🌐 **Redirect:** ej.uz/fiz-sim

## Simulations

| Simulation               | Topic                          | Status  |
| ------------------------ | ------------------------------ | ------- |
| ⚡ Electric Field Hockey | Electrostatics / Coulomb force | ✅ Live |
| 🔬 Millikan Experiment   | Charge quantization            | ✅ Live |
| 🧲 Electric Field        | Field visualization            | ✅ Live |
| 🚀 Newton's Cannon       | Orbital mechanics / gravity    | ✅ Live |
| 🟠 Ball in a Groove (K-01) | Kinematics / rolling on an incline | ✅ Live |
| 〜 Oscillations and Waves (S-01) | Oscillations / transverse and longitudinal waves | ✅ Live |
| 🔊 Sound Lab               | Sound / waveform, phase, harmonics | ✅ Live |
| 🔊 Sound Lab v2 (S-02)     | The same in the technical-drawing design (review copy) | 🟡 Review |
| ∿ Brownian Motion (M-01)   | Molecular physics / a dust particle among molecules | ✅ Live |
| ⬒ Gas Law (M-02)           | Molecular physics / pV/T = const with a piston | ✅ Live |

## Structure

```
fiz-sim/
├── index.html                      ← Landing page
├── electric-field-hockey.html      ← Coulomb force game
├── electric-field.html             ← Field visualizer
├── millikan.html                   ← Oil drop experiment
├── newtons-cannon.html             ← Orbital mechanics
├── rolling-ball.html               ← Ball in a Groove (K-01)
├── harmonic-motion.html            ← Oscillations and Waves (S-01)
├── sound-lab.html                  ← Sound Lab (single file, Web Audio; Latvian only; 40 Hz – 20 kHz)
├── sound-lab-v2.html               ← Sound Lab (S-02) in the technical-drawing design: assets/sound/
├── brownian-motion.html            ← Brownian Motion (M-01): assets/brownian/
├── ideal-gas.html                  ← Gas Law (M-02): assets/gas/
├── assets/                         ← Shared modules: sim-core.js, sim-common.css,
│                                     physics/, measure/, rolling-ball/, oscillation/, sound/, brownian/, gas/
├── tests/                          ← Unit tests (npm test)
├── package.json                    ← "type": "module" and the test script
├── docs/plans/                     ← Development plans
└── README.md
```

## Features

- Bilingual support (English / Latvian)
- Responsive design for desktop and mobile
- Touch controls for tablets
- No dependencies - pure HTML5, CSS, JavaScript

## Setup

1. Clone or fork this repo
2. Enable GitHub Pages (Settings → Pages → Source: `main`, folder: `/ (root)`)
3. Your site is live at `https://USERNAME.github.io/fiz-sim/`

## Tech

The older simulations are single-file HTML5 pages with vanilla JavaScript and Canvas. New pages (from K-01 “Ball in a Groove”) use the technical-drawing design system: shared ES modules in `assets/`, loaded by the browser directly — still no build step and no dependencies.

ES modules do not load from `file://`. To try pages locally, serve the folder:

    python3 -m http.server 8765
    # open http://localhost:8765/rolling-ball.html
    # or http://localhost:8765/projectile-motion.html

Unit tests for the pure modules (physics, noise, URL parameters, tables): `npm test` (Node 20+).

## Teacher links (K-01)

Parameters of `rolling-ball.html`, given in the URL. Without `lock=1` they are only starting values: the student can change everything. Unknown parameters (such as `fbclid`) are ignored.

Without parameters a page opens its study cards.

| Parameter | Meaning |
| --------- | ------- |
| `study=<id>` | Opens one study (K-02: `free`, `vertical`, `horizontal`, `oblique`; K-01: `a`, `t`, `x`, `strobe`). Other parameters apply on top of the study; with `lock=1` they are fixed. |
| `full=1` | Opens the full page with every control. Any other setting parameter also opens the full page. |
| `L=<number>` | Groove length, cm (50–200) |
| `h=<number>` | Height of the raised end, cm: 0 up to L·sin 15° (about 0.26·L, e.g. 20.7 cm when L = 80); larger values are clamped with a notice. If both `h` and `alpha` are given, `h` wins |
| `alpha=<number>` | Slope angle, degrees (0–15) |
| `ball=<id>` | Ball: `steel10`, `steel16`, `steel25`, `glass16`, `glass25`, `wood25`, `wood40`, `plastic25`, `pingpong40` |
| `profile=groove\|flat` | Groove profile (the ball must fit it) |
| `x0=<number>` | Starting position along the groove, cm: 0 up to L − 15 cm (e.g. 65 cm when L = 80); larger values are clamped with a notice |
| `level=1\|2\|3` | Data level |
| `timer=gate\|hand` | Timing by light gates or by hand |
| `gates=<list>` | Gate positions, cm: 2–6 values separated by commas, decimals with a point. The first gate at least 1 cm after x₀, gates at least 1 cm apart, the last at most L; the list is sorted. An invalid list is replaced by evenly spread gates with a notice |
| `dt=<number>` | Strobe interval Δt, s: 0.1–2 in steps of 0.1. If the ball reaches the end sooner than Δt, only the start flash is recorded (no notice, as in a real experiment) |
| `view=table\|strobe\|both` | Which result view is shown (takes effect with `lock`) |
| `tape=0\|1` | Measuring tape in the strobe view |
| `lock=1` (or `lock=true`) | Locks every setting that is given in the link |
| `noise=0\|1\|2` | Teacher only: measurement noise strength (0 none, 1 default, 2 double) |
| `traps=push,late` | Teacher only: hidden mistakes in one of the first three repeats of a table (`push` — the ball is pushed at release, `late` — the level 3 clock starts late) |
| `seed=<number>` | Teacher only: integer 1–2147483647; the same seed gives the same noise in every tab |

Example:

    rolling-ball.html?L=80&h=2.0&ball=steel16&level=3&dt=0.5&view=strobe&lock=1

## Teacher links (K-02)

Parameters of `projectile-motion.html`, given in the URL. Without `lock=1` they are only starting values. Unknown parameters are ignored. Lengths are in metres and speeds in m/s.

| Parameter | Meaning |
| --------- | ------- |
| `study=<id>` | Opens one study (K-02: `free`, `vertical`, `horizontal`, `oblique`; K-01: `a`, `t`, `x`, `strobe`). Other parameters apply on top of the study; with `lock=1` they are fixed. |
| `full=1` | Opens the full page with every control. Any other setting parameter also opens the full page. |
| `mode=1\|2\|3` | 1 — fall and vertical throw, 2 — horizontal throw, 3 — oblique throw. Without `v0`, mode 1 starts as a free fall (v₀ = 0) |
| `scale=…` | No longer works: there is only one scale (metres). The link opens full control and shows a notice. |
| `h=<number>` | Launch height (ball centre above the ground). Metres, 0–50, step 0.5. Values outside the range are clamped and values between steps are rounded, each with a notice |
| `v0=<number>` | Initial speed, m/s, up to 30 (mode 1: −30…30). In mode 1 the sign is the direction (+ up, − down); in modes 2 and 3 it must be ≥ 0 |
| `alpha=<number>` | Launch angle in mode 3, degrees (0–90) |
| `dt=<number>` | Strobe interval Δt, s: 0.1–2, step 0.1 |
| `second=0\|1` | Mode 2: a second ball drops from the same point at the same moment |
| `grid=0\|1` | Measuring grid in the strobe view (the drawing always shows its grid) |
| `view=table\|strobe\|both` | Which result view is shown (takes effect with `lock`) |
| `lock=1` (or `lock=true`) | Locks every setting that is given in the link |
| `noise=0\|1\|2` | Teacher only: measurement noise strength (0 none, 1 default, 2 double) |
| `traps=late` | Teacher only: in one of the first three repeats of a table the clock starts 2–3 frames late |
| `seed=<number>` | Teacher only: integer 1–2147483647; the same seed gives the same noise in every tab |

Example (individual data for a horizontal throw from 20 m, read from the strobe image only):

    projectile-motion.html?mode=2&h=20&v0=10&dt=0.5&view=strobe&lock=1

## Teacher links (S-01)

Parameters of `harmonic-motion.html`, given in the URL. They are starting values only — the student can change everything; there is no `lock` on this page. Unknown parameters are ignored; values outside the range are clamped with a notice.

| Parameter | Meaning |
| --------- | ------- |
| `view=circle\|trans\|long` | Starting state: circle (end view), transverse wave, longitudinal wave. Default `circle` |
| `A=<number>` | Amplitude, cm, 5–40 (step 1) |
| `T=<number>` | Period, s, 1–8 (step 0.5) |
| `v=<number>` | Wave speed, cm/s, −100…100 (step 5); negative — the wave runs to the left and the circle turns the other way |
| | T, λ and v are linked (v = λ/T): when one is given, the one given earliest adapts, like on the page; by default v adapts to λ and T |
| `lambda=<number>` | Wavelength, cm, 50–200 (step 10) |
| `lines=0` | Helper lines hidden at start |

Example (longitudinal wave, long period):

    harmonic-motion.html?view=long&v=10&lambda=80

## Teacher links (S-02)

Parameters of `sound-lab-v2.html`, given in the URL. Starting values only; unknown parameters are ignored, values outside the range are clamped with a notice. No `lock`.

| Parameter | Meaning |
| --------- | ------- |
| `view=wave\|two\|harmonics` | Starting view: waveform, two sources, harmonics. Default `wave` |
| `f=<number>` | Frequency, Hz, 40–20000 (the waveform view draws the curve only while a period is at least 8 px wide in the 20 ms window; above that a grey overlay names the limit for that screen) |
| `wave=sine\|triangle\|sawtooth\|square` | Waveform in the waveform view |
| `phi=<number>` | Phase shift of source B, degrees, 0–360 (step 5) |

Example (two sources in antiphase):

    sound-lab-v2.html?view=two&phi=180

## Teacher links (M-01)

Parameters of `brownian-motion.html`. Starting values only; unknown parameters are ignored, values outside the range are clamped with a notice. A visualisation, no measurements.

| Parameter | Meaning |
| --------- | ------- |
| `T=<number>` | Temperature, K, 50–1000 (step 25); molecule speeds scale with √T |
| `trail=1` | Trajectory shown at start (hidden by default) |
| `molecules=1` | Molecules shown at start (hidden by default; they move either way) |
| `lens=1` | Magnifier over the dust particle on at start (3× zoom, follows the particle gently; shows molecules only when `molecules=1`) |

Example (hot, molecules shown):

    brownian-motion.html?T=800&molecules=1

## Teacher links (M-02)

Parameters of `ideal-gas.html`. Starting values only; unknown parameters are ignored, values outside the range are clamped with a notice. The three quantities are linked by pV/T = const: they apply in link order, and the one given earliest adapts (as on the page).

| Parameter | Meaning |
| --------- | ------- |
| `V=<number>` | Volume, L, 1–5 (step 0.1) |
| `T=<number>` | Temperature, K, 100–600 (step 10) |
| `p=<number>` | Pressure, kPa, 20–500 (step 10) |
| `lock=p\|V\|T` | Locks one quantity at start: it stays constant and the other two change together |

Example (hot gas, then pressure set — the volume adapts):

    ideal-gas.html?T=600&p=100
