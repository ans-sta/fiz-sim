# Fotoefekts (A-02) — specifikācija

> Statuss: būvē Toms (Claude Code) 2026-11-05; pirmā lietošana — F11, 06.11.2026 1. stunda. Zemāk — Anša specifikācija bez satura izmaiņām (tikai pēdiņas „…” → “…”), beigās — § 10 “Lēmumi būvējot”: ko izvēlējos pats, kur specifikācija atstāja vaļā.
> Tuvākais paraugs — A-01 `atomic-spectra.html` (`docs/plans/2026-11-03-atomu-spektri.md`). Vizuālā sistēma — `docs/plans/2026-07-15-rasejuma-dizains.md`.

---

# fiz-sim · Fotoefekts — simulācijas specifikācija

Atjaunināts: 2026-11-05T15:02:58+02:00

Statuss: **specifikācija koderim** (Ansis, 2026-11-05T14:47+02:00: “uzraksti specifikāciju simulācijai fotoefektam”). Būvē Claude Code sesijā repo `ans-sta/fiz-sim`; šo failu ielikt repo mapē `docs/plans` pie citiem plāniem. Pirmā lietošana — F11 Pk 06.11.2026 1. stundā (`F11/F11_n05d5_pl_Fotoefekts-atoma-līmeņi-un-SM04.md`, 1. solis); ja līdz tam nav gatava — vēlāk, eksāmena grupai.

Stils: tāds pats kā esošajām simulācijām, jaunajā “rasējuma” dizainā; tuvākais paraugs — **A-01 “Atomu spektri”** (`atomic-spectra.html`; tā pati tēma, tie paši pogu, paneļu un “i” paskaidrojuma veidi). Kods sarakstā — piedāvājums **A-02** (Ansis apstiprina). Valoda — latviešu (ar EN, ja pārējās to atbalsta), decimālkomats, lielumu simboli kā mācību grāmatā.

---

## 1. Kāpēc šī simulācija

Klasē nav drošas UV lampas un cinka plāksnes, tāpēc fotoefektu var tikai izstāstīt — un 05.11 stāsts “neaizgāja”. Simulācijai jāļauj **pašam pārliecināties par trim faktiem, kas lauž viļņu priekšstatu**:

1. Sarkanā gaisma elektronus **neizsit nekad**, lai cik spoža.
2. Pietiekami “zila” gaisma izsit **uzreiz**, arī ļoti vāja (nav jāgaida, kamēr “uzkrājas”).
3. **Spožums** maina tikai **cik daudz** elektronu izlido; **krāsa** (frekvence) — **cik ātri** tie lido.

Un parādīt skaidrojumu: gaisma nāk **porcijās — fotonos**, katram $W = hf$; vienu elektronu izsit **viens** fotons, porcijas nesaskaitās.

Lietotāji: skolotājs pie projektora (galvenais), skolēni telefonos (otrais — ekrānam jāder arī vertikāli).

## 2. Ko redz ekrānā

**Galvenā aina (rasējums):** vakuuma caurule — kreisajā pusē metāla plāksne, labajā savācējs, starp tiem tukšums; virs plāksnes lampa, no kuras uz plāksni krīt gaisma. Ķēdē ampērmetrs.

- **Gaisma** — redzama kā fotonu “lodītes” (vai īsi viļņu gabaliņi), kas lido uz plāksni; krāsa pēc viļņa garuma (IS un UV — pelēcīgi/violeti punktēti, ar uzrakstu “IS” vai “UV”, jo acs tos neredz). Fotonu skaits ekrānā atbilst spožumam.
- **Elektroni** — mazas lodītes ar “−”; izlidojot no plāksnes, tie lido uz savācēju; **ātrums ekrānā atbilst to kinētiskajai enerģijai** (lielāka frekvence → ātrāki elektroni).
- **Ampērmetrs** — rāda strāvu (relatīvi vai mikroampēros) — “cik elektronu sekundē”.
- Fotoni, kas elektronu neizsit, “atsitas” plāksnē un pazūd ar mazu sasilšanas zīmi (piemēram, plāksnes mala nedaudz iesarkst pēc ilgas apgaismošanas — nav obligāti).

