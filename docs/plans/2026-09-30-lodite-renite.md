# Lodīte renītē — simulācija (biznesa prasības)

> Statuss: 1. kārta uzbūvēta zarā `rolling-ball`, gaida Ansa pārbaudi un publicēšanu (sk. 14. sadaļu).
> Atjaunināts: 2026-09-30T23:55:00+03:00
> Konteksts: F10 laboratorijas darbs 02-08 „Lodīte slīpajā renītē” (30.09). Reālajā eksperimentā viena datu sērija aizņem visu stundu, bet simulācija datus dod minūtēs. Vizuālā sistēma ir aprakstīta `docs/plans/2026-07-15-rasejuma-dizains.md`. Izmaiņas — 14. sadaļā.

## 1. Mērķis

Simulācija ātri dod ticamus mērījumu datus par lodītes ripošanu slīpā renītē, un reāls eksperiments tam nav vajadzīgs. Dati izskatās kā īsti mērījumi, jo tiem ir troksnis. Tāpēc skolēns tos apstrādā tieši tāpat kā pēc laboratorijas darba: aizpilda tabulas, zīmē grafikus, nosaka paātrinājumu un izdara secinājumus.

Kāpēc tas vajadzīgs:

- **Vairāk pētījuma laika.** Minūtēs var izpētīt vairākas sakarības: a(h), vai a ir atkarīgs no masas, vai a ir atkarīgs no diametra, kā ietekmē materiāls.
- **Var pārbaudīt to, ko ar klases renīti nevar:** dažādas lodītes, garāku renīti, lielāku slīpumu.
- **Mainīgo lielumu kontrole.** Skolēns trenējas atšķirt neatkarīgo, atkarīgo un fiksētos lielumus. Tā ir F10 SM:01 vājā vieta.
- **Individuāli dati.** Skolotājs katram skolēnam var iedot savu saiti ar saviem sākuma datiem (sk. 8.1).
- **Klasē telefonus neizmanto.** Simulāciju var rādīt projektorā vai lietot mājās.

## 2. Principi

1. **Simulācija tikai atvieglo nolasīšanu.** Tā ir kā ērts video: dod tikai to, ko eksperimentā var tieši nolasīt, proti, laiku t un koordinātu x. Tabulā un eksportā nav Δt, Δx, vidējo vērtību, ātruma, paātrinājuma vai grafiku, jo to visu rēķina skolēns. Patiesās vērtības redz tikai skolotājs (sk. 8.2).
2. **Dati ir kā īsti.** Katrai palaišanai ir savs troksnis, tāpēc atkārtojums ar tiem pašiem iestatījumiem dod nedaudz citus skaitļus.
3. **Fizika ir godīga.** Tāpat kā pārējās `fiz-sim` lapās, fizika ir precīza tur, kur skolēns rēķina: g = 9,81 m/s², īstās SI vērtības. Masa paātrinājumu nemaina. Skolēni gaida pretējo, un tieši tas ir atklājums (Galilejs). Materiāls un diametrs ietekmē tikai tur, kur tie ietekmē arī īstenībā (sk. 7).
4. **Viena simulācija, trīs datu līmeņi**, no vienkāršākā līdz pilnajam (sk. 4). Visi trīs paliek.
5. **Viss iestatāms saitē.** Katrs lielums ir URL parametrs, un ar `lock` to var nofiksēt (sk. 8.1).
6. **Rasējuma stils**, tāpat kā pārējās jaunā dizaina lapās. Aina ir sānskata rasējums, un lielumus maina, velkot izmēru līnijas tieši rasējumā.

## 3. Ko skolēns redz un dara

### 3.1 Aina — sānskata rasējums

