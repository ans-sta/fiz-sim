# Skaņas spektra analizators (S-03) — specifikācija

> Statuss: uzbūvēts un publicēts 2026-11-03 (Ansis: “Jā, komitē un publicē.”); gaida Anša pārbaudi ar īstu mikrofonu Chrome un Safari. Ansis 01.11: “Ģenerators ir citur — to šoreiz var netaisīt” — toņu ģenerators izņemts. Ansis 02.11: “Pamattoni. Ar zvaigznīti.” — § 9.1 izlemts: lielais skaitlis un rekordi rāda pamattoni, ar zemsvītras piezīmi “*” (§ 3.5).
> Ansis 01.11: 11. klase (25 skolēni), fizikas nedēļa par elektromagnētismu, EM viļņiem un gaismu. Lapa projektorā no skolotāja datora, skaņu ņem datora mikrofons. Ideja — saistīt skaņu ar gaismu: abas ir svārstības ar frekvenci, un augstums skaņai ir tas pats, kas krāsa gaismai.
> Vizuālā sistēma — `docs/plans/2026-07-15-rasejuma-dizains.md`, izkārtojums — `docs/plans/2026-10-04-izkartojums.md`. Tuvākie paraugi: M-01 Brauna kustība (vadības josla zem galvenes), S-02 skaņas laboratorija (notis, logaritmiskais frekvences slīdnis, Web Audio).

## 1. Kas tā ir

Dzīvs skaņas spektrs no datora mikrofona. Skolēni dzied, svilpj, runā, sit toņdakšu, spēlē instrumentus vai skaļruni un uzreiz redz, kādas frekvences un cik skaļi skan. Katra frekvence iekrāsota kā redzamās gaismas krāsa: zemās — sarkanas, augstās — violetas. Mērinstruments, ne simulācija: nekas netiek izdomāts, lapa rāda to, ko dzird mikrofons.

Divi skati — **SPEKTRS** (frekvence pa horizontāli, skaļums pa vertikāli) un **SPEKTROGRAMMA** (krāsaina josla, kas slīd laikā). Blakus vienmēr lielais rādījums (pamattonis, nots, krāsa) un spēle “Zemākā un augstākā”. Toņu ģeneratora šajā lapā nav (tas ir citur).

## 2. Kā to lieto stundā

| # | Ko dara klase | Ko redz lapā | Ko var pārrunāt |
|---|---|---|---|
| 1 | Sit toņdakšu (440 Hz) pie mikrofona | Viena šaura virsotne pie 440 Hz; lielais rādījums “440 Hz · la · 1. oktāva”, krāsa zaļa | Tīrs tonis = viena frekvence. Precizitāte: lapa rāda ~440 Hz (±1 Hz). |
| 2 | Dzied vienu noti; to pašu noti spēlē instruments | Pamattonis un virstoņi pie 2f, 3f, 4f …; tā pati nots dažādiem avotiem — virsotnes tajās pašās vietās, augstumi atšķiras | Tembrs (klase jau mācījās): augstumu nosaka pamattonis, tembru — virstoņu skaļums. “Apturēt” (atstarpe), lai visi aplūko vienu mirkli; kursors rāda katras virsotnes frekvenci (880 = 2 · 440). |
| 3 | Sacensības: kurš nodziedās zemāk, kurš augstāk | Rekordi ZEMĀKĀ un AUGSTĀKĀ ar frekvenci, noti un krāsu; starpība oktāvās | Balss diapazons oktāvās; salīdzinājums ar dzirdi (~10 oktāvas) un redzamo gaismu (mazāk par vienu oktāvu). |
| 4 | Ģenerators (cita lapa vai ierīce) caur skaļruni, mikrofons klausās | Virsotne tieši pie ģeneratorā iestatītās frekvences | Skaļrunī strāvas svārstības kļūst par membrānas svārstībām un skaņu; mikrofonā otrādi — skaņa kļūst par strāvu. Tā pati frekvence visā ķēdē. |
| 5 | Ģenerators lēnām uz augšu līdz dzirdes robežai | Virsotne vēl redzama, bet skolēni vairs nedzird | Dzirdes robeža ar vecumu krītas; mikrofons un skaļrunis arī savu robežu tuvumā kļūst vājāki (§ 4.6). |
| 6 | Lielais basa skaļrunis, 30–60 Hz | Sarkanā zona; bieži arī virstoņi (skaļruņa kropļojumi) | Zemu frekvenci var redzēt un sajust — membrāna kustas acīm redzami. |
| 7 | Spektrogrammā: svilpiens ar slīdošu toni, runa, akords | Līnija, kas kāpj un krīt; runā — mainīgas joslas; akordā — vairākas paralēlas līnijas | Kā skaņa mainās laikā. |

## 3. Lapa (ko redz un var darīt)

### 3.1 Izkārtojums

