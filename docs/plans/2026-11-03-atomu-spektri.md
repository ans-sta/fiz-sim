# Atomu spektri (A-01) — specifikācija

> Statuss: specifikācija, gaida Anša apstiprinājumu (2026-11-03). Nekas vēl nav uzbūvēts.
> Avots: Anša specifikācija `~/Documents/Fizika/Blender sims/udenraza-atoms-specifikacija.md` (2026-10-21, “Ūdeņraža atoms: absorbcija un starošana”) un saruna 03.11. Kur šis dokuments atšķiras no oktobra specifikācijas, spēkā ir šis.
> Vizuālā sistēma — `docs/plans/2026-07-15-rasejuma-dizains.md`, izkārtojums un ⚙ — `docs/plans/2026-10-04-izkartojums.md`. Tuvākie paraugi: E-01 (josla, divi režīmi, kanva ar aprakstu), S-03 (spektra krāsas, tumšs ekrāns).
> “(Rihards)” — mans lēmums, Ansis to nav teicis; pārējais — Anša vārdi vai apstiprinājums. Līmeņu enerģijas — NIST Atomic Spectra Database (lejupielādētas 03.11.).
> Pārbaudes 03.11. (Ansis: “uzdod pārbaudi vēl vienam aģentam — vai FIZIKA ir korekta?”): būvētāja pārbaude un atsevišķa fizikas pārbaude (visi λ pārrēķināti no NIST līmeņiem, pārejas un A vērtības NIST līniju datubāzē). Labojumi iestrādāti — § 11.

## 1. Kas tā ir

Viens liels atoms, līmeņu shēma un vertikāls spektra stabs. Skolēns pats izraisa absorbciju vai starošanu un redz visu ķēdi: fotons → atoms → elektrona pāreja → līnija spektrā. Četri atomi pārslēdzami: **ūdeņradis, nātrijs, dzīvsudrabs, hēlijs** (Ansis 03.11.: “Varbūt var pārslēgt šīs četras vielas?”). 11. klase, ievads kvantu fizikā; projektors stundā un patstāvīga atkārtošana (arī telefonā).

## 2. Didaktiskā ideja (no oktobra specifikācijas)

- **Viens cēlonis un tā sekas**, nevis viss uzreiz.
- **Atoms ir izvēlīgs.** Fotons, kura enerģija nesakrīt ne ar vienu pakāpienu, izlido cauri, un nekas nenotiek — tikpat skaidri kā absorbcija.
- **Pakāpiena augstums = gaismas krāsa.** Liels lēciens — violets vai UV, mazs — sarkans vai IS.
- **Spektrs rodas no daudziem fotoniem**: līnijas krājas.
- **Starošana ir kaskāde**: no augstāka līmeņa var krist pa dažādiem ceļiem uz vairākiem zemākiem (Ansis 03.11.: “tie var krist no augstākajiem uz vairākiem zemākajiem”), tāpēc līniju ir daudz.

## 3. Mērķi, ne-mērķi, ko nedrīkst

- **Mērķi:** fizikāli pareizas līnijas (NIST); ķēde redzama soli pa solim; telefons un projektors; WCAG 2.2 AA.
- **Ne-mērķi:** gāzes trauks ar daudziem atomiem (Ansis 03.11.: “Gāzi nevajag, viens atoms der”); līniju platums un intensitāte; Doplera efekts; Zēmana efekts; stimulētā izstarošana; elektrona riņķošana pa orbītu (Ansis: “ar nekustīgiem elektroniem”).
- **Nedrīkst:** kas mirgo biežāk par 3 reizēm sekundē; līnija, kuras atomam patiesībā nav; pāreja, kas patiesībā nenotiek (§ 4.3).

## 4. Atomi un fizika

### 4.1 Kopīgais

