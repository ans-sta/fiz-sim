# Rasējuma dizains — vienota vizuālā sistēma fizikas simulācijām

> Statuss: apstiprināšanai. Prototips diskusijai: `design.html` repo saknē.
> Kontekst: 2026-07-15 saruna pēc pilna koda audita un kļūdu labojumiem.

## Mērķis

Ansis plāno vairākas jaunas simulācijas, grupētas pa tēmām: gravitācija, elektrība, magnētisms, viļņi. Visām vajadzīga vienota saskarne un kopīga fizikas bāze. Failu patstāvīga pārnesamība (viens HTML fails bez atkarībām) vairs nav prasība.

## Pieņemtie lēmumi

1. **Arhitektūra: koplietoti ES moduļi bez build soļa.** Pārlūks pats saliek lapu no moduļiem (`<script type="module">`); GitHub Pages apkalpo failus kā līdz šim. Build slāni (Eleventy/Vite) varēs uzlikt vēlāk, ja radīsies reāla vajadzība — moduļi ir tieši tas formāts, ko bundleri patērē.
2. **Esošās simulācijas migrē kopā ar vizuālo pārstrādi** — rāmja modulis uzreiz top ar jauno izskatu, katru lapu aiztiek vienu reizi.
3. **Milikena eksperiments šajā kārtā paliek neaiztikts.** Tā ir aparāta simulācija (mikroskops, kloķi, nixie indikatori) ar apzināti savu vizuālo identitāti; lādiņu un lielgabala simulācijas ir “lauka” simulācijas, kurām rasējuma rāmis der dabiski.
4. **Gaišais un tumšais režīms** ar pārslēgu; noklusējums seko ierīces iestatījumam.

## Vizuālā valoda

### Koncepts: rasējumu komplekts

Vietne = rasējumu komplekts “FIZ-SIM”. Sākumlapa = titullapa ar rasējumu sarakstu. Katra simulācija = numurēta lapa (LAPA 01, 02, …). Numerācija nes informāciju: katalogs aug ar katru jaunu simulāciju, un lapas numurs paliek pastāvīgs.

### Tipogrāfija

| Loma | Fonts | Piezīmes |
| --- | --- | --- |
| Viss vadības slānis: etiķetes, pogas, mērījumi, virsraksti | IBM Plex Mono (400/500/600) | Etiķetes — lielburti ar 0,08 em atstatumu; mērījumos tabulārie cipari nelēkā, mainoties vērtībai |
| Garie apraksti (atvilktnes, palīdzība) | IBM Plex Sans (400) | Vairāku rindkopu teksts mono fontā nogurdina |

Orbitron un Exo 2 tiek izņemti pilnībā.

### Krāsu marķieri (CSS mainīgie, abas tēmas)

| Marķieris | Grafīts (tumšais) | Papīrs (gaišais) | Lietojums |
| --- | --- | --- | --- |
| `--sheet` | `#15171b` | `#f2efe9` | Lapas fons |
| `--ink` | `#e8e6e1` | `#26261f` | Pamatteksts, aktīvās līnijas |
| `--ink-dim` | `#9a9891` | `#7a776d` | Sekundārās etiķetes |
| `--hairline` | `#3a3d42` | `#c9c4b8` | Visi rāmji un atdalītāji, 1 px |
| `--accent` | `#ff7a29` | `#c75612` | Tikai aktīvais stāvoklis: izvēlētā poga, fokuss, aktīvā vērtība |
| `--field` | `#0c0e11` | `#faf8f3` | Kanvas zīmējuma lauks |

Principi: bez ēnām, bez spīdumiem, bez noapaļotiem stūriem. Arī kanvas zīmēšanas krāsas nāk no tēmas (sim-core dod krāsu objektu zīmēšanas kodam); lādiņu sarkanais/zilais paliek kā fizikālās krāsas, gaišajā tēmā pietumšināts kontrastam.

### Paraksta elementi

- **Rakstlaukums** — katras lapas stūrī rasējuma rakstlaukums: šūnu režģis ar KOMPLEKTS / LAPA / TĒMA / LV|EN / ◐ (tēmas pārslēgs). Vietnes atpazīstamības zīme.
- **Slīdņi kā izmēru līnijas** — trase ar bultiņu galiem, rombveida rokturis, vērtība virs tā kā uzmērījums. Slīdnis fizikas simulācijā vienmēr iestata fizikālu lielumu, tāpēc metafora ir patiesa.
- **Ārējais lapas rāmis** ar īsām mēroga atzīmēm gar malām, kā rasējuma zonu iedaļas.

