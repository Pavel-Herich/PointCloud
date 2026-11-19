# PointCloud

Mračná bodov jaskýň v prehliadači (vo vývoji, neskôr modul PreTherionu).

- `index.html` — úvodná stránka
- `mracno.html` — práca s mračnom (etapy 1–2): načítanie PLY (binárne aj ASCII) vo vláknach, zobrazenie s riedením pri pohybe, strihanie lasom a kvádrom, krok späť, export binárneho PLY (float32 alebo float64, aj každý N-tý bod), zvýraznenie tvaru (EDL), úplný priehľad cez prednú stenu podľa modelu jaskyne, normály, trajektória skenera, oddelenie stropu od podlahy, rozvinutý rez pozdĺž lomovej čiary
- `mracno_test.html` — test počítača: pamäť, vlákna, úložisko, čítanie PLY, kreslenie bodov
- `coi-sw.js` — service worker, ktorý doplní hlavičky COOP/COEP (GitHub Pages ich nevie nastaviť); stránka je potom *cross-origin isolated* a vlákna môžu zdieľať pamäť (`SharedArrayBuffer`)

Mračná sa nikam nenahrávajú — prehliadač ich číta priamo z disku.

## Mračno — ovládanie

- ľavé tlačidlo otáča, pravé (alebo Shift + ľavé) posúva, koliesko približuje k miestu pod kurzorom, dvojklik nastaví stred otáčania na bod (zobrazí sa zameriavač)
- pri zapnutom lase otáča stlačené koliesko
- `L` laso (Shift pridá, Ctrl uberie), `Delete` zmaže vybrané, `I` obráti výber, `Esc` zruší výber, `Ctrl+Z` späť, `F` celé mračno, `T` pohľad zhora
- kváder: súradnice v súradniciach súboru; „zobraziť len vnútro“ je len náhľad, natrvalo strihajú tlačidlá „Zmazať mimo / vnútri“

Body sa držia v pamäti ako float32 voči lokálnemu počiatku (prvý bod zaokrúhlený na metre), pri exporte sa počiatok pripočíta späť. Ďalšie vlastnosti bodov (čas, intenzita) sa zatiaľ nenačítavajú, v paneli sa len vypíšu ich názvy. Cieľový prehliadač je Chrome alebo Edge cez https (GitHub Pages) alebo localhost — vtedy beží izolácia a všetky vlákna pracujú nad spoločnou pamäťou.

## Zobrazenie

**Premietanie** je predvolene pravouhlé (rovnobežné) ako v CloudCompare: rozmery nezávisia od vzdialenosti a vidno všetko pozdĺž smeru pohľadu (blízka a ďaleká rovina obopínajú celé mračno). Mierka zodpovedá perspektíve vo vzdialenosti stredu pohľadu, koliesko približuje ku kurzoru, dvojklik len presunie bod do stredu (mierka a smer ostanú). Voľba „perspektíva“ zapne stredové premietanie, napr. na pohľad zvnútra jaskyne. Pri pravouhlom premietaní sa hĺbka obrazu prepočíta na náhradu logaritmu vzdialenosti, ktorá má vo vzdialenosti stredu pohľadu rovnakú hodnotu aj sklon, takže zapĺňanie dierok, vyhladenie, zvýraznenie tvaru a plastickosť fungujú rovnako.

