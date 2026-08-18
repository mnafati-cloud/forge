# MAINTENANCE.md — le manuel de Forge

Ce fichier est la mémoire longue du projet. `CLAUDE.md` dit *quoi ne jamais faire* ;
celui-ci dit *comment faire*, et *ce qui a déjà mal tourné*.

---

## 1. Contrats de données

### 1.1 `localStorage["forge-state-v1"]`

Écrit **uniquement** par `docs/app.js`. Une seule exception en lecture : le boot de thème
inline dans `index.html`, qui lit `set.theme` avant le rendu pour éviter le flash clair.

```js
{
  v: 1,                       // version du schéma — ne sert qu'à documenter
  set: { …DEF_SET },          // réglages (cf. 1.2)
  ses: [ Séance, … ],         // séances TERMINÉES, ordre chronologique CROISSANT
  cur: Séance | null,         // séance en cours (t1 === 0)
  ex:  { id: Exercice, … },   // exercices persos créés par l'utilisateur
  bw:  [ { d, w }, … ]        // pesées : d = "YYYY-MM-DD", w = kg
}
```

**Séance**

| clé    | type     | sémantique — **GELÉE** |
|--------|----------|------------------------|
| `id`   | string   | `"s" + timestamp` à la création. Éternel. |
| `d`    | string   | date locale `"YYYY-MM-DD"` du début. |
| `t0`   | number   | timestamp ms du début. |
| `t1`   | number   | timestamp ms de fin. **`0` = séance en cours.** |
| `n`    | string   | nom libre (auto-proposé d'après le groupe dominant, éditable). |
| `s`    | array    | les séries, dans l'ordre de validation. |
| `p`    | array    | ids des exercices **prévus** = ordre d'affichage des blocs. |
| `note` | string   | note libre de fin de séance. |

`p` existe pour qu'un exercice ajouté mais pas encore travaillé apparaisse quand même.
Les blocs affichés = `p` ∪ (exercices ayant au moins une série) — voir `sessionExercises()`.

**Série**

| clé | type   | sémantique — **GELÉE** |
|-----|--------|------------------------|
| `x` | string | id d'exercice. |
| `w` | number | charge en kg. **Lest additionnel** si `ex.bw`. **Charge d'UN côté** si `ex.uni`. |
| `r` | number | répétitions — ou **secondes** pour les gainages (planche, hollow hold…). |
| `e` | number | RPE 0-10. **`0` = non renseigné**, jamais `null`. |
| `u` | 0 \| 1 | `1` = échauffement → exclu du tonnage, des records et du décompte de séries. |
| `t` | number | timestamp ms de la validation. |

> **Convention unilatéral** : une entrée de série = **UN** côté. On enregistre deux séries
> pour deux côtés. Le volume ne double donc jamais tout seul, et rien n'est ambigu.

### 1.2 `DEF_SET` (engine.js)

```js
{ unit:"kg", bar:20, plates:[{w,n}…], step:2.5, rest:120, restAuto:true,
  sound:true, vibrate:true, rpe:false, theme:"auto", cues:true, bw:75 }
```

`plates[i].n` = nombre de **paires** disponibles du disque `plates[i].w`.

**Le matériel réel de l'utilisateur** (mesuré sur ses séances, pas supposé) :
deux barres de **6 kg et 7,5 kg**, des barres d'haltères de **2 kg**, et des disques
**20 / 10 / 5 / 2 / 1 / 0,5 kg**. C'est ce que porte `DEF_SET` — dans une application
à un seul utilisateur, les valeurs par défaut doivent être les SIENNES, pas celles
d'une salle de sport générique.

En pratique : squat et développé sur la barre de 7,5, rowing sur celle de 6. Une charge
donnée ne tombe généralement juste qu'avec UNE des deux barres (54 kg = 6 + 2×24 ; avec
la barre de 7,5 il faudrait 23,25 par côté). D'où `E.platePlanBest(cible, barres, disques)`
qui les essaie toutes et renvoie celle qui marche.