**Enerģijas “žogs” (sānu panelis, ieslēdzams):** vienkārša diagramma — elektrons bedrē aiz žoga ar augstumu $A$ (izejas darbs, klasē — “žogs”). Katrs fotons parāda savu “lēcienu” $hf$ kā stabiņu: ja stabiņš zemāks par žogu — elektrons pakāpjas un krīt atpakaļ; ja augstāks — pārlec, un **pārpalikums** ir elektrona kustības enerģija $W_k$. Tas ir Einšteina vienādojums bez formulas.

**Datu panelis:** viļņa garums $\lambda$ (nm), frekvence $f$ ($\cdot 10^{14}$ Hz), viena fotona enerģija $W$ ($\cdot 10^{-19}$ J), metāla izejas darbs $A$ ($\cdot 10^{-19}$ J), elektronu kinētiskā enerģija $W_k$ (ja izlido), strāva. Mērvienības — džouli; **eV tikai, ja ieslēgts ar URL parametru** (klasei eV nav mācīts).

## 3. Vadība

| Vadība | Diapazons | Piezīmes |
|---|---|---|
| **Gaismas krāsa** — slīdnis pēc viļņa garuma | 150–1200 nm | Slīdņa fons — spektrs (UV pelēcīgi violets, redzamā varavīksne, IS tumši sarkans). Blakus vērtība nm un frekvence. Ātrās pogas: “sarkans 650”, “zaļš 532”, “zils 450”, “UV 250”. |
| **Spožums** | 0–100 % | Maina tikai fotonu skaitu sekundē, ne to enerģiju. |
| **Metāls** | cēzijs, nātrijs, cinks, varš | Katram savs $A$ (sk. 5. sadaļu). Noklusējums — nātrijs (slieksnis zaļajā — labi rādāms ar redzamo gaismu). |
| **Ieslēgt / izslēgt gaismu** | — | Pēc ieslēgšanas elektroni izlido **uzreiz** (bez aizkaves), ja $hf > A$. |
| **“Žogs”** | rādīt / slēpt | Enerģijas diagramma. |
| **Prognozes režīms** | ieslēgt / izslēgt | Kamēr ieslēgts, elektroni un ampērmetrs ir aizsegti (“?”); poga “Rādīt” atklāj. Skolotājs vispirms ļauj klasei nobalsot. |
| **“i”** | — | Īss paskaidrojums kā A-01. |

## 4. Mērījumu režīms (2. kārta — eksāmena grupai, nav vajadzīgs 06.11)

- **Bremzējošais spriegums:** slīdnis starp plāksni un savācēju; strāva nokrītas līdz nullei pie $U_b$, kur $e U_b = W_k$. Tabula $f$ ↔ $U_b$, ko skolēns var nokopēt (vēlāk — uz Fv3) un uzzīmēt taisni, no tās slīpuma — $h$.
- **Saules elements:** plāksnes vietā silīcijs (slieksnis ~1100 nm), izeja — strāva un spriegums; slīdnis “paneļa temperatūra” — spriegums krītas ap 0,4 %/°C.

## 5. Fizika (dati un noteikumi)

- $h$ = $6{,}63 \cdot 10^{-34}$ J·s, $c$ = $3{,}00 \cdot 10^8$ m/s, 1 eV = $1{,}60 \cdot 10^{-19}$ J. $f = c/\lambda$, $W = hf$.
- Izejas darbi (tipiskās tabulu vērtības; precizēt pēc viena avota un norādīt to “i” logā): cēzijs 2,1 eV ($3{,}4 \cdot 10^{-19}$ J, slieksnis ~590 nm), nātrijs 2,3 eV ($3{,}7 \cdot 10^{-19}$ J, ~540 nm), cinks 4,3 eV ($6{,}9 \cdot 10^{-19}$ J, ~290 nm), varš 4,7 eV ($7{,}5 \cdot 10^{-19}$ J, ~265 nm).
- Ja $hf \le A$ — **neviens** elektrons neizlido, pie jebkura spožuma (strāva tieši 0).
- Ja $hf > A$ — elektronu skaits sekundē proporcionāls spožumam (vienkāršots: katrs n-tais fotons izsit elektronu, kvantu iznākums konstants), $W_k^{max} = hf - A$. Elektronu ātrumi var būt nedaudz dažādi (0 … $W_k^{max}$), lielākais atbilst $W_k^{max}$.
- Nekādas “uzkrāšanās”: viens fotons — viens elektrons; divu fotonu enerģijas nesaskaitās.
- Spožums **nekad** nemaina $W_k$, krāsa **nekad** nemaina elektronu skaitu (izņemot slieksni).