**SOR filter** (Statistical Outlier Removal) prevzatý z CloudCompare (CCCoreLib, `CloudSamplingTools::sorFilter`):
- pre každý bod sa spočíta priemerná vzdialenosť k jeho k najbližším bodom; k zahŕňa bod samotný, ktorý sa vynechá (k = 6 → 5 susedov), presne ako v CloudCompare;
- z priemerných vzdialeností celého mračna sa spočíta priemer μ a smerodajná odchýlka σ; odfiltrovaný je bod, ktorého priemerná vzdialenosť je väčšia než μ + n·σ (predvolene k = 6, n = 1,0 ako v CloudCompare);
- hľadanie je presné: každý blok mračna s okrajom R (50-násobok vzdialenosti k najbližšiemu susedovi, aspoň 15 cm) sa uloží do hašovanej mriežky s bunkou 2-násobku tejto vzdialenosti a prehľadáva sa po škrupinách kocky, kým nie je k − 1. sused bližšie než prehľadaný polomer; body bez výsledku do R sa dopočítajú prehľadaním celého mračna;
- priemerné vzdialenosti (Float32 ako v CloudCompare) idú na grafickú kartu, takže zmena n sa prejaví hneď; zmena k spustí nový výpočet;
- „SOR filter“ zaškrtnuté: odfiltrované body sa nekreslia; „Vybrať“ ich vyberie (medzi zobrazenými triedami) na zmazanie alebo uloženie; po zmazaní bodov sa výsledok prepočíta tlačidlom ↻ (opakovaný SOR odfiltruje ďalšie body, rovnako ako v CloudCompare).

Overenie na výreze Kamenného mlieka (11 529 838 bodov, k = 6): CloudCompare 2.11.3 (príkazový riadok `-SOR 6 1.0`) ponechal 10 406 022 bodov, teda odfiltroval 1 123 816; PointCloud odfiltroval 1 123 816 tých istých bodov (zhodné súčty súradníc), μ = 7,911 mm, σ = 3,697 mm, prah 11,607 mm. Pri n = 2 je to 367 815 bodov, zhodne s presnou referenciou (k-d strom). Výpočet trval 38 – 45 s v dvoch vláknach (CloudCompare 58 s).

**Osamelé body podľa pozadia** (voľba, oba spôsoby zobrazenia) – pravidlo nad rámec CloudCompare, pracuje s bodmi odfiltrovanými SOR (ak SOR ešte nie je vypočítaný, spočíta sa):
- pre odfiltrovaný bod sa v 3D mriežke hustoty (voxel aspoň 10 cm, najviac 32 mil. voxelov; hustota = počet bodov vo voxeli / typický počet, ktorý vidí bod plochy) zistí najväčšia hustota b vo valci s polomerom jedného voxelu pozdĺž smeru pohľadu, od bodu dozadu do vzdialenosti „dosah“ (predvolene 3 m);
- b < 0,15 – bod je v pohľade osamotený a za ním nič nie je (tesné pokračovanie, okraj dosahu skenera, body za obrysom): zväčší sa až „zväčšenie“-krát (predvolene 3×) a zosvetlí, aj keď je SOR filter zapnutý;
- ostatné odfiltrované body sa pri zapnutom SOR filtri nekreslia, inak sa kreslia normálne; body, ktoré SOR neodfiltruje, sa nemenia;
- mriežka sa postaví pri zapnutí a prepočíta po zmazaní bodov, späť a pri rozvinutí.

Skúška na umelej scéne (1 259 625 bodov: hustá stena a podlaha s rozostupom 4 mm, 3 000 bodov šumu 5 – 60 cm pred stenou, riedka rúra s rozostupom 4 cm od okraja steny do prázdna, riedka doštička 1 m pred stenou): SOR odfiltruje 9 725 bodov (šum, rúra, doštička a okraje plôch). Pohľad spredu: zvýraznených 5 808 (rúra okrem úseku pri stene), skrytých 3 917 (šum, doštička, začiatok rúry). Pohľad zozadu: zvýraznených 8 852, skrytých 873. Na výreze Kamenného mlieka sa z 1 123 816 odfiltrovaných bodov podľa pohľadu zvýrazní 7 267 – 14 446 (0,06 – 0,13 % mračna), ostatné sa so SOR filtrom skryjú.

**Spôsob zobrazenia** (voľba „spôsob“, pamätá sa v prehliadači): *PointCloud* (popis nižšie) alebo *ako CloudCompare*. Každý spôsob má vlastnú veľkosť bodu, jas, pozadie a tieňovanie normálami.