- Rasējumā ir galds, renīte ar paceltu galu uz balsta, lodīte un mērlente, kas pielīmēta pie renītes (ar cm un mm iedaļām).
- **Izmēru līnijas L, h un α.** Velkot izmēru līnijas rokturi, lielums mainās, un tā vērtība ir redzama virs līnijas. Šie ir tie paši dizaina slīdņi, tikai novietoti tieši rasējumā. Šādi izpaužas „vizuāli sabīda lietas”.
- **h un α nav neatkarīgi**, jo sin α = h/L. Skolēns izvēlas, kuru no tiem iestata. Otrs tiek izrēķināts un parādās pelēks (`--ink-dim`). Mainot L, saglabājas tas lielums, ko skolēns iestata. Arī šī saistība pati par sevi ir mācību punkts.
- **Kustības sākumpunkts** ir vieta, kur lodīte tiek palaista (to iestata, velkot lodīti). **Koordinātu sākumpunkts** ir mērlentes nulle, x = 0. Pēc noklusējuma abi sakrīt. Tekstos un etiķetēs vienmēr raksta, kurš no tiem domāts, nevis vienkārši „sākumpunkts”.

### 3.2 Lielumi, ko var mainīt

Katrs rindas lielums ir arī URL parametrs (sk. 8.1).

| Lielums | Kā maina | Diapazons (priekšlikums) | Piezīme |
|---|---|---|---|
| Renītes garums L | izmēru līnija | 40–200 cm | Iestatījums „mūsu renīte”: 80 cm, darba garums 70 cm |
| Pacēlums h vai leņķis α | izmēru līnija; skolēns izvēlas, kuru iestata | α līdz ~15° | otru aprēķina |
| Lodīte | rasējuma specifikācijas tabula (poz., nosaukums, Ø, masa) | tērauds 10 / 16 / 25 mm; stikls 16 / 25 mm; koks 25 / 40 mm; plastmasa; doba bumbiņa (galda teniss, 40 mm) | Masa izriet no materiāla un Ø (m = ρV). Tā ir redzama, bet atsevišķi nav iestatāma |
| Renītes profils | slēdzis | renīte (lodīte balstās uz divām malām) / plakana virsma | Profils nosaka, vai diametrs ietekmē a |
| Kustības sākumpunkts | velk lodīti | no 0 līdz L | |
| Datu līmenis / mērinstruments | izvēle | 1 / 2 / 3 | sk. 4 |
| Laika intervāls Δt (3. līmenis) | izvēle | 0,1 / 0,2 / 0,5 s | cik bieži „zibsnī stroboskops” |
| Rezultātu skati | izvēle | datu tabula / stroboskops / abi | sk. 5 |
| Mērlente | izvēles rūtiņa RĀDĪT MĒRLENTI | rāda / paslēpj | mērlente vienmēr ir pielīmēta pie renītes |

Ar „materiālu” pagaidām saprot lodītes materiālu. No tā ir atkarīgs blīvums (tātad masa) un ripošanas berze. Vai vajadzīgs arī renītes materiāls, sk. 13.

### 3.3 Fiksētie lielumi un sērija

- **Saitē fiksētie lielumi.** Ja skolotājs saitē lielumu nofiksējis ar `lock` (sk. 8.1), tā izmēru līnija ir bloķēta un tai blakus ir uzraksts `FIKS.`.
- **Skolēna sērija.** Pirms pirmās palaišanas skolēns pats norāda neatkarīgo lielumu (to, kas starp palaišanām mainās) un atkarīgo lielumu (to, ko mēra). Gatavu atbildi simulācija nepiedāvā. Visi pārējie lielumi kļūst fiksēti tāpat kā ar `lock`.
- Ja skolēns sērijā tomēr maina fiksētu lielumu, parādās brīdinājums: „Tu maini fiksēto lielumu (lodīte). Sākt jaunu sēriju?”
- Sērijas nosaukums rezultātu tabulas virsrakstā: „1. tabula. Laiks t atkarībā no pacēluma h”. Zem tā ir rinda „Fiksētie: L = 80 cm, lodīte: tērauds Ø 16 mm, renīte”.
- Vai sērija vajadzīga, ja fiksēšanu jau dod saite, sk. 13.

### 3.4 Palaišana

