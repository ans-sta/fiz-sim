// Builds the Open Graph preview images for the infographics from the landing-page cards.
// Each image takes the card's SVG drawing from index.html (single source), puts it on the
// landing-page palette with the Latvian title, tag and description, and screenshots it with
// headless Chrome at 1200 × 630.
//
//   node assets/infografikas/og.mjs
//
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const index = readFileSync(join(root, 'index.html'), 'utf8');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const PAGES = [
  { slug: 'strava-skidrumos', title: 'liquidsTitle', desc: 'liquidsDesc' },
  { slug: 'baterijas-un-akumulatori', title: 'batteriesTitle', desc: 'batteriesDesc' },
];

// Latvian strings from the TRANSLATIONS object (the lv block comes after the en block).
const lvBlock = index.slice(index.indexOf('lv: {'));
const lv = (key) => {
  const m = lvBlock.match(new RegExp(`\\b${key}:\\s*"([^"]*)"`));
  if (!m) throw new Error(`No lv translation for ${key}`);
  return m[1];
};

// The card's SVG drawing, located by the card's href.
const cardSvg = (slug) => {
  const start = index.indexOf(`href="infografikas/${slug}.html"`);
  if (start < 0) throw new Error(`No card for ${slug}`);
  const a = index.indexOf('<svg', start);
  const b = index.indexOf('</svg>', a) + '</svg>'.length;
  return index.slice(a, b);
};

const page = ({ slug, title, desc }) => `<!DOCTYPE html>
<html lang="lv"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Exo+2:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  html,body{margin:0;width:1200px;height:630px;overflow:hidden}
  body{background:#060a14;color:#c8d6e8;font-family:'Exo 2',sans-serif;position:relative}
  .bg{position:absolute;inset:0;background:radial-gradient(ellipse at 28% 50%,#0f1a30 0%,#060a14 62%)}
  .frame{position:absolute;inset:16px;border:1px solid #1a2540;border-radius:16px}
  .art{position:absolute;left:72px;top:0;height:630px;width:520px;display:flex;align-items:center;justify-content:center}
  .art svg{width:520px;height:364px}
  .text{position:absolute;left:640px;right:72px;top:0;height:630px;display:flex;flex-direction:column;justify-content:center}
  .mark{font-family:'Orbitron',monospace;font-weight:900;font-size:16px;letter-spacing:6px;text-transform:uppercase;
    background:linear-gradient(135deg,#00ccff,#66eeff,#00ccff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
    width:fit-content;margin-bottom:34px}
  .tag{font-family:'Orbitron',monospace;font-size:11px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;
    color:#5fd08f;background:#5fd08f22;border:1px solid #5fd08f33;border-radius:5px;padding:6px 13px;width:fit-content;margin-bottom:22px}
  h1{font-family:'Orbitron',monospace;font-weight:700;font-size:42px;line-height:1.22;letter-spacing:1px;color:#e0eaf4;margin:0 0 22px}
  p{font-size:22px;line-height:1.55;font-weight:300;color:#5a6d88;margin:0;max-width:460px}
  .live{display:flex;align-items:center;gap:8px;margin-top:34px;font-size:14px;font-weight:500;color:#00ff88}
  .live i{width:9px;height:9px;border-radius:50%;background:#00ff88;box-shadow:0 0 10px #00ff88}
</style></head><body>
<div class="bg"></div><div class="frame"></div>
<div class="art">${cardSvg(slug)}</div>
<div class="text">
  <div class="mark">FIZ-SIM</div>
  <div class="tag">${lv('tagElectricity')}</div>
  <h1>${lv(title)}</h1>
  <p>${lv(desc)}</p>
  <div class="live"><i></i>Infografika</div>
</div>
</body></html>`;

const tmp = mkdtempSync(join(tmpdir(), 'fizsim-og-'));
for (const p of PAGES) {
  const html = join(tmp, `${p.slug}.html`);
  writeFileSync(html, page(p));
  const out = join(root, 'assets', 'infografikas', `${p.slug}.png`);
  execFileSync(CHROME, [
    '--headless=new', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--virtual-time-budget=8000', '--window-size=1200,630',
    `--screenshot=${out}`, `file://${html}`,
  ], { stdio: 'ignore' });
  console.log(`wrote ${out}`);
}