*Ako CloudCompare* napodobňuje kreslenie podľa zdrojového kódu CloudCompare (`ccPointCloud::drawMeOnly`, `ccGLWindowInterface`, `ccGuiParameters`, doplnok qEDL – `ccEDLFilter`, `edl_shade.frag`, `edl_mix.frag` – a `ccBilateralFilter`); kód je napísaný nanovo, nie skopírovaný:
- bod má pevnú veľkosť v pixeloch (1 – 16, predvolene 1), štvorcový, voliteľne okrúhly; farba bez úprav; obraz sa nezapĺňa ani nevyhladzuje;
- pozadie: prechod z modrej (10, 102, 151) hore do čiernej dole;
- „tieňovať“ = osvetlenie normálami ako v CloudCompare: smerové svetlo od kamery, difúzne 1, odlesk 0,17 s exponentom 50, okolité 0,08. Bod, ktorého normála smeruje od kamery, je tmavý (tak ako v CloudCompare). Predvolene vypnuté, lebo CloudCompare po načítaní normály na osvetlenie nepoužíva;
- **EDL** ako v CloudCompare: hĺbka sa prepočíta na pomernú v rozsahu hĺbok obalu mračna (blízka rovina = max(zmin; 0,005 · zmax), ak je rozsah menší než polovica zmax, rozšíri sa o ±zmax/4). V mierke obrazu 1, 1/2 a 1/4 sa sčíta, o koľko je 8 susedov vo vzdialenosti mierka × polomer bližšie, deleno mierkou, a farba sa násobí exp(−sila × súčet). Mierky 1/2 a 1/4 sa rozmažú (5 × 5, váhy exp(−r²/32)) a zmiešajú: (C1 + 0,5·C2 + 0,25·C4) / 1,75. Sila 100 a polomer 3 px sú hodnoty CloudCompare pre perspektívu (pri rovnobežnom premietaní používa 1,2 px).

Porovnanie s CloudCompare 2.11.3 na výreze Kamenného mlieka (11,5 mil. bodov, pohľad zhora, rovnaká mierka 45,7 px/m, oba pravouhlo; stredná oblasť 300 × 400 px, jas 0 – 255, rozdiel po rozmazaní o 4 px, aby nerozhodovalo poradie kreslenia jednotlivých bodov):

| nastavenie | jas CloudCompare | jas PointCloud | rozdiel | korelácia |
|---|---|---|---|---|
| farby (predvolené) | 122,8 | 123,0 | 1,8 | 0,999 |
| farby + EDL (polomer 1,2 px) | 85,1 | 76,2 | 9,3 | 0,995 |
| normály | 29,0 | 29,1 | 1,1 | 0,977 |
| normály + EDL | 21,7 | 20,0 | 2,1 | 0,983 |

V spôsobe *ako CloudCompare* sa nepoužíva veľkosť bodu v priestore, veľkosť podľa hustoty, zvýraznenie tvaru, plastickosť ani vyhladenie. Úplný priehľad, triedy, výber a kváder fungujú rovnako. Klik na bod (lomové body, rez) sa vyhodnocuje s veľkosťou bodov ako v spôsobe PointCloud, aby cez 1-pixelové body nepadol na plochu za nimi. Polomer EDL je ako v CloudCompare 1,2 px pri pravouhlom premietaní a 3 px v perspektíve; každé premietanie si pamätá svoj.

**Spôsob PointCloud:**