**Ajouter un réglage** = 3 gestes dans le **même commit** :
1. la clé dans `DEF_SET` (engine.js) ;
2. le `assert.deepEqual` du test contractuel (`tests/engine.test.mjs`, premier test) ;
3. le contrôle correspondant dans `openSettings()` (app.js).

La migration douce de `loadState()` (`for (var k in d.set) if (!(k in s.set)) s.set[k] = d.set[k]`)
s'occupe seule des téléphones qui ont l'ancien état. **On n'enlève jamais une clé.**

### 1.3 `docs/exercises.js`

```js
{ id, n, g, g2?, eq, bar?, bw?, uni?, bench?, c?, off? }
```

- `g` ∈ clés de `GROUPS`, `g2` = groupes secondaires (0,5 point de volume chacun).
- `eq` ∈ clés de `EQUIP` (`bw`, `db`, `bb`, `mac`, `band`).
- `bar:1` → le calcul « par côté » s'affiche pendant la saisie.
- `bw:1` → la charge saisie est un **lest** ; le poids de corps s'ajoute au tonnage.
- `uni:1` → charge d'un côté (cf. convention ci-dessus).
- `c` → rappel technique court, affiché sous l'exercice actif si `set.cues`.
- `off:1` → masqué du sélecteur, **mais toujours lisible dans l'historique**.

---

## 2. Recettes

### R1 — Ajouter des exercices au catalogue

1. Ouvrir `docs/exercises.js`, **ajouter des lignes à la fin de la section d'équipement concernée**.
2. Choisir un id `<équipement>-<mouvement>` en minuscules ASCII : `db-pullover`, `bb-front-squat`.
   Vérifier qu'il n'existe pas déjà (le test « ids uniques » le fait aussi).
3. Renseigner `g`, `eq`, et les drapeaux `bar`/`bw`/`uni`/`bench` qui s'appliquent.
4. Écrire un `c` court et utile — un seul point clé, pas un cours.
5. `node --test tests/*.test.mjs` → le test de cohérence des groupes doit rester vert.
6. Bump `CACHE` (sw.js), commit, push.

### R2 — Retirer un exercice du catalogue

**Ne jamais supprimer la ligne.** Ajouter `off: 1`. Il disparaît du sélecteur, l'historique reste
lisible. Si l'id figure dans la sentinelle `ETERNELS` des tests, l'y laisser.

### R3 — Modifier le moteur (`engine.js`)

1. **Écrire le test d'abord** dans `tests/engine.test.mjs`, le voir **échouer**.
2. Coder la modification. Aucune date « maintenant » implicite : elle entre en paramètre.
3. Arrondis : `r2` pour toute charge/tonnage, `r1` pour une estimation affichée (1RM).
4. `node --test tests/*.test.mjs` → 100 % vert.
5. Si le calcul est visible à l'écran, refaire le parcours local complet (§5).

### R4 — Ajouter un réglage

Voir §1.2 : les 3 gestes, même commit. Ne pas oublier `applySettings()` si c'est un champ texte
(les interrupteurs passent par la table `map` du handler `data-act="sw"`).

### R5 — Ajouter un module autonome

Suivre LE PATTERN (CLAUDE.md). Concrètement :
1. `docs/monmodule.js` en IIFE double environnement, exposant `FORGE_MONMODULE` + `.pure`.
2. `tests/monmodule.test.mjs` sur la partie pure.
3. `<script src="monmodule.js"></script>` dans `index.html` **avant** `app.js`.
4. `'monmodule.js'` dans `ASSETS` de `sw.js` + bump `CACHE`.
5. Un seul point d'intégration dans `app.js`, sous `if (window.FORGE_MONMODULE)`.

### R6 — Sauvegarder / restaurer la progression

- **Export** : ⚙️ → Données → « Exporter ». Produit `forge-export-AAAA-MM-JJ.json`.
  Le fichier contient l'état complet (`{app, v, at, state}`).