`body.layout-hud` kā citām jaunā stila lapām. Galvene “← SARAKSTS · SKAŅAS SPEKTRA ANALIZATORS · S-03 · LV EN ◐ ⛶”. Zem tās — vadības josla (kā M-01). Zem joslas rasējuma laukums: pa kreisi grafiks, pa labi rādījumu aile. Nekas nepārklājas. ⚙ apakšā pa kreisi, rakstlaukums (KOMPLEKTS FIZ-SIM / LAPA S-03 / TĒMA SKAŅA) datorā apakšā pa labi.

```
┌ ← SARAKSTS │ SKAŅAS SPEKTRA ANALIZATORS                        S-03 │ LV EN ◐ ⛶ ┐
├ MIKROFONS   │ SKATS                      │ JUTĪBA           │                    │
│ [● SĀKT]    │ [SPEKTRS] [SPEKTROGRAMMA]  │ − ◇────── +  5   │                [i] │
├─────────────────────────────────────────────────────────┬─────────────────────────┤
│ dB                                                      │ SKAĻĀKĀ FREKVENCE        │
│  −20 ┤          ╱╲                                      │                         │
│  −40 ┤    __╱╲_╱  ╲_╱╲__                                │      440 Hz             │
│  −60 ┤ __╱              ╲___╱╲___                       │   la · 1. oktāva        │
│  −80 ┤- - - - - - - - slieksnis - - - - - - - - - - - - │   ■ ZAĻA                │
│       ▼zemākā                    ▼augstākā              ├─────────────────────────┤
│       50  100  200  500  1k  2k  5k  10k  20k  Hz       │ ZEMĀKĀ     82,4 Hz  ■   │
│       (laukums zem līknes krāsots kā gaismas spektrs)   │ AUGSTĀKĀ  3 520 Hz  ■   │
│                                                         │ starpība 5,4 oktāvas    │
│                                                         │ [↺ NO JAUNA]            │
└─────────────────────────────────────────────────────────┴─────────────────────────┘
 ⚙                                                          FIZ-SIM │ S-03 │ SKAŅA
```

Telefonā (portretā) josla aplaužas divās rindās, rādījumu aile kļūst par šauru joslu virs grafika (frekvence + nots + krāsa vienā rindā, rekordi otrā), grafiks aizņem pārējo. Darbojas no 320 px bez horizontālas ritināšanas.

### 3.2 Vadības josla

| Grupa | Vadīkla | Darbība |
|---|---|---|
| MIKROFONS | **● SĀKT** | Prasa mikrofona atļauju un sāk klausīties. Pēc tam tā pati poga kļūst **⏸ APTURĒT** / **▶ TURPINĀT**. Atstarpes taustiņš dara to pašu. Apturot sastingst viss (spektrs, spektrogramma, rādījums, rekordi), grafikā redzams uzraksts APTURĒTS (ne tikai krāsa); mikrofons paliek ieslēgts, lai turpinātu uzreiz. |
| SKATS | **SPEKTRS · SPEKTROGRAMMA** | Pārslēgs (segmentētas pogas, `aria-pressed`). Rādījumu aile un rekordi abos skatos tie paši. |
| JUTĪBA | − izmēru līnijas slīdnis + (1–10, sākumā 5) | Pārbīda redzamo dB logu: lielāka jutība — redzamas klusākas skaņas, līkne paceļas. Rekordu slieksni neietekmē (§ 4.5). |
| — | **i** | Atver piezīmi (§ 3.8). |

Tastatūra: atstarpe — apturēt/turpināt; R — rekordi no jauna (kā M-01 ↺). Pogas pēc klikšķa atdod fokusu, lai atstarpe paliek apturēšanai (kā M-01).

### 3.3 Skats SPEKTRS

- Horizontāli frekvence 20 Hz–20 kHz logaritmiskā skalā. Iezīmes ar uzrakstiem: 50, 100, 200, 500 Hz, 1, 2, 5, 10, 20 kHz (uzraksti “1k”, “2k” … — tik daudz vietas, cik ietilpst; šaurā ekrānā paliek 100, 1k, 10k). Starpiezīmes (30, 40, 60 … ) tikai kā īsas svītriņas.
- Vertikāli skaļums dB, līnijas ik pa 10 dB, uzraksti ik pa 20 dB (§ 4.4).
- Līkne tintē (≥ 2 px), laukums zem tās krāsots pēc frekvences (§ 4.7) — ar to krāsa ir papildu informācija, forma salasāma arī bez krāsas.
- Skaļākā virsotne atzīmēta ar mazu akcenta trīsstūri ▲ un frekvenci virs tās. Pamattonis — ar zvaigznīti ✱ un frekvenci (ja tas sakrīt ar skaļāko virsotni, abas zīmes vienā vietā, uzraksts vienreiz).
- Rekordu vietas — atzīmes ▼ uz frekvenču ass ar uzrakstu ZEMĀKĀ / AUGSTĀKĀ.
- Rekordu slieksnis — raustīta līnija blāvā tintē ar uzrakstu “slieksnis” (§ 4.5): tas, kas paceļas virs tās, skaitās.
- **Kursors** (mana papildu ideja, skat. § 10): pele, pirksts vai bultiņas (kad grafiks fokusā) — vertikāla līnija ar frekvenci, noti un dB tajā vietā. Visnoderīgāk apturētā skatā: “šī virsotne ir 880 Hz”.

