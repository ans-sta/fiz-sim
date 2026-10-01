// Kuru skatu atvērt: pētījumu kartītes vai simulāciju (pētījums vai pilnā kontrole), spec. pētījumi 2.
import { resolveRoute } from '../measure/studies.js';
import { STUDIES, SETTING_PARAMS } from './studies.js';

const route = resolveRoute(location.search, { studies: STUDIES, settingParams: SETTING_PARAMS });
if (route.kind === 'cards') import('./picker.js').then((m) => m.start(route));
else import('./main.js');