- **PALAIST.** Lodīte ripo reālā laikā. 3. līmenī var izvēlēties palēninājumu (×0,25).
- **ATKĀRTOT.** Tie paši iestatījumi, bet jauns troksnis, tāpat kā trīs filmējumi laboratorijas darbā.
- Kad lodīte noripojusi, parādās pogas **DATU TABULA** un **STROBOSKOPS** (tikai tās, kuras atļauj saite, sk. 5).
- Pēc katras palaišanas rezultātu tabulā parādās jauna kolonna (atkārtojums) vai jauna rinda (jauna neatkarīgā lieluma vērtība).

## 4. Trīs datu līmeņi

| Līmenis | Reālais analogs | Kas redzams ainā | Ko dod simulācija | Ko rēķina skolēns |
|---|---|---|---|---|
| **1. Laiks visam garumam** | hronometrs rokā | hronometrs, starta un finiša atzīme | laiku t no kustības sākumpunkta līdz finišam | a = 2s/t², v_vid; a(h) u. c. |
| **2. Laiks pa posmiem t(x)** | fotovārti vai vairāki skolēni ar hronometriem pie atzīmēm | 2–6 vārti, ko velk pa renīti; attālumi redzami izmēru līnijās | katru vārtu koordinātu x un laiku t, kad lodīte tos šķērso (laiku skaita no palaišanas brīža) | Δx, Δt, v posmos; vienādos posmos laiks samazinās; t ∝ √x |
| **3. Koordināta pa laikiem x(t)** | video pa kadriem vai stroboskops (kā LD 02-08) | lodīte ripo; pēc tam — datu tabula un/vai stroboskopa attēls (sk. 5) | laiku t ik pēc Δt un koordinātu x tajā brīdī | Δx, v, Δv, a; x(t) un v(t) grafiki; 1 : 4 : 9 |

- Skolotājs saitē var atļaut tikai daļu līmeņu, piemēram, mājas darbā tikai 1. līmeni.
- Visos līmeņos simulācija dod tikai t un x. Posmu garumus, laika starpības un visu pārējo rēķina skolēns.

## 5. Rezultāti: datu tabula un stroboskops

Kad lodīte noripojusi, ir divi skati uz **vieniem un tiem pašiem** datiem, t. i., uz to pašu palaišanu. Kuri skati ir pieejami, nosaka URL parametrs (tabula, stroboskops vai abi). Ar `lock` skolēns neatļauto skatu ieslēgt nevar.

### 5.1 Datu tabula pa visu ekrānu

- Nospiežot DATU TABULA, tabula neparādās mazā stūrī, bet atveras atsevišķā slānī virs visa ekrāna ar lieliem tabulāriem cipariem. To ir ērti pārrakstīt burtnīcā, un projektorā tā ir salasāma no klases pēdējās rindas. Aizverot slāni, atgriežas aina.
- **Kolonnas ir tikai t un x.** 3. līmenī tās ir t un x₁ / x₂ / x₃ (katrs atkārtojums sava kolonna), 2. līmenī — vārtu x un t₁ / t₂ / t₃, bet 1. līmenī — t₁ / t₂ / t₃. Δt, Δx, vidējo vērtību, v un a kolonnu nav.
- Formāts ir kā darba lapās:
  - virsraksts „1. tabula. Lodītes koordināta x atkarībā no laika t”;
  - zem virsraksta iestatījumi (L, h, lodīte, profils);
  - kļūda galvenē, piemēram, „x, cm (±0,5 cm)”.
- Tabulā ir nolasījums ar mērinstrumenta precizitāti: x noapaļots līdz 0,5 cm (sk. 6).
- Pogas:
  - **KOPĒT** — tabula kā teksts ar tabulācijām, ielīmējams Excel vai Google Sheets;
  - **LEJUPIELĀDĒT CSV** — semikols kā atdalītājs, decimālkomats (lai latviešu Excel to atver pareizi).

### 5.2 Stroboskops

