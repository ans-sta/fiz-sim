# Ģenerators un motors (E-01) — specifikācija

> Statuss: uzbūvēts un publicēts 2026-11-02, gaida Anša pārbaudi (README 🟡 Review). Ansis 02.11: “Jā. Būvē augšā! Kā parasti — lietošanai uz mobilā UN prezentācijas režīms uz lielā ekrāna.”; vēlāk: “Kad gatavs, droši push. Pārbaudīšu rīt no rīta.” Komitā tikai E-01 — nekomitētais S-03 tajos pašos failos (index.html, README.md, sim-common.css) netika iekļauts.
> Avots: mācību grāmatas attēls `scr.mini/generators_mainstrava.png` (9 rāmīša stāvokļi starp N un S, grafiki Φ(t) un ℰ(t)). Attēlā formula ℰ = ℰm sin(π/2 · t) ir kļūdaina — lapā ℰ = ℰm sin ωt.
> Vizuālā sistēma — `docs/plans/2026-07-15-rasejuma-dizains.md`, izkārtojums — `docs/plans/2026-10-04-izkartojums.md`. Tuvākie paraugi: M-01 Brauna kustība (vadības josla zem galvenes), S-03 skaņas spektrs (josla + grafiks, piekļūstamība, kontrasts gaišajā tēmā).
> “(Rihards)” — mans lēmums, Ansis to nav teicis; pārējais — Anša vārdi vai apstiprinājums.

## 1. Kas tā ir

Patstāvīgais magnēts (N un S) rada viendabīgu horizontālu lauku, kurā uz horizontālas ass griežas taisnstūra rāmītis. Viss izometriskā projekcijā rasējuma stilā. Divi režīmi — **MOTORS** un **ĢENERATORS**. Ieslēdzams un izslēdzams, ko rāda: strāvas virzienu, magnētiskā lauka virzienu, spēka vektorus uz rāmīša garajām malām. Kolektora slēdzis abos režīmos.

## 2. Kā to lieto stundā (Ansis 02.11)

Pirms lapas Ansis ir izstāstījis par Ampēra spēku: uz vadu ar strāvu magnētiskajā laukā darbojas spēks. Nākamais jautājums — kur to lieto? Motoros. Lūk, demo:

| # | Ko dara skolotājs | Ko redz lapā | Ko pārrunā |
|---|---|---|---|
| 1 | Atver lapu (MOTORS) | Rāmītis stāvoklī A — plakne gar lauku. Strāva plūst, uz vienas malas spēks uz augšu, uz otras uz leju. Rāmītis nofiksēts, kustības nav. | Ampēra spēks uz katru malu. |
| 2 | Ieslēdz **ATĻAUT KUSTĪBU** | Rāmītis pagriežas līdz stāvoklim B (plakne šķērsām laukam), mazliet pārskrien, pašūpojas un apstājas. | Kāpēc apstājās? Spēki joprojām ir, bet uz vienas taisnes ar asi — plecs 0. Problēma: kā panākt, lai griežas? |
| 3 | Ieslēdz **KOLEKTORS** | Rāmītis griežas nepārtraukti; strāva rāmītī maina virzienu ik pusapgriezienu. Arī, ja rāmītis jau stāv tieši B — sāk griezties pats (Ansis: “Negodīgi. Bez pagrūšanas.”). | Kolektors pārslēdz strāvas virzienu. |
| 4 | Maina **SPRIEGUMS** un **POLARITĀTE** | Lielāks spriegums — ātrāk; apgriezta polaritāte — griežas uz otru pusi. | |
| 5 | Pārslēdz uz **ĢENERATORS** | Rāmītis griežas, apakšā zīmējas sprieguma grafiks kā bildē. Sprieguma regulators pārvēršas par rotācijas ātruma regulatoru. | ℰ = ℰm sin ωt; ātrāk — augstāk un biežāk. |
| 6 | **KOLEKTORS** ģeneratorā | Bez kolektora — īsta maiņstrāva; ar kolektoru — pulsējoša līdzstrāva. | No kurienes līdzstrāva. |

## 3. Mērķi, ne-mērķi, ko nedrīkst

