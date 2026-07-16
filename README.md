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

## Structure

```
fiz-sim/
├── index.html                      ← Landing page
├── electric-field-hockey.html      ← Coulomb force game
├── electric-field.html             ← Field visualizer
├── millikan.html                   ← Oil drop experiment
├── newtons-cannon.html             ← Orbital mechanics
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

All simulations are single-file HTML5 with vanilla JavaScript and Canvas. No build step, no dependencies, no frameworks.
