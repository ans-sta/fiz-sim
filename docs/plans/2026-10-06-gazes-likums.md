# Gāzes likums pV/T = const (M-02) — vizualizācija (specifikācija un būves lēmumi)

> Statuss: uzbūvēts 2026-10-06 pēc Anša apraksta (06.10): “Trauks, traukā molekulas, ar virzuli mainām V. Ar slīdņiem zīmējumā — T un p. Molekulu kustības ātrumi un fizika līdzīga Brauna parametriem. Visi 3 slīdņi ir visu laiku redzami, blakus traukam.”
> Vizuālā sistēma — `docs/plans/2026-07-15-rasejuma-dizains.md`; Brauna kustība — `docs/plans/2026-10-06-brauna-kustiba.md`.

## 1. Kas tā ir

Vertikāls cilindrs ar virzuli augšā; zem virzuļa gāze — 300 molekulas, kas lido taisni, atlec no sienām un virzuļa, cita ar citu nesaduras. Blakus panelis ar trim slīdņiem V, T, p, kas vienmēr redzami, un rinda pV/T = const ar skaitli. Tikai vizualizācija, bez mērījumiem.

## 2. Modelis (Claude lēmumi)

- V 1–5 L (ik 0,1), T 100–600 K (ik 10), p 20–500 kPa (ik 10). Gāzes daudzums nemainās: pV/T = 100 kPa · 2 L / 300 K = 0,67 kPa·L/K.
- **Saistība kā S-01:** mainot vienu lielumu, pieskaņojas tas, kurš mainīts visagrāk (`order`). Sākumā pieskaņojas p (mainot V — izotermiska saspiešana, mainot T — izohoriska sildīšana); pēc p maiņas pieskaņojas V (tad, sildot, virzulis ceļas — izobāriski). Mainīto nogriež tā, lai pieskaņotais paliek robežās (piem. p slīdnis apstājas tur, kur V būtu < 1 L). Panelī pelēka vērtība tam, kurš pieskaņosies nākamajā maiņā.
- Pasaule: cilindra platums 100 vienības, gāzes augstums h = V/5 L · 250; molekulu v_rms 25 vien./s pie 300 K, v ∝ √T (kā Brauna kustībā). Virzulis uz jauno augstumu slīd ar τ = 0,25 s; molekulas, kas paliek virs tā, nospiež zem tā.
- Virzuli var vilkt (virzulis, kāts vai rokturis; pele un pirksts) — tas ir tas pats, kas V slīdnis.

## 3. Lapa

- `layout-hud` bez LIELUMU saraksta; panelis `.g01-panel` (hud stils) augšā pa labi, telefonā — apakšā pa visu platumu (⚙ stūris brīvs). Rindas: simbols, nosaukums, vērtība; − izmēru līnijas slīdnis +; gali ar robežām. Apakšā “pV/T = 0,67 kPa·L/K” akcentā un padoms (datorā).
- Zīmējums: cilindra sienas tintē ar griezuma štrihu ārpusē, gāzes lauks `--field`, molekulas blāvas tintes punkti, virzulis — štrihots disks ar kātu un T rokturi, tilpuma izmēru līnija V pa kreisi. Cilindrs ietilpst laukumā pa kreisi no paneļa (telefonā — virs tā); ZĪMĒJUMS ≤ 100 % to sarauj.
- Galvene “← SARAKSTS · GĀZES LIKUMS · M-02”, rakstlaukums TĒMA: MOLEKULĀRĀ FIZIKA. LV/EN, abas tēmas, ⚙.
- Saite: `V=`, `T=`, `p=` (pielieto saites secībā; README).

### 3.1 Otrā kārta (Ansis 06.10 pēc demonstrācijas)

- **Atstarpes:** cilindrs tālāk no augšējās un apakšējās malas — virs tā ≥ 70 px (12 % laukuma), zem tā ≥ 50 px (9 %).
- **Peldošs panelis:** paneli var pārvilkt aiz virsraksta (pele, pirksts) jebkur rasējumā; vieta paliek ierīcē (`fiz-sim-gas-panel`); dubultklikšķis uz virsraksta atgriež sākotnējo vietu. Pārbīdīts panelis vietu nerezervē — cilindrs izmanto visu laukumu.
- **Atslēdziņas:** katram lielumam atslēgas poga. Aizslēgtais nemainās (slīdnis neaktīvs, vērtība akcentā), bīdot vienu no pārējiem diviem, pieskaņojas trešais: T aizslēgta — izotermisks process, p — izobārisks, V — izohorisks. Aizslēgt var tikai vienu: aizslēdzot otru, pirmais atslēdzas; klikšķis uz aizslēgtā — atslēdz. Bez atslēgas kā līdz šim pieskaņojas visagrāk mainītais. Saite `lock=p|V|T`.

## 4. Moduļi un testi

`assets/gas/` — `model.js` (saistītie lielumi, gāze, solis), `i18n.js`, `params.js`, `scene.js` (zīmējums, izkārtojums), `main.js`; lapa `ideal-gas.html`; CSS `.g01-*`; testi `tests/gas-*.test.js`.

## 5. Ārpus tvēruma

Adiabātiskie procesi (virzulis silda gāzi), spiediena mērīšana no sitieniem pa virzuli, manometrs, p–V diagramma, procesu grafiki, molekulu savstarpējās sadursmes.