### 3.4 Skats SPEKTROGRAMMA

- Horizontāli laiks: pēdējās 10 sekundes, jaunākais labajā malā, josla slīd pa kreisi. Uzraksti “−10 s … 0 s”.
- Vertikāli frekvence 20 Hz–20 kHz logaritmiski (zemās apakšā), tās pašas iezīmes kā spektram.
- Katrs punkts — krāsa pēc frekvences (rindas), spilgtums pēc skaļuma (JUTĪBAS logā): klusums — fona krāsa, skaļš — pilna krāsa.
- Rekordu atzīmes ◀ uz frekvenču ass.
- Apturot josla stāv; kursors rāda frekvenci un laiku.

### 3.5 Lielais rādījums (aile pa labi)

- Virsraksts **PAMATTONIS \*** (Ansis 02.11: “Pamattoni. Ar zvaigznīti.”). Zem rādījuma zemsvītras piezīme: “\* Pamattonis — augstums, ko dzird auss. Skaļākā virsotne (▲ grafikā) var būt 2., 3. … harmonika.” Grafikā pamattonis atzīmēts ar to pašu zvaigznīti.
- Liels skaitlis: zem 100 Hz ar vienu decimāli (82,4 Hz), no 100 Hz vesels (440 Hz), tūkstoši ar atstarpi (3 520 Hz). IBM Plex Mono, tabulārie cipari.
- Zem tā nots: “la · 1. oktāva” (S-02 nosaukumi: do, do♯ … si; lielā, mazā, 1., 2. … oktāva). Ja nots atšķiras vairāk par ±20 centiem, centi mazā rindiņā (“+32 c”).
- Krāsas josliņa (§ 4.7); nosaukums (SARKANA, ORANŽA, DZELTENA, ZAĻA, ZILA, VIOLETA) tikai ekrāna lasītājam (§ 11.12).
- Kad nekas neskan pietiekami skaļi — “—” un blāvs uzraksts “klusums”. Ja skan (runa, šņākoņa, ātri slīdoša nots), bet stabila toņa nav — “—” un “nav stabila toņa” (§ 11.10).
- Skaitlis atjaunojas ~5 reizes sekundē, lai to var nolasīt; uz citu virsotni pārlec tikai tad, ja tā ir skaidri skaļāka (≥ 3 dB) vai noturas ≥ 0,2 s. Grafiks pats atjaunojas katrā kadrā.

### 3.6 Spēle “Zemākā un augstākā”

- Divi rekordi: **ZEMĀKĀ** un **AUGSTĀKĀ** — frekvence, nots un krāsas lauciņš. Rekords tiek pierakstīts, ja tonis paceļas virs sliekšņa un turas stabils vismaz 0,25 s (frekvence nemainās vairāk par ±3 %). Fona troksnis, plaukšķi, klikšķi un šņākoņa neskaitās (§ 4.5).
- Zem rekordiem — “starpība 5,4 oktāvas” (mana papildu ideja, § 10).
- Jauns rekords: skaitlis uz brīdi akcentā un paziņojums ekrāna lasītājam (`role="status"`, piem. “Jauns rekords: zemākā 82,4 Hz”).
- **↺ NO JAUNA** (un R) — abi rekordi tukši (“—”).
- Rekordi ir tikai šajā lapas atvēršanā; pārlādējot sākas no jauna.

### 3.7 Toņu ģenerators — nav

Ansis 01.11: “Ģenerators ir citur — to šoreiz var netaisīt.” Ārēja ģeneratora (cita lapa vai ierīce) toni mikrofons dzird kā jebkuru skaņu: tas redzams spektrā un skaitās arī rekordos, tāpēc pirms dziedāšanas sacensībām — ↺ NO JAUNA.

### 3.8 “i” — piezīme

Atveras dialoglogā (Esc aizver, fokuss atgriežas uz “i”). Saturs latviski, īsi:

