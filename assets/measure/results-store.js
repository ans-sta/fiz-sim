// Rezultātu tabulas: katrai iestatījumu atslēgai (run.key) sava tabula, kas krāj atkārtojumus.
// tableFields(settings) — lapas papildu lauki tabulai (piem. lodītes datu līmenis).
export function createResults({ tableFields = () => ({}) } = {}) {
  const tables = [];
  const byKeyMap = new Map();

  const byKey = (key) => byKeyMap.get(key);
  const nextRepeat = (key) => {
    const table = byKeyMap.get(key);
    return table ? table.runs.length + 1 : 1;
  };
  const add = (settings, run, meta) => {
    let table = byKeyMap.get(run.key);
    if (!table) {
      table = {
        index: tables.length + 1,
        key: run.key,
        ...tableFields(settings),
        settings: JSON.parse(JSON.stringify(settings)),
        meta: { seed: meta.seed, noise: meta.noise, traps: [...meta.traps] },
        runs: [],
      };
      tables.push(table);
      byKeyMap.set(run.key, table);
    }
    table.runs.push(run);
    return table;
  };
  return { tables: () => tables, byKey, nextRepeat, add };
}