- **Import** : ⚙️ → Données → « Importer ». **Remplace** tout l'état après confirmation.
- Le format accepte aussi un état nu (sans enveloppe), pour dépanner à la main.
- **Ce fichier ne doit JAMAIS entrer dans un dépôt** (`.gitignore` le couvre).

### R7bis — Ajouter une icône à l'interface

1. Dessiner le tracé sur une grille 24×24, **trait uniquement** : `fill="none"`, coins et jonctions
   arrondis, épaisseur 1,7. Pas de remplissage, sauf un point plein occasionnel (`alert`).
2. L'ajouter à l'objet `ICONS` dans `docs/app.js`, par ordre alphabétique de son rôle.
3. L'appeler par `ico('nom', taille)` — la taille est en pixels, 20 par défaut.
4. Vérifier sa lisibilité à 14 px : si le dessin se referme, simplifier le tracé.
5. Ne JAMAIS employer un emoji ni un caractère typographique (✕ ↻ ▸) à la place.

### R7 — Régénérer les icônes de l'application (PWA)

`python3 tools/make_icons.py` — pas de dépendance, encodeur PNG maison (zlib + struct).
Modifier `BG`/`FG` ou la fonction `dumbbell()` pour changer le dessin.
Après régénération : bump `CACHE`, et vérifier que les 3 PNG sont bien dans `ASSETS`.

### R7ter — Numéro de version et historique

Il n'existe **aucune** constante de version dans le code, et c'est voulu.

- **Ce qui s'affiche** dans les réglages est le nom du cache actif du service worker
  (`caches.keys()` → `forge-vNN`). C'est la seule source qui décrive ce qui tourne réellement sur
  l'appareil : le dépôt peut être en v9 pendant que le téléphone, faute de réseau, tourne encore
  en v7 — et c'est précisément l'information utile quand un bug est signalé.
- **L'historique** (clic sur le numéro) est tiré en direct de l'API publique GitHub
  (`/repos/mnafati-cloud/forge/commits`), paginé par 40, sans jeton puisque le dépôt est public.
  Repli propre hors-ligne, avec lien vers GitHub.
- **La pastille `vNN`** vient du titre du commit, via `/^v(\d+)\s*[:\-–—]\s*/`. D'où la convention :
  un commit de release s'intitule **`vN — description`**, N étant le CACHE posé dans `sw.js`.
  Les quatre premiers commits du projet sont antérieurs à cette convention : ils s'affichent
  sans pastille, c'est normal et sans conséquence.

Rien à maintenir à la main : pas de fichier de changelog à tenir à jour, donc pas de changelog
qui se périme.

### R9 — Sauvegarde cloud (dépôt privé)

- **Jeton** : clé `forge-gh-token`, **jamais** dans un export ni dans l'état sauvegardé.
  À défaut, Forge lit `sori-gh-token` : les deux applications sont servies par la MÊME
  origine (`mnafati-cloud.github.io`), donc partagent le localStorage. Le jeton posé pour
  Sori marche tel quel, sans rien saisir sur le téléphone.