- Enerģijas skalā 0 = jonizācija (elektrons brīvs), līmeņi zem tās ar mīnusa zīmi — kā ūdeņradim mācību grāmatā (E₁ = −13,6 eV). Citiem atomiem E = E(NIST, no pamatstāvokļa) − jonizācijas enerģija (Rihards).
- ΔE = E_augšējais − E_apakšējais, λ = hc / ΔE, hc = 1239,84 eV·nm. **λ visur rāda tieši hc / ΔE** (vakuumā), lai skolēna aprēķins no redzamā ΔE sakrīt ar lapu; tabulās redzamajai gaismai parasti dod λ gaisā, kas ir par ~0,03 % īsāks (piem. Hg zaļā 546,2 nm šeit, 546,1 nm tabulās) — to saka “i” logs (Rihards).
- **Apvienoti līmeņi** (Rihards): Na 3p (D līnijas gaisā 589,0 un 589,6 nm → viena 589,4 nm); Hg 6¹D₂ un 6³D → “6D” (dzeltenās 577,1 un 579,2 nm nāk no singleta un tripleta līmeņiem; ±2 nm pielaidē tās pārklātos, tāpēc viena 577,9 nm; tādēļ UV līnija 365,1 nm lapā ir 365,9 nm); hēlija tripletu P un D līmeņi. Hg ³P₀, ³P₁, ³P₂ paliek atsevišķi, jo tie dod trīs dažādas krāsas.
- **Jonizācija** (fizikas pārbaude): fotons, kura enerģija lielāka par elektrona saites enerģiju |E|, vienmēr tiek absorbēts un atbrīvo elektronu (fotoefekts). Rādījumā “jonizēts — elektrons atbrīvojas”, elektrons aizlido no atoma, uz staba melna svītra (Anša likums: absorbēja — svītra); pēc ~1 s atoms elektronu “noķer” atpakaļ sākuma līmenī (Rihards). Pašreizējā līmeņa jonizācijas robeža atzīmēta uz staba ar raustītu svītru (H n = 2 — 364,7 nm, Balmera robeža; Na 3s — 241,3; Hg 6³P₁ — 223,4; He 2³P — 342,2 nm). No augstiem līmeņiem (H n ≥ 3, Hg 7³S, 7¹S, 6D, He n ≥ 3) jonizē jau redzamā gaisma.
- **Tikai zemākie līmeņi** (fizikas pārbaude): augstāk līmeņi sabiezē līdz 0 eV, un līniju ir vēl (piem. H n = 7, 8, 9 → 2: 397,1 · 389,0 · 383,6 nm). Tāpēc nesakrītot rādījums saka “starp parādītajiem līmeņiem nav atbilstoša pakāpiena”. Nav rādīti Na 4f (IS 1847 nm) un Hg 7p (IS 1129–1395 nm) — to saka “i”.
- **Kaskādes ceļi** (fizikas pārbaude): ja no līmeņa var krist vairākos veidos, ceļu izvēlas ar NIST pārejas varbūtībām A (piem. He 2¹P → 1¹S 99,9 %, → 2¹S 0,1 %; Hg 7³S → 404,8 / 436,0 / 546,2 nm — 16 / 44 / 39 %; Hg 7¹S → 1014 nm 87 %, → 407,9 nm 13 %).
- Rādījumos līmeņu enerģijas ar 2 zīmēm aiz komata, **ΔE ar 3** (lai 1239,84 / ΔE dod lapas λ; ar 2 zīmēm Pfunda līnija iznāktu par 2 % aplama), λ ar 1 zīmi (virs 1000 nm — veselos nm).

### 4.2 Ūdeņradis (H) — Bora modelis (Anša oktobra specifikācija)