- Nospiežot STROBOSKOPS, atveras attēls kā stroboskopiskā fotogrāfijā: renīte sānskatā, un lodīte iezīmēta katrā vietā, kur tā fiziski atradās ik pēc Δt. Parakstā ir Δt un iestatījumi. Priekšlikums: pozīcijas numurēt 0, 1, 2 … (sk. 13).
- **Mērlente ir pielīmēta pie renītes.** Ar izvēles rūtiņu RĀDĪT MĒRLENTI to rāda vai paslēpj.
- Skolēns x nolasa pats pret mērlenti, tāpat kā reālajā darbā no video. Nolasīšanas kļūdu rada viņš pats, tāpēc stroboskopa attēlam simulācija nolasīšanas troksni nepieliek. Palaišanas troksnis (a izkliede, sākuma brīdis, slazdi) ir tas pats, kas tabulā.
- Attēlu var **tuvināt** ekrānā (ar pirkstiem vai peles ritenīti) un pārvietot.
- **EKSPORTĒT ATTĒLU** — PNG augstā izšķirtspējā, lai pietuvinot būtu skaidri salasāmas mm iedaļas un lodītes centrs (priekšlikums: ≥ 5 pikseļi uz mm renītes garuma). Der arī parasts ekrānuzņēmums.
- Zīmēšanas, atzīmju vai mērīšanas pašā simulācijā nav. Skolēns visu nolasa no attēla.

### 5.3 Eksports

- Eksportā (KOPĒT, CSV, attēls) ir tikai tieši nolasāmie lielumi, t un x, un iestatījumi galvenē. Aprēķinātu lielumu nav.
- Formāts ir stabils: galvene ar lielumiem un mērvienībām, decimālkomats, viena rinda uz mērījumu. **Nākotnē dati no simulācijas tiks kopēti uz Fv3**, kur skolēns tos apstrādā un aprēķina (Ansis, 30.09). Fv3 pusē tas būs atsevišķs darbs, un tas ir reģistrēts Fv3 žurnālā.

## 6. Troksnis („Brauna piešprice”)

Katrai palaišanai ir sava gadījuma kļūda. Tās lielums ir atkarīgs no mērinstrumenta un ir tāds, kāds būtu reālā mērījumā.

| Līmenis | Trokšņa avots | Lielums (reāls) |
|---|---|---|
| 1 | reakcijas laiks startā un finišā | izkliede ~0,1 s; katram mērītājam sava neliela sistemātiska nobīde. Tabulā: t, s (±0,10 s), vērtības ar 2 decimālzīmēm |
| 2 (fotovārti) | vārtu novietojums | x ±0,2 cm; t ±0,001 s |
| 2 (hronometri) | kā 1. līmenī, katrā atzīmē | |
| 3 | sākuma kadrs; x nolasīšana (tikai datu tabulā) | t_sāk ±1–2 kadri (viena nobīde visam filmējumam); x ±0,3 cm, noapaļots līdz 0,5 cm |
| visi | renītes un lodītes nelīdzenumi | a ±2 % starp palaišanām |

- **Intensitāte** (iestata skolotājs): 0 nozīmē ideālus datus bez trokšņa (lai redzētu tīru formu), noklusējums ir reāls troksnis, var izvēlēties arī lielu troksni.
- **Slazdi** (skolotājs tos ieslēdz, noklusējumā izslēgti). Tie ir tipiskie reālie gadījumi no LD 02-08:
  - iegrūsta lodīte: vienā palaišanā v₀ ≈ 3–5 cm/s;
  - sākuma kadrs noteikts par vēlu: t_sāk nobīde 2–3 kadri.
- **Pieraksts.** Vērtībai un tās kļūdai ir vienāds decimālzīmju skaits. Kļūdu raksta tabulas galvenē: „x, cm (±0,5 cm)”.
- **Atkārtojamība.** Dati izriet no iestatījumiem un sēklas (seed). Tie paši iestatījumi ar to pašu sēklu vienmēr dod tos pašus skaitļus, tāpēc skolotājs var atkārtot to, ko redzēja skolēns.

## 7. Fizikas modelis (kam jānotiek)

Lodīte ripo bez slīdēšanas:

a = g · (sin α − μ_r · cos α) / (1 + β · (r / r_ef)²)