## 6. URL parametri (kā citās fiz-sim simulācijās — visi iestatījumi arī kā URL mainīgie, ar `lock`)

Piedāvājums (nosaukumus saskaņot ar esošajām simulācijām): `lambda` (nm), `intensity` (0–100), `metal` (`Cs`, `Na`, `Zn`, `Cu`), `fence` (1/0 — “žogs”), `predict` (1/0 — prognozes režīms), `ev` (1/0 — rādīt eV), `lock` (komatiem atdalīts saraksts, kuri slīdņi bloķēti, piem. `lock=metal,lambda`). Piemērs skolēnu uzdevumam: `?metal=Zn&lambda=650&intensity=100&lock=metal` — “mēģini ar sarkanu izsist elektronus no cinka”.

## 7. Scenārijs stundā (kā skolotājs to lietos 06.11)

1. Nātrijs, sarkans 650 nm, spožums 30 % → nekas. “Palieliniet spožumu!” → 100 % → joprojām nekas (šoks).
2. Zaļš 532 nm (tieši virs sliekšņa), spožums 5 % → elektroni lido **uzreiz**, lēni, maz.
3. Spožums 100 % → elektronu daudz vairāk, **ātrums tas pats**.
4. Zils 450 nm / UV 250 nm → elektroni ātrāki.
5. Ieslēdz “žogu”: sarkanais fotons — stabiņš zem žoga; zilais — pārlec, pārpalikums = ātrums. “Tāpēc Einšteins teica: porcijas.”
6. Metāls → cinks: redzamā gaisma vairs neder nekāda, vajag UV (kā Halvaksa cinka plāksnei 1888. g.).

## 8. Pieņemšanas kritēriji (ko Ansis pārbaudīs)

- Pie $hf \le A$ strāva ir tieši 0 jebkurā spožumā; pie $hf > A$ elektroni parādās pirmajā kadrā pēc ieslēgšanas.
- Spožuma maiņa nemaina elektronu ātrumu un $W_k$; krāsas maiņa nemaina elektronu skaitu (virs sliekšņa).
- Datu panelī $f$, $W$, $A$, $W_k$ — normālformā ar decimālkomatu, ciparu pārbaude: 532 nm → $5{,}64 \cdot 10^{14}$ Hz, $3{,}74 \cdot 10^{-19}$ J; 650 nm → $4{,}62 \cdot 10^{14}$ Hz, $3{,}06 \cdot 10^{-19}$ J; 250 nm → $1{,}20 \cdot 10^{15}$ Hz, $7{,}96 \cdot 10^{-19}$ J.
- Projektorā lasāms no klases aizmugures (lieli cipari); telefonā — viss redzams bez horizontālas ritināšanas.
- Prognozes režīmā rezultāts tiešām nav redzams līdz “Rādīt”.
- Stils un navigācija (“← SARAKSTS”, “i”) kā A-01; simulācija pievienota sarakstam.

## 9. Ārpus šīs simulācijas

Kvantu iznākuma atkarība no viļņa garuma, virsmas efekti, Komptona efekts, viļņu–daļiņu duālisma vizualizācija, fotonu “viļņu paketes” fizika. Formulas $hf = A + W_k$ uz ekrāna — tikai, ja ieslēgts “žogs” un `ev`/eksāmena režīms (lēmums Ansim).

---

## 10. Lēmumi būvējot (Toms, 2026-11-05)

Kur specifikācija atstāja izvēli, izvēlējos tā. Viss maināms — pasaki.

**Lapa un kods.** `photoelectric-effect.html`, moduļi `assets/photo/` (model.js — fizika, sim.js — fotonu un elektronu plūsma, scene.js — zīmējums, params.js — saite, i18n.js — teksti LV/EN, main.js — lapa). Kods A-02, kartīte sarakstā aiz A-01, tēma “Atoms un visums”. Testi `tests/photo-*.test.js` (pieņemšanas kritēriji no § 8 ir testos).