- Līmeņi n = 1…6 un ∞ (∞ = jonizācija, 0 eV): Eₙ = −13,6 eV / n².
- Atļautas visas pārejas starp šiem līmeņiem (Bora modelī; tā ir arī kvantu mehānikā). 15 līnijas, tabula — oktobra specifikācijā (Laimana UV 93,8–121,6 nm; Balmera 656,4 / 486,2 / 434,1 / 410,2 nm; Pašena 1875,4 · 1282 · 1094, Breketa 4051,8 · 2625,5, Pfunda 7459,1 nm — lapā tieši pēc formulas, oktobra tabulā noapaļoti).

### 4.3 Nātrijs (Na)

Līmeņi (eV, no jonizācijas; jonizācija 5,139 eV): 3s −5,14 · 3p −3,04 · 4s −1,95 · 3d −1,52 · 4p −1,39 · 5s −1,02 · 4d −0,86 · 5p −0,79 · 6s −0,63 · 5d −0,55.
Pārejas tikai s ↔ p un p ↔ d (Rihards — tā ir dabā):

| Pāreja | λ, nm | Joma |
| --- | --- | --- |
| 3p ↔ 3s | 589,4 | dzeltena (Saules D līnija; gaisā 589,0 un 589,6) |
| 4p ↔ 3s | 330,4 | UV |
| 5p ↔ 3s | 285,4 | UV |
| 5s ↔ 3p | 616,0 | oranža |
| 4d ↔ 3p | 568,8 | dzelteni zaļa |
| 6s ↔ 3p | 515,3 | zaļa |
| 5d ↔ 3p | 498,3 | zili zaļa |
| 3d ↔ 3p | 819,3 | IS |
| 4s ↔ 3p | 1139,9 | IS |
| starp augstākiem līmeņiem | 1075 · 1478 · 1639 · 1704 · 2207 · 2338 · 3413 · 5013 · 5431 · 7516 · 9109 | IS |
| 5p ↔ 4d | 20,3 µm | aiz skalas (§ 5.1) |

Īpašais: vienīgais no četriem, kas redzamo gaismu absorbē jau no pamatstāvokļa (589 nm).

### 4.4 Dzīvsudrabs (Hg)

Līmeņi (eV, no jonizācijas; jonizācija 10,44 eV): 6¹S −10,44 · 6³P₀ −5,77 · 6³P₁ −5,55 · 6³P₂ −4,98 · 6¹P −3,73 · 7³S −2,71 · 7¹S −2,51 · 6D −1,59 (6¹D₂ un 6³D apvienoti).

| Pāreja | λ, nm | Joma |
| --- | --- | --- |
| 7³S ↔ 6³P₀ | 404,8 | violeta |
| 7¹S ↔ 6³P₁ | 407,9 | violeta |
| 7³S ↔ 6³P₁ | 436,0 | zila |
| 7³S ↔ 6³P₂ | 546,2 | zaļa |
| 6D ↔ 6¹P | 577,9 | dzeltena (īstās 577,1 un 579,2) |
| 6³P₁ ↔ 6¹S | 253,7 | UV (dienasgaismas spuldzes) |
| 6¹P ↔ 6¹S | 185,0 | UV |
| 6D ↔ 6³P₂ · 6D ↔ 6³P₁ · 6D ↔ 6³P₀ | 365,9 · 312,9 · 296,5 | UV (īstā i-līnija 365,1) |
| 7¹S ↔ 6¹P | 1014,3 | IS |
| 7³S ↔ 6¹P | 1207 | IS, vāja |

Viens augšējais līmenis (7³S) krīt uz trim zemākiem un dod violetu, zilu vai zaļu — tieši Anša “no augstākā uz vairākiem zemākajiem”. 6³P₀ un 6³P₂ ir **metastabili**: no tiem uz pamatstāvokli fotons praktiski netiek izstarots (§ 7). Pārejas starp ¹ un ³ kāpnēm (253,7 · 407,9 · 577 nm) dzīvsudrabam notiek, jo smagajā atomā kāpnes sajaucas — to saka “i”.

### 4.5 Hēlijs (He)