- β = 2/5 pilnai lodītei, β = 2/3 dobai (plānsienu) lodītei.
- r_ef ir attālums no lodītes centra līdz atbalsta punktiem. Uz plakanas virsmas r_ef = r. Renītē, kur malas ir attālumā w, r_ef = √(r² − (w/2)²). Lodītes, kurām Ø ≤ w, izvēlē nav.
- μ_r ir ripošanas berzes koeficients, un tas ir atkarīgs no lodītes materiāla. Tāpēc ļoti mazā slīpumā lodīte neripo vispār (reālajā renītē tas notiek pie h ≈ 0,2 cm uz 80 cm).
- Gaisa pretestību neņem vērā.

**Kam jāredzas:**

- Masa a nemaina. Tērauda un stikla lodīte ar vienādu Ø ripo gandrīz vienādi: atšķirība rodas tikai no ripošanas berzes, tā ir maza un, palielinot slīpumu, samazinās.
- Doba lodīte ripo lēnāk nekā pilna. Uz plakanas virsmas tās paātrinājums ir 3/5 no g·sin α, bet pilnai lodītei 5/7.
- Renītē liela lodīte ripo ātrāk nekā maza, bet uz plakanas virsmas diametrs neietekmē. Tas ir pārsteigums, ko var pētīt.
- Ideālos datos x ∝ t², tātad pēc 1 s, 2 s un 3 s x attiecas kā 1 : 4 : 9.
- **Kalibrēšana.** Iestatījums „mūsu renīte” (L = 80 cm, h = 3,0 cm) dod a ≈ 19 cm/s², kā pieņemts F10 DL 02-08 mock datos (a ≈ 0,55 · g · (h − 0,2 cm)/L). Kad būs reālie klases dati, w un μ_r jāpārkalibrē.
- Leņķis ir ierobežots tā, lai lodīte ripotu bez slīdēšanas (priekšlikums: α ≤ 15°).

## 8. Skolotājam

### 8.1 URL parametri un `lock`

- Katru lielumu no 3.2, kā arī datu līmeni, Δt, rezultātu skatus, mērlenti, trokšņa intensitāti, slazdus un sēklu var iestatīt saitē. Piemērs (parametru nosaukumus izvēlas koderis):
  `rolling-ball.html?L=80&h=2.0&ball=steel16&level=3&dt=0.5&view=strobe&lock=1`
- **Ar `lock`** saitē norādītie lielumi ir fiksēti: skolēns tos redz, bet mainīt nevar (izmēru līnija bloķēta, `FIKS.`). Lielumi, kas saitē nav norādīti, paliek maināmi.
- **Bez `lock`** (vai ar `lock=0`) saites vērtības ir tikai sākuma iestatījumi, un skolēns tos var pabīdīt uz augšu vai uz leju.
- **Saite bez parametriem:** viss ir maināms, un sākumā ir noklusējuma vērtības („mūsu renīte”).
- Tā skolotājs, vai arī sistēma (piemēram, Fv3 uzdevums), katram skolēnam var nosūtīt precīzus, individualizētus sākuma datus.
- Ideja Fv3 pusei: Fv3 uzdevuma tekstā saite ar mainīgajiem, piemēram, `h={h}`, dotu katram skolēnam savu simulāciju un Fv3 atbilde rēķinātos ar to pašu h. Vai Fv3 aizvieto mainīgos arī saitē, jāpārbauda. Tas ir ierakstīts Fv3 žurnālā.

### 8.2 Skolotāja skats

Katrai palaišanai redzamas patiesās vērtības (a, kā arī t un x bez trokšņa) un tas, kāds troksnis vai slazds bija pielikts.

### 8.3 Datu ģenerators grupām

Skolotājs norāda N grupas, katras grupas iestatījumus un atkārtojumu skaitu. Rezultāts ir tabula tādā formā kā F10 DL 02-08 mock datiem, ar CSV. Tā skolotājs pirms stundas zina, ko gaidīt (29.09 tas tika darīts ar roku).

