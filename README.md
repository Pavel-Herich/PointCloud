# PointCloud

Mračná bodov jaskýň v prehliadači (vo vývoji, neskôr modul PreTherionu).

- `index.html` — úvodná stránka
- `mracno_test.html` — test počítača: pamäť, vlákna, úložisko, čítanie PLY, kreslenie bodov
- `coi-sw.js` — service worker, ktorý doplní hlavičky COOP/COEP (GitHub Pages ich nevie nastaviť); stránka je potom *cross-origin isolated* a vlákna môžu zdieľať pamäť (`SharedArrayBuffer`)

Mračná sa nikam nenahrávajú — prehliadač ich číta priamo z disku.