- **Destination** : `mnafati-cloud/sori-data`, dossier `forge/exports/` — jamais à la racine,
  pour ne pas toucher aux fichiers de Sori. Deux écritures : `latest.json` (le point de
  restauration) et `forge-export-AAAA-MM-JJ.json` (l'instantané du jour).
- **Déclenchement** : fin de séance (**impératif**, jamais sauté) et envoi d'un rapport
  (limité à une fois toutes les 5 minutes). Réglage `set.cloud` pour couper.
- **Garde de taille** : l'API Contents plafonne autour d'1 Mo par fichier ; au-delà de
  700 Ko un avertissement s'affiche AVANT le mur.
- **Restauration** : lit `latest.json`, compte les séances réellement exploitables, demande
  confirmation, met l'état actuel de côté et propose « Annuler » pendant 6 secondes.

> Conséquence de l'origine partagée à ne jamais oublier : « effacer les données du site »
> sur `mnafati-cloud.github.io` détruit **Sori ET Forge** d'un coup.

### R10 — Rapports de problème

`ST.reports` = `[{d, ctx, txt}]`, plafonné à 100. Le contexte est capturé automatiquement à
l'ouverture de la feuille : onglet, séance en cours, dernière série validée, exercice actif,
totaux, et **numéro de version** (lu depuis le cache du service worker). Ils partent avec
chaque sauvegarde cloud et chaque export — donc je les lis à la session suivante sans que
l'utilisateur ait à les recopier. Le bouton (drapeau, en-tête) porte une pastille tant que
des rapports attendent, et se coupe par `set.report`.

### R11 — Migration ponctuelle d'un réglage

C'est le SEUL cas où l'app modifie un réglage choisi par l'utilisateur. Règles :

1. Une clé par migration dans `ST.mig` (ex. `mig.restAutoOff`), testée avant d'agir.
2. Poser `migAppliquee = true` — sinon rien n'est écrit, la migration repasse à chaque
   lancement et **réécrase un réglage que l'utilisateur aurait volontairement remis**.
   Ce piège a été rencontré : la migration marchait en mémoire et ne se persistait pas.
3. Écrire en commentaire POURQUOI, pas seulement quoi.
4. Ne jamais toucher aux données d'entraînement — uniquement `set` et des libellés
   que l'app avait elle-même inventés.

### R8 — Revenir en arrière après une release ratée

```bash
git revert <sha>          # jamais de force push, jamais de reset --hard sur du poussé
# puis bump CACHE dans docs/sw.js (+1) dans le même commit ou juste après
git push origin main
```
Le service worker étant network-first, le téléphone reprend la bonne version au lancement suivant.
Si le téléphone semble coincé : fermer complètement l'app puis la rouvrir avec du réseau.
**Ne jamais suggérer « effacer les données du site ».**

---

## 3. Pièges déjà rencontrés

**P1 — L'arrondi au dixième détruit les disques de 1,25 kg.**
`Math.round(1.25 * 10) / 10` vaut `1.3`. Toute la chaîne de charges est donc en `r2`
(2 décimales) : `effLoad`, `setVolume`, `platePlan`, `roundStep`, `nearestLoadable`.
`r1` ne sert plus qu'aux estimations affichées (1RM, tonnage en tonnes).
Verrouillé par le test `platePlan combine plusieurs disques et signale le manque`.

**P2 — `<input type="number">` refuse la virgule.**
`value="42,5"` rend le champ **invalide** : il s'affiche **vide**. D'où deux fonctions distinctes
dans app.js : `num()` (affichage humain, virgule) et `dec()` (valeur de champ, point).
Ne jamais mettre `num()` dans un attribut `value` d'un champ numérique.

**P3 — Un `<span>` ignore `width`.**
Les barres de volume par groupe étaient invisibles : `.gbar .fl` est un `<span>`, donc `inline`,
donc `width:60%` sans effet. Toute jauge doit être `display:block` (ou enfant de flex).

**P4 — Le meilleur set n'est pas le plus lourd.**
`bestSets` classe au **1RM estimé** : 42,5 × 8 (53,8) bat 45 × 5 (52,5). C'est voulu.
`prCheck` distingue donc trois natures de record : `load`, `reps`, `e1rm`.

**P5 — `beforeunload` écrase l'état écrit de l'extérieur.**
`app.js` sauvegarde l'état en mémoire au `beforeunload`. Si un script de test écrit dans
localStorage puis recharge la page, l'écriture est perdue. Pour semer un état de test :
`page.addInitScript(...)` (avant le boot), jamais `evaluate` + `reload`.

**P6 — La position collante de `.sesbar` dépend de la hauteur du header.**
`top: 62px` correspond à `padding 10 + bouton 42 + padding 10 + bordure 1`.
Changer le header sans changer cette valeur fait chevaucher la barre de séance.

**P7 — Le chrono de repos cachait le toast.**
Les deux sont fixés en bas. `restStart`/`restStop` posent/retirent `body.resting`,
et `body.resting .toast` remonte de 76 px. Toute nouvelle barre fixe en bas doit faire pareil.

**P8 — Le marqueur d'échauffement restait armé après validation.**
`UI.wu` n'était jamais remis à zéro : après une série d'échauffement, TOUTES les séries de travail
suivantes étaient enregistrées `u:1`, donc exclues du tonnage et des records — en silence, sans
que rien à l'écran ne l'indique. `addSet()` désarme désormais `UI.wu` dès qu'une série `u:1` est
validée. C'est le bug le plus grave trouvé sur cette base : il corrompait les statistiques sans
laisser de trace.

**P9 — Un champ vidé faisait enregistrer l'ancienne valeur.**
`readPad()` testait `if (w.value !== '')`. Vider le champ des reps puis appuyer sur Valider
enregistrait donc le chiffre précédent, différent de celui affiché. Un champ vide vaut zéro,
point ; et le bouton Valider est `disabled` tant que les reps valent zéro.

**P10 — `fmtClock` n'avait pas d'heures.**
Utilisé à la fois pour le repos (toujours court) et pour le chrono de séance (souvent > 1 h).
Au bout de 83 minutes, l'écran affichait « 83:12 ». La fonction gère les heures depuis, et le
test le verrouille.

**P11 — Le chrono de repos ne vivait qu'en mémoire.**
Chrome décharge volontiers un onglet en arrière-plan. Le repos disparaissait pendant la série.
Il est désormais mémorisé dans `ST.rest = {end, total}` — une **heure de fin absolue**, jamais
un compteur — et `restResume()` le reprend au démarrage. Toute minuterie future doit suivre ce
principe : stocker l'échéance, pas le temps restant.

**P12 — Sans démarrage automatique, le chrono devenait inatteignable.**
Le repos ne pouvait démarrer que via `restAuto`. Couper le réglage supprimait toute possibilité
de lancer un chrono. Le pavé porte maintenant sa propre commande « Repos ». Règle générale :
une fonction pilotée par un réglage doit rester accessible quand le réglage est coupé.

**P14 — Les records se réécrivaient tout seuls à chaque pesée.**
Les fonctions du moteur recevaient un poids de corps SCALAIRE — celui du jour — et recalculaient
tout l'historique avec. Un record de tractions établi à 80 kg tombait à 70 kg dès la pesée
suivante, et le tonnage de mars changeait en août. Elles acceptent désormais aussi une
**fonction** `(dateStr) -> kg`, et `app.js` leur passe `bwAt`. Règle : tout calcul portant sur
plusieurs séances reçoit la fonction, jamais un poids figé.

**P15 — Les gainages en secondes polluaient tout.**
`r` vaut des répétitions OU des secondes. Sans distinction, 60 secondes de planche à 80 kg
pesaient 4800 « kg » et écrasaient à elles seules le tonnage réel d'une séance. Le drapeau
`sec:1` sur l'exercice les exclut du tonnage et du 1RM ; leur record est la **durée**, et le
`w` retenu est le **lest ajouté**, jamais la charge totale — sans quoi prendre deux kilos
déclenchait un faux record de gainage.

**P16 — Le glouton des disques annonçait « non chargeable » à tort.**
Avec des disques 25/20/10 et 30 kg à charger par côté, l'algorithme posait 25, se retrouvait
bloqué et déclarait la barre impossible — alors que 20 + 10 tombe juste. `platePlan` fait
maintenant une recherche exacte (sac à dos borné) ; un jeu de disques domestique tient en huit
tailles, c'est instantané.

**P17 — `history.back()` refermait la couche du dessous.**
Fermer un dialogue ouvert DEPUIS une feuille refermait aussi la feuille : le `popstate` déclenché
par notre propre `history.back()` voyait la feuille encore ouverte et la prenait pour la couche à
fermer. D'où le drapeau `retourInterne`. Toute fermeture programmatique doit se signaler.

**P18 — `<input type="number">` rejette la virgule.**
Un clavier français produit « 42,5 ». Le champ devient invalide et `.value` renvoie une chaîne
VIDE : la charge partait à zéro. Les champs de saisie sont passés en `type="text"` +
`inputmode="decimal"`, avec une normalisation virgule → point à la lecture.

**P20 — Des valeurs par défaut inventées sont des valeurs fausses.**
`DEF_SET` portait une barre de 20 kg et des disques de salle (15 / 2,5 / 1,25). L'utilisateur
a des barres de 6 et 7,5 kg et des disques de 2 / 1 / 0,5. Résultat : **6 charges sur 11** de
sa première vraie séance affichaient « non chargeable », avec une suggestion fausse. Le défaut
n'était pas neutre, il était faux — et invisible tant que personne n'avait soulevé pour de vrai.
Leçon : sur une app à un seul utilisateur, demander le matériel plutôt que de le supposer.

**P19 — Le nettoyeur d'état réinjectait un nom générique.**
`saineSeance()` faisait `n: z.n ? z.n : 'Séance'`. Un nom VIDE est pourtant une valeur
légitime — c'est ce qui fait afficher la séance par sa date. Résultat : à chaque chargement,
toutes les séances sans nom reprenaient « Séance », ce qui annulait discrètement le travail
sur le nommage. Règle : un nettoyeur ne DEVINE pas une valeur par défaut à la place de
l'utilisateur, il se contente de rejeter ce qui est du mauvais type.

**P13 — Les icônes en emoji ignorent `color`.**
Sur Android, les emoji sont rendus en bitmap couleur par Noto Color Emoji. L'onglet actif de la
barre de navigation ne changeait donc pas de couleur, et l'alignement optique variait d'un
téléphone à l'autre. Tout est passé en SVG de trait (`ICONS` / `ico()` dans app.js).

---

## 4. Décisions de conception (le « pourquoi »)

- **Pas de coach en v1.** L'app enregistre, elle ne dirige pas. La suggestion de charge attendra
  d'avoir de vraies données : proposer une progression sur 3 séances d'historique produirait
  du bruit, pas de l'aide.
- **1RM d'Epley** (`w × (1 + r/30)`), avec `r ≤ 1 → w`. Formule simple, monotone en charge et
  en reps, suffisante pour comparer des séances entre elles. Au-delà de 12 reps elle devient
  indicative — c'est assumé.
- **Le poids de corps compte dans le tonnage** des pompes et tractions, sinon une séance
  au poids du corps affiche 0 kg et le graphe hebdo ment.
- **Volume par groupe : 1,0 au principal, 0,5 aux secondaires.** Arbitraire mais stable ;
  l'important est la comparaison d'une semaine à l'autre, pas la valeur absolue.
- **Network-first plutôt que cache-first.** L'utilisateur a du réseau chez lui ; on privilégie
  d'avoir la dernière version, avec le cache comme filet pour une séance hors-ligne.
- **Un seul écran de saisie visible à la fois** (l'exercice actif se déplie, les autres se replient) :
  entre deux séries, on a une main libre et 20 secondes.
- **Aucun nom de séance inventé.** Le nom automatique était déduit du groupe musculaire
  dominant (« Séance pectoraux ») : c'est une logique de SPLIT. L'utilisateur refait les mêmes
  exercices à chaque séance — l'étiquette était donc absurde et changeait toute seule d'une fois
  sur l'autre. Une séance se repère par sa DATE ; le nom est facultatif, vide par défaut, et le
  champ doit se VOIR comme un champ (bordure + icône) sinon personne ne devine qu'il se modifie.
- **Le chrono de repos ne démarre jamais tout seul.** Retour d'usage : « le machin avait l'air
  d'être sur un timer ». On enregistre une séance, on ne met pas quelqu'un sous pression.
  Le bouton « Repos » du pavé le lance quand l'utilisateur le décide. `restAuto` existe toujours
  pour qui le veut, mais vaut `false` par défaut.
- **Aucune gamification.** Le compteur de semaines d'affilée dans l'en-tête a été retiré :
  personne ne l'avait demandé, et un pratiquant qui reprend n'a pas besoin d'une série à tenir.
  `E.weekStreak()` reste dans le moteur, testé, mais n'est plus affiché.
- **Aucun emoji, aucun dialogue natif.** Ce sont les deux marqueurs qui font « page web » plutôt
  qu'« application ». Les icônes sont des SVG de trait sur grille 24 ; les confirmations passent par
  `askDialog()`, dans le vocabulaire visuel de l'app.
- **Les graphiques n'affichent que des valeurs qui existent.** La courbe imprimait auparavant comme
  graduation un maximum gonflé de 18 % pour aérer le tracé : le chiffre lu ne correspondait à aucune
  séance. `E.niceMax()` fournit une borne ronde réelle, utilisée à la fois pour l'échelle et pour
  l'étiquette. Les semaines sont datées (« 10/08 »), pas numérotées (« S33 ») : personne ne sait
  situer la semaine 33 dans l'année.
- **Toute action destructrice s'annule.** Supprimer une série ou retirer un exercice affiche un
  « Annuler » pendant 6 s plutôt qu'une confirmation avant coup : on ne coupe pas le rythme d'une
  séance pour demander « êtes-vous sûr ». Les destructions massives (séance, tout effacer), elles,
  passent par un dialogue — et l'effacement total exige de taper le mot EFFACER.

---

## 5. Checklist avant push

```
[ ] node --test tests/*.test.mjs              → 40/40 vert
[ ] for f in docs/*.js; do node --check $f; done → aucune erreur
[ ] CACHE bumpé dans docs/sw.js               → si docs/ a changé
[ ] commit titré « vN — … » avec le même N    → sinon pas de pastille dans l'historique
[ ] ASSETS à jour dans docs/sw.js             → si un fichier a été ajouté à docs/
[ ] python3 -m http.server 8123 --directory docs, puis :
      [ ] démarrer une séance, ajouter un exercice à la barre
      [ ] valider 2 séries → le calcul « par côté » est juste, et nomme la bonne barre
      [ ] le chrono de repos démarre, +30 s et Passer fonctionnent
      [ ] modifier une série (tap sur la ligne), en supprimer une
      [ ] le chrono NE démarre PAS tout seul après une série
      [ ] terminer la séance
      [ ] corriger une série depuis l'historique, puis annuler une suppression
      [ ] AJOUTER une série oubliée à une séance terminée, et l'annuler
      [ ] un gainage (planche) : saisie en secondes, hors tonnage
      [ ] onglet Historique → ouvrir le détail → « Refaire cette séance »
      [ ] onglet Progrès → les 4 blocs s'affichent, les graphiques se tracent
      [ ] ⚙️ → un export se télécharge, un import le restaure
      [ ] basculer en thème clair : aucun texte sous 4,5:1
      [ ] console (F12) : aucune erreur
[ ] git status : aucun forge-export-*.json
[ ] aucun jeton GitHub dans le diff (grep github_pat_)
```

---

## 6. Idées en attente (backlog)

Rien n'est promis ; c'est une liste de départ pour les prochaines discussions.

- **Suggestion de charge** (double progression : +1 rep jusqu'au haut de la fourchette, puis
  +1 incrément et retour au bas). À activer en option quand il y aura ~8 séances par exercice.
- **Séances types enregistrées** (au-delà du « Refaire cette séance » actuel).
- **Détection de stagnation** : signaler un exercice sans progression depuis 4 séances, et
  proposer un deload.
- **Superset / circuit** : enchaîner deux exercices avec un seul repos.
- **Sauvegarde cloud** dans un dépôt privé, comme `sori-data`, pour ne plus dépendre de l'export
  manuel.
- **Import de l'historique existant** s'il y en a un ailleurs (fichier CSV, autre app).
- **Vue « prochaine séance »** proposant la rotation à partir des groupes les moins travaillés.
