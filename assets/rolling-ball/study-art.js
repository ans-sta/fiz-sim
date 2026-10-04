const W = 260;
const H = 120;
const X0 = 22;
const Y0 = 40;
const X1 = 238;
const Y1 = 86;
const TABLE = 94;
const grid = Array.from({ length: 11 }, (_, i) => `<line class="art-hair" x1="${i * 26}" y1="0" x2="${i * 26}" y2="${H}" opacity=".5"/>`).join('')
  + Array.from({ length: 5 }, (_, i) => `<line class="art-hair" x1="0" y1="${i * 26}" x2="${W}" y2="${i * 26}" opacity=".5"/>`).join('');
const at = (k) => [X0 + (X1 - X0) * k, Y0 + (Y1 - Y0) * k];
const groove = `<line class="art-ink" x1="0" y1="${TABLE}" x2="${W}" y2="${TABLE}"/>`
  + `<rect class="art-sheet" x="${X0}" y="${Y0}" width="10" height="${TABLE - Y0}"/>`
  + `<line class="art-ink" x1="${X0}" y1="${Y0}" x2="${X1}" y2="${Y1}" stroke-width="1.6"/>`;
const ball = (k, last) => { const [x, y] = at(k); return `<circle cx="${x}" cy="${y - 4}" r="4" class="${last ? 'art-ball' : 'art-ghost'}"/>`; };
const svg = (body) => `<svg viewBox="0 0 ${W} ${H}" role="img" aria-hidden="true">${grid}${groove}${body}</svg>`;

const gate = (k) => { const [x, y] = at(k); return `<line class="art-ink" x1="${x}" y1="${y + 9}" x2="${x}" y2="${y - 12}"/><rect class="art-sheet" x="${x - 3}" y="${y - 18}" width="6" height="6"/>`; };
// h izmēru līnija pa kreisi no renītes: no augstā gala līdz zemā gala līmenim
const HX = 12;
const hDim = `<line class="art-ink" x1="${HX}" y1="${Y0}" x2="${HX}" y2="${Y1}"/>`
  + `<line class="art-hair" x1="${HX}" y1="${Y0}" x2="${X0}" y2="${Y0}"/>`
  + [Y0, Y1].map((y) => `<line class="art-ink" x1="${HX - 3}" y1="${y + 3}" x2="${HX + 3}" y2="${y - 3}"/>`).join('')
  + `<text class="art-label" x="${HX - 4}" y="${(Y0 + Y1) / 2 + 4}" text-anchor="end">h</text>`;
const tick = (k) => { const [x, y] = at(k); return `<line class="art-hair" x1="${x}" y1="${y + 2}" x2="${x}" y2="${y + 8}"/>`; };

export const STUDY_ART = {
  a: svg(`<path class="art-ink" d="M${X1 - 40} ${Y1} A40 40 0 0 0 ${X1 - 40 * Math.cos(Math.atan2(Y1 - Y0, X1 - X0))} ${Y1 - 40 * Math.sin(Math.atan2(Y1 - Y0, X1 - X0))}"/>`
    + `<line class="art-ink" x1="${HX}" y1="${Y1}" x2="${X1}" y2="${Y1}" stroke-dasharray="3 3"/>`
    + `<text class="art-label" x="${X1 - 54}" y="${Y1 - 4}">α</text>`
    + hDim
    + `<rect class="art-sheet" x="${W - 58}" y="8" width="50" height="20"/><text class="art-label" x="${W - 33}" y="22" text-anchor="middle">2,71 s</text>`
    + ball(0.3, true)),
  t: svg([0.2, 0.4, 0.6, 0.8].map(gate).join('') + ball(0.05, true)),
  x: svg(`<rect class="art-sheet" x="150" y="6" width="94" height="44"/>`
    + `<text class="art-label" x="156" y="20">t, s   x, cm</text><text class="art-label" x="156" y="33">0,2    0,5</text><text class="art-label" x="156" y="46">0,4    1,5</text>`
    + ball(0.15, true)),
  strobe: svg(Array.from({ length: 17 }, (_, i) => tick(0.02 + (i / 16) * 0.95)).join('')
    + [0, 0.01, 0.04, 0.09, 0.16, 0.25, 0.36, 0.49, 0.64].map((f, i) => ball(f * 0.95 + 0.02, i === 8)).join('')),
};
