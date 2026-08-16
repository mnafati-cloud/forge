# CLAUDE.md — Forge : brief opérationnel

## Le projet en 5 lignes
Forge est une PWA **vanilla JS** (zéro dépendance, zéro build, zéro backend) de suivi de musculation
à la maison, pour **UN SEUL utilisateur**, sur **SON téléphone Android**.
Prod : **https://mnafati-cloud.github.io/forge/** — GitHub Pages sert le dossier `docs/` de la branche `main`.
Matériel visé : **haltères, banc, barre + disques, poids du corps**.
La progression vit **dans le localStorage du téléphone** (clé `forge-state-v1`), avec pour seul filet
l'export JSON manuel : le repo est sans état, une release ratée se répare par un revert, mais une
progression perdue est irrécupérable.
Manuel complet (contrats de données, recettes, pièges) : **`MAINTENANCE.md`** — lis-le avant toute
modification non triviale.

## RÈGLES D'OR — à ne JAMAIS violer

1. **Ne jamais casser le schéma localStorage `forge-state-v1`.** Ne renomme jamais la clé.
   Ne change jamais la sémantique de `x`/`w`/`r`/`e`/`u`/`t` (série) ni de `id`/`d`/`t0`/`t1`/`n`/`s`/`p`/`note` (séance).
   **Additif seulement** : un nouveau réglage = une nouvelle clé dans `DEF_SET` (engine.js) **ET la mise à jour
   du test contractuel `tests/engine.test.mjs` (`assert.deepEqual` sur `DEF_SET`) dans le MÊME commit** —
   la migration douce de `loadState()` fait le reste.