- **Mērķi:** fizikāli pareiza aina (spēki vienmēr vertikāli, mainās tikai plecs; strāva rāmītī ar kolektoru maina virzienu, ārējā ķēdē ne); telefons un projektors (Ansis: “Kā parasti — lietošanai uz mobilā UN prezentācijas režīms uz lielā ekrāna”); WCAG 2.2 AA.
- **Ne-mērķi:** vairāki tinumi / enkurs; magnēta apgriešana; grafiks motora režīmā; brīvi grozāma kamera; B un S skaitliskās vērtības; skaņa.
- **Nedrīkst:** kļūdainā mācību grāmatas formula; spēku bultas, kas griežas līdzi rāmītim; “nāves punkts”, kurā rāmīti jāpagrūž (Ansis 02.11); kas mirgo biežāk par 3 reizēm sekundē (spuldzīte, § 6.3).

## 4. Aina (zīmējums)

- **Projekcija** (Rihards, skice 02.11 — Ansis izvēlējās stāvokli A): pasaules asis x — lauka virziens (no N uz S), y — uz augšu, z — rāmīša ass (pret skatītāju). Izometrija: ekrānā x iet pa labi lejup 30°, z pa kreisi lejup 30°, y vertikāli. N magnēts pa kreisi augšā (aizmugurē), S pa labi lejā (priekšā, daļēji caurspīdīgs, lai rāmītis redzams). N zils, S sarkans kā mācību grāmatā, ar burtiem N un S.
- **Lauks:** 6 līnijas no N uz S ar bultām (slēdzis LAUKS).
- **Rāmītis:** taisnstūris, garās malas paralēlas asij; malas zīmē pēc dziļuma.
- **Ass** iet cauri rāmītim; priekšējā galā **kontakti** un **sukas**, no tām vadi uz **avotu** (motors: baterija ar + un −) vai **spuldzīti** (ģenerators). Kontakti: KOLEKTORS izslēgts — divi veseli gredzeni (katrs savai sukai); ieslēgts — viens gredzens, pārgriezts divās pusēs, kas griežas līdzi rāmītim (Rihards).
- **Ģeneratorā** uz ass aizmugurējā gala kloķis, kas griežas līdzi — “to griež kāds no ārpuses” (Rihards).
- **Strāva** (slēdzis STRĀVA): bultas uz visām četrām rāmīša malām un uz vadiem; virziens pēc strāvas zīmes; strāvas nav — bultu nav.
- **Spēki** (slēdzis SPĒKI): bultas F no garo malu vidus, vienmēr vertikālas, garums ∝ |I|. Pie ass — raustīta pleca līnija no ass līdz spēka taisnei (Rihards: tā skolēni redz, ka sarūk plecs, nevis spēks).
- Uzraksti zīmējumā (N, S, B, F, I, +, −) aug līdzi ⚙ BURTI uz pusi (`legendScale`), zīmējums — līdzi ⚙ ZĪMĒJUMS.

## 5. Režīms MOTORS

- Sākumā: rāmītis A, nofiksēts, strāva plūst, KOLEKTORS izslēgts, U = 3 V (Rihards).
- **ATĻAUT KUSTĪBU** (pārslēgs, `aria-pressed`): ieslēdzot rāmītis kustas pēc fizikas (§ 7); izslēdzot — nofiksējas tur, kur ir (Rihards). Pēc KOLEKTORA ieslēgšanas, ja kustība vēl nav atļauta, tā tiek atļauta reizē (Rihards: kolektors bez kustības neko nerāda).
- **KOLEKTORS** (pārslēgs): skat. § 4 un § 7. Ieslēdzot, kad rāmītis stāv B, — sāk griezties pats.
- **SPRIEGUMS U** (slīdnis ar − +): 1,0–6,0 V, solis 0,1 V (Rihards). Vienmērīgais ātrums ar kolektoru f = U · 0,5 Hz/V — no 0,5 Hz (Ansis: “Minimālā rotācija — 0,5 Hz”) līdz 3 Hz (Rihards: ātrāk acs nevar izsekot, rodas stroboskopa efekts). Jaunu ātrumu sasniedz pakāpeniski (~1 s).
- **POLARITĀTE** (poga ⇄): apmaina avota + un −. Strāva un spēki apgriežas; motors bremzē, apstājas un griežas uz otru pusi.
- Rādījums joslā: U un — kad griežas — f (Hz).

