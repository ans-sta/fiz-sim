const W = 260;
const H = 120;
const G = H - 18; // zeme
const grid = Array.from({ length: 11 }, (_, i) => `<line class="art-hair" x1="${i * 26}" y1="0" x2="${i * 26}" y2="${H}" opacity=".5"/>`).join('')
  + Array.from({ length: 5 }, (_, i) => `<line class="art-hair" x1="0" y1="${i * 26}" x2="${W}" y2="${i * 26}" opacity=".5"/>`).join('');
const ground = `<line class="art-ink" x1="0" y1="${G}" x2="${W}" y2="${G}"/>`;
// Starta punkts augstumā h (mazs krustiņš) un h izmēru līnija pa kreisi no zemes līdz tam (kā K-01 kartītē 01).
const HX = 14;
const hDim = (x, y) => `<line class="art-ink" x1="${HX}" y1="${y}" x2="${HX}" y2="${G}"/>`
  + `<line class="art-hair" x1="${HX}" y1="${y}" x2="${x}" y2="${y}"/>`
  + [y, G].map((yy) => `<line class="art-ink" x1="${HX - 3}" y1="${yy + 3}" x2="${HX + 3}" y2="${yy - 3}"/>`).join('')
  + `<text class="art-label" x="${HX + 4}" y="${(y + G) / 2 + 4}">h</text>`
  + `<path class="art-ink" d="M${x - 3} ${y} h6 M${x} ${y - 3} v6"/>`;
const dot = (x, y, last) => `<circle cx="${x}" cy="${y}" r="4" class="${last ? 'art-ball' : 'art-ghost'}"/>`;
const svg = (body) => `<svg viewBox="0 0 ${W} ${H}" role="img" aria-hidden="true">${grid}${ground}${body}</svg>`;

const TOP = 20;
const arrowLabel = (x, ch) => `<text class="art-label" x="${x}" y="12" text-anchor="middle">${ch}</text>`;
const tape = (n) => { const k = n - 3.4; return 22 + 3.46 * k * k; };

export const STUDY_ART = {
  free: svg(hDim(60, TOP + 10) + [0, 1, 2, 3, 4, 5].map((n) => dot(60, TOP + 10 + n * n * 2.72, n === 5)).join('')),
  vertical: svg(hDim(60, 62) + arrowLabel(60, '↑') + arrowLabel(100, '↓')
    + Array.from({ length: 9 }, (_, n) => dot(n <= 3 ? 60 : 100, tape(n), n === 8)).join('')),
  horizontal: svg(hDim(60, TOP + 10) + [0, 1, 2, 3, 4, 5].map((n) => dot(60 + n * 24, TOP + 10 + n * n * 2.72, n === 5)).join('')
    + [1, 2, 3, 4, 5].map((n) => `<circle cx="60" cy="${TOP + 10 + n * n * 2.72}" r="4" class="art-dim" stroke-dasharray="2 2"/>`).join('')),
  oblique: svg(`<path class="art-ink" d="M24 ${G - 4} l30 -30 m0 0 l-7 1 m7 -1 l-1 7" stroke-width="1.4"/><path class="art-ink" d="M48 ${G - 4} A24 24 0 0 0 41 ${G - 21}"/>`
    + [0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => { const k = n / 8; return dot(24 + k * 210, G - 4 - 4 * 64 * k * (1 - k), n === 8); }).join('')),
};
