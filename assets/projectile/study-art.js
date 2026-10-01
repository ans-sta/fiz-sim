const W = 260;
const H = 120;
const G = H - 18; // zeme
const grid = Array.from({ length: 11 }, (_, i) => `<line class="art-hair" x1="${i * 26}" y1="0" x2="${i * 26}" y2="${H}" opacity=".5"/>`).join('')
  + Array.from({ length: 5 }, (_, i) => `<line class="art-hair" x1="0" y1="${i * 26}" x2="${W}" y2="${i * 26}" opacity=".5"/>`).join('');
const ground = `<line class="art-ink" x1="0" y1="${G}" x2="${W}" y2="${G}"/>`;
const table = (top) => `<rect class="art-sheet" x="18" y="${top}" width="62" height="5"/><line class="art-ink" x1="24" y1="${top + 5}" x2="24" y2="${G}"/><line class="art-ink" x1="74" y1="${top + 5}" x2="74" y2="${G}"/>`;
const dot = (x, y, last) => `<circle cx="${x}" cy="${y}" r="4" class="${last ? 'art-ball' : 'art-ghost'}"/>`;
const svg = (body) => `<svg viewBox="0 0 ${W} ${H}" role="img" aria-hidden="true">${grid}${ground}${body}</svg>`;

export const STUDY_ART = {
  free: svg(table(30) + [0, 1, 2, 3, 4, 5].map((n) => dot(84 + n * 18, 26 + n * n * 2.1, n === 5)).join('')),
  vertical: svg(table(54) + '<path class="art-ink" d="M84 50 L84 18 M84 18 l-3 6 M84 18 l3 6" stroke-width="1.4"/>'
    + [0, 1, 2, 3, 4, 5, 6, 7].map((n) => { const k = n - 3; return dot(110 + n * 16, 22 + k * k * 3.2, n === 7); }).join('')),
  horizontal: svg(table(30) + [0, 1, 2, 3, 4, 5].map((n) => dot(84 + n * 24, 26 + n * n * 2.1, n === 5)).join('')
    + [1, 2, 3, 4, 5].map((n) => `<circle cx="84" cy="${26 + n * n * 2.1}" r="4" class="art-dim" stroke-dasharray="2 2"/>`).join('')),
  oblique: svg(`<path class="art-ink" d="M24 ${G - 4} l30 -30 m0 0 l-7 1 m7 -1 l-1 7" stroke-width="1.4"/><path class="art-ink" d="M48 ${G - 4} A24 24 0 0 0 41 ${G - 21}"/>`
    + [0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => { const k = n / 8; return dot(24 + k * 210, G - 4 - 4 * 64 * k * (1 - k), n === 8); }).join('')),
};
