# Electric Field Visualizer - Implementation Plan

## Overview
Create `electric-field.html` by simplifying `electric-field-hockey.html`. This is a teaching tool to visualize electric fields and forces.

## What to REMOVE from hockey game
- Game state machine (setup/running/paused/won)
- Levels and difficulty selection
- Goal and goal detection
- Walls/obstacles
- Puck trajectory/trace
- Start/Pause/Reset game controls
- Win overlay and celebration particles
- Boundary collisions and physics simulation loop
- Out-of-bounds detection

## What to KEEP/ADAPT
| Feature | Hockey Source | Adaptation |
|---------|---------------|------------|
| Canvas field | `drawFieldBackground()` | Keep as-is |
| Charge placement | Click to place, drag to move, right-click remove | Keep as-is |
| Charge selection | +/- buttons | Keep as-is |
| Field visualization | `drawFieldVectors()` | Keep, make always visible |
| Test charge | Puck | Rename to "test charge", make draggable |
| Force arrow | `drawForceArrow()` | Keep, show on test charge |
| Test charge slider | Charge slider | Keep |
| Language switch | EN/LV | Keep as-is |

## UI Layout (Simplified)

```
+------------------------------------------+
| ELECTRIC FIELD          [LV | EN]        |
| Interactive field visualization          |
+------------------------------------------+
|           |                              |
| SIDEBAR   |       CANVAS                 |
|           |                              |
| [Place    |   +  -           +           |
|  Charge]  |      \  field   /            |
| + / -     |       \ arrows /             |
|           |        \  |  /               |
| [Test     |         TEST                 |
|  Charge]  |        CHARGE                |
| slider    |          |                   |
|           |       force                  |
| [Display] |       arrow                  |
| - Field   |                              |
| - Force   |                              |
|           |                              |
| [Clear]   |                              |
+------------------------------------------+
```

## Key Behavior Changes

1. **Test charge is draggable** - User can drag it around to see force at any point
2. **No physics simulation** - Test charge only moves when user drags it
3. **Field always visible** - Checkbox checked by default
4. **Force arrow always visible** - Shows force on test charge at its position

## File Structure (single file)

```
electric-field.html
├── <style> - Simplified CSS (no game states, win animations)
├── <body>
│   ├── header - Title + language switch
│   ├── sidebar
│   │   ├── Place Charge panel (+/- buttons)
│   │   ├── Test Charge panel (charge slider)
│   │   ├── Display panel (field checkbox, force checkbox)
│   │   └── Clear button
│   └── canvas-wrap
└── <script>
    ├── TRANSLATIONS (EN/LV)
    ├── CONFIG (field size, colors, physics constants)
    ├── STATE (charges[], testCharge, display options)
    ├── Physics (computeForceOn - unchanged)
    ├── Rendering
    │   ├── drawFieldBackground()
    │   ├── drawFieldVectors() - always on
    │   ├── drawCharges()
    │   ├── drawTestCharge()
    │   └── drawForceArrow()
    ├── Input handlers (mouse/touch for placing & dragging)
    └── Animation loop (render only, no physics step)
```

## Implementation Steps

### Step 1: Create base file
- Copy electric-field-hockey.html to electric-field.html
- Update title and heading text

### Step 2: Remove game elements
- Remove: level buttons, start/pause/reset buttons, status badge
- Remove: walls array, goal geometry, win overlay
- Remove: trail array, particles array, game state machine
- Remove: stepPhysics(), handleBoundary(), checkGoal()

### Step 3: Adapt test charge
- Rename "puck" variables to "testCharge"
- Make test charge draggable (like charges)
- Remove velocity (vx, vy) - position only
- Keep charge property and slider

### Step 4: Simplify UI
- Remove mass slider (not needed for visualization)
- Remove trace checkbox
- Keep: charge selection, charge slider, field checkbox, force checkbox
- Add "Clear All" button

### Step 5: Update rendering
- Remove trajectory drawing
- Remove win overlay
- Remove game state checks
- Field vectors always calculated and drawn (if checkbox on)

### Step 6: Update translations
- Add new keys for "Test Charge", "Clear All"
- Remove game-specific keys (levels, start, pause, etc.)

## Critical Code to Reuse

From `electric-field-hockey.html`:
- `computeForceOn()` at line 772-790 - physics calculation
- `drawFieldVectors()` at line 1356-1423 - field visualization
- `drawCharges()` at line 1210-1299 - charge rendering
- `canvasToField()` at line 1555-1560 - coordinate conversion
- `findChargeAt()` at line 1562-1570 - hit detection
- Language switching code at line 532-571

## Verification

1. Open `electric-field.html` in browser
2. Click to place positive charge - should see + symbol
3. Switch to negative, place another - should see - symbol
4. Enable field display - arrows should radiate from/toward charges
5. Drag test charge around - force arrow should update in real-time
6. Adjust test charge slider - force magnitude should change
7. Right-click charges to remove
8. Test language switch (LV/EN)
9. Test on mobile (touch drag)
