// Pētījumi (spec. pētījumi 2): kuru skatu URL prasa un kas pētījumā ir nofiksēts.

// cards — lapa bez parametriem; study — ?study=<id>; full — ?full=1 vai jebkurš iestatījuma parametrs
// (vecās skolotāju saites atveras pilnajā kontrolē tāpat kā līdz šim).
export function resolveRoute(search, { studies, settingParams }) {
  const sp = new URLSearchParams(search);
  if (sp.has('study')) {
    const id = sp.get('study');
    const study = studies.find((s) => s.id === id);
    return study ? { kind: 'study', study } : { kind: 'cards', unknownStudy: id };
  }
  if (sp.has('full') || settingParams.some((p) => sp.has(p))) return { kind: 'full' };
  return { kind: 'cards' };
}

// Pētījumā nofiksētie lielumi: visi, ko var fiksēt, izņemot maināmos un tiem piesaistītos
// (piem. lodītei α un h maina viens otru, tāpēc α pētījumā h nav nofiksēts).
export function studyFixed(study, lockable) {
  const free = new Set([...study.editable, ...(study.coupled ?? [])]);
  return new Set(lockable.filter((k) => !free.has(k)));
}

// Pētījumā saites parametri nofiksētajiem lielumiem netiek ņemti vērā (izņemot keep, piem. view):
// pētījums paliek tāds, kā rakstīts kartītē. Atgriež atlikušo saiti un ignorētos parametrus paziņojumiem.
export function filterStudyParams(search, fixed, { keep = ['view'] } = {}) {
  const sp = new URLSearchParams(search);
  const ignored = [];
  for (const name of new Set(sp.keys())) {
    if (fixed.has(name) && !keep.includes(name)) {
      ignored.push({ param: name, raw: sp.get(name) });
      sp.delete(name);
    }
  }
  const rest = sp.toString();
  return { search: rest ? `?${rest}` : '', ignored };
}
