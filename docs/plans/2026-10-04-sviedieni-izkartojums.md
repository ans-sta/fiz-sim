# K-02 “Kritieni un sviedieni” jaunajā izkārtojumā, bez galda (biznesa prasības)

> Statuss: Ansis 04.10 — “šos pašus dizaina principus varam izmantot arī sviedieniem un kritieniem. Un, viena fundamentāla lieta tur — atbrīvojamies no galda. Ir TIKAI augstums. Zīmējumos un citur.” Izvēle: metri, bez torņa. Rūtiņas fonā rāda mērogu un mainās līdzi h, lidojuma tālumam un tuvinājumam.
> Kopīgie noteikumi visām jaunā stila simulācijām: `docs/plans/2026-10-04-izkartojums.md` (zīmējums, LIELUMI, MĒRĪJUMI, ⚙, galvene). Šeit — tikai tas, kas K-02 savs vai citāds.
> Aizstāj K-02 spec. `docs/plans/2026-09-30-kritieni-un-sviedieni.md` 8.4 (divi mērogi: galds un tornis).

## 1. Viens mērogs — metri

- Galda vairs nav nekur: ne zīmējumā, ne pārslēgā, ne tekstos (LV, EN), ne pētījumu kartītēs, ne galvenā FIZ-SIM saraksta kartītē, ne README. Mērogu pārslēga nav.
- Robežas: **h** 0–50 m, solis 0,5 m; **v₀** līdz 30 m/s, solis 0,5 m/s (vertikālajā sviedienā −30…+30, “+” — uz augšu); **α** 0–90°, solis 1°; **Δt** — slīdnis 0,1–2 s, solis 0,1 s (kā K-01).
- Bumba Ø 22 cm. Zīmējumā tās izmērs nav atkarīgs no mēroga (mērogā tā būtu punktiņš) — vienmēr labi redzama; dati attiecas uz tās centru.
- Mērījumu troksnis, kadrs (1/30 s) un nolasīšanas precizitāte — kā līdzšinējam tornim.
- Vecās saites: parametrs `scale` vairs nedarbojas — lapa atveras metros un parāda paziņojumu, ka galda mēroga vairs nav; h, v₀ saitē nolasa metros.

## 2. Zīmējums

1. Zeme zelta griezumā (kā K-01). **Izmešanas punkts augstumā h — bez galda, bez torņa, bez būves.** Rasējumā: zeme, h izmēru līnija ar rombiņu (pie tā tikai simbols h), v₀ bulta (velkama), slīpajā sviedienā leņķa loks α, bumba; horizontālajā sviedienā — arī otrā bumbiņa, kas krīt no tā paša punkta.
2. **Vertikālajā sviedienā — divas stroboskopa lentes blakus**: augšupejošā (pa kreisi, virs tās bultiņa ↑) un lejupejošā (pa labi, bultiņa ↓). Bumba kāpj kreisajā lentē, augšējā punktā pāriet labajā un krīt tajā; katra zibšņa pozīcija ir tajā lentē, kurā bumba tobrīd kustas (uz augšu — kreisajā, virsotnē un uz leju — labajā). Ja bumba uzreiz krīt (v₀ ≤ 0), ir tikai lejupejošā lente ↓. Lentes nobīde ir tikai attēlā (atstarpe — daži bumbas diametri): dati ir y(t), x = 0. Tāpat stroboskopa attēlā un PNG. Aizstāj “pozīcijas nobīda pa labi kā laika asi” (K-02 spec. 8.2).
3. **Zīmējums vienmēr precīzi ekrāna vidū.** Platums — no burta h kreisajā pusē līdz tālākajam punktam, kur bumba piezemējas (vertikālajā sviedienā — līdz lejupejošajai lentei). Augstums — no zemes līdz augstākajam trajektorijas punktam un v₀ bultai. ⚙ ZĪMĒJUMS palielina un samazina ap vidu.
4. **Rūtiņas fonā ir mērogs** (metros). Rūtiņu solis ir “apaļš” — 1, 2 vai 5 × 10ⁿ m (… 0,5; 1; 2; 5; 10 m …) — un mainās līdzi h, lidojuma tālumam un ⚙ ZĪMĒJUMS: tuvinot rūtiņas sadalās, attālinot saplūst, lai attālums starp līnijām ekrānā vienmēr būtu vidējs (ne biezāk par ~40 px, ne retāk par ~100 px; starp tām — smalkas, gaišas līnijas). Rūtiņu līnijas sakrīt ar pasaules koordinātām: x = 0 pie izmešanas vietas, y = 0 uz zemes. Pie līnijām — skaitļi ar vienību, tur, kur tos neaizsedz paneļi un poga.
5. Rūtiņas zīmējumā ir vienmēr (tās ir mērogs). Ieslēdzams mērrežģis paliek tikai stroboskopa attēlā.
6. Palaišanas poga, paziņojumi, ⚙ stūrī, rakstlaukums, vieta Safari joslu paslēpšanai — kā K-01.

