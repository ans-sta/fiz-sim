# Svārstības un viļņi (S-01) — demonstrācija (biznesa prasības)

> Statuss: specifikācija, gaida Anša apstiprinājumu; pēc tā — īstenošanas plāns.
> Atjaunināts: 2026-10-04T20:30:00+03:00
> Konteksts: Anša ideja 04.10 — viena aina, kurā harmoniskā svārstība redzama no trim pusēm: aplis, šķērsvilnis, garenvilnis. Paraugs: ophysics.com/w0.html (GeoGebra 3D: punkti uz spirāles, kamera griežas). Vizuālā sistēma — `docs/plans/2026-07-15-rasejuma-dizains.md`, izkārtojums — `docs/plans/2026-10-04-izkartojums.md`. Lēmumi — 11. sadaļā.

## 1. Mērķis

Skolēns ierauga, ka vienmērīga kustība pa apli, harmoniskā svārstība, šķērsvilnis un garenvilnis ir **viena un tā pati kustība**, tikai paskatīta citādi vai pagriezta citā virzienā. Amplitūda, periods un viļņa garums visos trijos skatos ir vieni un tie paši lielumi, un tos var mainīt, kamēr aina kustas.

Tā ir **demonstrācija**, ne mērījumu laboratorija: nav pētījumu kartīšu, mērījumu sērijas un datu tabulas. Skolotājs to rāda projektorā, skolēns var pagrozīt pats.

## 2. Principi

1. **Punkti telpā, ne priekšmets.** Kustas abstrakti punkti; nav riteņu, auklu, atsperu vai cita mehānisma.
2. **Bez krāpšanās.** Katrs skats ir tās pašas 3D ainas godīga projekcija. Garenvilni dod nevis cits kameras leņķis, bet punktu svārstību virziena pagriešana — tā ir pati šķērsviļņa un garenviļņa atšķirība, un to redz kustībā.
3. **Vienlaikus viens skats.** Starp skatiem aina pagriežas 3D telpā ap 1 s, kustība pa to laiku neapstājas.
4. **Fizika godīga:** lielumi SI vienībās (cm, s), f = 1/T, ω = 2π/T, v = λ/T.
5. **Rasējuma stils un jaunais izkārtojums** kā K-01 un K-02: aina pa visu laukumu, LIELUMI augšā pa kreisi, ⚙ apakšā pa kreisi, pogas apakšā centrā.

## 3. Aina — punkti telpā

### 3.1 Ģeometrija

- Horizontāla ass (viļņa izplatīšanās virziens, z) ar garumu **200 cm**. Uz tās vienādos atstatumos **41 punkts** (ik pa 5 cm, z₀ = 0 … z₄₀ = 200 cm).
- Katrs punkts vienmērīgi riņķo pa **savu riņķi ar rādiusu A**, kura centrs ir uz ass. Visi riņķi ir vienādi, atšķiras tikai fāze: punkts i atpaliek no pirmā par 2π·zᵢ/λ. Fāze laikā: φᵢ(t) = 2π·(t/T − zᵢ/λ).
- **Riņķa plaknes virziens** ir ainas galvenais parametrs:
  - **šķērs** — riņķa plakne ir perpendikulāra asij (riņķi kā pērles uz diega, punkti kopā veido spirāli);
  - **garen** — riņķa plakne satur asi (riņķis pagriezts par 90° ap skata līniju).
  Pārejā starp tiem plakne griežas ap skata līniju (ekrāna plaknē pagriežas riņķa redzamais diametrs — “svītra”).
- **Kamera** ir otrs parametrs: skatās **gar asi** (no gala) vai **no sāna** (ass horizontāli, vilnis skrien pa labi). Projekcija ir ortogonāla, bez perspektīvas. Pārejā kamera riņķo ap vertikālo ekrāna asi.
- **Pirmais punkts (z = 0) ir izcelts** — oranžs (`--accent`), lielāks; pārējie tinti (`--ink`), mazāki. Pirmais punkts ir tas, “kuram pārējie seko”.

### 3.2 Trīs stāvokļi