1. **Krāsas ir analoģija, ne fizika.** Dzirdamā skaņa ir 20 Hz–20 kHz — tūkstoškārtīga starpība, ~10 oktāvas. Redzamā gaisma ir ~430–750 THz — mazāk par divkāršu starpību, mazāk par vienu oktāvu. Lapa saspiež 10 skaņas oktāvas vienā gaismas spektrā: 20 Hz atbilst sarkanai (~700 nm), 20 kHz — violetai (~400 nm). Skaņai krāsas nav; abas ir svārstības, un frekvence nosaka skaņas augstumu un gaismas krāsu.
2. **dB šeit ir relatīvi.** 0 dB ir skaļākais, ko mikrofons var uztvert; −20 dB — 10 reizes mazāka amplitūda. Mikrofons nav kalibrēts, tāpēc tie nav decibeli, ko rāda skaņas līmeņa mērītājs.
3. **Mikrofons un skaļrunis nav ideāli.** Datora mikrofons un skaļruņi vāji uztver un atskaņo zemās (zem ~100 Hz) un ļoti augstās (virs ~15 kHz) frekvences, tāpēc tur spektrs izskatās klusāks, nekā ir.
4. **Mikrofona apstrāde** — ko pārlūks tiešām izslēdza (no `getSettings()`): atbalss slāpēšana, trokšņu slāpēšana, automātiskā skaļuma regulēšana — katrai “izslēgta” vai “ieslēgta — spektrs var būt sagrozīts”. Lietotais mikrofons (nosaukums) un, ja datoram ir vairāki, izvēle (§ 10).
5. **Tehniski:** frekvenču solis un loga garums (§ 4.2) ar faktisko iztveršanas frekvenci.
6. Skaņa netiek ierakstīta un nekur nesūtīta — to apstrādā tikai šis pārlūks.

### 3.9 Mikrofona sākšana un kļūdas

Pirms “Sākt” grafika vietā lielā rāmī: “Spied ● SĀKT un atļauj pārlūkam lietot mikrofonu.” Katram cēlonim savs teksts (latviski, kopā ar pārlūka paša kļūdas nosaukumu mazā rindiņā, lai var pateikt man). Ziņa ir grafika vietā un `role="alert"`.

| Cēlonis | Kā atpazīst | Teksts |
|---|---|---|
| Nav drošas adreses | `navigator.mediaDevices` nav (lapa atvērta caur http vai kā fails) | “Mikrofons darbojas tikai drošā adresē (https). Atver lapu ans-sta.github.io/fiz-sim/sound-spectrum.html.” |
| Pārlūks neprot | nav `getUserMedia` vai `AudioContext` | “Šis pārlūks neļauj lietot mikrofonu. Atver lapu Chrome vai Safari.” |
| Atļauju liedza pārlūkā | `NotAllowedError` | Chrome: “Mikrofona atļauja nav dota. Klikšķini uz ikonas adreses joslas kreisajā malā → Mikrofons → Atļaut, tad pārlādē lapu.” Safari: “Mikrofona atļauja nav dota. Izvēlnē Safari → Iestatījumi šai vietnei… → Mikrofons → Atļaut, tad pārlādē lapu.” |
| Atļauju liedz macOS | `NotAllowedError` ar ziņu “Permission denied by system” (Chrome) | “macOS neļauj pārlūkam lietot mikrofonu. Atver Sistēmas iestatījumi → Privātums un drošība → Mikrofons, ieslēdz Chrome (vai Safari) un pārlādē lapu.” Citā operētājsistēmā (Windows u. c.): “Datora privātuma iestatījumi neļauj pārlūkam lietot mikrofonu. Atļauj to iestatījumos un pārlādē lapu.” |
| Nav mikrofona | `NotFoundError` | “Datoram nav pievienots mikrofons (vai tas ir izslēgts). Pievieno mikrofonu un spied ● SĀKT vēlreiz.” |
| Mikrofons aizņemts | `NotReadableError` | “Mikrofonu nevar nolasīt — iespējams, to lieto cita programma (Zoom, Teams …). Aizver to un spied ● SĀKT vēlreiz.” |
| Prasības neiet | `OverconstrainedError` | Lapa vienreiz mēģina vēlreiz bez apstrādes prasībām; ja izdodas — “i” piezīmē redzams, kas palika ieslēgts. Ja ne — nākamā rinda. |
| Cits | jebkas cits | “Mikrofonu neizdevās ieslēgt: {pārlūka ziņa}. Pārlādē lapu un mēģini vēlreiz.” |
| Mikrofons atvienojās lietošanas laikā | celiņš beidzas (`ended`) | “Mikrofons atvienojās. Pievieno to un spied ● SĀKT.” |

Safari jautā atļauju katrā lapas atvēršanā, ja vien vietnei nav iestatīts “Atļaut” — to pieminu README skolotājam.

### 3.10 Projektors, telefons, piekļūstamība

- Projektoram: lielie skaitļi ~64–120 px (aug līdzi ⚙ BURTI), ass uzraksti ≥ 14 px pie 100 %, līnijas ≥ 2 px. ⚙ BURTI 80–200 %, ZĪMĒJUMS — līniju biezums un grafika uzraksti. Pilnekrāns (⛶ galvenē un ⚙); pilnekrānā galvenes nav, vadības josla paliek.
- Abas tēmas (gaišā un tumšā). Krāsas tikai no tēmas marķieriem; vienīgais izņēmums — spektra krāsas (fizikālās krāsas kā lādiņiem el. laukā), katrai tēmai pārbaudītas ≥ 3 : 1 pret fonu (§ 4.7).
- Piekļūstamība (WCAG 2.2 AA): native pogas un `input type=range`; kanvai `role="img"` ar aprakstu; lielais rādījums un rekordi ir DOM teksts (ne kanvā); jauni rekordi un apturēšana — `role="status"`; kļūdas — `role="alert"`; fokuss redzams; mērķi ≥ 24 × 24 px; kursors ar bultiņām. Lai nemirgo, spektra laukumu izlīdzina laikā (bez straujiem lieliem spilgtuma lēcieniem).
- LV un EN kā visās lapās (sākumā LV, ja pārlūks ir latvisks).