### 8.4 Projektors

Darbojas pēc dizaina plāna: desktopa izkārtojums lielā ekrānā, lieli tabulārie cipari. Rezultātu tabula pa visu ekrānu (5.1) ir domāta arī projektoram.

## 9. Lietojuma scenāriji

1. **Klasē, projektorā.** 8 dažādi h dod a(h) grafiku 5 minūtēs, un to var salīdzināt ar LD 02-08 klases rezultātiem.
2. **Individuāli dati.** Katram skolēnam sava saite ar `lock` un savu h. Katrs nosaka savu a, un klasē no visu rezultātiem kopā uzzīmē a(h).
3. **Mājas darbs „Vai smagāka lodīte ripo ātrāk?”** Vispirms prognoze Fv3, tad simulācija (saite ar iestatījumiem), tad secinājums Fv3 esejā ar CRITERIA.
4. **Mājas darbs par Galileja attiecību:** skolēns no stroboskopa attēla pats nolasa x un pārbauda 1 : 4 : 9 (3. līmenis) vai t ∝ √x (2. līmenis).
5. **Neatkarīgais, atkarīgais un fiksētie lielumi:** sērija, kurā daži lielumi ir fiksēti.
6. **Troksnis pret tendenci** (LD 02-08 galvenais jautājums): 5 palaišanas parāda izkliedi, bet ar trokšņa intensitāti 0 redzama ideālā forma.
7. **F11 enerģija (SOLO III–IV).** Lejā lodītes ātrums ir mazāks nekā √(2gh). Kur palika W_p daļa? Atbilde: tā aizgāja griešanās enerģijā un berzē.

## 10. Ārpus tvēruma (v1)

- Slīdēšana lielos leņķos, gaisa pretestība, sadursmes.
- Lodītes lidojums pēc renītes gala (horizontāli mesta ķermeņa kustība). Tas ir blakus simulācijā „Kritieni un sviedieni” (`docs/plans/2026-09-30-kritieni-un-sviedieni.md`).
- Aprēķini (Δt, Δx, v, a, vidējās vērtības) un grafiki skolēna skatā un eksportā. Tas ir apzināts lēmums, jo tas ir skolēna darbs.
- Zīmēšana, atzīmes un mērīšana uz stroboskopa attēla pašā simulācijā. Tas ir apzināts lēmums: skolēns nolasa pats, un attēlu var eksportēt.
- Integrācija ar Fv3. Simulācijas dzīvo atsevišķi no Fv3. Nākotnes virziens ir datu kopēšana no simulācijas uz Fv3 (sk. 5.3). V1 tam sagatavo tikai stabilu eksporta formātu un URL parametrus.
- Reāla video analīze.

## 11. Tehniskās piezīmes

- Repozitorijs `fiz-sim`, jauna lapa. Faila nosaukuma priekšlikums: `rolling-ball.html`. Valodas LV/EN, tāpat kā pārējās lapās.
- **Rasējuma dizains** (`docs/plans/2026-07-15-rasejuma-dizains.md`): rakstlaukums (KOMPLEKTS / LAPA / TĒMA / LV|EN / ◐), IBM Plex Mono un Sans, izmēru līniju slīdņi, gaišā un tumšā tēma, trīs režīmi (projektors, dators vai planšete, telefons portretā un ainavā).
- Pašreizējās lapas ir veidotas katra kā viens HTML fails, kurā ir sava kopīgā koda kopija (valoda, kanvas mērogošana, izbīdāmais panelis). Tas ir galvenais tehniskais parāds. Rasējuma dizains šo kopīgo kodu pārceļ uz `assets/` moduļiem (`sim-common.css`, `sim-core.js`, `physics/`), taču 30.09 dizains vēl gaida Ansa apstiprinājumu un moduļu vēl nav. Sk. 13.
- Animācijā laika soli ierobežot tāpat kā Milikenā un lielgabalā (≤ 50 ms), lai pēc atgriešanās no citas cilnes lodīte neaizlēktu. Mērījumu datus un stroboskopa pozīcijas rēķina no modeļa ar precīzu laiku, nevis no kadriem.
- Eksporta attēlu zīmē atsevišķi lielā izmērā, nevis kopē ekrāna kanvu.
- **Kopīgs dzinējs ar „Kritieni un sviedieni”** (Ansis, 30.09): abām simulācijām ir tas pats fizikas dzinējs un tās pašas daļas — kustības modelis ar g, troksnis un sēkla, rezultātu skati (datu tabula pa visu ekrānu, stroboskops, eksports), URL parametri ar `lock`, skolotāja skats. Tās liek kopīgos moduļos (`assets/physics/` un `assets/`), nevis kopē katrā lapā. Ripošanas modelis ir šī dzinēja daļa.
- Gadījumskaitļi ar sēklu, lai rezultāti būtu atkārtojami.