2. **Un id d'exercice est ÉTERNEL.** `docs/exercises.js` : ne jamais renommer, réutiliser ni supprimer
   un id existant, y compris les ids `perso-*` créés par l'utilisateur. L'historique du téléphone ne
   référence les exercices que par id. Pour retirer un exercice du catalogue visible : `off: 1`
   (il reste lisible dans l'historique). La liste `ETERNELS` dans les tests est une sentinelle :
   on n'y retire jamais rien.

3. **Ne jamais pousser d'export personnel.** `forge-export-*.json` contient des données de santé.
   Ils sont dans `.gitignore` — ne l'affaiblis jamais. Le dépôt est **public**.

4. **`node --test tests/*.test.mjs` doit être 100 % vert avant chaque push** (28 tests minimum).
   En plus : `node --check` sur chaque JS de `docs/` modifié (la CI le fait sur tous).
   Un test rouge = tu ne pousses pas, point.

5. **Bump `CACHE` dans `docs/sw.js`** (+1, ex. `forge-v1` → `forge-v2`) à chaque release qui touche `docs/`.
   Fichier JS/CSS ajouté dans `docs/` = aussi l'ajouter à `ASSETS` dans sw.js. La CI refuse une PR
   qui touche `docs/` sans bump.

6. **`docs/engine.js` = logique pure, contractuelle.** Aucun accès DOM, `window` ou localStorage dedans.
   Toute date et tout « maintenant » entrent en **paramètre** — sinon les tests deviennent instables.
   Le reste se modifie uniquement par la recette R3 de MAINTENANCE.md (tests d'abord).

7. **Toujours tester en local avant de pousser** : serveur local + un aller-retour complet
   (démarrer une séance → valider des séries → terminer → Historique → Progrès) + un export.
   Console (F12) sans erreur. Checklist complète : MAINTENANCE.md §5.

8. **Ne jamais conseiller ni déclencher « Effacer les données du site »** sur le téléphone :
   cela détruit le localStorage, donc toute la progression.

9. **Arrondis : `r2` (2 décimales) pour toute CHARGE, `r1` pour les estimations affichées.**
   Un disque de 1,25 kg passé dans un arrondi au dixième devient 1,3 et fait dériver tous les totaux.
   Ce bug a déjà été rencontré une fois — il est verrouillé par les tests `platePlan`.

10. **Dans le doute : ne pousse pas.** Demande, ou fais moins.

## Architecture — les couches

```
Couche 1  docs/engine.js       moteur pur : 1RM estimé, tonnage, records, volume par groupe,
                               semaines ISO, calcul des disques, formatage — testé sous Node,
                               contractuel, ZÉRO effet de bord
Couche 2  docs/app.js          UI + saisie + chrono de repos + son (WebAudio) + vibration +
                               graphiques SVG + export/import + réglages en surcouche.
                               SEUL fichier qui lit/écrit localStorage "forge-state-v1"
Couche 3  docs/exercises.js    catalogue édité à la main (GROUPS, EQUIP, EXERCISES) — ids éternels
Couche 4  état                 localStorage du téléphone : "forge-state-v1" — jamais dans le repo
```

**Ordre de chargement (`docs/index.html`, NE PAS le changer)** :
`<head>` : style.css → boot de thème inline (avant le rendu : zéro flash) ;
fin de `<body>` : `exercises.js → engine.js → app.js` → enregistrement du service worker.
Règle : les données avant le moteur, le moteur avant l'app.

**LE PATTERN MODULE CONTRACTUEL** (à suivre pour tout nouveau module) :
- IIFE double environnement : `module.exports` sous Node ET `root.FORGE_X` dans le navigateur —
  la partie pure est testable sans DOM ;
- **ZÉRO accès localStorage** dans le module : l'état entre et sort par `opts` et des callbacks
  que `app.js` branche sur `ST` ;
- l'intégration se fait **UNIQUEMENT dans app.js** (un bloc `if (window.FORGE_X) {...}`) —
  l'app doit continuer à marcher si le module est absent ;
- le CSS est injecté par le module en n'utilisant QUE les variables `:root` de style.css ;
  tout texte passe par `esc(...)`.

## Carte du repo

```
docs/                 l'app servie telle quelle par GitHub Pages
  index.html          coquille + ordre de chargement + boot de thème
  app.js              couche application — seul accès à forge-state-v1
  engine.js           moteur pur contractuel
  exercises.js        catalogue (~74 exercices) : GROUPS, EQUIP, EXERCISES
  style.css           styles de base (toutes les couleurs en variables :root)
  sw.js               service worker network-first (CACHE à bumper)
  manifest.json       PWA installable   icon-192/512 + icon-maskable-512.png
  .nojekyll           désactive Jekyll sur GitHub Pages
tools/make_icons.py   régénère les icônes PNG (encodeur PNG maison, zéro dépendance)
tests/engine.test.mjs 28 tests contractuels du moteur
.github/workflows/ci.yml     tests + node --check + JSON + garde-fou sur le bump de CACHE
.github/workflows/pages.yml  déploiement Pages via GitHub Actions
MAINTENANCE.md        LE manuel : contrats, recettes R1-R8, pièges P1-P7, checklist
```

## Commandes clés

```bash
# Serveur local (puis ouvrir http://localhost:8123)
python3 -m http.server 8123 --directory docs

# Tests du moteur (OBLIGATOIRE avant push) — 28 tests
node --test tests/*.test.mjs

# Syntaxe de tous les JS de l'app (ce que fait la CI)
for f in docs/*.js; do node --check "$f" || break; done

# Régénérer les icônes (après un changement de couleur ou de dessin)
python3 tools/make_icons.py
```

## Processus de release en 6 étapes

1. `node --test tests/*.test.mjs` → tout vert. Sinon STOP.
2. `node --check` sur chaque JS de `docs/` modifié.
3. Bump `CACHE` dans `docs/sw.js` (+1) ; `ASSETS` à jour si un fichier a été ajouté dans `docs/`.
4. Test local : `python3 -m http.server 8123 --directory docs` → parcours complet + un export.
   Console sans erreur.
5. `git add` ciblé (vérifier avec `git status` : AUCUN `forge-export-*.json`) → commit → push sur `main`.
6. Le push déclenche le workflow **« Deploy Pages »**. Vérifier ensuite :
   > **Prérequis, à faire une seule fois** : GitHub Pages doit être activé à la main dans
   > *Settings → Pages → Build and deployment → Source = **GitHub Actions***.
   > Le `GITHUB_TOKEN` d'un run n'a pas le droit de créer le site Pages : `configure-pages`
   > échoue sur `Create Pages site failed: Resource not accessible by integration` tant que
   > ce réglage n'a pas été posé par un humain. Une fois posé, l'étape passe toute seule.
   `curl -s https://mnafati-cloud.github.io/forge/sw.js | grep CACHE`.
   Sur le téléphone, le service worker network-first récupère la mise à jour au prochain lancement.
   ⚠️ Si `deploy-pages` échoue (« Deployment failed, try again later »), relancer le run — ça passe
   en 1-2 essais. N'avoir qu'UN run à la fois.

## Réflexes de sécurité

- Si `exercises.js` a changé : vérifier qu'aucun id n'a disparu (les tests le vérifient pour la
  sentinelle `ETERNELS`, mais elle ne couvre pas tout le catalogue — relis le diff).
- Si quelque chose casse en prod : `git revert` + nouveau bump de `CACHE`. Jamais de force push,
  jamais de `reset --hard` sur du poussé.
- Avant toute modification du moteur : écrire le test d'abord, le voir échouer, puis coder.
- Si une étape échoue et que la doc ne dit pas quoi faire : STOP, ne rien pousser, demander.
