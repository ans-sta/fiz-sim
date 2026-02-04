# Millikan Oil Drop Experiment — Interactive Simulation

## Specification for Developer

---

## 1. Overview

A single-file HTML5 interactive simulation of Millikan's oil drop experiment for physics students (grades 10–12). The student's goal is to discover that electric charge is quantized by balancing charged oil droplets in an electric field and recording the voltages needed.

**Target:** Mobile-first, responsive, works on desktop too.  
**Tech:** Single HTML file, vanilla JS + Canvas (or SVG), no frameworks.

---

## 2. Physics Model

### Simplification

All droplets have the **same mass** (determined by the `m` knob setting). Only their **charge** varies. Charges are always exact integer multiples of the elementary charge: `q = n × e`, where `n ∈ {1, 2, 3, 4, 5, 6}` randomly assigned per droplet.

### Balance condition

A droplet is balanced (stationary) when the upward electric force equals gravity:

```
qE = mg
q(V/d) = mg
V_balance = mgd / q = mgd / (n × e)
```

Where:

- `m` — droplet mass (set by knob, 5 discrete values)
- `g` — 9.81 m/s² (constant)
- `d` — plate separation (set by knob, 5 discrete values)
- `V` — voltage between plates (continuous, set by slider/knob)
- `q = n × e` — droplet charge (hidden from student)
- `e = 1.6 × 10⁻¹⁹ C`

### Droplet motion

When not balanced, droplets drift up or down. The velocity should be proportional to the net force:

```
v = k × (qE - mg)
```

- `v > 0` → droplet moves up
- `v < 0` → droplet moves down
- `v ≈ 0` → droplet hovers (balanced!)

Use a reasonable proportionality constant `k` so that motion is visible but not too fast. Droplets that exit the viewport (top or bottom) disappear permanently.

### Suggested parameter ranges

| Knob            | Steps | Example Values                        |
| --------------- | ----- | ------------------------------------- |
| `m` (mass)      | 5     | 3.0, 5.0, 7.0, 9.0, 11.0 (× 10⁻¹⁵ kg) |
| `d` (plate gap) | 5     | 4, 6, 8, 10, 12 (mm)                  |

These should be tuned so that the balancing voltages fall in a range of roughly **100 V – 5000 V** (a plausible kV-range). The voltage knob/slider should cover this range.

**Tuning check:** For `m = 5×10⁻¹⁵ kg`, `d = 6 mm`, `n = 1`:  
`V = (5e-15 × 9.81 × 0.006) / (1.6e-19) ≈ 1840 V` ✓

---

## 3. Interface Layout

The interface should feel like looking at a real lab instrument — a microscope with controls around it. Dark, warm, "lab equipment" aesthetic. Muted colors: dark grays, warm browns, brass/copper accents for knobs.

### Layout (top to bottom)

```
┌──────────────────────────────────────────┐
│                                          │
│    ┌─────────────┐    ┌───┐  ┌───┐      │
│    │             │    │ d │  │ m │      │
│    │  MICROSCOPE │    │   │  │   │      │
│    │    VIEW     │    │ ○ │  │ ○ │      │
│    │  (round)    │    │   │  │   │      │
│    │             │    └───┘  └───┘      │
│    └─────────────┘                       │
│                                          │
│    [  SPRAY OIL  ]                       │
│                                          │
│    ┌──────────────────────────┐          │
│    │  Voltmeter (analog dial) │          │
│    └──────────────────────────┘          │
│                                          │
│    ═══════○═══════════════               │
│      Voltage knob/slider                 │
│                                          │
│    Nameplate: d = __ mm, m = __ kg       │
│                                          │
└──────────────────────────────────────────┘
```

### 3.1 Microscope View

- **Round viewport** (circular clip mask), centered or left-aligned
- **Dark background** (near-black, slight warm tint — like looking through a dark-field microscope)
- **Crosshairs**: thin lines crossing at center (horizontal + vertical), subtle color (dim green or amber)
- **Grid lines**: horizontal lines with small tick marks on the side, evenly spaced — these represent the reticle scale. Label a few with distance markings (cosmetic)
- **Droplets**: small bright circles (golden/amber glow, like illuminated oil). Slight glow/bloom effect if possible. They drift up/down based on physics. Different droplets can have slightly different brightness to distinguish them.
- **Plate indication**: subtle horizontal lines or shading at very top and very bottom of the viewport to suggest the capacitor plates. When `d` changes, these could move slightly closer/farther.
- Optional: very subtle vignette around the circular edge for realism.

### 3.2 Control Knobs — `d` (plate separation) and `m` (droplet mass)

- Two **rotary knobs** side by side, to the right of (or below) the microscope
- Each has **5 discrete positions** (click-stops)
- Visual: round knob with indicator line, labeled positions around it
- `d` knob labeled: "Plate gap" with values in mm
- `m` knob labeled: "Oil mass" with values in scientific notation (e.g., "5.0×10⁻¹⁵ kg")
- Interaction: click/tap to rotate to next position, or drag to rotate

### 3.3 Spray Button