**Izkārtojums.** Augšā josla: METĀLS (Cs · Na · Zn · Cu) | GAISMA (✓ IESLĒGTA, SPOŽUMS − slīdnis + %) | RĀDĪT (ŽOGS, PROGNOZE, i). Zem joslas datu panelis — λ, f, W, A, Wₖ, I lieliem cipariem (projektorā viena rinda; ja neietilpst — 3 vai 2 kolonnas, izvēlas pēc platākās iespējamās vērtības, tāpēc, mainoties skaitļiem, nekas nelec). Vidū rasējums: lampa virs plāksnes, vakuuma caurule, ampērmetrs zem tās; ar ŽOGU — žogs pa labi (datorā) vai zem caurules (telefonā). Apakšā KRĀSA: spektra slīdnis (λ aug pa labi; redzamajai gaismai ~58 % garuma, UV 22 %, IS 20 %), vērtība nm un frekvence, ātrās pogas SARKANS 650 · ZAĻŠ 532 · ZILS 450 · UV 250 (telefonā tikai skaitlis un krāsas kvadrātiņš).

**Noklusējums** — § 7 1. solis: nātrijs, 650 nm, spožums 30 %, gaisma ieslēgta. Ja sistēmā ieslēgts “samazināt kustību”, lampa sākumā izslēgta (ja saitē nav `light=1`); lampas slēdzis ir arī animācijas pauze.

**Izejas darbi** — viens avots, HyperPhysics (C. R. Nave, Georgia State University), “Work Functions for Photoelectric Effect”: Cs 2,1 · Na 2,28 · Zn 4,3 · Cu 4,7 eV. Ar skolas konstantēm: A = 3,36 · 3,65 · 6,88 · 7,52 ·10⁻¹⁹ J, sliekšņi 591 · 545 · 289 · 264 nm (garākais veselais nm, kas vēl izsit; cēzijam λ₀ = 591,96 nm, tāpēc 592 nm vairs neizsit). Nātrijam 2,28 (nevis 2,3) eV, jo tā avotā; 532 nm joprojām tieši virs sliekšņa (Wₖ = 9,07·10⁻²¹ J). “i” logā avots un piezīme, ka citās tabulās vērtības mazliet atšķiras.

**Viens fotons — viens elektrons.** Katrs fotons ar hf > A izsit elektronu (§ 5 “katrs n-tais” ar n = 1). Ar n = 2 pirmais fotons tikai sildītu, otrais izsistu — tas izskatītos pēc “uzkrāšanās”, ko simulācija tieši gāž. “i” logā (VIENKĀRŠOJUMI) teikts, ka īstā metālā elektronu izsit tikai neliela daļa fotonu. Pie hf = A (precīzi) elektronu nav.

**“Uzreiz”.** Ieslēdzot gaismu (vai spožumu no 0), stars jau ir pilns un pirmais fotons tieši pie plāksnes — elektrons ir tajā pašā kadrā, arī pie 5 %. Fotons no lampas līdz plāksnei lido 0,35 s. Ekrānā 100 % = 24 fotoni sekundē, 5 % — viens ik ~0,8 s.

**Elektronu ātrums** ∝ √Wₖ (kā īstajiem), ļoti palēnināts: ceļš līdz savācējam 1 / (0,6·√(Wₖ / 10⁻¹⁹ J)) s, ne ilgāk par 10 s (tieši pie sliekšņa). Ātrumi 85–100 % no lielākā (Wₖ 72–100 %), lielākais atbilst hf − A; datu panelī Wₖ — lielākā. Lēnie elektroni ekrānā sablīvējas (blīvums ∝ 1/v), bet skaits sekundē un strāva no krāsas nav atkarīgi.

**Strāva** ilustratīva: 100 % spožumā 2,00 µA (skala 0–2,5 µA), proporcionāla spožumam; zem sliekšņa, izslēgtai lampai vai pie 0 % — tieši 0,00 µA. Ampērmetra cipari — uzreiz, rādītājs — ar 0,15 s inerci.

