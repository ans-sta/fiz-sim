# Jaunais izkārtojums — rasējums pa visu ekrānu (biznesa prasības)

> Statuss: Ansis 04.10 — “Taisi visu augšā pa īsto. Labosim ne-skici, bet reālo failu!”, “Uztaisi un tad uzreiz push, lai redzu telefonā īsto versiju.” Pirmā — K-01 lodīte, tad K-02 sviedieni.
> Skice (vairs netiek labota): https://ans-sta.github.io/fiz-sim/sketches/izkartojums.html
> Attiecas uz visām jaunā stila simulācijām (K-01, K-02, vēlāk K-03 u. c.).

## 1. Princips

**Visa pamatinfo ir redzama uzreiz, un nekas nepārklājas.** Pārējais ir izvēršams (saraksts “citi…”, ⚙). Sānu paneļa vairs nav: rasējums aizņem visu laukumu zem galvenes.

## 2. Rasējums

1. **Zemes līnija ir zelta griezumā** — 61,8 % no rasējuma laukuma augšas. Konstrukcija (renīte, galds, tornis) stāv virs tās, starp augšējiem paneļiem un zemi.
2. **Zīmējums nav atkarīgs no burtu izmēra.** Burti aug, zīmējums ne (zīmējuma izmēru maina tikai ⚙ ZĪMĒJUMS).
3. **Lodīte zīmējumā ir 2× lielāka nekā mērogā**, lai to labi redz. Dati (koordinātas) attiecas uz tās centru.
4. **Rokturi** (rombiņi) rasējumā paliek — tos var vilkt kā līdz šim. Skaitļu uzrakstu rasējumā vairs nav (tie ir sarakstā LIELUMI); pie roktura ir tikai lieluma simbols (h, α, L, x₀ …).
5. **Palaišanas poga** ir rasējumā, **vienmēr centrēta, mazliet zem zemes līnijas**. Pirmo reizi tā ir nejauši viens no ▶ PALAIST / ▶ AIZIET / ▶ STARTS (vienreiz uz lapas atvēršanu), tad ↻ ATKĀRTOT 2×, 3× … Burti uz pogas aug līdzi BURTI iestatījumam, pogas vieta nemainās.
6. **Paziņojumi** ir rasējuma apakšā (zem pogas), ne augšā, lai neaizsedz paneļus.

## 3. Augšā pa kreisi — LIELUMI

- Virsraksts tikai **LIELUMI**. Zem tā īss saraksts — dotie un neatkarīgie lielumi:
  - K-01: α, h, L; 2. līmenī — vārtu skaits; 3. līmenī — Δt.
  - K-02: h, v₀, α (slīpajā sviedienā), Δt; horizontālajā sviedienā, ja pētījumā to drīkst mainīt, — otrā bumbiņa.
- Maināmais lielums ir melns, nofiksētais (pētījumā) — pelēks; saitē skolotāja nofiksētajam ir zīme FIKS.
- **Uzklikšķinot uz maināmā lieluma, tieši zem tā atveras slīdnis** (izmēru līnija ar rombiņu) ar − un +, un pārējās rindas noslīd uz leju. Rasējums mainās uzreiz. Izvēles lielumam (piem., Δt, lodīte) slīdņa vietā ir pogas.
- Slīdnis aizveras, vēlreiz uzklikšķinot uz lieluma, ar klikšķi ārpus saraksta vai ar Esc. Rindām un slīdnim ir **fiksēts augstums** — − un + neko nepabīda.
- **Pilnajā kontrolē** zem saraksta ir rinda **“citi…”**: saraksts izvēršas uz leju, un tur var mainīt visu pārējo (K-01: x₀, lodīte, virsma, ar ko mēra, taimeris, mērlente, palēninājums; K-02: režīms, mērogs, otrā bumbiņa, mērrežģis, palēninājums). Pētījumā “citi…” nav.

## 4. Augšā pa labi — MĒRĪJUMI

- Virsraksts tikai **MĒRĪJUMI** (dotais lielums, piem., α, nav mērījums). Viss nolīdzināts pie ekrāna labās malas.
- **Viens liels cipars** — aktuālā mērījuma vērtība ar simbolu un mērvienību (piem. “t = 1,05 s”). Palaišanas laikā tas mainās dzīvi (hronometrs skaita; vārtu laiks; pēdējā stroboskopa pozīcija).
- No 2. mērījuma zem lielā cipara ir **maza, simboliska tabuliņa**. Uzklikšķinot uz MĒRĪJUMIEM, atveras lielā tabula pa visu ekrānu.
- Dinamiskie mērījumi (vārtu laiki, x(t)) ir šeit kā mini saraksts viens zem otra, nevis rasējumā.

## 5. Sērijas tabula

- **K-01, 1. līmenis (hronometrs):** viena tabula krāj sēriju — **katram slīpumam sava rinda** ar α un h (vienalga, ar ko slīpumu iestata), **katram atkārtojumam sava kolonna** t₁, t₂, t₃ … Ja mainās kas cits (lodīte, L, virsma …), sākas jauna tabula.
- Pārējiem datu līmeņiem un K-02 paliek tabula katriem iestatījumiem, kā līdz šim; lielajā tabulā var pārslēgties starp tabulām.

## 6. Apakšā pa kreisi — ⚙

- Poga ⚙ apakšējā kreisajā stūrī. Logā: **tēma** (gaiša / tumša), **valoda** (LV / EN), **BURTI** 80–200 % un **ZĪMĒJUMS** 60–150 % (slīdņi ar − un +, mainās uzreiz), **PILNEKRĀNS** (ja ierīce to ļauj).
- Logs neaug līdzi burtiem (pogas paliek zem pirksta), aizveras ar klikšķi ārpusē vai Esc.
- Ierīce izvēli atceras. BURTI sākumā pielāgojas ekrānam: līdz 1280 × 800 — 100 %, lielākā ekrānā proporcionāli, līdz 200 %.

## 7. Galvene

- “← PĒTĪJUMI”, nosaukums · pētījums, lapas numurs, LV EN ◐ ⛶ (⛶ tikai, ja ierīce ļauj).
- **Pilnekrānā galvenes nav** — tad viss ir zem ⚙.
- Rakstlaukums (KOMPLEKTS / LAPA / TĒMA) datorā — mazs rasējuma apakšējā labajā stūrī; telefonā tā nav.

## 8. Izmaiņas

- 2026-10-04 — Pirmā versija no Anša piezīmēm (04.10, telefona ekrānuzņēmumi `scr.mini/sim-*.PNG` un skices komentāri).
- 2026-10-04 — Ansis: zīmējums (no burta h līdz noripojušajai lodītei) vienmēr precīzi ekrāna vidū, arī mainot ZĪMĒJUMS. Visos K-01 pētījumos maināmi α, h, L (un vārti / Δt, kur tie ir); Δt — slīdnis 0,1–2 s ik pa 0,1 s, bez brīdinājuma, ja lodīte noripo ātrāk par Δt. Kamēr slīdnis vaļā, LIELUMI ir platāks un virs MĒRĪJUMIEM. Pētījums a(α) → t(α), t(h); sērijas tabulā katrā rindā α un h.
- 2026-10-04 — Ansis: panelis visās simulācijās saucas **MAINĪGIE LIELUMI** (EN VARIABLES). Rinda, kas nav mainīgais lielums (S-01 palīglīnijas), tajā pašā panelī zem horizontālas līnijas kā čekbokss — ieslēdz ar vienu klikšķi.
