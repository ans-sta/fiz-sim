# Mobile Redesign Plan

## Goal
Make all 3 simulation pages usable on mobile (iPhone Max and smaller).

## Layout Architecture

Canvas takes maximum screen real estate. Controls live in a collapsible bottom drawer.

```
┌─────────────────────┐
│ Header (compact)    │  ← 44px, title + lang switch
├─────────────────────┤
│                     │
│   Canvas (flex: 1)  │  ← Takes all available space
│                     │
├─────────────────────┤
│ ▲ Drawer handle     │  ← Tap/swipe to expand
│ [Quick actions]     │  ← Essential buttons always visible
└─────────────────────┘
```

- Drawer collapsed: shows quick actions only (~60px)
- Drawer expanded: ~50vh, scrollable panels inside
- Swipe down or tap handle to collapse

## Per-Page Implementation

### 1. index.html
- Already responsive, minor padding tweaks only

### 2. electric-field-hockey.html
**Quick actions:** `[⊕/⊖]` `[▶ START]` `[↺ Reset]`
**Drawer panels:** Difficulty, Puck Settings, Display, Help
**Touch:** Long-press charge to delete (remove keyboard hints)

### 3. electric-field.html
**Quick actions:** `[⊕/⊖]` `[+ Test Charge]` `[✕ Clear]`
**Drawer panels:** Test Charge controls, Display, Help
**Touch:** Long-press charge to delete

### 4. millikan.html
**Quick actions:** `[Spray]` `[Ionize]`
**Drawer panels:** Knobs, Voltage control
**Voltage slider:** Two-zone control
- Main slider track: coarse (~100V steps)
- Upper zone above slider: fine-tuning (~5V steps)
- Nixie display stays above slider

## Technical Approach

### CSS
- Breakpoint: `@media (max-width: 760px)`
- Fixed bottom drawer with transform animation
- Drawer handle (pill shape) for affordance
- Quick actions bar with flex layout

### JavaScript
- Touch gesture detection for drawer swipe
- Velocity-sensitive voltage slider for Millikan
- Preserve all existing touch handlers (drag, long-press delete)

## Implementation Order
1. electric-field-hockey.html (most complex, establishes pattern)
2. electric-field.html (similar structure)
3. millikan.html (different layout, special voltage control)
4. index.html (minor tweaks)
