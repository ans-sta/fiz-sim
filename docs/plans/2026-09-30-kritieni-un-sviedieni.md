# Kritieni un sviedieni — simulācija (biznesa prasības)

> Statuss: 1. kārta publicēta 2026-10-01 (lapa `projectile-motion.html`, ar pētījumu kartītēm — `docs/plans/2026-10-01-petijumi.md`); sk. 10. sadaļu.
> Atjaunināts: 2026-10-01T15:00:00+03:00
> Konteksts: blakus simulācija „Lodīte renītē” (`docs/plans/2026-09-30-lodite-renite.md`) ar to pašu fizikas dzinēju (Ansis, 30.09). Vizuālā sistēma ir aprakstīta `docs/plans/2026-07-15-rasejuma-dizains.md`.

## 1. Mērķis

Simulācija dod ticamus mērījumu datus par ķermeņa kustību tikai smaguma spēka ietekmē: kritienu, vertikālo, horizontālo un slīpo sviedienu. Pēc tam klasiskā spēlē „Trāpi mērkaķim” šī kustība jāizmanto. Tāpat kā pie lodītes, skolēns datus apstrādā pats.

Galvenā doma: horizontālā un vertikālā kustība ir neatkarīgas. Pa horizontāli ķermenis kustas vienmērīgi, bet pa vertikāli tas krīt tāpat kā brīvi krītošs ķermenis.

## 2. Kopīgs ar „Lodīte renītē”

Tas pats dzinējs un tās pašas daļas. Tās šeit neatkārto, bet atsaucas uz lodītes specifikāciju:

- Princips „simulācija tikai atvieglo nolasīšanu”. Tabulā un eksportā ir tikai tieši nolasāmie lielumi: šeit tie ir **t, x un y**. Δ, ātrumu, paātrinājumu, vidējo vērtību un grafiku nav (lodīte 2).
- Palaišana, ATKĀRTOT, rezultātu skati DATU TABULA (pa visu ekrānu, lieli cipari, KOPĒT, CSV) un STROBOSKOPS (tuvināšana, eksports augstā izšķirtspējā, bez zīmēšanas) (lodīte 3.4, 5).
- Troksnis un sēkla, intensitāte, slazdi, pieraksts ar vienādu decimālzīmju skaitu (lodīte 6).
- URL parametri ar `lock`, skolotāja skats, datu ģenerators grupām, projektors (lodīte 8).
- Rasējuma stils, LV/EN, trīs režīmi (lodīte 11).

## 3. Ko skolēns redz

- **Sānskata rasējums:** zeme, izmešanas vieta (tornis, galds vai klints — sk. 7) un ķermenis (bumbiņa).
- **Mērrežģis** (horizontālā un vertikālā mērlente vai režģis). To var paslēpt un parādīt ar izvēles rūtiņu, tāpat kā lodītes mērlenti.
- **Divi sākumpunkti, vienmēr nosaukti:**
  - koordinātu sākumpunkts (x = 0, y = 0) — punkts uz zemes zem izmešanas vietas;
  - kustības sākumpunkts — izmešanas vieta (0; h).
- y ass ir vērsta uz augšu.
- **Izmēru līnijas:** augstumu h, sākuma ātrumu v₀ (bulta, kuras garums ir v₀) un leņķi α maina, velkot tieši rasējumā.

## 4. Četri režīmi