- **veľkosť bodu v priestore** — bod má veľkosť v centimetroch: zblízka sa zväčší a zaplní medzery, z diaľky ostane na najmenšej veľkosti (posuvník „bod“, predvolene 1 pixel). Väčšie body sú okrúhle.
- **podľa hustoty okolia** (predvolené) — veľkosť bodu je „výplň“ × rozostup bodov v jeho okolí, najviac zadaný počet centimetrov. V hustom mračne sú body drobné a kresba jemná; v riedkom (tesné pokračovanie, okraj dosahu skenera) sú väčšie, aby ich bolo vidno. Rozostup sa po načítaní spočíta pre každý bod: voxely s hranou asi 8-násobku vzdialenosti k najbližšiemu susedovi (3 – 20 cm), počet bodov N vo voxeli a jeho 26 susedoch, rozostup ≈ 3,2·h/√N. Dve výnimky držia šum malý: bod s menej než 3 bodmi v okolí ostáva najmenší, a bod, ktorý má do 4 – 8 voxelov aspoň 3-krát hustejšie mračno (šum tesne pri hustej ploche), dostane veľkosť bodov tej plochy. Bez voľby má každý bod rovnakú veľkosť (5-násobok vzdialenosti k najbližšiemu susedovi).
- obraz sa skladá z hĺbky scény v štyroch krokoch: dierky veľké 1 – 2 pixely sa zaplnia farbou okolia; hĺbka sa vyhladí s váhou podľa rozdielu hĺbok (hrany ostanú ostré, šum bodov a osamelé body pred plochou zmiznú); z vyhladenej hĺbky sa počíta tieňovanie
- **zvýrazniť tvar** — eye-dome lighting: bod obrazu stmavne, ak je ďalej než jeho susedia
- **plastickosť** — osvetlenie plochy zľava zhora; sklon plochy sa počíta z vyhladenej hĺbky, normály v súbore netreba
- **vyhladenie** — polomer vyhladenia hĺbky v pixeloch, s ním sa jemne vyhladzuje aj farba (váha susedných pixelov 0,3 pri 1, 0,5 pri 2, 0,7 od 3). Predvolená 1 dáva jemnú kresbu bez bodkovania; 0 = bez vyhladenia, každý pixel má farbu najbližšieho bodu ako v CloudCompare; väčšie hodnoty obraz zhladia a zhrubnú
- **jas** a **pozadie** (tmavé, čierne, sivé, svetlé, biele)
- **úplný priehľad podľa modelu jaskyne** — rozhoduje vzduch modelu pred bodom (smerom k oku) a za ním, po štyroch vzorkách 1,5 – 8 voxelov:
  - vzduch pred bodom: bod je vidno;
  - vzduch len za bodom: stena videná zo strany horniny, skryje sa celá, z každej vzdialenosti;
  - vzduch ani pred, ani za (okraj pôdorysu, nízke a úzke miesta): strop sa skryje pri pohľade zhora, podlaha pri pohľade zdola; inak rozhodne normála bodu, ak ju mračno má. Pôdorys pri pohľade zhora tak ostáva úplný.

  Šum ani záhyby povrchu nevadia, lebo sa nerozhoduje podľa normál jednotlivých bodov. Používa hrubý model vzduchu doplnený jemným modelom z delenia blanou (siaha až k stenám). Ak mračno ešte nie je rozdelené, pri zaškrtnutí sa rozdelí blanou. Body ďalej než asi 1 m od vzduchu modelu (povrch, nezmodelované časti) ostávajú viditeľné.
- pri pohybe sa kreslí len časť bodov (voľba „body pri pohybe“) a body sa primerane zväčšia

## Normály

Ak má PLY normály (`nx ny nz` alebo `normal_x …`), načítajú sa (2 bajty na bod) a uložia sa aj pri exporte.

- **tieňovať** — jas bodu podľa uhla medzi normálou a smerom pohľadu; vynikne tvar stien
- **priehľad cez prednú stenu** — body, ktorých normála smeruje od pozorovateľa, sa nekreslia. Normály musia smerovať do vzduchu (k skeneru). Pri zašumenom mračne ostane z prednej steny závoj bodov s odchýlenou normálou, z diaľky nepriehľadný – vtedy použi úplný priehľad podľa modelu.
- farba **sklon (normály)** — modrá plochy otočené nadol (strop), oranžová nahor (podlaha), sivozelená zvislé steny

