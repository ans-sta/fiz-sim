import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zoomKeyAction, wheelFactor, isEditable, isMacLike, modLabel, KEY_STEP } from '../assets/measure/zoom-gestures.js';

const key = (key, mods = {}, code = '') => ({ key, code, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...mods });

test('⌘ / Ctrl + “+” un “−” maina BURTI (arī “=” un ciparu bloks)', () => {
  for (const mod of [{ metaKey: true }, { ctrlKey: true }]) {
    assert.deepEqual(zoomKeyAction(key('=', mod, 'Equal')), { kind: 'text', dir: 1 });
    assert.deepEqual(zoomKeyAction(key('+', { ...mod, shiftKey: true }, 'Equal')), { kind: 'text', dir: 1 });
    assert.deepEqual(zoomKeyAction(key('-', mod, 'Minus')), { kind: 'text', dir: -1 });
    assert.deepEqual(zoomKeyAction(key('_', { ...mod, shiftKey: true }, 'Minus')), { kind: 'text', dir: -1 });
    assert.deepEqual(zoomKeyAction(key('+', mod, 'NumpadAdd')), { kind: 'text', dir: 1 });
    assert.deepEqual(zoomKeyAction(key('-', mod, 'NumpadSubtract')), { kind: 'text', dir: -1 });
  }
  // cits izkārtojums: taustiņš dod citu zīmi, bet atrodas “=” vietā
  assert.deepEqual(zoomKeyAction(key('´', { metaKey: true }, 'Equal')), { kind: 'text', dir: 1 });
});

test('⌘ / Ctrl + bultiņas maina ZĪMĒJUMS: → ↑ lielina, ← ↓ mazina', () => {
  for (const mod of [{ metaKey: true }, { ctrlKey: true }]) {
    assert.deepEqual(zoomKeyAction(key('ArrowRight', mod)), { kind: 'draw', dir: 1 });
    assert.deepEqual(zoomKeyAction(key('ArrowUp', mod)), { kind: 'draw', dir: 1 });
    assert.deepEqual(zoomKeyAction(key('ArrowLeft', mod)), { kind: 'draw', dir: -1 });
    assert.deepEqual(zoomKeyAction(key('ArrowDown', mod)), { kind: 'draw', dir: -1 });
  }
});

test('bez ⌘ / Ctrl, ar Option/Alt (VoiceOver), ar Shift + bultiņu vai teksta laukā — nekas', () => {
  assert.equal(zoomKeyAction(key('=')), null);
  assert.equal(zoomKeyAction(key('ArrowRight')), null);
  assert.equal(zoomKeyAction(key('ArrowRight', { ctrlKey: true, altKey: true })), null);
  assert.equal(zoomKeyAction(key('=', { metaKey: true, altKey: true }, 'Equal')), null);
  assert.equal(zoomKeyAction(key('ArrowLeft', { metaKey: true, shiftKey: true })), null);
  assert.equal(zoomKeyAction(key('ArrowLeft', { metaKey: true }), true), null);
  assert.equal(zoomKeyAction(key('c', { metaKey: true }, 'KeyC')), null);
  assert.equal(zoomKeyAction(key('0', { metaKey: true }, 'Digit0')), null); // ⌘0 paliek pārlūkam
  // ⌘ + teksta laukā tāpat maina burtus
  assert.deepEqual(zoomKeyAction(key('=', { metaKey: true }, 'Equal'), true), { kind: 'text', dir: 1 });
  assert.equal(KEY_STEP, 0.1);
});

test('teksta lauki: input text/number, textarea, select, contenteditable; slīdnis un pogas — nē', () => {
  assert.equal(isEditable({ tagName: 'INPUT', type: 'text' }), true);
  assert.equal(isEditable({ tagName: 'INPUT', type: 'number' }), true);
  assert.equal(isEditable({ tagName: 'TEXTAREA' }), true);
  assert.equal(isEditable({ tagName: 'SELECT' }), true);
  assert.equal(isEditable({ tagName: 'DIV', isContentEditable: true }), true);
  assert.equal(isEditable({ tagName: 'INPUT', type: 'range' }), false);
  assert.equal(isEditable({ tagName: 'BUTTON' }), false);
  assert.equal(isEditable(null), false);
});

test('ctrl + ritenis: pirksti attālinās (Δy < 0) — lielāks; peles klikšķis ierobežots', () => {
  assert.ok(wheelFactor(-5) > 1);
  assert.ok(wheelFactor(5) < 1);
  assert.equal(wheelFactor(0), 1);
  assert.ok(Math.abs(wheelFactor(-5) * wheelFactor(5) - 1) < 1e-12);
  assert.equal(wheelFactor(-100), wheelFactor(-15)); // peles ritenis ar Ctrl — ne vairāk par ~16 %
  assert.ok(wheelFactor(-100) < 1.17);
  assert.equal(wheelFactor(-3, 1), wheelFactor(-15)); // rindiņās (Firefox)
});

test('Mac — ⌘, citur — Ctrl', () => {
  assert.equal(isMacLike({ platform: 'MacIntel' }), true);
  assert.equal(isMacLike({ platform: 'iPad' }), true);
  assert.equal(isMacLike({ userAgentData: { platform: 'macOS' } }), true);
  assert.equal(isMacLike({ platform: 'Win32' }), false);
  assert.equal(modLabel({ platform: 'MacIntel' }), '⌘');
  assert.equal(modLabel({ platform: 'Linux x86_64' }), 'Ctrl ');
});