| Stāvoklis | Kamera | Riņķa plakne | Ko redz |
|---|---|---|---|
| **APLIS** | gar asi | šķērs | Viens aplis ar rādiusu A, visi 41 punkti uz tā, oranžais priekšā, pārējie seko ar fāzes nobīdi (jo mazāks λ, jo plašāk tie izkaisīti pa apli; λ = 200 cm — tieši viens aplis). |
| **ŠĶĒRSVILNIS** | no sāna | šķērs | Riņķi redzami no šķautnes kā **vertikālas svītras** rindā gar asi; punkti slīd pa svītrām augšā–lejā; kopā — sinusoīda, kas skrien pa labi. |
| **GARENVILNIS** | no sāna | garen | Svītras guļ **gar asi**; punkti slīd pa kreisi–pa labi; redzami sablīvējumi un retinājumi, kas skrien pa labi. |

Pārejas:

- APLIS → ŠĶĒRSVILNIS: kamera pagriežas par 90° — aplis saplok par vertikālu svītru, ass ar pārējām svītrām izvēršas pa labi.
- ŠĶĒRSVILNIS → GARENVILNIS: kamera stāv; katra svītra pagriežas par 90° ekrāna plaknē (kā propellera lāpstiņa) un noguļas gar asi. Pa vidu redzams slīps vilnis — punkti svārstās 45° leņķī pret asi.
- GARENVILNIS → APLIS: divas kustības pēc kārtas — svītras pieceļas, tad kamera pagriežas. ŠĶĒRSVILNIS → APLIS un atpakaļ — viena kustība.
- Katra kustība ~1 s, mīksta (ease-in-out). Ja pārejas laikā nospiež citu pogu, aina turpina no tā brīža stāvokļa uz jauno mērķi pa to pašu ceļu (vispirms plakne, tad kamera, vai otrādi — kā tabulā).
- Pārejas laikā laiks t rit tālāk, punkti neapstājas (ja nav ⏸).

### 3.3 Palīglīnijas (var izslēgt)

- **APLIS:** pats aplis (plāna līnija), rādiuss no centra līdz oranžajam punktam, fāzes leņķa φ loks pie centra ar uzrakstu φ, vertikālais diametrs un horizontāla līnija no oranžā punkta līdz tam (projekcija — tā ir svārstība), uz diametra projekcijas punkts.
- **ŠĶĒRSVILNIS:** svītras (visu 41 riņķu redzamie diametri, blāvas), gluda sinusoīda caur punktiem, izmēru līnijas **A** (no ass līdz kalnam) un **λ** (starp diviem kalniem).
- **GARENVILNIS:** svītras gar asi (blāvas, pārklājas), **ķemme** — caur katru punktu vertikāla svītra ±A (pēc pagrieziena iebāl, pagriežot prom izbāl; Ansis 04.10), lai sablīvējumi un retinājumi ir redzami; izmēru līnijas **A** (no pirmā punkta centra līdz tā galējam stāvoklim) un **λ** (starp diviem sablīvējumiem) — ārpus ķemmes.
- Pārejās palīglīnijas pārveidojas līdzi (svītras griežas); sinusoīda un izmēru līnijas parādās tikai galastāvokļos (izbāl/iebāl).
- Ar izslēgtām palīglīnijām paliek tikai punkti un ass.

## 4. Vadība

### 4.1 LIELUMI (augšā pa kreisi)

Kopīgais saraksts kā K-01 (`createQuantityList`): uzklikšķinot — slīdnis ar − / +, aina mainās uzreiz.

| Lielums | Diapazons | Solis | Sākumā |
|---|---|---|---|
| A — amplitūda | 5–40 cm | 1 cm | 20 cm |
| T — periods | 1–8 s | 0,5 s | 4 s |
| λ — viļņa garums | 50–200 cm | 10 cm | 100 cm |
| PALĪGLĪNIJAS | rāda / nerāda | izvēle | rāda |

Nav: palēninājuma (to aizstāj T līdz 8 s), punktu skaita, atstatuma, sākuma fāzes, ass garuma, viļņa ātruma kā slīdņa. Rindas “citi…” nav.

Mainot T, fāze nelec: φ turpinās no esošās vērtības ar jauno ω (laiku skaita kā fāzi, ne kā t·ω ar jaunu ω).

### 4.2 SAKARĪBAS (augšā pa labi)

