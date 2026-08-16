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

### R7 — Régénérer les icônes

`python3 tools/make_icons.py` — pas de dépendance, encodeur PNG maison (zlib + struct).
Modifier `BG`/`FG` ou la fonction `dumbbell()` pour changer le dessin.
Après régénération : bump `CACHE`, et vérifier que les 3 PNG sont bien dans `ASSETS`.

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

---

## 5. Checklist avant push

```
[ ] node --test tests/*.test.mjs              → 28/28 vert
[ ] for f in docs/*.js; do node --check $f; done → aucune erreur
[ ] CACHE bumpé dans docs/sw.js               → si docs/ a changé
[ ] ASSETS à jour dans docs/sw.js             → si un fichier a été ajouté à docs/
[ ] python3 -m http.server 8123 --directory docs, puis :
      [ ] démarrer une séance, ajouter un exercice à la barre
      [ ] valider 2 séries → le calcul « par côté » est juste
      [ ] le chrono de repos démarre, +30 s et Passer fonctionnent
      [ ] modifier une série (tap sur la ligne), en supprimer une
      [ ] terminer la séance
      [ ] onglet Historique → ouvrir le détail → « Refaire cette séance »
      [ ] onglet Progrès → les 4 blocs s'affichent, les graphiques se tracent
      [ ] ⚙️ → un export se télécharge, un import le restaure
      [ ] console (F12) : aucune erreur
[ ] git status : aucun forge-export-*.json
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