Divas līmeņu kāpnes — **para** (kopējais spins 0, ¹) un **orto** (kopējais spins 1, ³); pāreju starp tām praktiski nav (~10⁷ reižu vājākas nekā kāpņu iekšienē); orto līmeņos elektronu ieved sadursmes izlādē, nevis fotons. Līmeņi n = 1…4 (S, P, D; 4. līmenī 4³S, 4³P, 4³D, 4¹S, 4¹P, 4¹D) (Rihards). Jonizācija 24,59 eV; pamatstāvoklis 1¹S −24,59 eV, ierosinātie −4,77…−0,85 eV — **ass pārtraukta** starp −24 un −5 eV.

Redzamās līnijas: 728,3 · 706,7 · 668,0 · 587,7 (dzeltenā, gaisā 587,6 — 1868. g. to ieraudzīja kā spožu līniju Saules protuberanču spektrā, tā atklāja hēliju; uz Zemes atrada 1895. g.) · 504,9 · 501,7 · 492,3 · 471,4 · 447,3 · 396,6 · 389,0 nm. UV: 58,4 · 53,7 · 52,2 (no pamatstāvokļa) · 318,9 nm. IS: 1083,3 · 2058,7 un vēl 10 līnijas 1253–7438 nm. Pārejas S ↔ P, P ↔ D katrās kāpnēs. 2³S un 2¹S ir metastabili. Sešas īstas pārejas ir garākas par 10 µm (4³S–4³P 10,9; 4¹S–4¹P 18,1; 3³P–3³D 18,6; 4³P–4³D 44; 3¹P–3¹D 96; 4¹P–4¹D 216 µm): tās notiek, un stabā tās rāda kā atzīmi pie apakšējās malas ar vērtību, piem. “↓ 18,6 µm” (Rihards).

## 5. Ekrāns

### 5.1 Izkārtojums (Ansis 03.11.)

```
ABSORBCIJA                                        STAROŠANA
┌──────┬────────────────┬──────────────┐          ┌────────────────┬──────────────┬──────┐
│ stabs│                │              │          │                │              │ stabs│
│ (avots│→    ATOMS     │  LĪMEŅU      │   ⇄      │     ATOMS      │  LĪMEŅU      │→ (spek│
│ + slīd│                │  SHĒMA       │          │                │  SHĒMA       │  trs) │
└──────┴────────────────┴──────────────┘          └────────────────┴──────────────┴──────┘
```

- **Pārslēgšana ar pogu** ABSORBCIJA · STAROŠANA; vizuāli **viss ekrāns pabīdās**: viens stabs aizslīd aiz ekrāna malas, otrs parādās no pretējās, atoms un līmeņi pabīdās līdzi (Ansis 03.11.: “pārslēgšanās notiek ar pogu (emisija/absorbcija), bet vizuāli response ir — viss ekrāns pabīdās, un pazūd emisijas spektrs, parādās absorbcija. Un otrādi.”); ~0,5 s; ar `prefers-reduced-motion` — uzreiz (Rihards).
- **Stabi ir vertikāli:** violets augšā, sarkans apakšā — enerģija aug uz augšu tāpat kā līmeņos (Rihards). Virs redzamās joslas saspiesta **UV** zona (līdz 380 nm; apakšējā robeža atkarīga no atoma: H 90, Na 200, Hg 180, He 50 nm — Rihards), zem tās **IS** (750–10 000 nm; tālākas līnijas — atzīme pie apakšējās malas ar vērtību), abas parakstītas; redzamā josla (380–750 nm, lineāri pēc λ) aizņem ~70 % augstuma, UV un IS katra ~15 % (logaritmiski) (Ansis 03.11. apstiprināja).
- **Absorbcijā** stabs ir gaismas avots: varavīksne, uz kuras krājas melnās svītras (§ 6). **Starošanā** stabs ir melns, uz tā iedegas spožas līnijas.
- **Fotons:** viļņa pakete viļņa garuma krāsā, sarkanam vijumi garāki nekā violetam. UV — gaiši violeti balts, IS — blāvi tumšsarkans, abiem raustīts vilnis (oktobra specifikācija, Ansis apstiprināja).