Mazs lauciņš pie labās malas ar virsrakstu SAKARĪBAS, pelēki (aprēķināti, ne iestatāmi), katrs ar formulu un vērtību:

- f = 1/T = 0,25 Hz
- ω = 2π/T = 1,57 rad/s
- v = λ/T = 25 cm/s
- φ = 137° — oranžā punkta fāze, mainās dzīvi (0–360°)

### 4.3 Pogas (apakšā centrā)

- Trīs pogas vienā rindā: **APLIS · ŠĶĒRSVILNIS · GARENVILNIS**; aktīvā iezīmēta (akcenta krāsā). Pārejas laikā iezīmēta mērķa poga.
- Blakus **⏸ / ▶** — aptur un palaiž laiku. Apturētā ainā slīdņi un skatu pogas strādā (pārejas notiek, punkti stāv savās fāzēs).
- Tastatūra: 1 / 2 / 3 — skati, atstarpe — pauze.

### 4.4 ⚙ (apakšā pa kreisi)

Kopīgais modulis: tēma, valoda, BURTI, ZĪMĒJUMS, PILNEKRĀNS.

## 5. Izkārtojums un ierīces

- Aina pa visu laukumu zem galvenes (`layout-hud`). Ass ir horizontāla, ainas vertikālais centrs — laukuma vidū (zemes līnijas šai lapai nav). Ainu mērogo tā, lai 200 cm ass ar `EDGE_PX` malām ietilptu platumā un 2·40 cm ietilptu augstumā starp paneļiem un pogām; ⚙ ZĪMĒJUMS to maina kā K-01.
- APLIS stāvoklī aplis ir laukuma centrā, tā rādiuss tajā pašā mērogā, kādā A ir viļņu skatos (A nemaina mērogu, pārejā nekas nelec).
- Datorā un projektorā — pilns platums. Telefonā guļus — tas pats, burti ≤ 125 %. **Stāvus** lapa strādā (ass īsa, punkti sīki), bet zem pogām ir viena rinda “Pagriez telefonu guļus”, kas ainavā pazūd.
- Galvene: “← SARAKSTS”, SVĀRSTĪBAS UN VIĻŅI, lapas numurs **S-01**, LV EN ◐ ⛶; pilnekrānā galvenes nav. Rakstlaukums datorā apakšā pa labi: KOMPLEKTS S / LAPA 01 / TĒMA svārstības un viļņi.

## 6. Saite skolotājam

Parametri `harmonic-motion.html` adresē; visi ir tikai sākuma vērtības, skolēns var mainīt visu. Nezināmi parametri tiek ignorēti; ārpus diapazona — nogriež līdz robežai ar paziņojumu, kā K-01.

| Parametrs | Nozīme |
|---|---|
| `view=circle\|trans\|long` | sākuma skats (noklusēti `circle`) |
| `A=<cm>` | amplitūda 5–40 |
| `T=<s>` | periods 1–8 |
| `lambda=<cm>` | viļņa garums 50–200 |
| `lines=0` | palīglīnijas izslēgtas |

Pētījumu kartīšu nav: lapa atveras uzreiz ainā. `lock` šai lapai nav.

## 7. Divas valodas

LV / EN kā citās lapās. Angliski: *Oscillations and Waves*, CIRCLE · TRANSVERSE WAVE · LONGITUDINAL WAVE, QUANTITIES, RELATIONS, HELPER LINES, “Turn the phone sideways”. Grieķu burti un formulas abās valodās vienādi.

## 8. Ārpus tvēruma (v1)

- Ātruma un paātrinājuma grafiki (ophysics “Oscillations” lapa), x(t) grafiks.
- Stāvviļņi, atstarošanās, divu viļņu salikums, Doplers.
- Mērījumi, datu tabula, stroboskops, pētījumu kartītes, `lock`.
- Perspektīva, brīva kameras griešana ar pirkstu, 3D skats pa diagonāli.
- Punktu skaita, atstatuma un sākuma fāzes maiņa.

## 9. Tehniskās piezīmes (Claude lēmumi)