## 4. Fizika un mērīšana

### 4.1 Mikrofons bez apstrādes

`getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 } })`. Ko pārlūks tiešām piemēroja, nolasa no `track.getSettings()` un rāda “i” piezīmē. Mikrofona signāls iet tikai uz analizatoru, ne uz skaļruņiem.

### 4.2 FFT un izšķirtspēja

Zemajām frekvencēm vajag garu logu, bet garš logs reaģē lēni. Tāpēc divi analizatori uz tā paša signāla:

| Josla | FFT punkti | Frekvenču solis (48 kHz / 44,1 kHz) | Loga garums |
|---|---|---|---|
| zemās, līdz ~400 Hz | 32 768 (Web Audio maksimums) | 1,46 Hz / 1,35 Hz | 0,68 s / 0,74 s |
| augstās, no ~400 Hz | 8 192 | 5,86 Hz / 5,38 Hz | 0,17 s / 0,19 s |

Starp 300 un 500 Hz abi spektri pāriet viens otrā. Sekas: zemie toņi grafikā parādās un nodziest ar ~0,5 s aizturi, augstie — gandrīz uzreiz. To var minēt klasei: lai frekvenci zinātu precīzi, jāklausās ilgāk (Δf · Δt ≈ 1). Precīzās robežas (400 Hz, smoothing) noregulēšu būvējot pēc tā, kā izskatās.

### 4.3 Virsotnes frekvence precīzi

Skaļākā virsotne: lielākā josla spektrā, tad frekvenci precizē ar parabolu pa trim blakus joslām (dB vērtībās). Ar Blackman logu (Web Audio to lieto) kļūda ir daudz mazāka par frekvenču soli: toņdakšai 440 Hz → 440 ± 0,5 Hz. Pārbaude — vienības testi ar sintētisku sinusu (§ 6) un Chrome ar 440 Hz skaņas failu mikrofona vietā (§ 7).

### 4.4 dB skala un JUTĪBA

- Vertikālā ass — dB attiecībā pret mikrofona maksimumu (0 dB augšā, uz leju negatīvi: −20, −40, −60 …). Godīgi un tāpat kā audio programmās; “i” paskaidro.
- Redzamais logs ir 70 dB augsts. JUTĪBA 1 → logs −10 … −80 dB; katrs solis par 5 dB uz leju; JUTĪBA 10 → −55 … −125 dB. Tas, kas augstāk par logu, nogriežas pie augšējās malas.

### 4.5 Fona slieksnis un rekordi

- Lapa katrai frekvencei seko fona līmenim — tam, kas skan visu laiku (ventilators, projektors, klases dūkoņa): fona līkne lēni ceļas (desmitos sekunžu) un ātri krīt. Ilgi turēts tonis tāpēc fonā “neiesūcas”.
- Slieksnis = fons + 15 dB. Grafikā to rāda raustītā līnija.
- Rekordam (un lielā rādījuma “nav klusums” stāvoklim) virsotnei jābūt virs sliekšņa, šaurai (tonis, ne troksnis — vismaz 10 dB virs apkārtnes ±1/3 oktāvas robežās) un jāturas ≥ 0,25 s ar frekvenci ±3 % robežās. Tā izkrīt plaukšķi, klikšķi, “sss” un runas troksnis.
- Rekordos skaitās 40 Hz–5 kHz (Ansis 03.11; sākumā bija 25 Hz–20 kHz, bet telefonā un datorā rekordos nonāca ~16–17 kHz elektronikas pīkstiens un ~26–29 Hz dūkoņa). Grafiks un lielais skaitlis rāda no 25 Hz.

### 4.6 Ko lapa nevar

Mikrofona un skaļruņa frekvenču raksturlīkne nav taisna (§ 3.8 p. 3) — lapa to nelabo. Klēpjdatora skaļrunis 30 Hz neatskaņo; lielā basa skaļruņa demonstrācijai vajag ārēju skaļruni.

### 4.7 Krāsu kartēšana

Skaņas frekvences logaritmiskā vieta 20 Hz–20 kHz diapazonā pārnesta uz to pašu vietu redzamās gaismas frekvencēs 430–750 THz (arī logaritmiski), tad gaismas viļņa garums λ = c / f pārvērsts krāsā kā īstā spektrā:

f_gaisma = 430 THz · (750 / 430) ^ (log(f / 20 Hz) / log 1000)