### Kustība

Tintes inversija hover stāvoklī (etiķete apmainās ar fonu), redzams fokusa rāmis, `prefers-reduced-motion` respektēts. Spīdumu un pulsāciju nav. Fizikas animācija kanvā paliek.

## Trīs lietošanas režīmi

| Režīms | Situācija | Prasības |
| --- | --- | --- |
| Projektors | Skolotājs klases priekšā, liels ekrāns | Mērījumi un kanva salasāmi no klases pēdējās rindas: lieli tabulārie cipari, augsts kontrasts, kanva maksimāli liela |
| Dators / planšete | Skolēni individuāli | Pilnais izkārtojums: kanva pa kreisi, vadības aile pa labi |
| Telefons | Skolēni individuāli | Portretā: kanva augšā, vadība apakšā, rakstlaukums saspiests vienā joslā. Ainavā: desktopa izkārtojuma saspiesta versija |

Orientācijas jautājums izlemts par labu **elastīgai orientācijai**: web lapa nevar piespiedu kārtā pagriezt ekrānu; “pagriez ierīci” aizsegs ir naidīgs risinājums. Portreta izkārtojums ir pilnvērtīgs; ainava dod lielāku kanvu.

Projektora režīmam atsevišķs slēdzis nav vajadzīgs: desktopa izkārtojums lielā ekrānā ar `rem` balstītu mērogu jau ir projektora režīms. Ja praksē izrādīsies par sīku, rakstlaukumā var pievienot mēroga šūnu (A4 → A3 princips), kas palielina bāzes fontu.

## Moduļu arhitektūra

```
fiz-sim/
├── index.html                  ← titullapa: rasējumu saraksts
├── electric-field.html         ← migrē uz moduļiem + jauno izskatu
├── electric-field-hockey.html  ← migrē
├── newtons-cannon.html         ← migrē
├── millikan.html               ← šajā kārtā neaiztiek
├── design.html                 ← statiskais prototips (pēc apstiprināšanas dzēš)
├── assets/
│   ├── sim-common.css          ← marķieri (abas tēmas), rāmis, vadības bloki, rakstlaukums
│   ├── sim-core.js             ← galvene, LV/EN, tēmas pārslēgs, kanva+DPR,
│   │                              fiksēta soļa fizikas cilpa, atvilktne
│   └── physics/
│       ├── vectors.js
│       ├── integrators.js      ← velocity-Verlet, akumulators
│       ├── gravity.js
│       ├── em.js               ← elektrība + magnētisms (Kulons, lauki)
│       └── waves.js
└── docs/plans/
```

`sim-core.js` pienākumi: ievietot galveni un rakstlaukumu DOM, uzturēt valodas un tēmas izvēli (`localStorage`, koplietots starp lapām), inicializēt kanvu ar DPR, dot fiksēta soļa cilpu (visas 2026-07-15 audita sistēmiskās kļūdas radās tieši šajā slānī, katrā failā savā kopijā).

## Migrācijas secība

1. `design.html` prototips → diskusija → apstiprināts marķieru komplekts.
2. `assets/` moduļi ar apstiprināto izskatu.
3. Pa vienai lapai: newtons-cannon (jaunākā, mazākā) → electric-field → electric-field-hockey; katru pārbauda visos trīs režīmos un abās tēmās pirms nākamās.
4. index.html kā titullapa ar rasējumu sarakstu.
5. Vecā rāmja koda izņemšana no migrētajām lapām; `design.html` dzēšana.

Esošie URL nemainās — ej.uz saites un skolēnu grāmatzīmes turpina strādāt.

## Atvērtie jautājumi

- Lapu numuru piešķiršana: pēc pievienošanas secības vai pa tēmu blokiem (piem., G-01, E-01, M-01, V-01)?
- Milikena lapa ilgtermiņā: vai tai vismaz kopīgā galvene un tēmu/valodu mehānisms no sim-core?
- Gaišās tēmas kanvas krāsas katrai simulācijai jāpieskaņo atsevišķi (zvaigznes uz papīra fona nestrādā) — risinās migrācijas brīdī pa lapai.