### 5.2 Atoma zīmējums (Rihards, pēc Anša “viens liels atoms ar nekustīgiem elektroniem”)

- Kodols centrā; iekšējie elektroni stāv uz vietas: He — viens elektrons uz 1s riņķa (otrs ir tas, kas lec); Na — 2 + 8 punkti uz diviem iekšējiem riņķiem; Hg — pelēks disks “kodols + 78 iekšējie elektroni” un otrs 6s elektrons, kas stāv uz vietas (kā hēlijam; tāpēc abiem ir ¹ un ³ kāpnes); H — nav.
- Ārējais elektrons — viens punkts uz sava riņķa. Riņķu tik, cik līmeņu shēmā, rādiuss aug pēc enerģijas secības; **nav mērogā** (uzraksts pie zīmējuma). Elektrons kustas tikai lēcienā.

### 5.3 Līmeņu shēma (Rihards)

- Enerģija vertikāli **mērogā** (He — ar pārtrauktu asi), 0 augšā (jonizācija), pie katra līmeņa vārds un enerģija (−3,40 eV). Cieši līmeņi — uzraksti izvirzīti ar norāžu līnijām.
- H — viena kolonna (n = 1…6, ∞). Na — kolonnas s · p · d. Hg — ¹S ¹P ¹D | ³S ³P ³D (apvienotais 6D pāri abām D kolonnām, “6D (¹D₂ + ³D)”). He — para | orto. Tā redzams, kuri līmeņi savienojas (Grotriana diagramma).
- Līmeņi ir pogas: klikšķis vai Enter novieto elektronu (§ 6, § 7).
- Pārejā — bulta fotona krāsā (uz augšu absorbcijā, uz leju starošanā), paliek, līdz nākamā.

## 6. Absorbcija