## 12. Pieņemšanas kritēriji

1. Troksnis 0, pilna lodīte, plakana virsma, μ_r = 0: a = 5/7 · g · sin α (±0,5 %).
2. Troksnis 0, μ_r = 0: tērauda un stikla lodītei ar vienu Ø ir vienāds a.
3. Doba lodīte ripo lēnāk par pilnu. Renītē lielāka lodīte ripo ātrāk. Uz plakanas virsmas Ø paātrinājumu neietekmē.
4. „Mūsu renīte”, h = 3,0 cm, darba garums 70 cm: a ≈ 19 cm/s², t ≈ 2,7 s.
5. 3. līmenis, troksnis 0: x(1 s) : x(2 s) : x(3 s) = 1 : 4 : 9.
6. Reāls troksnis:
   - 1. līmenī piecos atkārtojumos t izkliede ir ~0,1 s;
   - 3. līmenī Δv, ko skolēns aprēķina no tabulas, lēkā ap vienu vērtību bez tendences, kā LD 02-08.
7. Tie paši iestatījumi ar to pašu sēklu dod identiskus datus. Poga ATKĀRTOT dod citus datus.
8. Sērijā, mainot fiksētu lielumu, parādās brīdinājums.
9. Vienmēr sin α = h/L. Mainot L, saglabājas tas lielums, ko skolēns iestata (h vai α).
10. Skolēna skatā un eksportā ir tikai t un x (un iestatījumi). Δt, Δx, v, a, vidējo vērtību un grafiku nav.
11. URL parametri:
    - ar `lock` saitē norādītos lielumus mainīt nevar, bet pārējos var;
    - bez `lock` visus var mainīt;
    - saite bez parametriem atver noklusējuma iestatījumus;
    - ja skatu parametrs ar `lock` atļauj tikai stroboskopu, datu tabulas poga nav pieejama (un otrādi).
12. Datu tabula atveras pa visu ekrānu ar lieliem cipariem. KOPĒT ielīmējas Excel pa šūnām. CSV atveras latviešu Excel pareizi (decimālkomats).
13. Stroboskops:
    - lodītes pozīcijas attēlā sakrīt ar tās pašas palaišanas datu tabulas x (±0,5 cm);
    - eksportētajā PNG pietuvinot ir salasāmas mm iedaļas;
    - mērlenti var paslēpt un parādīt.
14. Simulācija darbojas visos trīs režīmos, abās tēmās un abās valodās.

## 13. Lēmumi (Ansis, 30.09 vakarā)

1. **Lapas numurs:** K-01, kinemātikas bloks (TĒMA: KINEMĀTIKA). „Kritieni un sviedieni” būs K-02.
2. **Moduļi:** lapu būvē uzreiz uz jaunajiem `assets/` moduļiem. Lodīte ir rasējuma sistēmas pilots. Esošās lapas šajā darbā neaiztiek (tehnisks lēmums, Claude).
3. **Materiāls:** tikai lodītes materiāls. Renītes materiāls ir viens.
4. **Skolotāja skats:** pietiek ar atsevišķu saiti (2. kārta).
5. **Skolēna sērija:** paliek, bet 2. kārtā.
6. **Stroboskopa pozīcijas:** numurē 0, 1, 2 …
7. **Dizains** (`docs/plans/2026-07-15-rasejuma-dizains.md`, `design.html`) apstiprināts.