## 3. LIELUMI (augšā pa kreisi)

- Saraksts: **h, v₀, α** (tikai slīpajā sviedienā), **Δt**; horizontālajā sviedienā, ja to drīkst mainīt, — **otrā bumbiņa** (ir / nav).
- Slīdnis zem rindas, − un +, fiksēts augstums; kamēr slīdnis vaļā, saraksts ir platāks un virs MĒRĪJUMIEM (kā K-01).
- Pilnajā kontrolē zem saraksta “citi…”: **režīms** (1 ↕ / 2 → / 3 ↗), **otrā bumbiņa**, **palēninājums**.

## 4. MĒRĪJUMI (augšā pa labi)

- Viens liels cipars — pēdējā zibšņa koordināta: vertikālajā sviedienā **y**, horizontālajā un slīpajā **x** (ar simbolu un vienību, piem. “x = 8,4 m”).
- Palaišanas laikā zem tā — pēdējās rindas t | x | y (vertikālajā t | y); miera stāvoklī, no 2. mērījuma, maza tabuliņa. Uzklikšķinot — lielā datu tabula; stroboskopa attēls — kā līdz šim.
- Tabulas — kā līdz šim: katriem iestatījumiem sava tabula, atkārtojumi kolonnās; sērijas tabulas K-02 nav.

## 5. Pētījumi (visi metros)

| Nr. | Pētījums | Sākumā | Maināms |
|---|---|---|---|
| 01 | BRĪVĀ KRIŠANA | h = 20 m, v₀ = 0 | h, Δt |
| 02 | VERTIKĀLAIS SVIEDIENS | h = 20 m, v₀ = 10 m/s uz augšu | v₀, h, Δt |
| 03 | HORIZONTĀLAIS SVIEDIENS | h = 20 m, v₀ = 10 m/s | v₀, h, Δt, otrā bumbiņa |
| 04 | SLĪPAIS SVIEDIENS | h = 0, v₀ = 15 m/s, α = 45° | v₀, α, h, Δt |

- Brīvajā krišanā v₀ = 0 nofiksēts (tā ir brīvā krišana). Slīpajā sviedienā h tagad maināms (kā K-01: pētījumā maināmi visi tā lielumi).
- Kartīšu zīmējumi — bez galda: izmešanas punkts ar h līniju un bumbas pozīcijas. Pilnās kontroles apraksts — bez “galds un tornis”.

## 6. Brīdinājumi

- **Par īsu lidojumu brīdinājuma vairs nav** (kā K-01): ja bumba nokrīt ātrāk par Δt, stroboskopā ir tikai sākuma zibsnis — kā dzīvē.
- Paliek viens: bumba nekustas vispār (h = 0 un nav ātruma uz augšu) — citādi poga it kā nedarbotos. Teksts nosauc iemeslu un ko var mainīt (tikai to, ko drīkst).

## 7. Izmaiņas

- 2026-10-04 — Pirmā versija no Anša 04.10 piezīmēm (metri, bez torņa; rūtiņas — mērogs).
- 2026-10-04 — Ansis: vertikālajā sviedienā divas stroboskopa lentes blakus — ↑ un ↓ (2.2).