1. Elektrons ir izvēlētajā līmenī (klikšķis uz līmeņa). Sākumā (Rihards): H n = 2, Na 3s, Hg 6³P₁, He 2³P — no tiem redzamā gaisma kaut ko absorbē. Ūdeņradim n = 1 rāda, ka redzamā gaisma iet cauri un aizķeras tikai UV.
2. **Vertikāls slīdnis gar stabu** (Ansis 03.11.): bīda augšup vai lejup; **kad atlaiž, no tās vietas izlido fotons** šajā λ. Slīdnis iet pa visu stabu, arī UV un IS. Ar tastatūru: bultiņas bīda (redzamajā joslā pa 1 nm, UV un IS — pa 0,1 % no λ), PageUp/PageDown — uz nākamo vai iepriekšējo mājienu (ja ATZĪMES ieslēgtas, citādi pa 10 nm), Enter vai atstarpe izšauj (Rihards). **Pielipšana** (Rihards): ja slīdni atlaiž tuvāk par ~8 px (ar pirkstu ~12 px) no līnijas, ko atoms no pašreizējā līmeņa var absorbēt, slīdnis pielīp pie tās, un fotonam ir tieši šīs līnijas λ. Citādi UV un IS līnijām nevar trāpīt — saspiestajās zonās viens pikselis ir 2–3 % no λ. Pielīp arī ar izslēgtām ATZĪMĒM: tad skolēns līniju atrod, bīdot slīdni.
3. **Mājieni** (Ansis 03.11.: “blakus skalai ir hinti (mazas pelēkas iezīmītes), kurā vietā ir vērts šaut”): pelēkas iezīmes blakus stabam pie λ, ko atoms no pašreizējā līmeņa var absorbēt. Slēdzis **ATZĪMES** tās paslēpj, kad skolēnam pašam jāatrod krāsa (oktobra specifikācija; sākumā ieslēgts — Rihards).
4. **Sakrīt** (pielaide redzamajā gaismā ±2 nm, ārpus tās ±0,3 % no λ; Ansis apstiprināja): fotons ielido atomā un pazūd, elektrons pārlec, shēmā bulta uz augšu, **uz staba šajā vietā paliek melna svītra** (Ansis: “Melnā svītra rodas tad, kad atoms fotonu absorbē”). Svītra netraucē šaut turpat vēlreiz. Ja fotona enerģija lielāka par saites enerģiju — jonizācija (§ 4.1), arī tad melna svītra.
5. **Nesakrīt:** fotons izlido cauri atomam pa labi un pazūd ekrāna malā; svītras nav; rādījumā “starp parādītajiem līmeņiem nav atbilstoša pakāpiena”.
6. **Atkārtota izstarošana** (Ansis apstiprināja “rādīt vienmēr”): pēc ~1 s elektrons krīt atpakaļ uz sākuma līmeni pa to pašu pāreju, un tādas pašas krāsas fotons aizlido uz augšu vai leju, garām stabam. Absorbcijā elektrons vienmēr atgriežas sākuma līmenī (vienkāršojums — Rihards), lai var šaut nākamo. Dabā tas var krist arī pa citu ceļu un izstarot citu krāsu (fluorescence: Hg pēc 546 nm atgriežas 6³P₂ tikai 39 % gadījumu) — to saka “i”.
7. **BALTĀ GAISMA** (Ansis 03.11.): ieslēdz fotonu plūsmu ar nejaušu λ redzamajā joslā. **INTENSITĀTE** 1 · 2 · 5 · 10 · 20 fotoni sekundē (Ansis 03.11.: “Varbūt 1, 2, 5, 10, 20 f/s?”), joslā kā − 5 f/s + , sākumā 5 (Rihards); spožāka gaisma ir vairāk fotonu, bet katra fotona enerģija atkarīga tikai no krāsas (saikne ar fotoefektu). Pie 10 un 20 f/s animācijas īsākas (lidojums, elektrona uzturēšanās augšā), lai līnijas tiešām krājas ātri (Rihards). Skaitītājs rādījumā: izšauti / absorbēti (Rihards). Fotoni lido katrs atsevišķi; daži iziet cauri, citi paceļ elektronu. Plūsma ir mazliet “negodīga”: **katrs 4. vai 5. fotons** (nejauši) tiek šauts tieši kādā λ, ko atoms var absorbēt, lai melnās līnijas parādās ātri (Ansis 03.11.). Ja no pašreizējā līmeņa redzamajā joslā absorbēt nav ko, plūsma ir godīga un viss iziet cauri. Kamēr elektrons ir augšā (~1 s), fotoni, kas pienāk, iziet cauri (Rihards; vienkāršojums — dabā tādas pašas krāsas fotons izraisītu stimulēto izstarošanu, cits varētu atomu jonizēt).
8. **NOTĪRĪT** noņem melnās svītras. Atoma maiņa notīra abus stabus (Rihards).

## 7. Starošana

