# Brauna kustība (M-01) — vizualizācija (specifikācija un būves lēmumi)

> Statuss: uzbūvēts 2026-10-06 pēc Anša apraksta (06.10): “Viena liela daļiņa laukā, kas kustas haotiski. Var ieslēgt/izslēgt trajektorijas zīmējumu (bultiņa ar vēsturi). Var ieslēgt/izslēgt molekulu attēlojumu (tās darbojas tāpat visu laiku). Var regulēt temperatūru.” “Tikai simulācija/vizualizācija, bez mērīšanas.”
> Vizuālā sistēma — `docs/plans/2026-07-15-rasejuma-dizains.md`, izkārtojums — `docs/plans/2026-10-04-izkartojums.md`.

## 1. Kas tā ir

Trauks ar daudzām mazām molekulām un vienu lielu putekli. Molekulas lido taisni, atlec no sienām un elastīgi saduras ar putekli; puteklis no grūdieniem dreb un lēnām klīst — Brauna kustība. Mērījumu nav: ne MĒRĪJUMU, ne SAKARĪBU paneļa.

## 2. Modelis (Claude lēmumi)

- Pasaules vienības: trauka augstums 250, platums seko ekrāna proporcijai (150–900); blīvums 600 molekulas uz 400 × 250. Pie izmēra maiņas pozīcijas proporcionāli, molekulu skaits pēc blīvuma.
- Molekula: masa 1, rādiuss 1,2; puteklis: masa 40, rādiuss 4 (06.10: 2× mazāks), sākumā centrā miera stāvoklī.
- Ātrumi pēc Maksvela (Gausa komponentes), vidējais kvadrātiskais 75 vien./s pie 300 K (06.10: bija 220; Ansis: pie 50 K putekli grūž 1–2 reizes sekundē, pie 300 K tas kustas kā pirmajā versijā pie 50 K); **v ∝ √T**: 50 K ≈ 31, 1000 K ≈ 137. Mainot T, molekulu ātrumus mērogo uzreiz; puteklis termalizējas pats caur sadursmēm (ekvipartīcija: putekļa v ≈ 220/√40 ≈ 35).
- Molekulas cita ar citu nesaduras (ideāla gāze), ar putekli — elastīga sadursme pa normāli (impulss un enerģija saglabājas, testēts). 4 apakšsoļi uz kadru, solis ≤ 50 ms. Datorā ~24 grūdieni sekundē pie 300 K.
- Trajektorija: līdz 2400 punktiem (~40 s), punkts, kad puteklis pavirzījies > 0,3 vienības.

## 3. Lapa

> 06.10 otrā kārta (Ansis): visas kontroles vienā rindā zem galvenes (kā el. laukam), bez bultiņas, bez padoma, pasaule bez rāmja pa visu laukumu, ⏸/↺ tajā pašā rindā, bez sākuma krustiņa; noklusēti molekulas un trajektorija izslēgtas — tikai oranžs punkts.

- `layout-hud`: trauks aizpilda laukumu starp MAINĪGAJIEM LIELUMIEM un pogām (ZĪMĒJUMS ≤ 100 % to sarauj); matu līnijas rāmis, fons `--field`.
- MAINĪGIE LIELUMI: **T** 50–1000 K ik pa 25 (slīdnis); zem līnijas rūtiņas **trajektorija** un **molekulas**. Telefonā panelis salocīts.
- Zīmējums: molekulas — blāvas tintes punkti; puteklis — akcenta disks; trajektorija — tinte, kas izbāl uz vēsturi (24 posmi), sākumā krustiņš; **bultiņa** no putekļa kustības virzienā, garums pēc ātruma. Kad molekulas nerāda, zem trauka viena rinda: “Molekulas kustas arī tad, kad tās nerāda…”.
- Pogas apakšā centrā: ⏸/▶ un **↺ NO CENTRA** (puteklis centrā, trajektorija dzēsta). Tastatūra: atstarpe, R.
- Galvene “← SARAKSTS · BRAUNA KUSTĪBA · M-01”, rakstlaukums TĒMA: MOLEKULĀRĀ FIZIKA. LV/EN, abas tēmas, ⚙.
- Saite: `T=`, `trail=0`, `molecules=0` (README).

## 4. Moduļi un testi

`assets/brownian/` — `model.js` (pasaule, sadursme, solis, izkārtojums), `i18n.js`, `hud-model.js`, `params.js`, `scene.js`, `main.js`; lapa `brownian-motion.html`; CSS `.m01-*` `sim-common.css` beigās; testi `tests/brownian-*.test.js`.

## 5. Ārpus tvēruma

Mērījumi (nobīde, difūzijas koeficients, ⟨r²⟩ ∝ t), molekulu savstarpējās sadursmes, ātruma sadalījuma histogramma, vairāki putekļi, putekļa masas/izmēra maiņa.