Po načítaní trajektórie sa vypíše, koľko percent normál smeruje k najbližšej polohe skenera (do 20 m). Tlačidlo „Normály k trajektórii“ tie opačné otočí – použi ho, až keď trajektória sedí s mračnom.

## Trajektória skenera

Tlačidlo „Trajektória…“ načíta dráhu skenera v súradniciach mračna: GeoSLAM `*_results_traj.txt` (`%time x y z q0 q1 q2 q3`), iný text so stĺpcami `x y z` alebo `čas x y z`, alebo PLY. Zobrazí sa ako zelená čiara. Dá sa zadať tlačidlom alebo pustením súboru do okna, aj počas čítania mračna alebo pred ním – načíta sa hneď po mračne. Pri delení stropu a podlahy slúži ako istý vzduch: kde poloha skenera nie je vo vzduchu modelu, vznikne nový zárodok (úzke plazivky, miesta za dierou v skenovaní), a vrstva, ktorou skener prešiel, sa nikdy neberie ako vrecko. V paneli sa vypíše, koľko percent trajektórie leží vo vzduchu hrubého modelu – nízke číslo znamená, že model vzduch nenašiel dobre (skús menšiu uzavretosť alebo menší voxel).

**Trajektória, ktorá nesedí s mračnom.** Ak vo vzduchu hrubého modelu leží menej než 70 % polôh, trajektória sa pri delení nepoužije. „Zarovnať na mračno“ hľadá posun (bez otočenia, do ±10 m), pri ktorom leží vo vzduchu najviac polôh: hrubá mriežka po 0,5 m, 30 najlepších miestnych maxím sa doladí po 0,1 a 0,02 m. V paneli sa vypíše posun a podiel vo vzduchu pred a po. Posun sa dá zadať aj ručne v troch poliach (X, Y, Z v metroch); podiel vo vzduchu sa prepočíta po každej zmene. Skúška: trajektória posunutá o 1,3 · −0,8 · 0,6 m sa vrátila s odchýlkou do 8 cm, podiel vo vzduchu 38 % → 92 %.

## Strop a podlaha

Štyri metódy:

- **blana cez najširšie miesta** (predvolená) — hranica stropu a podlahy ide cez najširšie miesta pôdorysu.
  1. *Hrubý model* (ako pri metóde „model jaskyne“) nájde vzduch jaskyne vo voxeloch. Počíta sa len z nezmazaných bodov, takže orezané mračno dostane jemnejší voxel.
  2. *Jemný úrovňový model*: pôdorys sa rozdelí na „jemné bunky“ (predvolene 0,1 m) a v každej sa zoradia výšky bodov. Úsek hrubého vzduchu sa v bunke roztiahne po najbližší bod pod sebou a nad sebou. Od týchto zárodkov rastie vzduch do susedných buniek, kým je medzi bodmi zdola aj zhora ohraničená medzera, ktorá sa prekrýva so susedom – tak sa dostane až k stenám, do nízkych škár a vreciek. Osamelé body a okraje stien, ktoré do bunky zasahujú len šumom, vzduch neohraničujú. Medzera hneď nad stropom alebo pod dnom známeho vzduchu je hornina.
  3. *Vrecká*: hornina medzi dvoma úsekmi vzduchu nad sebou je platňa (polica, jazyk, most, balvan). Ak je platňa plytká (do „podtečenie do“) a tenšia z jej dvoch vrstiev vzduchu nikam ďalej nevedie, je to vrecko: pod chodbou patrí celé k podlahe, nad chodbou celé k stropu.
  4. *Blana*: vo vzdialenosti „okraj“ od obrysu pôdorysu sa blana ukotví v strede výšky vzduchu a k obrysu sa predĺži rovnakým sklonom (pri eliptickom profile presne do najširšieho miesta). Kotví sa len tam, kde sa vzduch k okraju zužuje; zvislé steny, okraje dier v skenovaní a stĺpy do veľkosti „podtečenie do“ nekotvia a blana sa k nim prenesie z okolia. Medzi kotvami je blana hladká (Laplaceova rovnica) a ostáva vo vzduchu: balvan ju nadvihne, kvapeľ stlačí.
     Medzery medzi bodmi zvislej steny (stĺp, kvapeľ) by dali falošný vzduch: úsek aspoň 3× nižší než sused, z ktorého vyrástol, je výklenok a ostane len vtedy, ak vedie aspoň 3 bunky do boku.
     Kotvy sú tuhé pružiny. Ich výška a sklon sa najprv vyhladia pozdĺž okraja (medzi kotvami tej istej úrovne, konce radu sa nemenia): na zašumenej stene sa susedné kotvy líšia aj o decimetre a hranica by bola schodovitá.
     Výklenky nemajú vlastnú blanu. Je to (a) nízky úsek, ktorý vyrástol z aspoň 3× vyššieho suseda, a (b) po napnutí každý nízky úsek pri okraji, ktorý leží celý pod alebo nad blanou svojho aspoň 2× vyššieho suseda (zárez pri päte steny, podtečenie, medzera medzi bodmi steny), do hĺbky „podtečenie do“. Výšku blany preberú od tohto suseda, z blany vypadnú a tá sa napne znova.
  5. Blana sa napína nadrelaxovaním (SOR) v dvojitej presnosti, kým odhad zvyškovej chyby neklesne pod 2 mm. Miera nadrelaxovania sa volí podľa najväčšej vzdialenosti od kotvy; v strmej chodbe s riedkymi kotvami to sú tisíce krokov, inak ostane blana schodovitá.
  6. Bod pod dnom alebo nad stropom úseku vzduchu vo vlastnej bunke (súvislý zhluk bodov, na strmej stene aj meter vysoký) sa posudzuje podľa blany tohto úseku, nie suseda. Ostatné body sa priradia k najbližšiemu úseku vzduchu: nad blanou je strop, pod ňou podlaha, vo vrecku podľa vrecka. Kde je blana prilepená na dno alebo strop úseku, patrí k nemu aj vrstva bodov do 15 cm.
  7. Body ďalej než 0,6 m od vzduchu modelu (vrchol komína, okraj výrezu, úzke miesta) dostanú triedu najbližších zaradených bodov: trieda sa šíri po povrchu cez voxely 0,25 m do vzdialenosti „nezaradené doplniť do“ (predvolene 3 m). Ďalšie ostanú nezaradené.

  „Zobraziť model“ ukáže blanu (tmavšie sú kotvy).
- **model jaskyne (polovica výšky)** — z mračna sa postaví voxelový model (voxel = „bunka“, pri veľkom mračne sa sám zväčší, najviac 200 mil. voxelov). Steny sa zahustia o „zacelenie“ voxelov, aby lúče neprekĺzli cez diery a medzery. Z každého prázdneho voxelu sa vrhne lúč v 26 smeroch a spočíta sa, cez koľko stien prejde: zo vzduchu jaskyne cez nepárny počet (jednu stenu), z horniny aj z vnútra stĺpa či balvanu cez párny (žiadnu alebo dve). Vzduch sú voxely, kde je nepárnych smerov aspoň „uzavretosť“ (predvolene 15 z 26). Vzduch sa po stĺpcoch rozdelí na úseky; spodok úseku je dno, vrch strop. Drobné oddelené vrecká a vzduch uzavretý v predmetoch sa zahodia. Každý bod sa priradí k najbližšiemu úseku vzduchu (krátke úseky majú prirážku): nad jeho polovicou je strop, pod ňou podlaha. Body bez vzduchu do vzdialenosti zacelenie + 3 voxely ostanú nezaradené. „Zobraziť model“ ukáže dno (oranžovo) a strop (modro) vzduchu.

Ďalšie dve metódy rozdelia pôdorys na bunky (predvolene 0,2 m) a body v každej bunke zoradia podľa výšky.