| Režīms | Ko iestata | Ko dod simulācija | Ko rēķina skolēns |
|---|---|---|---|
| **1. Kritiens un vertikālais sviediens** | h; v₀ un virziens (uz augšu / uz leju; v₀ = 0 ir brīvā krišana) | t, y | g no y(t); augstākais punkts; lidojuma laiks; Δy vienādos laika sprīžos |
| **2. Horizontālais sviediens** | v₀, h | t, x, y | x(t) ir vienmērīga kustība, y(t) ir kā brīvajā krišanā; lidojuma laiks nav atkarīgs no v₀ |
| **3. Slīpais sviediens** | v₀, α, h | t, x, y | lidojuma tālums un augstākais punkts; tālums atkarībā no α |
| **4. Trāpi mērkaķim (spēle)** | tēmēšanas leņķis, lodes ātrums v₀; attālumu līdz kokam D un mērkaķa augstumu H nosaka līmenis vai saite | trāpīja vai netrāpīja; pēc tam t, x, y abiem ķermeņiem | kāpēc jātēmē tieši uz mērkaķi; mazākais v₀, ar kuru vēl trāpa |

- Laika intervāls Δt stroboskopam un tabulai: 0,1 / 0,2 / 0,5 s (URL parametrs, tāpat kā pie lodītes).

### 4.1 Trāpi mērkaķim

- Mērkaķis karājas kokā augstumā H, attālumā D. **Tajā brīdī, kad skolēns izšauj, mērkaķis palaiž zaru un krīt.**
- Skolēns tēmē, velkot stobru, un izvēlas lodes ātrumu v₀. Tēmēšanas līnija ir redzama kā rasējuma pārtraukta līnija.
- Spēles gaita pa līmeņiem (kā hokejā). Priekšlikums:
  1. mērkaķis nekrīt — tēmē augstāk;
  2. mērkaķis krīt — tēmē tieši uz viņu;
  3. mazs v₀ — lode nokrīt zemē pirms koka, tāpēc jāatrod pietiekams v₀;
  4. dažādi D un H.
- **Pēc trāpījuma stroboskops rāda abus ķermeņus un tēmēšanas līniju.** Katrā zibsnī gan lode, gan mērkaķis ir tikpat daudz zem savas „bez gravitācijas” vietas. Šis attēls ir galvenais „aha!”.
- Spēlē tēmēšanas leņķim troksni nepieliek, citādi princips „tēmē tieši” vairs nedarbotos. Troksnis v₀ trāpījumu neietekmē.

## 5. Fizikas modelis (kam jānotiek)

- x = v₀ · cos α · t; y = h + v₀ · sin α · t − g t²/2; g = 9,81 m/s². Vertikālajam sviedienam α = ±90°, horizontālajam α = 0°.
- Gaisa pretestību v1 neņem vērā (sk. 7).
- Kustība beidzas, kad y = 0 (zeme). Mērkaķa režīmā tā beidzas arī tad, ja lode trāpa mērkaķim.
- Trāpījums ir tad, ja lodes un mērkaķa attālums kādā brīdī ir mazāks par pusi no to izmēru summas.

## 6. Pieņemšanas kritēriji

1. Troksnis 0: y(t) = h + v₀ t − g t²/2 precīzi, un x(t) ir lineārs.
2. Režīms 1:
   - brīvajā krišanā Δy vienādos laika sprīžos attiecas kā 1 : 3 : 5 : 7;
   - sviedienā uz augšu kāpšanas laiks līdz augstākajam punktam ir v₀/g.
3. Režīms 2: lidojuma laiks ir √(2h/g) un nav atkarīgs no v₀.
4. Režīms 3, h = 0: tālums ir lielākais pie 45°, un pie 30° un 60° tālumi ir vienādi.
5. Režīms 4:
   - ja mērkaķis krīt un stobrs tēmēts tieši uz viņu, lode trāpa pie jebkura v₀ ≥ v_min (kad lode sasniedz koku, pirms mērkaķis nokritis zemē);
   - ja stobrs tēmēts augstāk vai zemāk, lode netrāpa;
   - ja mērkaķis nekrīt, tēmējot tieši, lode netrāpa.
6. Tabulā un eksportā ir tikai t, x un y (un iestatījumi).
7. URL parametri un `lock` darbojas tāpat kā pie lodītes, arī režīma un līmeņa izvēle.

## 7. Atvērtie jautājumi (izlemj Ansis)