- Jauna lapa `harmonic-motion.html`, moduļi `assets/oscillation/`: `main.js` (lapa), `model.js` (tīrā ģeometrija: fāzes, 3D punkti, projekcija ar kameras leņķi κ un plaknes leņķi θ, pāreju mērķi un ceļš, ortogonālā projekcija — bez DOM, ar testiem), `scene.js` (zīmēšana uz canvas), `params.js` (URL), `i18n.js`. Kartīšu nav, tāpēc `entry.js` nav vajadzīgs — `main.js` ielādējas tieši.
- Projekcija: punkts i trīsdimensiju telpā pᵢ = (A·cos φᵢ, A·sin φᵢ·cos θ, zᵢ + A·sin φᵢ·sin θ); ekrānā horizontāli u = x·cos κ + z·sin κ, vertikāli w = y. κ = 0 — gar asi (APLIS), κ = 90° — no sāna; θ = 0 — šķērs, θ = 90° — garen. Visi trīs stāvokļi un abas pārejas ir šīs vienas formulas vērtības; nekas netiek pārzīmēts pa citu likumu.
- Kopīgie moduļi: `sim-core.js` (i18n, tēma, canvas, cikls), `measure/hud.js` (`createQuantityList`, `createSettingsCorner`), `measure/ui-scale.js`, `measure/hud-layout.js` (`EDGE_PX`, `TOP_MARGIN`, `PANEL_GAP`), `measure/notices.js`, `measure/url-params.js`, `measure/format.js` (komats decimāldaļā). SAKARĪBAS lauciņš — jauns mazs elements lapas modulī (MĒRĪJUMI modulis tam neder — tur ir tabulas).
- Laika solis ierobežots ar `MAX_STEP`, pēc atgriešanās no citas cilnes fāze nelec.
- `index.html` — jauna kartīte (sērija S, svārstības); `README.md` — rinda tabulā un parametru tabula.
- Testi: `tests/oscillation-model.test.js` (fāzes, projekcija trīs stāvokļos: APLIS dod apli, ŠĶĒRS — vertikālas nobīdes, GAREN — horizontālas; pāreju ceļi; T maiņa bez fāzes lēciena), `tests/oscillation-params.test.js`.

## 10. Pieņemšanas kritēriji

1. Lapa atveras APLIS stāvoklī: aplis, 41 punkts uz tā, oranžais priekšā, kustas.
2. ŠĶĒRSVILNIS — redzama sinusoīda, kas skrien pa labi; oranžais punkts pie kreisās malas slīd augšā–lejā; mainot A — augstāka, mainot λ — retāka/biežāka, mainot T — lēnāka/ātrāka; sinusoīdas forma kustībā nemainās (viļņa ātrums v = λ/T).
3. GARENVILNIS — sablīvējumi skrien pa labi ar to pašu v; oranžais punkts slīd pa kreisi–pa labi ap savu centru ar amplitūdu A.
4. Pārejas: APLIS↔ŠĶĒRSVILNIS — aplis saplok/izvēršas; ŠĶĒRSVILNIS↔GARENVILNIS — svītras griežas ekrāna plaknē; GARENVILNIS↔APLIS — divas kustības pēc kārtas. Pārejas laikā kustība neapstājas, nekas nelec.
5. Palīglīnijas atbilst 3.3; izslēgtas — tikai punkti un ass.
6. SAKARĪBAS rāda f, ω, v, φ ar pareizām vērtībām un vienībām, komats decimāldaļā.
7. Saites parametri strādā; ārpus diapazona — paziņojums.
8. LV/EN, tēma, BURTI, ZĪMĒJUMS, pilnekrāns — kā K-01. Telefonā stāvus — rinda “Pagriez telefonu guļus”.
9. `npm test` zaļš, lapa ielādējas no GitHub Pages.

## 11. Lēmumi (Ansis, 04.10 vakarā)

- Uz apļa viens izcelts punkts, pārējie seko (ne atsevišķi paneļi, ne mehānisms).
- Maināmi A, T, λ (ne v); φ₀ nav. Palēninājuma nav (Claude: T līdz 8 s).
- Viena 3D aina, kamera griežas; vienlaikus viens skats (trīs paneļi blakus noraidīti).
- Garenvilnis — ar svītru pagriešanu ekrāna plaknē, nevis ar kameras griešanu ap vertikālo asi un dziļuma pārzīmēšanu (“Tavs piedāvājums ir labāks, bez krāpšanās!”).
- Ass horizontāla, “kā normālai sinusoīdai”.
- Izceltais punkts oranžs. Stāvokļu nosaukumi: APLIS, ŠĶĒRSVILNIS, GARENVILNIS.