| Krāsa | Gaisma | Skaņa |
|---|---|---|
| SARKANA | > 620 nm | 20–86 Hz |
| ORANŽA | 590–620 nm | 86–159 Hz |
| DZELTENA | 570–590 nm | 159–244 Hz |
| ZAĻA | 495–570 nm | 244 Hz–1,4 kHz |
| ZILA | 450–495 nm | 1,4–4,6 kHz |
| VIOLETA | < 450 nm | 4,6–20 kHz |

Piemēri: toņdakša 440 Hz → 544 nm, zaļa; vīrieša balss pamattonis 100 Hz → ~610 nm, oranža; svilpiens 2 kHz → 481 nm, zila. Zaļā josla ir plata, jo arī īstajā spektrā frekvenču skalā zaļā aizņem lielu daļu. Krāsas katrai tēmai noregulētas, lai būtu ≥ 3 : 1 pret fonu (gaišajā tēmā dzeltenā kļūst okera, tumšajā zilā un violetā — gaišākas), tāpat kā lādiņu krāsas.

## 5. Saite skolotājam

`sound-spectrum.html?view=spectrum|spectrogram&sens=<1–10>&lock=1`

| Parametrs | Nozīme |
|---|---|
| `view=spectrum\|spectrogram` | Sākuma skats (noklusēti `spectrum`) |
| `sens=<1–10>` | JUTĪBA (noklusēti 5) |
| `lock=1` (vai `true`) | Aizslēdz visus saitē dotos iestatījumus kā K-01/K-02: aizslēgtais pelēks ar zīmi FIKS. (piem. `view=spectrogram&lock=1` — tikai spektrogramma). |

Nezināmos parametrus ignorē; ārpus robežām — nogriež ar paziņojumu (kopīgais `url-params.js`). README sadaļa “Teacher links (S-03)”.

## 6. Faili, moduļi, testi

Repo konvencija jaunā stila lapām ir koplietoti ES moduļi bez build soļa (ne viens HTML fails), tāpēc kā M-01/M-02:

- `sound-spectrum.html` — lapa (struktūra kā `brownian-motion.html`).
- `assets/spectrum/` — `model.js` (tīrā loģika: log ass un iezīmes, krāsu kartēšana, virsotnes precizēšana, pamattonis, fona sekotājs, rekordu loģika, formatēšana), `audio.js` (mikrofons, divi analizatori), `params.js` (saite), `i18n.js` (LV/EN), `scene.js` (kanva: spektrs, spektrogramma, ass, atzīmes), `main.js` (lapa).
- Lieto jau esošo: `sim-core.js` (galvene, valoda, tēma, kanva, cilpa), `measure/hud.js` (⚙), `measure/notices.js`, `measure/url-params.js`, `measure/format.js`, `sound/model.js` `nearestNote` un S-02 nošu nosaukumus.
- CSS: `.s03-*` sadaļa `sim-common.css` beigās; esošās klases neaiztiek.
- `index.html`: jauna kartīte uzreiz aiz “Skaņas laboratorija” — zīmēts SVG (spektra līkne ar varavīksnes laukumu un log asi) kartīšu stilā, LV/EN teksti. `README.md`: rinda tabulā, struktūra, “Teacher links (S-03)”.
- Testi (`npm test`): `tests/spectrum-model.test.js` (krāsu robežas no tabulas; sintētisks sinuss caur Blackman + FFT kā Web Audio → 440,0 ± 0,5 Hz, arī 50 un 15 000 Hz; divi toņi 50 un 60 Hz atšķirami; harmoniku rinda ar vāju vai trūkstošu pamattoni → pamattonis, arī ap 400 Hz, kur savienojas abi analizatori; troksnis → nav rekorda; īss klikšķis → nav rekorda; fona sekotājs neiesūc 10 s toni), `spectrum-params.test.js`, `spectrum-i18n.test.js` (LV un EN atslēgas sakrīt).
- Vecās `sound-lab.html` un `sound-lab-v2.html` neaiztiek.

## 7. Pārbaude pirms nodošanas

1. `npm test` — viss zaļš.
2. Chrome (Playwright) ar mikrofona vietā iedotu skaņas failu: 440 Hz sinuss → rādījums 440 Hz ± 1, “la · 1. oktāva”, zaļa; balss veida signāls ar vāju pamattoni → rādījums ir pamattonis; troksnis → rekordu nav; 50 + 60 Hz → divas virsotnes.
3. Bez atļaujas (liegta) → precīzs paziņojums; bez `mediaDevices` → https paziņojums.
4. Nav horizontālas ritināšanas 320, 768, 1280, 1920 px platumā un 200 % burtos; abas tēmas.
5. axe (wcag2a, wcag2aa, wcag21aa, wcag22aa) — 0 pārkāpumu; viss ar tastatūru (Tab, atstarpe, bultiņas, Esc).
6. Safari: lokāli (`localhost` ir droša adrese) atveru īstā Safari; ar īstu mikrofonu un dziedāšanu pārbaudīt var tikai tur, kur mikrofons ir (Mac Mini iebūvēta mikrofona nav) — to darīsi tu vai pārbaudīsim kopā. Caur https (GitHub Pages) Chrome un Safari — tikai pēc push, ko daru tikai ar tavu apstiprinājumu.
7. Pārbaudes mērķis ir skolotāja Mac ar Chrome un Safari (Ansis 01.11). Telefonos (iOS, Android) lapa strādās, ja pārlūks ļauj, un izkārtojums der arī tur, bet tie nav pārbaudes mērķis — iOS Safari mikrofona apstrādi var neizslēgt.

