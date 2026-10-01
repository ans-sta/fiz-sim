import { createI18n, createTheme, mountTitleBlock } from '../sim-core.js';
import { STRINGS } from './i18n.js';
import { STUDIES } from './studies.js';
import { STUDY_ART } from './study-art.js';
import { mountStudyPicker } from '../measure/study-picker.js';

export function start(route) {
  document.getElementById('bootMsg')?.remove();
  const i18n = createI18n(STRINGS);
  const theme = createTheme();
  document.querySelector('.work').hidden = true;
  const root = document.getElementById('picker');
  root.hidden = false;
  mountStudyPicker(root, { i18n, studies: STUDIES, sheet: 'K-01', art: STUDY_ART, unknownStudy: route.unknownStudy });
  mountTitleBlock(root.querySelector('.titleblock'), { i18n, theme, sheet: 'K-01', topicKey: 'tb.topicValue' });
  i18n.apply();
}