## 12. Izmaiņas

- 2026-10-04 — Pirmā versija pēc sarunas ar Ansi un ophysics.com/w0.html apleta izpētes (tur: punkti uz spirāles ap z asi, `SetViewDirection` pogas, slīdņi Spread / Number / Separation / Amplitude).
- 2026-10-04 — Būvējot (plāns `2026-10-04-svarstibas-plan.md`): zīmējuma platumā rezervēti 200 + 2·A_max cm, lai garenvilnī galējie punkti neiziet aiz ekrāna (A mērogu nemaina); garenvilnī A izmēru līnija ir no pirmā punkta centra līdz tā galējam stāvoklim (fiksēts garums A); apļa skatā pievienots blāvs horizontālais diametrs kā φ atskaite; telefona padomam pievienots paskaidrojums; SAKARĪBĀS v ar vienu decimāli, ja nav vesels skaitlis.
- 2026-10-04 — Ansis pēc publicēšanas: garenvilnī ķemme (vertikālas svītras ±A caur katru punktu), lai sablīvējumi redzami; izmēru līnijas ārpus ķemmes.
- 2026-10-04 — Ansis: panelis “MAINĪGIE LIELUMI”; palīglīnijas nav mainīgais lielums — čekbokss zem cipariem, atdalīts ar horizontālu līniju, viens klikšķis.
- 2026-10-04 — Ansis (telefonā un datorā aplis par mazu): apļa skatam savs mērogs — aplis ar A_max aizpilda joslu starp paneļiem vai zem tiem; kamerai griežoties mērogs mīksti pāriet uz ass mērogu. Sākuma A = 30 cm (bija 20). Telefonā paneļi MAINĪGIE LIELUMI un SAKARĪBAS salokāmi — sākumā tikai virsraksts un ▾ apakšā.
- 2026-10-04 — Ansis: “animācijas ātrums = viļņa ātrums” — mainīgie lielumi ir A, λ un **v** (−100…100 cm/s ik pa 5, zīme — virziens; v = 0 — kustība stāv); **T = λ/v** pāriet uz SAKARĪBĀM kopā ar f = v/λ un ω = 2πv/λ. Saitē `v=` (`T=` vairs nav). Oranži arī punkti ar to pašu fāzi (z = λ, 2λ, 3λ): aplī sakrīt ar pirmo, viļņos stāv tieši λ attālumā.
- 2026-10-04 — Ansis (telefonā: garenvilnī pirmais punkts aiziet aiz nākamā): garenviļņa nobīdes amplitūda ierobežota Az = min(A, 0,8·λ/2π) — citādi punkti apdzītu cits citu, kas vidē nav iespējams; svītras, pagriežoties, saīsinās līdz Az; kad ierobežojums darbojas, GARENVIĻŅA skatā paziņojums ar iemeslu. Aplī un šķērsvilnī A paliek pilns.
- 2026-10-04 — Ansis: maināmi visi trīs — T, λ, v (v = λ/T); mainot vienu, pieskaņojas tas, kurš mainīts visagrāk (sākumā v, tad T, tad λ: mainot T vai λ, pieskaņojas v; mainot v — T). Mainīto nogriež tā, lai pieskaņotais paliek robežās. SAKARĪBĀS paliek f, ω, φ.
- 2026-10-04 — Ansis: ierobežojuma paziņojums nav uzkrītošs — virs skatu pogām mazs pelēks uzraksts “Ierobežojums”, skaidrojums (“Viļņu attēlojums ir ierobežots, jo …”) tikai uz klikšķa.
- 2026-10-04 — Ansis: λ mērs, kas slīd līdzi vilnim, vairs nelec uz viļņa sākumu — slīdošais mērs un rezerves mērs {0, λ} krusteniski izbāl ~1,5 s laikā (`lambdaSpans`, `FADE_S`); tāpat A mērs pie pirmā kalna iebāl un izbāl (`crestAlpha`).