## 6. Režīms ĢENERATORS

### 6.1 Kustība

- Rāmīti griež ārējs spēks (kloķis). Slīdnis **ĀTRUMS f** 0,5–3 Hz, solis 0,1 Hz (Ansis: “Vecais sprieguma regulators pārvēršas par rotācijas ātruma regulatoru”). Pāreja uz jauno ātrumu ~0,5 s (grafiks nelec).
- POLARITĀTES vietā **VIRZIENS** ⇄ — griešanās virziens (Rihards).
- Pārslēdzot uz ģeneratoru, rāmītis sāk no stāvokļa B (Φ max, ℰ = 0), lai grafiks sākas no nulles kā bildē (Rihards). ATĻAUT KUSTĪBU ģeneratorā nav.

### 6.2 Grafiks (Ansis: “apakšā zīmējas sprieguma grafiks kā bildē”)

- Zem zīmējuma josla ar grafiku ℰ(t), V. Laika ass nemainīga — 4 s (Rihards); līkne zīmējas no kreisās uz labo, pēc tam slīd (jaunākais labajā malā). Vertikālā ass nemainīga ±ℰm pie 3 Hz, tāpēc ātrumu mainot redz, ka līkne kļūst augstāka un periods īsāks (ℰm = BSω).
- Uzraksti: “ℰ, V”, “t, s”, iedaļas ik 1 s (zemā grafikā skaitļi tikai −2, 0, 2); pašreizējā ℰm; formula ℰ = ℰm sin ωt (bez kolektora) vai ℰ = |ℰm sin ωt| (ar kolektoru). Vertikālā ass ±2,07 V.
- Slēdzis **Φ(t)** (Rihards; sākumā izslēgts): tajā pašā grafikā plūsma Φ(t) blāvā līnijā ar savu asi (relatīvi, ±Φm) — redzams, ka ℰ ir maksimāla, kad Φ iet caur nulli (kā bildē).
- Pašreizējais brīdis — punkts līknes galā.

### 6.3 Ķēde, strāva un spēki

- Pieslēgta spuldzīte (Rihards). Rāmītī strāva vienmēr maiņstrāva; ārējā ķēdē bez kolektora — maiņstrāva, ar kolektoru — vienā virzienā (pulsē).
- Spuldzītes spožums seko jaudai ar kvēldiega inerci (laika konstante ~0,15 s), tāpēc pie 0,5 Hz tā mirgo 1 reizi sekundē, ātrāk — spīd gandrīz vienmērīgi. Spožuma svārstības, kas ātrākas par 3 reizēm sekundē, ir mazas (≤ 20 % no spožuma) — WCAG 2.3.1.
- SPĒKI ģeneratorā: Ampēra spēks uz inducēto strāvu — vienmēr pret kustību, bremzē (Lenca likums) (Rihards).

## 7. Fizika un modelis (Rihards)

- φ — rāmīša leņķis ap z asi; φ = 0 — stāvoklis A (mala a pie S, mala b pie N). k = BS. Pozitīva strāva: malā a prom no skatītāja (−z), malā b pret skatītāju.
- Spēks uz malu a: F = I·L·B uz leju (pie I > 0), uz malu b — uz augšu. Griezes moments τ = −k I cos φ. Inducētā EDS ℰ = k ω cos φ (ar to pašu zīmes norunu). Plūsma Φ = k sin φ (A — 0, B — ±max).
- Kolektors: c = sign(cos φ) (pārslēdz, kad rāmītis iet caur B); bez kolektora c = 1.
- Motors: I = (c·U − ℰ_pret)/R, kur pretEDS ir ℰ ar pareizo zīmi (formulā I = (c U + k ω cos φ)/R ar ω zīmes norunu); J dω/dt = τ − b ω. Parametri izvēlēti tā, lai ar kolektoru vienmērīgais ātrums f = 0,5 Hz/V · U (±3 %), sasniegšanas laiks ~1 s, un bez kolektora rāmītis no A apstājas ±3° no B 6 s laikā. Miera berze tikai tad, kad rāmītis gandrīz stāv (nemaina vienmērīgo ātrumu).
- “Nāves punkts”: ja kolektors ieslēgts, rāmītis stāv un ir tuvu B, modelis dod mazu starta momentu griešanās virzienā (Ansis: bez pagrūšanas).
- Ģenerators: ω uzdots (pāreja ~0,5 s); I = c-neatkarīgi ℰ/R_ķēde rāmītī; ārējā spriegums U_ār = c·ℰ — to rāda grafiks.
- Tas pats k = BS abos režīmos — viena mašīna (Rihards): ℰm = 0,6 V/Hz · f (pie 3 Hz — 1,8 V); motors ar kolektoru pie 6 V griežas 3 Hz, pretEDS tad ≤ 30 % no U, tāpēc spēku bultas griežoties paliek labi redzamas.
- Parametri (`assets/emotor/model.js`): R = 1 Ω, b no nosacījuma f = 0,5 Hz/V · U, J = 0,012 → 90 % no jaunā ātruma ~1,2–1,4 s; bez kolektora rāmītis no A pārskrien B līdz −124…−149° un apstājas ~5,5 s laikā ±3° no B; ātruma svārstības pa apgriezienu pie 1 V ~22 %, pie 6 V ~4 %.

