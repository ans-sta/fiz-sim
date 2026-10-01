// Pētījumu kartītes. Teksti nāk no lapas i18n (atslēgas studies.* un study.<id>.*); zīmējumus dod lapa (art[id] → SVG).
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function mountStudyPicker(root, { i18n, studies, sheet, art, unknownStudy }) {
  function render() {
    const t = i18n.t;
    const notice = unknownStudy === undefined ? '' : `<div class="notice picker-notice" role="status"><span>${esc(t('studies.unknown', { id: unknownStudy }))}</span></div>`;
    const cards = studies.map((s) => {
      const measure = s.measure ? ` · ${esc(t(`study.${s.id}.measure`))}` : ''; // K-01: ar ko mēra
      return `<a class="study-card" href="?study=${encodeURIComponent(s.id)}">
        <span class="study-art">${art[s.id] ?? ''}</span>
        <span class="study-body">
          <span class="study-num">${esc(sheet)} · ${esc(s.no)}${measure}</span>
          <span class="study-title">${esc(t(`study.${s.id}.title`))}</span>
          <span class="study-q">${esc(t(`study.${s.id}.q`))}</span>
          <span class="study-chg">${esc(t('studies.changes'))}: <b>${esc(t(`study.${s.id}.changes`))}</b></span>
        </span>
      </a>`;
    }).join('');
    const keep = root.querySelector('.titleblock'); // rakstlaukums paliek savā vietā (valodas pogu fokuss)
    root.innerHTML = `<div class="picker-body">
        <div class="picker-eyebrow">${esc(t('studies.eyebrow'))}</div>
        <p class="picker-lead">${esc(t('studies.lead'))}</p>
        ${notice}
        <div class="study-cards">${cards}</div>
        <a class="study-full" href="?full=1"><span class="t">${esc(t('studies.full'))}</span><span class="d">${esc(t('studies.fullDesc'))}</span><span class="arrow" aria-hidden="true">→</span></a>
      </div>`;
    root.appendChild(keep ?? Object.assign(document.createElement('div'), { className: 'titleblock picker-tb' }));
  }
  render();
  i18n.onChange(render);
}
