export function makeT(dict, getLang) {
  const warned = new Set();
  return function t(key, vars) {
    const lang = getLang();
    let s = dict[lang] ? dict[lang][key] : undefined;
    if (s === undefined) {
      if (!warned.has(`${lang}:${key}`)) {
        warned.add(`${lang}:${key}`);
        console.warn(`i18n: trūkst "${key}" (${lang})`);
      }
      return key;
    }
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
    return s;
  };
}
