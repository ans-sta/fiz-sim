// Rezultātu tabulas: katrai tabulas atslēgai sava tabula, kas krāj atkārtojumus.
// Tabulas atslēga parasti ir run.key (katriem iestatījumiem sava tabula); lapa var dot citu
// (piem. K-01 1. līmeņa sērija: viena tabula vairākiem slīpumiem, katram slīpumam sava rinda).
// tableFields(settings) — lapas papildu lauki tabulai (piem. lodītes datu līmenis).
export function createResults({ tableFields = () => ({}) } = {}) {
  const tables = [];
  const byKeyMap = new Map();

  const byKey = (key) => byKeyMap.get(key);
  // Nākamā atkārtojuma numurs: 1 + tabulas mērījumi ar šo run.key.
  const nextRepeat = (tableKey, runKey = tableKey) => {
    const table = byKeyMap.get(tableKey);
    return table ? 1 + table.runs.filter((r) => r.key === runKey).length : 1;
  };
  const add = (settings, run, meta, { tableKey = run.key } = {}) => {
    let table = byKeyMap.get(tableKey);
    if (!table) {
      table = {
        index: tables.length + 1,
        key: tableKey,
        ...tableFields(settings),
        settings: JSON.parse(JSON.stringify(settings)),
        meta: { seed: meta.seed, noise: meta.noise, traps: [...meta.traps] },
        runs: [],
        runSettings: [], // katra mērījuma iestatījumi (kopija), paralēli runs
      };
      tables.push(table);
      byKeyMap.set(tableKey, table);
    }
    table.runs.push(run);
    table.runSettings.push(JSON.parse(JSON.stringify(settings)));
    return table;
  };
  return { tables: () => tables, byKey, nextRepeat, add };
}