## 8. Ārpus tvēruma

Toņu ģenerators (Ansis 01.11: ir citur), skaņas ierakstīšana un saglabāšana, attēla/datu eksports, kalibrēti decibeli (dB SPL), harmoniku atzīmes pie 2f, 3f …, skaņotāja režīms ar centu rādītāju, stereo, vairāki mikrofoni vienlaikus, mikrofona skaņa uz skaļruņiem.

## 9. Atvērtie jautājumi Ansim

### 9.1 Lielais skaitlis un rekordi: skaļākā frekvence vai pamattonis? — IZLEMTS: B

Ansis 02.11: “Pamattoni. Ar zvaigznīti.” Zvaigznīte saprasta kā zemsvītras piezīme pie virsraksta un tā pati zīme grafikā (§ 3.3, § 3.5).

Balsij un instrumentiem skaļākā virsotne bieži nav pamattonis, bet 2. vai 3. harmonika (it īpaši zemām balsīm: datora mikrofons zem ~100 Hz ir vājš). Tad:

- **A. Skaļākā frekvence (kā rakstīji).** Vienkārši, grafikā redzams kā augstākā virsotne. Bet zemai balsij rādījums lēkā pa oktāvām, un rekordā var ierakstīties 196 Hz, kaut skolēns dziedāja 98 Hz. Nots tad arī oktāvu augstāk.
- **B. Pamattonis (iesaku).** Lapa atrod harmoniku rindas pamatu (to pašu, ko dzird auss kā augstumu). Lielais skaitlis, nots un rekordi — pamattonis; skaļākā virsotne grafikā joprojām atzīmēta ar savu frekvenci. Toņdakšai, svilpienam un ģeneratoram A un B dod vienu un to pašu. Troksnim pamattoņa nav — “—”. Virsraksts “AUGSTUMS (PAMATTONIS)” vai līdzīgs.

## 10. Claude lēmumi (pārbaudei lasot)

1. Fails `sound-spectrum.html`, lapa **S-03**, TĒMA “SKAŅA”; moduļi `assets/spectrum/` (repo konvencija, ne viens HTML fails).
2. Krāsas: skaņas frekvence logaritmiski → gaismas frekvence 430–750 THz → īstā spektra krāsa (§ 4.7). Tāpēc 440 Hz ir zaļa, nevis dzeltena. Alternatīva — sešas vienādas joslas pa ~1,7 oktāvām (tad 440 Hz būtu dzeltena), bet tā vairs nav saistīta ar gaismas frekvencēm.
3. dB ass: 0 dB = mikrofona maksimums, uz leju negatīvi (§ 4.4).
4. JUTĪBA pārbīda tikai redzamo logu; rekordu slieksnis automātisks pēc fona un redzams kā raustīta līnija (§ 4.5).
5. Divi FFT logi: 32 768 zemām, 8 192 augstām, savienoti ap 400 Hz (§ 4.2).
6. Papildus tavam aprakstam (vari svītrot): kursors frekvences nolasīšanai; “starpība N oktāvas” pie rekordiem; mikrofona izvēle “i” logā, ja datoram ir vairāki mikrofoni (projektora zālē bieži ir arī kameras mikrofons); taustiņš R; EN valoda kā visām lapām.
8. Būvēju visu vienā piegājienā (ne pa kārtām); pēc tam — tava pārbaude ar īstu mikrofonu un tikai tad push.
7. Kartīte sākumlapā uzreiz aiz “Skaņas laboratorija”.

## 11. Būves piezīmes (Claude, 02.11)

Uzbūvēts pēc § 1–10 ar šiem sīkākiem lēmumiem, kas radās būvējot:

