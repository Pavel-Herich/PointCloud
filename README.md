# PointCloud

Mračná bodov jaskýň v prehliadači (vo vývoji, neskôr modul PreTherionu).

- `index.html` — úvodná stránka
- `mracno.html` — práca s mračnom (etapy 1–2): načítanie PLY (binárne aj ASCII) vo vláknach, zobrazenie s riedením pri pohybe, strihanie lasom a kvádrom, krok späť, export binárneho PLY (float32 alebo float64, aj každý N-tý bod), zvýraznenie tvaru (EDL), úplný priehľad cez prednú stenu podľa modelu jaskyne, normály, trajektória skenera, oddelenie stropu od podlahy
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

- **veľkosť bodu v priestore** — bod má veľkosť v centimetroch: zblízka sa zväčší a zaplní medzery, z diaľky ostane na najmenšej veľkosti (posuvník „bod“). Po načítaní sa nastaví na 5-násobok typickej vzdialenosti k najbližšiemu susedovi (vypíše sa v paneli). Väčšie body sú okrúhle.
- obraz sa skladá z hĺbky scény v štyroch krokoch: dierky veľké 1 – 2 pixely sa zaplnia farbou okolia; hĺbka sa vyhladí s váhou podľa rozdielu hĺbok (hrany ostanú ostré, šum bodov a osamelé body pred plochou zmiznú); z vyhladenej hĺbky sa počíta tieňovanie
- **zvýrazniť tvar** — eye-dome lighting: bod obrazu stmavne, ak je ďalej než jeho susedia
- **plastickosť** — osvetlenie plochy zľava zhora; sklon plochy sa počíta z vyhladenej hĺbky, normály v súbore netreba
- **vyhladenie** — polomer vyhladenia hĺbky v pixeloch (0 = vypnuté, obraz je potom bodkovaný)
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
     Nízky výklenok v oveľa vyššej stene (zárez pozdĺž vrstvovej plochy, medzera medzi bodmi steny; okolie aspoň 6× vyššie, hĺbka do „podtečenie do“) nepatrí do blany: neurčuje okraj pôdorysu ani kotvy a výšku blany preberá od svojho ústia.
  5. Blana sa napína nadrelaxovaním (SOR) v dvojitej presnosti, kým odhad zvyškovej chyby neklesne pod 2 mm. Miera nadrelaxovania sa volí podľa najväčšej vzdialenosti od kotvy; v strmej chodbe s riedkymi kotvami to sú tisíce krokov, inak ostane blana schodovitá.
  6. Bod pod dnom alebo nad stropom úseku vzduchu vo vlastnej bunke (súvislý zhluk bodov, na strmej stene aj meter vysoký) sa posudzuje podľa blany tohto úseku, nie suseda. Ostatné body sa priradia k najbližšiemu úseku vzduchu: nad blanou je strop, pod ňou podlaha, vo vrecku podľa vrecka. Kde je blana prilepená na dno alebo strop úseku, patrí k nemu aj vrstva bodov do 15 cm. Body ďalej než 0,6 m od vzduchu ostanú nezaradené.

  „Zobraziť model“ ukáže blanu (tmavšie sú kotvy).
- **model jaskyne (polovica výšky)** — z mračna sa postaví voxelový model (voxel = „bunka“, pri veľkom mračne sa sám zväčší, najviac 200 mil. voxelov). Steny sa zahustia o „zacelenie“ voxelov, aby lúče neprekĺzli cez diery a medzery. Z každého prázdneho voxelu sa vrhne lúč v 26 smeroch a spočíta sa, cez koľko stien prejde: zo vzduchu jaskyne cez nepárny počet (jednu stenu), z horniny aj z vnútra stĺpa či balvanu cez párny (žiadnu alebo dve). Vzduch sú voxely, kde je nepárnych smerov aspoň „uzavretosť“ (predvolene 15 z 26). Vzduch sa po stĺpcoch rozdelí na úseky; spodok úseku je dno, vrch strop. Drobné oddelené vrecká a vzduch uzavretý v predmetoch sa zahodia. Každý bod sa priradí k najbližšiemu úseku vzduchu (krátke úseky majú prirážku): nad jeho polovicou je strop, pod ňou podlaha. Body bez vzduchu do vzdialenosti zacelenie + 3 voxely ostanú nezaradené. „Zobraziť model“ ukáže dno (oranžovo) a strop (modro) vzduchu.

Ďalšie dve metódy rozdelia pôdorys na bunky (predvolene 0,2 m) a body v každej bunke zoradia podľa výšky.

- **prvé body zhora** — najvyšší povrch v bunke (3. najvyšší bod, aby osamelé body nad stropom nevadili); body do zvolenej hrúbky pod ním sú strop, ostatné podlaha
- **vrstvy (medzery)** — medzery väčšie ako „medzera“ rozdelia body v bunke na vrstvy; zhora sa striedajú strop, podlaha, strop… (poschodia). Vrstva vyššia ako „stena od“ sa delí v polovici.

Triedy sa dajú zobraziť alebo skryť, vybrať („Vybrať strop / podlahu“, so Shift pridať k výberu), odznačiť („Odznačiť strop / podlahu“) a ručne opraviť lasom („Výber → strop / podlaha“). Laso, kváder, mazanie aj uloženie pôsobia len na zobrazené triedy — napríklad uloženie samotného stropu.

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
| blana cez najširšie miesta | 99,9 % | 99,7 % |

Najslabšie miesto blany je stĺp v riedkom mračne (94,6 %), strmá puklina má 99,5 % a 99,3 %.
