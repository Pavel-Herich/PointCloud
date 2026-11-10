# PointCloud

Mračná bodov jaskýň v prehliadači (vo vývoji, neskôr modul PreTherionu).

- `index.html` — úvodná stránka
- `mracno.html` — práca s mračnom (etapy 1–2): načítanie PLY (binárne aj ASCII) vo vláknach, zobrazenie s riedením pri pohybe, strihanie lasom a kvádrom, krok späť, export binárneho PLY (float32 alebo float64), oddelenie stropu od podlahy
- `mracno_test.html` — test počítača: pamäť, vlákna, úložisko, čítanie PLY, kreslenie bodov
- `coi-sw.js` — service worker, ktorý doplní hlavičky COOP/COEP (GitHub Pages ich nevie nastaviť); stránka je potom *cross-origin isolated* a vlákna môžu zdieľať pamäť (`SharedArrayBuffer`)

Mračná sa nikam nenahrávajú — prehliadač ich číta priamo z disku.

## Mračno — ovládanie

- ľavé tlačidlo otáča, pravé (alebo Shift + ľavé) posúva, koliesko približuje k miestu pod kurzorom, dvojklik nastaví stred otáčania na bod (zobrazí sa zameriavač)
- pri zapnutom lase otáča stlačené koliesko
- `L` laso (Shift pridá, Ctrl uberie), `Delete` zmaže vybrané, `I` obráti výber, `Esc` zruší výber, `Ctrl+Z` späť, `F` celé mračno, `T` pohľad zhora
- kváder: súradnice v súradniciach súboru; „zobraziť len vnútro“ je len náhľad, natrvalo strihajú tlačidlá „Zmazať mimo / vnútri“

Body sa držia v pamäti ako float32 voči lokálnemu počiatku (prvý bod zaokrúhlený na metre), pri exporte sa počiatok pripočíta späť. Normály a ďalšie vlastnosti sa zatiaľ nenačítavajú. Cieľový prehliadač je Chrome alebo Edge cez https (GitHub Pages) alebo localhost — vtedy beží izolácia a všetky vlákna pracujú nad spoločnou pamäťou.

## Trajektória skenera

Tlačidlo „Trajektória…“ načíta dráhu skenera v súradniciach mračna: GeoSLAM `*_results_traj.txt` (`%time x y z q0 q1 q2 q3`), iný text so stĺpcami `x y z` alebo `čas x y z`, alebo PLY. Zobrazí sa ako zelená čiara. Pri delení stropu a podlahy slúži ako istý vzduch: kde poloha skenera nie je vo vzduchu modelu, vznikne nový zárodok (úzke plazivky, miesta za dierou v skenovaní), a vrstva, ktorou skener prešiel, sa nikdy neberie ako vrecko. V paneli sa vypíše, koľko percent trajektórie leží vo vzduchu hrubého modelu – nízke číslo znamená, že model vzduch nenašiel dobre (skús menšiu uzavretosť alebo menší voxel).

## Strop a podlaha

Štyri metódy:

- **blana cez najširšie miesta** (predvolená) — hranica stropu a podlahy ide cez najširšie miesta pôdorysu.
  1. *Hrubý model* (ako pri metóde „model jaskyne“) nájde vzduch jaskyne vo voxeloch. Počíta sa len z nezmazaných bodov, takže orezané mračno dostane jemnejší voxel.
  2. *Jemný úrovňový model*: pôdorys sa rozdelí na „jemné bunky“ (predvolene 0,1 m) a v každej sa zoradia výšky bodov. Úsek hrubého vzduchu sa v bunke roztiahne po najbližší bod pod sebou a nad sebou. Od týchto zárodkov rastie vzduch do susedných buniek, kým je medzi bodmi zdola aj zhora ohraničená medzera, ktorá sa prekrýva so susedom – tak sa dostane až k stenám, do nízkych škár a vreciek. Osamelé body a okraje stien, ktoré do bunky zasahujú len šumom, vzduch neohraničujú. Medzera hneď nad stropom alebo pod dnom známeho vzduchu je hornina.
  3. *Vrecká*: hornina medzi dvoma úsekmi vzduchu nad sebou je platňa (polica, jazyk, most, balvan). Ak je platňa plytká (do „podtečenie do“) a tenšia z jej dvoch vrstiev vzduchu nikam ďalej nevedie, je to vrecko: pod chodbou patrí celé k podlahe, nad chodbou celé k stropu.
  4. *Blana*: vo vzdialenosti „okraj“ od obrysu pôdorysu sa blana ukotví v strede výšky vzduchu a k obrysu sa predĺži rovnakým sklonom (pri eliptickom profile presne do najširšieho miesta). Kotví sa len tam, kde sa vzduch k okraju zužuje; zvislé steny, okraje dier v skenovaní a stĺpy do veľkosti „podtečenie do“ nekotvia a blana sa k nim prenesie z okolia. Medzi kotvami je blana hladká (Laplaceova rovnica) a ostáva vo vzduchu: balvan ju nadvihne, kvapeľ stlačí.
  5. Bod sa priradí k najbližšiemu úseku vzduchu: nad blanou je strop, pod ňou podlaha, vo vrecku podľa vrecka. Body ďalej než 0,6 m od vzduchu ostanú nezaradené.

  „Zobraziť model“ ukáže blanu (tmavšie sú kotvy).