- **prvé body zhora** — najvyšší povrch v bunke (3. najvyšší bod, aby osamelé body nad stropom nevadili); body do zvolenej hrúbky pod ním sú strop, ostatné podlaha
- **vrstvy (medzery)** — medzery väčšie ako „medzera“ rozdelia body v bunke na vrstvy; zhora sa striedajú strop, podlaha, strop… (poschodia). Vrstva vyššia ako „stena od“ sa delí v polovici.

Triedy sa dajú zobraziť alebo skryť, vybrať („Vybrať strop / podlahu“, so Shift pridať k výberu), odznačiť („Odznačiť strop / podlahu“) a ručne opraviť lasom („Výber → strop / podlaha“). Laso, kváder, mazanie aj uloženie pôsobia len na zobrazené triedy — napríklad uloženie samotného stropu.

## Rozvinutý rez

Mračno sa vyrovná pozdĺž lomovej čiary v pôdoryse: X je staničenie (dĺžka pozdĺž čiary), Y odstup od čiary (vľavo kladný), výška ostáva. Pohľad zboku je rozvinutý pozdĺžny rez, pohľad zhora vyrovnaný pôdorys.

**Lomové body** sa zadajú tromi spôsobmi:
- „Lomové body: klikať“ – klik na mračno pridá bod (najlepšie pri pohľade zhora s úplným priehľadom, kliká sa na podlahu chodby); otáčanie a posun fungujú ďalej;
- „Z trajektórie“ – trajektória skenera sa zjednoduší na lomovú čiaru (Douglas–Peucker v pôdoryse, odchýlka do zadanej hodnoty), po najvzdialenejšie miesto od začiatku, aby sa cesta späť neopakovala;
- textové pole – `x y z` na riadok v súradniciach súboru (dá sa vložiť aj polygónový ťah).

**Rozvinutie.** Bod patrí k najbližšiemu úseku čiary; hranicou medzi susednými úsekmi je os uhla v lomovom bode. Pri lome o uhol θ je pás úseku v odstupe d na vnútornej strane kratší a na vonkajšej dlhší o d·tan(θ/2). Tento rozdiel sa rozloží rovnomerne na celý úsek, takže rozvinutie je spojité – nič sa neprekrýva ani netrhá – a na osi presné. Nezobrazia sa body ďalej než „šírka pásu“ od čiary a body pri ohnisku vnútornej strany lomu, kde by sa úsek stlačil viac než 5×.

„Ľavá stena“ a „Pravá stena“ zobrazia polovicu pásu a pozrú na ňu z osi (rez osou). Kváder („zobraziť len vnútro“) reže aj v rozvinutých súradniciach a „Uložiť PLY…“ uloží rozvinuté mračno. Výber, mazanie a delenie stropu a podlahy fungujú len v priestore; triedy a výber sa v rozvinutom zobrazení zachovajú.

## Obrys a priečne rezy

Oba nástroje počítajú len zo zobrazených bodov (triedy, kváder „zobraziť len vnútro“) a výsledok otvoria v okne výkresu: ťahaním sa posúva, kolieskom približuje, dvojklik zobrazí celý; mriežka je popísaná v súradniciach súboru.

**Obrys** je hranica priemetu bodov:
- „Obrys zhora“ – pôdorys; v rozvinutom zobrazení vyrovnaný pôdorys (staničenie × odstup);
- „Obrys zboku“ – v rozvinutom zobrazení rozvinutý pozdĺžny rez (staničenie × výška); v priestore priemet na zvislú rovinu v smere pohľadu kamery.

Postup: body sa premietnu do rastra (bunka 5 cm; pri veľkom mračne sa zväčší, aby raster nemal viac než 20 mil. buniek), bunka platí od zadaného počtu bodov (osamelé body obrys nerozširujú), medzery do zadanej šírky sa zacelia (rozšírenie a zúženie o polovicu šírky), diery a ostrovčeky menšie než zadaná plocha sa zrušia. Hranica sa vedie pochodujúcimi štvorcami cez vyhladenú masku, takže nie je zubatá, a zjednoduší sa (Douglas–Peucker) na zadanú odchýlku. Vonkajší obrys a diery (stĺpy v pôdoryse) sú samostatné uzavreté čiary. Vypíše sa počet čiar a vrcholov, plocha, obvod a rozmer.