1. **Viena lapa ar četriem režīmiem vai vairākas lapas** (LAPA numuri)?
2. **Vertikālā sviediena stroboskops.** Pozīcijas ceļā uz augšu un uz leju pārklājas. Vai tās nobīdīt pa horizontāli (kā laika asi), vai rādīt pārklātas kā īstā fotogrāfijā?
3. **Horizontālajā sviedienā otra bumbiņa.** Vai rādīt otru bumbiņu, kas tajā pašā brīdī vienkārši krīt (klasiskais demonstrējums: abas zemi sasniedz vienlaikus)?
4. **Mērogs.** Metros (tornis, klints; h līdz ~50 m) vai galda mērogā (bumbiņa no galda, cm), kā reāls eksperiments klasē? Vai abi?
5. **Gaisa pretestība.** Vēlāk kā slēdzis (galda tenisa bumbiņa pret tērauda lodīti)?
6. **Mērkaķa sižets.** Lode un mērkaķis, kā klasiskajā uzdevumā, vai banāns, ko met krītošam mērkaķim?
7. **Spēles līmeņi.** Cik līmeņu, kādi, un vai skaitīt punktus?
8. **Izmešanas vieta rasējumā:** tornis, galds vai klints?

## 8. Lēmumi (Ansis, 01.10)

Ansis pieņēma visus Claude ieteikumus, izņemot vienu (6. punkts).

1. **Lapas.** Režīmi 1–3 ir vienā lapā K-02 “Kritieni un sviedieni” (režīmu pārslēgs kā lodītes datu līmenim). “Trāpi mērkaķim” ir atsevišķa lapa K-03, jo spēlei ir cita gaita.
2. **Vertikālā sviediena stroboskops.** Pozīcijas nobīda pa horizontāli kā laika asi, citādi ceļš uz augšu un uz leju pārklājas un attēlu nevar nolasīt. Parakstā to pasaka.
3. **Otra bumbiņa** horizontālajā sviedienā (tajā pašā brīdī vienkārši krīt no tā paša augstuma) ir izvēles rūtiņa.
4. **Mērogs: abi**, ar pārslēgu: galds klasē (centimetros) un tornis (metros). Izmešanas vieta izriet no mēroga: galds vai tornis (līdz ar to izlemts arī 8. jautājums).
5. **Gaisa pretestība** — vēlāk, ne v1.
6. **Mērkaķim met apelsīnu** (Ansis: “Banāna vietā ābols vai apelsīns. Apaļāks, labāk lido.”). Claude izvēlējās apelsīnu, jo tā krāsa sakrīt ar rasējuma akcenta krāsu; Ansis var nomainīt uz ābolu.
7. **Spēles līmeņi:** četri, kā 4.1. punktā; punktus neskaita.
8. **Izmešanas vieta:** sk. 4. punktu.

## 9. Kārtas

**1. kārta — K-02, viss, kas vajadzīgs skolēnam režīmos 1–3:** rasējums ar velkamām izmēru līnijām (h, v₀, α); mērogs galds/tornis; otra bumbiņa; PALAIST / ATKĀRTOT; rezultātu tabula, kas krāj atkārtojumus; datu tabula pa visu ekrānu ar KOPĒT un CSV; stroboskops ar mērrežģi, numurētām pozīcijām, tuvināšanu un PNG eksportu; troksnis, intensitāte, slazds un sēkla; URL parametri ar `lock`; LV/EN, abas tēmas, trīs režīmi. Kartīte `index.html` un saišu parametri README.

**2. kārta — K-03 “Trāpi mērkaķim”** (4.1, 6. kritērijs Nr. 5).

**Vēlāk, kopā ar lodītes 2. kārtu:** skolotāja skats, datu ģenerators grupām, saišu ģenerators ar rūtiņām (Ansis 01.10: skolotājs atzīmē, ko skolēns drīkst mainīt un ko redz; Ansis nāks ar savu ideju).