## 14. Izmaiņas

- 2026-09-30T07:54:49+03:00 — Pirmā versija (ideja).
- 2026-09-30T11:38:11+03:00 — Precizējumi no Ansa balss sarunas:
  - pēc palaišanas ir divi skati uz vieniem datiem: datu tabula pa visu ekrānu ar lieliem cipariem un stroboskops ar pielīmētu mērlenti un eksportu augstā izšķirtspējā;
  - tabulā un eksportā ir tikai t un x, bez Δt, Δx un aprēķiniem;
  - visi iestatījumi ir URL parametri ar `lock`, arī tas, kuri skati ir redzami;
  - visi trīs datu līmeņi paliek;
  - zīmēšanas simulācijā nav;
  - izlemti iepriekšējie atvērtie jautājumi par datu izvadi un „3b variantu” (tagad tas ir stroboskopa skats).
- 2026-09-30T11:40:16+03:00 — Blakus simulācija „Kritieni un sviedieni” ar to pašu fizikas dzinēju (Ansis). Atsauces 10. un 11. sadaļā.
- 2026-09-30T23:55:00+03:00 — Ansis apstiprināja dizainu un izlēma atvērtos jautājumus (13. sadaļa). Darbs divās kārtās (15. sadaļa).
- 2026-10-01T02:45:00+03:00 — 1. kārta uzbūvēta zarā `rolling-ball` (lapa `rolling-ball.html`, plāns `docs/plans/2026-10-01-lodite-renite-plan.md`), vēl nav publicēta. Izpildes laikā Claude pieņēma šādus lēmumus, kas skar lietotāju (Ansis var mainīt):
  - lodīte „ripo” tikai tad, ja no kustības sākumpunkta līdz renītes galam noripo 60 s laikā; tāpēc „mūsu renītē” mazākais slīpums ir h = 0,3 cm (nevis 0,2 cm), un paziņojums to nosauc;
  - saitē nofiksētu lielumu nevar izmainīt arī netieši (piem., pavelkot lodīti, kas pārbīdītu vārtus) — parādās paziņojums;
  - ar `view=strobe&lock=1` panelī x vērtības nerāda, jo skolēns tās nolasa no attēla;
  - CSV vienmēr latviešu formātā (semikols, decimālkomats), arī angļu valodā; KOPĒT seko valodai;
  - noklusējumā 3. līmenis un Δt = 0,2 s; finišs ir 10 cm pirms renītes gala; spec. „±” vērtības nozīmē ≈ 2σ;
  - slazds nostrādā vienā no katras tabulas pirmajiem trim atkārtojumiem;
  - panelī secība: datu līmenis, palaišana, rezultāti, izmēri, lodīte (lai PALAIST redz bez ritināšanas).

## 15. Kārtas

**1. kārta — viss, kas vajadzīgs skolēnam:** aina ar velkamām izmēru līnijām L, h/α; lodītes un profils; kustības sākumpunkts; 3 datu līmeņi (2. līmenī fotovārti un hronometri); PALAIST / ATKĀRTOT; rezultātu tabula, kas krāj atkārtojumus; datu tabula pa visu ekrānu ar KOPĒT un CSV; stroboskops ar mērlenti, numurētām pozīcijām, tuvināšanu un PNG eksportu; troksnis, intensitāte, slazdi un sēkla; URL parametri ar `lock`; LV/EN, abas tēmas, trīs režīmi.

**2. kārta:** skolēna sērija (3.3, 12. kritērijs Nr. 8), skolotāja skats (8.2), datu ģenerators grupām (8.3).

Pirmajā kārtā rezultātu tabula krāj tikai atkārtojumus ar tiem pašiem iestatījumiem. Ja skolēns maina kādu lielumu, sākas jauna tabula (iepriekšējā paliek apskatāma). Sērija ar neatkarīgo lielumu rindās nāk 2. kārtā.