**Fotoni, kas neizsit,** pazūd pie plāksnes ar mazu oranžu “sasilšanas” uzliesmojumu (0,4 s); “i” logā — īstā metālā lielākā daļa fotonu atstarojas vai silda. IS un UV: raustītas viļņu paketes, stars tikai ar raustītu kontūru, spuldze svītrota, blakus “UV — acs neredz” / “IS — acs neredz”. Plāksnes krāsa pēc metāla (cēzijs zeltains, varš vara krāsā).

**Žogs.** Enerģijas ass 0–9·10⁻¹⁹ J (der varam un 250 nm; īsākiem viļņiem stabiņš ar pārrāvumu augšā). Grīda — elektrons metālā (0), žogs — svītrots stabs līdz A ar izmēra līniju “A”, vakuuma pusē “zeme” A augstumā (miera stāvoklī izkļuvušam elektronam enerģija ir A — tātad bedre, kā tavā aprakstā), virs metāla raustīta A līnija, fotona stabiņš W viļņa krāsā, Wₖ — izmēra līnija no A līdz W (oranža). Viens cikls 2,2 s: fotons atlido, elektrons uzkāpj līdz W; ja W < A — krīt atpakaļ, ja W > A — pārlec un aizlido ar ātrumu ∝ √Wₖ. Apakšā “W ≤ A — elektrons paliek metālā” / “W > A — elektrons izlido”. Formula hf = A + Wₖ — tikai ar `ev=1` (§ 9: lēmums tev; atsevišķa “eksāmena režīma” nav).

**Prognoze.** Aizsegti: elektroni un plāksne (pelēks laukums ar lielu “?” un pogu RĀDĪT pāri caurulei), ampērmetrs (“?”), datu panelī Wₖ un I (“?”), viss žogs. Redzams paliek tas, ko iestata (λ, f, W, A, lampa un fotoni). Pēc RĀDĪT — jebkura maiņa (krāsa, spožums, metāls, gaisma) atkal aizsedz: nākamā prognoze.

**eV** (`ev=1`): datu panelī zem W, A, Wₖ otra rinda “= 2,34 eV”, “i” logā eV pie izejas darbiem un Einšteina vienādojums.

**Saite.** `lambda`, `intensity`, `metal`, `light` (papildus — “visi iestatījumi”), `fence`, `predict`, `ev`; `lock=metal,lambda` — tikai uzskaitītie, `lock=1` — visi saitē dotie (kā citās lapās). Bloķētās vadīklas pelēkas, pie grupas “FIKS.”. Nederīga vērtība — paziņojums, lieto noklusējumu vai robežu.

**Ārpus šīs kārtas** — § 4 (bremzējošais spriegums, saules elements).

**Pārbaudes 05.11.** Fizikas pārbaude (atsevišķs aģents: skaitļi no § 8, sliekšņi, žogs, teksti) un latviešu valodas redaktors — labojumi iestrādāti: kartītē “zilā izsit” → “ar pietiekami īsu viļņa garumu (nātrijam — zilā, cinkam — tikai ultravioletā)”; cēzija slieksnis 591 nm; žogam vakuuma pusē zeme A līmenī; Halvakss — cinka plāksne un elektroskops; “i” logā: spožums šeit ir fotonu skaits sekundē (ar vienādu jaudu zilās gaismas elektronu būtu mazāk), īstie elektroni lido ar ātrumiem no gandrīz 0, metāls daļu gaismas atstaro; ekrāna lasītājam skaitļi “3,74 reiz desmit mīnus deviņpadsmitajā pakāpē džouli”. Terminus “savācējs” (mācību grāmatās — anods, plāksne — katods) un “spožums” (grāmatās — intensitāte) atstāju kā tavā specifikācijā.

**Termini (Ansis 05.11. vakarā).** Uz ekrāna, “i” logā, ekrāna lasītāja tekstos un kartītē “savācējs” → “anods”, “spožums” → “intensitāte” (EN — anode, intensity). Plāksne paliek “plāksne”.