## 10. Izmaiņas

- 2026-09-30T11:40:16+03:00 — Pirmā versija (ideja).
- 2026-10-01T14:00:00+03:00 — Ansis izlēma atvērtos jautājumus (8. sadaļa); kārtas (9. sadaļa).
- 2026-10-01T15:00:00+03:00 — 1. kārta uzbūvēta zarā `projectile-motion` (plāns `docs/plans/2026-10-01-kritieni-un-sviedieni-plan.md`), vēl nav publicēta. Izpildes laikā Claude pieņēma šādus lēmumus, kas skar lietotāju (Ansis var mainīt):
  - **Δt galda mērogā ir 0,02 / 0,05 / 0,1 s** (nevis 0,1 / 0,2 / 0,5 s kā 4. sadaļā), jo kritiens no galda ilgst tikai ~0,4 s; tornim paliek 0,1 / 0,2 / 0,5 s;
  - galds: tērauda lodīte Ø 10 mm, h 0–150 cm (solis 1 cm), v₀ līdz 400 cm/s (solis 5 cm/s); tornis: bumba Ø 22 cm, h 0–50 m (solis 0,5 m), v₀ līdz 30 m/s (solis 0,5 m/s); α 0–90° (solis 1°);
  - x un y ir bumbiņas centra koordinātas; h ir centra augstums kustības sākumpunktā;
  - noklusējumā horizontālais sviediens no galda: h = 80 cm, v₀ = 150 cm/s, Δt = 0,05 s, palēninājums ×0,25 ieslēgts (galda lidojums citādi ir acumirklīgs); tornim palēninājums izslēgts;
  - mainot mērogu, h, v₀ un Δt kļūst par šī mēroga noklusējumiem (cm un m nav salīdzināmi); mainot režīmu, v₀ vērtība paliek;
  - režīmu pogas ir “1 · ↕”, “2 · →”, “3 · ↗”, pilnais nosaukums ir zem tām un pogas aprakstā;
  - slīpajā sviedienā, velkot bultas galu, mainās gan v₀, gan α; α var mainīt arī ar rokturi uz loka;
  - lidojums, kas stroboskopā dotu mazāk nekā 3 pozīcijas (arī sliktākajā trokšņa gadījumā), netiek ierakstīts; paziņojums katram režīmam iesaka savu risinājumu un nenosauc lidojuma laiku;
  - otrā bumbiņa redzama animācijā un stroboskopā (tukšie apļi), tabulā tās nav;
  - troksnis: v₀ izkliede ±2 % starp palaišanām, α ±0,6° (slīpajā sviedienā), sākuma kadrs ±1 kadrs (galds 1/60 s, tornis 1/30 s), nolasīšana ±0,5 cm vai ±0,1 m; slazds ir tikai `late` (pulkstenis sāk 2–3 kadrus par vēlu); “±” ≈ 2σ;
  - rasējuma izmērs nav atkarīgs no α un ir noapaļots uz augšu (1; 1,5; 2; 3; 4; 5; 6; 8 × 10ⁿ), lai rasējuma mala neatklātu tālumu vai augstāko punktu;
  - koordinātu sākumpunkts ir nosaukts “KOORDINĀTU SĀKUMPUNKTS (0; 0)”, kustības sākumpunkts — “KUSTĪBAS SĀKUMPUNKTS”; ja h = 0, abi ir viens punkts ar vienu uzrakstu;
  - saites vērtība starp iestatāmajiem soļiem tiek noapaļota ar paziņojumu (piem., galdam h=2,5 → 3 cm);
  - CSV vienmēr latviešu formātā, tāpat kā lodītei.
- 2026-10-04 — Ansis: galda mēroga vairs nav, tikai metri bez torņa; jaunais izkārtojums. Aizstāj 8.4 — sk. `docs/plans/2026-10-04-sviedieni-izkartojums.md`.