- **model jaskyne (polovica výšky)** — z mračna sa postaví voxelový model (voxel = „bunka“, pri veľkom mračne sa sám zväčší, najviac 200 mil. voxelov). Steny sa zahustia o „zacelenie“ voxelov, aby lúče neprekĺzli cez diery a medzery. Z každého prázdneho voxelu sa vrhne lúč v 26 smeroch a spočíta sa, cez koľko stien prejde: zo vzduchu jaskyne cez nepárny počet (jednu stenu), z horniny aj z vnútra stĺpa či balvanu cez párny (žiadnu alebo dve). Vzduch sú voxely, kde je nepárnych smerov aspoň „uzavretosť“ (predvolene 15 z 26). Vzduch sa po stĺpcoch rozdelí na úseky; spodok úseku je dno, vrch strop. Drobné oddelené vrecká a vzduch uzavretý v predmetoch sa zahodia. Každý bod sa priradí k najbližšiemu úseku vzduchu (krátke úseky majú prirážku): nad jeho polovicou je strop, pod ňou podlaha. Body bez vzduchu do vzdialenosti zacelenie + 3 voxely ostanú nezaradené. „Zobraziť model“ ukáže dno (oranžovo) a strop (modro) vzduchu.

Ďalšie dve metódy rozdelia pôdorys na bunky (predvolene 0,2 m) a body v každej bunke zoradia podľa výšky.

- **prvé body zhora** — najvyšší povrch v bunke (3. najvyšší bod, aby osamelé body nad stropom nevadili); body do zvolenej hrúbky pod ním sú strop, ostatné podlaha
- **vrstvy (medzery)** — medzery väčšie ako „medzera“ rozdelia body v bunke na vrstvy; zhora sa striedajú strop, podlaha, strop… (poschodia). Vrstva vyššia ako „stena od“ sa delí v polovici.

Triedy sa dajú zobraziť alebo skryť, vybrať a ručne opraviť lasom („Výber → strop / podlaha“). Laso, kváder, mazanie aj uloženie pôsobia len na zobrazené triedy — napríklad uloženie samotného stropu.

## Skúšobná jaskyňa

`test/skusobna_jaskyna.mjs` vyrobí PLY s ťažkými profilmi (kľúčová dierka, podtečenie, nízka škára, šikmá chodba, šachta do spodnej chodby, sieň s kvapľami, balvanom a stĺpom) a so známou pravdou vo farbe (R: 255 strop, 0 podlaha, 128 nehodnotí sa):

```
node test/skusobna_jaskyna.mjs jaskyna.ply [hustota bodov/m² = 1500] [šum m = 0.01] [počet dier = 0] [polomer diery m = 0.5] [trajektoria.txt]
```

S posledným parametrom pribudne plazivka so zakrytým ústím a súbor trajektórie.

Podiel správne zaradených bodov (bez pásu ±5 cm okolo hranice):

| metóda | čistá jaskyňa (1500 b/m², šum 1 cm) | riedka so šumom a dierami (600 b/m², 2,5 cm, 40 dier) |
|---|---|---|
| prvé body zhora | 92,9 % | |
| vrstvy | 92,0 % | |
| model jaskyne (polovica výšky) | 94,3 % + 4,5 % nezaradených | |
| blana cez najširšie miesta | 99,9 % | 99,5 % |