1. Elektrons ir pamatstāvoklī. Klikšķis uz augstāka līmeņa to **ierosina** (izlāde): raustīta bulta uz augšu, fotona nav (Rihards — oktobra specifikācijā “elektroni ir ierosinātos stāvokļos”).
2. Klikšķis uz zemāka līmeņa — elektrons krīt, shēmā bulta uz leju, fotons aizlido uz stabu, un **uz melnā staba iedegas līnija** (UV/IS — atzīme savā zonā). Līnijas krājas.
3. Ja šāda pāreja dabā aizliegta vai ļoti vāja (Na, Hg, He — § 4), elektrons nekrīt un rādījumā “šī pāreja aizliegta vai ļoti vāja”; shēmā izgaismojas līmeņi, uz kuriem var krist (Rihards).
4. **NEJAUŠA KASKĀDE** (oktobra specifikācija): elektrons no pašreizējā līmeņa krīt pa nejaušu atļautu ceļu (varbūtības pēc NIST A, § 4.1), līdz pamatstāvoklim vai metastabilam līmenim; katra kaskādes līnija iedegas pēc kārtas. Ja elektrons ir pamatstāvoklī — vispirms ierosina uz nejaušu augstāku līmeni (Rihards).
5. **Metastabils līmenis** (Hg 6³P₀, 6³P₂; He 2³S, 2¹S): kaskāde tur apstājas, uzraksts “metastabils — fotonu praktiski neizstaro, elektrons te paliek ilgi; lampā to nogāž sadursme”. Nākamā darbība to atgriež pamatstāvoklī bez fotona (Rihards).
6. **NOTĪRĪT** noņem līnijas.

## 8. Vadības josla (Rihards; tāpat kā E-01 — augšā)

`ATOMS  H · Na · Hg · He` | `ABSORBCIJA · STAROŠANA` | `☼ BALTĀ GAISMA` un `INTENSITĀTE − 5 f/s +` (absorbcijā) vai `↯ NEJAUŠA KASKĀDE` (starošanā) | `NOTĪRĪT` | `ATZĪMES` | `i`. ⚙ apakšā pa kreisi kā visām lapām (BURTI, ZĪMĒJUMS, tālummaiņa, ⌘ taustiņi).
Pirmais atoms, atverot lapu, — ūdeņradis (saikne ar grāmatu un Rīdberga uzdevumiem) (Rihards).

**Rādījums** (virs zīmējuma): `2 → 4 · ΔE 2,550 eV · λ 486,2 nm · absorbēts` / `izlidoja cauri — starp parādītajiem līmeņiem nav atbilstoša pakāpiena` / `jonizēts — elektrons atbrīvojas` / `4 → 2 · … · izstarots`.

**“i” logs:** īsi par absorbciju un starošanu; vienkāršojumi — Bora modelis ir vēsturisks; zīmējums nav mērogā; rādīti tikai zemākie līmeņi (augstāk tie sabiezē līdz 0 eV, līniju ir vēl; Na 4f un Hg 7p nav); Na, Hg, He līmeņi no mērījumiem (NIST), cieši līmeņi apvienoti (Na D, Hg 577/579, hēlija tripleti); dzīvsudrabam ¹ un ³ kāpnes sajaucas, tāpēc starp tām ir līnijas, hēlijam to praktiski nav; līnijas bezgalīgi šauras un vienādi spožas; λ vakuumā (tabulās gaisā, ~0,03 % īsāks); absorbcijā elektrons atgriežas sākuma līmenī (dabā var krist arī citādi — fluorescence); kamēr elektrons ir augšā, citi fotoni iziet cauri (dabā — stimulētā izstarošana vai jonizācija); jonizētais elektrons atgriežas pēc ~1 s.

## 9. Lapa

- `atomic-spectra.html`, kartīte sākumlapā, README rinda 🟡 Review (Ansis apstiprināja: atsevišķa fiz-sim lapa). Fizika v3 izmaiņas nav šī darba daļa: Ansis saņem adresi un pats to ieliek, kur vajag (Rihards).
- Gaišā un tumšā tēma; starošanas stabs vienmēr melns (kā spektroskopā) (Ansis apstiprināja). LV un EN.
- **Telefons portretā** (Rihards): stabs šaurs pie malas, atoms virs līmeņu shēmas; josla vienā rindā ar atvilkni kā S-03. **Guļus un projektors** — kā § 5.1.
- **Piekļūstamība:** kanvai teksta apraksts (atoms, elektrona līmenis, uzkrātās līnijas); līmeņi — pogas; slīdnis — native `input type="range"` (APG Slider), vertikāls; režīmi un atomi — pogu grupas ar `aria-pressed`; katrs notikums (absorbēts / izlidoja cauri / izstarots / metastabils) — `role="status"`; kontrasts ≥ 4,5 : 1 tekstam, ≥ 3 : 1 līnijām un iezīmēm; nekas nemirgo; `prefers-reduced-motion`.