1. **Rekordi grafikā:** raustīta vertikāle ar rāmīti ZEMĀKĀ / AUGSTĀKĀ grafika apakšā (spektrogrammā — horizontāle, ZEMĀKĀ zem līnijas, AUGSTĀKĀ virs), § 3.3 rakstīto ▼ uz ass vietā — augša paliek virsotņu uzrakstiem.
2. **▲ skaļākā virsotne** redzama tikai tad, kad ir stabils pamattonis; troksnī zīmes nelēkā.
3. **Fons:** pirmajā sekundē pēc ● SĀKT lapa iepazīst telpu — tas, kas skan jau tad (projektors, dūkoņa), skaitās fons. Toņdakšu sit pēc SĀKT. Pēc tam fons ceļas 0,3 dB/s: skaļš ģeneratora tonis paliek rādījumā vairākas minūtes, pastāvīga dūkoņa, kas parādās vēlāk, pazūd pēc ~0,5–1 min (līdz tam to var redzēt arī rekordos — ↺ NO JAUNA).
4. **Pamattonis:** harmoniku siets — kandidāti ir stiprāko toņu f/n (n ≤ 6), skaitās harmonikas līdz 12., uzvar augstākais kandidāts ar ≥ 90 % no labākā rezultāta. Trūkstošs pamattonis (bez savas virsotnes) skaitās tikai tad, ja to apstiprina ≥ 3 harmonikas, zemākā ne augstāk par 3. — tā divi vienlaikus skanoši toņi (divi skolēni, akords, nots maiņas brīdis) nedod izdomātu zemu noti; rādījums ir viena no īstajām notīm.
5. **Līkne** krīt ne ātrāk par 120 dB/s (nemirgo, bet arī neizplūst).
6. **Krāsas un kontrasts:** gaišajā tēmā šajā lapā blāvā tinte un akcents tumšāki (#625f56 — 5,6 : 1, #a8470d — 5,1 : 1), lai mazs teksts ir ≥ 4,5 : 1; spektra krāsas ≥ 3 : 1 pret fonu abās tēmās (tests).
7. **Telefons:** portretā BURTI ne vairāk kā 130 %, lai grafikam paliek vieta; šaurā galvenē virsraksts “SKAŅAS SPEKTRS”.
8. **“i” piezīmē** papildus sadaļa “Pamattonis un rekordi” (kas skaitās tonis, ko dara pirmā sekunde).
9. **Papildu ziņas** (precīzs cēlonis): mikrofons dod pilnīgu klusumu (izslēgts, skaļums 0); pārlūks apturēja skaņas apstrādi (Safari pēc miega) — klikšķis turpina. Atvienota izvēlētā ierīce → nākamais SĀKT ņem jebkuru mikrofonu. Mikrofona maiņa “i” piezīmē: ja neizdodas, vecais turpina strādāt, cēlonis redzams piezīmē.
10. **Pēc Anša pārbaudes ar īstu mikrofonu (03.11):** rādījums vairs nesaka “klusums”, kad skan, bet stabila toņa nav (ekrānuzņēmumā skanēja balss, nots mainījās) — tad “nav stabila toņa”; “skan” — vismaz 3 joslas virs sliekšņa pēc tam, kad fons iepazīts. Sliekšņa uzraksts “slieksnis” vairs nepaliek zem AUGSTĀKĀ rāmīša, ja rekords ir pie grafika labās malas — tad uzraksts paceļas virs rāmīša.
11. **Telefons pēc Anša 03.11 (iPhone 16 Pro Max ekrānuzņēmumi: “spektra grafiks ir pārāk mazs, un kontroles pārāk lielas”; “grafikam ir jāaizņem LIELĀKĀ ekrāna daļa”):** josla vienā rindā — ⏸ PAUZE (bija APTURĒT; arī grafika rāmītis PAUZE) · SPEKTRS|SPEKTROGRAMMA · JUTĪBA atvilknē (sakļautā redz tikai skaitli; datorā josla kā līdz šim) · i. Virsraksts vienā rindā, atpakaļ saitē tikai ←. Paskaidrojums “* Pamattonis — …” uznirst, uzspiežot “i” pie PAMATTONIS (visos ekrānos). Nekas nelec, mainoties vērtībām: skaitlim rezervēti 5 cipari, vienība vienmēr aizņem vietu, rindas fiksētā augstumā, poga SĀKT/PAUZE/TURPINĀT garākā uzraksta platumā (Ansis: “tam ir jābūt noklusējumā”). Grafiks portretā ~70–76 % ekrāna (320 px — ~67 %), guļus ~50–58 %; burti telefonā līdz 115 % (320–379 px — 100 %). Telefonā portretā rekordu rindā “↺” bez vārda, starpība — guļus un datorā. PAUZE rāmītis grafika kreisajā augšējā stūrī, virsotņu uzraksti to apiet; mazā kanvā uzraksti 11–14 px.
12. **Ansis 03.11 (“Jā, visus trīs — dari, kā iesaki”):** rekordos tikai 40–5 000 Hz; oranžajā joslā (590–620 nm, ~86–159 Hz) lauciņš un spektrs oranžāki (Bruton zaļais kanāls krīt straujāk līdz 597 nm; robežas tās pašas; tests: 101–146 Hz g ≤ 180, 170–188 Hz g ≥ 210). Pie lielā rādījuma krāsas nosaukums vairs nav rakstīts — tikai krāsas josliņa (“parādīt to, jā, bet rakstīt — diez vai”); nosaukums ekrāna lasītājam (“Krāsa: oranža”).