## 8. Lapa

### 8.1 Izkārtojums

`body.layout-hud e01` kā M-01/S-03: galvene “← SARAKSTS · ĢENERATORS UN MOTORS · E-01 · LV EN ◐ ⛶”; zem tās vadības josla; zem joslas zīmējums; ģeneratorā zem zīmējuma grafika josla (~35 % augstuma, ne mazāk par ~140 px). ⚙ apakšā pa kreisi, rakstlaukums (FIZ-SIM / E-01 / ELEKTROMAGNĒTISMS) lielā ekrānā apakšā pa labi.

```
┌ ← SARAKSTS │ ĢENERATORS UN MOTORS                                 E-01 │ LV EN ◐ ⛶ ┐
├ REŽĪMS            │ SPRIEGUMS U              │ SLĒDŽI                                  │ RĀDĪT                         │ LAIKS ┤
│ [MOTORS][ĢENER.]  │ − ◇────── + 3,0 V 1,5 Hz │ [⇄ POLARITĀTE][✓ KOLEKTORS][ATĻAUT KUSTĪBU] │ [✓ STRĀVA I][✓ LAUKS B][✓ SPĒKI F] │ ⏸ ↺ i
├──────────────────────────────────────────────────────────────────────────────────────┤
│                     N ▬▬                                                               │
│                        ╲   ┌────┐   rāmītis izometrijā, spēki, strāva                 │
│                             └────┘  ▬▬ S                                               │
├───────────────────────── (tikai ģeneratorā) ──────────────────────────────────────────┤
│ ℰ, V  ╱╲    ╱╲    ╱╲                                                                  │
│ ──────────────────────── t, s                                                          │
└──────────────────────────────────────────────────────────────────────────────────────┘
 ⚙                                                             FIZ-SIM │ E-01 │ ELEKTROMAGNĒTISMS
```

Datorā 1280 px josla ir vienā rindā. Telefonā josla aplaužas (etiķetes paslēptas kā M-01; 375 px — 4 rindas), virsraksts drīkst lūzt divās rindās, zīmējums un grafiks viens zem otra. Ģeneratorā mazais rakstlaukums nav redzams (grafika labajā apakšas stūrī tam nav vietas). Darbojas no 320 px bez horizontālas ritināšanas, arī ar BURTI 200 % un pārlūka tālummaiņu 200 %.

### 8.2 Vadības josla

| Grupa | Vadīkla | Darbība |
|---|---|---|
| REŽĪMS | MOTORS · ĢENERATORS | segmentētas pogas (`aria-pressed`) |
| SPRIEGUMS U / ĀTRUMS f | − slīdnis + vērtība (motorā griežoties arī f, Hz) | § 5 / § 6.1 |
| SLĒDŽI | ⇄ POLARITĀTE / ⇄ VIRZIENS · KOLEKTORS · ATĻAUT KUSTĪBU (tikai motorā) | § 5 / § 6.1 |
| RĀDĪT | STRĀVA I · LAUKS B · SPĒKI F · PLŪSMA Φ | pārslēgi ar ✓ (stāvoklis ne tikai krāsā); PLŪSMA tikai ģeneratorā; sākumā ieslēgti STRĀVA, LAUKS, SPĒKI (Rihards). Telefonā (≤ 520 px) redzams ✓ I, ✓ B, ✓ F, ⇄ +/− — vārds paslēpts tikai vizuāli, ekrāna lasītājam nosaukums pilns |
| — | ⏸/▶, ↺, i | apturēt laiku (arī atstarpe); ↺ NO SĀKUMA — motors: A, nofiksēts, kolektors izslēgts; ģenerators: B, grafiks tukšs (arī R); i — piezīme |