**Priečny rez** – „Priečny rez: 2 body“ a dva kliky na mračno (najlepšie pri pohľade zhora), alebo súradnice `x1 y1 x2 y2` v poli pod tlačidlom. Berú sa body zo zvislého plátu zadanej hrúbky (5 cm) medzi bodmi A a B; vo výkrese je vodorovne vzdialenosť od A, zvislo výška. Obrys rezu je hranica vzduchu, ktorý body uzatvárajú:
- z pásu bodov ostane jadro – bunky (2 cm) s aspoň štvrtinou najväčšieho počtu bodov do 8 cm; okraj pásu (šum, rozmazanie šikmej steny hrúbkou plátu) odpadne a čiara ide pri strede pásu;
- medzery v stene do zadanej šírky sa zacelia; ak sa obrys neuzavrie, skúsi sa dvojnásobok a štvornásobok a napíše sa to;
- kde úsečka končí vo vzduchu, ostáva rez otvorený a čiara tam končí.

Vypíše sa dĺžka úsečky, počet bodov, plocha, šírka a výška rezu. V rozvinutom zobrazení je úsečka v rozvinutých súradniciach (rez kolmo na os je profil chodby v danom staničení).

**Uloženie výkresu:**
- SVG v mierke 1 : 100 (1 m = 10 mm) – čiary a pod nimi body ako obrázok, vhodné na dokreslenie;
- DXF – lomené čiary v súradniciach súboru, vrstvy OBRYS a DIERY;
- TH2 pre Therion – jeden scrap (`-projection plan`, `extended`, `[elevation azimut]` alebo `none` pri priečnom reze) s mierkou `-scale` (100 jednotiek kresby = 1 m) a stenami ako `line wall`; diery majú `-outline in`. Stanice a ostatnú kresbu treba doplniť v editore.

## Skúšobná jaskyňa

`test/skusobna_jaskyna.mjs` vyrobí PLY s ťažkými profilmi (kľúčová dierka, podtečenie, nízka škára, šikmá chodba, šachta do spodnej chodby, sieň s kvapľami, balvanom a stĺpom, strmá puklina so sklonom 65° stúpajúca 30°) a so známou pravdou vo farbe (R: 255 strop, 0 podlaha, 128 nehodnotí sa):

```
node test/skusobna_jaskyna.mjs jaskyna.ply [hustota bodov/m² = 1500] [šum m = 0.01] [počet dier = 0] [polomer diery m = 0.5] [trajektoria.txt] [n | f]
```

S názvom trajektórie pribudne plazivka so zakrytým ústím a súbor trajektórie. Posledný parameter pridá normály: `n` smerujú do vzduchu, `f` sú pre x > 50 otočené (skúška orientácie podľa trajektórie).

Podiel správne zaradených bodov (bez pásu ±5 cm okolo hranice):

| metóda | čistá jaskyňa (1500 b/m², šum 1 cm) | riedka so šumom a dierami (600 b/m², 2,5 cm, 40 dier) |
|---|---|---|
| prvé body zhora | 91,4 % | |
| vrstvy | 92,7 % | |
| model jaskyne (polovica výšky) | 94,7 % + 3,6 % nezaradených | |
| blana cez najširšie miesta | 99,8 % | 99,7 % |

Najslabšie miesto blany je strmá puklina (99,3 % a 98,9 %). Na výreze skutočného mračna (Kamenné mlieko, 11,5 mil. bodov, šum okolo 10 cm) sa algoritmus ladil podľa rezov – tam sa ukázali schodovité hranice na takmer zvislých stenách, ktoré skúšobná jaskyňa nevyvolá.
