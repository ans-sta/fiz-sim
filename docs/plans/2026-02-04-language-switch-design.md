# Language Switch Feature Design

## Status: IMPLEMENTED

## Overview

Add LV/EN language toggle to all physics simulations, allowing users to switch between Latvian and English.

## Design Decisions

| Aspect | Decision |
|--------|----------|
| Position | Fixed top-right corner |
| Style | Simple text toggle: `LV \| EN` |
| Storage | JavaScript object at top of each file |
| Persistence | localStorage (`physics-sims-lang` key) |
| Default | Browser detection → fallback to EN |
| Languages | Latvian (LV) and English (EN) |

## Translation Structure

Each HTML file contains a `TRANSLATIONS` object:

```javascript
const TRANSLATIONS = {
  en: {
    title: "Page Title",
    // ... other keys
  },
  lv: {
    title: "Lapas virsraksts",
    // ... other keys
  }
};
```

HTML elements use `data-i18n` attribute:

```html
<span data-i18n="title">Page Title</span>
```

## Language Switcher UI

```html
<div class="lang-switch">
  <button data-lang="lv">LV</button>
  <span class="lang-sep">|</span>
  <button data-lang="en">EN</button>
</div>
```

Styling:
- Fixed position: top 16px, right 20px
- Monospace font matching site aesthetic
- Active language highlighted with accent color
- z-index: 100 to stay above content

## JavaScript Implementation

```javascript
function getDefaultLang() {
  const saved = localStorage.getItem('physics-sims-lang');
  if (saved) return saved;

  const browserLang = navigator.language.toLowerCase();
  return browserLang.startsWith('lv') ? 'lv' : 'en';
}

let currentLang = getDefaultLang();

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('physics-sims-lang', lang);

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (TRANSLATIONS[lang][key]) {
      el.textContent = TRANSLATIONS[lang][key];
    }
  });

  if (TRANSLATIONS[lang].title) {
    document.title = TRANSLATIONS[lang].title;
  }

  document.querySelectorAll('.lang-switch button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  document.documentElement.lang = lang;
}
```

## Files Modified

### index.html
- Added TRANSLATIONS object (18 text elements)
- Added lang-switch HTML after body open
- Added lang-switch CSS
- Added i18n JavaScript
- Added `data-i18n` attributes to translatable elements

### millikan.html
- Added TRANSLATIONS object (6 text elements)
- Added lang-switch HTML after body open
- Added lang-switch CSS
- Added i18n JavaScript
- Added `data-i18n` attributes to translatable elements
- Added `data-i18n-title` for button title attribute

### electric-field-hockey.html
- Added TRANSLATIONS object (~35 text elements)
- Added lang-switch HTML after body open
- Added lang-switch CSS
- Added i18n JavaScript with `initLanguage()` function
- Added `data-i18n` attributes to translatable elements
- Updated `updateUI()` to use translations for dynamic status/button text
- Updated `drawWinOverlay()` for translated goal messages
- Updated `drawOobFlash()` for translated out-of-bounds message
- Updated `drawGoal()` for translated goal label

## Translatable Elements

### index.html
- Page title
- h1: "Physics Lab"
- Subtitle
- Section label: "Simulations"
- Card tags (Electrostatics, Charge quantization)
- Card titles (3 cards)
- Card descriptions (3 cards)
- Status labels (Live, In development, Planned)
- Badge: "Coming soon"
- Footer text

### millikan.html
- Page title
- h1: "Millikan Oil Drop Experiment"
- Knob labels (2)
- Button text: "Spray Oil"
- Button title: "Ionize (X-ray)"
- Slider label: "Voltage"

### electric-field-hockey.html
- Page title, heading, subtitle
- Panel headers (Difficulty, Place Charge, Puck Mass, Display, Controls, How to Play)
- Difficulty buttons (Practice, Level 1-3)
- Charge buttons (Positive, Negative)
- Control buttons (Start, Pause, Resume, Reset, Clear)
- Display checkboxes (Electric Field, Puck Trace, Force Arrow)
- Status badges (Setup, Running, Paused, Goal)
- Help text (4 lines)
- Canvas text (Goal label, Goal!, Out of bounds, Play again)