- A clear button labeled **"SPRAY OIL"** or just **"SPRAY"**
- On press: generates ~8–12 droplets at random positions near the top of the viewport, each with a random charge `n ∈ {1..6}`
- Droplets immediately begin falling under gravity (since V likely isn't set to balance them)
- Can be pressed multiple times to add more droplets
- Button could have a tactile "pump" feel (slight animation on press)

### 3.4 Analog Voltmeter

- **Semicircular dial** with a needle (like the one visible in the reference photo)
- Scale from 0 to ~5000 V (or auto-scaled based on parameter range)
- Labeled "kV" with appropriate markings
- Needle moves smoothly as voltage is adjusted
- This is the **readout** — the student records this value

### 3.5 Voltage Control

- A **continuous slider** or **rotary knob** for adjusting voltage
- Range: 0 V to max needed (depends on m and d settings)
- Should allow **fine adjustment** — maybe a large coarse knob + fine slider, or just a slider that's long enough for precision
- Consider: on mobile, a wide horizontal slider works best for fine control
- Real-time: as voltage changes, droplets respond immediately

### 3.6 Nameplate / Info Display

- Small engraved-style plate showing current values:
  - `d = __ mm`
  - `m = __ × 10⁻¹⁵ kg`
  - `g = 9.81 m/s²`
- Updates when knobs are changed
- Styled like a brass nameplate with engraved text

---

## 4. Interaction Flow

### Student workflow:

1. Set `d` and `m` knobs to desired positions
2. Press **SPRAY** — droplets appear and start falling
3. Adjust **voltage knob** — droplets respond (some rise, some slow down, some still fall)
4. Try to isolate one droplet and find the voltage where it hovers motionless
5. Read voltage from voltmeter, write it down on paper
6. The balanced droplet eventually drifts off or student sprays again
7. Repeat many times with same or different `d`/`m` settings
8. On paper: calculate `q = mgd/V` for each measurement → discover multiples of `e`

### Key behaviors:

- **Changing d or m mid-experiment** should remove all existing droplets (new spray needed) — changing the apparatus resets the chamber
- **Droplets that leave the viewport** (float off top or sink off bottom) disappear and don't come back
- **Multiple sprays** add more droplets to existing ones
- A perfectly balanced droplet should hover but can have **very slight random wobble** (Brownian-motion-like) for realism — tiny random perturbation
- Near-balanced droplets drift very slowly, giving the student time to fine-tune

---

## 5. Visual Style

### Aesthetic: "Classic Lab Instrument"

- Dark background (charcoal / dark slate)
- Metallic textures for knobs and panel (CSS gradients: grays, silvers)
- Brass/copper accents (nameplate, knob indicators)
- The microscope viewport is the hero element — prominently centered
- Fonts: monospace or serif for instrument labels (think engraved metal)
- Subtle shadows and bevels on controls for 3D tactile feel

### Color palette:

- Background: `#1a1a2e` or `#2d2d3d`
- Microscope field: `#0a0a0f` (near black)
- Droplets: `#ffcc44` with glow (`#ffaa00` shadow)
- Crosshairs: `#33aa55` (dim green) or `#aa8833` (amber)
- Metal/knobs: `#888888` → `#cccccc` gradients
- Brass accents: `#b8860b`, `#daa520`
- Voltmeter: cream/ivory face with black markings

---

## 6. Responsive Design

### Mobile (portrait, < 768px):

- Microscope view: full width, ~60% of viewport height
- Controls stack below: d/m knobs side by side, then voltmeter, then voltage slider
- Voltage slider: full width for maximum precision
- Spray button: large, easy to tap

### Desktop (> 768px):

- Microscope view: left or center, ~400–500px diameter
- d/m knobs: to the right of microscope
- Voltmeter + voltage control: below microscope
- More generous spacing

### Touch support:

- All knobs respond to tap (cycle through positions)
- Voltage slider supports touch drag
- Spray button: large touch target

---

## 7. Technical Notes

### Animation

- Use `requestAnimationFrame` for smooth droplet motion
- Physics update: calculate net force on each droplet per frame, update position
- Target 60fps, degrade gracefully

### Droplet data structure

```js
{
  id: unique,
  x: horizontal position (random, within viewport),
  y: vertical position,
  n: charge multiple (1–6, hidden),
  q: n * 1.6e-19,  // actual charge
  alive: true       // false when exited viewport
}
```

### Canvas vs SVG

Canvas recommended for the microscope viewport (better performance for animation, easier circular clipping). SVG or HTML/CSS fine for controls.

### Voltage precision

The slider needs enough resolution that a student can hover a droplet within ±2% of the balance voltage. For a range of 0–5000V and a slider of ~300px on mobile, each pixel ≈ 17V — might be too coarse. Consider:

- Non-linear slider (finer near common balance voltages)
- Or: a coarse + fine dual control
- Or: allow pinch-zoom style precision on slider
- Simplest: make the slider very wide on mobile (full screen width) and allow touch-and-drag with inertia

### Balance detection

A droplet is "balanced" when `|v| < threshold`. Could add a subtle visual indicator (droplet glows brighter or a small ✓ appears) but keep it subtle — the student should feel they discovered it.

---

## 8. Optional Enhancements (Low Priority)

- **Sound**: subtle hiss when spraying, click sounds for knobs
- **Data log panel**: collapsible panel where voltage readings are auto-logged (for students who want digital record-keeping alongside paper)
- **"About" panel**: brief explanation of the experiment and who Millikan was
- **Reset button**: clears all droplets
- **Language toggle**: EN / LV (Latvian)

---

## 9. What the Student Discovers (Not Shown in App)

On paper, the student calculates:

```
q = mgd / V
```

For a set of measurements, they get values like:

```
1.6 × 10⁻¹⁹, 3.2 × 10⁻¹⁹, 4.8 × 10⁻¹⁹, 1.6 × 10⁻¹⁹, 6.4 × 10⁻¹⁹, ...
```

These are all multiples of `e = 1.6 × 10⁻¹⁹ C`.  
**The elementary charge is quantized.** That's the aha moment.

---

_Specification version 1.0 — Millikan Simulation for Waldorf Physics Curriculum_