## 10. Moduļi un testi (Rihards)

- `assets/atoms/atoms.js` — četru atomu līmeņi un atļautās pārejas (dati).
- `assets/atoms/model.js` — λ ↔ ΔE, stabu ass (UV · redzamā · IS), absorbcijas pārbaude ar pielaidi, kaskāde, baltās gaismas plūsma ar “negodīgumu”, stāvoklis.
- `assets/atoms/scene.js`, `main.js`, `i18n.js`.
- Testi: H līnijas = hc/ΔE pēc Bora formulas un oktobra tabula (±0,1 nm redzamajā, relatīvi ±0,05 % IS); Na, Hg, He = hc/ΔE no apvienotajiem NIST līmeņiem (relatīvi ±0,05 %); fotons virs saites enerģijas jonizē; kaskāžu biežums atbilst A (Hg 7³S: 16 / 44 / 39 % ±3 % 10 000 kaskādēs); katra atļautā pāreja ir starp esošiem līmeņiem; absorbcija ar pielaidi (±2 nm sakrīt, ±3 nm ne); pielipšana pie tuvākās absorbējamās līnijas pikseļos; λ > 10 µm pārejas ir datos un kaskādē; no H n = 1 neviena redzamā λ neabsorbējas; kaskāde vienmēr beidzas pamatstāvoklī vai metastabilā; baltajā gaismā 1000 fotonos 20–25 % mērķēti; stabu ass monotona un apgriežama; i18n LV/EN atslēgas vienādas.

## 11. Izmaiņas

- 2026-11-03 — Pirmā versija. Ansis: viens liels atoms ar nekustīgiem elektroniem, gāzi nevajag; četri atomi pārslēdzami; izkārtojums ar vertikāliem stabiem (absorbcijā avots pa kreisi, starošanā spektrs pa labi), pārslēgšana pārbīdot bildi; vertikāls slīdnis, kas izšauj, kad atlaiž; melnā svītra, kad atoms absorbē, netraucē šaut turpat; pelēki mājieni pie skalas; baltā gaisma ar katru 4.–5. fotonu mērķētu; apstiprināti oktobra atvērtie jautājumi (pielaide ±2 nm, atkārtota izstarošana vienmēr, UV/IS konvencija, atsevišķa fiz-sim lapa).
- 2026-11-03 — Pēc būvētāja un fizikas pārbaudes (Ansis: “uzdod pārbaudi vēl vienam aģentam — vai FIZIKA ir korekta?”), Riharda labojumi: fotons virs saites enerģijas jonizē (agrāk — “izlido cauri”, tas bija aplami) un jonizācijas robeža uz staba; nesakrītot “starp parādītajiem līmeņiem nav …”; Na pievienots 5p (285,4 nm); visi λ vakuumā (Na, He tabulas bija gaisā); kaskāde pēc NIST A; ΔE ar 3 zīmēm; He >10 µm pārejas ar atzīmi; Hg otrais 6s elektrons zīmējumā; formulējumi par He para/orto, Hg ¹/³ sajaukšanos, metastabiliem, He atklāšanu (emisijas līnija protuberancēs); “i” papildināts; UV zonas robeža pēc atoma; slīdnis pielīp pie līnijas ~8 px; tastatūrā UV/IS solis 0,1 % λ, PageUp/PageDown uz nākamo mājienu; Fizika v3 izmaiņas ārpus šī darba.
- 2026-11-03 — Ansis: baltās gaismas intensitāte 1 · 2 · 5 · 10 · 20 fotoni sekundē; skaitītājs izšauti / absorbēti (Rihards).