**Pārbūve pēc Anša (05.11. vakarā).**
- **Josla — 4 kolonnas**, katrā virsraksts un 2 rindas: METĀLS (Cs · Na · Zn · Cu; “izejas darbs A = …”) · GAISMA (✓ IESLĒGTA, INTENSITĀTE − slīdnis + %; spektra slīdnis un nm) · SPRIEGUMS UN STRĀVA (⇄ ANODS + / ANODS −, spriegums − slīdnis + V; “strāva I = … µA”) · ŽOGS un i (vienādi kvadrāti viens virs otra). Šaurākā ekrānā kolonnas pārkārtojas (planšetē 2 rindās, telefonā viena zem otras, telefonā guļus — bez virsrakstiem).
- **Galvene arī telefonā:** “← SARAKSTS”, nosaukums, A-02.
- **Noņemts:** datu panelis (f, W, Wₖ vairs nav redzami; λ — pie spektra slīdņa, A — 1. kolonnā, I — 3. kolonnā), ātrās krāsu pogas, PROGNOZE (“neredzu tai pielietojumu”), saites parametrs `predict`.
- **Baterija ķēdē** virknē ar ampērmetru: 0–6 V pa 0,01 V (± pogas 0,01 V, slīdnis ar bultām 0,01 V, PageUp/PageDown 0,1 V). Polaritāte zīmējumā — garā tievā plāksnīte “+”, īsā resnā “−”. Anods + — elektroni paātrinās, visi sasniedz anodu. Anods − — lauks bremzē: elektrons lido ar nemainīgu palēninājumu, apstājas vietā x = Wₖ / (e·U) (pie e·U = 2·Wₖ — puscaurulē) un atgriežas uz plāksni. Strāva = daļa elektronu, kuriem Wₖ > e·U; no U_b = Wₖ / e (lielākā) — tieši 0. Ar ātrumu izkliedi 85–100 % strāva sāk kristies tikai pie ~0,72·U_b — “i” logā (VIENKĀRŠOJUMI) teikts, ka īstā caurulē tā krīt pakāpeniski jau no 0 V un ka bez sprieguma anodu sasniedz ne visi. Saitē `voltage`, `reverse` (abi bloķējami). `ev=1`: “i” logā e·U_b = Wₖ, tātad hf = A + e·U_b.
- **Prožektors** lampas vietā: korpuss vērsts uz plāksnes vidu, priekšā lēca un divas klapes pa stara malām; fotoni izlido no lēcas centra un lido 2× lēnāk (0,7 s līdz plāksnei).
- **Kartīte sarakstā:** prožektors un baterija zīmējumā, teikums par bremzējošo spriegumu.

**Labojumi pēc Anša apskates (05.11. vakarā).** Prožektoram noņemta kāja. METĀLS: “izejas darbs” maziem burtiem zem A = … (kā nm skala zem spektra). GAISMA: kvadrātiska poga ⏻ (ieslēgta — pilns kvadrāts), [−] intensitāte [+] 30 %; tieši zem tās [−] spektrs [+] 650 nm (± pa 1 nm); skaitļi pa labi, mērvienības % un nm vienā vertikālē; vārda INTENSITĀTE rindā vairs nav (ekrāna lasītājs to dzird). SPRIEGUMS UN STRĀVA: vārds “anods” aizstāts ar kvadrātu “+/−” (pretēja polaritāte — pilns kvadrāts), vārds “strāva” noņemts (ekrāna lasītājam paliek). ŽOGS: vārda vietā simbols (grīda, svītrots stabs, augstāka zeme, bulta pāri); “i” — taisns burts.

**Pēdējais labojums (05.11.).** SPRIEGUMS UN STRĀVA šaura: [+/−] [−] slīdnis [+], zem tā “I = … µA   U = … V”. ŽOGA simbola līnijas 1 px — tikpat resnas kā pogas rāmis.

**Viļņi ↔ fotoni (Ansis 05.11.: “šis eksperiments taču palīdzēja ATKLĀT fotonus”).** Zem ⏻ kvadrāta poga ar vilnīti (tas pats viļņu paketes zīmējums, kas lido caurulē). Sākumā — vienmērīgs kūlis (sektors, intensitāte maina spilgtumu), fotonu nav; nospiežot (pilns kvadrāts) — kūļa vietā atsevišķi fotoni, 2× lēnāk (1,4 s līdz plāksnei). Tikai attēlojums — elektroni, strāva, aprēķini tie paši. Kūļa režīmā izslēgšana, krāsa un intensitāte pie plāksnes darbojas uzreiz (nav “lidojošu” fotonu). Saitē `photons=1`, bloķējams.