### 8.3 “i” piezīme (Rihards, īsi)

Ampēra spēks F = BIL un griezes moments M = BIS cos φ; kolektors; EDS ℰ = BSω sin ωt (Φ = BS cos ωt, ℰ = −Φ′); Lenca likums; ka vērtības ir ilustratīvas.

### 8.4 Piekļūstamība (WCAG 2.2 AA; globālie noteikumi + aumprakse/ansis.stabingis.lv konvencijas)

- Saite “Pāriet uz saturu” → `main`; viens `h1`; native pogas un `input type=range`; pārslēgiem `aria-pressed`; mērķi ≥ 24 × 24 px; redzams fokuss ≥ 2 px.
- Kanva `role="img"` ar aprakstu, kas atjaunojas (režīms, stāvoklis, virziens, ātrums); grafikam savs apraksts.
- Statusa ziņas (`role="status"`, vienmēr DOM): “Rāmītis apstājās — plakne šķērsām laukam”, “Kolektors ieslēgts” u. c.
- **Burti:** visi joslas un uzrakstu izmēri × `--hud` (⚙ BURTI 80–200 %); kanvas uzraksti × `legendScale`; pārlūka tālummaiņa 200 % bez nogriešanas.
- **Kontrasts:** teksts ≥ 4,5 : 1, grafiskie elementi (B, I, F bultas, līknes, vadi) ≥ 3 : 1 pret `--field` abās tēmās; tabula ar aprēķinātām attiecībām `assets/emotor/scene.js` komentārā un README. Gaišajā tēmā `--ink-dim` un `--accent` tumšāki kā S-03.
- Krāsa nav vienīgā pazīme: bultām burti B, I, F; N/S burti uz magnētiem; polaritāte ar + un −.
- `prefers-reduced-motion`: lapa pati neko nekustina (motors sākas nofiksēts, ģeneratoru ieslēdz lietotājs); ⏸ un atstarpe aptur jebkurā brīdī (2.2.2).

### 8.5 Saite skolotājam (Rihards)

`?mode=generator` atver ģeneratora režīmā (kā citām lapām; README).

## 9. Moduļi un testi

`motor-generator.html`, `assets/emotor/{model,scene,params,i18n,main}.js`, sadaļa `assets/sim-common.css` beigās (E-01), kartīte `index.html` (LV + EN), README rinda / struktūra / “Teacher links (E-01)”. Testi `tests/emotor-{model,params,i18n}.test.js`: vienmērīgais ātrums 0,5 un 3 Hz, apstāšanās pie B, polaritāte, nāves punkts, ℰ = k ω cos φ, kolektora zīme, Lenca bremze, grafika buferis, tipogrāfija.

## 10. Izmaiņas

- 2026-11-02 — pirmā versija no sarunas ar Ansi (skice `sakuma-stavoklis.html`: Ansis izvēlējās A).
- 2026-11-02 — uzbūvēts (Ansis: “Kad gatavs, droši push. Pārbaudīšu rīt no rīta.”). Būves laikā: ℰm skala no tā paša k kā motoram (§ 7); POLARITĀTE pārcelta uz SLĒDŽI; anotācijas (bultas, B/I/F) zīmē virs S magnēta. Ansis lūdza piekļūstamību (burtu palielināšana, kontrasts) kā aumprakse un ansis.stabingis.lv — pārbaudīts axe (9 stāvokļi, 0), tastatūra, 320 px, BURTI 200 %, tālummaiņa 200 %, kontrasta tabula `scene.js`. Kopīgajā ⚙ pogām A− / A+ nosaukums tagad sākas ar redzamo tekstu (WCAG 2.5.3; skar visas lapas).
