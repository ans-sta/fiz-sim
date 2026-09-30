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

## Structure

```
fiz-sim/
├── index.html                      ← Landing page
├── electric-field-hockey.html      ← Coulomb force game
├── electric-field.html             ← Field visualizer
├── millikan.html                   ← Oil drop experiment
├── newtons-cannon.html             ← Orbital mechanics
├── rolling-ball.html               ← Ball in a Groove (K-01)
├── assets/                         ← Shared modules: sim-core.js, sim-common.css,
│                                     physics/, measure/, rolling-ball/
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

Unit tests for the pure modules (physics, noise, URL parameters, tables): `npm test` (Node 20+).

## Teacher links (K-01)

Parameters of `rolling-ball.html`, given in the URL. Without `lock=1` they are only starting values: the student can change everything. Unknown parameters (such as `fbclid`) are ignored.

| Parameter | Meaning |
| --------- | ------- |
| `L=<number>` | Groove length, cm (40–200) |
| `h=<number>` | Height of the raised end, cm: 0 up to L·sin 15° (about 0.26·L, e.g. 20.7 cm when L = 80); larger values are clamped with a notice. If both `h` and `alpha` are given, `h` wins |
| `alpha=<number>` | Slope angle, degrees (0–15) |
| `ball=<id>` | Ball: `steel10`, `steel16`, `steel25`, `glass16`, `glass25`, `wood25`, `wood40`, `plastic25`, `pingpong40` |
| `profile=groove\|flat` | Groove profile (the ball must fit it) |
| `x0=<number>` | Starting position along the groove, cm: 0 up to L − 15 cm (e.g. 65 cm when L = 80); larger values are clamped with a notice |
| `level=1\|2\|3` | Data level |
| `timer=gate\|hand` | Timing by light gates or by hand |
| `gates=<list>` | Gate positions, cm: 2–6 values separated by commas, decimals with a point. The first gate at least 1 cm after x₀, gates at least 1 cm apart, the last at most L; the list is sorted. An invalid list is replaced by evenly spread gates with a notice |
| `dt=0.1\|0.2\|0.5` | Strobe interval Δt, s |
| `view=table\|strobe\|both` | Which result view is shown (takes effect with `lock`) |
| `tape=0\|1` | Measuring tape in the strobe view |
| `lock=1` (or `lock=true`) | Locks every setting that is given in the link |
| `noise=0\|1\|2` | Teacher only: measurement noise strength (0 none, 1 default, 2 double) |
| `traps=push,late` | Teacher only: hidden mistakes in one of the first three repeats of a table (`push` — the ball is pushed at release, `late` — the level 3 clock starts late) |
| `seed=<number>` | Teacher only: integer 1–2147483647; the same seed gives the same noise in every tab |

Example:

    rolling-ball.html?L=80&h=2.0&ball=steel16&level=3&dt=0.5&view=strobe&lock=1
