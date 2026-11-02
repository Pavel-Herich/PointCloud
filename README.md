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

## Strop a podlaha

Pôdorys sa rozdelí na bunky (predvolene 0,2 m) a body v každej bunke sa zoradia podľa výšky.

- **prvé body zhora** — najvyšší povrch v bunke (3. najvyšší bod, aby osamelé body nad stropom nevadili); body do zvolenej hrúbky pod ním sú strop, ostatné podlaha
- **vrstvy (medzery)** — medzery väčšie ako „medzera“ rozdelia body v bunke na vrstvy; zhora sa striedajú strop, podlaha, strop… (poschodia). Vrstva vyššia ako „stena od“ sa delí v polovici.

Triedy sa dajú zobraziť alebo skryť, vybrať a ručne opraviť lasom („Výber → strop / podlaha“). Laso, kváder, mazanie aj uloženie pôsobia len na zobrazené triedy — napríklad uloženie samotného stropu.
